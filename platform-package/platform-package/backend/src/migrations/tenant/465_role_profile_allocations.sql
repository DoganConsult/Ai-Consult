-- Migration: Role Profile Allocations for Dynamic Team-Based Access Control
-- Purpose: Store role profile assignments, workflow permissions, responsibilities, and notification preferences
-- This enables automatic allocation of roles, workflows, and responsibilities when teams are activated
-- Version: 396
-- Date: 2026-03-20

-- CREATE TABLE IF NOT EXISTS for role profile assignments
CREATE TABLE IF NOT EXISTS role_profile_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  team_id UUID NOT NULL,
  department_id UUID NOT NULL,
  profile_code VARCHAR(100) NOT NULL,
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT fk_role_profile_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
  CONSTRAINT fk_role_profile_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_role_profile_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
  CONSTRAINT fk_role_profile_department FOREIGN KEY (department_id) REFERENCES departments(dept_id) ON DELETE CASCADE,
  CONSTRAINT uq_role_profile_assignment UNIQUE (tenant_id, user_id, team_id, profile_code)
);

-- CREATE TABLE IF NOT EXISTS for user module permissions (from role profiles)
CREATE TABLE IF NOT EXISTS user_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  module_code VARCHAR(100) NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT fk_user_module_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_module_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT uq_user_module_permission UNIQUE (tenant_id, user_id, module_code)
);

-- CREATE TABLE IF NOT EXISTS for user workflow permissions (from role profiles)
CREATE TABLE IF NOT EXISTS user_workflow_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  workflow_code VARCHAR(100) NOT NULL,
  can_initiate BOOLEAN DEFAULT false,
  can_approve BOOLEAN DEFAULT false,
  can_review BOOLEAN DEFAULT false,
  approval_level INTEGER,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT fk_user_workflow_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_workflow_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT uq_user_workflow_permission UNIQUE (tenant_id, user_id, workflow_code)
);

-- CREATE TABLE IF NOT EXISTS for user responsibilities (from role profiles)
CREATE TABLE IF NOT EXISTS user_responsibilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  responsibility_type VARCHAR(50) NOT NULL, -- 'owner', 'reviewer', 'approver', 'executor'
  entity_type VARCHAR(100) NOT NULL, -- 'control', 'risk', 'evidence', 'policy', etc.
  scope_type VARCHAR(50) NOT NULL, -- 'team', 'department', 'organization'
  scope_id UUID, -- team_id, department_id, or null for organization
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT fk_user_responsibility_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_responsibility_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT uq_user_responsibility UNIQUE (tenant_id, user_id, responsibility_type, entity_type, scope_type, scope_id)
);

-- CREATE TABLE IF NOT EXISTS for user notification preferences (from role profiles)
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  channels TEXT[] DEFAULT '{}', -- ['slack', 'teams', etc.]
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT fk_user_notification_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_notification_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_role_profile_assignments_user 
  ON role_profile_assignments(tenant_id, user_id) 
  WHERE deleted_at IS NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_role_profile_assignments_team 
  ON role_profile_assignments(tenant_id, team_id) 
  WHERE deleted_at IS NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_module_permissions_user 
  ON user_module_permissions(tenant_id, user_id, module_code) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_workflow_permissions_user 
  ON user_workflow_permissions(tenant_id, user_id, workflow_code) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_responsibilities_user 
  ON user_responsibilities(tenant_id, user_id, entity_type) 
  WHERE deleted_at IS NULL;

-- Add comments
COMMENT ON TABLE role_profile_assignments IS 'Role profile assignments to users based on active team membership. Automatically updated when teams are activated/deactivated.';
COMMENT ON TABLE user_module_permissions IS 'Module-level permissions assigned to users via role profiles. Updated automatically when profiles are allocated.';
COMMENT ON TABLE user_workflow_permissions IS 'Workflow-level permissions (initiate, approve, review) assigned to users via role profiles.';
COMMENT ON TABLE user_responsibilities IS 'Responsibility assignments (owner, reviewer, approver, executor) for specific entity types and scopes.';
COMMENT ON TABLE user_notification_preferences IS 'Notification preferences (email, in-app, SMS, channels) assigned via role profiles.';
