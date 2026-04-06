-- ============================================
-- Migration 384: DLQ Enhancement - Exponential Backoff & Permanent Failure Detection
-- Adds retry_delay column and permanent_failure status to agrc_event_dlq table
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema AND table_name = 'agrc_event_dlq'
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema AND table_name = 'agrc_event_dlq' AND column_name = 'retry_delay'
  ) THEN
    ALTER TABLE agrc_event_dlq ADD COLUMN retry_delay INTERVAL DEFAULT INTERVAL '1 minute';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'agrc_event_dlq_status_check' AND n.nspname = current_schema
  ) THEN
    ALTER TABLE agrc_event_dlq DROP CONSTRAINT agrc_event_dlq_status_check;
  END IF;

  ALTER TABLE agrc_event_dlq
    ADD CONSTRAINT agrc_event_dlq_status_check
    CHECK (status IN ('pending', 'resolved', 'abandoned', 'exhausted', 'permanent_failure'));

  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dlq_permanent_failure ON agrc_event_dlq(status, created_at) WHERE status = ''permanent_failure''';
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dlq_retry_ready ON agrc_event_dlq(status, last_retry_at, retry_delay) WHERE status = ''pending'' AND retry_count < max_retries';
END $$;
