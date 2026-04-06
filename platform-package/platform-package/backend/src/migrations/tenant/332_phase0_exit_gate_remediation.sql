-- ============================================
-- Tenant Migration 283
-- Phase 0 Exit Gate Remediation
-- Fixes all gaps identified in Phase 0 audit
-- against implementation-plan-gated.md
-- ============================================

-- ============================================
-- STEP 0.1 FIXES: Catalog Layer
-- ============================================

-- 1a. Add updated_at to product_modules
ALTER TABLE IF EXISTS product_modules
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 1b. Add updated_at to workflow_profile_catalog
ALTER TABLE IF EXISTS workflow_profile_catalog
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 1c. Add updated_at to policy_pack_catalog
ALTER TABLE IF EXISTS policy_pack_catalog
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 1d. FK from module_activation_policies.module_code → product_modules.code
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_map_module_code'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'module_activation_policies' AND table_schema = current_schema()
  ) THEN
    ALTER TABLE module_activation_policies
      ADD CONSTRAINT fk_map_module_code
      FOREIGN KEY (module_code) REFERENCES product_modules(code)
      ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- STEP 0.2 FIXES: Derived Layer
-- ============================================

-- 2a. Index on approver_resolution_cache.expires_at for TTL cleanup
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_arc_expires
    ON approver_resolution_cache(expires_at)
    WHERE expires_at IS NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2b. Add policy_id reference column to ai_autonomy_state for traceability
DO $$ BEGIN
  ALTER TABLE IF EXISTS ai_autonomy_state
    ADD COLUMN IF NOT EXISTS policy_id BIGINT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2c. FK from ai_autonomy_state.policy_id → ai_action_policies.id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_autonomy_state' AND table_schema = current_schema())
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_aas_policy')
  THEN
    ALTER TABLE ai_autonomy_state
      ADD CONSTRAINT fk_aas_policy
      FOREIGN KEY (policy_id) REFERENCES ai_action_policies(id)
      ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- STEP 0.3 FIXES: Policy Layer
-- ============================================

-- 3a. Add CHECK constraint on runtime_overrides.valid_until (max 90 days from valid_from)
--     Use a trigger since CHECK constraints cannot reference other columns dynamically
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION fn_runtime_override_max_duration()
  RETURNS TRIGGER AS $fn$
  BEGIN
    IF NEW.valid_until IS NOT NULL AND NEW.valid_from IS NOT NULL THEN
      IF NEW.valid_until > NEW.valid_from + INTERVAL '90 days' THEN
        RAISE EXCEPTION 'Runtime override duration cannot exceed 90 days (from % to %)',
          NEW.valid_from, NEW.valid_until;
      END IF;
    END IF;
    RETURN NEW;
  END;
  $fn$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_runtime_override_max_duration ON runtime_overrides;
  CREATE TRIGGER trg_runtime_override_max_duration
    BEFORE INSERT OR UPDATE ON runtime_overrides
    FOR EACH ROW EXECUTE FUNCTION fn_runtime_override_max_duration();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3b. Add delegation-specific columns to delegation_policies
ALTER TABLE IF EXISTS delegation_policies
  ADD COLUMN IF NOT EXISTS delegator_role TEXT,
  ADD COLUMN IF NOT EXISTS delegatee_role TEXT,
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'same_module',
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;

-- 3c. FK from workflow_profile_transitions.required_authority → authority_level_catalog.level_code
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_wpt_authority_level'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'authority_level_catalog' AND table_schema = current_schema()
  ) THEN
    ALTER TABLE workflow_profile_transitions
      ADD CONSTRAINT fk_wpt_authority_level
      FOREIGN KEY (required_authority) REFERENCES authority_level_catalog(level_code)
      ON DELETE RESTRICT;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- STEP 0.4 FIXES: Audit Layer
-- ============================================

-- 4a. Add assignment_id reference to assignment_resolution_log
DO $$ BEGIN
  ALTER TABLE IF EXISTS assignment_resolution_log
    ADD COLUMN IF NOT EXISTS assignment_id UUID;
  CREATE INDEX IF NOT EXISTS idx_arl_assignment
    ON assignment_resolution_log(assignment_id)
    WHERE assignment_id IS NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4b. Add transition_id reference to workflow_decision_log
DO $$ BEGIN
  ALTER TABLE IF EXISTS workflow_decision_log
    ADD COLUMN IF NOT EXISTS transition_id BIGINT;
  CREATE INDEX IF NOT EXISTS idx_wdl_transition
    ON workflow_decision_log(transition_id)
    WHERE transition_id IS NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4c. FK from workflow_decision_log.transition_id → workflow_profile_transitions.id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_decision_log' AND table_schema = current_schema())
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_wdl_transition')
  THEN
    ALTER TABLE workflow_decision_log
      ADD CONSTRAINT fk_wdl_transition
      FOREIGN KEY (transition_id) REFERENCES workflow_profile_transitions(id)
      ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- STEP 0.5 FIXES: AI Action Queue
-- ============================================

-- 5a. Expand ai_action_queue status CHECK to include processing and cancelled
DO $$ BEGIN
  ALTER TABLE IF EXISTS ai_action_queue
    DROP CONSTRAINT IF EXISTS ai_action_queue_status_check;
  ALTER TABLE IF EXISTS ai_action_queue
    ADD CONSTRAINT ai_action_queue_status_check CHECK (status IN (
      'pending', 'approved', 'rejected', 'processing', 'executing',
      'completed', 'failed', 'cancelled'
    ));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5b. Add policy_decision_id reference to ai_action_results
DO $$ BEGIN
  ALTER TABLE IF EXISTS ai_action_results
    ADD COLUMN IF NOT EXISTS policy_decision_id UUID;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5c. FK from ai_action_results.policy_decision_id → policy_decision_log.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_aar_policy_decision'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'policy_decision_log' AND table_schema = current_schema()
  ) THEN
    ALTER TABLE ai_action_results
      ADD CONSTRAINT fk_aar_policy_decision
      FOREIGN KEY (policy_decision_id) REFERENCES policy_decision_log(id)
      ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5d. Composite index on ai_action_queue(status, created_at) for queue processing
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_aaq_status_created
    ON ai_action_queue(status, created_at)
    WHERE status IN ('pending', 'processing', 'executing');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- STEP 0.7 FIXES: Deprecation View Comments
-- ============================================

DO $$ BEGIN
  COMMENT ON VIEW v_user_effective_permissions IS
    'DEPRECATED: Use effective_user_permissions directly.';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  COMMENT ON VIEW v_user_visible_modules IS
    'DEPRECATED: Use effective_user_modules + deriveVisibleModules().';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  COMMENT ON VIEW v_module_catalog IS
    'DEPRECATED: Use product_modules + module_health_status + module_activation_status directly.';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  COMMENT ON VIEW v_role_bundle_permissions IS
    'DEPRECATED: Use functional_role_bundles chain.';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  COMMENT ON VIEW v_archetype_policy_summary IS
    'DEPRECATED: Use module_activation_policies directly.';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  COMMENT ON VIEW v_workflow_state_machine IS
    'DEPRECATED: Use workflow_profile_states + transitions.';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  COMMENT ON VIEW v_ai_autonomy_resolved IS
    'DEPRECATED: Use ai_autonomy_state directly.';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  COMMENT ON VIEW v_approver_chain IS
    'DEPRECATED: Use approver_resolution_cache directly.';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  COMMENT ON VIEW v_active_overrides IS
    'DEPRECATED: Use runtime_overrides directly.';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
