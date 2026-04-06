import { query } from '../../../config/database/database';

export interface PlatformContext {
  tenantId: string;
  tenantName: string;
  tenantStatus: string;
  plan: string;
  workspaceId: string | null;
  enabledProducts: string[];
  enabledModules: string[];
  language: string;
  timezone: string;
}

export async function resolvePlatformContext(
  tenantId: string,
  workspaceId?: string,
): Promise<PlatformContext | null> {
  const { rows: tRows } = await query(
    `SELECT tenant_id, name, status, plan, language, timezone
     FROM tenants WHERE tenant_id = $1 LIMIT 1`,
    [tenantId],
  );
  if (!tRows[0]) return null;
  const t = tRows[0];

  const { rows: pRows } = await query(
    `SELECT product_code FROM product_entitlements
     WHERE tenant_id = $1 AND is_active = TRUE`,
    [tenantId],
  );
  const { rows: mRows } = await query(
    `SELECT module_code FROM module_entitlements
     WHERE tenant_id = $1 AND is_active = TRUE`,
    [tenantId],
  );

  return {
    tenantId,
    tenantName: t.name ?? '',
    tenantStatus: t.status ?? 'active',
    plan: t.plan ?? 'standard',
    workspaceId: workspaceId ?? null,
    enabledProducts: pRows.map((r: any) => r.product_code),
    enabledModules: mRows.map((r: any) => r.module_code),
    language: t.language ?? 'en',
    timezone: t.timezone ?? 'UTC',
  };
}

export async function isTenantActive(tenantId: string): Promise<boolean> {
  const { rows } = await query(
    `SELECT status FROM tenants WHERE tenant_id = $1 LIMIT 1`,
    [tenantId],
  );
  return rows[0]?.status === 'active';
}

export async function getTenantPlan(tenantId: string): Promise<string> {
  const { rows } = await query(
    `SELECT plan FROM tenants WHERE tenant_id = $1 LIMIT 1`,
    [tenantId],
  );
  return rows[0]?.plan ?? 'standard';
}
