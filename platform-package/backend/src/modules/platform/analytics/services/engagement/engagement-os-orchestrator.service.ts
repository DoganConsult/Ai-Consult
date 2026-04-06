// @ts-nocheck
/**
 * Engagement OS Orchestrator Service
 * @owner Shahin-AI
 *
 * Orchestrates engagement analytics for a tenant:
 *   - User login frequency (from audit_trail action='auth.login')
 *   - Feature adoption rates (distinct features used / total available)
 *   - Module usage patterns (action counts per module from audit_trail)
 *   - Engagement score per tenant (composite weighted metric)
 *
 * Reads from tenant-schema `audit_trail` table.
 */

import { safeQuery, tenantSchema } from '../../../../../config/database';
import { logger } from '../../../../../platform/dos/observability/services/logger.service';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LoginFrequencyRecord {
  userId: string;
  loginCount: number;
  lastLogin: string | null;
  avgDaysBetweenLogins: number | null;
}

export interface ModuleUsageRecord {
  moduleCode: string;
  actionCount: number;
  uniqueUsers: number;
}

export interface FeatureAdoptionRecord {
  featureKey: string;
  uniqueUsers: number;
  totalActions: number;
  adoptionRate: number; // 0–1
}

export interface UserEngagementScore {
  userId: string;
  loginScore: number;
  breadthScore: number;
  depthScore: number;
  composite: number; // 0–100
}

export interface EngagementCycleResult {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  computedAt: string;
  totalActiveUsers: number;
  loginFrequency: LoginFrequencyRecord[];
  moduleUsage: ModuleUsageRecord[];
  featureAdoption: FeatureAdoptionRecord[];
  userScores: UserEngagementScore[];
  tenantEngagementScore: number; // avg of user composites
}

// ── Configuration ────────────────────────────────────────────────────────────

const SCORE_WEIGHTS = {
  login: 0.3,
  breadth: 0.35,
  depth: 0.35,
};

const DEFAULT_PERIOD_DAYS = 30;

// ── Core Orchestrator ────────────────────────────────────────────────────────

/**
 * Run a full engagement analytics cycle for a tenant.
 *
 * @param tenantId  - Tenant identifier
 * @param periodDays - Lookback period in days (default 30)
 */
export async function runEngagementOSCycle(
  tenantId: string,
  periodDays: number = DEFAULT_PERIOD_DAYS,
): Promise<EngagementCycleResult> {
  const schema = tenantSchema(tenantId);
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 86_400_000);
  const periodStartISO = periodStart.toISOString();
  const periodEndISO = now.toISOString();

  logger.info(
    `[EngagementOS] Starting cycle for tenant=${tenantId}, period=${periodDays}d`,
  );

  const [loginFrequency, moduleUsage, featureAdoption, totalActiveUsers] = await Promise.all([
    computeLoginFrequency(schema, periodStartISO),
    computeModuleUsage(schema, periodStartISO),
    computeFeatureAdoption(schema, periodStartISO),
    countActiveUsers(schema, periodStartISO),
  ]);

  const userScores = computeUserScores(
    loginFrequency,
    moduleUsage,
    featureAdoption,
    totalActiveUsers,
  );

  const tenantEngagementScore = userScores.length > 0
    ? Math.round(userScores.reduce((sum, u) => sum + u.composite, 0) / userScores.length)
    : 0;

  logger.info(
    `[EngagementOS] Tenant ${tenantId}: ${totalActiveUsers} active users, ` +
    `score=${tenantEngagementScore}`,
  );

  return {
    tenantId,
    periodStart: periodStartISO,
    periodEnd: periodEndISO,
    computedAt: now.toISOString(),
    totalActiveUsers,
    loginFrequency,
    moduleUsage,
    featureAdoption,
    userScores,
    tenantEngagementScore,
  };
}

// ── Login Frequency ──────────────────────────────────────────────────────────

async function computeLoginFrequency(
  schema: string,
  since: string,
): Promise<LoginFrequencyRecord[]> {
  const result = await safeQuery(
    `SELECT
       actor_id AS user_id,
       COUNT(*)::int AS login_count,
       MAX(created_at) AS last_login,
       CASE WHEN COUNT(*) > 1
            THEN EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / (COUNT(*) - 1) / 86400
            ELSE NULL
       END AS avg_days_between
     FROM ${schema}.audit_trail
     WHERE action = 'auth.login'
       AND created_at >= $1
     GROUP BY actor_id
     ORDER BY login_count DESC`,
    [since],
  );

  return (result.rows ?? []).map((r: any) => ({
    userId: r.user_id,
    loginCount: Number(r.login_count),
    lastLogin: r.last_login ? new Date(r.last_login).toISOString() : null,
    avgDaysBetweenLogins: r.avg_days_between != null ? Math.round(Number(r.avg_days_between) * 100) / 100 : null,
  }));
}

// ── Module Usage ─────────────────────────────────────────────────────────────

async function computeModuleUsage(
  schema: string,
  since: string,
): Promise<ModuleUsageRecord[]> {
  const result = await safeQuery(
    `SELECT
       SPLIT_PART(action, '.', 1) AS module_code,
       COUNT(*)::int AS action_count,
       COUNT(DISTINCT actor_id)::int AS unique_users
     FROM ${schema}.audit_trail
     WHERE created_at >= $1
       AND action IS NOT NULL
       AND action <> ''
     GROUP BY module_code
     ORDER BY action_count DESC`,
    [since],
  );

  return (result.rows ?? []).map((r: any) => ({
    moduleCode: r.module_code,
    actionCount: Number(r.action_count),
    uniqueUsers: Number(r.unique_users),
  }));
}

// ── Feature Adoption ─────────────────────────────────────────────────────────

async function computeFeatureAdoption(
  schema: string,
  since: string,
): Promise<FeatureAdoptionRecord[]> {
  // Total distinct users in period (denominator for adoption rate)
  const totalUsersResult = await safeQuery(
    `SELECT COUNT(DISTINCT actor_id)::int AS total
     FROM ${schema}.audit_trail
     WHERE created_at >= $1`,
    [since],
  );
  const totalUsers = Number(totalUsersResult.rows?.[0]?.total ?? 0);
  if (totalUsers === 0) return [];

  const result = await safeQuery(
    `SELECT
       action AS feature_key,
       COUNT(DISTINCT actor_id)::int AS unique_users,
       COUNT(*)::int AS total_actions
     FROM ${schema}.audit_trail
     WHERE created_at >= $1
       AND action IS NOT NULL
       AND action <> ''
     GROUP BY action
     ORDER BY unique_users DESC`,
    [since],
  );

  return (result.rows ?? []).map((r: any) => ({
    featureKey: r.feature_key,
    uniqueUsers: Number(r.unique_users),
    totalActions: Number(r.total_actions),
    adoptionRate: Math.round((Number(r.unique_users) / totalUsers) * 10000) / 10000,
  }));
}

// ── Active User Count ────────────────────────────────────────────────────────

async function countActiveUsers(schema: string, since: string): Promise<number> {
  const result = await safeQuery(
    `SELECT COUNT(DISTINCT actor_id)::int AS total
     FROM ${schema}.audit_trail
     WHERE created_at >= $1`,
    [since],
  );
  return Number(result.rows?.[0]?.total ?? 0);
}

// ── Scoring ──────────────────────────────────────────────────────────────────

function computeUserScores(
  logins: LoginFrequencyRecord[],
  moduleUsage: ModuleUsageRecord[],
  featureAdoption: FeatureAdoptionRecord[],
  totalActiveUsers: number,
): UserEngagementScore[] {
  if (totalActiveUsers === 0) return [];

  const loginMap = new Map<string, number>();
  let maxLogins = 1;
  for (const l of logins) {
    loginMap.set(l.userId, l.loginCount);
    if (l.loginCount > maxLogins) maxLogins = l.loginCount;
  }

  const totalModules = moduleUsage.length || 1;
  const __totalFeatures = featureAdoption.length || 1;

  // Build per-user module/feature counts from adoption data
  // Since we only have aggregate data, we derive scores from login data users
  const userIds = Array.from(loginMap.keys());

  return userIds.map((userId) => {
    // Login score: normalized 0–100
    const loginCount = loginMap.get(userId) ?? 0;
    const loginScore = Math.min(100, Math.round((loginCount / maxLogins) * 100));

    // Breadth score: how many modules this user's actions span (estimate from adoption)
    // We use the ratio of modules with at least some adoption
    const breadthScore = Math.min(100, Math.round((totalModules / Math.max(totalModules, 5)) * 100));

    // Depth score: based on total actions relative to average
    const avgActionsPerUser = featureAdoption.reduce((s, f) => s + f.totalActions, 0) / totalActiveUsers;
    const depthScore = avgActionsPerUser > 0
      ? Math.min(100, Math.round((loginCount / Math.max(avgActionsPerUser, 1)) * 50))
      : 0;

    const composite = Math.round(
      SCORE_WEIGHTS.login * loginScore +
      SCORE_WEIGHTS.breadth * breadthScore +
      SCORE_WEIGHTS.depth * depthScore,
    );

    return { userId, loginScore, breadthScore, depthScore, composite };
  });
}
