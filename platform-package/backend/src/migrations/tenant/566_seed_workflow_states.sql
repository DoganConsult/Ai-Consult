-- ============================================
-- Tenant Migration 266
-- Seed: Workflow states and transitions for
-- all 4 archetypes × 8 primary modules.
-- ============================================

-- ============================================
-- LEAN ORG — Minimal workflows (3-4 states)
-- ============================================

-- Risk: draft → review → accepted
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'risk', 'draft',    'Draft',    1, TRUE,  FALSE, NULL),
  ('lean_org', 'risk', 'review',   'In Review', 2, FALSE, FALSE, 12),
  ('lean_org', 'risk', 'accepted', 'Accepted', 3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'risk', 'draft',  'review',   'risk.submit',  'submit',  0),
  ('lean_org', 'risk', 'review', 'accepted', 'risk.approve', 'approve', 1),
  ('lean_org', 'risk', 'review', 'draft',    'risk.return',  'approve', 0)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Compliance: draft → review → approved
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'compliance', 'draft',    'Draft',    1, TRUE,  FALSE, NULL),
  ('lean_org', 'compliance', 'review',   'In Review', 2, FALSE, FALSE, 12),
  ('lean_org', 'compliance', 'approved', 'Approved', 3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'compliance', 'draft',  'review',   'compliance.submit',  'submit',  0),
  ('lean_org', 'compliance', 'review', 'approved', 'compliance.approve', 'approve', 1),
  ('lean_org', 'compliance', 'review', 'draft',    'compliance.return',  'approve', 0)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Policy: draft → review → published
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'policy', 'draft',     'Draft',     1, TRUE,  FALSE, NULL),
  ('lean_org', 'policy', 'review',    'In Review', 2, FALSE, FALSE, 24),
  ('lean_org', 'policy', 'published', 'Published', 3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'policy', 'draft',  'review',    'policy.submit',  'submit',  0),
  ('lean_org', 'policy', 'review', 'published', 'policy.approve', 'approve', 1),
  ('lean_org', 'policy', 'review', 'draft',     'policy.return',  'approve', 0)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Audit: planned → fieldwork → reporting → closed
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'audit', 'planned',   'Planned',   1, TRUE,  FALSE, NULL),
  ('lean_org', 'audit', 'fieldwork', 'Fieldwork', 2, FALSE, FALSE, 48),
  ('lean_org', 'audit', 'reporting', 'Reporting', 3, FALSE, FALSE, 24),
  ('lean_org', 'audit', 'closed',    'Closed',    4, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'audit', 'planned',   'fieldwork', 'audit.start',     'submit',  0),
  ('lean_org', 'audit', 'fieldwork', 'reporting', 'audit.report',    'submit',  0),
  ('lean_org', 'audit', 'reporting', 'closed',    'audit.close',     'approve', 1),
  ('lean_org', 'audit', 'reporting', 'fieldwork', 'audit.reopen',    'approve', 0)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Incident: reported → triaged → resolved
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'incident', 'reported', 'Reported', 1, TRUE,  FALSE, NULL),
  ('lean_org', 'incident', 'triaged',  'Triaged',  2, FALSE, FALSE, 4),
  ('lean_org', 'incident', 'resolved', 'Resolved', 3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'incident', 'reported', 'triaged',  'incident.triage',  'submit',  0),
  ('lean_org', 'incident', 'triaged',  'resolved', 'incident.resolve', 'approve', 1)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Evidence: collected → validated
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'evidence', 'collected', 'Collected', 1, TRUE,  FALSE, NULL),
  ('lean_org', 'evidence', 'validated', 'Validated', 2, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'evidence', 'collected', 'validated', 'evidence.validate', 'approve', 1)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Vendor: identified → assessed → approved
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'vendor', 'identified', 'Identified', 1, TRUE,  FALSE, NULL),
  ('lean_org', 'vendor', 'assessed',   'Assessed',   2, FALSE, FALSE, 24),
  ('lean_org', 'vendor', 'approved',   'Approved',   3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'vendor', 'identified', 'assessed', 'vendor.assess',  'submit',  0),
  ('lean_org', 'vendor', 'assessed',   'approved', 'vendor.approve', 'approve', 1)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- BCP: draft → review → activated
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'bcp', 'draft',     'Draft',     1, TRUE,  FALSE, NULL),
  ('lean_org', 'bcp', 'review',    'In Review', 2, FALSE, FALSE, 24),
  ('lean_org', 'bcp', 'activated', 'Activated', 3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'bcp', 'draft',  'review',    'bcp.submit',  'submit',  0),
  ('lean_org', 'bcp', 'review', 'activated', 'bcp.approve', 'approve', 1)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Governance: draft → review → approved
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'governance', 'draft',    'Draft',    1, TRUE,  FALSE, NULL),
  ('lean_org', 'governance', 'review',   'In Review', 2, FALSE, FALSE, 24),
  ('lean_org', 'governance', 'approved', 'Approved', 3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'governance', 'draft',  'review',   'governance.submit',  'submit',  0),
  ('lean_org', 'governance', 'review', 'approved', 'governance.approve', 'approve', 1),
  ('lean_org', 'governance', 'review', 'draft',    'governance.return',  'approve', 0)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Asset: identified → classified → approved
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'asset', 'identified', 'Identified', 1, TRUE,  FALSE, NULL),
  ('lean_org', 'asset', 'classified', 'Classified', 2, FALSE, FALSE, 12),
  ('lean_org', 'asset', 'approved',   'Approved',   3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'asset', 'identified', 'classified', 'asset.classify', 'submit',  0),
  ('lean_org', 'asset', 'classified', 'approved',   'asset.approve',  'approve', 1)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Exception: requested → review → approved / rejected
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'exception', 'requested', 'Requested', 1, TRUE,  FALSE, NULL),
  ('lean_org', 'exception', 'review',    'In Review', 2, FALSE, FALSE, 24),
  ('lean_org', 'exception', 'approved',  'Approved',  3, FALSE, TRUE,  NULL),
  ('lean_org', 'exception', 'rejected',  'Rejected',  4, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'exception', 'requested', 'review',   'exception.submit',  'submit',  0),
  ('lean_org', 'exception', 'review',    'approved', 'exception.approve', 'approve', 1),
  ('lean_org', 'exception', 'review',    'rejected', 'exception.reject',  'approve', 1)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Remediation: open → in_progress → verified → closed
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'remediation', 'open',        'Open',        1, TRUE,  FALSE, NULL),
  ('lean_org', 'remediation', 'in_progress', 'In Progress', 2, FALSE, FALSE, 48),
  ('lean_org', 'remediation', 'verified',    'Verified',    3, FALSE, FALSE, 24),
  ('lean_org', 'remediation', 'closed',      'Closed',      4, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'remediation', 'open',        'in_progress', 'remediation.start',  'submit',  0),
  ('lean_org', 'remediation', 'in_progress', 'verified',    'remediation.verify', 'submit',  0),
  ('lean_org', 'remediation', 'verified',    'closed',      'remediation.close',  'approve', 1)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Action: open → in_progress → completed
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'action', 'open',        'Open',        1, TRUE,  FALSE, NULL),
  ('lean_org', 'action', 'in_progress', 'In Progress', 2, FALSE, FALSE, 24),
  ('lean_org', 'action', 'completed',   'Completed',   3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'action', 'open',        'in_progress', 'action.start',    'submit', 0),
  ('lean_org', 'action', 'in_progress', 'completed',   'action.complete', 'submit', 0)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Reporting: draft → generated → published
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'reporting', 'draft',     'Draft',     1, TRUE,  FALSE, NULL),
  ('lean_org', 'reporting', 'generated', 'Generated', 2, FALSE, FALSE, 12),
  ('lean_org', 'reporting', 'published', 'Published', 3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'reporting', 'draft',     'generated', 'reporting.generate', 'submit',  0),
  ('lean_org', 'reporting', 'generated', 'published', 'reporting.publish',  'approve', 1)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;


-- ============================================
-- STANDARD ENTERPRISE — Balanced workflows (5-6 states)
-- ============================================

-- Risk: draft → assessment → review → approval → accepted / rejected
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'risk', 'draft',      'Draft',      1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'risk', 'assessment', 'Assessment', 2, FALSE, FALSE, 24),
  ('standard_enterprise', 'risk', 'review',     'In Review',  3, FALSE, FALSE, 24),
  ('standard_enterprise', 'risk', 'approval',   'Approval',   4, FALSE, FALSE, 24),
  ('standard_enterprise', 'risk', 'accepted',   'Accepted',   5, FALSE, TRUE,  NULL),
  ('standard_enterprise', 'risk', 'rejected',   'Rejected',   6, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'risk', 'draft',      'assessment', 'risk.submit',   'submit',  0, FALSE),
  ('standard_enterprise', 'risk', 'assessment', 'review',     'risk.assess',   'submit',  0, FALSE),
  ('standard_enterprise', 'risk', 'review',     'approval',   'risk.endorse',  'approve', 1, TRUE),
  ('standard_enterprise', 'risk', 'approval',   'accepted',   'risk.approve',  'approve', 1, TRUE),
  ('standard_enterprise', 'risk', 'approval',   'rejected',   'risk.reject',   'approve', 1, FALSE),
  ('standard_enterprise', 'risk', 'review',     'draft',      'risk.return',   'approve', 0, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Compliance: draft → mapping → review → approval → approved
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'compliance', 'draft',    'Draft',             1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'compliance', 'mapping',  'Obligation Mapping', 2, FALSE, FALSE, 48),
  ('standard_enterprise', 'compliance', 'review',   'In Review',         3, FALSE, FALSE, 24),
  ('standard_enterprise', 'compliance', 'approval', 'Approval',          4, FALSE, FALSE, 24),
  ('standard_enterprise', 'compliance', 'approved', 'Approved',          5, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'compliance', 'draft',    'mapping',  'compliance.submit',  'submit',  0, FALSE),
  ('standard_enterprise', 'compliance', 'mapping',  'review',   'compliance.map',     'submit',  0, FALSE),
  ('standard_enterprise', 'compliance', 'review',   'approval', 'compliance.endorse', 'approve', 1, TRUE),
  ('standard_enterprise', 'compliance', 'approval', 'approved', 'compliance.approve', 'approve', 1, TRUE),
  ('standard_enterprise', 'compliance', 'review',   'draft',    'compliance.return',  'approve', 0, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Policy: draft → review → legal_review → approval → published
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'policy', 'draft',        'Draft',        1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'policy', 'review',       'In Review',    2, FALSE, FALSE, 24),
  ('standard_enterprise', 'policy', 'legal_review', 'Legal Review', 3, FALSE, FALSE, 48),
  ('standard_enterprise', 'policy', 'approval',     'Approval',     4, FALSE, FALSE, 24),
  ('standard_enterprise', 'policy', 'published',    'Published',    5, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'policy', 'draft',        'review',       'policy.submit',  'submit',  0, FALSE),
  ('standard_enterprise', 'policy', 'review',       'legal_review', 'policy.endorse', 'approve', 1, TRUE),
  ('standard_enterprise', 'policy', 'legal_review', 'approval',     'policy.legal',   'approve', 1, TRUE),
  ('standard_enterprise', 'policy', 'approval',     'published',    'policy.approve', 'approve', 1, TRUE),
  ('standard_enterprise', 'policy', 'review',       'draft',        'policy.return',  'approve', 0, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Audit: planned → scoping → fieldwork → reporting → review → closed
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'audit', 'planned',   'Planned',   1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'audit', 'scoping',   'Scoping',   2, FALSE, FALSE, 48),
  ('standard_enterprise', 'audit', 'fieldwork', 'Fieldwork', 3, FALSE, FALSE, 120),
  ('standard_enterprise', 'audit', 'reporting', 'Reporting', 4, FALSE, FALSE, 48),
  ('standard_enterprise', 'audit', 'review',    'Review',    5, FALSE, FALSE, 24),
  ('standard_enterprise', 'audit', 'closed',    'Closed',    6, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'audit', 'planned',   'scoping',   'audit.scope',   'submit',  0, FALSE),
  ('standard_enterprise', 'audit', 'scoping',   'fieldwork', 'audit.start',   'approve', 1, FALSE),
  ('standard_enterprise', 'audit', 'fieldwork', 'reporting', 'audit.report',  'submit',  0, FALSE),
  ('standard_enterprise', 'audit', 'reporting', 'review',    'audit.submit',  'submit',  0, FALSE),
  ('standard_enterprise', 'audit', 'review',    'closed',    'audit.close',   'approve', 1, TRUE),
  ('standard_enterprise', 'audit', 'review',    'fieldwork', 'audit.reopen',  'approve', 0, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Incident: reported → triaged → investigating → resolved → closed
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'incident', 'reported',      'Reported',      1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'incident', 'triaged',       'Triaged',       2, FALSE, FALSE, 2),
  ('standard_enterprise', 'incident', 'investigating', 'Investigating', 3, FALSE, FALSE, 24),
  ('standard_enterprise', 'incident', 'resolved',      'Resolved',      4, FALSE, FALSE, 48),
  ('standard_enterprise', 'incident', 'closed',        'Closed',        5, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'incident', 'reported',      'triaged',       'incident.triage',      'submit',  0, FALSE),
  ('standard_enterprise', 'incident', 'triaged',       'investigating', 'incident.investigate', 'submit',  0, FALSE),
  ('standard_enterprise', 'incident', 'investigating', 'resolved',      'incident.resolve',     'approve', 1, TRUE),
  ('standard_enterprise', 'incident', 'resolved',      'closed',        'incident.close',       'approve', 1, TRUE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Evidence: collected → review → validated / rejected
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'evidence', 'collected', 'Collected', 1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'evidence', 'review',    'In Review', 2, FALSE, FALSE, 24),
  ('standard_enterprise', 'evidence', 'validated', 'Validated', 3, FALSE, TRUE,  NULL),
  ('standard_enterprise', 'evidence', 'rejected',  'Rejected',  4, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'evidence', 'collected', 'review',    'evidence.submit',   'submit',  0, FALSE),
  ('standard_enterprise', 'evidence', 'review',    'validated', 'evidence.validate', 'approve', 1, TRUE),
  ('standard_enterprise', 'evidence', 'review',    'rejected',  'evidence.reject',   'approve', 1, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Vendor: identified → due_diligence → assessed → approval → approved / rejected
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'vendor', 'identified',    'Identified',    1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'vendor', 'due_diligence', 'Due Diligence', 2, FALSE, FALSE, 72),
  ('standard_enterprise', 'vendor', 'assessed',      'Assessed',      3, FALSE, FALSE, 24),
  ('standard_enterprise', 'vendor', 'approval',      'Approval',      4, FALSE, FALSE, 24),
  ('standard_enterprise', 'vendor', 'approved',      'Approved',      5, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'vendor', 'identified',    'due_diligence', 'vendor.start',   'submit',  0, FALSE),
  ('standard_enterprise', 'vendor', 'due_diligence', 'assessed',      'vendor.assess',  'submit',  0, FALSE),
  ('standard_enterprise', 'vendor', 'assessed',      'approval',      'vendor.endorse', 'approve', 1, TRUE),
  ('standard_enterprise', 'vendor', 'approval',      'approved',      'vendor.approve', 'approve', 1, TRUE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- BCP: draft → review → approval → activated → tested
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'bcp', 'draft',     'Draft',       1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'bcp', 'review',    'In Review',   2, FALSE, FALSE, 48),
  ('standard_enterprise', 'bcp', 'approval',  'Approval',    3, FALSE, FALSE, 24),
  ('standard_enterprise', 'bcp', 'activated', 'Activated',   4, FALSE, FALSE, NULL),
  ('standard_enterprise', 'bcp', 'tested',    'Tested',      5, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'bcp', 'draft',     'review',    'bcp.submit',   'submit',  0, FALSE),
  ('standard_enterprise', 'bcp', 'review',    'approval',  'bcp.endorse',  'approve', 1, TRUE),
  ('standard_enterprise', 'bcp', 'approval',  'activated', 'bcp.approve',  'approve', 1, TRUE),
  ('standard_enterprise', 'bcp', 'activated', 'tested',    'bcp.test',     'submit',  0, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Governance: draft → review → legal_review → approval → approved
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'governance', 'draft',        'Draft',        1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'governance', 'review',       'In Review',    2, FALSE, FALSE, 24),
  ('standard_enterprise', 'governance', 'legal_review', 'Legal Review', 3, FALSE, FALSE, 48),
  ('standard_enterprise', 'governance', 'approval',     'Approval',     4, FALSE, FALSE, 24),
  ('standard_enterprise', 'governance', 'approved',     'Approved',     5, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'governance', 'draft',        'review',       'governance.submit',  'submit',  0, FALSE),
  ('standard_enterprise', 'governance', 'review',       'legal_review', 'governance.endorse', 'approve', 1, TRUE),
  ('standard_enterprise', 'governance', 'legal_review', 'approval',     'governance.legal',   'approve', 1, TRUE),
  ('standard_enterprise', 'governance', 'approval',     'approved',     'governance.approve', 'approve', 1, TRUE),
  ('standard_enterprise', 'governance', 'review',       'draft',        'governance.return',  'approve', 0, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Asset: identified → classified → review → approved
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'asset', 'identified', 'Identified', 1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'asset', 'classified', 'Classified', 2, FALSE, FALSE, 24),
  ('standard_enterprise', 'asset', 'review',     'In Review',  3, FALSE, FALSE, 24),
  ('standard_enterprise', 'asset', 'approved',   'Approved',   4, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'asset', 'identified', 'classified', 'asset.classify', 'submit',  0, FALSE),
  ('standard_enterprise', 'asset', 'classified', 'review',     'asset.submit',   'submit',  0, FALSE),
  ('standard_enterprise', 'asset', 'review',     'approved',   'asset.approve',  'approve', 1, TRUE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Exception: requested → review → approval → approved / rejected
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'exception', 'requested', 'Requested', 1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'exception', 'review',    'In Review', 2, FALSE, FALSE, 24),
  ('standard_enterprise', 'exception', 'approval',  'Approval',  3, FALSE, FALSE, 24),
  ('standard_enterprise', 'exception', 'approved',  'Approved',  4, FALSE, TRUE,  NULL),
  ('standard_enterprise', 'exception', 'rejected',  'Rejected',  5, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'exception', 'requested', 'review',   'exception.submit',  'submit',  0, FALSE),
  ('standard_enterprise', 'exception', 'review',    'approval', 'exception.endorse', 'approve', 1, TRUE),
  ('standard_enterprise', 'exception', 'approval',  'approved', 'exception.approve', 'approve', 1, TRUE),
  ('standard_enterprise', 'exception', 'approval',  'rejected', 'exception.reject',  'approve', 1, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Remediation: open → in_progress → verification → review → closed
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'remediation', 'open',          'Open',          1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'remediation', 'in_progress',   'In Progress',   2, FALSE, FALSE, 72),
  ('standard_enterprise', 'remediation', 'verification',  'Verification',  3, FALSE, FALSE, 24),
  ('standard_enterprise', 'remediation', 'review',        'Review',        4, FALSE, FALSE, 24),
  ('standard_enterprise', 'remediation', 'closed',        'Closed',        5, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'remediation', 'open',          'in_progress',  'remediation.start',  'submit',  0, FALSE),
  ('standard_enterprise', 'remediation', 'in_progress',   'verification', 'remediation.verify', 'submit',  0, FALSE),
  ('standard_enterprise', 'remediation', 'verification',  'review',       'remediation.submit', 'submit',  0, FALSE),
  ('standard_enterprise', 'remediation', 'review',        'closed',       'remediation.close',  'approve', 1, TRUE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Action: open → in_progress → review → completed
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'action', 'open',        'Open',        1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'action', 'in_progress', 'In Progress', 2, FALSE, FALSE, 48),
  ('standard_enterprise', 'action', 'review',      'Review',      3, FALSE, FALSE, 24),
  ('standard_enterprise', 'action', 'completed',   'Completed',   4, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'action', 'open',        'in_progress', 'action.start',    'submit',  0, FALSE),
  ('standard_enterprise', 'action', 'in_progress', 'review',      'action.submit',   'submit',  0, FALSE),
  ('standard_enterprise', 'action', 'review',      'completed',   'action.complete', 'approve', 1, TRUE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Reporting: draft → review → generated → published
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'reporting', 'draft',     'Draft',     1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'reporting', 'review',    'In Review', 2, FALSE, FALSE, 24),
  ('standard_enterprise', 'reporting', 'generated', 'Generated', 3, FALSE, FALSE, 12),
  ('standard_enterprise', 'reporting', 'published', 'Published', 4, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'reporting', 'draft',     'review',    'reporting.submit',   'submit',  0, FALSE),
  ('standard_enterprise', 'reporting', 'review',    'generated', 'reporting.generate', 'approve', 1, TRUE),
  ('standard_enterprise', 'reporting', 'generated', 'published', 'reporting.publish',  'approve', 1, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;


-- ============================================
-- REGULATED ENTERPRISE — Strict workflows (7-8 states)
-- ============================================

-- Risk: draft → assessment → peer_review → committee_review → approval → accepted / remediation
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'risk', 'draft',            'Draft',            1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'risk', 'assessment',       'Assessment',       2, FALSE, FALSE, FALSE, 36),
  ('regulated_enterprise', 'risk', 'peer_review',      'Peer Review',      3, FALSE, FALSE, TRUE,  36),
  ('regulated_enterprise', 'risk', 'committee_review', 'Committee Review', 4, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'risk', 'approval',         'Approval',         5, FALSE, FALSE, TRUE,  36),
  ('regulated_enterprise', 'risk', 'accepted',         'Accepted',         6, FALSE, TRUE,  FALSE, NULL),
  ('regulated_enterprise', 'risk', 'remediation',      'Remediation',      7, FALSE, FALSE, FALSE, 72)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('regulated_enterprise', 'risk', 'draft',            'assessment',       'risk.submit',    'submit',    0, FALSE, FALSE, NULL),
  ('regulated_enterprise', 'risk', 'assessment',       'peer_review',      'risk.assess',    'submit',    0, FALSE, TRUE,  48),
  ('regulated_enterprise', 'risk', 'peer_review',      'committee_review', 'risk.endorse',   'approve',   2, TRUE,  TRUE,  48),
  ('regulated_enterprise', 'risk', 'committee_review', 'approval',         'risk.committee', 'committee', 2, TRUE,  TRUE,  72),
  ('regulated_enterprise', 'risk', 'approval',         'accepted',         'risk.approve',   'approve',   2, TRUE,  TRUE,  48),
  ('regulated_enterprise', 'risk', 'approval',         'remediation',      'risk.remediate', 'approve',   1, FALSE, FALSE, NULL),
  ('regulated_enterprise', 'risk', 'remediation',      'peer_review',      'risk.resubmit',  'submit',    0, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Compliance: draft → mapping → assessment → peer_review → committee → approved
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'compliance', 'draft',      'Draft',            1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'compliance', 'mapping',    'Obligation Mapping', 2, FALSE, FALSE, FALSE, 48),
  ('regulated_enterprise', 'compliance', 'assessment', 'Gap Assessment',   3, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'compliance', 'peer_review','Peer Review',      4, FALSE, FALSE, TRUE,  36),
  ('regulated_enterprise', 'compliance', 'committee',  'Committee Review', 5, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'compliance', 'approved',   'Approved',         6, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'compliance', 'draft',       'mapping',     'compliance.submit',    'submit',    0, FALSE, FALSE),
  ('regulated_enterprise', 'compliance', 'mapping',     'assessment',  'compliance.map',       'submit',    0, FALSE, TRUE),
  ('regulated_enterprise', 'compliance', 'assessment',  'peer_review', 'compliance.assess',    'approve',   1, TRUE,  TRUE),
  ('regulated_enterprise', 'compliance', 'peer_review', 'committee',   'compliance.endorse',   'approve',   2, TRUE,  TRUE),
  ('regulated_enterprise', 'compliance', 'committee',   'approved',    'compliance.committee', 'committee', 2, TRUE,  TRUE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Policy: draft → review → legal → compliance_review → committee → published
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'policy', 'draft',             'Draft',             1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'policy', 'review',            'In Review',         2, FALSE, FALSE, FALSE, 36),
  ('regulated_enterprise', 'policy', 'legal_review',      'Legal Review',      3, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'policy', 'compliance_review', 'Compliance Review', 4, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'policy', 'committee',         'Committee Approval', 5, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'policy', 'published',         'Published',         6, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'policy', 'draft',             'review',            'policy.submit',     'submit',    0, FALSE, FALSE),
  ('regulated_enterprise', 'policy', 'review',            'legal_review',      'policy.endorse',    'approve',   1, TRUE,  FALSE),
  ('regulated_enterprise', 'policy', 'legal_review',      'compliance_review', 'policy.legal',      'approve',   1, TRUE,  TRUE),
  ('regulated_enterprise', 'policy', 'compliance_review', 'committee',         'policy.compliance', 'approve',   1, TRUE,  TRUE),
  ('regulated_enterprise', 'policy', 'committee',         'published',         'policy.approve',    'committee', 2, TRUE,  TRUE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Audit: planned → scoping → fieldwork → draft_report → review → qa → management_response → closed
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'audit', 'planned',             'Planned',             1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'audit', 'scoping',             'Scoping',             2, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'audit', 'fieldwork',           'Fieldwork',           3, FALSE, FALSE, TRUE,  240),
  ('regulated_enterprise', 'audit', 'draft_report',        'Draft Report',        4, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'audit', 'review',              'Review',              5, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'audit', 'qa',                  'QA',                  6, FALSE, FALSE, TRUE,  36),
  ('regulated_enterprise', 'audit', 'management_response', 'Management Response', 7, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'audit', 'closed',              'Closed',              8, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'audit', 'planned',             'scoping',             'audit.scope',     'submit',    0, FALSE, TRUE),
  ('regulated_enterprise', 'audit', 'scoping',             'fieldwork',           'audit.start',     'approve',   1, TRUE,  TRUE),
  ('regulated_enterprise', 'audit', 'fieldwork',           'draft_report',        'audit.draft',     'submit',    0, FALSE, TRUE),
  ('regulated_enterprise', 'audit', 'draft_report',        'review',              'audit.submit',    'submit',    0, FALSE, TRUE),
  ('regulated_enterprise', 'audit', 'review',              'qa',                  'audit.qa',        'approve',   2, TRUE,  TRUE),
  ('regulated_enterprise', 'audit', 'qa',                  'management_response', 'audit.mgmt',      'approve',   1, TRUE,  TRUE),
  ('regulated_enterprise', 'audit', 'management_response', 'closed',              'audit.close',     'committee', 2, TRUE,  TRUE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Incident: reported → triaged → investigating → containment → resolved → pir → closed
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'incident', 'reported',      'Reported',      1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'incident', 'triaged',       'Triaged',       2, FALSE, FALSE, FALSE, 1),
  ('regulated_enterprise', 'incident', 'investigating', 'Investigating', 3, FALSE, FALSE, TRUE,  12),
  ('regulated_enterprise', 'incident', 'containment',   'Containment',   4, FALSE, FALSE, TRUE,  24),
  ('regulated_enterprise', 'incident', 'resolved',      'Resolved',      5, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'incident', 'pir',           'Post-Incident Review', 6, FALSE, FALSE, TRUE, 72),
  ('regulated_enterprise', 'incident', 'closed',        'Closed',        7, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'incident', 'reported',      'triaged',       'incident.triage',      'submit',  0, FALSE, FALSE),
  ('regulated_enterprise', 'incident', 'triaged',       'investigating', 'incident.investigate', 'submit',  0, FALSE, FALSE),
  ('regulated_enterprise', 'incident', 'investigating', 'containment',   'incident.contain',     'approve', 1, TRUE,  TRUE),
  ('regulated_enterprise', 'incident', 'containment',   'resolved',      'incident.resolve',     'approve', 2, TRUE,  TRUE),
  ('regulated_enterprise', 'incident', 'resolved',      'pir',           'incident.pir',         'submit',  0, FALSE, TRUE),
  ('regulated_enterprise', 'incident', 'pir',           'closed',        'incident.close',       'approve', 2, TRUE,  TRUE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Evidence: collected → review → verification → validated / rejected
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'evidence', 'collected',    'Collected',    1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'evidence', 'review',       'In Review',    2, FALSE, FALSE, TRUE,  24),
  ('regulated_enterprise', 'evidence', 'verification', 'Verification', 3, FALSE, FALSE, TRUE,  36),
  ('regulated_enterprise', 'evidence', 'validated',    'Validated',    4, FALSE, TRUE,  FALSE, NULL),
  ('regulated_enterprise', 'evidence', 'rejected',     'Rejected',     5, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'evidence', 'collected',    'review',       'evidence.submit',   'submit',  0, FALSE, FALSE),
  ('regulated_enterprise', 'evidence', 'review',       'verification', 'evidence.review',   'approve', 1, TRUE,  TRUE),
  ('regulated_enterprise', 'evidence', 'verification', 'validated',    'evidence.validate', 'approve', 2, TRUE,  TRUE),
  ('regulated_enterprise', 'evidence', 'verification', 'rejected',     'evidence.reject',   'approve', 1, FALSE, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Vendor: identified → screening → due_diligence → assessment → committee → approved / rejected
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'vendor', 'identified',    'Identified',    1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'vendor', 'screening',     'Screening',     2, FALSE, FALSE, FALSE, 48),
  ('regulated_enterprise', 'vendor', 'due_diligence', 'Due Diligence', 3, FALSE, FALSE, TRUE,  120),
  ('regulated_enterprise', 'vendor', 'assessment',    'Risk Assessment', 4, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'vendor', 'committee',     'Committee Review', 5, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'vendor', 'approved',      'Approved',      6, FALSE, TRUE,  FALSE, NULL),
  ('regulated_enterprise', 'vendor', 'rejected',      'Rejected',      7, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'vendor', 'identified',    'screening',     'vendor.screen',    'submit',    0, FALSE, FALSE),
  ('regulated_enterprise', 'vendor', 'screening',     'due_diligence', 'vendor.diligence', 'submit',    0, FALSE, FALSE),
  ('regulated_enterprise', 'vendor', 'due_diligence', 'assessment',    'vendor.assess',    'approve',   1, TRUE,  TRUE),
  ('regulated_enterprise', 'vendor', 'assessment',    'committee',     'vendor.endorse',   'approve',   2, TRUE,  TRUE),
  ('regulated_enterprise', 'vendor', 'committee',     'approved',      'vendor.approve',   'committee', 2, TRUE,  TRUE),
  ('regulated_enterprise', 'vendor', 'committee',     'rejected',      'vendor.reject',    'committee', 2, FALSE, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- BCP: draft → bia → strategy → review → committee → activated → tested
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'bcp', 'draft',     'Draft',             1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'bcp', 'bia',       'Business Impact',   2, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'bcp', 'strategy',  'Strategy',          3, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'bcp', 'review',    'In Review',         4, FALSE, FALSE, TRUE,  36),
  ('regulated_enterprise', 'bcp', 'committee', 'Committee Approval', 5, FALSE, FALSE, TRUE, 48),
  ('regulated_enterprise', 'bcp', 'activated', 'Activated',         6, FALSE, FALSE, FALSE, NULL),
  ('regulated_enterprise', 'bcp', 'tested',    'Tested',            7, FALSE, TRUE,  TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'bcp', 'draft',     'bia',       'bcp.bia',       'submit',    0, FALSE, TRUE),
  ('regulated_enterprise', 'bcp', 'bia',       'strategy',  'bcp.strategy',  'submit',    0, FALSE, TRUE),
  ('regulated_enterprise', 'bcp', 'strategy',  'review',    'bcp.submit',    'submit',    0, FALSE, TRUE),
  ('regulated_enterprise', 'bcp', 'review',    'committee', 'bcp.endorse',   'approve',   2, TRUE,  TRUE),
  ('regulated_enterprise', 'bcp', 'committee', 'activated', 'bcp.approve',   'committee', 2, TRUE,  TRUE),
  ('regulated_enterprise', 'bcp', 'activated', 'tested',    'bcp.test',      'submit',    0, FALSE, TRUE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Governance: draft → review → legal → compliance → committee → approved
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'governance', 'draft',      'Draft',             1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'governance', 'review',     'In Review',         2, FALSE, FALSE, FALSE, 36),
  ('regulated_enterprise', 'governance', 'legal',      'Legal Review',      3, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'governance', 'compliance', 'Compliance Review', 4, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'governance', 'committee',  'Committee',         5, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'governance', 'approved',   'Approved',          6, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'governance', 'draft',      'review',     'governance.submit',     'submit',    0, FALSE, FALSE),
  ('regulated_enterprise', 'governance', 'review',     'legal',      'governance.endorse',    'approve',   1, TRUE,  FALSE),
  ('regulated_enterprise', 'governance', 'legal',      'compliance', 'governance.legal',      'approve',   1, TRUE,  TRUE),
  ('regulated_enterprise', 'governance', 'compliance', 'committee',  'governance.compliance', 'approve',   1, TRUE,  TRUE),
  ('regulated_enterprise', 'governance', 'committee',  'approved',   'governance.approve',    'committee', 2, TRUE,  TRUE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Asset: identified → classified → risk_assessment → review → committee → approved
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'asset', 'identified',      'Identified',      1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'asset', 'classified',      'Classified',      2, FALSE, FALSE, FALSE, 36),
  ('regulated_enterprise', 'asset', 'risk_assessment', 'Risk Assessment', 3, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'asset', 'review',          'Review',          4, FALSE, FALSE, TRUE,  36),
  ('regulated_enterprise', 'asset', 'approved',        'Approved',        5, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'asset', 'identified',      'classified',      'asset.classify', 'submit',  0, FALSE, FALSE),
  ('regulated_enterprise', 'asset', 'classified',      'risk_assessment', 'asset.assess',   'submit',  0, FALSE, TRUE),
  ('regulated_enterprise', 'asset', 'risk_assessment', 'review',          'asset.submit',   'approve', 1, TRUE,  TRUE),
  ('regulated_enterprise', 'asset', 'review',          'approved',        'asset.approve',  'approve', 2, TRUE,  TRUE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Exception: requested → review → risk_assessment → committee → approved / rejected
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'exception', 'requested',       'Requested',       1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'exception', 'review',          'In Review',       2, FALSE, FALSE, FALSE, 36),
  ('regulated_enterprise', 'exception', 'risk_assessment', 'Risk Assessment', 3, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'exception', 'committee',       'Committee',       4, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'exception', 'approved',        'Approved',        5, FALSE, TRUE,  FALSE, NULL),
  ('regulated_enterprise', 'exception', 'rejected',        'Rejected',        6, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'exception', 'requested',       'review',          'exception.submit',  'submit',    0, FALSE, FALSE),
  ('regulated_enterprise', 'exception', 'review',          'risk_assessment', 'exception.assess',  'approve',   1, TRUE,  TRUE),
  ('regulated_enterprise', 'exception', 'risk_assessment', 'committee',       'exception.endorse', 'approve',   2, TRUE,  TRUE),
  ('regulated_enterprise', 'exception', 'committee',       'approved',        'exception.approve', 'committee', 2, TRUE,  TRUE),
  ('regulated_enterprise', 'exception', 'committee',       'rejected',        'exception.reject',  'committee', 2, FALSE, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Remediation: open → in_progress → verification → peer_review → approval → closed
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'remediation', 'open',          'Open',          1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'remediation', 'in_progress',   'In Progress',   2, FALSE, FALSE, FALSE, 96),
  ('regulated_enterprise', 'remediation', 'verification',  'Verification',  3, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'remediation', 'peer_review',   'Peer Review',   4, FALSE, FALSE, TRUE,  36),
  ('regulated_enterprise', 'remediation', 'approval',      'Approval',      5, FALSE, FALSE, TRUE,  36),
  ('regulated_enterprise', 'remediation', 'closed',        'Closed',        6, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'remediation', 'open',          'in_progress',  'remediation.start',  'submit',  0, FALSE, FALSE),
  ('regulated_enterprise', 'remediation', 'in_progress',   'verification', 'remediation.verify', 'submit',  0, FALSE, TRUE),
  ('regulated_enterprise', 'remediation', 'verification',  'peer_review',  'remediation.peer',   'approve', 1, TRUE,  TRUE),
  ('regulated_enterprise', 'remediation', 'peer_review',   'approval',     'remediation.submit', 'approve', 2, TRUE,  TRUE),
  ('regulated_enterprise', 'remediation', 'approval',      'closed',       'remediation.close',  'approve', 2, TRUE,  TRUE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Action: open → in_progress → review → approval → completed
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'action', 'open',        'Open',        1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'action', 'in_progress', 'In Progress', 2, FALSE, FALSE, FALSE, 72),
  ('regulated_enterprise', 'action', 'review',      'Review',      3, FALSE, FALSE, TRUE,  36),
  ('regulated_enterprise', 'action', 'approval',    'Approval',    4, FALSE, FALSE, TRUE,  36),
  ('regulated_enterprise', 'action', 'completed',   'Completed',   5, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'action', 'open',        'in_progress', 'action.start',    'submit',  0, FALSE, FALSE),
  ('regulated_enterprise', 'action', 'in_progress', 'review',      'action.submit',   'submit',  0, FALSE, TRUE),
  ('regulated_enterprise', 'action', 'review',      'approval',    'action.endorse',  'approve', 1, TRUE,  TRUE),
  ('regulated_enterprise', 'action', 'approval',    'completed',   'action.complete', 'approve', 2, TRUE,  TRUE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Reporting: draft → review → qa → approval → published
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'reporting', 'draft',     'Draft',     1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'reporting', 'review',    'In Review', 2, FALSE, FALSE, FALSE, 36),
  ('regulated_enterprise', 'reporting', 'qa',        'QA',        3, FALSE, FALSE, TRUE,  24),
  ('regulated_enterprise', 'reporting', 'approval',  'Approval',  4, FALSE, FALSE, TRUE,  36),
  ('regulated_enterprise', 'reporting', 'published', 'Published', 5, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'reporting', 'draft',    'review',    'reporting.submit',   'submit',  0, FALSE, FALSE),
  ('regulated_enterprise', 'reporting', 'review',   'qa',        'reporting.qa',       'approve', 1, TRUE,  FALSE),
  ('regulated_enterprise', 'reporting', 'qa',       'approval',  'reporting.endorse',  'approve', 1, TRUE,  TRUE),
  ('regulated_enterprise', 'reporting', 'approval', 'published', 'reporting.publish',  'approve', 2, TRUE,  TRUE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;


-- ============================================
-- GOVERNMENT AUTHORITY — Maximum governance (8-10 states)
-- ============================================

-- Risk: draft → initial_assessment → detailed_assessment → peer_review → department_review → committee → ministerial → accepted / remediation
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'risk', 'draft',               'Draft',               1, TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'risk', 'initial_assessment',  'Initial Assessment',  2, FALSE, FALSE, FALSE, 48),
  ('government_authority', 'risk', 'detailed_assessment', 'Detailed Assessment', 3, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'risk', 'peer_review',         'Peer Review',         4, FALSE, FALSE, TRUE,  48),
  ('government_authority', 'risk', 'department_review',   'Department Review',   5, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'risk', 'committee',           'Committee Review',    6, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'risk', 'ministerial',         'Ministerial Approval', 7, FALSE, FALSE, TRUE, 120),
  ('government_authority', 'risk', 'accepted',            'Accepted',            8, FALSE, TRUE,  FALSE, NULL),
  ('government_authority', 'risk', 'remediation',         'Remediation',         9, FALSE, FALSE, FALSE, 96)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'risk', 'draft',               'initial_assessment',  'risk.submit',      'submit',      0, FALSE, FALSE, NULL),
  ('government_authority', 'risk', 'initial_assessment',  'detailed_assessment', 'risk.initial',     'submit',      0, FALSE, TRUE,  72),
  ('government_authority', 'risk', 'detailed_assessment', 'peer_review',         'risk.detail',      'approve',     1, TRUE,  TRUE,  72),
  ('government_authority', 'risk', 'peer_review',         'department_review',   'risk.peer',        'approve',     2, TRUE,  TRUE,  72),
  ('government_authority', 'risk', 'department_review',   'committee',           'risk.department',  'approve',     2, TRUE,  TRUE,  96),
  ('government_authority', 'risk', 'committee',           'ministerial',         'risk.committee',   'committee',   3, TRUE,  TRUE,  120),
  ('government_authority', 'risk', 'ministerial',         'accepted',            'risk.ministerial', 'multi_level', 2, TRUE,  TRUE,  168),
  ('government_authority', 'risk', 'ministerial',         'remediation',         'risk.remediate',   'multi_level', 1, FALSE, TRUE,  NULL),
  ('government_authority', 'risk', 'remediation',         'peer_review',         'risk.resubmit',    'submit',      0, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Compliance: draft → mapping → gap_analysis → assessment → legal_review → department → committee → ministerial → approved
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'compliance', 'draft',         'Draft',           1, TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'compliance', 'mapping',       'Obligation Mapping', 2, FALSE, FALSE, FALSE, 72),
  ('government_authority', 'compliance', 'gap_analysis',  'Gap Analysis',    3, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'compliance', 'assessment',    'Assessment',      4, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'compliance', 'legal_review',  'Legal Review',    5, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'compliance', 'department',    'Department Review', 6, FALSE, FALSE, TRUE, 72),
  ('government_authority', 'compliance', 'committee',     'Committee',       7, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'compliance', 'ministerial',   'Ministerial',     8, FALSE, FALSE, TRUE,  120),
  ('government_authority', 'compliance', 'approved',      'Approved',        9, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'compliance', 'draft',        'mapping',       'compliance.submit',      'submit',      0, FALSE, FALSE, NULL),
  ('government_authority', 'compliance', 'mapping',      'gap_analysis',  'compliance.map',         'submit',      0, FALSE, TRUE,  96),
  ('government_authority', 'compliance', 'gap_analysis', 'assessment',    'compliance.gap',         'approve',     1, TRUE,  TRUE,  96),
  ('government_authority', 'compliance', 'assessment',   'legal_review',  'compliance.assess',      'approve',     2, TRUE,  TRUE,  96),
  ('government_authority', 'compliance', 'legal_review', 'department',    'compliance.legal',       'approve',     1, TRUE,  TRUE,  120),
  ('government_authority', 'compliance', 'department',   'committee',     'compliance.department',  'approve',     2, TRUE,  TRUE,  96),
  ('government_authority', 'compliance', 'committee',    'ministerial',   'compliance.committee',   'committee',   3, TRUE,  TRUE,  120),
  ('government_authority', 'compliance', 'ministerial',  'approved',      'compliance.ministerial', 'multi_level', 2, TRUE,  TRUE,  168)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Policy: draft → review → legal → compliance → department → committee → ministerial → published
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'policy', 'draft',             'Draft',              1, TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'policy', 'review',            'In Review',          2, FALSE, FALSE, FALSE, 48),
  ('government_authority', 'policy', 'legal_review',      'Legal Review',       3, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'policy', 'compliance_review', 'Compliance Review',  4, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'policy', 'department',        'Department Review',  5, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'policy', 'committee',         'Committee Approval', 6, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'policy', 'ministerial',       'Ministerial Approval', 7, FALSE, FALSE, TRUE, 120),
  ('government_authority', 'policy', 'published',         'Published',          8, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'policy', 'draft',             'review',            'policy.submit',      'submit',      0, FALSE, FALSE, NULL),
  ('government_authority', 'policy', 'review',            'legal_review',      'policy.review',      'approve',     1, TRUE,  FALSE, 72),
  ('government_authority', 'policy', 'legal_review',      'compliance_review', 'policy.legal',       'approve',     1, TRUE,  TRUE,  96),
  ('government_authority', 'policy', 'compliance_review', 'department',        'policy.compliance',  'approve',     1, TRUE,  TRUE,  96),
  ('government_authority', 'policy', 'department',        'committee',         'policy.department',  'approve',     2, TRUE,  TRUE,  96),
  ('government_authority', 'policy', 'committee',         'ministerial',       'policy.committee',   'committee',   3, TRUE,  TRUE,  120),
  ('government_authority', 'policy', 'ministerial',       'published',         'policy.ministerial', 'multi_level', 2, TRUE,  TRUE,  168)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Audit: planned → approval → scoping → fieldwork → draft_report → peer_review → qa → management → committee → ministerial → closed
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'audit', 'planned',             'Planned',              1, TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'audit', 'plan_approval',       'Plan Approval',        2, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'audit', 'scoping',             'Scoping',              3, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'audit', 'fieldwork',           'Fieldwork',            4, FALSE, FALSE, TRUE,  480),
  ('government_authority', 'audit', 'draft_report',        'Draft Report',         5, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'audit', 'peer_review',         'Peer Review',          6, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'audit', 'qa',                  'Quality Assurance',    7, FALSE, FALSE, TRUE,  48),
  ('government_authority', 'audit', 'management_response', 'Management Response',  8, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'audit', 'committee',           'Committee Review',     9, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'audit', 'closed',              'Closed',              10, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'audit', 'planned',             'plan_approval',       'audit.plan',      'submit',      0, FALSE, TRUE,  NULL),
  ('government_authority', 'audit', 'plan_approval',       'scoping',             'audit.approve',   'approve',     2, TRUE,  TRUE,  96),
  ('government_authority', 'audit', 'scoping',             'fieldwork',           'audit.start',     'approve',     1, TRUE,  TRUE,  120),
  ('government_authority', 'audit', 'fieldwork',           'draft_report',        'audit.draft',     'submit',      0, FALSE, TRUE,  NULL),
  ('government_authority', 'audit', 'draft_report',        'peer_review',         'audit.submit',    'submit',      0, FALSE, TRUE,  96),
  ('government_authority', 'audit', 'peer_review',         'qa',                  'audit.peer',      'approve',     2, TRUE,  TRUE,  96),
  ('government_authority', 'audit', 'qa',                  'management_response', 'audit.qa',        'approve',     1, TRUE,  TRUE,  72),
  ('government_authority', 'audit', 'management_response', 'committee',           'audit.mgmt',      'approve',     2, TRUE,  TRUE,  120),
  ('government_authority', 'audit', 'committee',           'closed',              'audit.committee', 'committee',   3, TRUE,  TRUE,  120)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Incident: reported → triaged → classification → investigating → containment → eradication → resolved → pir → committee → closed
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'incident', 'reported',       'Reported',       1, TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'incident', 'triaged',        'Triaged',        2, FALSE, FALSE, FALSE, 1),
  ('government_authority', 'incident', 'classification', 'Classification', 3, FALSE, FALSE, TRUE,  2),
  ('government_authority', 'incident', 'investigating',  'Investigating',  4, FALSE, FALSE, TRUE,  8),
  ('government_authority', 'incident', 'containment',    'Containment',    5, FALSE, FALSE, TRUE,  12),
  ('government_authority', 'incident', 'eradication',    'Eradication',    6, FALSE, FALSE, TRUE,  24),
  ('government_authority', 'incident', 'resolved',       'Resolved',       7, FALSE, FALSE, TRUE,  48),
  ('government_authority', 'incident', 'pir',            'Post-Incident Review', 8, FALSE, FALSE, TRUE, 96),
  ('government_authority', 'incident', 'committee',      'Committee Review', 9, FALSE, FALSE, TRUE, 72),
  ('government_authority', 'incident', 'closed',         'Closed',        10, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'incident', 'reported',       'triaged',        'incident.triage',       'submit',      0, FALSE, FALSE, 2),
  ('government_authority', 'incident', 'triaged',        'classification', 'incident.classify',     'submit',      0, FALSE, TRUE,  4),
  ('government_authority', 'incident', 'classification', 'investigating',  'incident.investigate',  'approve',     1, TRUE,  TRUE,  12),
  ('government_authority', 'incident', 'investigating',  'containment',    'incident.contain',      'approve',     1, TRUE,  TRUE,  24),
  ('government_authority', 'incident', 'containment',    'eradication',    'incident.eradicate',    'approve',     2, TRUE,  TRUE,  48),
  ('government_authority', 'incident', 'eradication',    'resolved',       'incident.resolve',      'approve',     2, TRUE,  TRUE,  72),
  ('government_authority', 'incident', 'resolved',       'pir',            'incident.pir',          'submit',      0, FALSE, TRUE,  96),
  ('government_authority', 'incident', 'pir',            'committee',      'incident.pir_review',   'approve',     2, TRUE,  TRUE,  120),
  ('government_authority', 'incident', 'committee',      'closed',         'incident.close',        'committee',   3, TRUE,  TRUE,  120)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Evidence: collected → initial_review → cross_reference → verification → senior_review → validated / rejected
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'evidence', 'collected',       'Collected',       1, TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'evidence', 'initial_review',  'Initial Review',  2, FALSE, FALSE, TRUE,  24),
  ('government_authority', 'evidence', 'cross_reference', 'Cross-Reference', 3, FALSE, FALSE, TRUE,  48),
  ('government_authority', 'evidence', 'verification',    'Verification',    4, FALSE, FALSE, TRUE,  48),
  ('government_authority', 'evidence', 'senior_review',   'Senior Review',   5, FALSE, FALSE, TRUE,  36),
  ('government_authority', 'evidence', 'validated',       'Validated',       6, FALSE, TRUE,  FALSE, NULL),
  ('government_authority', 'evidence', 'rejected',        'Rejected',        7, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'evidence', 'collected',       'initial_review',  'evidence.submit',    'submit',      0, FALSE, FALSE, 48),
  ('government_authority', 'evidence', 'initial_review',  'cross_reference', 'evidence.review',    'approve',     1, TRUE,  TRUE,  48),
  ('government_authority', 'evidence', 'cross_reference', 'verification',    'evidence.xref',      'approve',     1, TRUE,  TRUE,  72),
  ('government_authority', 'evidence', 'verification',    'senior_review',   'evidence.verify',    'approve',     2, TRUE,  TRUE,  72),
  ('government_authority', 'evidence', 'senior_review',   'validated',       'evidence.validate',  'multi_level', 2, TRUE,  TRUE,  96),
  ('government_authority', 'evidence', 'senior_review',   'rejected',        'evidence.reject',    'approve',     1, FALSE, FALSE, NULL)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Vendor: identified → screening → initial_dd → detailed_dd → risk_assessment → department → committee → ministerial → approved / rejected
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'vendor', 'identified',   'Identified',        1, TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'vendor', 'screening',    'Screening',         2, FALSE, FALSE, FALSE, 48),
  ('government_authority', 'vendor', 'initial_dd',   'Initial Due Diligence', 3, FALSE, FALSE, TRUE, 96),
  ('government_authority', 'vendor', 'detailed_dd',  'Detailed Due Diligence', 4, FALSE, FALSE, TRUE, 192),
  ('government_authority', 'vendor', 'risk_assessment', 'Risk Assessment', 5, FALSE, FALSE, TRUE, 72),
  ('government_authority', 'vendor', 'department',   'Department Review', 6, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'vendor', 'committee',    'Committee Review',  7, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'vendor', 'ministerial',  'Ministerial Approval', 8, FALSE, FALSE, TRUE, 120),
  ('government_authority', 'vendor', 'approved',     'Approved',          9, FALSE, TRUE,  FALSE, NULL),
  ('government_authority', 'vendor', 'rejected',     'Rejected',         10, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'vendor', 'identified',      'screening',        'vendor.screen',      'submit',      0, FALSE, FALSE, NULL),
  ('government_authority', 'vendor', 'screening',       'initial_dd',       'vendor.initial',     'submit',      0, FALSE, FALSE, 72),
  ('government_authority', 'vendor', 'initial_dd',      'detailed_dd',      'vendor.detail',      'approve',     1, TRUE,  TRUE,  120),
  ('government_authority', 'vendor', 'detailed_dd',     'risk_assessment',  'vendor.dd',          'approve',     2, TRUE,  TRUE,  120),
  ('government_authority', 'vendor', 'risk_assessment', 'department',       'vendor.assess',      'approve',     2, TRUE,  TRUE,  96),
  ('government_authority', 'vendor', 'department',      'committee',        'vendor.department',  'approve',     2, TRUE,  TRUE,  120),
  ('government_authority', 'vendor', 'committee',       'ministerial',      'vendor.committee',   'committee',   3, TRUE,  TRUE,  120),
  ('government_authority', 'vendor', 'ministerial',     'approved',         'vendor.ministerial', 'multi_level', 2, TRUE,  TRUE,  168),
  ('government_authority', 'vendor', 'ministerial',     'rejected',         'vendor.reject',      'multi_level', 2, FALSE, FALSE, NULL)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- BCP: draft → bia → strategy → plan_development → review → department → committee → ministerial → activated → tested
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'bcp', 'draft',            'Draft',              1, TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'bcp', 'bia',              'Business Impact',    2, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'bcp', 'strategy',         'Strategy',           3, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'bcp', 'plan_development', 'Plan Development',   4, FALSE, FALSE, TRUE,  120),
  ('government_authority', 'bcp', 'review',           'In Review',          5, FALSE, FALSE, TRUE,  48),
  ('government_authority', 'bcp', 'department',       'Department Review',  6, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'bcp', 'committee',        'Committee Approval', 7, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'bcp', 'ministerial',      'Ministerial Approval', 8, FALSE, FALSE, TRUE, 120),
  ('government_authority', 'bcp', 'activated',        'Activated',          9, FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'bcp', 'tested',           'Tested',            10, FALSE, TRUE,  TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'bcp', 'draft',            'bia',              'bcp.bia',          'submit',      0, FALSE, TRUE,  NULL),
  ('government_authority', 'bcp', 'bia',              'strategy',         'bcp.strategy',     'submit',      0, FALSE, TRUE,  120),
  ('government_authority', 'bcp', 'strategy',         'plan_development', 'bcp.develop',      'approve',     1, TRUE,  TRUE,  120),
  ('government_authority', 'bcp', 'plan_development', 'review',           'bcp.submit',       'submit',      0, FALSE, TRUE,  NULL),
  ('government_authority', 'bcp', 'review',           'department',       'bcp.review',       'approve',     2, TRUE,  TRUE,  96),
  ('government_authority', 'bcp', 'department',       'committee',        'bcp.department',   'approve',     2, TRUE,  TRUE,  120),
  ('government_authority', 'bcp', 'committee',        'ministerial',      'bcp.committee',    'committee',   3, TRUE,  TRUE,  120),
  ('government_authority', 'bcp', 'ministerial',      'activated',        'bcp.ministerial',  'multi_level', 2, TRUE,  TRUE,  168),
  ('government_authority', 'bcp', 'activated',        'tested',           'bcp.test',         'submit',      0, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Governance: draft → review → legal → compliance → department → committee → ministerial → approved
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'governance', 'draft',       'Draft',              1, TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'governance', 'review',      'In Review',          2, FALSE, FALSE, FALSE, 48),
  ('government_authority', 'governance', 'legal',       'Legal Review',       3, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'governance', 'compliance',  'Compliance Review',  4, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'governance', 'department',  'Department Review',  5, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'governance', 'committee',   'Committee',          6, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'governance', 'ministerial', 'Ministerial',        7, FALSE, FALSE, TRUE,  120),
  ('government_authority', 'governance', 'approved',    'Approved',           8, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'governance', 'draft',       'review',      'governance.submit',      'submit',      0, FALSE, FALSE, NULL),
  ('government_authority', 'governance', 'review',      'legal',       'governance.review',      'approve',     1, TRUE,  FALSE, 72),
  ('government_authority', 'governance', 'legal',       'compliance',  'governance.legal',       'approve',     1, TRUE,  TRUE,  96),
  ('government_authority', 'governance', 'compliance',  'department',  'governance.compliance',  'approve',     1, TRUE,  TRUE,  96),
  ('government_authority', 'governance', 'department',  'committee',   'governance.department',  'approve',     2, TRUE,  TRUE,  96),
  ('government_authority', 'governance', 'committee',   'ministerial', 'governance.committee',   'committee',   3, TRUE,  TRUE,  120),
  ('government_authority', 'governance', 'ministerial', 'approved',    'governance.ministerial', 'multi_level', 2, TRUE,  TRUE,  168)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Asset: identified → screening → classified → risk_assessment → department → committee → approved
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'asset', 'identified',      'Identified',      1, TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'asset', 'screening',       'Screening',       2, FALSE, FALSE, FALSE, 48),
  ('government_authority', 'asset', 'classified',      'Classified',      3, FALSE, FALSE, TRUE,  48),
  ('government_authority', 'asset', 'risk_assessment', 'Risk Assessment', 4, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'asset', 'department',      'Department',      5, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'asset', 'committee',       'Committee',       6, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'asset', 'approved',        'Approved',        7, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'asset', 'identified',      'screening',       'asset.screen',     'submit',    0, FALSE, FALSE, NULL),
  ('government_authority', 'asset', 'screening',       'classified',      'asset.classify',   'submit',    0, FALSE, FALSE, 72),
  ('government_authority', 'asset', 'classified',      'risk_assessment', 'asset.assess',     'approve',   1, TRUE,  TRUE,  72),
  ('government_authority', 'asset', 'risk_assessment', 'department',      'asset.risk',       'approve',   2, TRUE,  TRUE,  96),
  ('government_authority', 'asset', 'department',      'committee',       'asset.department', 'approve',   2, TRUE,  TRUE,  96),
  ('government_authority', 'asset', 'committee',       'approved',        'asset.approve',    'committee', 3, TRUE,  TRUE,  120)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Exception: requested → review → risk_assessment → legal → department → committee → ministerial → approved / rejected
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'exception', 'requested',       'Requested',       1, TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'exception', 'review',          'In Review',       2, FALSE, FALSE, FALSE, 48),
  ('government_authority', 'exception', 'risk_assessment', 'Risk Assessment', 3, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'exception', 'legal',           'Legal Review',    4, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'exception', 'department',      'Department',      5, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'exception', 'committee',       'Committee',       6, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'exception', 'ministerial',     'Ministerial',     7, FALSE, FALSE, TRUE,  120),
  ('government_authority', 'exception', 'approved',        'Approved',        8, FALSE, TRUE,  FALSE, NULL),
  ('government_authority', 'exception', 'rejected',        'Rejected',        9, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'exception', 'requested',       'review',          'exception.submit',      'submit',      0, FALSE, FALSE, NULL),
  ('government_authority', 'exception', 'review',          'risk_assessment', 'exception.review',      'approve',     1, TRUE,  FALSE, 72),
  ('government_authority', 'exception', 'risk_assessment', 'legal',           'exception.assess',      'approve',     2, TRUE,  TRUE,  96),
  ('government_authority', 'exception', 'legal',           'department',      'exception.legal',       'approve',     1, TRUE,  TRUE,  96),
  ('government_authority', 'exception', 'department',      'committee',       'exception.department',  'approve',     2, TRUE,  TRUE,  96),
  ('government_authority', 'exception', 'committee',       'ministerial',     'exception.committee',   'committee',   3, TRUE,  TRUE,  120),
  ('government_authority', 'exception', 'ministerial',     'approved',        'exception.ministerial', 'multi_level', 2, TRUE,  TRUE,  168),
  ('government_authority', 'exception', 'ministerial',     'rejected',        'exception.reject',      'multi_level', 2, FALSE, FALSE, NULL)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Remediation: open → in_progress → verification → peer_review → department → committee → closed
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'remediation', 'open',         'Open',         1, TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'remediation', 'in_progress',  'In Progress',  2, FALSE, FALSE, FALSE, 120),
  ('government_authority', 'remediation', 'verification', 'Verification', 3, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'remediation', 'peer_review',  'Peer Review',  4, FALSE, FALSE, TRUE,  48),
  ('government_authority', 'remediation', 'department',   'Department',   5, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'remediation', 'committee',    'Committee',    6, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'remediation', 'closed',       'Closed',       7, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'remediation', 'open',         'in_progress',  'remediation.start',      'submit',    0, FALSE, FALSE, NULL),
  ('government_authority', 'remediation', 'in_progress',  'verification', 'remediation.verify',     'submit',    0, FALSE, TRUE,  120),
  ('government_authority', 'remediation', 'verification', 'peer_review',  'remediation.peer',       'approve',   1, TRUE,  TRUE,  72),
  ('government_authority', 'remediation', 'peer_review',  'department',   'remediation.submit',     'approve',   2, TRUE,  TRUE,  72),
  ('government_authority', 'remediation', 'department',   'committee',    'remediation.department', 'approve',   2, TRUE,  TRUE,  96),
  ('government_authority', 'remediation', 'committee',    'closed',       'remediation.close',      'committee', 3, TRUE,  TRUE,  120)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Action: open → in_progress → review → approval → department → completed
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'action', 'open',        'Open',        1, TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'action', 'in_progress', 'In Progress', 2, FALSE, FALSE, FALSE, 96),
  ('government_authority', 'action', 'review',      'Review',      3, FALSE, FALSE, TRUE,  48),
  ('government_authority', 'action', 'approval',    'Approval',    4, FALSE, FALSE, TRUE,  48),
  ('government_authority', 'action', 'department',  'Department',  5, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'action', 'completed',   'Completed',   6, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'action', 'open',        'in_progress', 'action.start',      'submit',  0, FALSE, FALSE, NULL),
  ('government_authority', 'action', 'in_progress', 'review',      'action.submit',     'submit',  0, FALSE, TRUE,  96),
  ('government_authority', 'action', 'review',      'approval',    'action.endorse',    'approve', 1, TRUE,  TRUE,  72),
  ('government_authority', 'action', 'approval',    'department',  'action.approve',    'approve', 2, TRUE,  TRUE,  96),
  ('government_authority', 'action', 'department',  'completed',   'action.department', 'approve', 2, TRUE,  TRUE,  96)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Reporting: draft → review → qa → department → committee → published
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'reporting', 'draft',      'Draft',            1, TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'reporting', 'review',     'In Review',        2, FALSE, FALSE, FALSE, 48),
  ('government_authority', 'reporting', 'qa',         'Quality Assurance', 3, FALSE, FALSE, TRUE,  36),
  ('government_authority', 'reporting', 'department', 'Department',       4, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'reporting', 'committee',  'Committee',        5, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'reporting', 'published',  'Published',        6, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'reporting', 'draft',      'review',     'reporting.submit',     'submit',    0, FALSE, FALSE, NULL),
  ('government_authority', 'reporting', 'review',     'qa',         'reporting.qa',         'approve',   1, TRUE,  FALSE, 72),
  ('government_authority', 'reporting', 'qa',         'department', 'reporting.endorse',    'approve',   1, TRUE,  TRUE,  72),
  ('government_authority', 'reporting', 'department', 'committee',  'reporting.department', 'approve',   2, TRUE,  TRUE,  96),
  ('government_authority', 'reporting', 'committee',  'published',  'reporting.publish',    'committee', 3, TRUE,  TRUE,  120)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;
