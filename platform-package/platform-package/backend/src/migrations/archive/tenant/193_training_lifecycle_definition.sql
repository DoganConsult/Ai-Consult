-- Migration 193: Training Module Lifecycle Definition
-- Adds training campaign lifecycle to module_lifecycle_definitions
-- ============================================================

INSERT INTO module_lifecycle_definitions (module_code, statuses, initial_status, terminal_statuses) VALUES
('training',
 ARRAY['draft','scheduled','active','paused','completed','cancelled','archived'],
 'draft', ARRAY['completed','cancelled','archived'])
ON CONFLICT (module_code) DO NOTHING;

INSERT INTO module_lifecycle_transitions (module_code, from_status, to_status, required_functional_roles, required_permission_code, authority_gate, sod_check, sla_hours, description_en) VALUES
('training', 'draft',      'scheduled',  ARRAY['training_manager','campaign_owner'], 'training.program.manage', NULL,      FALSE, NULL, 'Schedule campaign for launch'),
('training', 'scheduled',  'active',     ARRAY['training_manager','campaign_owner'], 'training.program.manage', NULL,      FALSE, NULL, 'Launch campaign'),
('training', 'active',     'paused',     ARRAY['training_manager','campaign_owner'], 'training.program.manage', NULL,      FALSE, NULL, 'Pause active campaign'),
('training', 'paused',     'active',     ARRAY['training_manager','campaign_owner'], 'training.program.manage', NULL,      FALSE, NULL, 'Resume paused campaign'),
('training', 'active',     'completed',  ARRAY['training_manager','campaign_owner'], 'training.program.manage', NULL,      FALSE, NULL, 'Mark campaign as completed'),
('training', 'draft',      'cancelled',  ARRAY['training_manager','campaign_owner'], 'training.program.manage', NULL,      FALSE, NULL, 'Cancel draft campaign'),
('training', 'scheduled',  'cancelled',  ARRAY['training_manager','campaign_owner'], 'training.program.manage', NULL,      FALSE, NULL, 'Cancel scheduled campaign'),
('training', 'completed',  'archived',   ARRAY['training_manager','admin'],          'training.program.manage', NULL,      FALSE, NULL, 'Archive completed campaign')
ON CONFLICT (module_code, from_status, to_status) DO NOTHING;
