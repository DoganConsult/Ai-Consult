-- Tenant Migration 096: Qiyas ↔ GRC Automation Infrastructure
-- 4 automation trigger tables + maturity sync + cross-module link integrity

-- ── 1. Qiyas→GRC Trigger Event Log ───────────────────────────
CREATE TABLE IF NOT EXISTS qiyas_grc_trigger_log (
  trigger_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type    VARCHAR(50) NOT NULL
    CHECK (trigger_type IN (
      'gap_critical','gap_high','recommendation_accepted',
      'control_test_fail','assessment_finalized',
      'maturity_threshold_crossed','indicator_score_updated'
    )),
  source_module   VARCHAR(20) NOT NULL DEFAULT 'qiyas'
    CHECK (source_module IN ('qiyas','grc')),
  source_entity   VARCHAR(50),
  source_id       VARCHAR(128),
  target_module   VARCHAR(20) NOT NULL DEFAULT 'grc'
    CHECK (target_module IN ('qiyas','grc')),
  target_action   VARCHAR(100),
  target_entity_type VARCHAR(50),
  target_entity_id   VARCHAR(128),
  payload         JSONB       NOT NULL DEFAULT '{}',
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed','skipped')),
  error_message   TEXT,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qgtl_type       ON qiyas_grc_trigger_log(trigger_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qgtl_status     ON qiyas_grc_trigger_log(status)           WHERE status IN ('pending','processing');
CREATE INDEX IF NOT EXISTS idx_qgtl_source     ON qiyas_grc_trigger_log(source_entity, source_id);
CREATE INDEX IF NOT EXISTS idx_qgtl_target     ON qiyas_grc_trigger_log(target_entity_type, target_entity_id) WHERE target_entity_id IS NOT NULL;

-- ── 2. Qiyas→GRC Auto-created Tasks ──────────────────────────
CREATE TABLE IF NOT EXISTS qiyas_auto_tasks (
  auto_task_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id        UUID        REFERENCES qiyas_grc_trigger_log(trigger_id) ON DELETE SET NULL,
  qiyas_assessment_id VARCHAR(128),
  qiyas_gap_id      VARCHAR(128),
  qiyas_rec_id      VARCHAR(128),
  grc_task_id       VARCHAR(128),
  grc_control_id    VARCHAR(128),
  task_title        VARCHAR(500) NOT NULL,
  task_description  TEXT,
  priority          VARCHAR(20)  NOT NULL DEFAULT 'high'
    CHECK (priority IN ('critical','high','medium','low')),
  assigned_team_code VARCHAR(50),
  due_date          TIMESTAMPTZ,
  status            VARCHAR(30)  NOT NULL DEFAULT 'created'
    CHECK (status IN ('created','assigned','in_progress','completed','cancelled')),
  gap_severity      VARCHAR(20),
  gap_score         NUMERIC(5,2),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qat_trigger     ON qiyas_auto_tasks(trigger_id);
CREATE INDEX IF NOT EXISTS idx_qat_status      ON qiyas_auto_tasks(status) WHERE status NOT IN ('completed','cancelled');
CREATE INDEX IF NOT EXISTS idx_qat_assessment  ON qiyas_auto_tasks(qiyas_assessment_id) WHERE qiyas_assessment_id IS NOT NULL;

-- ── 3. GRC Maturity Dashboard Sync ───────────────────────────
CREATE TABLE IF NOT EXISTS grc_maturity_sync (
  sync_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  qiyas_assessment_id VARCHAR(128) NOT NULL,
  sync_type         VARCHAR(30)  NOT NULL
    CHECK (sync_type IN ('full','incremental','domain','indicator')),
  overall_maturity  NUMERIC(5,2),
  domain_scores     JSONB        NOT NULL DEFAULT '{}',
  dimension_scores  JSONB        NOT NULL DEFAULT '{}',
  compliance_impact JSONB        NOT NULL DEFAULT '{}',
  synced_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  synced_by         VARCHAR(64)  NOT NULL DEFAULT 'system',
  version           INT          NOT NULL DEFAULT 1,
  is_current        BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_gms_assessment  ON grc_maturity_sync(qiyas_assessment_id, synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_gms_current     ON grc_maturity_sync(is_current)   WHERE is_current = TRUE;

-- Partial unique: only one current sync per assessment
CREATE UNIQUE INDEX IF NOT EXISTS uq_gms_current_assessment
  ON grc_maturity_sync(qiyas_assessment_id)
  WHERE is_current = TRUE;

-- ── 4. GRC→Qiyas Control Test Feedback ───────────────────────
CREATE TABLE IF NOT EXISTS grc_qiyas_control_feedback (
  feedback_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  grc_control_id    VARCHAR(128) NOT NULL,
  test_result       VARCHAR(20)  NOT NULL
    CHECK (test_result IN ('pass','fail','partial','not_tested')),
  test_date         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  qiyas_indicator_id VARCHAR(128),
  qiyas_question_id VARCHAR(128),
  score_before      NUMERIC(5,2),
  score_after       NUMERIC(5,2),
  sync_status       VARCHAR(20)  NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending','synced','failed','skipped')),
  synced_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gqcf_control    ON grc_qiyas_control_feedback(grc_control_id, test_date DESC);
CREATE INDEX IF NOT EXISTS idx_gqcf_sync       ON grc_qiyas_control_feedback(sync_status) WHERE sync_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_gqcf_indicator  ON grc_qiyas_control_feedback(qiyas_indicator_id) WHERE qiyas_indicator_id IS NOT NULL;

-- ── 5. Cross-Module Entity Link Table ────────────────────────
-- Enforces referential integrity between Qiyas and GRC entity IDs (VARCHAR FKs)
CREATE TABLE IF NOT EXISTS cross_module_links (
  link_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_module     VARCHAR(20) NOT NULL CHECK (source_module IN ('qiyas','grc')),
  source_entity     VARCHAR(50) NOT NULL,
  source_id         VARCHAR(128) NOT NULL,
  target_module     VARCHAR(20) NOT NULL CHECK (target_module IN ('qiyas','grc')),
  target_entity     VARCHAR(50) NOT NULL,
  target_id         VARCHAR(128) NOT NULL,
  link_type         VARCHAR(50) NOT NULL DEFAULT 'assesses'
    CHECK (link_type IN ('assesses','validates','measures','maps_to','generates','feeds_into')),
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  last_verified_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_module, source_entity, source_id, target_module, target_entity, target_id, link_type)
);

CREATE INDEX IF NOT EXISTS idx_cml_source      ON cross_module_links(source_module, source_entity, source_id);
CREATE INDEX IF NOT EXISTS idx_cml_target      ON cross_module_links(target_module, target_entity, target_id);
CREATE INDEX IF NOT EXISTS idx_cml_active      ON cross_module_links(is_active) WHERE is_active = TRUE;

-- ── 6. Platform default automation rules ─────────────────────
CREATE TABLE IF NOT EXISTS qiyas_grc_automation_rules (
  rule_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code         VARCHAR(100) NOT NULL UNIQUE,
  trigger_type      VARCHAR(50) NOT NULL,
  trigger_condition JSONB        NOT NULL DEFAULT '{}',
  action_type       VARCHAR(100) NOT NULL,
  action_config     JSONB        NOT NULL DEFAULT '{}',
  enabled           BOOLEAN     NOT NULL DEFAULT FALSE,
  description_en    TEXT,
  description_ar    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO qiyas_grc_automation_rules (rule_code, trigger_type, trigger_condition, action_type, action_config, description_en, description_ar) VALUES
  ('RULE-QG-01',
   'gap_critical',
   '{"min_severity":"critical","modules":["qiyas"]}',
   'create_grc_remediation_workflow',
   '{"workflow_template":"WF-QIYAS-02: Gap-Triggered Remediation","priority":"critical","auto_assign_to_control_owner":true}',
   'Auto-create GRC remediation workflow when Qiyas gap severity is critical',
   'إنشاء سير عمل معالجة GRC تلقائيًا عند وجود فجوة قياس حرجة'),

  ('RULE-QG-02',
   'gap_high',
   '{"min_severity":"high","modules":["qiyas"]}',
   'create_grc_remediation_task',
   '{"task_type":"remediation","priority":"high","notify_team_lead":true}',
   'Auto-create GRC remediation task when Qiyas gap severity is high',
   'إنشاء مهمة معالجة GRC تلقائيًا عند وجود فجوة قياس عالية'),

  ('RULE-QG-03',
   'recommendation_accepted',
   '{"modules":["qiyas"],"requires_human_confirmation":true}',
   'create_grc_remediation_task',
   '{"task_type":"remediation","map_to_controls":true,"map_to_policies":true}',
   'Auto-create GRC remediation task when Qiyas recommendation is accepted',
   'إنشاء مهمة معالجة تلقائيًا عند قبول توصية قياس'),

  ('RULE-QG-04',
   'control_test_fail',
   '{"modules":["grc"],"test_result":"fail"}',
   'update_qiyas_indicator_score',
   '{"sync_direction":"grc_to_qiyas","recalculate_domain_score":true}',
   'Update Qiyas indicator scores when GRC control test fails',
   'تحديث مؤشرات قياس تلقائيًا عند فشل اختبار ضابط GRC'),

  ('RULE-QG-05',
   'assessment_finalized',
   '{"modules":["qiyas"]}',
   'sync_maturity_to_grc_dashboard',
   '{"sync_type":"full","notify_roles":["ciso","ceo","erm_lead"],"update_compliance_score":true}',
   'Sync Qiyas maturity scores to GRC dashboard when assessment is finalised',
   'مزامنة درجات نضج قياس مع لوحة GRC عند الانتهاء من التقييم')

ON CONFLICT (rule_code) DO NOTHING;
