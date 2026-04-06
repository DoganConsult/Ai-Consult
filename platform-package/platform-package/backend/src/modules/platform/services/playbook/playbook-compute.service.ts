// @ts-nocheck
/**
 * Playbook Compute Service — Pure computation functions for the Role-Based Playbook.
 *
 * Contains: computeModuleMap, computeActionMatrix, computeWorkflowParticipation,
 * computeWidgetGuide, computeReportGuide, computeNotificationGuide, computeTaskGuides,
 * and GUIDE_LIBRARY.
 *
 * All functions are stateless and derive playbook sections from static data in playbook-data.ts.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.3, 4.1, 4.2, 5.1, 5.3, 6.1, 6.3, 7.1, 8.1, 8.2, 8.4
 */

type UserRole = string;
import {
  ModuleEntry, ActionMatrixEntry, WorkflowEntry,
  WidgetEntry, ReportEntry, NotificationEntry,
  TaskGuide, TaskGuideStep,
} from '../../../agrc-engine/services/engine/playbook.types';
import { PREDEFINED_TEMPLATES } from '../../../workflow/services/templates/workflow-templates.service';
import { PREDEFINED_PROFILES } from '../../../../platform/dauth/identity/role-profile.service';
import {
  ROLE_PERMISSIONS, ALL_NAV_ITEMS, MODULE_I18N, RESOURCE_I18N,
  ROLE_TO_SWIMLANES, hasPermission,
} from './playbook-data';

// ─── computeModuleMap ───

/**
 * Compute the Module_Map for a given RBAC role.
 * Filters ALL_NAV_ITEMS by the role's permissions and maps each to a ModuleEntry
 * with bilingual names and descriptions.
 *
 * Requirements: 1.1, 2.1, 2.2
 */
export function computeModuleMap(role: UserRole): ModuleEntry[] {
  return ALL_NAV_ITEMS
    .filter(item => hasPermission(role, item.requiredPermission))
    .map(item => {
      const i18n = MODULE_I18N[item.labelKey];
      return {
        route: item.route,
        icon: item.icon,
        name_en: i18n?.name_en ?? item.labelKey,
        name_ar: i18n?.name_ar ?? item.labelKey,
        description_en: i18n?.description_en ?? '',
        description_ar: i18n?.description_ar ?? '',
        lifecyclePhase: item.lifecyclePhase,
        section: item.section,
      };
    });
}

// ─── computeActionMatrix ───

const __ACTION_TYPES = ['read', 'write', 'delete', 'manage'] as const;

/**
 * Compute the Action_Matrix for a given RBAC role.
 * Parses ROLE_PERMISSIONS keys to extract unique resources, then checks which
 * of the four standard actions (read, write, delete, manage) the role has for
 * each resource. Resources with zero permitted actions are excluded.
 *
 * Requirements: 1.2, 3.1, 3.3
 */
export function computeActionMatrix(role: UserRole): ActionMatrixEntry[] {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return [];

  const isWildcard = perms.includes('*');

  // Collect all unique resources from every role's permission strings
  const resourceSet = new Set<string>();
  for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
    for (const perm of ROLE_PERMISSIONS[roleName]) {
      if (perm === '*') continue;
      const colonIdx = perm.indexOf(':');
      if (colonIdx > 0) resourceSet.add(perm.substring(0, colonIdx));
    }
  }

  const result: ActionMatrixEntry[] = [];

  for (const resource of Array.from(resourceSet).sort()) {
    const permissions = {
      read:   isWildcard || perms.includes(`${resource}:read`),
      write:  isWildcard || perms.includes(`${resource}:write`),
      delete: isWildcard || perms.includes(`${resource}:delete`),
      manage: isWildcard || perms.includes(`${resource}:manage`),
    };

    // Exclude resources with zero permissions (Requirement 3.3)
    if (!permissions.read && !permissions.write && !permissions.delete && !permissions.manage) {
      continue;
    }

    const i18n = RESOURCE_I18N[resource];
    result.push({
      resource,
      resource_en: i18n?.resource_en ?? resource,
      resource_ar: i18n?.resource_ar ?? resource,
      permissions,
    });
  }

  return result;
}

// ─── Workflow Participation ───

/** Participation type priority: approver > initiator > reviewer > observer */
const PARTICIPATION_PRIORITY: Record<WorkflowEntry['participationType'], number> = {
  approver: 4,
  initiator: 3,
  reviewer: 2,
  observer: 1,
};

/**
 * Bilingual descriptions for workflow templates, keyed by templateKey.
 */
const WORKFLOW_I18N: Record<string, { name_ar: string; description_en: string }> = {
  policy_lifecycle:       { name_ar: 'دورة حياة السياسة',           description_en: 'End-to-end policy creation, review, approval, and publication' },
  risk_treatment:         { name_ar: 'معالجة المخاطر',              description_en: 'Risk assessment, treatment planning, and monitoring' },
  incident_response:      { name_ar: 'الاستجابة للحوادث',           description_en: 'Incident triage, investigation, containment, and resolution' },
  audit_cycle:            { name_ar: 'دورة التدقيق',                description_en: 'Audit planning, execution, reporting, and follow-up' },
  vendor_assessment:      { name_ar: 'تقييم المورد',                description_en: 'Vendor due diligence, risk assessment, and approval' },
  evidence_collection:    { name_ar: 'جمع الأدلة',                  description_en: 'Evidence request, submission, review, and acceptance' },
  compliance_remediation: { name_ar: 'معالجة الامتثال',             description_en: 'Gap identification, remediation planning, and verification' },
  bcp_testing:            { name_ar: 'اختبار استمرارية الأعمال',    description_en: 'Business continuity plan testing and validation' },
};

/** Maps templateKey to a lifecycle phase for display purposes. */
const WORKFLOW_LIFECYCLE_PHASE: Record<string, string> = {
  policy_lifecycle:       'design',
  risk_treatment:         'assess',
  incident_response:      'operate',
  audit_cycle:            'assure',
  vendor_assessment:      'assess',
  evidence_collection:    'implement',
  compliance_remediation: 'implement',
  bcp_testing:            'operate',
};

/**
 * Compute workflow participation for a given RBAC role.
 * Filters PREDEFINED_TEMPLATES by swimlane relevance and determines
 * the highest-priority participation type for each matching template.
 *
 * Requirements: 4.1, 4.2
 */
export function computeWorkflowParticipation(role: UserRole, _profileId?: string): WorkflowEntry[] {
  const mappings = ROLE_TO_SWIMLANES[role];
  if (!mappings || mappings.length === 0) return [];

  // Collect all swimlanes this role maps to, with their participation types
  const swimlaneToParticipation = new Map<string, WorkflowEntry['participationType']>();
  for (const mapping of mappings) {
    for (const sl of mapping.swimlanes) {
      const existing = swimlaneToParticipation.get(sl);
      if (!existing || PARTICIPATION_PRIORITY[mapping.participationType] > PARTICIPATION_PRIORITY[existing]) {
        swimlaneToParticipation.set(sl, mapping.participationType);
      }
    }
  }

  const results: WorkflowEntry[] = [];

  for (const template of PREDEFINED_TEMPLATES) {
    const templateSwimlanes = template.definition.swimlanes;

    // Find the highest-priority participation type across all matching swimlanes
    let bestType: WorkflowEntry['participationType'] | null = null;
    let bestPriority = 0;

    for (const sl of templateSwimlanes) {
      const pType = swimlaneToParticipation.get(sl);
      if (pType && PARTICIPATION_PRIORITY[pType] > bestPriority) {
        bestType = pType;
        bestPriority = PARTICIPATION_PRIORITY[pType];
      }
    }

    if (bestType) {
      const i18n = WORKFLOW_I18N[template.templateKey];
      results.push({
        templateKey: template.templateKey,
        name_en: template.name_en,
        name_ar: i18n?.name_ar ?? template.name_ar,
        description_en: i18n?.description_en ?? template.description_en,
        participationType: bestType,
        lifecyclePhase: WORKFLOW_LIFECYCLE_PHASE[template.templateKey] ?? 'operate',
      });
    }
  }

  return results;
}

// ─── Widget / Report / Notification bilingual descriptions ───

const WIDGET_I18N: Record<string, { name_en: string; name_ar: string; description_en: string; description_ar: string }> = {
  risk_heatmap:          { name_en: 'Risk Heatmap',              name_ar: 'خريطة المخاطر الحرارية',     description_en: 'Visual heatmap of organizational risks by likelihood and impact',                     description_ar: 'خريطة حرارية مرئية للمخاطر المؤسسية حسب الاحتمالية والأثر' },
  compliance_overview:   { name_en: 'Compliance Overview',       name_ar: 'نظرة عامة على الامتثال',     description_en: 'Summary of compliance status across all active frameworks',                            description_ar: 'ملخص حالة الامتثال عبر جميع الأطر النشطة' },
  incident_trend:        { name_en: 'Incident Trend',            name_ar: 'اتجاه الحوادث',              description_en: 'Trend chart of security incidents over time',                                         description_ar: 'مخطط اتجاه الحوادث الأمنية عبر الزمن' },
  control_effectiveness: { name_en: 'Control Effectiveness',     name_ar: 'فعالية الضوابط',             description_en: 'Gauge of control effectiveness across the organization',                               description_ar: 'مقياس فعالية الضوابط عبر المؤسسة' },
  executive_summary:     { name_en: 'Executive Summary',         name_ar: 'الملخص التنفيذي',            description_en: 'High-level executive summary of GRC posture and key metrics',                          description_ar: 'ملخص تنفيذي عالي المستوى لوضع الحوكمة والمخاطر والامتثال والمقاييس الرئيسية' },
  privacy_dashboard:     { name_en: 'Privacy Dashboard',         name_ar: 'لوحة الخصوصية',              description_en: 'Overview of privacy operations including RoPA and DSR status',                         description_ar: 'نظرة عامة على عمليات الخصوصية بما في ذلك سجل المعالجة وحالة طلبات أصحاب البيانات' },
  consent_tracker:       { name_en: 'Consent Tracker',           name_ar: 'متتبع الموافقة',             description_en: 'Track consent collection and withdrawal across data subjects',                         description_ar: 'تتبع جمع الموافقة وسحبها عبر أصحاب البيانات' },
  ropa_status:           { name_en: 'RoPA Status',               name_ar: 'حالة سجل المعالجة',          description_en: 'Status of Records of Processing Activities',                                          description_ar: 'حالة سجلات أنشطة المعالجة' },
  evidence_freshness:    { name_en: 'Evidence Freshness',        name_ar: 'حداثة الأدلة',               description_en: 'Monitor evidence age and freshness across controls',                                   description_ar: 'مراقبة عمر الأدلة وحداثتها عبر الضوابط' },
  assessment_progress:   { name_en: 'Assessment Progress',       name_ar: 'تقدم التقييم',               description_en: 'Progress tracker for ongoing assessments',                                            description_ar: 'متتبع التقدم للتقييمات الجارية' },
  top_risks:             { name_en: 'Top Risks',                 name_ar: 'أهم المخاطر',                description_en: 'List of highest-rated organizational risks',                                          description_ar: 'قائمة بأعلى المخاطر المؤسسية تصنيفاً' },
  risk_trend:            { name_en: 'Risk Trend',                name_ar: 'اتجاه المخاطر',              description_en: 'Trend analysis of risk levels over time',                                             description_ar: 'تحليل اتجاه مستويات المخاطر عبر الزمن' },
  audit_readiness:       { name_en: 'Audit Readiness',           name_ar: 'جاهزية التدقيق',             description_en: 'Readiness score for upcoming audits',                                                 description_ar: 'درجة الجاهزية لعمليات التدقيق القادمة' },
  finding_aging:         { name_en: 'Finding Aging',             name_ar: 'تقادم النتائج',              description_en: 'Age distribution of open audit findings',                                             description_ar: 'توزيع عمر نتائج التدقيق المفتوحة' },
  maturity_gauge:        { name_en: 'Maturity Gauge',            name_ar: 'مقياس النضج',                description_en: 'Organizational maturity gauge across GRC domains',                                    description_ar: 'مقياس نضج المؤسسة عبر مجالات الحوكمة والمخاطر والامتثال' },
  vulnerability_status:  { name_en: 'Vulnerability Status',      name_ar: 'حالة الثغرات',               description_en: 'Current status of identified vulnerabilities',                                        description_ar: 'الحالة الحالية للثغرات المحددة' },
  ai_squad_status:       { name_en: 'AI Squad Status',           name_ar: 'حالة فريق الذكاء الاصطناعي', description_en: 'Live status of 10 AI agents showing idle/working/completed/error states and task counts', description_ar: 'الحالة المباشرة لعشرة وكلاء ذكاء اصطناعي تعرض حالات الخمول/العمل/الإكمال/الخطأ وعدد المهام' },
  ai_queue_pending:      { name_en: 'AI Review Queue',           name_ar: 'قائمة مراجعة الذكاء الاصطناعي', description_en: 'Number of AI-handled workflow steps pending human review',                          description_ar: 'عدد خطوات سير العمل التي تولاها الذكاء الاصطناعي بانتظار المراجعة البشرية' },
};

const REPORT_I18N: Record<string, { name_en: string; name_ar: string; description_en: string; description_ar: string; frequency: string }> = {
  risk_posture:        { name_en: 'Risk Posture Report',       name_ar: 'تقرير وضع المخاطر',          description_en: 'Comprehensive overview of organizational risk posture and trends',                     description_ar: 'نظرة شاملة على وضع المخاطر المؤسسية والاتجاهات',                                     frequency: 'monthly' },
  executive_summary:   { name_en: 'Executive Summary Report',  name_ar: 'تقرير الملخص التنفيذي',      description_en: 'High-level summary for board and executive stakeholders',                              description_ar: 'ملخص عالي المستوى لمجلس الإدارة وأصحاب المصلحة التنفيذيين',                           frequency: 'monthly' },
  incident_trend:      { name_en: 'Incident Trend Report',     name_ar: 'تقرير اتجاه الحوادث',        description_en: 'Analysis of security incident trends and response metrics',                            description_ar: 'تحليل اتجاهات الحوادث الأمنية ومقاييس الاستجابة',                                     frequency: 'weekly' },
  evidence_coverage:   { name_en: 'Evidence Coverage Report',  name_ar: 'تقرير تغطية الأدلة',         description_en: 'Coverage analysis of evidence across controls and frameworks',                         description_ar: 'تحليل تغطية الأدلة عبر الضوابط والأطر',                                               frequency: 'monthly' },
  audit_readiness:     { name_en: 'Audit Readiness Report',    name_ar: 'تقرير جاهزية التدقيق',       description_en: 'Assessment of audit readiness with gap analysis',                                     description_ar: 'تقييم جاهزية التدقيق مع تحليل الفجوات',                                               frequency: 'monthly' },
  maturity_assessment: { name_en: 'Maturity Assessment Report', name_ar: 'تقرير تقييم النضج',         description_en: 'Organizational maturity assessment across GRC domains',                                description_ar: 'تقييم نضج المؤسسة عبر مجالات الحوكمة والمخاطر والامتثال',                             frequency: 'quarterly' },
  vendor_risk_summary: { name_en: 'Vendor Risk Summary',       name_ar: 'ملخص مخاطر الموردين',        description_en: 'Summary of vendor risk assessments and third-party exposure',                          description_ar: 'ملخص تقييمات مخاطر الموردين والتعرض للأطراف الثالثة',                                 frequency: 'monthly' },
};

const NOTIFICATION_I18N: Record<string, { name_en: string; name_ar: string; description_en: string; description_ar: string }> = {
  critical_alert:    { name_en: 'Critical Alerts',           name_ar: 'التنبيهات الحرجة',            description_en: 'Immediate notifications for critical security and compliance events',                  description_ar: 'إشعارات فورية للأحداث الأمنية والامتثال الحرجة' },
  risk_change:       { name_en: 'Risk Changes',              name_ar: 'تغييرات المخاطر',             description_en: 'Notifications when risk levels or ratings change',                                    description_ar: 'إشعارات عند تغيير مستويات أو تصنيفات المخاطر' },
  compliance_gap:    { name_en: 'Compliance Gaps',           name_ar: 'فجوات الامتثال',              description_en: 'Alerts when new compliance gaps are identified',                                      description_ar: 'تنبيهات عند تحديد فجوات امتثال جديدة' },
  incident_new:      { name_en: 'New Incidents',             name_ar: 'حوادث جديدة',                 description_en: 'Notifications for newly reported security incidents',                                  description_ar: 'إشعارات للحوادث الأمنية المبلغ عنها حديثاً' },
  audit_finding:     { name_en: 'Audit Findings',            name_ar: 'نتائج التدقيق',               description_en: 'Notifications for new audit findings and observations',                                description_ar: 'إشعارات لنتائج وملاحظات التدقيق الجديدة' },
  privacy_breach:    { name_en: 'Privacy Breaches',          name_ar: 'انتهاكات الخصوصية',           description_en: 'Immediate alerts for privacy breach incidents',                                        description_ar: 'تنبيهات فورية لحوادث انتهاك الخصوصية' },
  consent_change:    { name_en: 'Consent Changes',           name_ar: 'تغييرات الموافقة',            description_en: 'Notifications when data subject consent status changes',                               description_ar: 'إشعارات عند تغيير حالة موافقة أصحاب البيانات' },
  evidence_expiry:   { name_en: 'Evidence Expiry',           name_ar: 'انتهاء صلاحية الأدلة',        description_en: 'Alerts when evidence items are approaching expiry',                                    description_ar: 'تنبيهات عند اقتراب انتهاء صلاحية عناصر الأدلة' },
  assessment_due:    { name_en: 'Assessment Due',            name_ar: 'استحقاق التقييم',             description_en: 'Reminders for upcoming assessment deadlines',                                         description_ar: 'تذكيرات بمواعيد التقييم القادمة' },
  approval_request:  { name_en: 'Approval Requests',         name_ar: 'طلبات الاعتماد',              description_en: 'Notifications for pending approval requests',                                         description_ar: 'إشعارات لطلبات الاعتماد المعلقة' },
  risk_threshold:    { name_en: 'Risk Threshold Alerts',     name_ar: 'تنبيهات عتبة المخاطر',        description_en: 'Alerts when risk scores exceed defined thresholds',                                    description_ar: 'تنبيهات عند تجاوز درجات المخاطر للعتبات المحددة' },
  vendor_risk:       { name_en: 'Vendor Risk Alerts',        name_ar: 'تنبيهات مخاطر الموردين',      description_en: 'Notifications for vendor risk level changes',                                         description_ar: 'إشعارات لتغييرات مستوى مخاطر الموردين' },
  remediation_due:   { name_en: 'Remediation Due',           name_ar: 'استحقاق المعالجة',            description_en: 'Reminders for upcoming remediation deadlines',                                        description_ar: 'تذكيرات بمواعيد المعالجة القادمة' },
  control_failure:   { name_en: 'Control Failures',          name_ar: 'إخفاقات الضوابط',             description_en: 'Alerts when controls fail effectiveness tests',                                       description_ar: 'تنبيهات عند فشل الضوابط في اختبارات الفعالية' },
  ai_step_takeover:  { name_en: 'AI Step Takeover',          name_ar: 'تولي الذكاء الاصطناعي للخطوة', description_en: 'Notification when an AI agent autonomously takes over a workflow step due to absence or SLA timeout', description_ar: 'إشعار عندما يتولى وكيل الذكاء الاصطناعي خطوة سير العمل تلقائيًا بسبب الغياب أو انتهاء مهلة الاتفاقية' },
  ai_review_needed:  { name_en: 'AI Review Needed',          name_ar: 'مراجعة مطلوبة للذكاء الاصطناعي', description_en: 'Notification when you have AI-handled steps in queue that need your review', description_ar: 'إشعار عندما تكون لديك خطوات تولاها الذكاء الاصطناعي في قائمة الانتظار تحتاج مراجعتك' },
};

// ─── Generic widget derivation from role permissions ───

/** Maps permission prefixes to generic widget IDs for roles without a profile. */
const PERMISSION_TO_WIDGETS: Record<string, string> = {
  risk:       'risk_heatmap',
  compliance: 'compliance_overview',
  control:    'control_effectiveness',
  assessment: 'assessment_progress',
  audit:      'audit_readiness',
  report:     'executive_summary',
  analytics:  'executive_summary',
  ai_squad:   'ai_squad_status',
  autonomous: 'ai_queue_pending',
};

// ─── computeWidgetGuide ───

/**
 * Compute the widget guide for a given role and optional profile.
 * When profileId is provided, returns the profile's defaultWidgets with bilingual descriptions.
 * When no profileId, derives generic widgets from the role's permissions.
 *
 * Requirements: 1.3, 1.4, 5.1, 5.3
 */
export function computeWidgetGuide(role: UserRole, profileId?: string): WidgetEntry[] {
  if (profileId) {
    const profile = PREDEFINED_PROFILES.find(p => p.profileId === profileId);
    if (profile) {
      return profile.defaultWidgets.map(widgetId => {
        const i18n = WIDGET_I18N[widgetId];
        return {
          widgetId,
          name_en: i18n?.name_en ?? widgetId,
          name_ar: i18n?.name_ar ?? widgetId,
          description_en: i18n?.description_en ?? '',
          description_ar: i18n?.description_ar ?? '',
        };
      });
    }
  }

  // No profile or invalid profileId — derive generic widgets from role permissions
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return [];

  const isWildcard = perms.includes('*');
  const seen = new Set<string>();
  const widgets: WidgetEntry[] = [];

  for (const [permPrefix, widgetId] of Object.entries(PERMISSION_TO_WIDGETS)) {
    if (seen.has(widgetId)) continue;
    if (isWildcard || perms.some(p => p.startsWith(`${permPrefix}:`))) {
      seen.add(widgetId);
      const i18n = WIDGET_I18N[widgetId];
      widgets.push({
        widgetId,
        name_en: i18n?.name_en ?? widgetId,
        name_ar: i18n?.name_ar ?? widgetId,
        description_en: i18n?.description_en ?? '',
        description_ar: i18n?.description_ar ?? '',
      });
    }
  }

  return widgets;
}

// ─── computeReportGuide ───

/**
 * Compute the report guide for a given role and optional profile.
 * When profileId is provided, returns the profile's defaultReportSubscriptions with bilingual descriptions.
 * When the role lacks report:read permission, returns empty array.
 *
 * Requirements: 1.3, 6.1, 6.3
 */
export function computeReportGuide(role: UserRole, profileId?: string): ReportEntry[] {
  // Requirement 6.3: exclude reports when role lacks report:read
  if (!hasPermission(role, 'report.document.read')) return [];

  if (profileId) {
    const profile = PREDEFINED_PROFILES.find(p => p.profileId === profileId);
    if (profile) {
      return profile.defaultReportSubscriptions.map(reportId => {
        const i18n = REPORT_I18N[reportId];
        return {
          reportId,
          name_en: i18n?.name_en ?? reportId,
          name_ar: i18n?.name_ar ?? reportId,
          description_en: i18n?.description_en ?? '',
          description_ar: i18n?.description_ar ?? '',
          frequency: i18n?.frequency ?? 'on-demand',
        };
      });
    }
  }

  // No profile — return empty (reports are profile-driven)
  return [];
}

// ─── computeNotificationGuide ───

/**
 * Compute the notification guide for an optional profile.
 * When profileId is provided, returns the profile's defaultNotificationPrefs with bilingual descriptions.
 * When no profileId, returns empty array.
 *
 * Requirements: 1.3, 1.4, 7.1
 */
export function computeNotificationGuide(profileId?: string): NotificationEntry[] {
  if (!profileId) return [];

  const profile = PREDEFINED_PROFILES.find(p => p.profileId === profileId);
  if (!profile) return [];

  return Object.entries(profile.defaultNotificationPrefs).map(([type, enabled]) => {
    const i18n = NOTIFICATION_I18N[type];
    return {
      type,
      name_en: i18n?.name_en ?? type,
      name_ar: i18n?.name_ar ?? type,
      description_en: i18n?.description_en ?? '',
      description_ar: i18n?.description_ar ?? '',
      defaultEnabled: !!enabled,
    };
  }) as NotificationEntry[];
}

// ─── Static Guide Library & computeTaskGuides ───

/**
 * Static library of step-by-step task guides for each role profile.
 * Each guide has bilingual titles/descriptions and steps with optional requiredPermission.
 *
 * Requirements: 8.1
 */
export const GUIDE_LIBRARY: TaskGuide[] = [
  // ── CISO Guides ──
  {
    guideId: 'ciso_security_posture_review',
    title_en: 'Security Posture Review',
    title_ar: 'مراجعة الوضع الأمني',
    description_en: 'Conduct a comprehensive review of the organization\'s security posture using dashboards and risk data.',
    description_ar: 'إجراء مراجعة شاملة للوضع الأمني للمؤسسة باستخدام لوحات المعلومات وبيانات المخاطر.',
    profileIds: ['ciso'],
    steps: [
      { stepNumber: 1, title_en: 'Review Executive Dashboard', title_ar: 'مراجعة لوحة التحكم التنفيذية', description_en: 'Open the dashboard to review key security metrics and alerts.', description_ar: 'افتح لوحة التحكم لمراجعة مقاييس الأمان الرئيسية والتنبيهات.', route: '/workspace-home', requiredPermission: 'workspace.config.read' },
      { stepNumber: 2, title_en: 'Analyze Risk Heatmap', title_ar: 'تحليل خريطة المخاطر الحرارية', description_en: 'Review the risk heatmap to identify high-impact risks.', description_ar: 'مراجعة خريطة المخاطر الحرارية لتحديد المخاطر عالية التأثير.', route: '/risks', requiredPermission: 'risk.record.read' },
      { stepNumber: 3, title_en: 'Check Compliance Status', title_ar: 'التحقق من حالة الامتثال', description_en: 'Review compliance status across active frameworks.', description_ar: 'مراجعة حالة الامتثال عبر الأطر النشطة.', route: '/compliance', requiredPermission: 'framework.record.read' },
      { stepNumber: 4, title_en: 'Review Incident Trends', title_ar: 'مراجعة اتجاهات الحوادث', description_en: 'Analyze recent incident trends and response effectiveness.', description_ar: 'تحليل اتجاهات الحوادث الأخيرة وفعالية الاستجابة.', route: '/incidents', requiredPermission: 'risk.record.read' },
      { stepNumber: 5, title_en: 'Generate Executive Report', title_ar: 'إنشاء التقرير التنفيذي', description_en: 'Generate an executive summary report for board presentation.', description_ar: 'إنشاء تقرير ملخص تنفيذي لعرضه على مجلس الإدارة.', route: '/report-center', requiredPermission: 'report.document.read' },
    ],
  },
  {
    guideId: 'ciso_incident_escalation',
    title_en: 'Incident Escalation Management',
    title_ar: 'إدارة تصعيد الحوادث',
    description_en: 'Handle critical security incident escalation from detection to resolution.',
    description_ar: 'التعامل مع تصعيد الحوادث الأمنية الحرجة من الاكتشاف إلى الحل.',
    profileIds: ['ciso'],
    steps: [
      { stepNumber: 1, title_en: 'Review Incident Details', title_ar: 'مراجعة تفاصيل الحادث', description_en: 'Open the incidents module to review the escalated incident.', description_ar: 'افتح وحدة الحوادث لمراجعة الحادث المصعّد.', route: '/incidents', requiredPermission: 'risk.record.read' },
      { stepNumber: 2, title_en: 'Assess Risk Impact', title_ar: 'تقييم أثر المخاطر', description_en: 'Evaluate the risk impact using the risk scoring module.', description_ar: 'تقييم أثر المخاطر باستخدام وحدة تسجيل المخاطر.', route: '/risk-scoring', requiredPermission: 'risk.record.read' },
      { stepNumber: 3, title_en: 'Coordinate Response Team', title_ar: 'تنسيق فريق الاستجابة', description_en: 'Use messaging to coordinate with the incident response team.', description_ar: 'استخدام المراسلات للتنسيق مع فريق الاستجابة للحوادث.', route: '/messaging', requiredPermission: 'messaging.channel.read' },
      { stepNumber: 4, title_en: 'Track Remediation Actions', title_ar: 'تتبع إجراءات المعالجة', description_en: 'Create and track action items for incident remediation.', description_ar: 'إنشاء وتتبع بنود العمل لمعالجة الحادث.', route: '/action-items', requiredPermission: 'action.item.read' },
    ],
  },
  // ── DPO Guides ──
  {
    guideId: 'dpo_privacy_impact_assessment',
    title_en: 'Privacy Impact Assessment',
    title_ar: 'تقييم أثر الخصوصية',
    description_en: 'Conduct a Data Protection Impact Assessment (DPIA) per PDPL requirements.',
    description_ar: 'إجراء تقييم أثر حماية البيانات وفقاً لمتطلبات نظام حماية البيانات الشخصية.',
    profileIds: ['dpo'],
    steps: [
      { stepNumber: 1, title_en: 'Initiate DPIA', title_ar: 'بدء تقييم أثر حماية البيانات', description_en: 'Navigate to the DPIA module and create a new assessment.', description_ar: 'انتقل إلى وحدة تقييم أثر حماية البيانات وأنشئ تقييماً جديداً.', route: '/dpia', requiredPermission: 'assessment.record.read' },
      { stepNumber: 2, title_en: 'Review Privacy Operations', title_ar: 'مراجعة عمليات الخصوصية', description_en: 'Check current RoPA and consent status in privacy operations.', description_ar: 'التحقق من حالة سجل المعالجة والموافقة الحالية في عمليات الخصوصية.', route: '/privacy-ops', requiredPermission: 'policy.document.read' },
      { stepNumber: 3, title_en: 'Map Data Processing Activities', title_ar: 'تعيين أنشطة معالجة البيانات', description_en: 'Document data processing activities and their legal basis.', description_ar: 'توثيق أنشطة معالجة البيانات وأساسها القانوني.', route: '/privacy-ops', requiredPermission: 'policy.document.read' },
      { stepNumber: 4, title_en: 'Assess Risks to Data Subjects', title_ar: 'تقييم المخاطر على أصحاب البيانات', description_en: 'Evaluate risks to data subjects using the risk module.', description_ar: 'تقييم المخاطر على أصحاب البيانات باستخدام وحدة المخاطر.', route: '/risks', requiredPermission: 'risk.record.read' },
      { stepNumber: 5, title_en: 'Generate DPIA Report', title_ar: 'إنشاء تقرير تقييم الأثر', description_en: 'Generate the DPIA report for regulatory submission.', description_ar: 'إنشاء تقرير تقييم الأثر للتقديم التنظيمي.', route: '/report-center', requiredPermission: 'report.document.read' },
    ],
  },
  // ── Compliance Manager Guides ──
  {
    guideId: 'cm_framework_gap_analysis',
    title_en: 'Framework Gap Analysis',
    title_ar: 'تحليل فجوات الإطار التنظيمي',
    description_en: 'Perform a gap analysis against a regulatory framework and plan remediation.',
    description_ar: 'إجراء تحليل فجوات مقابل إطار تنظيمي وتخطيط المعالجة.',
    profileIds: ['compliance_manager'],
    steps: [
      { stepNumber: 1, title_en: 'Select Target Framework', title_ar: 'اختيار الإطار المستهدف', description_en: 'Browse available frameworks and select the target for gap analysis.', description_ar: 'تصفح الأطر المتاحة واختيار الإطار المستهدف لتحليل الفجوات.', route: '/frameworks', requiredPermission: 'framework.record.read' },
      { stepNumber: 2, title_en: 'Review Current Controls', title_ar: 'مراجعة الضوابط الحالية', description_en: 'Review existing controls mapped to the framework.', description_ar: 'مراجعة الضوابط الحالية المرتبطة بالإطار.', route: '/controls', requiredPermission: 'control.record.read' },
      { stepNumber: 3, title_en: 'Identify Compliance Gaps', title_ar: 'تحديد فجوات الامتثال', description_en: 'Use the compliance module to identify gaps and non-conformities.', description_ar: 'استخدام وحدة الامتثال لتحديد الفجوات وعدم المطابقة.', route: '/compliance', requiredPermission: 'compliance.program.read' },
      { stepNumber: 4, title_en: 'Create Remediation Plan', title_ar: 'إنشاء خطة المعالجة', description_en: 'Create action items for each identified gap.', description_ar: 'إنشاء بنود عمل لكل فجوة محددة.', route: '/action-items', requiredPermission: 'action.item.write' },
    ],
  },
  {
    guideId: 'cm_policy_lifecycle',
    title_en: 'Policy Lifecycle Management',
    title_ar: 'إدارة دورة حياة السياسة',
    description_en: 'Manage the full lifecycle of an organizational policy from draft to publication.',
    description_ar: 'إدارة دورة الحياة الكاملة لسياسة مؤسسية من المسودة إلى النشر.',
    profileIds: ['compliance_manager'],
    steps: [
      { stepNumber: 1, title_en: 'Draft New Policy', title_ar: 'صياغة سياسة جديدة', description_en: 'Create a new policy draft in the governance module.', description_ar: 'إنشاء مسودة سياسة جديدة في وحدة الحوكمة.', route: '/governance', requiredPermission: 'policy.document.write' },
      { stepNumber: 2, title_en: 'Submit for Review', title_ar: 'تقديم للمراجعة', description_en: 'Initiate the policy review workflow for stakeholder feedback.', description_ar: 'بدء سير عمل مراجعة السياسة للحصول على ملاحظات أصحاب المصلحة.', route: '/workflows', requiredPermission: 'workflow.instance.write' },
      { stepNumber: 3, title_en: 'Track Review Progress', title_ar: 'تتبع تقدم المراجعة', description_en: 'Monitor the review workflow progress on the task board.', description_ar: 'مراقبة تقدم سير عمل المراجعة على لوحة المهام.', route: '/task-board', requiredPermission: 'task.item.read' },
    ],
  },
  // ── Risk Manager Guides ──
  {
    guideId: 'rm_risk_assessment_cycle',
    title_en: 'Risk Assessment Cycle',
    title_ar: 'دورة تقييم المخاطر',
    description_en: 'Execute a complete risk assessment cycle from identification to treatment.',
    description_ar: 'تنفيذ دورة تقييم مخاطر كاملة من التحديد إلى المعالجة.',
    profileIds: ['risk_manager'],
    steps: [
      { stepNumber: 1, title_en: 'Identify New Risks', title_ar: 'تحديد المخاطر الجديدة', description_en: 'Register new risks in the risk module with impact and likelihood.', description_ar: 'تسجيل المخاطر الجديدة في وحدة المخاطر مع الأثر والاحتمالية.', route: '/risks', requiredPermission: 'risk.record.write' },
      { stepNumber: 2, title_en: 'Score and Prioritize', title_ar: 'التسجيل والترتيب', description_en: 'Use risk scoring to prioritize risks by severity.', description_ar: 'استخدام تسجيل المخاطر لترتيب المخاطر حسب الخطورة.', route: '/risk-scoring', requiredPermission: 'risk.record.read' },
      { stepNumber: 3, title_en: 'Assign Treatment Plans', title_ar: 'تعيين خطط المعالجة', description_en: 'Create treatment plans and assign owners via action items.', description_ar: 'إنشاء خطط المعالجة وتعيين المسؤولين عبر بنود العمل.', route: '/action-items', requiredPermission: 'action.item.write' },
      { stepNumber: 4, title_en: 'Monitor Risk Trends', title_ar: 'مراقبة اتجاهات المخاطر', description_en: 'Review risk trend analytics to track treatment effectiveness.', description_ar: 'مراجعة تحليلات اتجاه المخاطر لتتبع فعالية المعالجة.', route: '/workspace-home', requiredPermission: 'workspace.config.read' },
    ],
  },
  // ── Internal Auditor Guides ──
  {
    guideId: 'ia_audit_planning',
    title_en: 'Audit Planning and Execution',
    title_ar: 'تخطيط وتنفيذ التدقيق',
    description_en: 'Plan and execute an internal audit from scoping to findings reporting.',
    description_ar: 'تخطيط وتنفيذ تدقيق داخلي من تحديد النطاق إلى الإبلاغ عن النتائج.',
    profileIds: ['internal_auditor'],
    steps: [
      { stepNumber: 1, title_en: 'Define Audit Scope', title_ar: 'تحديد نطاق التدقيق', description_en: 'Open the audit module and define the audit scope and objectives.', description_ar: 'افتح وحدة التدقيق وحدد نطاق وأهداف التدقيق.', route: '/audit', requiredPermission: 'audit.record.read' },
      { stepNumber: 2, title_en: 'Review Control Evidence', title_ar: 'مراجعة أدلة الضوابط', description_en: 'Examine evidence collected for controls in scope.', description_ar: 'فحص الأدلة المجمعة للضوابط ضمن النطاق.', route: '/evidence', requiredPermission: 'framework.record.read' },
      { stepNumber: 3, title_en: 'Document Findings', title_ar: 'توثيق النتائج', description_en: 'Record audit findings and observations in the findings module.', description_ar: 'تسجيل نتائج وملاحظات التدقيق في وحدة النتائج.', route: '/findings', requiredPermission: 'workspace.config.read' },
      { stepNumber: 4, title_en: 'Generate Audit Report', title_ar: 'إنشاء تقرير التدقيق', description_en: 'Generate the formal audit report with findings and recommendations.', description_ar: 'إنشاء تقرير التدقيق الرسمي مع النتائج والتوصيات.', route: '/report-center', requiredPermission: 'report.document.read' },
    ],
  },
  // ── Board Member Guides ──
  {
    guideId: 'bm_governance_oversight',
    title_en: 'Governance Oversight Review',
    title_ar: 'مراجعة الرقابة على الحوكمة',
    description_en: 'Review organizational governance posture and key risk indicators for board oversight.',
    description_ar: 'مراجعة وضع الحوكمة المؤسسية ومؤشرات المخاطر الرئيسية للرقابة من مجلس الإدارة.',
    profileIds: ['board_member'],
    steps: [
      { stepNumber: 1, title_en: 'View Executive Dashboard', title_ar: 'عرض لوحة التحكم التنفيذية', description_en: 'Review the executive dashboard for high-level GRC metrics.', description_ar: 'مراجعة لوحة التحكم التنفيذية لمقاييس الحوكمة والمخاطر والامتثال عالية المستوى.', route: '/workspace-home', requiredPermission: 'workspace.config.read' },
      { stepNumber: 2, title_en: 'Review Top Risks', title_ar: 'مراجعة أهم المخاطر', description_en: 'Examine the top organizational risks and their treatment status.', description_ar: 'فحص أهم المخاطر المؤسسية وحالة معالجتها.', route: '/risks', requiredPermission: 'risk.record.read' },
      { stepNumber: 3, title_en: 'Check Compliance Summary', title_ar: 'التحقق من ملخص الامتثال', description_en: 'Review compliance status across regulatory frameworks.', description_ar: 'مراجعة حالة الامتثال عبر الأطر التنظيمية.', route: '/compliance', requiredPermission: 'framework.record.read' },
      { stepNumber: 4, title_en: 'Access Board Reports', title_ar: 'الوصول إلى تقارير المجلس', description_en: 'View and download board-level reports and executive summaries.', description_ar: 'عرض وتنزيل تقارير مستوى المجلس والملخصات التنفيذية.', route: '/report-center', requiredPermission: 'report.document.read' },
    ],
  },
  // ── IT Security Officer Guides ──
  {
    guideId: 'itso_control_monitoring',
    title_en: 'Security Control Monitoring',
    title_ar: 'مراقبة الضوابط الأمنية',
    description_en: 'Monitor and maintain security controls effectiveness and evidence freshness.',
    description_ar: 'مراقبة وصيانة فعالية الضوابط الأمنية وحداثة الأدلة.',
    profileIds: ['it_security_officer'],
    steps: [
      { stepNumber: 1, title_en: 'Review Control Status', title_ar: 'مراجعة حالة الضوابط', description_en: 'Check the control lifecycle module for control health status.', description_ar: 'التحقق من وحدة دورة حياة الضابط لحالة صحة الضوابط.', route: '/control-lifecycle', requiredPermission: 'control.record.read' },
      { stepNumber: 2, title_en: 'Verify Evidence Freshness', title_ar: 'التحقق من حداثة الأدلة', description_en: 'Review evidence catalog to ensure evidence is current and valid.', description_ar: 'مراجعة فهرس الأدلة للتأكد من أن الأدلة حالية وصالحة.', route: '/evidence-catalog', requiredPermission: 'framework.record.read' },
      { stepNumber: 3, title_en: 'Check Connector Health', title_ar: 'التحقق من صحة الموصلات', description_en: 'Monitor data collection connectors for any failures or delays.', description_ar: 'مراقبة موصلات جمع البيانات لأي إخفاقات أو تأخيرات.', route: '/connector-health', requiredPermission: 'framework.record.read' },
      { stepNumber: 4, title_en: 'Review Vulnerability Status', title_ar: 'مراجعة حالة الثغرات', description_en: 'Check the dashboard for current vulnerability status and trends.', description_ar: 'التحقق من لوحة التحكم لحالة الثغرات الحالية والاتجاهات.', route: '/workspace-home', requiredPermission: 'workspace.config.read' },
    ],
  },
  {
    guideId: 'itso_incident_response',
    title_en: 'Security Incident Response',
    title_ar: 'الاستجابة للحوادث الأمنية',
    description_en: 'Respond to security incidents with triage, containment, and remediation steps.',
    description_ar: 'الاستجابة للحوادث الأمنية مع خطوات الفرز والاحتواء والمعالجة.',
    profileIds: ['it_security_officer'],
    steps: [
      { stepNumber: 1, title_en: 'Triage Incident', title_ar: 'فرز الحادث', description_en: 'Open the incidents module and triage the reported incident.', description_ar: 'افتح وحدة الحوادث وقم بفرز الحادث المبلغ عنه.', route: '/incidents', requiredPermission: 'risk.record.read' },
      { stepNumber: 2, title_en: 'Assess Affected Controls', title_ar: 'تقييم الضوابط المتأثرة', description_en: 'Identify which controls are affected by the incident.', description_ar: 'تحديد الضوابط المتأثرة بالحادث.', route: '/controls', requiredPermission: 'control.record.read' },
      { stepNumber: 3, title_en: 'Create Remediation Tasks', title_ar: 'إنشاء مهام المعالجة', description_en: 'Create action items for containment and remediation.', description_ar: 'إنشاء بنود عمل للاحتواء والمعالجة.', route: '/action-items', requiredPermission: 'action.item.write' },
    ],
  },
  // ── AI Squad & Autonomous Workflow Guides (all profiles) ──
  {
    guideId: 'all_ai_squad_overview',
    title_en: 'Meet Your AI Squad Team',
    title_ar: 'تعرّف على فريق الذكاء الاصطناعي',
    description_en: 'View the 10 specialist AI agents, check their live status, review their performance stats, and understand their roles in your workflows.',
    description_ar: 'عرض وكلاء الذكاء الاصطناعي العشرة المتخصصين، التحقق من حالتهم المباشرة، مراجعة إحصاءات أدائهم، وفهم أدوارهم في سير العمل.',
    profileIds: ['ciso', 'compliance_manager', 'risk_manager', 'internal_auditor', 'dpo', 'it_security_officer', 'board_member'],
    steps: [
      { stepNumber: 1, title_en: 'Open AI Squad Dashboard', title_ar: 'افتح لوحة فريق الذكاء الاصطناعي', description_en: 'Navigate to the AI Squad page to see all 12 agents with their current status (idle, working, completed, error).', description_ar: 'انتقل إلى صفحة فريق الذكاء الاصطناعي لرؤية جميع الوكلاء الاثني عشر مع حالتهم الحالية.', route: '/ai-squad', requiredPermission: 'ai.squad.read' },
      { stepNumber: 2, title_en: 'Review Agent Profiles', title_ar: 'مراجعة ملفات الوكلاء', description_en: 'Click on any agent to see their profile card: specialization, tasks completed, success rate, and average response time.', description_ar: 'انقر على أي وكيل لرؤية بطاقة ملفه: التخصص، المهام المنجزة، معدل النجاح، ومتوسط وقت الاستجابة.', route: '/ai-squad', requiredPermission: 'ai.squad.read' },
      { stepNumber: 3, title_en: 'View Agent Status Trail', title_ar: 'عرض سجل حالة الوكيل', description_en: 'Check any agent\'s status trail to see their full activity timeline — just like a human employee activity feed.', description_ar: 'تحقق من سجل حالة أي وكيل لرؤية جدولهم الزمني الكامل — تمامًا مثل سجل نشاط الموظف البشري.', route: '/ai-squad', requiredPermission: 'ai.squad.read' },
    ],
  },
  {
    guideId: 'all_ai_queue_review',
    title_en: 'Review AI-Handled Workflow Steps',
    title_ar: 'مراجعة خطوات سير العمل التي تولاها الذكاء الاصطناعي',
    description_en: 'When you return from absence, review all workflow steps the AI agents handled on your behalf — accept, reject, or modify each decision.',
    description_ar: 'عند عودتك من الغياب، راجع جميع خطوات سير العمل التي تولاها وكلاء الذكاء الاصطناعي نيابةً عنك — اقبل أو ارفض أو عدّل كل قرار.',
    profileIds: ['ciso', 'compliance_manager', 'risk_manager', 'internal_auditor', 'dpo', 'it_security_officer'],
    steps: [
      { stepNumber: 1, title_en: 'Open AI Review Queue', title_ar: 'افتح قائمة مراجعة الذكاء الاصطناعي', description_en: 'Navigate to the AI Queue page to see all steps pending your review.', description_ar: 'انتقل إلى صفحة قائمة مراجعة الذكاء الاصطناعي لرؤية جميع الخطوات بانتظار مراجعتك.', route: '/ai-queue', requiredPermission: 'workflow.autonomous.read' },
      { stepNumber: 2, title_en: 'Review AI Decisions', title_ar: 'مراجعة قرارات الذكاء الاصطناعي', description_en: 'For each item, review which AI agent handled it, the trigger reason (SLA timeout or absence), the confidence score, and the agent\'s output.', description_ar: 'لكل عنصر، راجع أي وكيل تولاه، سبب التفعيل (انتهاء المهلة أو الغياب)، درجة الثقة، ومخرجات الوكيل.', route: '/ai-queue', requiredPermission: 'workflow.autonomous.read' },
      { stepNumber: 3, title_en: 'Accept, Reject, or Modify', title_ar: 'قبول أو رفض أو تعديل', description_en: 'For each AI-handled step, choose to accept the AI\'s work, reject it (the step returns to pending), or modify the output before accepting.', description_ar: 'لكل خطوة تولاها الذكاء الاصطناعي، اختر قبول عمل الذكاء الاصطناعي، رفضه (تعود الخطوة إلى الانتظار)، أو تعديل المخرجات قبل القبول.', route: '/ai-queue', requiredPermission: 'workflow.autonomous.read' },
    ],
  },
  {
    guideId: 'all_ai_step_guidance',
    title_en: 'Get AI Coaching for Workflow Steps',
    title_ar: 'احصل على تدريب الذكاء الاصطناعي لخطوات سير العمل',
    description_en: 'Use the AI coaching feature to get step-level guidance and auto-fill suggestions from a specialist AI agent while working on any workflow step.',
    description_ar: 'استخدم ميزة تدريب الذكاء الاصطناعي للحصول على إرشادات على مستوى الخطوة واقتراحات الملء التلقائي من وكيل ذكاء اصطناعي متخصص أثناء العمل على أي خطوة.',
    profileIds: ['ciso', 'compliance_manager', 'risk_manager', 'internal_auditor', 'dpo', 'it_security_officer'],
    steps: [
      { stepNumber: 1, title_en: 'Open a Workflow Step', title_ar: 'افتح خطوة سير عمل', description_en: 'Navigate to any active workflow and open a step assigned to you.', description_ar: 'انتقل إلى أي سير عمل نشط وافتح خطوة مخصصة لك.', route: '/workflows', requiredPermission: 'workflow.instance.read' },
      { stepNumber: 2, title_en: 'Request AI Guidance', title_ar: 'طلب إرشاد الذكاء الاصطناعي', description_en: 'Click "Get Guidance" to receive coaching from the specialist agent: what\'s required, regulatory context, suggested actions, and estimated time.', description_ar: 'انقر "احصل على إرشاد" لتلقي تدريب من الوكيل المتخصص: ما هو مطلوب، السياق التنظيمي، الإجراءات المقترحة، والوقت المقدر.', route: '/workflows', requiredPermission: 'workflow.instance.read' },
      { stepNumber: 3, title_en: 'Use Auto-Fill Suggestions', title_ar: 'استخدم اقتراحات الملء التلقائي', description_en: 'Click "Auto-Fill" to get AI-generated field values, draft comments, and recommended evidence — accept or modify each suggestion independently.', description_ar: 'انقر "ملء تلقائي" للحصول على قيم الحقول المولدة بالذكاء الاصطناعي، مسودات التعليقات، والأدلة الموصى بها — اقبل أو عدّل كل اقتراح بشكل مستقل.', route: '/workflows', requiredPermission: 'workflow.instance.read' },
    ],
  },
];

/**
 * Compute task guides for a given role and optional profile.
 * Filters the GUIDE_LIBRARY by profileId, filters steps by role permissions,
 * renumbers steps sequentially, and excludes guides with zero remaining steps.
 *
 * Requirements: 8.1, 8.2, 8.4
 */
export function computeTaskGuides(role: UserRole, profileId?: string): TaskGuide[] {
  // Filter guides by profileId if provided
  let guides = GUIDE_LIBRARY;
  if (profileId) {
    guides = guides.filter(g => g.profileIds.includes(profileId));
  }

  const result: TaskGuide[] = [];

  for (const guide of guides) {
    // Filter steps by role permissions (Requirement 8.4)
    const filteredSteps = guide.steps.filter(step => {
      if (!step.requiredPermission) return true;
      return hasPermission(role, step.requiredPermission);
    });

    // Skip guides with no remaining steps
    if (filteredSteps.length === 0) continue;

    // Renumber steps sequentially starting from 1
    const renumberedSteps: TaskGuideStep[] = filteredSteps.map((step, idx) => ({
      ...step,
      stepNumber: idx + 1,
    }));

    result.push({
      ...guide,
      steps: renumberedSteps,
    });
  }

  return result;
}
