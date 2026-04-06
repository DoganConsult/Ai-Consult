-- Migration 313: Dynamic workflow lookup tables
-- Replaces hardcoded frontend arrays with DB-driven configuration
-- AI agents can insert new options at runtime (ai_generated = true)

-- ── Widen color columns if tables already exist with VARCHAR(20) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workflow_lookup_options' AND column_name='color' AND table_schema=current_schema()) THEN
    ALTER TABLE workflow_lookup_options ALTER COLUMN color TYPE VARCHAR(60);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workflow_ai_agents' AND column_name='color' AND table_schema=current_schema()) THEN
    ALTER TABLE workflow_ai_agents ALTER COLUMN color TYPE VARCHAR(60);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workflow_raci_config' AND column_name='color' AND table_schema=current_schema()) THEN
    ALTER TABLE workflow_raci_config ALTER COLUMN color TYPE VARCHAR(60);
  END IF;
END $$;

-- ── 1. Generic workflow enum/option table ─────────────────────
CREATE TABLE IF NOT EXISTS workflow_lookup_options (
  option_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category     VARCHAR(50) NOT NULL,
  code         VARCHAR(80) NOT NULL,
  label_en     VARCHAR(200) NOT NULL,
  label_ar     VARCHAR(200),
  icon         VARCHAR(60),
  color        VARCHAR(60),
  parent_code  VARCHAR(80),
  sort_order   INT DEFAULT 0,
  config_schema JSONB,
  is_active    BOOLEAN DEFAULT true,
  ai_generated BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, code)
);

-- ── 2. AI agent registry (workflow-designer dropdown) ─────────
CREATE TABLE IF NOT EXISTS workflow_ai_agents (
  agent_id          VARCHAR(10) PRIMARY KEY,
  name_en           VARCHAR(200) NOT NULL,
  name_ar           VARCHAR(200),
  domain_en         VARCHAR(100),
  domain_ar         VARCHAR(100),
  icon              VARCHAR(60),
  color             VARCHAR(60),
  delegation_scope  VARCHAR(100),
  is_active         BOOLEAN DEFAULT true,
  sort_order        INT DEFAULT 0
);

-- ── 3. RACI display config ────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_raci_config (
  role_code    VARCHAR(20) PRIMARY KEY,
  label_en     VARCHAR(60) NOT NULL,
  label_ar     VARCHAR(60),
  color        VARCHAR(60) NOT NULL,
  icon         VARCHAR(60) NOT NULL,
  sort_order   INT DEFAULT 0
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wf_lookup_category ON workflow_lookup_options(category) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_wf_lookup_parent   ON workflow_lookup_options(parent_code) WHERE parent_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_agents_active   ON workflow_ai_agents(sort_order) WHERE is_active;

-- ══════════════════════════════════════════════════════════════
-- SEED DATA — mirrors all currently-hardcoded frontend values
-- ══════════════════════════════════════════════════════════════

-- ── Status filters ────────────────────────────────────────────
INSERT INTO workflow_lookup_options (category, code, label_en, label_ar, sort_order) VALUES
  ('status_filter', 'active',    'Active',    'نشط',    1),
  ('status_filter', 'draft',     'Draft',     'مسودة',  2),
  ('status_filter', 'completed', 'Completed', 'مكتمل',  3),
  ('status_filter', 'failed',    'Failed',    'فاشل',   4)
ON CONFLICT (category, code) DO NOTHING;

-- ── Trigger types ─────────────────────────────────────────────
INSERT INTO workflow_lookup_options (category, code, label_en, label_ar, sort_order) VALUES
  ('trigger_type', 'manual',    'Manual',      'يدوي',       1),
  ('trigger_type', 'scheduled', 'Scheduled',   'مجدول',      2),
  ('trigger_type', 'event',     'Event-based', 'حدث',        3),
  ('trigger_type', 'webhook',   'Webhook',     'ويب هوك',    4)
ON CONFLICT (category, code) DO NOTHING;

-- ── Trigger events ────────────────────────────────────────────
INSERT INTO workflow_lookup_options (category, code, label_en, label_ar, sort_order) VALUES
  ('trigger_event', 'risk.created',              'Risk Created',              'إنشاء خطر',                1),
  ('trigger_event', 'risk.score_changed',        'Risk Score Changed',        'تغيّر درجة الخطر',         2),
  ('trigger_event', 'control.evidence_uploaded', 'Control Evidence Uploaded', 'رفع دليل ضابط',           3),
  ('trigger_event', 'policy.approved',           'Policy Approved',           'اعتماد سياسة',            4),
  ('trigger_event', 'audit.finding_created',     'Audit Finding Created',     'إنشاء ملاحظة تدقيق',      5),
  ('trigger_event', 'incident.reported',         'Incident Reported',         'إبلاغ عن حادثة',          6),
  ('trigger_event', 'vendor.assessment_due',     'Vendor Assessment Due',     'تقييم مورد مستحق',        7),
  ('trigger_event', 'evidence.expired',          'Evidence Expired',          'انتهاء صلاحية الدليل',    8),
  ('trigger_event', 'sla.breached',              'SLA Breached',              'انتهاك اتفاقية الخدمة',   9),
  ('trigger_event', 'compliance.gap_found',      'Compliance Gap Found',      'اكتشاف ثغرة امتثال',     10)
ON CONFLICT (category, code) DO NOTHING;

-- ── HTTP methods ──────────────────────────────────────────────
INSERT INTO workflow_lookup_options (category, code, label_en, label_ar, sort_order) VALUES
  ('http_method', 'GET',    'GET',    'GET',    1),
  ('http_method', 'POST',   'POST',   'POST',   2),
  ('http_method', 'PUT',    'PUT',    'PUT',    3),
  ('http_method', 'DELETE', 'DELETE', 'DELETE', 4)
ON CONFLICT (category, code) DO NOTHING;

-- ── Priority levels ───────────────────────────────────────────
INSERT INTO workflow_lookup_options (category, code, label_en, label_ar, icon, color, sort_order) VALUES
  ('priority', 'low',      'Low',      'منخفض',  'pi-angle-down',           '#6b7280', 1),
  ('priority', 'medium',   'Medium',   'متوسط',  'pi-minus',                '#f59e0b', 2),
  ('priority', 'high',     'High',     'عالي',   'pi-angle-up',             '#ef4444', 3),
  ('priority', 'critical', 'Critical', 'حرج',    'pi-exclamation-triangle', '#dc2626', 4)
ON CONFLICT (category, code) DO NOTHING;

-- ── Step operation modes ──────────────────────────────────────
INSERT INTO workflow_lookup_options (category, code, label_en, label_ar, sort_order) VALUES
  ('operation_mode', 'human_only',     'Human Only',           'بشري فقط',         1),
  ('operation_mode', 'hybrid_shadow',  'Shadow (suggest only)','ظل (اقتراح فقط)',  2),
  ('operation_mode', 'hybrid_active',  'Hybrid Active',        'هجين نشط',         3),
  ('operation_mode', 'autonomous',     'Autonomous',           'مستقل',            4),
  ('operation_mode', 'scheduled',      'Scheduled',            'مجدول',            5)
ON CONFLICT (category, code) DO NOTHING;

-- ── Governance types ──────────────────────────────────────────
INSERT INTO workflow_lookup_options (category, code, label_en, label_ar, sort_order) VALUES
  ('governance_type', 'committee_review',  'Committee Review',  'مراجعة اللجنة',          1),
  ('governance_type', 'board_approval',    'Board Approval',    'موافقة مجلس الإدارة',    2),
  ('governance_type', 'regulatory_signoff','Regulatory Sign-off','توقيع تنظيمي',           3),
  ('governance_type', 'risk_acceptance',   'Risk Acceptance',   'قبول المخاطر',           4)
ON CONFLICT (category, code) DO NOTHING;

-- ── Node types (grouped by parent_code: flow/action/governance) ──
INSERT INTO workflow_lookup_options (category, code, label_en, label_ar, icon, parent_code, sort_order) VALUES
  -- Flow nodes
  ('node_type', 'trigger',   'Trigger',   'مشغّل',        'pi pi-play',                   'flow',       1),
  ('node_type', 'condition', 'Condition', 'شرط',          'pi pi-question-circle',        'flow',       2),
  ('node_type', 'end',       'End',       'نهاية',        'pi pi-stop-circle',            'flow',       3),
  ('node_type', 'delay',     'Delay',     'تأخير',        'pi pi-clock',                  'flow',       4),
  ('node_type', 'loop',      'Loop',      'حلقة',         'pi pi-replay',                 'flow',       5),
  ('node_type', 'parallel',  'Parallel',  'متوازي',       'pi pi-arrows-h',               'flow',       6),
  -- Action nodes
  ('node_type', 'api_call',     'API Call',     'استدعاء API',   'pi pi-globe',          'action',     7),
  ('node_type', 'send_email',   'Send Email',   'إرسال بريد',   'pi pi-envelope',       'action',     8),
  ('node_type', 'webhook',      'Webhook',      'ويب هوك',      'pi pi-link',           'action',     9),
  ('node_type', 'db_query',     'DB Query',     'استعلام قاعدة','pi pi-database',       'action',    10),
  ('node_type', 'notification', 'Notification', 'إشعار',        'pi pi-bell',           'action',    11),
  ('node_type', 'create_task',  'Create Task',  'إنشاء مهمة',   'pi pi-list-check',     'action',    12),
  ('node_type', 'ai_agent',     'AI Agent',     'وكيل ذكاء',    'pi pi-microchip-ai',   'action',    13),
  -- Governance nodes
  ('node_type', 'approval',   'Approval',   'موافقة',    'pi pi-check-square',           'governance', 14),
  ('node_type', 'governance', 'Governance', 'حوكمة',     'pi pi-building',               'governance', 15),
  ('node_type', 'escalation', 'Escalation', 'تصعيد',     'pi pi-exclamation-triangle',   'governance', 16)
ON CONFLICT (category, code) DO NOTHING;

-- ── Scope types (for RACI matrix) ─────────────────────────────
INSERT INTO workflow_lookup_options (category, code, label_en, label_ar, sort_order) VALUES
  ('scope_type', 'policy',        'Policy',        'سياسة',          1),
  ('scope_type', 'workflow',      'Workflow',      'سير عمل',        2),
  ('scope_type', 'process',       'Process',       'عملية',          3),
  ('scope_type', 'control_group', 'Control Group', 'مجموعة ضوابط',  4)
ON CONFLICT (category, code) DO NOTHING;

-- ── AI Agents (A01–A11 + new A12 Workflow Architect) ──────────
INSERT INTO workflow_ai_agents (agent_id, name_en, name_ar, domain_en, domain_ar, icon, color, delegation_scope, sort_order) VALUES
  ('A01', 'Onboarding Agent',           'وكيل الإعداد',                  'Onboarding',         'الإعداد',                  'pi-home',                  '#6366f1', 'onboarding',       1),
  ('A02', 'Identity Provisioning Agent','وكيل توفير الهويات',            'Identity & RBAC',    'الهوية والصلاحيات',       'pi-id-card',               '#8b5cf6', 'full_platform',    2),
  ('A03', 'Framework Mapping Agent',    'وكيل رسم الأطر',               'Frameworks',         'الأطر',                    'pi-th-large',              '#3b82f6', 'control_mapping',  3),
  ('A04', 'Control Authoring Agent',    'وكيل تأليف الضوابط',           'Controls',           'الضوابط',                  'pi-check-circle',          '#10b981', 'control_mapping',  4),
  ('A05', 'Evidence Collection Agent',  'وكيل جمع الأدلة',              'Evidence',           'الأدلة',                   'pi-folder-open',           '#14b8a6', 'evidence_upload',  5),
  ('A06', 'Gap Remediation Agent',      'وكيل معالجة الثغرات',          'Roadmaps',           'خرائط الطريق',            'pi-map',                   '#ef4444', 'assessment',       6),
  ('A07', 'Risk Register Agent',        'وكيل سجل المخاطر',             'Risk Scoring',       'تقييم المخاطر',           'pi-exclamation-triangle',  '#06b6d4', 'risk_seeding',     7),
  ('A08', 'Policy Lifecycle Agent',     'وكيل دورة حياة السياسات',      'Governance',         'الحوكمة',                  'pi-book',                  '#f97316', 'policy_drafting',  8),
  ('A09', 'Third-Party Risk Agent',     'وكيل مخاطر الأطراف الثالثة',   'Third-Party',        'الأطراف الثالثة',         'pi-truck',                 '#a855f7', 'assessment',       9),
  ('A10', 'Audit Reporting Agent',      'وكيل التقارير التدقيقية',      'Audit Reports',      'تقارير التدقيق',          'pi-file-pdf',              '#64748b', 'assessment',      10),
  ('A11', 'BCP Continuity Agent',       'وكيل استمرارية الأعمال',       'Business Continuity','استمرارية الأعمال',       'pi-shield',                '#059669', 'assessment',      11),
  ('A12', 'Workflow Architect Agent',   'وكيل هندسة سير العمل',         'Workflow Design',    'تصميم سير العمل',        'pi-sitemap',               '#0ea5e9', 'workflow_design',  12)
ON CONFLICT (agent_id) DO NOTHING;

-- ── Evidence types ─────────────────────────────────────────────
INSERT INTO workflow_lookup_options (category, code, label_en, label_ar, sort_order) VALUES
  ('evidence_type', 'document',      'Document',      'مستند',       1),
  ('evidence_type', 'screenshot',    'Screenshot',    'لقطة شاشة',  2),
  ('evidence_type', 'log',           'Log',           'سجل',        3),
  ('evidence_type', 'configuration', 'Configuration', 'إعداد',      4),
  ('evidence_type', 'report',        'Report',        'تقرير',      5),
  ('evidence_type', 'attestation',   'Attestation',   'إقرار',      6)
ON CONFLICT (category, code) DO NOTHING;

-- ── Member lifecycle statuses ─────────────────────────────────
INSERT INTO workflow_lookup_options (category, code, label_en, label_ar, sort_order) VALUES
  ('lifecycle_status', 'invited',      'Invited',      'مدعو',          1),
  ('lifecycle_status', 'onboarded',    'Onboarded',    'تم الضم',       2),
  ('lifecycle_status', 'active',       'Active',       'نشط',           3),
  ('lifecycle_status', 'under_review', 'Under Review', 'قيد المراجعة',  4),
  ('lifecycle_status', 'suspended',    'Suspended',    'معلق',          5),
  ('lifecycle_status', 'offboarded',   'Offboarded',   'تم إنهاء الضم', 6)
ON CONFLICT (category, code) DO NOTHING;

-- ── Member activation modes ───────────────────────────────────
INSERT INTO workflow_lookup_options (category, code, label_en, label_ar, sort_order) VALUES
  ('activation_mode', 'human_only', 'Human Only',              'بشري فقط',        1),
  ('activation_mode', 'hybrid',     'Human + Agent (Hybrid)',  'هجين',            2),
  ('activation_mode', 'agrc_os',    'AGRC-OS (Autonomous)',    'مستقل (AGRC-OS)', 3)
ON CONFLICT (category, code) DO NOTHING;

-- ── Workflow builder node visual config (simple builder) ──────
INSERT INTO workflow_lookup_options (category, code, label_en, label_ar, icon, color, sort_order) VALUES
  ('node_visual', 'start',    'Start',    'بداية',  '▶', 'var(--success)', 1),
  ('node_visual', 'end',      'End',      'نهاية',  '■', 'var(--error)',   2),
  ('node_visual', 'action',   'Action',   'إجراء',  '⚡', '#3b82f6',        3),
  ('node_visual', 'decision', 'Decision', 'قرار',   '◆', 'var(--warning)', 4),
  ('node_visual', 'approval', 'Approval', 'موافقة', '✓', '#8b5cf6',        5)
ON CONFLICT (category, code) DO NOTHING;

-- ── Workflow designer node visuals (advanced designer) ────────
INSERT INTO workflow_lookup_options (category, code, label_en, label_ar, icon, color, sort_order) VALUES
  ('node_visual', 'Start',            'Start',            'بداية',        '▶', 'var(--success, #10b981)', 10),
  ('node_visual', 'End',              'End',              'نهاية',        '■', 'var(--error, #ef4444)',   11),
  ('node_visual', 'Task',             'Task',             'مهمة',         '⚡', '#3b82f6',                 12),
  ('node_visual', 'Approval',         'Approval',         'موافقة',       '✓', '#8b5cf6',                 13),
  ('node_visual', 'Decision',         'Decision',         'قرار',         '◆', 'var(--warning, #f59e0b)', 14),
  ('node_visual', 'Timer',            'Timer',            'مؤقت',         '⏱', '#06b6d4',                 15),
  ('node_visual', 'Automation',       'Automation',       'أتمتة',        '⚙', '#14b8a6',                 16),
  ('node_visual', 'Evidence Request', 'Evidence Request', 'طلب دليل',    '📂', '#f97316',                 17),
  ('node_visual', 'Control Test',     'Control Test',     'اختبار ضابط', '🔍', '#64748b',                 18),
  ('node_visual', 'Webhook',          'Webhook',          'ويب هوك',     '🔗', '#a855f7',                 19),
  ('node_visual', 'AI Step',          'AI Step',          'خطوة ذكاء',   '🤖', '#ec4899',                 20)
ON CONFLICT (category, code) DO NOTHING;

-- ── RACI display configuration ────────────────────────────────
INSERT INTO workflow_raci_config (role_code, label_en, label_ar, color, icon, sort_order) VALUES
  ('responsible', 'Responsible', 'المسؤول',   '#3b82f6', 'pi-user',     1),
  ('accountable', 'Accountable', 'المحاسب',   '#ef4444', 'pi-shield',   2),
  ('consulted',   'Consulted',   'المستشار',  '#f59e0b', 'pi-comments', 3),
  ('informed',    'Informed',    'المطّلع',   '#6b7280', 'pi-bell',     4)
ON CONFLICT (role_code) DO NOTHING;
