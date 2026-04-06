-- Migration 909: Add user_id + tenant_id to actor_registry
-- Fixes schema mismatch: registerActor() expects these columns but migration 776 omitted them.
-- Idempotent: uses IF NOT EXISTS column checks.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'actor_registry' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE actor_registry ADD COLUMN user_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_actor_registry_user_id ON actor_registry (user_id) WHERE user_id IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'actor_registry' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE actor_registry ADD COLUMN tenant_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_actor_registry_tenant_id ON actor_registry (tenant_id) WHERE tenant_id IS NOT NULL;
  END IF;
END $$;
