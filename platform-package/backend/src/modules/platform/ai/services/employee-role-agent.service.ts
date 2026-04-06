/**
 * Employee Role Fitness Agent Service
 * @owner AI-Agent
 *
 * Monitors employee role fitness by comparing user competencies against
 * role competency requirements. Flags mismatches where users lack required
 * competencies for their assigned roles and returns actionable recommendations.
 *
 * Tables (tenant schema):
 *   - user_competencies(user_id, competency_id, competency_name, proficiency_level, assessed_at)
 *   - role_competency_requirements(role_id, competency_id, competency_name, required_level, is_mandatory)
 *   - user_roles(user_id, role_id, role_name, assigned_at)
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CompetencyGap {
  userId: string;
  roleId: string;
  roleName: string;
  competencyId: string;
  competencyName: string;
  requiredLevel: number;
  currentLevel: number | null;
  isMandatory: boolean;
  gapSeverity: 'critical' | 'major' | 'minor';
}

export interface RoleFitnessReport {
  userId: string;
  roleId: string;
  roleName: string;
  fitnessScore: number;          // 0–100
  totalRequired: number;
  met: number;
  gaps: CompetencyGap[];
  recommendations: string[];
}

export interface TenantFitnessSummary {
  tenantId: string;
  evaluatedAt: string;
  totalUsersEvaluated: number;
  totalGapsFound: number;
  criticalGaps: number;
  reports: RoleFitnessReport[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function classifyGapSeverity(
  requiredLevel: number,
  currentLevel: number | null,
  isMandatory: boolean,
): CompetencyGap['gapSeverity'] {
  const effective = currentLevel ?? 0;
  const delta = requiredLevel - effective;
  if (isMandatory && effective === 0) return 'critical';
  if (delta >= 3) return 'critical';
  if (delta >= 2 || isMandatory) return 'major';
  return 'minor';
}

function buildRecommendations(gaps: CompetencyGap[]): string[] {
  const recs: string[] = [];
  const critical = gaps.filter(g => g.gapSeverity === 'critical');
  const major = gaps.filter(g => g.gapSeverity === 'major');

  if (critical.length > 0) {
    recs.push(
      `Immediate action required: ${critical.length} critical competency gap(s) detected. ` +
      `Competencies: ${critical.map(g => g.competencyName).join(', ')}.`,
    );
    recs.push('Consider mandatory training or role reassignment for critical gaps.');
  }
  if (major.length > 0) {
    recs.push(
      `Schedule training for ${major.length} major gap(s): ${major.map(g => g.competencyName).join(', ')}.`,
    );
  }
  if (gaps.length === 0) {
    recs.push('All competency requirements met. No action needed.');
  }
  return recs;
}

// ── Core Service ─────────────────────────────────────────────────────────────

/**
 * Evaluate role fitness for a single user within a tenant.
 */
export async function evaluateUserRoleFitness(
  tenantId: string,
  userId: string,
): Promise<RoleFitnessReport[]> {
  const schema = tenantSchema(tenantId);
  const reports: RoleFitnessReport[] = [];

  // Fetch all roles assigned to this user
  const rolesResult = await safeQuery(
    `SELECT role_id, role_name FROM ${schema}.user_roles WHERE user_id = $1`,
    [userId],
  );

  if (!rolesResult.rows || rolesResult.rows.length === 0) {
    logger.info(`[EmployeeRoleAgent] No roles found for user ${userId} in tenant ${tenantId}`);
    return [];
  }

  for (const role of rolesResult.rows) {
    const report = await evaluateSingleRole(schema, userId, role.role_id, role.role_name);
    reports.push(report);
  }

  return reports;
}

async function evaluateSingleRole(
  schema: string,
  userId: string,
  roleId: string,
  roleName: string,
): Promise<RoleFitnessReport> {
  // Fetch role competency requirements
  const reqResult = await safeQuery(
    `SELECT competency_id, competency_name, required_level, COALESCE(is_mandatory, false) AS is_mandatory
     FROM ${schema}.role_competency_requirements
     WHERE role_id = $1`,
    [roleId],
  );

  const requirements = reqResult.rows ?? [];

  if (requirements.length === 0) {
    return {
      userId,
      roleId,
      roleName,
      fitnessScore: 100,
      totalRequired: 0,
      met: 0,
      gaps: [],
      recommendations: ['No competency requirements defined for this role.'],
    };
  }

  // Fetch user competencies in a single query
  const competencyIds = requirements.map((r: any) => r.competency_id);
  const userCompResult = await safeQuery(
    `SELECT competency_id, proficiency_level
     FROM ${schema}.user_competencies
     WHERE user_id = $1 AND competency_id = ANY($2::text[])`,
    [userId, competencyIds],
  );

  const userCompMap = new Map<string, number>();
  for (const row of userCompResult.rows ?? []) {
    userCompMap.set(row.competency_id, Number(row.proficiency_level));
  }

  // Compare
  const gaps: CompetencyGap[] = [];
  let metCount = 0;

  for (const req of requirements) {
    const currentLevel = userCompMap.get(req.competency_id) ?? null;
    const requiredLevel = Number(req.required_level);
    const isMandatory = Boolean(req.is_mandatory);

    if (currentLevel !== null && currentLevel >= requiredLevel) {
      metCount++;
    } else {
      gaps.push({
        userId,
        roleId,
        roleName,
        competencyId: req.competency_id,
        competencyName: req.competency_name,
        requiredLevel,
        currentLevel,
        isMandatory,
        gapSeverity: classifyGapSeverity(requiredLevel, currentLevel, isMandatory),
      });
    }
  }

  const fitnessScore = requirements.length > 0
    ? Math.round((metCount / requirements.length) * 100)
    : 100;

  return {
    userId,
    roleId,
    roleName,
    fitnessScore,
    totalRequired: requirements.length,
    met: metCount,
    gaps,
    recommendations: buildRecommendations(gaps),
  };
}

/**
 * Detect relearning triggers — scans all users in a tenant for role-competency
 * mismatches and returns a full tenant-level fitness summary.
 */
export async function detectRelearningTriggers(
  tenantId: string,
): Promise<TenantFitnessSummary> {
  const schema = tenantSchema(tenantId);
  const evaluatedAt = new Date().toISOString();

  // Fetch all users who have at least one role
  const usersResult = await safeQuery(
    `SELECT DISTINCT user_id FROM ${schema}.user_roles`,
    [],
  );

  const allReports: RoleFitnessReport[] = [];
  const userIds: string[] = (usersResult.rows ?? []).map((r: any) => r.user_id);

  for (const uid of userIds) {
    try {
      const userReports = await evaluateUserRoleFitness(tenantId, uid);
      allReports.push(...userReports);
    } catch (err: any) {
      logger.warn(`[EmployeeRoleAgent] Failed to evaluate user ${uid}: ${err.message}`);
    }
  }

  const allGaps = allReports.flatMap(r => r.gaps);
  const criticalGaps = allGaps.filter(g => g.gapSeverity === 'critical').length;

  logger.info(
    `[EmployeeRoleAgent] Tenant ${tenantId}: evaluated ${userIds.length} users, ` +
    `${allGaps.length} gaps found (${criticalGaps} critical)`,
  );

  return {
    tenantId,
    evaluatedAt,
    totalUsersEvaluated: userIds.length,
    totalGapsFound: allGaps.length,
    criticalGaps,
    reports: allReports,
  };
}
