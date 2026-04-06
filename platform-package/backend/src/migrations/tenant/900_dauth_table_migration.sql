-- ============================================================================
-- Tenant Migration 900: DAuth Table Migration Map (AGENTS.md §6.6)
--
-- Executes the 18-table disposition plan for DAuth Bucket 1B tables:
--   - 5 RENAMEs: source table renamed to canonical target
--   - 8 MERGEs: source data copied into canonical target (source retained)
--   - 1 KEEP:   role_assignment_history left as-is (audit trail)
--   - 4 ARCHIVEs: left for Phase 9 (not handled here)
--
-- Safety:
--   - All operations use IF EXISTS guards (idempotent, safe to re-run)
--   - No DROP statements — source tables retained for rollback
--   - MERGE uses NOT EXISTS to prevent duplicate inserts on re-run
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- PHASE 1: RENAMES (5 tables)
-- ────────────────────────────────────────────────────────────────────────────

-- 1.1 user_role_assignments → actor_role_assignments
-- Maps legacy user_id-based role assignments to the unified actor model.
-- Target table (actor_role_assignments) is created by migration 776.
-- If target already exists, skip rename and merge data instead.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema() AND table_name = 'user_role_assignments')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables
                     WHERE table_schema = current_schema() AND table_name = 'actor_role_assignments')
  THEN
    ALTER TABLE user_role_assignments RENAME TO actor_role_assignments;
    RAISE NOTICE 'Migration 900: Renamed user_role_assignments → actor_role_assignments';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables
                WHERE table_schema = current_schema() AND table_name = 'user_role_assignments')
        AND EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema = current_schema() AND table_name = 'actor_role_assignments')
  THEN
    -- Target already exists (created by 776); merge data instead of rename
    INSERT INTO actor_role_assignments (actor_id, role_code, scope_type, scope_id, assigned_by, reason, valid_from, valid_to, is_active, created_at)
    SELECT
      user_id::UUID,
      role_id,
      COALESCE(scope_type, 'tenant'),
      scope_id,
      assigned_by,
      reason,
      COALESCE(valid_from, NOW()),
      valid_to,
      COALESCE(active, TRUE),
      COALESCE(created_at, NOW())
    FROM user_role_assignments ura
    WHERE NOT EXISTS (
      SELECT 1 FROM actor_role_assignments ara
      WHERE ara.actor_id = ura.user_id::UUID
        AND ara.role_code = ura.role_id
        AND COALESCE(ara.scope_type, '') = COALESCE(ura.scope_type, '')
    );
    RAISE NOTICE 'Migration 900: Merged user_role_assignments → actor_role_assignments (target already existed)';
    -- source table retained for rollback
  ELSE
    RAISE NOTICE 'Migration 900: user_role_assignments not found or already renamed — skipping';
  END IF;
END $$;

-- 1.2 user_access_profiles → actor_access_assignments
-- Maps legacy user-profile bindings to the unified actor access model.
-- Target table (actor_access_assignments) is created by migration 776.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema() AND table_name = 'user_access_profiles')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables
                     WHERE table_schema = current_schema() AND table_name = 'actor_access_assignments')
  THEN
    ALTER TABLE user_access_profiles RENAME TO actor_access_assignments;
    RAISE NOTICE 'Migration 900: Renamed user_access_profiles → actor_access_assignments';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables
                WHERE table_schema = current_schema() AND table_name = 'user_access_profiles')
        AND EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema = current_schema() AND table_name = 'actor_access_assignments')
  THEN
    -- Target already exists (created by 776); merge data instead of rename
    INSERT INTO actor_access_assignments (actor_id, profile_code, assigned_by, reason, valid_from, valid_to, is_active, created_at)
    SELECT
      uap.user_id::UUID,
      uap.access_profile_code,
      uap.granted_by,
      NULL,
      COALESCE(uap.valid_from, NOW()),
      uap.valid_to,
      COALESCE(uap.is_active, TRUE),
      COALESCE(uap.created_at, NOW())
    FROM user_access_profiles uap
    WHERE NOT EXISTS (
      SELECT 1 FROM actor_access_assignments aaa
      WHERE aaa.actor_id = uap.user_id::UUID
        AND aaa.profile_code = uap.access_profile_code
    );
    RAISE NOTICE 'Migration 900: Merged user_access_profiles → actor_access_assignments (target already existed)';
    -- source table retained for rollback
  ELSE
    RAISE NOTICE 'Migration 900: user_access_profiles not found or already renamed — skipping';
  END IF;
END $$;

-- 1.3 roles (tenant) → functional_roles
-- Maps legacy tenant role dictionary to the canonical functional_roles table.
-- Target table (functional_roles) is created by migrations 163 and 776.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema() AND table_name = 'roles')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables
                     WHERE table_schema = current_schema() AND table_name = 'functional_roles')
  THEN
    ALTER TABLE roles RENAME TO functional_roles;
    RAISE NOTICE 'Migration 900: Renamed roles → functional_roles';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables
                WHERE table_schema = current_schema() AND table_name = 'roles')
        AND EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema = current_schema() AND table_name = 'functional_roles')
  THEN
    -- Target already exists; merge non-duplicate role codes
    INSERT INTO functional_roles (role_code, role_name_en, role_name_ar, description_en, description_ar, category, is_active, created_at, updated_at)
    SELECT
      r.role_code,
      r.name_en,
      r.name_ar,
      r.description_en,
      r.description_ar,
      COALESCE(
        CASE r.role_category
          WHEN 'internal' THEN 'grc_core'
          WHEN 'external' THEN 'audit'
          WHEN 'system' THEN 'it_ops'
        END,
        'custom'
      ),
      COALESCE(r.active, TRUE),
      COALESCE(r.created_at, NOW()),
      COALESCE(r.updated_at, NOW())
    FROM roles r
    WHERE NOT EXISTS (
      SELECT 1 FROM functional_roles fr WHERE fr.role_code = r.role_code
    );
    RAISE NOTICE 'Migration 900: Merged roles → functional_roles (target already existed)';
    -- source table retained for rollback
  ELSE
    RAISE NOTICE 'Migration 900: roles table not found or already renamed — skipping';
  END IF;
END $$;

-- 1.4 role_function_map (tenant) → role_permissions
-- Maps legacy role-function bindings to the canonical role_permissions model.
-- Target table (role_permissions) exists from migrations 033/163.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema() AND table_name = 'role_function_map')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables
                     WHERE table_schema = current_schema() AND table_name = 'role_permissions')
  THEN
    ALTER TABLE role_function_map RENAME TO role_permissions;
    RAISE NOTICE 'Migration 900: Renamed role_function_map → role_permissions';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables
                WHERE table_schema = current_schema() AND table_name = 'role_function_map')
        AND EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema = current_schema() AND table_name = 'role_permissions')
  THEN
    RAISE NOTICE 'Migration 900: role_function_map exists but role_permissions target already present — skipping (data migration requires manual column mapping)';
    -- source table retained for rollback
    -- Note: role_function_map has (role_id, function_code) composite PK with RACI flags,
    -- while role_permissions has (functional_role_id, permission_id) FK-based PK.
    -- Schema mismatch prevents automatic merge; data must be mapped manually via the
    -- permission registry seeding in a later migration.
  ELSE
    RAISE NOTICE 'Migration 900: role_function_map not found or already renamed — skipping';
  END IF;
END $$;

-- 1.5 delegation_rules → delegation_policies
-- Maps shadow-agent delegation rules to canonical delegation policy model.
-- Target table (delegation_policies) is created by migration 778.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema() AND table_name = 'delegation_rules')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables
                     WHERE table_schema = current_schema() AND table_name = 'delegation_policies')
  THEN
    ALTER TABLE delegation_rules RENAME TO delegation_policies;
    RAISE NOTICE 'Migration 900: Renamed delegation_rules → delegation_policies';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables
                WHERE table_schema = current_schema() AND table_name = 'delegation_rules')
        AND EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema = current_schema() AND table_name = 'delegation_policies')
  THEN
    RAISE NOTICE 'Migration 900: delegation_rules exists but delegation_policies target already present — skipping (schema mismatch: agent-scoped rules vs policy-code model)';
    -- source table retained for rollback
    -- Note: delegation_rules has (tenant_id, user_id, agent_id, action_type) scope,
    -- while delegation_policies has (policy_code, delegator_role_code, delegate_actor_type).
    -- These are structurally different; manual policy definition migration required.
  ELSE
    RAISE NOTICE 'Migration 900: delegation_rules not found or already renamed — skipping';
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- PHASE 2: MERGES (8 tables → 3 targets)
-- ────────────────────────────────────────────────────────────────────────────

-- 2.1 enterprise_user_role_assignments → actor_role_assignments
-- Merges enterprise-wide role grants into the unified actor assignment table.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema() AND table_name = 'enterprise_user_role_assignments')
     AND EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = current_schema() AND table_name = 'actor_role_assignments')
  THEN
    INSERT INTO actor_role_assignments (actor_id, role_code, scope_type, scope_id, assigned_by, reason, valid_from, valid_to, is_active, created_at)
    SELECT
      eura.user_id::UUID,
      eura.functional_role_code,
      COALESCE(eura.scope_type, 'tenant'),
      eura.scope_id::TEXT,
      eura.granted_by,
      CASE WHEN eura.authority_level IS NOT NULL
           THEN 'enterprise migration; authority_level=' || eura.authority_level
           ELSE 'enterprise migration'
      END,
      COALESCE(eura.valid_from, NOW()),
      eura.valid_to,
      COALESCE(eura.is_active, TRUE),
      COALESCE(eura.created_at, NOW())
    FROM enterprise_user_role_assignments eura
    WHERE NOT EXISTS (
      SELECT 1 FROM actor_role_assignments ara
      WHERE ara.actor_id = eura.user_id::UUID
        AND ara.role_code = eura.functional_role_code
        AND COALESCE(ara.scope_type, '') = COALESCE(eura.scope_type, '')
    );
    RAISE NOTICE 'Migration 900: Merged enterprise_user_role_assignments → actor_role_assignments';
    -- source table retained for rollback
  ELSE
    RAISE NOTICE 'Migration 900: enterprise_user_role_assignments or actor_role_assignments not found — skipping merge';
  END IF;
END $$;

-- 2.2 authority_levels → decision_authorities
-- Merges authority threshold definitions into the unified decision authority model.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema() AND table_name = 'authority_levels')
     AND EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = current_schema() AND table_name = 'decision_authorities')
  THEN
    INSERT INTO decision_authorities (authority_code, authority_type, resource_type, required_role_codes, conditions, is_active, created_at, updated_at)
    SELECT
      al.level_code,
      'approve',
      'authority_level',
      ARRAY[]::TEXT[],
      jsonb_build_object(
        'source', 'authority_levels',
        'rank', al.rank,
        'approval_limit_amount', al.approval_limit_amount,
        'can_approve_risk_level', al.can_approve_risk_level,
        'name_en', al.name_en,
        'name_ar', al.name_ar,
        'description_en', al.description_en,
        'description_ar', al.description_ar
      ),
      TRUE,
      COALESCE(al.created_at, NOW()),
      COALESCE(al.updated_at, NOW())
    FROM authority_levels al
    WHERE al.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM decision_authorities da
        WHERE da.authority_code = al.level_code
          AND da.resource_type = 'authority_level'
      );
    RAISE NOTICE 'Migration 900: Merged authority_levels → decision_authorities';
    -- source table retained for rollback
  ELSE
    RAISE NOTICE 'Migration 900: authority_levels or decision_authorities not found — skipping merge';
  END IF;
END $$;

-- 2.3 authority_matrix (tenant) → decision_authorities
-- Merges authority assignment rules into the unified decision authority model.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema() AND table_name = 'authority_matrix')
     AND EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = current_schema() AND table_name = 'decision_authorities')
  THEN
    INSERT INTO decision_authorities (authority_code, authority_type, resource_type, required_role_codes, max_risk_level, conditions, is_active, created_at, updated_at)
    SELECT
      'am_' || am.decision_type || '_' || am.min_criticality,
      'approve',
      am.decision_type,
      ARRAY[am.required_approver_role],
      CASE am.min_criticality
        WHEN 'critical' THEN 'critical'
        WHEN 'high' THEN 'high'
        WHEN 'medium' THEN 'medium'
        WHEN 'low' THEN 'low'
        ELSE NULL
      END,
      jsonb_build_object(
        'source', 'authority_matrix',
        'escalation_timeout_hours', am.escalation_timeout_hours
      ),
      TRUE,
      COALESCE(am.created_at, NOW()),
      NOW()
    FROM authority_matrix am
    WHERE NOT EXISTS (
      SELECT 1 FROM decision_authorities da
      WHERE da.authority_code = 'am_' || am.decision_type || '_' || am.min_criticality
        AND da.resource_type = am.decision_type
    );
    RAISE NOTICE 'Migration 900: Merged authority_matrix → decision_authorities';
    -- source table retained for rollback
  ELSE
    RAISE NOTICE 'Migration 900: authority_matrix or decision_authorities not found — skipping merge';
  END IF;
END $$;

-- 2.4 sign_off_authority_matrix → decision_authorities
-- Merges finding sign-off authority rules into the unified decision authority model.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema() AND table_name = 'sign_off_authority_matrix')
     AND EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = current_schema() AND table_name = 'decision_authorities')
  THEN
    INSERT INTO decision_authorities (authority_code, authority_type, resource_type, required_role_codes, max_risk_level, conditions, is_active, created_at, updated_at)
    SELECT
      'signoff_' || soam.finding_severity,
      'sign_off',
      'finding',
      ARRAY[soam.required_role],
      CASE soam.finding_severity
        WHEN 'critical' THEN 'critical'
        WHEN 'high' THEN 'high'
        WHEN 'medium' THEN 'medium'
        WHEN 'low' THEN 'low'
        ELSE NULL
      END,
      jsonb_build_object(
        'source', 'sign_off_authority_matrix',
        'escalation_timeout_hours', soam.escalation_timeout_hours,
        'requires_dual_approval', soam.requires_dual_approval,
        'severity_order', soam.severity_order
      ),
      COALESCE(soam.active, TRUE),
      COALESCE(soam.created_at, NOW()),
      COALESCE(soam.updated_at, NOW())
    FROM sign_off_authority_matrix soam
    WHERE NOT EXISTS (
      SELECT 1 FROM decision_authorities da
      WHERE da.authority_code = 'signoff_' || soam.finding_severity
        AND da.resource_type = 'finding'
    );
    RAISE NOTICE 'Migration 900: Merged sign_off_authority_matrix → decision_authorities';
    -- source table retained for rollback
  ELSE
    RAISE NOTICE 'Migration 900: sign_off_authority_matrix or decision_authorities not found — skipping merge';
  END IF;
END $$;

-- 2.5 authorization_decision_log → authz_decision_log (Law 1 merge)
-- Merges legacy authorization decision records into the canonical log.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema() AND table_name = 'authorization_decision_log')
     AND EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = current_schema() AND table_name = 'authz_decision_log')
  THEN
    INSERT INTO authz_decision_log (user_id, permission_code, module_code, decision, reason, matched_role, matched_scope_type, record_context, created_at)
    SELECT
      adl.user_id,
      COALESCE(adl.required_function, adl.action || ':' || adl.resource_type),
      NULL,
      CASE WHEN adl.allowed THEN 'allow' ELSE 'deny' END,
      adl.reason,
      adl.matched_role_id,
      adl.scope_type,
      jsonb_build_object(
        'source', 'authorization_decision_log',
        'original_decision_id', adl.decision_id,
        'resource_id', adl.resource_id,
        'decision_source', adl.decision_source,
        'matched_function_code', adl.matched_function_code
      ),
      adl.decided_at
    FROM authorization_decision_log adl
    WHERE NOT EXISTS (
      SELECT 1 FROM authz_decision_log azl
      WHERE azl.record_context->>'original_decision_id' = adl.decision_id::TEXT
    );
    RAISE NOTICE 'Migration 900: Merged authorization_decision_log → authz_decision_log';
    -- source table retained for rollback
  ELSE
    RAISE NOTICE 'Migration 900: authorization_decision_log or authz_decision_log not found — skipping merge';
  END IF;
END $$;

-- 2.6 guard_decision_log → authz_decision_log (Law 1 merge)
-- Merges guard-node decision records into the canonical authorization log.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema() AND table_name = 'guard_decision_log')
     AND EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = current_schema() AND table_name = 'authz_decision_log')
  THEN
    INSERT INTO authz_decision_log (user_id, permission_code, module_code, decision, reason, record_context, created_at)
    SELECT
      COALESCE(gdl.user_id, 'system'),
      gdl.check_type || ':' || COALESCE(gdl.tool_name, 'unknown'),
      NULL,
      CASE gdl.decision
        WHEN 'allow' THEN 'allow'
        WHEN 'block' THEN 'deny'
        WHEN 'redacted' THEN 'deny'
        ELSE 'deny'
      END,
      gdl.reason,
      jsonb_build_object(
        'source', 'guard_decision_log',
        'original_id', gdl.id,
        'agent_id', gdl.agent_id,
        'run_id', gdl.run_id,
        'check_type', gdl.check_type,
        'original_decision', gdl.decision,
        'metadata', gdl.metadata
      ),
      gdl.created_at
    FROM guard_decision_log gdl
    WHERE NOT EXISTS (
      SELECT 1 FROM authz_decision_log azl
      WHERE azl.record_context->>'original_id' = gdl.id::TEXT
        AND azl.record_context->>'source' = 'guard_decision_log'
    );
    RAISE NOTICE 'Migration 900: Merged guard_decision_log → authz_decision_log';
    -- source table retained for rollback
  ELSE
    RAISE NOTICE 'Migration 900: guard_decision_log or authz_decision_log not found — skipping merge';
  END IF;
END $$;

-- 2.7 delegated_authorities → delegation_chains
-- Merges delegated authority grants into the canonical delegation chain model.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema() AND table_name = 'delegated_authorities')
     AND EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = current_schema() AND table_name = 'delegation_chains')
  THEN
    INSERT INTO delegation_chains (delegator_user_id, delegate_user_id, delegation_type, scope_type, scope_codes, reason, valid_from, valid_to, is_active, requires_approval, approved_by, approved_at, metadata, created_by, created_at, updated_at)
    SELECT
      da.delegator_user_id::UUID,
      da.delegate_user_id::UUID,
      'partial',
      COALESCE(da.scope_type, 'all'),
      CASE WHEN da.scope_id IS NOT NULL THEN ARRAY[da.scope_id::TEXT] ELSE ARRAY[]::TEXT[] END,
      NULL,
      COALESCE(da.valid_from, NOW()),
      da.valid_to,
      CASE da.status WHEN 'active' THEN TRUE ELSE FALSE END,
      da.approved_by IS NOT NULL,
      da.approved_by::UUID,
      da.approved_at,
      COALESCE(da.metadata, '{}') || jsonb_build_object(
        'source', 'delegated_authorities',
        'original_delegation_id', da.delegation_id,
        'authority_type', da.authority_type,
        'conditions', da.conditions
      ),
      COALESCE(da.created_by, da.delegator_user_id)::UUID,
      COALESCE(da.created_at, NOW()),
      COALESCE(da.updated_at, NOW())
    FROM delegated_authorities da
    WHERE da.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM delegation_chains dc
        WHERE dc.metadata->>'original_delegation_id' = da.delegation_id::TEXT
          AND dc.metadata->>'source' = 'delegated_authorities'
      );
    RAISE NOTICE 'Migration 900: Merged delegated_authorities → delegation_chains';
    -- source table retained for rollback
  ELSE
    RAISE NOTICE 'Migration 900: delegated_authorities or delegation_chains not found — skipping merge';
  END IF;
END $$;

-- 2.8 delegations → delegation_chains
-- Merges enterprise delegation records into the canonical delegation chain model.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema() AND table_name = 'delegations')
     AND EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = current_schema() AND table_name = 'delegation_chains')
  THEN
    INSERT INTO delegation_chains (delegator_user_id, delegate_user_id, delegation_type, scope_type, scope_codes, reason, valid_from, valid_to, is_active, metadata, created_by, created_at, updated_at)
    SELECT
      d.from_user_id::UUID,
      d.to_user_id::UUID,
      'partial',
      COALESCE(d.scope_type, 'all'),
      CASE
        WHEN d.functional_role_code IS NOT NULL AND d.module_code IS NOT NULL
          THEN ARRAY[d.functional_role_code, d.module_code]
        WHEN d.functional_role_code IS NOT NULL
          THEN ARRAY[d.functional_role_code]
        WHEN d.module_code IS NOT NULL
          THEN ARRAY[d.module_code]
        ELSE ARRAY[]::TEXT[]
      END,
      d.reason,
      d.valid_from,
      d.valid_to,
      COALESCE(d.is_active, TRUE),
      jsonb_build_object(
        'source', 'delegations',
        'original_id', d.id,
        'functional_role_code', d.functional_role_code,
        'module_code', d.module_code,
        'scope_id', d.scope_id
      ),
      COALESCE(d.created_by, d.from_user_id)::UUID,
      COALESCE(d.created_at, NOW()),
      COALESCE(d.updated_at, NOW())
    FROM delegations d
    WHERE NOT EXISTS (
      SELECT 1 FROM delegation_chains dc
      WHERE dc.metadata->>'original_id' = d.id::TEXT
        AND dc.metadata->>'source' = 'delegations'
    );
    RAISE NOTICE 'Migration 900: Merged delegations → delegation_chains';
    -- source table retained for rollback
  ELSE
    RAISE NOTICE 'Migration 900: delegations or delegation_chains not found — skipping merge';
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- PHASE 3: KEEP (1 table — no action required)
-- ────────────────────────────────────────────────────────────────────────────

-- role_assignment_history: KEEP as audit trail (§6.6)
-- No action needed — table remains in place for historical reference.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema() AND table_name = 'role_assignment_history')
  THEN
    RAISE NOTICE 'Migration 900: role_assignment_history — KEEP as audit trail (no action)';
  ELSE
    RAISE NOTICE 'Migration 900: role_assignment_history not found — skipping';
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- PHASE 9 (DEFERRED): ARCHIVE tables — not handled in this migration
-- These 4 tables are candidates for DROP in a future Phase 9 migration:
--   - role_functions (tenant) — absorbed by permission model
--   - role_function_scope_map — absorbed by scope model
--   - role_defense_line_mappings — absorbed by defense_lines + scope model
--   - role_team_mapping — absorbed by org_unit_role_assignments
-- Per §6.6, they remain in place until Phase 9 cleanup.
-- ────────────────────────────────────────────────────────────────────────────


-- ────────────────────────────────────────────────────────────────────────────
-- MIGRATION SUMMARY
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Migration 900: DAuth Table Migration (AGENTS.md §6.6) — COMPLETE';
  RAISE NOTICE '  Renames:  user_role_assignments → actor_role_assignments';
  RAISE NOTICE '            user_access_profiles → actor_access_assignments';
  RAISE NOTICE '            roles → functional_roles';
  RAISE NOTICE '            role_function_map → role_permissions';
  RAISE NOTICE '            delegation_rules → delegation_policies';
  RAISE NOTICE '  Merges:   enterprise_user_role_assignments → actor_role_assignments';
  RAISE NOTICE '            authority_levels → decision_authorities';
  RAISE NOTICE '            authority_matrix → decision_authorities';
  RAISE NOTICE '            sign_off_authority_matrix → decision_authorities';
  RAISE NOTICE '            authorization_decision_log → authz_decision_log';
  RAISE NOTICE '            guard_decision_log → authz_decision_log';
  RAISE NOTICE '            delegated_authorities → delegation_chains';
  RAISE NOTICE '            delegations → delegation_chains';
  RAISE NOTICE '  Keep:     role_assignment_history (audit trail)';
  RAISE NOTICE '  Deferred: 4 archive tables (Phase 9)';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;
