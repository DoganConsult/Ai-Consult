-- ============================================================
-- Migration: 401_4_agent_activity_log_status_date.sql
-- Purpose: Performance index for status + date (pending/approved filtering)
-- Part of: Personal agent performance indexes (deploy 401_1 → 401_4 one by one)
-- Date: 2026-03-20
-- ============================================================

DO $$
DECLARE
    tenant_record RECORD;
BEGIN
    CREATE INDEX IF NOT EXISTS idx_agent_activity_log_status_date ON agent_activity_log(status, created_at);
END $$;
