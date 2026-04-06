// @ts-nocheck
import { query, safeQuery, tenantSchema } from '../../../config/database/database';
import type { FeatureFlagContract } from '../contracts/platform-contracts';
import { getDefaultProductKey } from '../config/platform-identity';

const globalOverrides = new Map<string, boolean>();

function resolveProductCode(productCode?: string): string {
  return productCode ?? (getDefaultProductKey() || 'agrc');
}

export async function isFeatureEnabled(
  tenantId: string,
  flagCode: string,
  productCode?: string,
): Promise<boolean> {
  if (globalOverrides.has(flagCode)) {
    return globalOverrides.get(flagCode)!;
  }

  const resolvedProduct = resolveProductCode(productCode);

  try {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT enabled FROM "${schema}".feature_flags
       WHERE feature_key = $1 AND (product_code = $2 OR product_code IS NULL) LIMIT 1`,
      [flagCode, resolvedProduct],
    );
    if (rows[0]) return rows[0].enabled === true;
  } catch {}

  try {
    const { rows } = await query(
      `SELECT enabled FROM feature_flags
       WHERE feature_key = $1 AND (product_code = $2 OR product_code IS NULL) LIMIT 1`,
      [flagCode, resolvedProduct],
    );
    if (rows[0]) return rows[0].enabled === true;
  } catch {}

  return false;
}

export async function setFeatureFlag(
  tenantId: string,
  flagCode: string,
  isEnabled: boolean,
  updatedBy: string,
  productCode?: string,
): Promise<void> {
  const resolvedProduct = resolveProductCode(productCode);
  const schema = tenantSchema(tenantId);
  await query(
    `INSERT INTO "${schema}".feature_flags (feature_key, enabled, product_code, tenant_id, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (feature_key)
       DO UPDATE SET enabled = EXCLUDED.enabled, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [flagCode, isEnabled, resolvedProduct, tenantId, updatedBy],
  );
}

export async function getFeatureFlags(tenantId: string, productCode?: string): Promise<FeatureFlagContract[]> {
  const resolvedProduct = resolveProductCode(productCode);
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT feature_key, tenant_id, enabled, product_code,
            COALESCE(conditions, '{}'::jsonb) AS metadata
     FROM "${schema}".feature_flags
     WHERE product_code = $1 OR product_code IS NULL
     ORDER BY feature_key`,
    [resolvedProduct],
  );
  return rows.map((r: unknown) => ({
    flagCode: r.feature_key,
    tenantId: r.tenant_id ?? tenantId,
    isEnabled: r.enabled === true,
    metadata: r.metadata ?? {},
  }));
}

export async function deleteFeatureFlag(tenantId: string, flagCode: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await query(
    `DELETE FROM "${schema}".feature_flags WHERE feature_key = $1`,
    [flagCode],
  );
  return (result.rowCount ?? 0) > 0;
}

export function setGlobalOverride(flagCode: string, isEnabled: boolean): void {
  globalOverrides.set(flagCode, isEnabled);
}

export function clearGlobalOverride(flagCode: string): void {
  globalOverrides.delete(flagCode);
}

export function clearAllOverrides(): void {
  globalOverrides.clear();
}
