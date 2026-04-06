-- ============================================
-- AGRC-OS Tenant Migration 032
-- Rename Active Tables to Target Names
-- Phase 1 cleanup: align table names with domain model
-- ============================================

-- ── Workflow Engine ───────────────────────────────────────────

ALTER TABLE IF EXISTS workflows
  RENAME TO workflow_definitions;

ALTER TABLE IF EXISTS workflow_executions
  RENAME TO workflow_instances;

-- ── Governance ────────────────────────────────────────────────

ALTER TABLE IF EXISTS committees
  RENAME TO governance_committees;

ALTER TABLE IF EXISTS policies
  RENAME TO governance_policies;

ALTER TABLE IF EXISTS policy_versions
  RENAME TO governance_policy_versions;

ALTER TABLE IF EXISTS procedures
  RENAME TO governance_procedures;

ALTER TABLE IF EXISTS procedure_versions
  RENAME TO governance_procedure_versions;

-- ── Controls ──────────────────────────────────────────────────

ALTER TABLE IF EXISTS exceptions
  RENAME TO control_exceptions;

ALTER TABLE IF EXISTS control_transitions
  RENAME TO control_transition_rules;

-- ── INDEX REVIEW ──────────────────────────────────────────────
-- After running this migration, review and rename any indexes
-- that reference the old table names. Common patterns to check:
--
--   idx_workflows_*            → idx_workflow_definitions_*
--   idx_workflow_executions_*  → idx_workflow_instances_*
--   idx_committees_*           → idx_governance_committees_*
--   idx_policies_*             → idx_governance_policies_*
--   idx_policy_versions_*      → idx_governance_policy_versions_*
--   idx_procedures_*           → idx_governance_procedures_*
--   idx_procedure_versions_*   → idx_governance_procedure_versions_*
--   idx_exceptions_*           → idx_control_exceptions_*
--   idx_control_transitions_*  → idx_control_transition_rules_*
--
-- PostgreSQL renames constraints/indexes automatically when the
-- table is renamed, but any explicitly named indexes should be
-- verified for consistency with the new table names.
-- ──────────────────────────────────────────────────────────────
