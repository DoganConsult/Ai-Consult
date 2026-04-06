-- ============================================================================
-- Migration 038: Materialized Views for Dashboard KPIs (W2-19)
-- Pre-computed views for expensive dashboard queries.
-- Refreshed periodically by a scheduled job.
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEW 1: Regulatory Catalog Summary
-- Used by Knowledge Hub stats, landing page, and onboarding
-- ═══════════════════════════════════════════════════════════════════════════

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_regulatory_catalog_summary AS
SELECT
  (SELECT COUNT(*) FROM public.lookup_ksa_regulatory_authorities WHERE is_active)::int AS total_authorities,
  (SELECT COUNT(*) FROM public.lookup_authority_frameworks WHERE is_active)::int AS total_frameworks,
  (SELECT COUNT(*) FROM public.regulatory_controls)::int AS total_controls,
  (SELECT COUNT(*) FROM public.control_evidence_requirements)::int AS total_evidence_requirements,
  (SELECT COUNT(*) FROM public.control_cross_mappings)::int AS total_cross_mappings,
  (SELECT COUNT(DISTINCT cd.framework_code) FROM public.control_domains cd)::int AS frameworks_with_controls,
  (SELECT COUNT(*) FROM public.sectors WHERE status = 'active')::int AS total_sectors,
  NOW() AS refreshed_at
WITH NO DATA;

-- Initial refresh
REFRESH MATERIALIZED VIEW public.mv_regulatory_catalog_summary;

CREATE UNIQUE INDEX IF NOT EXISTS mv_rcs_singleton ON public.mv_regulatory_catalog_summary (refreshed_at);


-- ═══════════════════════════════════════════════════════════════════════════
-- VIEW 2: Framework Control Distribution
-- Used by ontology catalog, framework detail pages
-- ═══════════════════════════════════════════════════════════════════════════

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_framework_control_distribution AS
SELECT
  cd.framework_code,
  COALESCE(lf.framework_name, cd.framework_code) AS framework_name,
  COALESCE(lf.regulatory_body, 'Unknown') AS authority,
  COALESCE(lf.jurisdiction, 'KSA') AS jurisdiction,
  COUNT(DISTINCT cd.id)::int AS domain_count,
  COUNT(rc.id)::int AS control_count,
  COUNT(rc.id) FILTER (WHERE rc.criticality_level = 'critical')::int AS critical_controls,
  COUNT(rc.id) FILTER (WHERE rc.criticality_level = 'high')::int AS high_controls,
  COUNT(rc.id) FILTER (WHERE rc.criticality_level = 'medium')::int AS medium_controls,
  COUNT(rc.id) FILTER (WHERE rc.criticality_level = 'low')::int AS low_controls,
  COUNT(rc.id) FILTER (WHERE rc.automation_possible)::int AS automatable_controls,
  COUNT(cer.id)::int AS evidence_requirements
FROM public.control_domains cd
LEFT JOIN public.regulatory_controls rc ON rc.domain_id = cd.id
LEFT JOIN public.control_evidence_requirements cer ON cer.control_id = rc.id
LEFT JOIN public.lookup_frameworks lf ON lf.framework_code = cd.framework_code
GROUP BY cd.framework_code, lf.framework_name, lf.regulatory_body, lf.jurisdiction
ORDER BY control_count DESC
WITH NO DATA;

REFRESH MATERIALIZED VIEW public.mv_framework_control_distribution;

CREATE UNIQUE INDEX IF NOT EXISTS mv_fcd_framework ON public.mv_framework_control_distribution (framework_code);


-- ═══════════════════════════════════════════════════════════════════════════
-- VIEW 3: Authority Coverage Map
-- Used by regulator heatmap, KSA hub, knowledge hub
-- ═══════════════════════════════════════════════════════════════════════════

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_authority_coverage AS
SELECT
  a.authority_code,
  a.authority_name_en,
  a.authority_name_ar,
  a.authority_acronym,
  a.authority_type,
  COUNT(DISTINCT af.framework_code)::int AS framework_count,
  COUNT(DISTINCT asm.sector_code)::int AS sector_count,
  COALESCE(
    (SELECT COUNT(*) FROM public.regulatory_controls rc
     JOIN public.control_domains cd ON cd.id = rc.domain_id
     WHERE cd.framework_code = ANY(ARRAY(
       SELECT af2.framework_code FROM public.lookup_authority_frameworks af2
       WHERE af2.authority_code = a.authority_code AND af2.is_active
     ))
    ), 0
  )::int AS total_controls
FROM public.lookup_ksa_regulatory_authorities a
LEFT JOIN public.lookup_authority_frameworks af
  ON af.authority_code = a.authority_code AND af.is_active
LEFT JOIN public.lookup_authority_sector_mapping asm
  ON asm.authority_code = a.authority_code AND asm.is_active
WHERE a.is_active
GROUP BY a.authority_code, a.authority_name_en, a.authority_name_ar,
         a.authority_acronym, a.authority_type
ORDER BY framework_count DESC
WITH NO DATA;

REFRESH MATERIALIZED VIEW public.mv_authority_coverage;

CREATE UNIQUE INDEX IF NOT EXISTS mv_ac_authority ON public.mv_authority_coverage (authority_code);


-- ═══════════════════════════════════════════════════════════════════════════
-- VIEW 4: Cross-Mapping Efficiency Matrix
-- Used by framework mapping page, KSA hub
-- ═══════════════════════════════════════════════════════════════════════════

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_cross_mapping_matrix AS
SELECT
  SPLIT_PART(source_control_code, '::', 1) AS source_framework,
  SPLIT_PART(target_control_code, '::', 1) AS target_framework,
  COUNT(*)::int AS mapping_count,
  ROUND(AVG(confidence), 2) AS avg_confidence,
  COUNT(*) FILTER (WHERE mapping_type = 'equivalent')::int AS equivalent_count,
  COUNT(*) FILTER (WHERE mapping_type = 'partial')::int AS partial_count,
  COUNT(*) FILTER (WHERE mapping_type = 'related')::int AS related_count
FROM public.control_cross_mappings
WHERE source_control_code IS NOT NULL AND target_control_code IS NOT NULL
GROUP BY SPLIT_PART(source_control_code, '::', 1),
         SPLIT_PART(target_control_code, '::', 1)
ORDER BY mapping_count DESC
WITH NO DATA;

REFRESH MATERIALIZED VIEW public.mv_cross_mapping_matrix;

CREATE UNIQUE INDEX IF NOT EXISTS mv_cmm_pair
  ON public.mv_cross_mapping_matrix (source_framework, target_framework);


-- ═══════════════════════════════════════════════════════════════════════════
-- VIEW 5: Sector Regulatory Burden
-- Shows how many authorities, frameworks, and controls apply per sector
-- ═══════════════════════════════════════════════════════════════════════════

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_sector_regulatory_burden AS
SELECT
  s.section_code AS sector_code,
  s.sector_name_en,
  COALESCE(s.sector_name_ar, s.sector_name_en) AS sector_name_ar,
  COUNT(DISTINCT asm.authority_code)::int AS authority_count,
  COUNT(DISTINCT af.framework_code)::int AS framework_count,
  COALESCE(
    (SELECT COUNT(*) FROM public.regulatory_controls rc
     JOIN public.control_domains cd ON cd.id = rc.domain_id
     WHERE cd.framework_code = ANY(ARRAY(
       SELECT DISTINCT af2.framework_code
       FROM public.lookup_authority_frameworks af2
       JOIN public.lookup_authority_sector_mapping asm2
         ON asm2.authority_code = af2.authority_code
       WHERE asm2.sector_code = s.section_code
         AND asm2.is_active AND af2.is_active
     ))
    ), 0
  )::int AS control_count
FROM public.lookup_isic4_sectors s
LEFT JOIN public.lookup_authority_sector_mapping asm
  ON asm.sector_code = s.section_code AND asm.is_active
LEFT JOIN public.lookup_authority_frameworks af
  ON af.authority_code = asm.authority_code AND af.is_active
GROUP BY s.section_code, s.sector_name_en, s.sector_name_ar
ORDER BY framework_count DESC
WITH NO DATA;

REFRESH MATERIALIZED VIEW public.mv_sector_regulatory_burden;

CREATE UNIQUE INDEX IF NOT EXISTS mv_srb_sector ON public.mv_sector_regulatory_burden (sector_code);


-- ═══════════════════════════════════════════════════════════════════════════
-- REFRESH FUNCTION — called by scheduled job
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_regulatory_catalog_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_framework_control_distribution;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_authority_coverage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_cross_mapping_matrix;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_sector_regulatory_burden;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  'Migration 038 Complete' AS status,
  (SELECT COUNT(*) FROM public.mv_regulatory_catalog_summary) AS catalog_summary_rows,
  (SELECT COUNT(*) FROM public.mv_framework_control_distribution) AS framework_distribution_rows,
  (SELECT COUNT(*) FROM public.mv_authority_coverage) AS authority_coverage_rows,
  (SELECT COUNT(*) FROM public.mv_cross_mapping_matrix) AS mapping_matrix_rows,
  (SELECT COUNT(*) FROM public.mv_sector_regulatory_burden) AS sector_burden_rows;

COMMIT;
