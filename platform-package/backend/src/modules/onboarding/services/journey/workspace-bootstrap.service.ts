import { safeQuery, tenantSchema } from '../../../../config/database';
import { emitEvent } from '../../../../platform/dos/events/event-bus';

export interface WorkspaceBootstrapInput {
  tenantId: string;
  workspaceName: string;
  createdBy: string;
  sessionId?: string;
  productKey?: string;
}

export interface WorkspaceBootstrapResult {
  workspaceId: string;
  workspaceName: string;
  status: string;
  tenantId: string;
}

export async function bootstrapWorkspace(input: WorkspaceBootstrapInput): Promise<WorkspaceBootstrapResult> {
  const schema = tenantSchema(input.tenantId);
  const existing = await safeQuery(
    `SELECT workspace_id, workspace_name, status FROM "${schema}".workspaces WHERE tenant_id = $1 AND deleted_at IS NULL LIMIT 1`,
    [input.tenantId],
  ).catch(() => ({ rows: [] }));

  if (existing.rows.length > 0) {
    return {
      workspaceId: existing.rows[0].workspace_id,
      workspaceName: existing.rows[0].workspace_name,
      status: existing.rows[0].status,
      tenantId: input.tenantId,
    };
  }

  const result = await safeQuery(
    `INSERT INTO "${schema}".workspaces (tenant_id, workspace_name, status, provisioning_status, created_by, created_at, updated_at)
     VALUES ($1, $2, 'provisioning', 'in_progress', $3, NOW(), NOW()) RETURNING workspace_id`,
    [input.tenantId, input.workspaceName, input.createdBy],
  );

  const workspaceId = result.rows[0]?.workspace_id;

  if (input.sessionId) {
    await safeQuery(
      `UPDATE public.onboarding_sessions SET workspace_id = $1, updated_at = NOW() WHERE id = $2::uuid`,
      [workspaceId, input.sessionId],
    ).catch(() => {});
  }

  await emitEvent({
    event: 'workspace.bootstrapped',
    tenantId: input.tenantId,
    userId: input.createdBy,
    module: 'platform',
    entityType: 'workspace',
    entityId: workspaceId,
    data: { workspaceName: input.workspaceName, productKey: input.productKey || null },
  }).catch(() => {});

  return {
    workspaceId,
    workspaceName: input.workspaceName,
    status: 'provisioning',
    tenantId: input.tenantId,
  };
}
