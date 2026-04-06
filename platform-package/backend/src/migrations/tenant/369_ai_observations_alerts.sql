-- Migration 369: AI Observations & Alerts Tables
-- Part of AI OS R2 — record-linked AI persistence layer

-- ═══════════════════════════════════════════════════════════════
-- ai_observations — persistent, queryable AI observations
-- linked to source records via entity_type + entity_id
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ai_observations (
  observation_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL DEFAULT '',
  agent_id        VARCHAR(16),
  run_id          UUID,
  entity_type     VARCHAR(32),
  entity_id       VARCHAR(128),
  observation_type VARCHAR(32) NOT NULL DEFAULT 'pattern',
  title           VARCHAR(512),
  description     TEXT,
  severity        VARCHAR(16) NOT NULL DEFAULT 'info',
  confidence      NUMERIC(5,2),
  evidence_json   JSONB DEFAULT '{}',
  status          VARCHAR(24) NOT NULL DEFAULT 'active',
  resolved_at     TIMESTAMPTZ,
  resolved_by     VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_observations ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) NOT NULL DEFAULT '';
ALTER TABLE ai_observations ADD COLUMN IF NOT EXISTS run_id UUID;
ALTER TABLE ai_observations ADD COLUMN IF NOT EXISTS observation_type VARCHAR(32) NOT NULL DEFAULT 'pattern';
ALTER TABLE ai_observations ADD COLUMN IF NOT EXISTS title VARCHAR(512);
ALTER TABLE ai_observations ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,2);
ALTER TABLE ai_observations ADD COLUMN IF NOT EXISTS evidence_json JSONB DEFAULT '{}';
ALTER TABLE ai_observations ADD COLUMN IF NOT EXISTS status VARCHAR(24) NOT NULL DEFAULT 'active';
ALTER TABLE ai_observations ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE ai_observations ADD COLUMN IF NOT EXISTS resolved_by VARCHAR(64);
ALTER TABLE ai_observations ADD COLUMN IF NOT EXISTS observation_id UUID;
ALTER TABLE ai_observations ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_obs_tenant_created
  ON ai_observations (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_obs_entity
  ON ai_observations (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_obs_status
  ON ai_observations (status);
CREATE INDEX IF NOT EXISTS idx_ai_obs_agent
  ON ai_observations (agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_obs_severity
  ON ai_observations (severity);

-- ═══════════════════════════════════════════════════════════════
-- ai_alerts — persistent AI/system alerts with lifecycle
-- linked to source records and support escalation
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ai_alerts (
  alert_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL DEFAULT '',
  source_type     VARCHAR(24) NOT NULL DEFAULT 'agent',
  source_id       VARCHAR(128),
  entity_type     VARCHAR(32),
  entity_id       VARCHAR(128),
  alert_type      VARCHAR(32) NOT NULL DEFAULT 'anomaly',
  title           VARCHAR(512),
  description     TEXT,
  severity        VARCHAR(16) NOT NULL DEFAULT 'warning',
  status          VARCHAR(24) NOT NULL DEFAULT 'open',
  acknowledged_by VARCHAR(64),
  acknowledged_at TIMESTAMPTZ,
  resolved_by     VARCHAR(64),
  resolved_at     TIMESTAMPTZ,
  auto_resolved   BOOLEAN NOT NULL DEFAULT FALSE,
  escalation_level INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_alerts ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) NOT NULL DEFAULT '';
ALTER TABLE ai_alerts ADD COLUMN IF NOT EXISTS source_type VARCHAR(24) NOT NULL DEFAULT 'agent';
ALTER TABLE ai_alerts ADD COLUMN IF NOT EXISTS source_id VARCHAR(128);
ALTER TABLE ai_alerts ADD COLUMN IF NOT EXISTS title VARCHAR(512);
ALTER TABLE ai_alerts ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE ai_alerts ADD COLUMN IF NOT EXISTS status VARCHAR(24) NOT NULL DEFAULT 'open';
ALTER TABLE ai_alerts ADD COLUMN IF NOT EXISTS acknowledged_by VARCHAR(64);
ALTER TABLE ai_alerts ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE ai_alerts ADD COLUMN IF NOT EXISTS resolved_by VARCHAR(64);
ALTER TABLE ai_alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE ai_alerts ADD COLUMN IF NOT EXISTS auto_resolved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE ai_alerts ADD COLUMN IF NOT EXISTS escalation_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ai_alerts ADD COLUMN IF NOT EXISTS alert_id UUID;

CREATE INDEX IF NOT EXISTS idx_ai_alerts_tenant_sev_status
  ON ai_alerts (tenant_id, severity, status);
CREATE INDEX IF NOT EXISTS idx_ai_alerts_entity
  ON ai_alerts (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_alerts_type
  ON ai_alerts (alert_type);
CREATE INDEX IF NOT EXISTS idx_ai_alerts_status
  ON ai_alerts (status);
CREATE INDEX IF NOT EXISTS idx_ai_alerts_created
  ON ai_alerts (tenant_id, created_at DESC);
