-- ============================================================
-- Migration: 401_3_agent_activity_log_type_date.sql
-- Purpose: Performance index for activity type + date range filtering
-- Part of: Personal agent performance indexes (deploy 401_1 → 401_4 one by one)
-- Date: 2026-03-20
-- ============================================================

DO $$
DECLARE
    tenant_record RECORD;
BEGIN
    CREATE INDEX IF NOT EXISTS idx_agent_activity_log_type_date ON agent_activity_log(agent_type, created_at);
END $$;
