-- Migration 107: DOS platform service tables
-- Creates tables required by new DOS platform services:
--   tenant-status, tenant-boundary, product-registry, module-dependency,
--   module-health, lifecycle-checkpoint, lifecycle-transition-registry,
--   event-tracing, dead-letter-policy, runtime-config, provisioning-telemetry,
--   contract-catalog, shell-contract, module-visibility-contract
-- Date: 2026-04-04

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- Tenant status & boundary
-- ═══════════════════════════════════════════════════════════════

-- tenant_status_transitions: audit trail for tenant status changes
-- Used by: tenant-status.service.ts
CREATE TABLE IF NOT EXISTS public.tenant_status_transitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
    from_status     VARCHAR(50)  NOT NULL,
    to_status       VARCHAR(50)  NOT NULL,
    triggered_by    VARCHAR(255) NOT NULL,
    reason          TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenant_status_transitions_tenant
    ON public.tenant_status_transitions (tenant_id, created_at DESC);

-- tenant_boundary_configs: cross-tenant isolation policies
-- Used by: tenant-boundary.service.ts
CREATE TABLE IF NOT EXISTS public.tenant_boundary_configs (
    tenant_id                  UUID PRIMARY KEY REFERENCES public.tenants(id),
    isolation_mode             VARCHAR(20)  NOT NULL DEFAULT 'strict',
    allow_cross_tenant_read    BOOLEAN      NOT NULL DEFAULT FALSE,
    allow_cross_tenant_write   BOOLEAN      NOT NULL DEFAULT FALSE,
    cross_tenant_partners      TEXT[]       DEFAULT '{}',
    max_resources_per_type     JSONB        DEFAULT '{}',
    updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by                 VARCHAR(255)
);

-- ═══════════════════════════════════════════════════════════════
-- Product registry
-- ═══════════════════════════════════════════════════════════════

-- product_registry: canonical product catalog (Law 8 — deprecation requires death date)
-- Used by: product-registry.service.ts
CREATE TABLE IF NOT EXISTS public.product_registry (
    product_code    VARCHAR(100) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    version         VARCHAR(50),
    is_deprecated   BOOLEAN      NOT NULL DEFAULT FALSE,
    deprecated_by   VARCHAR(255),
    removal_date    DATE,
    replacement     VARCHAR(100),
    metadata        JSONB        DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- product_modules: which modules belong to which product
-- Used by: product-registry.service.ts
CREATE TABLE IF NOT EXISTS public.product_modules_registry (
    product_code    VARCHAR(100) NOT NULL REFERENCES public.product_registry(product_code),
    module_code     VARCHAR(100) NOT NULL,
    is_required     BOOLEAN      NOT NULL DEFAULT FALSE,
    PRIMARY KEY (product_code, module_code)
);

-- product_dependencies: inter-product dependency graph
-- Used by: product-registry.service.ts
CREATE TABLE IF NOT EXISTS public.product_dependencies (
    product_code    VARCHAR(100) NOT NULL REFERENCES public.product_registry(product_code),
    depends_on      VARCHAR(100) NOT NULL REFERENCES public.product_registry(product_code),
    dependency_type VARCHAR(20)  NOT NULL DEFAULT 'required',
    PRIMARY KEY (product_code, depends_on),
    CHECK (product_code <> depends_on)
);

-- ═══════════════════════════════════════════════════════════════
-- Module dependency & health
-- ═══════════════════════════════════════════════════════════════

-- module_dependencies: inter-module dependency graph
-- Used by: module-dependency.service.ts
CREATE TABLE IF NOT EXISTS public.module_dependencies (
    module_code     VARCHAR(100) NOT NULL,
    depends_on      VARCHAR(100) NOT NULL,
    dependency_type VARCHAR(20)  NOT NULL DEFAULT 'required',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (module_code, depends_on),
    CHECK (module_code <> depends_on)
);

-- module_health_events: health check event log
-- Used by: module-health.service.ts
CREATE TABLE IF NOT EXISTS public.module_health_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_code     VARCHAR(100) NOT NULL,
    event_type      VARCHAR(50)  NOT NULL,
    status          VARCHAR(20)  NOT NULL,
    message         TEXT,
    metadata        JSONB        DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_module_health_events_module
    ON public.module_health_events (module_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_module_health_events_status
    ON public.module_health_events (status, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- Lifecycle engine (Law 5 — generic lifecycle engine)
-- ═══════════════════════════════════════════════════════════════

-- lifecycle_checkpoints: point-in-time snapshots for any entity
-- Used by: lifecycle-checkpoint.service.ts
CREATE TABLE IF NOT EXISTS public.lifecycle_checkpoints (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL,
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       UUID         NOT NULL,
    label           VARCHAR(255),
    state_data      JSONB        NOT NULL,
    created_by      VARCHAR(255),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lifecycle_checkpoints_entity
    ON public.lifecycle_checkpoints (tenant_id, entity_type, entity_id, created_at DESC);

-- lifecycle_transitions: registered valid state transitions per module/entity type
-- Used by: lifecycle-transition-registry.service.ts
CREATE TABLE IF NOT EXISTS public.lifecycle_transitions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_code         VARCHAR(100) NOT NULL,
    entity_type         VARCHAR(100) NOT NULL,
    from_state          VARCHAR(100) NOT NULL,
    to_state            VARCHAR(100) NOT NULL,
    guard_conditions    JSONB        DEFAULT '[]',
    required_permission VARCHAR(255),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (module_code, entity_type, from_state, to_state)
);
CREATE INDEX IF NOT EXISTS idx_lifecycle_transitions_lookup
    ON public.lifecycle_transitions (module_code, entity_type, from_state);

-- ═══════════════════════════════════════════════════════════════
-- Event infrastructure (Law 12 — audit by default)
-- ═══════════════════════════════════════════════════════════════

-- event_traces: distributed trace records for platform events
-- Used by: event-tracing.service.ts
CREATE TABLE IF NOT EXISTS public.event_traces (
    event_id        UUID PRIMARY KEY,
    event_type      VARCHAR(255) NOT NULL,
    correlation_id  VARCHAR(255),
    status          VARCHAR(20)  NOT NULL DEFAULT 'in_progress',
    spans           JSONB        DEFAULT '[]',
    started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    duration_ms     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_event_traces_correlation
    ON public.event_traces (correlation_id)
    WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_traces_type_status
    ON public.event_traces (event_type, status, started_at DESC);

-- dead_letter_queue: events that failed processing
-- Used by: dead-letter-policy.service.ts
CREATE TABLE IF NOT EXISTS public.dead_letter_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID         NOT NULL,
    event_type      VARCHAR(255) NOT NULL,
    payload         JSONB        NOT NULL,
    error_message   TEXT,
    retry_count     INTEGER      NOT NULL DEFAULT 0,
    max_retries     INTEGER      NOT NULL DEFAULT 3,
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending',
    discarded_by    VARCHAR(255),
    discard_reason  TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_retry_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_status
    ON public.dead_letter_queue (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_event
    ON public.dead_letter_queue (event_id);

-- dead_letter_policy: singleton configuration for DLQ behavior
-- Used by: dead-letter-policy.service.ts
CREATE TABLE IF NOT EXISTS public.dead_letter_policy (
    id                  INTEGER PRIMARY KEY DEFAULT 1,
    max_retries         INTEGER   NOT NULL DEFAULT 3,
    retention_days      INTEGER   NOT NULL DEFAULT 30,
    alert_threshold     INTEGER   NOT NULL DEFAULT 100,
    auto_retry_enabled  BOOLEAN   NOT NULL DEFAULT FALSE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Seed default policy row
INSERT INTO public.dead_letter_policy (id, max_retries, retention_days, alert_threshold, auto_retry_enabled)
VALUES (1, 3, 30, 100, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- Runtime configuration
-- ═══════════════════════════════════════════════════════════════

-- runtime_config: dynamic platform configuration store
-- Used by: runtime-config.service.ts
CREATE TABLE IF NOT EXISTS public.runtime_config (
    key             VARCHAR(255) PRIMARY KEY,
    value           JSONB        NOT NULL,
    value_type      VARCHAR(50)  NOT NULL DEFAULT 'string',
    set_by          VARCHAR(255),
    is_deleted      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- runtime_config_history: audit trail for config changes
-- Used by: runtime-config.service.ts
CREATE TABLE IF NOT EXISTS public.runtime_config_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key             VARCHAR(255) NOT NULL,
    old_value       JSONB,
    new_value       JSONB,
    action          VARCHAR(20)  NOT NULL,
    changed_by      VARCHAR(255),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_runtime_config_history_key
    ON public.runtime_config_history (key, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- Provisioning telemetry
-- ═══════════════════════════════════════════════════════════════

-- provisioning_telemetry: performance metrics for tenant/workspace provisioning
-- Used by: provisioning-telemetry.service.ts
CREATE TABLE IF NOT EXISTS public.provisioning_telemetry (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL,
    run_id          UUID         NOT NULL,
    step_code       VARCHAR(100),
    event_type      VARCHAR(50)  NOT NULL,
    duration_ms     INTEGER,
    error           TEXT,
    total_steps     INTEGER,
    metadata        JSONB        DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_provisioning_telemetry_tenant
    ON public.provisioning_telemetry (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provisioning_telemetry_run
    ON public.provisioning_telemetry (run_id);

-- ═══════════════════════════════════════════════════════════════
-- Contract catalog (Law 2 — one canonical owner per concern)
-- ═══════════════════════════════════════════════════════════════

-- contract_catalog: registry of all inter-service contracts
-- Used by: contract-catalog.service.ts
CREATE TABLE IF NOT EXISTS public.contract_catalog (
    contract_code       VARCHAR(100) PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    owner               VARCHAR(100) NOT NULL,
    version             INTEGER      NOT NULL DEFAULT 1,
    schema_definition   JSONB,
    status              VARCHAR(20)  NOT NULL DEFAULT 'active',
    deprecated_by       VARCHAR(100),
    replacement         VARCHAR(100),
    removal_date        DATE,
    readers             TEXT[]       DEFAULT '{}',
    writers             TEXT[]       DEFAULT '{}',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- contract_catalog_history: version history for contract changes
-- Used by: contract-catalog.service.ts
CREATE TABLE IF NOT EXISTS public.contract_catalog_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_code   VARCHAR(100) NOT NULL,
    version         INTEGER      NOT NULL,
    schema_definition JSONB,
    changed_by      VARCHAR(255),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contract_catalog_history_code
    ON public.contract_catalog_history (contract_code, version DESC);

-- ═══════════════════════════════════════════════════════════════
-- Shell extensions & module visibility
-- ═══════════════════════════════════════════════════════════════

-- shell_extensions: dynamic UI shell extension points per module
-- Used by: shell-contract.service.ts
CREATE TABLE IF NOT EXISTS public.shell_extensions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extension_code  VARCHAR(100) NOT NULL UNIQUE,
    module_code     VARCHAR(100) NOT NULL,
    extension_type  VARCHAR(50)  NOT NULL,
    config          JSONB        DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shell_extensions_module
    ON public.shell_extensions (module_code);

-- module_visibility_rules: default visibility configuration per module
-- Used by: module-visibility-contract.service.ts
CREATE TABLE IF NOT EXISTS public.module_visibility_rules (
    module_code         VARCHAR(100) PRIMARY KEY,
    required_permission VARCHAR(255),
    required_role       VARCHAR(100),
    min_tier            VARCHAR(50),
    is_hidden           BOOLEAN      NOT NULL DEFAULT FALSE,
    config              JSONB        DEFAULT '{}',
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- module_visibility_overrides: tenant-specific visibility overrides
-- Used by: module-visibility-contract.service.ts
CREATE TABLE IF NOT EXISTS public.module_visibility_overrides (
    tenant_id       UUID         NOT NULL,
    module_code     VARCHAR(100) NOT NULL,
    visible         BOOLEAN      NOT NULL,
    overridden_by   VARCHAR(255),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, module_code)
);
CREATE INDEX IF NOT EXISTS idx_module_visibility_overrides_tenant
    ON public.module_visibility_overrides (tenant_id);

COMMIT;
