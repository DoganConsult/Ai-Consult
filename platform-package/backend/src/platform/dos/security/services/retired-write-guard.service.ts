// @ts-nocheck
import { logger } from '../../../../utils/logger';
import { safeQuery } from '../../../../config/database';
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

const RETIRED_TABLE_PREFIXES = ['_retired_'];

const KNOWN_RETIRED_TABLES: string[] = [
  '_retired_onboarding_stage_definitions',
  '_retired_provisioning_step_definitions',
  '_retired_onboarding_ui_config',
  '_retired_onboarding_translations',
  '_retired_onboarding_tenant_overrides',
  '_retired_onboarding_config_audit',
  '_retired_lookup_countries',
  '_retired_lookup_cities',
  '_retired_lookup_sectors',
  '_retired_lookup_timezones',
  '_retired_lookup_languages',
  '_retired_lookup_employee_ranges',
  '_retired_lookup_frameworks',
  '_retired_onboarding_question_types',
  '_retired_onboarding_questions',
  '_retired_onboarding_question_options',
  '_retired_onboarding_user_answers',
  '_retired_onboarding_field_guidance',
  '_retired_onboarding_compliance_mapping',
  '_retired_onboarding_dynamic_lookups',
  'onboarding_answers_legacy_v1',
];

export interface RetiredWriteViolation {
  tableName: string;
  schema: string;
  lastWriteAt: string | null;
  rowCount: number;
}

export async function discoverRetiredTables(): Promise<string[]> {
  try {
    const result = await safeQuery(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public'
         AND (tablename LIKE '_retired_%' OR tablename LIKE '%_legacy_%')
       ORDER BY tablename`
    );
    return result.rows.map((r: GenericRow) => r.tablename);
  } catch {
    return KNOWN_RETIRED_TABLES;
  }
}

export async function checkRetiredTableWrites(): Promise<RetiredWriteViolation[]> {
  const violations: RetiredWriteViolation[] = [];
  const retiredTables = await discoverRetiredTables();

  for (const table of retiredTables) {
    try {
      const countResult = await safeQuery(
        `SELECT COUNT(*) AS cnt FROM public."${table}" LIMIT 1`
      );
      const rowCount = parseInt(getFirstRow(countResult)?.cnt ?? '0', 10);

      let lastWrite: string | null = null;
      try {
        const writeResult = await safeQuery(
          `SELECT MAX(GREATEST(
            COALESCE(created_at, '1970-01-01'::timestamptz),
            COALESCE(updated_at, '1970-01-01'::timestamptz)
          )) AS last_write FROM public."${table}"`
        );
        const ts = getFirstRow(writeResult)?.last_write;
        if (ts && new Date(ts).getFullYear() > 1970) {
          lastWrite = ts;
        }
      } catch {
        // Table may not have created_at/updated_at columns — skip
      }

      if (lastWrite) {
        const writeDate = new Date(lastWrite);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (writeDate > oneDayAgo) {
          violations.push({
            tableName: table,
            schema: 'public',
            lastWriteAt: lastWrite,
            rowCount,
          });
        }
      }
    } catch {
      // Table may not exist (migration not yet run) — skip
    }
  }

  return violations;
}

export async function runRetiredWriteGuardCheck(): Promise<{
  status: 'clean' | 'violations_found';
  violations: RetiredWriteViolation[];
  retiredTableCount: number;
  checkedAt: string;
}> {
  const retiredTables = await discoverRetiredTables();
  const violations = await checkRetiredTableWrites();

  if (violations.length > 0) {
    logger.warn(
      `[RetiredWriteGuard] ${violations.length} retired table(s) had writes in the last 24h:`,
      violations.map(v => `${v.tableName} (last write: ${v.lastWriteAt})`)
    );
  }

  return {
    status: violations.length === 0 ? 'clean' : 'violations_found',
    violations,
    retiredTableCount: retiredTables.length,
    checkedAt: new Date().toISOString(),
  };
}

export function isRetiredTable(tableName: string): boolean {
  if (KNOWN_RETIRED_TABLES.includes(tableName)) return true;
  return RETIRED_TABLE_PREFIXES.some(prefix => tableName.startsWith(prefix));
}
