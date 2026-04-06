-- 053: Extend dashboard_layouts + widget_registry, create dashboard_overrides + dashboard_role_bindings
-- Part of DB-driven dashboard registry system

-- ── 1. Extend dashboard_layouts ──────────────────────────────────────────────
ALTER TABLE IF EXISTS dashboard_layouts
  ADD COLUMN IF NOT EXISTS module_code     VARCHAR(100)  DEFAULT '*',
  ADD COLUMN IF NOT EXISTS route           VARCHAR(255)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS category        VARCHAR(50)   DEFAULT 'hub',
  ADD COLUMN IF NOT EXISTS icon            VARCHAR(100)  DEFAULT 'chart-bar',
  ADD COLUMN IF NOT EXISTS description     TEXT          DEFAULT '',
  ADD COLUMN IF NOT EXISTS default_filters JSONB         DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_system       BOOLEAN       DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN       DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS metadata        JSONB         DEFAULT '{}';

-- ── 2. Extend widget_registry ────────────────────────────────────────────────
ALTER TABLE IF EXISTS widget_registry
  ADD COLUMN IF NOT EXISTS module_code     VARCHAR(100)  DEFAULT '*',
  ADD COLUMN IF NOT EXISTS component_key   VARCHAR(200)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS data_endpoint   VARCHAR(255)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS default_config  JSONB         DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS config_schema   JSONB         DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_system       BOOLEAN       DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN       DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS metadata        JSONB         DEFAULT '{}';

-- ── 3. Create dashboard_overrides ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dashboard_overrides (
  override_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_code  VARCHAR(100) NOT NULL,
  role_code       VARCHAR(100) DEFAULT NULL,
  field           VARCHAR(100) NOT NULL,
  value           JSONB        NOT NULL,
  is_active       BOOLEAN      DEFAULT TRUE,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_overrides_code
  ON dashboard_overrides (dashboard_code);
CREATE INDEX IF NOT EXISTS idx_dashboard_overrides_role
  ON dashboard_overrides (role_code);

-- ── 4. Create dashboard_role_bindings ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dashboard_role_bindings (
  binding_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_code  VARCHAR(100) NOT NULL,
  role_code       VARCHAR(100) NOT NULL,
  is_default      BOOLEAN      DEFAULT FALSE,
  sort_order      INTEGER      DEFAULT 0,
  is_active       BOOLEAN      DEFAULT TRUE,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_role_bindings_role
  ON dashboard_role_bindings (role_code);
CREATE INDEX IF NOT EXISTS idx_dashboard_role_bindings_code
  ON dashboard_role_bindings (dashboard_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_role_bindings_unique
  ON dashboard_role_bindings (dashboard_code, role_code);
