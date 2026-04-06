/**
 * Smart Module Activation — Formatting Helpers
 *
 * Bilingual (EN/AR) name formatting utilities for modules, workflows,
 * roles, and dashboards.
 */

// ── Module Names ────────────────────────────────────────────────────────

export function formatModuleName(code: string): string {
  const names: Record<string, string> = {
    foundation: 'Foundation',
    compliance: 'Compliance',
    risk: 'Risk Management',
    security: 'Security',
    audit: 'Audit',
    governance: 'Governance',
    workflow: 'Workflow Engine',
    reporting: 'Reporting',
    assessment: 'Assessment',
    vendor: 'Vendor Risk',
    incident: 'Incident Management',
    bcp: 'Business Continuity',
    ai: 'AI & Automation',
  };
  return names[code] || code;
}

export function formatModuleNameAr(code: string): string {
  const names: Record<string, string> = {
    foundation: 'الأساسيات',
    compliance: 'الامتثال',
    risk: 'إدارة المخاطر',
    security: 'الأمن',
    audit: 'التدقيق',
    governance: 'الحوكمة',
    workflow: 'محرك سير العمل',
    reporting: 'التقارير',
    assessment: 'التقييم',
    vendor: 'مخاطر الموردين',
    incident: 'إدارة الحوادث',
    bcp: 'استمرارية الأعمال',
    ai: 'الذكاء الاصطناعي والأتمتة',
  };
  return names[code] || code;
}

// ── Workflow Names ───────────────────────────────────────────────────────

export function formatWorkflowName(code: string): string {
  return code
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatWorkflowNameAr(code: string): string {
  const names: Record<string, string> = {
    evidence_collection: 'جمع الأدلة',
    assessment: 'التقييم',
    exception_request: 'طلب استثناء',
    incident_response: 'الاستجابة للحوادث',
    risk_assessment: 'تقييم المخاطر',
    risk_treatment: 'معالجة المخاطر',
    audit_engagement: 'مشاركة التدقيق',
    finding_management: 'إدارة النتائج',
    policy_approval: 'اعتماد السياسة',
    vendor_assessment: 'تقييم المورد',
    vendor_onboarding: 'تأهيل المورد',
    bcp_assessment: 'تقييم استمرارية الأعمال',
    dr_test: 'اختبار التعافي من الكوارث',
  };
  return names[code] || code;
}

// ── Role Names ──────────────────────────────────────────────────────────

export function formatRoleName(code: string): string {
  return code
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatRoleNameAr(code: string): string {
  const names: Record<string, string> = {
    TenantAdmin: 'مدير المستأجر',
    ComplianceManager: 'مدير الامتثال',
    ComplianceOfficer: 'ضابط الامتثال',
    ControlOwner: 'مالك الضابط',
    RiskManager: 'مدير المخاطر',
    SecurityManager: 'مدير الأمن',
    SecurityAnalyst: 'محلل أمني',
    Auditor: 'مدقق',
    EvidenceCustodian: 'أمين الأدلة',
    GovernanceManager: 'مدير الحوكمة',
    VendorRiskOwner: 'مالك مخاطر الموردين',
    BCMOwner: 'مالك استمرارية الأعمال',
    IncidentResponder: 'المستجيب للحوادث',
  };
  return names[code] || code;
}

// ── Dashboard Names ─────────────────────────────────────────────────────

export function formatDashboardName(code: string): string {
  const names: Record<string, string> = {
    executive: 'Executive Dashboard',
    compliance_ops: 'Compliance Operations',
    compliance_posture: 'Compliance Posture',
    risk_register: 'Risk Register',
    risk_heatmap: 'Risk Heatmap',
    security_posture: 'Security Posture',
    incident_dashboard: 'Incident Dashboard',
    audit_dashboard: 'Audit Dashboard',
    findings: 'Findings',
    governance_dashboard: 'Governance Dashboard',
    workflow_queue: 'Workflow Queue',
    evidence_ops: 'Evidence Operations',
    evidence_coverage: 'Evidence Coverage',
    assessment_dashboard: 'Assessment Dashboard',
    vendor_hub: 'Vendor Hub',
    bcp_dashboard: 'BCP Dashboard',
    ai_dashboard: 'AI Dashboard',
  };
  return names[code] || formatModuleName(code);
}

export function formatDashboardNameAr(code: string): string {
  const names: Record<string, string> = {
    executive: 'لوحة التحكم التنفيذية',
    compliance_ops: 'عمليات الامتثال',
    compliance_posture: 'وضع الامتثال',
    risk_register: 'سجل المخاطر',
    risk_heatmap: 'خريطة حرارية للمخاطر',
    security_posture: 'وضع الأمن',
    incident_dashboard: 'لوحة الحوادث',
    audit_dashboard: 'لوحة التدقيق',
    findings: 'النتائج',
    governance_dashboard: 'لوحة الحوكمة',
    workflow_queue: 'قائمة انتظار سير العمل',
    evidence_ops: 'عمليات الأدلة',
    evidence_coverage: 'تغطية الأدلة',
    assessment_dashboard: 'لوحة التقييم',
    vendor_hub: 'مركز الموردين',
    bcp_dashboard: 'لوحة استمرارية الأعمال',
    ai_dashboard: 'لوحة الذكاء الاصطناعي',
  };
  return names[code] || formatModuleNameAr(code);
}
