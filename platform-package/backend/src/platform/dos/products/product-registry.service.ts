import { query, safeQuery } from '../../../config/database';
import { logger } from '../observability/logger.service';

// --- Types ---

export interface ProductDefinition {
  code: string;
  name: string;
  description: string;
  version: string;
  defaultTier: string;
  isActive: boolean;
  modules: string[];
  metadata: Record<string, unknown>;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ProductFilters {
  isActive?: boolean;
  tier?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface DeprecationRecord {
  productCode: string;
  deprecatedBy: string;
  deprecatedAt: Date;
  removalDate: string;
  replacement: string | null;
}

export interface ProductDependency {
  productCode: string;
  dependsOn: string;
  type: 'required' | 'optional';
}

// --- Functions ---

/**
 * Register a new product in the platform catalog.
 * Inserts or updates the platform_products row plus associated module links.
 */
export async function registerProduct(product: ProductDefinition): Promise<ProductDefinition> {
  try {
    const result = await query(
      `INSERT INTO platform_products (code, name, description, version, default_tier, is_active, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT (code) DO UPDATE
       SET name = EXCLUDED.name, description = EXCLUDED.description,
           version = EXCLUDED.version, default_tier = EXCLUDED.default_tier,
           is_active = EXCLUDED.is_active, metadata = EXCLUDED.metadata,
           updated_at = NOW()
       RETURNING code, name, description, version, default_tier, is_active, metadata, created_at, updated_at`,
      [
        product.code,
        product.name,
        product.description || '',
        product.version || '1.0.0',
        product.defaultTier || 'standard',
        product.isActive !== false,
        JSON.stringify(product.metadata || {}),
      ],
    );

    const row = result.rows[0];

    // Sync module associations: remove old, insert new
    if (product.modules && product.modules.length > 0) {
      await query(
        `DELETE FROM product_modules WHERE product_id = (SELECT id FROM platform_products WHERE code = $1)`,
        [product.code],
      );
      for (const moduleCode of product.modules) {
        await query(
          `INSERT INTO product_modules (product_id, module_code, is_active, created_at)
           SELECT id, $2, TRUE, NOW() FROM platform_products WHERE code = $1
           ON CONFLICT DO NOTHING`,
          [product.code, moduleCode],
        );
      }
    }

    logger.info(`[ProductRegistry] Registered product: ${product.code}`);
    return mapRowToProduct(row, product.modules || []);
  } catch (err) {
    logger.error(`[ProductRegistry] Failed to register product ${product.code}: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Get a single product definition by its code.
 * Returns null if not found.
 */
export async function getProduct(productCode: string): Promise<ProductDefinition | null> {
  try {
    const result = await query(
      `SELECT pp.code, pp.name, pp.description, pp.version, pp.default_tier, pp.is_active,
              COALESCE(pp.metadata, '{}'::jsonb) AS metadata, pp.created_at, pp.updated_at,
              COALESCE(array_agg(pm.module_code) FILTER (WHERE pm.module_code IS NOT NULL), '{}') AS modules
       FROM platform_products pp
       LEFT JOIN product_modules pm ON pm.product_id = pp.id AND pm.is_active = TRUE
       WHERE pp.code = $1
       GROUP BY pp.id`,
      [productCode],
    );
    if (result.rows.length === 0) return null;
    return mapRowToProduct(result.rows[0]);
  } catch (err) {
    logger.error(`[ProductRegistry] Failed to get product ${productCode}: ${(err as Error).message}`);
    return null;
  }
}

/**
 * List all registered products with optional filtering.
 */
export async function listProducts(filters?: ProductFilters): Promise<ProductDefinition[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.isActive !== undefined) {
    conditions.push(`pp.is_active = $${idx++}`);
    params.push(filters.isActive);
  }
  if (filters?.tier) {
    conditions.push(`pp.default_tier = $${idx++}`);
    params.push(filters.tier);
  }
  if (filters?.search) {
    conditions.push(`(pp.name ILIKE $${idx} OR pp.code ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters?.limit ? `LIMIT $${idx++}` : '';
  if (filters?.limit) params.push(filters.limit);
  const offset = filters?.offset ? `OFFSET $${idx++}` : '';
  if (filters?.offset) params.push(filters.offset);

  try {
    const result = await query(
      `SELECT pp.code, pp.name, pp.description, pp.version, pp.default_tier, pp.is_active,
              COALESCE(pp.metadata, '{}'::jsonb) AS metadata, pp.created_at, pp.updated_at,
              COALESCE(array_agg(pm.module_code) FILTER (WHERE pm.module_code IS NOT NULL), '{}') AS modules
       FROM platform_products pp
       LEFT JOIN product_modules pm ON pm.product_id = pp.id AND pm.is_active = TRUE
       ${where}
       GROUP BY pp.id
       ORDER BY pp.code
       ${limit} ${offset}`,
      params,
    );
    return result.rows.map((r: any) => mapRowToProduct(r));
  } catch (err) {
    logger.error(`[ProductRegistry] Failed to list products: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Update product metadata fields. Only provided fields are changed.
 */
export async function updateProduct(
  productCode: string,
  updates: Partial<ProductDefinition>,
): Promise<ProductDefinition | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (updates.name !== undefined) {
    sets.push(`name = $${idx++}`);
    params.push(updates.name);
  }
  if (updates.description !== undefined) {
    sets.push(`description = $${idx++}`);
    params.push(updates.description);
  }
  if (updates.version !== undefined) {
    sets.push(`version = $${idx++}`);
    params.push(updates.version);
  }
  if (updates.defaultTier !== undefined) {
    sets.push(`default_tier = $${idx++}`);
    params.push(updates.defaultTier);
  }
  if (updates.isActive !== undefined) {
    sets.push(`is_active = $${idx++}`);
    params.push(updates.isActive);
  }
  if (updates.metadata !== undefined) {
    sets.push(`metadata = $${idx++}`);
    params.push(JSON.stringify(updates.metadata));
  }

  if (sets.length === 0) return getProduct(productCode);

  sets.push('updated_at = NOW()');
  params.push(productCode);

  try {
    await query(
      `UPDATE platform_products SET ${sets.join(', ')} WHERE code = $${idx}`,
      params,
    );

    // Sync module list if provided
    if (updates.modules) {
      await query(
        `DELETE FROM product_modules WHERE product_id = (SELECT id FROM platform_products WHERE code = $1)`,
        [productCode],
      );
      for (const moduleCode of updates.modules) {
        await query(
          `INSERT INTO product_modules (product_id, module_code, is_active, created_at)
           SELECT id, $2, TRUE, NOW() FROM platform_products WHERE code = $1
           ON CONFLICT DO NOTHING`,
          [productCode, moduleCode],
        );
      }
    }

    logger.info(`[ProductRegistry] Updated product: ${productCode}`);
    return getProduct(productCode);
  } catch (err) {
    logger.error(`[ProductRegistry] Failed to update product ${productCode}: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Deprecate a product with a mandatory death date (Law 8).
 * Records who deprecated it and when it should be removed.
 */
export async function deprecateProduct(
  productCode: string,
  deprecatedBy: string,
  removalDate: string,
  replacement?: string,
): Promise<void> {
  try {
    // Mark product as deprecated in metadata and set is_active false
    await query(
      `UPDATE platform_products
       SET is_active = FALSE,
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
             'deprecated', TRUE,
             'deprecated_by', $2::text,
             'deprecated_at', NOW()::text,
             'removal_date', $3::text,
             'replacement', $4::text
           ),
           updated_at = NOW()
       WHERE code = $1`,
      [productCode, deprecatedBy, removalDate, replacement || null],
    );

    // Record in deprecation audit trail
    await safeQuery(
      `INSERT INTO product_deprecations (product_code, deprecated_by, deprecated_at, removal_date, replacement)
       VALUES ($1, $2, NOW(), $3, $4)
       ON CONFLICT (product_code) DO UPDATE
       SET deprecated_by = EXCLUDED.deprecated_by, deprecated_at = NOW(),
           removal_date = EXCLUDED.removal_date, replacement = EXCLUDED.replacement`,
      [productCode, deprecatedBy, removalDate, replacement || null],
    );

    logger.info(`[ProductRegistry] Deprecated product ${productCode}, removal by ${removalDate}`);
  } catch (err) {
    logger.error(`[ProductRegistry] Failed to deprecate product ${productCode}: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Get module codes included in a product.
 */
export async function getProductModules(productCode: string): Promise<string[]> {
  try {
    const result = await query(
      `SELECT pm.module_code
       FROM product_modules pm
       JOIN platform_products pp ON pp.id = pm.product_id
       WHERE pp.code = $1 AND pm.is_active = TRUE
       ORDER BY pm.module_code`,
      [productCode],
    );
    return result.rows.map((r: any) => r.module_code);
  } catch (err) {
    logger.error(`[ProductRegistry] Failed to get modules for ${productCode}: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Check if a product is available (active and not deprecated/removed).
 */
export async function isProductAvailable(productCode: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT is_active, COALESCE(metadata->>'deprecated', 'false') AS deprecated,
              metadata->>'removal_date' AS removal_date
       FROM platform_products WHERE code = $1 LIMIT 1`,
      [productCode],
    );
    if (result.rows.length === 0) return false;
    const row = result.rows[0];
    if (!row.is_active) return false;
    if (row.deprecated === 'true') {
      // If past removal date, product is no longer available
      if (row.removal_date && new Date(row.removal_date) <= new Date()) return false;
    }
    return true;
  } catch (err) {
    logger.error(`[ProductRegistry] Failed to check availability for ${productCode}: ${(err as Error).message}`);
    return false;
  }
}

/**
 * Get the dependency graph for a product (other products it requires).
 */
export async function getProductDependencies(productCode: string): Promise<ProductDependency[]> {
  try {
    const result = await query(
      `SELECT product_code, depends_on, dependency_type AS type
       FROM product_dependencies
       WHERE product_code = $1
       ORDER BY depends_on`,
      [productCode],
    );
    return result.rows.map((r: any) => ({
      productCode: r.product_code,
      dependsOn: r.depends_on,
      type: r.type || 'required',
    }));
  } catch (err) {
    logger.error(`[ProductRegistry] Failed to get dependencies for ${productCode}: ${(err as Error).message}`);
    return [];
  }
}

// --- Internal helpers ---

function mapRowToProduct(row: any, modules?: string[]): ProductDefinition {
  return {
    code: row.code,
    name: row.name,
    description: row.description || '',
    version: row.version || '1.0.0',
    defaultTier: row.default_tier || 'standard',
    isActive: row.is_active !== false,
    modules: modules ?? (Array.isArray(row.modules) ? row.modules : []),
    metadata: typeof row.metadata === 'object' ? row.metadata : {},
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export const productRegistryService = {
  registerProduct,
  getProduct,
  listProducts,
  updateProduct,
  deprecateProduct,
  getProductModules,
  isProductAvailable,
  getProductDependencies,
};
