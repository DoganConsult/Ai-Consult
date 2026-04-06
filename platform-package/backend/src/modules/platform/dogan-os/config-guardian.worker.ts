// ============================================================
// Dogan Operating System — Config Guardian
// Monitors configuration drift and validates system settings
// ============================================================

import { Pool } from 'pg';
import { getFirstRow } from '../../../shared/data/db-utils';
import { BaseDoganGuardian } from './base-dogan-guardian.worker';
import { swallowDefault, EC } from '../../../platform/dos/resilience/resilient-catch';
import { emptyResult } from '../../../config/database/database';

/**
 * Watches for configuration anomalies across tenants:
 * - Missing required configuration keys
 * - Unexpected value changes in critical settings
 * - Configuration drift between expected and actual state
 */
export class ConfigGuardian extends BaseDoganGuardian {
  readonly guardianName = 'config-guardian';
  readonly intervalMs = 120_000; // 2 minutes

  constructor(pool: Pool) {
    super(pool);
  }

  async execute(): Promise<void> {
    // Check for missing critical configuration entries
    const missingConfigs = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), this.pool.query(
      `SELECT t.id AS tenant_id, t.slug
       FROM public.tenants t
       WHERE t.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM public.tenant_preferences tp
           WHERE tp.tenant_id = t.id
         )`,
    ), { operation: 'fallback query' });

    if (missingConfigs.rows.length > 0) {
      this.log('warn', `${missingConfigs.rows.length} active tenant(s) missing preferences`);
      await this.persistEvent('config_drift', 'warn', {
        type: 'missing_tenant_preferences',
        tenantCount: missingConfigs.rows.length,
        tenantSlugs: missingConfigs.rows.map((r: Record<string, unknown>) => String(r.slug ?? '')),
      });
    }

    // Check for disabled feature flags on active modules
    const disabledFlags = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), this.pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM public.feature_flags
       WHERE enabled = false
         AND feature_key LIKE '%_core_%'`,
    ), { operation: 'fallback query' });

    const disabledCount: number = Number(getFirstRow<{ cnt?: number }>(disabledFlags)?.cnt ?? 0);
    if (disabledCount > 0) {
      this.log('warn', `${disabledCount} core feature flag(s) currently disabled`);
      await this.persistEvent('config_drift', 'warn', {
        type: 'core_flags_disabled',
        count: disabledCount,
      });
    }
  }
}
