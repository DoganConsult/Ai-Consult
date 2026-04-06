-- Migration 915: Add ownership classification to platform_operation_config
-- Resolves H2: mixed-owner catch-all with no ownership classification

ALTER TABLE platform_operation_config
  ADD COLUMN IF NOT EXISTS owner_module VARCHAR(50) NOT NULL DEFAULT 'platform';

ALTER TABLE platform_operation_config
  ADD COLUMN IF NOT EXISTS owner_type VARCHAR(30) NOT NULL DEFAULT 'platform'
    CHECK (owner_type IN ('platform', 'product', 'module'));

CREATE INDEX IF NOT EXISTS idx_poc_owner_module
  ON platform_operation_config(owner_module);

CREATE INDEX IF NOT EXISTS idx_poc_owner_type
  ON platform_operation_config(owner_type);

ALTER TABLE platform_operation_config
  DROP CONSTRAINT IF EXISTS platform_operation_config_config_key_key;

ALTER TABLE platform_operation_config
  ADD CONSTRAINT uq_poc_key_owner
    UNIQUE (config_key, owner_module);

UPDATE platform_operation_config SET owner_module = 'ai_governance', owner_type = 'module'
  WHERE config_key IN ('agent_confidence_threshold', 'default_operation_mode', 'mode_audit_enabled');

UPDATE platform_operation_config SET owner_module = 'policy', owner_type = 'module'
  WHERE config_key LIKE 'sod_%' OR config_key LIKE 'policy_%';

UPDATE platform_operation_config SET owner_module = 'incident', owner_type = 'module'
  WHERE config_key LIKE 'incident_%' OR config_key LIKE 'sla_%';

UPDATE platform_operation_config SET owner_module = 'governance', owner_type = 'module'
  WHERE config_key LIKE 'governance_%' OR config_key LIKE 'approval_%';

UPDATE platform_operation_config SET owner_module = 'workflow', owner_type = 'module'
  WHERE config_key = 'workflow_mode_enforcement';
