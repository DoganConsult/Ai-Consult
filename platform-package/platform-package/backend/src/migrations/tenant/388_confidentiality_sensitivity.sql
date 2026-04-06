-- P5.5: Confidentiality/sensitivity — add confidentiality_level to findings and evidence
-- Filter by user clearance in GET and audit package

-- Add confidentiality_level to findings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = CURRENT_SCHEMA() 
    AND table_name = 'findings' 
    AND column_name = 'confidentiality_level'
  ) THEN
    ALTER TABLE findings ADD COLUMN confidentiality_level VARCHAR(20) DEFAULT 'internal'
      CHECK (confidentiality_level IN ('public', 'internal', 'confidential', 'restricted'));
    CREATE INDEX IF NOT EXISTS idx_findings_confidentiality_level ON findings(confidentiality_level);
  END IF;
END $$;

-- Add confidentiality_level to evidence table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = CURRENT_SCHEMA() 
    AND table_name = 'evidence' 
    AND column_name = 'confidentiality_level'
  ) THEN
    ALTER TABLE evidence ADD COLUMN confidentiality_level VARCHAR(20) DEFAULT 'internal'
      CHECK (confidentiality_level IN ('public', 'internal', 'confidential', 'restricted'));
    CREATE INDEX IF NOT EXISTS idx_evidence_confidentiality_level ON evidence(confidentiality_level);
  END IF;
END $$;

-- Note: Controls already have data_classification from migration 378
-- Note: Risks already have sensitivity_level from migration 378
-- This migration adds confidentiality_level to findings and evidence to align with the same classification scheme
