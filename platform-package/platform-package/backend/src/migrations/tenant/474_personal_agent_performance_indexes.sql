-- ============================================================
-- Migration: 401_personal_agent_performance_indexes.sql
-- Purpose: Replaced by one-by-one index migrations (401_1 through 401_4).
--          Run in order for new setup: 400 → 401_1 → 401_2 → 401_3 → 401_4.
-- Date: 2026-03-20
-- ============================================================
-- No-op: indexes are created by:
--   401_1_agent_activity_log_user_date_range.sql
--   401_2_agent_activity_log_tenant_date_range.sql
--   401_3_agent_activity_log_type_date.sql
--   401_4_agent_activity_log_status_date.sql
-- ============================================================

SELECT 1;
