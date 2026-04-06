/**
 * Packaged module definitions: keywords (KW) per module, task, and role.
 * Single source for ownership verification, nav alignment, and discovery.
 */

import type { ModulePackage } from './module-package.types';

export const FOUNDATION_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'foundation',
  labelEn: 'Foundation',
  labelAr: 'الأساس',
  keywords: [
    'organization', 'business unit', 'department', 'location', 'users', 'roles', 'teams',
    'positions', 'committees', 'delegations', 'ownership', 'access review',
    'reference data', 'settings', 'structure', 'hierarchy', 'tenant',
  ],
  apiPrefixes: ['/api/foundation', '/api/foundation-governance', '/api/foundation/roles'],
  tasks: [
    { key: 'foundation-overview', labelEn: 'Overview', labelAr: 'نظرة عامة', route: '/foundation', permission: 'foundation.org.read', keywords: ['overview', 'dashboard', 'summary'] },
    { key: 'foundation-organization', labelEn: 'Organization', labelAr: 'المنظمة', route: '/foundation/organization', permission: 'foundation.org.read', keywords: ['organization', 'org', 'company'] },
    { key: 'foundation-business-units', labelEn: 'Business Units', labelAr: 'وحدات الأعمال', route: '/foundation/business-units', permission: 'foundation.org.read', keywords: ['business unit', 'bu', 'division'] },
    { key: 'foundation-departments', labelEn: 'Departments', labelAr: 'الأقسام', route: '/foundation/departments', permission: 'foundation.org.read', keywords: ['department', 'dept'] },
    { key: 'foundation-users', labelEn: 'Users', labelAr: 'المستخدمون', route: '/foundation/users', permission: 'foundation.org.read', keywords: ['users', 'accounts', 'identity'] },
    { key: 'foundation-roles', labelEn: 'Roles', labelAr: 'الأدوار', route: '/foundation/roles', permission: 'foundation.org.manage', keywords: ['roles', 'permissions', 'rbac'] },
    { key: 'foundation-teams', labelEn: 'Teams', labelAr: 'الفرق', route: '/foundation/teams', permission: 'foundation.org.read', keywords: ['teams', 'group'] },
    { key: 'foundation-locations', labelEn: 'Locations', labelAr: 'المواقع', route: '/foundation/locations', permission: 'foundation.org.read', keywords: ['locations', 'sites', 'offices'] },
    { key: 'foundation-positions', labelEn: 'Positions', labelAr: 'المناصب', route: '/foundation/positions', permission: 'foundation.org.read', keywords: ['positions', 'job title', 'grade'] },
    { key: 'foundation-committees', labelEn: 'Committees', labelAr: 'اللجان', route: '/foundation/committees', permission: 'foundation.org.read', keywords: ['committees', 'governance', 'quorum'] },
    { key: 'foundation-delegations', labelEn: 'Delegations', labelAr: 'التفويضات', route: '/foundation/delegations', permission: 'foundation.org.read', keywords: ['delegations', 'authority'] },
    { key: 'foundation-ownership-mapping', labelEn: 'Ownership Mapping', labelAr: 'خريطة الملكية', route: '/foundation/ownership-mapping', permission: 'foundation.org.read', keywords: ['ownership', 'owner'] },
    { key: 'foundation-access-review', labelEn: 'Access Review', labelAr: 'مراجعة الوصول', route: '/foundation/access-review', permission: 'foundation.org.read', keywords: ['access review', 'certification'] },
    { key: 'foundation-data-processing', labelEn: 'Data Processing', labelAr: 'معالجة البيانات', route: '/foundation/data-processing', permission: 'foundation.org.read', keywords: ['data processing', 'dpia'] },
    { key: 'foundation-reference-data', labelEn: 'Reference Data', labelAr: 'البيانات المرجعية', route: '/foundation/reference-data', permission: 'foundation.org.read', keywords: ['reference', 'lookup', 'master data'] },
    { key: 'foundation-audit-log', labelEn: 'Audit Log', labelAr: 'سجل التدقيق', route: '/foundation/audit', permission: 'foundation.org.read', keywords: ['audit log', 'activity'] },
    { key: 'foundation-settings', labelEn: 'Settings', labelAr: 'الإعدادات', route: '/foundation/settings', permission: 'foundation.org.manage', keywords: ['settings', 'config'] },
  ],
  roles: [
    { roleCode: 'tenant_admin', labelEn: 'Tenant Admin', labelAr: 'مدير المستأجر', keywords: ['admin', 'full access', 'tenant'] },
    { roleCode: 'admin', labelEn: 'Admin', labelAr: 'مدير', keywords: ['admin', 'manage'] },
    { roleCode: 'grc_manager', labelEn: 'GRC Manager', labelAr: 'مدير GRC', keywords: ['manager', 'grc', 'governance'] },
    { roleCode: 'compliance_lead', labelEn: 'Compliance Lead', labelAr: 'قائد الامتثال', keywords: ['compliance', 'lead'] },
    { roleCode: 'auditor', labelEn: 'Auditor', labelAr: 'مدقق', keywords: ['audit', 'read'] },
    { roleCode: 'viewer', labelEn: 'Viewer', labelAr: 'مشاهد', keywords: ['read-only', 'view'] },
  ],
};

const GOVERNANCE_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'governance', labelEn: 'Governance', labelAr: 'الحوكمة',
  keywords: ['governance', 'charter', 'committee', 'mandate', 'delegation', 'board', 'decision'],
  apiPrefixes: ['/api/governance'],
  tasks: [
    { key: 'governance-overview', labelEn: 'Overview', labelAr: 'نظرة عامة', route: '/governance/overview', permission: 'governance.record.read', keywords: ['overview'] },
    { key: 'governance-policies', labelEn: 'Policies', labelAr: 'السياسات', route: '/governance/policies', permission: 'policy.document.read', keywords: ['policy'] },
    { key: 'governance-procedures', labelEn: 'Procedures', labelAr: 'الإجراءات', route: '/governance/procedures', permission: 'policy.document.read', keywords: ['procedure'] },
    { key: 'governance-committees', labelEn: 'Committees', labelAr: 'اللجان', route: '/governance/committees', permission: 'governance.record.read', keywords: ['committee'] },
  ],
  roles: [
    { roleCode: 'grc_manager', labelEn: 'GRC Manager', labelAr: 'مدير GRC', keywords: ['manager', 'governance'] },
    { roleCode: 'compliance_lead', labelEn: 'Compliance Lead', labelAr: 'قائد الامتثال', keywords: ['compliance'] },
  ],
};

const RISK_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'risk', labelEn: 'Risk Management', labelAr: 'إدارة المخاطر',
  keywords: ['risk', 'threat', 'vulnerability', 'impact', 'likelihood', 'treatment', 'KRI', 'heatmap', 'appetite'],
  apiPrefixes: ['/api/risks'],
  tasks: [
    { key: 'risk-hub', labelEn: 'Risk Hub', labelAr: 'مركز المخاطر', route: '/risk-hub', permission: 'risk.record.read', keywords: ['risk', 'register', 'hub'] },
  ],
  roles: [
    { roleCode: 'risk_manager', labelEn: 'Risk Manager', labelAr: 'مدير المخاطر', keywords: ['risk', 'manager'] },
  ],
};

const COMPLIANCE_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'compliance', labelEn: 'Compliance', labelAr: 'الامتثال',
  keywords: ['compliance', 'framework', 'obligation', 'control', 'assessment', 'gap', 'NCA', 'SAMA', 'PDPL'],
  apiPrefixes: ['/api/compliance'],
  tasks: [
    { key: 'compliance-overview', labelEn: 'Overview', labelAr: 'نظرة عامة', route: '/compliance/overview', permission: 'compliance.program.read', keywords: ['overview'] },
    { key: 'compliance-frameworks', labelEn: 'Frameworks', labelAr: 'الأطر', route: '/compliance/frameworks', permission: 'framework.record.read', keywords: ['framework'] },
    { key: 'compliance-controls', labelEn: 'Controls', labelAr: 'الضوابط', route: '/compliance/controls', permission: 'control.record.read', keywords: ['control'] },
  ],
  roles: [
    { roleCode: 'compliance_lead', labelEn: 'Compliance Lead', labelAr: 'قائد الامتثال', keywords: ['compliance'] },
  ],
};

const EVIDENCE_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'evidence', labelEn: 'Evidence Management', labelAr: 'إدارة الأدلة',
  keywords: ['evidence', 'document', 'upload', 'review', 'retention', 'custody', 'attestation'],
  apiPrefixes: ['/api/evidence'],
  tasks: [
    { key: 'evidence-overview', labelEn: 'Evidence Overview', labelAr: 'نظرة عامة على الأدلة', route: '/evidence/overview', permission: 'evidence.item.read', keywords: ['evidence', 'overview'] },
  ],
  roles: [],
};

const AUDIT_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'audit', labelEn: 'Audit', labelAr: 'التدقيق',
  keywords: ['audit', 'finding', 'workpaper', 'scope', 'rating', 'follow-up'],
  apiPrefixes: ['/api/audit'],
  tasks: [
    { key: 'audit-overview', labelEn: 'Audit Overview', labelAr: 'نظرة عامة على التدقيق', route: '/audit/overview', permission: 'audit.record.read', keywords: ['audit', 'overview'] },
  ],
  roles: [
    { roleCode: 'auditor', labelEn: 'Auditor', labelAr: 'مدقق', keywords: ['audit'] },
    { roleCode: 'audit_manager', labelEn: 'Audit Manager', labelAr: 'مدير التدقيق', keywords: ['audit', 'manager'] },
  ],
};

const INCIDENT_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'incident', labelEn: 'Incident Management', labelAr: 'إدارة الحوادث',
  keywords: ['incident', 'severity', 'response', 'root cause', 'PIR', 'near miss'],
  apiPrefixes: ['/api/incidents'],
  tasks: [
    { key: 'incident-hub', labelEn: 'Incident Hub', labelAr: 'مركز الحوادث', route: '/incidents', permission: 'incident.record.read', keywords: ['incident'] },
  ],
  roles: [],
};

const VENDOR_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'vendor', labelEn: 'Vendor Management', labelAr: 'إدارة الموردين',
  keywords: ['vendor', 'third party', 'supplier', 'due diligence', 'onboarding', 'risk'],
  apiPrefixes: ['/api/vendors'],
  tasks: [
    { key: 'vendor-hub', labelEn: 'Vendor Hub', labelAr: 'مركز الموردين', route: '/vendor-hub', permission: 'vendor.record.read', keywords: ['vendor'] },
  ],
  roles: [],
};

const BCP_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'bcp', labelEn: 'Business Continuity', labelAr: 'استمرارية الأعمال',
  keywords: ['BCP', 'continuity', 'recovery', 'BIA', 'crisis', 'resilience', 'DR'],
  apiPrefixes: ['/api/bcp'],
  tasks: [
    { key: 'bcp-overview', labelEn: 'BCP Overview', labelAr: 'نظرة عامة على الاستمرارية', route: '/bcp/overview', permission: 'bcp.plan.read', keywords: ['bcp'] },
  ],
  roles: [],
};

const POLICY_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'policy', labelEn: 'Policy Management', labelAr: 'إدارة السياسات',
  keywords: ['policy', 'standard', 'procedure', 'version', 'acknowledgement', 'review cycle'],
  apiPrefixes: ['/api/policies'],
  tasks: [
    { key: 'policy-list', labelEn: 'Policies', labelAr: 'السياسات', route: '/governance/policies', permission: 'policy.document.read', keywords: ['policy', 'list'] },
  ],
  roles: [],
};

const EXCEPTION_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'exception', labelEn: 'Exception Management', labelAr: 'إدارة الاستثناءات',
  keywords: ['exception', 'deviation', 'waiver', 'compensating control', 'expiry'],
  apiPrefixes: ['/api/exceptions'],
  tasks: [
    { key: 'exception-list', labelEn: 'Exceptions', labelAr: 'الاستثناءات', route: '/exceptions', permission: 'exception.record.read', keywords: ['exception'] },
  ],
  roles: [],
};

const ASSET_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'asset', labelEn: 'Asset Management', labelAr: 'إدارة الأصول',
  keywords: ['asset', 'inventory', 'classification', 'criticality', 'ownership'],
  apiPrefixes: ['/api/assets'],
  tasks: [
    { key: 'asset-list', labelEn: 'Assets', labelAr: 'الأصول', route: '/assets', permission: 'asset.record.read', keywords: ['asset'] },
  ],
  roles: [],
};

const REMEDIATION_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'remediation', labelEn: 'Remediation', labelAr: 'المعالجة',
  keywords: ['remediation', 'action plan', 'fix', 'closure', 'SLA'],
  apiPrefixes: ['/api/remediation'],
  tasks: [
    { key: 'remediation-list', labelEn: 'Remediations', labelAr: 'خطط المعالجة', route: '/remediation', permission: 'remediation.task.read', keywords: ['remediation'] },
  ],
  roles: [],
};

const ACTION_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'action', labelEn: 'Action Items', labelAr: 'بنود العمل',
  keywords: ['action', 'task', 'follow-up', 'assignment', 'due date'],
  apiPrefixes: ['/api/action-items'],
  tasks: [
    { key: 'action-list', labelEn: 'Actions', labelAr: 'الإجراءات', route: '/action-items', permission: 'action.item.read', keywords: ['action'] },
  ],
  roles: [],
};

const TRAINING_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'training', labelEn: 'Training & Awareness', labelAr: 'التدريب والتوعية',
  keywords: ['training', 'awareness', 'campaign', 'certification', 'phishing'],
  apiPrefixes: ['/api/training'],
  tasks: [
    { key: 'training-overview', labelEn: 'Training', labelAr: 'التدريب', route: '/training', permission: 'training.record.read', keywords: ['training'] },
  ],
  roles: [],
};

const QIYAS_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'qiyas', labelEn: 'Qiyas Assessment', labelAr: 'تقييم قياس',
  keywords: ['qiyas', 'assessment', 'maturity', 'benchmark', 'scorecard'],
  apiPrefixes: ['/api/qiyas'],
  tasks: [
    { key: 'qiyas-overview', labelEn: 'Qiyas', labelAr: 'قياس', route: '/qiyas', permission: 'qiyas.assessment.read', keywords: ['qiyas', 'assessment'] },
  ],
  roles: [],
};

const REPORTING_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'reporting', labelEn: 'Reporting', labelAr: 'التقارير',
  keywords: ['report', 'board pack', 'export', 'schedule', 'PDF', 'Excel'],
  apiPrefixes: ['/api/reports'],
  tasks: [
    { key: 'reporting-hub', labelEn: 'Reports', labelAr: 'التقارير', route: '/reports', permission: 'reporting.report.read', keywords: ['report'] },
  ],
  roles: [],
};

const ANALYTICS_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'analytics', labelEn: 'Analytics & KPIs', labelAr: 'التحليلات ومؤشرات الأداء',
  keywords: ['analytics', 'KPI', 'KRI', 'dashboard', 'trend', 'metric'],
  apiPrefixes: ['/api/analytics'],
  tasks: [
    { key: 'analytics-dashboard', labelEn: 'Analytics', labelAr: 'التحليلات', route: '/analytics', permission: 'analytics.report.read', keywords: ['analytics'] },
  ],
  roles: [],
};

const ISSUES_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'issues', labelEn: 'Issue Tracking', labelAr: 'تتبع المشكلات',
  keywords: ['issue', 'finding', 'defect', 'root cause', 'severity'],
  apiPrefixes: ['/api/issues'],
  tasks: [
    { key: 'issues-list', labelEn: 'Issues', labelAr: 'المشكلات', route: '/issues', permission: 'issues.record.read', keywords: ['issue'] },
  ],
  roles: [],
};

const PRIVACY_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'privacy', labelEn: 'Privacy & PDPL', labelAr: 'الخصوصية ونظام حماية البيانات',
  keywords: ['privacy', 'PDPL', 'DPIA', 'data protection', 'consent', 'DSAR'],
  apiPrefixes: ['/api/privacy'],
  tasks: [
    { key: 'privacy-overview', labelEn: 'Privacy', labelAr: 'الخصوصية', route: '/privacy', permission: 'privacy.record.read', keywords: ['privacy', 'PDPL'] },
  ],
  roles: [],
};

const AI_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'ai', labelEn: 'AI Agents & Copilot', labelAr: 'وكلاء الذكاء الاصطناعي',
  keywords: ['AI', 'agent', 'copilot', 'LLM', 'chat', 'automation'],
  apiPrefixes: ['/api/ai'],
  tasks: [
    { key: 'ai-copilot', labelEn: 'AI Copilot', labelAr: 'مساعد الذكاء الاصطناعي', route: '/ai', permission: 'ai.agent.read', keywords: ['ai', 'copilot'] },
  ],
  roles: [],
};

const AI_GOVERNANCE_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'ai-governance', labelEn: 'AI Governance', labelAr: 'حوكمة الذكاء الاصطناعي',
  keywords: ['AI governance', 'model risk', 'AI registry', 'monitoring', 'bias'],
  apiPrefixes: ['/api/ai-governance'],
  tasks: [
    { key: 'ai-governance-overview', labelEn: 'AI Governance', labelAr: 'حوكمة AI', route: '/ai-governance', permission: 'ai.agent.read', keywords: ['ai governance'] },
  ],
  roles: [],
};

const ADMIN_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'admin', labelEn: 'Administration', labelAr: 'الإدارة',
  keywords: ['admin', 'system', 'configuration', 'tenant', 'platform'],
  apiPrefixes: ['/api/admin'],
  tasks: [
    { key: 'admin-panel', labelEn: 'Admin Panel', labelAr: 'لوحة الإدارة', route: '/admin', permission: 'admin.system.read', keywords: ['admin'] },
  ],
  roles: [
    { roleCode: 'tenant_admin', labelEn: 'Tenant Admin', labelAr: 'مدير المستأجر', keywords: ['admin'] },
  ],
};

const WORKFLOW_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'workflow', labelEn: 'Workflows & Automation', labelAr: 'سير العمل والأتمتة',
  keywords: ['workflow', 'automation', 'state machine', 'approval', 'SLA', 'task'],
  apiPrefixes: ['/api/workflows'],
  tasks: [
    { key: 'workflow-list', labelEn: 'Workflows', labelAr: 'سير العمل', route: '/workflows', permission: 'workflow.instance.read', keywords: ['workflow'] },
  ],
  roles: [],
};

const NOTIFICATION_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'notification', labelEn: 'Notifications', labelAr: 'الإشعارات',
  keywords: ['notification', 'alert', 'email', 'push', 'reminder'],
  apiPrefixes: ['/api/notifications'],
  tasks: [],
  roles: [],
};

const TEAM_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'team', labelEn: 'Teams', labelAr: 'الفرق',
  keywords: ['team', 'group', 'member', 'collaboration'],
  apiPrefixes: ['/api/teams'],
  tasks: [],
  roles: [],
};

const INBOX_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'inbox', labelEn: 'Inbox & Messages', labelAr: 'البريد والرسائل',
  keywords: ['inbox', 'message', 'task', 'approval', 'notification'],
  apiPrefixes: ['/api/inbox'],
  tasks: [],
  roles: [],
};

const INTEGRATIONS_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'integrations', labelEn: 'Integrations', labelAr: 'التكاملات',
  keywords: ['integration', 'connector', 'API', 'sync', 'webhook'],
  apiPrefixes: ['/api/integrations'],
  tasks: [],
  roles: [],
};

const PORTALS_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'portals', labelEn: 'External Portals', labelAr: 'البوابات الخارجية',
  keywords: ['portal', 'external', 'vendor portal', 'regulator portal'],
  apiPrefixes: ['/api/portals'],
  tasks: [],
  roles: [],
};

const RECORDS_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'records', labelEn: 'Records Management', labelAr: 'إدارة السجلات',
  keywords: ['record', 'retention', 'archive', 'lifecycle'],
  apiPrefixes: ['/api/records'],
  tasks: [],
  roles: [],
};

const CONTROLS_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'controls', labelEn: 'Controls Management', labelAr: 'إدارة الضوابط',
  keywords: ['control', 'testing', 'certification', 'deficiency', 'effectiveness', 'monitoring'],
  apiPrefixes: ['/api/controls'],
  tasks: [
    { key: 'controls-list', labelEn: 'Controls', labelAr: 'الضوابط', route: '/controls', permission: 'control.record.read', keywords: ['control'] },
  ],
  roles: [],
};

const ONBOARDING_MODULE_PACKAGE: ModulePackage = {
  moduleCode: 'onboarding', labelEn: 'Tenant Onboarding', labelAr: 'تأهيل المستأجر',
  keywords: ['onboarding', 'setup', 'wizard', 'provisioning', 'getting started'],
  apiPrefixes: ['/api/onboarding'],
  tasks: [],
  roles: [],
};

const MODULE_PACKAGES = new Map<string, ModulePackage>([
  ['foundation', FOUNDATION_MODULE_PACKAGE],
  ['governance', GOVERNANCE_MODULE_PACKAGE],
  ['risk', RISK_MODULE_PACKAGE],
  ['compliance', COMPLIANCE_MODULE_PACKAGE],
  ['evidence', EVIDENCE_MODULE_PACKAGE],
  ['audit', AUDIT_MODULE_PACKAGE],
  ['incident', INCIDENT_MODULE_PACKAGE],
  ['vendor', VENDOR_MODULE_PACKAGE],
  ['bcp', BCP_MODULE_PACKAGE],
  ['policy', POLICY_MODULE_PACKAGE],
  ['exception', EXCEPTION_MODULE_PACKAGE],
  ['asset', ASSET_MODULE_PACKAGE],
  ['remediation', REMEDIATION_MODULE_PACKAGE],
  ['action', ACTION_MODULE_PACKAGE],
  ['training', TRAINING_MODULE_PACKAGE],
  ['qiyas', QIYAS_MODULE_PACKAGE],
  ['reporting', REPORTING_MODULE_PACKAGE],
  ['analytics', ANALYTICS_MODULE_PACKAGE],
  ['issues', ISSUES_MODULE_PACKAGE],
  ['privacy', PRIVACY_MODULE_PACKAGE],
  ['ai', AI_MODULE_PACKAGE],
  ['ai-governance', AI_GOVERNANCE_MODULE_PACKAGE],
  ['admin', ADMIN_MODULE_PACKAGE],
  ['workflow', WORKFLOW_MODULE_PACKAGE],
  ['notification', NOTIFICATION_MODULE_PACKAGE],
  ['team', TEAM_MODULE_PACKAGE],
  ['inbox', INBOX_MODULE_PACKAGE],
  ['integrations', INTEGRATIONS_MODULE_PACKAGE],
  ['portals', PORTALS_MODULE_PACKAGE],
  ['records', RECORDS_MODULE_PACKAGE],
  ['controls', CONTROLS_MODULE_PACKAGE],
  ['onboarding', ONBOARDING_MODULE_PACKAGE],
]);

/**
 * Returns the packaged definition for a module, if any.
 */
export function getModulePackage(moduleCode: string): ModulePackage | undefined {
  return MODULE_PACKAGES.get(moduleCode);
}

/**
 * All registered module package codes.
 */
export function getModulePackageCodes(): string[] {
  return Array.from(MODULE_PACKAGES.keys());
}
