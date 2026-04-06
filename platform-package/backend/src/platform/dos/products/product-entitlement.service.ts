import { query } from '../../../config/database/database';

export interface ProductEntitlement {
  productCode: string;
  productName: string;
  isEnabled: boolean;
  tier: string;
  subscribedAt: Date | null;
  expiresAt: Date | null;
}

export interface ProductDefinition {
  code: string;
  name: string;
  description: string;
  defaultTier: string;
  isActive: boolean;
  modules: string[];
}

export async function isProductEnabled(tenantId: string, productCode: string): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM subscriptions s
     JOIN platform_products pp ON pp.id = s.product_id
     WHERE s.tenant_id = $1 AND pp.code = $2
       AND s.status = 'active'
       AND (s.expires_at IS NULL OR s.expires_at > NOW())
     LIMIT 1`,
    [tenantId, productCode],
  );
  return result.rows.length > 0;
}

export async function getEnabledProducts(tenantId: string): Promise<ProductEntitlement[]> {
  const result = await query(
    `SELECT pp.code AS product_code, pp.name AS product_name,
            TRUE AS is_enabled, COALESCE(td.name, 'standard') AS tier,
            s.created_at AS subscribed_at, s.expires_at
     FROM subscriptions s
     JOIN platform_products pp ON pp.id = s.product_id
     LEFT JOIN tier_definitions td ON td.id = s.tier_id
     WHERE s.tenant_id = $1 AND s.status = 'active'
       AND (s.expires_at IS NULL OR s.expires_at > NOW())
     ORDER BY pp.code`,
    [tenantId],
  );
  return result.rows.map((r: any) => ({
    productCode: r.product_code,
    productName: r.product_name,
    isEnabled: r.is_enabled,
    tier: r.tier,
    subscribedAt: r.subscribed_at,
    expiresAt: r.expires_at,
  }));
}

export async function enableProduct(
  tenantId: string,
  productCode: string,
  opts?: { tier?: string; enabledBy?: string; expiresAt?: Date },
): Promise<void> {
  const productResult = await query(
    `SELECT id FROM platform_products WHERE code = $1 LIMIT 1`,
    [productCode],
  );
  if (productResult.rows.length === 0) {
    throw new Error(`Product '${productCode}' not found in product registry`);
  }
  const productId = productResult.rows[0].id;

  let tierId: string | null = null;
  if (opts?.tier) {
    const tierResult = await query(`SELECT id FROM tier_definitions WHERE name = $1 LIMIT 1`, [opts.tier]);
    tierId = tierResult.rows[0]?.id || null;
  }

  await query(
    `INSERT INTO subscriptions (tenant_id, product_id, tier_id, status, created_at, expires_at)
     VALUES ($1, $2, $3, 'active', NOW(), $4)
     ON CONFLICT (tenant_id, product_id) DO UPDATE
     SET status = 'active', tier_id = COALESCE(EXCLUDED.tier_id, subscriptions.tier_id),
         expires_at = EXCLUDED.expires_at, updated_at = NOW()`,
    [tenantId, productId, tierId, opts?.expiresAt || null],
  );
}

export async function disableProduct(tenantId: string, productCode: string): Promise<void> {
  await query(
    `UPDATE subscriptions s
     SET status = 'cancelled', updated_at = NOW()
     FROM platform_products pp
     WHERE pp.id = s.product_id AND pp.code = $2 AND s.tenant_id = $1`,
    [tenantId, productCode],
  );
}

export async function getProductRegistry(): Promise<ProductDefinition[]> {
  const result = await query(
    `SELECT pp.code, pp.name, pp.description, COALESCE(pp.default_tier, 'standard') AS default_tier, pp.is_active,
            COALESCE(array_agg(pm.module_code) FILTER (WHERE pm.module_code IS NOT NULL), '{}') AS modules
     FROM platform_products pp
     LEFT JOIN product_modules pm ON pm.product_id = pp.id
     WHERE pp.is_active = TRUE
     GROUP BY pp.id
     ORDER BY pp.code`,
    [],
  );
  return result.rows.map((r: any) => ({
    code: r.code,
    name: r.name,
    description: r.description || '',
    defaultTier: r.default_tier,
    isActive: r.is_active,
    modules: r.modules || [],
  }));
}

export async function getProductModules(productCode: string): Promise<string[]> {
  const result = await query(
    `SELECT pm.module_code
     FROM product_modules pm
     JOIN platform_products pp ON pp.id = pm.product_id
     WHERE pp.code = $1 AND pm.is_active = TRUE
     ORDER BY pm.module_code`,
    [productCode],
  );
  return result.rows.map((r: any) => r.module_code);
}

export const productEntitlementService = {
  isProductEnabled,
  getEnabledProducts,
  enableProduct,
  disableProduct,
  getProductRegistry,
  getProductModules,
};
