-- ============================================
-- Migration 500: AI-First API Configuration
-- DB-driven API behavior, AI enhancement config,
-- dynamic gate registry, and detector registry
-- ============================================

-- 1. API AI Enhancement Configuration
CREATE TABLE IF NOT EXISTS api_ai_config (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  endpoint_pattern VARCHAR(500) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  prompt_template TEXT NOT NULL,
  max_tokens INTEGER DEFAULT 1024,
  include_context TEXT[] DEFAULT ARRAY['*'],
  enhancement_type VARCHAR(50) DEFAULT 'analysis'
    CHECK (enhancement_type IN ('analysis','recommendations','risk_score','summary','classification','prediction','anomaly_detection')),
  priority INTEGER DEFAULT 100,
  rate_limit_per_min INTEGER DEFAULT 10,
  cache_ttl_seconds INTEGER DEFAULT 300,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_ai_config_tenant ON api_ai_config(tenant_id, enabled);
CREATE INDEX IF NOT EXISTS idx_api_ai_config_pattern ON api_ai_config(endpoint_pattern);

-- 2. Dynamic Endpoint Configuration
CREATE TABLE IF NOT EXISTS endpoint_config (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  endpoint_pattern VARCHAR(500) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  default_page_size INTEGER DEFAULT 25,
  max_page_size INTEGER DEFAULT 500,
  default_sort_field VARCHAR(100) DEFAULT 'created_at',
  default_sort_order VARCHAR(4) DEFAULT 'desc' CHECK (default_sort_order IN ('asc','desc')),
  hidden_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
  required_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
  searchable_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
  filterable_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
  ai_summary_enabled BOOLEAN DEFAULT false,
  custom_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_endpoint_config_tenant ON endpoint_config(tenant_id, enabled);

-- 3. Dynamic Gate Registry (replaces hardcoded gate endpoints)
CREATE TABLE IF NOT EXISTS gate_definitions (
  gate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  gate_code VARCHAR(100) NOT NULL,
  gate_type VARCHAR(50) NOT NULL CHECK (gate_type IN ('release','vendor','incident','bcp','training','vendor_onboarding','policy','audit','custom')),
  display_name_en VARCHAR(200) NOT NULL,
  display_name_ar VARCHAR(200),
  description_en TEXT,
  enabled BOOLEAN DEFAULT true,
  validation_rules JSONB NOT NULL DEFAULT '[]',
  ai_analysis_enabled BOOLEAN DEFAULT true,
  ai_prompt_template TEXT,
  required_permission VARCHAR(100) DEFAULT 'gate:read',
  severity_on_block VARCHAR(20) DEFAULT 'high' CHECK (severity_on_block IN ('low','medium','high','critical')),
  override_allowed BOOLEAN DEFAULT true,
  override_requires_approval BOOLEAN DEFAULT true,
  override_approver_permission VARCHAR(100) DEFAULT 'tenant:manage',
  auto_notify_on_block BOOLEAN DEFAULT true,
  notification_channels TEXT[] DEFAULT ARRAY['in_app'],
  sla_hours INTEGER DEFAULT 24,
  custom_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, gate_code)
);
CREATE INDEX IF NOT EXISTS idx_gate_definitions_tenant ON gate_definitions(tenant_id, enabled);
CREATE INDEX IF NOT EXISTS idx_gate_definitions_type ON gate_definitions(gate_type);

-- 4. Gate Validation Rules (linked to gate_definitions)
CREATE TABLE IF NOT EXISTS gate_validation_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id UUID NOT NULL REFERENCES gate_definitions(gate_id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  rule_name VARCHAR(200) NOT NULL,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('sql_check','threshold','entity_status','field_required','custom_function','ai_assessment')),
  rule_config JSONB NOT NULL,
  error_message_en TEXT,
  error_message_ar TEXT,
  severity VARCHAR(20) DEFAULT 'blocker' CHECK (severity IN ('info','warning','blocker')),
  execution_order INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gate_validation_rules_gate ON gate_validation_rules(gate_id, enabled);

-- 5. Signal Detector Registry (replaces hardcoded detector list)
CREATE TABLE IF NOT EXISTS signal_detector_registry (
  detector_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  detector_code VARCHAR(100) NOT NULL,
  display_name_en VARCHAR(200) NOT NULL,
  display_name_ar VARCHAR(200),
  description_en TEXT,
  module_code VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  detection_query TEXT NOT NULL,
  signal_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  confidence_base NUMERIC(3,2) DEFAULT 0.70,
  ai_confidence_tuning_enabled BOOLEAN DEFAULT true,
  ai_tuning_prompt TEXT,
  dedup_window_hours INTEGER DEFAULT 24,
  cooldown_minutes INTEGER DEFAULT 60,
  board_attention_threshold NUMERIC(3,2) DEFAULT 0.85,
  recommended_action_type VARCHAR(50),
  recommended_escalation_level INTEGER DEFAULT 0,
  custom_config JSONB DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  last_run_signals INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, detector_code)
);
CREATE INDEX IF NOT EXISTS idx_signal_detector_tenant ON signal_detector_registry(tenant_id, enabled);
CREATE INDEX IF NOT EXISTS idx_signal_detector_module ON signal_detector_registry(module_code);

-- 6. AI Analysis Cache (prevents redundant AI calls)
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  cache_key VARCHAR(500) NOT NULL,
  analysis_type VARCHAR(50) NOT NULL,
  result_json JSONB NOT NULL,
  model_used VARCHAR(100),
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup ON ai_analysis_cache(tenant_id, cache_key, analysis_type) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_ai_cache_expiry ON ai_analysis_cache(expires_at);

-- 7. Seed default gate definitions
INSERT INTO gate_definitions (tenant_id, gate_code, gate_type, display_name_en, display_name_ar, description_en, validation_rules, ai_prompt_template, required_permission)
SELECT '00000000-0000-0000-0000-000000000000', code, gtype, name_en, name_ar, desc_en, rules::jsonb, ai_prompt, perm
FROM (VALUES
  ('release_gate', 'release', 'Release Gate', 'بوابة الإصدار', 'Validates controls are effective before allowing deployment', '[{"type":"entity_status","config":{"table":"ucf_controls","status_field":"lifecycle_state","required_status":"effective"}}]', 'Analyze the release gate validation result. Assess deployment risk considering control states and recommend whether to proceed.', 'tenant:manage'),
  ('vendor_gate', 'vendor', 'Vendor Gate', 'بوابة المورد', 'Validates vendor risk score and engagement before onboarding', '[{"type":"threshold","config":{"field":"risk_score","operator":"<=","value":70}},{"type":"threshold","config":{"field":"engagement_score","operator":">=","value":40}}]', 'Analyze the vendor risk profile and engagement metrics. Provide a risk assessment and onboarding recommendation.', 'risk:read'),
  ('incident_closure', 'incident', 'Incident Closure Gate', 'بوابة إغلاق الحادث', 'Validates incident resolution completeness before closure', '[{"type":"field_required","config":{"fields":["root_cause","resolution_note","corrective_actions"]}},{"type":"entity_status","config":{"table":"incident_tasks","status_field":"status","required_status":"completed"}}]', 'Review incident closure readiness. Assess if root cause analysis is thorough and corrective actions are sufficient.', 'incident:read'),
  ('bcp_activation', 'bcp', 'BCP Activation Gate', 'بوابة تفعيل استمرارية الأعمال', 'Validates BCP plan readiness before activation', '[{"type":"field_required","config":{"fields":["planId"]}},{"type":"entity_status","config":{"table":"bcp_plans","status_field":"status","required_status":"approved"}}]', 'Assess business continuity plan readiness. Evaluate if all critical functions are covered and recovery objectives are realistic.', 'risk:read'),
  ('training_cert', 'training', 'Training Certification Gate', 'بوابة شهادة التدريب', 'Validates training completion before role assignment', '[{"type":"sql_check","config":{"query":"SELECT COUNT(*) FROM training_completions WHERE user_id = $1 AND role_id = $2 AND passed = true","params":["targetUserId","roleId"],"min_count":1}}]', 'Evaluate training certification completeness. Check if the user has sufficient competency for the target role.', 'risk:read'),
  ('vendor_onboarding', 'vendor_onboarding', 'Vendor Onboarding Gate', 'بوابة تأهيل المورد', 'Validates vendor documentation and compliance before onboarding', '[{"type":"field_required","config":{"fields":["vendorId"]}},{"type":"sql_check","config":{"query":"SELECT COUNT(*) FROM vendor_documents WHERE vendor_id = $1 AND status = ''approved''","params":["vendorId"],"min_count":3}}]', 'Assess vendor onboarding readiness. Evaluate documentation completeness and compliance status.', 'risk:read'),
  ('policy_publish', 'policy', 'Policy Publish Gate', 'بوابة نشر السياسة', 'Validates policy review completeness before publishing', '[{"type":"entity_status","config":{"table":"policy_reviews","status_field":"status","required_status":"approved"}},{"type":"threshold","config":{"field":"review_count","operator":">=","value":2}}]', 'Evaluate policy readiness for publication. Check review completeness, stakeholder approvals, and regulatory alignment.', 'policy:write'),
  ('audit_closure', 'audit', 'Audit Closure Gate', 'بوابة إغلاق التدقيق', 'Validates audit finding resolution before closing', '[{"type":"sql_check","config":{"query":"SELECT COUNT(*) FROM audit_findings WHERE audit_id = $1 AND status NOT IN (''resolved'',''accepted'')","params":["auditId"],"max_count":0}}]', 'Assess audit closure readiness. Evaluate if all findings are resolved and management responses are documented.', 'audit:write')
) AS t(code, gtype, name_en, name_ar, desc_en, rules, ai_prompt, perm)
ON CONFLICT (tenant_id, gate_code) DO NOTHING;

-- 8. Seed default signal detectors
INSERT INTO signal_detector_registry (tenant_id, detector_code, display_name_en, module_code, detection_query, signal_type, severity, confidence_base, ai_tuning_prompt)
SELECT '00000000-0000-0000-0000-000000000000', code, name_en, mod, query, sig_type, sev, conf, ai_prompt
FROM (VALUES
  ('failed_control', 'Failed Control Detector', 'compliance', 'SELECT control_id AS source_entity_id, title, owner FROM controls WHERE deleted_at IS NULL AND test_status = ''failed''', 'failed_control', 'high', 0.90, 'Assess the severity of this control failure. Consider the control type, regulatory impact, and historical failure patterns.'),
  ('repeated_control_failure', 'Repeated Control Failure', 'compliance', 'SELECT c.control_id AS source_entity_id, c.title, COUNT(ct.*) AS fail_count FROM controls c JOIN control_tests ct ON ct.control_id = c.control_id WHERE ct.test_result = ''fail'' AND ct.tested_at > NOW() - INTERVAL ''90 days'' GROUP BY c.control_id, c.title HAVING COUNT(*) >= 3', 'repeated_control_failure', 'critical', 0.95, 'Analyze this pattern of repeated control failures. Determine root cause likelihood and recommend systemic remediation.'),
  ('incident_over_sla', 'Incident Over SLA', 'incident', 'SELECT incident_id AS source_entity_id, title, severity, created_at FROM incidents WHERE status NOT IN (''resolved'',''closed'') AND created_at < NOW() - (sla_hours || '' hours'')::interval', 'incident_over_sla', 'high', 0.85, 'Assess SLA breach impact. Consider incident severity, business impact, and escalation needs.'),
  ('overdue_policy_review', 'Overdue Policy Review', 'policy', 'SELECT policy_id AS source_entity_id, title, next_review_date FROM policies WHERE next_review_date < NOW() AND status = ''active''', 'overdue_policy_review', 'medium', 0.80, 'Evaluate overdue policy risk. Consider regulatory changes and compliance impact.'),
  ('stale_evidence', 'Stale Evidence Detector', 'evidence', 'SELECT e.evidence_id AS source_entity_id, e.title, e.last_collected_at FROM evidence e WHERE e.last_collected_at < NOW() - INTERVAL ''90 days'' AND e.status = ''active''', 'stale_evidence', 'medium', 0.75, 'Assess stale evidence risk. Consider evidence criticality and control dependency.'),
  ('owner_overload', 'Owner Overload Detector', 'governance', 'SELECT owner AS source_entity_id, COUNT(*) AS task_count FROM (SELECT owner FROM controls WHERE deleted_at IS NULL UNION ALL SELECT assigned_to FROM process_tasks WHERE status = ''open'') sub GROUP BY owner HAVING COUNT(*) > 20', 'owner_overload', 'medium', 0.70, 'Analyze workload distribution. Recommend task rebalancing strategy.'),
  ('expired_exception', 'Expired Exception Detector', 'compliance', 'SELECT exception_id AS source_entity_id, title, expiry_date FROM exceptions WHERE expiry_date < NOW() AND status = ''active''', 'expired_exception', 'high', 0.85, 'Assess expired exception risk. Determine if controls are exposed without the exception.'),
  ('missed_quorum', 'Missed Quorum Detector', 'governance', 'SELECT committee_id AS source_entity_id, name, last_meeting_date FROM committees WHERE last_meeting_date < NOW() - INTERVAL ''60 days'' AND status = ''active''', 'missed_quorum', 'medium', 0.75, 'Evaluate governance gap from missed committee meetings. Assess decision backlog risk.')
) AS t(code, name_en, mod, query, sig_type, sev, conf, ai_prompt)
ON CONFLICT (tenant_id, detector_code) DO NOTHING;

-- ============================================
-- Human-in-the-loop review queue (EU AI Act Art. 14, SDAIA)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_review_queue (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  endpoint VARCHAR(500),
  module_code VARCHAR(50),
  ai_output JSONB NOT NULL,
  original_data JSONB,
  status VARCHAR(20) DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','rejected','modified')),
  requested_by VARCHAR(200),
  reviewed_by VARCHAR(200),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_review_queue_pending ON ai_review_queue(tenant_id, status) WHERE status = 'pending_review';

-- Add human review columns to api_ai_config
ALTER TABLE api_ai_config ADD COLUMN IF NOT EXISTS requires_human_review BOOLEAN DEFAULT false;
ALTER TABLE api_ai_config ADD COLUMN IF NOT EXISTS confidence_threshold NUMERIC(3,2) DEFAULT 0.70;

-- ============================================
-- AI Data Minimization Config (PDPL Art. 4, EU AI Act Art. 10)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_data_minimization_config (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  module_code VARCHAR(50) NOT NULL,
  agent_id VARCHAR(100),
  allowed_fields TEXT[],
  blocked_fields TEXT[],
  max_records INTEGER DEFAULT 50,
  max_field_length INTEGER DEFAULT 500,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_data_min_config_tenant ON ai_data_minimization_config(tenant_id, enabled);
