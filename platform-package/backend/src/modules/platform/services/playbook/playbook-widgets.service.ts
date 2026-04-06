/**
 * Playbook Widgets — widget, report, and notification guide computation.
 *
 * Requirements: 1.3, 1.4, 5.1, 5.3, 6.1, 6.3, 7.1
 */

type UserRole = string;
import { WidgetEntry, ReportEntry, NotificationEntry } from '../../../agrc-engine/services/engine/playbook.types';
import { PREDEFINED_PROFILES } from '../../../../platform/dauth/identity/role-profile.service';
import {  hasPermission } from './playbook-permissions.service';
import { ROLE_PERMISSIONS } from './playbook-data';

// ─── Widget / Report / Notification bilingual descriptions ───

export const WIDGET_I18N: Record<string, { name_en: string; name_ar: string; description_en: string; description_ar: string }> = {
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

export const REPORT_I18N: Record<string, { name_en: string; name_ar: string; description_en: string; description_ar: string; frequency: string }> = {
  risk_posture:        { name_en: 'Risk Posture Report',       name_ar: 'تقرير وضع المخاطر',          description_en: 'Comprehensive overview of organizational risk posture and trends',                     description_ar: 'نظرة شاملة على وضع المخاطر المؤسسية والاتجاهات',                                     frequency: 'monthly' },
  executive_summary:   { name_en: 'Executive Summary Report',  name_ar: 'تقرير الملخص التنفيذي',      description_en: 'High-level summary for board and executive stakeholders',                              description_ar: 'ملخص عالي المستوى لمجلس الإدارة وأصحاب المصلحة التنفيذيين',                           frequency: 'monthly' },
  incident_trend:      { name_en: 'Incident Trend Report',     name_ar: 'تقرير اتجاه الحوادث',        description_en: 'Analysis of security incident trends and response metrics',                            description_ar: 'تحليل اتجاهات الحوادث الأمنية ومقاييس الاستجابة',                                     frequency: 'weekly' },
  evidence_coverage:   { name_en: 'Evidence Coverage Report',  name_ar: 'تقرير تغطية الأدلة',         description_en: 'Coverage analysis of evidence across controls and frameworks',                         description_ar: 'تحليل تغطية الأدلة عبر الضوابط والأطر',                                               frequency: 'monthly' },
  audit_readiness:     { name_en: 'Audit Readiness Report',    name_ar: 'تقرير جاهزية التدقيق',       description_en: 'Assessment of audit readiness with gap analysis',                                     description_ar: 'تقييم جاهزية التدقيق مع تحليل الفجوات',                                               frequency: 'monthly' },
  maturity_assessment: { name_en: 'Maturity Assessment Report', name_ar: 'تقرير تقييم النضج',         description_en: 'Organizational maturity assessment across GRC domains',                                description_ar: 'تقييم نضج المؤسسة عبر مجالات الحوكمة والمخاطر والامتثال',                             frequency: 'quarterly' },
  vendor_risk_summary: { name_en: 'Vendor Risk Summary',       name_ar: 'ملخص مخاطر الموردين',        description_en: 'Summary of vendor risk assessments and third-party exposure',                          description_ar: 'ملخص تقييمات مخاطر الموردين والتعرض للأطراف الثالثة',                                 frequency: 'monthly' },
};

export const NOTIFICATION_I18N: Record<string, { name_en: string; name_ar: string; description_en: string; description_ar: string }> = {
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
export const PERMISSION_TO_WIDGETS: Record<string, string> = {
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
  });
}
