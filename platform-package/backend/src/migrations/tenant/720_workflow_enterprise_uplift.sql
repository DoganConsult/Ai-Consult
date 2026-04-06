-- Migration 720: Workflow Enterprise Uplift
-- Seeds forbidden boundaries, mandatory review points, step autonomy scopes,
-- and recommendation catalog entries across all 16 operational modules.

-- Add module_code and description columns to workflow_ai_budget if not present
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'workflow_ai_budget' AND column_name = 'module_code') THEN
    ALTER TABLE workflow_ai_budget ADD COLUMN module_code VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'workflow_ai_budget' AND column_name = 'description') THEN
    ALTER TABLE workflow_ai_budget ADD COLUMN description TEXT;
  END IF;
END $$;

-- ═══ Forbidden Boundaries (28 entries across 16 modules) ═══
INSERT INTO workflow_forbidden_boundaries (module_code, forbidden_action, reason, severity, is_active) VALUES
  ('risk', 'ai_auto_accept_risk', 'Risk acceptance requires human judgment and accountability', 'block', true),
  ('risk', 'ai_modify_risk_appetite', 'Risk appetite is a strategic decision requiring board approval', 'block', true),
  ('compliance', 'ai_auto_certify', 'Regulatory certification requires authorized human signoff', 'block', true),
  ('compliance', 'ai_auto_waive_control', 'Control waivers require documented human approval', 'block', true),
  ('policy', 'ai_auto_approve_policy', 'Policy approval requires governance committee review', 'block', true),
  ('policy', 'ai_modify_policy_scope', 'Policy scope changes require stakeholder approval', 'warn', true),
  ('evidence', 'ai_auto_certify_evidence', 'Evidence certification requires qualified reviewer', 'warn', true),
  ('evidence', 'ai_delete_evidence', 'Evidence deletion must be human-authorized for audit trail', 'block', true),
  ('audit', 'ai_close_audit_finding', 'Audit finding closure requires auditor validation', 'block', true),
  ('audit', 'ai_modify_audit_scope', 'Audit scope changes require audit committee approval', 'block', true),
  ('incident', 'ai_auto_close_incident', 'Incident closure requires human verification', 'block', true),
  ('incident', 'ai_external_notify', 'External notification requires human authorization', 'block', true),
  ('exception', 'ai_auto_grant_exception', 'Exception grants require authorized human approval', 'block', true),
  ('exception', 'ai_extend_exception', 'Exception extension requires governance review', 'warn', true),
  ('governance', 'ai_modify_charter', 'Charter modifications require board approval', 'block', true),
  ('governance', 'ai_appoint_committee', 'Committee appointments require governance process', 'block', true),
  ('vendor', 'ai_auto_approve_vendor', 'Vendor approval requires due diligence review', 'block', true),
  ('vendor', 'ai_modify_contract', 'Contract modifications require legal review', 'warn', true),
  ('bcp', 'ai_auto_declare_disaster', 'Disaster declaration requires authorized human decision', 'block', true),
  ('bcp', 'ai_modify_bcp_plan', 'BCP plan changes require stakeholder approval', 'warn', true),
  ('asset', 'ai_auto_decommission', 'Asset decommissioning requires owner approval', 'block', true),
  ('asset', 'ai_reclassify_critical', 'Critical asset reclassification requires management approval', 'warn', true),
  ('remediation', 'ai_auto_close_remediation', 'Remediation closure requires verification evidence', 'warn', true),
  ('action', 'ai_auto_close_action', 'Action item closure requires assignee confirmation', 'warn', true),
  ('training', 'ai_auto_certify_completion', 'Training certification requires assessment validation', 'warn', true),
  ('training', 'ai_modify_curriculum', 'Curriculum changes require training lead approval', 'warn', true),
  ('qiyas', 'ai_modify_maturity_score', 'Maturity score overrides require assessor justification', 'warn', true),
  ('ai-governance', 'ai_auto_approve_ai_system', 'AI system approval requires ethics committee review', 'block', true)
ON CONFLICT DO NOTHING;

-- ═══ Mandatory Review Points (31 entries) ═══
INSERT INTO workflow_mandatory_review (step_type, requires_human_review, min_confidence_to_skip, reason, is_active) VALUES
  ('risk_assessment', true, 1.00, 'Risk assessments always require human review', true),
  ('risk_treatment', true, 0.95, 'Treatment plans require risk owner approval', true),
  ('compliance_test', true, 0.90, 'Compliance test results require auditor review', true),
  ('compliance_gap', true, 0.90, 'Gap analysis requires compliance officer review', true),
  ('policy_draft', true, 0.85, 'Policy drafts require governance review', true),
  ('policy_approve', true, 1.00, 'Policy approvals always require human authorization', true),
  ('evidence_collect', true, 0.80, 'Evidence collection requires validation', true),
  ('evidence_review', true, 0.90, 'Evidence review requires qualified reviewer', true),
  ('audit_plan', true, 0.95, 'Audit plans require audit lead approval', true),
  ('audit_finding', true, 0.90, 'Audit findings require auditor confirmation', true),
  ('incident_triage', true, 0.85, 'Incident triage requires human classification', true),
  ('incident_contain', true, 0.90, 'Containment actions require incident commander approval', true),
  ('incident_close', true, 1.00, 'Incident closure always requires human verification', true),
  ('exception_request', true, 0.90, 'Exception requests require governance review', true),
  ('exception_approve', true, 1.00, 'Exception approvals always require human authorization', true),
  ('governance_review', true, 1.00, 'Governance reviews always require committee participation', true),
  ('governance_approve', true, 1.00, 'Governance approvals always require human authorization', true),
  ('vendor_assess', true, 0.85, 'Vendor assessments require procurement review', true),
  ('vendor_approve', true, 1.00, 'Vendor approvals always require human authorization', true),
  ('bcp_plan', true, 0.90, 'BCP plans require stakeholder review', true),
  ('bcp_test', true, 0.85, 'BCP test results require coordinator review', true),
  ('asset_classify', true, 0.85, 'Asset classification requires owner validation', true),
  ('remediation_plan', true, 0.85, 'Remediation plans require lead approval', true),
  ('remediation_verify', true, 0.90, 'Remediation verification requires evidence review', true),
  ('action_create', true, 0.80, 'Action items require assignee acknowledgment', true),
  ('action_complete', true, 0.90, 'Action completion requires verifier review', true),
  ('training_design', true, 0.85, 'Training design requires curriculum review', true),
  ('training_deploy', true, 0.80, 'Training deployment requires readiness check', true),
  ('qiyas_assess', true, 0.90, 'Maturity assessments require assessor validation', true),
  ('ai_gov_assess', true, 0.90, 'AI governance assessments require ethics review', true),
  ('ai_gov_approve', true, 1.00, 'AI system approvals always require committee authorization', true)
ON CONFLICT DO NOTHING;

-- ═══ Step Autonomy Scopes (32 entries) ═══
INSERT INTO workflow_step_autonomy (step_type, allowed_ai_actions, max_autonomy_level, mandatory_human_review, max_confidence_required, is_active) VALUES
  ('risk_assessment', ARRAY['analyze','score','recommend'], 2, true, 0.90, true),
  ('risk_treatment', ARRAY['recommend','draft'], 2, true, 0.90, true),
  ('compliance_test', ARRAY['analyze','collect','score'], 3, true, 0.85, true),
  ('compliance_gap', ARRAY['analyze','recommend'], 2, true, 0.90, true),
  ('policy_draft', ARRAY['draft','suggest','format'], 3, false, 0.85, true),
  ('policy_approve', ARRAY['notify'], 1, true, 1.00, true),
  ('evidence_collect', ARRAY['collect','classify','validate'], 4, false, 0.80, true),
  ('evidence_review', ARRAY['analyze','summarize'], 3, true, 0.85, true),
  ('audit_plan', ARRAY['draft','schedule','recommend'], 2, true, 0.90, true),
  ('audit_finding', ARRAY['analyze','classify','recommend'], 3, true, 0.85, true),
  ('incident_triage', ARRAY['classify','prioritize','recommend'], 3, false, 0.85, true),
  ('incident_contain', ARRAY['recommend','draft','notify'], 2, true, 0.90, true),
  ('incident_close', ARRAY['summarize','report'], 1, true, 1.00, true),
  ('exception_request', ARRAY['draft','analyze'], 2, true, 0.90, true),
  ('exception_approve', ARRAY['notify'], 1, true, 1.00, true),
  ('governance_review', ARRAY['summarize','analyze'], 1, true, 1.00, true),
  ('governance_approve', ARRAY['notify'], 1, true, 1.00, true),
  ('vendor_assess', ARRAY['score','analyze','recommend'], 3, true, 0.85, true),
  ('vendor_approve', ARRAY['notify'], 1, true, 1.00, true),
  ('bcp_plan', ARRAY['draft','recommend','schedule'], 2, true, 0.90, true),
  ('bcp_test', ARRAY['execute','collect','report'], 3, true, 0.85, true),
  ('asset_classify', ARRAY['classify','score','recommend'], 3, false, 0.85, true),
  ('remediation_plan', ARRAY['draft','recommend','schedule'], 3, false, 0.85, true),
  ('remediation_verify', ARRAY['validate','collect','report'], 3, true, 0.90, true),
  ('action_create', ARRAY['draft','assign','schedule'], 4, false, 0.80, true),
  ('action_complete', ARRAY['validate','report'], 2, true, 0.90, true),
  ('training_design', ARRAY['draft','recommend','format'], 3, false, 0.85, true),
  ('training_deploy', ARRAY['assign','schedule','notify'], 4, false, 0.80, true),
  ('training_assess', ARRAY['score','analyze','report'], 3, false, 0.85, true),
  ('qiyas_assess', ARRAY['score','analyze','recommend'], 2, true, 0.90, true),
  ('ai_gov_assess', ARRAY['analyze','score','recommend'], 2, true, 0.90, true),
  ('ai_gov_approve', ARRAY['notify'], 1, true, 1.00, true)
ON CONFLICT DO NOTHING;

-- ═══ Recommendation Catalog (32 entries with Arabic translations) ═══
INSERT INTO workflow_recommendation_catalog (recommendation_type, display_name_en, display_name_ar, category, applicable_step_types, requires_human_review, max_confidence_for_auto, is_active) VALUES
  ('risk_score_suggestion', 'Risk Score Suggestion', 'اقتراح درجة المخاطر', 'risk', ARRAY['risk_assessment'], true, 0.90, true),
  ('risk_treatment_option', 'Risk Treatment Option', 'خيار معالجة المخاطر', 'risk', ARRAY['risk_treatment'], true, 0.85, true),
  ('compliance_gap_fix', 'Compliance Gap Fix', 'إصلاح فجوة الامتثال', 'compliance', ARRAY['compliance_gap','compliance_test'], true, 0.85, true),
  ('compliance_control_map', 'Compliance Control Mapping', 'ربط ضوابط الامتثال', 'compliance', ARRAY['compliance_test'], false, 0.80, true),
  ('policy_section_draft', 'Policy Section Draft', 'مسودة قسم السياسة', 'general', ARRAY['policy_draft'], false, 0.85, true),
  ('policy_review_checklist', 'Policy Review Checklist', 'قائمة مراجعة السياسة', 'general', ARRAY['policy_draft','policy_approve'], true, 0.90, true),
  ('evidence_source_suggest', 'Evidence Source Suggestion', 'اقتراح مصدر الأدلة', 'evidence', ARRAY['evidence_collect'], false, 0.80, true),
  ('evidence_quality_check', 'Evidence Quality Check', 'فحص جودة الأدلة', 'evidence', ARRAY['evidence_review','evidence_collect'], true, 0.85, true),
  ('audit_scope_recommend', 'Audit Scope Recommendation', 'توصية نطاق التدقيق', 'general', ARRAY['audit_plan'], true, 0.90, true),
  ('audit_finding_classify', 'Audit Finding Classification', 'تصنيف نتائج التدقيق', 'general', ARRAY['audit_finding'], true, 0.85, true),
  ('incident_priority_suggest', 'Incident Priority Suggestion', 'اقتراح أولوية الحادث', 'general', ARRAY['incident_triage'], false, 0.85, true),
  ('incident_response_plan', 'Incident Response Plan', 'خطة الاستجابة للحادث', 'general', ARRAY['incident_contain','incident_triage'], true, 0.85, true),
  ('exception_risk_impact', 'Exception Risk Impact', 'تأثير مخاطر الاستثناء', 'risk', ARRAY['exception_request'], true, 0.90, true),
  ('exception_compensating', 'Compensating Control Suggestion', 'اقتراح ضابط تعويضي', 'general', ARRAY['exception_request','exception_approve'], true, 0.85, true),
  ('governance_agenda_item', 'Governance Agenda Item', 'بند جدول أعمال الحوكمة', 'general', ARRAY['governance_review'], true, 0.90, true),
  ('governance_decision_brief', 'Governance Decision Brief', 'ملخص قرار الحوكمة', 'general', ARRAY['governance_review','governance_approve'], true, 0.95, true),
  ('vendor_score_recommend', 'Vendor Score Recommendation', 'توصية درجة المورد', 'general', ARRAY['vendor_assess'], true, 0.85, true),
  ('vendor_due_diligence', 'Vendor Due Diligence Check', 'فحص العناية الواجبة للمورد', 'general', ARRAY['vendor_assess','vendor_approve'], true, 0.90, true),
  ('bcp_scenario_suggest', 'BCP Scenario Suggestion', 'اقتراح سيناريو استمرارية الأعمال', 'general', ARRAY['bcp_plan','bcp_test'], false, 0.85, true),
  ('bcp_gap_analysis', 'BCP Gap Analysis', 'تحليل فجوات استمرارية الأعمال', 'general', ARRAY['bcp_test'], true, 0.85, true),
  ('asset_classification', 'Asset Classification Suggestion', 'اقتراح تصنيف الأصول', 'general', ARRAY['asset_classify'], false, 0.85, true),
  ('asset_risk_link', 'Asset Risk Linkage', 'ربط مخاطر الأصول', 'risk', ARRAY['asset_classify'], true, 0.85, true),
  ('remediation_plan_draft', 'Remediation Plan Draft', 'مسودة خطة المعالجة', 'remediation', ARRAY['remediation_plan'], false, 0.85, true),
  ('remediation_progress', 'Remediation Progress Check', 'فحص تقدم المعالجة', 'remediation', ARRAY['remediation_verify'], true, 0.85, true),
  ('action_assignment', 'Action Item Assignment', 'تعيين بند الإجراء', 'general', ARRAY['action_create'], false, 0.80, true),
  ('action_priority_suggest', 'Action Priority Suggestion', 'اقتراح أولوية الإجراء', 'general', ARRAY['action_create','action_complete'], false, 0.85, true),
  ('training_content_suggest', 'Training Content Suggestion', 'اقتراح محتوى التدريب', 'general', ARRAY['training_design'], false, 0.80, true),
  ('training_audience_target', 'Training Audience Targeting', 'استهداف جمهور التدريب', 'general', ARRAY['training_design','training_deploy'], false, 0.85, true),
  ('training_effectiveness', 'Training Effectiveness Check', 'فحص فعالية التدريب', 'general', ARRAY['training_assess'], true, 0.85, true),
  ('qiyas_maturity_benchmark', 'Maturity Benchmark', 'معيار النضج', 'general', ARRAY['qiyas_assess'], true, 0.90, true),
  ('ai_gov_risk_assess', 'AI Risk Assessment', 'تقييم مخاطر الذكاء الاصطناعي', 'risk', ARRAY['ai_gov_assess'], true, 0.90, true),
  ('ai_gov_ethics_review', 'AI Ethics Review', 'مراجعة أخلاقيات الذكاء الاصطناعي', 'general', ARRAY['ai_gov_assess','ai_gov_approve'], true, 0.95, true)
ON CONFLICT DO NOTHING;
