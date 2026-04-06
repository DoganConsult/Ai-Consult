-- Migration 075: FK regulatory_frameworks.authority_code → lookup_ksa_regulatory_authorities(authority_code)
-- Completes lookup integrity per docs/DB-LOOKUP-INTEGRITY.md §2 (Frameworks).
-- Idempotent: inserts missing authority stubs, then adds constraint if absent.

-- 0) Seed missing authority codes referenced by frameworks (placeholder rows; ops can enrich later)
INSERT INTO public.lookup_ksa_regulatory_authorities (
  authority_code,
  authority_name_en,
  authority_name_ar,
  authority_acronym,
  authority_type,
  is_active,
  sort_order
)
SELECT DISTINCT
  rf.authority_code,
  rf.authority_code,
  rf.authority_code,
  LEFT(rf.authority_code::text, 20),
  'other',
  true,
  0
FROM public.regulatory_frameworks rf
WHERE rf.authority_code IS NOT NULL
  AND btrim(rf.authority_code::text) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.lookup_ksa_regulatory_authorities l
    WHERE l.authority_code = rf.authority_code
  );

-- 1) Add FK (nullable column: NULLs allowed; non-null must exist in lookup)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'regulatory_frameworks_authority_code_fkey'
      AND conrelid = 'public.regulatory_frameworks'::regclass
  ) THEN
    ALTER TABLE public.regulatory_frameworks
      ADD CONSTRAINT regulatory_frameworks_authority_code_fkey
      FOREIGN KEY (authority_code) REFERENCES public.lookup_ksa_regulatory_authorities(authority_code);
  END IF;
END $$;
