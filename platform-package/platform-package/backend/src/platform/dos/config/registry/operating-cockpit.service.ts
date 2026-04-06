// @ts-nocheck
import { emptyResult, safeQuery, tenantSchema } from '../../../../config/database';
import { readGovernanceContext, readModuleOperatingStates, type type  } from '../../../../modules/ai/services/copilot/context-reader.service';
import { getFirstRow } from '../../../../utils/db-utils';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';

export interface CockpitNextAction {
  rule_code: string;
  action_type: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  link_template: string | null;
  priority: number;
  category: string;
  count: number;
}

export interface OperatingCockpitSnapshot {
  personaCode: string;
  persona: {
    label_en: string;
    label_ar: string;
    description_en: string;
    description_ar: string;
  };
  liveMetrics: {
    openTasks: number;
    overdueTasks: number;
    pendingApprovals: number;
    openFindings: number;
    evidenceGaps: number;
    activeRisks: number;
    startupProgress: number;
    openIncidents: number;
    slaBreaches: number;
    incidentResponseTimeHrs: number;
    trainingCompletion: number;
    overdueTraining: number;
    expiringCertifications: number;
    privacyBreaches: number;
    openDsrs: number;
    consentHealth: number;
    evidenceFreshness: number;
    governanceHealth: number;
    policyReviewStatus: number;
  };
  nextBestActions: CockpitNextAction[];
  recommendations: any[];
  startupChecklist: any[];
  governanceContext: {
    complexity: string;
    contextVersion: number;
    authorities: any[];
    painPriorities: any[];
    activeModuleCount: number;
    totalModuleCount: number;
    automationReadiness: Record<string, any>;
  } | null;
}

export async function getOperatingCockpit(
  tenantId: string,
  userId: string,
  roleCode?: string,
): Promise<OperatingCockpitSnapshot> {
  const schema = tenantSchema(tenantId);
  const personaCode = await resolvePersona(tenantId, userId, roleCode);

  const personaResult = await safeQuery(
    `SELECT label_en, label_ar, description_en, description_ar, next_best_action_categories
     FROM public.dashboard_persona_profiles WHERE persona_code = $1`,
    [personaCode],
  );
  const persona = getFirstRow(personaResult) ?? {
    label_en: 'Dashboard', label_ar: 'لوحة المعلومات',
    description_en: '', description_ar: '',
    next_best_action_categories: [],
  };

  const [metrics, nextBestActions, recommendations, startupChecklist, govCtx, modStates] = await Promise.all([
    computeLiveMetrics(schema, tenantId),
    computeNextBestActions(schema, tenantId, personaCode),
    getTopRecommendations(schema, tenantId),
    getStartupProgress(tenantId),
    readGovernanceContext(tenantId),
    readModuleOperatingStates(tenantId),
  ]);

  let governanceContext: OperatingCockpitSnapshot['governanceContext'] = null;
  if (govCtx) {
    const reg = govCtx.regulatoryProfile as Record<string, any>;
    const pain = govCtx.painProfile as Record<string, any>;
    const auto = govCtx.automationProfile as Record<string, any>;
    const activeModules = modStates.filter(m => m.state === 'on' || (m.state === 'trial' && (!m.trialExpiryAt || new Date(m.trialExpiryAt) >= new Date())));
    governanceContext = {
      complexity: govCtx.complexity,
      contextVersion: govCtx.contextVersion,
      authorities: (reg.authorities as any[]) ?? [],
      painPriorities: (pain.primaryConcerns as any[]) ?? [],
      activeModuleCount: activeModules.length,
      totalModuleCount: modStates.length,
      automationReadiness: {
        hasSSO: auto.hasSSO ?? false,
        hasSIEM: auto.hasSIEM ?? false,
        hasIAM: auto.hasIAM ?? false,
        cloudProvider: auto.cloudProvider ?? null,
      },
    };
  }

  return {
    personaCode,
    persona: {
      label_en: persona.label_en,
      label_ar: persona.label_ar,
      description_en: persona.description_en ?? '',
      description_ar: persona.description_ar ?? '',
    },
    liveMetrics: metrics,
    nextBestActions,
    recommendations,
    startupChecklist,
    governanceContext,
  };
}

async function resolvePersona(tenantId: string, userId: string, roleCode?: string): Promise<string> {
  if (roleCode) {
    const match = await safeQuery(
      `SELECT persona_code FROM public.dashboard_persona_profiles
       WHERE $1 = ANY(role_codes) AND is_active = true
       ORDER BY sort_order LIMIT 1`,
      [roleCode],
    );
    if (getFirstRow(match)) return getFirstRow(match)?.persona_code;
  }

  const schema = tenantSchema(tenantId);
  try {
    const userRole = await safeQuery(
      `SELECT role_code FROM "${schema}".user_roles WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    if (getFirstRow(userRole)?.role_code) {
      const match = await safeQuery(
        `SELECT persona_code FROM public.dashboard_persona_profiles
         WHERE $1 = ANY(role_codes) AND is_active = true
         ORDER BY sort_order LIMIT 1`,
        [getFirstRow(userRole)?.role_code],
      );
      if (getFirstRow(match)) return getFirstRow(match)?.persona_code;
    }
  } catch { /* table may not exist yet */ }

  return 'sme_lite';
}

async function computeLiveMetrics(schema: string, tenantId: string) {
  const defaults = {
    openTasks: 0, overdueTasks: 0, pendingApprovals: 0,
    openFindings: 0, evidenceGaps: 0, activeRisks: 0, startupProgress: 0,
    openIncidents: 0, slaBreaches: 0, incidentResponseTimeHrs: 0,
    trainingCompletion: 0, overdueTraining: 0, expiringCertifications: 0,
    privacyBreaches: 0, openDsrs: 0, consentHealth: 0,
    evidenceFreshness: 0, governanceHealth: 0, policyReviewStatus: 0,
  };

  try {
    const [tasks, findings, evidence, risks, startup,
           incidents, training, privacy, governance] = await Promise.all([
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{}]), safeQuery(`SELECT
        COUNT(*) FILTER (WHERE status IN ('open','in_progress'))::int AS open_tasks,
        COUNT(*) FILTER (WHERE status IN ('open','in_progress') AND due_at < NOW())::int AS overdue_tasks,
        COUNT(*) FILTER (WHERE status = 'pending_approval')::int AS pending_approvals
        FROM "${schema}".process_tasks WHERE deleted_at IS NULL`), { tenantId, operation: 'query process_tasks' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".findings
        WHERE status IN ('open','in_progress')`), { tenantId, operation: 'query findings' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{}]), safeQuery(`SELECT
        COUNT(*) FILTER (WHERE status = 'Open' AND due_at < NOW())::int AS gaps,
        CASE WHEN COUNT(*) > 0 THEN ROUND(100.0 * COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '90 days') / COUNT(*))::int ELSE 0 END AS freshness_pct
        FROM "${schema}".evidence_tasks`), { tenantId, operation: 'query evidence_tasks' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".risks
        WHERE status = 'active'`), { tenantId, operation: 'query risks' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ done: 0, total: 0 }]), safeQuery(`SELECT
        COUNT(*) FILTER (WHERE is_completed = true)::int AS done,
        COUNT(*)::int AS total
        FROM startup_checklists WHERE tenant_id = $1`, [tenantId]), { tenantId, operation: 'query startup_checklists' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{}]), safeQuery(`SELECT
        COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed'))::int AS open_cnt,
        COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed') AND (
          (severity = 'critical' AND created_at < NOW() - INTERVAL '4 hours')
          OR (severity = 'high' AND created_at < NOW() - INTERVAL '24 hours')
          OR (severity = 'medium' AND created_at < NOW() - INTERVAL '72 hours')
        ))::int AS sla_breached,
        COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - created_at)) / 3600) FILTER (WHERE resolved_at IS NOT NULL AND resolved_at > NOW() - INTERVAL '30 days'), 0)::int AS avg_response_hrs
        FROM "${schema}".incidents WHERE deleted_at IS NULL`), { tenantId, operation: 'query incidents' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{}]), safeQuery(`SELECT
        CASE WHEN COUNT(*) > 0 THEN ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / COUNT(*))::int ELSE 0 END AS completion_pct,
        COUNT(*) FILTER (WHERE status IN ('assigned','in_progress') AND due_date < NOW())::int AS overdue_cnt,
        COUNT(*) FILTER (WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < NOW() + INTERVAL '30 days')::int AS expiring_certs
        FROM "${schema}".training_assignments WHERE deleted_at IS NULL`), { tenantId, operation: 'query training' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{}]), safeQuery(`SELECT
        COUNT(*) FILTER (WHERE entity_type = 'breach' AND status IN ('open','investigating'))::int AS active_breaches,
        COUNT(*) FILTER (WHERE entity_type = 'dsr' AND status IN ('submitted','in_progress'))::int AS open_dsrs,
        CASE WHEN COUNT(*) FILTER (WHERE entity_type = 'consent') > 0
          THEN ROUND(100.0 * COUNT(*) FILTER (WHERE entity_type = 'consent' AND status = 'granted') / COUNT(*) FILTER (WHERE entity_type = 'consent'))::int
          ELSE 100 END AS consent_health_pct
        FROM "${schema}".data_subject_requests WHERE deleted_at IS NULL`), { tenantId, operation: 'query privacy' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{}]), safeQuery(`SELECT
        CASE WHEN COUNT(*) > 0 THEN ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'approved') / COUNT(*))::int ELSE 0 END AS health_pct,
        CASE WHEN COUNT(*) > 0 THEN ROUND(100.0 * COUNT(*) FILTER (WHERE next_review_at IS NOT NULL AND next_review_at > NOW()) / COUNT(*))::int ELSE 0 END AS review_pct
        FROM "${schema}".policies WHERE deleted_at IS NULL`), { tenantId, operation: 'query governance' }),
    ]);

    const t = getFirstRow(tasks) ?? {};
    const s = getFirstRow(startup) ?? { done: 0, total: 0 };
    const ev = getFirstRow(evidence) ?? {};
    const inc = getFirstRow(incidents) ?? {};
    const tr = getFirstRow(training) ?? {};
    const pr = getFirstRow(privacy) ?? {};
    const gov = getFirstRow(governance) ?? {};

    return {
      openTasks: parseInt(t.open_tasks ?? '0'),
      overdueTasks: parseInt(t.overdue_tasks ?? '0'),
      pendingApprovals: parseInt(t.pending_approvals ?? '0'),
      openFindings: parseInt(getFirstRow(findings)?.cnt ?? '0'),
      evidenceGaps: parseInt(ev.gaps ?? '0'),
      activeRisks: parseInt(getFirstRow(risks)?.cnt ?? '0'),
      startupProgress: s.total > 0 ? Math.round((s.done / s.total) * 100) : 0,
      openIncidents: parseInt(inc.open_cnt ?? '0'),
      slaBreaches: parseInt(inc.sla_breached ?? '0'),
      incidentResponseTimeHrs: parseInt(inc.avg_response_hrs ?? '0'),
      trainingCompletion: parseInt(tr.completion_pct ?? '0'),
      overdueTraining: parseInt(tr.overdue_cnt ?? '0'),
      expiringCertifications: parseInt(tr.expiring_certs ?? '0'),
      privacyBreaches: parseInt(pr.active_breaches ?? '0'),
      openDsrs: parseInt(pr.open_dsrs ?? '0'),
      consentHealth: parseInt(pr.consent_health_pct ?? '100'),
      evidenceFreshness: parseInt(ev.freshness_pct ?? '0'),
      governanceHealth: parseInt(gov.health_pct ?? '0'),
      policyReviewStatus: parseInt(gov.review_pct ?? '0'),
    };
  } catch {
    return defaults;
  }
}

const ALLOWED_COCKPIT_TABLES = new Set([
  'process_tasks', 'findings', 'evidence_tasks', 'controls', 'risks',
  'startup_checklists', 'assessments', 'audit_plans', 'remediation_actions',
  'policies', 'obligations', 'evidence', 'risk_treatments',
  'incidents', 'incident_response_actions', 'incident_root_causes',
  'training_assignments', 'training_content', 'training_campaigns',
  'data_subject_requests', 'privacy_consents', 'privacy_breaches',
]);

const FORBIDDEN_SQL_PATTERNS = [
  /;\s*/,
  /\b(DROP|ALTER|CREATE|INSERT|UPDATE|DELETE|TRUNCATE|GRANT|REVOKE|EXECUTE|EXEC)\b/i,
  /\b(INTO|SET)\b/i,
  /--/,
  /\/\*/,
  /\bpg_/i,
  /\binformation_schema\b/i,
  /\bxp_/i,
  /\bcopy\b/i,
];

export function validateConditionSql(sql: string): boolean {
  if (!sql || typeof sql !== 'string') return false;
  if (sql.length > 500) return false;
  for (const pattern of FORBIDDEN_SQL_PATTERNS) {
    if (pattern.test(sql)) return false;
  }
  if (!/^\s*SELECT\b/i.test(sql)) return false;
  const fromMatches = sql.match(/\bFROM\s+([a-z_][a-z0-9_]*)/gi);
  if (fromMatches) {
    for (const m of fromMatches) {
      const tableName = m.replace(/^FROM\s+/i, '').trim();
      if (tableName !== 'public' && !ALLOWED_COCKPIT_TABLES.has(tableName)) return false;
    }
  }
  const joinMatches = sql.match(/\bJOIN\s+([a-z_][a-z0-9_]*)/gi);
  if (joinMatches) {
    for (const m of joinMatches) {
      const tableName = m.replace(/^JOIN\s+/i, '').trim();
      if (!ALLOWED_COCKPIT_TABLES.has(tableName)) return false;
    }
  }
  return true;
}

function qualifySqlWithSchema(sql: string, schema: string): string {
  let result = sql;
  for (const table of ALLOWED_COCKPIT_TABLES) {
    const re = new RegExp(`\\b(FROM|JOIN)\\s+${table}\\b`, 'gi');
    result = result.replace(re, `$1 "${schema}".${table}`);
  }
  return result;
}

async function computeNextBestActions(
  schema: string,
  tenantId: string,
  personaCode: string,
): Promise<CockpitNextAction[]> {
  const rulesResult = await safeQuery(
    `SELECT rule_code, condition_sql, action_type, title_en, title_ar,
            description_en, description_ar, link_template, priority, category
     FROM public.cockpit_next_best_action_rules
     WHERE is_active = true AND $1 = ANY(persona_codes)
     ORDER BY priority`,
    [personaCode],
  );

  const actions: CockpitNextAction[] = [];

  for (const rule of rulesResult.rows) {
    try {
      if (!validateConditionSql(rule.condition_sql)) continue;
      const qualifiedSql = qualifySqlWithSchema(rule.condition_sql, schema);
      const result = await safeQuery(qualifiedSql, tenantId ? [tenantId] : []);
      const cnt = parseInt(getFirstRow(result)?.cnt ?? '0');
      if (cnt > 0) {
        actions.push({
          rule_code: rule.rule_code,
          action_type: rule.action_type,
          title_en: rule.title_en,
          title_ar: rule.title_ar,
          description_en: rule.description_en.replace('{cnt}', String(cnt)),
          description_ar: rule.description_ar.replace('{cnt}', String(cnt)),
          link_template: rule.link_template,
          priority: rule.priority,
          category: rule.category,
          count: cnt,
        });
      }
    } catch { /* condition_sql may reference tables that don't exist yet */ }
  }

  return actions.sort((a, b) => a.priority - b.priority).slice(0, 10);
}

async function getTopRecommendations(schema: string, tenantId: string): Promise<any[]> {
  try {
    const result = await safeQuery(
      `SELECT decision_id, agent_id, explanation, outcome, confidence, created_at
       FROM "${schema}".decision_record
       WHERE tenant_id = $1 AND decision_type = 'recommendation'
         AND outcome->>'status' = 'pending'
       ORDER BY created_at DESC LIMIT 10`,
      [tenantId],
    );
    return result.rows;
  } catch {
    return [];
  }
}

async function getStartupProgress(tenantId: string): Promise<any[]> {
  try {
    const result = await safeQuery(
      `SELECT item_code, title_en, title_ar, category, is_completed, completed_at
       FROM startup_checklists
       WHERE tenant_id = $1
       ORDER BY sort_order`,
      [tenantId],
    );
    return result.rows;
  } catch {
    return [];
  }
}
