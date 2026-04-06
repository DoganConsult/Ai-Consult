-- Seed data for the 3-layer authorization model + decision authorities

-- Access Profiles (Layer 1)
INSERT INTO access_profiles (profile_code, profile_name_en, profile_name_ar, tier, base_permissions, max_delegation_depth, can_impersonate) VALUES
  ('platform_admin', 'Platform Administrator', 'مسؤول المنصة', 'platform_admin', ARRAY['*:*'], 5, true),
  ('tenant_admin', 'Tenant Administrator', 'مسؤول المستأجر', 'tenant_admin', ARRAY['tenant:manage','users:manage','workspace:read','workspace:write'], 3, true),
  ('power_user', 'Power User', 'مستخدم متقدم', 'power_user', ARRAY['workspace:read','workspace:write','report:read','report:write'], 2, false),
  ('standard_user', 'Standard User', 'مستخدم عادي', 'standard_user', ARRAY['workspace:read','report:read'], 1, false),
  ('restricted_viewer', 'Restricted Viewer', 'مشاهد مقيد', 'restricted', ARRAY['workspace:read'], 0, false),
  ('external_stakeholder', 'External Stakeholder', 'أصحاب المصلحة الخارجيون', 'external', ARRAY[], 0, false),
  ('service_account', 'Service Account', 'حساب خدمة', 'service_account', ARRAY[], 0, false)
ON CONFLICT (profile_code) DO NOTHING;

-- Functional Roles (Layer 2)
INSERT INTO functional_roles (role_code, role_name_en, role_name_ar, category, module_scopes, permissions, workflow_assignments, responsibility_matrix) VALUES
  ('grc_compliance_manager', 'GRC Compliance Manager', 'مدير الامتثال', 'grc_core',
   ARRAY['compliance','governance','audit','evidence','reporting','policy'],
   ARRAY['compliance:read','compliance:write','compliance:approve','governance:read','governance:write','audit:read','audit:write','evidence:read','evidence:write','evidence:approve','reporting:read','reporting:write','policy:read','policy:write'],
   '[{"workflowCode":"evidence_collection","canInitiate":true,"canApprove":true,"canReview":true,"approvalLevel":2},{"workflowCode":"assessment","canInitiate":true,"canApprove":true,"canReview":true,"approvalLevel":2},{"workflowCode":"exception_request","canInitiate":true,"canApprove":true,"canReview":true,"approvalLevel":1}]'::jsonb,
   '[{"type":"owner","entityType":"control","scope":"department"},{"type":"approver","entityType":"evidence","scope":"organization"},{"type":"owner","entityType":"policy","scope":"department"}]'::jsonb),

  ('grc_compliance_officer', 'GRC Compliance Officer', 'ضابط الامتثال', 'grc_core',
   ARRAY['compliance','evidence','reporting'],
   ARRAY['compliance:read','compliance:write','evidence:read','evidence:write','reporting:read','reporting:write'],
   '[{"workflowCode":"evidence_collection","canInitiate":true,"canApprove":false,"canReview":true},{"workflowCode":"assessment","canInitiate":true,"canApprove":false,"canReview":true}]'::jsonb,
   '[{"type":"executor","entityType":"control","scope":"team"},{"type":"reviewer","entityType":"evidence","scope":"team"}]'::jsonb),

  ('grc_risk_manager', 'GRC Risk Manager', 'مدير المخاطر', 'grc_core',
   ARRAY['risk','compliance','reporting'],
   ARRAY['risk:read','risk:write','risk:approve','compliance:read','compliance:write','reporting:read','reporting:write'],
   '[{"workflowCode":"risk_assessment","canInitiate":true,"canApprove":true,"canReview":true,"approvalLevel":2},{"workflowCode":"risk_treatment","canInitiate":true,"canApprove":true,"canReview":true,"approvalLevel":1}]'::jsonb,
   '[{"type":"owner","entityType":"risk","scope":"department"},{"type":"approver","entityType":"risk","scope":"department"}]'::jsonb),

  ('grc_auditor', 'GRC Auditor', 'مدقق', 'audit',
   ARRAY['audit','risk','compliance','policy','reporting'],
   ARRAY['audit:read','audit:write','audit:manage','risk:read','compliance:read','policy:read','reporting:read','evidence:read'],
   '[{"workflowCode":"audit_lifecycle","canInitiate":true,"canApprove":true,"canReview":true,"approvalLevel":2}]'::jsonb,
   '[{"type":"owner","entityType":"audit","scope":"organization"},{"type":"reviewer","entityType":"evidence","scope":"organization"}]'::jsonb),

  ('security_manager', 'Security Manager', 'مدير الأمن', 'security',
   ARRAY['risk','compliance','incident','asset'],
   ARRAY['risk:read','risk:write','risk:approve','incident:read','incident:write','incident:approve','asset:read','asset:write','compliance:read','compliance:write'],
   '[{"workflowCode":"incident_response","canInitiate":true,"canApprove":true,"canReview":true,"approvalLevel":1},{"workflowCode":"vulnerability_management","canInitiate":true,"canApprove":true,"canReview":true}]'::jsonb,
   '[{"type":"owner","entityType":"incident","scope":"organization"},{"type":"owner","entityType":"risk","scope":"department"}]'::jsonb),

  ('security_analyst', 'Security Analyst', 'محلل أمني', 'security',
   ARRAY['incident','risk'],
   ARRAY['incident:read','incident:write','risk:read'],
   '[{"workflowCode":"incident_response","canInitiate":true,"canApprove":false,"canReview":true}]'::jsonb,
   '[{"type":"executor","entityType":"incident","scope":"team"}]'::jsonb),

  ('it_manager', 'IT Manager', 'مدير تقنية المعلومات', 'it_ops',
   ARRAY['foundation','compliance','asset','workflow'],
   ARRAY['foundation:read','foundation:write','compliance:read','compliance:write','asset:read','asset:write','workflow:read','workflow:write'],
   '[{"workflowCode":"evidence_collection","canInitiate":true,"canApprove":true,"canReview":true,"approvalLevel":2},{"workflowCode":"change_management","canInitiate":true,"canApprove":true,"canReview":true}]'::jsonb,
   '[{"type":"owner","entityType":"control","scope":"team"},{"type":"owner","entityType":"asset","scope":"department"}]'::jsonb),

  ('it_operator', 'IT Operator', 'مشغل تقنية المعلومات', 'it_ops',
   ARRAY['foundation','compliance'],
   ARRAY['foundation:read','foundation:write','compliance:read'],
   '[{"workflowCode":"evidence_collection","canInitiate":true,"canApprove":false,"canReview":true}]'::jsonb,
   '[{"type":"executor","entityType":"control","scope":"team"}]'::jsonb),

  ('control_owner', 'Control Owner', 'مالك الضابط', 'grc_core',
   ARRAY['compliance','evidence'],
   ARRAY['compliance:read','compliance:write','evidence:read','evidence:write'],
   '[{"workflowCode":"evidence_collection","canInitiate":true,"canApprove":false,"canReview":false}]'::jsonb,
   '[{"type":"owner","entityType":"control","scope":"team"},{"type":"executor","entityType":"evidence","scope":"team"}]'::jsonb),

  ('vendor_manager', 'Vendor Manager', 'مدير الموردين', 'vendor_mgmt',
   ARRAY['vendor','risk','compliance'],
   ARRAY['vendor:read','vendor:write','vendor:approve','risk:read','compliance:read'],
   '[{"workflowCode":"vendor_assessment","canInitiate":true,"canApprove":true,"canReview":true}]'::jsonb,
   '[{"type":"owner","entityType":"vendor","scope":"organization"}]'::jsonb),

  ('privacy_officer', 'Privacy Officer', 'مسؤول الخصوصية', 'data_privacy',
   ARRAY['privacy','compliance','policy'],
   ARRAY['privacy:read','privacy:write','privacy:approve','compliance:read','policy:read','policy:write'],
   '[]'::jsonb,
   '[{"type":"owner","entityType":"privacy","scope":"organization"}]'::jsonb)
ON CONFLICT (role_code) DO NOTHING;

-- Job Titles (Layer 3 — display/persona, NOT authorization)
INSERT INTO job_titles (title_code, title_en, title_ar, persona_type, default_access_profile, default_functional_roles, sort_order) VALUES
  ('ceo', 'Chief Executive Officer', 'الرئيس التنفيذي', 'c_suite', 'power_user', ARRAY[]::text[], 1),
  ('cfo', 'Chief Financial Officer', 'المدير المالي', 'c_suite', 'power_user', ARRAY[]::text[], 2),
  ('cto', 'Chief Technology Officer', 'مدير التقنية', 'c_suite', 'power_user', ARRAY['it_manager'], 3),
  ('ciso', 'Chief Information Security Officer', 'مدير أمن المعلومات', 'c_suite', 'power_user', ARRAY['security_manager','grc_risk_manager'], 4),
  ('cro', 'Chief Risk Officer', 'مدير المخاطر', 'c_suite', 'power_user', ARRAY['grc_risk_manager'], 5),
  ('cco', 'Chief Compliance Officer', 'مدير الامتثال', 'c_suite', 'power_user', ARRAY['grc_compliance_manager'], 6),
  ('vp_it', 'VP of IT', 'نائب رئيس تقنية المعلومات', 'director', 'power_user', ARRAY['it_manager'], 10),
  ('dir_compliance', 'Director of Compliance', 'مدير إدارة الامتثال', 'director', 'power_user', ARRAY['grc_compliance_manager'], 11),
  ('dir_risk', 'Director of Risk', 'مدير إدارة المخاطر', 'director', 'power_user', ARRAY['grc_risk_manager'], 12),
  ('mgr_it', 'IT Manager', 'مدير تقنية المعلومات', 'manager', 'standard_user', ARRAY['it_manager'], 20),
  ('mgr_security', 'Security Manager', 'مدير الأمن', 'manager', 'standard_user', ARRAY['security_manager'], 21),
  ('mgr_compliance', 'Compliance Manager', 'مدير الامتثال', 'manager', 'standard_user', ARRAY['grc_compliance_manager'], 22),
  ('analyst_security', 'Security Analyst', 'محلل أمني', 'analyst', 'standard_user', ARRAY['security_analyst'], 30),
  ('analyst_risk', 'Risk Analyst', 'محلل مخاطر', 'analyst', 'standard_user', ARRAY['grc_risk_manager'], 31),
  ('specialist_compliance', 'Compliance Specialist', 'أخصائي امتثال', 'specialist', 'standard_user', ARRAY['grc_compliance_officer'], 32),
  ('auditor_internal', 'Internal Auditor', 'مدقق داخلي', 'specialist', 'standard_user', ARRAY['grc_auditor'], 33),
  ('coordinator_grc', 'GRC Coordinator', 'منسق الحوكمة', 'coordinator', 'standard_user', ARRAY['control_owner'], 40),
  ('vendor_ext', 'External Vendor', 'مورد خارجي', 'external', 'external_stakeholder', ARRAY[]::text[], 50),
  ('regulator_ext', 'External Regulator', 'جهة رقابية خارجية', 'external', 'external_stakeholder', ARRAY[]::text[], 51),
  ('consultant_ext', 'External Consultant', 'مستشار خارجي', 'external', 'external_stakeholder', ARRAY[]::text[], 52)
ON CONFLICT (title_code) DO NOTHING;

-- Decision Authorities (GAP-14)
INSERT INTO decision_authorities (authority_code, authority_type, resource_type, required_role_codes, min_approval_count, requires_sod_separation, sod_conflict_roles) VALUES
  ('approve_policy', 'approve', 'policy', ARRAY['grc_compliance_manager'], 1, true, ARRAY['grc_auditor']),
  ('publish_policy', 'publish_policy', 'policy', ARRAY['grc_compliance_manager'], 2, true, ARRAY['grc_auditor']),
  ('approve_risk_treatment', 'approve', 'risk_treatment', ARRAY['grc_risk_manager','security_manager'], 1, false, ARRAY[]::text[]),
  ('accept_risk', 'accept_risk', 'risk', ARRAY['grc_risk_manager'], 1, true, ARRAY['grc_auditor']),
  ('close_finding', 'close_finding', 'audit_finding', ARRAY['grc_auditor','grc_compliance_manager'], 1, true, ARRAY['control_owner']),
  ('approve_exception', 'approve', 'exception', ARRAY['grc_compliance_manager','grc_risk_manager'], 2, true, ARRAY[]::text[]),
  ('sign_off_assessment', 'sign_off', 'assessment', ARRAY['grc_compliance_manager','grc_auditor'], 1, false, ARRAY[]::text[]),
  ('override_control_status', 'override', 'control', ARRAY['grc_compliance_manager'], 1, true, ARRAY['control_owner']),
  ('escalate_incident', 'escalate', 'incident', ARRAY['security_manager','security_analyst'], 1, false, ARRAY[]::text[]),
  ('delegate_approval', 'delegate', 'approval', ARRAY['grc_compliance_manager','grc_risk_manager','security_manager'], 1, false, ARRAY[]::text[]),
  ('revoke_access', 'revoke', 'access', ARRAY['grc_compliance_manager','security_manager'], 1, true, ARRAY[]::text[])
ON CONFLICT (authority_code, resource_type) DO NOTHING;

-- SoD Rules
INSERT INTO sod_rules (rule_code, rule_name_en, rule_name_ar, conflicting_role_a, conflicting_role_b, conflict_type, resolution_strategy) VALUES
  ('sod_policy_author_approver', 'Policy Author/Approver Separation', 'فصل مؤلف/معتمد السياسة', 'control_owner', 'grc_compliance_manager', 'hard', 'deny'),
  ('sod_risk_owner_auditor', 'Risk Owner/Auditor Separation', 'فصل مالك المخاطر/المدقق', 'grc_risk_manager', 'grc_auditor', 'soft', 'escalate'),
  ('sod_evidence_collector_reviewer', 'Evidence Collector/Reviewer Separation', 'فصل جامع/مراجع الأدلة', 'control_owner', 'grc_auditor', 'hard', 'deny'),
  ('sod_incident_reporter_closer', 'Incident Reporter/Closer Separation', 'فصل مبلغ/مغلق الحوادث', 'security_analyst', 'security_manager', 'soft', 'log_only')
ON CONFLICT (rule_code) DO NOTHING;
