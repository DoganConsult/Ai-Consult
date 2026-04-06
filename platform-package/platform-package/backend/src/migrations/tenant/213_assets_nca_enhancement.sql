-- ============================================
-- Migration 213: Assets NCA ECC 2-1 Enhancement
-- Adds missing columns required by NCA Essential Cybersecurity Controls
-- ECC 2-1: Asset Management requires custodian, CIA scoring, lifecycle tracking
-- ============================================

-- Custodian (separate from owner per NCA ECC 2-1 requirement)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS custodian_id VARCHAR(64);

-- CIA triad scoring (1-5 scale per NCA ECC 2-1)
DO $$ BEGIN
  ALTER TABLE assets ADD COLUMN cia_confidentiality INTEGER DEFAULT 3;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE assets ADD COLUMN cia_integrity INTEGER DEFAULT 3;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE assets ADD COLUMN cia_availability INTEGER DEFAULT 3;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Bilingual name support
ALTER TABLE assets ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS name_ar VARCHAR(255);

-- Lifecycle tracking
DO $$ BEGIN
  ALTER TABLE assets ADD COLUMN lifecycle_status VARCHAR(30) DEFAULT 'active';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS last_reviewed_at DATE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS review_frequency VARCHAR(30) DEFAULT 'annual';

-- Vendor / license tracking
ALTER TABLE assets ADD COLUMN IF NOT EXISTS vendor VARCHAR(255);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS license_expiry DATE;

-- Backfill name_en from existing name column
UPDATE assets SET name_en = name WHERE name_en IS NULL AND name IS NOT NULL;

-- Indexes for NCA queries
CREATE INDEX IF NOT EXISTS idx_assets_custodian ON assets(custodian_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_lifecycle ON assets(lifecycle_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_review ON assets(last_reviewed_at) WHERE deleted_at IS NULL;
