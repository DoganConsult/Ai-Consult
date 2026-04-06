-- Migration 775: Complete inbound event handler coverage
-- 3 handlers exist in HANDLER_REGISTRY but had no matching DB dispatch rows.
-- Also adds the missing chain event for incident.reported.

INSERT INTO module_inbound_events (module_code, event_name, source_module, handler_action) VALUES
  ('risk', 'incident.reported', 'incident', 'create_risk_from_incident'),
  ('evidence', 'evidence.collected', 'evidence', 'sync_evidence_from_collection'),
  ('action', 'risk.treatment_completed', 'risk', 'flag_stale_record')
ON CONFLICT (module_code, event_name, source_module) DO NOTHING;
