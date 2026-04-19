-- 116: Low-Code Core — page catalog, form specs, dynamic routes, dynamic endpoints,
--      AI agent graphs, plugin registry, admin action approvals, schema change log.
-- Forward-only. All tables platform-level (no RLS).

-- ──────────────────────────────────────────────────────────────────────────
-- Page catalog: declarative platform-admin pages rendered by DynamicPageShell.
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_catalog (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(150) NOT NULL UNIQUE,
    title           VARCHAR(200) NOT NULL,
    subtitle        TEXT,
    icon            VARCHAR(80) DEFAULT 'pi pi-file',
    route           VARCHAR(200) NOT NULL UNIQUE,
    section         VARCHAR(80),
    module_code     VARCHAR(100),
    product_code    VARCHAR(100),
    requires        JSONB NOT NULL DEFAULT '[]',
    layout          VARCHAR(40) NOT NULL DEFAULT 'list',
    data_source     JSONB NOT NULL DEFAULT '{}',
    form_spec       JSONB,
    table_spec      JSONB,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    version         INT NOT NULL DEFAULT 1,
    created_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_page_catalog_module ON page_catalog (module_code);
CREATE INDEX IF NOT EXISTS idx_page_catalog_status ON page_catalog (status);

-- Append-only page spec versions for rollback / diff.
CREATE TABLE IF NOT EXISTS page_catalog_versions (
    id              BIGSERIAL PRIMARY KEY,
    page_id         UUID NOT NULL REFERENCES page_catalog(id) ON DELETE CASCADE,
    version         INT NOT NULL,
    snapshot        JSONB NOT NULL,
    changed_by      UUID,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (page_id, version)
);

-- ──────────────────────────────────────────────────────────────────────────
-- Dynamic endpoints: declarative API built from a spec.
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dynamic_endpoints (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(150) NOT NULL UNIQUE,
    method          VARCHAR(10) NOT NULL CHECK (method IN ('GET', 'POST', 'PATCH', 'PUT', 'DELETE')),
    path            VARCHAR(300) NOT NULL,
    description     TEXT,
    requires        JSONB NOT NULL DEFAULT '[]',
    handler_type    VARCHAR(40) NOT NULL CHECK (handler_type IN ('sql', 'query_table', 'insert_table', 'update_table', 'delete_table', 'static_json')),
    handler_spec    JSONB NOT NULL DEFAULT '{}',
    input_schema    JSONB NOT NULL DEFAULT '{}',
    rate_limit_rpm  INT DEFAULT 60,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    version         INT NOT NULL DEFAULT 1,
    created_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (method, path)
);
CREATE INDEX IF NOT EXISTS idx_dynamic_endpoints_status ON dynamic_endpoints (status);

-- ──────────────────────────────────────────────────────────────────────────
-- AI agent graphs.
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_agent_graphs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(150) NOT NULL UNIQUE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    graph_spec      JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    version         INT NOT NULL DEFAULT 1,
    created_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────────
-- Plugin registry.
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plugin_registry (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(150) NOT NULL UNIQUE,
    name            VARCHAR(200) NOT NULL,
    version         VARCHAR(40) NOT NULL,
    description     TEXT,
    bundle_url      TEXT,
    bundle_sha256   VARCHAR(64),
    signature       TEXT,
    signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
    manifest        JSONB NOT NULL DEFAULT '{}',
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    installed_at    TIMESTAMPTZ,
    installed_by    UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plugin_registry_status ON plugin_registry (status);

-- ──────────────────────────────────────────────────────────────────────────
-- Dual-approval log for destructive / high-risk admin actions.
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_action_approvals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_code     VARCHAR(150) NOT NULL,
    target_type     VARCHAR(100),
    target_id       VARCHAR(255),
    payload         JSONB NOT NULL DEFAULT '{}',
    justification   TEXT,
    requested_by    UUID NOT NULL,
    approved_by     UUID,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'expired', 'cancelled')),
    decision_reason TEXT,
    expires_at      TIMESTAMPTZ,
    executed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_approvals_status ON admin_action_approvals (status);
CREATE INDEX IF NOT EXISTS idx_admin_approvals_requested_by ON admin_action_approvals (requested_by);

-- ──────────────────────────────────────────────────────────────────────────
-- Schema change log (Schema Designer audit).
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_changes (
    id              BIGSERIAL PRIMARY KEY,
    change_type     VARCHAR(40) NOT NULL,
    target_schema   VARCHAR(100) NOT NULL,
    target_table    VARCHAR(200) NOT NULL,
    ddl             TEXT NOT NULL,
    ddl_sha256      VARCHAR(64) NOT NULL,
    executed_by     UUID,
    executed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status          VARCHAR(20) NOT NULL DEFAULT 'applied',
    error_message   TEXT
);
CREATE INDEX IF NOT EXISTS idx_schema_changes_executed_at ON schema_changes (executed_at DESC);
