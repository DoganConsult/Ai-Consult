-- ============================================================================
-- Migration 907: P0 — Complete Missing Module Permissions
-- ============================================================================
-- Audit source: platform-module-integration-audit (2026-04-01)
-- Purpose:  Registers write/manage/execute permissions for 16 modules that
--           had only read/configure, and adds FULL permission sets for 6
--           modules that had ZERO registered permissions:
--             DORA · KSA-Regulatory · Journey · Packs ·
--             Governance-AI · Proactive Leadership
--
-- Pattern:  code = '<module>.<resource>.<action>'
--           All inserts use ON CONFLICT (code) DO NOTHING (idempotent).
--
-- RACI mapping: each permission block maps to appropriate functional roles.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1 — MODULES WITH PARTIAL PERMISSIONS (write/manage/execute missing)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1A. INCIDENT ─────────────────────────────────────────────────────────────
-- Had: incident:read, incident:configure
-- Adding: write, manage, close, escalate

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('incident.record.create',     'incident', 'record',   'create',   'Create incident reports'),
('incident.record.update',     'incident', 'record',   'update',   'Update incident details'),
('incident.record.delete',     'incident', 'record',   'delete',   'Delete incident records'),
('incident.record.close',      'incident', 'record',   'close',    'Close resolved incidents'),
('incident.record.escalate',   'incident', 'record',   'escalate', 'Escalate incidents to higher authority'),
('incident.record.approve',    'incident', 'record',   'approve',  'Approve incident classification and response'),
('incident.response.manage',   'incident', 'response', 'manage',   'Manage incident response plans'),
('incident.response.assign',   'incident', 'response', 'assign',   'Assign incident response tasks'),
('incident.impact.assess',     'incident', 'impact',   'assess',   'Assess incident impact and severity'),
('incident.report.generate',   'incident', 'report',   'generate', 'Generate incident reports and summaries'),
('incident.report.export',     'incident', 'report',   'export',   'Export incident data'),
('incident.template.manage',   'incident', 'template', 'manage',   'Manage incident response templates')
ON CONFLICT (code) DO NOTHING;

-- ── 1B. EXCEPTION ────────────────────────────────────────────────────────────
-- Had: exception:read, exception:configure
-- Adding: write, manage, approve, close

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('exception.record.create',    'exception', 'record',   'create',   'Submit exception requests'),
('exception.record.update',    'exception', 'record',   'update',   'Update exception request details'),
('exception.record.delete',    'exception', 'record',   'delete',   'Delete exception records'),
('exception.record.approve',   'exception', 'record',   'approve',  'Approve or reject exception requests'),
('exception.record.close',     'exception', 'record',   'close',    'Close expired or resolved exceptions'),
('exception.record.extend',    'exception', 'record',   'extend',   'Extend exception validity period'),
('exception.risk.assess',      'exception', 'risk',     'assess',   'Assess risk associated with exceptions'),
('exception.report.generate',  'exception', 'report',   'generate', 'Generate exception summary reports'),
('exception.template.manage',  'exception', 'template', 'manage',   'Manage exception request templates')
ON CONFLICT (code) DO NOTHING;

-- ── 1C. BCP ──────────────────────────────────────────────────────────────────
-- Had: bcp:read, bcp:configure
-- Adding: write, execute, test, approve

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('bcp.plan.create',            'bcp', 'plan',     'create',   'Create business continuity plans'),
('bcp.plan.update',            'bcp', 'plan',     'update',   'Update BCP documentation'),
('bcp.plan.delete',            'bcp', 'plan',     'delete',   'Delete continuity plans'),
('bcp.plan.approve',           'bcp', 'plan',     'approve',  'Approve BCP plans for activation'),
('bcp.plan.activate',          'bcp', 'plan',     'activate', 'Activate BCP in response to an event'),
('bcp.exercise.manage',        'bcp', 'exercise', 'manage',   'Schedule and manage BCP exercises/tests'),
('bcp.exercise.execute',       'bcp', 'exercise', 'execute',  'Execute BCP drill and test scenarios'),
('bcp.rto.manage',             'bcp', 'rto',      'manage',   'Manage recovery time objectives'),
('bcp.report.generate',        'bcp', 'report',   'generate', 'Generate BCP status and readiness reports'),
('bcp.supplier.manage',        'bcp', 'supplier', 'manage',   'Manage critical supplier continuity data')
ON CONFLICT (code) DO NOTHING;

-- ── 1D. CONTROLS ─────────────────────────────────────────────────────────────
-- Had: control:read, control:write
-- Adding: manage, configure, test, approve, assess

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('controls.library.manage',    'controls', 'library',     'manage',   'Manage the control library and frameworks'),
('controls.record.configure',  'controls', 'record',      'configure','Configure control settings and thresholds'),
('controls.record.delete',     'controls', 'record',      'delete',   'Delete control records'),
('controls.record.approve',    'controls', 'record',      'approve',  'Approve control design and implementation'),
('controls.testing.manage',    'controls', 'testing',     'manage',   'Manage control testing schedules'),
('controls.testing.assign',    'controls', 'testing',     'assign',   'Assign control testing to owners'),
('controls.effectiveness.approve','controls','effectiveness','approve','Approve control effectiveness assessments'),
('controls.mapping.manage',    'controls', 'mapping',     'manage',   'Manage control-to-framework mappings'),
('controls.report.generate',   'controls', 'report',      'generate', 'Generate control effectiveness reports')
ON CONFLICT (code) DO NOTHING;

-- ── 1E. REMEDIATION ──────────────────────────────────────────────────────────
-- Had: remediation:read, remediation:configure
-- Adding: write, manage, approve, verify

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('remediation.plan.create',    'remediation', 'plan',       'create',   'Create remediation plans'),
('remediation.plan.update',    'remediation', 'plan',       'update',   'Update remediation plan details'),
('remediation.plan.delete',    'remediation', 'plan',       'delete',   'Delete remediation plans'),
('remediation.plan.approve',   'remediation', 'plan',       'approve',  'Approve remediation plans'),
('remediation.plan.verify',    'remediation', 'plan',       'verify',   'Verify remediation completion'),
('remediation.task.assign',    'remediation', 'task',       'assign',   'Assign remediation tasks to owners'),
('remediation.task.complete',  'remediation', 'task',       'complete', 'Mark remediation tasks as complete'),
('remediation.report.generate','remediation', 'report',     'generate', 'Generate remediation progress reports'),
('remediation.escalate',       'remediation', 'plan',       'escalate', 'Escalate overdue remediation items')
ON CONFLICT (code) DO NOTHING;

-- ── 1F. ACTION ───────────────────────────────────────────────────────────────
-- Had: action:read, action:configure
-- Adding: write, manage, complete, approve

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('action.item.create',         'action', 'item',   'create',   'Create action items'),
('action.item.update',         'action', 'item',   'update',   'Update action item details'),
('action.item.delete',         'action', 'item',   'delete',   'Delete action items'),
('action.item.assign',         'action', 'item',   'assign',   'Assign action items to owners'),
('action.item.complete',       'action', 'item',   'complete', 'Mark action items as complete'),
('action.item.approve',        'action', 'item',   'approve',  'Approve completion of action items'),
('action.item.escalate',       'action', 'item',   'escalate', 'Escalate overdue or blocked action items'),
('action.report.generate',     'action', 'report', 'generate', 'Generate action item summary reports')
ON CONFLICT (code) DO NOTHING;

-- ── 1G. TRAINING ─────────────────────────────────────────────────────────────
-- Had: training:read, training:configure
-- Adding: write, manage, assign, complete

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('training.content.create',    'training', 'content',    'create',   'Create training content and modules'),
('training.content.update',    'training', 'content',    'update',   'Update training content'),
('training.content.delete',    'training', 'content',    'delete',   'Delete training content'),
('training.content.publish',   'training', 'content',    'publish',  'Publish training content to campaigns'),
('training.campaign.create',   'training', 'campaign',   'create',   'Create training campaigns'),
('training.campaign.update',   'training', 'campaign',   'update',   'Update training campaigns'),
('training.campaign.delete',   'training', 'campaign',   'delete',   'Delete training campaigns'),
('training.campaign.assign',   'training', 'campaign',   'assign',   'Assign users to training campaigns'),
('training.completion.verify', 'training', 'completion', 'verify',   'Verify and certify training completion'),
('training.report.generate',   'training', 'report',     'generate', 'Generate training completion reports'),
('training.attestation.manage','training', 'attestation','manage',   'Manage training attestation records')
ON CONFLICT (code) DO NOTHING;

-- ── 1H. QIYAS ────────────────────────────────────────────────────────────────
-- Had: qiyas:read, qiyas:configure
-- Adding: write, manage, assess, submit

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('qiyas.assessment.create',    'qiyas', 'assessment', 'create',   'Create Qiyas maturity assessments'),
('qiyas.assessment.update',    'qiyas', 'assessment', 'update',   'Update Qiyas assessment data'),
('qiyas.assessment.delete',    'qiyas', 'assessment', 'delete',   'Delete Qiyas assessments'),
('qiyas.assessment.submit',    'qiyas', 'assessment', 'submit',   'Submit assessments to Qiyas authority'),
('qiyas.assessment.approve',   'qiyas', 'assessment', 'approve',  'Approve assessment results'),
('qiyas.domain.manage',        'qiyas', 'domain',     'manage',   'Manage Qiyas measurement domains'),
('qiyas.indicator.manage',     'qiyas', 'indicator',  'manage',   'Manage Qiyas performance indicators'),
('qiyas.report.generate',      'qiyas', 'report',     'generate', 'Generate Qiyas maturity reports'),
('qiyas.roadmap.manage',       'qiyas', 'roadmap',    'manage',   'Manage improvement roadmaps from Qiyas results')
ON CONFLICT (code) DO NOTHING;

-- ── 1I. INTEGRATIONS ─────────────────────────────────────────────────────────
-- Had: integrations:read, integrations:configure
-- Adding: write, manage, activate, test

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('integrations.connector.create',  'integrations', 'connector', 'create',   'Register new integration connectors'),
('integrations.connector.update',  'integrations', 'connector', 'update',   'Update connector configuration'),
('integrations.connector.delete',  'integrations', 'connector', 'delete',   'Remove integration connectors'),
('integrations.connector.activate','integrations', 'connector', 'activate', 'Activate/deactivate connectors'),
('integrations.connector.test',    'integrations', 'connector', 'test',     'Test connector connectivity'),
('integrations.webhook.manage',    'integrations', 'webhook',   'manage',   'Manage inbound/outbound webhooks'),
('integrations.sync.manage',       'integrations', 'sync',      'manage',   'Manage data sync schedules and triggers'),
('integrations.mapping.manage',    'integrations', 'mapping',   'manage',   'Manage field mapping configurations'),
('integrations.log.read',          'integrations', 'log',       'read',     'View integration activity logs'),
('integrations.report.generate',   'integrations', 'report',    'generate', 'Generate integration health reports')
ON CONFLICT (code) DO NOTHING;

-- ── 1J. TEAM ─────────────────────────────────────────────────────────────────
-- Had: team:read, team:configure
-- Adding: write, manage, invite, remove

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
('team.member.invite',         'team', 'member',   'invite',   'Invite new team members'),
('team.member.update',         'team', 'member',   'update',   'Update team member details and roles'),
('team.member.remove',         'team', 'member',   'remove',   'Remove team members'),
('team.member.offboard',       'team', 'member',   'offboard', 'Offboard departed team members'),
('team.structure.manage',      'team', 'structure', 'manage',  'Manage team hierarchy and structure'),
('team.role.assign',           'team', 'role',      'assign',  'Assign GRC roles to team members'),
('team.delegation.manage',     'team', 'delegation','manage',  'Manage authority delegation within teams'),
('team.capacity.manage',       'team', 'capacity',  'manage',  'Manage team capacity and workload'),
('team.report.generate',       'team', 'report',    'generate','Generate team composition and capacity reports')
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2 — MODULES WITH ZERO PERMISSIONS (full permission sets)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 2A. DORA ─────────────────────────────────────────────────────────────────
-- Module: EU Digital Operational Resilience Act compliance
-- Had: ZERO permissions registered

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
-- Dashboard
('dora.dashboard.read',              'dora', 'dashboard',    'read',     'View DORA compliance dashboard'),
-- ICT Risk Management
('dora.ict_risk.read',               'dora', 'ict_risk',     'read',     'View ICT risk assessments'),
('dora.ict_risk.create',             'dora', 'ict_risk',     'create',   'Create ICT risk assessments'),
('dora.ict_risk.update',             'dora', 'ict_risk',     'update',   'Update ICT risk assessments'),
('dora.ict_risk.approve',            'dora', 'ict_risk',     'approve',  'Approve ICT risk treatment decisions'),
-- ICT Incidents
('dora.ict_incident.read',           'dora', 'ict_incident', 'read',     'View ICT-related incidents'),
('dora.ict_incident.create',         'dora', 'ict_incident', 'create',   'Report ICT incidents'),
('dora.ict_incident.update',         'dora', 'ict_incident', 'update',   'Update ICT incident details'),
('dora.ict_incident.classify',       'dora', 'ict_incident', 'classify', 'Classify incidents per DORA thresholds'),
('dora.ict_incident.report',         'dora', 'ict_incident', 'report',   'Submit DORA incident reports to regulators'),
-- Resilience Testing
('dora.testing.read',                'dora', 'testing',      'read',     'View resilience test results'),
('dora.testing.plan',                'dora', 'testing',      'plan',     'Plan DORA resilience tests'),
('dora.testing.execute',             'dora', 'testing',      'execute',  'Execute resilience testing'),
('dora.testing.approve',             'dora', 'testing',      'approve',  'Approve resilience test plans'),
-- Third-Party Risk
('dora.third_party.read',            'dora', 'third_party',  'read',     'View third-party ICT provider data'),
('dora.third_party.manage',          'dora', 'third_party',  'manage',   'Manage third-party ICT risk assessments'),
('dora.third_party.contract.manage', 'dora', 'third_party',  'contract', 'Manage ICT service provider contracts'),
-- Information Sharing
('dora.intelligence.read',           'dora', 'intelligence', 'read',     'View threat intelligence shared under DORA'),
('dora.intelligence.share',          'dora', 'intelligence', 'share',    'Share cyber threat intelligence'),
-- Configuration & Reporting
('dora.configure',                   'dora', 'config',       'configure','Configure DORA module settings'),
('dora.report.generate',             'dora', 'report',       'generate', 'Generate DORA compliance reports'),
('dora.report.export',               'dora', 'report',       'export',   'Export DORA regulatory submissions')
ON CONFLICT (code) DO NOTHING;

-- ── 2B. KSA REGULATORY ───────────────────────────────────────────────────────
-- Module: KSA regulatory obligation tracking (NCA, SAMA, NDMO, CITC)
-- Had: ZERO permissions registered

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
-- Dashboard
('ksa_regulatory.dashboard.read',          'ksa_regulatory', 'dashboard',    'read',     'View KSA regulatory compliance dashboard'),
-- Regulatory Obligations
('ksa_regulatory.obligation.read',         'ksa_regulatory', 'obligation',   'read',     'View KSA regulatory obligations'),
('ksa_regulatory.obligation.create',       'ksa_regulatory', 'obligation',   'create',   'Register new regulatory obligations'),
('ksa_regulatory.obligation.update',       'ksa_regulatory', 'obligation',   'update',   'Update obligation details'),
('ksa_regulatory.obligation.delete',       'ksa_regulatory', 'obligation',   'delete',   'Remove obligation records'),
('ksa_regulatory.obligation.map',          'ksa_regulatory', 'obligation',   'map',      'Map obligations to controls and policies'),
-- Regulatory Assessments
('ksa_regulatory.assessment.read',         'ksa_regulatory', 'assessment',   'read',     'View regulatory self-assessments'),
('ksa_regulatory.assessment.create',       'ksa_regulatory', 'assessment',   'create',   'Create regulatory self-assessments'),
('ksa_regulatory.assessment.update',       'ksa_regulatory', 'assessment',   'update',   'Update assessment findings'),
('ksa_regulatory.assessment.submit',       'ksa_regulatory', 'assessment',   'submit',   'Submit assessments to regulatory body'),
('ksa_regulatory.assessment.approve',      'ksa_regulatory', 'assessment',   'approve',  'Approve regulatory assessment submissions'),
-- Frameworks (NCA, SAMA ECC, SAMA CSF, NDMO, CITC)
('ksa_regulatory.framework.read',          'ksa_regulatory', 'framework',    'read',     'View KSA regulatory frameworks'),
('ksa_regulatory.framework.manage',        'ksa_regulatory', 'framework',    'manage',   'Manage KSA framework versions and mappings'),
-- Findings & Exceptions
('ksa_regulatory.finding.read',            'ksa_regulatory', 'finding',      'read',     'View regulatory audit findings'),
('ksa_regulatory.finding.manage',          'ksa_regulatory', 'finding',      'manage',   'Manage regulatory findings and responses'),
('ksa_regulatory.exception.read',          'ksa_regulatory', 'exception',    'read',     'View regulatory exceptions'),
('ksa_regulatory.exception.manage',        'ksa_regulatory', 'exception',    'manage',   'Manage regulatory exception requests'),
-- Configuration & Reporting
('ksa_regulatory.configure',               'ksa_regulatory', 'config',       'configure','Configure KSA regulatory module settings'),
('ksa_regulatory.report.generate',         'ksa_regulatory', 'report',       'generate', 'Generate KSA regulatory compliance reports'),
('ksa_regulatory.report.export',           'ksa_regulatory', 'report',       'export',   'Export reports for regulatory submissions')
ON CONFLICT (code) DO NOTHING;

-- ── 2C. JOURNEY ──────────────────────────────────────────────────────────────
-- Module: GRC maturity journey planning and progression tracking
-- Had: ZERO permissions registered

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
-- Dashboard
('journey.dashboard.read',         'journey', 'dashboard',  'read',     'View journey and maturity dashboard'),
-- Journey Plans
('journey.plan.read',              'journey', 'plan',       'read',     'View GRC maturity journey plans'),
('journey.plan.create',            'journey', 'plan',       'create',   'Create maturity journey plans'),
('journey.plan.update',            'journey', 'plan',       'update',   'Update journey plan milestones and targets'),
('journey.plan.delete',            'journey', 'plan',       'delete',   'Delete journey plans'),
('journey.plan.approve',           'journey', 'plan',       'approve',  'Approve journey plan and goals'),
-- Milestones & Progress
('journey.milestone.read',         'journey', 'milestone',  'read',     'View journey milestones'),
('journey.milestone.manage',       'journey', 'milestone',  'manage',   'Manage milestone definitions and targets'),
('journey.milestone.complete',     'journey', 'milestone',  'complete', 'Mark milestones as completed'),
('journey.progress.track',         'journey', 'progress',   'track',    'Track and update maturity progress'),
-- Assessments
('journey.assessment.read',        'journey', 'assessment', 'read',     'View maturity assessments'),
('journey.assessment.manage',      'journey', 'assessment', 'manage',   'Manage maturity assessment cycles'),
-- Roadmap
('journey.roadmap.read',           'journey', 'roadmap',    'read',     'View GRC improvement roadmap'),
('journey.roadmap.manage',         'journey', 'roadmap',    'manage',   'Manage improvement roadmap items'),
-- Configuration & Reporting
('journey.configure',              'journey', 'config',     'configure','Configure journey module settings'),
('journey.report.generate',        'journey', 'report',     'generate', 'Generate maturity journey reports')
ON CONFLICT (code) DO NOTHING;

-- ── 2D. PACKS ────────────────────────────────────────────────────────────────
-- Module: Compliance pack bundles (SAMA, NCA, ISO 27001, NIST, etc.)
-- Had: ZERO permissions registered

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
-- Dashboard
('packs.dashboard.read',           'packs', 'dashboard', 'read',     'View packs library dashboard'),
-- Pack Library
('packs.library.read',             'packs', 'library',   'read',     'Browse available compliance packs'),
('packs.library.manage',           'packs', 'library',   'manage',   'Manage the compliance pack library'),
-- Pack Installation
('packs.pack.install',             'packs', 'pack',      'install',  'Install compliance packs into the tenant'),
('packs.pack.uninstall',           'packs', 'pack',      'uninstall','Uninstall compliance packs'),
('packs.pack.upgrade',             'packs', 'pack',      'upgrade',  'Upgrade installed packs to newer versions'),
('packs.pack.configure',           'packs', 'pack',      'configure','Configure installed pack settings'),
-- Pack Content
('packs.content.read',             'packs', 'content',   'read',     'View pack contents (controls, policies, frameworks)'),
('packs.content.customize',        'packs', 'content',   'customize','Customize pack content for the tenant'),
-- Pack Publishing (for pack authors)
('packs.publish.create',           'packs', 'publish',   'create',   'Publish new compliance packs'),
('packs.publish.update',           'packs', 'publish',   'update',   'Update published pack versions'),
('packs.publish.approve',          'packs', 'publish',   'approve',  'Approve packs for publication'),
-- Configuration & Reporting
('packs.configure',                'packs', 'config',    'configure','Configure packs module settings'),
('packs.report.generate',          'packs', 'report',    'generate', 'Generate pack adoption and coverage reports')
ON CONFLICT (code) DO NOTHING;

-- ── 2E. GOVERNANCE-AI ────────────────────────────────────────────────────────
-- Module: AI-augmented governance actions and intelligence
-- Had: ZERO permissions registered

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
-- Dashboard
('governance_ai.dashboard.read',       'governance_ai', 'dashboard',  'read',     'View governance AI dashboard'),
-- AI Recommendations
('governance_ai.recommendation.read',  'governance_ai', 'recommendation','read',  'View AI-generated governance recommendations'),
('governance_ai.recommendation.act',   'governance_ai', 'recommendation','act',   'Act on AI governance recommendations'),
('governance_ai.recommendation.dismiss','governance_ai','recommendation','dismiss','Dismiss AI recommendations'),
-- AI Decision Support
('governance_ai.decision.read',        'governance_ai', 'decision',   'read',     'View AI-assisted decision analysis'),
('governance_ai.decision.request',     'governance_ai', 'decision',   'request',  'Request AI decision support for governance items'),
-- AI Risk Signals
('governance_ai.signal.read',          'governance_ai', 'signal',     'read',     'View AI risk and compliance signals'),
('governance_ai.signal.manage',        'governance_ai', 'signal',     'manage',   'Configure AI signal thresholds and alerts'),
-- AI Summaries & Insights
('governance_ai.insight.read',         'governance_ai', 'insight',    'read',     'View AI-generated governance insights'),
('governance_ai.insight.share',        'governance_ai', 'insight',    'share',    'Share AI insights with stakeholders'),
-- AI Model Management
('governance_ai.model.read',           'governance_ai', 'model',      'read',     'View AI models used for governance'),
('governance_ai.model.configure',      'governance_ai', 'model',      'configure','Configure AI model parameters'),
('governance_ai.model.approve',        'governance_ai', 'model',      'approve',  'Approve AI model usage for governance decisions'),
-- Configuration & Reporting
('governance_ai.configure',            'governance_ai', 'config',     'configure','Configure governance AI module settings'),
('governance_ai.report.generate',      'governance_ai', 'report',     'generate', 'Generate AI governance activity reports')
ON CONFLICT (code) DO NOTHING;

-- ── 2F. PROACTIVE LEADERSHIP ─────────────────────────────────────────────────
-- Module: C-suite and leadership dashboards, insight publishing
-- Had: ZERO permissions registered

INSERT INTO permissions (code, module_code, resource_code, action_code, description) VALUES
-- Dashboard
('proactive_leadership.dashboard.read',    'proactive_leadership', 'dashboard', 'read',     'View executive leadership dashboard'),
-- Insights
('proactive_leadership.insight.read',      'proactive_leadership', 'insight',   'read',     'View leadership insights and briefings'),
('proactive_leadership.insight.create',    'proactive_leadership', 'insight',   'create',   'Create leadership insight publications'),
('proactive_leadership.insight.update',    'proactive_leadership', 'insight',   'update',   'Update insight content'),
('proactive_leadership.insight.publish',   'proactive_leadership', 'insight',   'publish',  'Publish insights to leadership audience'),
('proactive_leadership.insight.approve',   'proactive_leadership', 'insight',   'approve',  'Approve insights before publication'),
('proactive_leadership.insight.archive',   'proactive_leadership', 'insight',   'archive',  'Archive published insights'),
-- KPIs & Metrics
('proactive_leadership.kpi.read',          'proactive_leadership', 'kpi',       'read',     'View leadership KPIs and scorecards'),
('proactive_leadership.kpi.manage',        'proactive_leadership', 'kpi',       'manage',   'Manage leadership KPI definitions'),
-- Alerts & Signals
('proactive_leadership.alert.read',        'proactive_leadership', 'alert',     'read',     'View proactive leadership alerts'),
('proactive_leadership.alert.manage',      'proactive_leadership', 'alert',     'manage',   'Configure alert thresholds and recipients'),
('proactive_leadership.alert.acknowledge', 'proactive_leadership', 'alert',     'acknowledge','Acknowledge leadership alerts'),
-- Briefings
('proactive_leadership.briefing.read',     'proactive_leadership', 'briefing',  'read',     'View executive briefings'),
('proactive_leadership.briefing.manage',   'proactive_leadership', 'briefing',  'manage',   'Manage executive briefing content'),
-- Configuration & Reporting
('proactive_leadership.configure',         'proactive_leadership', 'config',    'configure','Configure proactive leadership module'),
('proactive_leadership.report.generate',   'proactive_leadership', 'report',    'generate', 'Generate executive summary reports')
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3 — FUNCTIONAL ROLES: New roles for modules that lacked them
-- ─────────────────────────────────────────────────────────────────────────────

-- New functional roles covering the 6 zero-permission modules
INSERT INTO functional_roles (code, module_code, name, description) VALUES
-- DORA
('dora_officer',            'dora',                 'DORA Compliance Officer',        'Manages EU DORA compliance obligations and resilience frameworks'),
('dora_reviewer',           'dora',                 'DORA Reviewer',                  'Reviews and validates DORA assessments and incident reports'),
-- KSA Regulatory
('ksa_regulatory_officer',  'ksa_regulatory',       'KSA Regulatory Compliance Officer','Manages KSA regulatory obligations (NCA, SAMA, NDMO, CITC)'),
('ksa_regulatory_analyst',  'ksa_regulatory',       'KSA Regulatory Analyst',         'Performs regulatory assessments and tracks obligation compliance'),
-- Journey
('journey_owner',           'journey',              'Journey Owner',                  'Owns and drives the GRC maturity journey roadmap'),
('journey_analyst',         'journey',              'Journey Analyst',                'Tracks milestones and produces maturity progress reports'),
-- Packs
('pack_administrator',      'packs',                'Pack Administrator',             'Installs, configures, and manages compliance packs'),
('pack_viewer',             'packs',                'Pack Viewer',                   'Browses and views available compliance packs'),
-- Governance AI
('governance_ai_officer',   'governance_ai',        'Governance AI Officer',          'Oversees AI model usage and recommendations in governance'),
('governance_ai_operator',  'governance_ai',        'Governance AI Operator',         'Operates AI-assisted governance tools and acts on recommendations'),
-- Proactive Leadership
('leadership_publisher',    'proactive_leadership', 'Leadership Publisher',           'Creates and publishes executive insights and briefings'),
('leadership_viewer',       'proactive_leadership', 'Leadership Viewer',             'Views executive dashboards, insights, and leadership KPIs')
ON CONFLICT (code) DO UPDATE SET
  module_code = EXCLUDED.module_code,
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at  = NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4 — ROLE-PERMISSION MAPPINGS
-- ─────────────────────────────────────────────────────────────────────────────

-- ── INCIDENT ─────────────────────────────────────────────────────────────────

-- incident_reporter: create only
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'incident_reporter'
  AND p.code IN ('incident.record.create', 'incident.impact.assess')
ON CONFLICT DO NOTHING;

-- incident_owner: manage own incidents
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'incident_owner'
  AND p.code IN (
    'incident.record.create', 'incident.record.update', 'incident.record.close',
    'incident.response.assign', 'incident.impact.assess', 'incident.report.generate'
  )
ON CONFLICT DO NOTHING;

-- incident_reviewer: review and escalate
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'incident_reviewer'
  AND p.code IN (
    'incident.record.update', 'incident.record.escalate',
    'incident.response.manage', 'incident.impact.assess', 'incident.report.generate'
  )
ON CONFLICT DO NOTHING;

-- incident_approver: approve and close
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'incident_approver'
  AND p.code IN (
    'incident.record.approve', 'incident.record.close', 'incident.record.escalate',
    'incident.response.manage', 'incident.template.manage', 'incident.report.generate'
  )
ON CONFLICT DO NOTHING;

-- agrc_admin: full incident access
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_admin'
  AND p.module_code = 'incident'
ON CONFLICT DO NOTHING;

-- ── EXCEPTION ────────────────────────────────────────────────────────────────

-- exception_requester: submit only
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'exception_requester'
  AND p.code IN ('exception.record.create', 'exception.risk.assess')
ON CONFLICT DO NOTHING;

-- exception_owner: manage own exceptions
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'exception_owner'
  AND p.code IN (
    'exception.record.create', 'exception.record.update', 'exception.record.extend',
    'exception.risk.assess', 'exception.report.generate'
  )
ON CONFLICT DO NOTHING;

-- exception_approver: approve and close
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'exception_approver'
  AND p.code IN (
    'exception.record.approve', 'exception.record.close', 'exception.record.delete',
    'exception.template.manage', 'exception.report.generate'
  )
ON CONFLICT DO NOTHING;

-- agrc_admin: full exception access
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_admin'
  AND p.module_code = 'exception'
ON CONFLICT DO NOTHING;

-- ── BCP ──────────────────────────────────────────────────────────────────────

-- bcp_coordinator: create/update plans, manage exercises
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'bcp_coordinator'
  AND p.code IN (
    'bcp.plan.create', 'bcp.plan.update',
    'bcp.exercise.manage', 'bcp.exercise.execute',
    'bcp.rto.manage', 'bcp.supplier.manage', 'bcp.report.generate'
  )
ON CONFLICT DO NOTHING;

-- agrc_admin: full BCP access
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_admin'
  AND p.module_code = 'bcp'
ON CONFLICT DO NOTHING;

-- ── CONTROLS ─────────────────────────────────────────────────────────────────

-- control_owner: manage and test controls
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'control_owner'
  AND p.code IN (
    'controls.testing.manage', 'controls.testing.assign',
    'controls.mapping.manage', 'controls.report.generate'
  )
ON CONFLICT DO NOTHING;

-- control_tester: execute testing
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'control_tester'
  AND p.code IN (
    'controls.testing.manage', 'controls.effectiveness.approve', 'controls.report.generate'
  )
ON CONFLICT DO NOTHING;

-- agrc_admin: full controls access
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_admin'
  AND p.module_code = 'controls'
ON CONFLICT DO NOTHING;

-- governance_manager: library + mapping
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'governance_manager'
  AND p.code IN ('controls.library.manage', 'controls.mapping.manage', 'controls.report.generate')
ON CONFLICT DO NOTHING;

-- ── REMEDIATION ──────────────────────────────────────────────────────────────

-- remediation_owner: create/update
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'remediation_owner'
  AND p.code IN (
    'remediation.plan.create', 'remediation.plan.update',
    'remediation.task.assign', 'remediation.task.complete',
    'remediation.report.generate'
  )
ON CONFLICT DO NOTHING;

-- remediation_reviewer: verify and escalate
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'remediation_reviewer'
  AND p.code IN (
    'remediation.plan.verify', 'remediation.escalate', 'remediation.report.generate'
  )
ON CONFLICT DO NOTHING;

-- agrc_admin: full remediation access
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_admin'
  AND p.module_code = 'remediation'
ON CONFLICT DO NOTHING;

-- ── ACTION ───────────────────────────────────────────────────────────────────

-- action_owner: create and complete
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'action_owner'
  AND p.code IN (
    'action.item.create', 'action.item.update', 'action.item.assign',
    'action.item.complete', 'action.report.generate'
  )
ON CONFLICT DO NOTHING;

-- agrc_admin: full action access
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_admin'
  AND p.module_code = 'action'
ON CONFLICT DO NOTHING;

-- ── TRAINING ─────────────────────────────────────────────────────────────────

-- training_admin: full training management
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'training_admin'
  AND p.module_code = 'training'
ON CONFLICT DO NOTHING;

-- training_participant: complete assignments
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'training_participant'
  AND p.code IN ('training.completion.verify', 'training.report.generate')
ON CONFLICT DO NOTHING;

-- agrc_admin: full training access
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_admin'
  AND p.module_code = 'training'
ON CONFLICT DO NOTHING;

-- ── QIYAS ────────────────────────────────────────────────────────────────────

-- assessment_manager: Qiyas assessment management
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'assessment_manager'
  AND p.module_code = 'qiyas'
ON CONFLICT DO NOTHING;

-- agrc_admin: full qiyas access
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_admin'
  AND p.module_code = 'qiyas'
ON CONFLICT DO NOTHING;

-- ── INTEGRATIONS ─────────────────────────────────────────────────────────────

-- integrations_admin: full integrations management
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'integrations_admin'
  AND p.module_code = 'integrations'
ON CONFLICT DO NOTHING;

-- agrc_admin: full integrations access
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_admin'
  AND p.module_code = 'integrations'
ON CONFLICT DO NOTHING;

-- ── TEAM ─────────────────────────────────────────────────────────────────────

-- team_manager: full team management
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'team_manager'
  AND p.module_code = 'team'
ON CONFLICT DO NOTHING;

-- team_member: view only
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'team_member'
  AND p.code IN ('team.member.update')
ON CONFLICT DO NOTHING;

-- agrc_admin: full team access
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_admin'
  AND p.module_code = 'team'
ON CONFLICT DO NOTHING;

-- ── DORA ─────────────────────────────────────────────────────────────────────

-- dora_officer: full DORA management
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'dora_officer'
  AND p.module_code = 'dora'
ON CONFLICT DO NOTHING;

-- dora_reviewer: read + classify + approve
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'dora_reviewer'
  AND p.code IN (
    'dora.dashboard.read',
    'dora.ict_risk.read', 'dora.ict_risk.approve',
    'dora.ict_incident.read', 'dora.ict_incident.classify', 'dora.ict_incident.report',
    'dora.testing.read', 'dora.testing.approve',
    'dora.third_party.read', 'dora.intelligence.read',
    'dora.report.generate', 'dora.report.export'
  )
ON CONFLICT DO NOTHING;

-- ciso: DORA oversight
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code IN ('c_suite', 'director')
  AND p.code IN (
    'dora.dashboard.read', 'dora.ict_risk.read', 'dora.ict_incident.read',
    'dora.report.generate'
  )
ON CONFLICT DO NOTHING;

-- agrc_admin: full DORA access
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_admin'
  AND p.module_code = 'dora'
ON CONFLICT DO NOTHING;

-- ── KSA REGULATORY ───────────────────────────────────────────────────────────

-- ksa_regulatory_officer: full management
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'ksa_regulatory_officer'
  AND p.module_code = 'ksa_regulatory'
ON CONFLICT DO NOTHING;

-- ksa_regulatory_analyst: assess + report
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'ksa_regulatory_analyst'
  AND p.code IN (
    'ksa_regulatory.dashboard.read',
    'ksa_regulatory.obligation.read', 'ksa_regulatory.obligation.map',
    'ksa_regulatory.assessment.read', 'ksa_regulatory.assessment.create',
    'ksa_regulatory.assessment.update',
    'ksa_regulatory.framework.read',
    'ksa_regulatory.finding.read',
    'ksa_regulatory.report.generate'
  )
ON CONFLICT DO NOTHING;

-- compliance_manager: KSA regulatory read + assess
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'compliance_manager'
  AND p.code IN (
    'ksa_regulatory.dashboard.read',
    'ksa_regulatory.obligation.read', 'ksa_regulatory.assessment.read',
    'ksa_regulatory.framework.read', 'ksa_regulatory.report.generate'
  )
ON CONFLICT DO NOTHING;

-- agrc_admin: full KSA regulatory access
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_admin'
  AND p.module_code = 'ksa_regulatory'
ON CONFLICT DO NOTHING;

-- ── JOURNEY ──────────────────────────────────────────────────────────────────

-- journey_owner: full journey management
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'journey_owner'
  AND p.module_code = 'journey'
ON CONFLICT DO NOTHING;

-- journey_analyst: track and report
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'journey_analyst'
  AND p.code IN (
    'journey.dashboard.read', 'journey.plan.read',
    'journey.milestone.read', 'journey.progress.track',
    'journey.assessment.read', 'journey.roadmap.read',
    'journey.report.generate'
  )
ON CONFLICT DO NOTHING;

-- governance_manager: journey read + approve
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'governance_manager'
  AND p.code IN (
    'journey.dashboard.read', 'journey.plan.read', 'journey.plan.approve',
    'journey.roadmap.read', 'journey.report.generate'
  )
ON CONFLICT DO NOTHING;

-- agrc_admin: full journey access
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_admin'
  AND p.module_code = 'journey'
ON CONFLICT DO NOTHING;

-- ── PACKS ────────────────────────────────────────────────────────────────────

-- pack_administrator: full packs management
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'pack_administrator'
  AND p.module_code = 'packs'
ON CONFLICT DO NOTHING;

-- pack_viewer: read only
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'pack_viewer'
  AND p.code IN ('packs.dashboard.read', 'packs.library.read', 'packs.content.read')
ON CONFLICT DO NOTHING;

-- compliance_manager: install + read packs
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'compliance_manager'
  AND p.code IN (
    'packs.dashboard.read', 'packs.library.read',
    'packs.pack.install', 'packs.pack.configure',
    'packs.content.read', 'packs.report.generate'
  )
ON CONFLICT DO NOTHING;

-- agrc_admin: full packs access
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_admin'
  AND p.module_code = 'packs'
ON CONFLICT DO NOTHING;

-- ── GOVERNANCE AI ─────────────────────────────────────────────────────────────

-- governance_ai_officer: full governance AI management
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'governance_ai_officer'
  AND p.module_code = 'governance_ai'
ON CONFLICT DO NOTHING;

-- governance_ai_operator: act on recommendations
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'governance_ai_operator'
  AND p.code IN (
    'governance_ai.dashboard.read',
    'governance_ai.recommendation.read', 'governance_ai.recommendation.act',
    'governance_ai.recommendation.dismiss',
    'governance_ai.decision.read', 'governance_ai.signal.read',
    'governance_ai.insight.read', 'governance_ai.insight.share'
  )
ON CONFLICT DO NOTHING;

-- ai_admin: model configuration for governance AI
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'ai_admin'
  AND p.code IN (
    'governance_ai.model.read', 'governance_ai.model.configure', 'governance_ai.model.approve',
    'governance_ai.configure', 'governance_ai.report.generate'
  )
ON CONFLICT DO NOTHING;

-- governance_manager: read recommendations + insights
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'governance_manager'
  AND p.code IN (
    'governance_ai.dashboard.read',
    'governance_ai.recommendation.read', 'governance_ai.decision.read',
    'governance_ai.signal.read', 'governance_ai.insight.read'
  )
ON CONFLICT DO NOTHING;

-- agrc_admin: full governance AI access
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_admin'
  AND p.module_code = 'governance_ai'
ON CONFLICT DO NOTHING;

-- ── PROACTIVE LEADERSHIP ─────────────────────────────────────────────────────

-- leadership_publisher: create and publish insights
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'leadership_publisher'
  AND p.module_code = 'proactive_leadership'
ON CONFLICT DO NOTHING;

-- leadership_viewer: read dashboards and insights
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'leadership_viewer'
  AND p.code IN (
    'proactive_leadership.dashboard.read',
    'proactive_leadership.insight.read',
    'proactive_leadership.kpi.read',
    'proactive_leadership.alert.read', 'proactive_leadership.alert.acknowledge',
    'proactive_leadership.briefing.read'
  )
ON CONFLICT DO NOTHING;

-- c_suite + director: executive view
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code IN ('c_suite', 'director', 'executive_reviewer')
  AND p.code IN (
    'proactive_leadership.dashboard.read',
    'proactive_leadership.insight.read', 'proactive_leadership.insight.approve',
    'proactive_leadership.kpi.read',
    'proactive_leadership.alert.read', 'proactive_leadership.alert.acknowledge',
    'proactive_leadership.briefing.read'
  )
ON CONFLICT DO NOTHING;

-- agrc_admin: full proactive leadership access
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_admin'
  AND p.module_code = 'proactive_leadership'
ON CONFLICT DO NOTHING;

-- agrc_operator: read all leadership content
INSERT INTO role_permissions (functional_role_id, permission_id)
SELECT fr.id, p.id FROM functional_roles fr, permissions p
WHERE fr.code = 'agrc_operator'
  AND p.code IN (
    'proactive_leadership.dashboard.read',
    'proactive_leadership.insight.read',
    'proactive_leadership.kpi.read',
    'proactive_leadership.alert.read',
    'proactive_leadership.briefing.read',
    'proactive_leadership.report.generate'
  )
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5 — VALIDATION
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  perm_count      INT;
  fr_count        INT;
  rp_count        INT;
  zero_perm_roles INT;
  new_perms       INT;
  new_roles       INT;
BEGIN
  SELECT COUNT(*) INTO perm_count FROM permissions;
  SELECT COUNT(*) INTO fr_count   FROM functional_roles;
  SELECT COUNT(*) INTO rp_count   FROM role_permissions;

  SELECT COUNT(*) INTO zero_perm_roles
  FROM functional_roles fr
  WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.functional_role_id = fr.id
  );

  SELECT COUNT(*) INTO new_perms
  FROM permissions
  WHERE module_code IN (
    'incident','exception','bcp','controls','remediation','action',
    'training','qiyas','integrations','team',
    'dora','ksa_regulatory','journey','packs','governance_ai','proactive_leadership'
  );

  SELECT COUNT(*) INTO new_roles
  FROM functional_roles
  WHERE code IN (
    'dora_officer','dora_reviewer',
    'ksa_regulatory_officer','ksa_regulatory_analyst',
    'journey_owner','journey_analyst',
    'pack_administrator','pack_viewer',
    'governance_ai_officer','governance_ai_operator',
    'leadership_publisher','leadership_viewer'
  );

  RAISE NOTICE '=== Migration 907: P0 Missing Module Permissions ===';
  RAISE NOTICE 'Total permissions after migration:       %', perm_count;
  RAISE NOTICE 'Total functional roles after migration:  %', fr_count;
  RAISE NOTICE 'Total role-permission mappings:          %', rp_count;
  RAISE NOTICE 'Roles with zero permissions:             %', zero_perm_roles;
  RAISE NOTICE 'Permissions across P0 modules:           %', new_perms;
  RAISE NOTICE 'New functional roles created:            %', new_roles;

  IF zero_perm_roles > 5 THEN
    RAISE WARNING 'More than 5 roles still have zero permissions - manual review needed.';
  END IF;
END $$;
