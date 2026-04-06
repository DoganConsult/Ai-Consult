-- Migration: 083_dogan_operating_system.sql
-- Dogan Operating System: guardian events, learning metrics, actions, AI regulatory,
-- NOC/SOC, observability traces, plan progress (master schema)
-- Date: 2026-03-20

-- ═══════════════════════════════════════════════════════════════
-- Guardian core
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.dogan_guardian_events (
    event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guardian_name   VARCHAR(64) NOT NULL,
    event_type      VARCHAR(32) NOT NULL
                    CHECK (event_type IN ('success', 'failure', 'heartbeat', 'anomaly', 'remediation')),
    severity        VARCHAR(16) NOT NULL DEFAULT 'info'
                    CHECK (severity IN ('debug', 'info', 'warn', 'error', 'critical')),
    payload         JSONB NOT NULL DEFAULT '{}',
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dogan_guardian_events_guardian
    ON public.dogan_guardian_events (guardian_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dogan_guardian_events_severity
    ON public.dogan_guardian_events (severity, created_at DESC);

CREATE TABLE IF NOT EXISTS public.dogan_learning_metrics (
    metric_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guardian_name   VARCHAR(64) NOT NULL,
    metric_key      VARCHAR(128) NOT NULL,
    metric_value    NUMERIC,
    dimensions      JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dogan_learning_guardian_key
    ON public.dogan_learning_metrics (guardian_name, metric_key, created_at DESC);

CREATE TABLE IF NOT EXISTS public.dogan_actions_log (
    action_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_code     VARCHAR(128) NOT NULL,
    status          VARCHAR(24) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'validated', 'executed', 'failed', 'rolled_back', 'skipped')),
    guardian_name   VARCHAR(64),
    payload         JSONB NOT NULL DEFAULT '{}',
    result          JSONB,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dogan_actions_code
    ON public.dogan_actions_log (action_code, created_at DESC);

CREATE TABLE IF NOT EXISTS public.dogan_guardian_config (
    config_key      VARCHAR(128) PRIMARY KEY,
    config_value    JSONB NOT NULL DEFAULT '{}',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- AI regulatory compliance (master registry / violations)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.dogan_ai_regulatory_compliance (
    compliance_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_id       VARCHAR(128) NOT NULL,
    model_id        VARCHAR(128),
    risk_tier       VARCHAR(32) NOT NULL DEFAULT 'limited'
                    CHECK (risk_tier IN ('minimal', 'limited', 'high', 'unacceptable')),
    status          VARCHAR(32) NOT NULL DEFAULT 'compliant'
                    CHECK (status IN ('compliant', 'review', 'non_compliant', 'disabled')),
    frameworks      JSONB NOT NULL DEFAULT '[]',
    last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata        JSONB NOT NULL DEFAULT '{}'
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dogan_ai_compliance_system_model
    ON public.dogan_ai_regulatory_compliance (system_id, (COALESCE(model_id, '')));

CREATE TABLE IF NOT EXISTS public.dogan_ai_regulatory_violations (
    violation_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_id       VARCHAR(128) NOT NULL,
    violation_type  VARCHAR(64) NOT NULL,
    severity        VARCHAR(16) NOT NULL DEFAULT 'warn',
    details         JSONB NOT NULL DEFAULT '{}',
    remediated      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dogan_ai_violations_system
    ON public.dogan_ai_regulatory_violations (system_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.dogan_ai_regulatory_reports (
    report_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type     VARCHAR(64) NOT NULL,
    audience        VARCHAR(64),
    period_start    DATE,
    period_end      DATE,
    payload         JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dogan_ai_model_registry (
    registry_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_code      VARCHAR(128) NOT NULL UNIQUE,
    provider        VARCHAR(64),
    risk_tier       VARCHAR(32) NOT NULL DEFAULT 'limited',
    explainability  VARCHAR(32) NOT NULL DEFAULT 'basic',
    bias_score      NUMERIC,
    regulatory_tags JSONB NOT NULL DEFAULT '[]',
    metadata        JSONB NOT NULL DEFAULT '{}',
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- NOC / SOC / observability / plan progress
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.dogan_noc_metrics (
    noc_metric_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name     VARCHAR(128) NOT NULL,
    metric_value    NUMERIC,
    unit            VARCHAR(32),
    dimensions      JSONB NOT NULL DEFAULT '{}',
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dogan_noc_name_time
    ON public.dogan_noc_metrics (metric_name, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.dogan_soc_events (
    soc_event_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_category  VARCHAR(64) NOT NULL,
    title           VARCHAR(256) NOT NULL,
    severity        VARCHAR(16) NOT NULL DEFAULT 'info',
    source          VARCHAR(128),
    payload         JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dogan_soc_category
    ON public.dogan_soc_events (event_category, created_at DESC);

CREATE TABLE IF NOT EXISTS public.dogan_observability_traces (
    trace_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id  VARCHAR(128),
    langfuse_trace_id VARCHAR(128),
    otel_trace_id   VARCHAR(128),
    component       VARCHAR(64) NOT NULL,
    span_name       VARCHAR(256),
    status          VARCHAR(24) NOT NULL DEFAULT 'ok',
    duration_ms     INT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dogan_obs_correlation
    ON public.dogan_observability_traces (correlation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.dogan_plan_progress (
    progress_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_version    VARCHAR(32) NOT NULL DEFAULT '1.3',
    phase           VARCHAR(64) NOT NULL,
    todo_id         VARCHAR(128),
    status          VARCHAR(24) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
    percent_done    INT NOT NULL DEFAULT 0 CHECK (percent_done >= 0 AND percent_done <= 100),
    notes           TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dogan_plan_phase
    ON public.dogan_plan_progress (plan_version, phase, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dogan_plan_todo_unique
    ON public.dogan_plan_progress (plan_version, todo_id)
    WHERE todo_id IS NOT NULL;
