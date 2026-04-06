-- Migration: Module-Role-Team Mappings for Dynamic Organizational Structure
-- Purpose: Store dynamic mappings between modules, roles, and active teams
-- This enables selective activation of departments/teams and automatic module access assignment
-- Version: 395
-- Date: 2026-03-20

-- Note: This migration uses  placeholder which will be replaced
-- with the actual tenant schema name during migration execution

-- CREATE TABLE IF NOT EXISTS for module-role-team mappings
CREATE TABLE IF NOT EXISTS module_role_team_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  module_code VARCHAR(100) NOT NULL,
  role_code VARCHAR(100) NOT NULL,
  team_ids UUID[] NOT NULL DEFAULT '{}',
  department_ids UUID[] NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT fk_module_role_team_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
  CONSTRAINT uq_module_role_team_mapping UNIQUE (tenant_id, module_code, role_code)
);

-- Create index for fast lookups by tenant and module
CREATE INDEX IF NOT EXISTS idx_module_role_team_tenant_module 
  ON module_role_team_mappings(tenant_id, module_code) 
  WHERE deleted_at IS NULL;

-- Create index for team lookups
CREATE INDEX IF NOT EXISTS idx_module_role_team_teams 
  ON module_role_team_mappings USING GIN(team_ids) 
  WHERE deleted_at IS NULL;

-- Create index for department lookups
CREATE INDEX IF NOT EXISTS idx_module_role_team_departments 
  ON module_role_team_mappings USING GIN(department_ids) 
  WHERE deleted_at IS NULL;

-- Add comments
COMMENT ON TABLE module_role_team_mappings IS 'Dynamic mappings between modules, roles, and active organizational teams. Updated when departments/teams are activated/deactivated.';
COMMENT ON COLUMN module_role_team_mappings.module_code IS 'Module identifier (e.g., compliance, risk, security)';
COMMENT ON COLUMN module_role_team_mappings.role_code IS 'Role identifier (e.g., compliance_manager, risk_manager)';
COMMENT ON COLUMN module_role_team_mappings.team_ids IS 'Array of team IDs that have access to this module-role combination';
COMMENT ON COLUMN module_role_team_mappings.department_ids IS 'Array of department IDs that have access to this module-role combination';
