-- ============================================================================
-- Migration 708: MWR automation_level NOT NULL compliance
-- ============================================================================
-- Platform rows from 707 used NULL for automation_level; column is NOT NULL
-- (179_module_workflow_registry). Backfill to 'manual' for any NULL values.
-- ============================================================================

UPDATE module_workflow_registry
SET automation_level = 'manual',
    updated_at = NOW()
WHERE automation_level IS NULL;
