import { query } from '../../../config/database/database';

export interface WorkspaceContext {
  workspaceId: string;
  tenantId: string;
  name: string;
  type: 'default' | 'project' | 'sandbox';
  isActive: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
}

export async function getWorkspaceContext(
  tenantId: string,
  workspaceId: string,
): Promise<WorkspaceContext | null> {
  const { rows } = await query(
    `SELECT workspace_id, tenant_id, name, type, is_active, settings, created_at
     FROM workspaces WHERE workspace_id = $1 AND tenant_id = $2 LIMIT 1`,
    [workspaceId, tenantId],
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    workspaceId: r.workspace_id,
    tenantId: r.tenant_id,
    name: r.name,
    type: r.type ?? 'default',
    isActive: r.is_active !== false,
    settings: r.settings ?? {},
    createdAt: r.created_at?.toISOString?.() ?? '',
  };
}

export async function getDefaultWorkspace(tenantId: string): Promise<WorkspaceContext | null> {
  const { rows } = await query(
    `SELECT workspace_id, tenant_id, name, type, is_active, settings, created_at
     FROM workspaces WHERE tenant_id = $1 AND type = 'default' LIMIT 1`,
    [tenantId],
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    workspaceId: r.workspace_id,
    tenantId: r.tenant_id,
    name: r.name,
    type: 'default',
    isActive: r.is_active !== false,
    settings: r.settings ?? {},
    createdAt: r.created_at?.toISOString?.() ?? '',
  };
}

export async function listWorkspaces(tenantId: string): Promise<WorkspaceContext[]> {
  const { rows } = await query(
    `SELECT workspace_id, tenant_id, name, type, is_active, settings, created_at
     FROM workspaces WHERE tenant_id = $1 ORDER BY created_at`,
    [tenantId],
  );
  return rows.map((r: any) => ({
    workspaceId: r.workspace_id,
    tenantId: r.tenant_id,
    name: r.name,
    type: r.type ?? 'default',
    isActive: r.is_active !== false,
    settings: r.settings ?? {},
    createdAt: r.created_at?.toISOString?.() ?? '',
  }));
}

export async function createWorkspace(
  tenantId: string,
  name: string,
  type: 'default' | 'project' | 'sandbox',
  createdBy: string,
): Promise<WorkspaceContext> {
  const { rows } = await query(
    `INSERT INTO workspaces (tenant_id, name, type, is_active, created_by)
     VALUES ($1, $2, $3, TRUE, $4)
     RETURNING workspace_id, created_at`,
    [tenantId, name, type, createdBy],
  );
  return {
    workspaceId: rows[0].workspace_id,
    tenantId,
    name,
    type,
    isActive: true,
    settings: {},
    createdAt: rows[0].created_at?.toISOString?.() ?? new Date().toISOString(),
  };
}
