-- ============================================
-- 906: Navigation Advanced Dynamic — DB-driven
-- Product nav definitions, usage tracking,
-- module nav registration, tenant nav rules
-- ============================================

-- 1. Product navigation definitions (public schema — product-level truth)
CREATE TABLE IF NOT EXISTS public.product_nav_definitions (
  id SERIAL PRIMARY KEY,
  product_key TEXT NOT NULL,
  nav_key TEXT NOT NULL,
  route TEXT,
  label_key TEXT NOT NULL,
  icon TEXT,
  required_permission TEXT,
  section TEXT NOT NULL DEFAULT 'main',
  module_group TEXT,
  lifecycle_phase TEXT,
  agent_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_product_nav_def UNIQUE (product_key, nav_key)
);

CREATE INDEX IF NOT EXISTS idx_product_nav_defs_product ON public.product_nav_definitions (product_key);

-- 2. Navigation usage tracking (tenant schema — per-user analytics)
CREATE TABLE IF NOT EXISTS navigation_usage_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  nav_key TEXT NOT NULL,
  route TEXT,
  module_code TEXT,
  session_id TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nav_usage_tenant_user ON navigation_usage_log (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_nav_usage_nav_key ON navigation_usage_log (nav_key);
CREATE INDEX IF NOT EXISTS idx_nav_usage_accessed ON navigation_usage_log (accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_nav_usage_module ON navigation_usage_log (module_code);

-- 3. Navigation usage aggregates (materialized per tenant, refreshed by job)
CREATE TABLE IF NOT EXISTS navigation_usage_aggregates (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  nav_key TEXT NOT NULL,
  module_code TEXT,
  total_hits INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_nav_usage_agg UNIQUE (tenant_id, nav_key, period_start)
);

CREATE INDEX IF NOT EXISTS idx_nav_usage_agg_tenant ON navigation_usage_aggregates (tenant_id);
CREATE INDEX IF NOT EXISTS idx_nav_usage_agg_period ON navigation_usage_aggregates (period_start DESC);

-- 4. Module navigation registration (tenant schema — module declares its nav items)
CREATE TABLE IF NOT EXISTS module_nav_registration (
  id SERIAL PRIMARY KEY,
  module_code TEXT NOT NULL,
  nav_key TEXT NOT NULL,
  parent_nav_key TEXT,
  label_en TEXT NOT NULL,
  label_ar TEXT,
  route TEXT,
  icon TEXT,
  permission_code TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  ui_surface TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_module_nav_reg UNIQUE (module_code, nav_key)
);

CREATE INDEX IF NOT EXISTS idx_module_nav_reg_module ON module_nav_registration (module_code);

-- 5. Tenant navigation rules (tenant-level nav visibility overrides)
CREATE TABLE IF NOT EXISTS tenant_nav_rules (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'visibility',
  nav_key TEXT,
  module_code TEXT,
  condition_field TEXT NOT NULL,
  condition_operator TEXT NOT NULL DEFAULT 'equals',
  condition_value TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'hide',
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_nav_rules_tenant ON tenant_nav_rules (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_nav_rules_active ON tenant_nav_rules (is_active) WHERE is_active = true;

-- 6. Add frequency_score to navigation_registry for smart ordering
ALTER TABLE navigation_registry
  ADD COLUMN IF NOT EXISTS frequency_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;
