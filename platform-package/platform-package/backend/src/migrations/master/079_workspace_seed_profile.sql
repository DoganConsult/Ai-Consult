-- Migration 079: Create workspace_seed_profile table
-- Enables DB-driven workspace tailoring based on sector, company size, and organizational profile
-- Replaces hardcoded template codes in workspace-templates.ts with database-driven profiles

-- Create workspace_seed_profile table
CREATE TABLE IF NOT EXISTS public.workspace_seed_profile (
  profile_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_code            VARCHAR(128) NOT NULL UNIQUE,
  label_en                VARCHAR(256) NOT NULL,
  label_ar                VARCHAR(256),
  description_en           TEXT,
  description_ar           TEXT,
  
  -- Matching criteria (for profile resolution)
  sector_code              VARCHAR(64), -- NULL = applies to all sectors
  company_size             VARCHAR(64), -- NULL = applies to all sizes (e.g., "1-50", "51-200", "201-1000", "1001+")
  regulator_codes          TEXT[], -- NULL = applies to all regulators
  framework_codes          TEXT[], -- NULL = applies to all frameworks
  
  -- Template codes to seed (JSONB arrays for flexibility)
  dashboard_template_codes JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g., ["EXECUTIVE", "COMPLIANCE_OPS"]
  workflow_template_codes  JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g., ["EVIDENCE_COLLECTION", "ASSESSMENT"]
  assessment_template_codes JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g., ["RAPID_BASELINE", "PRIMARY_FRAMEWORK"]
  plan90d_template_code    VARCHAR(64) NOT NULL, -- e.g., "DEFAULT_90D", "BANKING_ENTERPRISE_90D"
  
  -- Navigation items (optional, for custom sidebar structure)
  navigation_items         JSONB DEFAULT NULL, -- Array of navigation menu items
  
  -- Priority for matching (higher = more specific, matched first)
  priority                 INT NOT NULL DEFAULT 0,
  
  -- Status
  is_active                BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by               VARCHAR(64),
  updated_by               VARCHAR(64)
);

-- Add comments
COMMENT ON TABLE public.workspace_seed_profile IS
  'Defines workspace seed profiles that tailor dashboards, workflows, assessments, and 90-day plans based on organizational profile (sector, size, regulators, frameworks). Profiles are resolved during provisioning to determine which templates to instantiate.';

COMMENT ON COLUMN public.workspace_seed_profile.profile_code IS
  'Unique identifier for the profile (e.g., "BANKING_ENTERPRISE", "HEALTHCARE_MEDIUM", "DEFAULT_SMALL").';

COMMENT ON COLUMN public.workspace_seed_profile.sector_code IS
  'Sector code this profile applies to. NULL means applies to all sectors.';

COMMENT ON COLUMN public.workspace_seed_profile.company_size IS
  'Company size range this profile applies to (e.g., "1-50", "51-200", "201-1000", "1001+"). NULL means applies to all sizes.';

COMMENT ON COLUMN public.workspace_seed_profile.priority IS
  'Matching priority. Higher priority profiles are matched first. Use this to create specific profiles that override general ones (e.g., BANKING_ENTERPRISE has higher priority than DEFAULT_LARGE).';

COMMENT ON COLUMN public.workspace_seed_profile.dashboard_template_codes IS
  'JSONB array of dashboard template codes to instantiate for this profile.';

COMMENT ON COLUMN public.workspace_seed_profile.workflow_template_codes IS
  'JSONB array of workflow template codes to instantiate for this profile.';

COMMENT ON COLUMN public.workspace_seed_profile.assessment_template_codes IS
  'JSONB array of assessment template codes to instantiate for this profile.';

COMMENT ON COLUMN public.workspace_seed_profile.plan90d_template_code IS
  '90-day plan template code to use for this profile.';

COMMENT ON COLUMN public.workspace_seed_profile.navigation_items IS
  'Optional JSONB array of navigation menu items for custom sidebar structure.';

-- Create indexes for efficient profile resolution
CREATE INDEX IF NOT EXISTS idx_workspace_seed_profile_sector 
  ON public.workspace_seed_profile(sector_code) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_workspace_seed_profile_company_size 
  ON public.workspace_seed_profile(company_size) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_workspace_seed_profile_priority 
  ON public.workspace_seed_profile(priority DESC) 
  WHERE is_active = true;

-- Composite index for common resolution queries (sector + size)
CREATE INDEX IF NOT EXISTS idx_workspace_seed_profile_sector_size 
  ON public.workspace_seed_profile(sector_code, company_size, priority DESC) 
  WHERE is_active = true;

-- Add columns to workspace_seeds and provisioning_jobs to track which profile was used
CREATE TABLE IF NOT EXISTS public.workspace_seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  workspace_id UUID,
  seed_type VARCHAR(64) NOT NULL,
  seed_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workspace_seeds
  ADD COLUMN IF NOT EXISTS seed_profile_code VARCHAR(128);

ALTER TABLE public.provisioning_jobs
  ADD COLUMN IF NOT EXISTS seed_profile_code VARCHAR(128);

-- Add comments
COMMENT ON COLUMN public.workspace_seeds.seed_profile_code IS
  'Profile code that was used to generate this workspace seed. For audit and explainability.';

COMMENT ON COLUMN public.provisioning_jobs.seed_profile_code IS
  'Profile code that was resolved and used during provisioning. For audit and explainability.';

-- Create indexes for profile code lookups
CREATE INDEX IF NOT EXISTS idx_workspace_seeds_profile_code 
  ON public.workspace_seeds(seed_profile_code);

CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_profile_code 
  ON public.provisioning_jobs(seed_profile_code);
