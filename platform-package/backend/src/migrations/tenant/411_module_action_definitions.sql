-- Migration 411: Module action definitions
-- Action catalog per module with required permissions, SoD sensitivity, AI enablement, and danger levels.

CREATE TABLE IF NOT EXISTS module_action_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  module_code VARCHAR(50) NOT NULL,
  action_code VARCHAR(100) NOT NULL,
  name_en VARCHAR(200),
  name_ar VARCHAR(200),
  icon VARCHAR(50),
  required_permissions JSONB DEFAULT '[]',
  sod_sensitive BOOLEAN DEFAULT false,
  ai_enabled BOOLEAN DEFAULT false,
  danger_level VARCHAR(20) DEFAULT 'safe',
  workflow_constraints JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, module_code, action_code)
);

CREATE INDEX IF NOT EXISTS idx_module_action_defs_tenant_module
  ON module_action_definitions(tenant_id, module_code);
