-- Migration 070: Blueprint rules tables for DB-driven workspace generation
-- 5 tables: regulator inference, framework recommendations, blueprint templates,
-- AGRC config defaults, framework registry.


-- 1. Regulator inference rules
CREATE TABLE IF NOT EXISTS public.regulator_inference_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code       VARCHAR(50) NOT NULL UNIQUE,
  regulator_id    VARCHAR(50) NOT NULL,
  regulator_name  TEXT NOT NULL,
  regulator_name_ar TEXT,
  condition_json  JSONB NOT NULL,
  base_confidence NUMERIC(3,2) NOT NULL DEFAULT 0.80,
  reason_en       TEXT NOT NULL,
  reason_ar       TEXT,
  sort_order      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Framework recommendation rules
CREATE TABLE IF NOT EXISTS public.framework_recommendation_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code       VARCHAR(50) NOT NULL UNIQUE,
  framework_code  VARCHAR(50) NOT NULL,
  framework_name  TEXT NOT NULL,
  framework_name_ar TEXT,
  condition_json  JSONB NOT NULL,
  reason_en       TEXT NOT NULL,
  reason_ar       TEXT,
  priority        VARCHAR(20) NOT NULL DEFAULT 'recommended',
  sort_order      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Blueprint templates (risks, policies, controls)
CREATE TABLE IF NOT EXISTS public.blueprint_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type   VARCHAR(20) NOT NULL,
  template_code   VARCHAR(80) NOT NULL UNIQUE,
  title_en        TEXT NOT NULL,
  title_ar        TEXT,
  category        VARCHAR(50),
  condition_json  JSONB,
  metadata_json   JSONB DEFAULT '{}'::jsonb,
  sort_order      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blueprint_templates_type ON public.blueprint_templates(template_type) WHERE is_active = true;

-- 4. AGRC-OS config defaults
CREATE TABLE IF NOT EXISTS public.agrc_config_defaults (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key      VARCHAR(50) NOT NULL,
  condition_json  JSONB,
  default_value   TEXT NOT NULL,
  sort_order      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(config_key, sort_order)
);

-- 5. Framework registry
CREATE TABLE IF NOT EXISTS public.framework_registry (
  framework_code    VARCHAR(80) PRIMARY KEY,
  name_en           TEXT NOT NULL,
  name_ar           TEXT,
  summary_en        TEXT,
  summary_ar        TEXT,
  category          VARCHAR(50),
  regulatory_authority VARCHAR(50),
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
