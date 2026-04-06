-- ============================================================================
-- Migration 033: Regulatory Change Tracking & Impact Assessment
-- Tracks framework version changes, propagates updates to tenants,
-- and provides audit trail for regulatory compliance evolution.
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART A: Regulatory Change Log
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.regulatory_change_log (
  change_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_code   VARCHAR(50) NOT NULL,
  from_version     VARCHAR(20),
  to_version       VARCHAR(20) NOT NULL,
  change_type      VARCHAR(30) DEFAULT 'amended',  -- new, amended, repealed, superseded
  effective_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  transition_deadline DATE,                         -- deadline for organizations to comply
  affected_controls JSONB DEFAULT '[]'::jsonb,      -- array of control codes affected
  summary          TEXT,
  published_by     VARCHAR(100),                    -- authority name that issued the change
  source_url       TEXT,                            -- link to official gazette / announcement
  impact_assessed  BOOLEAN DEFAULT FALSE,
  impact_notes     TEXT,
  propagated_at    TIMESTAMPTZ,                     -- when tenant workspaces were updated
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rcl_framework ON public.regulatory_change_log(framework_code);
CREATE INDEX IF NOT EXISTS idx_rcl_pending ON public.regulatory_change_log(impact_assessed) WHERE NOT impact_assessed;
CREATE INDEX IF NOT EXISTS idx_rcl_effective ON public.regulatory_change_log(effective_date DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- PART B: Tenant Change Impact Records
-- When a regulatory change is detected, track which tenants are affected
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.tenant_regulatory_impacts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id        UUID NOT NULL REFERENCES public.regulatory_change_log(change_id),
  tenant_id        UUID NOT NULL,
  framework_code   VARCHAR(50) NOT NULL,
  affected_control_count INT DEFAULT 0,
  status           VARCHAR(30) DEFAULT 'pending',   -- pending, acknowledged, in_progress, resolved
  acknowledged_by  UUID,
  acknowledged_at  TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tri_tenant ON public.tenant_regulatory_impacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tri_change ON public.tenant_regulatory_impacts(change_id);
CREATE INDEX IF NOT EXISTS idx_tri_status ON public.tenant_regulatory_impacts(status) WHERE status <> 'resolved';


-- ═══════════════════════════════════════════════════════════════════════════
-- PART C: Framework Scoring Policies (per-framework, not just 4 generic)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.framework_scoring_policies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_code   VARCHAR(50) NOT NULL,
  scoring_model    VARCHAR(50) NOT NULL DEFAULT 'binary',  -- binary, maturity_5, percentage, nca_3level, custom
  maturity_levels  JSONB,       -- e.g., [{"level":1,"label":"Initial"},{"level":2,"label":"Managed"}...]
  passing_threshold NUMERIC(5,2) DEFAULT 60.0,
  weight_by_criticality BOOLEAN DEFAULT TRUE,
  description_en   TEXT,
  description_ar   TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(framework_code, scoring_model)
);

-- Seed default scoring policies for key frameworks
INSERT INTO public.framework_scoring_policies
  (framework_code, scoring_model, maturity_levels, passing_threshold, weight_by_criticality, description_en, description_ar)
VALUES
  ('nca_ecc', 'nca_3level', '[{"level":1,"label_en":"Non-Compliant","label_ar":"غير ممتثل"},{"level":2,"label_en":"Partially Compliant","label_ar":"ممتثل جزئياً"},{"level":3,"label_en":"Fully Compliant","label_ar":"ممتثل بالكامل"}]'::jsonb, 100.0, true,
   'NCA 3-level compliance assessment', 'تقييم الامتثال بثلاثة مستويات من الهيئة الوطنية'),
  ('nca_cscc', 'nca_3level', '[{"level":1,"label_en":"Non-Compliant","label_ar":"غير ممتثل"},{"level":2,"label_en":"Partially Compliant","label_ar":"ممتثل جزئياً"},{"level":3,"label_en":"Fully Compliant","label_ar":"ممتثل بالكامل"}]'::jsonb, 100.0, true,
   'NCA CSCC 3-level assessment', 'تقييم ضوابط الأنظمة الحساسة'),
  ('nca_dcc', 'nca_3level', '[{"level":1,"label_en":"Non-Compliant","label_ar":"غير ممتثل"},{"level":2,"label_en":"Partially Compliant","label_ar":"ممتثل جزئياً"},{"level":3,"label_en":"Fully Compliant","label_ar":"ممتثل بالكامل"}]'::jsonb, 100.0, true,
   'NCA DCC data controls assessment', 'تقييم ضوابط البيانات'),
  ('nca_ccc', 'nca_3level', '[{"level":1,"label_en":"Non-Compliant","label_ar":"غير ممتثل"},{"level":2,"label_en":"Partially Compliant","label_ar":"ممتثل جزئياً"},{"level":3,"label_en":"Fully Compliant","label_ar":"ممتثل بالكامل"}]'::jsonb, 100.0, true,
   'NCA CCC cloud controls assessment', 'تقييم ضوابط الحوسبة السحابية'),
  ('sama_csf', 'maturity_5', '[{"level":1,"label_en":"Ad Hoc","label_ar":"عشوائي"},{"level":2,"label_en":"Repeatable","label_ar":"قابل للتكرار"},{"level":3,"label_en":"Defined","label_ar":"محدد"},{"level":4,"label_en":"Managed","label_ar":"مُدار"},{"level":5,"label_en":"Optimized","label_ar":"محسّن"}]'::jsonb, 60.0, true,
   'SAMA CSF 5-level maturity model', 'نموذج نضج ساما بخمسة مستويات'),
  ('pdpl', 'binary', '[{"level":0,"label_en":"Non-Compliant","label_ar":"غير ممتثل"},{"level":1,"label_en":"Compliant","label_ar":"ممتثل"}]'::jsonb, 100.0, false,
   'PDPL binary compliance (comply or not)', 'امتثال ثنائي لنظام حماية البيانات الشخصية'),
  ('sdaia_aie', 'percentage', NULL, 70.0, true,
   'AI Ethics percentage-based scoring', 'تقييم أخلاقيات الذكاء الاصطناعي بالنسبة المئوية'),
  ('cma_governance', 'maturity_5', '[{"level":1,"label_en":"Initial","label_ar":"أولي"},{"level":2,"label_en":"Developing","label_ar":"قيد التطوير"},{"level":3,"label_en":"Established","label_ar":"مؤسس"},{"level":4,"label_en":"Quantified","label_ar":"مقاس"},{"level":5,"label_en":"Optimizing","label_ar":"محسّن"}]'::jsonb, 60.0, true,
   'CMA corporate governance maturity', 'نضج الحوكمة المؤسسية'),
  ('gac_competition', 'binary', '[{"level":0,"label_en":"Non-Compliant","label_ar":"غير ممتثل"},{"level":1,"label_en":"Compliant","label_ar":"ممتثل"}]'::jsonb, 100.0, false,
   'Competition law binary compliance', 'الامتثال لنظام المنافسة'),
  ('hrsd_labor_law', 'percentage', NULL, 80.0, false,
   'Labor law compliance percentage', 'نسبة الامتثال لنظام العمل'),
  ('hrsd_nitaqat', 'percentage', NULL, 100.0, false,
   'Nitaqat (Saudization) compliance band', 'امتثال نطاقات السعودة'),
  ('zatca_vat', 'binary', '[{"level":0,"label_en":"Non-Compliant","label_ar":"غير ممتثل"},{"level":1,"label_en":"Compliant","label_ar":"ممتثل"}]'::jsonb, 100.0, false,
   'VAT compliance', 'امتثال ضريبة القيمة المضافة'),
  ('moh_his', 'maturity_5', '[{"level":1,"label_en":"Initial","label_ar":"أولي"},{"level":2,"label_en":"Managed","label_ar":"مُدار"},{"level":3,"label_en":"Defined","label_ar":"محدد"},{"level":4,"label_en":"Quantified","label_ar":"مقاس"},{"level":5,"label_en":"Optimized","label_ar":"محسّن"}]'::jsonb, 60.0, true,
   'MOH health information security maturity', 'نضج أمن المعلومات الصحية')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART D: Multi-Sector Tenant Support
-- Allows tenants (conglomerates) to operate across multiple sectors
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.tenant_sectors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  sector_code      VARCHAR(50) NOT NULL,            -- ISIC letter or SEC-KSA-* code
  is_primary       BOOLEAN DEFAULT FALSE,
  added_at         TIMESTAMPTZ DEFAULT NOW(),
  added_by         UUID,
  UNIQUE(tenant_id, sector_code)
);

CREATE INDEX IF NOT EXISTS idx_ts_tenant ON public.tenant_sectors(tenant_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- PART E: Knowledge Hub Full-Text Search Index
-- ═══════════════════════════════════════════════════════════════════════════

-- Add tsvector column to regulatory_controls for fast full-text search
ALTER TABLE public.regulatory_controls
  ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- Populate search vector
UPDATE public.regulatory_controls SET
  search_vector = to_tsvector('english',
    COALESCE(control_title_en, '') || ' ' ||
    COALESCE(control_description_en, '') || ' ' ||
    COALESCE(control_code, '') || ' ' ||
    COALESCE(control_number, '')
  )
WHERE search_vector IS NULL;

-- GIN index for fast search
CREATE INDEX IF NOT EXISTS idx_rc_search ON public.regulatory_controls USING GIN(search_vector);

-- Trigger to auto-update search vector on insert/update
CREATE OR REPLACE FUNCTION update_control_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.control_title_en, '') || ' ' ||
    COALESCE(NEW.control_description_en, '') || ' ' ||
    COALESCE(NEW.control_code, '') || ' ' ||
    COALESCE(NEW.control_number, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_control_search ON public.regulatory_controls;
CREATE TRIGGER trg_control_search
  BEFORE INSERT OR UPDATE ON public.regulatory_controls
  FOR EACH ROW
  EXECUTE FUNCTION update_control_search_vector();


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  'Migration 033 Complete' AS status,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'regulatory_change_log') AS change_log_exists,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_regulatory_impacts') AS impact_tracking_exists,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'framework_scoring_policies') AS scoring_policies_exists,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_sectors') AS multi_sector_exists,
  (SELECT COUNT(*) FROM public.framework_scoring_policies) AS scoring_policies_count;

COMMIT;
