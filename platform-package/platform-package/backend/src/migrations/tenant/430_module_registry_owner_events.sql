-- ============================================
-- AGRC-OS Tenant Migration 430
-- Module Registry: Add ownership and consumed event metadata
-- (Law 5: Explicit Contracts)
-- ============================================

ALTER TABLE module_workflow_registry
  ADD COLUMN IF NOT EXISTS owning_team VARCHAR(100),
  ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS consumed_event_types TEXT[] DEFAULT '{}';
