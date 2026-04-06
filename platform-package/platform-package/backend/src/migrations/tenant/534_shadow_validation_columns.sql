-- Feature 11: Shadow Mode Validation — extend decision_record for proposal vs outcome tracking
-- Columns used by shadow-validation.service to compare AI proposals vs human decisions

ALTER TABLE decision_record ADD COLUMN IF NOT EXISTS shadow_proposal JSONB DEFAULT '{}';
ALTER TABLE decision_record ADD COLUMN IF NOT EXISTS human_decision JSONB;
ALTER TABLE decision_record ADD COLUMN IF NOT EXISTS actual_outcome JSONB;
ALTER TABLE decision_record ADD COLUMN IF NOT EXISTS match_result VARCHAR(30) DEFAULT 'pending'
  CHECK (match_result IN ('true_positive','true_negative','false_positive','false_negative','pending'));

CREATE INDEX IF NOT EXISTS idx_dr_match_result ON decision_record(match_result) WHERE match_result != 'pending';
CREATE INDEX IF NOT EXISTS idx_dr_shadow ON decision_record(tenant_id, agent_id) WHERE shadow_proposal IS NOT NULL AND shadow_proposal != '{}'::jsonb;
