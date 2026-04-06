-- ============================================
-- Migration 904 — Event Trigger Bindings
-- Tenant-scoped event notification routing table.
-- Maps platform events → notification channels → target roles/users.
-- ============================================
-- Context:
--   The platform emits typed events (risk.created, compliance.gap_detected, etc.)
--   but had no persistent table for binding these events to notification recipients.
--   This migration creates the binding table and seeds 10 default bindings for
--   the most operationally important events.
--
--   Cross-reference: backend/migrations/tenant/039_event_trigger_bindings.sql
--   (same migration for the legacy migration path)
--
-- Schema: tenant (each tenant has their own event_trigger_bindings table)
-- ============================================

CREATE TABLE IF NOT EXISTS event_trigger_bindings (
    binding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_namespace VARCHAR(100) NOT NULL,         -- e.g. 'risk', 'compliance', 'agent'
    event_name VARCHAR(100) NOT NULL,              -- e.g. 'risk.created', 'agent.proposal.submitted'
    notification_channel VARCHAR(50) NOT NULL,     -- e.g. 'in_app', 'email', 'webhook', 'slack'
    target_type VARCHAR(50) NOT NULL,              -- e.g. 'role', 'user', 'owner', 'escalation_chain'
    target_value JSONB NOT NULL DEFAULT '{}',      -- role name, user_id, or chain config
    template_key VARCHAR(200),                     -- notification template identifier
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    conditions JSONB DEFAULT '{}',                 -- optional filter conditions
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_namespace, event_name, notification_channel, target_type)
);

CREATE INDEX IF NOT EXISTS idx_event_trigger_bindings_namespace ON event_trigger_bindings(event_namespace);
CREATE INDEX IF NOT EXISTS idx_event_trigger_bindings_enabled ON event_trigger_bindings(is_enabled) WHERE is_enabled = TRUE;

-- ============================================
-- Default Bindings — 10 most important events
-- ============================================

-- 1. risk.created → in_app → risk_manager role
INSERT INTO event_trigger_bindings
  (event_namespace, event_name, notification_channel, target_type, target_value, template_key, is_enabled)
VALUES
  ('risk', 'risk.created', 'in_app', 'role',
   '{"role": "risk_manager"}'::jsonb,
   'risk.created.in_app.risk_manager',
   TRUE)
ON CONFLICT (event_namespace, event_name, notification_channel, target_type) DO NOTHING;

-- 2. risk.score_changed → email → risk_owner
INSERT INTO event_trigger_bindings
  (event_namespace, event_name, notification_channel, target_type, target_value, template_key, is_enabled)
VALUES
  ('risk', 'risk.score_changed', 'email', 'owner',
   '{"owner_field": "risk_owner"}'::jsonb,
   'risk.score_changed.email.risk_owner',
   TRUE)
ON CONFLICT (event_namespace, event_name, notification_channel, target_type) DO NOTHING;

-- 3. compliance.gap_detected → in_app → compliance_officer role
INSERT INTO event_trigger_bindings
  (event_namespace, event_name, notification_channel, target_type, target_value, template_key, is_enabled)
VALUES
  ('compliance', 'compliance.gap_detected', 'in_app', 'role',
   '{"role": "compliance_officer"}'::jsonb,
   'compliance.gap_detected.in_app.compliance_officer',
   TRUE)
ON CONFLICT (event_namespace, event_name, notification_channel, target_type) DO NOTHING;

-- 4. agent.proposal.submitted → in_app → approver role
INSERT INTO event_trigger_bindings
  (event_namespace, event_name, notification_channel, target_type, target_value, template_key, is_enabled)
VALUES
  ('agent', 'agent.proposal.submitted', 'in_app', 'role',
   '{"role": "approver"}'::jsonb,
   'agent.proposal.submitted.in_app.approver',
   TRUE)
ON CONFLICT (event_namespace, event_name, notification_channel, target_type) DO NOTHING;

-- 5. audit.finding.created → in_app → audit_lead role
INSERT INTO event_trigger_bindings
  (event_namespace, event_name, notification_channel, target_type, target_value, template_key, is_enabled)
VALUES
  ('audit', 'audit.finding.created', 'in_app', 'role',
   '{"role": "audit_lead"}'::jsonb,
   'audit.finding.created.in_app.audit_lead',
   TRUE)
ON CONFLICT (event_namespace, event_name, notification_channel, target_type) DO NOTHING;

-- 6. policy.expiry_approaching → email → policy_owner
INSERT INTO event_trigger_bindings
  (event_namespace, event_name, notification_channel, target_type, target_value, template_key, is_enabled)
VALUES
  ('policy', 'policy.expiry_approaching', 'email', 'owner',
   '{"owner_field": "policy_owner"}'::jsonb,
   'policy.expiry_approaching.email.policy_owner',
   TRUE)
ON CONFLICT (event_namespace, event_name, notification_channel, target_type) DO NOTHING;

-- 7. vendor.risk_score_changed → in_app → vendor_manager role
INSERT INTO event_trigger_bindings
  (event_namespace, event_name, notification_channel, target_type, target_value, template_key, is_enabled)
VALUES
  ('vendor', 'vendor.risk_score_changed', 'in_app', 'role',
   '{"role": "vendor_manager"}'::jsonb,
   'vendor.risk_score_changed.in_app.vendor_manager',
   TRUE)
ON CONFLICT (event_namespace, event_name, notification_channel, target_type) DO NOTHING;

-- 8a. incident.created → in_app → incident_responder role
INSERT INTO event_trigger_bindings
  (event_namespace, event_name, notification_channel, target_type, target_value, template_key, is_enabled)
VALUES
  ('incident', 'incident.created', 'in_app', 'role',
   '{"role": "incident_responder"}'::jsonb,
   'incident.created.in_app.incident_responder',
   TRUE)
ON CONFLICT (event_namespace, event_name, notification_channel, target_type) DO NOTHING;

-- 8b. incident.created → email → incident_responder role
INSERT INTO event_trigger_bindings
  (event_namespace, event_name, notification_channel, target_type, target_value, template_key, is_enabled)
VALUES
  ('incident', 'incident.created', 'email', 'role',
   '{"role": "incident_responder"}'::jsonb,
   'incident.created.email.incident_responder',
   TRUE)
ON CONFLICT (event_namespace, event_name, notification_channel, target_type) DO NOTHING;

-- 9. evidence.expired → in_app → evidence_owner
INSERT INTO event_trigger_bindings
  (event_namespace, event_name, notification_channel, target_type, target_value, template_key, is_enabled)
VALUES
  ('evidence', 'evidence.expired', 'in_app', 'owner',
   '{"owner_field": "evidence_owner"}'::jsonb,
   'evidence.expired.in_app.evidence_owner',
   TRUE)
ON CONFLICT (event_namespace, event_name, notification_channel, target_type) DO NOTHING;

-- 10. bcp.rto_breached → email → bcm_lead role
INSERT INTO event_trigger_bindings
  (event_namespace, event_name, notification_channel, target_type, target_value, template_key, is_enabled)
VALUES
  ('bcp', 'bcp.rto_breached', 'email', 'role',
   '{"role": "bcm_lead"}'::jsonb,
   'bcp.rto_breached.email.bcm_lead',
   TRUE)
ON CONFLICT (event_namespace, event_name, notification_channel, target_type) DO NOTHING;
