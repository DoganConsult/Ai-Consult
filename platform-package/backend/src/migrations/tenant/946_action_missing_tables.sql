-- ============================================================
-- Migration 946: Action Module — Missing Tables (MP-17)
-- Owner: Module:Action
-- Tables: 13 new tables
-- ============================================================

CREATE TABLE IF NOT EXISTS action_items (
  action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_code VARCHAR(100), title VARCHAR(500) NOT NULL, description TEXT,
  source_module VARCHAR(100), source_entity_type VARCHAR(100), source_entity_id UUID,
  action_type VARCHAR(50) DEFAULT 'corrective' CHECK (action_type IN ('corrective','preventive','improvement','investigative','monitoring')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  status VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','overdue','cancelled','on_hold','verified')),
  owner_user_id VARCHAR(64), due_date DATE, completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64), updated_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS action_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES action_items(action_id) ON DELETE CASCADE,
  assigned_to VARCHAR(64) NOT NULL, assigned_by VARCHAR(64),
  role VARCHAR(50) DEFAULT 'assignee' CHECK (role IN ('assignee','reviewer','verifier','observer')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(), accepted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_categories (
  category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code VARCHAR(100) UNIQUE, category_name VARCHAR(200) NOT NULL,
  parent_id UUID REFERENCES action_categories(category_id),
  sort_order INT DEFAULT 0, is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS action_comments (
  comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES action_items(action_id) ON DELETE CASCADE,
  author_id VARCHAR(64) NOT NULL, content TEXT NOT NULL, is_internal BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS action_dependencies (
  dependency_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES action_items(action_id) ON DELETE CASCADE,
  depends_on_action_id UUID NOT NULL REFERENCES action_items(action_id),
  dependency_type VARCHAR(30) DEFAULT 'blocks' CHECK (dependency_type IN ('blocks','requires','related')),
  metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (action_id, depends_on_action_id)
);

CREATE TABLE IF NOT EXISTS action_evidence_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES action_items(action_id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL, link_type VARCHAR(50) DEFAULT 'supports',
  metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS action_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES action_items(action_id) ON DELETE CASCADE,
  field_changed VARCHAR(100), old_value TEXT, new_value TEXT,
  changed_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES action_items(action_id),
  notification_type VARCHAR(50) CHECK (notification_type IN ('assigned','due_soon','overdue','completed','escalated','comment')),
  recipient_user_id VARCHAR(64), sent_at TIMESTAMPTZ, read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_priorities (
  priority_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority_code VARCHAR(50) UNIQUE, priority_name VARCHAR(100) NOT NULL,
  sort_order INT DEFAULT 0, color VARCHAR(30), sla_hours INT,
  is_active BOOLEAN DEFAULT TRUE, metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_recurrence_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES action_items(action_id),
  recurrence_type VARCHAR(30) CHECK (recurrence_type IN ('daily','weekly','monthly','quarterly','annually','custom')),
  cron_expression VARCHAR(100), next_due_date DATE,
  is_active BOOLEAN DEFAULT TRUE, max_occurrences INT,
  metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_status_transitions (
  transition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES action_items(action_id) ON DELETE CASCADE,
  from_status VARCHAR(30), to_status VARCHAR(30) NOT NULL,
  transitioned_by VARCHAR(64) NOT NULL, reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  description TEXT, default_priority VARCHAR(20) DEFAULT 'medium',
  default_due_days INT, checklist JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE, metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS action_time_tracking (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES action_items(action_id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL, hours_spent NUMERIC(6,2) NOT NULL,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE, notes TEXT,
  metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_audit_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL, event VARCHAR(100) NOT NULL,
  actor_id VARCHAR(64) NOT NULL, details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_action_items_owner ON action_items (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_action_items_due ON action_items (due_date) WHERE status NOT IN ('completed','cancelled');
CREATE INDEX IF NOT EXISTS idx_action_assignments_action ON action_assignments (action_id);
CREATE INDEX IF NOT EXISTS idx_action_assignments_user ON action_assignments (assigned_to);
CREATE INDEX IF NOT EXISTS idx_action_comments_action ON action_comments (action_id);
CREATE INDEX IF NOT EXISTS idx_action_history_action ON action_history (action_id);
CREATE INDEX IF NOT EXISTS idx_action_audit_action ON action_audit_log (action_id);
