-- ============================================================================
-- Migration 018: Sync Triggers + Convenience Views
-- Keeps legacy TEXT[] arrays on sectors table in sync with junction tables.
-- All existing consumers continue working without code changes.
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- TRIGGER: sector_regulator → sectors.applicable_regulators
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_sync_sector_regulators()
RETURNS TRIGGER AS $$
DECLARE
  target_sector_id VARCHAR(50);
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_sector_id := OLD.sector_id;
  ELSE
    target_sector_id := NEW.sector_id;
  END IF;

  UPDATE public.sectors
  SET applicable_regulators = (
    SELECT COALESCE(array_agg(sr.regulator_id ORDER BY sr.regulator_id), '{}')
    FROM public.sector_regulator sr
    WHERE sr.sector_id = target_sector_id
      AND (sr.effective_to IS NULL OR sr.effective_to > CURRENT_DATE)
  ),
  updated_at = NOW()
  WHERE sector_id = target_sector_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_sector_regulators ON public.sector_regulator;
CREATE TRIGGER trg_sync_sector_regulators
  AFTER INSERT OR UPDATE OR DELETE ON public.sector_regulator
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_sector_regulators();


-- ════════════════════════════════════════════════════════════════════════════
-- TRIGGER: sector_framework → sectors.applicable_frameworks
-- Maps framework_code back to INST-* alias for backward compat
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_sync_sector_frameworks()
RETURNS TRIGGER AS $$
DECLARE
  target_sector_id VARCHAR(50);
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_sector_id := OLD.sector_id;
  ELSE
    target_sector_id := NEW.sector_id;
  END IF;

  UPDATE public.sectors
  SET applicable_frameworks = (
    SELECT COALESCE(array_agg(
      COALESCE(a.alias_code, sf.framework_code)
      ORDER BY sf.framework_code
    ), '{}')
    FROM public.sector_framework sf
    LEFT JOIN public.framework_alias a ON a.framework_code = sf.framework_code
    WHERE sf.sector_id = target_sector_id
      AND (sf.effective_to IS NULL OR sf.effective_to > CURRENT_DATE)
  ),
  updated_at = NOW()
  WHERE sector_id = target_sector_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_sector_frameworks ON public.sector_framework;
CREATE TRIGGER trg_sync_sector_frameworks
  AFTER INSERT OR UPDATE OR DELETE ON public.sector_framework
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_sector_frameworks();


-- ════════════════════════════════════════════════════════════════════════════
-- VIEW: v_sector_regulators — denormalized sector + regulator info
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_sector_regulators AS
SELECT
  sr.sector_id,
  s.name_en       AS sector_name_en,
  s.name_ar       AS sector_name_ar,
  s.country_code,
  sr.regulator_id,
  r.name_en       AS regulator_name_en,
  r.name_ar       AS regulator_name_ar,
  r.acronym       AS regulator_acronym,
  sr.applicability,
  sr.reason_code,
  sr.effective_from,
  sr.effective_to
FROM public.sector_regulator sr
JOIN public.sectors s    ON s.sector_id    = sr.sector_id
JOIN public.regulators r ON r.regulator_id = sr.regulator_id
WHERE sr.effective_to IS NULL OR sr.effective_to > CURRENT_DATE;


-- ════════════════════════════════════════════════════════════════════════════
-- VIEW: v_sector_frameworks — denormalized sector + framework info
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_sector_frameworks AS
SELECT
  sf.sector_id,
  s.name_en         AS sector_name_en,
  s.name_ar         AS sector_name_ar,
  s.country_code,
  sf.framework_code,
  lf.framework_name,
  lf.framework_acronym,
  lf.regulatory_body,
  sf.applicability,
  sf.source,
  sf.effective_from,
  sf.effective_to,
  COALESCE(a.alias_code, sf.framework_code) AS legacy_alias
FROM public.sector_framework sf
JOIN public.sectors s           ON s.sector_id       = sf.sector_id
JOIN public.lookup_frameworks lf ON lf.framework_code = sf.framework_code
LEFT JOIN public.framework_alias a ON a.framework_code = sf.framework_code
WHERE sf.effective_to IS NULL OR sf.effective_to > CURRENT_DATE;


-- ════════════════════════════════════════════════════════════════════════════
-- VIEW: v_sector_risks_resolved — sector_risks override + isic_risks fallback
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_sector_risks_resolved AS
-- Direct sector-level overrides
SELECT
  sr2.sector_id,
  r.id             AS risk_id,
  r.risk_code,
  r.risk_title_en,
  r.risk_title_ar,
  COALESCE(sr2.sector_impact, r.risk_impact)       AS resolved_impact,
  COALESCE(sr2.sector_likelihood, r.risk_likelihood) AS resolved_likelihood,
  'sector_override'::text AS resolution_source
FROM public.sector_risks sr2
JOIN public.risks r ON r.id = sr2.risk_id
WHERE sr2.sector_id IS NOT NULL

UNION ALL

-- ISIC baseline fallback (only for sectors without direct overrides for that risk)
SELECT
  sim.sector_id,
  r.id             AS risk_id,
  r.risk_code,
  r.risk_title_en,
  r.risk_title_ar,
  r.risk_impact    AS resolved_impact,
  r.risk_likelihood AS resolved_likelihood,
  'isic_baseline'::text AS resolution_source
FROM public.sector_isic_map sim
JOIN public.isic_risks ir ON ir.isic_code = sim.isic_code
JOIN public.risks r       ON r.id = ir.risk_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.sector_risks sr3
  WHERE sr3.sector_id = sim.sector_id AND sr3.risk_id = r.id
);


COMMIT;
