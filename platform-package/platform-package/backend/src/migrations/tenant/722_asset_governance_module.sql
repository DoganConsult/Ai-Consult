-- Migration 722: Asset / IT / Dependency Governance Module
-- Extends existing assets table (migration 072) and adds applications, business services,
-- dependency graph, classification, ownership tracking, vendor/evidence links, lifecycle events.

-- ═══════════════════════════════════════════════════════════════════
-- 1. ALTER existing assets table — add governance columns
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_category VARCHAR(50) DEFAULT 'hardware';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS parent_asset_id UUID;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS business_service_id UUID;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS data_classification_id UUID;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS acquisition_date DATE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS disposal_date DATE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(30) DEFAULT 'operation';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS valuation_amount NUMERIC(15,2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS valuation_currency VARCHAR(3) DEFAULT 'SAR';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS compliance_score NUMERIC(5,2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS risk_score NUMERIC(5,2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS last_scan_at TIMESTAMPTZ;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS cmdb_external_id VARCHAR(255);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS external_exposure BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_assets_category ON assets (asset_category);
CREATE INDEX IF NOT EXISTS idx_assets_lifecycle_stage ON assets (lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_assets_parent ON assets (parent_asset_id) WHERE parent_asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_service ON assets (business_service_id) WHERE business_service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_classification ON assets (data_classification_id) WHERE data_classification_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_cmdb ON assets (cmdb_external_id) WHERE cmdb_external_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 2. applications — software / system inventory
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS applications (
  application_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  name_en             VARCHAR(255),
  name_ar             VARCHAR(255),
  app_type            VARCHAR(50) DEFAULT 'web',
  vendor              VARCHAR(255),
  version             VARCHAR(50),
  environment         VARCHAR(30) DEFAULT 'production',
  business_owner      VARCHAR(255),
  technical_owner     VARCHAR(255),
  department          VARCHAR(255),
  criticality         VARCHAR(20) DEFAULT 'medium',
  status              VARCHAR(30) DEFAULT 'active',
  hosting_type        VARCHAR(30) DEFAULT 'on-premise',
  hosting_provider    VARCHAR(255),
  url                 VARCHAR(500),
  data_classification VARCHAR(50),
  compliance_status   VARCHAR(30),
  license_type        VARCHAR(50),
  license_expiry      DATE,
  linked_asset_ids    UUID[] DEFAULT '{}',
  metadata            JSONB DEFAULT '{}',
  tags                TEXT[] DEFAULT '{}',
  created_by          VARCHAR(255),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications (status);
CREATE INDEX IF NOT EXISTS idx_applications_criticality ON applications (criticality);
CREATE INDEX IF NOT EXISTS idx_applications_type ON applications (app_type);
CREATE INDEX IF NOT EXISTS idx_applications_deleted ON applications (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_applications_tags ON applications USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_applications_metadata ON applications USING GIN (metadata);

-- ═══════════════════════════════════════════════════════════════════
-- 3. business_services — service catalog
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS business_services (
  service_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  name_en               VARCHAR(255),
  name_ar               VARCHAR(255),
  description           TEXT,
  service_type          VARCHAR(50) DEFAULT 'supporting',
  business_owner        VARCHAR(255),
  technical_owner       VARCHAR(255),
  department            VARCHAR(255),
  criticality           VARCHAR(20) DEFAULT 'medium',
  status                VARCHAR(30) DEFAULT 'active',
  sla_target_uptime     NUMERIC(5,2),
  rto_hours             INTEGER,
  rpo_hours             INTEGER,
  parent_service_id     UUID,
  linked_application_ids UUID[] DEFAULT '{}',
  linked_asset_ids      UUID[] DEFAULT '{}',
  metadata              JSONB DEFAULT '{}',
  tags                  TEXT[] DEFAULT '{}',
  created_by            VARCHAR(255),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bsvc_status ON business_services (status);
CREATE INDEX IF NOT EXISTS idx_bsvc_criticality ON business_services (criticality);
CREATE INDEX IF NOT EXISTS idx_bsvc_type ON business_services (service_type);
CREATE INDEX IF NOT EXISTS idx_bsvc_parent ON business_services (parent_service_id) WHERE parent_service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bsvc_deleted ON business_services (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bsvc_tags ON business_services USING GIN (tags);

-- ═══════════════════════════════════════════════════════════════════
-- 4. asset_owners — polymorphic ownership with history
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS asset_owners (
  ownership_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(30) NOT NULL,
  entity_id     UUID NOT NULL,
  owner_type    VARCHAR(30) NOT NULL,
  owner_user_id VARCHAR(255) NOT NULL,
  assigned_at   TIMESTAMPTZ DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ,
  assigned_by   VARCHAR(255),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_owners_active
  ON asset_owners (entity_type, entity_id, owner_type)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_asset_owners_entity ON asset_owners (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_asset_owners_user ON asset_owners (owner_user_id);

-- ═══════════════════════════════════════════════════════════════════
-- 5. asset_dependencies — dependency graph edges
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS asset_dependencies (
  dependency_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type      VARCHAR(30) NOT NULL,
  source_id        UUID NOT NULL,
  target_type      VARCHAR(30) NOT NULL,
  target_id        UUID NOT NULL,
  dependency_type  VARCHAR(50) DEFAULT 'depends_on',
  criticality      VARCHAR(20) DEFAULT 'medium',
  direction        VARCHAR(15) DEFAULT 'outbound',
  notes            TEXT,
  metadata         JSONB DEFAULT '{}',
  created_by       VARCHAR(255),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_deps_unique
  ON asset_dependencies (source_type, source_id, target_type, target_id, dependency_type)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_asset_deps_source ON asset_dependencies (source_type, source_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_asset_deps_target ON asset_dependencies (target_type, target_id) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 6. asset_classifications — data classification definitions
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS asset_classifications (
  classification_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                    VARCHAR(50) NOT NULL UNIQUE,
  name_en                 VARCHAR(255) NOT NULL,
  name_ar                 VARCHAR(255),
  description             TEXT,
  level                   INTEGER NOT NULL,
  color                   VARCHAR(7),
  handling_requirements   TEXT,
  retention_period_days   INTEGER,
  requires_encryption     BOOLEAN DEFAULT false,
  requires_dlp            BOOLEAN DEFAULT false,
  metadata                JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default classifications
INSERT INTO asset_classifications (code, name_en, name_ar, level, color, requires_encryption, requires_dlp)
VALUES
  ('public',       'Public',       'عام',      1, '#22c55e', false, false),
  ('internal',     'Internal',     'داخلي',     2, '#3b82f6', false, false),
  ('confidential', 'Confidential', 'سري',       3, '#f97316', true,  false),
  ('restricted',   'Restricted',   'مقيد',      4, '#ef4444', true,  true),
  ('top_secret',   'Top Secret',   'سري للغاية', 5, '#7c3aed', true,  true)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- 7. asset_vendor_links — asset ↔ vendor
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS asset_vendor_links (
  link_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id     UUID NOT NULL,
  vendor_id    UUID NOT NULL,
  link_type    VARCHAR(50) DEFAULT 'supplier',
  contract_ref VARCHAR(255),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  created_by   VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_vendor_unique
  ON asset_vendor_links (asset_id, vendor_id, link_type);
CREATE INDEX IF NOT EXISTS idx_asset_vendor_asset ON asset_vendor_links (asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_vendor_vendor ON asset_vendor_links (vendor_id);

-- ═══════════════════════════════════════════════════════════════════
-- 8. asset_evidence_links — asset ↔ evidence
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS asset_evidence_links (
  link_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id         UUID NOT NULL,
  evidence_task_id UUID NOT NULL,
  link_type        VARCHAR(50) DEFAULT 'supports',
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  created_by       VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_evidence_unique
  ON asset_evidence_links (asset_id, evidence_task_id);
CREATE INDEX IF NOT EXISTS idx_asset_evidence_asset ON asset_evidence_links (asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_evidence_task ON asset_evidence_links (evidence_task_id);

-- ═══════════════════════════════════════════════════════════════════
-- 9. asset_lifecycle_events — state transition audit trail
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS asset_lifecycle_events (
  event_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(30) NOT NULL,
  entity_id     UUID NOT NULL,
  from_stage    VARCHAR(30),
  to_stage      VARCHAR(30) NOT NULL,
  event_type    VARCHAR(50) DEFAULT 'stage_change',
  performed_by  VARCHAR(255),
  notes         TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_entity ON asset_lifecycle_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_stage ON asset_lifecycle_events (to_stage);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_time ON asset_lifecycle_events (created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- 10. Seed asset governance workflow template
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO workflow_templates (
  template_id, name, name_en, name_ar, module_code, category,
  description, steps, created_at
)
VALUES (
  gen_random_uuid(),
  'Asset Intake Lifecycle',
  'Asset Intake Lifecycle',
  'دورة حياة استقبال الأصول',
  'asset',
  'governance',
  'End-to-end asset onboarding: intake, classification, ownership assignment, dependency mapping, risk/control linkage, and lifecycle review.',
  '[
    {"step": 1, "name": "Asset Intake",           "description": "Register new asset with basic metadata",        "assignee_type": "role", "assignee": "asset_manager",  "sla_hours": 24},
    {"step": 2, "name": "Classification",          "description": "Assign data classification and handling rules", "assignee_type": "role", "assignee": "data_steward",   "sla_hours": 48},
    {"step": 3, "name": "Ownership Assignment",    "description": "Assign business and technical owners",          "assignee_type": "role", "assignee": "asset_manager",  "sla_hours": 24},
    {"step": 4, "name": "Dependency Mapping",      "description": "Map upstream and downstream dependencies",      "assignee_type": "role", "assignee": "it_operations",  "sla_hours": 72},
    {"step": 5, "name": "Risk/Control Linkage",    "description": "Link asset to relevant risks and controls",     "assignee_type": "role", "assignee": "risk_manager",   "sla_hours": 48},
    {"step": 6, "name": "Lifecycle Review",         "description": "Final review and activation",                   "assignee_type": "role", "assignee": "asset_manager",  "sla_hours": 24}
  ]'::jsonb,
  NOW()
)
ON CONFLICT DO NOTHING;
