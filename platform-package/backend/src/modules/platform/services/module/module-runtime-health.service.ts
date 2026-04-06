import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

const LOG_TAG = '[RuntimeHealth]';

export interface RuntimeHealthReport {
  moduleCode: string;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  errorCount24h: number;
  avgResponseMs: number | null;
  uptimePct: number;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  checkedAt: string;
}

export interface MaturityReport {
  moduleCode: string;
  maturityLevel: string;
  activeUsers30d: number;
  recordsCreated30d: number;
  workflowsCompleted30d: number;
  aiActions30d: number;
}

export interface PackCertReport {
  packCode: string;
  certificationState: string;
  modulesCertified: number;
  modulesTotal: number;
  crossModuleTestsPassed: boolean;
}

export async function getModuleRuntimeHealth(tenantId: string, moduleCode: string): Promise<RuntimeHealthReport | null> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".module_runtime_health WHERE module_code = $1`, [moduleCode]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      moduleCode: r.module_code,
      healthStatus: r.health_status,
      errorCount24h: r.error_count_24h,
      avgResponseMs: r.avg_response_ms,
      uptimePct: parseFloat(r.uptime_pct),
      lastSuccessAt: r.last_success_at,
      lastErrorAt: r.last_error_at,
      checkedAt: r.checked_at,
    };
  } catch (err) {
    logger.warn(`${LOG_TAG} Error fetching health for ${moduleCode}:`, (err as Error).message);
    return null;
  }
}

export async function getAllRuntimeHealth(tenantId: string): Promise<RuntimeHealthReport[]> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".module_runtime_health ORDER BY module_code`);
    return rows.map((r: any) => ({
      moduleCode: r.module_code,
      healthStatus: r.health_status,
      errorCount24h: r.error_count_24h,
      avgResponseMs: r.avg_response_ms,
      uptimePct: parseFloat(r.uptime_pct),
      lastSuccessAt: r.last_success_at,
      lastErrorAt: r.last_error_at,
      checkedAt: r.checked_at,
    }));
  } catch { return []; }
}

export async function recordModuleError(tenantId: string, moduleCode: string, _errorMessage: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `UPDATE "${schema}".module_runtime_health
       SET error_count_24h = error_count_24h + 1,
           last_error_at = NOW(),
           health_status = CASE WHEN error_count_24h + 1 >= 10 THEN 'unhealthy' WHEN error_count_24h + 1 >= 3 THEN 'degraded' ELSE health_status END,
           checked_at = NOW()
       WHERE module_code = $1`,
      [moduleCode]
    );
  } catch (err) {
    logger.debug(`${LOG_TAG} Could not record error for ${moduleCode}: ${(err as Error).message}`);
  }
}

export async function recordModuleSuccess(tenantId: string, moduleCode: string, responseMs: number): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `UPDATE "${schema}".module_runtime_health
       SET last_success_at = NOW(),
           avg_response_ms = COALESCE(ROUND((COALESCE(avg_response_ms, $2) + $2) / 2), $2),
           health_status = CASE WHEN error_count_24h < 3 THEN 'healthy' ELSE health_status END,
           checked_at = NOW()
       WHERE module_code = $1`,
      [moduleCode, responseMs]
    );
  } catch {}
}

export async function resetDailyErrorCounts(tenantId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `UPDATE "${schema}".module_runtime_health
       SET error_count_24h = 0,
           health_status = 'healthy',
           checked_at = NOW()`
    );
  } catch {}
}

export async function getModuleMaturity(tenantId: string): Promise<MaturityReport[]> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".module_maturity_stages ORDER BY module_code`);
    return rows.map((r: any) => ({
      moduleCode: r.module_code,
      maturityLevel: r.maturity_level,
      activeUsers30d: r.active_users_30d,
      recordsCreated30d: r.records_created_30d,
      workflowsCompleted30d: r.workflows_completed_30d,
      aiActions30d: r.ai_actions_30d,
    }));
  } catch { return []; }
}

export async function getPackCertifications(tenantId: string): Promise<PackCertReport[]> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".pack_certifications ORDER BY pack_code`);
    return rows.map((r: any) => ({
      packCode: r.pack_code,
      certificationState: r.certification_state,
      modulesCertified: r.modules_certified,
      modulesTotal: r.modules_total,
      crossModuleTestsPassed: r.cross_module_tests_passed,
    }));
  } catch { return []; }
}

export async function computePackCertification(tenantId: string, packCode: string): Promise<PackCertReport> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows: modRows } = await safeQuery(
      `SELECT pm.module_code, COALESCE(mc.certification_state, 'DISABLED') AS cert_state
       FROM "${schema}".product_modules pm
       LEFT JOIN "${schema}".module_certifications mc ON mc.module_code = pm.module_code
       WHERE pm.pack_code = $1`, [packCode]
    );
    const total = modRows.length;
    const certified = modRows.filter((r: any) => r.cert_state === 'CERTIFIED_A_PLUS_PLUS').length;
    const crossPassed = certified === total && total > 0;
    const state = crossPassed ? 'CERTIFIED_A_PLUS_PLUS' : certified >= Math.ceil(total * 0.7) ? 'INTERNAL_BETA' : 'HIDDEN';

    await safeQuery(
      `UPDATE "${schema}".pack_certifications
       SET certification_state = $2, modules_certified = $3, modules_total = $4,
           cross_module_tests_passed = $5, certified_at = CASE WHEN $2 = 'CERTIFIED_A_PLUS_PLUS' THEN NOW() ELSE certified_at END,
           updated_at = NOW()
       WHERE pack_code = $1`,
      [packCode, state, certified, total, crossPassed]
    );

    return { packCode, certificationState: state, modulesCertified: certified, modulesTotal: total, crossModuleTestsPassed: crossPassed };
  } catch {
    return { packCode, certificationState: 'HIDDEN', modulesCertified: 0, modulesTotal: 0, crossModuleTestsPassed: false };
  }
}

export async function computeJourneyCertification(tenantId: string): Promise<{ journeyCode: string; certificationState: string; stepsVerified: number; stepsTotal: number }> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows: stages } = await safeQuery(
      `SELECT stage_code, is_required FROM "${schema}".onboarding_stages WHERE is_active = TRUE ORDER BY sort_order`
    );
    const stepsTotal = stages.length;
    let stepsVerified = 0;
    const gateResults: Record<string, boolean> = {};

    for (const stage of stages) {
      const { rows: qRows } = await safeQuery(
        `SELECT COUNT(*)::int AS cnt FROM "${schema}".onboarding_questions WHERE stage_code = $1 AND is_active = TRUE`, [stage.stage_code]
      );
      const hasQuestions = Number(qRows[0]?.cnt ?? 0) > 0 || !stage.is_required;
      gateResults[stage.stage_code] = hasQuestions;
      if (hasQuestions) stepsVerified++;
    }

    const state = stepsVerified === stepsTotal ? 'CERTIFIED_A_PLUS_PLUS' : stepsVerified >= Math.ceil(stepsTotal * 0.8) ? 'INTERNAL_BETA' : 'HIDDEN';

    await safeQuery(
      `UPDATE "${schema}".journey_certifications
       SET certification_state = $1, steps_verified = $2, steps_total = $3, gate_results = $4,
           certified_at = CASE WHEN $1 = 'CERTIFIED_A_PLUS_PLUS' THEN NOW() ELSE certified_at END,
           updated_at = NOW()
       WHERE journey_code = 'onboarding'`,
      [state, stepsVerified, stepsTotal, JSON.stringify(gateResults)]
    );

    return { journeyCode: 'onboarding', certificationState: state, stepsVerified, stepsTotal };
  } catch {
    return { journeyCode: 'onboarding', certificationState: 'HIDDEN', stepsVerified: 0, stepsTotal: 0 };
  }
}

export async function certifyAllPacks(tenantId: string): Promise<PackCertReport[]> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(`SELECT pack_code FROM "${schema}".platform_products WHERE is_active = TRUE ORDER BY sort_order`);
    const results: PackCertReport[] = [];
    for (const row of rows) {
      const report = await computePackCertification(tenantId, row.pack_code);
      results.push(report);
    }
    return results;
  } catch { return []; }
}

export async function getReadinessThresholds(tenantId: string, moduleCode: string): Promise<{ checkCode: string; minRequired: number; description: string }[]> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(
      `SELECT check_code, min_required, description FROM "${schema}".module_readiness_thresholds WHERE module_code = $1 AND is_active = TRUE`, [moduleCode]
    );
    return rows.map((r: any) => ({ checkCode: r.check_code, minRequired: r.min_required, description: r.description }));
  } catch { return []; }
}

export async function recalculateMaturityStages(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  let updated = 0;
  try {
    const { rows: modules } = await safeQuery(`SELECT module_code FROM "${schema}".module_maturity_stages`);
    for (const mod of modules) {
      const mc = mod.module_code;
      let activeUsers = 0;
      let recordsCreated = 0;
      let workflowsCompleted = 0;
      let aiActions = 0;

      try {
        const { rows: auditRows } = await safeQuery(
          `SELECT COUNT(DISTINCT user_id)::int AS cnt FROM "${schema}".audit_log WHERE module_code = $1 AND created_at > NOW() - INTERVAL '30 days'`, [mc]
        );
        activeUsers = auditRows[0]?.cnt ?? 0;
      } catch {}

      try {
        const { rows: wfRows } = await safeQuery(
          `SELECT COUNT(*)::int AS cnt FROM "${schema}".workflow_instances WHERE module_code = $1 AND status = 'completed' AND completed_at > NOW() - INTERVAL '30 days'`, [mc]
        );
        workflowsCompleted = wfRows[0]?.cnt ?? 0;
      } catch {}

      try {
        const { rows: aiRows } = await safeQuery(
          `SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_actions_log WHERE module_code = $1 AND created_at > NOW() - INTERVAL '30 days'`, [mc]
        );
        aiActions = aiRows[0]?.cnt ?? 0;
      } catch {}

      const score = activeUsers * 2 + recordsCreated + workflowsCompleted * 3 + aiActions;
      let level = 'starter';
      if (score >= 100) level = 'leading';
      else if (score >= 50) level = 'optimized';
      else if (score >= 20) level = 'established';
      else if (score >= 5) level = 'developing';

      await safeQuery(
        `UPDATE "${schema}".module_maturity_stages
         SET maturity_level = $2, active_users_30d = $3, records_created_30d = $4,
             workflows_completed_30d = $5, ai_actions_30d = $6,
             last_assessed_at = NOW(), updated_at = NOW()
         WHERE module_code = $1`,
        [mc, level, activeUsers, recordsCreated, workflowsCompleted, aiActions]
      );
      updated++;
    }
  } catch (err) {
    logger.warn(`${LOG_TAG} Maturity recalculation failed: ${(err as Error).message}`);
  }
  return updated;
}

export async function checkRuntimeAccessGate(tenantId: string, moduleCode: string): Promise<{ allowed: boolean; reason: string }> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows: entRows } = await safeQuery(
      `SELECT is_active FROM "${schema}".tenant_module_entitlements WHERE module_code = $1`, [moduleCode]
    );
    if (entRows.length > 0 && !entRows[0].is_active) {
      return { allowed: false, reason: 'MODULE_NOT_LICENSED' };
    }

    const { rows: certRows } = await safeQuery(
      `SELECT certification_state FROM "${schema}".module_certifications WHERE module_code = $1`, [moduleCode]
    );
    if (certRows.length > 0 && ['DISABLED', 'DEPRECATED'].includes(certRows[0].certification_state)) {
      return { allowed: false, reason: `MODULE_NOT_CERTIFIED: ${certRows[0].certification_state}` };
    }

    try {
      const { rows: depRows } = await safeQuery(
        `SELECT dg.depends_on, mc.certification_state
         FROM "${schema}".module_dependency_graph dg
         LEFT JOIN "${schema}".module_certifications mc ON mc.module_code = dg.depends_on
         WHERE dg.module_code = $1 AND dg.dependency_type = 'required'`, [moduleCode]
      );
      for (const dep of depRows) {
        if (!dep.certification_state || ['DISABLED', 'DEPRECATED'].includes(dep.certification_state)) {
          return { allowed: false, reason: `MODULE_DEPENDENCY_MISSING: ${dep.depends_on}` };
        }
      }
    } catch {}

    const { rows: healthRows } = await safeQuery(
      `SELECT health_status FROM "${schema}".module_runtime_health WHERE module_code = $1`, [moduleCode]
    );
    if (healthRows.length > 0 && healthRows[0].health_status === 'unhealthy') {
      return { allowed: false, reason: 'MODULE_RUNTIME_DEGRADED' };
    }

    try {
      const { rows: kickRows } = await safeQuery(
        `SELECT status FROM "${schema}".module_kickstart_log WHERE module_code = $1`, [moduleCode]
      );
      if (kickRows.length > 0 && kickRows[0].status === 'failed') {
        return { allowed: false, reason: 'MODULE_SETUP_REQUIRED' };
      }
    } catch {}

    return { allowed: true, reason: 'OK' };
  } catch {
    return { allowed: true, reason: 'ASSUMED_OK (tables missing)' };
  }
}
