-- Migration 607: workspace_profile golden DDL reconciliation
-- Ensures workspace_profile (singular, tenant_id PK) has all AGRC columns.
-- Drops legacy workspace_profiles (plural, UUID PK) if empty.
-- See docs/COMPILER-100-SPEC.md §3 (Tenant DDL — Golden Schema).

-- 1. Ensure workspace_profile table exists with correct PK
CREATE TABLE IF NOT EXISTS workspace_profile (
    tenant_id           VARCHAR(64) PRIMARY KEY,
    industry            VARCHAR(100)  DEFAULT 'other',
    org_size            VARCHAR(50)   DEFAULT '1-50',
    sectors             JSONB         DEFAULT '[]',
    default_dashboard   VARCHAR(100)  DEFAULT 'big_picture',
    risk_appetite       VARCHAR(20)   DEFAULT 'moderate',
    escalation_level    VARCHAR(20)   DEFAULT 'high',
    orchestrator_enabled VARCHAR(20)  DEFAULT 'auto',
    reporting_cadence   VARCHAR(20)   DEFAULT 'weekly',
    enforcement_mode    VARCHAR(20)   DEFAULT 'advisory',
    evidence_freshness_days INTEGER   DEFAULT 60,
    created_at          TIMESTAMPTZ   DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   DEFAULT NOW()
);

-- 2. Add any missing columns (idempotent — runs on existing tables)
ALTER TABLE workspace_profile ADD COLUMN IF NOT EXISTS risk_appetite VARCHAR(20) DEFAULT 'moderate';
ALTER TABLE workspace_profile ADD COLUMN IF NOT EXISTS escalation_level VARCHAR(20) DEFAULT 'high';
ALTER TABLE workspace_profile ADD COLUMN IF NOT EXISTS orchestrator_enabled VARCHAR(20) DEFAULT 'auto';
ALTER TABLE workspace_profile ADD COLUMN IF NOT EXISTS reporting_cadence VARCHAR(20) DEFAULT 'weekly';
ALTER TABLE workspace_profile ADD COLUMN IF NOT EXISTS enforcement_mode VARCHAR(20) DEFAULT 'advisory';
ALTER TABLE workspace_profile ADD COLUMN IF NOT EXISTS evidence_freshness_days INTEGER DEFAULT 60;

-- 3. Drop legacy workspace_profiles (plural) if it exists and is empty
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'workspace_profiles'
      AND table_schema = current_schema()
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM workspace_profiles LIMIT 1) THEN
      DROP TABLE IF EXISTS workspace_profiles;
    ELSE
      RAISE NOTICE 'workspace_profiles (plural) has rows — not dropping. Manual migration needed.';
    END IF;
  END IF;
END $$;

-- 4. Document the golden schema
COMMENT ON TABLE workspace_profile IS 'Golden DDL (migration 607). PK: tenant_id VARCHAR(64). See docs/COMPILER-100-SPEC.md';
