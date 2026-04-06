-- Priority 12: Obligation Register with Auto-Mapping
-- Creates explicit L4 layer: regulation → obligation → control → evidence
-- Seeded from regulatory_controls (instrument_structure level 4) during provisioning

CREATE TABLE IF NOT EXISTS compliance_obligations (
  obligation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id VARCHAR(100) NOT NULL,  -- References instruments.instrument_id
  requirement_ref VARCHAR(200) NOT NULL,  -- e.g., "NCA-ECC-4.1.2" or instrument_structure.code
  title_en VARCHAR(500) NOT NULL,
  title_ar VARCHAR(500),
  description_en TEXT,
  description_ar TEXT,
  applicability TEXT,  -- JSONB or text describing when this obligation applies
  owner_id VARCHAR(64),  -- User ID or role
  status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'suspended', 'archived')),
  mapped_controls TEXT[] DEFAULT '{}',  -- Array of control_id values
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  evidence_types TEXT[] DEFAULT '{}',  -- Expected evidence types
  review_frequency VARCHAR(30),  -- e.g., 'quarterly', 'annual'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64),
  updated_by VARCHAR(64),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_obligations_framework ON compliance_obligations(framework_id);
CREATE INDEX IF NOT EXISTS idx_obligations_status ON compliance_obligations(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_obligations_owner ON compliance_obligations(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_obligations_requirement_ref ON compliance_obligations(requirement_ref);

-- Junction table for obligation → control mappings (many-to-many)
CREATE TABLE IF NOT EXISTS obligation_control_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES compliance_obligations(obligation_id) ON DELETE CASCADE,
  control_id VARCHAR(200) NOT NULL,  -- References controls.control_id
  mapping_type VARCHAR(30) DEFAULT 'direct',  -- 'direct', 'partial', 'compensating'
  coverage_percent NUMERIC(5,2) DEFAULT 100.00,  -- How much of the obligation this control covers
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64),
  UNIQUE(obligation_id, control_id)
);

CREATE INDEX IF NOT EXISTS idx_oblig_control_mapping_oblig ON obligation_control_mappings(obligation_id);
CREATE INDEX IF NOT EXISTS idx_oblig_control_mapping_control ON obligation_control_mappings(control_id);

COMMENT ON TABLE compliance_obligations IS 'Explicit L4 layer: regulation → obligation → control → evidence. Seeded from instrument_structure during workspace provisioning.';
COMMENT ON TABLE obligation_control_mappings IS 'Many-to-many mapping between obligations and controls, enabling auto-mapping via framework→control entity_links.';
