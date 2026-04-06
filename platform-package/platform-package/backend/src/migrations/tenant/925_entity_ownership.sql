-- Migration: 925_entity_ownership
-- DAuth — generic entity ownership registry for decision engine Step 13
-- Referenced by: backend/src/platform/dauth/access/decision-engine.ts (Step 13)
-- Spec: Patch 3 §7.5 Step 13 (delegation/ownership rules)

CREATE TABLE IF NOT EXISTS "${schema}".entity_ownership (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     VARCHAR(100) NOT NULL,
  entity_id       VARCHAR(255) NOT NULL,
  owner_user_id   VARCHAR(255) NOT NULL,
  delegable       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_eo_entity ON "${schema}".entity_ownership(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_eo_owner ON "${schema}".entity_ownership(owner_user_id);

COMMENT ON TABLE "${schema}".entity_ownership IS 'DAuth: generic entity ownership registry — enables decision engine Step 13 to verify ownership before requiring delegation';
