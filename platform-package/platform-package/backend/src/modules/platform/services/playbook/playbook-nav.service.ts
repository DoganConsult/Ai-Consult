/**
 * Playbook Navigation — ALL_NAV_ITEMS, MODULE_I18N, and computeModuleMap.
 *
 * Requirements: 1.1, 2.1, 2.2
 */

type UserRole = string;
import { ModuleEntry } from '../../../agrc-engine/services/engine/playbook.types';
import { NavItemDef, hasPermission } from './playbook-permissions.service';

// ─── ALL_NAV_ITEMS (mirrors frontend sidebar.component.ts) ───

export const ALL_NAV_ITEMS: NavItemDef[] = [
  // Plan
  { icon: 'dashboard', labelKey: 'nav.dashboard', route: '/workspace-home', requiredPermission: 'workspace.config.read', section: 'main', lifecyclePhase: 'plan' },
  { icon: 'governance', labelKey: 'nav.governance', route: '/governance', requiredPermission: 'policy.document.read', section: 'grc', lifecyclePhase: 'plan' },
  { icon: 'frameworks', labelKey: 'nav.frameworks', route: '/frameworks', requiredPermission: 'framework.record.read', section: 'grc', lifecyclePhase: 'plan' },
  // Assess
  { icon: 'risks', labelKey: 'nav.risks', route: '/risks', requiredPermission: 'risk.record.read', section: 'grc', lifecyclePhase: 'assess' },
  { icon: 'maturity', labelKey: 'sidebar.maturity', route: '/maturity', requiredPermission: 'assessment.record.read', section: 'grc', lifecyclePhase: 'assess' },
  { icon: 'vendors', labelKey: 'nav.vendors', route: '/vendors', requiredPermission: 'risk.record.read', section: 'operations', lifecyclePhase: 'assess' },
  // Design
  { icon: 'policies', labelKey: 'nav.policies', route: '/policies', requiredPermission: 'policy.document.read', section: 'grc', lifecyclePhase: 'design' },
  { icon: 'controls', labelKey: 'nav.controls', route: '/controls', requiredPermission: 'control.record.read', section: 'grc', lifecyclePhase: 'design' },
  // Implement
  { icon: 'compliance', labelKey: 'nav.compliance', route: '/compliance', requiredPermission: 'framework.record.read', section: 'grc', lifecyclePhase: 'implement' },
  { icon: 'evidence', labelKey: 'nav.evidence', route: '/evidence', requiredPermission: 'framework.record.read', section: 'grc', lifecyclePhase: 'implement' },
  { icon: 'ucf-browser', labelKey: 'grcOs.ucf', route: '/ucf-browser', requiredPermission: 'framework.record.read', section: 'grc', lifecyclePhase: 'implement' },
  { icon: 'control-lifecycle', labelKey: 'grcOs.controlLifecycle', route: '/control-lifecycle', requiredPermission: 'control.record.read', section: 'grc', lifecyclePhase: 'implement' },
  { icon: 'evidence-catalog', labelKey: 'grcOs.evidenceCatalog', route: '/evidence-catalog', requiredPermission: 'framework.record.read', section: 'grc', lifecyclePhase: 'implement' },
  { icon: 'connector-health', labelKey: 'grcOs.connectors', route: '/connector-health', requiredPermission: 'framework.record.read', section: 'grc', lifecyclePhase: 'implement' },
  // Operate
  { icon: 'incidents', labelKey: 'nav.incidents', route: '/incidents', requiredPermission: 'risk.record.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'exceptions', labelKey: 'sidebar.exceptions', route: '/exceptions', requiredPermission: 'workspace.config.read', section: 'grc', lifecyclePhase: 'operate' },
  { icon: 'exception-manager', labelKey: 'grcOs.exceptions', route: '/exception-manager', requiredPermission: 'workspace.config.read', section: 'grc', lifecyclePhase: 'operate' },
  { icon: 'cadence-calendar', labelKey: 'grcOs.cadence', route: '/cadence-calendar', requiredPermission: 'workspace.config.read', section: 'grc', lifecyclePhase: 'operate' },
  { icon: 'bcp', labelKey: 'nav.bcp', route: '/bcp', requiredPermission: 'risk.record.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'privacy-ops', labelKey: 'grcOs.privacy', route: '/privacy-ops', requiredPermission: 'policy.document.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'vendor-risk', labelKey: 'grcOs.vendorRisk', route: '/vendor-risk', requiredPermission: 'risk.record.read', section: 'operations', lifecyclePhase: 'operate' },
  // Assure
  { icon: 'nca-assessment', labelKey: 'sidebar.ncaAssessment', route: '/nca-assessment', requiredPermission: 'assessment.record.read', section: 'grc', lifecyclePhase: 'assure' },
  { icon: 'assessment-templates', labelKey: 'grcOs.assessmentTemplates', route: '/assessment-templates', requiredPermission: 'assessment.record.read', section: 'grc', lifecyclePhase: 'assure' },
  { icon: 'audit', labelKey: 'nav.audit', route: '/audit', requiredPermission: 'audit.record.read', section: 'operations', lifecyclePhase: 'assure' },
  { icon: 'findings', labelKey: 'sidebar.findings', route: '/findings', requiredPermission: 'workspace.config.read', section: 'grc', lifecyclePhase: 'assure' },
  { icon: 'assets', labelKey: 'sidebar.assets', route: '/assets', requiredPermission: 'workspace.config.read', section: 'operations', lifecyclePhase: 'assure' },
  { icon: 'registry', labelKey: 'nav.registry', route: '/registry', requiredPermission: 'framework.record.read', section: 'intelligence', lifecyclePhase: 'assure' },
  { icon: 'regulator-heatmap', labelKey: 'sidebar.regulatorHeatmap', route: '/regulator-heatmap', requiredPermission: 'compliance.program.read', section: 'intelligence', lifecyclePhase: 'assure' },
  { icon: 'framework-mapping', labelKey: 'sidebar.frameworkMapping', route: '/framework-mapping', requiredPermission: 'framework.record.read', section: 'intelligence', lifecyclePhase: 'assure' },
  // Improve
  { icon: 'dpia', labelKey: 'sidebar.dpia', route: '/dpia', requiredPermission: 'assessment.record.read', section: 'grc', lifecyclePhase: 'improve' },
  { icon: 'risk-scoring', labelKey: 'grcOs.riskScoring', route: '/risk-scoring', requiredPermission: 'risk.record.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'report-center', labelKey: 'sidebar.reportCenter', route: '/report-center', requiredPermission: 'report.document.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'report-builder', labelKey: 'grcOs.reportBuilder', route: '/report-builder', requiredPermission: 'report.document.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'workflows', labelKey: 'nav.workflows', route: '/workflows', requiredPermission: 'policy.document.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'automation', labelKey: 'sidebar.automation', route: '/automation', requiredPermission: 'workflow.instance.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'digital-twin', labelKey: 'sidebar.digitalTwin', route: '/digital-twin', requiredPermission: 'ai.governance.read', section: 'advanced', lifecyclePhase: 'improve' },
  { icon: 'red-team', labelKey: 'sidebar.redTeam', route: '/red-team', requiredPermission: 'ai.governance.read', section: 'advanced', lifecyclePhase: 'improve' },
  { icon: 'ai-hub', labelKey: 'sidebar.aiHub', route: '/ai-hub', requiredPermission: 'copilot.assistant.read', section: 'intelligence', lifecyclePhase: 'improve' },
  // Account
  { icon: 'team', labelKey: 'sidebar.team', route: '/team', requiredPermission: 'workspace.config.read', section: 'account', lifecyclePhase: 'account' },
  { icon: 'team-management', labelKey: 'grcOs.teams', route: '/team-management', requiredPermission: 'workspace.config.read', section: 'account', lifecyclePhase: 'account' },
  { icon: 'profile', labelKey: 'nav.profile', route: '/profile', requiredPermission: 'foundation.org.read', section: 'account', lifecyclePhase: 'account' },
  { icon: 'tenant-config', labelKey: 'grcOs.tenantConfig', route: '/tenant-config', requiredPermission: 'admin.system.read', section: 'account', lifecyclePhase: 'account' },
  { icon: 'tier-management', labelKey: 'grcOs.tierUpgrade', route: '/tier-management', requiredPermission: 'admin.system.read', section: 'account', lifecyclePhase: 'account' },
  // Competitive Edge — Operate
  { icon: 'timeline', labelKey: 'timeline.title', route: '/timeline', requiredPermission: 'timeline.event.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'task-board', labelKey: 'taskBoard.title', route: '/task-board', requiredPermission: 'task.item.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'messaging', labelKey: 'messaging.title', route: '/messaging', requiredPermission: 'messaging.channel.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'action-items', labelKey: 'actionItems.title', route: '/action-items', requiredPermission: 'action.item.read', section: 'operations', lifecyclePhase: 'operate' },
  // Competitive Edge — Account
  { icon: 'training-data', labelKey: 'trainingData.title', route: '/training-data', requiredPermission: 'training.record.read', section: 'account', lifecyclePhase: 'account' },
  // Frontend Integration
  { icon: 'role-profiles', labelKey: 'nav.roleProfiles', route: '/role-profiles', requiredPermission: 'admin.system.write', section: 'account', lifecyclePhase: 'account' },
  { icon: 'workflow-templates', labelKey: 'nav.workflowTemplates', route: '/workflow-templates', requiredPermission: 'policy.document.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'admin', labelKey: 'nav.admin', route: '/admin', requiredPermission: 'admin.system.read', section: 'account', lifecyclePhase: 'account' },
  // Gap Closure
  { icon: 'integrations', labelKey: 'sidebar.integrations', route: '/integrations', requiredPermission: 'integrations.connector.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'remediation', labelKey: 'sidebar.remediation', route: '/remediation', requiredPermission: 'risk.record.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'notifications', labelKey: 'sidebar.notificationCenter', route: '/notifications', requiredPermission: 'notification.config.read', section: 'account', lifecyclePhase: 'account' },
  { icon: 'audit-trail', labelKey: 'sidebar.auditTrail', route: '/audit-trail', requiredPermission: 'audit.record.read', section: 'operations', lifecyclePhase: 'assure' },
  { icon: 'scoring-policies', labelKey: 'sidebar.scoringPolicies', route: '/scoring-policies', requiredPermission: 'compliance.program.read', section: 'intelligence', lifecyclePhase: 'improve' },
  // Gap Closure — Backend API pages
  { icon: 'activity-feed', labelKey: 'sidebar.activityFeed', route: '/activity-feed', requiredPermission: 'workspace.config.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'ai-trigger', labelKey: 'sidebar.aiTrigger', route: '/ai-trigger', requiredPermission: 'ai.agent.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'autonomy', labelKey: 'sidebar.autonomy', route: '/autonomy-engine', requiredPermission: 'ai.agent.read', section: 'advanced', lifecyclePhase: 'improve' },
  { icon: 'content-pack', labelKey: 'sidebar.contentPacks', route: '/content-packs', requiredPermission: 'framework.record.read', section: 'intelligence', lifecyclePhase: 'implement' },
  { icon: 'contract-tests', labelKey: 'sidebar.contractTests', route: '/contract-tests', requiredPermission: 'admin.system.read', section: 'advanced', lifecyclePhase: 'assure' },
  { icon: 'entity-link', labelKey: 'sidebar.entityLinks', route: '/entity-links', requiredPermission: 'workspace.config.read', section: 'intelligence', lifecyclePhase: 'implement' },
  { icon: 'explainability', labelKey: 'sidebar.explainability', route: '/explainability', requiredPermission: 'ai.agent.read', section: 'advanced', lifecyclePhase: 'improve' },
  { icon: 'global-search', labelKey: 'sidebar.globalSearch', route: '/global-search', requiredPermission: 'workspace.config.read', section: 'main', lifecyclePhase: 'plan' },
  { icon: 'ksa-hub', labelKey: 'sidebar.ksaHub', route: '/ksa-hub', requiredPermission: 'framework.record.read', section: 'intelligence', lifecyclePhase: 'assure' },
  { icon: 'mapping', labelKey: 'sidebar.mappings', route: '/mappings', requiredPermission: 'framework.record.read', section: 'intelligence', lifecyclePhase: 'implement' },
  { icon: 'privacy-budget', labelKey: 'sidebar.privacyBudget', route: '/privacy-budget', requiredPermission: 'policy.document.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'report-scenario', labelKey: 'sidebar.reportScenarios', route: '/report-scenarios', requiredPermission: 'report.document.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'public-explorer', labelKey: 'sidebar.publicExplorer', route: '/public-explorer', requiredPermission: 'workspace.config.read', section: 'intelligence', lifecyclePhase: 'assure' },
  // Autonomous GRC / AI Squad
  { icon: 'ai-squad', labelKey: 'sidebar.aiSquad', route: '/ai-squad', requiredPermission: 'ai.squad.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'ai-queue', labelKey: 'sidebar.aiQueue', route: '/ai-queue', requiredPermission: 'workflow.autonomous.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'autonomous-config', labelKey: 'sidebar.autonomousConfig', route: '/autonomous-config', requiredPermission: 'workflow.autonomous.config', section: 'account', lifecyclePhase: 'account' },
];


// ─── Bilingual name/description lookup for nav items ───

/** Maps labelKey → { name_en, name_ar, description_en, description_ar } */
export const MODULE_I18N: Record<string, { name_en: string; name_ar: string; description_en: string; description_ar: string }> = {
  // Plan
  'nav.dashboard':            { name_en: 'Dashboard',               name_ar: 'لوحة التحكم',              description_en: 'Central overview of your GRC posture with key metrics and alerts',                    description_ar: 'نظرة عامة مركزية على وضع الحوكمة والمخاطر والامتثال مع المقاييس والتنبيهات الرئيسية' },
  'nav.governance':           { name_en: 'Governance',              name_ar: 'الحوكمة',                  description_en: 'Manage organizational governance policies and structures',                            description_ar: 'إدارة سياسات وهياكل الحوكمة المؤسسية' },
  'nav.frameworks':           { name_en: 'Frameworks',              name_ar: 'الأطر التنظيمية',          description_en: 'Browse and manage regulatory and compliance frameworks',                               description_ar: 'تصفح وإدارة الأطر التنظيمية والامتثال' },
  // Assess
  'nav.risks':                { name_en: 'Risks',                   name_ar: 'المخاطر',                  description_en: 'Identify, assess, and track organizational risks',                                    description_ar: 'تحديد وتقييم وتتبع المخاطر المؤسسية' },
  'sidebar.maturity':         { name_en: 'Maturity Assessment',     name_ar: 'تقييم النضج',              description_en: 'Evaluate organizational maturity across GRC domains',                                 description_ar: 'تقييم نضج المؤسسة عبر مجالات الحوكمة والمخاطر والامتثال' },
  'nav.vendors':              { name_en: 'Vendors',                 name_ar: 'الموردون',                 description_en: 'Manage vendor relationships and third-party risk',                                    description_ar: 'إدارة علاقات الموردين ومخاطر الأطراف الثالثة' },
  // Design
  'nav.policies':             { name_en: 'Policies',                name_ar: 'السياسات',                 description_en: 'Create, review, and manage organizational policies',                                  description_ar: 'إنشاء ومراجعة وإدارة السياسات المؤسسية' },
  'nav.controls':             { name_en: 'Controls',                name_ar: 'الضوابط',                  description_en: 'Design and manage security and compliance controls',                                  description_ar: 'تصميم وإدارة ضوابط الأمان والامتثال' },
  // Implement
  'nav.compliance':           { name_en: 'Compliance',              name_ar: 'الامتثال',                 description_en: 'Track compliance status against regulatory requirements',                              description_ar: 'تتبع حالة الامتثال مقابل المتطلبات التنظيمية' },
  'nav.evidence':             { name_en: 'Evidence',                name_ar: 'الأدلة',                   description_en: 'Collect and manage compliance evidence with integrity verification',                   description_ar: 'جمع وإدارة أدلة الامتثال مع التحقق من السلامة' },
  'grcOs.ucf':                { name_en: 'Unified Control Framework', name_ar: 'إطار الضوابط الموحد',   description_en: 'Browse the unified control framework and crosswalk mappings',                          description_ar: 'تصفح إطار الضوابط الموحد وربط الأطر' },
  'grcOs.controlLifecycle':   { name_en: 'Control Lifecycle',       name_ar: 'دورة حياة الضابط',        description_en: 'Manage controls through their full lifecycle from draft to retirement',                description_ar: 'إدارة الضوابط عبر دورة حياتها الكاملة من المسودة إلى التقاعد' },
  'grcOs.evidenceCatalog':    { name_en: 'Evidence Catalog',        name_ar: 'فهرس الأدلة',             description_en: 'Catalog of evidence types with quality gates and completeness tracking',              description_ar: 'فهرس أنواع الأدلة مع بوابات الجودة وتتبع الاكتمال' },
  'grcOs.connectors':         { name_en: 'Connectors',              name_ar: 'الموصلات',                 description_en: 'Monitor and manage data collection connectors',                                       description_ar: 'مراقبة وإدارة موصلات جمع البيانات' },
  // Operate
  'nav.incidents':            { name_en: 'Incidents',               name_ar: 'الحوادث',                  description_en: 'Report and manage security and compliance incidents',                                 description_ar: 'الإبلاغ عن حوادث الأمان والامتثال وإدارتها' },
  'sidebar.exceptions':       { name_en: 'Exceptions',              name_ar: 'الاستثناءات',              description_en: 'Manage compliance exceptions and waivers',                                            description_ar: 'إدارة استثناءات الامتثال والإعفاءات' },
  'grcOs.exceptions':         { name_en: 'Exception Manager',       name_ar: 'مدير الاستثناءات',        description_en: 'Request, approve, and track compliance exceptions',                                   description_ar: 'طلب واعتماد وتتبع استثناءات الامتثال' },
  'grcOs.cadence':            { name_en: 'Operating Cadence',       name_ar: 'إيقاع التشغيل',           description_en: 'Schedule and track recurring GRC tasks and reviews',                                  description_ar: 'جدولة وتتبع مهام ومراجعات الحوكمة والمخاطر والامتثال المتكررة' },
  'nav.bcp':                  { name_en: 'Business Continuity',     name_ar: 'استمرارية الأعمال',        description_en: 'Plan and manage business continuity and disaster recovery',                            description_ar: 'تخطيط وإدارة استمرارية الأعمال والتعافي من الكوارث' },
  'grcOs.privacy':            { name_en: 'Privacy Operations',      name_ar: 'عمليات الخصوصية',          description_en: 'Manage privacy operations including RoPA, DSR, and consent',                           description_ar: 'إدارة عمليات الخصوصية بما في ذلك سجل المعالجة وطلبات أصحاب البيانات والموافقة' },
  'grcOs.vendorRisk':         { name_en: 'Vendor Risk',             name_ar: 'مخاطر الموردين',           description_en: 'Assess and monitor vendor risk with tiered classification',                            description_ar: 'تقييم ومراقبة مخاطر الموردين مع التصنيف المتدرج' },
  // Assure
  'sidebar.ncaAssessment':    { name_en: 'NCA ECC Assessment',      name_ar: 'تقييم NCA ECC',           description_en: 'Conduct NCA Essential Cybersecurity Controls assessments',                             description_ar: 'إجراء تقييمات ضوابط الأمن السيبراني الأساسية للهيئة الوطنية' },
  'grcOs.assessmentTemplates':{ name_en: 'Assessment Templates',    name_ar: 'قوالب التقييم',            description_en: 'Pre-built assessment templates with AI-guided scoring',                                description_ar: 'قوالب تقييم جاهزة مع تقييم موجه بالذكاء الاصطناعي' },
  'nav.audit':                { name_en: 'Audit',                   name_ar: 'التدقيق',                  description_en: 'Plan and execute audits with findings and evidence tracking',                          description_ar: 'تخطيط وتنفيذ عمليات التدقيق مع تتبع النتائج والأدلة' },
  'sidebar.findings':         { name_en: 'Findings',                name_ar: 'النتائج',                  description_en: 'Track audit findings and remediation status',                                         description_ar: 'تتبع نتائج التدقيق وحالة المعالجة' },
  'sidebar.assets':           { name_en: 'Asset Inventory',         name_ar: 'جرد الأصول',               description_en: 'Track and manage organizational assets',                                              description_ar: 'تتبع وإدارة أصول المؤسسة' },
  'nav.registry':             { name_en: 'Regulatory Registry',     name_ar: 'السجل التنظيمي',           description_en: 'Browse the regulatory registry of KSA and international standards',                    description_ar: 'تصفح السجل التنظيمي للمعايير السعودية والدولية' },
  'sidebar.regulatorHeatmap': { name_en: 'Regulator Heatmap',       name_ar: 'خريطة الجهات التنظيمية',  description_en: 'Visual heatmap of regulatory compliance across authorities',                           description_ar: 'خريطة حرارية مرئية للامتثال التنظيمي عبر الجهات' },
  'sidebar.frameworkMapping':  { name_en: 'Framework Mapping',       name_ar: 'ربط الأطر التنظيمية',     description_en: 'Map and compare controls across multiple frameworks',                                  description_ar: 'ربط ومقارنة الضوابط عبر أطر متعددة' },
  // Improve
  'sidebar.dpia':             { name_en: 'PDPL DPIA',               name_ar: 'تقييم أثر حماية البيانات', description_en: 'Conduct Data Protection Impact Assessments per PDPL',                                  description_ar: 'إجراء تقييمات أثر حماية البيانات وفقاً لنظام حماية البيانات الشخصية' },
  'grcOs.riskScoring':        { name_en: 'Risk Scoring',            name_ar: 'تسجيل المخاطر',            description_en: 'Configure risk scoring models and view KRI trends',                                   description_ar: 'تكوين نماذج تسجيل المخاطر وعرض اتجاهات مؤشرات المخاطر' },
  'sidebar.reportCenter':     { name_en: 'Report Center',           name_ar: 'مركز التقارير',            description_en: 'Generate and schedule compliance and risk reports',                                    description_ar: 'إنشاء وجدولة تقارير الامتثال والمخاطر' },
  'grcOs.reportBuilder':      { name_en: 'Report Builder',          name_ar: 'منشئ التقارير',            description_en: 'Build custom reports with templates and scheduling',                                   description_ar: 'إنشاء تقارير مخصصة مع القوالب والجدولة' },
  'nav.workflows':            { name_en: 'Workflows',               name_ar: 'سير العمل',                description_en: 'Design and manage approval and review workflows',                                     description_ar: 'تصميم وإدارة سير عمل الاعتماد والمراجعة' },
  'sidebar.automation':       { name_en: 'Automation Engine',       name_ar: 'محرك الأتمتة',             description_en: 'Automate recurring GRC tasks and workflows',                                          description_ar: 'أتمتة مهام وسير عمل الحوكمة والمخاطر والامتثال المتكررة' },
  'sidebar.digitalTwin':      { name_en: 'Digital Twin',            name_ar: 'التوأم الرقمي',            description_en: 'Simulate compliance scenarios with a digital twin of your organization',               description_ar: 'محاكاة سيناريوهات الامتثال مع توأم رقمي لمؤسستك' },
  'sidebar.redTeam':          { name_en: 'Red Team',                name_ar: 'الفريق الأحمر',            description_en: 'Run adversarial simulations to test your GRC posture',                                 description_ar: 'تشغيل محاكاة عدائية لاختبار وضع الحوكمة والمخاطر والامتثال' },
  'sidebar.aiHub':            { name_en: 'AI Hub',                  name_ar: 'مركز الذكاء الاصطناعي',   description_en: 'Access AI-powered copilot and intelligent GRC assistance',                             description_ar: 'الوصول إلى المساعد الذكي ومساعدة الحوكمة والمخاطر والامتثال بالذكاء الاصطناعي' },
  // Account
  'sidebar.team':             { name_en: 'Team & Org',              name_ar: 'الفريق والمنظمة',          description_en: 'Manage team members and organizational structure',                                     description_ar: 'إدارة أعضاء الفريق والهيكل التنظيمي' },
  'grcOs.teams':              { name_en: 'Team Management',         name_ar: 'إدارة الفرق',              description_en: 'Manage teams, members, and workload balance',                                         description_ar: 'إدارة الفرق والأعضاء وتوازن عبء العمل' },
  'nav.profile':              { name_en: 'Profile',                 name_ar: 'الملف الشخصي',             description_en: 'View and edit your user profile and preferences',                                     description_ar: 'عرض وتعديل ملفك الشخصي وتفضيلاتك' },
  'grcOs.tenantConfig':       { name_en: 'Tenant Configuration',    name_ar: 'إعدادات المؤسسة',          description_en: 'Configure organization structure, RACI matrix, and settings',                          description_ar: 'تكوين الهيكل التنظيمي ومصفوفة المسؤوليات والإعدادات' },
  'grcOs.tierUpgrade':        { name_en: 'Upgrade Tier',            name_ar: 'ترقية المستوى',            description_en: 'View current tier and upgrade to unlock additional features',                          description_ar: 'عرض المستوى الحالي والترقية لفتح ميزات إضافية' },
  // Competitive Edge — Operate
  'timeline.title':           { name_en: 'Activity Timeline',       name_ar: 'الجدول الزمني للنشاط',    description_en: 'View chronological activity feed across all GRC modules',                              description_ar: 'عرض سجل النشاط الزمني عبر جميع وحدات الحوكمة والمخاطر والامتثال' },
  'taskBoard.title':          { name_en: 'Task Board',              name_ar: 'لوحة المهام',              description_en: 'Kanban-style task board for tracking GRC work items',                                  description_ar: 'لوحة مهام بنمط كانبان لتتبع عناصر عمل الحوكمة والمخاطر والامتثال' },
  'messaging.title':          { name_en: 'Messaging',               name_ar: 'المراسلات',                description_en: 'Team messaging channels and direct messages',                                         description_ar: 'قنوات مراسلة الفريق والرسائل المباشرة' },
  'actionItems.title':        { name_en: 'Action Items',            name_ar: 'بنود العمل',               description_en: 'Track and manage action items and follow-ups',                                        description_ar: 'تتبع وإدارة بنود العمل والمتابعات' },
  // Competitive Edge — Account
  'trainingData.title':       { name_en: 'Training Data',           name_ar: 'بيانات التدريب',           description_en: 'Load and manage AI training data for your organization',                               description_ar: 'تحميل وإدارة بيانات تدريب الذكاء الاصطناعي لمؤسستك' },
  // Frontend Integration
  'nav.roleProfiles':         { name_en: 'Role Profiles',           name_ar: 'ملفات الأدوار',            description_en: 'View and manage predefined role profiles for your organization',                       description_ar: 'عرض وإدارة ملفات الأدوار المحددة مسبقاً لمؤسستك' },
  'nav.workflowTemplates':    { name_en: 'Workflow Templates',      name_ar: 'قوالب سير العمل',          description_en: 'Browse and instantiate predefined GRC workflow templates',                             description_ar: 'تصفح وتفعيل قوالب سير عمل الحوكمة والمخاطر والامتثال المحددة مسبقاً' },
  'nav.admin':                { name_en: 'Administration',          name_ar: 'الإدارة',                  description_en: 'Platform administration for tenants, health, and system settings',                     description_ar: 'إدارة المنصة للمستأجرين والصحة وإعدادات النظام' },
  // Gap Closure
  'sidebar.integrations':     { name_en: 'Integrations Hub',        name_ar: 'مركز التكاملات',           description_en: 'Connect external tools and services to the GRC platform',                              description_ar: 'ربط الأدوات والخدمات الخارجية بمنصة الحوكمة والمخاطر والامتثال' },
  'sidebar.remediation':      { name_en: 'Remediation Tracker',     name_ar: 'متتبع المعالجة',           description_en: 'Track remediation actions for identified risks and findings',                          description_ar: 'تتبع إجراءات المعالجة للمخاطر والنتائج المحددة' },
  'sidebar.notificationCenter':{ name_en: 'Notification Center',    name_ar: 'مركز الإشعارات',           description_en: 'View and manage platform notifications and alerts',                                    description_ar: 'عرض وإدارة إشعارات وتنبيهات المنصة' },
  'sidebar.auditTrail':       { name_en: 'Audit Trail',             name_ar: 'سجل التدقيق',              description_en: 'View immutable audit trail of all platform actions',                                   description_ar: 'عرض سجل التدقيق غير القابل للتغيير لجميع إجراءات المنصة' },
  'sidebar.scoringPolicies':  { name_en: 'Scoring Policies',        name_ar: 'سياسات التسجيل',           description_en: 'Configure scoring policies for compliance and risk assessments',                       description_ar: 'تكوين سياسات التسجيل لتقييمات الامتثال والمخاطر' },
  // Gap Closure — Backend API pages
  'sidebar.activityFeed':     { name_en: 'Activity Feed',           name_ar: 'سجل النشاط',               description_en: 'Real-time feed of platform activity and events',                                      description_ar: 'سجل فوري لنشاط وأحداث المنصة' },
  'sidebar.aiTrigger':        { name_en: 'AI Triggers',             name_ar: 'مشغلات الذكاء الاصطناعي', description_en: 'Configure AI-powered workflow triggers and automations',                               description_ar: 'تكوين مشغلات سير العمل والأتمتة بالذكاء الاصطناعي' },
  'sidebar.autonomy':         { name_en: 'Autonomy Engine',         name_ar: 'محرك الاستقلالية',         description_en: 'Manage autonomous GRC operations and decision-making',                                 description_ar: 'إدارة عمليات الحوكمة والمخاطر والامتثال المستقلة واتخاذ القرارات' },
  'sidebar.contentPacks':     { name_en: 'Content Packs',           name_ar: 'حزم المحتوى',              description_en: 'Install and manage pre-built compliance content packs',                                description_ar: 'تثبيت وإدارة حزم محتوى الامتثال الجاهزة' },
  'sidebar.contractTests':    { name_en: 'Contract Tests',          name_ar: 'اختبارات العقود',          description_en: 'Run contract tests to validate API integrations',                                     description_ar: 'تشغيل اختبارات العقود للتحقق من تكاملات واجهة البرمجة' },
  'sidebar.entityLinks':      { name_en: 'Entity Links',            name_ar: 'روابط الكيانات',           description_en: 'View and manage relationships between GRC entities',                                   description_ar: 'عرض وإدارة العلاقات بين كيانات الحوكمة والمخاطر والامتثال' },
  'sidebar.explainability':   { name_en: 'AI Explainability',       name_ar: 'قابلية التفسير',           description_en: 'Understand AI decisions with explainability reports',                                  description_ar: 'فهم قرارات الذكاء الاصطناعي مع تقارير قابلية التفسير' },
  'sidebar.globalSearch':     { name_en: 'Global Search',           name_ar: 'البحث الشامل',             description_en: 'Search across all GRC modules and entities',                                          description_ar: 'البحث عبر جميع وحدات وكيانات الحوكمة والمخاطر والامتثال' },
  'sidebar.ksaHub':           { name_en: 'KSA Regulatory Hub',      name_ar: 'مركز الأنظمة السعودية',   description_en: 'Hub for KSA-specific regulatory frameworks and requirements',                          description_ar: 'مركز الأطر التنظيمية والمتطلبات الخاصة بالمملكة العربية السعودية' },
  'sidebar.mappings':         { name_en: 'Object Mappings',         name_ar: 'تعيينات الكائنات',         description_en: 'Map and link objects across GRC modules',                                              description_ar: 'ربط وتعيين الكائنات عبر وحدات الحوكمة والمخاطر والامتثال' },
  'sidebar.privacyBudget':    { name_en: 'Privacy Budget',          name_ar: 'ميزانية الخصوصية',         description_en: 'Track and manage privacy budget allocation',                                           description_ar: 'تتبع وإدارة تخصيص ميزانية الخصوصية' },
  'sidebar.reportScenarios':  { name_en: 'Report Scenarios',        name_ar: 'سيناريوهات التقارير',      description_en: 'Create and manage report generation scenarios',                                        description_ar: 'إنشاء وإدارة سيناريوهات إنشاء التقارير' },
  'sidebar.publicExplorer':   { name_en: 'Public Explorer',         name_ar: 'المستكشف العام',           description_en: 'Explore publicly available regulatory information',                                    description_ar: 'استكشاف المعلومات التنظيمية المتاحة للعموم' },
  // Autonomous GRC / AI Squad
  'sidebar.aiSquad':          { name_en: 'AI Squad Team',            name_ar: 'فريق الذكاء الاصطناعي',    description_en: 'View the 10 specialist AI agents, their status trails, profiles, and performance stats', description_ar: 'عرض وكلاء الذكاء الاصطناعي العشرة المتخصصين وسجلات حالتهم وملفاتهم الشخصية وإحصاءات أدائهم' },
  'sidebar.aiQueue':          { name_en: 'AI Review Queue',          name_ar: 'قائمة مراجعة الذكاء الاصطناعي', description_en: 'Review workflow steps handled by AI agents while assignees were absent — accept, reject, or modify AI decisions', description_ar: 'مراجعة خطوات سير العمل التي تولاها وكلاء الذكاء الاصطناعي أثناء غياب المسؤولين — قبول أو رفض أو تعديل قرارات الذكاء الاصطناعي' },
  'sidebar.autonomousConfig': { name_en: 'Autonomous Config',        name_ar: 'إعدادات التشغيل الذاتي',   description_en: 'Configure autonomous workflow settings: SLA grace period, AI execution permissions, and human review requirements', description_ar: 'تكوين إعدادات سير العمل الذاتي: فترة السماح للاتفاقية، أذونات تنفيذ الذكاء الاصطناعي، ومتطلبات المراجعة البشرية' },
};

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
