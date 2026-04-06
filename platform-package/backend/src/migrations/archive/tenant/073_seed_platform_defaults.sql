-- Migration 073: Platform Defaults Seed
-- Seeds: scoring policy, workflow templates, framework mappings, operational events, report templates, assets samples

-- Ensure prerequisite tables exist (may be missing if tenant was created before DDL update)
CREATE TABLE IF NOT EXISTS scoring_policies (
  policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en VARCHAR(255),
  name_ar VARCHAR(255),
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  weights JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflows (
  workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  definition JSONB NOT NULL DEFAULT '{}',
  version INT DEFAULT 1,
  status VARCHAR(50) DEFAULT 'draft',
  created_by VARCHAR(64) NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 1. DEFAULT SCORING POLICY
-- ═══════════════════════════════════════════════════════════════
-- Add missing columns to scoring_policies if needed
ALTER TABLE scoring_policies ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE scoring_policies ADD COLUMN IF NOT EXISTS name_ar VARCHAR(255);
ALTER TABLE scoring_policies ADD COLUMN IF NOT EXISTS description TEXT;

INSERT INTO scoring_policies (policy_id, name, is_default, weights, created_at)
VALUES (
  gen_random_uuid(),
  'Standard GRC Scoring Policy',
  true,
  '{"governance": 20, "risk": 25, "compliance": 25, "audit": 15, "evidence": 15}'::jsonb,
  NOW()
) ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 2. WORKFLOW TEMPLATES
-- ═══════════════════════════════════════════════════════════════
INSERT INTO workflows (workflow_id, name, status, definition, created_by) VALUES
(gen_random_uuid(), 'Policy Approval Workflow', 'template', '{
  "type": "template",
  "description": "Standard policy review and approval workflow",
  "nodes": [
    {"id": "start", "type": "trigger", "subType": "manual", "config": {}, "position": {"x": 0, "y": 0}},
    {"id": "draft_review", "type": "action", "subType": "manual_review", "config": {"role": "compliance_officer", "label": "Draft Review"}, "position": {"x": 200, "y": 0}},
    {"id": "manager_approval", "type": "governance", "subType": "approval", "config": {"role": "admin", "label": "Manager Approval"}, "position": {"x": 400, "y": 0}},
    {"id": "publish", "type": "action", "subType": "auto_publish", "config": {"target": "policies"}, "position": {"x": 600, "y": 0}},
    {"id": "end", "type": "end", "subType": "complete", "config": {}, "position": {"x": 800, "y": 0}}
  ],
  "edges": [
    {"id": "e1", "source": "start", "target": "draft_review"},
    {"id": "e2", "source": "draft_review", "target": "manager_approval"},
    {"id": "e3", "source": "manager_approval", "target": "publish"},
    {"id": "e4", "source": "publish", "target": "end"}
  ],
  "swimlanes": [], "triggers": []
}'::jsonb, 'system'),
(gen_random_uuid(), 'Risk Assessment Workflow', 'template', '{
  "type": "template",
  "description": "Standard risk identification, assessment, and treatment workflow",
  "nodes": [
    {"id": "start", "type": "trigger", "subType": "manual", "config": {}, "position": {"x": 0, "y": 0}},
    {"id": "identify", "type": "action", "subType": "risk_identify", "config": {"role": "risk_manager"}, "position": {"x": 200, "y": 0}},
    {"id": "assess", "type": "action", "subType": "risk_assess", "config": {"role": "risk_manager"}, "position": {"x": 400, "y": 0}},
    {"id": "treatment", "type": "action", "subType": "risk_treat", "config": {"role": "risk_manager"}, "position": {"x": 600, "y": 0}},
    {"id": "review", "type": "governance", "subType": "approval", "config": {"role": "admin"}, "position": {"x": 800, "y": 0}},
    {"id": "end", "type": "end", "subType": "complete", "config": {}, "position": {"x": 1000, "y": 0}}
  ],
  "edges": [
    {"id": "e1", "source": "start", "target": "identify"},
    {"id": "e2", "source": "identify", "target": "assess"},
    {"id": "e3", "source": "assess", "target": "treatment"},
    {"id": "e4", "source": "treatment", "target": "review"},
    {"id": "e5", "source": "review", "target": "end"}
  ],
  "swimlanes": [], "triggers": []
}'::jsonb, 'system'),
(gen_random_uuid(), 'Incident Response Workflow', 'template', '{
  "type": "template",
  "description": "Standard incident detection, triage, containment, and resolution workflow",
  "nodes": [
    {"id": "start", "type": "trigger", "subType": "event", "config": {"event": "incident_reported"}, "position": {"x": 0, "y": 0}},
    {"id": "triage", "type": "action", "subType": "manual_review", "config": {"role": "admin", "label": "Triage"}, "position": {"x": 200, "y": 0}},
    {"id": "contain", "type": "action", "subType": "containment", "config": {"role": "admin"}, "position": {"x": 400, "y": 0}},
    {"id": "investigate", "type": "action", "subType": "investigation", "config": {"role": "auditor"}, "position": {"x": 600, "y": 0}},
    {"id": "resolve", "type": "action", "subType": "resolution", "config": {"role": "admin"}, "position": {"x": 800, "y": 0}},
    {"id": "end", "type": "end", "subType": "complete", "config": {}, "position": {"x": 1000, "y": 0}}
  ],
  "edges": [
    {"id": "e1", "source": "start", "target": "triage"},
    {"id": "e2", "source": "triage", "target": "contain"},
    {"id": "e3", "source": "contain", "target": "investigate"},
    {"id": "e4", "source": "investigate", "target": "resolve"},
    {"id": "e5", "source": "resolve", "target": "end"}
  ],
  "swimlanes": [], "triggers": []
}'::jsonb, 'system'),
(gen_random_uuid(), 'Evidence Collection Workflow', 'template', '{
  "type": "template",
  "description": "Standard evidence request, collection, review, and approval workflow",
  "nodes": [
    {"id": "start", "type": "trigger", "subType": "manual", "config": {}, "position": {"x": 0, "y": 0}},
    {"id": "request", "type": "action", "subType": "evidence_request", "config": {"role": "compliance_officer"}, "position": {"x": 200, "y": 0}},
    {"id": "collect", "type": "action", "subType": "evidence_collect", "config": {"role": "viewer"}, "position": {"x": 400, "y": 0}},
    {"id": "review", "type": "governance", "subType": "approval", "config": {"role": "auditor"}, "position": {"x": 600, "y": 0}},
    {"id": "end", "type": "end", "subType": "complete", "config": {}, "position": {"x": 800, "y": 0}}
  ],
  "edges": [
    {"id": "e1", "source": "start", "target": "request"},
    {"id": "e2", "source": "request", "target": "collect"},
    {"id": "e3", "source": "collect", "target": "review"},
    {"id": "e4", "source": "review", "target": "end"}
  ],
  "swimlanes": [], "triggers": []
}'::jsonb, 'system'),
(gen_random_uuid(), 'Audit Execution Workflow', 'template', '{
  "type": "template",
  "description": "Standard audit planning, fieldwork, reporting, and follow-up workflow",
  "nodes": [
    {"id": "start", "type": "trigger", "subType": "manual", "config": {}, "position": {"x": 0, "y": 0}},
    {"id": "plan", "type": "action", "subType": "audit_plan", "config": {"role": "auditor"}, "position": {"x": 200, "y": 0}},
    {"id": "fieldwork", "type": "action", "subType": "audit_fieldwork", "config": {"role": "auditor"}, "position": {"x": 400, "y": 0}},
    {"id": "report", "type": "action", "subType": "audit_report", "config": {"role": "auditor"}, "position": {"x": 600, "y": 0}},
    {"id": "followup", "type": "governance", "subType": "approval", "config": {"role": "admin"}, "position": {"x": 800, "y": 0}},
    {"id": "end", "type": "end", "subType": "complete", "config": {}, "position": {"x": 1000, "y": 0}}
  ],
  "edges": [
    {"id": "e1", "source": "start", "target": "plan"},
    {"id": "e2", "source": "plan", "target": "fieldwork"},
    {"id": "e3", "source": "fieldwork", "target": "report"},
    {"id": "e4", "source": "report", "target": "followup"},
    {"id": "e5", "source": "followup", "target": "end"}
  ],
  "swimlanes": [], "triggers": []
}'::jsonb, 'system')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 3. RISK SCORING DEFAULT MODEL
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS risk_scoring_models (
  model_id VARCHAR(100) PRIMARY KEY,
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200) NOT NULL,
  dimensions JSONB NOT NULL DEFAULT '[]',
  thresholds JSONB NOT NULL DEFAULT '{}',
  formula VARCHAR(20) NOT NULL DEFAULT 'weighted',
  zone_definitions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO risk_scoring_models (model_id, name_en, name_ar, dimensions, thresholds, formula, zone_definitions) VALUES
('default-5x5', 'Standard 5×5 Risk Matrix', 'مصفوفة المخاطر القياسية 5×5',
 '[{"key":"likelihood","label":"Likelihood","weight":50,"scale":5},{"key":"impact","label":"Impact","weight":50,"scale":5}]'::jsonb,
 '{"low":{"max":6},"medium":{"min":7,"max":12},"high":{"min":13,"max":19},"critical":{"min":20}}'::jsonb,
 'multiply',
 '{"green":"Low risk — monitor","yellow":"Medium risk — mitigate","orange":"High risk — treat urgently","red":"Critical — immediate escalation"}'::jsonb
) ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 4. FRAMEWORK CROSS-MAPPINGS (NCA ECC ↔ ISO 27001 ↔ NIST CSF)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS framework_cross_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_framework VARCHAR(200) NOT NULL,
  target_framework VARCHAR(200) NOT NULL,
  source_control VARCHAR(200) NOT NULL,
  target_control VARCHAR(200) NOT NULL,
  relationship VARCHAR(50) DEFAULT 'equivalent',
  confidence NUMERIC(3,2) DEFAULT 0.80,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fcm_source ON framework_cross_mappings (source_framework, source_control);
CREATE INDEX IF NOT EXISTS idx_fcm_target ON framework_cross_mappings (target_framework, target_control);

INSERT INTO framework_cross_mappings (source_framework, target_framework, source_control, target_control, relationship, confidence) VALUES
-- NCA ECC → ISO 27001:2022 core mappings
('NCA-ECC', 'ISO-27001', '1-1-1', 'A.5.1', 'equivalent', 0.90),
('NCA-ECC', 'ISO-27001', '1-1-2', 'A.5.2', 'equivalent', 0.85),
('NCA-ECC', 'ISO-27001', '1-2-1', 'A.5.3', 'partial', 0.70),
('NCA-ECC', 'ISO-27001', '1-3-1', 'A.6.1', 'equivalent', 0.85),
('NCA-ECC', 'ISO-27001', '2-1-1', 'A.5.10', 'equivalent', 0.90),
('NCA-ECC', 'ISO-27001', '2-2-1', 'A.8.1', 'partial', 0.75),
('NCA-ECC', 'ISO-27001', '3-1-1', 'A.8.9', 'equivalent', 0.85),
('NCA-ECC', 'ISO-27001', '4-1-1', 'A.5.25', 'equivalent', 0.90),
('NCA-ECC', 'ISO-27001', '5-1-1', 'A.5.35', 'equivalent', 0.85),
-- NCA ECC → NIST CSF core mappings
('NCA-ECC', 'NIST-CSF', '1-1-1', 'GV.PO-01', 'equivalent', 0.85),
('NCA-ECC', 'NIST-CSF', '1-2-1', 'GV.RR-01', 'partial', 0.70),
('NCA-ECC', 'NIST-CSF', '2-1-1', 'PR.AA-01', 'equivalent', 0.85),
('NCA-ECC', 'NIST-CSF', '2-2-1', 'PR.DS-01', 'equivalent', 0.80),
('NCA-ECC', 'NIST-CSF', '3-1-1', 'PR.PS-01', 'equivalent', 0.85),
('NCA-ECC', 'NIST-CSF', '4-1-1', 'DE.CM-01', 'equivalent', 0.90),
('NCA-ECC', 'NIST-CSF', '5-1-1', 'RS.MA-01', 'equivalent', 0.85),
-- ISO 27001 → NIST CSF core mappings
('ISO-27001', 'NIST-CSF', 'A.5.1', 'GV.PO-01', 'equivalent', 0.90),
('ISO-27001', 'NIST-CSF', 'A.5.2', 'GV.RR-01', 'equivalent', 0.85),
('ISO-27001', 'NIST-CSF', 'A.8.1', 'PR.DS-01', 'equivalent', 0.85),
('ISO-27001', 'NIST-CSF', 'A.5.25', 'RS.MA-01', 'equivalent', 0.90),
('ISO-27001', 'NIST-CSF', 'A.5.35', 'RC.RP-01', 'equivalent', 0.85)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 5. FIRST-RUN OPERATIONAL EVENTS
-- ═══════════════════════════════════════════════════════════════
-- Add details column if missing (old schema uses before_state/after_state)
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS trail_id UUID;

INSERT INTO audit_trail (user_id, action, entity_type, entity_id, module, details)
SELECT 'system', 'workspace_created', 'workspace', 'initial', 'governance', '{"message": "Workspace initialized successfully"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM audit_trail WHERE action = 'workspace_created' AND entity_id = 'initial');

-- ═══════════════════════════════════════════════════════════════
-- 6. NOTIFICATION PREFERENCES TABLE (ensure exists)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id VARCHAR(255) PRIMARY KEY,
  preferences JSONB DEFAULT '{
    "deadline_reminder": {"in_app": true, "email": true},
    "approval_request": {"in_app": true, "email": true},
    "comment_mention": {"in_app": true, "email": false},
    "assignment": {"in_app": true, "email": true},
    "critical_alert": {"in_app": true, "email": true},
    "activity_update": {"in_app": true, "email": false}
  }'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
