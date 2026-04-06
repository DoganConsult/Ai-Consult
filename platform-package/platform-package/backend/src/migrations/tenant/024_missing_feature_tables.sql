-- ============================================
-- Shahin GRC — Tenant Migration 024
-- Missing Feature Tables
-- DPIA, SLA, ESG, Locations, Signatures,
-- Saved Views, Favorites, Dashboard Shares,
-- File Storage, Email Templates
-- ============================================

-- ── DPIA Assessments (Privacy Hub) ───────────────────────────────────────────
-- Table may already exist with a simpler schema; extend it with ADD COLUMN IF NOT EXISTS
CREATE TABLE IF NOT EXISTS dpia_assessments (
  dpia_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  created_by VARCHAR(64),
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS processing_activity TEXT;
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS data_categories TEXT[] DEFAULT '{}';
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS data_subjects TEXT[] DEFAULT '{}';
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS legal_basis VARCHAR(100);
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS necessity_assessment TEXT;
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS risk_assessment JSONB DEFAULT '{}';
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS mitigation_measures JSONB DEFAULT '[]';
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS consultation_required BOOLEAN DEFAULT FALSE;
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS consultation_details TEXT;
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS dpo_opinion TEXT;
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS overall_risk_level VARCHAR(20) DEFAULT 'medium';
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS assessor_id VARCHAR(64);
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS reviewer_id VARCHAR(64);
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS approved_by VARCHAR(64);
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS linked_ropa_entry_id UUID;
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS linked_system_ids TEXT[] DEFAULT '{}';
ALTER TABLE dpia_assessments ADD COLUMN IF NOT EXISTS workspace_id UUID;
CREATE INDEX IF NOT EXISTS idx_dpia_status ON dpia_assessments (status);
CREATE INDEX IF NOT EXISTS idx_dpia_risk_level ON dpia_assessments (overall_risk_level);

-- ── SLA Definitions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sla_definitions (
  sla_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  entity_type VARCHAR(50) NOT NULL,
  metric_type VARCHAR(50) NOT NULL
    CHECK (metric_type IN ('response_time', 'resolution_time', 'uptime', 'review_cycle', 'evidence_collection', 'remediation', 'custom')),
  target_value DECIMAL(10,2) NOT NULL,
  target_unit VARCHAR(20) NOT NULL DEFAULT 'hours'
    CHECK (target_unit IN ('minutes', 'hours', 'days', 'percent')),
  warning_threshold DECIMAL(10,2),
  critical_threshold DECIMAL(10,2),
  escalation_chain JSONB DEFAULT '[]',
  applicable_severities TEXT[] DEFAULT '{low,medium,high,critical}',
  applicable_priorities TEXT[] DEFAULT '{low,medium,high,critical}',
  enabled BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sla_entity_type ON sla_definitions (entity_type, enabled);

CREATE TABLE IF NOT EXISTS sla_breaches (
  breach_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sla_id UUID NOT NULL REFERENCES sla_definitions(sla_id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  expected_value DECIMAL(10,2) NOT NULL,
  actual_value DECIMAL(10,2) NOT NULL,
  breach_severity VARCHAR(20) NOT NULL DEFAULT 'warning'
    CHECK (breach_severity IN ('warning', 'critical')),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by VARCHAR(64),
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sla_breaches_sla ON sla_breaches (sla_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sla_breaches_entity ON sla_breaches (entity_type, entity_id);

-- ── ESG Metrics ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS esg_categories (
  category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar VARCHAR(20) NOT NULL
    CHECK (pillar IN ('environmental', 'social', 'governance')),
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  description_en TEXT,
  description_ar TEXT,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS esg_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES esg_categories(category_id) ON DELETE CASCADE,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  unit VARCHAR(50) NOT NULL,
  target_value DECIMAL(12,2),
  current_value DECIMAL(12,2),
  previous_value DECIMAL(12,2),
  data_source VARCHAR(100),
  reporting_period VARCHAR(20) NOT NULL DEFAULT 'annual'
    CHECK (reporting_period IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
  framework_refs TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'on_track'
    CHECK (status IN ('on_track', 'at_risk', 'off_track', 'not_started')),
  last_updated_by VARCHAR(64),
  workspace_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_esg_metrics_category ON esg_metrics (category_id);
CREATE INDEX IF NOT EXISTS idx_esg_metrics_pillar ON esg_categories (pillar, active);

-- ── Locations ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
  location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  location_type VARCHAR(30) NOT NULL DEFAULT 'office'
    CHECK (location_type IN ('headquarters', 'office', 'branch', 'data_center', 'warehouse', 'remote', 'cloud_region')),
  parent_location_id UUID REFERENCES locations(location_id),
  address_line1 VARCHAR(500),
  address_line2 VARCHAR(500),
  city VARCHAR(100),
  state_province VARCHAR(100),
  country VARCHAR(3) DEFAULT 'SAU',
  postal_code VARCHAR(20),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  timezone VARCHAR(50) DEFAULT 'Asia/Riyadh',
  employee_count INT DEFAULT 0,
  is_critical BOOLEAN DEFAULT FALSE,
  applicable_jurisdictions TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'planned', 'decommissioned')),
  workspace_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations (location_type, status);
CREATE INDEX IF NOT EXISTS idx_locations_country ON locations (country);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations (parent_location_id) WHERE parent_location_id IS NOT NULL;

-- ── Digital Signatures ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS digital_signatures (
  signature_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  signer_id VARCHAR(64) NOT NULL,
  signer_name VARCHAR(255) NOT NULL,
  signer_role VARCHAR(50),
  signature_type VARCHAR(30) NOT NULL DEFAULT 'approval'
    CHECK (signature_type IN ('approval', 'review', 'acknowledgment', 'attestation', 'certification')),
  signature_hash VARCHAR(128) NOT NULL,
  certificate_ref VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'valid'
    CHECK (status IN ('valid', 'revoked', 'expired')),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_signatures_entity ON digital_signatures (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_signatures_signer ON digital_signatures (signer_id, signed_at DESC);

-- ── Saved Views ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_views (
  view_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  page_route VARCHAR(200) NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  sort_config JSONB DEFAULT '{}',
  column_config JSONB DEFAULT '[]',
  is_default BOOLEAN DEFAULT FALSE,
  shared BOOLEAN DEFAULT FALSE,
  shared_with_roles TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saved_views_user ON saved_views (user_id, page_route);
CREATE INDEX IF NOT EXISTS idx_saved_views_shared ON saved_views (page_route, shared) WHERE shared = TRUE;

-- ── Favorites ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  favorite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  entity_title VARCHAR(500),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites (user_id, sort_order);

-- ── Dashboard Shares ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dashboard_shares (
  share_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_code VARCHAR(80) NOT NULL,
  shared_by VARCHAR(64) NOT NULL,
  share_type VARCHAR(20) NOT NULL DEFAULT 'user'
    CHECK (share_type IN ('user', 'role', 'team', 'public')),
  shared_with VARCHAR(100) NOT NULL,
  permission VARCHAR(20) NOT NULL DEFAULT 'view'
    CHECK (permission IN ('view', 'edit', 'admin')),
  custom_layout JSONB,
  filters JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dashboard_shares_code ON dashboard_shares (dashboard_code, active);
CREATE INDEX IF NOT EXISTS idx_dashboard_shares_target ON dashboard_shares (share_type, shared_with, active);

-- ── File Storage Metadata ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS file_storage (
  file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_filename VARCHAR(500) NOT NULL,
  storage_provider VARCHAR(20) NOT NULL DEFAULT 'local'
    CHECK (storage_provider IN ('local', 's3', 'azure_blob', 'gcs')),
  storage_key VARCHAR(1000) NOT NULL,
  storage_bucket VARCHAR(255),
  content_type VARCHAR(100),
  file_size_bytes BIGINT NOT NULL,
  content_hash VARCHAR(128) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  uploaded_by VARCHAR(64) NOT NULL,
  access_level VARCHAR(20) DEFAULT 'private'
    CHECK (access_level IN ('private', 'tenant', 'public')),
  virus_scan_status VARCHAR(20) DEFAULT 'pending'
    CHECK (virus_scan_status IN ('pending', 'clean', 'infected', 'error', 'skipped')),
  virus_scan_at TIMESTAMPTZ,
  retention_until DATE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_file_storage_entity ON file_storage (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_storage_hash ON file_storage (content_hash);
CREATE INDEX IF NOT EXISTS idx_file_storage_uploaded_by ON file_storage (uploaded_by, created_at DESC);

-- ── Email Templates ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(100) NOT NULL UNIQUE,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  subject_en VARCHAR(500) NOT NULL,
  subject_ar VARCHAR(500),
  body_html_en TEXT NOT NULL,
  body_html_ar TEXT,
  body_text_en TEXT,
  body_text_ar TEXT,
  variables JSONB DEFAULT '[]',
  category VARCHAR(50) NOT NULL DEFAULT 'system'
    CHECK (category IN ('system', 'notification', 'approval', 'report', 'onboarding', 'marketing', 'custom')),
  enabled BOOLEAN DEFAULT TRUE,
  version INT DEFAULT 1,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates (template_key, enabled);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates (category, enabled);

CREATE TABLE IF NOT EXISTS email_send_log (
  send_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(100),
  recipient_email VARCHAR(255) NOT NULL,
  recipient_user_id VARCHAR(64),
  subject VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'bounced', 'failed')),
  provider VARCHAR(30),
  provider_message_id VARCHAR(255),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON email_send_log (recipient_email, queued_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_status ON email_send_log (status, queued_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_template ON email_send_log (template_key, queued_at DESC);
