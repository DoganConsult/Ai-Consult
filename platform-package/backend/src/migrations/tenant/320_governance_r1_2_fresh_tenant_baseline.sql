-- 183: Governance R1.2 — Fresh-tenant baseline fixes
-- (A) Unique constraint on governance_health_thresholds(tenant_id) for ON CONFLICT
-- (B) Add dimension_scores/dimension_details columns to governance_health_scores (service uses them)

BEGIN;

-- ═══ A. Unique index for tenant_id on governance_health_thresholds ═══════
CREATE UNIQUE INDEX IF NOT EXISTS idx_gov_health_thresholds_tenant_uniq
  ON governance_health_thresholds (tenant_id);

-- ═══ B. Ensure governance_health_scores has JSONB columns used by service ═══
ALTER TABLE governance_health_scores ADD COLUMN IF NOT EXISTS dimension_scores JSONB;
ALTER TABLE governance_health_scores ADD COLUMN IF NOT EXISTS dimension_details JSONB;
ALTER TABLE governance_health_scores ADD COLUMN IF NOT EXISTS computed_by TEXT DEFAULT 'api';

COMMIT;
