-- ============================================
-- Migration 028: Add AGRC-OS config columns to workspace_profile
-- Adds risk_appetite, escalation_level, orchestrator_enabled,
-- reporting_cadence, enforcement_mode, evidence_freshness_days
-- to workspace_profile for existing tenants.
-- All ADD COLUMN IF NOT EXISTS — fully idempotent.
-- ============================================

ALTER TABLE workspace_profile ADD COLUMN IF NOT EXISTS risk_appetite VARCHAR(20) DEFAULT 'moderate';
ALTER TABLE workspace_profile ADD COLUMN IF NOT EXISTS escalation_level VARCHAR(20) DEFAULT 'high';
ALTER TABLE workspace_profile ADD COLUMN IF NOT EXISTS orchestrator_enabled VARCHAR(20) DEFAULT 'auto';
ALTER TABLE workspace_profile ADD COLUMN IF NOT EXISTS reporting_cadence VARCHAR(20) DEFAULT 'weekly';
ALTER TABLE workspace_profile ADD COLUMN IF NOT EXISTS enforcement_mode VARCHAR(20) DEFAULT 'advisory';
ALTER TABLE workspace_profile ADD COLUMN IF NOT EXISTS evidence_freshness_days INT DEFAULT 60;
