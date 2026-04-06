-- AGRC-OS Tenant Migration 182
-- Training Programs table — used by A12 Training & Awareness Agent tools
-- ============================================

CREATE TABLE IF NOT EXISTS training_programs (
  training_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL DEFAULT current_setting('app.current_tenant', true),
  title             VARCHAR(500) NOT NULL,
  category          VARCHAR(200),
  description       TEXT,
  target_roles      JSONB       DEFAULT '[]',
  status            VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  due_date          DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tp_tenant_status
  ON training_programs(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_tp_category
  ON training_programs(category);
