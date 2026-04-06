-- Ensure derived tables reference lookup/catalog tables via FKs.
-- Run after master baseline and seeds. This migration fixes orphan rows first, then adds FKs.

-- 0) Fix orphans: insert missing evidence_type_code into evidence_types
INSERT INTO public.evidence_types (evidence_code, evidence_name_en, evidence_name_ar, evidence_category)
SELECT DISTINCT cer.evidence_type_code, cer.evidence_type_code, cer.evidence_type_code, 'general'
  FROM public.control_evidence_requirements cer
 WHERE cer.evidence_type_code IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.evidence_types et WHERE et.evidence_code = cer.evidence_type_code)
ON CONFLICT (evidence_code) DO NOTHING;

-- 0b) Fix orphans: insert missing framework_code into regulatory_frameworks (from cer and fsp)
INSERT INTO public.regulatory_frameworks (framework_code, framework_name_en, framework_name_ar)
SELECT DISTINCT code, code, code
  FROM (
    SELECT cer.framework_code AS code FROM public.control_evidence_requirements cer WHERE cer.framework_code IS NOT NULL
    UNION
    SELECT fsp.framework_code FROM public.framework_scoring_policies fsp WHERE fsp.framework_code IS NOT NULL
  ) u
 WHERE NOT EXISTS (SELECT 1 FROM public.regulatory_frameworks rf WHERE rf.framework_code = u.code);

-- 1) control_evidence_requirements.evidence_type_code → evidence_types(evidence_code)
--    (column allows NULL; FK enforces that non-null values exist in evidence_types)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'control_evidence_requirements_evidence_type_code_fkey'
      AND conrelid = 'public.control_evidence_requirements'::regclass
  ) THEN
    ALTER TABLE public.control_evidence_requirements
      ADD CONSTRAINT control_evidence_requirements_evidence_type_code_fkey
      FOREIGN KEY (evidence_type_code) REFERENCES public.evidence_types(evidence_code);
  END IF;
END $$;

-- 2) control_evidence_requirements.framework_code → regulatory_frameworks(framework_code)
--    (when present, must point to a valid framework)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'control_evidence_requirements_framework_code_fkey'
      AND conrelid = 'public.control_evidence_requirements'::regclass
  ) THEN
    ALTER TABLE public.control_evidence_requirements
      ADD CONSTRAINT control_evidence_requirements_framework_code_fkey
      FOREIGN KEY (framework_code) REFERENCES public.regulatory_frameworks(framework_code);
  END IF;
END $$;

-- 3) framework_scoring_policies.framework_code → regulatory_frameworks(framework_code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'framework_scoring_policies_framework_code_fkey'
      AND conrelid = 'public.framework_scoring_policies'::regclass
  ) THEN
    ALTER TABLE public.framework_scoring_policies
      ADD CONSTRAINT framework_scoring_policies_framework_code_fkey
      FOREIGN KEY (framework_code) REFERENCES public.regulatory_frameworks(framework_code);
  END IF;
END $$;
