-- Migration: 928_tenant_status_rules
-- DAuth — DB-driven tenant status rules replacing hardcoded ONBOARDING_STATUSES and active checks
-- Referenced by: backend/src/platform/dauth/access/decision-engine.ts (Step 4)
-- Spec: Law 3 (data-driven security)

CREATE TABLE IF NOT EXISTS "${schema}".tenant_status_rules (
  status_code       VARCHAR(50) PRIMARY KEY,
  display_name      VARCHAR(100) NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT FALSE,
  allows_onboarding BOOLEAN NOT NULL DEFAULT FALSE,
  is_terminal       BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO "${schema}".tenant_status_rules (status_code, display_name, is_active, allows_onboarding, is_terminal, sort_order) VALUES
  ('active', 'Active', TRUE, FALSE, FALSE, 1),
  ('trial_active', 'Trial Active', TRUE, FALSE, FALSE, 2),
  ('pending_onboarding', 'Pending Onboarding', FALSE, TRUE, FALSE, 3),
  ('registered', 'Registered', FALSE, TRUE, FALSE, 4),
  ('provisioning', 'Provisioning', FALSE, TRUE, FALSE, 5),
  ('suspended', 'Suspended', FALSE, FALSE, FALSE, 6),
  ('deactivated', 'Deactivated', FALSE, FALSE, TRUE, 7),
  ('archived', 'Archived', FALSE, FALSE, TRUE, 8)
ON CONFLICT (status_code) DO NOTHING;

COMMENT ON TABLE "${schema}".tenant_status_rules IS 'DAuth: DB-driven tenant status classification for decision engine Step 4';
