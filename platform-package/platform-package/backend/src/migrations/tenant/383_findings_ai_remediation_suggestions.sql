-- Tenant migration: AI Remediation Suggestions for Findings
-- Adds support for AI-generated remediation suggestions stored with metadata

-- Add ai_remediation_suggestions column to findings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = current_schema() 
    AND table_name = 'findings' 
    AND column_name = 'ai_remediation_suggestions'
  ) THEN
    ALTER TABLE findings ADD COLUMN ai_remediation_suggestions JSONB DEFAULT NULL;
  END IF;
END $$;

COMMENT ON COLUMN findings.ai_remediation_suggestions IS 'AI-generated remediation suggestions with metadata (suggestions array, generated_at, confidence, model)';

-- Add index for querying findings with AI suggestions
CREATE INDEX IF NOT EXISTS idx_findings_ai_suggestions 
  ON findings((ai_remediation_suggestions IS NOT NULL)) 
  WHERE ai_remediation_suggestions IS NOT NULL;
