/**
 * Registers default entity routing and optionally merges per-tenant `entity_routing_config` (migration 357).
 */
import { query } from '../../../../config/database';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { logger } from '../../../../platform/dos/observability/services/logger.service';
import {
  DEFAULT_ENTITY_MODULES,
  DEFAULT_ENTITY_TABLES,
  DEFAULT_FALLBACK_DOMAINS,
} from './entity-routing-defaults';
import { registerEntityModule, registerEntityTable, registerFallbackDomain } from '../../../../platform/dos/workflows/orchestration/legacy-routing-registry';

/** Re-applies code defaults (safe to call multiple times; overwrites same keys). */
export function registerDefaultEntityRouting(): void {
  for (const [k, v] of Object.entries(DEFAULT_ENTITY_MODULES)) {
    registerEntityModule(k, v);
  }
  for (const [k, v] of Object.entries(DEFAULT_ENTITY_TABLES)) {
    registerEntityTable(k, v);
  }
  for (const [k, v] of Object.entries(DEFAULT_FALLBACK_DOMAINS)) {
    registerFallbackDomain(k, v);
  }
}

/** Overlay registry from one tenant schema's entity_routing_config (if table exists). */
export async function mergeEntityRoutingFromTenantSchema(schemaName: string): Promise<void> {
  if (!/^tenant_[a-zA-Z0-9_]+$/.test(schemaName)) {
    return;
  }
  try {
    const res = await query(
      `SELECT entity_type, module_code, entity_table, entity_pk, owner_col, reviewer_col, approver_col, org_unit_col,
              fallback_scope_type, fallback_scope_id, fallback_team_code
       FROM "${schemaName}".entity_routing_config
       WHERE is_active = true`,
    );
    for (const row of res.rows) {
      const et = String(row.entity_type);
      if (row.module_code) {
        registerEntityModule(et, String(row.module_code));
      }
      if (row.entity_table && row.entity_pk) {
        registerEntityTable(et, {
          table: String(row.entity_table),
          pk: String(row.entity_pk),
          ownerCol: row.owner_col ? String(row.owner_col) : 'owner_user_id',
          reviewerCol: row.reviewer_col ? String(row.reviewer_col) : undefined,
          approverCol: row.approver_col ? String(row.approver_col) : undefined,
          orgUnitCol: row.org_unit_col ? String(row.org_unit_col) : undefined,
        });
      }
      if (row.fallback_scope_id != null || row.fallback_team_code != null) {
        registerFallbackDomain(et, {
          scopeType: row.fallback_scope_type ? String(row.fallback_scope_type) : 'process',
          scopeId: row.fallback_scope_id != null ? String(row.fallback_scope_id) : '',
          fallbackTeamCode: row.fallback_team_code != null ? String(row.fallback_team_code) : 'CYBER_GOV',
        });
      }
    }
  } catch (e: unknown) {
    logger.debug('[entity-routing] merge skipped for schema', {
      schema: schemaName,
      error: toErrorMessage(e),
    });
  }
}

/** After migrations: merge DB config from every tenant_* schema so runtime matches customized rows. */
export async function mergeEntityRoutingForAllTenantSchemas(): Promise<void> {
  const res = await query(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name ~ '^tenant_'`,
  );
  for (const row of res.rows) {
    const sn = row.schema_name as string;
    await mergeEntityRoutingFromTenantSchema(sn);
  }
  logger.info('[entity-routing] Merged entity_routing_config from tenant schemas', {
    count: res.rows.length,
  });
}
