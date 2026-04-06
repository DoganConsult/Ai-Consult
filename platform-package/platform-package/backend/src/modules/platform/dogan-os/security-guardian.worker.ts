// ============================================================
// Dogan Operating System — Security Guardian
// Monitors audit trail for anomalous security patterns
// ============================================================

import { Pool } from 'pg';
import { getFirstRow } from '../../../shared/data/db-utils';
import { BaseDoganGuardian } from './base-dogan-guardian.worker';
import { swallowDefault, EC } from '../../../platform/dos/resilience/resilient-catch';
import { emptyResult } from '../../../config/database/database';

const FAILED_AUTH_THRESHOLD = 10;
const WINDOW_SECONDS = 60;

/**
 * Watches the audit_trail table for unusual security patterns:
 * - Excessive failed authentication attempts
 * - Privilege escalation attempts
 * - Cross-tenant access attempts
 */
export class SecurityGuardian extends BaseDoganGuardian {
  readonly guardianName = 'security-guardian';
  readonly intervalMs = 30_000; // 30 seconds

  constructor(pool: Pool) {
    super(pool);
  }

  async execute(): Promise<void> {
    const since = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();

    // Check for failed auth spikes
    const failedAuth = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), this.pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM public.audit_trail
       WHERE created_at >= $1
         AND action_type IN ('login_failed', 'auth_failed', 'token_rejected')`,
      [since],
    ), { operation: 'fallback query' });

    const failedCount: number = Number(getFirstRow<{ cnt?: number }>(failedAuth)?.cnt ?? 0);
    if (failedCount > FAILED_AUTH_THRESHOLD) {
      this.log('warn', `High failed auth count: ${failedCount} in last ${WINDOW_SECONDS}s`);
      await this.persistEvent('anomaly', 'warn', {
        type: 'failed_auth_spike',
        count: failedCount,
        windowSeconds: WINDOW_SECONDS,
      });
    }

    // Check for privilege escalation attempts
    const escalation = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), this.pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM public.audit_trail
       WHERE created_at >= $1
         AND action_type IN ('privilege_escalation', 'role_change_unauthorized', 'admin_impersonation')`,
      [since],
    ), { operation: 'fallback query' });

    const escalationCount: number = Number(getFirstRow<{ cnt?: number }>(escalation)?.cnt ?? 0);
    if (escalationCount > 0) {
      this.log('warn', `Privilege escalation attempts detected: ${escalationCount}`);
      await this.persistEvent('anomaly', 'error', {
        type: 'privilege_escalation',
        count: escalationCount,
      });
    }

    // Check for cross-tenant access attempts
    const crossTenant = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), this.pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM public.audit_trail
       WHERE created_at >= $1
         AND action_type IN ('cross_tenant_access', 'tenant_boundary_violation')`,
      [since],
    ), { operation: 'fallback query' });

    const crossCount: number = Number(getFirstRow<{ cnt?: number }>(crossTenant)?.cnt ?? 0);
    if (crossCount > 0) {
      this.log('error', `Cross-tenant access attempts: ${crossCount}`);
      await this.persistEvent('anomaly', 'critical', {
        type: 'cross_tenant_access',
        count: crossCount,
      });
    }
  }
}
