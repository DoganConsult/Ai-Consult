-- Migration 714: Minor compliance schema enhancements
-- Addresses gaps G14-G23 from spec comparison

-- G14: Add interpretation_text to compliance_obligations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compliance_obligations' AND column_name = 'interpretation_text' AND table_schema = current_schema()) THEN
    ALTER TABLE compliance_obligations ADD COLUMN interpretation_text TEXT;
  END IF;
END $$;

-- G16: Add review cadence and next review date to exceptions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exceptions' AND table_schema = current_schema()) THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exceptions' AND column_name = 'review_cadence_days') THEN
      ALTER TABLE exceptions ADD COLUMN review_cadence_days INTEGER DEFAULT 90;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exceptions' AND column_name = 'next_review_date') THEN
      ALTER TABLE exceptions ADD COLUMN next_review_date DATE;
    END IF;
  END IF;
END $$;

-- G17: Ensure applicability enum includes all 4 states
-- (compliance_obligations.applicability is already TEXT, so no schema change needed)

-- G18: Gap "reopened" status (gap statuses are TEXT, no DDL needed)

-- G19: Gap closure evidence
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_gaps' AND table_schema = current_schema()) THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'compliance_gaps' AND column_name = 'closure_evidence_id') THEN
      ALTER TABLE compliance_gaps ADD COLUMN closure_evidence_id UUID;
    END IF;
  END IF;
END $$;

-- G15: Exception multi-level approval (approval_chain is already JSONB array, supports multiple entries)
