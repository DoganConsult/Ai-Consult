-- Fix tenant_id type mismatch in governance context tables.
-- Registration generates 12-char hex slugs (varchar), but migration 081
-- defined tenant_id as UUID. Platform convention is varchar(16).
-- Continues the pattern established by migration 102.

-- 1. module_operating_states
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'module_operating_states'
      AND column_name = 'tenant_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.module_operating_states
      DROP CONSTRAINT IF EXISTS module_operating_states_tenant_id_module_code_key;

    ALTER TABLE public.module_operating_states
      ALTER COLUMN tenant_id TYPE character varying(16) USING tenant_id::text;

    ALTER TABLE public.module_operating_states
      ADD CONSTRAINT module_operating_states_tenant_id_module_code_key
      UNIQUE (tenant_id, module_code);
  END IF;
END $$;

-- 2. tenant_governance_context
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_governance_context'
      AND column_name = 'tenant_id' AND data_type = 'uuid'
  ) THEN
    DROP INDEX IF EXISTS idx_tgc_tenant_active;

    ALTER TABLE public.tenant_governance_context
      ALTER COLUMN tenant_id TYPE character varying(16) USING tenant_id::text;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_tgc_tenant_active
      ON public.tenant_governance_context (tenant_id) WHERE is_active = true;
  END IF;
END $$;

-- 3. governance_context_changelog
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'governance_context_changelog'
      AND column_name = 'tenant_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.governance_context_changelog
      ALTER COLUMN tenant_id TYPE character varying(16) USING tenant_id::text;
  END IF;
END $$;
