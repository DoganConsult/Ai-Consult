-- Wave 4.1: SLA lifecycle transitions for all modules
-- Adds SLA-aware transitions: open → due_soon → breached → escalated → resolved

INSERT INTO module_lifecycle_transitions (module_code, from_status, to_status, sla_hours, required_permission_code)
VALUES
  ('risk', 'identified', 'due_soon', 72, NULL),
  ('risk', 'due_soon', 'breached', NULL, NULL),
  ('risk', 'breached', 'escalated', NULL, NULL),
  ('risk', 'escalated', 'mitigating', NULL, 'risk:manage'),

  ('compliance', 'in_progress', 'due_soon', 168, NULL),
  ('compliance', 'due_soon', 'breached', NULL, NULL),
  ('compliance', 'breached', 'escalated', NULL, NULL),
  ('compliance', 'escalated', 'in_progress', NULL, 'compliance:manage'),

  ('policy', 'review_due', 'due_soon', 72, NULL),
  ('policy', 'due_soon', 'breached', NULL, NULL),
  ('policy', 'breached', 'escalated', NULL, NULL),
  ('policy', 'escalated', 'review', NULL, 'policy:manage'),

  ('evidence', 'requested', 'due_soon', 48, NULL),
  ('evidence', 'due_soon', 'breached', NULL, NULL),
  ('evidence', 'breached', 'escalated', NULL, NULL),
  ('evidence', 'escalated', 'collecting', NULL, NULL),

  ('audit', 'fieldwork', 'due_soon', 240, NULL),
  ('audit', 'due_soon', 'breached', NULL, NULL),
  ('audit', 'breached', 'escalated', NULL, NULL),
  ('audit', 'escalated', 'fieldwork', NULL, 'audit:manage'),

  ('incident', 'reported', 'due_soon', 24, NULL),
  ('incident', 'due_soon', 'breached', NULL, NULL),
  ('incident', 'breached', 'escalated', NULL, NULL),

  ('vendor', 'due_diligence', 'due_soon', 168, NULL),
  ('vendor', 'due_soon', 'breached', NULL, NULL),
  ('vendor', 'breached', 'escalated', NULL, NULL),
  ('vendor', 'escalated', 'due_diligence', NULL, 'vendor:manage'),

  ('remediation', 'in_progress', 'due_soon', 120, NULL),
  ('remediation', 'due_soon', 'breached', NULL, NULL),
  ('remediation', 'breached', 'escalated', NULL, NULL),
  ('remediation', 'escalated', 'in_progress', NULL, NULL),

  ('action', 'in_progress', 'due_soon', 72, NULL),
  ('action', 'due_soon', 'breached', NULL, NULL),
  ('action', 'breached', 'escalated', NULL, NULL),
  ('action', 'escalated', 'in_progress', NULL, NULL),

  ('exception', 'active', 'due_soon', 168, NULL),
  ('exception', 'due_soon', 'breached', NULL, NULL),
  ('exception', 'breached', 'escalated', NULL, NULL),
  ('exception', 'escalated', 'reviewing', NULL, NULL),

  ('privacy', 'active', 'due_soon', 168, NULL),
  ('privacy', 'due_soon', 'breached', NULL, NULL),
  ('privacy', 'breached', 'escalated', NULL, NULL),
  ('privacy', 'escalated', 'in_progress', NULL, NULL),

  ('bcp', 'active', 'due_soon', 720, NULL),
  ('bcp', 'due_soon', 'breached', NULL, NULL),
  ('bcp', 'breached', 'escalated', NULL, NULL),
  ('bcp', 'escalated', 'testing', NULL, NULL),

  ('asset', 'review_due', 'due_soon', 168, NULL),
  ('asset', 'due_soon', 'breached', NULL, NULL),
  ('asset', 'breached', 'escalated', NULL, NULL),
  ('asset', 'escalated', 'managed', NULL, NULL),

  ('training', 'in_progress', 'due_soon', 168, NULL),
  ('training', 'due_soon', 'overdue', NULL, NULL),
  ('training', 'overdue', 'escalated', NULL, NULL),
  ('training', 'escalated', 'in_progress', NULL, NULL),

  ('ai-governance', 'monitoring', 'due_soon', 720, NULL),
  ('ai-governance', 'due_soon', 'breached', NULL, NULL),
  ('ai-governance', 'breached', 'escalated', NULL, NULL),
  ('ai-governance', 'escalated', 'assessing', NULL, NULL),

  ('reporting', 'scheduled', 'due_soon', 24, NULL),
  ('reporting', 'due_soon', 'breached', NULL, NULL),
  ('reporting', 'breached', 'escalated', NULL, NULL),
  ('reporting', 'escalated', 'generating', NULL, NULL),

  ('integrations', 'active', 'due_soon', 720, NULL),
  ('integrations', 'due_soon', 'breached', NULL, NULL),
  ('integrations', 'breached', 'failed', NULL, NULL),

  ('qiyas', 'in_progress', 'due_soon', 168, NULL),
  ('qiyas', 'due_soon', 'breached', NULL, NULL),
  ('qiyas', 'breached', 'escalated', NULL, NULL),
  ('qiyas', 'escalated', 'in_progress', NULL, NULL),

  ('governance', 'review_due', 'due_soon', 168, NULL),
  ('governance', 'due_soon', 'breached', NULL, NULL),
  ('governance', 'breached', 'escalated', NULL, NULL),
  ('governance', 'escalated', 'active', NULL, NULL),

  ('foundation', 'active', 'due_soon', 720, NULL),
  ('foundation', 'due_soon', 'attention_required', NULL, NULL)
ON CONFLICT DO NOTHING;

-- Seed default SLA tracking rules
INSERT INTO module_sla_tracking (module_code, sla_type, threshold_hours, is_active)
VALUES
  ('risk', 'assessment_sla', 72, TRUE),
  ('risk', 'treatment_sla', 168, TRUE),
  ('compliance', 'assessment_sla', 168, TRUE),
  ('policy', 'review_sla', 72, TRUE),
  ('evidence', 'collection_sla', 48, TRUE),
  ('audit', 'fieldwork_sla', 240, TRUE),
  ('incident', 'response_sla', 24, TRUE),
  ('incident', 'resolution_sla', 72, TRUE),
  ('vendor', 'due_diligence_sla', 168, TRUE),
  ('remediation', 'completion_sla', 120, TRUE),
  ('action', 'completion_sla', 72, TRUE),
  ('exception', 'expiry_sla', 168, TRUE),
  ('privacy', 'dsr_response_sla', 720, TRUE),
  ('bcp', 'exercise_sla', 720, TRUE),
  ('asset', 'review_sla', 168, TRUE),
  ('training', 'completion_sla', 168, TRUE),
  ('ai-governance', 'review_sla', 720, TRUE),
  ('reporting', 'generation_sla', 24, TRUE),
  ('qiyas', 'assessment_sla', 168, TRUE),
  ('governance', 'review_sla', 168, TRUE)
ON CONFLICT (module_code, sla_type) DO NOTHING;
