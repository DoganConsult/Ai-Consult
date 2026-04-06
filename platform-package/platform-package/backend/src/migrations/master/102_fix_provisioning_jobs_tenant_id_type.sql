-- Fix tenant_id type mismatch: registration generates 12-char hex strings (varchar)
-- but several onboarding-era tables defined tenant_id as uuid.
-- The platform convention is varchar(16) for tenant_id (41+ tables use it).

-- provisioning_jobs: the critical blocker — INSERT fails on uuid cast
-- Must drop dependent view first, then recreate after ALTER
DROP VIEW IF EXISTS public.v_provisioning_status;

ALTER TABLE public.provisioning_jobs
  ALTER COLUMN tenant_id TYPE character varying(16) USING tenant_id::text;

-- Recreate the view with the corrected column type
CREATE OR REPLACE VIEW public.v_provisioning_status AS
SELECT pj.id AS job_id,
       pj.session_id,
       pj.tenant_id,
       pj.workspace_id,
       pj.job_status,
       pj.started_at,
       pj.completed_at,
       pj.retry_count,
       count(DISTINCT ps.id) AS total_steps,
       count(DISTINCT CASE WHEN ps.status::text = 'completed'::text THEN ps.id ELSE NULL::uuid END) AS completed_steps,
       count(DISTINCT CASE WHEN ps.status::text = 'failed'::text THEN ps.id ELSE NULL::uuid END) AS failed_steps
FROM provisioning_jobs pj
LEFT JOIN provisioning_steps ps ON ps.job_id = pj.id
GROUP BY pj.id, pj.session_id, pj.tenant_id, pj.workspace_id, pj.job_status, pj.started_at, pj.completed_at, pj.retry_count;

-- startup_checklists: also receives the 12-char hex tenant_id
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'startup_checklists'
      AND column_name = 'tenant_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.startup_checklists
      ALTER COLUMN tenant_id TYPE character varying(16) USING tenant_id::text;
  END IF;
END $$;

-- workspace_activation_log: also receives the 12-char hex tenant_id
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspace_activation_log'
      AND column_name = 'tenant_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.workspace_activation_log
      ALTER COLUMN tenant_id TYPE character varying(16) USING tenant_id::text;
  END IF;
END $$;

-- tenant_regulatory_impacts + tenant_sectors: these may receive tenant_id from
-- regulatory module imports. Fix to varchar(16) for consistency.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_regulatory_impacts'
      AND column_name = 'tenant_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.tenant_regulatory_impacts
      ALTER COLUMN tenant_id TYPE character varying(16) USING tenant_id::text;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_sectors'
      AND column_name = 'tenant_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.tenant_sectors
      ALTER COLUMN tenant_id TYPE character varying(16) USING tenant_id::text;
  END IF;
END $$;
