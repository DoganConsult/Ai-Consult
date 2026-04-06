-- ============================================================================
-- Migration 020: Regulatory Data Integrity Chain
-- Normalizes framework_code to lowercase_underscore across all tables,
-- enforces FK integrity, populates authority→sector mappings, creates
-- framework→module trigger table.
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- PHASE A: Normalize framework_code to lowercase_underscore
-- ════════════════════════════════════════════════════════════════════════════

-- A1: lookup_frameworks — special-case iso codes (no separator → add underscore)
UPDATE public.lookup_frameworks SET framework_code = 'iso_27001' WHERE framework_code = 'iso27001';
UPDATE public.lookup_frameworks SET framework_code = 'iso_27701' WHERE framework_code = 'iso27701';

-- A2: lookup_authority_frameworks (UPPER_UNDERSCORE → lowercase_underscore)
UPDATE public.lookup_authority_frameworks
SET framework_code = lower(framework_code)
WHERE framework_code <> lower(framework_code);

-- A3–A10: All UPPER-HYPHEN tables
-- FK chain: regulatory_frameworks ← control_domains, framework_versions, framework_version_diffs
-- FKs are NOT DEFERRABLE, so we must temporarily drop them, update all tables, then re-add.

-- A3: Drop FK constraints that reference regulatory_frameworks.framework_code
ALTER TABLE public.control_domains DROP CONSTRAINT IF EXISTS control_domains_framework_code_fkey;
ALTER TABLE public.framework_versions DROP CONSTRAINT IF EXISTS framework_versions_framework_code_fkey;
ALTER TABLE public.framework_version_diffs DROP CONSTRAINT IF EXISTS framework_version_diffs_framework_code_fkey;

-- A4: Now safe to update all tables in any order
UPDATE public.regulatory_frameworks
SET framework_code = lower(replace(framework_code, '-', '_'))
WHERE framework_code <> lower(replace(framework_code, '-', '_'));

UPDATE public.control_domains
SET framework_code = lower(replace(framework_code, '-', '_'))
WHERE framework_code <> lower(replace(framework_code, '-', '_'));

UPDATE public.framework_versions
SET framework_code = lower(replace(framework_code, '-', '_'))
WHERE framework_code <> lower(replace(framework_code, '-', '_'));

UPDATE public.framework_version_diffs
SET framework_code = lower(replace(framework_code, '-', '_'))
WHERE framework_code <> lower(replace(framework_code, '-', '_'));

UPDATE public.control_evidence_requirements
SET framework_code = lower(replace(framework_code, '-', '_'))
WHERE framework_code <> lower(replace(framework_code, '-', '_'));

UPDATE public.control_sectors
SET framework_code = lower(replace(framework_code, '-', '_'))
WHERE framework_code <> lower(replace(framework_code, '-', '_'));

-- NOTE: major_framework_updates and risk_control_framework_chain are VIEWs
-- that derive from the base tables above — no direct UPDATE needed.

-- A5: Re-add the FK constraints (now both sides are normalized)
ALTER TABLE public.control_domains
  ADD CONSTRAINT control_domains_framework_code_fkey
  FOREIGN KEY (framework_code) REFERENCES public.regulatory_frameworks(framework_code);

ALTER TABLE public.framework_versions
  ADD CONSTRAINT framework_versions_framework_code_fkey
  FOREIGN KEY (framework_code) REFERENCES public.regulatory_frameworks(framework_code);

ALTER TABLE public.framework_version_diffs
  ADD CONSTRAINT framework_version_diffs_framework_code_fkey
  FOREIGN KEY (framework_code) REFERENCES public.regulatory_frameworks(framework_code);

-- Phase A post-check: assert normalization is complete
DO $$
DECLARE bad INT;
BEGIN
  SELECT count(*) INTO bad FROM public.control_domains
  WHERE framework_code <> lower(replace(framework_code, '-', '_'));
  IF bad > 0 THEN RAISE EXCEPTION 'control_domains still has % non-normalized rows', bad; END IF;

  SELECT count(*) INTO bad FROM public.control_evidence_requirements
  WHERE framework_code <> lower(replace(framework_code, '-', '_'));
  IF bad > 0 THEN RAISE EXCEPTION 'control_evidence_requirements still has % non-normalized rows', bad; END IF;

  SELECT count(*) INTO bad FROM public.control_sectors
  WHERE framework_code <> lower(replace(framework_code, '-', '_'));
  IF bad > 0 THEN RAISE EXCEPTION 'control_sectors still has % non-normalized rows', bad; END IF;

  SELECT count(*) INTO bad FROM public.regulatory_frameworks
  WHERE framework_code <> lower(replace(framework_code, '-', '_'));
  IF bad > 0 THEN RAISE EXCEPTION 'regulatory_frameworks still has % non-normalized rows', bad; END IF;

  SELECT count(*) INTO bad FROM public.framework_versions
  WHERE framework_code <> lower(replace(framework_code, '-', '_'));
  IF bad > 0 THEN RAISE EXCEPTION 'framework_versions still has % non-normalized rows', bad; END IF;

  SELECT count(*) INTO bad FROM public.framework_version_diffs
  WHERE framework_code <> lower(replace(framework_code, '-', '_'));
  IF bad > 0 THEN RAISE EXCEPTION 'framework_version_diffs still has % non-normalized rows', bad; END IF;

  -- major_framework_updates and risk_control_framework_chain are VIEWs — skipped

  SELECT count(*) INTO bad FROM public.lookup_authority_frameworks
  WHERE framework_code <> lower(framework_code);
  IF bad > 0 THEN RAISE EXCEPTION 'lookup_authority_frameworks still has % non-normalized rows', bad; END IF;

  SELECT count(*) INTO bad FROM public.lookup_frameworks
  WHERE framework_code ~ '[A-Z]' OR framework_code LIKE '%-%';
  IF bad > 0 THEN RAISE EXCEPTION 'lookup_frameworks still has % non-normalized rows', bad; END IF;

  RAISE NOTICE 'Phase A: All framework_code values normalized to lowercase_underscore';
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE B: Insert missing frameworks into lookup_frameworks
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO public.lookup_frameworks
  (framework_code, framework_name, framework_acronym, description_en, description_ar, regulatory_body, jurisdiction, compliance_level, is_active, sort_order)
VALUES
  ('nca_ccc',    'NCA Critical Systems Cybersecurity Controls',       'CCC',      'Controls for critical national infrastructure cybersecurity',           'ضوابط الأمن السيبراني للأنظمة الحساسة',                        'NCA',   'SA',            'mandatory',    true, 20),
  ('nca_otcc',   'NCA Operational Technology Cybersecurity Controls', 'OTCC',     'Controls for operational technology and industrial control systems',    'ضوابط الأمن السيبراني للتقنيات التشغيلية',                     'NCA',   'SA',            'mandatory',    true, 21),
  ('sama_psr',   'SAMA Payment Systems Regulations',                  'PSR',      'Regulations governing payment systems and fintech',                    'أنظمة أنظمة المدفوعات',                                        'SAMA',  'SA',            'mandatory',    true, 22),
  ('sama_aml',   'SAMA AML/CFT Rules',                                'AML',      'Anti-money laundering and counter-terrorism financing rules',          'قواعد مكافحة غسل الأموال وتمويل الإرهاب',                      'SAMA',  'SA',            'mandatory',    true, 23),
  ('cma_cg',     'CMA Corporate Governance',                          'CG',       'Corporate governance regulations for listed companies',                'أنظمة حوكمة الشركات المدرجة',                                  'CMA',   'SA',            'mandatory',    true, 24),
  ('iso_22301',  'ISO 22301 Business Continuity Management',          'ISO22301', 'International standard for business continuity management systems',    'المعيار الدولي لإدارة استمرارية الأعمال',                       'ISO',   'International', 'recommended',  true, 25),
  ('zatca_einv', 'ZATCA E-Invoicing Regulations',                     'EINV',     'Electronic invoicing (Fatoorah) regulations',                          'أنظمة الفوترة الإلكترونية (فاتورة)',                            'ZATCA', 'SA',            'mandatory',    true, 26),
  ('dgrf',       'Digital Government Regulatory Framework',           'DGRF',     'Framework for digital government services and data governance',        'الإطار التنظيمي للحكومة الرقمية',                               'DGA',   'SA',            'mandatory',    true, 27),
  ('iot_reg',    'IoT Security Regulations',                          'IoTREG',   'Security regulations for Internet of Things devices and services',     'أنظمة أمن إنترنت الأشياء',                                     'CST',   'SA',            'recommended',  true, 28)
ON CONFLICT (framework_code) DO NOTHING;

-- Phase B post-check: every code in control_domains must exist in lookup_frameworks
DO $$
DECLARE missing TEXT;
BEGIN
  SELECT string_agg(DISTINCT d.framework_code, ', ') INTO missing
  FROM public.control_domains d
  LEFT JOIN public.lookup_frameworks f ON f.framework_code = d.framework_code
  WHERE f.framework_code IS NULL;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'control_domains has codes missing from lookup_frameworks: %', missing;
  END IF;
  RAISE NOTICE 'Phase B: All control_domains codes exist in lookup_frameworks';
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE C: Enforce FK on lookup_authority_frameworks.framework_code
-- ════════════════════════════════════════════════════════════════════════════

-- Add FK as NOT VALID first (non-blocking), then validate
ALTER TABLE public.lookup_authority_frameworks
  DROP CONSTRAINT IF EXISTS lookup_authority_frameworks_framework_code_fkey;
ALTER TABLE public.lookup_authority_frameworks
  ADD CONSTRAINT lookup_authority_frameworks_framework_code_fkey
  FOREIGN KEY (framework_code)
  REFERENCES public.lookup_frameworks(framework_code)
  NOT VALID;

ALTER TABLE public.lookup_authority_frameworks
  VALIDATE CONSTRAINT lookup_authority_frameworks_framework_code_fkey;

-- Prevent duplicate authority→framework rows
CREATE UNIQUE INDEX IF NOT EXISTS ux_auth_framework
  ON public.lookup_authority_frameworks(authority_code, framework_code)
  WHERE is_active;

DO $$ BEGIN RAISE NOTICE 'Phase C: FK enforced and validated on lookup_authority_frameworks.framework_code'; END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE D: Add missing authority→framework mappings
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO public.lookup_authority_frameworks
  (authority_code, framework_code, framework_name, framework_version, is_active)
VALUES
  ('ZATCA', 'zatca_einv', 'ZATCA E-Invoicing Regulations',       '1.0', true),
  ('CMA',   'cma_cg',     'CMA Corporate Governance',             '1.0', true),
  ('SAMA',  'sama_psr',   'SAMA Payment Systems Regulations',     '1.0', true),
  ('SAMA',  'sama_aml',   'SAMA AML/CFT Rules',                   '1.0', true),
  ('NCA',   'nca_otcc',   'NCA OT Cybersecurity Controls',        '1.0', true),
  ('NCA',   'nca_ccc',    'NCA Critical Systems Controls',        '1.0', true),
  ('DGA',   'dgrf',       'Digital Government Regulatory Framework', '1.0', true),
  ('CST',   'iot_reg',    'IoT Security Regulations',             '1.0', true)
ON CONFLICT DO NOTHING;

DO $$ BEGIN RAISE NOTICE 'Phase D: Missing authority→framework mappings inserted'; END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE E: Enhance lookup_authority_sector_mapping schema
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.lookup_authority_sector_mapping
  ADD COLUMN IF NOT EXISTS enforcement VARCHAR(20) NOT NULL DEFAULT 'mandatory',
  ADD COLUMN IF NOT EXISTS priority INT NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS reason_en TEXT,
  ADD COLUMN IF NOT EXISTS reason_ar TEXT;

-- Check constraint on enforcement values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'chk_enforcement'
      AND constraint_schema = 'public'
  ) THEN
    ALTER TABLE public.lookup_authority_sector_mapping
      ADD CONSTRAINT chk_enforcement
      CHECK (enforcement IN ('mandatory', 'recommended'));
  END IF;
END $$;

-- Prevent duplicate authority→sector rows
CREATE UNIQUE INDEX IF NOT EXISTS ux_auth_sector
  ON public.lookup_authority_sector_mapping(authority_code, sector_code)
  WHERE is_active;

DO $$ BEGIN RAISE NOTICE 'Phase E: lookup_authority_sector_mapping schema enhanced'; END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE F: Populate lookup_authority_sector_mapping
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO public.lookup_authority_sector_mapping
  (authority_code, sector_code, regulation_type, enforcement, priority, reason_en, reason_ar, is_active)
SELECT
  r.authority_code,
  s.sector_code,
  CASE
    WHEN r.authority_code IN ('NCA','SDAIA','SAMA','ZATCA','CMA') THEN 'primary'
    WHEN r.authority_code IN ('HRSD','GOSI','GAC','MISA')         THEN 'crosscutting'
    ELSE 'secondary'
  END,
  CASE
    WHEN r.authority_code IN ('NCA','SDAIA','SAMA','ZATCA','CMA') THEN 'mandatory'
    ELSE 'recommended'
  END,
  CASE r.authority_code
    WHEN 'NCA'   THEN 10
    WHEN 'SAMA'  THEN 15
    WHEN 'SDAIA' THEN 20
    WHEN 'ZATCA' THEN 25
    WHEN 'CMA'   THEN 30
    ELSE 50
  END,
  r.authority_name_en || ' regulates this sector under KSA law',
  r.authority_name_en || ' - جهة رقابية على هذا القطاع بموجب النظام السعودي',
  true
FROM public.lookup_ksa_regulatory_authorities r
CROSS JOIN LATERAL unnest(r.regulated_sectors) AS s(sector_code)
WHERE r.is_active
  AND EXISTS (SELECT 1 FROM public.lookup_isic4_sectors i WHERE i.section_code = s.sector_code)
ON CONFLICT DO NOTHING;

DO $$
DECLARE row_count INT;
BEGIN
  SELECT count(*) INTO row_count FROM public.lookup_authority_sector_mapping WHERE is_active;
  RAISE NOTICE 'Phase F: lookup_authority_sector_mapping now has % active rows', row_count;
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE G: Create lookup_framework_module_triggers
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.lookup_framework_module_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_code VARCHAR(50) NOT NULL REFERENCES public.lookup_frameworks(framework_code),
  module_code VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(framework_code, module_code)
);

INSERT INTO public.lookup_framework_module_triggers (framework_code, module_code) VALUES
  ('nca_ecc',    'agrc'),
  ('nca_ecc',    'compliance'),
  ('nca_ccc',    'agrc'),
  ('nca_ccc',    'compliance'),
  ('pdpl',       'privacy_ops'),
  ('pdpl',       'compliance'),
  ('sama_csf',   'compliance'),
  ('sama_csf',   'vendor_governance'),
  ('pci_dss',    'compliance'),
  ('iso_27001',  'compliance'),
  ('iso_27001',  'risk'),
  ('nist_csf',   'risk'),
  ('zatca_einv', 'compliance'),
  ('cma_cg',     'compliance'),
  ('sama_psr',   'compliance'),
  ('sama_aml',   'compliance')
ON CONFLICT DO NOTHING;

DO $$ BEGIN RAISE NOTICE 'Phase G: lookup_framework_module_triggers created and seeded'; END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE H: Data completeness validation
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE missing_count INT; missing_list TEXT;
BEGIN
  -- 1. Every active authority must have >= 1 framework
  SELECT count(*), string_agg(a.authority_code, ', ') INTO missing_count, missing_list
  FROM public.lookup_ksa_regulatory_authorities a
  LEFT JOIN public.lookup_authority_frameworks f
    ON f.authority_code = a.authority_code AND f.is_active
  WHERE f.id IS NULL AND a.is_active;
  IF missing_count > 0 THEN
    RAISE WARNING 'VALIDATION: % authorities have no active frameworks: %', missing_count, missing_list;
  ELSE
    RAISE NOTICE 'VALIDATION: All active authorities have frameworks — OK';
  END IF;

  -- 2. Every ISIC4 sector A-S must have >= 1 authority
  SELECT count(*), string_agg(s.section_code, ', ') INTO missing_count, missing_list
  FROM public.lookup_isic4_sectors s
  LEFT JOIN public.lookup_authority_sector_mapping m
    ON m.sector_code = s.section_code AND m.is_active
  WHERE m.id IS NULL AND s.section_code NOT IN ('T','U');
  IF missing_count > 0 THEN
    RAISE WARNING 'VALIDATION: % sectors (A-S) have no authority mapping: %', missing_count, missing_list;
  ELSE
    RAISE NOTICE 'VALIDATION: All sectors A-S have authority mappings — OK';
  END IF;

  -- 3. Every framework in authority_frameworks has controls
  SELECT count(*), string_agg(f.framework_code, ', ') INTO missing_count, missing_list
  FROM public.lookup_authority_frameworks f
  LEFT JOIN public.control_domains d ON d.framework_code = f.framework_code
  WHERE d.id IS NULL AND f.is_active;
  IF missing_count > 0 THEN
    RAISE WARNING 'VALIDATION: % authority frameworks have no controls in control_domains: %', missing_count, missing_list;
  ELSE
    RAISE NOTICE 'VALIDATION: All authority frameworks have controls — OK';
  END IF;

  -- 4. Summary counts
  RAISE NOTICE 'SUMMARY: lookup_frameworks = % rows', (SELECT count(*) FROM public.lookup_frameworks WHERE is_active);
  RAISE NOTICE 'SUMMARY: lookup_authority_frameworks = % rows', (SELECT count(*) FROM public.lookup_authority_frameworks WHERE is_active);
  RAISE NOTICE 'SUMMARY: lookup_authority_sector_mapping = % rows', (SELECT count(*) FROM public.lookup_authority_sector_mapping WHERE is_active);
  RAISE NOTICE 'SUMMARY: lookup_framework_module_triggers = % rows', (SELECT count(*) FROM public.lookup_framework_module_triggers WHERE is_active);
  RAISE NOTICE 'SUMMARY: control_domains = % rows', (SELECT count(*) FROM public.control_domains);
  RAISE NOTICE 'SUMMARY: regulatory_controls = % rows', (SELECT count(*) FROM public.regulatory_controls);
  RAISE NOTICE 'SUMMARY: control_evidence_requirements = % rows', (SELECT count(*) FROM public.control_evidence_requirements);
END $$;

COMMIT;
