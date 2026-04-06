-- ============================================================
-- Migration 949: Incident Module — Missing Tables (MP-13)
-- Owner: Module:Incident
-- Tables: 9 new tables
-- ============================================================

CREATE TABLE IF NOT EXISTS incident_classifications (
  classification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classification_code VARCHAR(100) UNIQUE, classification_name VARCHAR(200) NOT NULL,
  category VARCHAR(100), severity_default VARCHAR(20) DEFAULT 'medium',
  requires_notification BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE, sort_order INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS incident_response_plans (
  plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  classification_id UUID REFERENCES incident_classifications(classification_id),
  severity_threshold VARCHAR(20) DEFAULT 'high',
  steps JSONB NOT NULL DEFAULT '[]', escalation_chain JSONB DEFAULT '[]',
  notification_template VARCHAR(200),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS incident_containment_actions (
  action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL,
  action_type VARCHAR(50) DEFAULT 'containment' CHECK (action_type IN ('containment','eradication','recovery','mitigation')),
  title VARCHAR(500) NOT NULL, description TEXT,
  assigned_to VARCHAR(64),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','failed','cancelled')),
  started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  effectiveness VARCHAR(30) CHECK (effectiveness IN ('effective','partially_effective','ineffective')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS incident_escalations (
  escalation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL,
  escalation_level INT NOT NULL DEFAULT 1,
  escalated_to VARCHAR(64) NOT NULL, escalated_by VARCHAR(64),
  reason TEXT, acknowledged_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_timeline_entries (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL,
  entry_type VARCHAR(50) DEFAULT 'event' CHECK (entry_type IN ('event','action','communication','escalation','status_change','evidence','note')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT NOT NULL, actor_id VARCHAR(64),
  is_key_event BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_root_cause_analysis (
  rca_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL,
  method VARCHAR(50) DEFAULT 'five_whys' CHECK (method IN ('five_whys','fishbone','fault_tree','timeline','barrier','bowtie')),
  findings JSONB NOT NULL DEFAULT '{}',
  root_causes JSONB DEFAULT '[]', contributing_factors JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  status VARCHAR(30) DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','reviewed')),
  completed_by VARCHAR(64), completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS incident_stakeholders (
  stakeholder_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL,
  user_id VARCHAR(64), stakeholder_name VARCHAR(200),
  role VARCHAR(50) DEFAULT 'informed' CHECK (role IN ('commander','responder','investigator','communicator','informed','affected_party')),
  notification_preference VARCHAR(30) DEFAULT 'email',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS incident_near_misses (
  near_miss_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL, description TEXT,
  classification_id UUID REFERENCES incident_classifications(classification_id),
  potential_severity VARCHAR(20) DEFAULT 'medium',
  reported_by VARCHAR(64) NOT NULL, department_id UUID,
  preventive_actions JSONB DEFAULT '[]',
  status VARCHAR(30) DEFAULT 'reported' CHECK (status IN ('reported','under_review','addressed','closed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS incident_regulatory_reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL,
  authority_name VARCHAR(200) NOT NULL, report_type VARCHAR(50) DEFAULT 'notification',
  submitted_at TIMESTAMPTZ, due_date DATE,
  acknowledgement_ref VARCHAR(200),
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','submitted','acknowledged','closed')),
  content JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_incident_class_active ON incident_classifications (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incident_response_active ON incident_response_plans (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incident_containment_incident ON incident_containment_actions (incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_escalation_incident ON incident_escalations (incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_timeline_incident ON incident_timeline_entries (incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_timeline_ts ON incident_timeline_entries (timestamp);
CREATE INDEX IF NOT EXISTS idx_incident_rca_incident ON incident_root_cause_analysis (incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_stakeholder_incident ON incident_stakeholders (incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_near_miss_status ON incident_near_misses (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incident_reg_reports_incident ON incident_regulatory_reports (incident_id);
