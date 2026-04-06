// @ts-nocheck
import { emptyResult, safeQuery, tenantSchema } from '../../../../config/database';
import { getFirstRow } from '../../../../utils/db-utils';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';
import type { GenericRow } from '../../../../types/db-rows.types';

function httpError(message: string, status: number): Error {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

export async function createWorkspace(
  tenantId: string,
  data: { name: string; description?: string; type?: string }
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const existing = await safeQuery(
    `SELECT workspace_id FROM "${schema}".workspaces WHERE name = $1`,
    [data.name]
  );
  if (existing.rows.length > 0) throw httpError('Workspace name already exists', 409);
  const result = await safeQuery(
    `INSERT INTO "${schema}".workspaces (name, description, type)
     VALUES ($1, $2, $3) RETURNING *`,
    [data.name, data.description || '', data.type || 'enterprise_grc']
  );
  return getFirstRow(result);
}

export async function getWorkspaces(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".workspaces ORDER BY created_at DESC`
  ), { tenantId, operation: 'query workspaces' });
  return result.rows;
}

export async function updateWorkspace(
  tenantId: string,
  workspaceId: string,
  data: { name?: string; description?: string; type?: string }
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(
    `SELECT * FROM "${schema}".workspaces WHERE workspace_id = $1`,
    [workspaceId]
  );
  if (current.rows.length === 0) throw httpError('Workspace not found', 404);
  if (data.name && data.name !== getFirstRow(current)?.name) {
    const dup = await safeQuery(
      `SELECT workspace_id FROM "${schema}".workspaces WHERE name = $1 AND workspace_id != $2`,
      [data.name, workspaceId]
    );
    if (dup.rows.length > 0) throw httpError('Workspace name already exists', 409);
  }
  const result = await safeQuery(
    `UPDATE "${schema}".workspaces SET
      name = COALESCE($1, name), description = COALESCE($2, description), type = COALESCE($3, type)
     WHERE workspace_id = $4 RETURNING *`,
    [data.name || null, data.description || null, data.type || null, workspaceId]
  );
  return getFirstRow(result);
}

export async function deleteWorkspace(tenantId: string, workspaceId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const ws = await safeQuery(`SELECT workspace_id FROM "${schema}".workspaces WHERE workspace_id = $1`, [workspaceId]);
  if (ws.rows.length === 0) throw httpError('Workspace not found', 404);
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".workspaces`);
  if (getFirstRow(countResult)?.cnt <= 1) throw httpError('Cannot delete the last workspace', 400);
  const defaultWs = await safeQuery(
    `SELECT workspace_id FROM "${schema}".workspaces WHERE workspace_id != $1 ORDER BY created_at ASC LIMIT 1`,
    [workspaceId]
  );
  const reassignId = getFirstRow(defaultWs)?.workspace_id;
  const tables = [
    'frameworks', 'risks', 'controls', 'policies', 'evidence',
    'assessments', 'incidents', 'vendors', 'remediation_tasks',
    'exceptions', 'findings', 'assets'
  ];
  for (const table of tables) {
    await safeQuery(`UPDATE "${schema}"."${table}" SET workspace_id = $1 WHERE workspace_id = $2`, [reassignId, workspaceId]);
  }
  const result = await safeQuery(`DELETE FROM "${schema}".workspaces WHERE workspace_id = $1 RETURNING workspace_id`, [workspaceId]);
  return result.rows.length > 0;
}

export async function createScopeDimension(
  tenantId: string,
  data: { workspace_id: string; dimension_type: string; name: string; parent_scope_id?: string }
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const existing = await safeQuery(
    `SELECT scope_id FROM "${schema}".scope_dimensions
     WHERE workspace_id = $1 AND dimension_type = $2 AND name = $3`,
    [data.workspace_id, data.dimension_type, data.name]
  );
  if (existing.rows.length > 0) throw httpError('Scope name already exists for this workspace and type', 409);
  const result = await safeQuery(
    `INSERT INTO "${schema}".scope_dimensions (workspace_id, dimension_type, name, parent_scope_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.workspace_id, data.dimension_type, data.name, data.parent_scope_id || null]
  );
  return getFirstRow(result);
}

export async function getScopeDimensions(
  tenantId: string,
  workspaceId: string,
  type?: string
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  if (type) {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".scope_dimensions WHERE workspace_id = $1 AND dimension_type = $2 ORDER BY created_at ASC`,
      [workspaceId, type]
    );
    return result.rows;
  }
  const result = await safeQuery(
    `SELECT * FROM "${schema}".scope_dimensions WHERE workspace_id = $1 ORDER BY created_at ASC`,
    [workspaceId]
  );
  return result.rows;
}
