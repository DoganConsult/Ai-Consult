-- ============================================
-- Tenant Migration 269
-- Seed: Workflow states and transitions for
-- 6 new content modules × 4 archetypes:
-- procedure, training, maturity, task,
-- knowledge, ai
-- ============================================

-- ============================================
-- LEAN ORG — Minimal workflows (3 states)
-- ============================================

-- Procedure: draft → review → published
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'procedure', 'draft',     'Draft',     1, TRUE,  FALSE, NULL),
  ('lean_org', 'procedure', 'review',    'In Review', 2, FALSE, FALSE, 12),
  ('lean_org', 'procedure', 'published', 'Published', 3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'procedure', 'draft',  'review',    'procedure.submit',  'submit',  0),
  ('lean_org', 'procedure', 'review', 'published', 'procedure.approve', 'approve', 1),
  ('lean_org', 'procedure', 'review', 'draft',     'procedure.return',  'approve', 0)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Training: draft → active → completed
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'training', 'draft',     'Draft',     1, TRUE,  FALSE, NULL),
  ('lean_org', 'training', 'active',    'Active',    2, FALSE, FALSE, NULL),
  ('lean_org', 'training', 'completed', 'Completed', 3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'training', 'draft',  'active',    'training.activate', 'submit',  0),
  ('lean_org', 'training', 'active', 'completed', 'training.complete', 'submit',  0)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Maturity: draft → assessment → scored
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'maturity', 'draft',      'Draft',      1, TRUE,  FALSE, NULL),
  ('lean_org', 'maturity', 'assessment', 'Assessment', 2, FALSE, FALSE, 24),
  ('lean_org', 'maturity', 'scored',     'Scored',     3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'maturity', 'draft',      'assessment', 'maturity.start',    'submit',  0),
  ('lean_org', 'maturity', 'assessment', 'scored',     'maturity.finalize', 'approve', 1)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Task: open → in_progress → done
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'task', 'open',        'Open',        1, TRUE,  FALSE, NULL),
  ('lean_org', 'task', 'in_progress', 'In Progress', 2, FALSE, FALSE, NULL),
  ('lean_org', 'task', 'done',        'Done',        3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'task', 'open',        'in_progress', 'task.start',    'submit', 0),
  ('lean_org', 'task', 'in_progress', 'done',        'task.complete', 'submit', 0),
  ('lean_org', 'task', 'in_progress', 'open',        'task.reopen',   'submit', 0)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Knowledge: draft → review → published
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'knowledge', 'draft',     'Draft',     1, TRUE,  FALSE, NULL),
  ('lean_org', 'knowledge', 'review',    'In Review', 2, FALSE, FALSE, 12),
  ('lean_org', 'knowledge', 'published', 'Published', 3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'knowledge', 'draft',  'review',    'knowledge.submit',  'submit',  0),
  ('lean_org', 'knowledge', 'review', 'published', 'knowledge.approve', 'approve', 1),
  ('lean_org', 'knowledge', 'review', 'draft',     'knowledge.return',  'approve', 0)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- AI: proposed → review → approved / rejected
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('lean_org', 'ai', 'proposed', 'Proposed', 1, TRUE,  FALSE, NULL),
  ('lean_org', 'ai', 'review',   'In Review', 2, FALSE, FALSE, 24),
  ('lean_org', 'ai', 'approved', 'Approved', 3, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('lean_org', 'ai', 'proposed', 'review',   'ai.submit',  'submit',  0),
  ('lean_org', 'ai', 'review',   'approved', 'ai.approve', 'approve', 1),
  ('lean_org', 'ai', 'review',   'proposed', 'ai.return',  'approve', 0)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;


-- ============================================
-- STANDARD ENTERPRISE — Standard workflows (5 states)
-- ============================================

-- Procedure: draft → review → approval → published → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('standard_enterprise', 'procedure', 'draft',     'Draft',     1, TRUE,  FALSE, FALSE, NULL),
  ('standard_enterprise', 'procedure', 'review',    'In Review', 2, FALSE, FALSE, FALSE, 24),
  ('standard_enterprise', 'procedure', 'approval',  'Approval',  3, FALSE, FALSE, FALSE, 48),
  ('standard_enterprise', 'procedure', 'published', 'Published', 4, FALSE, FALSE, FALSE, NULL),
  ('standard_enterprise', 'procedure', 'archived',  'Archived',  5, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'procedure', 'draft',     'review',    'procedure.submit',    'submit',  0, FALSE),
  ('standard_enterprise', 'procedure', 'review',    'approval',  'procedure.recommend', 'review',  1, TRUE),
  ('standard_enterprise', 'procedure', 'review',    'draft',     'procedure.return',    'review',  0, FALSE),
  ('standard_enterprise', 'procedure', 'approval',  'published', 'procedure.approve',   'approve', 1, TRUE),
  ('standard_enterprise', 'procedure', 'approval',  'draft',     'procedure.reject',    'approve', 0, FALSE),
  ('standard_enterprise', 'procedure', 'published', 'archived',  'procedure.archive',   'approve', 0, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Training: draft → review → active → completed → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'training', 'draft',     'Draft',     1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'training', 'review',    'In Review', 2, FALSE, FALSE, 24),
  ('standard_enterprise', 'training', 'active',    'Active',    3, FALSE, FALSE, NULL),
  ('standard_enterprise', 'training', 'completed', 'Completed', 4, FALSE, FALSE, NULL),
  ('standard_enterprise', 'training', 'archived',  'Archived',  5, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('standard_enterprise', 'training', 'draft',     'review',    'training.submit',   'submit',  0),
  ('standard_enterprise', 'training', 'review',    'active',    'training.approve',  'approve', 1),
  ('standard_enterprise', 'training', 'review',    'draft',     'training.return',   'approve', 0),
  ('standard_enterprise', 'training', 'active',    'completed', 'training.complete', 'submit',  0),
  ('standard_enterprise', 'training', 'completed', 'archived',  'training.archive',  'review',  0)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Maturity: draft → assessment → review → scored → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'maturity', 'draft',      'Draft',      1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'maturity', 'assessment', 'Assessment', 2, FALSE, FALSE, 48),
  ('standard_enterprise', 'maturity', 'review',     'In Review',  3, FALSE, FALSE, 24),
  ('standard_enterprise', 'maturity', 'scored',     'Scored',     4, FALSE, FALSE, NULL),
  ('standard_enterprise', 'maturity', 'archived',   'Archived',   5, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'maturity', 'draft',      'assessment', 'maturity.start',    'submit',  0, FALSE),
  ('standard_enterprise', 'maturity', 'assessment', 'review',     'maturity.submit',   'submit',  0, FALSE),
  ('standard_enterprise', 'maturity', 'review',     'scored',     'maturity.finalize', 'approve', 1, TRUE),
  ('standard_enterprise', 'maturity', 'review',     'draft',      'maturity.return',   'approve', 0, FALSE),
  ('standard_enterprise', 'maturity', 'scored',     'archived',   'maturity.archive',  'review',  0, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Task: open → assigned → in_progress → review → done
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'task', 'open',        'Open',        1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'task', 'assigned',    'Assigned',    2, FALSE, FALSE, NULL),
  ('standard_enterprise', 'task', 'in_progress', 'In Progress', 3, FALSE, FALSE, NULL),
  ('standard_enterprise', 'task', 'review',      'In Review',   4, FALSE, FALSE, 24),
  ('standard_enterprise', 'task', 'done',        'Done',        5, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers)
VALUES
  ('standard_enterprise', 'task', 'open',        'assigned',    'task.assign',   'submit',  0),
  ('standard_enterprise', 'task', 'assigned',    'in_progress', 'task.start',    'submit',  0),
  ('standard_enterprise', 'task', 'in_progress', 'review',      'task.submit',   'submit',  0),
  ('standard_enterprise', 'task', 'review',      'done',        'task.complete', 'review',  1),
  ('standard_enterprise', 'task', 'review',      'in_progress', 'task.reopen',   'review',  0)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Knowledge: draft → review → approval → published → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'knowledge', 'draft',     'Draft',     1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'knowledge', 'review',    'In Review', 2, FALSE, FALSE, 24),
  ('standard_enterprise', 'knowledge', 'approval',  'Approval',  3, FALSE, FALSE, 48),
  ('standard_enterprise', 'knowledge', 'published', 'Published', 4, FALSE, FALSE, NULL),
  ('standard_enterprise', 'knowledge', 'archived',  'Archived',  5, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'knowledge', 'draft',     'review',    'knowledge.submit',    'submit',  0, FALSE),
  ('standard_enterprise', 'knowledge', 'review',    'approval',  'knowledge.recommend', 'review',  1, TRUE),
  ('standard_enterprise', 'knowledge', 'review',    'draft',     'knowledge.return',    'review',  0, FALSE),
  ('standard_enterprise', 'knowledge', 'approval',  'published', 'knowledge.approve',   'approve', 1, TRUE),
  ('standard_enterprise', 'knowledge', 'approval',  'draft',     'knowledge.reject',    'approve', 0, FALSE),
  ('standard_enterprise', 'knowledge', 'published', 'archived',  'knowledge.archive',   'approve', 0, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- AI: proposed → review → approval → approved / rejected
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('standard_enterprise', 'ai', 'proposed', 'Proposed',   1, TRUE,  FALSE, NULL),
  ('standard_enterprise', 'ai', 'review',   'In Review',  2, FALSE, FALSE, 24),
  ('standard_enterprise', 'ai', 'approval', 'Approval',   3, FALSE, FALSE, 48),
  ('standard_enterprise', 'ai', 'approved', 'Approved',   4, FALSE, TRUE,  NULL),
  ('standard_enterprise', 'ai', 'rejected', 'Rejected',   5, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('standard_enterprise', 'ai', 'proposed', 'review',   'ai.submit',    'submit',  0, FALSE),
  ('standard_enterprise', 'ai', 'review',   'approval', 'ai.recommend', 'review',  1, TRUE),
  ('standard_enterprise', 'ai', 'review',   'proposed', 'ai.return',    'review',  0, FALSE),
  ('standard_enterprise', 'ai', 'approval', 'approved', 'ai.approve',   'approve', 1, TRUE),
  ('standard_enterprise', 'ai', 'approval', 'rejected', 'ai.reject',    'approve', 0, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;


-- ============================================
-- REGULATED ENTERPRISE — Strict workflows (7 states)
-- ============================================

-- Procedure: draft → review → legal_review → approval → published → review_due → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'procedure', 'draft',        'Draft',         1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'procedure', 'review',       'In Review',     2, FALSE, FALSE, FALSE, 36),
  ('regulated_enterprise', 'procedure', 'legal_review', 'Legal Review',  3, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'procedure', 'approval',     'Approval',      4, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'procedure', 'published',    'Published',     5, FALSE, FALSE, FALSE, NULL),
  ('regulated_enterprise', 'procedure', 'review_due',   'Review Due',    6, FALSE, FALSE, FALSE, 168),
  ('regulated_enterprise', 'procedure', 'archived',     'Archived',      7, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'procedure', 'draft',        'review',       'procedure.submit',       'submit',       0, FALSE, FALSE),
  ('regulated_enterprise', 'procedure', 'review',       'legal_review', 'procedure.legal_review', 'review',       1, TRUE,  FALSE),
  ('regulated_enterprise', 'procedure', 'review',       'draft',        'procedure.return',       'review',       0, FALSE, FALSE),
  ('regulated_enterprise', 'procedure', 'legal_review', 'approval',     'procedure.recommend',    'approve',      1, TRUE,  TRUE),
  ('regulated_enterprise', 'procedure', 'legal_review', 'draft',        'procedure.reject',       'approve',      0, FALSE, FALSE),
  ('regulated_enterprise', 'procedure', 'approval',     'published',    'procedure.approve',      'committee',    2, TRUE,  TRUE),
  ('regulated_enterprise', 'procedure', 'approval',     'draft',        'procedure.reject_final', 'committee',    0, FALSE, FALSE),
  ('regulated_enterprise', 'procedure', 'published',    'review_due',   'procedure.flag_review',  'review',       0, FALSE, FALSE),
  ('regulated_enterprise', 'procedure', 'review_due',   'draft',        'procedure.reopen',       'approve',      0, FALSE, FALSE),
  ('regulated_enterprise', 'procedure', 'published',    'archived',     'procedure.archive',      'approve',      0, FALSE, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Training: draft → review → approval → active → assessment → completed → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'training', 'draft',      'Draft',      1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'training', 'review',     'In Review',  2, FALSE, FALSE, FALSE, 36),
  ('regulated_enterprise', 'training', 'approval',   'Approval',   3, FALSE, FALSE, FALSE, 48),
  ('regulated_enterprise', 'training', 'active',     'Active',     4, FALSE, FALSE, FALSE, NULL),
  ('regulated_enterprise', 'training', 'assessment', 'Assessment', 5, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'training', 'completed',  'Completed',  6, FALSE, FALSE, FALSE, NULL),
  ('regulated_enterprise', 'training', 'archived',   'Archived',   7, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'training', 'draft',      'review',     'training.submit',   'submit',  0, FALSE, FALSE),
  ('regulated_enterprise', 'training', 'review',     'approval',   'training.recommend','review',  1, TRUE,  FALSE),
  ('regulated_enterprise', 'training', 'review',     'draft',      'training.return',   'review',  0, FALSE, FALSE),
  ('regulated_enterprise', 'training', 'approval',   'active',     'training.approve',  'approve', 2, TRUE,  FALSE),
  ('regulated_enterprise', 'training', 'approval',   'draft',      'training.reject',   'approve', 0, FALSE, FALSE),
  ('regulated_enterprise', 'training', 'active',     'assessment', 'training.assess',   'submit',  0, FALSE, FALSE),
  ('regulated_enterprise', 'training', 'assessment', 'completed',  'training.complete', 'review',  1, TRUE,  TRUE),
  ('regulated_enterprise', 'training', 'completed',  'archived',   'training.archive',  'approve', 0, FALSE, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Maturity: draft → scoping → assessment → review → approval → scored → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'maturity', 'draft',      'Draft',      1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'maturity', 'scoping',    'Scoping',    2, FALSE, FALSE, FALSE, 24),
  ('regulated_enterprise', 'maturity', 'assessment', 'Assessment', 3, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'maturity', 'review',     'In Review',  4, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'maturity', 'approval',   'Approval',   5, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'maturity', 'scored',     'Scored',     6, FALSE, FALSE, FALSE, NULL),
  ('regulated_enterprise', 'maturity', 'archived',   'Archived',   7, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'maturity', 'draft',      'scoping',    'maturity.scope',    'submit',    0, FALSE, FALSE),
  ('regulated_enterprise', 'maturity', 'scoping',    'assessment', 'maturity.start',    'review',    0, FALSE, FALSE),
  ('regulated_enterprise', 'maturity', 'assessment', 'review',     'maturity.submit',   'submit',    0, FALSE, TRUE),
  ('regulated_enterprise', 'maturity', 'review',     'approval',   'maturity.recommend','review',    1, TRUE,  TRUE),
  ('regulated_enterprise', 'maturity', 'review',     'draft',      'maturity.return',   'review',    0, FALSE, FALSE),
  ('regulated_enterprise', 'maturity', 'approval',   'scored',     'maturity.finalize', 'committee', 2, TRUE,  TRUE),
  ('regulated_enterprise', 'maturity', 'approval',   'draft',      'maturity.reject',   'committee', 0, FALSE, FALSE),
  ('regulated_enterprise', 'maturity', 'scored',     'archived',   'maturity.archive',  'approve',   0, FALSE, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Task: open → assigned → in_progress → review → approval → done → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, sla_hours)
VALUES
  ('regulated_enterprise', 'task', 'open',        'Open',        1, TRUE,  FALSE, NULL),
  ('regulated_enterprise', 'task', 'assigned',    'Assigned',    2, FALSE, FALSE, NULL),
  ('regulated_enterprise', 'task', 'in_progress', 'In Progress', 3, FALSE, FALSE, NULL),
  ('regulated_enterprise', 'task', 'review',      'In Review',   4, FALSE, FALSE, 36),
  ('regulated_enterprise', 'task', 'approval',    'Approval',    5, FALSE, FALSE, 48),
  ('regulated_enterprise', 'task', 'done',        'Done',        6, FALSE, FALSE, NULL),
  ('regulated_enterprise', 'task', 'archived',    'Archived',    7, FALSE, TRUE,  NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
VALUES
  ('regulated_enterprise', 'task', 'open',        'assigned',    'task.assign',   'submit',  0, FALSE),
  ('regulated_enterprise', 'task', 'assigned',    'in_progress', 'task.start',    'submit',  0, FALSE),
  ('regulated_enterprise', 'task', 'in_progress', 'review',      'task.submit',   'submit',  0, FALSE),
  ('regulated_enterprise', 'task', 'review',      'approval',    'task.recommend','review',  1, TRUE),
  ('regulated_enterprise', 'task', 'review',      'in_progress', 'task.return',   'review',  0, FALSE),
  ('regulated_enterprise', 'task', 'approval',    'done',        'task.complete', 'approve', 1, TRUE),
  ('regulated_enterprise', 'task', 'approval',    'in_progress', 'task.reject',   'approve', 0, FALSE),
  ('regulated_enterprise', 'task', 'done',        'archived',    'task.archive',  'review',  0, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Knowledge: draft → review → legal_review → approval → published → review_due → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'knowledge', 'draft',        'Draft',         1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'knowledge', 'review',       'In Review',     2, FALSE, FALSE, FALSE, 36),
  ('regulated_enterprise', 'knowledge', 'legal_review', 'Legal Review',  3, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'knowledge', 'approval',     'Approval',      4, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'knowledge', 'published',    'Published',     5, FALSE, FALSE, FALSE, NULL),
  ('regulated_enterprise', 'knowledge', 'review_due',   'Review Due',    6, FALSE, FALSE, FALSE, 168),
  ('regulated_enterprise', 'knowledge', 'archived',     'Archived',      7, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'knowledge', 'draft',        'review',       'knowledge.submit',       'submit',    0, FALSE, FALSE),
  ('regulated_enterprise', 'knowledge', 'review',       'legal_review', 'knowledge.legal_review', 'review',    1, TRUE,  FALSE),
  ('regulated_enterprise', 'knowledge', 'review',       'draft',        'knowledge.return',       'review',    0, FALSE, FALSE),
  ('regulated_enterprise', 'knowledge', 'legal_review', 'approval',     'knowledge.recommend',    'approve',   1, TRUE,  TRUE),
  ('regulated_enterprise', 'knowledge', 'legal_review', 'draft',        'knowledge.reject',       'approve',   0, FALSE, FALSE),
  ('regulated_enterprise', 'knowledge', 'approval',     'published',    'knowledge.approve',      'committee', 2, TRUE,  TRUE),
  ('regulated_enterprise', 'knowledge', 'approval',     'draft',        'knowledge.reject_final', 'committee', 0, FALSE, FALSE),
  ('regulated_enterprise', 'knowledge', 'published',    'review_due',   'knowledge.flag_review',  'review',    0, FALSE, FALSE),
  ('regulated_enterprise', 'knowledge', 'review_due',   'draft',        'knowledge.reopen',       'approve',   0, FALSE, FALSE),
  ('regulated_enterprise', 'knowledge', 'published',    'archived',     'knowledge.archive',      'approve',   0, FALSE, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- AI: proposed → technical_review → risk_assessment → approval → committee_review → approved / rejected
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('regulated_enterprise', 'ai', 'proposed',         'Proposed',          1, TRUE,  FALSE, FALSE, NULL),
  ('regulated_enterprise', 'ai', 'technical_review', 'Technical Review',  2, FALSE, FALSE, TRUE,  48),
  ('regulated_enterprise', 'ai', 'risk_assessment',  'Risk Assessment',   3, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'ai', 'approval',         'Approval',          4, FALSE, FALSE, TRUE,  72),
  ('regulated_enterprise', 'ai', 'committee_review', 'Committee Review',  5, FALSE, FALSE, TRUE,  96),
  ('regulated_enterprise', 'ai', 'approved',         'Approved',          6, FALSE, TRUE,  FALSE, NULL),
  ('regulated_enterprise', 'ai', 'rejected',         'Rejected',          7, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence)
VALUES
  ('regulated_enterprise', 'ai', 'proposed',         'technical_review', 'ai.submit',           'submit',    0, FALSE, FALSE),
  ('regulated_enterprise', 'ai', 'technical_review', 'risk_assessment',  'ai.tech_approve',     'review',    1, TRUE,  TRUE),
  ('regulated_enterprise', 'ai', 'technical_review', 'proposed',         'ai.return',           'review',    0, FALSE, FALSE),
  ('regulated_enterprise', 'ai', 'risk_assessment',  'approval',         'ai.risk_approve',     'approve',   1, TRUE,  TRUE),
  ('regulated_enterprise', 'ai', 'risk_assessment',  'proposed',         'ai.risk_reject',      'approve',   0, FALSE, FALSE),
  ('regulated_enterprise', 'ai', 'approval',         'committee_review', 'ai.escalate',         'approve',   1, TRUE,  TRUE),
  ('regulated_enterprise', 'ai', 'committee_review', 'approved',         'ai.approve',          'committee', 2, TRUE,  TRUE),
  ('regulated_enterprise', 'ai', 'committee_review', 'rejected',         'ai.reject',           'committee', 0, FALSE, FALSE)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;


-- ============================================
-- GOVERNMENT AUTHORITY — Maximum oversight (8-10 states)
-- ============================================

-- Procedure: draft → dept_review → legal_review → compliance_review → approval → ministerial → published → periodic_review → review_due → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'procedure', 'draft',              'Draft',              1,  TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'procedure', 'dept_review',        'Department Review',  2,  FALSE, FALSE, FALSE, 48),
  ('government_authority', 'procedure', 'legal_review',       'Legal Review',       3,  FALSE, FALSE, TRUE,  72),
  ('government_authority', 'procedure', 'compliance_review',  'Compliance Review',  4,  FALSE, FALSE, TRUE,  72),
  ('government_authority', 'procedure', 'approval',           'Approval',           5,  FALSE, FALSE, TRUE,  96),
  ('government_authority', 'procedure', 'ministerial',        'Ministerial Sign-off', 6, FALSE, FALSE, TRUE,  192),
  ('government_authority', 'procedure', 'published',          'Published',          7,  FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'procedure', 'periodic_review',    'Periodic Review',    8,  FALSE, FALSE, FALSE, 336),
  ('government_authority', 'procedure', 'review_due',         'Review Due',         9,  FALSE, FALSE, FALSE, 168),
  ('government_authority', 'procedure', 'archived',           'Archived',           10, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'procedure', 'draft',              'dept_review',       'procedure.submit',          'submit',       0, FALSE, FALSE, NULL),
  ('government_authority', 'procedure', 'dept_review',        'legal_review',      'procedure.dept_approve',    'review',       1, TRUE,  FALSE, 48),
  ('government_authority', 'procedure', 'dept_review',        'draft',             'procedure.return',          'review',       0, FALSE, FALSE, NULL),
  ('government_authority', 'procedure', 'legal_review',       'compliance_review', 'procedure.legal_approve',   'approve',      1, TRUE,  TRUE,  72),
  ('government_authority', 'procedure', 'legal_review',       'draft',             'procedure.legal_reject',    'approve',      0, FALSE, FALSE, NULL),
  ('government_authority', 'procedure', 'compliance_review',  'approval',          'procedure.compliance_pass', 'approve',      1, TRUE,  TRUE,  72),
  ('government_authority', 'procedure', 'compliance_review',  'draft',             'procedure.compliance_fail', 'approve',      0, FALSE, FALSE, NULL),
  ('government_authority', 'procedure', 'approval',           'ministerial',       'procedure.approve',         'approve_high', 2, TRUE,  TRUE,  96),
  ('government_authority', 'procedure', 'approval',           'draft',             'procedure.reject',          'approve_high', 0, FALSE, FALSE, NULL),
  ('government_authority', 'procedure', 'ministerial',        'published',         'procedure.sign_off',        'multi_level',  2, TRUE,  TRUE,  192),
  ('government_authority', 'procedure', 'published',          'periodic_review',   'procedure.schedule_review', 'review',       0, FALSE, FALSE, NULL),
  ('government_authority', 'procedure', 'periodic_review',    'review_due',        'procedure.review_due',      'review',       0, FALSE, FALSE, NULL),
  ('government_authority', 'procedure', 'review_due',         'draft',             'procedure.reopen',          'approve',      0, FALSE, FALSE, NULL),
  ('government_authority', 'procedure', 'published',          'archived',          'procedure.archive',         'approve_high', 0, FALSE, FALSE, NULL)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Training: draft → review → approval → published → enrollment → active → assessment → certified → completed → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'training', 'draft',      'Draft',        1,  TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'training', 'review',     'In Review',    2,  FALSE, FALSE, FALSE, 48),
  ('government_authority', 'training', 'approval',   'Approval',     3,  FALSE, FALSE, TRUE,  72),
  ('government_authority', 'training', 'published',  'Published',    4,  FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'training', 'enrollment', 'Enrollment',   5,  FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'training', 'active',     'Active',       6,  FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'training', 'assessment', 'Assessment',   7,  FALSE, FALSE, TRUE,  96),
  ('government_authority', 'training', 'certified',  'Certified',    8,  FALSE, FALSE, TRUE,  NULL),
  ('government_authority', 'training', 'completed',  'Completed',    9,  FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'training', 'archived',   'Archived',     10, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'training', 'draft',      'review',     'training.submit',    'submit',       0, FALSE, FALSE, NULL),
  ('government_authority', 'training', 'review',     'approval',   'training.recommend', 'review',       1, TRUE,  FALSE, 48),
  ('government_authority', 'training', 'review',     'draft',      'training.return',    'review',       0, FALSE, FALSE, NULL),
  ('government_authority', 'training', 'approval',   'published',  'training.approve',   'approve_high', 2, TRUE,  TRUE,  72),
  ('government_authority', 'training', 'approval',   'draft',      'training.reject',    'approve_high', 0, FALSE, FALSE, NULL),
  ('government_authority', 'training', 'published',  'enrollment', 'training.open',      'approve',      0, FALSE, FALSE, NULL),
  ('government_authority', 'training', 'enrollment', 'active',     'training.start',     'submit',       0, FALSE, FALSE, NULL),
  ('government_authority', 'training', 'active',     'assessment', 'training.assess',    'submit',       0, FALSE, FALSE, NULL),
  ('government_authority', 'training', 'assessment', 'certified',  'training.certify',   'approve',      1, TRUE,  TRUE,  96),
  ('government_authority', 'training', 'certified',  'completed',  'training.complete',  'review',       0, FALSE, FALSE, NULL),
  ('government_authority', 'training', 'completed',  'archived',   'training.archive',   'approve',      0, FALSE, FALSE, NULL)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Maturity: draft → scoping → assessment → evidence_collection → review → approval → committee_review → scored → action_plan → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'maturity', 'draft',               'Draft',               1,  TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'maturity', 'scoping',             'Scoping',             2,  FALSE, FALSE, FALSE, 48),
  ('government_authority', 'maturity', 'assessment',          'Assessment',          3,  FALSE, FALSE, TRUE,  96),
  ('government_authority', 'maturity', 'evidence_collection', 'Evidence Collection', 4,  FALSE, FALSE, TRUE,  96),
  ('government_authority', 'maturity', 'review',              'In Review',           5,  FALSE, FALSE, TRUE,  72),
  ('government_authority', 'maturity', 'approval',            'Approval',            6,  FALSE, FALSE, TRUE,  96),
  ('government_authority', 'maturity', 'committee_review',    'Committee Review',    7,  FALSE, FALSE, TRUE,  192),
  ('government_authority', 'maturity', 'scored',              'Scored',              8,  FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'maturity', 'action_plan',         'Action Plan',         9,  FALSE, FALSE, FALSE, 336),
  ('government_authority', 'maturity', 'archived',            'Archived',            10, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'maturity', 'draft',               'scoping',             'maturity.scope',       'submit',       0, FALSE, FALSE, NULL),
  ('government_authority', 'maturity', 'scoping',             'assessment',          'maturity.start',       'review',       0, FALSE, FALSE, 48),
  ('government_authority', 'maturity', 'assessment',          'evidence_collection', 'maturity.collect',     'submit',       0, FALSE, TRUE,  NULL),
  ('government_authority', 'maturity', 'evidence_collection', 'review',              'maturity.submit',      'submit',       0, FALSE, TRUE,  96),
  ('government_authority', 'maturity', 'review',              'approval',            'maturity.recommend',   'review',       1, TRUE,  TRUE,  72),
  ('government_authority', 'maturity', 'review',              'draft',               'maturity.return',      'review',       0, FALSE, FALSE, NULL),
  ('government_authority', 'maturity', 'approval',            'committee_review',    'maturity.escalate',    'approve_high', 1, TRUE,  TRUE,  96),
  ('government_authority', 'maturity', 'approval',            'draft',               'maturity.reject',      'approve_high', 0, FALSE, FALSE, NULL),
  ('government_authority', 'maturity', 'committee_review',    'scored',              'maturity.finalize',    'multi_level',  2, TRUE,  TRUE,  192),
  ('government_authority', 'maturity', 'committee_review',    'draft',               'maturity.reject_final','multi_level',  0, FALSE, FALSE, NULL),
  ('government_authority', 'maturity', 'scored',              'action_plan',         'maturity.plan',        'approve',      0, FALSE, FALSE, NULL),
  ('government_authority', 'maturity', 'action_plan',         'archived',            'maturity.archive',     'approve',      0, FALSE, FALSE, NULL)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Task: open → assigned → in_progress → review → quality_check → approval → done → verified → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'task', 'open',          'Open',          1, TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'task', 'assigned',      'Assigned',      2, FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'task', 'in_progress',   'In Progress',   3, FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'task', 'review',        'In Review',     4, FALSE, FALSE, FALSE, 48),
  ('government_authority', 'task', 'quality_check', 'Quality Check', 5, FALSE, FALSE, TRUE,  72),
  ('government_authority', 'task', 'approval',      'Approval',      6, FALSE, FALSE, TRUE,  96),
  ('government_authority', 'task', 'done',          'Done',          7, FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'task', 'verified',      'Verified',      8, FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'task', 'archived',      'Archived',      9, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'task', 'open',          'assigned',      'task.assign',        'submit',       0, FALSE, FALSE, NULL),
  ('government_authority', 'task', 'assigned',      'in_progress',   'task.start',         'submit',       0, FALSE, FALSE, NULL),
  ('government_authority', 'task', 'in_progress',   'review',        'task.submit',        'submit',       0, FALSE, FALSE, NULL),
  ('government_authority', 'task', 'review',        'quality_check', 'task.qa',            'review',       1, TRUE,  FALSE, 48),
  ('government_authority', 'task', 'review',        'in_progress',   'task.return',        'review',       0, FALSE, FALSE, NULL),
  ('government_authority', 'task', 'quality_check', 'approval',      'task.qa_pass',       'approve',      1, TRUE,  TRUE,  72),
  ('government_authority', 'task', 'quality_check', 'in_progress',   'task.qa_fail',       'approve',      0, FALSE, FALSE, NULL),
  ('government_authority', 'task', 'approval',      'done',          'task.complete',      'approve_high', 1, TRUE,  TRUE,  96),
  ('government_authority', 'task', 'approval',      'in_progress',   'task.reject',        'approve_high', 0, FALSE, FALSE, NULL),
  ('government_authority', 'task', 'done',          'verified',      'task.verify',        'approve',      1, TRUE,  FALSE, NULL),
  ('government_authority', 'task', 'verified',      'archived',      'task.archive',       'review',       0, FALSE, FALSE, NULL)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- Knowledge: draft → dept_review → legal_review → compliance_review → approval → ministerial → published → periodic_review → archived
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'knowledge', 'draft',              'Draft',              1,  TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'knowledge', 'dept_review',        'Department Review',  2,  FALSE, FALSE, FALSE, 48),
  ('government_authority', 'knowledge', 'legal_review',       'Legal Review',       3,  FALSE, FALSE, TRUE,  72),
  ('government_authority', 'knowledge', 'compliance_review',  'Compliance Review',  4,  FALSE, FALSE, TRUE,  72),
  ('government_authority', 'knowledge', 'approval',           'Approval',           5,  FALSE, FALSE, TRUE,  96),
  ('government_authority', 'knowledge', 'ministerial',        'Ministerial Sign-off',6, FALSE, FALSE, TRUE,  192),
  ('government_authority', 'knowledge', 'published',          'Published',          7,  FALSE, FALSE, FALSE, NULL),
  ('government_authority', 'knowledge', 'periodic_review',    'Periodic Review',    8,  FALSE, FALSE, FALSE, 336),
  ('government_authority', 'knowledge', 'archived',           'Archived',           9,  FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'knowledge', 'draft',              'dept_review',       'knowledge.submit',          'submit',       0, FALSE, FALSE, NULL),
  ('government_authority', 'knowledge', 'dept_review',        'legal_review',      'knowledge.dept_approve',    'review',       1, TRUE,  FALSE, 48),
  ('government_authority', 'knowledge', 'dept_review',        'draft',             'knowledge.return',          'review',       0, FALSE, FALSE, NULL),
  ('government_authority', 'knowledge', 'legal_review',       'compliance_review', 'knowledge.legal_approve',   'approve',      1, TRUE,  TRUE,  72),
  ('government_authority', 'knowledge', 'legal_review',       'draft',             'knowledge.legal_reject',    'approve',      0, FALSE, FALSE, NULL),
  ('government_authority', 'knowledge', 'compliance_review',  'approval',          'knowledge.compliance_pass', 'approve',      1, TRUE,  TRUE,  72),
  ('government_authority', 'knowledge', 'compliance_review',  'draft',             'knowledge.compliance_fail', 'approve',      0, FALSE, FALSE, NULL),
  ('government_authority', 'knowledge', 'approval',           'ministerial',       'knowledge.approve',         'approve_high', 2, TRUE,  TRUE,  96),
  ('government_authority', 'knowledge', 'approval',           'draft',             'knowledge.reject',          'approve_high', 0, FALSE, FALSE, NULL),
  ('government_authority', 'knowledge', 'ministerial',        'published',         'knowledge.sign_off',        'multi_level',  2, TRUE,  TRUE,  192),
  ('government_authority', 'knowledge', 'published',          'periodic_review',   'knowledge.schedule_review', 'review',       0, FALSE, FALSE, NULL),
  ('government_authority', 'knowledge', 'periodic_review',    'draft',             'knowledge.reopen',          'approve',      0, FALSE, FALSE, NULL),
  ('government_authority', 'knowledge', 'published',          'archived',          'knowledge.archive',         'approve_high', 0, FALSE, FALSE, NULL)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;

-- AI: proposed → technical_review → risk_assessment → data_privacy_review → approval → committee_review → ministerial → approved / rejected / suspended
INSERT INTO workflow_profile_states (archetype_code, module_code, state_code, state_name_en, ordinal, is_initial, is_terminal, requires_evidence, sla_hours)
VALUES
  ('government_authority', 'ai', 'proposed',            'Proposed',            1,  TRUE,  FALSE, FALSE, NULL),
  ('government_authority', 'ai', 'technical_review',    'Technical Review',    2,  FALSE, FALSE, TRUE,  72),
  ('government_authority', 'ai', 'risk_assessment',     'Risk Assessment',     3,  FALSE, FALSE, TRUE,  96),
  ('government_authority', 'ai', 'data_privacy_review', 'Data Privacy Review', 4,  FALSE, FALSE, TRUE,  96),
  ('government_authority', 'ai', 'approval',            'Approval',            5,  FALSE, FALSE, TRUE,  96),
  ('government_authority', 'ai', 'committee_review',    'Committee Review',    6,  FALSE, FALSE, TRUE,  192),
  ('government_authority', 'ai', 'ministerial',         'Ministerial Sign-off',7,  FALSE, FALSE, TRUE,  192),
  ('government_authority', 'ai', 'approved',            'Approved',            8,  FALSE, TRUE,  FALSE, NULL),
  ('government_authority', 'ai', 'rejected',            'Rejected',            9,  FALSE, TRUE,  FALSE, NULL),
  ('government_authority', 'ai', 'suspended',           'Suspended',           10, FALSE, TRUE,  FALSE, NULL)
ON CONFLICT (archetype_code, module_code, state_code) DO NOTHING;

INSERT INTO workflow_profile_transitions (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user, require_evidence, auto_escalation_hours)
VALUES
  ('government_authority', 'ai', 'proposed',            'technical_review',    'ai.submit',           'submit',       0, FALSE, FALSE, NULL),
  ('government_authority', 'ai', 'technical_review',    'risk_assessment',     'ai.tech_approve',     'review',       1, TRUE,  TRUE,  72),
  ('government_authority', 'ai', 'technical_review',    'proposed',            'ai.return',           'review',       0, FALSE, FALSE, NULL),
  ('government_authority', 'ai', 'risk_assessment',     'data_privacy_review', 'ai.risk_approve',     'approve',      1, TRUE,  TRUE,  96),
  ('government_authority', 'ai', 'risk_assessment',     'proposed',            'ai.risk_reject',      'approve',      0, FALSE, FALSE, NULL),
  ('government_authority', 'ai', 'data_privacy_review', 'approval',            'ai.privacy_approve',  'approve',      1, TRUE,  TRUE,  96),
  ('government_authority', 'ai', 'data_privacy_review', 'proposed',            'ai.privacy_reject',   'approve',      0, FALSE, FALSE, NULL),
  ('government_authority', 'ai', 'approval',            'committee_review',    'ai.escalate',         'approve_high', 2, TRUE,  TRUE,  96),
  ('government_authority', 'ai', 'approval',            'rejected',            'ai.reject',           'approve_high', 0, FALSE, FALSE, NULL),
  ('government_authority', 'ai', 'committee_review',    'ministerial',         'ai.committee_approve','committee',    2, TRUE,  TRUE,  192),
  ('government_authority', 'ai', 'committee_review',    'rejected',            'ai.committee_reject', 'committee',    0, FALSE, FALSE, NULL),
  ('government_authority', 'ai', 'ministerial',         'approved',            'ai.sign_off',         'multi_level',  2, TRUE,  TRUE,  192),
  ('government_authority', 'ai', 'ministerial',         'rejected',            'ai.final_reject',     'multi_level',  0, FALSE, FALSE, NULL),
  ('government_authority', 'ai', 'approved',            'suspended',           'ai.suspend',          'approve_high', 0, FALSE, FALSE, NULL)
ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING;
