-- Migration: 398_org_structure_extended_tables.sql
-- Purpose: Create tables for extended organizational structure features
--          (locations, cost centers, custom fields)
-- Date: 2026-03-20

DO $$
BEGIN
    -- Location assignments table
    CREATE TABLE IF NOT EXISTS org_location_assignments (
        assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        node_id UUID NOT NULL,
        node_type VARCHAR(50) NOT NULL CHECK (node_type IN ('organization', 'division', 'department', 'team', 'unit')),
        location_id UUID NOT NULL,
        location_name VARCHAR(255),
        location_type VARCHAR(50), -- office, branch, warehouse, remote, etc.
        is_primary BOOLEAN DEFAULT false,
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        assigned_by VARCHAR(64),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, node_id, node_type, location_id)
    );

    CREATE INDEX IF NOT EXISTS idx_org_location_assignments_node 
        ON org_location_assignments(tenant_id, node_id, node_type);
    CREATE INDEX IF NOT EXISTS idx_org_location_assignments_location 
        ON org_location_assignments(tenant_id, location_id);

    -- Cost center assignments table
    CREATE TABLE IF NOT EXISTS org_cost_center_assignments (
        assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        node_id UUID NOT NULL,
        node_type VARCHAR(50) NOT NULL CHECK (node_type IN ('organization', 'division', 'department', 'team', 'unit')),
        cost_center_id UUID NOT NULL,
        cost_center_code VARCHAR(50),
        cost_center_name VARCHAR(255),
        budget_allocation DECIMAL(15,2),
        currency VARCHAR(3) DEFAULT 'SAR',
        fiscal_year INTEGER,
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        assigned_by VARCHAR(64),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, node_id, node_type, cost_center_id)
    );

    CREATE INDEX IF NOT EXISTS idx_org_cost_center_assignments_node 
        ON org_cost_center_assignments(tenant_id, node_id, node_type);
    CREATE INDEX IF NOT EXISTS idx_org_cost_center_assignments_cost_center 
        ON org_cost_center_assignments(tenant_id, cost_center_id);

    -- Custom field definitions table
    CREATE TABLE IF NOT EXISTS org_custom_field_definitions (
        field_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        field_key VARCHAR(100) NOT NULL,
        field_name VARCHAR(255) NOT NULL,
        field_name_ar VARCHAR(255),
        field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'number', 'boolean', 'date', 'select', 'multi-select', 'json')),
        node_types VARCHAR(50)[] NOT NULL,
        required BOOLEAN DEFAULT false,
        default_value JSONB,
        options JSONB, -- For select/multi-select fields
        validation JSONB, -- Validation rules
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        UNIQUE(tenant_id, field_key)
    );

    CREATE INDEX IF NOT EXISTS idx_org_custom_field_definitions_node_types 
        ON org_custom_field_definitions(tenant_id, node_types);
    CREATE INDEX IF NOT EXISTS idx_org_custom_field_definitions_active 
        ON org_custom_field_definitions(tenant_id) WHERE deleted_at IS NULL;
END $$;

-- Add comments for documentation
COMMENT ON TABLE org_location_assignments IS 
    'Links organizational structure nodes to physical locations/branches';
COMMENT ON TABLE org_cost_center_assignments IS 
    'Links organizational structure nodes to cost centers for budget allocation';
COMMENT ON TABLE org_custom_field_definitions IS 
    'Defines custom metadata fields that can be attached to org structure nodes';
