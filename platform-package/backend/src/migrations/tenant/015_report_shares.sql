-- Report Shares table for the Report Hub sharing feature
-- Requirement 13.1, 13.5

CREATE TABLE IF NOT EXISTS report_shares (
  share_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL,
  shared_by UUID NOT NULL,
  recipient_id UUID NOT NULL,
  recipient_type VARCHAR(20) NOT NULL DEFAULT 'user',
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(report_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_report_shares_report_id ON report_shares(report_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_recipient ON report_shares(recipient_id, recipient_type);
