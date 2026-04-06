-- ============================================
-- Shahin GRC — Tenant Migration 297
-- Connector Governance Rules
-- Extends connector_automation_rules with
-- governance layer actions: escalation,
-- training capture, constitution checks, audit.
-- ============================================

-- Expand connector_category CHECK to include 'governance'
ALTER TABLE connector_registry
  DROP CONSTRAINT IF EXISTS connector_registry_connector_category_check;
ALTER TABLE connector_registry
  ADD CONSTRAINT connector_registry_connector_category_check
  CHECK (connector_category IN ('siem','iam','itsm','cmdb','vulnerability','cloud','erp','collaboration','governance'));

-- Ensure wildcard connector_code exists for governance rules
INSERT INTO connector_registry (connector_code, display_name_en, connector_category, direction, is_active, sort_order)
VALUES ('*', 'All Connectors (Wildcard)', 'governance', 'read', TRUE, 999)
ON CONFLICT (connector_code) DO NOTHING;

-- Extend action_type check to include governance actions
ALTER TABLE connector_automation_rules
  DROP CONSTRAINT IF EXISTS connector_automation_rules_action_type_check;

ALTER TABLE connector_automation_rules
  ADD CONSTRAINT connector_automation_rules_action_type_check
  CHECK (action_type IN (
    'create_incident','create_risk','create_task','submit_evidence',
    'escalate','notify','link_entity',
    'governance_escalate','training_capture','constitution_check','audit_record'
  ));

-- ── Governance Escalation Rule ────────────────────────────────────────────
-- Escalate to governance body when connector health degrades beyond threshold
INSERT INTO connector_automation_rules
  (connector_code, rule_code, rule_name_en, trigger_event, action_type, conditions, action_config, enabled, sort_order)
VALUES
  ('*', 'gov_escalate_health', 'Escalate to governance on persistent connector failure',
   'connector.health_degraded', 'governance_escalate',
   '{"failure_count_min": 5}'::jsonb,
   '{"priority": "critical", "board_attention": true, "escalation_level": 1}'::jsonb,
   TRUE, 100)
ON CONFLICT (connector_code, rule_code) DO NOTHING;

-- ── Training Capture Rule ─────────────────────────────────────────────────
-- Capture connector sync outcomes for AI training pipeline
INSERT INTO connector_automation_rules
  (connector_code, rule_code, rule_name_en, trigger_event, action_type, conditions, action_config, enabled, sort_order)
VALUES
  ('*', 'training_sync_capture', 'Capture connector sync patterns for AI training',
   'connector.data_processed', 'training_capture',
   '{}'::jsonb,
   '{"training_category": "integration_management", "capture_outcomes": true}'::jsonb,
   TRUE, 110)
ON CONFLICT (connector_code, rule_code) DO NOTHING;

-- ── Constitution / Risk Appetite Check Rule ───────────────────────────────
-- Gate risk creation from connector data against tenant risk appetite
INSERT INTO connector_automation_rules
  (connector_code, rule_code, rule_name_en, trigger_event, action_type, conditions, action_config, enabled, sort_order)
VALUES
  ('*', 'constitution_risk_gate', 'Check risk appetite before auto-creating risks',
   'connector.sync_completed', 'constitution_check',
   '{"applies_to": "create_risk"}'::jsonb,
   '{"check_appetite": true, "require_approval_if_exceeded": true}'::jsonb,
   TRUE, 120)
ON CONFLICT (connector_code, rule_code) DO NOTHING;

-- ── Audit Recording Rule ──────────────────────────────────────────────────
-- Record tamper-proof audit trail for all connector data processing
INSERT INTO connector_automation_rules
  (connector_code, rule_code, rule_name_en, trigger_event, action_type, conditions, action_config, enabled, sort_order)
VALUES
  ('*', 'audit_sync_record', 'Record audit trail for connector sync and processing',
   'connector.sync_completed', 'audit_record',
   '{}'::jsonb,
   '{"module": "connectors", "include_record_count": true, "include_outcomes": true}'::jsonb,
   TRUE, 130)
ON CONFLICT (connector_code, rule_code) DO NOTHING;

-- ── Digital Twin Snapshot Rule ────────────────────────────────────────────
-- Include connector state in digital twin simulations
INSERT INTO connector_automation_rules
  (connector_code, rule_code, rule_name_en, trigger_event, action_type, conditions, action_config, enabled, sort_order)
VALUES
  ('*', 'digital_twin_include', 'Include connectors in digital twin snapshots',
   'connector.connected', 'notify',
   '{}'::jsonb,
   '{"target": "digital_twin", "snapshot_connectors": true}'::jsonb,
   TRUE, 140)
ON CONFLICT (connector_code, rule_code) DO NOTHING;
