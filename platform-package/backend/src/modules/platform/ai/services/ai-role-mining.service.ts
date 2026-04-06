/**
 * AI Role Mining Service
 *
 * Analyzes user activity patterns from audit_trail to suggest optimal role
 * assignments. Groups actions by user, identifies permission usage clusters,
 * and recommends role changes (promotions, demotions, or re-assignments).
 *
 * Used by DAuth-adjacent AI processes to improve role fitness over time.
 *
 * @owner AI-Agent
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

// ── Types ────────────────────────────────────────────────────────────────────

export interface UserActionProfile {
  userId: string;
  totalActions: number;
  distinctModules: string[];
  distinctActionTypes: string[];
  topActions: Array<{ action: string; module: string; count: number }>;
  activeWindowDays: number;
  lastActivityAt: string | null;
}

export interface RoleSuggestion {
  userId: string;
  currentRoles: string[];
  suggestedRole: string;
  reason: string;
  confidence: number;
  evidenceActions: string[];
}

export interface RoleMiningResult {
  tenantId: string;
  usersAnalyzed: number;
  suggestions: RoleSuggestion[];
  clusterSummary: Array<{ cluster: string; userCount: number; dominantActions: string[] }>;
  executedAt: string;
  durationMs: number;
}

// ── Role archetype patterns (used for matching) ──────────────────────────────

interface RolePattern {
  roleCode: string;
  requiredModules: string[];
  requiredActionTypes: string[];
  minActionsPerWeek: number;
}

const ROLE_PATTERNS: RolePattern[] = [
  {
    roleCode: 'module_lead',
    requiredModules: [],
    requiredActionTypes: ['create', 'update', 'delete', 'approve', 'manage'],
    minActionsPerWeek: 20,
  },
  {
    roleCode: 'approver',
    requiredModules: [],
    requiredActionTypes: ['approve', 'reject', 'review'],
    minActionsPerWeek: 5,
  },
  {
    roleCode: 'operator',
    requiredModules: [],
    requiredActionTypes: ['create', 'update'],
    minActionsPerWeek: 10,
  },
  {
    roleCode: 'contributor',
    requiredModules: [],
    requiredActionTypes: ['create', 'update', 'comment'],
    minActionsPerWeek: 5,
  },
  {
    roleCode: 'reviewer',
    requiredModules: [],
    requiredActionTypes: ['read', 'view', 'export'],
    minActionsPerWeek: 3,
  },
  {
    roleCode: 'viewer',
    requiredModules: [],
    requiredActionTypes: ['read', 'view'],
    minActionsPerWeek: 1,
  },
];

// ── Core Mining Functions ────────────────────────────────────────────────────

/**
 * Run role mining analysis for a specific tenant.
 * Scans audit_trail for the given window, clusters users by action patterns,
 * and generates role suggestions.
 */
export async function runRoleMining(
  tenantId: string,
  options: { windowDays?: number; minActions?: number } = {},
): Promise<RoleMiningResult> {
  const startTime = Date.now();
  const windowDays = options.windowDays ?? 90;
  const minActions = options.minActions ?? 5;
  const schema = tenantSchema(tenantId);

  logger.info(`[role-mining] Starting analysis for tenant ${tenantId} (window=${windowDays}d, min=${minActions})`);

  // Step 1: Build user action profiles
  const profiles = await buildUserActionProfiles(schema, tenantId, windowDays, minActions);

  // Step 2: Get current role assignments
  const currentRoleMap = await getCurrentRoleAssignments(schema, tenantId);

  // Step 3: Generate suggestions by matching profiles to role patterns
  const suggestions: RoleSuggestion[] = [];

  for (const profile of profiles) {
    const currentRoles = currentRoleMap.get(profile.userId) || [];
    const suggestedRole = matchBestRole(profile);

    if (!suggestedRole) continue;

    // Only suggest if the role is different from current assignments
    if (currentRoles.includes(suggestedRole.roleCode)) continue;

    const confidence = computeConfidence(profile, suggestedRole);
    if (confidence < 0.4) continue; // Skip low-confidence suggestions

    suggestions.push({
      userId: profile.userId,
      currentRoles,
      suggestedRole: suggestedRole.roleCode,
      reason: buildReason(profile, suggestedRole, currentRoles),
      confidence,
      evidenceActions: profile.topActions.slice(0, 5).map(a => `${a.module}.${a.action}`),
    });
  }

  // Step 4: Build cluster summary
  const clusterSummary = buildClusterSummary(profiles);

  const durationMs = Date.now() - startTime;
  logger.info(
    `[role-mining] Completed for tenant ${tenantId}: ${profiles.length} users analyzed, ` +
    `${suggestions.length} suggestions generated in ${durationMs}ms`,
  );

  return {
    tenantId,
    usersAnalyzed: profiles.length,
    suggestions: suggestions.sort((a, b) => b.confidence - a.confidence),
    clusterSummary,
    executedAt: new Date().toISOString(),
    durationMs,
  };
}

/**
 * Get a role mining summary for a specific user.
 */
export async function getUserRoleSuggestion(
  tenantId: string,
  userId: string,
  windowDays: number = 90,
): Promise<RoleSuggestion | null> {
  const schema = tenantSchema(tenantId);
  const profiles = await buildUserActionProfiles(schema, tenantId, windowDays, 1);
  const profile = profiles.find(p => p.userId === userId);
  if (!profile) return null;

  const currentRoleMap = await getCurrentRoleAssignments(schema, tenantId);
  const currentRoles = currentRoleMap.get(userId) || [];
  const suggested = matchBestRole(profile);
  if (!suggested) return null;

  return {
    userId,
    currentRoles,
    suggestedRole: suggested.roleCode,
    reason: buildReason(profile, suggested, currentRoles),
    confidence: computeConfidence(profile, suggested),
    evidenceActions: profile.topActions.slice(0, 5).map(a => `${a.module}.${a.action}`),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function buildUserActionProfiles(
  schema: string,
  tenantId: string,
  windowDays: number,
  minActions: number,
): Promise<UserActionProfile[]> {
  try {
    const result = await safeQuery(
      `SELECT
         user_id,
         COUNT(*)::int AS total_actions,
         ARRAY_AGG(DISTINCT module) FILTER (WHERE module IS NOT NULL) AS distinct_modules,
         ARRAY_AGG(DISTINCT action) FILTER (WHERE action IS NOT NULL) AS distinct_action_types,
         EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 86400 AS active_window_days,
         MAX(created_at) AS last_activity_at
       FROM "${schema}".audit_trail
       WHERE tenant_id = $1
         AND created_at > NOW() - ($2 || ' days')::interval
         AND user_id IS NOT NULL
       GROUP BY user_id
       HAVING COUNT(*) >= $3
       ORDER BY total_actions DESC`,
      [tenantId, windowDays, minActions],
    );

    const profiles: UserActionProfile[] = [];

    for (const row of result.rows) {
      // Fetch top actions for this user
      const topResult = await safeQuery(
        `SELECT action, module, COUNT(*)::int AS cnt
         FROM "${schema}".audit_trail
         WHERE tenant_id = $1 AND user_id = $2
           AND created_at > NOW() - ($3 || ' days')::interval
         GROUP BY action, module
         ORDER BY cnt DESC
         LIMIT 10`,
        [tenantId, row.user_id, windowDays],
      );

      profiles.push({
        userId: row.user_id,
        totalActions: row.total_actions,
        distinctModules: row.distinct_modules || [],
        distinctActionTypes: row.distinct_action_types || [],
        topActions: topResult.rows.map((r: Record<string, any>) => ({
          action: r.action,
          module: r.module,
          count: r.cnt,
        })),
        activeWindowDays: Math.round(row.active_window_days || 0),
        lastActivityAt: row.last_activity_at || null,
      });
    }

    return profiles;
  } catch (err) {
    logger.warn(`[role-mining] Failed to build user action profiles: ${err}`);
    return [];
  }
}

async function getCurrentRoleAssignments(
  schema: string,
  tenantId: string,
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  try {
    const result = await safeQuery(
      `SELECT user_id, ARRAY_AGG(DISTINCT role_code) AS roles
       FROM "${schema}".user_role_assignments
       WHERE tenant_id = $1 AND status = 'active'
       GROUP BY user_id`,
      [tenantId],
    );
    for (const row of result.rows) {
      map.set(row.user_id, row.roles || []);
    }
  } catch {
    // Table may not exist — return empty map
  }
  return map;
}

function matchBestRole(profile: UserActionProfile): RolePattern | null {
  let bestMatch: RolePattern | null = null;
  let bestScore = 0;

  const actionsPerWeek = profile.activeWindowDays > 0
    ? (profile.totalActions / profile.activeWindowDays) * 7
    : profile.totalActions;

  for (const pattern of ROLE_PATTERNS) {
    // Check if action types overlap
    const overlap = pattern.requiredActionTypes.filter(
      at => profile.distinctActionTypes.some(uat => uat.toLowerCase().includes(at)),
    );
    if (overlap.length === 0) continue;

    // Check activity volume
    if (actionsPerWeek < pattern.minActionsPerWeek) continue;

    // Score: ratio of overlap + volume bonus
    const overlapRatio = overlap.length / pattern.requiredActionTypes.length;
    const volumeBonus = Math.min(1, actionsPerWeek / (pattern.minActionsPerWeek * 3));
    const score = overlapRatio * 0.7 + volumeBonus * 0.3;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = pattern;
    }
  }

  return bestMatch;
}

function computeConfidence(profile: UserActionProfile, pattern: RolePattern): number {
  const actionsPerWeek = profile.activeWindowDays > 0
    ? (profile.totalActions / profile.activeWindowDays) * 7
    : profile.totalActions;

  const overlap = pattern.requiredActionTypes.filter(
    at => profile.distinctActionTypes.some(uat => uat.toLowerCase().includes(at)),
  );

  const overlapRatio = overlap.length / pattern.requiredActionTypes.length;
  const volumeRatio = Math.min(1, actionsPerWeek / (pattern.minActionsPerWeek * 2));
  const recencyBonus = profile.lastActivityAt
    ? Math.max(0, 1 - (Date.now() - new Date(profile.lastActivityAt).getTime()) / (30 * 86400000))
    : 0;

  return Math.round((overlapRatio * 0.5 + volumeRatio * 0.3 + recencyBonus * 0.2) * 100) / 100;
}

function buildReason(
  profile: UserActionProfile,
  pattern: RolePattern,
  currentRoles: string[],
): string {
  const actionsPerWeek = profile.activeWindowDays > 0
    ? Math.round((profile.totalActions / profile.activeWindowDays) * 7)
    : profile.totalActions;

  const parts: string[] = [];
  parts.push(`User performs ~${actionsPerWeek} actions/week across ${profile.distinctModules.length} module(s).`);
  parts.push(`Action pattern matches '${pattern.roleCode}' archetype.`);

  if (currentRoles.length > 0) {
    parts.push(`Currently assigned: ${currentRoles.join(', ')}.`);
  } else {
    parts.push('No current role assignments found.');
  }

  return parts.join(' ');
}

function buildClusterSummary(
  profiles: UserActionProfile[],
): Array<{ cluster: string; userCount: number; dominantActions: string[] }> {
  // Simple clustering: group by primary module
  const clusters = new Map<string, { users: number; actions: Map<string, number> }>();

  for (const profile of profiles) {
    // Determine primary module (most frequent)
    const moduleCounts = new Map<string, number>();
    for (const ta of profile.topActions) {
      moduleCounts.set(ta.module, (moduleCounts.get(ta.module) || 0) + ta.count);
    }

    let primaryModule = 'unknown';
    let maxCount = 0;
    for (const [mod, count] of moduleCounts) {
      if (count > maxCount) {
        primaryModule = mod;
        maxCount = count;
      }
    }

    if (!clusters.has(primaryModule)) {
      clusters.set(primaryModule, { users: 0, actions: new Map() });
    }
    const cluster = clusters.get(primaryModule)!;
    cluster.users++;

    for (const ta of profile.topActions) {
      const key = `${ta.module}.${ta.action}`;
      cluster.actions.set(key, (cluster.actions.get(key) || 0) + ta.count);
    }
  }

  return Array.from(clusters.entries())
    .map(([cluster, data]) => {
      const sortedActions = Array.from(data.actions.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([a]) => a);
      return { cluster, userCount: data.users, dominantActions: sortedActions };
    })
    .sort((a, b) => b.userCount - a.userCount);
}
