BEGIN;

-- Retire the old dashboard_overrides (wrong schema from 053)
ALTER TABLE IF EXISTS dashboard_overrides RENAME TO _retired_dashboard_overrides_v1;

CREATE TABLE IF NOT EXISTS dashboard_registry (
  dashboard_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_code text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  audience text NULL,
  module_code text NULL,
  route text NULL,
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_filters jsonb NULL,
  is_system boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dashboard_widget_registry (
  widget_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_key text NOT NULL UNIQUE,
  label_en text NOT NULL,
  label_ar text NOT NULL,
  module_code text NULL,
  component_key text NOT NULL,
  default_width integer NOT NULL DEFAULT 6,
  default_height integer NOT NULL DEFAULT 3,
  config_schema jsonb NULL,
  default_config jsonb NULL,
  is_system boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dashboard_overrides (
  override_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_code text NOT NULL,
  applies_to_role text NULL,
  enabled boolean NULL,
  name_en text NULL,
  name_ar text NULL,
  route text NULL,
  layout_patch jsonb NULL,
  default_filters_patch jsonb NULL,
  metadata_patch jsonb NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add is_allowed to existing dashboard_role_bindings
ALTER TABLE IF EXISTS dashboard_role_bindings
  ADD COLUMN IF NOT EXISTS is_allowed boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_dashboard_registry_module
  ON dashboard_registry(module_code);

CREATE INDEX IF NOT EXISTS idx_dashboard_registry_route
  ON dashboard_registry(route);

CREATE INDEX IF NOT EXISTS idx_dashboard_overrides_dashboard
  ON dashboard_overrides(dashboard_code);

CREATE INDEX IF NOT EXISTS idx_dashboard_overrides_role
  ON dashboard_overrides(applies_to_role);

COMMIT;
