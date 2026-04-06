-- Priority 15: Regulatory Calendar with Auto-Deadlines
-- Tracks regulatory deadlines (assessment dates, renewal deadlines, filing dates)
-- Auto-creates process_tasks 30/14/7 days before each deadline with escalating priority

CREATE TABLE IF NOT EXISTS regulatory_calendar (
  calendar_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  framework_id VARCHAR(50) NOT NULL,  -- References frameworks.framework_id
  deadline_type VARCHAR(50) NOT NULL CHECK (deadline_type IN ('assessment', 'renewal', 'filing', 'review', 'audit', 'reporting', 'other')),
  deadline_date DATE NOT NULL,
  title_en VARCHAR(500) NOT NULL,
  title_ar VARCHAR(500),
  description_en TEXT,
  description_ar TEXT,
  regulator_name VARCHAR(200),  -- e.g., "NCA", "SAMA", "PDPL Authority"
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  recurring BOOLEAN DEFAULT FALSE,  -- If true, deadline repeats annually/quarterly
  recurrence_pattern VARCHAR(50),  -- e.g., 'annual', 'quarterly', 'monthly'
  owner_role VARCHAR(100),  -- Default role responsible for this deadline
  metadata JSONB DEFAULT '{}',  -- Additional context (source_url, reference_number, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_regulatory_calendar_tenant ON regulatory_calendar(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_regulatory_calendar_deadline ON regulatory_calendar(deadline_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_regulatory_calendar_framework ON regulatory_calendar(framework_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_regulatory_calendar_upcoming ON regulatory_calendar(deadline_date) WHERE deleted_at IS NULL;

-- Track which tasks have been created for each deadline (to avoid duplicates)
CREATE TABLE IF NOT EXISTS regulatory_calendar_task_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES regulatory_calendar(calendar_id) ON DELETE CASCADE,
  task_id UUID NOT NULL,  -- References process_tasks.task_id
  reminder_days_before INT NOT NULL,  -- 30, 14, or 7
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(calendar_id, reminder_days_before, task_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_task_links_calendar ON regulatory_calendar_task_links(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_task_links_task ON regulatory_calendar_task_links(task_id);

COMMENT ON TABLE regulatory_calendar IS 'Regulatory deadline calendar with auto-task creation at 30/14/7 days before deadlines';
COMMENT ON TABLE regulatory_calendar_task_links IS 'Tracks process_tasks created for regulatory calendar deadlines to prevent duplicates';
