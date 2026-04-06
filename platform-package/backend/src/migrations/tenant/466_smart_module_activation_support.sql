-- ============================================================
-- Migration 397: Smart Module Activation Support
-- Creates tenant-specific module_activation_status table if it doesn't exist
-- Supports intelligent module activation based on org structure
-- ============================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  has_tenant_id BOOLEAN;
  has_id_col BOOLEAN;
  current_tenant_id UUID;
BEGIN
  -- Get current tenant_id from context (set by migration runner)
  -- This is a placeholder - actual tenant_id should be injected by the migration framework
  -- For now, we'll use a safe default that will be updated per-tenant
  
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = '' 
    AND table_name = 'module_activation_status'
  ) INTO table_exists;

  IF table_exists THEN
    -- Check if tenant_id column exists
    SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = ''
      AND table_name = 'module_activation_status'
      AND column_name = 'tenant_id'
    ) INTO has_tenant_id;

    SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = ''
      AND table_name = 'module_activation_status'
      AND column_name = 'id'
    ) INTO has_id_col;

    -- Migrate from old schema (module_code as PK, no tenant_id) to new schema
    IF NOT has_tenant_id OR NOT has_id_col THEN
      -- Step 1: Add new columns
      ALTER TABLE module_activation_status
        ADD COLUMN IF NOT EXISTS id UUID,
        ADD COLUMN IF NOT EXISTS tenant_id UUID,
        ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS deactivated_by UUID,
        ADD COLUMN IF NOT EXISTS activation_reason TEXT,
        ADD COLUMN IF NOT EXISTS regulatory_requirements TEXT[],
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

      -- Step 2: Get tenant_id from schema name or context
      -- Extract tenant_id from schema name pattern (e.g., tenant_abc123 -> abc123)
      -- This is a fallback - ideally the migration runner provides tenant_id
      SELECT COALESCE(
        (SELECT tenant_id FROM public.tenants WHERE schema_name = '' LIMIT 1),
        gen_random_uuid() -- Fallback, but this should be set properly
      ) INTO current_tenant_id;

      -- Step 3: Populate tenant_id for existing rows
      UPDATE module_activation_status 
      SET tenant_id = current_tenant_id 
      WHERE tenant_id IS NULL;

      -- Step 4: Generate IDs for existing rows
      UPDATE module_activation_status 
      SET id = gen_random_uuid() 
      WHERE id IS NULL;

      -- Step 5: Drop old PK if it exists and create new structure
      ALTER TABLE module_activation_status
        DROP CONSTRAINT IF EXISTS module_activation_status_pkey;
      
      -- Step 6: Make columns NOT NULL and add constraints
      ALTER TABLE module_activation_status
        ALTER COLUMN id SET NOT NULL,
        ALTER COLUMN id SET DEFAULT gen_random_uuid(),
        ALTER COLUMN tenant_id SET NOT NULL,
        ADD PRIMARY KEY (id),
        ADD CONSTRAINT fk_module_activation_tenant 
        FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
        ADD CONSTRAINT uq_module_activation_tenant_module 
        UNIQUE (tenant_id, module_code);
    END IF;
  ELSE
    -- Create new table with tenant-specific schema
    CREATE TABLE IF NOT EXISTS module_activation_status (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      module_code VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT false NOT NULL,
      activated_at TIMESTAMP WITH TIME ZONE,
      activated_by UUID,
      deactivated_at TIMESTAMP WITH TIME ZONE,
      deactivated_by UUID,
      activation_reason TEXT, -- Why this module was activated (e.g., "Compliance department exists")
      regulatory_requirements TEXT[], -- Regulatory codes that triggered activation
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      deleted_at TIMESTAMP WITH TIME ZONE,
      
      CONSTRAINT fk_module_activation_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
      CONSTRAINT uq_module_activation_tenant_module UNIQUE (tenant_id, module_code)
    );
  END IF;
END $$;

  -- Index for active modules lookup
  CREATE INDEX IF NOT EXISTS idx_module_activation_tenant_active 
    ON module_activation_status(tenant_id, is_active) 
    WHERE is_active = true AND deleted_at IS NULL;

  -- Index for module code lookups
  CREATE INDEX IF NOT EXISTS idx_module_activation_module_code 
    ON module_activation_status(module_code) 
    WHERE deleted_at IS NULL;

  -- Index for activation date ordering
  CREATE INDEX IF NOT EXISTS idx_module_activation_activated_at 
    ON module_activation_status(tenant_id, activated_at DESC) 
    WHERE is_active = true AND deleted_at IS NULL;

  -- Ensure Foundation module is always active for existing tenants
  INSERT INTO module_activation_status 
    (tenant_id, module_code, is_active, activated_at, activation_reason, created_at, updated_at)
  SELECT 
    t.tenant_id,
    'foundation',
    true,
    NOW(),
    'Base platform module - always active',
    NOW(),
    NOW()
  FROM public.tenants t
  WHERE NOT EXISTS (
    SELECT 1 
    FROM module_activation_status mas
    WHERE mas.tenant_id = t.tenant_id AND mas.module_code = 'foundation'
  )
  ON CONFLICT (tenant_id, module_code) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

END $$;
