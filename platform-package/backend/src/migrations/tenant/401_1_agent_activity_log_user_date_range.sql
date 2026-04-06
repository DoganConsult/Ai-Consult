-- ============================================================
-- Migration: 401_1_agent_activity_log_user_date_range.sql
-- Purpose: Performance index for personal agent date range + user filtering
-- Part of: Personal agent performance indexes (deploy 401_1 → 401_4 one by one)
-- Date: 2026-03-20
-- ============================================================

DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS idx_agent_activity_log_user_date_range ON agent_activity_log(tenant_id, user_id, created_at) WHERE created_at IS NOT NULL;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'agent_activity_log table not found, skipping index creation';
END $$;
