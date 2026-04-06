-- Migration 475: Fix user_role_assignments unique constraint
-- Replaces the COALESCE-based functional unique index with a proper
-- partial unique index that handles NULL scope_id correctly.
-- The old index used COALESCE(scope_id, '00000000-...') which conflates
-- scope_id = '' with scope_id IS NULL and is PostgreSQL-version-dependent.

DROP INDEX IF EXISTS uq_user_primary_role_per_scope;

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_primary_role_per_scope_scoped
  ON user_role_assignments(user_id, scope_type, scope_id)
  WHERE is_primary = TRUE AND active = TRUE AND scope_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_primary_role_per_scope_unscoped
  ON user_role_assignments(user_id, scope_type)
  WHERE is_primary = TRUE AND active = TRUE AND scope_id IS NULL;
