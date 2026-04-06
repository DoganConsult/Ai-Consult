CREATE TABLE IF NOT EXISTS control_tests (
  test_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id VARCHAR(100) NOT NULL REFERENCES controls(control_id) ON DELETE CASCADE,
  test_result VARCHAR(50) NOT NULL DEFAULT 'pending',
  tester VARCHAR(255),
  notes TEXT DEFAULT '',
  evidence_ref UUID,
  tested_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_control_tests_control_id ON control_tests(control_id);
CREATE INDEX IF NOT EXISTS idx_control_tests_tested_at ON control_tests(tested_at DESC);

CREATE TABLE IF NOT EXISTS control_failures (
  failure_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id VARCHAR(100) NOT NULL REFERENCES controls(control_id) ON DELETE CASCADE,
  failure_type VARCHAR(100) NOT NULL DEFAULT 'test_failure',
  severity VARCHAR(50) NOT NULL DEFAULT 'high',
  description TEXT DEFAULT '',
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT DEFAULT '',
  resolved_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_control_failures_control_id ON control_failures(control_id);
CREATE INDEX IF NOT EXISTS idx_control_failures_resolved ON control_failures(resolved_at) WHERE resolved_at IS NULL;

CREATE TABLE IF NOT EXISTS control_actions (
  action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id VARCHAR(100) NOT NULL REFERENCES controls(control_id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT DEFAULT '',
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  assigned_to VARCHAR(255),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_control_actions_control_id ON control_actions(control_id);
CREATE INDEX IF NOT EXISTS idx_control_actions_status ON control_actions(status);

ALTER TABLE controls ADD COLUMN IF NOT EXISTS test_status VARCHAR(50) DEFAULT 'not_tested';
ALTER TABLE controls ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS test_frequency VARCHAR(50) DEFAULT 'manual';
ALTER TABLE controls ADD COLUMN IF NOT EXISTS is_sox BOOLEAN DEFAULT FALSE;
