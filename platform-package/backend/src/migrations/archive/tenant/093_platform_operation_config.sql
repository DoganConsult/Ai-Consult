-- Tenant Migration 093: Platform Operation Configuration
-- Per-tenant module activation flags + operation mode defaults
-- Feeds into UI feature gating and agent routing

CREATE TABLE IF NOT EXISTS platform_operation_config (
  config_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key    VARCHAR(100) NOT NULL UNIQUE,
  config_value  JSONB        NOT NULL DEFAULT '{}',
  description_en TEXT,
  description_ar TEXT,
  is_sensitive  BOOLEAN      NOT NULL DEFAULT FALSE,
  updated_by    VARCHAR(64),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poc_key ON platform_operation_config(config_key);

INSERT INTO platform_operation_config (config_key, config_value, description_en, description_ar) VALUES
  ('modules_enabled',
   '{"grc": true, "qiyas": false}',
   'Active modules for this tenant workspace',
   'الوحدات النشطة لمساحة عمل هذا المستأجر'),
  ('default_operation_mode',
   '"human_only"',
   'Tenant-wide default operation mode: human_only | hybrid_shadow | hybrid_active | autonomous',
   'وضع التشغيل الافتراضي للمستأجر'),
  ('agent_confidence_threshold',
   '0.85',
   'Minimum AI confidence (0–1) required before autonomous agent action executes',
   'الحد الأدنى لثقة الذكاء الاصطناعي قبل تنفيذ إجراء وكيل مستقل'),
  ('qiyas_grc_sync_enabled',
   'false',
   'Enable automatic Qiyas → GRC maturity score synchronisation',
   'تمكين المزامنة التلقائية من قياس إلى حوكمة المخاطر والامتثال'),
  ('workflow_mode_enforcement',
   '"per_step"',
   'Granularity of operation mode enforcement: tenant_wide | per_team | per_step',
   'دقة تطبيق وضع التشغيل: على مستوى المستأجر أو الفريق أو الخطوة'),
  ('qiyas_auto_task_creation',
   'false',
   'Auto-create GRC remediation tasks when Qiyas gap severity is critical/high',
   'إنشاء مهام معالجة GRC تلقائيًا عند اكتشاف فجوات قياس حرجة أو عالية'),
  ('mode_audit_enabled',
   'true',
   'Log every agent action with its operation mode into mode_operation_log',
   'تسجيل كل إجراء وكيل مع وضع تشغيله في سجل وضع التشغيل')
ON CONFLICT (config_key) DO NOTHING;

-- Per-team operation mode overrides
CREATE TABLE IF NOT EXISTS team_operation_modes (
  team_mode_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id              UUID        NOT NULL UNIQUE REFERENCES teams(team_id) ON DELETE CASCADE,
  operation_mode       VARCHAR(30) NOT NULL DEFAULT 'human_only'
    CHECK (operation_mode IN ('human_only','hybrid_shadow','hybrid_active','autonomous')),
  confidence_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.85
    CHECK (confidence_threshold BETWEEN 0.0 AND 1.0),
  override_reason      TEXT,
  set_by               VARCHAR(64),
  effective_from       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tom_team ON team_operation_modes(team_id);
CREATE INDEX IF NOT EXISTS idx_tom_mode ON team_operation_modes(operation_mode);
