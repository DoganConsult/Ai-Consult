-- ============================================================
-- Migration 175: Cross-Module Workflow Chains + Cross-Module SoD
-- Declarative chain definitions, chain instance tracking,
-- and cross-module segregation of duties rules.
-- ============================================================

-- ═══════════════════════════════════════════════════
-- 1. WORKFLOW CHAIN DEFINITIONS
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS workflow_chain_definitions (
  chain_code TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  sod_rules JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CHAIN INSTANCES (runtime tracking)

CREATE TABLE IF NOT EXISTS workflow_chain_instances (
  instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_code TEXT NOT NULL REFERENCES workflow_chain_definitions(chain_code) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  current_step INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled','failed')),
  context JSONB NOT NULL DEFAULT '{}',
  trigger_entity_type TEXT,
  trigger_entity_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_wci_tenant ON workflow_chain_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wci_status ON workflow_chain_instances(status);
CREATE INDEX IF NOT EXISTS idx_wci_chain ON workflow_chain_instances(chain_code);

-- 3. CHAIN STEP LOG (per-step tracking)

CREATE TABLE IF NOT EXISTS workflow_chain_step_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES workflow_chain_instances(instance_id) ON DELETE CASCADE,
  step_no INT NOT NULL,
  module_code TEXT NOT NULL,
  task_type TEXT,
  task_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','failed','skipped')),
  actor_user_id VARCHAR(64),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_wcsl_instance ON workflow_chain_step_log(instance_id);
CREATE INDEX IF NOT EXISTS idx_wcsl_task ON workflow_chain_step_log(task_id);

-- ═══════════════════════════════════════════════════
-- 4. CROSS-MODULE SoD EXTENSIONS
-- ═══════════════════════════════════════════════════

-- Add cross-module columns to existing sod_rules table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'sod_rules' AND column_name = 'cross_module'
  ) THEN
    ALTER TABLE sod_rules ADD COLUMN cross_module BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'sod_rules' AND column_name = 'module_code_b'
  ) THEN
    ALTER TABLE sod_rules ADD COLUMN module_code_b TEXT;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════
-- 5. SEED: Cross-Module SoD Rules
-- ═══════════════════════════════════════════════════

INSERT INTO sod_rules (role_code_a, role_code_b, module_code, module_code_b, conflict_level, scope_rule, cross_module, description, is_active) VALUES
('auditor', 'evidence_owner', 'audit', 'evidence', 'block', 'same_scope', TRUE,
 'Auditor cannot own evidence for the scope they audit', TRUE),
('risk_owner', 'evidence_owner', 'risk', 'evidence', 'warn', 'same_scope', TRUE,
 'Risk identifier should not provide mitigation evidence', TRUE),
('vendor_assessor', 'risk_approver', 'vendor', 'risk', 'warn', 'tenant_wide', TRUE,
 'Vendor risk assessor should not approve resulting risks', TRUE),
('policy_author', 'exception_approver', 'policy', 'exception', 'warn', 'same_scope', TRUE,
 'Policy author should not approve exceptions to own policy', TRUE),
('tenant_admin', 'external_auditor', NULL, NULL, 'block', 'tenant_wide', FALSE,
 'Tenant admin cannot also be external auditor', TRUE)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════
-- 6. SEED: 5 Primary Cross-Module Chain Definitions
-- ═══════════════════════════════════════════════════

INSERT INTO workflow_chain_definitions (chain_code, name_en, name_ar, steps, sod_rules) VALUES

-- Chain 1: Risk → Control → Evidence → Compliance Score
('risk_to_compliance_score',
 'Risk to Compliance Score Chain',
 'سلسلة المخاطر إلى درجة الامتثال',
 '[
   {"stepNo":1,"moduleCode":"risk","eventTrigger":"risk.treatment_updated","taskType":"risk_assessment","roleCode":"risk_owner","slaHours":48,"nextEvent":"control.linked"},
   {"stepNo":2,"moduleCode":"compliance","eventTrigger":"control.linked","taskType":"control_review","roleCode":"control_owner","slaHours":72,"nextEvent":"evidence.requested"},
   {"stepNo":3,"moduleCode":"evidence","eventTrigger":"evidence.requested","taskType":"evidence_request","roleCode":"evidence_owner","slaHours":120,"nextEvent":"evidence.collected"},
   {"stepNo":4,"moduleCode":"compliance","eventTrigger":"evidence.collected","taskType":"verification","roleCode":"compliance_analyst","slaHours":48,"nextEvent":"compliance.posture_changed"}
 ]'::JSONB,
 '[{"roleA":"risk_owner","moduleA":"risk","roleB":"evidence_owner","moduleB":"evidence","level":"warn"}]'::JSONB),

-- Chain 2: Incident → Investigation → Governance → Remediation → Action Items
('incident_to_remediation',
 'Incident to Remediation Chain',
 'سلسلة الحوادث إلى المعالجة',
 '[
   {"stepNo":1,"moduleCode":"incident","eventTrigger":"incident.escalated","taskType":"incident_response","roleCode":"incident_owner","slaHours":4,"nextEvent":"governance.review_required","condition":{"field":"severity","op":"gte","value":"high"}},
   {"stepNo":2,"moduleCode":"governance","eventTrigger":"governance.review_required","taskType":"approval","roleCode":"governance_manager","slaHours":48,"nextEvent":"approval.completed"},
   {"stepNo":3,"moduleCode":"remediation","eventTrigger":"approval.completed","taskType":"remediation","roleCode":"remediation_owner","slaHours":120,"nextEvent":"remediation.completed"},
   {"stepNo":4,"moduleCode":"action","eventTrigger":"remediation.completed","taskType":"verification","roleCode":"action_owner","slaHours":72,"nextEvent":"incident.resolved"}
 ]'::JSONB,
 '[]'::JSONB),

-- Chain 3: Audit → Findings → CAPA → Evidence → Control Updates
('audit_to_control_update',
 'Audit to Control Update Chain',
 'سلسلة التدقيق إلى تحديث الضوابط',
 '[
   {"stepNo":1,"moduleCode":"audit","eventTrigger":"audit.finding.issued","taskType":"audit_response","roleCode":"auditee_owner","slaHours":72,"nextEvent":"capa.planned"},
   {"stepNo":2,"moduleCode":"remediation","eventTrigger":"capa.planned","taskType":"remediation","roleCode":"remediation_owner","slaHours":120,"nextEvent":"evidence.requested"},
   {"stepNo":3,"moduleCode":"evidence","eventTrigger":"evidence.requested","taskType":"evidence_request","roleCode":"evidence_owner","slaHours":96,"nextEvent":"evidence.collected"},
   {"stepNo":4,"moduleCode":"audit","eventTrigger":"evidence.collected","taskType":"verification","roleCode":"auditor","slaHours":48,"nextEvent":"control.effectiveness_updated"}
 ]'::JSONB,
 '[{"roleA":"auditor","moduleA":"audit","roleB":"evidence_owner","moduleB":"evidence","level":"block"}]'::JSONB),

-- Chain 4: Policy → Attestation → Exception → Compliance Impact
('policy_to_compliance_impact',
 'Policy to Compliance Impact Chain',
 'سلسلة السياسات إلى أثر الامتثال',
 '[
   {"stepNo":1,"moduleCode":"policy","eventTrigger":"policy.published","taskType":"verification","roleCode":"document_controller","slaHours":24,"nextEvent":"attestation.required"},
   {"stepNo":2,"moduleCode":"compliance","eventTrigger":"attestation.required","taskType":"verification","roleCode":"compliance_analyst","slaHours":168,"nextEvent":"attestation.completed_or_exception"},
   {"stepNo":3,"moduleCode":"exception","eventTrigger":"exception.request.created","taskType":"approval","roleCode":"exception_approver","slaHours":72,"nextEvent":"exception.decided"},
   {"stepNo":4,"moduleCode":"compliance","eventTrigger":"compliance.recalculate","taskType":"verification","roleCode":"compliance_manager","slaHours":48,"nextEvent":"compliance.posture_changed"}
 ]'::JSONB,
 '[{"roleA":"policy_author","moduleA":"policy","roleB":"exception_approver","moduleB":"exception","level":"warn"}]'::JSONB),

-- Chain 5: Vendor → Assessment → Risk → BCP Impact
('vendor_to_bcp_impact',
 'Vendor to BCP Impact Chain',
 'سلسلة الموردين إلى أثر استمرارية الأعمال',
 '[
   {"stepNo":1,"moduleCode":"vendor","eventTrigger":"vendor.dd_completed","taskType":"risk_assessment","roleCode":"vendor_assessor","slaHours":72,"nextEvent":"vendor.risk_identified","condition":{"field":"risk_rating","op":"gte","value":"high"}},
   {"stepNo":2,"moduleCode":"risk","eventTrigger":"vendor.risk_identified","taskType":"risk_assessment","roleCode":"risk_owner","slaHours":48,"nextEvent":"risk.created"},
   {"stepNo":3,"moduleCode":"bcp","eventTrigger":"bcp.dependency_critical","taskType":"verification","roleCode":"bcp_coordinator","slaHours":96,"nextEvent":"bcp.impact_assessed","condition":{"field":"vendor_criticality","op":"eq","value":"critical"}}
 ]'::JSONB,
 '[{"roleA":"vendor_assessor","moduleA":"vendor","roleB":"risk_approver","moduleB":"risk","level":"warn"}]'::JSONB)

ON CONFLICT (chain_code) DO NOTHING;

-- ═══════════════════════════════════════════════════
-- 7. EXPAND cross_module_links CHECK CONSTRAINT
-- ═══════════════════════════════════════════════════

-- Drop the old restrictive CHECK if it exists
DO $$
BEGIN
  -- Try to drop constraint by common naming patterns
  BEGIN
    ALTER TABLE cross_module_links DROP CONSTRAINT IF EXISTS cross_module_links_source_module_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE cross_module_links DROP CONSTRAINT IF EXISTS chk_source_module;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE cross_module_links DROP CONSTRAINT IF EXISTS chk_target_module;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE cross_module_links DROP CONSTRAINT IF EXISTS cross_module_links_target_module_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Add chain tracking columns to cross_module_links if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'cross_module_links' AND column_name = 'chain_instance_id'
  ) THEN
    ALTER TABLE cross_module_links ADD COLUMN chain_instance_id UUID;
    ALTER TABLE cross_module_links ADD COLUMN chain_step INT;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════
-- 8. VALIDATION
-- ═══════════════════════════════════════════════════

DO $$
DECLARE
  chain_count INT;
  sod_cross_count INT;
  sod_total INT;
BEGIN
  SELECT COUNT(*) INTO chain_count FROM workflow_chain_definitions;
  SELECT COUNT(*) INTO sod_cross_count FROM sod_rules WHERE cross_module = TRUE;
  SELECT COUNT(*) INTO sod_total FROM sod_rules;

  RAISE NOTICE 'Migration 175: Cross-Module Workflow Chains + Cross-Module SoD';
  RAISE NOTICE '- Workflow chain definitions: %', chain_count;
  RAISE NOTICE '- Cross-module SoD rules: %', sod_cross_count;
  RAISE NOTICE '- Total SoD rules: %', sod_total;
END $$;
