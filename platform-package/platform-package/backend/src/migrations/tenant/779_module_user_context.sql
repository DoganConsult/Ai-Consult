-- Phase 4: Module User Context (Correction 4 — single table, typed JSON)
-- GAP-03: No per-module user context

CREATE TABLE IF NOT EXISTS module_user_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  module_code TEXT NOT NULL,
  context_type TEXT NOT NULL DEFAULT 'preferences',
  context_data JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, module_code, context_type)
);
CREATE INDEX IF NOT EXISTS idx_muc_user_module ON module_user_contexts (user_id, module_code);
CREATE INDEX IF NOT EXISTS idx_muc_module ON module_user_contexts (module_code);

COMMENT ON TABLE module_user_contexts IS 'Single shared table for per-module user context. context_type discriminator + context_data typed JSON avoids 30 tables.';
COMMENT ON COLUMN module_user_contexts.context_type IS 'Discriminator: preferences, thresholds, specializations, focus_areas, dashboard_config, notification_rules';
