// @ts-nocheck
import { query, safeQuery, tenantSchema } from '../../../config/database';
import { logger } from '../observability/logger.service';

// --- Types ---

export interface ProductBundle {
  tenantId: string;
  productCodes: string[];
  mergedModules: string[];
  mergedFeatures: string[];
  conflicts: string[];
  composedAt: Date;
}

export interface ResolvedFeature {
  featureKey: string;
  isEnabled: boolean;
  source: 'product_default' | 'tenant_override';
  productCode: string;
}

export interface ResolvedModule {
  moduleCode: string;
  isEnabled: boolean;
  tier: string;
  source: 'product_default' | 'tenant_override';
}

export interface ComposedEntitlement {
  productCode: string;
  modules: string[];
  features: string[];
  tier: string;
  isActive: boolean;
}

export interface CompatibilityResult {
  isCompatible: boolean;
  conflicts: CompatibilityConflict[];
}

export interface CompatibilityConflict {
  productA: string;
  productB: string;
  reason: string;
  conflictType: 'module_overlap' | 'tier_mismatch' | 'mutual_exclusion';
}

export interface ProductOverrides {
  disabledModules?: string[];
  disabledFeatures?: string[];
  enabledFeatures?: string[];
  tierOverride?: string;
  metadata?: Record<string, unknown>;
}

// --- Functions ---

/**
 * Merge multiple products into an effective bundle for a tenant.
 * Combines all modules, detects conflicts, and returns the unified set.
 */
export async function composeProductBundle(
  tenantId: string,
  productCodes: string[],
): Promise<ProductBundle> {
  const allModules = new Set<string>();
  const allFeatures = new Set<string>();
  const conflicts: string[] = [];

  try {
    // Gather modules and features from each product
    for (const code of productCodes) {
      const moduleResult = await query(
        `SELECT pm.module_code
         FROM product_modules pm
         JOIN platform_products pp ON pp.id = pm.product_id
         WHERE pp.code = $1 AND pm.is_active = TRUE`,
        [code],
      );
      moduleResult.rows.forEach((r: any) => allModules.add(r.module_code));

      const featureResult = await safeQuery(
        `SELECT pf.feature_key
         FROM product_features pf
         JOIN platform_products pp ON pp.id = pf.product_id
         WHERE pp.code = $1 AND pf.is_enabled = TRUE`,
        [code],
      );
      featureResult.rows.forEach((r: any) => allFeatures.add(r.feature_key));
    }

    // Check for mutual exclusions between products
    const compatibility = await validateProductCompatibility(productCodes);
    if (!compatibility.isCompatible) {
      for (const c of compatibility.conflicts) {
        conflicts.push(`${c.productA} <> ${c.productB}: ${c.reason}`);
      }
    }

    // Apply tenant-specific overrides to remove disabled modules
    const schema = tenantSchema(tenantId);
    try {
      const { rows: overrideRows } = await safeQuery(
        `SELECT product_code, disabled_modules, disabled_features
         FROM "${schema}".product_overrides
         WHERE product_code = ANY($1)`,
        [productCodes],
      );
      for (const ov of overrideRows) {
        const disabledMods: string[] = ov.disabled_modules || [];
        const disabledFeats: string[] = ov.disabled_features || [];
        disabledMods.forEach((m: string) => allModules.delete(m));
        disabledFeats.forEach((f: string) => allFeatures.delete(f));
      }
    } catch {
      // Override table may not exist yet; proceed with defaults
    }

    logger.info(`[ProductComposition] Composed bundle for tenant ${tenantId}: ${productCodes.join(', ')}`);

    return {
      tenantId,
      productCodes,
      mergedModules: Array.from(allModules).sort(),
      mergedFeatures: Array.from(allFeatures).sort(),
      conflicts,
      composedAt: new Date(),
    };
  } catch (err) {
    logger.error(`[ProductComposition] Failed to compose bundle for ${tenantId}: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Resolve effective features for a product within a tenant.
 * Product defaults are overlaid with tenant-specific overrides.
 */
export async function resolveProductFeatures(
  tenantId: string,
  productCode: string,
): Promise<ResolvedFeature[]> {
  try {
    // Get product-level default features
    const defaultResult = await query(
      `SELECT pf.feature_key, pf.is_enabled
       FROM product_features pf
       JOIN platform_products pp ON pp.id = pf.product_id
       WHERE pp.code = $1
       ORDER BY pf.feature_key`,
      [productCode],
    );

    const featureMap = new Map<string, ResolvedFeature>();
    for (const r of defaultResult.rows) {
      featureMap.set(r.feature_key, {
        featureKey: r.feature_key,
        isEnabled: r.is_enabled === true,
        source: 'product_default',
        productCode,
      });
    }

    // Apply tenant overrides
    const schema = tenantSchema(tenantId);
    try {
      const { rows: overrideRows } = await safeQuery(
        `SELECT feature_key, is_enabled
         FROM "${schema}".product_feature_overrides
         WHERE product_code = $1`,
        [productCode],
      );
      for (const ov of overrideRows as any[]) {
        const __existing = featureMap.get(ov.feature_key);
        featureMap.set(ov.feature_key, {
          featureKey: ov.feature_key,
          isEnabled: ov.is_enabled === true,
          source: 'tenant_override',
          productCode,
        });
      }
    } catch {
      // Override table may not exist; return defaults only
    }

    return Array.from(featureMap.values());
  } catch (err) {
    logger.error(`[ProductComposition] Failed to resolve features for ${productCode} in tenant ${tenantId}: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Resolve enabled modules from a product definition, applying tenant overrides.
 */
export async function resolveProductModules(
  tenantId: string,
  productCode: string,
): Promise<ResolvedModule[]> {
  try {
    const result = await query(
      `SELECT pm.module_code, pm.is_active, COALESCE(pp.default_tier, 'standard') AS tier
       FROM product_modules pm
       JOIN platform_products pp ON pp.id = pm.product_id
       WHERE pp.code = $1
       ORDER BY pm.module_code`,
      [productCode],
    );

    const moduleMap = new Map<string, ResolvedModule>();
    for (const r of result.rows) {
      moduleMap.set(r.module_code, {
        moduleCode: r.module_code,
        isEnabled: r.is_active === true,
        tier: r.tier,
        source: 'product_default',
      });
    }

    // Apply tenant-level module overrides
    const schema = tenantSchema(tenantId);
    try {
      const { rows: overrides } = await safeQuery(
        `SELECT module_code, is_enabled, tier_override
         FROM "${schema}".product_module_overrides
         WHERE product_code = $1`,
        [productCode],
      );
      for (const ov of overrides as any[]) {
        const existing = moduleMap.get(ov.module_code);
        moduleMap.set(ov.module_code, {
          moduleCode: ov.module_code,
          isEnabled: ov.is_enabled === true,
          tier: ov.tier_override || existing?.tier || 'standard',
          source: 'tenant_override',
        });
      }
    } catch {
      // Override table may not exist; use defaults
    }

    return Array.from(moduleMap.values());
  } catch (err) {
    logger.error(`[ProductComposition] Failed to resolve modules for ${productCode} in tenant ${tenantId}: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Get the full composed entitlement set from all active products for a tenant.
 */
export async function getComposedEntitlements(tenantId: string): Promise<ComposedEntitlement[]> {
  try {
    const result = await query(
      `SELECT pp.code AS product_code, pp.name, pp.default_tier AS tier, pp.is_active,
              COALESCE(array_agg(DISTINCT pm.module_code) FILTER (WHERE pm.module_code IS NOT NULL), '{}') AS modules
       FROM subscriptions s
       JOIN platform_products pp ON pp.id = s.product_id
       LEFT JOIN product_modules pm ON pm.product_id = pp.id AND pm.is_active = TRUE
       WHERE s.tenant_id = $1 AND s.status = 'active'
         AND (s.expires_at IS NULL OR s.expires_at > NOW())
       GROUP BY pp.id, s.id
       ORDER BY pp.code`,
      [tenantId],
    );

    const entitlements: ComposedEntitlement[] = [];
    for (const row of result.rows) {
      // Resolve features per product
      const features = await resolveProductFeatures(tenantId, row.product_code);
      const enabledFeatureKeys = features.filter(f => f.isEnabled).map(f => f.featureKey);

      entitlements.push({
        productCode: row.product_code,
        modules: row.modules || [],
        features: enabledFeatureKeys,
        tier: row.tier || 'standard',
        isActive: row.is_active === true,
      });
    }

    return entitlements;
  } catch (err) {
    logger.error(`[ProductComposition] Failed to get composed entitlements for tenant ${tenantId}: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Check for conflicts between multiple products.
 * Detects module overlaps, tier mismatches, and mutual exclusions.
 */
export async function validateProductCompatibility(
  productCodes: string[],
): Promise<CompatibilityResult> {
  const conflicts: CompatibilityConflict[] = [];

  if (productCodes.length < 2) {
    return { isCompatible: true, conflicts: [] };
  }

  try {
    // Check for mutual exclusion rules
    const exclusionResult = await safeQuery(
      `SELECT product_code_a, product_code_b, reason
       FROM product_exclusions
       WHERE product_code_a = ANY($1) AND product_code_b = ANY($1)`,
      [productCodes],
    );
    for (const r of exclusionResult.rows) {
      conflicts.push({
        productA: r.product_code_a,
        productB: r.product_code_b,
        reason: r.reason || 'Mutually exclusive products',
        conflictType: 'mutual_exclusion',
      });
    }

    // Check for module ownership conflicts (same module claimed by multiple products with different tiers)
    const moduleResult = await query(
      `SELECT pm.module_code, pp.code AS product_code, pp.default_tier
       FROM product_modules pm
       JOIN platform_products pp ON pp.id = pm.product_id
       WHERE pp.code = ANY($1) AND pm.is_active = TRUE
       ORDER BY pm.module_code, pp.code`,
      [productCodes],
    );

    const moduleOwners = new Map<string, { productCode: string; tier: string }[]>();
    for (const r of moduleResult.rows) {
      const owners = moduleOwners.get(r.module_code) || [];
      owners.push({ productCode: r.product_code, tier: r.default_tier });
      moduleOwners.set(r.module_code, owners);
    }

    for (const [moduleCode, owners] of moduleOwners) {
      if (owners.length > 1) {
        // Module overlap is a warning-level conflict, not necessarily blocking
        const tiers = new Set(owners.map(o => o.tier));
        if (tiers.size > 1) {
          conflicts.push({
            productA: owners[0].productCode,
            productB: owners[1].productCode,
            reason: `Module '${moduleCode}' has conflicting tier definitions`,
            conflictType: 'tier_mismatch',
          });
        }
      }
    }

    return {
      isCompatible: conflicts.filter(c => c.conflictType === 'mutual_exclusion').length === 0,
      conflicts,
    };
  } catch (err) {
    logger.error(`[ProductComposition] Failed to validate compatibility: ${(err as Error).message}`);
    // In case of error, deny by default (Law 11)
    return { isCompatible: false, conflicts: [{ productA: productCodes[0], productB: productCodes[1] || '', reason: 'Compatibility check failed', conflictType: 'mutual_exclusion' }] };
  }
}

/**
 * Get tenant-specific overrides for a product.
 */
export async function getProductOverrides(
  tenantId: string,
  productCode: string,
): Promise<ProductOverrides | null> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(
      `SELECT disabled_modules, disabled_features, enabled_features, tier_override,
              COALESCE(metadata, '{}'::jsonb) AS metadata
       FROM "${schema}".product_overrides
       WHERE product_code = $1 LIMIT 1`,
      [productCode],
    );
    if (rows.length === 0) return null;
    const r = rows[0] as any;
    return {
      disabledModules: r.disabled_modules || [],
      disabledFeatures: r.disabled_features || [],
      enabledFeatures: r.enabled_features || [],
      tierOverride: r.tier_override || undefined,
      metadata: r.metadata || {},
    };
  } catch (err) {
    logger.error(`[ProductComposition] Failed to get overrides for ${productCode} in tenant ${tenantId}: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Apply or update tenant-specific overrides for a product.
 */
export async function applyProductOverride(
  tenantId: string,
  productCode: string,
  overrides: ProductOverrides,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `INSERT INTO "${schema}".product_overrides
       (product_code, disabled_modules, disabled_features, enabled_features, tier_override, metadata, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (product_code) DO UPDATE
       SET disabled_modules = EXCLUDED.disabled_modules,
           disabled_features = EXCLUDED.disabled_features,
           enabled_features = EXCLUDED.enabled_features,
           tier_override = EXCLUDED.tier_override,
           metadata = EXCLUDED.metadata,
           updated_at = NOW()`,
      [
        productCode,
        overrides.disabledModules || [],
        overrides.disabledFeatures || [],
        overrides.enabledFeatures || [],
        overrides.tierOverride || null,
        JSON.stringify(overrides.metadata || {}),
      ],
    );
    logger.info(`[ProductComposition] Applied overrides for ${productCode} in tenant ${tenantId}`);
  } catch (err) {
    logger.error(`[ProductComposition] Failed to apply overrides for ${productCode} in tenant ${tenantId}: ${(err as Error).message}`);
    throw err;
  }
}

export const productCompositionService = {
  composeProductBundle,
  resolveProductFeatures,
  resolveProductModules,
  getComposedEntitlements,
  validateProductCompatibility,
  getProductOverrides,
  applyProductOverride,
};
