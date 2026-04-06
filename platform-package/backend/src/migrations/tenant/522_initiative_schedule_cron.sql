-- ============================================================
-- Migration 371: Add schedule_cron to initiative_definitions
-- Enables scheduled initiative execution via cron expressions
-- ============================================================

ALTER TABLE initiative_definitions
ADD COLUMN IF NOT EXISTS schedule_cron TEXT;

COMMENT ON COLUMN initiative_definitions.schedule_cron IS 'Cron expression for scheduled execution (e.g., "0 9 * * *" for daily at 9 AM). NULL means manual/triggered only.';

CREATE INDEX IF NOT EXISTS idx_init_def_schedule ON initiative_definitions(schedule_cron) WHERE schedule_cron IS NOT NULL AND is_active = TRUE;
