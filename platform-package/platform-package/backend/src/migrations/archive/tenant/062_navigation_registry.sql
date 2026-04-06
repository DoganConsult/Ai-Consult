BEGIN;

CREATE TABLE IF NOT EXISTS navigation_registry (
  nav_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nav_key text NOT NULL UNIQUE,
  parent_nav_key text NULL,
  label_en text NOT NULL,
  label_ar text NOT NULL,
  route text NULL,
  icon text NULL,
  module_code text NULL,
  item_type text NOT NULL DEFAULT 'link',
  audience jsonb NULL,
  sort_order integer NOT NULL DEFAULT 100,
  is_system boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS navigation_overrides (
  override_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nav_key text NOT NULL,
  enabled boolean NULL,
  label_en text NULL,
  label_ar text NULL,
  route text NULL,
  icon text NULL,
  module_code text NULL,
  sort_order integer NULL,
  metadata_patch jsonb NULL,
  applies_to_role text NULL,
  applies_to_dashboard text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS navigation_role_bindings (
  binding_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nav_key text NOT NULL,
  role_code text NOT NULL,
  is_allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nav_key, role_code)
);

CREATE INDEX IF NOT EXISTS idx_navigation_registry_parent
  ON navigation_registry(parent_nav_key);

CREATE INDEX IF NOT EXISTS idx_navigation_registry_sort
  ON navigation_registry(sort_order);

CREATE INDEX IF NOT EXISTS idx_navigation_registry_module
  ON navigation_registry(module_code);

CREATE INDEX IF NOT EXISTS idx_navigation_overrides_nav_key
  ON navigation_overrides(nav_key);

CREATE INDEX IF NOT EXISTS idx_navigation_overrides_role
  ON navigation_overrides(applies_to_role);

CREATE INDEX IF NOT EXISTS idx_navigation_role_bindings_role
  ON navigation_role_bindings(role_code);

COMMIT;
