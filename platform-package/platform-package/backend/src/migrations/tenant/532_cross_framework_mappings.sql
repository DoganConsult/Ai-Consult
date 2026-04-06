-- ============================================
-- Migration: Cross-Framework Control Mappings
-- Tenant-scoped table for storing NCA-ECC ↔ SAMA-CSF mappings
-- ============================================

CREATE TABLE IF NOT EXISTS "${schema}".cross_framework_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  source_framework VARCHAR(100) NOT NULL,
  source_control_id VARCHAR(255) NOT NULL,
  source_control_code VARCHAR(100),
  source_control_title TEXT,
  target_framework VARCHAR(100) NOT NULL,
  target_control_id VARCHAR(255) NOT NULL,
  target_control_code VARCHAR(100),
  target_control_title TEXT,
  mapping_strength VARCHAR(20) NOT NULL CHECK (mapping_strength IN ('exact', 'strong', 'partial', 'weak')),
  mapping_rationale TEXT,
  common_domain VARCHAR(100),
  common_themes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  CONSTRAINT fk_cross_framework_tenant FOREIGN KEY (tenant_id) REFERENCES "${schema}".tenants(tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cross_framework_tenant ON "${schema}".cross_framework_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cross_framework_source ON "${schema}".cross_framework_mappings(tenant_id, source_framework, source_control_id);
CREATE INDEX IF NOT EXISTS idx_cross_framework_target ON "${schema}".cross_framework_mappings(tenant_id, target_framework, target_control_id);
CREATE INDEX IF NOT EXISTS idx_cross_framework_strength ON "${schema}".cross_framework_mappings(tenant_id, mapping_strength);

COMMENT ON TABLE "${schema}".cross_framework_mappings IS 'Stores cross-framework control mappings (e.g., NCA-ECC ↔ SAMA-CSF) for KSA regulatory intelligence';
COMMENT ON COLUMN "${schema}".cross_framework_mappings.mapping_strength IS 'Strength of mapping: exact, strong, partial, weak';
COMMENT ON COLUMN "${schema}".cross_framework_mappings.common_themes IS 'Array of common themes between mapped controls';
