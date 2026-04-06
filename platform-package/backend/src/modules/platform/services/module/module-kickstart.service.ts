// @ts-nocheck
import { emptyResult, query, safeQuery, tenantSchema } from '../../../../config/database';
import { createProcessTask } from '../../../../platform/dos/workflows';
import { instantiateTemplate } from '../../../workflow/services/templates/workflow-templates.service';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';
import { swallowDefault, EC , catchHandler } from '../../../../utils/resilient-catch';

export type ModuleCode = 'foundation' | 'governance' | 'risk' | 'compliance' | 'policy' | 'evidence' | 'audit' | 'reporting'
  | 'incident' | 'vendor' | 'bcp' | 'exception' | 'asset' | 'remediation'
  | 'action' | 'training' | 'ai-governance' | 'privacy' | 'qiyas' | 'integrations'
  | 'reports';

export interface KickstartResult {
  module: ModuleCode;
  status: 'completed' | 'failed';
  artifacts: Record<string, any>;
  errors: string[];
}

interface KickstartCtx {
  tenantId: string;
  schema: string;
  userId: string;
  workspaceId: string | null;
}

async function getCtx(tenantId: string, userId: string): Promise<KickstartCtx> {
  const schema = tenantSchema(tenantId);
  const ws = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT workspace_id FROM "${schema}".workspaces ORDER BY created_at DESC LIMIT 1`
  ), { operation: 'query workspaces' });
  return { tenantId, schema, userId, workspaceId: getFirstRow(ws)?.workspace_id ?? null };
}

async function checkStatus(schema: string, moduleCode: ModuleCode): Promise<string | null> {
  const row = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT status FROM "${schema}".module_kickstart_log WHERE module_code = $1`,
    [moduleCode]
  ), { operation: 'query workspaces' });
  return getFirstRow(row)?.status ?? null;
}

async function writeLog(
  schema: string, moduleCode: ModuleCode, status: string, userId: string,
  artifacts: Record<string, any>, errors: string[]
): Promise<void> {
  await query(
    `INSERT INTO "${schema}".module_kickstart_log (module_code, status, kicked_at, kicked_by, artifacts_created, errors)
     VALUES ($1, $2, NOW(), $3, $4, $5)
     ON CONFLICT (module_code) DO UPDATE SET
       status = EXCLUDED.status, kicked_at = EXCLUDED.kicked_at, kicked_by = EXCLUDED.kicked_by,
       artifacts_created = EXCLUDED.artifacts_created, errors = EXCLUDED.errors, updated_at = NOW()`,
    [moduleCode, status, userId, JSON.stringify(artifacts), errors.length > 0 ? JSON.stringify(errors) : null]
  );
}

async function safeTask(ctx: KickstartCtx, input: Parameters<typeof createProcessTask>[1]): Promise<string | null> {
  try {
    const t = await createProcessTask(ctx.tenantId, input);
    return t.taskId;
  } catch { return null; }
}

async function safeWorkflow(ctx: KickstartCtx, templateCode: string): Promise<string | null> {
  try {
    const r = await instantiateTemplate(ctx.tenantId, templateCode, { workspaceId: ctx.workspaceId }, 'system');
    return r?.instanceId ?? 'ok';
  } catch { return null; }
}

// ═══ F1 — FOUNDATION ═══
export async function kickstartFoundation(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];

  try {
    await writeLog(ctx.schema, 'foundation', 'in_progress', userId, {}, []);

    const orgRes = await safeQuery(
      `SELECT org_id FROM "${ctx.schema}".organizations WHERE deleted_at IS NULL LIMIT 1`
    );
    let orgId = getFirstRow(orgRes)?.org_id;
    if (!orgId) {
      const tenant = await safeQuery(
        `SELECT org_name, settings FROM public.tenants WHERE tenant_id = $1`, [tenantId]
      );
      const t = getFirstRow(tenant) || {};
      const settings = typeof t.settings === 'object' && t.settings ? t.settings : {};
      const ins = await safeQuery(
        `INSERT INTO "${ctx.schema}".organizations (tenant_id, name_en, org_type, status, metadata, created_by)
         VALUES (gen_random_uuid(), $1, 'holding', 'active', $2, 'system')
         ON CONFLICT DO NOTHING RETURNING org_id`,
        [t.org_name || 'Organization', JSON.stringify({ seed_source: 'fire_point', country: settings.country || '' })]
      );
      orgId = getFirstRow(ins)?.org_id;
    }
    artifacts.orgId = orgId;

    if (orgId) {
      const buRes = await safeQuery(
        `SELECT bu_id FROM "${ctx.schema}".business_units WHERE org_id = $1 AND deleted_at IS NULL LIMIT 1`, [orgId]
      );
      if (!getFirstRow(buRes)) {
        await safeQuery(
          `INSERT INTO "${ctx.schema}".business_units (org_id, name_en, code, status, created_by)
           VALUES ($1, 'Main Unit', 'MAIN', 'active', 'system') ON CONFLICT DO NOTHING`, [orgId]
        );
      }
    }

    const deptDefaults = ['Administration', 'Operations', 'Compliance'];
    const existDepts = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${ctx.schema}".departments WHERE deleted_at IS NULL`
    );
    if (Number(getFirstRow(existDepts)?.cnt) === 0) {
      const buRow = await safeQuery(
        `SELECT bu_id FROM "${ctx.schema}".business_units WHERE deleted_at IS NULL LIMIT 1`
      );
      const buId = getFirstRow(buRow)?.bu_id;
      if (buId) {
        for (const d of deptDefaults) {
          await safeQuery(
            `INSERT INTO "${ctx.schema}".departments (bu_id, name_en, code, status, created_by)
             VALUES ($1, $2, $3, 'active', 'system') ON CONFLICT DO NOTHING`,
            [buId, d, d.toLowerCase().replace(/\s/g, '_')]
          ).catch(catchHandler(EC.EVENT_BUS, {}));
        }
        artifacts.departments = deptDefaults.length;
      }
    }

    const teamCnt = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${ctx.schema}".teams WHERE active = true`
    ), { operation: 'query teams' });
    artifacts.teamsExisting = Number(getFirstRow(teamCnt)?.cnt);

    const t1 = await safeTask(ctx, {
      title: 'Complete Organization Profile',
      taskType: 'verification', priority: 'high', entityType: 'user',
      dueInHours: 72, triggerSource: 'fire_point_foundation',
    });
    const t2 = await safeTask(ctx, {
      title: 'Assign department owners',
      taskType: 'verification', priority: 'high', entityType: 'user',
      dueInHours: 72, triggerSource: 'fire_point_foundation',
    });
    artifacts.tasks = [t1, t2].filter(Boolean);

    await writeLog(ctx.schema, 'foundation', 'completed', userId, artifacts, errors);
    return { module: 'foundation', status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'foundation', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'foundation', status: 'failed', artifacts, errors };
  }
}

// ═══ F2 — GOVERNANCE ═══
export async function kickstartGovernance(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];

  try {
    await writeLog(ctx.schema, 'governance', 'in_progress', userId, {}, []);

    const policyShells = [
      { title: 'Information Security Policy', code: 'ISP' },
      { title: 'Acceptable Use Policy', code: 'AUP' },
      { title: 'Data Classification Policy', code: 'DCP' },
    ];
    let seeded = 0;
    for (const p of policyShells) {
      const exists = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT policy_id FROM "${ctx.schema}".policies WHERE title = $1 LIMIT 1`, [p.title]
      ), { operation: 'query policies' });
      if (exists.rows.length === 0) {
        await safeQuery(
          `INSERT INTO "${ctx.schema}".policies (title, status, category, workspace_id, created_by)
           VALUES ($1, 'draft', 'governance', $2, 'system')`,
          [p.title, ctx.workspaceId]
        ).catch((e: unknown) => errors.push(`policy ${p.code}: ${(e instanceof Error ? e.message : String(e))}`));
        seeded++;
      }
    }
    artifacts.policiesSeeded = seeded;

    const wf = await safeWorkflow(ctx, 'policy_lifecycle');
    artifacts.workflowInstance = wf;

    const t1 = await safeTask(ctx, {
      title: 'Complete first policy draft',
      taskType: 'policy_creation', priority: 'high', entityType: 'policy',
      dueInHours: 120, triggerSource: 'fire_point_governance',
    });
    const t2 = await safeTask(ctx, {
      title: 'Configure policy review cadence',
      taskType: 'verification', priority: 'medium', entityType: 'policy',
      dueInHours: 168, triggerSource: 'fire_point_governance',
    });
    artifacts.tasks = [t1, t2].filter(Boolean);

    await writeLog(ctx.schema, 'governance', 'completed', userId, artifacts, errors);
    return { module: 'governance', status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'governance', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'governance', status: 'failed', artifacts, errors };
  }
}

// ═══ F3 — RISK ═══
export async function kickstartRisk(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];

  try {
    await writeLog(ctx.schema, 'risk', 'in_progress', userId, {}, []);

    const riskCnt = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${ctx.schema}".risks`
    ), { operation: 'query risks' });

    if (Number(getFirstRow(riskCnt)?.cnt) === 0) {
      const starterRisks = [
        { title: 'Unauthorized access to critical systems', category: 'cybersecurity', likelihood: 4, impact: 5 },
        { title: 'Data breach of customer PII', category: 'data_protection', likelihood: 3, impact: 5 },
        { title: 'Non-compliance with NCA ECC', category: 'regulatory', likelihood: 3, impact: 4 },
        { title: 'Business continuity disruption', category: 'operational', likelihood: 2, impact: 5 },
        { title: 'Third-party vendor security failure', category: 'vendor', likelihood: 3, impact: 4 },
      ];
      for (const r of starterRisks) {
        await safeQuery(
          `INSERT INTO "${ctx.schema}".risks (title, category, likelihood, impact, risk_score, status, workspace_id, created_by)
           VALUES ($1, $2, $3, $4, $5, 'identified', $6, 'system')`,
          [r.title, r.category, r.likelihood, r.impact, r.likelihood * r.impact, ctx.workspaceId]
        ).catch((e: unknown) => errors.push(`risk: ${(e instanceof Error ? e.message : String(e))}`));
      }
      artifacts.risksSeeded = starterRisks.length;
    }

    const topRisks = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT risk_id, title FROM "${ctx.schema}".risks ORDER BY risk_score DESC NULLS LAST LIMIT 3`
    ), { operation: 'query risks' });

    const taskIds: string[] = [];
    for (const r of topRisks.rows) {
      const tid = await safeTask(ctx, {
        title: `Assess risk: ${r.title}`,
        taskType: 'risk_assessment', priority: 'high', entityType: 'risk', entityId: r.risk_id,
        dueInHours: 72, triggerSource: 'fire_point_risk',
      });
      if (tid) taskIds.push(tid);
    }
    artifacts.assessmentTasks = taskIds;

    const wf = await safeWorkflow(ctx, 'risk_treatment');
    artifacts.workflowInstance = wf;

    const vt = await safeTask(ctx, {
      title: 'Validate risk register baseline',
      taskType: 'verification', priority: 'medium', entityType: 'risk',
      dueInHours: 168, triggerSource: 'fire_point_risk',
    });
    if (vt) taskIds.push(vt);

    await writeLog(ctx.schema, 'risk', 'completed', userId, artifacts, errors);
    return { module: 'risk', status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'risk', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'risk', status: 'failed', artifacts, errors };
  }
}

// ═══ F4 — COMPLIANCE ═══
export async function kickstartCompliance(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];

  try {
    await writeLog(ctx.schema, 'compliance', 'in_progress', userId, {}, []);

    const fwRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT framework_id, name FROM "${ctx.schema}".frameworks LIMIT 5`
    ), { operation: 'query frameworks' });

    if (fwRes.rows.length === 0) {
      errors.push('No frameworks provisioned — complete onboarding first');
      await writeLog(ctx.schema, 'compliance', 'failed', userId, artifacts, errors);
      return { module: 'compliance', status: 'failed', artifacts, errors };
    }
    artifacts.frameworks = fwRes.rows.length;

    const taskIds: string[] = [];
    for (const fw of fwRes.rows) {
      const tid = await safeTask(ctx, {
        title: `Gap assessment: ${fw.name || fw.framework_id}`,
        taskType: 'control_review', priority: 'high', entityType: 'control',
        dueInHours: 120, triggerSource: 'fire_point_compliance',
      });
      if (tid) taskIds.push(tid);
    }
    artifacts.gapAssessmentTasks = taskIds;

    const wf = await safeWorkflow(ctx, 'compliance_remediation');
    artifacts.workflowInstance = wf;

    const vt = await safeTask(ctx, {
      title: 'Complete initial gap assessment',
      taskType: 'control_review', priority: 'high', entityType: 'control',
      dueInHours: 120, triggerSource: 'fire_point_compliance',
    });
    if (vt) taskIds.push(vt);

    await writeLog(ctx.schema, 'compliance', 'completed', userId, artifacts, errors);
    return { module: 'compliance', status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'compliance', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'compliance', status: 'failed', artifacts, errors };
  }
}

// ═══ F4b — POLICY ═══
export async function kickstartPolicy(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];

  try {
    await writeLog(ctx.schema, 'policy', 'in_progress', userId, {}, []);

    const existingCount = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${ctx.schema}".policies WHERE deleted_at IS NULL`
    ), { operation: 'query policies' });

    if (Number(getFirstRow(existingCount)?.cnt) === 0) {
      const starterPolicies = [
        { title: 'Information Security Policy', category: 'security' },
        { title: 'Acceptable Use Policy', category: 'operational' },
        { title: 'Data Classification Policy', category: 'data_protection' },
        { title: 'Access Control Policy', category: 'security' },
        { title: 'Incident Response Policy', category: 'operational' },
      ];
      let seeded = 0;
      for (const p of starterPolicies) {
        await safeQuery(
          `INSERT INTO "${ctx.schema}".policies (title, status, category, workspace_id, created_by)
           VALUES ($1, 'draft', $2, $3, 'system') ON CONFLICT DO NOTHING`,
          [p.title, p.category, ctx.workspaceId]
        ).catch((e: unknown) => errors.push(`policy ${p.title}: ${(e instanceof Error ? e.message : String(e))}`));
        seeded++;
      }
      artifacts.policiesSeeded = seeded;
    } else {
      artifacts.policiesExisting = Number(getFirstRow(existingCount)?.cnt);
    }

    const wf = await safeWorkflow(ctx, 'policy_lifecycle');
    artifacts.workflowInstance = wf;

    const t1 = await safeTask(ctx, {
      title: 'Complete policy register baseline review',
      taskType: 'policy_creation', priority: 'high', entityType: 'policy',
      dueInHours: 120, triggerSource: 'fire_point_policy',
    });
    const t2 = await safeTask(ctx, {
      title: 'Configure policy review cadence and approval workflow',
      taskType: 'verification', priority: 'medium', entityType: 'policy',
      dueInHours: 168, triggerSource: 'fire_point_policy',
    });
    artifacts.tasks = [t1, t2].filter(Boolean);

    await writeLog(ctx.schema, 'policy', 'completed', userId, artifacts, errors);
    return { module: 'policy', status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'policy', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'policy', status: 'failed', artifacts, errors };
  }
}

// ═══ F5 — EVIDENCE ═══
export async function kickstartEvidence(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];

  try {
    await writeLog(ctx.schema, 'evidence', 'in_progress', userId, {}, []);

    const activated = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `UPDATE "${ctx.schema}".evidence_schedules SET enabled = true WHERE enabled = false RETURNING schedule_id`
    ), { operation: 'update evidence_schedules' });
    artifacts.schedulesActivated = activated.rows.length;

    const schedules = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT es.schedule_id, c.title AS control_title
       FROM "${ctx.schema}".evidence_schedules es
       LEFT JOIN "${ctx.schema}".controls c ON c.control_id = es.control_id
       WHERE es.enabled = true LIMIT 10`
    ), { operation: 'query evidence_schedules' });

    const taskIds: string[] = [];
    for (const s of schedules.rows) {
      const tid = await safeTask(ctx, {
        title: `Collect evidence: ${s.control_title || s.schedule_id}`,
        taskType: 'evidence_request', priority: 'medium', entityType: 'evidence', entityId: s.schedule_id,
        dueInHours: 168, triggerSource: 'fire_point_evidence',
      });
      if (tid) taskIds.push(tid);
    }
    artifacts.evidenceTasks = taskIds;

    const wf = await safeWorkflow(ctx, 'evidence_collection');
    artifacts.workflowInstance = wf;

    const vt = await safeTask(ctx, {
      title: 'Review evidence catalog baseline',
      taskType: 'verification', priority: 'medium', entityType: 'evidence',
      dueInHours: 168, triggerSource: 'fire_point_evidence',
    });
    if (vt) taskIds.push(vt);

    await writeLog(ctx.schema, 'evidence', 'completed', userId, artifacts, errors);
    return { module: 'evidence', status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'evidence', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'evidence', status: 'failed', artifacts, errors };
  }
}

// ═══ F6 — AUDIT ═══
export async function kickstartAudit(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];

  try {
    await writeLog(ctx.schema, 'audit', 'in_progress', userId, {}, []);

    const year = new Date().getFullYear();
    const existPlan = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT plan_id FROM "${ctx.schema}".audit_plans WHERE plan_year = $1 LIMIT 1`, [year]
    ), { operation: 'query audit_plans' });

    if (existPlan.rows.length === 0) {
      await safeQuery(
        `INSERT INTO "${ctx.schema}".audit_plans (plan_year, title, status, workspace_id, created_by)
         VALUES ($1, $2, 'draft', $3, 'system')`,
        [year, `Annual Audit Plan ${year}`, ctx.workspaceId]
      ).catch((e: unknown) => errors.push(`audit_plan: ${(e instanceof Error ? e.message : String(e))}`));
      artifacts.auditPlanCreated = true;
    }

    const wf = await safeWorkflow(ctx, 'audit_cycle');
    artifacts.workflowInstance = wf;

    const existEng = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT audit_id FROM "${ctx.schema}".audits LIMIT 1`
    ), { operation: 'query audits' });
    if (existEng.rows.length === 0) {
      await safeQuery(
        `INSERT INTO "${ctx.schema}".audits (title, audit_type, status)
         VALUES ($1, 'internal', 'planned')`,
        [`Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${year} Internal Audit`]
      ).catch((e: unknown) => errors.push(`engagement: ${(e instanceof Error ? e.message : String(e))}`));
      artifacts.engagementCreated = true;
    }

    const t1 = await safeTask(ctx, {
      title: 'Review and approve annual audit plan',
      taskType: 'approval', priority: 'high', entityType: 'assessment',
      dueInHours: 120, triggerSource: 'fire_point_audit',
    });
    artifacts.tasks = [t1].filter(Boolean);

    await writeLog(ctx.schema, 'audit', 'completed', userId, artifacts, errors);
    return { module: 'audit', status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'audit', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'audit', status: 'failed', artifacts, errors };
  }
}

// ═══ F7 — REPORTS ═══
export async function kickstartReports(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];

  try {
    await writeLog(ctx.schema, 'reporting', 'in_progress', userId, {}, []);

    await safeQuery(
      `INSERT INTO "${ctx.schema}".tenant_config (config_key, config_value, created_by)
       VALUES ('reporting_enabled', '"true"', 'system')
       ON CONFLICT (config_key) DO UPDATE SET config_value = '"true"', updated_at = NOW()`,
    ).catch((e: unknown) => errors.push(`tenant_config: ${(e instanceof Error ? e.message : String(e))}`));
    artifacts.reportingEnabled = true;

    const scheduleTypes = [
      { type: 'executive_summary', label: 'Executive Summary', frequency: 'monthly', format: 'pdf' },
      { type: 'compliance_posture', label: 'Compliance Posture Report', frequency: 'monthly', format: 'pdf' },
      { type: 'risk_dashboard', label: 'Risk Dashboard Export', frequency: 'quarterly', format: 'xlsx' },
      { type: 'audit_status', label: 'Audit Status Report', frequency: 'quarterly', format: 'pdf' },
      { type: 'board_pack', label: 'Board Pack', frequency: 'quarterly', format: 'pdf' },
    ];
    for (const s of scheduleTypes) {
      await safeQuery(
        `INSERT INTO "${ctx.schema}".report_schedule_config (report_type, type_label, frequency, default_format)
         VALUES ($1, $2, $3, $4) ON CONFLICT (report_type) DO NOTHING`,
        [s.type, s.label, s.frequency, s.format]
      ).catch(() => {});
    }
    artifacts.reportScheduleConfigSeeded = scheduleTypes.length;

    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7 || 7));

    const existSched = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT schedule_id FROM "${ctx.schema}".scheduled_reports LIMIT 1`
    ), { operation: 'query scheduled_reports' });
    if (existSched.rows.length === 0) {
      await safeQuery(
        `INSERT INTO "${ctx.schema}".scheduled_reports (report_type, frequency, next_run, status, workspace_id, created_by)
         VALUES ('executive_snapshot', 'weekly', $1, 'active', $2, 'system')`,
        [nextMonday.toISOString(), ctx.workspaceId]
      ).catch((e: unknown) => errors.push(`scheduled_report: ${(e instanceof Error ? e.message : String(e))}`));
      artifacts.scheduledReportCreated = true;
    }

    const t1 = await safeTask(ctx, {
      title: 'Configure first report template',
      taskType: 'verification', priority: 'low', entityType: 'report',
      dueInHours: 336, triggerSource: 'fire_point_reporting',
    });
    artifacts.tasks = [t1].filter(Boolean);

    await writeLog(ctx.schema, 'reporting', 'completed', userId, artifacts, errors);
    return { module: 'reporting', status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'reporting', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'reporting', status: 'failed', artifacts, errors };
  }
}

// ═══ STATUS + GUARD ═══
export async function getKickstartStatus(tenantId: string): Promise<Record<string, any>> {
  const schema = tenantSchema(tenantId);
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT module_code, status, kicked_at, kicked_by, artifacts_created, errors
     FROM "${schema}".module_kickstart_log ORDER BY module_code`
  ), { operation: 'query module_kickstart_log' });

  const modules: ModuleCode[] = [
    'foundation', 'governance', 'risk', 'compliance', 'policy', 'evidence', 'audit', 'reporting',
    'incident', 'vendor', 'bcp', 'exception', 'asset', 'remediation',
    'action', 'training', 'ai-governance', 'privacy', 'qiyas', 'integrations',
  ];
  const status: Record<string, any> = {};
  for (const m of modules) {
    const row = res.rows.find((r: GenericRow) => r.module_code === m);
    status[m] = row ? { status: row.status, kickedAt: row.kicked_at, kickedBy: row.kicked_by, artifacts: row.artifacts_created, errors: row.errors } : { status: 'pending' };
  }
  return status;
}

export async function getModuleContacts(tenantId: string): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".module_contact_points ORDER BY module_code`
  ), { operation: 'query module_contact_points' });
  return res.rows;
}

export async function upsertModuleContact(tenantId: string, moduleCode: string, data: Record<string, any>): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const res = await query(
    `INSERT INTO "${schema}".module_contact_points (module_code, owner_user_id, owner_team_id, owner_role, backup_user_id, backup_team_id, escalation_role_id, escalation_team_id, notification_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (module_code) DO UPDATE SET
       owner_user_id = EXCLUDED.owner_user_id, owner_team_id = EXCLUDED.owner_team_id,
       owner_role = EXCLUDED.owner_role, backup_user_id = EXCLUDED.backup_user_id,
       backup_team_id = EXCLUDED.backup_team_id, escalation_role_id = EXCLUDED.escalation_role_id,
       escalation_team_id = EXCLUDED.escalation_team_id, notification_email = EXCLUDED.notification_email,
       updated_at = NOW()
     RETURNING *`,
    [
      moduleCode,
      data.ownerUserId ?? null, data.ownerTeamId ?? null, data.ownerRole ?? null,
      data.backupUserId ?? null, data.backupTeamId ?? null,
      data.escalationRoleId ?? null, data.escalationTeamId ?? null,
      data.notificationEmail ?? true,
    ]
  );
  return getFirstRow(res);
}

// ═══ F8 — INCIDENT ═══
export async function kickstartIncident(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];
  try {
    await writeLog(ctx.schema, 'incident', 'in_progress', userId, {}, []);
    const severities = [
      { code: 'critical', label: 'Critical', level: 4, response: 1, resolution: 4, color: '#dc2626' },
      { code: 'high', label: 'High', level: 3, response: 4, resolution: 24, color: '#ea580c' },
      { code: 'medium', label: 'Medium', level: 2, response: 8, resolution: 48, color: '#ca8a04' },
      { code: 'low', label: 'Low', level: 1, response: 24, resolution: 72, color: '#16a34a' },
    ];
    let sevSeeded = 0;
    for (const s of severities) {
      await safeQuery(
        `INSERT INTO "${ctx.schema}".incident_severity_matrix (severity_code, severity_label, severity_level, sla_response_hours, sla_resolution_hours, color)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (severity_code) DO NOTHING`,
        [s.code, s.label, s.level, s.response, s.resolution, s.color]
      ).catch(() => {});
      sevSeeded++;
    }
    artifacts.severitiesSeeded = sevSeeded;
    const categories = [
      { code: 'data_breach', label: 'Data Breach', severity: 'critical' },
      { code: 'unauthorized_access', label: 'Unauthorized Access', severity: 'high' },
      { code: 'malware', label: 'Malware/Ransomware', severity: 'high' },
      { code: 'phishing', label: 'Phishing', severity: 'medium' },
      { code: 'policy_violation', label: 'Policy Violation', severity: 'medium' },
      { code: 'service_disruption', label: 'Service Disruption', severity: 'high' },
      { code: 'physical_security', label: 'Physical Security', severity: 'medium' },
    ];
    for (const c of categories) {
      await safeQuery(
        `INSERT INTO "${ctx.schema}".incident_categories (category_code, category_label, default_severity)
         VALUES ($1, $2, $3) ON CONFLICT (category_code) DO NOTHING`,
        [c.code, c.label, c.severity]
      ).catch(() => {});
    }
    artifacts.categoriesSeeded = categories.length;
    await safeQuery(
      `INSERT INTO "${ctx.schema}".incident_response_teams (team_name, team_type, members)
       VALUES ('Primary Incident Response Team', 'primary', '[]') ON CONFLICT DO NOTHING`
    ).catch(() => {});
    artifacts.responseTeam = true;
    const wf = await safeWorkflow(ctx, 'incident_response');
    artifacts.workflow = wf;
    const t1 = await safeTask(ctx, {
      title: 'Configure incident response team members',
      taskType: 'incident_response', priority: 'high', entityType: 'incident',
      dueInHours: 72, triggerSource: 'fire_point_incident',
    });
    const t2 = await safeTask(ctx, {
      title: 'Create incident response playbook',
      taskType: 'incident_response', priority: 'high', entityType: 'incident',
      dueInHours: 168, triggerSource: 'fire_point_incident',
    });
    artifacts.tasks = [t1, t2].filter(Boolean);
    await writeLog(ctx.schema, 'incident', 'completed', userId, artifacts, errors);
    return { module: 'incident', status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'incident', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'incident', status: 'failed', artifacts, errors };
  }
}

// ═══ F9 — VENDOR ═══
export async function kickstartVendor(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];
  try {
    await writeLog(ctx.schema, 'vendor', 'in_progress', userId, {}, []);
    const tiers = [
      { code: 'critical', label: 'Critical', level: 4, reviewDays: 90, slaDays: 14 },
      { code: 'high', label: 'High', level: 3, reviewDays: 180, slaDays: 21 },
      { code: 'medium', label: 'Medium', level: 2, reviewDays: 365, slaDays: 30 },
      { code: 'low', label: 'Low', level: 1, reviewDays: 730, slaDays: 45 },
    ];
    for (const t of tiers) {
      await safeQuery(
        `INSERT INTO "${ctx.schema}".vendor_tier_config (tier_code, tier_label, tier_level, review_frequency_days, sla_assessment_days)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (tier_code) DO NOTHING`,
        [t.code, t.label, t.level, t.reviewDays, t.slaDays]
      ).catch(() => {});
    }
    artifacts.tiersSeeded = tiers.length;
    await safeQuery(
      `INSERT INTO "${ctx.schema}".vendor_due_diligence_checklists (checklist_code, checklist_name, items, tier_codes)
       VALUES ('standard_dd', 'Standard Due Diligence Checklist', $1, '{critical,high,medium}') ON CONFLICT (checklist_code) DO NOTHING`,
      [JSON.stringify([
        { item: 'Business registration verification', required: true },
        { item: 'Financial stability assessment', required: true },
        { item: 'Security certification review (ISO 27001/SOC2)', required: true },
        { item: 'Data processing agreement review', required: true },
        { item: 'Insurance coverage verification', required: false },
        { item: 'Reference checks', required: false },
      ])]
    ).catch(() => {});
    artifacts.ddChecklist = true;
    const wf = await safeWorkflow(ctx, 'vendor_assessment');
    artifacts.workflow = wf;
    const t1 = await safeTask(ctx, {
      title: 'Complete initial vendor inventory',
      taskType: 'verification', priority: 'high', entityType: 'vendor',
      dueInHours: 168, triggerSource: 'fire_point_vendor', assigneeRole: 'vendor_owner',
    });
    const t2 = await safeTask(ctx, {
      title: 'Define vendor risk tiers and assessment criteria',
      taskType: 'verification', priority: 'medium', entityType: 'vendor',
      dueInHours: 240, triggerSource: 'fire_point_vendor', assigneeRole: 'vendor_assessor',
    });
    artifacts.tasks = [t1, t2].filter(Boolean);
    await writeLog(ctx.schema, 'vendor', 'completed', userId, artifacts, errors);
    return { module: 'vendor', status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'vendor', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'vendor', status: 'failed', artifacts, errors };
  }
}

// ═══ F10 — BCP ═══
export async function kickstartBCP(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];
  try {
    await writeLog(ctx.schema, 'bcp', 'in_progress', userId, {}, []);
    const rtoRpoDefaults = [
      { category: 'core_banking', label: 'Core Banking Systems', rto: 4, rpo: 1, criticality: 'critical' },
      { category: 'customer_facing', label: 'Customer-Facing Services', rto: 8, rpo: 2, criticality: 'high' },
      { category: 'internal_operations', label: 'Internal Operations', rto: 24, rpo: 4, criticality: 'medium' },
      { category: 'support_systems', label: 'Support Systems', rto: 48, rpo: 8, criticality: 'medium' },
      { category: 'non_critical', label: 'Non-Critical Functions', rto: 72, rpo: 24, criticality: 'low' },
    ];
    for (const r of rtoRpoDefaults) {
      await safeQuery(
        `INSERT INTO "${ctx.schema}".bcp_rto_rpo_defaults (process_category, process_label, default_rto_hours, default_rpo_hours, criticality)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (process_category) DO NOTHING`,
        [r.category, r.label, r.rto, r.rpo, r.criticality]
      ).catch(() => {});
    }
    artifacts.rtoRpoSeeded = rtoRpoDefaults.length;
    await safeQuery(
      `INSERT INTO "${ctx.schema}".bcp_crisis_teams (team_name, team_type, members)
       VALUES ('Crisis Management Team', 'crisis_management', '[]') ON CONFLICT DO NOTHING`
    ).catch(() => {});
    artifacts.crisisTeam = true;
    await safeQuery(
      `INSERT INTO "${ctx.schema}".bcp_exercise_schedule (exercise_type, title, frequency_days, status)
       VALUES ('tabletop', 'Annual BCP Tabletop Exercise', 365, 'scheduled') ON CONFLICT DO NOTHING`
    ).catch(() => {});
    artifacts.exerciseSchedule = true;
    const wf = await safeWorkflow(ctx, 'bcp_testing');
    artifacts.workflow = wf;
    const t1 = await safeTask(ctx, {
      title: 'Conduct Business Impact Analysis (BIA)',
      taskType: 'verification', priority: 'high', entityType: 'bcm',
      dueInHours: 240, triggerSource: 'fire_point_bcp', assigneeRole: 'bcp_coordinator',
    });
    const t2 = await safeTask(ctx, {
      title: 'Identify critical business processes and dependencies',
      taskType: 'verification', priority: 'medium', entityType: 'bcm',
      dueInHours: 168, triggerSource: 'fire_point_bcp', assigneeRole: 'process_owner',
    });
    artifacts.tasks = [t1, t2].filter(Boolean);
    await writeLog(ctx.schema, 'bcp', 'completed', userId, artifacts, errors);
    return { module: 'bcp', status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'bcp', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'bcp', status: 'failed', artifacts, errors };
  }
}

// ═══ F11 — EXCEPTION ═══
export async function kickstartException(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];
  try {
    await writeLog(ctx.schema, 'exception', 'in_progress', userId, {}, []);
    const exceptionTypes = [
      { type: 'policy_exception', label: 'Policy Exception', maxDays: 90, cisio: false, committee: false },
      { type: 'control_exception', label: 'Control Exception', maxDays: 60, cisio: true, committee: false },
      { type: 'compliance_exception', label: 'Compliance Exception', maxDays: 30, cisio: true, committee: true },
      { type: 'risk_acceptance', label: 'Risk Acceptance', maxDays: 365, cisio: true, committee: true },
    ];
    for (const e of exceptionTypes) {
      await safeQuery(
        `INSERT INTO "${ctx.schema}".exception_approval_config (exception_type, type_label, max_duration_days, requires_ciso_approval, requires_committee_approval)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (exception_type) DO NOTHING`,
        [e.type, e.label, e.maxDays, e.cisio, e.committee]
      ).catch(() => {});
    }
    artifacts.exceptionTypesSeeded = exceptionTypes.length;
    const t1 = await safeTask(ctx, {
      title: 'Configure exception approval chain and authority thresholds',
      taskType: 'approval', priority: 'high', entityType: 'exception',
      dueInHours: 120, triggerSource: 'fire_point_exception', assigneeRole: 'exception_approver',
    });
    artifacts.tasks = [t1].filter(Boolean);
    await writeLog(ctx.schema, 'exception', 'completed', userId, artifacts, errors);
    return { module: 'exception', status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'exception', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'exception', status: 'failed', artifacts, errors };
  }
}

// ═══ F12 — ASSET ═══
export async function kickstartAsset(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];
  try {
    await writeLog(ctx.schema, 'asset', 'in_progress', userId, {}, []);
    const classifications = [
      { code: 'top_secret', label: 'Top Secret', level: 5, color: '#dc2626', handling: 'Encrypted storage, need-to-know access, no copies', access: 'Named individuals only' },
      { code: 'confidential', label: 'Confidential', level: 4, color: '#ea580c', handling: 'Encrypted, restricted sharing', access: 'Authorized personnel' },
      { code: 'internal', label: 'Internal', level: 3, color: '#ca8a04', handling: 'Internal networks only', access: 'All employees' },
      { code: 'public', label: 'Public', level: 1, color: '#16a34a', handling: 'No restrictions', access: 'Anyone' },
    ];
    for (const c of classifications) {
      await safeQuery(
        `INSERT INTO "${ctx.schema}".asset_classification_scheme (classification_code, classification_label, classification_level, color, handling_requirements, access_controls)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (classification_code) DO NOTHING`,
        [c.code, c.label, c.level, c.color, c.handling, c.access]
      ).catch(() => {});
    }
    artifacts.classificationsSeeded = classifications.length;
    const ownershipDefaults = [
      { type: 'hardware', ownerRole: 'it_manager', custodianRole: 'it_support' },
      { type: 'software', ownerRole: 'it_manager', custodianRole: 'system_admin' },
      { type: 'data', ownerRole: 'data_owner', custodianRole: 'data_custodian' },
      { type: 'network', ownerRole: 'network_admin', custodianRole: 'it_support' },
      { type: 'facility', ownerRole: 'facilities_manager', custodianRole: 'security_officer' },
    ];
    for (const o of ownershipDefaults) {
      await safeQuery(
        `INSERT INTO "${ctx.schema}".asset_ownership_matrix (asset_type, default_owner_role, default_custodian_role)
         VALUES ($1, $2, $3) ON CONFLICT (asset_type) DO NOTHING`,
        [o.type, o.ownerRole, o.custodianRole]
      ).catch(() => {});
    }
    artifacts.ownershipSeeded = ownershipDefaults.length;
    await safeQuery(
      `INSERT INTO "${ctx.schema}".tenant_config (config_key, config_value, updated_by)
       VALUES ('asset_categories', $1, 'system')
       ON CONFLICT (config_key) DO NOTHING`,
      [JSON.stringify(['Hardware','Software','Data','Network','Facility','People','Service'])]
    ).catch(catchHandler(EC.EVENT_BUS, {}));
    artifacts.categories = true;
    const t1 = await safeTask(ctx, {
      title: 'Complete initial asset inventory',
      taskType: 'verification', priority: 'high', entityType: 'asset',
      dueInHours: 240, triggerSource: 'fire_point_asset', assigneeRole: 'asset_owner',
    });
    const t2 = await safeTask(ctx, {
      title: 'Review asset classification scheme',
      taskType: 'verification', priority: 'medium', entityType: 'asset',
      dueInHours: 168, triggerSource: 'fire_point_asset', assigneeRole: 'asset_custodian',
    });
    artifacts.tasks = [t1, t2].filter(Boolean);
    await writeLog(ctx.schema, 'asset', 'completed', userId, artifacts, errors);
    return { module: 'asset', status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'asset', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'asset', status: 'failed', artifacts, errors };
  }
}

// ═══ F13 — REMEDIATION ═══
export async function kickstartRemediation(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];
  try {
    await writeLog(ctx.schema, 'remediation', 'in_progress', userId, {}, []);
    const slaConfig = [
      { severity: 'critical', label: 'Critical', sla: 24, escalation: 8 },
      { severity: 'high', label: 'High', sla: 72, escalation: 24 },
      { severity: 'medium', label: 'Medium', sla: 168, escalation: 72 },
      { severity: 'low', label: 'Low', sla: 720, escalation: 168 },
    ];
    for (const s of slaConfig) {
      await safeQuery(
        `INSERT INTO "${ctx.schema}".remediation_sla_config (severity, severity_label, sla_hours, escalation_hours)
         VALUES ($1, $2, $3, $4) ON CONFLICT (severity) DO NOTHING`,
        [s.severity, s.label, s.sla, s.escalation]
      ).catch(() => {});
    }
    artifacts.slaConfigSeeded = slaConfig.length;
    const t1 = await safeTask(ctx, {
      title: 'Review remediation pipeline and SLA configuration',
      taskType: 'remediation', priority: 'medium', entityType: 'remediation_task',
      dueInHours: 120, triggerSource: 'fire_point_remediation', assigneeRole: 'remediation_owner',
    });
    artifacts.tasks = [t1].filter(Boolean);
    await writeLog(ctx.schema, 'remediation', 'completed', userId, artifacts, errors);
    return { module: 'remediation', status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'remediation', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'remediation', status: 'failed', artifacts, errors };
  }
}

// ═══ F14 — ACTION ═══
export async function kickstartAction(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];
  try {
    await writeLog(ctx.schema, 'action', 'in_progress', userId, {}, []);
    const escalationConfig = [
      { priority: 'critical', label: 'Critical', days: 3, notify: [1], role: 'ciso' },
      { priority: 'high', label: 'High', days: 5, notify: [1, 3], role: 'admin' },
      { priority: 'medium', label: 'Medium', days: 10, notify: [1, 3, 7], role: 'admin' },
      { priority: 'low', label: 'Low', days: 14, notify: [3, 7], role: 'admin' },
    ];
    for (const e of escalationConfig) {
      await safeQuery(
        `INSERT INTO "${ctx.schema}".action_escalation_config (priority, priority_label, escalate_after_days, notify_before_days, auto_escalate_to_role)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (priority) DO NOTHING`,
        [e.priority, e.label, e.days, e.notify, e.role]
      ).catch(() => {});
    }
    artifacts.escalationConfigSeeded = escalationConfig.length;
    const t1 = await safeTask(ctx, {
      title: 'Configure action item escalation rules',
      taskType: 'verification', priority: 'medium', entityType: 'action_item',
      dueInHours: 168, triggerSource: 'fire_point_action',
    });
    artifacts.tasks = [t1].filter(Boolean);
    await writeLog(ctx.schema, 'action', 'completed', userId, artifacts, errors);
    return { module: 'action', status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'action', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'action', status: 'failed', artifacts, errors };
  }
}

// ═══ F15 — TRAINING ═══
export async function kickstartTraining(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];
  try {
    await writeLog(ctx.schema, 'training', 'in_progress', userId, {}, []);
    const starterCourses = [
      { title: 'Information Security Awareness', category: 'security', duration_minutes: 30 },
      { title: 'Data Classification & Handling', category: 'data_protection', duration_minutes: 20 },
      { title: 'Phishing Awareness', category: 'security', duration_minutes: 15 },
      { title: 'Acceptable Use Policy', category: 'compliance', duration_minutes: 15 },
      { title: 'Incident Reporting Procedures', category: 'operational', duration_minutes: 20 },
    ];
    let seeded = 0;
    for (const c of starterCourses) {
      await safeQuery(
        `INSERT INTO "${ctx.schema}".training_catalog (title, category, duration_minutes, status, created_by)
         VALUES ($1, $2, $3, 'draft', 'system') ON CONFLICT DO NOTHING`,
        [c.title, c.category, c.duration_minutes]
      ).catch(() => {});
      seeded++;
    }
    artifacts.catalogSeeded = seeded;
    const t1 = await safeTask(ctx, {
      title: 'Configure training program and launch first campaign',
      taskType: 'verification', priority: 'high', entityType: 'training',
      dueInHours: 240, triggerSource: 'fire_point_training',
    });
    artifacts.tasks = [t1].filter(Boolean);
    await writeLog(ctx.schema, 'training', 'completed', userId, artifacts, errors);
    return { module: 'training', status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'training', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'training', status: 'failed', artifacts, errors };
  }
}

// ═══ F16 — AI-GOVERNANCE ═══
export async function kickstartAiGovernance(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];
  try {
    await writeLog(ctx.schema, 'ai-governance', 'in_progress', userId, {}, []);
    try {
      const { bootstrapAiGovernance } = await import('../../ai-governance/services/ai/ai-governance-bootstrap.service');
      const result = await bootstrapAiGovernance(tenantId);
      artifacts.bootstrap = {
        modelVersions: result.modelVersions,
        promptVersions: result.promptVersions,
        agentVersions: result.agentVersions,
        toolBindings: result.toolBindings,
        allowlistEntries: result.allowlistEntries,
      };
    } catch (bErr: unknown) {
      errors.push(`AI bootstrap: ${toErrorMessage(bErr)}`);
    }
    const t1 = await safeTask(ctx, {
      title: 'Complete AI model inventory and risk assessment',
      taskType: 'verification', priority: 'high', entityType: 'ai_governance',
      dueInHours: 240, triggerSource: 'fire_point_ai_governance',
    });
    artifacts.tasks = [t1].filter(Boolean);
    await writeLog(ctx.schema, 'ai-governance', 'completed', userId, artifacts, errors);
    return { module: 'ai-governance' as ModuleCode, status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'ai-governance', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'ai-governance' as ModuleCode, status: 'failed', artifacts, errors };
  }
}

// ═══ F17 — PRIVACY ═══
export async function kickstartPrivacy(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];
  try {
    await writeLog(ctx.schema, 'privacy', 'in_progress', userId, {}, []);
    const starterRopa = [
      { activity: 'Employee data processing', purpose: 'HR management', legal_basis: 'contractual_necessity', data_categories: 'personal_identity,contact,employment' },
      { activity: 'Customer data processing', purpose: 'Service delivery', legal_basis: 'contractual_necessity', data_categories: 'personal_identity,contact,financial' },
      { activity: 'Marketing communications', purpose: 'Direct marketing', legal_basis: 'consent', data_categories: 'contact,preferences' },
    ];
    let seeded = 0;
    for (const r of starterRopa) {
      await safeQuery(
        `INSERT INTO "${ctx.schema}".ropa_entries (processing_activity, purpose, legal_basis, data_categories, status, created_by)
         VALUES ($1, $2, $3, $4, 'draft', 'system') ON CONFLICT DO NOTHING`,
        [r.activity, r.purpose, r.legal_basis, r.data_categories]
      ).catch(() => {});
      seeded++;
    }
    artifacts.ropaSeeded = seeded;
    const retentionPolicies = [
      { category: 'employee_data', days: 730, basis: 'Labor Law', disposal: 'secure_delete' },
      { category: 'customer_data', days: 365, basis: 'Contract', disposal: 'secure_delete' },
      { category: 'marketing_data', days: 180, basis: 'Consent', disposal: 'anonymize' },
      { category: 'financial_data', days: 2555, basis: 'Financial Regulation', disposal: 'secure_delete' },
      { category: 'health_data', days: 1095, basis: 'Health Regulation', disposal: 'secure_delete' },
    ];
    for (const rp of retentionPolicies) {
      await safeQuery(
        `INSERT INTO "${ctx.schema}".privacy_retention_policies (data_category, retention_days, legal_basis, disposal_method, auto_enforce, status)
         VALUES ($1, $2, $3, $4, FALSE, 'active') ON CONFLICT (data_category) DO NOTHING`,
        [rp.category, rp.days, rp.basis, rp.disposal]
      ).catch(() => {});
    }
    artifacts.retentionPoliciesSeeded = retentionPolicies.length;
    const t1 = await safeTask(ctx, {
      title: 'Complete ROPA register and configure data retention',
      taskType: 'verification', priority: 'high', entityType: 'privacy',
      dueInHours: 240, triggerSource: 'fire_point_privacy',
    });
    const t2 = await safeTask(ctx, {
      title: 'Configure DSR workflow and breach notification process',
      taskType: 'verification', priority: 'high', entityType: 'privacy',
      dueInHours: 336, triggerSource: 'fire_point_privacy',
    });
    artifacts.tasks = [t1, t2].filter(Boolean);
    await writeLog(ctx.schema, 'privacy', 'completed', userId, artifacts, errors);
    return { module: 'privacy' as ModuleCode, status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'privacy', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'privacy' as ModuleCode, status: 'failed', artifacts, errors };
  }
}

// ═══ F18 — QIYAS ═══
export async function kickstartQiyas(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];
  try {
    await writeLog(ctx.schema, 'qiyas', 'in_progress', userId, {}, []);
    const t1 = await safeTask(ctx, {
      title: 'Run initial Qiyas maturity assessment',
      taskType: 'verification', priority: 'medium', entityType: 'qiyas',
      dueInHours: 168, triggerSource: 'fire_point_qiyas',
    });
    artifacts.tasks = [t1].filter(Boolean);
    await writeLog(ctx.schema, 'qiyas', 'completed', userId, artifacts, errors);
    return { module: 'qiyas' as ModuleCode, status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'qiyas', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'qiyas' as ModuleCode, status: 'failed', artifacts, errors };
  }
}

// ═══ F19 — INTEGRATIONS ═══
export async function kickstartIntegrations(tenantId: string, userId: string): Promise<KickstartResult> {
  const ctx = await getCtx(tenantId, userId);
  const artifacts: Record<string, any> = {};
  const errors: string[] = [];
  try {
    await writeLog(ctx.schema, 'integrations', 'in_progress', userId, {}, []);
    const t1 = await safeTask(ctx, {
      title: 'Configure integration endpoints and API keys',
      taskType: 'verification', priority: 'medium', entityType: 'integration',
      dueInHours: 240, triggerSource: 'fire_point_integrations',
    });
    artifacts.tasks = [t1].filter(Boolean);
    await writeLog(ctx.schema, 'integrations', 'completed', userId, artifacts, errors);
    return { module: 'integrations' as ModuleCode, status: 'completed', artifacts, errors };
  } catch (err: unknown) {
    errors.push(toErrorMessage(err));
    await writeLog(ctx.schema, 'integrations', 'failed', userId, artifacts, errors).catch(catchHandler(EC.EVENT_BUS, {}));
    return { module: 'integrations' as ModuleCode, status: 'failed', artifacts, errors };
  }
}

const KICKSTART_FNS: Record<ModuleCode, (tenantId: string, userId: string) => Promise<KickstartResult>> = {
  foundation: kickstartFoundation,
  governance: kickstartGovernance,
  risk: kickstartRisk,
  compliance: kickstartCompliance,
  policy: kickstartPolicy,
  evidence: kickstartEvidence,
  audit: kickstartAudit,
  reporting: kickstartReports,
  incident: kickstartIncident,
  vendor: kickstartVendor,
  bcp: kickstartBCP,
  exception: kickstartException,
  asset: kickstartAsset,
  remediation: kickstartRemediation,
  action: kickstartAction,
  training: kickstartTraining,
  'ai-governance': kickstartAiGovernance,
  privacy: kickstartPrivacy,
  qiyas: kickstartQiyas,
  integrations: kickstartIntegrations,
  reports: kickstartReports,
};

export async function kickstartModule(moduleCode: ModuleCode, tenantId: string, userId: string): Promise<KickstartResult> {
  const schema = tenantSchema(tenantId);
  const current = await checkStatus(schema, moduleCode);
  if (current === 'in_progress') {
    return { module: moduleCode, status: 'failed', artifacts: {}, errors: ['Kickstart already in progress'] };
  }

  const fn = KICKSTART_FNS[moduleCode];
  if (!fn) {
    return { module: moduleCode, status: 'failed', artifacts: {}, errors: [`Unknown module: ${moduleCode}`] };
  }
  return fn(tenantId, userId);
}
