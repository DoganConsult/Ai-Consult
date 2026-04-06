// ============================================================
// Dogan Operating System — Data Integrity Guardian
// Scans tenant schemas for orphaned records
// ============================================================

import { Pool } from 'pg';
import { getFirstRow } from '../../../shared/data/db-utils';
import { tenantSchema } from '../../../config/db';
import { BaseDoganGuardian } from './base-dogan-guardian.worker';
import { swallowDefault, EC } from '../../../platform/dos/resilience/resilient-catch';
import { emptyResult } from '../../../config/database/database';

/**
 * Periodically scans tenant schemas for data integrity issues:
 * - Evidence tasks without matching controls
 * - Risks without assigned owners
 * - Orphaned workflow instances
 */
export class DataIntegrityGuardian extends BaseDoganGuardian {
  readonly guardianName = 'data-integrity-guardian';
  readonly intervalMs = 300_000; // 5 minutes

  constructor(pool: Pool) {
    super(pool);
  }

  async execute(): Promise<void> {
    // Get all active tenant schemas
    const tenants = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), this.pool.query(
      `SELECT tenant_id FROM public.tenants WHERE is_active = true`,
    ), { operation: 'fallback query' });

    for (const row of tenants.rows) {
      const schema = tenantSchema(row.tenant_id as string);
      await this.checkTenantIntegrity(schema, row.tenant_id as string);
    }
  }

  private async checkTenantIntegrity(schema: string, tenantId: string): Promise<void> {
    const issues: Record<string, number> = {};

    // 1. Evidence tasks referencing non-existent controls
    const orphanedEvidence = await this.safeCount(
      `SELECT COUNT(*)::int AS cnt
       FROM "${schema}".evidence_tasks et
       LEFT JOIN "${schema}".controls c ON c.control_id = et.control_id
       WHERE c.control_id IS NULL AND et.control_id IS NOT NULL`,
    );
    if (orphanedEvidence > 0) issues['orphaned_evidence_tasks'] = orphanedEvidence;

    // 2. Risks without owners
    const unownedRisks = await this.safeCount(
      `SELECT COUNT(*)::int AS cnt
       FROM "${schema}".risks
       WHERE risk_owner IS NULL OR risk_owner = ''`,
    );
    if (unownedRisks > 0) issues['risks_without_owners'] = unownedRisks;

    // 3. Process tasks referencing deleted teams
    const orphanedTasks = await this.safeCount(
      `SELECT COUNT(*)::int AS cnt
       FROM "${schema}".process_tasks pt
       LEFT JOIN "${schema}".teams t ON t.team_id = pt.team_id
       WHERE t.team_id IS NULL AND pt.team_id IS NOT NULL`,
    );
    if (orphanedTasks > 0) issues['orphaned_process_tasks'] = orphanedTasks;

    // Report findings
    if (Object.keys(issues).length > 0) {
      const total = Object.values(issues).reduce((a, b) => a + b, 0);
      this.log('warn', `Tenant ${tenantId}: ${total} integrity issue(s) found`);
      await this.persistEvent('anomaly', 'warn', { tenantId, issues });
    }
  }

  /** Execute a COUNT query, returning 0 on any error (table may not exist). */
  private async safeCount(sql: string): Promise<number> {
    try {
      const r = await this.pool.query(sql);
      return Number(getFirstRow<{ cnt?: number }>(r)?.cnt ?? 0);
    } catch {
      return 0;
    }
  }
}
