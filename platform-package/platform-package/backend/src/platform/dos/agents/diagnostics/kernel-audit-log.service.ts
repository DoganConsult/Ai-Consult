import { safeQuery, tenantSchema } from '../../../../config/database/database';

export type KernelAuditCategory =
  | 'lifecycle'
  | 'tool_execution'
  | 'approval'
  | 'policy_block'
  | 'budget'
  | 'watchdog'
  | 'delegation'
  | 'sod'
  | 'admin'
  | 'escalation'
  | 'error';

export interface KernelAuditEntry {
  category: KernelAuditCategory;
  agentCode: string;
  actorId?: string;
  action: string;
  detail: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  correlationId?: string;
}

export async function writeKernelAuditLog(
  tenantId: string,
  entry: KernelAuditEntry,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".dos_agent_kernel_audit
       (tenant_id, category, agent_code, actor_id, action, detail, severity, correlation_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [
      tenantId,
      entry.category,
      entry.agentCode,
      entry.actorId || null,
      entry.action,
      JSON.stringify(entry.detail),
      entry.severity,
      entry.correlationId || null,
    ],
  );
}

export async function queryKernelAuditLog(
  tenantId: string,
  filters?: {
    category?: KernelAuditCategory;
    agentCode?: string;
    severity?: string;
    since?: string;
    limit?: number;
  },
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];

  if (filters?.category) {
    params.push(filters.category);
    conditions.push(`category = $${params.length}`);
  }
  if (filters?.agentCode) {
    params.push(filters.agentCode);
    conditions.push(`agent_code = $${params.length}`);
  }
  if (filters?.severity) {
    params.push(filters.severity);
    conditions.push(`severity = $${params.length}`);
  }
  if (filters?.since) {
    params.push(filters.since);
    conditions.push(`created_at >= $${params.length}::timestamptz`);
  }

  const limit = filters?.limit ?? 100;
  params.push(limit);

  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".dos_agent_kernel_audit
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return rows;
}

export async function getKernelAuditSummary(
  tenantId: string,
  hoursBack = 24,
): Promise<{
  totalEntries: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  criticalCount: number;
}> {
  const schema = tenantSchema(tenantId);
  const { rows: catRows } = await safeQuery(
    `SELECT category, COUNT(*)::int AS cnt
     FROM "${schema}".dos_agent_kernel_audit
     WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '${hoursBack} hours'
     GROUP BY category`,
    [tenantId],
  );
  const { rows: sevRows } = await safeQuery(
    `SELECT severity, COUNT(*)::int AS cnt
     FROM "${schema}".dos_agent_kernel_audit
     WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '${hoursBack} hours'
     GROUP BY severity`,
    [tenantId],
  );

  const byCategory: Record<string, number> = {};
  let totalEntries = 0;
  for (const r of catRows) {
    byCategory[r.category] = r.cnt;
    totalEntries += r.cnt;
  }
  const bySeverity: Record<string, number> = {};
  let criticalCount = 0;
  for (const r of sevRows) {
    bySeverity[r.severity] = r.cnt;
    if (r.severity === 'critical') criticalCount = r.cnt;
  }

  return { totalEntries, byCategory, bySeverity, criticalCount };
}

export const kernelAuditLogService = {
  writeKernelAuditLog,
  queryKernelAuditLog,
  getKernelAuditSummary,
};
