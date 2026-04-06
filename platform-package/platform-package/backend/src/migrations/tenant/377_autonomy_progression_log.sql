-- Feature 19: Tenant Autonomy Level Auto-Progression

CREATE TABLE IF NOT EXISTS autonomy_progression_log (
  log_id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                VARCHAR(64) NOT NULL,
  review_cycle             DATE NOT NULL,
  current_mode             VARCHAR(30) NOT NULL,
  avg_eval_score           NUMERIC(4,3),
  hitl_override_rate       NUMERIC(4,3),
  false_positive_rate      NUMERIC(4,3),
  passed_thresholds        BOOLEAN NOT NULL DEFAULT FALSE,
  consecutive_pass_cycles  INT NOT NULL DEFAULT 0,
  recommendation_id        UUID,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_apl_tenant_cycle UNIQUE (tenant_id, review_cycle)
);

CREATE INDEX IF NOT EXISTS idx_apl_tenant ON autonomy_progression_log(tenant_id, review_cycle DESC);
