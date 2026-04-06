-- Migration 264: Register 'workflow' as a canonical module in module_workflow_registry
-- Closes Phase 1 gap: workflow was not registered as a standalone module.

INSERT INTO module_workflow_registry (
  module_code, display_name_en, display_name_ar, module_category,
  has_lifecycle, primary_template_code, permission_prefix,
  primary_roles, sla_default_hours, automation_level, sort_order,
  lifecycle_statuses, initial_status, terminal_statuses,
  event_types, icon, color
) VALUES (
  'workflow',
  'Workflow Engine',
  'محرك سير العمل',
  'operational',
  TRUE,
  NULL,
  'workflow',
  ARRAY['workflow_admin','workflow_designer','workflow_executor','workflow_approver'],
  168,
  'semi',
  14,
  ARRAY['draft','active','deprecated','archived'],
  'draft',
  ARRAY['archived'],
  ARRAY[
    'workflow.created','workflow.updated','workflow.deleted','workflow.published',
    'workflow.execution_started','workflow.execution_completed','workflow.execution_failed','workflow.execution_cancelled',
    'workflow.step_entered','workflow.step_completed','workflow.step_failed',
    'workflow.task_assigned','workflow.task_completed','workflow.task_rejected','workflow.task_reassigned',
    'workflow.approval_requested','workflow.approval_approved','workflow.approval_rejected',
    'workflow.escalation_raised','workflow.escalation_resolved',
    'workflow.sla_warning','workflow.sla_breached',
    'workflow.trigger_fired'
  ],
  'pi pi-sitemap',
  '#6366f1'
) ON CONFLICT (module_code) DO UPDATE SET
  display_name_en = EXCLUDED.display_name_en,
  display_name_ar = EXCLUDED.display_name_ar,
  event_types = EXCLUDED.event_types,
  lifecycle_statuses = EXCLUDED.lifecycle_statuses,
  initial_status = EXCLUDED.initial_status,
  terminal_statuses = EXCLUDED.terminal_statuses,
  primary_roles = EXCLUDED.primary_roles,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  updated_at = NOW();
