-- Migration 713: Regulatory Change Triage + Tasks
-- Adds formal triage workflow and task generation for regulatory changes

-- Triage decisions: formal decision log per change event
CREATE TABLE IF NOT EXISTS change_triage_decisions (
  decision_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_event_id UUID NOT NULL,
  decision        VARCHAR(30) NOT NULL DEFAULT 'pending',  -- pending | applicable | not_applicable | needs_review
  rationale       TEXT,
  decided_by      VARCHAR(128),
  decided_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ctd_change_event ON change_triage_decisions (change_event_id);
CREATE INDEX IF NOT EXISTS idx_ctd_decision     ON change_triage_decisions (decision, decided_at DESC);

-- Change tasks: tasks generated from regulatory change impacts
CREATE TABLE IF NOT EXISTS change_tasks (
  task_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_event_id UUID NOT NULL,
  task_type       VARCHAR(50) NOT NULL DEFAULT 'review',   -- review | update_control | update_policy | update_obligation | evidence_collection
  linked_ref_type VARCHAR(50),                              -- obligation | control | policy | evidence
  linked_ref_id   VARCHAR(200),
  title           TEXT NOT NULL,
  description     TEXT,
  assignee_user_id VARCHAR(128),
  due_date        DATE,
  priority        VARCHAR(20) DEFAULT 'medium',
  status          VARCHAR(30) NOT NULL DEFAULT 'open',     -- open | in_progress | completed | cancelled
  completed_at    TIMESTAMPTZ,
  completed_by    VARCHAR(128),
  created_by      VARCHAR(128),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ct_change_event   ON change_tasks (change_event_id);
CREATE INDEX IF NOT EXISTS idx_ct_assignee       ON change_tasks (assignee_user_id, status);
CREATE INDEX IF NOT EXISTS idx_ct_status_due     ON change_tasks (status, due_date);

-- Add triage_status to regulatory_change_events if not present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'regulatory_change_events' AND table_schema = current_schema()) THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regulatory_change_events' AND column_name = 'triage_status') THEN
      ALTER TABLE regulatory_change_events ADD COLUMN triage_status VARCHAR(30) DEFAULT 'new';
    END IF;
  END IF;
END $$;
