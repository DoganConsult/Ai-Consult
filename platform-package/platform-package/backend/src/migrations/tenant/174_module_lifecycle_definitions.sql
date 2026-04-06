-- ============================================================
-- Migration 174: Module Lifecycle Definitions
-- State machines for all 13 core modules with enterprise
-- role gates, authority levels, and SoD enforcement points.
-- ============================================================

-- 1. Module lifecycle definitions table
CREATE TABLE IF NOT EXISTS module_lifecycle_definitions (
  id BIGSERIAL PRIMARY KEY,
  module_code TEXT NOT NULL UNIQUE,
  statuses TEXT[] NOT NULL,
  initial_status TEXT NOT NULL,
  terminal_statuses TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Module lifecycle transitions table
CREATE TABLE IF NOT EXISTS module_lifecycle_transitions (
  id BIGSERIAL PRIMARY KEY,
  module_code TEXT NOT NULL REFERENCES module_lifecycle_definitions(module_code) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  required_functional_roles TEXT[] NOT NULL,
  required_permission_code TEXT NOT NULL,
  authority_gate TEXT,
  authority_severity_map JSONB,
  sod_check BOOLEAN NOT NULL DEFAULT FALSE,
  ownership_assignment JSONB,
  sla_hours INT,
  description_en TEXT,
  description_ar TEXT,
  UNIQUE(module_code, from_status, to_status)
);

CREATE INDEX IF NOT EXISTS idx_mlt_module ON module_lifecycle_transitions(module_code);
CREATE INDEX IF NOT EXISTS idx_mlt_from ON module_lifecycle_transitions(module_code, from_status);

-- ═══════════════════════════════════════════════════
-- 3. SEED: Module Lifecycle Definitions (13 modules)
-- ═══════════════════════════════════════════════════

INSERT INTO module_lifecycle_definitions (module_code, statuses, initial_status, terminal_statuses) VALUES
('risk',
 ARRAY['draft','submitted','under_review','assessed','treatment_planned','approved','active','monitoring','closed','retired','returned'],
 'draft', ARRAY['closed','retired']),
('compliance',
 ARRAY['draft','designed','implemented','test_planned','testing','tested','review','approved','effective','monitoring','deficiency_found','retired'],
 'draft', ARRAY['retired']),
('policy',
 ARRAY['draft','submitted','under_review','revision_requested','resubmitted','approved','published','active','review_due','under_revision','retired'],
 'draft', ARRAY['retired']),
('evidence',
 ARRAY['requested','collecting','uploaded','under_review','verified','locked','released','archived','rejected_quality'],
 'requested', ARRAY['archived']),
('audit',
 ARRAY['planned','scoped','fieldwork','draft_report','management_response','final_report','approved','issued','finding_tracking','closed'],
 'planned', ARRAY['closed']),
('incident',
 ARRAY['reported','triaged','investigating','contained','eradicated','recovered','under_review','approved_closure','closed','lessons_learned','escalated'],
 'reported', ARRAY['closed','lessons_learned']),
('exception',
 ARRAY['draft','submitted','risk_assessed','under_review','approved','rejected','active','monitoring','expiring','expired','renewed','closed'],
 'draft', ARRAY['closed','rejected','expired']),
('governance',
 ARRAY['draft','proposed','committee_review','approved','active','annual_review','under_revision','re_approved','dissolved'],
 'draft', ARRAY['dissolved']),
('vendor',
 ARRAY['identified','questionnaire_sent','questionnaire_received','assessing','assessed','approved','rejected','onboarded','active','annual_review','re_assessed','offboarding','offboarded'],
 'identified', ARRAY['offboarded','rejected']),
('bcp',
 ARRAY['draft','planned','tested','evaluated','approved','active','exercised','review_due','under_revision','re_approved','retired'],
 'draft', ARRAY['retired']),
('asset',
 ARRAY['draft','registered','classified','under_review','approved','active','review_due','under_reclassification','re_approved','decommissioned'],
 'draft', ARRAY['decommissioned']),
('remediation',
 ARRAY['identified','planned','in_progress','verification_pending','verified','verification_failed','closed'],
 'identified', ARRAY['closed']),
('action',
 ARRAY['open','in_progress','completed','verified','closed','overdue','escalated'],
 'open', ARRAY['closed'])
ON CONFLICT (module_code) DO NOTHING;

-- ═══════════════════════════════════════════════════
-- 4. SEED: Transitions per Module
-- ═══════════════════════════════════════════════════

-- ─── RISK MODULE ────────────────────────────────────
INSERT INTO module_lifecycle_transitions (module_code, from_status, to_status, required_functional_roles, required_permission_code, authority_gate, authority_severity_map, sod_check, ownership_assignment, sla_hours, description_en) VALUES
('risk', 'draft', 'submitted', ARRAY['risk_creator','risk_owner'], 'risk.record.submit', 'submit', NULL, FALSE, '{"field":"owner_user_id","source":"actor"}', NULL, 'Submit risk for review'),
('risk', 'submitted', 'under_review', ARRAY['risk_reviewer'], 'risk.record.review', 'review', NULL, FALSE, '{"field":"reviewer_user_id","source":"actor"}', 48, 'Begin risk review'),
('risk', 'under_review', 'returned', ARRAY['risk_reviewer'], 'risk.record.review', 'review', NULL, FALSE, NULL, NULL, 'Return risk to draft for rework'),
('risk', 'under_review', 'assessed', ARRAY['risk_reviewer'], 'risk.record.review', 'review', NULL, FALSE, NULL, 24, 'Complete risk assessment'),
('risk', 'assessed', 'treatment_planned', ARRAY['treatment_owner'], 'risk.treatment.assign', 'submit', NULL, FALSE, NULL, 72, 'Assign risk treatment plan'),
('risk', 'treatment_planned', 'approved', ARRAY['risk_approver'], 'risk.record.approve', NULL, '{"low":"approve_low","medium":"approve_medium","high":"approve_high","critical":"approve_high"}', TRUE, '{"field":"approver_user_id","source":"actor"}', 48, 'Approve risk treatment'),
('risk', 'approved', 'active', ARRAY['risk_owner'], 'risk.record.update', NULL, NULL, FALSE, NULL, NULL, 'Activate risk monitoring'),
('risk', 'active', 'monitoring', ARRAY['risk_owner'], 'risk.record.update', NULL, NULL, FALSE, NULL, NULL, 'Begin continuous monitoring'),
('risk', 'monitoring', 'closed', ARRAY['risk_approver'], 'risk.record.close', 'approve_low', NULL, TRUE, NULL, NULL, 'Close risk'),
('risk', 'closed', 'active', ARRAY['risk_owner'], 'risk.record.update', NULL, NULL, FALSE, NULL, NULL, 'Reopen closed risk'),
('risk', 'returned', 'submitted', ARRAY['risk_creator','risk_owner'], 'risk.record.submit', 'submit', NULL, FALSE, NULL, NULL, 'Resubmit after rework')
ON CONFLICT (module_code, from_status, to_status) DO NOTHING;

-- ─── COMPLIANCE / CONTROLS MODULE ───────────────────
INSERT INTO module_lifecycle_transitions (module_code, from_status, to_status, required_functional_roles, required_permission_code, authority_gate, authority_severity_map, sod_check, ownership_assignment, sla_hours, description_en) VALUES
('compliance', 'draft', 'designed', ARRAY['control_owner'], 'compliance.control.update', 'submit', NULL, FALSE, '{"field":"owner_user_id","source":"actor"}', NULL, 'Design control'),
('compliance', 'designed', 'implemented', ARRAY['control_owner'], 'compliance.control.update', NULL, NULL, FALSE, NULL, 72, 'Implement control'),
('compliance', 'implemented', 'test_planned', ARRAY['control_tester','compliance_manager'], 'compliance.test.execute', NULL, NULL, TRUE, NULL, 24, 'Plan control test'),
('compliance', 'test_planned', 'testing', ARRAY['control_tester'], 'compliance.test.execute', NULL, NULL, FALSE, '{"field":"reviewer_user_id","source":"actor"}', NULL, 'Execute control test'),
('compliance', 'testing', 'tested', ARRAY['control_tester'], 'compliance.test.execute', 'review', NULL, FALSE, NULL, 48, 'Complete testing'),
('compliance', 'tested', 'review', ARRAY['compliance_analyst'], 'compliance.score.review', 'review', NULL, FALSE, NULL, 24, 'Review compliance score'),
('compliance', 'review', 'approved', ARRAY['compliance_manager'], 'compliance.score.approve', 'approve_low', NULL, FALSE, '{"field":"approver_user_id","source":"actor"}', 24, 'Approve compliance'),
('compliance', 'approved', 'effective', ARRAY['compliance_manager'], 'compliance.control.update', NULL, NULL, FALSE, NULL, NULL, 'Mark control effective'),
('compliance', 'effective', 'monitoring', ARRAY['control_owner'], 'compliance.control.update', NULL, NULL, FALSE, NULL, NULL, 'Begin monitoring'),
('compliance', 'monitoring', 'deficiency_found', ARRAY['control_tester','compliance_analyst'], 'compliance.test.execute', NULL, NULL, FALSE, NULL, NULL, 'Report deficiency'),
('compliance', 'deficiency_found', 'test_planned', ARRAY['control_owner'], 'compliance.control.update', NULL, NULL, FALSE, NULL, 24, 'Replan after deficiency')
ON CONFLICT (module_code, from_status, to_status) DO NOTHING;

-- ─── POLICY MODULE ──────────────────────────────────
INSERT INTO module_lifecycle_transitions (module_code, from_status, to_status, required_functional_roles, required_permission_code, authority_gate, authority_severity_map, sod_check, ownership_assignment, sla_hours, description_en) VALUES
('policy', 'draft', 'submitted', ARRAY['policy_author'], 'policy.document.update', 'submit', NULL, FALSE, '{"field":"author_user_id","source":"actor"}', NULL, 'Submit policy for review'),
('policy', 'submitted', 'under_review', ARRAY['policy_reviewer'], 'policy.document.review', 'review', NULL, FALSE, '{"field":"reviewer_user_id","source":"actor"}', 48, 'Begin policy review'),
('policy', 'under_review', 'revision_requested', ARRAY['policy_reviewer'], 'policy.document.review', 'review', NULL, FALSE, NULL, NULL, 'Request revision'),
('policy', 'under_review', 'approved', ARRAY['policy_approver'], 'policy.document.approve', NULL, '{"standard":"approve_low","org_wide":"approve_medium","regulatory":"approve_high"}', TRUE, '{"field":"approver_user_id","source":"actor"}', 48, 'Approve policy'),
('policy', 'revision_requested', 'resubmitted', ARRAY['policy_author'], 'policy.document.update', 'submit', NULL, FALSE, NULL, NULL, 'Resubmit revised policy'),
('policy', 'resubmitted', 'under_review', ARRAY['policy_reviewer'], 'policy.document.review', 'review', NULL, FALSE, NULL, 48, 'Re-review revised policy'),
('policy', 'approved', 'published', ARRAY['document_controller'], 'policy.document.publish', NULL, NULL, FALSE, NULL, 24, 'Publish policy'),
('policy', 'published', 'active', ARRAY['document_controller'], 'policy.document.publish', NULL, NULL, FALSE, NULL, NULL, 'Activate policy'),
('policy', 'active', 'review_due', ARRAY['policy_author','document_controller'], 'policy.document.update', NULL, NULL, FALSE, NULL, NULL, 'Flag for periodic review'),
('policy', 'review_due', 'under_revision', ARRAY['policy_author'], 'policy.document.update', NULL, NULL, FALSE, NULL, NULL, 'Begin revision'),
('policy', 'active', 'retired', ARRAY['document_controller'], 'policy.document.retire', 'approve_low', NULL, FALSE, NULL, NULL, 'Retire policy')
ON CONFLICT (module_code, from_status, to_status) DO NOTHING;

-- ─── EVIDENCE MODULE ────────────────────────────────
INSERT INTO module_lifecycle_transitions (module_code, from_status, to_status, required_functional_roles, required_permission_code, authority_gate, authority_severity_map, sod_check, ownership_assignment, sla_hours, description_en) VALUES
('evidence', 'requested', 'collecting', ARRAY['evidence_owner'], 'evidence.item.upload', NULL, NULL, FALSE, '{"field":"owner_user_id","source":"actor"}', 72, 'Begin evidence collection'),
('evidence', 'collecting', 'uploaded', ARRAY['evidence_owner'], 'evidence.item.upload', 'submit', NULL, FALSE, NULL, NULL, 'Upload evidence'),
('evidence', 'uploaded', 'under_review', ARRAY['evidence_reviewer'], 'evidence.item.verify', 'review', NULL, TRUE, '{"field":"reviewer_user_id","source":"actor"}', 48, 'Review evidence'),
('evidence', 'under_review', 'rejected_quality', ARRAY['evidence_reviewer'], 'evidence.item.verify', 'review', NULL, FALSE, NULL, NULL, 'Reject evidence quality'),
('evidence', 'under_review', 'verified', ARRAY['evidence_reviewer'], 'evidence.item.verify', 'approve_low', NULL, FALSE, NULL, NULL, 'Verify evidence'),
('evidence', 'rejected_quality', 'collecting', ARRAY['evidence_owner'], 'evidence.item.upload', NULL, NULL, FALSE, NULL, 24, 'Re-collect after rejection'),
('evidence', 'verified', 'locked', ARRAY['custodian'], 'evidence.item.lock', NULL, NULL, FALSE, '{"field":"custodian_user_id","source":"actor"}', NULL, 'Lock evidence'),
('evidence', 'locked', 'released', ARRAY['custodian'], 'evidence.item.release', NULL, NULL, FALSE, NULL, NULL, 'Release evidence'),
('evidence', 'released', 'archived', ARRAY['custodian'], 'evidence.item.archive', 'approve_low', NULL, FALSE, NULL, NULL, 'Archive evidence')
ON CONFLICT (module_code, from_status, to_status) DO NOTHING;

-- ─── AUDIT MODULE ───────────────────────────────────
INSERT INTO module_lifecycle_transitions (module_code, from_status, to_status, required_functional_roles, required_permission_code, authority_gate, authority_severity_map, sod_check, ownership_assignment, sla_hours, description_en) VALUES
('audit', 'planned', 'scoped', ARRAY['audit_manager'], 'audit.engagement.create', NULL, NULL, FALSE, NULL, 72, 'Scope audit engagement'),
('audit', 'scoped', 'fieldwork', ARRAY['auditor'], 'audit.workpaper.update', NULL, NULL, FALSE, '{"field":"auditor_user_id","source":"actor"}', NULL, 'Begin fieldwork'),
('audit', 'fieldwork', 'draft_report', ARRAY['auditor'], 'audit.report.create', 'submit', NULL, FALSE, NULL, 120, 'Draft audit report'),
('audit', 'draft_report', 'management_response', ARRAY['auditee_owner'], 'audit.finding.respond', NULL, NULL, TRUE, '{"field":"auditee_owner_user_id","source":"actor"}', 72, 'Management response to findings'),
('audit', 'management_response', 'final_report', ARRAY['auditor'], 'audit.report.create', 'review', NULL, FALSE, NULL, 48, 'Finalize audit report'),
('audit', 'final_report', 'approved', ARRAY['audit_manager'], 'audit.report.approve', 'approve_medium', NULL, FALSE, '{"field":"approver_user_id","source":"actor"}', 24, 'Approve audit report'),
('audit', 'approved', 'issued', ARRAY['audit_manager'], 'audit.report.approve', NULL, NULL, FALSE, NULL, NULL, 'Issue audit report'),
('audit', 'issued', 'finding_tracking', ARRAY['auditor'], 'audit.finding.issue', NULL, NULL, FALSE, NULL, NULL, 'Track audit findings'),
('audit', 'finding_tracking', 'closed', ARRAY['audit_manager'], 'audit.finding.close', 'approve_low', NULL, FALSE, NULL, NULL, 'Close audit engagement')
ON CONFLICT (module_code, from_status, to_status) DO NOTHING;

-- ─── INCIDENT MODULE ────────────────────────────────
INSERT INTO module_lifecycle_transitions (module_code, from_status, to_status, required_functional_roles, required_permission_code, authority_gate, authority_severity_map, sod_check, ownership_assignment, sla_hours, description_en) VALUES
('incident', 'reported', 'triaged', ARRAY['incident_owner'], 'incident.record.update', NULL, NULL, FALSE, '{"field":"owner_user_id","source":"actor"}', 4, 'Triage incident'),
('incident', 'triaged', 'investigating', ARRAY['incident_owner'], 'incident.record.update', NULL, NULL, FALSE, NULL, 24, 'Begin investigation'),
('incident', 'investigating', 'contained', ARRAY['incident_owner'], 'incident.record.update', NULL, NULL, FALSE, NULL, NULL, 'Contain incident'),
('incident', 'contained', 'escalated', ARRAY['incident_owner'], 'incident.record.escalate', 'escalate', NULL, FALSE, NULL, NULL, 'Escalate incident'),
('incident', 'contained', 'eradicated', ARRAY['incident_owner'], 'incident.record.update', NULL, NULL, FALSE, NULL, 48, 'Eradicate root cause'),
('incident', 'eradicated', 'recovered', ARRAY['incident_owner'], 'incident.record.update', NULL, NULL, FALSE, NULL, 24, 'Recovery complete'),
('incident', 'recovered', 'under_review', ARRAY['incident_reviewer'], 'incident.record.review', 'review', NULL, FALSE, '{"field":"reviewer_user_id","source":"actor"}', 48, 'Post-incident review'),
('incident', 'under_review', 'approved_closure', ARRAY['incident_approver'], 'incident.record.approve', NULL, '{"low":"approve_low","medium":"approve_medium","high":"approve_high","critical":"approve_high"}', TRUE, '{"field":"approver_user_id","source":"actor"}', 24, 'Approve incident closure'),
('incident', 'approved_closure', 'closed', ARRAY['incident_approver'], 'incident.record.approve', NULL, NULL, FALSE, NULL, NULL, 'Close incident'),
('incident', 'closed', 'lessons_learned', ARRAY['incident_reviewer'], 'incident.record.review', NULL, NULL, FALSE, NULL, NULL, 'Conduct lessons learned')
ON CONFLICT (module_code, from_status, to_status) DO NOTHING;

-- ─── EXCEPTION MODULE ───────────────────────────────
INSERT INTO module_lifecycle_transitions (module_code, from_status, to_status, required_functional_roles, required_permission_code, authority_gate, authority_severity_map, sod_check, ownership_assignment, sla_hours, description_en) VALUES
('exception', 'draft', 'submitted', ARRAY['exception_requester'], 'exception.request.create', 'submit', NULL, FALSE, NULL, NULL, 'Submit exception request'),
('exception', 'submitted', 'risk_assessed', ARRAY['exception_owner'], 'exception.request.review', 'review', NULL, FALSE, '{"field":"owner_user_id","source":"actor"}', 48, 'Assess exception risk'),
('exception', 'risk_assessed', 'under_review', ARRAY['exception_owner'], 'exception.request.review', 'review', NULL, FALSE, NULL, 24, 'Route for approval'),
('exception', 'under_review', 'approved', ARRAY['exception_approver'], 'exception.request.approve', NULL, '{"low":"approve_low","medium":"approve_medium","high":"approve_high"}', TRUE, '{"field":"approver_user_id","source":"actor"}', 48, 'Approve exception'),
('exception', 'under_review', 'rejected', ARRAY['exception_approver'], 'exception.request.approve', 'approve_low', NULL, FALSE, NULL, NULL, 'Reject exception'),
('exception', 'approved', 'active', ARRAY['exception_owner'], 'exception.request.review', NULL, NULL, FALSE, NULL, NULL, 'Activate exception'),
('exception', 'active', 'monitoring', ARRAY['exception_owner'], 'exception.request.review', NULL, NULL, FALSE, NULL, NULL, 'Monitor exception'),
('exception', 'monitoring', 'expired', ARRAY['exception_owner'], 'exception.request.review', NULL, NULL, FALSE, NULL, NULL, 'Exception expired'),
('exception', 'expired', 'renewed', ARRAY['exception_requester'], 'exception.request.create', 'submit', NULL, FALSE, NULL, NULL, 'Renew exception'),
('exception', 'expired', 'closed', ARRAY['exception_owner'], 'exception.request.review', NULL, NULL, FALSE, NULL, NULL, 'Close expired exception')
ON CONFLICT (module_code, from_status, to_status) DO NOTHING;

-- ─── GOVERNANCE MODULE ──────────────────────────────
INSERT INTO module_lifecycle_transitions (module_code, from_status, to_status, required_functional_roles, required_permission_code, authority_gate, authority_severity_map, sod_check, ownership_assignment, sla_hours, description_en) VALUES
('governance', 'draft', 'proposed', ARRAY['governance_manager','charter_owner'], 'governance.charter.update', 'submit', NULL, FALSE, NULL, NULL, 'Propose governance body'),
('governance', 'proposed', 'committee_review', ARRAY['committee_secretary'], 'governance.meeting.manage', 'review', NULL, FALSE, NULL, 72, 'Schedule committee review'),
('governance', 'committee_review', 'approved', ARRAY['executive_reviewer'], 'governance.body.create', 'approve_high', NULL, FALSE, '{"field":"approver_user_id","source":"actor"}', 48, 'Approve governance body'),
('governance', 'approved', 'active', ARRAY['governance_manager'], 'governance.charter.update', NULL, NULL, FALSE, NULL, NULL, 'Activate governance body'),
('governance', 'active', 'annual_review', ARRAY['governance_manager','charter_owner'], 'governance.charter.update', NULL, NULL, FALSE, NULL, NULL, 'Trigger annual review'),
('governance', 'annual_review', 'under_revision', ARRAY['charter_owner'], 'governance.charter.update', NULL, NULL, FALSE, NULL, NULL, 'Begin charter revision'),
('governance', 'under_revision', 're_approved', ARRAY['executive_reviewer'], 'governance.body.create', 'approve_high', NULL, FALSE, NULL, 48, 'Re-approve revised charter'),
('governance', 're_approved', 'active', ARRAY['governance_manager'], 'governance.charter.update', NULL, NULL, FALSE, NULL, NULL, 'Reactivate governance body'),
('governance', 'active', 'dissolved', ARRAY['executive_reviewer'], 'governance.body.create', 'override', NULL, FALSE, NULL, NULL, 'Dissolve governance body')
ON CONFLICT (module_code, from_status, to_status) DO NOTHING;

-- ─── VENDOR MODULE ──────────────────────────────────
INSERT INTO module_lifecycle_transitions (module_code, from_status, to_status, required_functional_roles, required_permission_code, authority_gate, authority_severity_map, sod_check, ownership_assignment, sla_hours, description_en) VALUES
('vendor', 'identified', 'questionnaire_sent', ARRAY['vendor_owner'], 'vendor.record.create', NULL, NULL, FALSE, '{"field":"owner_user_id","source":"actor"}', 24, 'Send vendor questionnaire'),
('vendor', 'questionnaire_sent', 'questionnaire_received', ARRAY['vendor_owner'], 'vendor.record.create', NULL, NULL, FALSE, NULL, NULL, 'Receive questionnaire'),
('vendor', 'questionnaire_received', 'assessing', ARRAY['vendor_assessor'], 'vendor.assessment.execute', NULL, NULL, TRUE, NULL, 72, 'Begin vendor assessment'),
('vendor', 'assessing', 'assessed', ARRAY['vendor_assessor'], 'vendor.assessment.execute', 'review', NULL, FALSE, NULL, 48, 'Complete assessment'),
('vendor', 'assessed', 'approved', ARRAY['vendor_assessor'], 'vendor.assessment.approve', NULL, '{"low":"approve_low","medium":"approve_medium","critical":"approve_high"}', FALSE, '{"field":"approver_user_id","source":"actor"}', 24, 'Approve vendor'),
('vendor', 'assessed', 'rejected', ARRAY['vendor_assessor'], 'vendor.assessment.approve', 'approve_low', NULL, FALSE, NULL, NULL, 'Reject vendor'),
('vendor', 'approved', 'onboarded', ARRAY['vendor_owner'], 'vendor.record.create', NULL, NULL, FALSE, NULL, NULL, 'Onboard vendor'),
('vendor', 'onboarded', 'active', ARRAY['vendor_owner'], 'vendor.record.create', NULL, NULL, FALSE, NULL, NULL, 'Activate vendor'),
('vendor', 'active', 'annual_review', ARRAY['vendor_assessor'], 'vendor.assessment.execute', NULL, NULL, FALSE, NULL, NULL, 'Trigger annual review'),
('vendor', 'annual_review', 're_assessed', ARRAY['vendor_assessor'], 'vendor.assessment.execute', 'review', NULL, FALSE, NULL, 72, 'Re-assess vendor'),
('vendor', 'active', 'offboarding', ARRAY['vendor_owner'], 'vendor.record.create', NULL, NULL, FALSE, NULL, NULL, 'Begin offboarding'),
('vendor', 'offboarding', 'offboarded', ARRAY['vendor_owner'], 'vendor.record.create', 'approve_low', NULL, FALSE, NULL, NULL, 'Complete offboarding')
ON CONFLICT (module_code, from_status, to_status) DO NOTHING;

-- ─── BCP MODULE ─────────────────────────────────────
INSERT INTO module_lifecycle_transitions (module_code, from_status, to_status, required_functional_roles, required_permission_code, authority_gate, authority_severity_map, sod_check, ownership_assignment, sla_hours, description_en) VALUES
('bcp', 'draft', 'planned', ARRAY['bcp_coordinator'], 'bcp.plan.update', 'submit', NULL, FALSE, '{"field":"owner_user_id","source":"actor"}', NULL, 'Plan BCP'),
('bcp', 'planned', 'tested', ARRAY['process_owner'], 'bcp.plan.update', NULL, NULL, FALSE, NULL, 120, 'Test BCP plan'),
('bcp', 'tested', 'evaluated', ARRAY['bcp_coordinator'], 'bcp.exercise.approve', 'review', NULL, FALSE, NULL, 48, 'Evaluate test results'),
('bcp', 'evaluated', 'approved', ARRAY['bcp_coordinator'], 'bcp.exercise.approve', 'approve_medium', NULL, FALSE, '{"field":"approver_user_id","source":"actor"}', 24, 'Approve BCP plan'),
('bcp', 'approved', 'active', ARRAY['bcp_coordinator'], 'bcp.plan.update', NULL, NULL, FALSE, NULL, NULL, 'Activate BCP plan'),
('bcp', 'active', 'exercised', ARRAY['process_owner'], 'bcp.plan.update', NULL, NULL, FALSE, NULL, NULL, 'Exercise BCP plan'),
('bcp', 'exercised', 'review_due', ARRAY['bcp_coordinator'], 'bcp.plan.update', NULL, NULL, FALSE, NULL, NULL, 'Schedule review'),
('bcp', 'review_due', 'under_revision', ARRAY['bcp_coordinator'], 'bcp.plan.update', NULL, NULL, FALSE, NULL, NULL, 'Begin BCP revision'),
('bcp', 'under_revision', 're_approved', ARRAY['bcp_coordinator'], 'bcp.exercise.approve', 'approve_medium', NULL, FALSE, NULL, 48, 'Re-approve BCP'),
('bcp', 're_approved', 'active', ARRAY['bcp_coordinator'], 'bcp.plan.update', NULL, NULL, FALSE, NULL, NULL, 'Reactivate BCP'),
('bcp', 'active', 'retired', ARRAY['bcp_coordinator'], 'bcp.plan.update', 'approve_low', NULL, FALSE, NULL, NULL, 'Retire BCP plan')
ON CONFLICT (module_code, from_status, to_status) DO NOTHING;

-- ─── ASSET MODULE ───────────────────────────────────
INSERT INTO module_lifecycle_transitions (module_code, from_status, to_status, required_functional_roles, required_permission_code, authority_gate, authority_severity_map, sod_check, ownership_assignment, sla_hours, description_en) VALUES
('asset', 'draft', 'registered', ARRAY['asset_owner'], 'asset.record.update', 'submit', NULL, FALSE, '{"field":"owner_user_id","source":"actor"}', NULL, 'Register asset'),
('asset', 'registered', 'classified', ARRAY['asset_custodian'], 'asset.record.update', NULL, NULL, FALSE, '{"field":"custodian_user_id","source":"actor"}', 48, 'Classify asset'),
('asset', 'classified', 'under_review', ARRAY['asset_custodian'], 'asset.classification.review', 'review', NULL, FALSE, NULL, 24, 'Review classification'),
('asset', 'under_review', 'approved', ARRAY['asset_owner'], 'asset.classification.review', 'approve_low', NULL, FALSE, NULL, 24, 'Approve classification'),
('asset', 'approved', 'active', ARRAY['asset_owner'], 'asset.record.update', NULL, NULL, FALSE, NULL, NULL, 'Activate asset'),
('asset', 'active', 'review_due', ARRAY['asset_custodian'], 'asset.record.update', NULL, NULL, FALSE, NULL, NULL, 'Schedule review'),
('asset', 'review_due', 'under_reclassification', ARRAY['asset_custodian'], 'asset.record.update', NULL, NULL, FALSE, NULL, NULL, 'Begin reclassification'),
('asset', 'under_reclassification', 're_approved', ARRAY['asset_owner'], 'asset.classification.review', 'approve_low', NULL, FALSE, NULL, 24, 'Re-approve classification'),
('asset', 're_approved', 'active', ARRAY['asset_owner'], 'asset.record.update', NULL, NULL, FALSE, NULL, NULL, 'Reactivate asset'),
('asset', 'active', 'decommissioned', ARRAY['asset_owner'], 'asset.record.update', 'approve_low', NULL, FALSE, NULL, NULL, 'Decommission asset')
ON CONFLICT (module_code, from_status, to_status) DO NOTHING;

-- ─── REMEDIATION MODULE ─────────────────────────────
INSERT INTO module_lifecycle_transitions (module_code, from_status, to_status, required_functional_roles, required_permission_code, authority_gate, authority_severity_map, sod_check, ownership_assignment, sla_hours, description_en) VALUES
('remediation', 'identified', 'planned', ARRAY['remediation_owner'], 'remediation.task.update', 'submit', NULL, FALSE, '{"field":"owner_user_id","source":"actor"}', 48, 'Plan remediation'),
('remediation', 'planned', 'in_progress', ARRAY['remediation_owner'], 'remediation.task.update', NULL, NULL, FALSE, NULL, NULL, 'Begin remediation work'),
('remediation', 'in_progress', 'verification_pending', ARRAY['remediation_owner'], 'remediation.task.update', 'submit', NULL, FALSE, NULL, NULL, 'Submit for verification'),
('remediation', 'verification_pending', 'verified', ARRAY['remediation_reviewer'], 'remediation.task.read', 'review', NULL, FALSE, '{"field":"reviewer_user_id","source":"actor"}', 48, 'Verify remediation'),
('remediation', 'verification_pending', 'verification_failed', ARRAY['remediation_reviewer'], 'remediation.task.read', 'review', NULL, FALSE, NULL, NULL, 'Fail verification'),
('remediation', 'verification_failed', 'in_progress', ARRAY['remediation_owner'], 'remediation.task.update', NULL, NULL, FALSE, NULL, 24, 'Rework after failed verification'),
('remediation', 'verified', 'closed', ARRAY['remediation_reviewer'], 'remediation.task.close', 'approve_low', NULL, FALSE, NULL, NULL, 'Close remediation')
ON CONFLICT (module_code, from_status, to_status) DO NOTHING;

-- ─── ACTION ITEMS MODULE ────────────────────────────
INSERT INTO module_lifecycle_transitions (module_code, from_status, to_status, required_functional_roles, required_permission_code, authority_gate, authority_severity_map, sod_check, ownership_assignment, sla_hours, description_en) VALUES
('action', 'open', 'in_progress', ARRAY['action_owner'], 'action.item.update', NULL, NULL, FALSE, '{"field":"owner_user_id","source":"actor"}', NULL, 'Start action item'),
('action', 'in_progress', 'completed', ARRAY['action_owner'], 'action.item.update', 'submit', NULL, FALSE, NULL, NULL, 'Complete action item'),
('action', 'completed', 'verified', ARRAY['action_owner'], 'action.item.close', 'review', NULL, FALSE, NULL, 48, 'Verify completion'),
('action', 'verified', 'closed', ARRAY['action_owner'], 'action.item.close', 'approve_low', NULL, FALSE, NULL, NULL, 'Close action item'),
('action', 'in_progress', 'overdue', ARRAY['action_owner'], 'action.item.update', NULL, NULL, FALSE, NULL, NULL, 'Mark overdue'),
('action', 'overdue', 'escalated', ARRAY['action_owner'], 'action.item.update', 'escalate', NULL, FALSE, NULL, NULL, 'Escalate overdue item'),
('action', 'escalated', 'in_progress', ARRAY['action_owner'], 'action.item.update', NULL, NULL, FALSE, NULL, NULL, 'Resume after escalation')
ON CONFLICT (module_code, from_status, to_status) DO NOTHING;

-- ═══════════════════════════════════════════════════
-- 5. VALIDATION
-- ═══════════════════════════════════════════════════

DO $$
DECLARE
  mod_count INT;
  trans_count INT;
  sod_trans INT;
BEGIN
  SELECT COUNT(*) INTO mod_count FROM module_lifecycle_definitions;
  SELECT COUNT(*) INTO trans_count FROM module_lifecycle_transitions;
  SELECT COUNT(*) INTO sod_trans FROM module_lifecycle_transitions WHERE sod_check = TRUE;

  RAISE NOTICE 'Migration 174: Module Lifecycle Definitions';
  RAISE NOTICE '- Module definitions: %', mod_count;
  RAISE NOTICE '- Total transitions: %', trans_count;
  RAISE NOTICE '- Transitions with SoD checks: %', sod_trans;
END $$;
