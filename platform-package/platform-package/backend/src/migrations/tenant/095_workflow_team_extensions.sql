-- Tenant Migration 095: Workflow Team Extensions + 44 GRC/Qiyas Workflow Templates
-- Extends workflow_steps with team routing, operation mode, SLA
-- Seeds 44 predefined workflow templates across 12 GRC domains

-- ── 0. Create workflow_steps if it doesn't exist ──────────────
CREATE TABLE IF NOT EXISTS workflow_steps (
  step_id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id           UUID          REFERENCES workflows(workflow_id) ON DELETE CASCADE,
  step_name             VARCHAR(255)  NOT NULL DEFAULT '',
  step_order            INT           NOT NULL DEFAULT 1,
  step_type             VARCHAR(50)   NOT NULL DEFAULT 'task',
  assignee_type         VARCHAR(30)   DEFAULT 'user',
  config                JSONB         NOT NULL DEFAULT '{}',
  status                VARCHAR(30)   NOT NULL DEFAULT 'pending',
  responsible_team_code VARCHAR(50),
  responsible_team_id   UUID          REFERENCES teams(team_id) ON DELETE SET NULL,
  operation_mode        VARCHAR(30)   NOT NULL DEFAULT 'human_only'
    CHECK (operation_mode IN ('human_only','hybrid_shadow','hybrid_active','autonomous','scheduled')),
  sla_minutes           INT,
  confidence_threshold  NUMERIC(3,2)  DEFAULT 0.85,
  escalation_team_code  VARCHAR(50),
  is_parallel_branch    BOOLEAN       NOT NULL DEFAULT FALSE,
  parallel_group_id     VARCHAR(100),
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

-- ── 1. Extend workflow_steps (idempotent — IF NOT EXISTS) ─────
ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS operation_mode          VARCHAR(30) NOT NULL DEFAULT 'human_only';
ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS responsible_team_code   VARCHAR(50);
ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS responsible_team_id     UUID REFERENCES teams(team_id) ON DELETE SET NULL;
ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS sla_minutes             INT;
ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS confidence_threshold    NUMERIC(3,2) DEFAULT 0.85;
ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS escalation_team_code    VARCHAR(50);
ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS is_parallel_branch      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS parallel_group_id       VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_wfs_team       ON workflow_steps(responsible_team_id)  WHERE responsible_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wfs_mode       ON workflow_steps(operation_mode)        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wfs_parallel   ON workflow_steps(parallel_group_id)    WHERE parallel_group_id IS NOT NULL;

-- ── 2. Ensure workflows template table exists ─────────────────
CREATE TABLE IF NOT EXISTS workflows (
  workflow_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  definition   JSONB        NOT NULL DEFAULT '{}',
  version      INT          NOT NULL DEFAULT 1,
  status       VARCHAR(50)  NOT NULL DEFAULT 'draft',
  created_by   VARCHAR(64)  NOT NULL DEFAULT 'system',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Deduplicate workflows by name before creating unique index (keep oldest row)
DELETE FROM workflows WHERE ctid NOT IN (
  SELECT MIN(ctid) FROM workflows GROUP BY name
);

DO $$
BEGIN
  CREATE UNIQUE INDEX uq_workflows_name ON workflows(name);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── 3. 44 Workflow Templates ──────────────────────────────────
INSERT INTO workflows (workflow_id, name, status, definition, created_by) VALUES

-- ════════ DOMAIN 1: GOVERNANCE (5 workflows) ════════
(gen_random_uuid(), 'WF-GOV-01: Policy Development & Approval', 'template', '{
  "domain":"governance","category":"policy","pattern":"sequential_handoff","sla_hours":168,
  "teams":["CYBER_GOV","ERM","EXEC_STRATEGY"],
  "steps":[
    {"seq":1,"team":"CYBER_GOV","action":"draft_policy","mode":"human_only","sla_h":24},
    {"seq":2,"team":"CYBER_GOV","action":"technical_review","mode":"hybrid_shadow","sla_h":48},
    {"seq":3,"team":"ERM","action":"risk_impact_review","mode":"hybrid_shadow","sla_h":24},
    {"seq":4,"team":"EXEC_STRATEGY","action":"final_approval","mode":"human_only","sla_h":72}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-GOV-02: Policy Exception Request', 'template', '{
  "domain":"governance","category":"exception","pattern":"sequential_handoff","sla_hours":120,
  "teams":["CYBER_GOV","ERM","EXEC_STRATEGY"],
  "steps":[
    {"seq":1,"team":"requester","action":"submit_exception_request","mode":"human_only","sla_h":0},
    {"seq":2,"team":"CYBER_GOV","action":"assess_exception","mode":"hybrid_shadow","sla_h":48},
    {"seq":3,"team":"ERM","action":"risk_rating","mode":"hybrid_shadow","sla_h":24},
    {"seq":4,"team":"EXEC_STRATEGY","action":"approve_or_reject","mode":"human_only","sla_h":48}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-GOV-03: Annual Policy Review', 'template', '{
  "domain":"governance","category":"review","pattern":"sequential_handoff","sla_hours":336,
  "trigger":"schedule_annual","teams":["CYBER_GOV","ERM","EXEC_STRATEGY"],
  "steps":[
    {"seq":1,"team":"CYBER_GOV","action":"policy_gap_analysis","mode":"hybrid_active","sla_h":72},
    {"seq":2,"team":"CYBER_GOV","action":"update_policy","mode":"human_only","sla_h":120},
    {"seq":3,"team":"ERM","action":"risk_alignment_check","mode":"hybrid_shadow","sla_h":48},
    {"seq":4,"team":"EXEC_STRATEGY","action":"board_approval","mode":"human_only","sla_h":96}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-GOV-04: Board GRC Reporting', 'template', '{
  "domain":"governance","category":"reporting","pattern":"hub_and_spoke","sla_hours":168,
  "trigger":"schedule_quarterly","teams":["ERM","CYBER_GOV","AUDIT","EXEC_STRATEGY"],
  "steps":[
    {"seq":1,"team":"ERM","action":"compile_risk_status","mode":"autonomous","sla_h":8,"parallel_group":"compile"},
    {"seq":1,"team":"CYBER_GOV","action":"compile_compliance_status","mode":"autonomous","sla_h":8,"parallel_group":"compile"},
    {"seq":1,"team":"AUDIT","action":"compile_audit_findings","mode":"autonomous","sla_h":8,"parallel_group":"compile"},
    {"seq":2,"team":"EXEC_STRATEGY","action":"draft_board_report","mode":"hybrid_shadow","sla_h":48},
    {"seq":3,"team":"EXEC_STRATEGY","action":"present_to_board","mode":"human_only","sla_h":24}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-GOV-05: GRC Framework Setup', 'template', '{
  "domain":"governance","category":"setup","pattern":"sequential_handoff","sla_hours":720,
  "teams":["EXEC_STRATEGY","CYBER_GOV","ERM"],
  "steps":[
    {"seq":1,"team":"EXEC_STRATEGY","action":"select_frameworks","mode":"human_only","sla_h":48},
    {"seq":2,"team":"CYBER_GOV","action":"control_mapping","mode":"hybrid_active","sla_h":240},
    {"seq":3,"team":"ERM","action":"risk_appetite_setting","mode":"human_only","sla_h":96},
    {"seq":4,"team":"EXEC_STRATEGY","action":"approve_framework_config","mode":"human_only","sla_h":72}
  ]
}'::jsonb, 'system'),

-- ════════ DOMAIN 2: RISK MANAGEMENT (6 workflows) ════════
(gen_random_uuid(), 'WF-RISK-01: Enterprise Risk Identification', 'template', '{
  "domain":"risk_management","category":"identification","pattern":"hub_and_spoke","sla_hours":336,
  "teams":["ERM","all_operational_teams"],
  "steps":[
    {"seq":1,"team":"ERM","action":"initiate_risk_survey","mode":"autonomous","sla_h":4},
    {"seq":2,"team":"all_teams","action":"submit_team_risks","mode":"human_only","sla_h":168},
    {"seq":3,"team":"ERM","action":"consolidate_risk_register","mode":"hybrid_active","sla_h":48},
    {"seq":4,"team":"ERM","action":"publish_risk_register","mode":"hybrid_shadow","sla_h":24}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-RISK-02: Risk Assessment & Scoring', 'template', '{
  "domain":"risk_management","category":"assessment","pattern":"sequential_handoff","sla_hours":120,
  "teams":["ERM","CYBER_GOV"],
  "steps":[
    {"seq":1,"team":"ERM","action":"identify_risk_context","mode":"hybrid_shadow","sla_h":24},
    {"seq":2,"team":"ERM","action":"score_likelihood_and_impact","mode":"hybrid_active","sla_h":24},
    {"seq":3,"team":"CYBER_GOV","action":"validate_cyber_risk_score","mode":"hybrid_shadow","sla_h":24},
    {"seq":4,"team":"ERM","action":"finalize_risk_record","mode":"human_only","sla_h":24},
    {"seq":5,"team":"ERM","action":"notify_risk_owners","mode":"autonomous","sla_h":2}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-RISK-03: Risk Treatment Planning', 'template', '{
  "domain":"risk_management","category":"treatment","pattern":"sequential_handoff","sla_hours":336,
  "teams":["ERM","owner_team","EXEC_STRATEGY"],
  "steps":[
    {"seq":1,"team":"ERM","action":"propose_treatment_options","mode":"hybrid_active","sla_h":48},
    {"seq":2,"team":"owner_team","action":"select_treatment_strategy","mode":"human_only","sla_h":72},
    {"seq":3,"team":"ERM","action":"create_treatment_plan","mode":"hybrid_active","sla_h":48},
    {"seq":4,"team":"EXEC_STRATEGY","action":"approve_treatment_budget","mode":"human_only","sla_h":96},
    {"seq":5,"team":"owner_team","action":"implement_treatment","mode":"human_only","sla_h":720}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-RISK-04: Risk Appetite Review', 'template', '{
  "domain":"risk_management","category":"governance","pattern":"sequential_handoff","sla_hours":336,
  "trigger":"schedule_annual","teams":["ERM","EXEC_STRATEGY"],
  "steps":[
    {"seq":1,"team":"ERM","action":"analyze_current_appetite_vs_exposure","mode":"hybrid_active","sla_h":72},
    {"seq":2,"team":"ERM","action":"propose_revised_appetite","mode":"hybrid_shadow","sla_h":48},
    {"seq":3,"team":"EXEC_STRATEGY","action":"board_approval_of_appetite","mode":"human_only","sla_h":120}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-RISK-05: KRI Threshold Breach Response', 'template', '{
  "domain":"risk_management","category":"monitoring","pattern":"escalation_chain","sla_hours":24,
  "trigger":"kri_threshold_breach","teams":["ERM","owner_team"],
  "steps":[
    {"seq":1,"team":"ERM","action":"kri_alert_notification","mode":"autonomous","sla_h":1},
    {"seq":2,"team":"owner_team","action":"acknowledge_kri_breach","mode":"human_only","sla_h":4},
    {"seq":3,"team":"owner_team","action":"initiate_risk_remediation","mode":"hybrid_shadow","sla_h":8},
    {"seq":4,"team":"ERM","action":"monitor_and_close_kri","mode":"hybrid_active","sla_h":168}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-RISK-06: Risk Register Periodic Review', 'template', '{
  "domain":"risk_management","category":"review","pattern":"hub_and_spoke","sla_hours":336,
  "trigger":"schedule_quarterly","teams":["ERM","all_teams"],
  "steps":[
    {"seq":1,"team":"ERM","action":"distribute_review_assignments","mode":"autonomous","sla_h":4},
    {"seq":2,"team":"all_teams","action":"review_and_update_owned_risks","mode":"human_only","sla_h":168},
    {"seq":3,"team":"ERM","action":"consolidate_updated_register","mode":"hybrid_active","sla_h":48},
    {"seq":4,"team":"EXEC_STRATEGY","action":"risk_status_sign_off","mode":"human_only","sla_h":48}
  ]
}'::jsonb, 'system'),

-- ════════ DOMAIN 3: COMPLIANCE & CONTROLS (7 workflows) ════════
(gen_random_uuid(), 'WF-COMP-01: Control Design & Implementation', 'template', '{
  "domain":"compliance","category":"control_lifecycle","pattern":"sequential_handoff","sla_hours":720,
  "teams":["CYBER_GOV","owner_team","AUDIT"],
  "steps":[
    {"seq":1,"team":"CYBER_GOV","action":"draft_control_design","mode":"hybrid_shadow","sla_h":48},
    {"seq":2,"team":"owner_team","action":"technical_feasibility_review","mode":"human_only","sla_h":72},
    {"seq":3,"team":"AUDIT","action":"design_effectiveness_review","mode":"human_only","sla_h":72},
    {"seq":4,"team":"owner_team","action":"implement_control","mode":"human_only","sla_h":480},
    {"seq":5,"team":"AUDIT","action":"implementation_verification","mode":"hybrid_active","sla_h":72}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-COMP-02: Control Operating Effectiveness Test', 'template', '{
  "domain":"compliance","category":"control_testing","pattern":"sequential_handoff","sla_hours":240,
  "teams":["AUDIT","owner_team","CYBER_GOV"],
  "steps":[
    {"seq":1,"team":"AUDIT","action":"plan_control_test_procedures","mode":"hybrid_shadow","sla_h":24},
    {"seq":2,"team":"AUDIT","action":"execute_test_procedures","mode":"hybrid_active","sla_h":120},
    {"seq":3,"team":"owner_team","action":"provide_requested_evidence","mode":"human_only","sla_h":48},
    {"seq":4,"team":"AUDIT","action":"document_test_findings","mode":"hybrid_shadow","sla_h":24},
    {"seq":5,"team":"CYBER_GOV","action":"review_test_results","mode":"human_only","sla_h":24}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-COMP-03: Control Deficiency Remediation', 'template', '{
  "domain":"compliance","category":"remediation","pattern":"sequential_handoff","sla_hours":720,
  "trigger":"control_test_fail","teams":["AUDIT","owner_team","CYBER_GOV"],
  "steps":[
    {"seq":1,"team":"AUDIT","action":"raise_deficiency_finding","mode":"autonomous","sla_h":4},
    {"seq":2,"team":"owner_team","action":"acknowledge_finding","mode":"human_only","sla_h":24},
    {"seq":3,"team":"owner_team","action":"create_remediation_plan","mode":"hybrid_shadow","sla_h":72},
    {"seq":4,"team":"CYBER_GOV","action":"approve_remediation_plan","mode":"human_only","sla_h":48},
    {"seq":5,"team":"owner_team","action":"implement_remediation","mode":"human_only","sla_h":480},
    {"seq":6,"team":"AUDIT","action":"verify_remediation_effectiveness","mode":"hybrid_active","sla_h":72}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-COMP-04: Compliance Gap Assessment', 'template', '{
  "domain":"compliance","category":"assessment","pattern":"hub_and_spoke","sla_hours":336,
  "teams":["CYBER_GOV","ERM","all_teams"],
  "steps":[
    {"seq":1,"team":"CYBER_GOV","action":"initiate_gap_assessment","mode":"autonomous","sla_h":4},
    {"seq":2,"team":"all_teams","action":"complete_gap_questionnaire","mode":"human_only","sla_h":168},
    {"seq":3,"team":"CYBER_GOV","action":"analyze_and_score_gaps","mode":"hybrid_active","sla_h":72},
    {"seq":4,"team":"ERM","action":"prioritize_gaps_by_risk","mode":"hybrid_shadow","sla_h":48},
    {"seq":5,"team":"CYBER_GOV","action":"produce_gap_report","mode":"hybrid_active","sla_h":24}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-COMP-05: Regulatory Obligation Mapping', 'template', '{
  "domain":"compliance","category":"mapping","pattern":"parallel_lanes","sla_hours":480,
  "teams":["CYBER_GOV","PRIVACY","FINANCE"],
  "steps":[
    {"seq":1,"team":"CYBER_GOV","action":"identify_applicable_regulations","mode":"hybrid_active","sla_h":48},
    {"seq":2,"team":"CYBER_GOV","action":"map_controls_to_security_obligations","mode":"hybrid_active","sla_h":168,"parallel_group":"mapping"},
    {"seq":2,"team":"PRIVACY","action":"map_pdpl_and_privacy_obligations","mode":"hybrid_active","sla_h":120,"parallel_group":"mapping"},
    {"seq":2,"team":"FINANCE","action":"map_financial_reporting_obligations","mode":"hybrid_shadow","sla_h":96,"parallel_group":"mapping"},
    {"seq":3,"team":"CYBER_GOV","action":"finalize_obligation_register","mode":"human_only","sla_h":48}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-COMP-06: Certification Readiness Assessment', 'template', '{
  "domain":"compliance","category":"certification","pattern":"hub_and_spoke","sla_hours":720,
  "teams":["CYBER_GOV","AUDIT","all_teams"],
  "steps":[
    {"seq":1,"team":"AUDIT","action":"pre_certification_gap_analysis","mode":"hybrid_active","sla_h":120},
    {"seq":2,"team":"all_teams","action":"remediate_critical_gaps","mode":"human_only","sla_h":480},
    {"seq":3,"team":"CYBER_GOV","action":"prepare_evidence_package","mode":"hybrid_active","sla_h":72},
    {"seq":4,"team":"EXEC_STRATEGY","action":"management_sign_off","mode":"human_only","sla_h":48}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-COMP-07: Annual Compliance Program Review', 'template', '{
  "domain":"compliance","category":"program_review","pattern":"sequential_handoff","sla_hours":336,
  "trigger":"schedule_annual","teams":["CYBER_GOV","ERM","AUDIT","EXEC_STRATEGY"],
  "steps":[
    {"seq":1,"team":"CYBER_GOV","action":"evaluate_compliance_program","mode":"hybrid_active","sla_h":72},
    {"seq":2,"team":"ERM","action":"evaluate_risk_program","mode":"hybrid_active","sla_h":72},
    {"seq":3,"team":"AUDIT","action":"evaluate_audit_program","mode":"hybrid_active","sla_h":72},
    {"seq":4,"team":"EXEC_STRATEGY","action":"approve_program_roadmap","mode":"human_only","sla_h":120}
  ]
}'::jsonb, 'system'),

-- ════════ DOMAIN 4: AUDIT & ASSURANCE (5 workflows) ════════
(gen_random_uuid(), 'WF-AUDIT-01: Annual Audit Plan Development', 'template', '{
  "domain":"audit","category":"planning","pattern":"sequential_handoff","sla_hours":336,
  "trigger":"schedule_annual","teams":["AUDIT","ERM","EXEC_STRATEGY"],
  "steps":[
    {"seq":1,"team":"ERM","action":"provide_risk_based_priorities","mode":"autonomous","sla_h":8},
    {"seq":2,"team":"AUDIT","action":"draft_risk_based_audit_plan","mode":"hybrid_shadow","sla_h":120},
    {"seq":3,"team":"EXEC_STRATEGY","action":"approve_audit_plan","mode":"human_only","sla_h":72},
    {"seq":4,"team":"AUDIT","action":"schedule_audit_engagements","mode":"hybrid_active","sla_h":48}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-AUDIT-02: Internal Audit Execution', 'template', '{
  "domain":"audit","category":"execution","pattern":"sequential_handoff","sla_hours":480,
  "teams":["AUDIT","auditee_team"],
  "steps":[
    {"seq":1,"team":"AUDIT","action":"opening_meeting_and_scope","mode":"human_only","sla_h":8},
    {"seq":2,"team":"AUDIT","action":"fieldwork_and_evidence_collection","mode":"hybrid_active","sla_h":240},
    {"seq":3,"team":"auditee_team","action":"provide_requested_evidence","mode":"human_only","sla_h":120},
    {"seq":4,"team":"AUDIT","action":"draft_audit_report","mode":"hybrid_shadow","sla_h":72},
    {"seq":5,"team":"auditee_team","action":"submit_management_response","mode":"human_only","sla_h":72},
    {"seq":6,"team":"AUDIT","action":"issue_final_report","mode":"human_only","sla_h":24}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-AUDIT-03: Audit Finding Remediation', 'template', '{
  "domain":"audit","category":"findings","pattern":"escalation_chain","sla_hours":720,
  "trigger":"audit_finding_raised","teams":["AUDIT","owner_team","EXEC_STRATEGY"],
  "steps":[
    {"seq":1,"team":"AUDIT","action":"classify_and_rate_finding","mode":"hybrid_shadow","sla_h":8},
    {"seq":2,"team":"owner_team","action":"assign_remediation_owner","mode":"human_only","sla_h":24},
    {"seq":3,"team":"owner_team","action":"implement_corrective_action","mode":"human_only","sla_h":480},
    {"seq":4,"team":"AUDIT","action":"verify_corrective_action","mode":"hybrid_active","sla_h":72},
    {"seq":5,"team":"EXEC_STRATEGY","action":"close_finding_sign_off","mode":"human_only","sla_h":24}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-AUDIT-04: External Audit Support', 'template', '{
  "domain":"audit","category":"external","pattern":"hub_and_spoke","sla_hours":720,
  "teams":["AUDIT","CYBER_GOV","all_teams"],
  "steps":[
    {"seq":1,"team":"AUDIT","action":"coordinate_audit_logistics","mode":"human_only","sla_h":48},
    {"seq":2,"team":"AUDIT","action":"distribute_evidence_requests_to_teams","mode":"autonomous","sla_h":4},
    {"seq":3,"team":"all_teams","action":"provide_evidence_to_auditors","mode":"human_only","sla_h":168},
    {"seq":4,"team":"AUDIT","action":"review_auditor_queries","mode":"hybrid_shadow","sla_h":168},
    {"seq":5,"team":"EXEC_STRATEGY","action":"management_letter_response","mode":"human_only","sla_h":72}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-AUDIT-05: Continuous Audit Monitoring', 'template', '{
  "domain":"audit","category":"continuous_monitoring","pattern":"sequential_handoff","sla_hours":24,
  "trigger":"schedule_weekly","teams":["AUDIT","CYBER_GOV"],
  "steps":[
    {"seq":1,"team":"AUDIT","action":"automated_control_sampling","mode":"autonomous","sla_h":2},
    {"seq":2,"team":"AUDIT","action":"exception_triage","mode":"hybrid_shadow","sla_h":8},
    {"seq":3,"team":"CYBER_GOV","action":"remediate_control_exceptions","mode":"human_only","sla_h":24}
  ]
}'::jsonb, 'system'),

-- ════════ DOMAIN 5: EVIDENCE MANAGEMENT (3 workflows) ════════
(gen_random_uuid(), 'WF-EVID-01: Scheduled Evidence Collection', 'template', '{
  "domain":"evidence","category":"collection","pattern":"sequential_handoff","sla_hours":168,
  "trigger":"schedule_monthly","teams":["CYBER_GOV","owner_team","AUDIT"],
  "steps":[
    {"seq":1,"team":"CYBER_GOV","action":"send_evidence_collection_requests","mode":"autonomous","sla_h":2},
    {"seq":2,"team":"owner_team","action":"collect_and_upload_evidence","mode":"human_only","sla_h":120},
    {"seq":3,"team":"CYBER_GOV","action":"review_evidence_quality","mode":"hybrid_active","sla_h":24},
    {"seq":4,"team":"AUDIT","action":"approve_evidence_for_controls","mode":"hybrid_shadow","sla_h":24}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-EVID-02: Evidence Expiry & Renewal', 'template', '{
  "domain":"evidence","category":"renewal","pattern":"sequential_handoff","sla_hours":72,
  "trigger":"evidence_expiry_approaching","teams":["CYBER_GOV","owner_team"],
  "steps":[
    {"seq":1,"team":"CYBER_GOV","action":"notify_evidence_expiry","mode":"autonomous","sla_h":1},
    {"seq":2,"team":"owner_team","action":"renew_or_refresh_evidence","mode":"human_only","sla_h":48},
    {"seq":3,"team":"CYBER_GOV","action":"validate_renewed_evidence","mode":"hybrid_active","sla_h":24}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-EVID-03: Evidence Cross-Validation', 'template', '{
  "domain":"evidence","category":"validation","pattern":"parallel_lanes","sla_hours":72,
  "teams":["CYBER_GOV","AUDIT"],
  "steps":[
    {"seq":1,"team":"CYBER_GOV","action":"technical_evidence_review","mode":"hybrid_active","sla_h":48,"parallel_group":"validation"},
    {"seq":1,"team":"AUDIT","action":"audit_evidence_review","mode":"hybrid_active","sla_h":48,"parallel_group":"validation"},
    {"seq":2,"team":"CYBER_GOV","action":"reconcile_discrepancies","mode":"hybrid_shadow","sla_h":24}
  ]
}'::jsonb, 'system'),

-- ════════ DOMAIN 6: INCIDENT MANAGEMENT (3 workflows) ════════
(gen_random_uuid(), 'WF-INC-01: Security Incident Response', 'template', '{
  "domain":"incident","category":"response","pattern":"war_room","sla_hours":4,
  "trigger":"security_incident_detected",
  "teams":["SOC_OPS","CYBER_GOV","IAM_GOV","DATA_GOV","EXEC_STRATEGY"],
  "steps":[
    {"seq":1,"team":"SOC_OPS","action":"detect_and_triage_incident","mode":"autonomous","sla_h":1},
    {"seq":2,"team":"SOC_OPS","action":"declare_incident_severity","mode":"human_only","sla_h":1},
    {"seq":3,"team":"CYBER_GOV","action":"activate_war_room","mode":"human_only","sla_h":1},
    {"seq":4,"team":"SOC_OPS","action":"contain_threat","mode":"hybrid_active","sla_h":4,"parallel_group":"response"},
    {"seq":4,"team":"IAM_GOV","action":"revoke_compromised_access","mode":"autonomous","sla_h":1,"parallel_group":"response"},
    {"seq":4,"team":"DATA_GOV","action":"assess_data_exposure","mode":"hybrid_shadow","sla_h":4,"parallel_group":"response"},
    {"seq":5,"team":"CYBER_GOV","action":"eradicate_and_recover","mode":"hybrid_active","sla_h":8},
    {"seq":6,"team":"EXEC_STRATEGY","action":"executive_briefing","mode":"human_only","sla_h":4},
    {"seq":7,"team":"SOC_OPS","action":"post_incident_report","mode":"hybrid_shadow","sla_h":72}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-INC-02: PDPL Data Breach Notification (72h)', 'template', '{
  "domain":"incident","category":"breach_notification","pattern":"war_room","sla_hours":72,
  "trigger":"pdpl_breach_confirmed","hard_deadline_hours":72,
  "teams":["PRIVACY","SOC_OPS","EXEC_STRATEGY","CYBER_GOV"],
  "steps":[
    {"seq":1,"team":"PRIVACY","action":"assess_breach_scope","mode":"human_only","sla_h":4},
    {"seq":2,"team":"SOC_OPS","action":"contain_breach","mode":"hybrid_active","sla_h":4,"parallel_group":"breach_response"},
    {"seq":2,"team":"PRIVACY","action":"draft_sdaia_notification","mode":"hybrid_shadow","sla_h":24,"parallel_group":"breach_response"},
    {"seq":3,"team":"EXEC_STRATEGY","action":"approve_notification","mode":"human_only","sla_h":12},
    {"seq":4,"team":"PRIVACY","action":"submit_breach_to_sdaia","mode":"human_only","sla_h":4},
    {"seq":5,"team":"PRIVACY","action":"notify_affected_data_subjects","mode":"hybrid_active","sla_h":24}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-INC-03: Operational Incident Management', 'template', '{
  "domain":"incident","category":"operational","pattern":"escalation_chain","sla_hours":8,
  "trigger":"operational_incident","teams":["SVC_OPS","SOC_OPS","owner_team"],
  "steps":[
    {"seq":1,"team":"SVC_OPS","action":"log_and_classify_incident","mode":"hybrid_shadow","sla_h":1},
    {"seq":2,"team":"owner_team","action":"resolve_or_escalate","mode":"human_only","sla_h":4},
    {"seq":3,"team":"SOC_OPS","action":"security_impact_check","mode":"autonomous","sla_h":2},
    {"seq":4,"team":"SVC_OPS","action":"close_and_report","mode":"hybrid_active","sla_h":4}
  ]
}'::jsonb, 'system'),

-- ════════ DOMAIN 7: VENDOR & THIRD-PARTY RISK (3 workflows) ════════
(gen_random_uuid(), 'WF-VND-01: Vendor Risk Onboarding', 'template', '{
  "domain":"vendor_risk","category":"onboarding","pattern":"parallel_lanes","sla_hours":240,
  "teams":["VENDOR_RISK","CYBER_GOV","PRIVACY","FINANCE"],
  "steps":[
    {"seq":1,"team":"VENDOR_RISK","action":"initiate_vendor_assessment","mode":"human_only","sla_h":8},
    {"seq":2,"team":"CYBER_GOV","action":"security_due_diligence","mode":"hybrid_active","sla_h":72,"parallel_group":"vendor_review"},
    {"seq":2,"team":"PRIVACY","action":"privacy_compliance_review","mode":"hybrid_active","sla_h":72,"parallel_group":"vendor_review"},
    {"seq":2,"team":"FINANCE","action":"financial_risk_check","mode":"hybrid_shadow","sla_h":48,"parallel_group":"vendor_review"},
    {"seq":3,"team":"VENDOR_RISK","action":"consolidate_vendor_risk_score","mode":"autonomous","sla_h":4},
    {"seq":4,"team":"EXEC_STRATEGY","action":"approve_vendor","mode":"human_only","sla_h":48}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-VND-02: Vendor Annual Re-certification', 'template', '{
  "domain":"vendor_risk","category":"review","pattern":"sequential_handoff","sla_hours":336,
  "trigger":"schedule_annual","teams":["VENDOR_RISK","CYBER_GOV"],
  "steps":[
    {"seq":1,"team":"VENDOR_RISK","action":"send_recertification_questionnaire","mode":"autonomous","sla_h":4},
    {"seq":2,"team":"vendor","action":"complete_questionnaire","mode":"human_only","sla_h":168},
    {"seq":3,"team":"CYBER_GOV","action":"review_vendor_responses","mode":"hybrid_active","sla_h":72},
    {"seq":4,"team":"VENDOR_RISK","action":"update_vendor_risk_score","mode":"autonomous","sla_h":8}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-VND-03: Vendor Offboarding & Termination', 'template', '{
  "domain":"vendor_risk","category":"offboarding","pattern":"parallel_lanes","sla_hours":72,
  "teams":["VENDOR_RISK","IAM_GOV","DATA_GOV","FINANCE"],
  "steps":[
    {"seq":1,"team":"VENDOR_RISK","action":"initiate_vendor_termination","mode":"human_only","sla_h":4},
    {"seq":2,"team":"IAM_GOV","action":"revoke_vendor_system_access","mode":"autonomous","sla_h":4,"parallel_group":"term_tasks"},
    {"seq":2,"team":"DATA_GOV","action":"data_return_or_secure_destruction","mode":"hybrid_active","sla_h":48,"parallel_group":"term_tasks"},
    {"seq":2,"team":"FINANCE","action":"close_contracts_and_settle","mode":"human_only","sla_h":72,"parallel_group":"term_tasks"},
    {"seq":3,"team":"VENDOR_RISK","action":"confirm_termination_complete","mode":"human_only","sla_h":8}
  ]
}'::jsonb, 'system'),

-- ════════ DOMAIN 8: IDENTITY & ACCESS GOVERNANCE (4 workflows) ════════
(gen_random_uuid(), 'WF-IAM-01: Access Request & Provisioning', 'template', '{
  "domain":"identity_access","category":"provisioning","pattern":"sequential_handoff","sla_hours":24,
  "teams":["IAM_GOV","CYBER_GOV","owner_team"],
  "steps":[
    {"seq":1,"team":"requester","action":"submit_access_request","mode":"human_only","sla_h":0},
    {"seq":2,"team":"owner_team","action":"business_justification_review","mode":"human_only","sla_h":8},
    {"seq":3,"team":"CYBER_GOV","action":"security_policy_compliance_check","mode":"hybrid_shadow","sla_h":4},
    {"seq":4,"team":"IAM_GOV","action":"provision_access","mode":"autonomous","sla_h":4},
    {"seq":5,"team":"IAM_GOV","action":"notify_and_log_access_grant","mode":"autonomous","sla_h":1}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-IAM-02: Privileged Access Request', 'template', '{
  "domain":"identity_access","category":"privileged_access","pattern":"sequential_handoff","sla_hours":24,
  "teams":["IAM_GOV","CYBER_GOV","EXEC_STRATEGY"],
  "steps":[
    {"seq":1,"team":"requester","action":"request_privileged_access","mode":"human_only","sla_h":0},
    {"seq":2,"team":"CYBER_GOV","action":"security_risk_assessment_of_request","mode":"hybrid_shadow","sla_h":8},
    {"seq":3,"team":"EXEC_STRATEGY","action":"executive_approval","mode":"human_only","sla_h":12},
    {"seq":4,"team":"IAM_GOV","action":"provision_time_bound_privileged_access","mode":"autonomous","sla_h":2},
    {"seq":5,"team":"IAM_GOV","action":"monitor_and_auto_revoke","mode":"autonomous","sla_h":4}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-IAM-03: User Offboarding (2h IAM SLA)', 'template', '{
  "domain":"identity_access","category":"offboarding","pattern":"parallel_lanes","sla_hours":2,
  "trigger":"hr_offboarding_initiated","hard_sla_hours":2,
  "teams":["IAM_GOV","HR_GOV","DATA_GOV","SVC_OPS"],
  "steps":[
    {"seq":1,"team":"HR_GOV","action":"trigger_offboarding_workflow","mode":"human_only","sla_h":0},
    {"seq":2,"team":"IAM_GOV","action":"revoke_all_system_access","mode":"autonomous","sla_h":2,"parallel_group":"offboard"},
    {"seq":2,"team":"DATA_GOV","action":"transfer_or_archive_data","mode":"hybrid_active","sla_h":24,"parallel_group":"offboard"},
    {"seq":2,"team":"SVC_OPS","action":"deactivate_accounts_and_devices","mode":"autonomous","sla_h":4,"parallel_group":"offboard"},
    {"seq":3,"team":"HR_GOV","action":"confirm_offboarding_complete","mode":"human_only","sla_h":24}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-IAM-04: Periodic Access Review & Recertification', 'template', '{
  "domain":"identity_access","category":"access_review","pattern":"hub_and_spoke","sla_hours":336,
  "trigger":"schedule_quarterly","teams":["IAM_GOV","all_team_leads"],
  "steps":[
    {"seq":1,"team":"IAM_GOV","action":"generate_access_review_reports","mode":"autonomous","sla_h":4},
    {"seq":2,"team":"all_team_leads","action":"certify_or_revoke_team_access","mode":"human_only","sla_h":168},
    {"seq":3,"team":"IAM_GOV","action":"revoke_uncertified_access","mode":"autonomous","sla_h":8},
    {"seq":4,"team":"AUDIT","action":"access_review_sign_off","mode":"hybrid_shadow","sla_h":24}
  ]
}'::jsonb, 'system'),

-- ════════ DOMAIN 9: PRIVACY & DATA PROTECTION (3 workflows) ════════
(gen_random_uuid(), 'WF-PRIV-01: Data Protection Impact Assessment (DPIA)', 'template', '{
  "domain":"privacy","category":"assessment","pattern":"sequential_handoff","sla_hours":480,
  "teams":["PRIVACY","DATA_GOV","ERM","EXEC_STRATEGY"],
  "steps":[
    {"seq":1,"team":"PRIVACY","action":"screen_project_for_dpia_requirement","mode":"hybrid_shadow","sla_h":24},
    {"seq":2,"team":"PRIVACY","action":"conduct_dpia","mode":"human_only","sla_h":240},
    {"seq":3,"team":"DATA_GOV","action":"data_flow_validation","mode":"hybrid_active","sla_h":48},
    {"seq":4,"team":"ERM","action":"residual_risk_assessment","mode":"hybrid_shadow","sla_h":48},
    {"seq":5,"team":"EXEC_STRATEGY","action":"dpia_approval","mode":"human_only","sla_h":48},
    {"seq":6,"team":"PRIVACY","action":"publish_and_monitor_dpia","mode":"hybrid_active","sla_h":24}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-PRIV-02: Data Subject Rights Request (DSR)', 'template', '{
  "domain":"privacy","category":"dsr","pattern":"sequential_handoff","sla_hours":720,
  "trigger":"dsr_received","hard_deadline_days":30,
  "teams":["PRIVACY","DATA_GOV","IAM_GOV"],
  "steps":[
    {"seq":1,"team":"PRIVACY","action":"acknowledge_and_verify_identity","mode":"human_only","sla_h":24},
    {"seq":2,"team":"DATA_GOV","action":"locate_and_retrieve_personal_data","mode":"hybrid_active","sla_h":168},
    {"seq":3,"team":"IAM_GOV","action":"check_system_access_logs","mode":"autonomous","sla_h":8},
    {"seq":4,"team":"PRIVACY","action":"fulfill_dsr_request","mode":"human_only","sla_h":48},
    {"seq":5,"team":"PRIVACY","action":"document_and_close_dsr","mode":"hybrid_active","sla_h":24}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-PRIV-03: ROPA Maintenance', 'template', '{
  "domain":"privacy","category":"ropa","pattern":"hub_and_spoke","sla_hours":336,
  "trigger":"schedule_annual","teams":["PRIVACY","DATA_GOV","all_teams"],
  "steps":[
    {"seq":1,"team":"PRIVACY","action":"distribute_ropa_update_forms","mode":"autonomous","sla_h":4},
    {"seq":2,"team":"all_teams","action":"update_data_processing_activities","mode":"human_only","sla_h":168},
    {"seq":3,"team":"PRIVACY","action":"consolidate_and_validate_ropa","mode":"hybrid_active","sla_h":72},
    {"seq":4,"team":"DATA_GOV","action":"cross_reference_data_flows","mode":"hybrid_shadow","sla_h":48},
    {"seq":5,"team":"PRIVACY","action":"publish_updated_ropa","mode":"human_only","sla_h":24}
  ]
}'::jsonb, 'system'),

-- ════════ DOMAIN 10: ARCHITECTURE & CHANGE MANAGEMENT (2 workflows) ════════
(gen_random_uuid(), 'WF-ARCH-01: Change Advisory Board (CAB)', 'template', '{
  "domain":"architecture","category":"change_management","pattern":"sequential_handoff","sla_hours":168,
  "teams":["APP_ENG","ENT_ARCH","CYBER_GOV","SVC_OPS","EXEC_STRATEGY"],
  "steps":[
    {"seq":1,"team":"APP_ENG","action":"submit_change_request","mode":"human_only","sla_h":0},
    {"seq":2,"team":"ENT_ARCH","action":"architecture_impact_assessment","mode":"hybrid_shadow","sla_h":48},
    {"seq":3,"team":"CYBER_GOV","action":"security_risk_assessment","mode":"hybrid_shadow","sla_h":24},
    {"seq":4,"team":"SVC_OPS","action":"operational_impact_review","mode":"human_only","sla_h":24},
    {"seq":5,"team":"EXEC_STRATEGY","action":"cab_approval","mode":"human_only","sla_h":48},
    {"seq":6,"team":"APP_ENG","action":"implement_change","mode":"human_only","sla_h":168},
    {"seq":7,"team":"SVC_OPS","action":"post_change_review","mode":"hybrid_shadow","sla_h":24}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-ARCH-02: Architecture Security Review', 'template', '{
  "domain":"architecture","category":"security_review","pattern":"sequential_handoff","sla_hours":240,
  "teams":["ENT_ARCH","CYBER_GOV","ERM"],
  "steps":[
    {"seq":1,"team":"ENT_ARCH","action":"submit_architecture_design","mode":"human_only","sla_h":0},
    {"seq":2,"team":"CYBER_GOV","action":"security_threat_modelling","mode":"hybrid_active","sla_h":72},
    {"seq":3,"team":"ERM","action":"residual_risk_assessment","mode":"hybrid_shadow","sla_h":48},
    {"seq":4,"team":"CYBER_GOV","action":"issue_security_sign_off","mode":"human_only","sla_h":24},
    {"seq":5,"team":"ENT_ARCH","action":"update_architecture_with_controls","mode":"human_only","sla_h":72}
  ]
}'::jsonb, 'system'),

-- ════════ DOMAIN 11: HR & WORKFORCE (2 workflows) ════════
(gen_random_uuid(), 'WF-HR-01: Security Awareness Training Campaign', 'template', '{
  "domain":"hr_workforce","category":"training","pattern":"hub_and_spoke","sla_hours":720,
  "trigger":"schedule_annual","teams":["HR_GOV","CYBER_GOV"],
  "steps":[
    {"seq":1,"team":"CYBER_GOV","action":"develop_training_content","mode":"hybrid_active","sla_h":240},
    {"seq":2,"team":"HR_GOV","action":"assign_mandatory_training","mode":"autonomous","sla_h":4},
    {"seq":3,"team":"HR_GOV","action":"track_completion_rates","mode":"autonomous","sla_h":672},
    {"seq":4,"team":"CYBER_GOV","action":"evaluate_training_effectiveness","mode":"hybrid_shadow","sla_h":48}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-HR-02: Workforce Risk & Background Screening', 'template', '{
  "domain":"hr_workforce","category":"screening","pattern":"sequential_handoff","sla_hours":336,
  "teams":["HR_GOV","CYBER_GOV"],
  "steps":[
    {"seq":1,"team":"HR_GOV","action":"initiate_background_screening","mode":"human_only","sla_h":8},
    {"seq":2,"team":"HR_GOV","action":"collect_screening_documents","mode":"human_only","sla_h":168},
    {"seq":3,"team":"CYBER_GOV","action":"assess_security_risk_of_candidate","mode":"hybrid_shadow","sla_h":24},
    {"seq":4,"team":"HR_GOV","action":"approve_or_flag_candidate","mode":"human_only","sla_h":48}
  ]
}'::jsonb, 'system'),

-- ════════ DOMAIN 12: DR & BCP (1 workflow) ════════
(gen_random_uuid(), 'WF-BCP-01: BCP Activation & Crisis Management', 'template', '{
  "domain":"bcp_dr","category":"activation","pattern":"war_room","sla_hours":4,
  "trigger":"bcp_trigger_event",
  "teams":["BCM_DR","EXEC_STRATEGY","SOC_OPS","CLOUD_INFRA","SVC_OPS"],
  "steps":[
    {"seq":1,"team":"BCM_DR","action":"declare_disaster_and_bcp_activation","mode":"human_only","sla_h":1},
    {"seq":2,"team":"EXEC_STRATEGY","action":"crisis_management_team_assembly","mode":"human_only","sla_h":1},
    {"seq":3,"team":"SOC_OPS","action":"cyber_threat_containment","mode":"hybrid_active","sla_h":4,"parallel_group":"recovery"},
    {"seq":3,"team":"CLOUD_INFRA","action":"activate_dr_failover","mode":"autonomous","sla_h":2,"parallel_group":"recovery"},
    {"seq":3,"team":"SVC_OPS","action":"restore_critical_services","mode":"hybrid_active","sla_h":8,"parallel_group":"recovery"},
    {"seq":4,"team":"BCM_DR","action":"communication_to_stakeholders","mode":"hybrid_shadow","sla_h":4},
    {"seq":5,"team":"BCM_DR","action":"post_event_review_and_lessons_learned","mode":"hybrid_shadow","sla_h":168}
  ]
}'::jsonb, 'system'),

-- ════════ QIYAS INTEGRATION WORKFLOWS (5 workflows) ════════
(gen_random_uuid(), 'WF-QIYAS-01: Maturity Assessment Execution', 'template', '{
  "domain":"qiyas","category":"assessment","pattern":"hub_and_spoke","sla_hours":480,
  "teams":["CYBER_GOV","ERM","all_teams"],
  "steps":[
    {"seq":1,"team":"CYBER_GOV","action":"initiate_qiyas_assessment","mode":"autonomous","sla_h":4},
    {"seq":2,"team":"all_teams","action":"respond_to_maturity_questionnaire","mode":"human_only","sla_h":240},
    {"seq":3,"team":"CYBER_GOV","action":"score_and_calibrate","mode":"hybrid_active","sla_h":48},
    {"seq":4,"team":"ERM","action":"review_and_validate_maturity_scores","mode":"hybrid_shadow","sla_h":48},
    {"seq":5,"team":"EXEC_STRATEGY","action":"approve_maturity_report","mode":"human_only","sla_h":48}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-QIYAS-02: Gap-Triggered Remediation', 'template', '{
  "domain":"qiyas","category":"gap_remediation","pattern":"sequential_handoff","sla_hours":720,
  "trigger":"qiyas_gap_critical_or_high","teams":["CYBER_GOV","owner_team","ERM"],
  "steps":[
    {"seq":1,"team":"CYBER_GOV","action":"auto_create_remediation_task_from_gap","mode":"autonomous","sla_h":2},
    {"seq":2,"team":"owner_team","action":"acknowledge_gap_and_plan_remediation","mode":"human_only","sla_h":48},
    {"seq":3,"team":"ERM","action":"validate_risk_alignment","mode":"hybrid_shadow","sla_h":24},
    {"seq":4,"team":"owner_team","action":"implement_improvement","mode":"human_only","sla_h":480},
    {"seq":5,"team":"CYBER_GOV","action":"verify_gap_closure_via_qiyas_retest","mode":"hybrid_active","sla_h":72}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-QIYAS-03: Recommendation Acceptance & Execution', 'template', '{
  "domain":"qiyas","category":"recommendations","pattern":"sequential_handoff","sla_hours":168,
  "trigger":"qiyas_recommendation_accepted","teams":["CYBER_GOV","ERM"],
  "steps":[
    {"seq":1,"team":"CYBER_GOV","action":"auto_create_grc_task_from_recommendation","mode":"autonomous","sla_h":2},
    {"seq":2,"team":"ERM","action":"assign_task_to_control_owner","mode":"hybrid_active","sla_h":8},
    {"seq":3,"team":"owner_team","action":"execute_recommendation","mode":"human_only","sla_h":480},
    {"seq":4,"team":"CYBER_GOV","action":"verify_and_update_qiyas_indicator","mode":"hybrid_active","sla_h":48}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-QIYAS-04: Assessment Finalization & GRC Sync', 'template', '{
  "domain":"qiyas","category":"sync","pattern":"sequential_handoff","sla_hours":24,
  "trigger":"qiyas_assessment_finalized","teams":["CYBER_GOV","ERM"],
  "steps":[
    {"seq":1,"team":"CYBER_GOV","action":"push_maturity_scores_to_grc_dashboard","mode":"autonomous","sla_h":1},
    {"seq":2,"team":"ERM","action":"update_risk_posture_from_maturity","mode":"autonomous","sla_h":2},
    {"seq":3,"team":"CYBER_GOV","action":"notify_ciso_and_erm_of_assessment_results","mode":"autonomous","sla_h":1}
  ]
}'::jsonb, 'system'),

(gen_random_uuid(), 'WF-QIYAS-05: Benchmarking & Peer Comparison', 'template', '{
  "domain":"qiyas","category":"benchmarking","pattern":"sequential_handoff","sla_hours":168,
  "trigger":"schedule_semi_annual","teams":["CYBER_GOV","ERM","EXEC_STRATEGY"],
  "steps":[
    {"seq":1,"team":"CYBER_GOV","action":"run_qiyas_benchmark_comparison","mode":"autonomous","sla_h":4},
    {"seq":2,"team":"ERM","action":"analyze_benchmark_gaps","mode":"hybrid_shadow","sla_h":48},
    {"seq":3,"team":"CYBER_GOV","action":"draft_benchmarking_report","mode":"hybrid_active","sla_h":48},
    {"seq":4,"team":"EXEC_STRATEGY","action":"review_and_set_improvement_targets","mode":"human_only","sla_h":72}
  ]
}'::jsonb, 'system')

ON CONFLICT DO NOTHING;
