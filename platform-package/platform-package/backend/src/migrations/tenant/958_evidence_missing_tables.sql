-- ============================================================
-- Migration 941: Evidence Module — Missing Tables (MP-09)
-- Owner: Module:Evidence
-- Spec: DOS-AIO-Specs/module-patch-09-evidence-end-to-end.md §5
-- Tables: 10 new tables (8 similar-named tables already exist)
-- ============================================================

-- ═══ 1. Connector Configs ═══
CREATE TABLE IF NOT EXISTS evidence_connector_configs (
  config_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_type       VARCHAR(50) NOT NULL
    CHECK (connector_type IN ('api','sftp','email','cloud_storage','scanner','manual','webhook')),
  connector_name       VARCHAR(200) NOT NULL,
  endpoint_url         VARCHAR(2000),
  auth_method          VARCHAR(50) DEFAULT 'api_key'
    CHECK (auth_method IN ('api_key','oauth2','basic','certificate','none')),
  credentials_ref      VARCHAR(200),
  sync_interval_hours  INT DEFAULT 24,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at         TIMESTAMPTZ,
  last_sync_status     VARCHAR(30) DEFAULT 'never'
    CHECK (last_sync_status IN ('never','success','partial','failed')),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 2. Coverage Gaps ═══
CREATE TABLE IF NOT EXISTS evidence_coverage_gaps (
  gap_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id           UUID,
  obligation_id        UUID,
  framework_id         UUID,
  gap_type             VARCHAR(50) NOT NULL DEFAULT 'missing'
    CHECK (gap_type IN ('missing','stale','insufficient','rejected','expired')),
  severity             VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('critical','high','medium','low')),
  description          TEXT,
  recommended_action   TEXT,
  resolved_at          TIMESTAMPTZ,
  resolved_by          VARCHAR(64),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 3. Dependencies ═══
CREATE TABLE IF NOT EXISTS evidence_dependencies (
  dependency_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id          UUID NOT NULL,
  depends_on_id        UUID NOT NULL,
  dependency_type      VARCHAR(50) NOT NULL DEFAULT 'requires'
    CHECK (dependency_type IN ('requires','supplements','supersedes','validates','contradicts')),
  description          TEXT,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  UNIQUE (evidence_id, depends_on_id, dependency_type)
);

-- ═══ 4. Expiry Alerts ═══
CREATE TABLE IF NOT EXISTS evidence_expiry_alerts (
  alert_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id          UUID NOT NULL,
  alert_type           VARCHAR(50) NOT NULL DEFAULT 'expiring_soon'
    CHECK (alert_type IN ('expiring_soon','expired','stale','review_overdue')),
  alert_date           DATE NOT NULL,
  days_until_expiry    INT,
  notified_users       JSONB DEFAULT '[]',
  acknowledged_at      TIMESTAMPTZ,
  acknowledged_by      VARCHAR(64),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 5. Metadata ═══
CREATE TABLE IF NOT EXISTS evidence_metadata (
  metadata_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id          UUID NOT NULL,
  key                  VARCHAR(200) NOT NULL,
  value                TEXT,
  data_type            VARCHAR(30) DEFAULT 'text'
    CHECK (data_type IN ('text','number','date','boolean','json','url')),
  source               VARCHAR(100),
  confidence           NUMERIC(5,2),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  UNIQUE (evidence_id, key)
);

-- ═══ 6. Multimodal Analysis ═══
CREATE TABLE IF NOT EXISTS evidence_multimodal_analysis (
  analysis_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id          UUID NOT NULL,
  analysis_type        VARCHAR(50) NOT NULL
    CHECK (analysis_type IN ('ocr','nlp','image_classification','sentiment','entity_extraction','summarization')),
  input_format         VARCHAR(50),
  output               JSONB NOT NULL DEFAULT '{}',
  confidence_score     NUMERIC(5,2),
  model_used           VARCHAR(200),
  processing_time_ms   INT,
  status               VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed')),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 7. Scoring Rubrics ═══
CREATE TABLE IF NOT EXISTS evidence_scoring_rubrics (
  rubric_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_name          VARCHAR(200) NOT NULL,
  rubric_code          VARCHAR(100) UNIQUE,
  dimension            VARCHAR(100) NOT NULL,
  criteria             JSONB NOT NULL DEFAULT '[]',
  max_score            NUMERIC(5,2) NOT NULL DEFAULT 100,
  weight               NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 8. Usage Log ═══
CREATE TABLE IF NOT EXISTS evidence_usage_log (
  log_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id          UUID NOT NULL,
  used_by_module       VARCHAR(100) NOT NULL,
  used_by_entity_type  VARCHAR(100),
  used_by_entity_id    UUID,
  usage_type           VARCHAR(50) NOT NULL DEFAULT 'reference'
    CHECK (usage_type IN ('reference','attachment','validation','audit','compliance_proof','training')),
  used_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_by              VARCHAR(64),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_usage_evidence ON evidence_usage_log (evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_usage_module ON evidence_usage_log (used_by_module);

-- ═══ 9. Workflows ═══
CREATE TABLE IF NOT EXISTS evidence_workflows (
  workflow_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id          UUID NOT NULL,
  workflow_type        VARCHAR(50) NOT NULL DEFAULT 'review'
    CHECK (workflow_type IN ('review','approval','collection','validation','archival','disposal')),
  workflow_instance_id UUID,
  status               VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','cancelled','failed')),
  initiated_by         VARCHAR(64),
  completed_at         TIMESTAMPTZ,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 10. Collection Schedules ═══
CREATE TABLE IF NOT EXISTS evidence_collection_schedules (
  schedule_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_type_id     UUID,
  connector_id         UUID REFERENCES evidence_connector_configs(config_id),
  schedule_name        VARCHAR(200) NOT NULL,
  cron_expression      VARCHAR(100),
  frequency            VARCHAR(30) NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('daily','weekly','biweekly','monthly','quarterly','annually','on_demand')),
  next_run_at          TIMESTAMPTZ,
  last_run_at          TIMESTAMPTZ,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ Indexes ═══
CREATE INDEX IF NOT EXISTS idx_evidence_connector_active ON evidence_connector_configs (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_gaps_severity ON evidence_coverage_gaps (severity) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_gaps_control ON evidence_coverage_gaps (control_id);
CREATE INDEX IF NOT EXISTS idx_evidence_deps_evidence ON evidence_dependencies (evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_expiry_date ON evidence_expiry_alerts (alert_date);
CREATE INDEX IF NOT EXISTS idx_evidence_metadata_evidence ON evidence_metadata (evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_multimodal_evidence ON evidence_multimodal_analysis (evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_multimodal_status ON evidence_multimodal_analysis (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_workflows_evidence ON evidence_workflows (evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_workflows_status ON evidence_workflows (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_schedules_active ON evidence_collection_schedules (is_active) WHERE deleted_at IS NULL;
