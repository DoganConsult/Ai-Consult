-- ============================================================================
-- Migration 228: Permission Normalization
-- ============================================================================
-- Adds enterprise permission codes referenced by module_pages (migration 226)
-- that don't exist yet. Follows the existing format: module.resource.action
--
-- Also adds permissions for modules that have NO enterprise permissions:
-- foundation, assessment, ai_governance, reporting, exception
-- ============================================================================

-- ═══════════════════════════════════════════════
-- 1. FOUNDATION MODULE PERMISSIONS
-- ═══════════════════════════════════════════════
INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('foundation.organization.read',   'foundation', 'organization',  'read',   'View organization settings'),
('foundation.organization.update', 'foundation', 'organization',  'update', 'Update organization settings'),
('foundation.business_unit.read',  'foundation', 'business_unit', 'read',   'View business units'),
('foundation.business_unit.update','foundation', 'business_unit', 'update', 'Update business units'),
('foundation.department.read',     'foundation', 'department',    'read',   'View departments'),
('foundation.department.update',   'foundation', 'department',    'update', 'Update departments'),
('foundation.team.read',           'foundation', 'team',          'read',   'View teams'),
('foundation.team.update',         'foundation', 'team',          'update', 'Update teams'),
('foundation.location.read',       'foundation', 'location',      'read',   'View locations'),
('foundation.location.update',     'foundation', 'location',      'update', 'Update locations'),
('foundation.user.read',           'foundation', 'user',          'read',   'View users'),
('foundation.user.manage',         'foundation', 'user',          'manage', 'Manage users'),
('foundation.role.read',           'foundation', 'role',          'read',   'View roles and permissions'),
('foundation.role.manage',         'foundation', 'role',          'manage', 'Manage roles and permissions'),
('foundation.reference.read',      'foundation', 'reference',     'read',   'View reference data'),
('foundation.reference.update',    'foundation', 'reference',     'update', 'Update reference data'),
('foundation.settings.read',       'foundation', 'settings',      'read',   'View tenant settings'),
('foundation.settings.update',     'foundation', 'settings',      'update', 'Update tenant settings'),
('foundation.audit_log.read',      'foundation', 'audit_log',     'read',   'View audit log')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 2. ASSESSMENT MODULE PERMISSIONS
-- ═══════════════════════════════════════════════
INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('assessment.dashboard.read',  'assessment', 'dashboard',  'read',   'View assessment dashboard'),
('assessment.record.read',     'assessment', 'record',     'read',   'View assessments'),
('assessment.record.create',   'assessment', 'record',     'create', 'Create assessments'),
('assessment.record.update',   'assessment', 'record',     'update', 'Update assessments'),
('assessment.template.read',   'assessment', 'template',   'read',   'View assessment templates'),
('assessment.template.create', 'assessment', 'template',   'create', 'Create assessment templates'),
('assessment.template.update', 'assessment', 'template',   'update', 'Update assessment templates')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 3. AI GOVERNANCE MODULE PERMISSIONS
-- ═══════════════════════════════════════════════
INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('ai_governance.dashboard.read',      'ai_governance', 'dashboard',      'read',   'View AI governance dashboard'),
('ai_governance.asset.read',          'ai_governance', 'asset',          'read',   'View AI assets'),
('ai_governance.asset.create',        'ai_governance', 'asset',          'create', 'Register AI assets'),
('ai_governance.asset.update',        'ai_governance', 'asset',          'update', 'Update AI assets'),
('ai_governance.model.read',          'ai_governance', 'model',          'read',   'View AI models'),
('ai_governance.model.create',        'ai_governance', 'model',          'create', 'Register AI models'),
('ai_governance.model.approve',       'ai_governance', 'model',          'approve','Approve AI models'),
('ai_governance.prompt.read',         'ai_governance', 'prompt',         'read',   'View prompts'),
('ai_governance.prompt.create',       'ai_governance', 'prompt',         'create', 'Create prompts'),
('ai_governance.prompt.approve',      'ai_governance', 'prompt',         'approve','Approve prompts'),
('ai_governance.agent.read',          'ai_governance', 'agent',          'read',   'View AI agents'),
('ai_governance.agent.manage',        'ai_governance', 'agent',          'manage', 'Manage AI agents'),
('ai_governance.binding.read',        'ai_governance', 'binding',        'read',   'View agent bindings'),
('ai_governance.enforcement.read',    'ai_governance', 'enforcement',    'read',   'View enforcement rules'),
('ai_governance.enforcement.manage',  'ai_governance', 'enforcement',    'manage', 'Manage enforcement rules'),
('ai_governance.audit.read',          'ai_governance', 'audit',          'read',   'View AI audit trail'),
('ai_governance.operations.read',     'ai_governance', 'operations',     'read',   'View AI operations'),
('ai_governance.alert.read',          'ai_governance', 'alert',          'read',   'View AI alerts'),
('ai_governance.alert.manage',        'ai_governance', 'alert',          'manage', 'Manage AI alerts and killswitch'),
('ai_governance.report.read',         'ai_governance', 'report',         'read',   'View AI governance reports'),
('ai_governance.maturity.read',       'ai_governance', 'maturity',       'read',   'View AI maturity scorecard'),
('ai_governance.fairness.read',       'ai_governance', 'fairness',       'read',   'View AI fairness metrics'),
('ai_governance.classification.read', 'ai_governance', 'classification', 'read',   'View AI classification'),
('ai_governance.ethics.read',         'ai_governance', 'ethics',         'read',   'View ethics board'),
('ai_governance.assessment.read',     'ai_governance', 'assessment',     'read',   'View AI impact assessments'),
('ai_governance.regulation.read',     'ai_governance', 'regulation',     'read',   'View AI regulatory changes')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 4. REPORTING MODULE PERMISSIONS
-- ═══════════════════════════════════════════════
INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('reports.dashboard.read',  'reports', 'dashboard',  'read',   'View reports dashboard'),
('reports.executive.read',  'reports', 'executive',  'read',   'View executive reports'),
('reports.risk.read',       'reports', 'risk',       'read',   'View risk analytics reports'),
('reports.compliance.read', 'reports', 'compliance', 'read',   'View compliance analytics'),
('reports.evidence.read',   'reports', 'evidence',   'read',   'View evidence analytics'),
('reports.audit.read',      'reports', 'audit',      'read',   'View audit analytics'),
('reports.schedule.read',   'reports', 'schedule',   'read',   'View scheduled reports'),
('reports.schedule.manage', 'reports', 'schedule',   'manage', 'Manage scheduled reports'),
('reports.export.read',     'reports', 'export',     'read',   'View exports'),
('reports.export.create',   'reports', 'export',     'create', 'Create exports'),
('reports.builder.read',    'reports', 'builder',    'read',   'View report builder'),
('reports.builder.create',  'reports', 'builder',    'create', 'Create custom reports')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 5. EXCEPTION MODULE PERMISSIONS
-- ═══════════════════════════════════════════════
INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('exception.dashboard.read', 'exception', 'dashboard', 'read',    'View exception dashboard'),
('exception.record.read',    'exception', 'record',    'read',    'View exceptions'),
('exception.record.create',  'exception', 'record',    'create',  'Create exception requests'),
('exception.record.approve', 'exception', 'record',    'approve', 'Approve exception requests'),
('exception.record.reject',  'exception', 'record',    'reject',  'Reject exception requests'),
('exception.record.close',   'exception', 'record',    'close',   'Close exceptions')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 6. DASHBOARD PERMISSIONS FOR EXISTING MODULES
-- (referenced by module_pages but not yet in permissions table)
-- ═══════════════════════════════════════════════
INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
-- Risk dashboard
('risk.dashboard.read',       'risk',       'dashboard', 'read', 'View risk dashboard'),
-- Compliance dashboard
('compliance.dashboard.read', 'compliance', 'dashboard', 'read', 'View compliance dashboard'),
('compliance.framework.read', 'compliance', 'framework', 'read', 'View compliance frameworks'),
('compliance.assessment.read','compliance', 'assessment','read', 'View compliance assessments'),
('compliance.gap.read',       'compliance', 'gap',       'read', 'View compliance gaps'),
('compliance.finding.read',   'compliance', 'finding',   'read', 'View compliance findings'),
('compliance.obligation.read','compliance', 'obligation','read', 'View compliance obligations'),
-- Governance dashboard
('governance.dashboard.read', 'governance', 'dashboard', 'read', 'View governance dashboard'),
('governance.committee.read', 'governance', 'committee', 'read', 'View committees'),
('governance.decision.read',  'governance', 'decision',  'read', 'View governance decisions'),
('governance.action.read',    'governance', 'action',    'read', 'View governance actions'),
('governance.exception.read', 'governance', 'exception', 'read', 'View governance exceptions'),
('governance.mandate.read',   'governance', 'mandate',   'read', 'View mandates'),
('governance.review.read',    'governance', 'review',    'read', 'View policy reviews'),
('governance.acknowledgement.read', 'governance', 'acknowledgement', 'read', 'View acknowledgements'),
('governance.objective.read', 'governance', 'objective', 'read', 'View objectives'),
('governance.delegation.read','governance', 'delegation','read', 'View delegations'),
('governance.responsibility.read', 'governance', 'responsibility', 'read', 'View responsibilities'),
('governance.raci.read',      'governance', 'raci',      'read', 'View RACI matrix'),
('governance.obligation.read','governance', 'obligation','read', 'View governance obligations'),
('governance.charter.read',   'governance', 'charter',   'read', 'View charters'),
('governance.structure.read', 'governance', 'structure', 'read', 'View organizational structure'),
('governance.board.read',     'governance', 'board',     'read', 'View board packs'),
('governance.calendar.read',  'governance', 'calendar',  'read', 'View cadence calendar'),
('governance.report.read',    'governance', 'report',    'read', 'View governance reports'),
('governance.timeline.read',  'governance', 'timeline',  'read', 'View governance timeline'),
('governance.policy.read',    'governance', 'policy',    'read', 'View governance policies'),
('governance.procedure.read', 'governance', 'procedure', 'read', 'View governance procedures'),
-- Policy dashboard
('policy.dashboard.read',    'policy',    'dashboard', 'read', 'View policy dashboard'),
('policy.record.read',       'policy',    'record',    'read', 'View policies'),
('policy.procedure.read',    'policy',    'procedure', 'read', 'View procedures'),
-- Audit dashboard
('audit.dashboard.read',     'audit',     'dashboard', 'read', 'View audit dashboard'),
('audit.plan.read',          'audit',     'plan',      'read', 'View audit plans'),
('audit.engagement.read',    'audit',     'engagement','read', 'View audit engagements'),
('audit.finding.read',       'audit',     'finding',   'read', 'View audit findings'),
('audit.capa.read',          'audit',     'capa',      'read', 'View CAPA items'),
('audit.validation.read',    'audit',     'validation','read', 'View audit validations'),
('audit.report.read',        'audit',     'report',    'read', 'View audit reports'),
('audit.universe.read',      'audit',     'universe',  'read', 'View audit universe'),
('audit.schedule.read',      'audit',     'schedule',  'read', 'View audit schedules'),
('audit.workpaper.read',     'audit',     'workpaper', 'read', 'View working papers'),
('audit.team.read',          'audit',     'team',      'read', 'View audit team'),
('audit.qa.read',            'audit',     'qa',        'read', 'View QA reviews'),
('audit.rating.read',        'audit',     'rating',    'read', 'View audit ratings'),
('audit.committee.read',     'audit',     'committee', 'read', 'View audit committee'),
('audit.testplan.read',      'audit',     'testplan',  'read', 'View audit test plans'),
('audit.log.read',           'audit',     'log',       'read', 'View audit log'),
-- Evidence dashboard
('evidence.dashboard.read',  'evidence',  'dashboard', 'read', 'View evidence dashboard'),
('evidence.record.read',     'evidence',  'record',    'read', 'View evidence records'),
('evidence.request.read',    'evidence',  'request',   'read', 'View evidence requests'),
('evidence.review.read',     'evidence',  'review',    'read', 'View evidence reviews'),
('evidence.mapping.read',    'evidence',  'mapping',   'read', 'View evidence mappings'),
('evidence.task.read',       'evidence',  'task',      'read', 'View evidence tasks'),
-- Incident dashboard
('incident.dashboard.read',  'incident',  'dashboard', 'read', 'View incident dashboard'),
('incident.record.read',     'incident',  'record',    'read', 'View incidents'),
('incident.investigation.read','incident','investigation','read','View incident investigations'),
('incident.review.read',     'incident',  'review',    'read', 'View post-incident reviews'),
('incident.report.read',     'incident',  'report',    'read', 'View incident reports'),
('incident.taxonomy.read',   'incident',  'taxonomy',  'read', 'View incident taxonomy'),
('incident.lesson.read',     'incident',  'lesson',    'read', 'View lessons learned'),
-- Vendor dashboard
('vendor.dashboard.read',    'vendor',    'dashboard', 'read', 'View vendor dashboard'),
('vendor.record.read',       'vendor',    'record',    'read', 'View vendor records'),
('vendor.assessment.read',   'vendor',    'assessment','read', 'View vendor assessments'),
('vendor.diligence.read',    'vendor',    'diligence', 'read', 'View due diligence'),
('vendor.sla.read',          'vendor',    'sla',       'read', 'View vendor SLA monitoring'),
('vendor.monitoring.read',   'vendor',    'monitoring','read', 'View vendor monitoring'),
-- BCP dashboard
('bcp.dashboard.read',       'bcp',       'dashboard', 'read', 'View BCP dashboard'),
('bcp.plan.read',            'bcp',       'plan',      'read', 'View BCP plans'),
('bcp.bia.read',             'bcp',       'bia',       'read', 'View BIA analysis'),
('bcp.exercise.read',        'bcp',       'exercise',  'read', 'View BCP exercises'),
('bcp.crisis.read',          'bcp',       'crisis',    'read', 'View crisis communication'),
('bcp.recovery.read',        'bcp',       'recovery',  'read', 'View recovery strategies'),
('bcp.dependency.read',      'bcp',       'dependency','read', 'View dependency maps'),
('bcp.maturity.read',        'bcp',       'maturity',  'read', 'View BCP maturity'),
-- Asset dashboard
('asset.dashboard.read',     'asset',     'dashboard', 'read', 'View asset dashboard'),
('asset.record.read',        'asset',     'record',    'read', 'View assets'),
-- Remediation dashboard
('remediation.dashboard.read','remediation','dashboard','read', 'View remediation dashboard'),
('remediation.record.read',  'remediation','record',   'read', 'View remediation items'),
-- Action dashboard
('action.dashboard.read',    'action',    'dashboard', 'read', 'View action items dashboard'),
('action.record.read',       'action',    'record',    'read', 'View action items'),
-- Maturity dashboard
('maturity.dashboard.read',  'maturity',  'dashboard', 'read', 'View maturity dashboard'),
('maturity.model.read',      'maturity',  'model',     'read', 'View maturity models'),
('maturity.recommendation.read','maturity','recommendation','read','View recommendations'),
('maturity.roadmap.read',    'maturity',  'roadmap',   'read', 'View improvement roadmap'),
('maturity.calibration.read','maturity',  'calibration','read', 'View calibration settings'),
('maturity.evidence.read',   'maturity',  'evidence',  'read', 'View evidence scoring'),
('maturity.benchmark.read',  'maturity',  'benchmark', 'read', 'View benchmarks'),
('maturity.certification.read','maturity','certification','read','View certifications'),
('maturity.respondent.read', 'maturity',  'respondent','read', 'View respondents'),
('maturity.question.read',   'maturity',  'question',  'read', 'View question bank'),
('maturity.scope.read',      'maturity',  'scope',     'read', 'View scoping'),
-- Training dashboard
('training.dashboard.read',  'training',  'dashboard', 'read', 'View training dashboard'),
('training.certification.read','training','certification','read','View certifications'),
('training.phishing.read',   'training',  'phishing',  'read', 'View phishing simulations'),
('training.compliance.read', 'training',  'compliance','read', 'View training compliance'),
-- AI dashboard
('ai.dashboard.read',        'ai',        'dashboard', 'read', 'View AI dashboard'),
('ai.hub.read',              'ai',        'hub',       'read', 'View AI hub'),
('ai.copilot.read',          'ai',        'copilot',   'read', 'View AI copilot'),
('ai.execution.read',        'ai',        'execution', 'read', 'View AI execution plans'),
('ai.queue.read',            'ai',        'queue',     'read', 'View AI queue'),
('ai.hitl.read',             'ai',        'hitl',      'read', 'View HITL center'),
('ai.inference.manage',      'ai',        'inference', 'manage','Manage inference settings'),
('ai.agent.read',            'ai',        'agent',     'read', 'View AI agents'),
('ai.engine.read',           'ai',        'engine',    'read', 'View AGRC engine'),
-- Workspace dashboard
('workspace.dashboard.read', 'workspace', 'dashboard', 'read', 'View workspace dashboard'),
('workspace.admin.read',     'workspace', 'admin',     'read', 'View admin dashboard'),
('workspace.settings.read',  'workspace', 'settings',  'read', 'View settings'),
('workspace.team.read',      'workspace', 'team',      'read', 'View team management'),
('workspace.config.read',    'workspace', 'config',    'read', 'View tenant configuration'),
('workspace.tier.read',      'workspace', 'tier',      'read', 'View tier management'),
('workspace.role.read',      'workspace', 'role',      'read', 'View role profiles'),
('workspace.import.read',    'workspace', 'import',    'read', 'View bulk import'),
('workspace.profile.read',   'workspace', 'profile',   'read', 'View user profile'),
('workspace.security.read',  'workspace', 'security',  'read', 'View security settings'),
('workspace.billing.read',   'workspace', 'billing',   'read', 'View billing'),
('workspace.health.read',    'workspace', 'health',    'read', 'View service health'),
('workspace.jobs.read',      'workspace', 'jobs',      'read', 'View background jobs'),
('workspace.packs.read',     'workspace', 'packs',     'read', 'View pack installer'),
('workspace.provisioning.read','workspace','provisioning','read','View provisioning'),
('workspace.forms.read',     'workspace', 'forms',     'read', 'View form builder'),
('workspace.objects.read',   'workspace', 'objects',    'read', 'View custom objects'),
('workspace.sla.read',       'workspace', 'sla',       'read', 'View SLA management'),
('workspace.plan.read',      'workspace', 'plan',      'read', 'View workspace plans'),
-- Workflow dashboard
('workflow.dashboard.read',  'workflow',  'dashboard', 'read', 'View workflow dashboard'),
('workflow.hub.read',        'workflow',  'hub',       'read', 'View workflow hub'),
('workflow.automation.read', 'workflow',  'automation','read', 'View automation rules'),
('workflow.autonomous.read', 'workflow',  'autonomous','read', 'View autonomous workflows'),
('workflow.task.read',       'workflow',  'task',      'read', 'View tasks'),
('workflow.approval.read',   'workflow',  'approval',  'read', 'View approvals'),
('workflow.process.read',    'workflow',  'process',   'read', 'View processes'),
-- Knowledge dashboard
('knowledge.dashboard.read', 'knowledge', 'dashboard', 'read', 'View knowledge dashboard'),
('knowledge.record.read',    'knowledge', 'record',    'read', 'View knowledge records'),
-- Integrations dashboard
('integrations.dashboard.read','integrations','dashboard','read','View integrations dashboard'),
('integrations.health.read',  'integrations','health',   'read', 'View connector health'),
('integrations.manager.read', 'integrations','manager',  'read', 'View connector manager'),
('integrations.marketplace.read','integrations','marketplace','read','View marketplace'),
-- Messaging dashboard
('messaging.dashboard.read', 'messaging', 'dashboard', 'read', 'View messaging dashboard'),
('messaging.notification.read','messaging','notification','read','View notifications'),

-- ─── ADMIN MODULE ────────────────────────────────────────────────────────────
('admin.dashboard.read',   'admin', 'dashboard',  'read',  'View admin dashboard'),
('admin.user.read',        'admin', 'user',       'read',  'View user management'),
('admin.user.write',       'admin', 'user',       'write', 'Manage users'),
('admin.role.read',        'admin', 'role',       'read',  'View role management'),
('admin.role.write',       'admin', 'role',       'write', 'Manage roles'),
('admin.permission.read',  'admin', 'permission', 'read',  'View permissions'),
('admin.audit.read',       'admin', 'audit',      'read',  'View admin audit log'),
('admin.settings.read',    'admin', 'settings',   'read',  'View system settings'),
('admin.settings.write',   'admin', 'settings',   'write', 'Manage system settings'),
('admin.tenant.read',      'admin', 'tenant',     'read',  'View tenant configuration'),
('admin.tenant.write',     'admin', 'tenant',     'write', 'Manage tenant configuration'),
('admin.security.read',    'admin', 'security',   'read',  'View security settings'),
('admin.security.write',   'admin', 'security',   'write', 'Manage security settings'),

-- ─── QIYAS MODULE ────────────────────────────────────────────────────────────
('qiyas.dashboard.read',   'qiyas', 'dashboard',  'read',  'View Qiyas dashboard'),
('qiyas.benchmark.read',   'qiyas', 'benchmark',  'read',  'View benchmark index'),
('qiyas.benchmark.write',  'qiyas', 'benchmark',  'write', 'Manage benchmark submissions'),
('qiyas.peer.read',        'qiyas', 'peer',       'read',  'View peer comparison'),
('qiyas.sector.read',      'qiyas', 'sector',     'read',  'View sector index'),
('qiyas.maturity.read',    'qiyas', 'maturity',   'read',  'View maturity map'),
('qiyas.submission.read',  'qiyas', 'submission',  'read',  'View submissions'),
('qiyas.submission.write', 'qiyas', 'submission',  'write', 'Manage submissions'),

-- ─── PRIVACY MODULE ──────────────────────────────────────────────────────────
('privacy.dashboard.read', 'privacy', 'dashboard', 'read',  'View privacy dashboard'),
('privacy.dpia.read',      'privacy', 'dpia',      'read',  'View DPIA register'),
('privacy.dpia.write',     'privacy', 'dpia',      'write', 'Manage DPIA assessments'),
('privacy.consent.read',   'privacy', 'consent',   'read',  'View consent management'),
('privacy.consent.write',  'privacy', 'consent',   'write', 'Manage consent records'),
('privacy.datamap.read',   'privacy', 'datamap',   'read',  'View data mapping'),
('privacy.datamap.write',  'privacy', 'datamap',   'write', 'Manage data maps'),
('privacy.rights.read',    'privacy', 'rights',    'read',  'View data subject rights'),
('privacy.rights.write',   'privacy', 'rights',    'write', 'Process data subject requests'),
('privacy.incident.read',  'privacy', 'incident',  'read',  'View privacy incidents'),
('privacy.incident.write', 'privacy', 'incident',  'write', 'Manage privacy incidents'),
('privacy.compliance.read','privacy', 'compliance', 'read',  'View privacy compliance'),

-- ─── ANALYTICS MODULE (missing codes) ────────────────────────────────────────
('analytics.dashboard.read','analytics','dashboard','read',  'View analytics dashboard'),
('analytics.executive.read','analytics','executive','read',  'View executive command'),
('analytics.explorer.read', 'analytics','explorer', 'read',  'View analytics explorer'),
('analytics.graph.read',    'analytics','graph',    'read',  'View graph analytics'),
('analytics.hub.read',      'analytics','hub',      'read',  'View analytics hub'),
('analytics.kpi.read',      'analytics','kpi',      'read',  'View KPI details'),

-- ─── TRAINING MODULE (missing codes) ─────────────────────────────────────────
('training.assignment.read', 'training','assignment','read',  'View training assignments'),
('training.campaign.read',   'training','campaign',  'read',  'View training campaigns'),
('training.content.read',    'training','content',   'read',  'View training content'),
('training.report.read',     'training','report',    'read',  'View training reports'),

-- ─── FOUNDATION MODULE (missing codes) ───────────────────────────────────────
('foundation.dashboard.read','foundation','dashboard','read', 'View foundation dashboard'),
('foundation.entity.read',   'foundation','entity',   'read', 'View entity types'),
('foundation.lookup.read',   'foundation','lookup',   'read', 'View lookup tables'),
('foundation.definition.read','foundation','definition','read','View shared definitions'),

-- ─── INDIVIDUAL MISSING CODES ────────────────────────────────────────────────
('ai.squad.read',             'ai',         'squad',     'read', 'View AI squads'),
('compliance.control.read',   'compliance', 'control',   'read', 'View compliance controls'),
('integrations.connector.read','integrations','connector','read','View integration connectors'),
('maturity.assessment.read',  'maturity',   'assessment','read', 'View maturity assessments'),
('risk.record.read',          'risk',       'record',    'read', 'View risk records'),
('workflow.template.read',    'workflow',   'template',  'read', 'View workflow templates')

ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 7. FUNCTIONAL ROLES FOR NEW MODULES
-- ═══════════════════════════════════════════════
INSERT INTO functional_roles (code, module_code, name, description) VALUES
('foundation_admin',      'foundation',    'Foundation Admin',        'Manages organization structure'),
('assessment_manager',    'assessment',    'Assessment Manager',      'Manages assessments'),
('ai_governance_officer', 'ai_governance', 'AI Governance Officer',   'Oversees AI governance'),
('reporting_admin',       'reports',       'Reporting Admin',         'Manages reports and exports'),
('exception_approver',    'exception',     'Exception Approver',      'Approves exception requests')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 8. VALIDATION
-- ═══════════════════════════════════════════════
DO $$
DECLARE
  perm_count INT;
  modules_with_perms INT;
BEGIN
  SELECT COUNT(*) INTO perm_count FROM permissions;
  SELECT COUNT(DISTINCT module_code) INTO modules_with_perms FROM permissions;

  RAISE NOTICE 'Migration 228: Permission normalization complete';
  RAISE NOTICE '- Total permissions: %', perm_count;
  RAISE NOTICE '- Modules with permissions: %', modules_with_perms;
END $$;
