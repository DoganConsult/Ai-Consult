-- Feature 13: Connector-to-Evidence Auto-Collection Mappings

CREATE TABLE IF NOT EXISTS connector_evidence_mappings (
  mapping_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_type    VARCHAR(50) NOT NULL,
  output_type       VARCHAR(100) NOT NULL,
  evidence_type     VARCHAR(100) NOT NULL,
  control_id_pattern VARCHAR(200),
  auto_submit       BOOLEAN DEFAULT TRUE,
  submit_status     VARCHAR(30) DEFAULT 'pending_review',
  enabled           BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cem_connector_output UNIQUE (connector_type, output_type, evidence_type)
);

-- Seed default mappings
INSERT INTO connector_evidence_mappings (connector_type, output_type, evidence_type) VALUES
  ('siem',         'security_events',     'log_report'),
  ('siem',         'alert_summary',       'incident_report'),
  ('cmdb',         'config_snapshot',     'config_baseline'),
  ('cmdb',         'asset_inventory',     'asset_register'),
  ('iam',          'identity_audit',      'access_log'),
  ('iam',          'access_review',       'access_certification'),
  ('itsm',         'ticket_export',       'compliance_report'),
  ('itsm',         'change_records',      'change_log'),
  ('m365',         'compliance_report',   'compliance_report'),
  ('m365',         'audit_log',           'access_log'),
  ('vuln_scanner', 'vulnerability_scan',  'scan_report'),
  ('vuln_scanner', 'remediation_status',  'remediation_evidence')
ON CONFLICT DO NOTHING;
