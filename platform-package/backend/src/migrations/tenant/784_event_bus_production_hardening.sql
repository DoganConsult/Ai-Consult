-- ============================================================================
-- Migration 784: Event Bus Production Hardening (G1-G11)
-- ============================================================================
-- G2:  WAL dispatch_status for durable delivery
-- G3:  Consumer cursor tracking for replay
-- G6:  Complex Event Processing (CEP) windows
-- G8:  Per-entity ordering via partition sequences
-- G9:  DB-driven inbound handler registry
-- G11: Idempotency tracking per consumer
-- ============================================================================

-- G2: Add dispatch tracking to event log for WAL pattern
ALTER TABLE agrc_event_log ADD COLUMN IF NOT EXISTS dispatch_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE agrc_event_log ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;
ALTER TABLE agrc_event_log ADD COLUMN IF NOT EXISTS dispatch_attempts INT DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_agrc_evt_dispatch_pending
  ON agrc_event_log (dispatch_status, created_at)
  WHERE dispatch_status = 'pending';

-- G3: Consumer cursor tracking for replay
CREATE TABLE IF NOT EXISTS event_consumer_cursors (
  consumer_name VARCHAR(120) NOT NULL,
  last_event_id UUID NOT NULL,
  last_processed_at TIMESTAMPTZ DEFAULT NOW(),
  events_processed BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (consumer_name)
);

-- G6: CEP sliding window table
CREATE TABLE IF NOT EXISTS cep_event_windows (
  window_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_code VARCHAR(100) NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80),
  entity_id VARCHAR(200),
  department_id UUID,
  severity VARCHAR(20),
  event_id UUID,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cep_window_pattern
  ON cep_event_windows (pattern_code, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_cep_window_entity
  ON cep_event_windows (entity_type, entity_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_cep_window_cleanup
  ON cep_event_windows (recorded_at)
  WHERE recorded_at < NOW() - INTERVAL '24 hours';

-- G6: CEP pattern definitions (DB-driven)
CREATE TABLE IF NOT EXISTS cep_pattern_definitions (
  pattern_code VARCHAR(100) PRIMARY KEY,
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  description TEXT,
  match_events TEXT[] NOT NULL,
  match_entity_type VARCHAR(80),
  window_seconds INT NOT NULL DEFAULT 7200,
  threshold INT NOT NULL DEFAULT 3,
  group_by VARCHAR(80) DEFAULT 'entity_id',
  severity VARCHAR(20) DEFAULT 'warning',
  action_type VARCHAR(40) NOT NULL DEFAULT 'notify',
  action_config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT TRUE,
  cooldown_seconds INT DEFAULT 3600,
  last_fired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- G8: Per-entity partition sequence for ordering
CREATE TABLE IF NOT EXISTS event_entity_sequences (
  entity_key VARCHAR(300) PRIMARY KEY,
  sequence_num BIGINT DEFAULT 0,
  last_event_id UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- G9: DB-driven inbound handler config
CREATE TABLE IF NOT EXISTS inbound_handler_registry (
  handler_code VARCHAR(120) PRIMARY KEY,
  handler_type VARCHAR(40) NOT NULL DEFAULT 'sql',
  description TEXT,
  sql_template TEXT,
  target_table VARCHAR(120),
  target_action VARCHAR(40) DEFAULT 'insert',
  field_mapping JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- G11: Idempotency tracking
CREATE TABLE IF NOT EXISTS event_idempotency_log (
  event_id UUID NOT NULL,
  handler_name VARCHAR(120) NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, handler_name)
);
CREATE INDEX IF NOT EXISTS idx_idemp_cleanup
  ON event_idempotency_log (processed_at)
  WHERE processed_at < NOW() - INTERVAL '7 days';

-- G5: Advanced activation conditions stored in agent_context_assignments
ALTER TABLE agent_context_assignments ADD COLUMN IF NOT EXISTS condition_tree JSONB;
ALTER TABLE agent_context_assignments ADD COLUMN IF NOT EXISTS temporal_window JSONB;

-- Seed default CEP patterns
INSERT INTO cep_pattern_definitions (pattern_code, name_en, match_events, match_entity_type, window_seconds, threshold, group_by, severity, action_type, action_config)
VALUES
  ('multi_control_failure', 'Multiple Control Failures',
   ARRAY['control.failed','control.stale','compliance.drift_detected'],
   NULL, 7200, 3, 'department_id', 'critical', 'escalate',
   '{"role":"ciso","title":"Multiple control failures detected in department","template":"cep_control_cascade"}'::jsonb),

  ('incident_storm', 'Incident Storm Detection',
   ARRAY['incident.created','incident.escalated'],
   'incident', 3600, 5, 'entity_type', 'critical', 'escalate',
   '{"role":"owner","title":"Incident storm: {count} incidents in 1 hour","template":"cep_incident_storm"}'::jsonb),

  ('evidence_gap_cascade', 'Evidence Gap Cascade',
   ARRAY['evidence.expired','evidence.rejected','evidence.coverage_low'],
   NULL, 14400, 4, 'entity_type', 'warning', 'create_task',
   '{"taskType":"remediation","title":"Evidence coverage degradation detected","priority":"high","dueDays":7}'::jsonb),

  ('vendor_risk_cluster', 'Vendor Risk Cluster',
   ARRAY['vendor.risk_changed','vendor.dd_completed','vendor.compliance_check_completed'],
   'vendor', 86400, 3, 'entity_id', 'warning', 'run_agent',
   '{"agentId":"A09","description":"Multiple vendor risk signals detected"}'::jsonb),

  ('policy_violation_spike', 'Policy Violation Spike',
   ARRAY['policy.violated','exception.created','compliance.gap_detected'],
   NULL, 7200, 3, 'department_id', 'critical', 'escalate',
   '{"role":"compliance_officer","title":"Policy violation spike in department","template":"cep_policy_spike"}'::jsonb),

  ('audit_finding_surge', 'Audit Finding Surge',
   ARRAY['audit.finding_created','audit.finding.issued'],
   NULL, 86400, 5, 'entity_type', 'warning', 'notify',
   '{"role":"ciso","title":"Audit finding surge: {count} findings in 24h"}'::jsonb),

  ('privacy_breach_cascade', 'Privacy Breach Cascade',
   ARRAY['privacy.breach_detected','privacy.breach_notified','incident.created'],
   NULL, 3600, 2, 'entity_type', 'critical', 'escalate',
   '{"role":"owner","title":"Privacy breach cascade detected","template":"cep_privacy_breach"}'::jsonb)

ON CONFLICT (pattern_code) DO NOTHING;

-- Seed default inbound handlers for G9
INSERT INTO inbound_handler_registry (handler_code, handler_type, description, sql_template, target_table, target_action, field_mapping)
VALUES
  ('create_risk_from_gap', 'sql', 'Create risk from compliance gap',
   'INSERT INTO risks (title, description, risk_source, source_entity_type, source_entity_id, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING',
   'risks', 'insert',
   '{"title":"Risk from compliance gap: {entityId}","description":"{description}","risk_source":"compliance","source_entity_type":"compliance_gap","source_entity_id":"{entityId}","status":"identified","created_by":"{userId}"}'::jsonb),

  ('create_risk_from_finding', 'sql', 'Create risk from audit finding',
   'INSERT INTO risks (title, description, risk_source, source_entity_type, source_entity_id, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING',
   'risks', 'insert',
   '{"title":"Risk from audit finding: {entityId}","description":"{description}","risk_source":"audit","source_entity_type":"audit_finding","source_entity_id":"{entityId}","status":"identified","created_by":"{userId}"}'::jsonb),

  ('create_risk_from_incident', 'sql', 'Create risk from escalated incident',
   'INSERT INTO risks (title, description, risk_source, source_entity_type, source_entity_id, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING',
   'risks', 'insert',
   '{"title":"Risk from incident: {entityId}","description":"{description}","risk_source":"incident","source_entity_type":"incident","source_entity_id":"{entityId}","status":"identified","created_by":"{userId}"}'::jsonb),

  ('flag_vendor_risk', 'sql', 'Flag vendor for reassessment',
   'UPDATE vendors SET reassessment_needed = TRUE, updated_at = NOW() WHERE vendor_id = $1',
   'vendors', 'update',
   '{"vendor_id":"{entityId}"}'::jsonb),

  ('expire_related_exceptions', 'sql', 'Expire exceptions for published policy',
   'UPDATE exceptions SET status = ''expired'', updated_at = NOW() WHERE linked_policy_id = $1 AND status = ''active''',
   'exceptions', 'update',
   '{"linked_policy_id":"{entityId}"}'::jsonb)

ON CONFLICT (handler_code) DO NOTHING;

-- Cleanup job support: auto-purge old CEP windows and idempotency entries
-- (called by platform scheduler)
