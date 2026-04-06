CREATE TABLE IF NOT EXISTS ethics_reports (
  report_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type         VARCHAR(50) NOT NULL DEFAULT 'ethics_violation',
  title               VARCHAR(500) NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  severity            VARCHAR(20) NOT NULL DEFAULT 'medium',
  status              VARCHAR(30) NOT NULL DEFAULT 'reported',
  reporter_id         VARCHAR(255),
  anonymous           BOOLEAN DEFAULT FALSE,
  assigned_investigator VARCHAR(255),
  category            VARCHAR(100),
  resolution          TEXT,
  resolution_date     TIMESTAMPTZ,
  escalated_to_governance BOOLEAN DEFAULT FALSE,
  board_attention     BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ethics_actions (
  action_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id           UUID NOT NULL REFERENCES ethics_reports(report_id) ON DELETE CASCADE,
  title               VARCHAR(500) NOT NULL,
  description         TEXT DEFAULT '',
  action_type         VARCHAR(50) DEFAULT 'corrective',
  assigned_to         VARCHAR(255),
  status              VARCHAR(30) NOT NULL DEFAULT 'pending',
  due_date            TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  outcome             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ethics_reports_status ON ethics_reports(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ethics_reports_severity ON ethics_reports(severity) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ethics_actions_report ON ethics_actions(report_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE ethics_reports IS 'Ethics violation and whistleblower reports — governance pipeline';
COMMENT ON TABLE ethics_actions IS 'Response actions for ethics reports';
