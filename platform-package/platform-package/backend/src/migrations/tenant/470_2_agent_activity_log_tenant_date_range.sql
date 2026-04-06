-- ============================================================
-- Migration: 401_2_agent_activity_log_tenant_date_range.sql
-- Purpose: Performance index for tenant-wide date range queries
-- Part of: Personal agent performance indexes (deploy 401_1 → 401_4 one by one)
-- Date: 2026-03-20
-- ============================================================

DO $$
DECLARE
    tenant_record RECORD;
BEGIN
    CREATE INDEX IF NOT EXISTS idx_agent_activity_log_tenant_date_range ON agent_activity_log(tenant_id, created_at) WHERE created_at IS NOT NULL;
END $$;
