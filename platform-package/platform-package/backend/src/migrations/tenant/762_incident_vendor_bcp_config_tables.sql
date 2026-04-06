-- Migration 762: Config/baseline tables for Class B modules (incident, vendor, bcp, asset)

-- ═══ INCIDENT MODULE CONFIG ═══

CREATE TABLE IF NOT EXISTS incident_severity_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity_code VARCHAR(20) NOT NULL UNIQUE,
  severity_label VARCHAR(50) NOT NULL,
  severity_level INT NOT NULL,
  sla_response_hours INT NOT NULL DEFAULT 4,
  sla_resolution_hours INT NOT NULL DEFAULT 24,
  escalation_role VARCHAR(50) DEFAULT 'admin',
  notification_template VARCHAR(50),
  color VARCHAR(7) DEFAULT '#ff0000',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code VARCHAR(50) NOT NULL UNIQUE,
  category_label VARCHAR(100) NOT NULL,
  parent_category_id UUID,
  default_severity VARCHAR(20),
  playbook_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_response_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name VARCHAR(100) NOT NULL,
  team_type VARCHAR(30) DEFAULT 'primary' CHECK (team_type IN ('primary','escalation','executive','external')),
  members JSONB DEFAULT '[]',
  on_call_schedule JSONB DEFAULT '{}',
  notification_channels TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(50) NOT NULL UNIQUE,
  template_name VARCHAR(100) NOT NULL,
  subject_template TEXT,
  body_template TEXT,
  channels TEXT[] DEFAULT '{email}',
  trigger_event VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ VENDOR MODULE CONFIG ═══

CREATE TABLE IF NOT EXISTS vendor_tier_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_code VARCHAR(20) NOT NULL UNIQUE,
  tier_label VARCHAR(50) NOT NULL,
  tier_level INT NOT NULL,
  review_frequency_days INT DEFAULT 365,
  due_diligence_required BOOLEAN DEFAULT TRUE,
  questionnaire_required BOOLEAN DEFAULT TRUE,
  sla_assessment_days INT DEFAULT 30,
  risk_threshold_score INT DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_questionnaire_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(50) NOT NULL UNIQUE,
  template_name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  questions JSONB DEFAULT '[]',
  scoring_model JSONB DEFAULT '{}',
  tier_codes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(64) DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_due_diligence_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_code VARCHAR(50) NOT NULL UNIQUE,
  checklist_name VARCHAR(200) NOT NULL,
  items JSONB DEFAULT '[]',
  tier_codes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ BCP MODULE CONFIG ═══

CREATE TABLE IF NOT EXISTS bcp_bia_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(50) NOT NULL UNIQUE,
  template_name VARCHAR(200) NOT NULL,
  description TEXT,
  impact_categories JSONB DEFAULT '["financial","operational","regulatory","reputational"]',
  time_frames JSONB DEFAULT '["1h","4h","8h","24h","48h","1w","2w","1m"]',
  questions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bcp_rto_rpo_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_category VARCHAR(50) NOT NULL UNIQUE,
  process_label VARCHAR(100) NOT NULL,
  default_rto_hours INT NOT NULL DEFAULT 24,
  default_rpo_hours INT NOT NULL DEFAULT 4,
  criticality VARCHAR(20) DEFAULT 'medium',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bcp_crisis_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name VARCHAR(100) NOT NULL,
  team_type VARCHAR(30) DEFAULT 'crisis_management' CHECK (team_type IN ('crisis_management','emergency_response','business_recovery','communications','it_recovery')),
  members JSONB DEFAULT '[]',
  activation_criteria TEXT,
  communication_plan JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bcp_exercise_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_type VARCHAR(30) NOT NULL CHECK (exercise_type IN ('tabletop','walkthrough','simulation','full_test','notification_drill')),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  scheduled_date DATE,
  frequency_days INT DEFAULT 365,
  plan_id UUID,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled','postponed')),
  results JSONB DEFAULT '{}',
  lessons_learned TEXT,
  created_by VARCHAR(64) DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ ASSET MODULE CONFIG ═══

CREATE TABLE IF NOT EXISTS asset_classification_scheme (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classification_code VARCHAR(30) NOT NULL UNIQUE,
  classification_label VARCHAR(100) NOT NULL,
  classification_level INT NOT NULL,
  description TEXT,
  handling_requirements TEXT,
  access_controls TEXT,
  color VARCHAR(7) DEFAULT '#000000',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_ownership_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type VARCHAR(50) NOT NULL,
  default_owner_role VARCHAR(50),
  default_custodian_role VARCHAR(50),
  review_frequency_days INT DEFAULT 365,
  classification_required BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(asset_type)
);
