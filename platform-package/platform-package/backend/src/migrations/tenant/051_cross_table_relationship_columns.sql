-- ============================================
-- Shahin GRC — Tenant Migration 051
-- Add missing cross-table relationship columns
-- 25 columns across 10 tables to enable proper
-- FK relationships between GRC domain objects
-- ============================================

-- ── action_items (5 missing) ─────────────────────────────────────────────
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS vendor_id uuid;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS control_id uuid;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS risk_id uuid;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS team_id uuid;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- ── controls (2 missing) ─────────────────────────────────────────────────
ALTER TABLE controls ADD COLUMN IF NOT EXISTS framework_id uuid;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS risk_id uuid;

-- ── evidence (2 missing) ─────────────────────────────────────────────────
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS asset_id uuid;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS policy_id uuid;

-- ── findings (4 missing) ─────────────────────────────────────────────────
ALTER TABLE findings ADD COLUMN IF NOT EXISTS control_id uuid;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS policy_id uuid;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS risk_id uuid;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS vendor_id uuid;

-- ── incidents (3 missing) ────────────────────────────────────────────────
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS asset_id uuid;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS control_id uuid;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS vendor_id uuid;

-- ── policies (1 missing) ─────────────────────────────────────────────────
ALTER TABLE policies ADD COLUMN IF NOT EXISTS framework_id uuid;

-- ── remediation_tasks (3 missing) ────────────────────────────────────────
ALTER TABLE remediation_tasks ADD COLUMN IF NOT EXISTS control_id uuid;
ALTER TABLE remediation_tasks ADD COLUMN IF NOT EXISTS risk_id uuid;
ALTER TABLE remediation_tasks ADD COLUMN IF NOT EXISTS vendor_id uuid;

-- ── risks (2 missing) ────────────────────────────────────────────────────
ALTER TABLE risks ADD COLUMN IF NOT EXISTS control_id uuid;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS framework_id uuid;

-- ── sla_breaches (1 missing) ─────────────────────────────────────────────
ALTER TABLE sla_breaches ADD COLUMN IF NOT EXISTS vendor_id uuid;

-- ── vulnerabilities (1 missing) ──────────────────────────────────────────
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS asset_id uuid;

-- ── workflows (1 missing) ────────────────────────────────────────────────
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS team_id uuid;

-- ── Indexes for the new FK columns (most queried patterns) ───────────────
CREATE INDEX IF NOT EXISTS idx_action_items_vendor_id ON action_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_action_items_control_id ON action_items(control_id);
CREATE INDEX IF NOT EXISTS idx_action_items_risk_id ON action_items(risk_id);
CREATE INDEX IF NOT EXISTS idx_findings_vendor_id ON findings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_findings_control_id ON findings(control_id);
CREATE INDEX IF NOT EXISTS idx_findings_risk_id ON findings(risk_id);
CREATE INDEX IF NOT EXISTS idx_incidents_vendor_id ON incidents(vendor_id);
CREATE INDEX IF NOT EXISTS idx_incidents_control_id ON incidents(control_id);
CREATE INDEX IF NOT EXISTS idx_incidents_asset_id ON incidents(asset_id);
CREATE INDEX IF NOT EXISTS idx_evidence_asset_id ON evidence(asset_id);
CREATE INDEX IF NOT EXISTS idx_evidence_policy_id ON evidence(policy_id);
CREATE INDEX IF NOT EXISTS idx_remediation_tasks_vendor_id ON remediation_tasks(vendor_id);
CREATE INDEX IF NOT EXISTS idx_remediation_tasks_control_id ON remediation_tasks(control_id);
CREATE INDEX IF NOT EXISTS idx_sla_breaches_vendor_id ON sla_breaches(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_asset_id ON vulnerabilities(asset_id);
CREATE INDEX IF NOT EXISTS idx_controls_framework_id ON controls(framework_id);
CREATE INDEX IF NOT EXISTS idx_policies_framework_id ON policies(framework_id);
CREATE INDEX IF NOT EXISTS idx_risks_framework_id ON risks(framework_id);
CREATE INDEX IF NOT EXISTS idx_risks_control_id ON risks(control_id);
CREATE INDEX IF NOT EXISTS idx_workflows_team_id ON workflows(team_id);
