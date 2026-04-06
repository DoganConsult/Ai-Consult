-- ============================================================================
-- Migration 036: Regulatory Alerts Table (Issue 16)
-- Tracks regulatory alerts and notifications to affected tenants.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.regulatory_alerts (
  alert_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authority_code   VARCHAR(20),
  alert_type       VARCHAR(30) NOT NULL DEFAULT 'circular',
  title            VARCHAR(500) NOT NULL,
  description      TEXT,
  affected_sectors TEXT[] DEFAULT '{}',
  effective_date   DATE,
  urgency          VARCHAR(20) DEFAULT 'medium',
  source_url       TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ra_authority ON public.regulatory_alerts(authority_code);
CREATE INDEX IF NOT EXISTS idx_ra_urgency ON public.regulatory_alerts(urgency);
CREATE INDEX IF NOT EXISTS idx_ra_created ON public.regulatory_alerts(created_at DESC);

SELECT 'Migration 036 Complete' AS status,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'regulatory_alerts') AS alerts_table_exists;

COMMIT;
