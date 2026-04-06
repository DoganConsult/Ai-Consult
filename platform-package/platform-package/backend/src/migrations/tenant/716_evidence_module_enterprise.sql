-- Migration 716: Evidence Module Enterprise Enhancement
-- Full evidence lifecycle: taxonomy, freshness, packages, reuse, quality, connectors, dashboards

-- ═══════════════════════════════════════════════════════════════════
-- 1. REFERENCE / TAXONOMY TABLES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evidence_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(50)  NOT NULL UNIQUE,
  label_en        VARCHAR(200) NOT NULL,
  label_ar        VARCHAR(200),
  description     TEXT,
  category        VARCHAR(50)  DEFAULT 'general',
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence_source_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(50)  NOT NULL UNIQUE,
  label_en        VARCHAR(200) NOT NULL,
  label_ar        VARCHAR(200),
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence_confidentiality_levels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(50)  NOT NULL UNIQUE,
  label_en        VARCHAR(200) NOT NULL,
  label_ar        VARCHAR(200),
  sort_order      INTEGER      NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence_quality_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code       VARCHAR(50)  NOT NULL UNIQUE,
  rule_name       VARCHAR(200) NOT NULL,
  check_type      VARCHAR(50)  NOT NULL DEFAULT 'auto',
  threshold       NUMERIC(5,2) DEFAULT 0.00,
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence_rejection_reasons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(50)  NOT NULL UNIQUE,
  label_en        VARCHAR(200) NOT NULL,
  label_ar        VARCHAR(200),
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- 2. ALTER EXISTING evidence TABLE — add enterprise columns
-- ═══════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'evidence_code') THEN
    ALTER TABLE evidence ADD COLUMN evidence_code VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'description') THEN
    ALTER TABLE evidence ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'source_type_id') THEN
    ALTER TABLE evidence ADD COLUMN source_type_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'confidentiality_level_id') THEN
    ALTER TABLE evidence ADD COLUMN confidentiality_level_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'quality_status') THEN
    ALTER TABLE evidence ADD COLUMN quality_status VARCHAR(30) DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'freshness_status') THEN
    ALTER TABLE evidence ADD COLUMN freshness_status VARCHAR(30) DEFAULT 'current';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'valid_from') THEN
    ALTER TABLE evidence ADD COLUMN valid_from TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'valid_to') THEN
    ALTER TABLE evidence ADD COLUMN valid_to TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'reusable_flag') THEN
    ALTER TABLE evidence ADD COLUMN reusable_flag BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'source_system_name') THEN
    ALTER TABLE evidence ADD COLUMN source_system_name VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'source_ref') THEN
    ALTER TABLE evidence ADD COLUMN source_ref TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'evidence_type_id') THEN
    ALTER TABLE evidence ADD COLUMN evidence_type_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'reviewed_by_user_id') THEN
    ALTER TABLE evidence ADD COLUMN reviewed_by_user_id VARCHAR(128);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_code ON evidence (evidence_code) WHERE evidence_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_freshness ON evidence (freshness_status);
CREATE INDEX IF NOT EXISTS idx_evidence_quality ON evidence (quality_status);
CREATE INDEX IF NOT EXISTS idx_evidence_valid_to ON evidence (valid_to) WHERE valid_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_reusable ON evidence (reusable_flag) WHERE reusable_flag = true;

-- ═══════════════════════════════════════════════════════════════════
-- 3. TAGS & LINKS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evidence_tags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id     UUID         NOT NULL,
  tag_key         VARCHAR(100) NOT NULL,
  tag_value       VARCHAR(500),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_tags_eid ON evidence_tags (evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_tags_key ON evidence_tags (tag_key);

CREATE TABLE IF NOT EXISTS evidence_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id         UUID         NOT NULL,
  linked_object_type  VARCHAR(50)  NOT NULL,
  linked_object_id    VARCHAR(200) NOT NULL,
  link_type           VARCHAR(50)  NOT NULL DEFAULT 'supports',
  notes               TEXT,
  created_by          VARCHAR(128),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_links_eid ON evidence_links (evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_links_obj ON evidence_links (linked_object_type, linked_object_id);

-- ═══════════════════════════════════════════════════════════════════
-- 4. QUALITY ASSESSMENTS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evidence_quality_assessments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id         UUID         NOT NULL,
  review_id           UUID,
  completeness_result VARCHAR(30)  NOT NULL DEFAULT 'not_assessed',
  scope_match_result  VARCHAR(30)  NOT NULL DEFAULT 'not_assessed',
  authenticity_result VARCHAR(30)  NOT NULL DEFAULT 'not_assessed',
  readability_result  VARCHAR(30)  NOT NULL DEFAULT 'not_assessed',
  quality_score       NUMERIC(5,2) DEFAULT 0.00,
  notes               TEXT,
  assessed_by         VARCHAR(128) NOT NULL,
  assessed_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_qa_eid ON evidence_quality_assessments (evidence_id);

-- ═══════════════════════════════════════════════════════════════════
-- 5. FRESHNESS & PROVENANCE
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evidence_freshness_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id           UUID         NOT NULL,
  last_verified_at      TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ,
  freshness_band        VARCHAR(30)  NOT NULL DEFAULT 'unknown',
  refresh_due_at        TIMESTAMPTZ,
  verification_method   VARCHAR(50),
  verified_by           VARCHAR(128),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_freshness_eid ON evidence_freshness_records (evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_freshness_band ON evidence_freshness_records (freshness_band);
CREATE INDEX IF NOT EXISTS idx_evidence_freshness_expires ON evidence_freshness_records (expires_at) WHERE expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS evidence_verification_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id     UUID         NOT NULL,
  event_type      VARCHAR(50)  NOT NULL,
  verified_by     VARCHAR(128),
  verified_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_evidence_verif_eid ON evidence_verification_events (evidence_id);

-- ═══════════════════════════════════════════════════════════════════
-- 6. REUSE — DUPLICATE CANDIDATES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evidence_duplicate_candidates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_a_id     UUID         NOT NULL,
  evidence_b_id     UUID         NOT NULL,
  similarity_score  NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
  detection_method  VARCHAR(50)  DEFAULT 'hash',
  resolved          BOOLEAN      NOT NULL DEFAULT false,
  resolution        VARCHAR(50),
  resolved_by       VARCHAR(128),
  resolved_at       TIMESTAMPTZ,
  detected_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (evidence_a_id, evidence_b_id)
);

CREATE INDEX IF NOT EXISTS idx_evidence_dup_a ON evidence_duplicate_candidates (evidence_a_id);
CREATE INDEX IF NOT EXISTS idx_evidence_dup_b ON evidence_duplicate_candidates (evidence_b_id);
CREATE INDEX IF NOT EXISTS idx_evidence_dup_unresolved ON evidence_duplicate_candidates (resolved) WHERE resolved = false;

-- ═══════════════════════════════════════════════════════════════════
-- 7. PACKAGES & EXPORTS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evidence_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_code    VARCHAR(50)  NOT NULL,
  name            VARCHAR(300) NOT NULL,
  package_type    VARCHAR(50)  NOT NULL DEFAULT 'audit',
  description     TEXT,
  status          VARCHAR(30)  NOT NULL DEFAULT 'draft',
  scope_type      VARCHAR(50),
  scope_id        VARCHAR(200),
  item_count      INTEGER      NOT NULL DEFAULT 0,
  created_by      VARCHAR(128) NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_pkg_code ON evidence_packages (package_code);
CREATE INDEX IF NOT EXISTS idx_evidence_pkg_type ON evidence_packages (package_type);
CREATE INDEX IF NOT EXISTS idx_evidence_pkg_status ON evidence_packages (status);

CREATE TABLE IF NOT EXISTS evidence_package_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id      UUID         NOT NULL REFERENCES evidence_packages(id) ON DELETE CASCADE,
  evidence_id     UUID         NOT NULL,
  sort_order      INTEGER      NOT NULL DEFAULT 0,
  added_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (package_id, evidence_id)
);

CREATE INDEX IF NOT EXISTS idx_evidence_pkg_items_pkg ON evidence_package_items (package_id);
CREATE INDEX IF NOT EXISTS idx_evidence_pkg_items_eid ON evidence_package_items (evidence_id);

CREATE TABLE IF NOT EXISTS evidence_exports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id      UUID         NOT NULL REFERENCES evidence_packages(id) ON DELETE CASCADE,
  format          VARCHAR(30)  NOT NULL DEFAULT 'zip',
  status          VARCHAR(30)  NOT NULL DEFAULT 'pending',
  file_path       TEXT,
  file_size       BIGINT,
  exported_by     VARCHAR(128) NOT NULL,
  exported_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  download_count  INTEGER      NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_evidence_exports_pkg ON evidence_exports (package_id);

CREATE TABLE IF NOT EXISTS evidence_export_manifests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id       UUID         NOT NULL REFERENCES evidence_exports(id) ON DELETE CASCADE,
  manifest_json   JSONB        NOT NULL DEFAULT '{}',
  checksum        VARCHAR(128),
  generated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- 8. CONNECTORS — COLLECTION RULES & RUNS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evidence_collection_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id          UUID         NOT NULL,
  rule_name             VARCHAR(200) NOT NULL,
  source_query          TEXT,
  target_evidence_type  VARCHAR(50),
  mapping_rules         JSONB        DEFAULT '{}',
  is_active             BOOLEAN      NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_coll_rules_conn ON evidence_collection_rules (connector_id);

CREATE TABLE IF NOT EXISTS evidence_collection_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id    UUID         NOT NULL,
  started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  result_status   VARCHAR(30)  NOT NULL DEFAULT 'running',
  items_collected INTEGER      NOT NULL DEFAULT 0,
  items_failed    INTEGER      NOT NULL DEFAULT 0,
  error_message   TEXT,
  run_log_ref     TEXT
);

CREATE INDEX IF NOT EXISTS idx_evidence_coll_runs_conn ON evidence_collection_runs (connector_id);
CREATE INDEX IF NOT EXISTS idx_evidence_coll_runs_status ON evidence_collection_runs (result_status);

-- ═══════════════════════════════════════════════════════════════════
-- 9. OPS — DASHBOARD CACHE
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evidence_dashboard_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key       VARCHAR(200) NOT NULL UNIQUE,
  payload         JSONB        NOT NULL DEFAULT '{}',
  computed_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ttl_seconds     INTEGER      NOT NULL DEFAULT 300
);

-- ═══════════════════════════════════════════════════════════════════
-- 10. EVIDENCE ADMIN SETTINGS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evidence_admin_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key         VARCHAR(100) NOT NULL UNIQUE,
  setting_value       JSONB        NOT NULL DEFAULT '{}',
  description         VARCHAR(500),
  updated_by          VARCHAR(128),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- 11. SEED REFERENCE DATA
-- ═══════════════════════════════════════════════════════════════════

-- Evidence Types
INSERT INTO evidence_types (code, label_en, label_ar, category) VALUES
  ('document',              'Document',                    'وثيقة',               'general'),
  ('screenshot',            'Screenshot',                  'لقطة شاشة',          'visual'),
  ('report_export',         'Report Export',               'تصدير تقرير',        'report'),
  ('config_snapshot',       'Configuration Snapshot',      'لقطة إعدادات',       'technical'),
  ('approval_record',       'Approval Record',             'سجل موافقة',         'workflow'),
  ('ticket_record',         'Ticket Record',               'سجل تذكرة',          'workflow'),
  ('system_log',            'System Log Extract',          'مستخرج سجل نظام',    'technical'),
  ('training_proof',        'Training Completion Proof',   'إثبات إكمال تدريب',  'hr'),
  ('attestation',           'Attestation',                 'شهادة إقرار',        'compliance'),
  ('testing_artifact',      'Testing Artifact',            'مخرج اختبار',        'audit'),
  ('policy_ack',            'Policy Acknowledgment',       'إقرار سياسة',        'compliance'),
  ('third_party_cert',      'Third-Party Certificate',     'شهادة طرف ثالث',     'external'),
  ('api_collected',         'API-Collected Evidence',      'دليل مجمع عبر API',  'automated')
ON CONFLICT (code) DO NOTHING;

-- Evidence Source Types
INSERT INTO evidence_source_types (code, label_en, label_ar) VALUES
  ('manual_upload',      'Manual Upload',               'رفع يدوي'),
  ('dms_link',           'Link to DMS',                 'رابط نظام إدارة وثائق'),
  ('generated_report',   'Generated Report',            'تقرير مولّد'),
  ('connector_pull',     'System Connector Pull',       'سحب عبر موصل'),
  ('scheduled_auto',     'Scheduled Auto-Collection',   'جمع تلقائي مجدول'),
  ('api_ingestion',      'API Ingestion',               'استيعاب عبر API'),
  ('archive_import',     'Imported Archive',            'أرشيف مستورد')
ON CONFLICT (code) DO NOTHING;

-- Confidentiality Levels
INSERT INTO evidence_confidentiality_levels (code, label_en, label_ar, sort_order) VALUES
  ('public',         'Public',          'عام',        0),
  ('internal',       'Internal',        'داخلي',      1),
  ('confidential',   'Confidential',    'سري',        2),
  ('restricted',     'Restricted',      'مقيد',       3),
  ('top_secret',     'Top Secret',      'سري للغاية', 4)
ON CONFLICT (code) DO NOTHING;

-- Evidence Quality Rules
INSERT INTO evidence_quality_rules (rule_code, rule_name, check_type, threshold) VALUES
  ('completeness',    'Completeness Check',      'auto',   80.00),
  ('scope_match',     'Scope Match Verification', 'manual', 70.00),
  ('authenticity',    'Authenticity Validation',  'auto',   90.00),
  ('readability',     'Readability Check',        'auto',   60.00),
  ('freshness',       'Freshness Threshold',      'auto',   85.00),
  ('reusability',     'Reusability Assessment',   'manual', 75.00)
ON CONFLICT (rule_code) DO NOTHING;

-- Rejection Reasons
INSERT INTO evidence_rejection_reasons (code, label_en, label_ar) VALUES
  ('incomplete',      'Incomplete Evidence',       'دليل غير مكتمل'),
  ('scope_mismatch',  'Scope Mismatch',            'عدم تطابق النطاق'),
  ('expired',         'Evidence Expired',          'دليل منتهي الصلاحية'),
  ('unreadable',      'Unreadable or Corrupt',     'غير قابل للقراءة أو تالف'),
  ('unverified',      'Unverified Source',         'مصدر غير موثق'),
  ('wrong_type',      'Wrong Evidence Type',       'نوع دليل خاطئ'),
  ('duplicate',       'Duplicate Submission',      'تقديم مكرر'),
  ('insufficient',    'Insufficient Detail',       'تفاصيل غير كافية')
ON CONFLICT (code) DO NOTHING;

-- Default Admin Settings
INSERT INTO evidence_admin_settings (setting_key, setting_value, description) VALUES
  ('retention_days',           '{"default": 365, "audit": 2555, "regulatory": 2555}',  'Evidence retention periods in days'),
  ('freshness_thresholds',     '{"current_days": 90, "stale_days": 180, "expired_days": 365}', 'Freshness band thresholds'),
  ('review_rules',             '{"auto_approve_low_risk": false, "require_dual_review": false, "max_review_days": 14}', 'Review workflow rules'),
  ('package_templates',        '{"audit": {"name_pattern": "AUD-{year}-{seq}"}, "regulator": {"name_pattern": "REG-{year}-{seq}"}, "framework": {"name_pattern": "FW-{code}-{year}-{seq}"}}', 'Package naming templates'),
  ('notification_rules',       '{"overdue_reminder_hours": 48, "expiry_warning_days": 30, "review_nudge_hours": 72}', 'Notification trigger rules'),
  ('quality_thresholds',       '{"excellent": 90, "good": 75, "acceptable": 60, "poor": 0}', 'Quality score tier thresholds')
ON CONFLICT (setting_key) DO NOTHING;
