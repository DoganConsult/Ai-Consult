-- 725: BCM Enterprise Uplift
-- Adds business_services catalog, crisis_events, bcm_findings,
-- and schema extensions for dependency and activation linkage.

-- ═══════════════════════════════════════════════════════════════════
-- 1. business_services — service catalog with criticality and BIA linkage
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS business_services_catalog (
  service_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(500) NOT NULL,
  service_code VARCHAR(60) UNIQUE,
  description TEXT,
  category VARCHAR(40) DEFAULT 'operations',
  criticality VARCHAR(20) DEFAULT 'medium',
  service_tier VARCHAR(20) DEFAULT 'tier2',
  owner_id VARCHAR(64),
  owner_team_id UUID,
  department_id UUID,
  rto_hours NUMERIC,
  rpo_hours NUMERIC,
  mtpd_hours NUMERIC,
  bia_id UUID,
  upstream_services JSONB DEFAULT '[]',
  downstream_services JSONB DEFAULT '[]',
  technology_components JSONB DEFAULT '[]',
  vendor_dependencies JSONB DEFAULT '[]',
  asset_ids JSONB DEFAULT '[]',
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bsc_category ON business_services_catalog (category);
CREATE INDEX IF NOT EXISTS idx_bsc_criticality ON business_services_catalog (criticality);
CREATE INDEX IF NOT EXISTS idx_bsc_status ON business_services_catalog (status);
CREATE INDEX IF NOT EXISTS idx_bsc_bia ON business_services_catalog (bia_id) WHERE bia_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bsc_owner_team ON business_services_catalog (owner_team_id) WHERE owner_team_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 2. crisis_events — live crisis lifecycle tracking
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crisis_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  crisis_type VARCHAR(60) DEFAULT 'operational',
  severity VARCHAR(20) DEFAULT 'high',
  status VARCHAR(30) DEFAULT 'detected',
  declared_at TIMESTAMPTZ,
  declared_by VARCHAR(64),
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(64),
  incident_id UUID,
  activation_id UUID,
  comm_activation_id UUID,
  affected_services JSONB DEFAULT '[]',
  affected_locations JSONB DEFAULT '[]',
  impact_assessment JSONB DEFAULT '{}',
  command_team JSONB DEFAULT '[]',
  timeline JSONB DEFAULT '[]',
  status_updates JSONB DEFAULT '[]',
  decisions_log JSONB DEFAULT '[]',
  resource_mobilization JSONB DEFAULT '{}',
  external_communications JSONB DEFAULT '[]',
  post_crisis_review TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crisis_status ON crisis_events (status);
CREATE INDEX IF NOT EXISTS idx_crisis_severity ON crisis_events (severity);
CREATE INDEX IF NOT EXISTS idx_crisis_type ON crisis_events (crisis_type);
CREATE INDEX IF NOT EXISTS idx_crisis_declared ON crisis_events (declared_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- 3. bcm_findings — unified findings register
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bcm_findings (
  finding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  source_type VARCHAR(40) DEFAULT 'exercise',
  source_id UUID,
  finding_type VARCHAR(30) DEFAULT 'gap',
  severity VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(30) DEFAULT 'open',
  assigned_to VARCHAR(64),
  assigned_team_id UUID,
  due_date DATE,
  remediation_plan TEXT,
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,
  remediation_evidence JSONB DEFAULT '{}',
  verified_by VARCHAR(64),
  verified_at TIMESTAMPTZ,
  linked_plan_id UUID,
  linked_risk_id UUID,
  linked_control_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bcmf_status ON bcm_findings (status);
CREATE INDEX IF NOT EXISTS idx_bcmf_severity ON bcm_findings (severity);
CREATE INDEX IF NOT EXISTS idx_bcmf_source ON bcm_findings (source_type);
CREATE INDEX IF NOT EXISTS idx_bcmf_assigned ON bcm_findings (assigned_to);
CREATE INDEX IF NOT EXISTS idx_bcmf_due ON bcm_findings (due_date);

-- ═══════════════════════════════════════════════════════════════════
-- 4. Schema extensions
-- ═══════════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bcm_dependency_nodes') THEN
    ALTER TABLE bcm_dependency_nodes ADD COLUMN IF NOT EXISTS business_service_id UUID;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bcp_activations') THEN
    ALTER TABLE bcp_activations ADD COLUMN IF NOT EXISTS crisis_event_id UUID;
  END IF;
END $$;
