-- Migration 216: Seed SLA config + RACI entries for workflow task types
-- Without these, workflow tasks use hardcoded SLA defaults and skip T3 RACI resolution.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. SLA Config for workflow_task and workflow_approval
--    team_id = QUALITY for tasks, EXEC_STRATEGY for approvals
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO sla_config (process_type, team_id, priority_level, initial_sla_hours,
  warning_threshold_percent, critical_threshold_percent,
  escalation_1_hours, escalation_1_to_team_id,
  escalation_2_hours, escalation_2_to_team_id,
  escalation_3_hours, escalation_3_to_team_id,
  auto_escalate, active)
SELECT
  v.process_type, v.team_id, v.priority_level, v.initial_sla_hours,
  75, 90,
  GREATEST(v.initial_sla_hours / 2, 1), (SELECT team_id FROM teams WHERE team_code = 'CYBER_GOV' LIMIT 1),
  GREATEST(v.initial_sla_hours * 3 / 4, 2), (SELECT team_id FROM teams WHERE team_code = 'ERM' LIMIT 1),
  v.initial_sla_hours, (SELECT team_id FROM teams WHERE team_code = 'EXEC_STRATEGY' LIMIT 1),
  TRUE, TRUE
FROM (VALUES
  ('workflow_task',     (SELECT team_id FROM teams WHERE team_code = 'QUALITY' LIMIT 1),        'critical',  4),
  ('workflow_task',     (SELECT team_id FROM teams WHERE team_code = 'QUALITY' LIMIT 1),        'high',      8),
  ('workflow_task',     (SELECT team_id FROM teams WHERE team_code = 'QUALITY' LIMIT 1),        'medium',   24),
  ('workflow_task',     (SELECT team_id FROM teams WHERE team_code = 'QUALITY' LIMIT 1),        'low',      72),
  ('workflow_approval', (SELECT team_id FROM teams WHERE team_code = 'EXEC_STRATEGY' LIMIT 1),  'critical',  2),
  ('workflow_approval', (SELECT team_id FROM teams WHERE team_code = 'EXEC_STRATEGY' LIMIT 1),  'high',      4),
  ('workflow_approval', (SELECT team_id FROM teams WHERE team_code = 'EXEC_STRATEGY' LIMIT 1),  'medium',   12),
  ('workflow_approval', (SELECT team_id FROM teams WHERE team_code = 'EXEC_STRATEGY' LIMIT 1),  'low',      48)
) AS v(process_type, team_id, priority_level, initial_sla_hours)
WHERE v.team_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. RACI entries for scope_type='workflow'
--    Enables T3 RACI resolution for workflow-generated tasks
-- ═══════════════════════════════════════════════════════════════════════

-- Responsible: QUALITY team handles workflow tasks
INSERT INTO team_raci_assignments (scope_type, scope_id, team_id, raci_role, notes, created_by)
SELECT 'workflow', 'workflow_automation', t.team_id, 'responsible',
       'Workflow task routing — default responsible team for workflow-generated tasks',
       '00000000-0000-0000-0000-000000000000'
FROM teams t WHERE t.team_code = 'QUALITY'
ON CONFLICT (scope_type, scope_id, raci_role, team_id) DO NOTHING;

-- Accountable: EXEC_STRATEGY oversees workflow execution
INSERT INTO team_raci_assignments (scope_type, scope_id, team_id, raci_role, notes, created_by)
SELECT 'workflow', 'workflow_automation', t.team_id, 'accountable',
       'Workflow oversight — accountable for workflow execution completion',
       '00000000-0000-0000-0000-000000000000'
FROM teams t WHERE t.team_code = 'EXEC_STRATEGY'
ON CONFLICT (scope_type, scope_id, raci_role, team_id) DO NOTHING;

-- Consulted: CYBER_GOV consulted on workflow governance
INSERT INTO team_raci_assignments (scope_type, scope_id, team_id, raci_role, notes, created_by)
SELECT 'workflow', 'workflow_automation', t.team_id, 'consulted',
       'Workflow governance — consulted on workflow design and compliance',
       '00000000-0000-0000-0000-000000000000'
FROM teams t WHERE t.team_code = 'CYBER_GOV'
ON CONFLICT (scope_type, scope_id, raci_role, team_id) DO NOTHING;

-- Informed: AUDIT informed of all workflow activity
INSERT INTO team_raci_assignments (scope_type, scope_id, team_id, raci_role, notes, created_by)
SELECT 'workflow', 'workflow_automation', t.team_id, 'informed',
       'Workflow audit trail — informed on all workflow execution activity',
       '00000000-0000-0000-0000-000000000000'
FROM teams t WHERE t.team_code = 'AUDIT'
ON CONFLICT (scope_type, scope_id, raci_role, team_id) DO NOTHING;
