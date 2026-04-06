-- 115: Governance Control Plane — missing platform-level tables
-- Tables: platform_audit_logs, system_events, tenant_product_activation

CREATE TABLE IF NOT EXISTS platform_audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    actor_id        UUID,
    actor_type      VARCHAR(50) DEFAULT 'user',
    tenant_id       UUID,
    module_code     VARCHAR(100),
    entity_type     VARCHAR(100),
    entity_id       VARCHAR(255),
    action          VARCHAR(100) NOT NULL,
    before_state    JSONB,
    after_state     JSONB,
    metadata        JSONB DEFAULT '{}',
    correlation_id  VARCHAR(255),
    source          VARCHAR(100) DEFAULT 'api',
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_actor ON platform_audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_tenant ON platform_audit_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_action ON platform_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_entity ON platform_audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_created ON platform_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_correlation ON platform_audit_logs (correlation_id);

CREATE TABLE IF NOT EXISTS system_events (
    id              BIGSERIAL PRIMARY KEY,
    event_type      VARCHAR(100) NOT NULL,
    module_code     VARCHAR(100),
    entity_type     VARCHAR(100),
    entity_id       VARCHAR(255),
    tenant_id       UUID,
    actor_id        UUID,
    actor_type      VARCHAR(50) DEFAULT 'system',
    source          VARCHAR(100) DEFAULT 'platform',
    severity        VARCHAR(20) DEFAULT 'info',
    payload         JSONB DEFAULT '{}',
    correlation_id  VARCHAR(255),
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_events_type ON system_events (event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_tenant ON system_events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_events_occurred ON system_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON system_events (severity);
CREATE INDEX IF NOT EXISTS idx_system_events_correlation ON system_events (correlation_id);

CREATE TABLE IF NOT EXISTS tenant_product_activation (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    product_code    VARCHAR(100) NOT NULL,
    status          VARCHAR(50) DEFAULT 'enabled',
    activated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_by    UUID,
    deactivated_at  TIMESTAMPTZ,
    config          JSONB DEFAULT '{}',
    UNIQUE (tenant_id, product_code)
);

CREATE INDEX IF NOT EXISTS idx_tenant_product_activation_tenant ON tenant_product_activation (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_product_activation_product ON tenant_product_activation (product_code);
CREATE INDEX IF NOT EXISTS idx_tenant_product_activation_status ON tenant_product_activation (status);
