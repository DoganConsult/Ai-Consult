-- Migration 380: Add seed_profile_code and tailoring context fields to workspace_seeds and provisioning_jobs
-- Enables audit and explainability of which profile was used and what context resolved it
-- Aligns with master migration 079_workspace_seed_profile.sql

-- Add seed_profile_code and tailoring context to workspace_seeds
ALTER TABLE workspace_seeds
  ADD COLUMN IF NOT EXISTS seed_profile_code VARCHAR(128),
  ADD COLUMN IF NOT EXISTS seed_profile_sector VARCHAR(64),
  ADD COLUMN IF NOT EXISTS seed_profile_company_size VARCHAR(64),
  ADD COLUMN IF NOT EXISTS seed_profile_regulator_codes TEXT[],
  ADD COLUMN IF NOT EXISTS seed_profile_framework_codes TEXT[];

-- Add seed_profile_code and tailoring context to provisioning_jobs
ALTER TABLE provisioning_jobs
  ADD COLUMN IF NOT EXISTS seed_profile_code VARCHAR(128),
  ADD COLUMN IF NOT EXISTS seed_profile_sector VARCHAR(64),
  ADD COLUMN IF NOT EXISTS seed_profile_company_size VARCHAR(64),
  ADD COLUMN IF NOT EXISTS seed_profile_regulator_codes TEXT[],
  ADD COLUMN IF NOT EXISTS seed_profile_framework_codes TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN workspace_seeds.seed_profile_code IS
  'Profile code that was used to generate this workspace seed. For audit and explainability.';

COMMENT ON COLUMN workspace_seeds.seed_profile_sector IS
  'Sector code used to resolve the seed profile. Stored for audit and explainability.';

COMMENT ON COLUMN workspace_seeds.seed_profile_company_size IS
  'Company size used to resolve the seed profile. Stored for audit and explainability.';

COMMENT ON COLUMN workspace_seeds.seed_profile_regulator_codes IS
  'Regulator codes used to resolve the seed profile. Stored for audit and explainability.';

COMMENT ON COLUMN workspace_seeds.seed_profile_framework_codes IS
  'Framework codes used to resolve the seed profile. Stored for audit and explainability.';

COMMENT ON COLUMN provisioning_jobs.seed_profile_code IS
  'Profile code that was resolved and used during provisioning. For audit and explainability.';

COMMENT ON COLUMN provisioning_jobs.seed_profile_sector IS
  'Sector code used to resolve the seed profile. Stored for audit and explainability.';

COMMENT ON COLUMN provisioning_jobs.seed_profile_company_size IS
  'Company size used to resolve the seed profile. Stored for audit and explainability.';

COMMENT ON COLUMN provisioning_jobs.seed_profile_regulator_codes IS
  'Regulator codes used to resolve the seed profile. Stored for audit and explainability.';

COMMENT ON COLUMN provisioning_jobs.seed_profile_framework_codes IS
  'Framework codes used to resolve the seed profile. Stored for audit and explainability.';

-- Create indexes for profile code lookups
CREATE INDEX IF NOT EXISTS idx_workspace_seeds_profile_code 
  ON workspace_seeds(seed_profile_code);

CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_profile_code 
  ON provisioning_jobs(seed_profile_code);

-- Create indexes for tailoring context queries (sector + size)
CREATE INDEX IF NOT EXISTS idx_workspace_seeds_profile_context 
  ON workspace_seeds(seed_profile_sector, seed_profile_company_size)
  WHERE seed_profile_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_provisioning_jobs_profile_context 
  ON provisioning_jobs(seed_profile_sector, seed_profile_company_size)
  WHERE seed_profile_code IS NOT NULL;
