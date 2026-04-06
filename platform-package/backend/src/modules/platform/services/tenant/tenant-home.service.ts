// @ts-nocheck
// ============================================
// Shahin — Tenant Home Service
// Single aggregated API for homepage data.
// Replaces 8 parallel API calls with 1.
// ============================================

import { emptyResult, safeQuery, tenantSchema } from "../../../../config/database";
import { computeKPIs } from '../../../analytics/services/analytics/analytics.service';
import { computeMaturityLevel } from "../maturity/maturity.service";
import { getZoneA, getZoneB, getZoneC, getZoneD } from '../../../dashboard/services/dashboard-zones.service';
import type { ZoneAData, ZoneBData, ZoneCData, ZoneDData } from '../../../dashboard/services/dashboard-zones.service';
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';

// ── Interfaces ──────────────────────────────────────────────

export interface TenantContextDto {
  tenantId: string;
  orgName: string;
  industry: string;
  orgSize: string;
  country: string;
  regions: string[];
  workspaceId: string;
  workspaceName: string;
  frameworkCount: number;
  activeFrameworks: string[];
  maturityTier: string;
  maturityAggregate: number;
  auditMode: boolean;
  lastSync: string;
  roleView: string;
}

export interface KpiTrend {
  current: number;
  previous: number;
  delta: number;
  direction: 'up' | 'down' | 'flat';
}

export interface HomeOverviewResponse {
  context: TenantContextDto;
  kpis: {
    complianceScore: number;
    riskScore: number;
    evidenceCoverage: number;
    remediationRate: number;
  };
  kpiTrends: {
    complianceScore: KpiTrend;
    riskScore: KpiTrend;
    evidenceCoverage: KpiTrend;
    remediationRate: KpiTrend;
  };
  summary: {
    totalFrameworks: number;
    totalRisks: number;
    totalPolicies: number;
    totalControls: number;
    totalUsers: number;
    totalIncidents: number;
    totalEvidence: number;
    totalVendors: number;
    risksByLevel: { critical: number; high: number; medium: number; low: number };
  };
  actionCenter: ZoneAData;
  programHealth: ZoneBData;
  lifecycle: ZoneCData;
  activity: ZoneDData;
  nextSteps: NextStepDto[];
  widgetVisibility: Record<string, boolean>;
  role: string;
}

export interface NextStepDto {
  key: string;
  priority: 'high' | 'medium' | 'low';
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  benefitEn: string;
  benefitAr: string;
  icon: string;
  route: string;
  ctaEn: string;
  ctaAr: string;
}

// ── Helpers (used before main flow) ──────────────────────────

async function getFirstWorkspaceId(schema: string): Promise<string> {
  try {
    // Prefer the workspace that actually has data (most controls), not just the oldest
    const dataResult = await safeQuery(
      `SELECT w.workspace_id, COALESCE(c.cnt, 0) AS ctrl_count
       FROM "${schema}".workspaces w
       LEFT JOIN (SELECT workspace_id, COUNT(*)::int AS cnt FROM "${schema}".controls GROUP BY workspace_id) c
         ON c.workspace_id = w.workspace_id
       ORDER BY ctrl_count DESC, w.created_at DESC NULLS LAST
       LIMIT 1`
    );
    if (getFirstRow(dataResult)?.workspace_id) return getFirstRow(dataResult)?.workspace_id;
    // Fallback: newest workspace
    const result = await safeQuery(
      `SELECT workspace_id FROM "${schema}".workspaces ORDER BY created_at DESC NULLS LAST LIMIT 1`
    );
    return getFirstRow(result)?.workspace_id ?? '';
  } catch {
    return '';
  }
}

// ── Main aggregated query ───────────────────────────────────

export async function getHomeOverview(
  tenantId: string,
  workspaceId: string,
  userId: string,
  role: string
): Promise<HomeOverviewResponse> {
  const schema = tenantSchema(tenantId);

  if (!workspaceId?.trim()) {
    const resolved = await getFirstWorkspaceId(schema);
    if (resolved) workspaceId = resolved;
  }

  const [
    tenantProfile,
    kpis,
    dashboardSummary,
    zoneA,
    zoneB,
    zoneC,
    zoneD,
    kpiTrends,
  ] = await Promise.all([
    getTenantContext(schema, tenantId, workspaceId, role),
    safeCall(() => computeKPIs(tenantId)),
    getDashboardSummary(schema),
    safeCall(() => getZoneA(tenantId, workspaceId, userId)),
    safeCall(() => getZoneB(tenantId, workspaceId)),
    safeCall(() => getZoneC(tenantId, workspaceId)),
    safeCall(() => getZoneD(tenantId, workspaceId, { limit: 20 })),
    safeCall(() => getKpiTrends(schema)),
  ]);

  const maturityCriteria = {
    complianceScore: kpis?.complianceScore ?? 0,
    riskScore: kpis?.riskScore ?? 0,
    evidenceCoverage: kpis?.evidenceCoverage ?? 0,
    processMaturity: kpis?.remediationClosureRate ?? 0,
  };
  const maturityLevel = computeMaturityLevel(maturityCriteria);
  const invertedRisk = 100 - maturityCriteria.riskScore;
  const maturityAggregate = Math.round(
    (maturityCriteria.complianceScore + invertedRisk + maturityCriteria.evidenceCoverage + maturityCriteria.processMaturity) / 4
  );

  tenantProfile.frameworkCount = dashboardSummary.totalFrameworks;
  tenantProfile.maturityTier = maturityLevel;
  tenantProfile.maturityAggregate = maturityAggregate;
  tenantProfile.lastSync = new Date().toISOString();

  const currentKpis = {
    complianceScore: Math.round(kpis?.complianceScore ?? 0),
    riskScore: Math.round(kpis?.riskScore ?? 0),
    evidenceCoverage: Math.round(kpis?.evidenceCoverage ?? 0),
    remediationRate: Math.round(kpis?.remediationClosureRate ?? 0),
  };

  const defaultTrend: KpiTrend = { current: 0, previous: 0, delta: 0, direction: 'flat' };
  const resolvedTrends = {
    complianceScore: kpiTrends?.complianceScore ?? { ...defaultTrend, current: currentKpis.complianceScore },
    riskScore: kpiTrends?.riskScore ?? { ...defaultTrend, current: currentKpis.riskScore },
    evidenceCoverage: kpiTrends?.evidenceCoverage ?? { ...defaultTrend, current: currentKpis.evidenceCoverage },
    remediationRate: kpiTrends?.remediationRate ?? { ...defaultTrend, current: currentKpis.remediationRate },
  };

  const nextSteps = await computeNextSteps(schema, dashboardSummary, zoneA, zoneB, zoneC, currentKpis);

  return {
    context: tenantProfile,
    kpis: currentKpis,
    kpiTrends: resolvedTrends,
    summary: dashboardSummary,
    actionCenter: zoneA ?? { overdueTasks: [], upcomingTasks: [], pendingApprovals: [], evidenceRequests: [], auditRequests: [], failingControls: [], unownedControls: [], staleEvidence: [] },
    programHealth: zoneB ?? { complianceCoverage: [], controlEffectiveness: { implemented: 0, tested: 0, total: 0, percentage: 0 }, riskHeatmap: [], topRisks: [], openFindings: { count: 0, avgAgeDays: 0 }, evidenceFreshness: { fresh: 0, stale: 0, percentage: 0 }, riskAppetiteBreaches: 0, treatmentCompletion: 0, taskCompletionRate: 0 },
    lifecycle: zoneC ?? { obligationsMapped: 0, controlsDesigned: 0, controlsImplemented: 0, controlsTested: 0, controlsPassing: 0, policiesApprovedPercent: 0, evidenceCurrentPercent: 0, auditReadinessPercent: 0 },
    activity: zoneD ?? { entries: [], totalCount: 0, nextCursor: null },
    nextSteps,
    widgetVisibility: getWidgetVisibility(role),
    role,
  };
}

// ── Helpers ─────────────────────────────────────────────────

async function getTenantContext(
  schema: string,
  tenantId: string,
  workspaceId: string,
  role: string
): Promise<TenantContextDto> {
  try {
    const [wpResult, tenantResult, wsResult, auditResult] = await Promise.all([
      safeQuery(`SELECT industry, org_size FROM "${schema}".workspace_profile LIMIT 1`),
      safeQuery(`SELECT org_name, industry, org_size, regions, active_frameworks FROM public.tenants WHERE tenant_id = $1 LIMIT 1`, [tenantId]),
      safeQuery(`SELECT workspace_id, name FROM "${schema}".workspaces WHERE workspace_id = $1 LIMIT 1`, [workspaceId]),
      safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".assessments WHERE status = 'in_progress'`),
    ]);
    const wp = getFirstRow(wpResult);
    const t = getFirstRow(tenantResult);
    const ws = getFirstRow(wsResult);
    const regions = t?.regions || [];
    const country = regions.length > 0 ? regions[0] : '—';

    return {
      tenantId,
      orgName: t?.org_name || '—',
      industry: wp?.industry || t?.industry || '—',
      orgSize: wp?.org_size || t?.org_size || '—',
      country,
      regions,
      workspaceId: ws?.workspace_id || workspaceId,
      workspaceName: ws?.name || '—',
      frameworkCount: 0,
      activeFrameworks: t?.active_frameworks || [],
      maturityTier: '—',
      maturityAggregate: 0,
      auditMode: Number(getFirstRow(auditResult)?.c ?? 0) > 0,
      lastSync: '—',
      roleView: role,
    };
  } catch {
    return {
      tenantId, orgName: '—', industry: '—', orgSize: '—', country: '—', regions: [],
      workspaceId, workspaceName: '—', frameworkCount: 0, activeFrameworks: [],
      maturityTier: '—', maturityAggregate: 0, auditMode: false, lastSync: '—', roleView: role,
    };
  }
}

async function getKpiTrends(schema: string): Promise<Record<string, KpiTrend>> {
  try {
    const result = await safeQuery(
      `SELECT snapshot_date, compliance_score, risk_score, evidence_coverage, remediation_closure_rate
       FROM "${schema}".kpi_snapshots
       ORDER BY snapshot_date DESC
       LIMIT 2`
    );
    const rows = result.rows;
    const curr = rows[0];
    const prev = rows[1];
    if (!curr) {
      const z: KpiTrend = { current: 0, previous: 0, delta: 0, direction: 'flat' };
      return { complianceScore: z, riskScore: z, evidenceCoverage: z, remediationRate: z };
    }
    const makeTrend = (cVal: number, pVal: number): KpiTrend => {
      const delta = Math.round((cVal - pVal) * 100) / 100;
      return { current: Math.round(cVal * 100) / 100, previous: Math.round(pVal * 100) / 100, delta, direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat' };
    };
    return {
      complianceScore: makeTrend(Number(curr.compliance_score || 0), Number(prev?.compliance_score || 0)),
      riskScore: makeTrend(Number(curr.risk_score || 0), Number(prev?.risk_score || 0)),
      evidenceCoverage: makeTrend(Number(curr.evidence_coverage || 0), Number(prev?.evidence_coverage || 0)),
      remediationRate: makeTrend(Number(curr.remediation_closure_rate || 0), Number(prev?.remediation_closure_rate || 0)),
    };
  } catch {
    const z: KpiTrend = { current: 0, previous: 0, delta: 0, direction: 'flat' };
    return { complianceScore: z, riskScore: z, evidenceCoverage: z, remediationRate: z };
  }
}

async function getDashboardSummary(schema: string): Promise<HomeOverviewResponse['summary']> {
  const empty: HomeOverviewResponse['summary'] = { totalFrameworks: 0, totalRisks: 0, totalPolicies: 0, totalControls: 0, totalUsers: 0, totalIncidents: 0, totalEvidence: 0, totalVendors: 0, risksByLevel: { critical: 0, high: 0, medium: 0, low: 0 } };
  try {
    const tenantId = schema.replace('tenant_', '');
    const [fwRes, riskRes, polRes, ctrlRes, usrRes, incRes, evRes, vndRes] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".frameworks`),
      safeQuery(`SELECT risk_score FROM "${schema}".risks`),
      safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".policies`),
      safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".controls`),
      safeQuery(`SELECT COUNT(*)::int AS c FROM public.users WHERE tenant_id = $1 AND status != 'deleted'`, [tenantId]),
      safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".incidents`),
      safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".evidence`),
      safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".vendors`),
    ]);

    const risks = riskRes.rows;
    return {
      totalFrameworks: Number(getFirstRow(fwRes)?.c ?? 0),
      totalRisks: risks.length,
      totalPolicies: Number(getFirstRow(polRes)?.c ?? 0),
      totalControls: Number(getFirstRow(ctrlRes)?.c ?? 0),
      totalUsers: Number(getFirstRow(usrRes)?.c ?? 0),
      totalIncidents: Number(getFirstRow(incRes)?.c ?? 0),
      totalEvidence: Number(getFirstRow(evRes)?.c ?? 0),
      totalVendors: Number(getFirstRow(vndRes)?.c ?? 0),
      risksByLevel: {
        critical: risks.filter((r: GenericRow) => Number(r.risk_score) >= 20).length,
        high: risks.filter((r: GenericRow) => Number(r.risk_score) >= 12 && Number(r.risk_score) < 20).length,
        medium: risks.filter((r: GenericRow) => Number(r.risk_score) >= 6 && Number(r.risk_score) < 12).length,
        low: risks.filter((r: GenericRow) => Number(r.risk_score) < 6).length,
      },
    };
  } catch {
    return empty;
  }
}

async function computeNextSteps(
  schema: string,
  summary: HomeOverviewResponse['summary'],
  zoneA: ZoneAData | null,
  zoneB: ZoneBData | null,
  zoneC: ZoneCData | null,
  kpis: HomeOverviewResponse['kpis']
): Promise<NextStepDto[]> {
  const steps: NextStepDto[] = [];
  const isNewWorkspace =
    summary.totalFrameworks === 0 &&
    summary.totalControls === 0 &&
    summary.totalRisks === 0 &&
    summary.totalPolicies === 0;

  // Onboarding-first: 90-day plan and invite team for new tenants
  if (isNewWorkspace) {
    steps.push({
      key: 'ninety-day-plan',
      priority: 'high',
      icon: 'calendar',
      route: '/ninety-day-plan',
      titleEn: 'View Your 90-Day Plan',
      titleAr: 'عرض خطة الـ 90 يوم',
      descEn: 'Your workspace is ready. Follow the 90-day roadmap to set up frameworks, controls, and evidence.',
      descAr: 'مساحة العمل جاهزة. اتبع خريطة الـ 90 يوم لإعداد الأطر والضوابط والأدلة.',
      benefitEn: 'Structured first steps so you stay on track.',
      benefitAr: 'خطوات أولى منظمة للبقاء على المسار.',
      ctaEn: 'Open 90-Day Plan',
      ctaAr: 'فتح خطة الـ 90 يوم',
    });
    steps.push({
      key: 'invite-team',
      priority: 'high',
      icon: 'user-plus',
      route: '/team-hub',
      titleEn: 'Invite Team Members',
      titleAr: 'دعوة أعضاء الفريق',
      descEn: 'Add Compliance Manager, Control Owners, and Auditors so they can complete assigned tasks.',
      descAr: 'أضف مدير الامتثال ومالكي الضوابط والمدققين لتنفيذ المهام المعينة.',
      benefitEn: 'Enables role-based dashboards and action center items.',
      benefitAr: 'يمكّن من لوحات الأدوار وعناصر مركز الإجراءات.',
      ctaEn: 'Open Team Hub',
      ctaAr: 'فتح مركز الفريق',
    });
  }

  const [teamCountRes, raciCountRes, memberCountRes, emailCfgRes, pendingInvRes, overdueEvidenceRes] = await Promise.all([
    safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".teams WHERE active = true`),
    safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".team_raci_assignments`),
    safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".team_members WHERE active = true`),
    safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".tenant_email_config WHERE enabled = true`),
    safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".invitations WHERE status = 'pending'`),
    safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".evidence WHERE status IN ('pending','requested') AND due_date < NOW()`),
  ]);
  const teamCount = getFirstRow(teamCountRes)?.c ?? 0;
  const raciCount = getFirstRow(raciCountRes)?.c ?? 0;
  const memberCount = getFirstRow(memberCountRes)?.c ?? 0;
  const hasEmailConfig = (getFirstRow(emailCfgRes)?.c ?? 0) > 0;
  const pendingInvitations = getFirstRow(pendingInvRes)?.c ?? 0;
  const overdueEvidence = getFirstRow(overdueEvidenceRes)?.c ?? 0;

  if (!hasEmailConfig) {
    steps.push({
      key: 'configure-email', priority: 'high', icon: 'envelope', route: '/tenant-config?tab=email',
      titleEn: 'Configure Email Service', titleAr: 'تكوين خدمة البريد الإلكتروني',
      descEn: 'No email service configured. Set up email to enable invitation delivery, notifications, and alerts.',
      descAr: 'لم يتم تكوين خدمة البريد. أعد الإعداد لتمكين إرسال الدعوات والإشعارات والتنبيهات.',
      benefitEn: 'Enables email-based invitations, notifications, and audit alerts.',
      benefitAr: 'يمكّن من الدعوات بالبريد والإشعارات وتنبيهات التدقيق.',
      ctaEn: 'Configure Email', ctaAr: 'تكوين البريد',
    });
  }

  if (teamCount > 0 && raciCount === 0) {
    steps.push({
      key: 'setup-raci', priority: 'high', icon: 'sitemap', route: '/team-hub?tab=teams',
      titleEn: 'Set Up RACI Matrix', titleAr: 'إعداد مصفوفة RACI',
      descEn: `${teamCount} teams exist but no RACI assignments. Assign Responsible, Accountable, Consulted, and Informed roles.`, descAr: `${teamCount} فريق موجود بدون تعيينات RACI. عيّن الأدوار: مسؤول، مساءل، مستشار، مُبلّغ.`,
      benefitEn: 'Enables automated task routing and clear accountability.', benefitAr: 'يمكّن من التوجيه التلقائي للمهام والمساءلة الواضحة.',
      ctaEn: 'Configure RACI', ctaAr: 'تكوين RACI',
    });
  }

  if (teamCount > 0 && memberCount <= teamCount) {
    steps.push({
      key: 'invite-members', priority: 'high', icon: 'user-plus', route: '/team-hub?tab=teams',
      titleEn: 'Invite Team Members', titleAr: 'دعوة أعضاء الفريق',
      descEn: 'Most teams have only 1 member. Invite colleagues to distribute workload across teams.', descAr: 'معظم الفرق لديها عضو واحد فقط. ادعُ الزملاء لتوزيع العمل.',
      benefitEn: 'Enables workload balancing and prevents single-point-of-failure.', benefitAr: 'يمكّن من توازن العمل ومنع نقاط الفشل الواحدة.',
      ctaEn: 'Invite Members', ctaAr: 'دعوة أعضاء',
    });
  }

  if (pendingInvitations > 0) {
    steps.push({
      key: 'pending-invitations', priority: 'medium', icon: 'envelope', route: '/team-hub?tab=invitations',
      titleEn: `${pendingInvitations} Pending Invitation${pendingInvitations > 1 ? 's' : ''}`, titleAr: `${pendingInvitations} دعوة معلقة`,
      descEn: `${pendingInvitations} invitation${pendingInvitations > 1 ? 's have' : ' has'} not been accepted yet. Follow up or resend to onboard team members.`,
      descAr: `${pendingInvitations} دعوة لم يتم قبولها بعد. تابع أو أعد الإرسال لضم أعضاء الفريق.`,
      benefitEn: 'Completes team onboarding and enables task assignment.', benefitAr: 'يكمل ضم الفريق ويمكّن من تعيين المهام.',
      ctaEn: 'View Invitations', ctaAr: 'عرض الدعوات',
    });
  }

  if (overdueEvidence > 0) {
    steps.push({
      key: 'overdue-evidence', priority: 'high', icon: 'folder-open', route: '/evidence-hub',
      titleEn: `${overdueEvidence} Overdue Evidence Item${overdueEvidence > 1 ? 's' : ''}`, titleAr: `${overdueEvidence} دليل متأخر`,
      descEn: `${overdueEvidence} evidence item${overdueEvidence > 1 ? 's are' : ' is'} past due. Collect or upload to maintain compliance posture.`,
      descAr: `${overdueEvidence} دليل متأخر عن الموعد. اجمع أو ارفع للحفاظ على وضع الالتزام.`,
      benefitEn: 'Prevents audit gaps and maintains evidence freshness.', benefitAr: 'يمنع فجوات التدقيق ويحافظ على حداثة الأدلة.',
      ctaEn: 'Collect Evidence', ctaAr: 'جمع الأدلة',
    });
  }

  if (summary.totalFrameworks === 0) {
    steps.push({
      key: 'add-framework',
      priority: 'high',
      icon: 'book',
      route: '/framework-hub',
      titleEn: 'Select Compliance Frameworks',
      titleAr: 'اختيار أطر الالتزام',
      descEn: 'No frameworks are configured. Select frameworks to begin compliance mapping.',
      descAr: 'لم يتم تهيئة أي إطار. اختر الأطر لبدء ربط الالتزام.',
      benefitEn: 'Enables control mapping, gap analysis, and compliance scoring.',
      benefitAr: 'يمكّن من ربط الضوابط وتحليل الفجوات وتقييم الالتزام.',
      ctaEn: 'Add Frameworks',
      ctaAr: 'إضافة أطر',
    });
  }

  if (summary.totalControls === 0) {
    steps.push({
      key: 'add-controls',
      priority: 'high',
      icon: 'shield',
      route: '/compliance-hub',
      titleEn: 'Design Controls',
      titleAr: 'تصميم الضوابط',
      descEn: 'No controls exist. Design controls to start testing and remediation.',
      descAr: 'لا توجد ضوابط. صمم الضوابط لبدء الاختبار والمعالجة.',
      benefitEn: 'Enables testing, evidence collection, and audit readiness.',
      benefitAr: 'يمكّن من الاختبار وجمع الأدلة وجاهزية التدقيق.',
      ctaEn: 'Add Controls',
      ctaAr: 'إضافة ضوابط',
    });
  }

  const unownedCount = zoneA?.unownedControls?.length ?? 0;
  if (
    unownedCount > 0 ||
    (summary.totalControls > 0 && (zoneB?.controlEffectiveness?.implemented ?? 0) === 0)
  ) {
    steps.push({
      key: 'assign-owners',
      priority: 'high',
      icon: 'users',
      route: '/controls?filter=unassigned',
      titleEn: 'Assign Control Owners',
      titleAr: 'تعيين مالكي الضوابط',
      descEn: `${unownedCount || 'Multiple'} controls are unassigned. Assigning owners enables testing and remediation.`,
      descAr: `${unownedCount || 'عدة'} ضوابط غير مُعيّنة. التعيين يمكّن من الاختبار والمعالجة.`,
      benefitEn: 'Enables accountability and workflow automation.',
      benefitAr: 'يمكّن من المساءلة وأتمتة سير العمل.',
      ctaEn: 'Open Controls',
      ctaAr: 'فتح الضوابط',
    });
  }

  if (kpis.evidenceCoverage < 50 && summary.totalControls > 0) {
    steps.push({
      key: 'connect-evidence',
      priority: 'medium',
      icon: 'folder-open',
      route: '/evidence-hub',
      titleEn: 'Improve Evidence Coverage',
      titleAr: 'تحسين تغطية الأدلة',
      descEn: `Evidence coverage is ${kpis.evidenceCoverage}%. Connect evidence sources or upload evidence.`,
      descAr: `تغطية الأدلة ${kpis.evidenceCoverage}%. اربط مصادر الأدلة أو ارفع أدلة.`,
      benefitEn: 'Improves audit readiness and compliance scoring.',
      benefitAr: 'يحسن جاهزية التدقيق وتقييم الالتزام.',
      ctaEn: 'Manage Evidence',
      ctaAr: 'إدارة الأدلة',
    });
  }

  const polApproval = zoneC?.policiesApprovedPercent ?? 0;
  if (polApproval < 50 && summary.totalPolicies > 0) {
    steps.push({
      key: 'approve-policies',
      priority: 'medium',
      icon: 'file',
      route: '/governance-hub?tab=policies',
      titleEn: 'Approve Pending Policies',
      titleAr: 'اعتماد السياسات المعلقة',
      descEn: `Only ${polApproval}% of policies are approved. Review and approve baseline policies.`,
      descAr: `${polApproval}% فقط من السياسات معتمدة. راجع واعتمد السياسات الأساسية.`,
      benefitEn: 'Enables compliance coverage and governance workflows.',
      benefitAr: 'يمكّن من تغطية الالتزام وسير عمل الحوكمة.',
      ctaEn: 'Review Policies',
      ctaAr: 'مراجعة السياسات',
    });
  }

  const overdueCount = zoneA?.overdueTasks?.length ?? 0;
  if (overdueCount > 0) {
    steps.push({
      key: 'overdue-tasks',
      priority: 'high',
      icon: 'clock',
      route: '/task-board',
      titleEn: `Resolve ${overdueCount} Overdue Tasks`,
      titleAr: `حل ${overdueCount} مهام متأخرة`,
      descEn: `${overdueCount} remediation tasks are past due. Address them to stay on track.`,
      descAr: `${overdueCount} مهام معالجة متأخرة. عالجها للبقاء على المسار.`,
      benefitEn: 'Reduces risk exposure and improves compliance posture.',
      benefitAr: 'يقلل التعرض للمخاطر ويحسن وضع الالتزام.',
      ctaEn: 'View Tasks',
      ctaAr: 'عرض المهام',
    });
  }

  if (summary.totalRisks === 0) {
    steps.push({
      key: 'add-risks',
      priority: 'medium',
      icon: 'exclamation-triangle',
      route: '/risk-hub',
      titleEn: 'Register Risks',
      titleAr: 'تسجيل المخاطر',
      descEn: 'No risks registered. Generate baseline risks or start a risk assessment.',
      descAr: 'لا توجد مخاطر مسجلة. أنشئ مخاطر أساسية أو ابدأ تقييم مخاطر.',
      benefitEn: 'Enables risk heatmap, treatment tracking, and appetite monitoring.',
      benefitAr: 'يمكّن من خريطة المخاطر وتتبع المعالجة ومراقبة القبول.',
      ctaEn: 'Add Risks',
      ctaAr: 'إضافة مخاطر',
    });
  }

  const [noProfileRes, noShadowRes, reviewDueRes] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ c: 0 }]), safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".team_members tm WHERE tm.active = true AND NOT EXISTS (SELECT 1 FROM "${schema}".member_profiles mp WHERE mp.user_id = tm.user_id AND mp.active = true)`), { operation: 'query team_members' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ c: 0 }]), safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".team_members tm WHERE tm.active = true AND NOT EXISTS (SELECT 1 FROM "${schema}".member_agent_shadows mas WHERE mas.user_id = tm.user_id)`), { operation: 'query team_members' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ c: 0 }]), safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".team_members WHERE active = true AND lifecycle_status = 'under_review'`), { operation: 'query member_profiles' }),
  ]);
  const membersNoProfile = getFirstRow(noProfileRes)?.c ?? 0;
  const membersNoShadow = getFirstRow(noShadowRes)?.c ?? 0;
  const membersUnderReview = getFirstRow(reviewDueRes)?.c ?? 0;

  if (membersNoProfile > 0 && memberCount > 0) {
    steps.push({
      key: 'assign-profiles', priority: 'medium', icon: 'id-card', route: '/team-hub?tab=lifecycle',
      titleEn: `${membersNoProfile} Members Without Profiles`, titleAr: `${membersNoProfile} أعضاء بدون ملفات`,
      descEn: `${membersNoProfile} team member${membersNoProfile > 1 ? 's have' : ' has'} no role profile. Assign profiles to enable profile switching and RACI tracking.`,
      descAr: `${membersNoProfile} عضو بدون ملف دور. عيّن ملفات لتمكين تبديل الملفات وتتبع RACI.`,
      benefitEn: 'Enables multi-role management and lifecycle tracking.', benefitAr: 'يمكّن من إدارة الأدوار المتعددة وتتبع دورة الحياة.',
      ctaEn: 'Assign Profiles', ctaAr: 'تعيين ملفات',
    });
  }

  if (membersNoShadow > 0 && memberCount > 1) {
    steps.push({
      key: 'configure-shadows', priority: 'medium', icon: 'android', route: '/team-hub?tab=lifecycle',
      titleEn: `Configure Agent Shadows`, titleAr: `تكوين وكلاء الظل`,
      descEn: `${membersNoShadow} member${membersNoShadow > 1 ? 's have' : ' has'} no AI agent shadow. Configure shadows to enable hybrid human+agent workflows.`,
      descAr: `${membersNoShadow} عضو بدون وكيل ظل. كوّن وكلاء الظل لتمكين سير العمل الهجين.`,
      benefitEn: 'Enables AI-assisted task routing and autonomous agent actions.', benefitAr: 'يمكّن من التوجيه المدعوم بالذكاء الاصطناعي وإجراءات الوكيل المستقلة.',
      ctaEn: 'Configure Shadows', ctaAr: 'تكوين الوكلاء',
    });
  }

  if (membersUnderReview > 0) {
    steps.push({
      key: 'review-members', priority: 'high', icon: 'user-edit', route: '/team-hub?tab=lifecycle',
      titleEn: `${membersUnderReview} Members Under Review`, titleAr: `${membersUnderReview} أعضاء قيد المراجعة`,
      descEn: `${membersUnderReview} team member${membersUnderReview > 1 ? 's are' : ' is'} flagged for review. Complete reviews to maintain team efficiency.`,
      descAr: `${membersUnderReview} عضو مُعلّم للمراجعة. أكمل المراجعات للحفاظ على كفاءة الفريق.`,
      benefitEn: 'Maintains team health and performance standards.', benefitAr: 'يحافظ على صحة الفريق ومعايير الأداء.',
      ctaEn: 'Review Members', ctaAr: 'مراجعة الأعضاء',
    });
  }

  const auditReady = zoneC?.auditReadinessPercent ?? 0;
  if (auditReady < 50 && summary.totalControls > 5) {
    steps.push({
      key: 'audit-readiness',
      priority: 'medium',
      icon: 'check-square',
      route: '/audit-hub',
      titleEn: 'Improve Audit Readiness',
      titleAr: 'تحسين جاهزية التدقيق',
      descEn: `Audit readiness is ${auditReady}%. Run control tests and prepare audit packages.`,
      descAr: `جاهزية التدقيق ${auditReady}%. نفذ اختبارات الضوابط وأعد حزم التدقيق.`,
      benefitEn: 'Prepares the organization for audits and certifications.',
      benefitAr: 'يجهز المنظمة للتدقيق والشهادات.',
      ctaEn: 'Open Audit',
      ctaAr: 'فتح التدقيق',
    });
  }

  return steps.slice(0, 10);
}

function getWidgetVisibility(role: string): Record<string, boolean> {
  const all = { executiveSnapshot: true, actionCenter: true, programHealth: true, analytics: true, activity: true, nextSteps: true };
  if (role === 'viewer') return { ...all, nextSteps: false };
  return all;
}

async function safeCall<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}
