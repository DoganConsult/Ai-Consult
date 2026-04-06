-- Migration 079: Create missing entity tables for frontend pages
-- Tables: modules, processes, products, hitl_states, powerbi_reports, tenant_settings

-- 1. modules
CREATE TABLE IF NOT EXISTS modules (
  module_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  module_code  VARCHAR(100),
  category     VARCHAR(100),
  description  TEXT DEFAULT '',
  enabled      BOOLEAN DEFAULT true,
  status       VARCHAR(30) DEFAULT 'active',
  created_by   VARCHAR(64),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_modules_status ON modules(status) WHERE deleted_at IS NULL;

-- 2. processes
CREATE TABLE IF NOT EXISTS processes (
  process_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  description  TEXT DEFAULT '',
  owner        VARCHAR(255),
  department   VARCHAR(255),
  status       VARCHAR(30) DEFAULT 'active',
  created_by   VARCHAR(64),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_processes_status ON processes(status) WHERE deleted_at IS NULL;

-- 3. products
CREATE TABLE IF NOT EXISTS products (
  product_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  category     VARCHAR(100) DEFAULT 'software',
  owner        VARCHAR(255),
  version      VARCHAR(50),
  description  TEXT DEFAULT '',
  status       VARCHAR(30) DEFAULT 'active',
  created_by   VARCHAR(64),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status) WHERE deleted_at IS NULL;

-- 4. hitl_states (Human-In-The-Loop review queue)
CREATE TABLE IF NOT EXISTS hitl_states (
  state_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     VARCHAR(64) NOT NULL,
  entity_id       VARCHAR(128) NOT NULL,
  hitl_state      VARCHAR(30) DEFAULT 'ai_draft',
  ai_agent_id     VARCHAR(10),
  confidence      NUMERIC(5,4),
  last_actor_type VARCHAR(20) DEFAULT 'ai',
  review_required BOOLEAN DEFAULT false,
  review_decision VARCHAR(30),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hitl_states_entity ON hitl_states(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_hitl_states_state ON hitl_states(hitl_state);

-- 5. powerbi_reports
CREATE TABLE IF NOT EXISTS powerbi_reports (
  report_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  report_url   TEXT,
  embed_url    TEXT,
  dataset_id   VARCHAR(128),
  workspace_id VARCHAR(128),
  status       VARCHAR(30) DEFAULT 'active',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

-- 6. tenant_settings (key-value config store)
CREATE TABLE IF NOT EXISTS tenant_settings (
  setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        VARCHAR(255) NOT NULL UNIQUE,
  value      TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Add missing columns to locations for frontend compatibility
ALTER TABLE locations ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS address VARCHAR(500);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS country_name VARCHAR(100);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Backfill name from name_en if name is null
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'locations' AND column_name = 'name_en')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'locations' AND column_name = 'name') THEN
    UPDATE locations SET name = name_en WHERE name IS NULL;
  END IF;
END $$;

-- Backfill address from address_line1
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'locations' AND column_name = 'address_line1')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'locations' AND column_name = 'address') THEN
    UPDATE locations SET address = address_line1 WHERE address IS NULL;
  END IF;
END $$;

-- 8. Add missing columns to evidence_tasks for frontend compatibility
ALTER TABLE evidence_tasks ADD COLUMN IF NOT EXISTS evidence_id UUID;
ALTER TABLE evidence_tasks ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE evidence_tasks ADD COLUMN IF NOT EXISTS due_date DATE;

-- Backfill evidence_id from evidence_requirement_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'evidence_tasks' AND column_name = 'evidence_requirement_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'evidence_tasks' AND column_name = 'evidence_id') THEN
    UPDATE evidence_tasks SET evidence_id = evidence_requirement_id WHERE evidence_id IS NULL;
  END IF;
END $$;

-- Backfill due_date from due_at
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'evidence_tasks' AND column_name = 'due_at')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'evidence_tasks' AND column_name = 'due_date') THEN
    UPDATE evidence_tasks SET due_date = due_at::date WHERE due_date IS NULL;
  END IF;
END $$;
