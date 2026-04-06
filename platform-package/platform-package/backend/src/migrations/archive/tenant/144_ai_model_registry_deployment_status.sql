-- Add deployment_status to ai_model_registry.
-- Separates operational/deployment lifecycle from approval workflow:
--   approval_status: draft / pending_approval / approved / rejected
--   deployment_status: inactive / active / suspended / retired
--
-- is_active (BOOLEAN) is kept and synced for the partial unique index
-- that enforces one-active-version-per-asset at the DB level.

ALTER TABLE ai_model_registry
  ADD COLUMN IF NOT EXISTS deployment_status TEXT NOT NULL DEFAULT 'inactive'
  CHECK (deployment_status IN ('inactive', 'active', 'suspended', 'retired'));

CREATE INDEX IF NOT EXISTS idx_model_registry_deployment
  ON ai_model_registry (deployment_status);
