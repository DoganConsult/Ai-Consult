-- Migration 716: Evidence Reference Taxonomy
-- Creates lookup/reference tables for evidence types, source types,
-- confidentiality levels, and quality rules used across the evidence module.

-- 1. evidence_types — canonical evidence type taxonomy
CREATE TABLE IF NOT EXISTS evidence_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(50) NOT NULL UNIQUE,
  name_en       VARCHAR(150) NOT NULL,
  name_ar       VARCHAR(150),
  description_en TEXT,
  category      VARCHAR(50) NOT NULL DEFAULT 'general',
  default_retention_months INT DEFAULT 36,
  is_system     BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_types_category ON evidence_types(category);

-- Seed default evidence types
INSERT INTO evidence_types (code, name_en, name_ar, category, is_system, sort_order) VALUES
  ('document',              'Document',                    'مستند',                'general',      TRUE, 1),
  ('screenshot',            'Screenshot',                  'لقطة شاشة',            'general',      TRUE, 2),
  ('report_export',         'Report Export',               'تصدير تقرير',           'general',      TRUE, 3),
  ('config_snapshot',       'Configuration Snapshot',      'لقطة إعدادات',          'technical',    TRUE, 4),
  ('approval_record',       'Approval Record',             'سجل موافقة',            'workflow',     TRUE, 5),
  ('ticket_record',         'Ticket Record',               'سجل تذكرة',             'workflow',     TRUE, 6),
  ('system_log',            'System Log Extract',          'مستخرج سجل نظام',       'technical',    TRUE, 7),
  ('training_proof',        'Training Completion Proof',   'إثبات إكمال تدريب',     'hr',           TRUE, 8),
  ('attestation',           'Attestation',                 'شهادة إقرار',           'compliance',   TRUE, 9),
  ('testing_artifact',      'Testing Artifact',            'مخرج اختبار',           'audit',        TRUE, 10),
  ('policy_ack',            'Policy Acknowledgment Proof', 'إثبات إقرار سياسة',     'compliance',   TRUE, 11),
  ('third_party_cert',      'Third-Party Certificate',     'شهادة طرف ثالث',        'external',     TRUE, 12),
  ('api_collected',         'API-Collected Evidence',      'دليل مجموع عبر API',    'automated',    TRUE, 13)
ON CONFLICT (code) DO NOTHING;

-- 2. evidence_source_types — how evidence was collected/obtained
CREATE TABLE IF NOT EXISTS evidence_source_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(50) NOT NULL UNIQUE,
  name_en       VARCHAR(150) NOT NULL,
  name_ar       VARCHAR(150),
  description_en TEXT,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO evidence_source_types (code, name_en, name_ar, sort_order) VALUES
  ('manual_upload',     'Manual Upload',              'رفع يدوي',           1),
  ('dms_link',          'Link to DMS',                'ربط بنظام إدارة وثائق', 2),
  ('generated_report',  'Generated Report',           'تقرير مولّد',         3),
  ('connector_pull',    'System Connector Pull',      'سحب من موصّل نظام',   4),
  ('scheduled_auto',    'Scheduled Automated Collection', 'جمع آلي مجدول',   5),
  ('api_ingestion',     'API Ingestion',              'ابتلاع عبر API',     6),
  ('imported_archive',  'Imported Archive / ZIP',     'أرشيف مستورد / ZIP',  7)
ON CONFLICT (code) DO NOTHING;

-- 3. evidence_confidentiality_levels — classification labels
CREATE TABLE IF NOT EXISTS evidence_confidentiality_levels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(30) NOT NULL UNIQUE,
  name_en       VARCHAR(100) NOT NULL,
  name_ar       VARCHAR(100),
  description_en TEXT,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO evidence_confidentiality_levels (code, name_en, name_ar, sort_order) VALUES
  ('public',       'Public',       'عام',        1),
  ('internal',     'Internal',     'داخلي',       2),
  ('confidential', 'Confidential', 'سري',        3),
  ('restricted',   'Restricted',   'مقيّد',       4),
  ('top_secret',   'Top Secret',   'سري للغاية',  5)
ON CONFLICT (code) DO NOTHING;

-- 4. evidence_quality_rules — configurable quality scoring dimensions
CREATE TABLE IF NOT EXISTS evidence_quality_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code     VARCHAR(50) NOT NULL UNIQUE,
  name_en       VARCHAR(150) NOT NULL,
  name_ar       VARCHAR(150),
  description_en TEXT,
  dimension     VARCHAR(30) NOT NULL,
  weight        NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  threshold_min INT DEFAULT 0,
  threshold_max INT DEFAULT 100,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_quality_rules_active ON evidence_quality_rules(active);

INSERT INTO evidence_quality_rules (rule_code, name_en, dimension, weight) VALUES
  ('completeness',    'Completeness',     'completeness',  1.00),
  ('currentness',     'Currentness',      'currentness',   1.00),
  ('authenticity',    'Authenticity',      'authenticity',  0.80),
  ('readability',     'Readability',       'readability',   0.60),
  ('scope_match',     'Scope Match',       'scope_match',   1.00),
  ('provenance',      'Provenance Trail',  'provenance',    0.70),
  ('format_quality',  'Format Quality',    'format',        0.50),
  ('metadata_quality','Metadata Quality',  'metadata',      0.80)
ON CONFLICT (rule_code) DO NOTHING;
