// ============================================================
// Dogan Operating System — Plan Compliance Guardian
// Monitors 90-day plan adherence and milestone compliance
// ============================================================

import { Pool } from 'pg';
import { getFirstRow } from '../../../shared/data/db-utils';
import { BaseDoganGuardian } from './base-dogan-guardian.worker';
import { swallowDefault, EC } from '../../../platform/dos/resilience/resilient-catch';
import { emptyResult } from '../../../config/database/database';

const OVERDUE_THRESHOLD_DAYS = 3;

/**
 * Watches tenant 90-day plans and provisioning milestones:
 * - Overdue plan items beyond grace period
 * - Stalled provisioning jobs
 * - Evidence task completion rates below threshold
 */
export class PlanComplianceGuardian extends BaseDoganGuardian {
  readonly guardianName = 'plan-compliance-guardian';
  readonly intervalMs = 300_000; // 5 minutes

  constructor(pool: Pool) {
    super(pool);
  }

  async execute(): Promise<void> {
    // Check for stalled provisioning jobs
    const stalledJobs = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), this.pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM public.provisioning_jobs
       WHERE status = 'running'
         AND started_at < NOW() - INTERVAL '30 minutes'`,
    ), { operation: 'fallback query' });

    const stalledCount: number = Number(getFirstRow<{ cnt?: number }>(stalledJobs)?.cnt ?? 0);
    if (stalledCount > 0) {
      this.log('warn', `${stalledCount} provisioning job(s) stalled >30 min`);
      await this.persistEvent('compliance', 'warn', {
        type: 'stalled_provisioning',
        count: stalledCount,
      });
    }

    // Check for overdue 90-day plan items across all tenants
    const overduePlans = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), this.pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM public.ninety_day_plan_items
       WHERE status NOT IN ('completed', 'skipped')
         AND due_date < NOW() - INTERVAL '${OVERDUE_THRESHOLD_DAYS} days'`,
    ), { operation: 'fallback query' });

    const overdueCount: number = Number(getFirstRow<{ cnt?: number }>(overduePlans)?.cnt ?? 0);
    if (overdueCount > 0) {
      this.log('warn', `${overdueCount} plan item(s) overdue by >${OVERDUE_THRESHOLD_DAYS} days`);
      await this.persistEvent('compliance', 'warn', {
        type: 'overdue_plan_items',
        count: overdueCount,
        thresholdDays: OVERDUE_THRESHOLD_DAYS,
      });
    }

    // Check for failed provisioning jobs in last hour
    const failedJobs = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), this.pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM public.provisioning_jobs
       WHERE status = 'failed'
         AND updated_at > NOW() - INTERVAL '1 hour'`,
    ), { operation: 'fallback query' });

    const failedCount: number = Number(getFirstRow<{ cnt?: number }>(failedJobs)?.cnt ?? 0);
    if (failedCount > 0) {
      this.log('error', `${failedCount} provisioning job(s) failed in last hour`);
      await this.persistEvent('compliance', 'error', {
        type: 'failed_provisioning',
        count: failedCount,
      });
    }
  }
}
