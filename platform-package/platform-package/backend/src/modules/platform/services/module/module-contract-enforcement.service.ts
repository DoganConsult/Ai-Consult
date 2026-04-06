// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../../config/database';
import { type CanonicalModuleCode } from '../../../../config/canonical-modules';
import { MODULE_EVENT_CONTRACTS } from '../../../../config/module-event-contracts';
import { getFirstRow } from '../../../../utils/db-utils';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

const LOG_TAG = '[MCEF]';

export type FiringStage = 'S0_entitlement' | 'S1_provisioning' | 'S2_kickstart' | 'S3_lifecycle' | 'S4_events' | 'S5_ui_shell' | 'S6_operational';
export type ReadinessState = 'ready' | 'needs_setup' | 'in_progress' | 'attention_required';

export interface StageResult {
  stage: FiringStage;
  passed: boolean;
  detail: string;
}

export interface ReadinessCheck {
  checkCode: string;
  label: string;
  passed: boolean;
  actualCount: number;
  minRequired: number;
  detail: string;
}

export interface ModuleReadinessReport {
  moduleCode: string;
  state: ReadinessState;
  score: number;
  maxScore: number;
  stages: StageResult[];
  readinessChecks: ReadinessCheck[];
  checkedAt: string;
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

const DEFAULT_READINESS_THRESHOLDS: Record<string, { checkCode: string; label: string; query: string; min: number }[]> = {
  risk: [
    { checkCode: 'scoring_model', label: 'Risk scoring model configured', query: `SELECT COUNT(*) AS cnt FROM tenant_config WHERE config_key LIKE '%risk%scoring%'`, min: 1 },
    { checkCode: 'min_risks', label: 'At least 1 risk registered', query: `SELECT COUNT(*) AS cnt FROM risks`, min: 1 },
  ],
  compliance: [
    { checkCode: 'min_frameworks', label: 'At least 1 framework provisioned', query: `SELECT COUNT(*) AS cnt FROM frameworks`, min: 1 },
    { checkCode: 'min_controls', label: 'At least 1 control mapped', query: `SELECT COUNT(*) AS cnt FROM controls`, min: 1 },
  ],
  policy: [
    { checkCode: 'min_policies', label: 'At least 1 policy shell', query: `SELECT COUNT(*) AS cnt FROM policies WHERE deleted_at IS NULL`, min: 1 },
  ],
  evidence: [
    { checkCode: 'min_schedules', label: 'At least 1 evidence schedule', query: `SELECT COUNT(*) AS cnt FROM evidence_schedules`, min: 1 },
  ],
  audit: [
    { checkCode: 'audit_plan', label: 'Audit plan exists', query: `SELECT COUNT(*) AS cnt FROM audit_plans`, min: 1 },
  ],
  foundation: [
    { checkCode: 'org_exists', label: 'Organization exists', query: `SELECT COUNT(*) AS cnt FROM organizations WHERE deleted_at IS NULL`, min: 1 },
    { checkCode: 'dept_exists', label: 'At least 1 department', query: `SELECT COUNT(*) AS cnt FROM departments WHERE deleted_at IS NULL`, min: 1 },
  ],
  governance: [
    { checkCode: 'committee', label: 'At least 1 committee', query: `SELECT COUNT(*) AS cnt FROM committees WHERE deleted_at IS NULL`, min: 1 },
  ],
  incident: [
    { checkCode: 'severity_config', label: 'Severity matrix configured', query: `SELECT COUNT(*) AS cnt FROM incident_severity_matrix WHERE is_active = TRUE`, min: 1 },
    { checkCode: 'categories', label: 'Incident categories defined', query: `SELECT COUNT(*) AS cnt FROM incident_categories WHERE is_active = TRUE`, min: 1 },
    { checkCode: 'response_team', label: 'Response team configured', query: `SELECT COUNT(*) AS cnt FROM incident_response_teams WHERE is_active = TRUE`, min: 1 },
  ],
  vendor: [
    { checkCode: 'vendor_tiers', label: 'Vendor tiers configured', query: `SELECT COUNT(*) AS cnt FROM vendor_tier_config WHERE is_active = TRUE`, min: 1 },
    { checkCode: 'dd_checklist', label: 'Due diligence checklist exists', query: `SELECT COUNT(*) AS cnt FROM vendor_due_diligence_checklists WHERE is_active = TRUE`, min: 1 },
  ],
  bcp: [
    { checkCode: 'rto_rpo', label: 'RTO/RPO defaults configured', query: `SELECT COUNT(*) AS cnt FROM bcp_rto_rpo_defaults WHERE is_active = TRUE`, min: 1 },
    { checkCode: 'crisis_team', label: 'Crisis team configured', query: `SELECT COUNT(*) AS cnt FROM bcp_crisis_teams WHERE is_active = TRUE`, min: 1 },
  ],
  asset: [
    { checkCode: 'classification', label: 'Asset classification scheme defined', query: `SELECT COUNT(*) AS cnt FROM asset_classification_scheme WHERE is_active = TRUE`, min: 1 },
    { checkCode: 'ownership', label: 'Asset ownership matrix defined', query: `SELECT COUNT(*) AS cnt FROM asset_ownership_matrix WHERE is_active = TRUE`, min: 1 },
  ],
  exception: [
    { checkCode: 'approval_config', label: 'Exception types configured', query: `SELECT COUNT(*) AS cnt FROM exception_approval_config WHERE is_active = TRUE`, min: 1 },
  ],
  remediation: [
    { checkCode: 'sla_config', label: 'Remediation SLA configured', query: `SELECT COUNT(*) AS cnt FROM remediation_sla_config WHERE is_active = TRUE`, min: 1 },
  ],
  action: [
    { checkCode: 'escalation_config', label: 'Action escalation rules configured', query: `SELECT COUNT(*) AS cnt FROM action_escalation_config WHERE is_active = TRUE`, min: 1 },
  ],
  reporting: [
    { checkCode: 'report_schedule', label: 'Report schedule configured', query: `SELECT COUNT(*) AS cnt FROM report_schedule_config WHERE is_active = TRUE`, min: 1 },
    { checkCode: 'report_defs', label: 'Report definitions exist', query: `SELECT COUNT(*) AS cnt FROM report_definitions WHERE deleted_at IS NULL`, min: 1 },
  ],
  qiyas: [
    { checkCode: 'assessment', label: 'At least 1 assessment', query: `SELECT COUNT(*) AS cnt FROM qiyas_assessments`, min: 1 },
  ],
  integrations: [
    { checkCode: 'config', label: 'Integration configured', query: `SELECT COUNT(*) AS cnt FROM integration_configs WHERE is_active = TRUE`, min: 1 },
  ],
  privacy: [
    { checkCode: 'ropa', label: 'At least 1 ROPA entry', query: `SELECT COUNT(*) AS cnt FROM ropa_entries`, min: 1 },
    { checkCode: 'retention', label: 'Retention policies configured', query: `SELECT COUNT(*) AS cnt FROM privacy_retention_policies WHERE status = 'active'`, min: 1 },
  ],
  'ai-governance': [
    { checkCode: 'ai_assets', label: 'AI assets discovered', query: `SELECT COUNT(*) AS cnt FROM ai_asset_inventory WHERE deleted_at IS NULL`, min: 1 },
  ],
  training: [
    { checkCode: 'catalog', label: 'Training catalog exists', query: `SELECT COUNT(*) AS cnt FROM training_catalog WHERE deleted_at IS NULL`, min: 1 },
  ],
};

async function checkStageS0(schema: string, moduleCode: string): Promise<StageResult> {
  try {
    try {
      const { rows: certRows } = await safeQuery(
        `SELECT certification_state FROM "${schema}".module_certifications WHERE module_code = $1`, [moduleCode]
      );
      if (certRows.length > 0 && certRows[0].certification_state === 'DISABLED') {
        return { stage: 'S0_entitlement', passed: false, detail: 'MODULE_NOT_CERTIFIED — disabled by certification framework' };
      }
      if (certRows.length > 0 && certRows[0].certification_state === 'DEPRECATED') {
        // Law 8: Deprecation requires death date — verify schedule exists
        try {
          const { rows: schedRows } = await safeQuery(
            `SELECT removal_date, owner, replacement FROM "${schema}".module_deprecation_schedule WHERE module_code = $1`,
            [moduleCode]
          );
          if (schedRows.length === 0) {
            return { stage: 'S0_entitlement', passed: false, detail: 'MODULE_DEPRECATED — Law 8 VIOLATION: no removal_date, owner, or replacement registered in module_deprecation_schedule' };
          }
          const sched = schedRows[0];
          return { stage: 'S0_entitlement', passed: false, detail: `MODULE_DEPRECATED — removal_date: ${sched.removal_date}, owner: ${sched.owner}, replacement: ${sched.replacement}` };
        } catch {
          return { stage: 'S0_entitlement', passed: false, detail: 'MODULE_DEPRECATED — scheduled for removal (deprecation schedule table not yet provisioned)' };
        }
      }
    } catch {}

    const { rows } = await safeQuery(
      `SELECT is_active FROM "${schema}".module_activation_rules WHERE module_code = $1`,
      [moduleCode]
    );
    if (rows.length === 0) {
      const { rows: mwr } = await safeQuery(
        `SELECT licensed FROM "${schema}".module_workflow_registry WHERE module_code = $1 AND is_active = TRUE`,
        [moduleCode]
      );
      return { stage: 'S0_entitlement', passed: mwr.length > 0, detail: mwr.length > 0 ? 'Licensed via MWR' : 'Not entitled' };
    }
    return { stage: 'S0_entitlement', passed: !!rows[0].is_active, detail: rows[0].is_active ? 'Active' : 'Deactivated' };
  } catch {
    return { stage: 'S0_entitlement', passed: true, detail: 'Assumed entitled (table missing)' };
  }
}

async function checkStageS1(schema: string, moduleCode: string): Promise<StageResult> {
  const tables = MODULE_CORE_TABLES[moduleCode] || [];
  if (tables.length === 0) return { stage: 'S1_provisioning', passed: true, detail: 'No core tables required' };
  let found = 0;
  for (const tbl of tables) {
    try {
      const { rows } = await safeQuery(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
        [schema, tbl]
      );
      if (rows.length > 0) found++;
    } catch {}
  }
  return {
    stage: 'S1_provisioning',
    passed: found === tables.length,
    detail: `${found}/${tables.length} core tables exist`,
  };
}

async function checkStageS2(schema: string, moduleCode: string): Promise<StageResult> {
  try {
    const { rows } = await safeQuery(
      `SELECT status FROM "${schema}".module_kickstart_log WHERE module_code = $1`,
      [moduleCode]
    );
    if (rows.length === 0) return { stage: 'S2_kickstart', passed: false, detail: 'Never kicked' };
    return { stage: 'S2_kickstart', passed: rows[0].status === 'completed', detail: `Kickstart: ${rows[0].status}` };
  } catch {
    return { stage: 'S2_kickstart', passed: false, detail: 'Kickstart log unavailable' };
  }
}

async function checkStageS3(schema: string, moduleCode: string): Promise<StageResult> {
  try {
    const { rows } = await safeQuery(
      `SELECT has_lifecycle, lifecycle_statuses FROM "${schema}".module_workflow_registry WHERE module_code = $1 AND is_active = TRUE`,
      [moduleCode]
    );
    if (rows.length === 0) return { stage: 'S3_lifecycle', passed: false, detail: 'Not in MWR' };
    const statuses = Array.isArray(rows[0].lifecycle_statuses) ? rows[0].lifecycle_statuses : [];
    return { stage: 'S3_lifecycle', passed: statuses.length > 0, detail: `${statuses.length} lifecycle statuses` };
  } catch {
    return { stage: 'S3_lifecycle', passed: false, detail: 'MWR unavailable' };
  }
}

async function checkStageS4(_schema: string, moduleCode: string): Promise<StageResult> {
  const contract = MODULE_EVENT_CONTRACTS[moduleCode as CanonicalModuleCode];
  if (!contract) return { stage: 'S4_events', passed: false, detail: 'No event contract declared' };
  return { stage: 'S4_events', passed: contract.events.length > 0, detail: `${contract.events.length} events declared` };
}

async function checkStageS5(schema: string, moduleCode: string): Promise<StageResult> {
  try {
    const { rows } = await safeQuery(
      `SELECT default_landing_route FROM "${schema}".module_workflow_registry WHERE module_code = $1 AND is_active = TRUE`,
      [moduleCode]
    );
    return { stage: 'S5_ui_shell', passed: rows.length > 0 && !!rows[0].default_landing_route, detail: rows[0]?.default_landing_route || 'No landing route' };
  } catch {
    return { stage: 'S5_ui_shell', passed: false, detail: 'Cannot determine UI shell' };
  }
}

async function checkStageS6(schema: string, moduleCode: string): Promise<StageResult> {
  try {
    const { rows } = await safeQuery(
      `SELECT status FROM "${schema}".module_kickstart_log WHERE module_code = $1`,
      [moduleCode]
    );
    if (rows.length === 0 || rows[0].status !== 'completed') {
      return { stage: 'S6_operational', passed: false, detail: 'Not operational — kickstart incomplete' };
    }
    const tables = MODULE_CORE_TABLES[moduleCode] || [];
    let hasData = false;
    for (const tbl of tables) {
      try {
        const cnt = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}"."${tbl}" LIMIT 1`);
        if (Number(getFirstRow(cnt)?.cnt) > 0) { hasData = true; break; }
      } catch {}
    }
    return { stage: 'S6_operational', passed: hasData, detail: hasData ? 'Has live data' : 'No data — starter mode' };
  } catch {
    return { stage: 'S6_operational', passed: false, detail: 'Cannot determine operational state' };
  }
}

async function runReadinessChecks(schema: string, moduleCode: string): Promise<ReadinessCheck[]> {
  const thresholds = DEFAULT_READINESS_THRESHOLDS[moduleCode] || [];
  const results: ReadinessCheck[] = [];
  for (const t of thresholds) {
    try {
      const q = t.query.replace(/FROM\s+/gi, `FROM "${schema}".`);
      const { rows } = await safeQuery(q);
      const cnt = Number(rows[0]?.cnt ?? 0);
      results.push({
        checkCode: t.checkCode,
        label: t.label,
        passed: cnt >= t.min,
        actualCount: cnt,
        minRequired: t.min,
        detail: cnt >= t.min ? 'Passed' : `Need ${t.min}, found ${cnt}`,
      });
    } catch {
      results.push({
        checkCode: t.checkCode,
        label: t.label,
        passed: false,
        actualCount: 0,
        minRequired: t.min,
        detail: 'Check query failed (table may not exist)',
      });
    }
  }

  try {
    await safeQuery(`DELETE FROM "${schema}".module_readiness_results WHERE module_code = $1`, [moduleCode]);
    for (const r of results) {
      await safeQuery(
        `INSERT INTO "${schema}".module_readiness_results (module_code, check_code, passed, actual_count, min_required, detail)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (module_code, check_code) DO UPDATE SET
         passed = $3, actual_count = $4, detail = $6, checked_at = NOW()`,
        [moduleCode, r.checkCode, r.passed, r.actualCount, r.minRequired, r.detail]
      );
    }
  } catch {}

  return results;
}

function computeState(stages: StageResult[], checks: ReadinessCheck[]): ReadinessState {
  const allStagesPassed = stages.every(s => s.passed);
  const allChecksPassed = checks.every(c => c.passed);
  const s0Failed = stages.some(s => s.stage === 'S0_entitlement' && !s.passed);
  const s1Failed = stages.some(s => s.stage === 'S1_provisioning' && !s.passed);
  const inProgress = stages.some(s => !s.passed && ['S2_kickstart', 'S5_ui_shell'].includes(s.stage));

  if (allStagesPassed && allChecksPassed) return 'ready';
  if (s0Failed || s1Failed) return 'attention_required';
  if (inProgress) return 'in_progress';
  const anyCoreFailed = stages.some(s => !s.passed && s.stage !== 'S6_operational');
  if (anyCoreFailed && !inProgress) return 'needs_setup';
  return 'needs_setup';
}

export async function getModuleReadiness(tenantId: string, moduleCode: string): Promise<ModuleReadinessReport> {
  const schema = tenantSchema(tenantId);
  const stages = await Promise.all([
    checkStageS0(schema, moduleCode),
    checkStageS1(schema, moduleCode),
    checkStageS2(schema, moduleCode),
    checkStageS3(schema, moduleCode),
    checkStageS4(schema, moduleCode),
    checkStageS5(schema, moduleCode),
    checkStageS6(schema, moduleCode),
  ]);

  const readinessChecks = await runReadinessChecks(schema, moduleCode);
  const state = computeState(stages, readinessChecks);
  const passedStages = stages.filter(s => s.passed).length;
  const passedChecks = readinessChecks.filter(c => c.passed).length;

  try {
    for (const s of stages) {
      const stageStatus = s.passed ? 'completed' : 'pending';
      await safeQuery(
        `INSERT INTO "${schema}".module_maturity_stages (module_code, stage_code, status, completed_at, evidence)
         VALUES ($1, $2, $3, CASE WHEN $3 = 'completed' THEN NOW() ELSE NULL END, $4)
         ON CONFLICT (module_code, stage_code) DO UPDATE SET status = $3, updated_at = NOW(),
         completed_at = CASE WHEN $3 = 'completed' THEN NOW() ELSE module_maturity_stages.completed_at END`,
        [moduleCode, s.stage, stageStatus, JSON.stringify({ detail: s.detail })]
      );
    }
  } catch {}

  return {
    moduleCode,
    state,
    score: passedStages + passedChecks,
    maxScore: stages.length + readinessChecks.length,
    stages,
    readinessChecks,
    checkedAt: new Date().toISOString(),
  };
}

export async function getAllModulesReadiness(tenantId: string): Promise<ModuleReadinessReport[]> {
  const BATCH_SIZE = 5;
  const reports: ModuleReadinessReport[] = [];
  for (let i = 0; i < BUSINESS_MODULES.length; i += BATCH_SIZE) {
    const batch = BUSINESS_MODULES.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(mod => getModuleReadiness(tenantId, mod))
    );
    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      if (result.status === 'fulfilled') {
        reports.push(result.value);
      } else {
        logger.warn(`${LOG_TAG} Failed readiness check for ${batch[j]}: ${result.reason?.message}`);
        reports.push({
          moduleCode: batch[j],
          state: 'attention_required',
          score: 0,
          maxScore: 7,
          stages: [],
          readinessChecks: [],
          checkedAt: new Date().toISOString(),
        });
      }
    }
  }
  return reports;
}

export async function isModuleReady(tenantId: string, moduleCode: string): Promise<boolean> {
  const report = await getModuleReadiness(tenantId, moduleCode);
  return report.state === 'ready';
}
