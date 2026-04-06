-- ============================================
-- AGRC-OS Tenant Migration 478
-- workflow_templates.template_code for provisioning profile filtering
-- Stable codes align with seed-workflow-templates.ts (templateCode field).
-- ============================================

ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS template_code VARCHAR(128) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS workflow_templates_template_code_uq
  ON workflow_templates (template_code)
  WHERE template_code IS NOT NULL;

-- Backfill from display name (slug) for rows missing template_code
UPDATE workflow_templates
SET template_code = regexp_replace(
  regexp_replace(lower(trim(name)), '[^a-z0-9]+', '_', 'g'),
  '^_+|_+$', '', 'g'
)
WHERE template_code IS NULL
  AND name IS NOT NULL
  AND trim(name) <> '';

-- Normalize known multi-word titles to canonical codes used by seed profiles
UPDATE workflow_templates SET template_code = 'risk_assessment' WHERE name = 'Risk Assessment' AND template_code IS DISTINCT FROM 'risk_assessment';
UPDATE workflow_templates SET template_code = 'compliance_audit' WHERE name = 'Compliance Audit' AND template_code IS DISTINCT FROM 'compliance_audit';
UPDATE workflow_templates SET template_code = 'incident_response' WHERE name = 'Incident Response' AND template_code IS DISTINCT FROM 'incident_response';
UPDATE workflow_templates SET template_code = 'evidence_collection' WHERE name = 'Evidence Collection' AND template_code IS DISTINCT FROM 'evidence_collection';
UPDATE workflow_templates SET template_code = 'policy_review' WHERE name = 'Policy Review & Approval' AND template_code IS DISTINCT FROM 'policy_review';
UPDATE workflow_templates SET template_code = 'vendor_due_diligence' WHERE name = 'Vendor Due Diligence' AND template_code IS DISTINCT FROM 'vendor_due_diligence';
UPDATE workflow_templates SET template_code = 'team_member_onboarding' WHERE name = 'Team Member Onboarding' AND template_code IS DISTINCT FROM 'team_member_onboarding';
UPDATE workflow_templates SET template_code = 'grc_role_activation' WHERE name = 'GRC Role Activation' AND template_code IS DISTINCT FROM 'grc_role_activation';
