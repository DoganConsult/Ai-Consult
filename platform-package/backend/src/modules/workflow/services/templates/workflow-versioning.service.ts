// @ts-nocheck
import { catchHandler, EC } from '../../../../utils/resilient-catch';
import { logger } from '../../../../platform/dos/observability/logger.service';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';
import { SYSTEM_JOB_ACTOR } from '../../../../platform/dos/constants/system-actors';

export async function bumpWorkflowVersion(
  tenantId: string,
  workflowId: string,
  definition: any,
  name: string,
  opts?: { changedBy?: string },
): Promise<{ version: number; row: Record<string, any> }> {
  const schema = tenantSchema(tenantId);
  const existing = await safeQuery(
    `SELECT version, workflow_id FROM "${schema}".workflows WHERE workflow_id = $1`,
    [workflowId],
  );
  if (existing.rows.length === 0) throw new Error('Workflow not found');

  const newVersion = (getFirstRow(existing)?.version || 1) + 1;
  const result = await safeQuery(
    `UPDATE "${schema}".workflows SET
       name = $1, definition = $2, version = $3, updated_at = NOW()
     WHERE workflow_id = $4
     RETURNING *`,
    [name, JSON.stringify(definition), newVersion, workflowId],
  );

  await snapshotGraph(tenantId, workflowId, definition, {
    changedBy: opts?.changedBy || SYSTEM_JOB_ACTOR,
    changeSummary: `Version bumped to v${newVersion}`,
    changeType: 'update',
  }).catch(catchHandler(EC.EVENT_BUS, {}));

  return { version: newVersion, row: getFirstRow(result) };
}

export interface GraphVersion {
  version_id: string;
  tenant_id: string;
  run_id: string;
  version_number: number;
  graph_snapshot: unknown;
  change_summary: string | null;
  changed_by: string | null;
  change_type: string;
  created_at: string;
}

export async function snapshotGraph(
  tenantId: string,
  runId: string,
  graph: any,
  opts?: { changedBy?: string; changeSummary?: string; changeType?: string },
): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  try {
    const versionResult = await safeQuery(
      `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
       FROM "${schema}".workflow_graph_versions WHERE run_id = $1`,
      [runId],
    );
    const nextVersion = getFirstRow(versionResult)?.next_version || 1;

    const result = await safeQuery(
      `INSERT INTO "${schema}".workflow_graph_versions
         (tenant_id, run_id, version_number, graph_snapshot, change_summary, changed_by, change_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING version_id`,
      [
        tenantId, runId, nextVersion,
        JSON.stringify(graph),
        opts?.changeSummary || `Auto-snapshot v${nextVersion}`,
        opts?.changedBy || SYSTEM_JOB_ACTOR,
        opts?.changeType || 'auto',
      ],
    );
    return getFirstRow(result)?.version_id || null;
  } catch (err: unknown) {
    logger.warn(`[WorkflowVersioning] snapshotGraph failed: ${toErrorMessage(err)}`);
    return null;
  }
}

export async function getGraphVersions(
  tenantId: string,
  runId: string,
): Promise<GraphVersion[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".workflow_graph_versions
       WHERE run_id = $1 ORDER BY version_number DESC`,
      [runId],
    );
    return result.rows;
  } catch { return []; }
}

export async function getGraphVersion(
  tenantId: string,
  versionId: string,
): Promise<GraphVersion | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".workflow_graph_versions WHERE version_id = $1`,
      [versionId],
    );
    return getFirstRow(result) || null;
  } catch { return null; }
}

export async function diffGraphVersions(
  tenantId: string,
  versionIdA: string,
  versionIdB: string,
): Promise<{ added: string[]; removed: string[]; changed: string[] }> {
  const [a, b] = await Promise.all([
    getGraphVersion(tenantId, versionIdA),
    getGraphVersion(tenantId, versionIdB),
  ]);

  if (!a || !b) return { added: [], removed: [], changed: [] };

  const nodesA = new Map((a.graph_snapshot?.nodes || []).map((n: GenericRow) => [n.id, n]));
  const nodesB = new Map((b.graph_snapshot?.nodes || []).map((n: GenericRow) => [n.id, n]));

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const [id, node] of nodesB) {
    if (!nodesA.has(id as string)) {
      added.push(id as string);
    } else {
      const oldNode = nodesA.get(id as string);
      if (JSON.stringify(oldNode) !== JSON.stringify(node)) {
        changed.push(id as string);
      }
    }
  }
  for (const id of nodesA.keys()) {
    if (!nodesB.has(id as string)) removed.push(id as string);
  }

  return { added, removed, changed };
}
