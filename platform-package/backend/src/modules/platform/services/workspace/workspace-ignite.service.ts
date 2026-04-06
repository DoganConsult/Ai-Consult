// @ts-nocheck
import { emptyResult, safeQuery, tenantSchema } from '../../../../config/database';
import {
  kickstartModule, getKickstartStatus,
  type ModuleCode, type KickstartResult,
} from '../module/module-kickstart.service';
import { getFirstRow } from '../../../../utils/db-utils';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';

const MODULE_ORDER: ModuleCode[] = [
  'foundation', 'governance', 'risk', 'compliance', 'evidence', 'audit', 'reports',
];

interface PrereqResult {
  met: boolean;
  details: string;
  fixRoute?: string;
}

interface ModuleIgniteResult {
  status: 'completed' | 'failed' | 'skipped' | 'blocked' | 'ready' | 'already_completed';
  currentStatus?: string;
  artifacts?: Record<string, any>;
  errors?: string[];
  reason?: string;
  blocker?: string;
  fixRoute?: string;
  wouldCreate?: Record<string, number>;
  prerequisites?: PrereqResult;
}

export interface IgniteResponse {
  scope: 'all' | 'failed_only';
  dryRun: boolean;
  results: Record<string, ModuleIgniteResult>;
  summary: { completed: number; failed: number; skipped: number; blocked: number; already_completed: number };
}

async function checkPrerequisites(schema: string, moduleCode: ModuleCode): Promise<PrereqResult> {
  switch (moduleCode) {
    case 'governance': {
      const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(
        `SELECT COUNT(*)::int AS cnt FROM "${schema}".organizations WHERE deleted_at IS NULL`
      ), { operation: 'query organizations' });
      const cnt = Number(getFirstRow(res)?.cnt ?? 0);
      return cnt > 0
        ? { met: true, details: `${cnt} organization(s) exist` }
        : { met: false, details: 'No organizations exist — run Foundation first', fixRoute: '/foundation/organization' };
    }
    case 'compliance': {
      const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(
        `SELECT COUNT(*)::int AS cnt FROM "${schema}".frameworks`
      ), { operation: 'query frameworks' });
      const cnt = Number(getFirstRow(res)?.cnt ?? 0);
      return cnt > 0
        ? { met: true, details: `${cnt} framework(s) provisioned` }
        : { met: false, details: 'No frameworks provisioned — add a framework first', fixRoute: '/compliance/frameworks' };
    }
    case 'evidence': {
      const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(
        `SELECT COUNT(*)::int AS cnt FROM "${schema}".evidence_schedules`
      ), { operation: 'query frameworks' });
      const cnt = Number(getFirstRow(res)?.cnt ?? 0);
      return cnt > 0
        ? { met: true, details: `${cnt} evidence schedule(s) exist` }
        : { met: false, details: 'No evidence schedules — run compliance or configure schedules', fixRoute: '/evidence/overview' };
    }
    default:
      return { met: true, details: 'No prerequisites required' };
  }
}

async function computeWouldCreate(schema: string, moduleCode: ModuleCode): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  switch (moduleCode) {
    case 'foundation': {
      const org = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".organizations WHERE deleted_at IS NULL`), { operation: 'query organizations' });
      counts.organizations = Number(getFirstRow(org)?.cnt) === 0 ? 1 : 0;
      const bu = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".business_units WHERE deleted_at IS NULL`), { operation: 'query organizations' });
      counts.businessUnits = Number(getFirstRow(bu)?.cnt) === 0 ? 1 : 0;
      const dept = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".departments WHERE deleted_at IS NULL`), { operation: 'query business_units' });
      const deptCnt = Number(getFirstRow(dept)?.cnt);
      counts.departments = deptCnt < 3 ? 3 - deptCnt : 0;
      counts.tasks = 2;
      break;
    }
    case 'governance': {
      const pol = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".policies WHERE title IN ('Information Security Policy','Acceptable Use Policy','Data Classification Policy')`), { operation: 'query departments' });
      counts.policies = 3 - Math.min(3, Number(getFirstRow(pol)?.cnt));
      counts.workflowInstances = 1;
      counts.tasks = 2;
      break;
    }
    case 'risk': {
      const r = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".risks`), { operation: 'query policies' });
      counts.risks = Number(getFirstRow(r)?.cnt) === 0 ? 5 : 0;
      counts.tasks = 4;
      counts.workflowInstances = 1;
      break;
    }
    case 'compliance': {
      const fw = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".frameworks`), { operation: 'query risks' });
      counts.gapAssessmentTasks = Math.min(5, Number(getFirstRow(fw)?.cnt));
      counts.workflowInstances = 1;
      break;
    }
    case 'evidence': {
      const sched = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".evidence_schedules WHERE enabled = false`), { operation: 'query frameworks' });
      counts.schedulesActivated = Number(getFirstRow(sched)?.cnt);
      const active = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".evidence_schedules WHERE enabled = true`), { operation: 'query evidence_schedules' });
      counts.evidenceTasks = Math.min(10, Number(getFirstRow(active)?.cnt) + counts.schedulesActivated);
      counts.workflowInstances = 1;
      break;
    }
    case 'audit': {
      const year = new Date().getFullYear();
      const plan = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".audit_plans WHERE plan_year = $1`, [year]), { operation: 'query evidence_schedules' });
      counts.auditPlans = Number(getFirstRow(plan)?.cnt) === 0 ? 1 : 0;
      const eng = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".audit_engagements`), { operation: 'query audit_plans' });
      counts.auditEngagements = Number(getFirstRow(eng)?.cnt) === 0 ? 1 : 0;
      counts.workflowInstances = 1;
      counts.tasks = 1;
      break;
    }
    case 'reports': {
      const sched = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".scheduled_reports`), { operation: 'query audit_engagements' });
      counts.scheduledReports = Number(getFirstRow(sched)?.cnt) === 0 ? 1 : 0;
      counts.tasks = 1;
      break;
    }
  }

  return counts;
}

export async function igniteWorkspace(
  tenantId: string,
  userId: string,
  dryRun: boolean,
  scope: 'all' | 'failed_only',
): Promise<IgniteResponse> {
  const schema = tenantSchema(tenantId);
  const currentStatuses = await getKickstartStatus(tenantId);

  const results: Record<string, ModuleIgniteResult> = {};
  const summary = { completed: 0, failed: 0, skipped: 0, blocked: 0, already_completed: 0 };

  for (const moduleCode of MODULE_ORDER) {
    const current = currentStatuses[moduleCode]?.status ?? 'pending';

    if (scope === 'failed_only' && current !== 'failed') {
      results[moduleCode] = { status: current === 'completed' ? 'already_completed' : 'skipped', currentStatus: current, reason: 'not_targeted' };
      if (current === 'completed') summary.already_completed++;
      else summary.skipped++;
      continue;
    }

    if (current === 'completed' && scope === 'all') {
      results[moduleCode] = { status: 'already_completed', currentStatus: 'completed' };
      summary.already_completed++;
      continue;
    }

    const prereq = await checkPrerequisites(schema, moduleCode);

    if (!prereq.met) {
      results[moduleCode] = {
        status: dryRun ? 'blocked' : 'skipped',
        currentStatus: current,
        reason: 'prerequisite_failed',
        blocker: prereq.details,
        fixRoute: prereq.fixRoute,
        prerequisites: prereq,
      };
      if (dryRun) summary.blocked++;
      else summary.skipped++;
      continue;
    }

    if (dryRun) {
      const wouldCreate = await computeWouldCreate(schema, moduleCode);
      results[moduleCode] = {
        status: 'ready',
        currentStatus: current,
        wouldCreate,
        prerequisites: prereq,
      };
      continue;
    }

    const result: KickstartResult = await kickstartModule(moduleCode, tenantId, userId);
    results[moduleCode] = {
      status: result.status,
      artifacts: result.artifacts,
      errors: result.errors,
      prerequisites: prereq,
    };
    if (result.status === 'completed') summary.completed++;
    else summary.failed++;
  }

  return { scope, dryRun, results, summary };
}
