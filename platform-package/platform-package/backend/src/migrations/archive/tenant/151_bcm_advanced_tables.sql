-- ============================================
-- Tenant Migration 151: BCM Advanced Tables
-- BIA wizard, BCP exercises, crisis communication,
-- recovery strategies, dependency maps, maturity assessment
-- ============================================

-- ═══════════════════════════════════════════════
-- A. BUSINESS IMPACT ANALYSIS (BIA)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bia_assessments (
  bia_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               VARCHAR(500) NOT NULL,
  description         TEXT,
  status              VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_progress','review','approved','archived')),
  assessment_type     VARCHAR(30) NOT NULL DEFAULT 'standard'
    CHECK (assessment_type IN ('standard','rapid','comprehensive','regulatory')),
  scope               TEXT,
  department_id       UUID,
  business_unit_id    UUID,
  assessor_id         VARCHAR(64),
  reviewer_id         VARCHAR(64),
  approved_by         VARCHAR(64),
  approved_at         TIMESTAMPTZ,
  valid_until         DATE,
  rto_hours           NUMERIC,
  rpo_hours           NUMERIC,
  mtpd_hours          NUMERIC,
  criticality_rating  VARCHAR(20) DEFAULT 'medium'
    CHECK (criticality_rating IN ('low','medium','high','critical','vital')),
  financial_impact    JSONB DEFAULT '{}',
  operational_impact  JSONB DEFAULT '{}',
  reputational_impact JSONB DEFAULT '{}',
  regulatory_impact   JSONB DEFAULT '{}',
  dependencies        JSONB DEFAULT '[]',
  resources_required  JSONB DEFAULT '[]',
  wizard_state        JSONB DEFAULT '{}',
  wizard_step         INT DEFAULT 0,
  attachments         JSONB DEFAULT '[]',
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bia_status
  ON bia_assessments(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bia_dept
  ON bia_assessments(department_id) WHERE department_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bia_bu
  ON bia_assessments(business_unit_id) WHERE business_unit_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bia_criticality
  ON bia_assessments(criticality_rating) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bia_assessor
  ON bia_assessments(assessor_id) WHERE assessor_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS bia_process_impacts (
  impact_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bia_id              UUID NOT NULL REFERENCES bia_assessments(bia_id) ON DELETE CASCADE,
  process_name        VARCHAR(500) NOT NULL,
  process_owner       VARCHAR(64),
  criticality         VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (criticality IN ('low','medium','high','critical','vital')),
  rto_hours           NUMERIC,
  rpo_hours           NUMERIC,
  mtpd_hours          NUMERIC,
  peak_periods        JSONB DEFAULT '[]',
  impact_0h           JSONB DEFAULT '{}',
  impact_4h           JSONB DEFAULT '{}',
  impact_24h          JSONB DEFAULT '{}',
  impact_72h          JSONB DEFAULT '{}',
  impact_1w           JSONB DEFAULT '{}',
  workaround          TEXT,
  min_staff_count     INT,
  min_resources       JSONB DEFAULT '[]',
  upstream_deps       JSONB DEFAULT '[]',
  downstream_deps     JSONB DEFAULT '[]',
  display_order       INT DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bia_process_bia
  ON bia_process_impacts(bia_id);
CREATE INDEX IF NOT EXISTS idx_bia_process_criticality
  ON bia_process_impacts(criticality);


-- ═══════════════════════════════════════════════
-- B. BCP EXERCISES / DR TESTS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bcp_exercises (
  exercise_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bcp_plan_id       UUID,
  title             VARCHAR(500) NOT NULL,
  exercise_type     VARCHAR(40) NOT NULL DEFAULT 'tabletop'
    CHECK (exercise_type IN ('tabletop','walkthrough','simulation','full_scale','technical_drill','call_tree')),
  status            VARCHAR(30) NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','scheduled','in_progress','completed','cancelled','deferred')),
  scenario          TEXT,
  objectives        JSONB DEFAULT '[]',
  scope             TEXT,
  facilitator_id    VARCHAR(64),
  scheduled_date    DATE,
  actual_start      TIMESTAMPTZ,
  actual_end        TIMESTAMPTZ,
  duration_hours    NUMERIC,
  participants      JSONB DEFAULT '[]',
  observers         JSONB DEFAULT '[]',
  inject_sequence   JSONB DEFAULT '[]',
  results_summary   TEXT,
  rto_achieved      BOOLEAN,
  rpo_achieved      BOOLEAN,
  actual_rto_hours  NUMERIC,
  actual_rpo_hours  NUMERIC,
  score             NUMERIC,
  max_score         NUMERIC DEFAULT 100,
  pass_threshold    NUMERIC DEFAULT 70,
  passed            BOOLEAN,
  gaps_identified   JSONB DEFAULT '[]',
  lessons_learned   JSONB DEFAULT '[]',
  corrective_actions JSONB DEFAULT '[]',
  next_exercise_date DATE,
  attachments       JSONB DEFAULT '[]',
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bcp_exercise_plan
  ON bcp_exercises(bcp_plan_id) WHERE bcp_plan_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bcp_exercise_status
  ON bcp_exercises(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bcp_exercise_type
  ON bcp_exercises(exercise_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bcp_exercise_scheduled
  ON bcp_exercises(scheduled_date) WHERE scheduled_date IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS bcp_exercise_results (
  result_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id       UUID NOT NULL REFERENCES bcp_exercises(exercise_id) ON DELETE CASCADE,
  objective_ref     VARCHAR(100),
  result_type       VARCHAR(30) NOT NULL DEFAULT 'observation'
    CHECK (result_type IN ('observation','gap','success','recommendation','action_item')),
  description       TEXT NOT NULL,
  severity          VARCHAR(20) DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  assigned_to       VARCHAR(64),
  due_date          DATE,
  resolution_status VARCHAR(30) DEFAULT 'open'
    CHECK (resolution_status IN ('open','in_progress','resolved','accepted','deferred')),
  resolved_at       TIMESTAMPTZ,
  resolution_notes  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bcp_result_exercise
  ON bcp_exercise_results(exercise_id);
CREATE INDEX IF NOT EXISTS idx_bcp_result_status
  ON bcp_exercise_results(resolution_status) WHERE resolution_status != 'resolved';


-- ═══════════════════════════════════════════════
-- C. CRISIS COMMUNICATION
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS crisis_comm_plans (
  plan_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             VARCHAR(500) NOT NULL,
  description       TEXT,
  crisis_type       VARCHAR(60),
  status            VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','activated','deactivated','archived')),
  activation_criteria JSONB DEFAULT '[]',
  escalation_matrix   JSONB DEFAULT '[]',
  spokesperson_primary   VARCHAR(64),
  spokesperson_backup    VARCHAR(64),
  internal_channels      JSONB DEFAULT '[]',
  external_channels      JSONB DEFAULT '[]',
  notification_templates JSONB DEFAULT '[]',
  stakeholder_groups     JSONB DEFAULT '[]',
  media_guidelines       TEXT,
  social_media_protocol  TEXT,
  holding_statements     JSONB DEFAULT '[]',
  review_frequency_days  INT DEFAULT 180,
  last_reviewed_at       TIMESTAMPTZ,
  next_review_date       DATE,
  approved_by            VARCHAR(64),
  approved_at            TIMESTAMPTZ,
  attachments            JSONB DEFAULT '[]',
  metadata               JSONB DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crisis_comm_status
  ON crisis_comm_plans(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crisis_comm_type
  ON crisis_comm_plans(crisis_type) WHERE crisis_type IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS crisis_comm_activations (
  activation_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id           UUID NOT NULL REFERENCES crisis_comm_plans(plan_id) ON DELETE CASCADE,
  incident_id       UUID,
  activated_by      VARCHAR(64) NOT NULL,
  activated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at    TIMESTAMPTZ,
  deactivated_by    VARCHAR(64),
  status            VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','monitoring','stood_down','closed')),
  notifications_sent JSONB DEFAULT '[]',
  timeline          JSONB DEFAULT '[]',
  post_crisis_review TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crisis_activation_plan
  ON crisis_comm_activations(plan_id);
CREATE INDEX IF NOT EXISTS idx_crisis_activation_status
  ON crisis_comm_activations(status) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS crisis_notification_tree (
  node_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id           UUID NOT NULL REFERENCES crisis_comm_plans(plan_id) ON DELETE CASCADE,
  parent_node_id    UUID REFERENCES crisis_notification_tree(node_id) ON DELETE SET NULL,
  contact_type      VARCHAR(30) NOT NULL DEFAULT 'individual'
    CHECK (contact_type IN ('individual','team','department','external','group')),
  contact_id        VARCHAR(64),
  contact_name      VARCHAR(255) NOT NULL,
  contact_role      VARCHAR(100),
  contact_channels  JSONB DEFAULT '[]',
  escalation_order  INT NOT NULL DEFAULT 0,
  sla_minutes       INT DEFAULT 30,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crisis_tree_plan
  ON crisis_notification_tree(plan_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_crisis_tree_parent
  ON crisis_notification_tree(parent_node_id) WHERE parent_node_id IS NOT NULL;


-- ═══════════════════════════════════════════════
-- D. RECOVERY STRATEGIES
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bcm_recovery_strategies (
  strategy_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             VARCHAR(500) NOT NULL,
  description       TEXT,
  strategy_type     VARCHAR(40) NOT NULL DEFAULT 'process'
    CHECK (strategy_type IN ('process','technology','people','facility','supplier','data','communication')),
  status            VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','proposed','approved','implemented','tested','retired')),
  bia_id            UUID REFERENCES bia_assessments(bia_id),
  bcp_plan_id       UUID,
  target_rto_hours  NUMERIC,
  target_rpo_hours  NUMERIC,
  cost_estimate     JSONB DEFAULT '{}',
  resources_needed  JSONB DEFAULT '[]',
  prerequisites     JSONB DEFAULT '[]',
  implementation_steps JSONB DEFAULT '[]',
  activation_procedure TEXT,
  owner_id          VARCHAR(64),
  approved_by       VARCHAR(64),
  approved_at       TIMESTAMPTZ,
  last_tested_at    TIMESTAMPTZ,
  test_result       VARCHAR(20)
    CHECK (test_result IS NULL OR test_result IN ('pass','fail','partial','not_tested')),
  attachments       JSONB DEFAULT '[]',
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recovery_strategy_type
  ON bcm_recovery_strategies(strategy_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recovery_strategy_status
  ON bcm_recovery_strategies(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recovery_strategy_bia
  ON bcm_recovery_strategies(bia_id) WHERE bia_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recovery_strategy_plan
  ON bcm_recovery_strategies(bcp_plan_id) WHERE bcp_plan_id IS NOT NULL AND deleted_at IS NULL;


-- ═══════════════════════════════════════════════
-- E. BCP PLAN ACTIVATION
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bcp_activations (
  activation_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bcp_plan_id       UUID NOT NULL,
  incident_id       UUID,
  title             VARCHAR(500),
  status            VARCHAR(30) NOT NULL DEFAULT 'activated'
    CHECK (status IN ('activated','executing','monitoring','stood_down','deactivated','post_review')),
  activated_by      VARCHAR(64) NOT NULL,
  activated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at    TIMESTAMPTZ,
  deactivated_by    VARCHAR(64),
  activation_reason TEXT,
  command_center    JSONB DEFAULT '{}',
  recovery_steps    JSONB DEFAULT '[]',
  communications_log JSONB DEFAULT '[]',
  resource_allocation JSONB DEFAULT '[]',
  status_updates    JSONB DEFAULT '[]',
  actual_rto_hours  NUMERIC,
  actual_rpo_hours  NUMERIC,
  post_activation_review TEXT,
  lessons_learned   JSONB DEFAULT '[]',
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bcp_activation_plan
  ON bcp_activations(bcp_plan_id);
CREATE INDEX IF NOT EXISTS idx_bcp_activation_status
  ON bcp_activations(status) WHERE status IN ('activated','executing','monitoring');
CREATE INDEX IF NOT EXISTS idx_bcp_activation_incident
  ON bcp_activations(incident_id) WHERE incident_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS bcp_recovery_step_tracking (
  step_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id     UUID NOT NULL REFERENCES bcp_activations(activation_id) ON DELETE CASCADE,
  strategy_id       UUID REFERENCES bcm_recovery_strategies(strategy_id),
  step_number       INT NOT NULL,
  title             VARCHAR(500) NOT NULL,
  description       TEXT,
  assigned_to       VARCHAR(64),
  assigned_team_id  UUID,
  status            VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','failed','skipped','blocked')),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  target_duration_mins INT,
  actual_duration_mins INT,
  blockers          JSONB DEFAULT '[]',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_step_activation
  ON bcp_recovery_step_tracking(activation_id);
CREATE INDEX IF NOT EXISTS idx_recovery_step_status
  ON bcp_recovery_step_tracking(status) WHERE status NOT IN ('completed','skipped');


-- ═══════════════════════════════════════════════
-- F. DEPENDENCY MAPPING
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bcm_dependency_maps (
  map_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             VARCHAR(500) NOT NULL,
  description       TEXT,
  map_type          VARCHAR(40) NOT NULL DEFAULT 'process'
    CHECK (map_type IN ('process','technology','people','supplier','facility','data','service')),
  status            VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','under_review','archived')),
  owner_id          VARCHAR(64),
  last_reviewed_at  TIMESTAMPTZ,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dependency_map_type
  ON bcm_dependency_maps(map_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dependency_map_status
  ON bcm_dependency_maps(status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS bcm_dependency_nodes (
  node_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id            UUID NOT NULL REFERENCES bcm_dependency_maps(map_id) ON DELETE CASCADE,
  node_type         VARCHAR(40) NOT NULL,
  node_name         VARCHAR(500) NOT NULL,
  node_ref_id       VARCHAR(100),
  criticality       VARCHAR(20) DEFAULT 'medium'
    CHECK (criticality IN ('low','medium','high','critical')),
  rto_hours         NUMERIC,
  owner_id          VARCHAR(64),
  metadata          JSONB DEFAULT '{}',
  position_x        NUMERIC,
  position_y        NUMERIC,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dependency_node_map
  ON bcm_dependency_nodes(map_id);

CREATE TABLE IF NOT EXISTS bcm_dependency_edges (
  edge_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id            UUID NOT NULL REFERENCES bcm_dependency_maps(map_id) ON DELETE CASCADE,
  source_node_id    UUID NOT NULL REFERENCES bcm_dependency_nodes(node_id) ON DELETE CASCADE,
  target_node_id    UUID NOT NULL REFERENCES bcm_dependency_nodes(node_id) ON DELETE CASCADE,
  dependency_type   VARCHAR(30) NOT NULL DEFAULT 'depends_on'
    CHECK (dependency_type IN ('depends_on','provides_to','backup_for','shared_resource','feeds_into')),
  criticality       VARCHAR(20) DEFAULT 'medium'
    CHECK (criticality IN ('low','medium','high','critical')),
  latency_tolerance_mins INT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dependency_edge_map
  ON bcm_dependency_edges(map_id);
CREATE INDEX IF NOT EXISTS idx_dependency_edge_source
  ON bcm_dependency_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_dependency_edge_target
  ON bcm_dependency_edges(target_node_id);


-- ═══════════════════════════════════════════════
-- G. BCM MATURITY ASSESSMENT
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bcm_maturity_assessments (
  assessment_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             VARCHAR(500) NOT NULL,
  framework         VARCHAR(60) NOT NULL DEFAULT 'ISO22301'
    CHECK (framework IN ('ISO22301','BCI_GPG','NIST','CUSTOM','NCA_BCMS')),
  status            VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_progress','completed','archived')),
  assessor_id       VARCHAR(64),
  assessment_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_score     NUMERIC,
  overall_level     VARCHAR(30),
  domain_scores     JSONB DEFAULT '[]',
  strengths         JSONB DEFAULT '[]',
  weaknesses        JSONB DEFAULT '[]',
  recommendations   JSONB DEFAULT '[]',
  target_level      VARCHAR(30),
  target_date       DATE,
  previous_assessment_id UUID REFERENCES bcm_maturity_assessments(assessment_id),
  improvement_delta NUMERIC,
  attachments       JSONB DEFAULT '[]',
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bcm_maturity_status
  ON bcm_maturity_assessments(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bcm_maturity_framework
  ON bcm_maturity_assessments(framework) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bcm_maturity_date
  ON bcm_maturity_assessments(assessment_date DESC) WHERE deleted_at IS NULL;


-- ═══════════════════════════════════════════════
-- H. BCM MODULE AUDIT LOG
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bcm_audit_log (
  log_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type      VARCHAR(40)  NOT NULL,
  entity_id        UUID NOT NULL,
  action           VARCHAR(40)  NOT NULL,
  actor_id         VARCHAR(64),
  actor_role       VARCHAR(60),
  before_state     JSONB,
  after_state      JSONB,
  change_summary   TEXT,
  ip_address       VARCHAR(45),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bcm_audit_entity
  ON bcm_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_bcm_audit_actor
  ON bcm_audit_log(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bcm_audit_created
  ON bcm_audit_log(created_at DESC);


-- ═══════════════════════════════════════════════
-- I. EXTEND bcp_plans WITH NEW COLUMNS
-- ═══════════════════════════════════════════════

ALTER TABLE bcp_plans ADD COLUMN IF NOT EXISTS owner_team_id     UUID;
ALTER TABLE bcp_plans ADD COLUMN IF NOT EXISTS owner_dept_id     UUID;
ALTER TABLE bcp_plans ADD COLUMN IF NOT EXISTS bia_id            UUID;
ALTER TABLE bcp_plans ADD COLUMN IF NOT EXISTS maturity_level    VARCHAR(30);
ALTER TABLE bcp_plans ADD COLUMN IF NOT EXISTS last_exercise_at  TIMESTAMPTZ;
ALTER TABLE bcp_plans ADD COLUMN IF NOT EXISTS next_exercise_date DATE;
ALTER TABLE bcp_plans ADD COLUMN IF NOT EXISTS review_frequency_days INT DEFAULT 365;
ALTER TABLE bcp_plans ADD COLUMN IF NOT EXISTS next_review_date  DATE;

CREATE INDEX IF NOT EXISTS idx_bcp_plans_owner_team ON bcp_plans(owner_team_id) WHERE owner_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bcp_plans_owner_dept ON bcp_plans(owner_dept_id) WHERE owner_dept_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bcp_plans_bia        ON bcp_plans(bia_id) WHERE bia_id IS NOT NULL;


COMMENT ON TABLE bia_assessments IS 'Business Impact Analysis records with wizard-state support for guided completion';
COMMENT ON TABLE bia_process_impacts IS 'Per-process impact analysis within a BIA — includes time-phased impact data';
COMMENT ON TABLE bcp_exercises IS 'BCP/DR exercise and test records with results tracking';
COMMENT ON TABLE crisis_comm_plans IS 'Crisis communication plans with notification trees and activation protocols';
COMMENT ON TABLE bcm_recovery_strategies IS 'Recovery strategies linked to BIA and BCP plans';
COMMENT ON TABLE bcp_activations IS 'BCP plan activation records with step-by-step recovery tracking';
COMMENT ON TABLE bcm_dependency_maps IS 'Visual dependency maps for business process/technology/supplier chains';
COMMENT ON TABLE bcm_maturity_assessments IS 'BCM program maturity assessments against ISO22301/BCI/NCA frameworks';
COMMENT ON TABLE bcm_audit_log IS 'Module-specific audit trail for all BCM-related entities';
