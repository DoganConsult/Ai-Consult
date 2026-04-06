// ============================================================
// Dogan Operating System — AI Regulatory Compliance Guardian
// Monitors AI agent actions for regulatory boundary adherence
// ============================================================

import { Pool } from 'pg';
import { getFirstRow } from '../../../shared/data/db-utils';
import { BaseDoganGuardian } from './base-dogan-guardian.worker';
import { swallowDefault, EC } from '../../../platform/dos/resilience/resilient-catch';
import { emptyResult } from '../../../config/database/database';

const WINDOW_MINUTES = 15;
const HIGH_RISK_ACTION_THRESHOLD = 5;

/**
 * Watches AI agent activity for regulatory compliance violations:
 * - Agents acting outside approved action boundaries
 * - Excessive high-risk actions without human approval
 * - Model governance policy breaches
 * - Agent budget threshold exceedances
 */
export class AIRegulatoryComplianceGuardian extends BaseDoganGuardian {
  readonly guardianName = 'ai-regulatory-compliance-guardian';
  readonly intervalMs = 60_000; // 1 minute — high-frequency for AI oversight

  constructor(pool: Pool) {
    super(pool);
  }

  async execute(): Promise<void> {
    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

    // Check for unapproved high-risk agent actions
    const highRiskActions = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), this.pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM public.agent_activity_log
       WHERE created_at >= $1
         AND risk_level IN ('high', 'critical')
         AND approval_status IS DISTINCT FROM 'approved'`,
      [since],
    ), { operation: 'fallback query' });

    const highRiskCount: number = Number(getFirstRow<{ cnt?: number }>(highRiskActions)?.cnt ?? 0);
    if (highRiskCount > HIGH_RISK_ACTION_THRESHOLD) {
      this.log('warn', `${highRiskCount} unapproved high-risk agent actions in ${WINDOW_MINUTES}min`);
      await this.persistEvent('ai_compliance', 'warn', {
        type: 'unapproved_high_risk_actions',
        count: highRiskCount,
        windowMinutes: WINDOW_MINUTES,
      });
    }

    // Check for agent mode violations (agent acting in wrong mode)
    const modeViolations = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), this.pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM public.agent_activity_log
       WHERE created_at >= $1
         AND action_type = 'mode_violation'`,
      [since],
    ), { operation: 'fallback query' });

    const modeCount: number = Number(getFirstRow<{ cnt?: number }>(modeViolations)?.cnt ?? 0);
    if (modeCount > 0) {
      this.log('error', `${modeCount} agent mode violation(s) detected`);
      await this.persistEvent('ai_compliance', 'critical', {
        type: 'agent_mode_violation',
        count: modeCount,
      });
    }

    // Check for budget threshold exceedances
    const budgetBreaches = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), this.pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM public.agent_activity_log
       WHERE created_at >= $1
         AND action_type = 'budget_exceeded'`,
      [since],
    ), { operation: 'fallback query' });

    const budgetCount: number = Number(getFirstRow<{ cnt?: number }>(budgetBreaches)?.cnt ?? 0);
    if (budgetCount > 0) {
      this.log('warn', `${budgetCount} agent budget exceedance(s) in ${WINDOW_MINUTES}min`);
      await this.persistEvent('ai_compliance', 'warn', {
        type: 'agent_budget_exceeded',
        count: budgetCount,
      });
    }
  }
}
