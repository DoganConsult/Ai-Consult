-- Feature 17: Multi-Agent Conflict Resolution

CREATE TABLE IF NOT EXISTS agent_conflicts (
  conflict_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  cycle_id      VARCHAR(100),
  entity_type   VARCHAR(60) NOT NULL,
  entity_id     VARCHAR(200),
  proposals     JSONB NOT NULL DEFAULT '[]',
  conflict_type VARCHAR(40) NOT NULL
    CHECK (conflict_type IN ('contradictory_outcome', 'severity_disagreement', 'action_conflict')),
  status        VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolved_by   VARCHAR(64),
  resolution    JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ac_tenant_status ON agent_conflicts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ac_entity        ON agent_conflicts(entity_type, entity_id);
