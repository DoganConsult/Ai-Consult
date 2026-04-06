// @ts-nocheck
// @cross-layer-bridge: Shahin-AI analytics layer — reads from tenant DB tables
// populated by the DAuth decision engine. Does NOT define or enforce permissions.
// Authorization truth lives in platform/dauth/access/ (Law 1).
import { safeQuery, tenantSchema } from '../../../../config/database';
import type { GenericRow } from '../../../../types/db-rows.types';
import { getSecurityConfigTyped } from '../../../../modules/platform/services/security/security-config-registry.service';

export interface PermissionAnalytic {
  id: string;
  analysisType: string;
  moduleCode: string | null;
  userId: string | null;
  severity: string;
  title: string;
  description: string | null;
  details: Record<string, unknown>;
  recommendation: string | null;
  autoRemediationAvailable: boolean;
  autoRemediated: boolean;
  acknowledged: boolean;
  createdAt: string;
}

export interface SecurityPosture {
  overallScore: number;
  scores: Record<string, number>;
  metrics: Record<string, unknown>;
  findings: Array<{ type: string; severity: string; message: string }>;
  recommendations: string[];
  previousScore: number | null;
  scoreDelta: number | null;
  snapshotAt: string;
}

export async function runPermissionAnalytics(tenantId: string): Promise<{ analysisCount: number; findings: PermissionAnalytic[] }> {
  const enabled = await getSecurityConfigTyped(tenantId, 'ai_analytics_enabled', true);
  if (!enabled) return { analysisCount: 0, findings: [] };

  const schema = tenantSchema(tenantId);
  const findings: PermissionAnalytic[] = [];

  const unusedPerms = await detectUnusedPermissions(tenantId, schema);
  findings.push(...unusedPerms);

  const overProvision = await detectOverProvisionedUsers(tenantId, schema);
  findings.push(...overProvision);

  const sodPredictions = await predictSoDViolations(tenantId, schema);
  findings.push(...sodPredictions);

  const driftFindings = await detectPermissionDrift(tenantId, schema);
  findings.push(...driftFindings);

  for (const f of findings) {
    await safeQuery(
      `INSERT INTO "${schema}".permission_analytics
       (analysis_type, module_code, user_id, severity, title, description, details, recommendation, auto_remediation_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [f.analysisType, f.moduleCode, f.userId, f.severity, f.title, f.description, JSON.stringify(f.details), f.recommendation, f.autoRemediationAvailable],
    );
  }

  return { analysisCount: findings.length, findings };
}

export async function calculateSecurityPosture(tenantId: string): Promise<SecurityPosture> {
  const schema = tenantSchema(tenantId);
  const scores: Record<string, number> = {};
  const metrics: Record<string, unknown> = {};
  const findings: Array<{ type: string; severity: string; message: string }> = [];
  const recommendations: string[] = [];

  const { rows: userCount } = await safeQuery(
    `SELECT COUNT(DISTINCT user_id) AS cnt FROM "${schema}".user_role_assignments WHERE active = true`,
  );
  metrics.activeUsers = userCount[0]?.cnt || 0;

  const { rows: roleCount } = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".module_role_definitions WHERE is_active = true`,
  );
  metrics.activeRoles = roleCount[0]?.cnt || 0;

  const { rows: permCount } = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".module_permissions WHERE is_active = true`,
  );
  metrics.activePermissions = permCount[0]?.cnt || 0;

  const { rows: sodCount } = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".module_sod_rules WHERE is_active = true`,
  );
  metrics.activeSoDRules = sodCount[0]?.cnt || 0;

  const { rows: delegationCount } = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".delegation_chains WHERE is_active = true AND (valid_to IS NULL OR valid_to > NOW())`,
  );
  metrics.activeDelegations = delegationCount[0]?.cnt || 0;

  const { rows: recentAnalytics } = await safeQuery(
    `SELECT severity, COUNT(*) AS cnt FROM "${schema}".permission_analytics
     WHERE created_at > NOW() - INTERVAL '24 hours' AND acknowledged = false
     GROUP BY severity`,
  );
  const unackByS: Record<string, number> = {};
  for (const r of recentAnalytics) unackByS[r.severity] = parseInt(r.cnt, 10);
  metrics.unacknowledgedFindings = unackByS;

  scores.rbacCoverage = Math.min(100, ((roleCount[0]?.cnt || 0) / 200) * 100);
  scores.sodEnforcement = Math.min(100, ((sodCount[0]?.cnt || 0) / 75) * 100);
  scores.permissionGranularity = Math.min(100, ((permCount[0]?.cnt || 0) / 100) * 100);
  scores.delegationHealth = delegationCount[0]?.cnt > 20 ? 70 : 100;
  scores.analyticsClean = (unackByS.critical || 0) > 0 ? 50 : (unackByS.high || 0) > 0 ? 70 : 100;

  const overallScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;

  if (scores.rbacCoverage < 70) {
    findings.push({ type: 'rbac_coverage', severity: 'medium', message: 'RBAC role coverage below 70%' });
    recommendations.push('Add module-specific roles to improve RBAC coverage');
  }
  if ((unackByS.critical || 0) > 0) {
    findings.push({ type: 'critical_findings', severity: 'critical', message: `${unackByS.critical} unacknowledged critical findings` });
    recommendations.push('Address critical permission analytics findings immediately');
  }

  const { rows: prevSnapshot } = await safeQuery(
    `SELECT overall_score FROM "${schema}".security_posture_snapshots ORDER BY created_at DESC LIMIT 1`,
  );
  const previousScore = prevSnapshot[0]?.overall_score || null;
  const scoreDelta = previousScore !== null ? overallScore - previousScore : null;

  await safeQuery(
    `INSERT INTO "${schema}".security_posture_snapshots
     (overall_score, scores, metrics, findings, recommendations, previous_score, score_delta)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [overallScore, JSON.stringify(scores), JSON.stringify(metrics), JSON.stringify(findings), JSON.stringify(recommendations), previousScore, scoreDelta],
  );

  return {
    overallScore: Math.round(overallScore * 100) / 100,
    scores, metrics, findings, recommendations,
    previousScore, scoreDelta,
    snapshotAt: new Date().toISOString(),
  };
}

export async function getAnalytics(
  tenantId: string,
  filters?: { type?: string; severity?: string; acknowledged?: boolean; limit?: number },
): Promise<PermissionAnalytic[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.type) { conditions.push(`analysis_type = $${idx++}`); params.push(filters.type); }
  if (filters?.severity) { conditions.push(`severity = $${idx++}`); params.push(filters.severity); }
  if (filters?.acknowledged !== undefined) { conditions.push(`acknowledged = $${idx++}`); params.push(filters.acknowledged); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters?.limit || 100;

  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".permission_analytics ${where} ORDER BY created_at DESC LIMIT ${limit}`,
    params,
  );
  return rows.map(mapAnalytic);
}

export async function acknowledgeAnalytic(tenantId: string, analyticId: string, userId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".permission_analytics
     SET acknowledged = true, acknowledged_by = $1, acknowledged_at = NOW()
     WHERE id = $2`,
    [userId, analyticId],
  );
}

async function detectUnusedPermissions(_tenantId: string, schema: string): Promise<PermissionAnalytic[]> {
  const { rows } = await safeQuery(
    `SELECT mp.module_code, mp.permission_code
     FROM "${schema}".module_permissions mp
     LEFT JOIN "${schema}".role_usage_audit rua
       ON rua.permission_code = mp.permission_code
       AND rua.created_at > NOW() - INTERVAL '30 days'
     WHERE mp.is_active = true AND rua.id IS NULL
     LIMIT 50`,
  );

  return rows.map((r: GenericRow) => ({
    id: '',
    analysisType: 'right_sizing',
    moduleCode: r.module_code,
    userId: null,
    severity: 'low',
    title: `Unused permission: ${r.permission_code}`,
    description: `Permission ${r.permission_code} has not been used in the last 30 days`,
    details: { permissionCode: r.permission_code, moduleCode: r.module_code },
    recommendation: `Consider disabling or reviewing ${r.permission_code}`,
    autoRemediationAvailable: false,
    autoRemediated: false,
    acknowledged: false,
    createdAt: new Date().toISOString(),
  }));
}

async function detectOverProvisionedUsers(_tenantId: string, schema: string): Promise<PermissionAnalytic[]> {
  const { rows } = await safeQuery(
    `SELECT ura.user_id, COUNT(DISTINCT r.role_code) AS role_count
     FROM "${schema}".user_role_assignments ura
     JOIN "${schema}".roles r ON r.role_id = ura.role_id
     WHERE ura.active = true AND (ura.valid_to IS NULL OR ura.valid_to > NOW())
     GROUP BY ura.user_id
     HAVING COUNT(DISTINCT r.role_code) > 5
     LIMIT 20`,
  );

  return rows.map((r: GenericRow) => ({
    id: '',
    analysisType: 'right_sizing',
    moduleCode: null,
    userId: r.user_id,
    severity: r.role_count > 10 ? 'high' : 'medium',
    title: `Over-provisioned user with ${r.role_count} roles`,
    description: `User has ${r.role_count} active role assignments, which may indicate over-provisioning`,
    details: { userId: r.user_id, roleCount: r.role_count },
    recommendation: 'Review and consolidate role assignments using principle of least privilege',
    autoRemediationAvailable: false,
    autoRemediated: false,
    acknowledged: false,
    createdAt: new Date().toISOString(),
  }));
}

async function predictSoDViolations(_tenantId: string, schema: string): Promise<PermissionAnalytic[]> {
  const { rows } = await safeQuery(
    `SELECT msr.module_code, msr.rule_code, msr.severity, msr.conflicting_roles,
            ura.user_id, ARRAY_AGG(DISTINCT r.role_code) AS user_roles
     FROM "${schema}".module_sod_rules msr
     CROSS JOIN (
       SELECT DISTINCT user_id FROM "${schema}".user_role_assignments WHERE active = true
     ) ura
     JOIN "${schema}".user_role_assignments ura2 ON ura2.user_id = ura.user_id AND ura2.active = true
     JOIN "${schema}".roles r ON r.role_id = ura2.role_id
     WHERE msr.is_active = true
     GROUP BY msr.module_code, msr.rule_code, msr.severity, msr.conflicting_roles, ura.user_id
     HAVING msr.conflicting_roles::jsonb ?| ARRAY_AGG(DISTINCT r.role_code)::text[]
     LIMIT 30`,
  );

  return rows.map((r: GenericRow) => ({
    id: '',
    analysisType: 'sod_prediction',
    moduleCode: r.module_code,
    userId: r.user_id,
    severity: r.severity === 'critical' ? 'critical' : 'high',
    title: `SoD violation predicted: ${r.rule_code}`,
    description: `User has roles that conflict with SoD rule ${r.rule_code} in module ${r.module_code}`,
    details: { ruleCode: r.rule_code, conflictingRoles: r.conflicting_roles, userRoles: r.user_roles },
    recommendation: `Remove conflicting role assignment or request SoD exception`,
    autoRemediationAvailable: false,
    autoRemediated: false,
    acknowledged: false,
    createdAt: new Date().toISOString(),
  }));
}

async function detectPermissionDrift(_tenantId: string, schema: string): Promise<PermissionAnalytic[]> {
  const { rows } = await safeQuery(
    `SELECT event_type, COUNT(*) AS cnt
     FROM "${schema}".agrc_event_log
     WHERE event_type = 'rbac_dynamic_legacy_drift'
       AND created_at > NOW() - INTERVAL '24 hours'
     GROUP BY event_type`,
  );

  if (rows.length === 0) return [];

  return [{
    id: '',
    analysisType: 'drift',
    moduleCode: null,
    userId: null,
    severity: 'medium',
    title: `Permission drift detected: ${rows[0].cnt} instances in 24h`,
    description: 'Dynamic and legacy permission sources are diverging',
    details: { driftCount: rows[0].cnt, period: '24h' },
    recommendation: 'Run permission sync to align dynamic and legacy sources',
    autoRemediationAvailable: true,
    autoRemediated: false,
    acknowledged: false,
    createdAt: new Date().toISOString(),
  }];
}

function mapAnalytic(r: GenericRow): PermissionAnalytic {
  return {
    id: r.id,
    analysisType: r.analysis_type,
    moduleCode: r.module_code,
    userId: r.user_id,
    severity: r.severity,
    title: r.title,
    description: r.description,
    details: r.details || {},
    recommendation: r.recommendation,
    autoRemediationAvailable: r.auto_remediation_available,
    autoRemediated: r.auto_remediated,
    acknowledged: r.acknowledged,
    createdAt: r.created_at,
  };
}
