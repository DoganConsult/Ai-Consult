// ============================================
// Shahin — Workflow Comparison Service
// Side-by-side diff for executions and versions
// ============================================

import { safeQuery, tenantSchema } from "../../../../config/database";
import type { GenericRow } from '../../../../types/db-rows.types';

export interface StepDiff {
  nodeId: string;
  field: string;
  exec1Value: unknown;
  exec2Value: unknown;
}

export interface ExecutionComparisonResult {
  exec1: { executionId: string; status: string; stepsCount: number; startedAt: string | null };
  exec2: { executionId: string; status: string; stepsCount: number; startedAt: string | null };
  diffs: StepDiff[];
  onlyInExec1: Record<string, any>[];
  onlyInExec2: Record<string, any>[];
  commonSteps: number;
}

export interface VersionComparisonResult {
  v1: number;
  v2: number;
  nodesAdded: Record<string, any>[];
  nodesRemoved: Record<string, any>[];
  nodesModified: { nodeId: string; field: string; v1Value: unknown; v2Value: unknown }[];
  edgesAdded: Record<string, any>[];
  edgesRemoved: Record<string, any>[];
}

export async function compareExecutions(
  tenantId: string,
  execId1: string,
  execId2: string
): Promise<ExecutionComparisonResult> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT execution_id, status, started_at, completed_at, step_log
     FROM "${schema}".workflow_instances
     WHERE execution_id IN ($1, $2)`,
    [execId1, execId2]
  );

  const e1 = result.rows.find((r: GenericRow) => r.execution_id === execId1);
  const e2 = result.rows.find((r: GenericRow) => r.execution_id === execId2);
  if (!e1 || !e2) throw new Error("One or both executions not found");

  const steps1: Record<string, any>[] = Array.isArray(e1.step_log) ? e1.step_log as Record<string, any>[] : [];
  const steps2: Record<string, any>[] = Array.isArray(e2.step_log) ? e2.step_log as Record<string, any>[] : [];

  const map1 = new Map(steps1.map(s => [s.nodeId as string, s]));
  const map2 = new Map(steps2.map(s => [s.nodeId as string, s]));

  const allNodeIds = new Set([...map1.keys(), ...map2.keys()]);
  const diffs: StepDiff[] = [];
  const onlyInExec1: Record<string, any>[] = [];
  const onlyInExec2: Record<string, any>[] = [];
  let commonSteps = 0;

  for (const nodeId of allNodeIds) {
    const s1 = map1.get(nodeId);
    const s2 = map2.get(nodeId);

    if (s1 && !s2) {
      onlyInExec1.push(s1);
      continue;
    }
    if (!s1 && s2) {
      onlyInExec2.push(s2);
      continue;
    }

    commonSteps++;
    const compareFields = ["status", "conditionResult", "durationMs", "swimlane", "error"];
    for (const field of compareFields) {
      if (s1[field] !== s2[field] && (s1[field] !== undefined || s2[field] !== undefined)) {
        diffs.push({ nodeId, field, exec1Value: s1[field] ?? null, exec2Value: s2[field] ?? null });
      }
    }
  }

  return {
    exec1: { executionId: execId1, status: e1.status, stepsCount: steps1.length, startedAt: e1.started_at },
    exec2: { executionId: execId2, status: e2.status, stepsCount: steps2.length, startedAt: e2.started_at },
    diffs,
    onlyInExec1,
    onlyInExec2,
    commonSteps,
  };
}

export async function compareVersions(
  tenantId: string,
  workflowId: string,
  v1: number,
  v2: number
): Promise<VersionComparisonResult> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT version_number, definition_snapshot
     FROM "${schema}".workflow_versions
     WHERE definition_id = $1 AND version_number IN ($2, $3)`,
    [workflowId, v1, v2]
  );

  const ver1 = result.rows.find((r: GenericRow) => r.version_number === v1);
  const ver2 = result.rows.find((r: GenericRow) => r.version_number === v2);
  if (!ver1 || !ver2) throw new Error("One or both versions not found");

  const def1 = ver1.definition_snapshot || {};
  const def2 = ver2.definition_snapshot || {};

  const defObj1 = (typeof def1 === 'object' && def1 !== null ? def1 : {}) as Record<string, any>;
  const defObj2 = (typeof def2 === 'object' && def2 !== null ? def2 : {}) as Record<string, any>;
  const nodes1: Record<string, any>[] = (Array.isArray(defObj1.nodes) ? defObj1.nodes : []) as Record<string, any>[];
  const nodes2: Record<string, any>[] = (Array.isArray(defObj2.nodes) ? defObj2.nodes : []) as Record<string, any>[];
  const edges1: Record<string, any>[] = (Array.isArray(defObj1.edges) ? defObj1.edges : []) as Record<string, any>[];
  const edges2: Record<string, any>[] = (Array.isArray(defObj2.edges) ? defObj2.edges : []) as Record<string, any>[];

  const nodeMap1 = new Map(nodes1.map(n => [n.id as string, n]));
  const nodeMap2 = new Map(nodes2.map(n => [n.id as string, n]));

  const nodesAdded: Record<string, any>[] = [];
  const nodesRemoved: Record<string, any>[] = [];
  const nodesModified: { nodeId: string; field: string; v1Value: unknown; v2Value: unknown }[] = [];

  for (const [id, node] of nodeMap2) {
    if (!nodeMap1.has(id)) {
      nodesAdded.push(node);
    }
  }

  for (const [id, node] of nodeMap1) {
    if (!nodeMap2.has(id)) {
      nodesRemoved.push(node);
    } else {
      const n2 = nodeMap2.get(id)!;
      for (const field of ["type", "label", "label_en", "subType", "swimlane", "slaHours"]) {
        if (JSON.stringify(node[field]) !== JSON.stringify(n2[field])) {
          nodesModified.push({ nodeId: id as string, field, v1Value: node[field] ?? null, v2Value: n2[field] ?? null });
        }
      }
    }
  }

  const edgeKey = (e: Record<string, any>) => `${e.source || e.from}→${e.target || e.to}`;
  const edgeSet1 = new Set(edges1.map(edgeKey));
  const edgeSet2 = new Set(edges2.map(edgeKey));

  const edgesAdded = edges2.filter(e => !edgeSet1.has(edgeKey(e)));
  const edgesRemoved = edges1.filter(e => !edgeSet2.has(edgeKey(e)));

  return { v1, v2, nodesAdded, nodesRemoved, nodesModified, edgesAdded, edgesRemoved };
}
