/**
 * Tenant Quota Service — AI spend limits per tenant.
 * Tracks token usage and enforces budgets to prevent runaway costs
 * in multi-tenant environments with 100+ concurrent tenants.
 */

import { emptyResult, safeQuery, tenantSchema } from '../../../../config/database';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';

interface TenantQuota {
  dailyTokenLimit: number;
  monthlyTokenLimit: number;
  maxAgentRunsPerHour: number;
  maxConcurrentRuns: number;
}

const DEFAULT_QUOTA: TenantQuota = {
  dailyTokenLimit: 500_000,
  monthlyTokenLimit: 10_000_000,
  maxAgentRunsPerHour: 120,
  maxConcurrentRuns: 5,
};

/**
 * Check whether a tenant is allowed to run an agent based on current usage.
 * Returns { allowed, reason?, usage } so callers can decide whether to proceed.
 */
export async function checkQuota(tenantId: string): Promise<{ allowed: boolean; reason?: string; usage: unknown }> {
  const s = tenantSchema(tenantId);

  // Fetch current usage in parallel — each query is non-fatal
  const [dailyResult, hourlyResult, concurrentResult] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ tokens: 0 }]), safeQuery(
      `SELECT COALESCE(SUM(tokens_used), 0)::int AS tokens
       FROM "${s}".agent_runs
       WHERE started_at > NOW() - INTERVAL '24 hours'`,
    ), { tenantId: tenantId, operation: 'query agent_runs' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ runs: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS runs
       FROM "${s}".agent_runs
       WHERE started_at > NOW() - INTERVAL '1 hour'`,
    ), { tenantId: tenantId, operation: 'query agent_runs' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ running: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS running
       FROM "${s}".agent_runs
       WHERE status = 'running'`,
    ), { tenantId: tenantId, operation: 'query agent_runs' }),
  ]);

  const dailyTokens = Number((dailyResult.rows[0] as any)?.tokens || 0);
  const hourlyRuns = Number((hourlyResult.rows[0] as any)?.runs || 0);
  const concurrent = Number((concurrentResult.rows[0] as any)?.running || 0);

  const quota = DEFAULT_QUOTA;
  const usage = { dailyTokens, hourlyRuns, concurrent, quota };

  if (dailyTokens >= quota.dailyTokenLimit) {
    return { allowed: false, reason: 'Daily token limit exceeded', usage };
  }
  if (hourlyRuns >= quota.maxAgentRunsPerHour) {
    return { allowed: false, reason: 'Hourly run limit exceeded', usage };
  }
  if (concurrent >= quota.maxConcurrentRuns) {
    return { allowed: false, reason: 'Max concurrent runs reached', usage };
  }

  return { allowed: true, usage };
}

/** Convenience wrapper returning just usage stats (for dashboards / health endpoints) */
export async function getQuotaUsage(tenantId: string): Promise<unknown> {
  const check = await checkQuota(tenantId);
  return check.usage;
}
