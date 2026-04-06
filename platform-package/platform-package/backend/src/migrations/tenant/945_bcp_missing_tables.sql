-- ============================================================
-- Migration 945: BCP Module — Missing Tables (MP-22)
-- Owner: Module:BCP
-- Spec: DOS-AIO-Specs/module-patch-22-bcp-end-to-end.md §5
-- Tables: 27 new tables
-- ============================================================

CREATE TABLE IF NOT EXISTS bcp_plans (
  plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'business_continuity'
    CHECK (plan_type IN ('business_continuity','disaster_recovery','crisis_management','pandemic','it_recovery')),
  owner_user_id VARCHAR(64) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','under_review','approved','active','expired','retired')),
  effective_date DATE,
  review_date DATE,
  version VARCHAR(20) DEFAULT '1.0',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by VARCHAR(64), updated_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_scenarios (
  scenario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES bcp_plans(plan_id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  scenario_type VARCHAR(50) NOT NULL DEFAULT 'disruption'
    CHECK (scenario_type IN ('disruption','disaster','cyber','pandemic','supply_chain','natural','infrastructure')),
  likelihood VARCHAR(20) DEFAULT 'medium' CHECK (likelihood IN ('very_high','high','medium','low','very_low')),
  impact VARCHAR(20) DEFAULT 'medium' CHECK (impact IN ('catastrophic','major','moderate','minor','negligible')),
  description TEXT,
  triggers JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_impact_analysis (
  analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES bcp_plans(plan_id),
  process_name VARCHAR(500) NOT NULL,
  department_id UUID,
  criticality VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (criticality IN ('critical','high','medium','low')),
  rto_hours INT, rpo_hours INT, mtpd_hours INT,
  financial_impact_per_day NUMERIC(15,2),
  dependencies JSONB DEFAULT '[]',
  workaround TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_recovery_objectives (
  objective_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES bcp_impact_analysis(analysis_id),
  objective_type VARCHAR(30) NOT NULL CHECK (objective_type IN ('rto','rpo','mtpd','custom')),
  target_value INT NOT NULL,
  unit VARCHAR(20) DEFAULT 'hours',
  current_capability INT,
  gap_hours INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_recovery_strategies (
  strategy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES bcp_plans(plan_id),
  scenario_id UUID REFERENCES bcp_scenarios(scenario_id),
  title VARCHAR(500) NOT NULL,
  strategy_type VARCHAR(50) DEFAULT 'alternative_site'
    CHECK (strategy_type IN ('alternative_site','cloud_failover','manual_workaround','vendor_backup','split_operations','do_nothing')),
  priority INT DEFAULT 0,
  estimated_cost NUMERIC(15,2),
  estimated_recovery_time_hours INT,
  steps JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_exercises (
  exercise_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES bcp_plans(plan_id),
  title VARCHAR(500) NOT NULL,
  exercise_type VARCHAR(50) NOT NULL DEFAULT 'tabletop'
    CHECK (exercise_type IN ('tabletop','walkthrough','simulation','full_scale','announced','unannounced')),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled','postponed')),
  participants_count INT DEFAULT 0,
  pass_rate NUMERIC(5,2),
  findings JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_test_results (
  result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES bcp_exercises(exercise_id) ON DELETE CASCADE,
  test_area VARCHAR(200) NOT NULL,
  outcome VARCHAR(30) NOT NULL CHECK (outcome IN ('pass','partial','fail','not_tested')),
  actual_recovery_time_hours INT,
  target_recovery_time_hours INT,
  observations TEXT,
  corrective_actions JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_communication_plans (
  comm_plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES bcp_plans(plan_id),
  title VARCHAR(500) NOT NULL,
  trigger_scenario VARCHAR(200),
  notification_chain JSONB NOT NULL DEFAULT '[]',
  escalation_matrix JSONB DEFAULT '{}',
  templates JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_contact_lists (
  contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comm_plan_id UUID REFERENCES bcp_communication_plans(comm_plan_id),
  contact_name VARCHAR(200) NOT NULL,
  role VARCHAR(100),
  phone VARCHAR(50), email VARCHAR(255), alternate_phone VARCHAR(50),
  priority_order INT DEFAULT 0,
  is_external BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_teams (
  team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES bcp_plans(plan_id),
  team_name VARCHAR(200) NOT NULL,
  team_type VARCHAR(50) DEFAULT 'response' CHECK (team_type IN ('response','recovery','crisis','communication','assessment','it_recovery')),
  leader_user_id VARCHAR(64),
  members JSONB DEFAULT '[]',
  responsibilities TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_stakeholders (
  stakeholder_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES bcp_plans(plan_id),
  stakeholder_name VARCHAR(200) NOT NULL,
  stakeholder_type VARCHAR(50) DEFAULT 'internal' CHECK (stakeholder_type IN ('internal','external','regulatory','vendor','customer')),
  contact_info JSONB DEFAULT '{}',
  interest_level VARCHAR(20) DEFAULT 'medium',
  communication_frequency VARCHAR(30) DEFAULT 'as_needed',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_activities (
  activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES bcp_plans(plan_id),
  exercise_id UUID REFERENCES bcp_exercises(exercise_id),
  title VARCHAR(500) NOT NULL,
  activity_type VARCHAR(50) DEFAULT 'task',
  assigned_to VARCHAR(64), due_date TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','overdue','cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES bcp_plans(plan_id),
  assessment_type VARCHAR(50) DEFAULT 'readiness' CHECK (assessment_type IN ('readiness','maturity','gap','capability','compliance')),
  assessor_user_id VARCHAR(64),
  overall_score NUMERIC(5,2),
  status VARCHAR(30) DEFAULT 'in_progress' CHECK (status IN ('planned','in_progress','completed','cancelled')),
  findings JSONB DEFAULT '[]', recommendations JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_assessment_items (
  item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES bcp_assessments(assessment_id) ON DELETE CASCADE,
  category VARCHAR(100), question TEXT NOT NULL,
  score NUMERIC(5,2), max_score NUMERIC(5,2) DEFAULT 5,
  evidence TEXT, notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bcp_dependency_maps (
  map_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES bcp_plans(plan_id),
  source_process VARCHAR(200) NOT NULL, target_process VARCHAR(200) NOT NULL,
  dependency_type VARCHAR(50) DEFAULT 'requires' CHECK (dependency_type IN ('requires','feeds','supports','blocks')),
  criticality VARCHAR(20) DEFAULT 'medium',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_documents (
  document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES bcp_plans(plan_id),
  title VARCHAR(500) NOT NULL, document_type VARCHAR(50) DEFAULT 'plan',
  file_url VARCHAR(2000), version VARCHAR(20) DEFAULT '1.0',
  status VARCHAR(30) DEFAULT 'current' CHECK (status IN ('current','archived','superseded')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_incidents (
  incident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES bcp_plans(plan_id),
  title VARCHAR(500) NOT NULL,
  incident_type VARCHAR(50), severity VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active','contained','resolved','closed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resolved_at TIMESTAMPTZ,
  impact_summary TEXT, response_actions JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_lessons_learned (
  lesson_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES bcp_exercises(exercise_id),
  incident_id UUID REFERENCES bcp_incidents(incident_id),
  category VARCHAR(100), description TEXT NOT NULL,
  impact VARCHAR(20) DEFAULT 'medium',
  recommendation TEXT, assigned_to VARCHAR(64),
  status VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open','in_progress','implemented','deferred')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_maturity_scores (
  score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES bcp_plans(plan_id),
  dimension VARCHAR(100) NOT NULL,
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 5),
  target_score NUMERIC(5,2), assessment_date DATE DEFAULT CURRENT_DATE,
  methodology VARCHAR(50) DEFAULT 'custom',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_resource_requirements (
  requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES bcp_plans(plan_id),
  strategy_id UUID REFERENCES bcp_recovery_strategies(strategy_id),
  resource_type VARCHAR(50) DEFAULT 'personnel' CHECK (resource_type IN ('personnel','technology','facility','financial','vendor','equipment')),
  description TEXT NOT NULL, quantity INT DEFAULT 1,
  estimated_cost NUMERIC(15,2), procurement_time_hours INT,
  status VARCHAR(30) DEFAULT 'identified' CHECK (status IN ('identified','approved','procured','available')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_review_cycles (
  cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES bcp_plans(plan_id),
  review_type VARCHAR(50) DEFAULT 'periodic',
  due_date DATE NOT NULL, completed_at TIMESTAMPTZ,
  reviewer_user_id VARCHAR(64),
  outcome VARCHAR(30) CHECK (outcome IN ('approved','changes_required','major_revision')),
  findings TEXT,
  status VARCHAR(30) DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','overdue')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_risk_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES bcp_plans(plan_id),
  scenario_id UUID REFERENCES bcp_scenarios(scenario_id),
  risk_id UUID NOT NULL,
  link_type VARCHAR(50) DEFAULT 'addresses',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_crisis_simulations (
  simulation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES bcp_exercises(exercise_id),
  scenario_id UUID REFERENCES bcp_scenarios(scenario_id),
  simulation_name VARCHAR(500) NOT NULL,
  started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'planned' CHECK (status IN ('planned','running','paused','completed','aborted')),
  injects JSONB DEFAULT '[]', timeline JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS bcp_timeline_entries (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES bcp_incidents(incident_id),
  simulation_id UUID REFERENCES bcp_crisis_simulations(simulation_id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entry_type VARCHAR(50) DEFAULT 'event',
  description TEXT NOT NULL, actor_id VARCHAR(64),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bcp_ai_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES bcp_plans(plan_id),
  run_type VARCHAR(50) DEFAULT 'impact_analysis',
  input JSONB DEFAULT '{}', output JSONB DEFAULT '{}',
  model_used VARCHAR(200), confidence NUMERIC(5,2),
  status VARCHAR(30) DEFAULT 'completed',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bcp_ai_recommendations (
  rec_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES bcp_ai_runs(run_id),
  recommendation_type VARCHAR(50), content TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium', confidence NUMERIC(5,2),
  accepted BOOLEAN, accepted_by VARCHAR(64), accepted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bcp_ai_feedback (
  feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rec_id UUID REFERENCES bcp_ai_recommendations(rec_id),
  user_id VARCHAR(64) NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bcp_audit_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID, entity_type VARCHAR(50), entity_id UUID,
  action VARCHAR(100) NOT NULL, actor_id VARCHAR(64) NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══ Indexes ═══
CREATE INDEX IF NOT EXISTS idx_bcp_plans_status ON bcp_plans (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bcp_scenarios_plan ON bcp_scenarios (plan_id);
CREATE INDEX IF NOT EXISTS idx_bcp_impact_plan ON bcp_impact_analysis (plan_id);
CREATE INDEX IF NOT EXISTS idx_bcp_exercises_plan ON bcp_exercises (plan_id);
CREATE INDEX IF NOT EXISTS idx_bcp_exercises_status ON bcp_exercises (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bcp_test_results_exercise ON bcp_test_results (exercise_id);
CREATE INDEX IF NOT EXISTS idx_bcp_activities_plan ON bcp_activities (plan_id);
CREATE INDEX IF NOT EXISTS idx_bcp_incidents_status ON bcp_incidents (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bcp_audit_plan ON bcp_audit_log (plan_id);
CREATE INDEX IF NOT EXISTS idx_bcp_audit_action ON bcp_audit_log (action);
