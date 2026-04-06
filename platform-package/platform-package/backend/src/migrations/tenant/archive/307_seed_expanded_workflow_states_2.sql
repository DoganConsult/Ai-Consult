-- ============================================
-- Tenant Migration 271
-- Seed: Workflow states and transitions for
-- 5 new content modules × 4 archetypes:
-- qiyas, controls, frameworks, issue, team
-- (iam, onboarding, admin, report, executive
-- are platform modules without state machines)
-- ============================================

-- ============================================
-- LEAN ORG — Minimal workflows (3 states)
-- ============================================

-- Qiyas: draft → assessment → scored
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'qiyas', 'draft',      'Draft',      1, TRUE,  FALSE, NULL),
  ('lean_org', 'qiyas', 'assessment', 'Assessment', 2, FALSE, FALSE, 24),
  ('lean_org', 'qiyas', 'scored',     'Scored',     3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'qiyas', 'draft',      'assessment', 'qiyas.start',    'submit',  0),
  ('lean_org', 'qiyas', 'assessment', 'scored',     'qiyas.finalize', 'approve', 1)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Controls: draft → testing → effective
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'controls', 'draft',     'Draft',     1, TRUE,  FALSE, NULL),
  ('lean_org', 'controls', 'testing',   'Testing',   2, FALSE, FALSE, 12),
  ('lean_org', 'controls', 'effective', 'Effective', 3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'controls', 'draft',   'testing',   'controls.test',    'submit',  0),
  ('lean_org', 'controls', 'testing', 'effective', 'controls.approve', 'approve', 1),
  ('lean_org', 'controls', 'testing', 'draft',     'controls.return',  'approve', 0)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Frameworks: draft → mapped → active
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'frameworks', 'draft',  'Draft',  1, TRUE,  FALSE, NULL),
  ('lean_org', 'frameworks', 'mapped', 'Mapped', 2, FALSE, FALSE, 12),
  ('lean_org', 'frameworks', 'active', 'Active', 3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'frameworks', 'draft',  'mapped', 'frameworks.map',     'submit',  0),
  ('lean_org', 'frameworks', 'mapped', 'active', 'frameworks.approve', 'approve', 1)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Issue: open → investigating → resolved
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'issue', 'open',          'Open',          1, TRUE,  FALSE, NULL),
  ('lean_org', 'issue', 'investigating', 'Investigating', 2, FALSE, FALSE, 12),
  ('lean_org', 'issue', 'resolved',      'Resolved',      3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'issue', 'open',          'investigating', 'issue.investigate', 'submit', 0),
  ('lean_org', 'issue', 'investigating', 'resolved',      'issue.resolve',     'submit', 0),
  ('lean_org', 'issue', 'investigating', 'open',          'issue.reopen',      'submit', 0)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Team: proposed → active → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'team', 'proposed', 'Proposed', 1, TRUE,  FALSE, NULL),
  ('lean_org', 'team', 'active',   'Active',   2, FALSE, FALSE, NULL),
  ('lean_org', 'team', 'archived', 'Archived', 3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'team', 'proposed', 'active',   'team.activate',  'approve', 1),
  ('lean_org', 'team', 'active',   'archived', 'team.archive',   'approve', 0)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;


-- ============================================
-- STANDARD ENTERPRISE — Standard (5 states)
-- ============================================

-- Qiyas: draft → scoping → assessment → review → scored
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'qiyas', 'draft',      'Draft',      1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'qiyas', 'scoping',    'Scoping',    2, FALSE, FALSE, 24),
  ('standard_enterprise', 'qiyas', 'assessment', 'Assessment', 3, FALSE, FALSE, 48),
  ('standard_enterprise', 'qiyas', 'review',     'In Review',  4, FALSE, FALSE, 24),
  ('standard_enterprise', 'qiyas', 'scored',     'Scored',     5, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'qiyas', 'draft',      'scoping',    'qiyas.scope',    'submit',  0, FALSE),
  ('standard_enterprise', 'qiyas', 'scoping',    'assessment', 'qiyas.start',    'review',  0, FALSE),
  ('standard_enterprise', 'qiyas', 'assessment', 'review',     'qiyas.submit',   'submit',  0, FALSE),
  ('standard_enterprise', 'qiyas', 'review',     'scored',     'qiyas.finalize', 'approve', 1, TRUE),
  ('standard_enterprise', 'qiyas', 'review',     'draft',      'qiyas.return',   'approve', 0, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Controls: draft → design_review → testing → review → effective
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'controls', 'draft',         'Draft',         1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'controls', 'design_review', 'Design Review', 2, FALSE, FALSE, 24),
  ('standard_enterprise', 'controls', 'testing',       'Testing',       3, FALSE, FALSE, 48),
  ('standard_enterprise', 'controls', 'review',        'In Review',     4, FALSE, FALSE, 24),
  ('standard_enterprise', 'controls', 'effective',     'Effective',     5, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'controls', 'draft',         'design_review', 'controls.submit',  'submit',  0, FALSE),
  ('standard_enterprise', 'controls', 'design_review', 'testing',       'controls.approve_design', 'review', 1, TRUE),
  ('standard_enterprise', 'controls', 'design_review', 'draft',         'controls.return',  'review',  0, FALSE),
  ('standard_enterprise', 'controls', 'testing',       'review',        'controls.test_complete', 'submit', 0, FALSE),
  ('standard_enterprise', 'controls', 'review',        'effective',     'controls.approve', 'approve', 1, TRUE),
  ('standard_enterprise', 'controls', 'review',        'draft',         'controls.reject',  'approve', 0, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Frameworks: draft → mapping → review → active → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'frameworks', 'draft',    'Draft',     1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'frameworks', 'mapping',  'Mapping',   2, FALSE, FALSE, 48),
  ('standard_enterprise', 'frameworks', 'review',   'In Review', 3, FALSE, FALSE, 24),
  ('standard_enterprise', 'frameworks', 'active',   'Active',    4, FALSE, FALSE, NULL),
  ('standard_enterprise', 'frameworks', 'archived', 'Archived',  5, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'frameworks', 'draft',   'mapping',  'frameworks.map',     'submit',  0, FALSE),
  ('standard_enterprise', 'frameworks', 'mapping', 'review',   'frameworks.submit',  'submit',  0, FALSE),
  ('standard_enterprise', 'frameworks', 'review',  'active',   'frameworks.approve', 'approve', 1, TRUE),
  ('standard_enterprise', 'frameworks', 'review',  'draft',    'frameworks.return',  'approve', 0, FALSE),
  ('standard_enterprise', 'frameworks', 'active',  'archived', 'frameworks.archive', 'approve', 0, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Issue: open → assigned → investigating → review → resolved
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'issue', 'open',          'Open',          1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'issue', 'assigned',      'Assigned',      2, FALSE, FALSE, NULL),
  ('standard_enterprise', 'issue', 'investigating', 'Investigating', 3, FALSE, FALSE, 24),
  ('standard_enterprise', 'issue', 'review',        'In Review',     4, FALSE, FALSE, 24),
  ('standard_enterprise', 'issue', 'resolved',      'Resolved',      5, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('standard_enterprise', 'issue', 'open',          'assigned',      'issue.assign',      'submit',  0),
  ('standard_enterprise', 'issue', 'assigned',      'investigating', 'issue.investigate', 'submit',  0),
  ('standard_enterprise', 'issue', 'investigating', 'review',        'issue.submit',      'submit',  0),
  ('standard_enterprise', 'issue', 'review',        'resolved',      'issue.resolve',     'review',  1),
  ('standard_enterprise', 'issue', 'review',        'investigating', 'issue.reopen',      'review',  0)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Team: proposed → review → active → suspended → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'team', 'proposed',  'Proposed',  1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'team', 'review',    'In Review', 2, FALSE, FALSE, 24),
  ('standard_enterprise', 'team', 'active',    'Active',    3, FALSE, FALSE, NULL),
  ('standard_enterprise', 'team', 'suspended', 'Suspended', 4, FALSE, FALSE, NULL),
  ('standard_enterprise', 'team', 'archived',  'Archived',  5, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'team', 'proposed',  'review',    'team.submit',   'submit',  0, FALSE),
  ('standard_enterprise', 'team', 'review',    'active',    'team.approve',  'approve', 1, TRUE),
  ('standard_enterprise', 'team', 'review',    'proposed',  'team.return',   'approve', 0, FALSE),
  ('standard_enterprise', 'team', 'active',    'suspended', 'team.suspend',  'approve', 0, FALSE),
  ('standard_enterprise', 'team', 'suspended', 'active',    'team.reactivate','approve',0, FALSE),
  ('standard_enterprise', 'team', 'active',    'archived',  'team.archive',  'approve', 0, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;


-- ============================================
-- REGULATED ENTERPRISE — Strict (7 states)
-- ============================================

-- Qiyas: draft → scoping → assessment → evidence → review → approval → scored
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'qiyas', 'draft',      'Draft',               1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'qiyas', 'scoping',    'Scoping',             2, FALSE, FALSE, FALSE, 36),
  ('regulated_enterprise', 'qiyas', 'assessment', 'Assessment',          3, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'qiyas', 'evidence',   'Evidence Collection', 4, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'qiyas', 'review',     'In Review',           5, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'qiyas', 'approval',   'Approval',            6, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'qiyas', 'scored',     'Scored',              7, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'qiyas', 'draft',      'scoping',    'qiyas.scope',    'submit',    0, FALSE, FALSE),
  ('regulated_enterprise', 'qiyas', 'scoping',    'assessment', 'qiyas.start',    'review',    0, FALSE, FALSE),
  ('regulated_enterprise', 'qiyas', 'assessment', 'evidence',   'qiyas.collect',  'submit',    0, FALSE, TRUE),
  ('regulated_enterprise', 'qiyas', 'evidence',   'review',     'qiyas.submit',   'submit',    0, FALSE, TRUE),
  ('regulated_enterprise', 'qiyas', 'review',     'approval',   'qiyas.recommend','review',    1, TRUE,  TRUE),
  ('regulated_enterprise', 'qiyas', 'review',     'draft',      'qiyas.return',   'review',    0, FALSE, FALSE),
  ('regulated_enterprise', 'qiyas', 'approval',   'scored',     'qiyas.finalize', 'committee', 2, TRUE,  TRUE),
  ('regulated_enterprise', 'qiyas', 'approval',   'draft',      'qiyas.reject',   'committee', 0, FALSE, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Controls: draft → design_review → testing → evidence → review → approval → effective
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'controls', 'draft',         'Draft',         1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'controls', 'design_review', 'Design Review', 2, FALSE, FALSE, FALSE, 36),
  ('regulated_enterprise', 'controls', 'testing',       'Testing',       3, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'controls', 'evidence',      'Evidence',      4, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'controls', 'review',        'In Review',     5, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'controls', 'approval',      'Approval',      6, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'controls', 'effective',     'Effective',     7, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'controls', 'draft',         'design_review', 'controls.submit',         'submit',    0, FALSE, FALSE),
  ('regulated_enterprise', 'controls', 'design_review', 'testing',       'controls.approve_design', 'review',    1, TRUE,  FALSE),
  ('regulated_enterprise', 'controls', 'design_review', 'draft',         'controls.return',         'review',    0, FALSE, FALSE),
  ('regulated_enterprise', 'controls', 'testing',       'evidence',      'controls.test_complete',  'submit',    0, FALSE, TRUE),
  ('regulated_enterprise', 'controls', 'evidence',      'review',        'controls.evidence_submit','submit',    0, FALSE, TRUE),
  ('regulated_enterprise', 'controls', 'review',        'approval',      'controls.recommend',      'review',    1, TRUE,  TRUE),
  ('regulated_enterprise', 'controls', 'review',        'draft',         'controls.reject',         'review',    0, FALSE, FALSE),
  ('regulated_enterprise', 'controls', 'approval',      'effective',     'controls.approve',        'committee', 2, TRUE,  TRUE),
  ('regulated_enterprise', 'controls', 'approval',      'draft',         'controls.reject_final',   'committee', 0, FALSE, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Frameworks: draft → mapping → compliance_review → approval → active → review_due → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'frameworks', 'draft',              'Draft',              1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'frameworks', 'mapping',            'Mapping',            2, FALSE, FALSE, FALSE, 48),
  ('regulated_enterprise', 'frameworks', 'compliance_review',  'Compliance Review',  3, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'frameworks', 'approval',           'Approval',           4, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'frameworks', 'active',             'Active',             5, FALSE, FALSE, FALSE, NULL),
  ('regulated_enterprise', 'frameworks', 'review_due',         'Review Due',         6, FALSE, FALSE, FALSE, 168),
  ('regulated_enterprise', 'frameworks', 'archived',           'Archived',           7, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'frameworks', 'draft',              'mapping',            'frameworks.map',        'submit',    0, FALSE, FALSE),
  ('regulated_enterprise', 'frameworks', 'mapping',            'compliance_review',  'frameworks.submit',     'submit',    0, FALSE, FALSE),
  ('regulated_enterprise', 'frameworks', 'compliance_review',  'approval',           'frameworks.recommend',  'review',    1, TRUE,  TRUE),
  ('regulated_enterprise', 'frameworks', 'compliance_review',  'draft',              'frameworks.return',     'review',    0, FALSE, FALSE),
  ('regulated_enterprise', 'frameworks', 'approval',           'active',             'frameworks.approve',    'committee', 2, TRUE,  TRUE),
  ('regulated_enterprise', 'frameworks', 'approval',           'draft',              'frameworks.reject',     'committee', 0, FALSE, FALSE),
  ('regulated_enterprise', 'frameworks', 'active',             'review_due',         'frameworks.flag_review','review',    0, FALSE, FALSE),
  ('regulated_enterprise', 'frameworks', 'review_due',         'draft',              'frameworks.reopen',     'approve',   0, FALSE, FALSE),
  ('regulated_enterprise', 'frameworks', 'active',             'archived',           'frameworks.archive',    'approve',   0, FALSE, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Issue: open → assigned → investigating → root_cause → review → approval → resolved
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'issue', 'open',          'Open',            1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'issue', 'assigned',      'Assigned',        2, FALSE, FALSE, FALSE, NULL),
  ('regulated_enterprise', 'issue', 'investigating', 'Investigating',   3, FALSE, FALSE, FALSE, 36),
  ('regulated_enterprise', 'issue', 'root_cause',    'Root Cause',      4, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'issue', 'review',        'In Review',       5, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'issue', 'approval',      'Approval',        6, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'issue', 'resolved',      'Resolved',        7, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'issue', 'open',          'assigned',      'issue.assign',      'submit',  0, FALSE, FALSE),
  ('regulated_enterprise', 'issue', 'assigned',      'investigating', 'issue.investigate', 'submit',  0, FALSE, FALSE),
  ('regulated_enterprise', 'issue', 'investigating', 'root_cause',    'issue.analyze',     'submit',  0, FALSE, FALSE),
  ('regulated_enterprise', 'issue', 'root_cause',    'review',        'issue.submit',      'submit',  0, FALSE, TRUE),
  ('regulated_enterprise', 'issue', 'review',        'approval',      'issue.recommend',   'review',  1, TRUE,  TRUE),
  ('regulated_enterprise', 'issue', 'review',        'investigating', 'issue.return',      'review',  0, FALSE, FALSE),
  ('regulated_enterprise', 'issue', 'approval',      'resolved',      'issue.resolve',     'approve', 2, TRUE,  TRUE),
  ('regulated_enterprise', 'issue', 'approval',      'investigating', 'issue.reject',      'approve', 0, FALSE, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Team: proposed → review → approval → active → performance_review → suspended → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('regulated_enterprise', 'team', 'proposed',           'Proposed',           1, TRUE,  FALSE, NULL),
  ('regulated_enterprise', 'team', 'review',             'In Review',          2, FALSE, FALSE, 24),
  ('regulated_enterprise', 'team', 'approval',           'Approval',           3, FALSE, FALSE, 48),
  ('regulated_enterprise', 'team', 'active',             'Active',             4, FALSE, FALSE, NULL),
  ('regulated_enterprise', 'team', 'performance_review', 'Performance Review', 5, FALSE, FALSE, 168),
  ('regulated_enterprise', 'team', 'suspended',          'Suspended',          6, FALSE, FALSE, NULL),
  ('regulated_enterprise', 'team', 'archived',           'Archived',           7, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('regulated_enterprise', 'team', 'proposed',           'review',             'team.submit',      'submit',  0, FALSE),
  ('regulated_enterprise', 'team', 'review',             'approval',           'team.recommend',   'review',  1, TRUE),
  ('regulated_enterprise', 'team', 'review',             'proposed',           'team.return',      'review',  0, FALSE),
  ('regulated_enterprise', 'team', 'approval',           'active',             'team.approve',     'approve', 2, TRUE),
  ('regulated_enterprise', 'team', 'approval',           'proposed',           'team.reject',      'approve', 0, FALSE),
  ('regulated_enterprise', 'team', 'active',             'performance_review', 'team.review',      'review',  0, FALSE),
  ('regulated_enterprise', 'team', 'performance_review', 'active',             'team.confirm',     'approve', 0, FALSE),
  ('regulated_enterprise', 'team', 'active',             'suspended',          'team.suspend',     'approve', 0, FALSE),
  ('regulated_enterprise', 'team', 'suspended',          'active',             'team.reactivate',  'approve', 0, FALSE),
  ('regulated_enterprise', 'team', 'active',             'archived',           'team.archive',     'approve', 0, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;


-- ============================================
-- GOVERNMENT AUTHORITY — Maximum oversight (8-10 states)
-- ============================================

-- Qiyas: draft → scoping → assessment → evidence → calibration → review → approval → committee → scored → action_plan
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'qiyas', 'draft',        'Draft',               1,  TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'qiyas', 'scoping',      'Scoping',             2,  FALSE, FALSE, FALSE, 48),
  ('government_authority', 'qiyas', 'assessment',   'Assessment',          3,  FALSE, FALSE, TRUE,  96),
  ('government_authority', 'qiyas', 'evidence',     'Evidence Collection', 4,  FALSE, FALSE, TRUE,  96),
  ('government_authority', 'qiyas', 'calibration',  'Calibration',         5,  FALSE, FALSE, TRUE,  72),
  ('government_authority', 'qiyas', 'review',       'In Review',           6,  FALSE, FALSE, TRUE,  72),
  ('government_authority', 'qiyas', 'approval',     'Approval',            7,  FALSE, FALSE, TRUE,  96),
  ('government_authority', 'qiyas', 'committee',    'Committee Review',    8,  FALSE, FALSE, TRUE,  192),
  ('government_authority', 'qiyas', 'scored',       'Scored',              9,  FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'qiyas', 'action_plan',  'Action Plan',         10, FALSE, TRUE,  FALSE, 336)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'qiyas', 'draft',       'scoping',     'qiyas.scope',           'submit',       0, FALSE, FALSE, NULL),
  ('government_authority', 'qiyas', 'scoping',     'assessment',  'qiyas.start',           'review',       0, FALSE, FALSE, 48),
  ('government_authority', 'qiyas', 'assessment',  'evidence',    'qiyas.collect',         'submit',       0, FALSE, TRUE,  NULL),
  ('government_authority', 'qiyas', 'evidence',    'calibration', 'qiyas.calibrate',       'review',       1, TRUE,  TRUE,  96),
  ('government_authority', 'qiyas', 'calibration', 'review',      'qiyas.submit',          'review',       1, TRUE,  TRUE,  72),
  ('government_authority', 'qiyas', 'review',      'approval',    'qiyas.recommend',       'approve',      1, TRUE,  TRUE,  72),
  ('government_authority', 'qiyas', 'review',      'draft',       'qiyas.return',          'approve',      0, FALSE, FALSE, NULL),
  ('government_authority', 'qiyas', 'approval',    'committee',   'qiyas.escalate',        'approve_high', 2, TRUE,  TRUE,  96),
  ('government_authority', 'qiyas', 'committee',   'scored',      'qiyas.finalize',        'multi_level',  2, TRUE,  TRUE,  192),
  ('government_authority', 'qiyas', 'committee',   'draft',       'qiyas.reject',          'multi_level',  0, FALSE, FALSE, NULL),
  ('government_authority', 'qiyas', 'scored',      'action_plan', 'qiyas.plan',            'approve',      0, FALSE, FALSE, NULL)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Controls: draft → design → design_review → testing → evidence → review → approval → committee → effective → monitoring
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'controls', 'draft',         'Draft',          1,  TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'controls', 'design',        'Design',         2,  FALSE, FALSE, FALSE, 48),
  ('government_authority', 'controls', 'design_review', 'Design Review',  3,  FALSE, FALSE, TRUE,  72),
  ('government_authority', 'controls', 'testing',       'Testing',        4,  FALSE, FALSE, TRUE,  96),
  ('government_authority', 'controls', 'evidence',      'Evidence',       5,  FALSE, FALSE, TRUE,  72),
  ('government_authority', 'controls', 'review',        'In Review',      6,  FALSE, FALSE, TRUE,  72),
  ('government_authority', 'controls', 'approval',      'Approval',       7,  FALSE, FALSE, TRUE,  96),
  ('government_authority', 'controls', 'committee',     'Committee',      8,  FALSE, FALSE, TRUE,  192),
  ('government_authority', 'controls', 'effective',     'Effective',      9,  FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'controls', 'monitoring',    'Monitoring',     10, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'controls', 'draft',         'design',        'controls.design',         'submit',       0, FALSE, FALSE, NULL),
  ('government_authority', 'controls', 'design',        'design_review', 'controls.submit',         'submit',       0, FALSE, FALSE, NULL),
  ('government_authority', 'controls', 'design_review', 'testing',       'controls.approve_design', 'review',       1, TRUE,  TRUE,  72),
  ('government_authority', 'controls', 'design_review', 'draft',         'controls.return',         'review',       0, FALSE, FALSE, NULL),
  ('government_authority', 'controls', 'testing',       'evidence',      'controls.test_complete',  'submit',       0, FALSE, TRUE,  NULL),
  ('government_authority', 'controls', 'evidence',      'review',        'controls.evidence_submit','submit',       0, FALSE, TRUE,  72),
  ('government_authority', 'controls', 'review',        'approval',      'controls.recommend',      'approve',      1, TRUE,  TRUE,  72),
  ('government_authority', 'controls', 'review',        'draft',         'controls.reject',         'approve',      0, FALSE, FALSE, NULL),
  ('government_authority', 'controls', 'approval',      'committee',     'controls.escalate',       'approve_high', 2, TRUE,  TRUE,  96),
  ('government_authority', 'controls', 'committee',     'effective',     'controls.approve',        'multi_level',  2, TRUE,  TRUE,  192),
  ('government_authority', 'controls', 'committee',     'draft',         'controls.reject_final',   'multi_level',  0, FALSE, FALSE, NULL),
  ('government_authority', 'controls', 'effective',     'monitoring',    'controls.monitor',        'review',       0, FALSE, FALSE, NULL)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Frameworks: draft → mapping → compliance_review → legal_review → approval → ministerial → active → periodic_review → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'frameworks', 'draft',              'Draft',               1, TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'frameworks', 'mapping',            'Mapping',             2, FALSE, FALSE, FALSE, 72),
  ('government_authority', 'frameworks', 'compliance_review',  'Compliance Review',   3, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'frameworks', 'legal_review',       'Legal Review',        4, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'frameworks', 'approval',           'Approval',            5, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'frameworks', 'ministerial',        'Ministerial Sign-off',6, FALSE, FALSE, TRUE,  192),
  ('government_authority', 'frameworks', 'active',             'Active',              7, FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'frameworks', 'periodic_review',    'Periodic Review',     8, FALSE, FALSE, FALSE, 336),
  ('government_authority', 'frameworks', 'archived',           'Archived',            9, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'frameworks', 'draft',              'mapping',            'frameworks.map',              'submit',       0, FALSE, FALSE, NULL),
  ('government_authority', 'frameworks', 'mapping',            'compliance_review',  'frameworks.submit',           'submit',       0, FALSE, FALSE, NULL),
  ('government_authority', 'frameworks', 'compliance_review',  'legal_review',       'frameworks.compliance_pass',  'approve',      1, TRUE,  TRUE,  72),
  ('government_authority', 'frameworks', 'compliance_review',  'draft',              'frameworks.compliance_fail',  'approve',      0, FALSE, FALSE, NULL),
  ('government_authority', 'frameworks', 'legal_review',       'approval',           'frameworks.legal_approve',    'approve',      1, TRUE,  TRUE,  72),
  ('government_authority', 'frameworks', 'legal_review',       'draft',              'frameworks.legal_reject',     'approve',      0, FALSE, FALSE, NULL),
  ('government_authority', 'frameworks', 'approval',           'ministerial',        'frameworks.approve',          'approve_high', 2, TRUE,  TRUE,  96),
  ('government_authority', 'frameworks', 'ministerial',        'active',             'frameworks.sign_off',         'multi_level',  2, TRUE,  TRUE,  192),
  ('government_authority', 'frameworks', 'active',             'periodic_review',    'frameworks.schedule_review',  'review',       0, FALSE, FALSE, NULL),
  ('government_authority', 'frameworks', 'periodic_review',    'draft',              'frameworks.reopen',           'approve',      0, FALSE, FALSE, NULL),
  ('government_authority', 'frameworks', 'active',             'archived',           'frameworks.archive',          'approve_high', 0, FALSE, FALSE, NULL)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Issue: open → triage → assigned → investigating → root_cause → review → approval → committee → resolved → post_mortem
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'issue', 'open',          'Open',          1,  TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'issue', 'triage',        'Triage',        2,  FALSE, FALSE, FALSE, 12),
  ('government_authority', 'issue', 'assigned',      'Assigned',      3,  FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'issue', 'investigating', 'Investigating', 4,  FALSE, FALSE, FALSE, 48),
  ('government_authority', 'issue', 'root_cause',    'Root Cause',    5,  FALSE, FALSE, TRUE,  72),
  ('government_authority', 'issue', 'review',        'In Review',     6,  FALSE, FALSE, TRUE,  72),
  ('government_authority', 'issue', 'approval',      'Approval',      7,  FALSE, FALSE, TRUE,  96),
  ('government_authority', 'issue', 'committee',     'Committee',     8,  FALSE, FALSE, TRUE,  192),
  ('government_authority', 'issue', 'resolved',      'Resolved',      9,  FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'issue', 'post_mortem',   'Post-mortem',   10, FALSE, TRUE,  TRUE,  336)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'issue', 'open',          'triage',        'issue.triage',       'submit',       0, FALSE, FALSE, NULL),
  ('government_authority', 'issue', 'triage',        'assigned',      'issue.assign',       'review',       1, FALSE, FALSE, 12),
  ('government_authority', 'issue', 'assigned',      'investigating', 'issue.investigate',  'submit',       0, FALSE, FALSE, NULL),
  ('government_authority', 'issue', 'investigating', 'root_cause',    'issue.analyze',      'submit',       0, FALSE, FALSE, 48),
  ('government_authority', 'issue', 'root_cause',    'review',        'issue.submit',       'submit',       0, FALSE, TRUE,  NULL),
  ('government_authority', 'issue', 'review',        'approval',      'issue.recommend',    'review',       1, TRUE,  TRUE,  72),
  ('government_authority', 'issue', 'review',        'investigating', 'issue.return',       'review',       0, FALSE, FALSE, NULL),
  ('government_authority', 'issue', 'approval',      'committee',     'issue.escalate',     'approve_high', 1, TRUE,  TRUE,  96),
  ('government_authority', 'issue', 'committee',     'resolved',      'issue.resolve',      'multi_level',  2, TRUE,  TRUE,  192),
  ('government_authority', 'issue', 'committee',     'investigating', 'issue.reject',       'multi_level',  0, FALSE, FALSE, NULL),
  ('government_authority', 'issue', 'resolved',      'post_mortem',   'issue.post_mortem',  'approve',      0, FALSE, FALSE, NULL)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Team: proposed → dept_review → approval → committee → active → performance → charter_review → suspended → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'team', 'proposed',       'Proposed',          1, TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'team', 'dept_review',    'Department Review', 2, FALSE, FALSE, FALSE, 48),
  ('government_authority', 'team', 'approval',       'Approval',          3, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'team', 'committee',      'Committee Review',  4, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'team', 'active',         'Active',            5, FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'team', 'performance',    'Performance Review',6, FALSE, FALSE, TRUE,  168),
  ('government_authority', 'team', 'charter_review', 'Charter Review',    7, FALSE, FALSE, TRUE,  336),
  ('government_authority', 'team', 'suspended',      'Suspended',         8, FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'team', 'archived',       'Archived',          9, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'team', 'proposed',       'dept_review',    'team.submit',       'submit',       0, FALSE, FALSE, NULL),
  ('government_authority', 'team', 'dept_review',    'approval',       'team.recommend',    'review',       1, TRUE,  FALSE, 48),
  ('government_authority', 'team', 'dept_review',    'proposed',       'team.return',       'review',       0, FALSE, FALSE, NULL),
  ('government_authority', 'team', 'approval',       'committee',      'team.escalate',     'approve',      1, TRUE,  TRUE,  72),
  ('government_authority', 'team', 'committee',      'active',         'team.approve',      'approve_high', 2, TRUE,  TRUE,  96),
  ('government_authority', 'team', 'committee',      'proposed',       'team.reject',       'approve_high', 0, FALSE, FALSE, NULL),
  ('government_authority', 'team', 'active',         'performance',    'team.review',       'review',       0, FALSE, FALSE, NULL),
  ('government_authority', 'team', 'performance',    'active',         'team.confirm',      'approve',      1, TRUE,  TRUE,  168),
  ('government_authority', 'team', 'active',         'charter_review', 'team.charter',      'approve',      0, FALSE, FALSE, NULL),
  ('government_authority', 'team', 'charter_review', 'active',         'team.renew',        'approve_high', 1, TRUE,  TRUE,  336),
  ('government_authority', 'team', 'active',         'suspended',      'team.suspend',      'approve_high', 0, FALSE, FALSE, NULL),
  ('government_authority', 'team', 'suspended',      'active',         'team.reactivate',   'approve_high', 0, FALSE, FALSE, NULL),
  ('government_authority', 'team', 'active',         'archived',       'team.archive',      'approve_high', 0, FALSE, FALSE, NULL)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;
