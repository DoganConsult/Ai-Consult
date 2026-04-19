-- 117: Low-code workflow specs (separate from domain module_workflow_registry).

CREATE TABLE IF NOT EXISTS workflow_specs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(150) NOT NULL UNIQUE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    spec            JSONB NOT NULL DEFAULT '{"steps":[],"transitions":[]}',
    trigger_type    VARCHAR(40) NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'event', 'cron', 'endpoint')),
    trigger_config  JSONB NOT NULL DEFAULT '{}',
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    version         INT NOT NULL DEFAULT 1,
    created_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workflow_specs_status ON workflow_specs (status);
CREATE INDEX IF NOT EXISTS idx_workflow_specs_trigger ON workflow_specs (trigger_type);
