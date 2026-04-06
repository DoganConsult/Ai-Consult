-- Migration 922: DOS tenant-scoped service tables
-- Creates tables required by new DOS tenant-level services:
--   workspace-state, workspace-provisioning-state, workspace-profile-runtime,
--   tenant-settings (reconcile), product-composition, provisioning-audit,
--   event-subscription-registry
-- Date: 2026-04-04

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- Workspace state machine
-- ═══════════════════════════════════════════════════════════════

-- workspace_states: current lifecycle state per workspace
-- Used by: workspace-state.service.ts
CREATE TABLE IF NOT EXISTS workspace_states (
    workspace_id    UUID PRIMARY KEY,
    current_state   VARCHAR(50)  NOT NULL DEFAULT 'initializing',
    previous_state  VARCHAR(50),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by      VARCHAR(255)
);

-- workspace_state_history: audit trail for workspace state transitions
-- Used by: workspace-state.service.ts
CREATE TABLE IF NOT EXISTS workspace_state_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID         NOT NULL,
    from_state      VARCHAR(50)  NOT NULL,
    to_state        VARCHAR(50)  NOT NULL,
    triggered_by    VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workspace_state_history_ws
    ON workspace_state_history (workspace_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- Workspace provisioning
-- ═══════════════════════════════════════════════════════════════

-- workspace_provisioning_runs: provisioning run tracking
-- Used by: workspace-provisioning-state.service.ts
CREATE TABLE IF NOT EXISTS workspace_provisioning_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID         NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending',
    total_steps     INTEGER      NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    cancelled_by    VARCHAR(255),
    cancelled_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ws_provisioning_runs_ws
    ON workspace_provisioning_runs (workspace_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ws_provisioning_runs_status
    ON workspace_provisioning_runs (status);

-- workspace_provisioning_steps: individual steps within a provisioning run
-- Used by: workspace-provisioning-state.service.ts
CREATE TABLE IF NOT EXISTS workspace_provisioning_steps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID         NOT NULL REFERENCES workspace_provisioning_runs(id),
    step_code       VARCHAR(100) NOT NULL,
    step_order      INTEGER      NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending',
    is_required     BOOLEAN      NOT NULL DEFAULT TRUE,
    output_data     JSONB,
    error           TEXT,
    retry_count     INTEGER      NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ws_provisioning_steps_run
    ON workspace_provisioning_steps (run_id, step_order);

-- ═══════════════════════════════════════════════════════════════
-- Workspace profiles (runtime — distinct from workspace_profile singular)
-- ═══════════════════════════════════════════════════════════════

-- workspace_profiles: per-workspace runtime profile (display, locale, metadata)
-- Used by: workspace-profile-runtime.service.ts
-- Note: This is distinct from workspace_profile (singular, tenant_id PK, migration 607)
--       which stores AGRC industry/sector config. This table stores per-workspace
--       display settings and locale preferences.
CREATE TABLE IF NOT EXISTS workspace_profiles (
    workspace_id    UUID PRIMARY KEY,
    display_name    VARCHAR(255),
    description     TEXT,
    locale          VARCHAR(10),
    timezone        VARCHAR(50),
    metadata        JSONB        DEFAULT '{}',
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- workspace_feature_overrides: per-workspace feature flag overrides
-- Used by: workspace-profile-runtime.service.ts
CREATE TABLE IF NOT EXISTS workspace_feature_overrides (
    workspace_id    UUID         NOT NULL,
    feature_code    VARCHAR(100) NOT NULL,
    is_enabled      BOOLEAN      NOT NULL,
    PRIMARY KEY (workspace_id, feature_code)
);

-- ═══════════════════════════════════════════════════════════════
-- Tenant settings reconciliation
-- tenant_settings was created in migration 079 with (setting_id UUID PK, key UNIQUE, value TEXT).
-- The new services expect (key VARCHAR(255) PK, value JSONB, set_by, timestamps).
-- We add missing columns idempotently; existing data is preserved.
-- ═══════════════════════════════════════════════════════════════

-- Add missing columns needed by tenant-settings.service.ts
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS set_by VARCHAR(255);

-- Ensure value column supports JSONB (alter from TEXT if needed)
-- We cannot ALTER COLUMN type inside IF NOT EXISTS, so we use a DO block
DO $$ BEGIN
  -- Only alter if column is TEXT type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'tenant_settings'
      AND column_name = 'value'
      AND data_type = 'text'
  ) THEN
    -- Cast existing TEXT values to JSONB-safe format before altering
    UPDATE tenant_settings
    SET value = to_jsonb(value)::text
    WHERE value IS NOT NULL
      AND value NOT LIKE '{%'
      AND value NOT LIKE '[%'
      AND value NOT LIKE '"%'
      AND value NOT LIKE 'null'
      AND value NOT LIKE 'true'
      AND value NOT LIKE 'false'
      AND value !~ '^\d';
    ALTER TABLE tenant_settings ALTER COLUMN value TYPE JSONB USING value::jsonb;
  END IF;
END $$;

-- tenant_settings_history: audit trail for settings changes
-- Used by: tenant-settings.service.ts
CREATE TABLE IF NOT EXISTS tenant_settings_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key             VARCHAR(255) NOT NULL,
    old_value       JSONB,
    new_value       JSONB,
    action          VARCHAR(20)  NOT NULL,
    changed_by      VARCHAR(255),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_history_key
    ON tenant_settings_history (key, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- Product composition
-- ═══════════════════════════════════════════════════════════════

-- product_overrides: tenant-specific product configuration overrides
-- Used by: product-composition.service.ts
CREATE TABLE IF NOT EXISTS product_overrides (
    product_code    VARCHAR(100) NOT NULL,
    override_key    VARCHAR(255) NOT NULL,
    override_value  JSONB        NOT NULL,
    set_by          VARCHAR(255),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (product_code, override_key)
);

-- ═══════════════════════════════════════════════════════════════
-- Provisioning audit (Law 12 — audit by default)
-- ═══════════════════════════════════════════════════════════════

-- provisioning_audit: detailed audit log for provisioning events
-- Used by: provisioning-audit.service.ts
CREATE TABLE IF NOT EXISTS provisioning_audit (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID,
    workspace_id    UUID,
    event_type      VARCHAR(50)  NOT NULL,
    step_code       VARCHAR(100),
    actor           VARCHAR(255),
    details         JSONB        DEFAULT '{}',
    duration_ms     INTEGER,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_provisioning_audit_run
    ON provisioning_audit (run_id)
    WHERE run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_provisioning_audit_workspace
    ON provisioning_audit (workspace_id, created_at DESC)
    WHERE workspace_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- Event subscription registry
-- ═══════════════════════════════════════════════════════════════

-- event_subscriptions: registered event handlers per module
-- Used by: event-subscription-registry.service.ts
CREATE TABLE IF NOT EXISTS event_subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      VARCHAR(255) NOT NULL,
    module_code     VARCHAR(100),
    handler_name    VARCHAR(255) NOT NULL,
    is_paused       BOOLEAN      NOT NULL DEFAULT FALSE,
    success_count   INTEGER      NOT NULL DEFAULT 0,
    failure_count   INTEGER      NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_subscriptions_type
    ON event_subscriptions (event_type);
CREATE INDEX IF NOT EXISTS idx_event_subscriptions_module
    ON event_subscriptions (module_code)
    WHERE module_code IS NOT NULL;

COMMIT;
