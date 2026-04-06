// @ts-nocheck
import { safeQuery } from '../../config/database/database';
import { logger } from '../logger';
import { CANONICAL_MODULES } from './canonical-modules';
import { toErrorMessage } from '../../../errors/http-error.util';
import { getFirstRow } from '../../../shared/data/db-utils';

export interface NavSeedItem {
  navKey: string;
  parentNavKey: string | null;
  labelEn: string;
  labelAr: string;
  route: string | null;
  icon: string | null;
  moduleCode: string;
  itemType: 'group' | 'link';
  sortOrder: number;
}

export function validateNavSeedItems(items: NavSeedItem[]): string[] {
  const errors: string[] = [];
  const navKeys = new Set<string>();

  for (const item of items) {
    if (navKeys.has(item.navKey)) {
      errors.push(`Duplicate nav_key: ${item.navKey}`);
    }
    navKeys.add(item.navKey);

    if (!CANONICAL_MODULES.has(item.moduleCode)) {
      errors.push(`Nav item '${item.navKey}' references non-canonical module_code '${item.moduleCode}'`);
    }

    if (item.parentNavKey && !navKeys.has(item.parentNavKey)) {
      const parentExists = items.some(i => i.navKey === item.parentNavKey);
      if (!parentExists) {
        errors.push(`Nav item '${item.navKey}' references parent '${item.parentNavKey}' which does not exist in seed`);
      }
    }

    if (item.itemType === 'link' && !item.route) {
      errors.push(`Nav link '${item.navKey}' has no route`);
    }

    if (item.itemType === 'group' && item.route) {
      errors.push(`Nav group '${item.navKey}' should not have a route`);
    }
  }

  return errors;
}

export async function seedNavigation(
  schema: string,
  items: NavSeedItem[],
  options: { dryRun?: boolean; preserveCustomOrder?: boolean } = {}
): Promise<{ inserted: number; updated: number; errors: string[] }> {
  const validationErrors = validateNavSeedItems(items);
  if (validationErrors.length > 0) {
    logger.error('[NavSeeding] Validation failed', { errors: validationErrors });
    return { inserted: 0, updated: 0, errors: validationErrors };
  }

  if (options.dryRun) {
    logger.info(`[NavSeeding] Dry run: would seed ${items.length} nav items into ${schema}`);
    return { inserted: items.length, updated: 0, errors: [] };
  }

  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      const result = await safeQuery(
        `INSERT INTO "${schema}".navigation_registry
           (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, TRUE)
         ON CONFLICT (nav_key) DO UPDATE SET
           parent_nav_key = EXCLUDED.parent_nav_key,
           label_en       = EXCLUDED.label_en,
           label_ar       = EXCLUDED.label_ar,
           route          = EXCLUDED.route,
           icon           = EXCLUDED.icon,
           module_code    = EXCLUDED.module_code,
           item_type      = EXCLUDED.item_type,
           sort_order     = CASE WHEN $10::boolean THEN "${schema}".navigation_registry.sort_order ELSE EXCLUDED.sort_order END,
           is_active      = EXCLUDED.is_active
         RETURNING (xmax = 0) AS was_inserted`,
        [
          item.navKey, item.parentNavKey, item.labelEn, item.labelAr,
          item.route, item.icon, item.moduleCode, item.itemType,
          item.sortOrder, options.preserveCustomOrder ?? false,
        ]
      );
      if (getFirstRow(result)?.was_inserted) {
        inserted++;
      } else {
        updated++;
      }
    } catch (err: unknown) {
      errors.push(`Failed to seed nav item '${item.navKey}': ${toErrorMessage(err)}`);
    }
  }

  logger.info(`[NavSeeding] Schema ${schema}: inserted=${inserted}, updated=${updated}, errors=${errors.length}`);
  return { inserted, updated, errors };
}

export async function repairNonCanonicalModuleCodes(schema: string): Promise<number> {
  const REPAIRS: [string, string][] = [
    ['reports', 'reporting'],
    ['controls', 'compliance'],
  ];

  let totalRepaired = 0;
  for (const [oldCode, newCode] of REPAIRS) {
    const result = await safeQuery(
      `UPDATE "${schema}".navigation_registry SET module_code = $2 WHERE module_code = $1`,
      [oldCode, newCode]
    );
    totalRepaired += result.rowCount ?? 0;
  }

  if (totalRepaired > 0) {
    logger.info(`[NavSeeding] Repaired ${totalRepaired} non-canonical module_code references in ${schema}`);
  }
  return totalRepaired;
}

export async function validateNavPageParity(
  schema: string,
  pageRoutes: Set<string>
): Promise<string[]> {
  const errors: string[] = [];

  try {
    const result = await safeQuery(
      `SELECT nav_key, route, module_code FROM "${schema}".navigation_registry WHERE item_type = 'link' AND is_active = TRUE`
    );

    for (const row of result.rows) {
      if (row.route && !pageRoutes.has(row.route)) {
        errors.push(`Nav link '${row.nav_key}' points to route '${row.route}' which has no page registry entry`);
      }
      if (row.module_code && !CANONICAL_MODULES.has(row.module_code)) {
        errors.push(`Nav item '${row.nav_key}' references non-canonical module_code '${row.module_code}'`);
      }
    }
  } catch {
    errors.push(`Could not read navigation_registry from schema ${schema}`);
  }

  return errors;
}
