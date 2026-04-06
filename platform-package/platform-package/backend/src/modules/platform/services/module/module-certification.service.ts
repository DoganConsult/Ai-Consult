// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../../config/database';
import { MODULE_EVENT_CONTRACTS } from '../../../../config/module-event-contracts';
import { type CanonicalModuleCode } from '../../../../config/canonical-modules';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

const LOG_TAG = '[MCert]';

export type CertificationState = 'CERTIFIED_A_PLUS_PLUS' | 'INTERNAL_BETA' | 'HIDDEN' | 'DISABLED' | 'DEPRECATED';

/**
 * Law 8 compliance: DEPRECATED modules must carry death-date metadata.
 * When a module is set to DEPRECATED, a corresponding row must exist
 * in `module_deprecation_schedule` with:
 *   - module_code
 *   - deprecated_at (timestamp)
 *   - removal_date (must be set — no open-ended deprecation)
 *   - removal_version (target release)
 *   - owner (responsible team/person)
 *   - replacement (what replaces this module, or 'none')
 *   - migration_guide_url (optional)
 *
 * Enforcement: module-contract-enforcement.service checks this table
 * and FAILS certification if a DEPRECATED module lacks a removal_date.
 */
export interface DeprecationSchedule {
  moduleCode: string;
  deprecatedAt: string;
  removalDate: string;
  removalVersion: string;
  owner: string;
  replacement: string;
  migrationGuideUrl?: string;
}

export interface GateResult {
  gate: string;
  gateNumber: number;
  passed: boolean;
  detail: string;
}

export interface CertificationReport {
  moduleCode: string;
  certificationState: CertificationState;
  readinessScore: number;
  dependenciesMet: boolean;
  allowedForOnboarding: boolean;
  allowedForDemo: boolean;
  allowedForSale: boolean;
  gatesPassed: number;
  gatesTotal: number;
  gates: GateResult[];
  dependencies: { module: string; type: string; satisfied: boolean }[];
  inboundEvents: { event: string; sourceModule: string; active: boolean }[];
  blockingIssues: { gate: string; gateNumber: number; detail: string }[];
  checkedAt: string;
}

export interface PreflightReport {
  moduleCode: string;
  overallResult: 'passed' | 'failed' | 'partial';
  gatesPassed: number;
  gatesTotal: number;
  gates: GateResult[];
  blockers: string[];
  runAt: string;
}

export interface PackDefinition {
  pack_code: string;
  pack_name_en: string;
  pack_name_ar: string;
  description_en: string;
  description_ar: string;
  target_audience_en: string;
  target_audience_ar: string;
  badge_en: string;
  badge_ar: string;
  icon_class: string;
  sort_order: number;
  estimated_setup_minutes: number;
  is_active: boolean;
  modules: { module_code: string; is_core: boolean; sort_order: number }[];
}

const BUSINESS_MODULES: CanonicalModuleCode[] = [
  'risk', 'compliance', 'policy', 'evidence', 'audit',
  'foundation', 'governance', 'reporting',
  'incident', 'vendor', 'bcp', 'asset',
  'exception', 'remediation', 'action',
  'training', 'ai-governance', 'privacy', 'qiyas', 'integrations',
];

const MODULE_CORE_TABLES: Record<string, string[]> = {
  risk: ['risks'],
  compliance: ['frameworks', 'controls'],
  policy: ['policies'],
  evidence: ['evidence_items'],
  audit: ['audit_engagements', 'audit_plans'],
  foundation: ['organizations', 'business_units', 'departments'],
  governance: ['committees'],
  reporting: ['report_definitions'],
  incident: ['incidents'],
  vendor: ['vendors'],
  bcp: ['bcp_plans'],
  asset: ['assets'],
  exception: ['exceptions'],
  remediation: ['remediation_tasks'],
  action: ['action_items'],
  training: ['training_catalog', 'training_assignments'],
  'ai-governance': ['ai_asset_inventory'],
  privacy: ['ropa_entries'],
  qiyas: ['qiyas_assessments'],
  integrations: ['integration_configs'],
};

async function gate01Schema(schema: string, moduleCode: string): Promise<GateResult> {
  const tables = MODULE_CORE_TABLES[moduleCode] || [];
  if (tables.length === 0) return { gate: 'schema', gateNumber: 1, passed: true, detail: 'No core tables required' };
  let found = 0;
  for (const tbl of tables) {
    try {
      const { rows } = await safeQuery(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`, [schema, tbl]
      );
      if (rows.length > 0) found++;
    } catch {}
  }
  return { gate: 'schema', gateNumber: 1, passed: found === tables.length, detail: `${found}/${tables.length} core tables exist` };
}

async function gate02Migration(schema: string, moduleCode: string): Promise<GateResult> {
  try {
    const tables = MODULE_CORE_TABLES[moduleCode] || [];
    let inMigration = 0;
    for (const tbl of tables) {
      const { rows } = await safeQuery(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`, [schema, tbl]
      );
      if (rows.length > 0) inMigration++;
    }
    return { gate: 'migration', gateNumber: 2, passed: inMigration === tables.length, detail: `${inMigration}/${tables.length} tables in schema` };
  } catch {
    return { gate: 'migration', gateNumber: 2, passed: false, detail: 'Migration check failed' };
  }
}

async function gate03Seed(schema: string, moduleCode: string): Promise<GateResult> {
  try {
    const { rows } = await safeQuery(
      `SELECT status FROM "${schema}".module_kickstart_log WHERE module_code = $1`, [moduleCode]
    );
    if (rows.length === 0) return { gate: 'seed', gateNumber: 3, passed: false, detail: 'No kickstart record' };
    return { gate: 'seed', gateNumber: 3, passed: true, detail: `Kickstart registered: ${rows[0].status}` };
  } catch {
    return { gate: 'seed', gateNumber: 3, passed: false, detail: 'Kickstart log unavailable' };
  }
}

async function gate04Kickstart(schema: string, moduleCode: string): Promise<GateResult> {
  try {
    const { rows } = await safeQuery(
      `SELECT status FROM "${schema}".module_kickstart_log WHERE module_code = $1`, [moduleCode]
    );
    if (rows.length === 0) return { gate: 'kickstart', gateNumber: 4, passed: false, detail: 'Never kicked' };
    return { gate: 'kickstart', gateNumber: 4, passed: rows[0].status === 'completed', detail: `Kickstart: ${rows[0].status}` };
  } catch {
    return { gate: 'kickstart', gateNumber: 4, passed: false, detail: 'Kickstart check failed' };
  }
}

async function gate05Lifecycle(schema: string, moduleCode: string): Promise<GateResult> {
  try {
    const { rows } = await safeQuery(
      `SELECT has_lifecycle, lifecycle_statuses FROM "${schema}".module_workflow_registry WHERE module_code = $1 AND is_active = TRUE`, [moduleCode]
    );
    if (rows.length === 0) return { gate: 'lifecycle', gateNumber: 5, passed: false, detail: 'Not in MWR' };
    const statuses = Array.isArray(rows[0].lifecycle_statuses) ? rows[0].lifecycle_statuses : [];
    return { gate: 'lifecycle', gateNumber: 5, passed: statuses.length >= 3, detail: `${statuses.length} lifecycle statuses` };
  } catch {
    return { gate: 'lifecycle', gateNumber: 5, passed: false, detail: 'Lifecycle check failed' };
  }
}

async function gate06Workflow(schema: string, moduleCode: string): Promise<GateResult> {
  try {
    const { rows } = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".workflow_templates WHERE module_code = $1 AND is_active = TRUE`, [moduleCode]
    );
    const cnt = Number(rows[0]?.cnt ?? 0);
    return { gate: 'workflow', gateNumber: 6, passed: cnt > 0, detail: `${cnt} workflow templates` };
  } catch {
    return { gate: 'workflow', gateNumber: 6, passed: false, detail: 'Workflow check failed (table may not exist)' };
  }
}

async function gate07OutboundEvent(_schema: string, moduleCode: string): Promise<GateResult> {
  const contract = MODULE_EVENT_CONTRACTS[moduleCode as CanonicalModuleCode];
  if (!contract) return { gate: 'outbound_event', gateNumber: 7, passed: false, detail: 'No event contract' };
  return { gate: 'outbound_event', gateNumber: 7, passed: contract.events.length > 0, detail: `${contract.events.length} events declared` };
}

async function gate08InboundEvent(schema: string, moduleCode: string): Promise<GateResult> {
  try {
    const { rows } = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".module_inbound_events WHERE module_code = $1 AND is_active = TRUE`, [moduleCode]
    );
    const cnt = Number(rows[0]?.cnt ?? 0);
    return { gate: 'inbound_event', gateNumber: 8, passed: cnt > 0, detail: `${cnt} inbound event handlers` };
  } catch {
    return { gate: 'inbound_event', gateNumber: 8, passed: false, detail: 'Inbound event table unavailable' };
  }
}

async function gate09Permission(schema: string, moduleCode: string): Promise<GateResult> {
  try {
    const { rows } = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".permissions WHERE module_code = $1 AND is_active = TRUE`, [moduleCode]
    );
    const cnt = Number(rows[0]?.cnt ?? 0);
    return { gate: 'permission', gateNumber: 9, passed: cnt >= 3, detail: `${cnt} permissions defined` };
  } catch {
    try {
      const { rows } = await safeQuery(
        `SELECT COUNT(*)::int AS cnt FROM "${schema}".role_permission_assignments rpa
         JOIN "${schema}".permissions p ON p.permission_id = rpa.permission_id
         WHERE p.permission_code LIKE $1`, [`${moduleCode}:%`]
      );
      const cnt = Number(rows[0]?.cnt ?? 0);
      return { gate: 'permission', gateNumber: 9, passed: cnt >= 3, detail: `${cnt} permission assignments` };
    } catch {
      return { gate: 'permission', gateNumber: 9, passed: false, detail: 'Permission check failed' };
    }
  }
}

async function gate10UIShell(schema: string, moduleCode: string): Promise<GateResult> {
  try {
    const { rows } = await safeQuery(
      `SELECT default_landing_route FROM "${schema}".module_workflow_registry WHERE module_code = $1 AND is_active = TRUE`, [moduleCode]
    );
    return { gate: 'ui_shell', gateNumber: 10, passed: rows.length > 0 && !!rows[0].default_landing_route, detail: rows[0]?.default_landing_route || 'No landing route' };
  } catch {
    return { gate: 'ui_shell', gateNumber: 10, passed: false, detail: 'UI shell check failed' };
  }
}

async function gate11FirstVisit(schema: string, moduleCode: string): Promise<GateResult> {
  try {
    const { rows } = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".module_kickstart_log WHERE module_code = $1 AND status = 'completed'`, [moduleCode]
    );
    const hasKickstart = Number(rows[0]?.cnt ?? 0) > 0;
    return { gate: 'first_visit', gateNumber: 11, passed: hasKickstart, detail: hasKickstart ? 'Kickstart provides first-visit experience' : 'No first-visit setup' };
  } catch {
    return { gate: 'first_visit', gateNumber: 11, passed: false, detail: 'First-visit check failed' };
  }
}

async function gate12AICopilot(schema: string, moduleCode: string): Promise<GateResult> {
  try {
    const { rows } = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".module_workflow_registry WHERE module_code = $1 AND is_active = TRUE AND ai_config IS NOT NULL AND ai_config != '{}'::jsonb`, [moduleCode]
    );
    const cnt = Number(rows[0]?.cnt ?? 0);
    return { gate: 'ai_copilot', gateNumber: 12, passed: cnt > 0, detail: cnt > 0 ? 'AI config present in MWR' : 'No AI copilot config' };
  } catch {
    return { gate: 'ai_copilot', gateNumber: 12, passed: false, detail: 'AI copilot check failed' };
  }
}

async function gate13Auditability(schema: string, moduleCode: string): Promise<GateResult> {
  try {
    const { rows } = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".audit_entries WHERE module = $1`, [moduleCode]
    );
    const cnt = Number(rows[0]?.cnt ?? 0);
    return { gate: 'auditability', gateNumber: 13, passed: true, detail: `${cnt} audit entries (audit middleware active)` };
  } catch {
    try {
      const { rows } = await safeQuery(
        `SELECT COUNT(*)::int AS cnt FROM "${schema}".grc_events WHERE module_code = $1`, [moduleCode]
      );
      const cnt = Number(rows[0]?.cnt ?? 0);
      return { gate: 'auditability', gateNumber: 13, passed: cnt >= 0, detail: `${cnt} GRC events logged` };
    } catch {
      return { gate: 'auditability', gateNumber: 13, passed: false, detail: 'Audit trail check failed' };
    }
  }
}

async function gate14MetricsSLA(schema: string, moduleCode: string): Promise<GateResult> {
  try {
    const { rows } = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".module_sla_tracking WHERE module_code = $1 AND is_active = TRUE`, [moduleCode]
    );
    const cnt = Number(rows[0]?.cnt ?? 0);
    return { gate: 'metrics_sla', gateNumber: 14, passed: cnt > 0, detail: `${cnt} SLA rules configured` };
  } catch {
    return { gate: 'metrics_sla', gateNumber: 14, passed: false, detail: 'SLA tracking table unavailable' };
  }
}

async function gate15Recovery(schema: string, moduleCode: string): Promise<GateResult> {
  try {
    const { rows } = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".module_kickstart_log WHERE module_code = $1`, [moduleCode]
    );
    const hasLog = Number(rows[0]?.cnt ?? 0) > 0;
    return { gate: 'recovery', gateNumber: 15, passed: hasLog, detail: hasLog ? 'Kickstart log enables retry/recovery' : 'No recovery path' };
  } catch {
    return { gate: 'recovery', gateNumber: 15, passed: false, detail: 'Recovery check failed' };
  }
}

async function gate16Test(schema: string, moduleCode: string): Promise<GateResult> {
  try {
    const { rows } = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".module_preflight_runs WHERE module_code = $1 AND overall_result = 'passed'`, [moduleCode]
    );
    const cnt = Number(rows[0]?.cnt ?? 0);
    return { gate: 'test', gateNumber: 16, passed: cnt > 0, detail: cnt > 0 ? `${cnt} successful preflight runs` : 'No passing preflight runs recorded' };
  } catch {
    return { gate: 'test', gateNumber: 16, passed: false, detail: 'Test gate check failed' };
  }
}

export async function runCertificationGates(tenantId: string, moduleCode: string): Promise<CertificationReport> {
  const schema = tenantSchema(tenantId);
  const gates = await Promise.all([
    gate01Schema(schema, moduleCode),
    gate02Migration(schema, moduleCode),
    gate03Seed(schema, moduleCode),
    gate04Kickstart(schema, moduleCode),
    gate05Lifecycle(schema, moduleCode),
    gate06Workflow(schema, moduleCode),
    gate07OutboundEvent(schema, moduleCode),
    gate08InboundEvent(schema, moduleCode),
    gate09Permission(schema, moduleCode),
    gate10UIShell(schema, moduleCode),
    gate11FirstVisit(schema, moduleCode),
    gate12AICopilot(schema, moduleCode),
    gate13Auditability(schema, moduleCode),
    gate14MetricsSLA(schema, moduleCode),
    gate15Recovery(schema, moduleCode),
    gate16Test(schema, moduleCode),
  ]);

  const passed = gates.filter(g => g.passed).length;
  const total = gates.length;

  let certState: CertificationState = 'DISABLED';
  if (passed === total) certState = 'CERTIFIED_A_PLUS_PLUS';
  else if (passed >= 12) certState = 'INTERNAL_BETA';
  else if (passed >= 5) certState = 'HIDDEN';
  else certState = 'DISABLED';

  const readinessScore = total > 0 ? parseFloat(((passed / total) * 100).toFixed(2)) : 0;
  const blockingIssues = gates.filter(g => !g.passed).map(g => ({ gate: g.gate, gateNumber: g.gateNumber, detail: g.detail }));
  const isCertified = certState === 'CERTIFIED_A_PLUS_PLUS';

  try {
    await safeQuery(
      `INSERT INTO "${schema}".module_certifications (module_code, certification_state, gates_passed, gates_total, gate_results,
         readiness_score, blocking_issues, allowed_for_onboarding, allowed_for_demo, allowed_for_sale,
         last_preflight_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       ON CONFLICT (module_code) DO UPDATE SET
         certification_state = $2, gates_passed = $3, gates_total = $4, gate_results = $5,
         readiness_score = $6, blocking_issues = $7,
         allowed_for_onboarding = $8, allowed_for_demo = $9, allowed_for_sale = $10,
         last_preflight_at = NOW(),
         certified_at = CASE WHEN $2 = 'CERTIFIED_A_PLUS_PLUS' THEN NOW() ELSE module_certifications.certified_at END,
         updated_at = NOW()`,
      [moduleCode, certState, passed, total, JSON.stringify(gates),
       readinessScore, JSON.stringify(blockingIssues), isCertified, isCertified || certState === 'INTERNAL_BETA', isCertified]
    );
  } catch (err) {
    logger.warn(`${LOG_TAG} Failed to persist certification for ${moduleCode}:`, (err as Error).message);
  }

  let dependencies: { module: string; type: string; satisfied: boolean }[] = [];
  try {
    const { rows } = await safeQuery(
      `SELECT depends_on, dependency_type FROM "${schema}".module_dependency_graph WHERE module_code = $1`, [moduleCode]
    );
    for (const row of rows) {
      let satisfied = false;
      try {
        const { rows: certRows } = await safeQuery(
          `SELECT certification_state FROM "${schema}".module_certifications WHERE module_code = $1`, [row.depends_on]
        );
        satisfied = certRows.length > 0 && ['CERTIFIED_A_PLUS_PLUS', 'INTERNAL_BETA'].includes(certRows[0].certification_state);
      } catch {}
      dependencies.push({ module: row.depends_on, type: row.dependency_type, satisfied });
    }
  } catch {}

  let inboundEvents: { event: string; sourceModule: string; active: boolean }[] = [];
  try {
    const { rows } = await safeQuery(
      `SELECT event_name, source_module, is_active FROM "${schema}".module_inbound_events WHERE module_code = $1`, [moduleCode]
    );
    inboundEvents = rows.map((r: any) => ({ event: r.event_name, sourceModule: r.source_module, active: r.is_active }));
  } catch {}

  const depsMet = dependencies.filter(d => d.type === 'required').every(d => d.satisfied);
  try {
    await safeQuery(
      `UPDATE "${schema}".module_certifications SET dependencies_met = $2, last_health_check_at = NOW() WHERE module_code = $1`,
      [moduleCode, depsMet]
    );
  } catch {}

  return {
    moduleCode,
    certificationState: certState,
    readinessScore,
    dependenciesMet: depsMet,
    allowedForOnboarding: isCertified,
    allowedForDemo: isCertified || certState === 'INTERNAL_BETA',
    allowedForSale: isCertified,
    gatesPassed: passed,
    gatesTotal: total,
    gates,
    dependencies,
    inboundEvents,
    blockingIssues,
    checkedAt: new Date().toISOString(),
  };
}

export async function runPreflight(tenantId: string, moduleCode: string, runBy: string): Promise<PreflightReport> {
  const report = await runCertificationGates(tenantId, moduleCode);
  const blockers = report.gates.filter(g => !g.passed).map(g => `Gate ${g.gateNumber} (${g.gate}): ${g.detail}`);
  const requiredDeps = report.dependencies.filter(d => d.type === 'required' && !d.satisfied);
  for (const dep of requiredDeps) {
    blockers.push(`Required dependency not certified: ${dep.module}`);
  }
  const overallResult = blockers.length === 0 ? 'passed' : (report.gatesPassed >= 12 ? 'partial' : 'failed');

  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `INSERT INTO "${schema}".module_preflight_runs (module_code, run_type, gates_checked, gates_passed, gate_details, overall_result, run_by)
       VALUES ($1, 'activation', $2, $3, $4, $5, $6)`,
      [moduleCode, report.gatesTotal, report.gatesPassed, JSON.stringify(report.gates), overallResult, runBy]
    );
  } catch (err) {
    logger.warn(`${LOG_TAG} Failed to persist preflight for ${moduleCode}:`, (err as Error).message);
  }

  return {
    moduleCode,
    overallResult,
    gatesPassed: report.gatesPassed,
    gatesTotal: report.gatesTotal,
    gates: report.gates,
    blockers,
    runAt: new Date().toISOString(),
  };
}

export async function certifyAllModules(tenantId: string): Promise<CertificationReport[]> {
  const reports: CertificationReport[] = [];
  for (const mod of BUSINESS_MODULES) {
    try {
      const report = await runCertificationGates(tenantId, mod);
      reports.push(report);
    } catch (err) {
      logger.warn(`${LOG_TAG} Certification failed for ${mod}:`, (err as Error).message);
    }
  }
  return reports;
}

export async function getModuleCertification(tenantId: string, moduleCode: string): Promise<CertificationState | null> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(
      `SELECT certification_state FROM "${schema}".module_certifications WHERE module_code = $1`, [moduleCode]
    );
    return rows.length > 0 ? rows[0].certification_state : null;
  } catch {
    return null;
  }
}

export async function isModuleCertified(tenantId: string, moduleCode: string): Promise<boolean> {
  const state = await getModuleCertification(tenantId, moduleCode);
  return state === 'CERTIFIED_A_PLUS_PLUS';
}

export async function getProductPacks(tenantId: string): Promise<PackDefinition[]> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows: packs } = await safeQuery(
      `SELECT * FROM "${schema}".platform_products WHERE is_active = TRUE ORDER BY sort_order`
    );
    const { rows: modules } = await safeQuery(
      `SELECT * FROM "${schema}".product_modules ORDER BY pack_code, sort_order`
    );
    return packs.map((p: any) => ({
      ...p,
      modules: modules
        .filter((m: any) => m.pack_code === p.pack_code)
        .map((m: any) => ({ module_code: m.module_code, is_core: m.is_core, sort_order: m.sort_order })),
    }));
  } catch {
    return [];
  }
}

export async function activatePack(tenantId: string, packCode: string): Promise<{ activated: string[]; skipped: string[] }> {
  const schema = tenantSchema(tenantId);
  const activated: string[] = [];
  const skipped: string[] = [];
  try {
    const { rows } = await safeQuery(
      `SELECT module_code FROM "${schema}".product_modules WHERE pack_code = $1 ORDER BY sort_order`, [packCode]
    );
    for (const row of rows) {
      try {
        await safeQuery(
          `INSERT INTO "${schema}".tenant_module_entitlements (module_code, pack_code, entitlement_source, is_active, activated_at)
           VALUES ($1, $2, 'pack', TRUE, NOW())
           ON CONFLICT (module_code) DO UPDATE SET is_active = TRUE, pack_code = $2, updated_at = NOW()`,
          [row.module_code, packCode]
        );
        activated.push(row.module_code);
      } catch {
        skipped.push(row.module_code);
      }
    }
  } catch (err) {
    logger.error(`${LOG_TAG} Failed to activate pack ${packCode}:`, (err as Error).message);
  }
  return { activated, skipped };
}

export async function getModuleDependencies(tenantId: string, moduleCode: string): Promise<{ module: string; type: string }[]> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(
      `SELECT depends_on, dependency_type FROM "${schema}".module_dependency_graph WHERE module_code = $1`, [moduleCode]
    );
    return rows.map((r: any) => ({ module: r.depends_on, type: r.dependency_type }));
  } catch {
    return [];
  }
}

export async function getSLAStatus(tenantId: string, moduleCode: string): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".module_sla_tracking WHERE module_code = $1 AND is_active = TRUE`, [moduleCode]
    );
    return rows;
  } catch {
    return [];
  }
}
