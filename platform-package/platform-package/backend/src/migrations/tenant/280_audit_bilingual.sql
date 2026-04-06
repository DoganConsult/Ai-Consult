-- ============================================
-- Tenant Migration 280
-- Step 0.4 Completion: Add reason_ar bilingual
-- columns to policy_decision_log and
-- authz_decision_log for PDPL/GDPR Art.12.
-- ============================================

-- 1. Add reason_ar to policy_decision_log
ALTER TABLE IF EXISTS policy_decision_log
  ADD COLUMN IF NOT EXISTS reason_ar TEXT;

-- 2. Add reason_ar to authz_decision_log
ALTER TABLE IF EXISTS authz_decision_log
  ADD COLUMN IF NOT EXISTS reason_ar TEXT;

-- 3. Also add reason_ar to workflow_decision_log for consistency
ALTER TABLE IF EXISTS workflow_decision_log
  ADD COLUMN IF NOT EXISTS reason_ar TEXT;

-- 4. Add reason_ar to ai_action_decision_log for consistency
ALTER TABLE IF EXISTS ai_action_decision_log
  ADD COLUMN IF NOT EXISTS reason_ar TEXT;
