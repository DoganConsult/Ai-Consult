-- ============================================
-- Tenant Reference Seed Baseline
-- Generated: 2026-03-17T00:26:05.191Z
-- Baseline version: 257
-- DO NOT EDIT MANUALLY — regenerate via generate-baseline.ts
-- ============================================

-- ============================================
-- SECTION A: Platform Core Defaults
-- Reusable across any product on this platform
-- ============================================

--

--

\restrict SdDAtdhTSob727cUAbNtBkGAeSfd6ag9gP3Gl0Hz3eoelEg46g4N5UsydTOGZz9

--
-- Data for Name: _retired_dashboard_overrides_v1; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE __TENANT_SCHEMA__._retired_dashboard_overrides_v1 DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__._retired_dashboard_overrides_v1 (override_id, dashboard_code, role_code, field, value, is_active, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__._retired_dashboard_overrides_v1 ENABLE TRIGGER ALL;

--
-- Data for Name: access_profiles; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.access_profiles DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.access_profiles (id, code, name, description, created_at, updated_at) FROM stdin;
1	platform_super_admin	Platform Super Admin	Full platform access across all tenants and modules	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
2	tenant_admin	Tenant Admin	Full tenant-level access for administration	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
3	security_admin	Security Admin	Security configuration and user management	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
4	module_admin	Module Admin	Module-level administration within assigned modules	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
5	standard_user	Standard User	Standard business user with module access	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
6	viewer	Viewer	Read-only access to assigned modules	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
7	external_auditor	External Auditor	External audit access with restricted scope	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
\.


ALTER TABLE __TENANT_SCHEMA__.access_profiles ENABLE TRIGGER ALL;

--
-- Data for Name: access_review_campaigns; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.access_review_campaigns DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.access_review_campaigns (campaign_id, name, description, scope_type, scope_id, status, reviewer_id, due_date, started_at, completed_at, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.access_review_campaigns ENABLE TRIGGER ALL;

--
-- Data for Name: access_review_items; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.access_review_items DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.access_review_items (item_id, campaign_id, user_id, user_email, user_name, role_code, role_name, department_id, current_status, decision, decision_by, decision_at, decision_notes, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.access_review_items ENABLE TRIGGER ALL;

--
-- Data for Name: teams; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.teams DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.teams (team_id, team_code, name_en, name_ar, description_en, description_ar, team_lead_user_id, parent_team_id, team_type, active, metadata, created_at, updated_at, deleted_at, team_lead, nca_mandated, committee_type, charter_id, quorum_required, department_id) FROM stdin;
e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	EXEC_STRATEGY	Executive / Strategy / GRC Steering	اللجنة التنفيذية / الاستراتيجية / توجيه الحوكمة	Strategic oversight and governance steering committee responsible for setting GRC direction, approving policies, and overseeing enterprise risk posture	الإشراف الاستراتيجي ولجنة توجيه الحوكمة المسؤولة عن تحديد اتجاه الحوكمة والمخاطر والامتثال	\N	\N	executive	t	{"tier": "oversight", "usage": "approver", "criticality": "critical", "can_override": true, "typical_size": "5-10", "kpi_ownership": ["compliance_score", "risk_appetite", "control_effectiveness"], "validation_role": "final_approval", "meeting_frequency": "monthly", "escalation_endpoint": true}	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:24.413471+08	\N	\N	f	\N	\N	\N	\N
4ab47114-2a8a-4da5-9e9f-dbf34143b7aa	SOC_OPS	SOC / Cyber Operations	مركز العمليات الأمنية	Security operations center managing 24/7 monitoring, incident response, threat hunting, and security tool operations	مركز العمليات الأمنية لإدارة المراقبة والاستجابة للحوادث على مدار الساعة	\N	\N	operational	t	{"tier": "core", "usage": "continuous", "criticality": "critical", "shift_based": true, "typical_size": "20-40", "kpi_ownership": ["mttr", "incident_count", "false_positive_rate"], "evidence_types": ["siem_logs", "incident_reports", "forensics", "threat_intel"], "24x7_operations": true, "validation_role": "incident_validation", "compliance_frameworks": ["NCA-ECC", "SAMA-CSF"]}	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:24.413471+08	\N	\N	f	\N	\N	\N	\N
7b86d19c-117c-4444-ae00-689ab1f7e9b7	IAM_GOV	IAM / Identity / Access Governance	حوكمة إدارة الهوية والوصول	Identity and access management governance including privileged access, access reviews, segregation of duties, and identity lifecycle	حوكمة إدارة الهوية والوصول بما في ذلك الوصول المميز ومراجعات الوصول	\N	\N	operational	t	{"tier": "core", "usage": "daily", "criticality": "high", "typical_size": "8-15", "kpi_ownership": ["orphan_accounts", "access_review_completion", "privilege_count"], "evidence_types": ["access_reviews", "privilege_reports", "sod_violations", "termination_reports"], "validation_role": "access_validation", "approval_authority": ["access_requests", "privilege_elevation"], "compliance_frameworks": ["NCA-IAM", "SAMA-CSF"]}	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:24.413471+08	\N	\N	f	\N	\N	\N	\N
81795efe-abd5-485d-9dbc-ad5b8a80a260	DATA_GOV	Data Governance / Data Management	حوكمة وإدارة البيانات	Data classification, protection, lifecycle management, quality, and compliance with data regulations including PDPL	تصنيف وحماية وإدارة دورة حياة البيانات والامتثال للوائح البيانات	\N	\N	operational	t	{"tier": "core", "usage": "daily", "criticality": "high", "typical_size": "10-20", "kpi_ownership": ["data_quality_score", "classification_coverage", "retention_compliance"], "evidence_types": ["data_classification", "dpia", "data_inventory", "retention_reports"], "validation_role": "data_validation", "regulatory_focus": ["PDPL", "GDPR"], "compliance_frameworks": ["PDPL", "NDMO", "ISO27701"]}	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:24.413471+08	\N	\N	f	\N	\N	\N	\N
6c4d2f11-4f06-4796-a973-df9497fc8b93	BCM_DR	Business Continuity / DR / Crisis	استمرارية الأعمال / التعافي من الكوارث	Business continuity planning, disaster recovery, crisis management, and resilience testing	تخطيط استمرارية الأعمال والتعافي من الكوارث وإدارة الأزمات	\N	\N	operational	t	{"tier": "core", "usage": "weekly", "criticality": "high", "typical_size": "8-12", "kpi_ownership": ["rto_compliance", "rpo_compliance", "dr_test_success"], "evidence_types": ["bia", "dr_tests", "recovery_plans", "crisis_protocols"], "validation_role": "bcm_validation", "on_call_required": true, "emergency_authority": true, "compliance_frameworks": ["ISO22301", "SAMA-BCM"]}	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:24.413471+08	\N	\N	f	\N	\N	\N	\N
89a742c3-a93f-4661-b10a-2ae4f9ae2329	CLOUD_INFRA	Cloud / Infrastructure / Hosting	السحابة / البنية التحتية / الاستضافة	Cloud security, infrastructure compliance, hosting governance, and technology risk management	أمن السحابة وامتثال البنية التحتية وحوكمة الاستضافة	\N	\N	operational	t	{"tier": "heavy", "usage": "daily", "criticality": "high", "typical_size": "15-30", "kpi_ownership": ["availability", "performance_sla", "infrastructure_vulnerabilities"], "evidence_types": ["cloud_configs", "network_diagrams", "vulnerability_scans", "capacity_reports"], "validation_role": "infrastructure_validation", "compliance_frameworks": ["CCC", "CSA-CCM", "ISO27017"], "change_approval_required": true}	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:24.413471+08	\N	\N	f	\N	\N	\N	\N
83bd0284-7e8c-489c-9200-e9b5aab55716	APP_ENG	Application / Platform Engineering	هندسة التطبيقات / المنصات	Application security, secure development lifecycle, platform engineering, and DevSecOps practices	أمن التطبيقات ودورة حياة التطوير الآمن وهندسة المنصات	\N	\N	operational	t	{"tier": "heavy", "usage": "daily", "agile_teams": true, "criticality": "medium", "typical_size": "20-50", "kpi_ownership": ["vulnerability_density", "code_coverage", "deployment_frequency"], "evidence_types": ["code_reviews", "sast_reports", "dast_reports", "sbom"], "validation_role": "application_validation", "deployment_authority": true, "compliance_frameworks": ["OWASP", "SAMA-CSF", "PCI-DSS"]}	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:24.413471+08	\N	\N	f	\N	\N	\N	\N
00310a16-83ca-465e-94a6-2abfed5793e6	ENT_ARCH	Enterprise Architecture	هندسة المؤسسة	Enterprise architecture governance, standards definition, technology roadmap, and architecture review board	حوكمة هندسة المؤسسة وتحديد المعايير وخارطة طريق التكنولوجيا	\N	\N	operational	t	{"tier": "core", "usage": "weekly", "veto_power": ["architecture_violations"], "criticality": "medium", "typical_size": "5-10", "kpi_ownership": ["architecture_debt", "standard_compliance", "reuse_rate"], "evidence_types": ["architecture_docs", "standards", "roadmaps", "arb_decisions"], "validation_role": "architecture_validation", "compliance_frameworks": ["TOGAF", "SABSA"]}	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:24.413471+08	\N	\N	f	\N	\N	\N	\N
c6298086-f66b-418c-87fc-eb8370d7747e	PMO	PMO / Transformation / Program Delivery	مكتب إدارة المشاريع / التحول / تسليم البرامج	Program management office, transformation initiatives, project delivery, and change management	مكتب إدارة المشاريع ومبادرات التحول وتسليم المشاريع	\N	\N	operational	t	{"tier": "heavy", "usage": "daily", "criticality": "medium", "methodology": ["Agile", "Waterfall", "Hybrid"], "typical_size": "10-20", "kpi_ownership": ["project_success_rate", "budget_variance", "schedule_variance"], "evidence_types": ["project_plans", "status_reports", "risk_logs", "change_requests"], "validation_role": "project_validation", "budget_authority": true, "compliance_frameworks": ["PMI", "PRINCE2"]}	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:24.413471+08	\N	\N	f	\N	\N	\N	\N
419acddd-0652-4b89-936d-8f563be56a25	SVC_OPS	Service Operations / ITSM	عمليات الخدمة / ITSM	IT service management, incident management, problem management, and service desk operations	إدارة خدمات تكنولوجيا المعلومات وإدارة الحوادث والمشاكل	\N	\N	operational	t	{"tier": "heavy", "usage": "continuous", "criticality": "medium", "shift_based": true, "typical_size": "30-60", "kpi_ownership": ["ticket_resolution_time", "first_call_resolution", "service_availability"], "evidence_types": ["incident_tickets", "problem_records", "change_logs", "sla_reports"], "24x7_operations": true, "validation_role": "service_validation", "compliance_frameworks": ["ITIL", "ISO20000"]}	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:24.413471+08	\N	\N	f	\N	\N	\N	\N
ee17e8bf-6125-4317-8344-e4c4424ca33c	VENDOR_RISK	Vendor / Procurement / Third-Party Risk	مخاطر الموردين / المشتريات / الطرف الثالث	Third-party risk management, vendor governance, procurement compliance, and supply chain security	إدارة مخاطر الطرف الثالث وحوكمة الموردين وامتثال المشتريات	\N	\N	operational	t	{"tier": "core", "usage": "daily", "criticality": "high", "typical_size": "8-15", "kpi_ownership": ["vendor_risk_score", "contract_compliance", "vendor_incidents"], "evidence_types": ["vendor_assessments", "contracts", "sla_performance", "risk_ratings"], "validation_role": "vendor_validation", "contract_authority": true, "compliance_frameworks": ["ISO27036", "SAMA-OSR"]}	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:24.413471+08	\N	\N	f	\N	\N	\N	\N
baa82233-2f98-461b-9ad1-744430c24b5b	HR_GOV	HR / Workforce Governance	الموارد البشرية / حوكمة القوى العاملة	Human resources governance, workforce compliance, background checks, and employee lifecycle management	حوكمة الموارد البشرية وامتثال القوى العاملة والتحقق من الخلفية	\N	\N	operational	t	{"tier": "heavy", "usage": "weekly", "criticality": "medium", "pii_handler": true, "typical_size": "10-20", "kpi_ownership": ["training_compliance", "screening_completion", "turnover_rate"], "evidence_types": ["background_checks", "training_records", "nda", "termination_checklists"], "validation_role": "hr_validation", "compliance_frameworks": ["MHRSD", "ISO30408"]}	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:24.413471+08	\N	\N	f	\N	\N	\N	\N
0fa2f110-8687-4e71-af63-8865f07631a1	FINANCE	Finance / Budget Control	المالية / مراقبة الميزانية	Financial controls, budget management, financial compliance, and fraud prevention	الضوابط المالية وإدارة الميزانية والامتثال المالي	\N	\N	operational	t	{"tier": "approver", "usage": "weekly", "criticality": "high", "typical_size": "10-20", "kpi_ownership": ["budget_utilization", "cost_variance", "payment_cycle"], "evidence_types": ["financial_reports", "budgets", "invoices", "payment_approvals"], "approval_limits": {"low": 10000, "high": 1000000, "medium": 100000}, "validation_role": "financial_validation", "compliance_frameworks": ["IFRS", "ZATCA", "SOCPA"]}	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:24.413471+08	\N	\N	f	\N	\N	\N	\N
c0f356ac-dadc-440c-9a2e-749fc833af3c	QUALITY	Quality / Policy / Documentation Office	الجودة / السياسات / مكتب التوثيق	Quality assurance, policy management, documentation control, and process improvement	ضمان الجودة وإدارة السياسات ومراقبة الوثائق	\N	\N	operational	t	{"tier": "heavy", "usage": "daily", "criticality": "medium", "typical_size": "8-12", "kpi_ownership": ["policy_coverage", "document_currency", "process_maturity"], "evidence_types": ["policies", "procedures", "work_instructions", "quality_metrics"], "validation_role": "quality_validation", "document_control": true, "compliance_frameworks": ["ISO9001", "ISO19600"]}	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:24.413471+08	\N	\N	f	\N	\N	\N	\N
58813635-5385-4a0f-8ee1-b5dc871b4744	ERM	Enterprise Risk Management	إدارة مخاطر المؤسسة	Enterprise-wide risk identification, assessment, mitigation, and monitoring. Maintains risk registers, conducts risk assessments, and coordinates risk response strategies	تحديد وتقييم وتخفيف ومراقبة المخاطر على مستوى المؤسسة	\N	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	operational	t	{"tier": "core", "usage": "daily", "criticality": "critical", "can_escalate": true, "typical_size": "10-20", "kpi_ownership": ["risk_score", "open_risks", "mitigation_effectiveness"], "evidence_types": ["risk_assessment", "control_testing", "risk_register", "mitigation_plan"], "validation_role": "risk_validation", "compliance_frameworks": ["ISO31000", "COSO-ERM"]}	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:24.413471+08	\N	\N	f	\N	\N	\N	\N
f7515ebf-bb79-4945-a3bf-d6367a82cf2c	CYBER_GOV	Cybersecurity Governance	حوكمة الأمن السيبراني	Cybersecurity policy, standards, compliance management, and security architecture. Ensures alignment with NCA-ECC, SAMA-CSF, and international security frameworks	سياسات ومعايير وإدارة الامتثال للأمن السيبراني	\N	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	operational	t	{"tier": "core", "usage": "daily", "criticality": "critical", "typical_size": "15-25", "kpi_ownership": ["security_score", "vulnerability_count", "patch_compliance"], "evidence_types": ["security_logs", "pen_test", "vulnerability_scan", "security_config", "access_reviews"], "validation_role": "security_validation", "can_block_release": true, "compliance_frameworks": ["NCA-ECC", "SAMA-CSF", "ISO27001", "NIST-CSF"]}	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:24.413471+08	\N	\N	f	\N	\N	\N	\N
cde8e3a5-965d-4ec6-b879-5676c76567e8	PRIVACY	Privacy / PDPL / Legal Compliance	الخصوصية / PDPL / الامتثال القانوني	Privacy compliance, personal data protection, consent management, data subject rights, and legal compliance coordination	امتثال الخصوصية وحماية البيانات الشخصية وإدارة الموافقة وحقوق أصحاب البيانات	\N	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	operational	t	{"tier": "core", "usage": "daily", "criticality": "high", "typical_size": "5-10", "kpi_ownership": ["dsr_response_time", "consent_rate", "privacy_incidents"], "evidence_types": ["consent_records", "dpia", "breach_notifications", "dsr_logs"], "legal_authority": true, "validation_role": "privacy_validation", "compliance_frameworks": ["PDPL", "GDPR"]}	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:24.413471+08	\N	\N	f	\N	\N	\N	\N
3955d2de-4d69-4de5-85a0-4b64944b3b73	AUDIT	Internal Audit / Assurance	التدقيق الداخلي / التأكيد	Independent assurance, compliance verification, control testing, and audit execution across all GRC domains	التأكيد المستقل والتحقق من الامتثال واختبار الضوابط وتنفيذ التدقيق	\N	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	operational	t	{"tier": "core", "usage": "weekly", "criticality": "high", "typical_size": "10-15", "kpi_ownership": ["audit_coverage", "finding_closure_rate", "audit_plan_completion"], "evidence_types": ["audit_reports", "control_tests", "compliance_certificates", "findings"], "rotation_policy": true, "validation_role": "audit_validation", "compliance_frameworks": ["IIA", "ISACA"], "independence_required": true}	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:24.413471+08	\N	\N	f	\N	\N	\N	\N
\.


ALTER TABLE __TENANT_SCHEMA__.teams ENABLE TRIGGER ALL;

--
-- Data for Name: action_items; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.action_items DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.action_items (action_id, action_code, source_type, source_id, finding_id, risk_id, control_id, incident_id, title, description, action_type, criticality, owner_team_id, assigned_to, secondary_teams, status, progress_percentage, target_date, revised_target_date, started_date, completion_date, blocked_reason, blocking_items, dependencies, verification_required, verification_method, verified_by, verification_date, verification_notes, verification_evidence, tags, cost_estimate, actual_cost, created_by, created_at, updated_at, item_id, deadline, reminder_schedule, escalated_to, priority, type) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.action_items ENABLE TRIGGER ALL;

--
-- Data for Name: action_items_legacy; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.action_items_legacy DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.action_items_legacy (item_id, title, description, source_type, source_id, assigned_to, deadline, reminder_schedule, status, escalated_to, priority, type, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.action_items_legacy ENABLE TRIGGER ALL;

--
-- Data for Name: activity_notifications; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.activity_notifications DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.activity_notifications (notification_id, activity_id, user_id, read, dismissed, created_at, read_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.activity_notifications ENABLE TRIGGER ALL;

--
-- Data for Name: activity_stream; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.activity_stream DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.activity_stream (activity_id, user_id, module, action, entity_type, entity_id, summary, changes, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.activity_stream ENABLE TRIGGER ALL;

--
-- Data for Name: member_agent_shadows; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.member_agent_shadows DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.member_agent_shadows (shadow_id, user_id, team_id, agent_name, agent_name_ar, activation_mode, raci_mirror, capabilities, auto_actions, last_action_at, total_actions, enabled, configured_by, created_at, updated_at, confidence_threshold, can_escalate_to_human, max_autonomous_actions_per_day) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.member_agent_shadows ENABLE TRIGGER ALL;

--
-- Data for Name: agent_activation_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_activation_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_activation_rules (rule_id, shadow_id, rule_name, rule_name_ar, trigger_type, trigger_config, action_type, action_config, priority, enabled, last_triggered_at, trigger_count, created_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_activation_rules ENABLE TRIGGER ALL;

--
-- Data for Name: agent_runs; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_runs DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_runs (run_id, tenant_id, user_id, workflow_id, agent_id, autonomy_level, platform_mode, status, trace_id, inputs, outputs, summary, actions_proposed, actions_executed, actions_queued, duration_ms, error_message, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_runs ENABLE TRIGGER ALL;

--
-- Data for Name: agent_proposals; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_proposals DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_proposals (proposal_id, run_id, node_id, agent_id, tenant_id, type, payload_json, reason, priority, status, required_approvers, auto_executable, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_proposals ENABLE TRIGGER ALL;

--
-- Data for Name: agent_approvals_v2; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_approvals_v2 DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_approvals_v2 (approval_id, proposal_id, approver_user_id, decision, comment, decided_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_approvals_v2 ENABLE TRIGGER ALL;

--
-- Data for Name: agent_autonomy_policies; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_autonomy_policies DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_autonomy_policies (policy_id, tenant_id, action_type, min_autonomy, requires_approval, max_auto_per_day, allowed_agents, notes, created_at, updated_at) FROM stdin;
3b7752ca-0a2c-4ece-81b5-5754b07a0552	_default	NOTIFY_OWNER	L2	f	50	{}	Low-risk: auto-execute at L2+	2026-03-17 08:24:22.50248+08	2026-03-17 08:24:22.50248+08
e7a35528-036f-4479-a389-2085f6d7fc00	_default	GENERATE_DRAFT	L2	f	50	{}	Low-risk: drafts are reversible	2026-03-17 08:24:22.50248+08	2026-03-17 08:24:22.50248+08
9483e954-77c1-4556-b121-2b9e3940b0f7	_default	CLASSIFY_EVIDENCE	L2	f	50	{}	Low-risk: classification only	2026-03-17 08:24:22.50248+08	2026-03-17 08:24:22.50248+08
4998e705-4df7-4fd5-b558-06b3e8a56868	_default	SUMMARIZE	L2	f	50	{}	Low-risk: read-only summarization	2026-03-17 08:24:22.50248+08	2026-03-17 08:24:22.50248+08
6f204dc1-799c-479e-b2f1-f58313049e66	_default	UPDATE_STATUS	L1	t	50	{}	Medium-risk: needs approval at L1	2026-03-17 08:24:22.50248+08	2026-03-17 08:24:22.50248+08
8a490a6c-e844-473d-8107-6245b90e8a04	_default	CREATE_TASK	L1	t	50	{}	Medium-risk: creates work items	2026-03-17 08:24:22.50248+08	2026-03-17 08:24:22.50248+08
6ce5b82f-8ec9-4973-9fa1-b8a8e5bf9df2	_default	EVIDENCE_REQUEST	L1	t	50	{}	Medium-risk: creates obligations	2026-03-17 08:24:22.50248+08	2026-03-17 08:24:22.50248+08
6a03707b-e158-4e52-89a1-56ea10ce7bb0	_default	CREATE_REMEDIATION	L1	t	50	{}	Medium-risk: remediation plans	2026-03-17 08:24:22.50248+08	2026-03-17 08:24:22.50248+08
2928dc39-b085-4817-a430-622c1433f936	_default	FLAG_RISK	L1	t	50	{}	Medium-risk: risk flagging	2026-03-17 08:24:22.50248+08	2026-03-17 08:24:22.50248+08
33ebbdfc-21a9-483d-a53b-af329d8db33e	_default	CHANGE_PATH	L0	t	50	{}	High-risk: always requires approval	2026-03-17 08:24:22.50248+08	2026-03-17 08:24:22.50248+08
d1932cb1-a062-44f3-b86c-030e203d0783	_default	CLOSE_RISK	L0	t	50	{}	High-risk: always requires approval	2026-03-17 08:24:22.50248+08	2026-03-17 08:24:22.50248+08
9c3e10ef-e537-4056-a19b-3155cc224fce	_default	MODIFY_CONTROL	L0	t	50	{}	High-risk: always requires approval	2026-03-17 08:24:22.50248+08	2026-03-17 08:24:22.50248+08
57adac99-2876-46d0-8834-3eb49b152fd7	_default	REASSIGN	L0	t	50	{}	High-risk: always requires approval	2026-03-17 08:24:22.50248+08	2026-03-17 08:24:22.50248+08
515d9eef-4c8b-4e7e-9cc2-99c509422a3e	_default	ESCALATE	L0	t	50	{}	High-risk: always requires approval	2026-03-17 08:24:22.50248+08	2026-03-17 08:24:22.50248+08
658fac31-585d-49ff-8650-48e0b19097f0	_default	CREATE_POLICY	L0	t	50	{}	High-risk: always requires approval	2026-03-17 08:24:22.50248+08	2026-03-17 08:24:22.50248+08
\.


ALTER TABLE __TENANT_SCHEMA__.agent_autonomy_policies ENABLE TRIGGER ALL;

--
-- Data for Name: agent_collaboration_metrics; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_collaboration_metrics DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_collaboration_metrics (metric_id, agent_user_id, suggestions_generated, suggestions_accepted, tasks_completed, avg_task_duration_ms, error_count, snapshot_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_collaboration_metrics ENABLE TRIGGER ALL;

--
-- Data for Name: agent_correlations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_correlations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_correlations (id, agents, shared_entity, severity, findings, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_correlations ENABLE TRIGGER ALL;

--
-- Data for Name: agent_cycle_memory; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_cycle_memory DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_cycle_memory (cycle_memory_id, tenant_id, cycle_id, agent_id, memory_type, content, metadata, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_cycle_memory ENABLE TRIGGER ALL;

--
-- Data for Name: agent_cycle_summaries; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_cycle_summaries DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_cycle_summaries (cycle_id, tenant_id, discoveries, handoffs, correlations, discovery_count, handoff_count, correlation_count, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_cycle_summaries ENABLE TRIGGER ALL;

--
-- Data for Name: agent_discoveries; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_discoveries DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_discoveries (id, agent_id, discovery_type, title, severity, entity_type, entity_id, details, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_discoveries ENABLE TRIGGER ALL;

--
-- Data for Name: agent_eval_scores; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_eval_scores DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_eval_scores (eval_id, tenant_id, agent_id, run_id, eval_type, score, judge_model, sample_input, sample_output, reasoning, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_eval_scores ENABLE TRIGGER ALL;

--
-- Data for Name: agent_events; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_events DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_events (event_id, run_id, tenant_id, agent_id, event_type, node_id, data_json, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_events ENABLE TRIGGER ALL;

--
-- Data for Name: agent_handoffs; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_handoffs DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_handoffs (id, from_agent, to_agent, handoff_type, priority, status, payload, created_at, completed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_handoffs ENABLE TRIGGER ALL;

--
-- Data for Name: agent_memories; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_memories DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_memories (memory_id, tenant_id, user_id, agent_id, memory_type, namespace, content, summary, metadata, source_run_id, source_proposal_id, embedding, importance_score, access_count, last_accessed_at, expires_at, is_deleted, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_memories ENABLE TRIGGER ALL;

--
-- Data for Name: agent_model_config; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_model_config DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_model_config (agent_id, preferred_model, preferred_provider, max_tokens, temperature, complexity_tier, fallback_model, fallback_provider, enabled, updated_at) FROM stdin;
A01	auto	auto	4096	0.3	medium	\N	\N	t	2026-03-17 08:24:22.590273+08
A02	auto	auto	4096	0.2	medium	\N	\N	t	2026-03-17 08:24:22.590273+08
A03	auto	auto	4096	0.2	high	\N	\N	t	2026-03-17 08:24:22.590273+08
A04	claude-sonnet-4-20250514	claude	4096	0.4	critical	\N	\N	t	2026-03-17 08:24:22.590273+08
A05	auto	auto	4096	0.2	medium	\N	\N	t	2026-03-17 08:24:22.590273+08
A06	claude-sonnet-4-20250514	claude	4096	0.3	high	\N	\N	t	2026-03-17 08:24:22.590273+08
A07	claude-sonnet-4-20250514	claude	4096	0.3	high	\N	\N	t	2026-03-17 08:24:22.590273+08
A08	claude-sonnet-4-20250514	claude	4096	0.4	critical	\N	\N	t	2026-03-17 08:24:22.590273+08
A09	auto	auto	4096	0.2	medium	\N	\N	t	2026-03-17 08:24:22.590273+08
A10	auto	auto	4096	0.2	low	\N	\N	t	2026-03-17 08:24:22.590273+08
\.


ALTER TABLE __TENANT_SCHEMA__.agent_model_config ENABLE TRIGGER ALL;

--
-- Data for Name: agent_pending_actions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_pending_actions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_pending_actions (action_id, shadow_id, agent_id, user_id, team_id, action_type, entity_type, entity_id, proposed_payload, confidence_score, reasoning, status, expires_at, reviewed_by, reviewed_at, review_note, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_pending_actions ENABLE TRIGGER ALL;

--
-- Data for Name: agent_prompt_versions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_prompt_versions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_prompt_versions (prompt_id, agent_id, version, system_prompt, description, is_active, is_canary, canary_pct, eval_score_avg, auto_promoted, created_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_prompt_versions ENABLE TRIGGER ALL;

--
-- Data for Name: agent_status_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_status_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_status_log (log_id, agent_user_id, from_status, to_status, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_status_log ENABLE TRIGGER ALL;

--
-- Data for Name: agent_steps; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_steps DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_steps (step_id, run_id, node_id, agent_id, step_type, lane, label, label_ar, status, owner_user_id, inputs_ref, outputs_ref, sla_hours, started_at, ended_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_steps ENABLE TRIGGER ALL;

--
-- Data for Name: agent_suggestions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_suggestions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_suggestions (suggestion_id, agent_user_id, target_task_id, target_user_id, suggestion_text, suggested_action, prefill_data, accepted, created_at, resolved_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_suggestions ENABLE TRIGGER ALL;

--
-- Data for Name: agent_trigger_chains; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_trigger_chains DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_trigger_chains (id, source_agent_id, source_entity_type, source_task_type, target_agent_id, target_context, delay_seconds, active, created_at) FROM stdin;
1	A05	evidence	evidence_request	A06	{}	30	t	2026-03-17 08:24:23.793625+08
2	A06	control	remediation	A04	{}	60	t	2026-03-17 08:24:23.793625+08
3	A07	risk	risk_assessment	A06	{}	30	t	2026-03-17 08:24:23.793625+08
4	A07	vendor	risk_assessment	A09	{}	60	t	2026-03-17 08:24:23.793625+08
5	A08	policy	policy_creation	A04	{}	60	t	2026-03-17 08:24:23.793625+08
6	A08	policy	policy_creation	A05	{}	120	t	2026-03-17 08:24:23.793625+08
7	A04	control	control_review	A05	{}	60	t	2026-03-17 08:24:23.793625+08
8	A09	vendor	risk_assessment	A07	{}	60	t	2026-03-17 08:24:23.793625+08
9	A06	compliance_gap	remediation	A03	{}	120	t	2026-03-17 08:24:23.793625+08
10	A10	finding	audit_response	A06	{}	30	t	2026-03-17 08:24:23.793625+08
\.


ALTER TABLE __TENANT_SCHEMA__.agent_trigger_chains ENABLE TRIGGER ALL;

--
-- Data for Name: agent_user_feedback; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agent_user_feedback DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agent_user_feedback (feedback_id, tenant_id, user_id, agent_id, run_id, rating, comment, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agent_user_feedback ENABLE TRIGGER ALL;

--
-- Data for Name: agrc_engine_dedup; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agrc_engine_dedup DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agrc_engine_dedup (dedup_key, entity_type, entity_id, action_type, created_at, expires_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agrc_engine_dedup ENABLE TRIGGER ALL;

--
-- Data for Name: agrc_engine_runs; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agrc_engine_runs DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agrc_engine_runs (run_id, engine_name, started_at, completed_at, status, trigger_mode, triggered_by, controls_evaluated, stale_controls, overdue_remediations, kri_breaches, policy_reviews_started, tasks_created, notifications_created, escalations_triggered, error_message) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agrc_engine_runs ENABLE TRIGGER ALL;

--
-- Data for Name: agrc_event_dlq; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agrc_event_dlq DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agrc_event_dlq (dlq_id, event_id, event_type, handler_name, error_message, payload, retry_count, max_retries, status, created_at, last_retry_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agrc_event_dlq ENABLE TRIGGER ALL;

--
-- Data for Name: agrc_event_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agrc_event_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agrc_event_log (event_id, event_type, source_service, entity_type, entity_id, severity, payload, created_at, entry_hash, previous_hash) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agrc_event_log ENABLE TRIGGER ALL;

--
-- Data for Name: agrc_event_log_archive; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agrc_event_log_archive DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agrc_event_log_archive (event_id, event_type, source_service, entity_type, entity_id, severity, payload, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agrc_event_log_archive ENABLE TRIGGER ALL;

--
-- Data for Name: agrc_metrics_snapshots; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agrc_metrics_snapshots DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agrc_metrics_snapshots (snapshot_id, cycle_count, avg_cycle_ms, enforcement_rate, stale_control_pct, telemetry_ingestion_rate, event_count, critical_events, snapshot_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agrc_metrics_snapshots ENABLE TRIGGER ALL;

--
-- Data for Name: agrc_os_cycle_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agrc_os_cycle_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agrc_os_cycle_log (cycle_id, telemetry_ingested, controls_evaluated, risks_recomputed, policy_decisions, enforcement_actions, audit_entries, cycle_ms, executed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agrc_os_cycle_log ENABLE TRIGGER ALL;

--
-- Data for Name: agrc_runbooks; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.agrc_runbooks DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.agrc_runbooks (runbook_id, trigger_event, name_en, name_ar, description_en, description_ar, automated_steps, human_escalation_points, severity_threshold, enabled, version, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.agrc_runbooks ENABLE TRIGGER ALL;

--
-- Data for Name: ai_agent_registry; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_agent_registry DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_agent_registry (agent_version_id, asset_id, version_number, agent_config, linked_prompt_asset_id, linked_model_asset_id, capabilities, approval_status, deployment_status, is_active, rollback_from_version_id, diff_summary, change_summary, notes, approved_by, approved_at, deployed_by, deployed_at, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_agent_registry ENABLE TRIGGER ALL;

--
-- Data for Name: ai_agent_status_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_agent_status_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_agent_status_log (log_id, agent_user_id, agent_id, previous_status, new_status, workflow_execution_id, step_id, detail, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_agent_status_log ENABLE TRIGGER ALL;

--
-- Data for Name: ai_asset_inventory; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_asset_inventory DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_asset_inventory (asset_id, asset_type, asset_key, display_name, description, scope_type, tenant_id, lifecycle_status, status, business_owner, technical_owner, governance_owner, source_type, source_ref, metadata, tags, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_asset_inventory ENABLE TRIGGER ALL;

--
-- Data for Name: ai_agent_tool_bindings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_agent_tool_bindings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_agent_tool_bindings (binding_id, agent_asset_id, tool_asset_id, tenant_id, is_enabled, notes, created_by, updated_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_agent_tool_bindings ENABLE TRIGGER ALL;

--
-- Data for Name: ai_alert_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_alert_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_alert_rules (rule_id, tenant_id, rule_name, description, trigger_condition, channels, escalation_chain, enabled, snooze_until, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_alert_rules ENABLE TRIGGER ALL;

--
-- Data for Name: ai_alert_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_alert_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_alert_history (alert_id, tenant_id, rule_id, rule_name, triggered_at, channel, target, event_type, event_severity, entity_type, entity_id, delivered, acknowledged, acknowledged_at, acknowledged_by, error_message) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_alert_history ENABLE TRIGGER ALL;

--
-- Data for Name: ai_drift_thresholds; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_drift_thresholds DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_drift_thresholds (threshold_id, tenant_id, asset_id, metric_type, warning_delta, critical_delta, baseline_value, enabled, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_drift_thresholds ENABLE TRIGGER ALL;

--
-- Data for Name: ai_ethics_reviews; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_ethics_reviews DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_ethics_reviews (review_id, tenant_id, system_name, system_type, description, risk_category, assessment_data, decision, conditions, conditions_met, submitted_by, submitted_at, decided_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_ethics_reviews ENABLE TRIGGER ALL;

--
-- Data for Name: ai_ethics_votes; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_ethics_votes DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_ethics_votes (vote_id, tenant_id, review_id, voter_id, vote, notes, voted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_ethics_votes ENABLE TRIGGER ALL;

--
-- Data for Name: ai_eu_classifications; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_eu_classifications DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_eu_classifications (classification_id, tenant_id, model_id, model_name, risk_category, answers, requirements, classified_by, classified_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_eu_classifications ENABLE TRIGGER ALL;

--
-- Data for Name: ai_fairness_metrics; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_fairness_metrics DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_fairness_metrics (metric_id, tenant_id, model_asset_id, model_name, metric_name, value, threshold, status, scan_id, scanned_at, metadata) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_fairness_metrics ENABLE TRIGGER ALL;

--
-- Data for Name: ai_fairness_scans; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_fairness_scans DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_fairness_scans (scan_id, tenant_id, model_asset_id, model_name, status, started_at, completed_at, triggered_by, summary) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_fairness_scans ENABLE TRIGGER ALL;

--
-- Data for Name: ai_governance_break_glass; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_governance_break_glass DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_governance_break_glass (break_glass_id, asset_id, version_id, registry_type, actor_id, reason, status, duration_minutes, expires_at, revoked_by, revoked_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_governance_break_glass ENABLE TRIGGER ALL;

--
-- Data for Name: ai_governance_promotions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_governance_promotions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_governance_promotions (promotion_id, asset_id, version_id, registry_type, from_environment, to_environment, promoted_by, approval_status, notes, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_governance_promotions ENABLE TRIGGER ALL;

--
-- Data for Name: ai_impact_assessments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_impact_assessments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_impact_assessments (assessment_id, tenant_id, system_name, model_asset_id, assessor_id, status, steps_data, impact_score, recommendation, created_at, updated_at, completed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_impact_assessments ENABLE TRIGGER ALL;

--
-- Data for Name: ai_kill_switches; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_kill_switches DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_kill_switches (kill_switch_id, tenant_id, asset_id, asset_name, asset_type, kill_switch_type, trigger_method, fallback_procedure, status, last_tested_at, last_activated_at, activated_by, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_kill_switches ENABLE TRIGGER ALL;

--
-- Data for Name: ai_model_metrics; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_model_metrics DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_model_metrics (metric_id, tenant_id, version_id, asset_id, metric_type, value, metadata, recorded_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_model_metrics ENABLE TRIGGER ALL;

--
-- Data for Name: ai_model_registry; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_model_registry DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_model_registry (model_version_id, asset_id, version_number, provider, provider_model_id, config, approval_status, submitted_by, submitted_at, approved_by, approved_at, is_active, rollback_from_version_id, change_summary, notes, created_by, updated_by, created_at, updated_at, deployment_status) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_model_registry ENABLE TRIGGER ALL;

--
-- Data for Name: ai_prompt_registry; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_prompt_registry DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_prompt_registry (prompt_version_id, asset_id, version_number, template_text, variables, linked_model_asset_id, approval_status, deployment_status, is_active, rollback_from_version_id, diff_summary, change_summary, notes, approved_by, approved_at, deployed_by, deployed_at, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_prompt_registry ENABLE TRIGGER ALL;

--
-- Data for Name: ai_red_team_schedules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_red_team_schedules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_red_team_schedules (schedule_id, tenant_id, name, model_id, prompt_template, frequency, enabled, last_run_at, next_run_at, created_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_red_team_schedules ENABLE TRIGGER ALL;

--
-- Data for Name: ai_regulatory_changes; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_regulatory_changes DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_regulatory_changes (change_id, tenant_id, source, title, description, framework_code, severity, status, affected_controls, recommended_action, reviewed_by, reviewed_at, detected_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_regulatory_changes ENABLE TRIGGER ALL;

--
-- Data for Name: ai_risk_models; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_risk_models DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_risk_models (model_id, model_name, model_type, risk_domain, features, algorithm, confidence_threshold, accuracy_score, precision_score, recall_score, f1_score, training_date, training_samples, last_updated, prediction_count, last_prediction_at, active, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_risk_models ENABLE TRIGGER ALL;

--
-- Data for Name: ai_step_executions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_step_executions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_step_executions (execution_id, workflow_execution_id, step_id, agent_id, agent_user_id, trigger_reason, input_context, output_result, confidence, status, human_reviewed, review_decision, reviewed_by, created_at, reviewed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_step_executions ENABLE TRIGGER ALL;

--
-- Data for Name: ai_step_feedback; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_step_feedback DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_step_feedback (feedback_id, step_id, workflow_id, user_id, suggestion_type, accepted, modified, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_step_feedback ENABLE TRIGGER ALL;

--
-- Data for Name: ai_summaries; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_summaries DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_summaries (summary_id, entity_type, entity_id, summary_type, language, content, model_used, tokens_used, confidence, generated_by, generated_at, expires_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_summaries ENABLE TRIGGER ALL;

--
-- Data for Name: ai_trigger_config; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ai_trigger_config DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ai_trigger_config (tenant_id, enabled, risk_threshold, compliance_gap_threshold, incident_severity_threshold, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ai_trigger_config ENABLE TRIGGER ALL;

--
-- Data for Name: alert_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.alert_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.alert_rules (rule_id, rule_name, rule_description, alert_category, trigger_type, trigger_conditions, evaluation_frequency_minutes, severity, alert_title_template, alert_message_template, notify_teams, notify_roles, notify_users, escalate_if_unacknowledged, escalation_minutes, auto_create_task, auto_escalate, webhook_url, active, last_triggered_at, trigger_count, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.alert_rules ENABLE TRIGGER ALL;

--
-- Data for Name: alert_instances; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.alert_instances DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.alert_instances (alert_id, rule_id, alert_title, alert_message, severity, entity_type, entity_id, context_data, status, acknowledged_by, acknowledged_at, resolved_by, resolved_at, resolution_notes, escalation_level, escalated_to, triggered_at, expires_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.alert_instances ENABLE TRIGGER ALL;

--
-- Data for Name: approval_chains; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.approval_chains DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.approval_chains (chain_id, chain_name, entity_type, risk_level, amount_threshold, approval_levels, require_all_levels, allow_delegation, allow_skip_level, auto_approve_if_low_risk, auto_approve_below_amount, auto_approve_conditions, escalate_if_no_response, escalation_hours, final_escalation_team_id, notify_all_approvers, notify_on_each_approval, reminder_frequency_hours, active, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.approval_chains ENABLE TRIGGER ALL;

--
-- Data for Name: approval_requests; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.approval_requests DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.approval_requests (request_id, chain_id, entity_type, entity_id, entity_title, entity_description, requester_id, requester_team_id, request_reason, urgency, current_level, approval_status, requested_at, due_date, completed_at, supporting_documents, risk_assessment, impact_analysis, created_at, updated_at, sla_deadline, current_approver_id) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.approval_requests ENABLE TRIGGER ALL;

--
-- Data for Name: approval_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.approval_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.approval_history (approval_id, request_id, approval_level, approver_id, approver_team_id, approver_role, decision, decision_reason, conditions, delegated_from, delegation_reason, assigned_at, reviewed_at, decided_at, response_time_hours, comments, attachments, risk_override, override_justification, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.approval_history ENABLE TRIGGER ALL;

--
-- Data for Name: approvals; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.approvals DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.approvals (approval_id, execution_id, step_id, approver_id, status, sla_deadline, escalation_chain, decision_comment, decided_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.approvals ENABLE TRIGGER ALL;

--
-- Data for Name: assessment_items; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.assessment_items DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.assessment_items (item_id, assessment_id, control_node_id, status, notes, remediation_ids, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.assessment_items ENABLE TRIGGER ALL;

--
-- Data for Name: assessment_responses; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.assessment_responses DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.assessment_responses (response_id, assessment_id, question_id, answer, score, responded_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.assessment_responses ENABLE TRIGGER ALL;

--
-- Data for Name: assessment_templates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.assessment_templates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.assessment_templates (template_id, name_en, name_ar, framework_id, scoring_methodology, weights, question_bank, pack_id, category, industry, difficulty, estimated_minutes, description_en, description_ar, applicable_sectors, tags, is_system, enabled, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.assessment_templates ENABLE TRIGGER ALL;

--
-- Data for Name: workspaces; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workspaces DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workspaces (workspace_id, name, description, type, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workspaces ENABLE TRIGGER ALL;

--
-- Data for Name: assets; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.assets DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.assets (asset_id, workspace_id, name, type, description, owner, criticality, department, location, ip_address, mac_address, os, classification, status, lifecycle_phase, linked_controls, linked_risks, tags, metadata, created_by, created_at, updated_at, deleted_at, custodian_id, cia_confidentiality, cia_integrity, cia_availability, name_en, name_ar, lifecycle_status, last_reviewed_at, review_frequency, vendor, license_expiry) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.assets ENABLE TRIGGER ALL;

--
-- Data for Name: attestation_campaigns; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.attestation_campaigns DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.attestation_campaigns (campaign_id, policy_id, name, status, due_date, reminder_interval_days, created_at, created_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.attestation_campaigns ENABLE TRIGGER ALL;

--
-- Data for Name: attestation_records; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.attestation_records DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.attestation_records (record_id, campaign_id, user_id, status, attested_at, declined_reason, last_reminded_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.attestation_records ENABLE TRIGGER ALL;

--
-- Data for Name: audit_anomalies; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_anomalies DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_anomalies (anomaly_id, anomaly_type, severity, user_id, details, detected_at, resolved_at, resolved_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_anomalies ENABLE TRIGGER ALL;

--
-- Data for Name: audit_charters; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_charters DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_charters (charter_id, title, title_ar, scope, authority, objectives, cae_id, effective_date, review_date, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_charters ENABLE TRIGGER ALL;

--
-- Data for Name: audit_engagements; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_engagements DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_engagements (engagement_id, title, engagement_type, status, description, scope, lead_auditor_id, workspace_id, risk_rating, start_date, end_date, created_by, owner_user_id, org_unit_id, sensitivity, severity, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_engagements ENABLE TRIGGER ALL;

--
-- Data for Name: audit_finding_slas; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_finding_slas DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_finding_slas (id, tenant_id, severity, resolution_days, warning_threshold_pct, escalation_to, created_at) FROM stdin;
dc8f8358-0b7f-415f-a2c9-c289a8627687	00000000-0000-0000-0000-000000000000	critical	15	75	\N	2026-03-17 08:24:22.373779+08
9e13bae5-7cc8-4798-8794-7aa5bb54a79d	00000000-0000-0000-0000-000000000000	high	30	75	\N	2026-03-17 08:24:22.373779+08
8c0a25a5-038e-49c7-bec4-d182163936b2	00000000-0000-0000-0000-000000000000	medium	60	75	\N	2026-03-17 08:24:22.373779+08
85f7f44c-64bd-48ae-a21c-3e2bc1ee99c1	00000000-0000-0000-0000-000000000000	low	90	75	\N	2026-03-17 08:24:22.373779+08
\.


ALTER TABLE __TENANT_SCHEMA__.audit_finding_slas ENABLE TRIGGER ALL;

--
-- Data for Name: audit_packages; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_packages DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_packages (package_id, name, status, framework_id, control_count, controls, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_packages ENABLE TRIGGER ALL;

--
-- Data for Name: audit_plans; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_plans DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_plans (plan_id, plan_year, title, description, status, workspace_id, created_by, approved_by, approved_at, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_plans ENABLE TRIGGER ALL;

--
-- Data for Name: audit_qa_reviews; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_qa_reviews DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_qa_reviews (id, tenant_id, audit_id, finding_id, reviewer_id, review_type, status, comments, reviewed_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_qa_reviews ENABLE TRIGGER ALL;

--
-- Data for Name: audit_ratings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_ratings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_ratings (id, tenant_id, audit_id, overall_rating, control_design_rating, control_operating_rating, summary, rated_by, rated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_ratings ENABLE TRIGGER ALL;

--
-- Data for Name: audits; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audits DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audits (audit_id, title, description, audit_type, scope, lead_auditor_id, status, planned_start, planned_end, actual_start, actual_end, methodology, conclusion, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audits ENABLE TRIGGER ALL;

--
-- Data for Name: audit_requests; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_requests DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_requests (request_id, audit_id, request_type, subject, description, requested_from_user_id, requested_by, due_date, status, priority, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_requests ENABLE TRIGGER ALL;

--
-- Data for Name: audit_request_items; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_request_items DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_request_items (item_id, request_id, item_type, description, evidence_type_code, status, response, responded_by, responded_at, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_request_items ENABLE TRIGGER ALL;

--
-- Data for Name: audit_universe; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_universe DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_universe (id, tenant_id, entity_name, entity_type, risk_rating, last_audited_at, next_audit_due, audit_frequency_months, owner_id, framework_ids, notes, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_universe ENABLE TRIGGER ALL;

--
-- Data for Name: audit_risk_scores; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_risk_scores DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_risk_scores (id, tenant_id, universe_id, risk_factor, score, weight, assessed_by, assessed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_risk_scores ENABLE TRIGGER ALL;

--
-- Data for Name: audit_schedules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_schedules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_schedules (id, tenant_id, universe_id, title, audit_type, cron_expression, next_run_at, last_run_at, auto_create, template_id, enabled, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_schedules ENABLE TRIGGER ALL;

--
-- Data for Name: audit_scopes; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_scopes DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_scopes (scope_id, audit_id, scope_type, entity_type, entity_id, description, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_scopes ENABLE TRIGGER ALL;

--
-- Data for Name: audit_team_members; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_team_members DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_team_members (id, tenant_id, audit_id, user_id, role, assigned_at, hours_budgeted, hours_actual) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_team_members ENABLE TRIGGER ALL;

--
-- Data for Name: audit_templates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_templates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_templates (id, tenant_id, name, template_type, description, default_scope, default_methodology, checklist, test_plan_template, estimated_hours, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_templates ENABLE TRIGGER ALL;

--
-- Data for Name: audit_test_plans; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_test_plans DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_test_plans (id, tenant_id, audit_id, control_id, test_type, procedure_description, sample_size, status, tested_by, tested_at, result_notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_test_plans ENABLE TRIGGER ALL;

--
-- Data for Name: audit_time_entries; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_time_entries DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_time_entries (id, tenant_id, audit_id, user_id, activity_type, hours, description, entry_date, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_time_entries ENABLE TRIGGER ALL;

--
-- Data for Name: audit_trail_archive; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_trail_archive DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_trail_archive (entry_id, user_id, module, action, entity_type, entity_id, before_state, after_state, ip_address, "timestamp", entry_hash, previous_hash, archived_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_trail_archive ENABLE TRIGGER ALL;

--
-- Data for Name: audit_working_papers; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.audit_working_papers DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.audit_working_papers (id, tenant_id, audit_id, title, paper_type, content, status, prepared_by, reviewed_by, reviewed_at, control_id, reference_number, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.audit_working_papers ENABLE TRIGGER ALL;

--
-- Data for Name: authority_levels; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.authority_levels DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.authority_levels (level_id, level_code, name_en, name_ar, rank, approval_limit_amount, can_approve_risk_level, description_en, description_ar, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.authority_levels ENABLE TRIGGER ALL;

--
-- Data for Name: authority_matrix; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.authority_matrix DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.authority_matrix (rule_id, decision_type, min_criticality, required_approver_role, escalation_timeout_hours, created_at, workspace_id, threshold_value, threshold_unit, approver_role, escalation_role, requires_board, requires_committee, committee_name, effective_from, effective_to, is_active, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.authority_matrix ENABLE TRIGGER ALL;

--
-- Data for Name: authorization_decision_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.authorization_decision_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.authorization_decision_log (decision_id, tenant_id, user_id, action, resource_type, resource_id, scope_type, required_function, allowed, decision_source, matched_role_id, matched_function_code, reason, decided_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.authorization_decision_log ENABLE TRIGGER ALL;

--
-- Data for Name: authz_decision_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.authz_decision_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.authz_decision_log (id, user_id, permission_code, module_code, decision, reason, matched_role, matched_scope_type, matched_scope_id, authority_level, record_context, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.authz_decision_log ENABLE TRIGGER ALL;

--
-- Data for Name: auto_approval_config; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.auto_approval_config DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.auto_approval_config (id, entity_type, max_priority, max_risk_score, min_authority_level, require_audit_log, enabled, created_at, updated_at) FROM stdin;
1	evidence	medium	8	approve_low	t	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
2	control	medium	5	approve_low	t	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
3	policy	low	3	approve_medium	t	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
4	risk	low	5	approve_low	t	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
5	vendor	low	5	approve_medium	t	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
6	finding	low	3	approve_low	t	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
7	compliance_gap	medium	8	approve_low	t	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
8	governance_action	medium	8	approve_low	t	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
\.


ALTER TABLE __TENANT_SCHEMA__.auto_approval_config ENABLE TRIGGER ALL;

--
-- Data for Name: automated_insights; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.automated_insights DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.automated_insights (insight_id, insight_type, insight_category, title, description, severity, confidence_score, data_sources, evidence, affected_entities, recommended_actions, estimated_impact, implementation_effort, status, reviewed_by, reviewed_at, action_taken, valid_from, valid_until, generated_by, generation_method, created_at) FROM stdin;
9cb408fd-1f08-4554-b803-8c0228e0b313	risk_pattern	cybersecurity	Increasing Failed Authentication Attempts Detected	Analysis shows 300% increase in failed authentication attempts over the past 48 hours, primarily targeting privileged accounts. Pattern suggests potential targeted attack.	high	0.92	\N	\N	\N	[{"action": "Enable MFA for all privileged accounts", "priority": "immediate"}, {"action": "Review and update password policies", "priority": "high"}, {"action": "Implement account lockout after 3 failed attempts", "priority": "immediate"}]	{"cost": "Low", "risk_reduction": "85%", "implementation_time": "2 hours"}	\N	new	\N	\N	\N	2026-03-17 08:24:21.668446+08	\N	SYSTEM	\N	2026-03-17 08:24:21.668446+08
7934ffeb-1b23-49ca-a0c4-4a6dfc0990bc	compliance_gap	regulatory	PDPL Data Retention Policy Non-Compliance	Current data retention practices exceed PDPL requirements by average of 18 months. 230 data categories identified as retaining personal data beyond regulatory limits.	high	0.88	\N	\N	\N	[{"action": "Implement automated data disposal workflows", "priority": "high"}, {"action": "Update data retention policies", "priority": "medium"}, {"action": "Conduct data inventory and classification", "priority": "high"}]	{"penalty_avoidance": "Up to 5M SAR", "implementation_time": "30 days", "compliance_improvement": "95%"}	\N	new	\N	\N	\N	2026-03-17 08:24:21.668446+08	\N	SYSTEM	\N	2026-03-17 08:24:21.668446+08
56eb46a5-6a5c-46ae-b651-d9cc52a4f48d	performance_issue	operational	Evidence Collection SLA Breach Risk	Evidence collection process showing 35% degradation in performance. Current trajectory suggests SLA breaches within 5 days if not addressed.	medium	0.79	\N	\N	\N	[{"action": "Redistribute workload among teams", "priority": "immediate"}, {"action": "Automate routine evidence collection", "priority": "medium"}, {"action": "Add temporary resources to critical teams", "priority": "high"}]	{"efficiency_gain": "25%", "sla_improvement": "40%", "implementation_time": "1 week"}	\N	new	\N	\N	\N	2026-03-17 08:24:21.668446+08	\N	SYSTEM	\N	2026-03-17 08:24:21.668446+08
b5a6c1ce-c4f7-4bdb-82eb-05a3d1f5161a	opportunity	automation	Policy Review Process Automation Opportunity	Analysis identifies that 68% of policy reviews follow standard patterns. These could be automated, saving approximately 120 hours per quarter.	medium	0.85	\N	\N	\N	[{"action": "Implement policy review workflow automation", "priority": "medium"}, {"action": "Create standard review templates", "priority": "low"}, {"action": "Train AI model for policy gap detection", "priority": "medium"}]	{"cost_savings": "45,000 SAR/quarter", "time_savings": "120 hours/quarter", "quality_improvement": "30%"}	\N	new	\N	\N	\N	2026-03-17 08:24:21.668446+08	\N	SYSTEM	\N	2026-03-17 08:24:21.668446+08
\.


ALTER TABLE __TENANT_SCHEMA__.automated_insights ENABLE TRIGGER ALL;

--
-- Data for Name: automation_rules_legacy; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.automation_rules_legacy DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.automation_rules_legacy (rule_id, name, description, module, event, conditions, actions, enabled, lifecycle_phase, priority, created_by, created_at, updated_at, deleted_at) FROM stdin;
dbc1baf4-402b-4285-9e8a-cd4c976c7d6a	Notify risk_manager on new critical risk	\N	risks	created	{"risk_score": {"field": "risk_score", "value": 20, "operator": "gte"}}	[{"type": "notify_role", "config": {"body": "A new critical risk has been registered and requires immediate attention.", "role": "risk_manager", "title": "Critical Risk Created: {{entityId}}"}}]	t	assess	10	system	2026-03-17 08:24:19.559489+08	2026-03-17 08:24:19.559489+08	\N
f6d9d900-daa9-42fa-861d-7138bcd15109	Create task for high risk treatment	\N	risks	created	{"risk_score": {"field": "risk_score", "value": 15, "operator": "gte"}}	[{"type": "create_task", "config": {"title": "Develop treatment plan for risk {{entityId}}", "dueDays": 14, "priority": "high", "assigneeRole": "risk_manager"}}]	t	assess	8	system	2026-03-17 08:24:19.562361+08	2026-03-17 08:24:19.562361+08	\N
7b14e148-a106-44a4-b75a-a04f29837ac9	Require approval for risk acceptance	\N	risks	status_changed	{"status": {"field": "status", "value": "accepted", "operator": "eq"}}	[{"type": "require_approval", "config": {"title": "Risk acceptance requires approval", "slaHours": 72, "approverRole": "owner"}}]	t	assess	9	system	2026-03-17 08:24:19.563396+08	2026-03-17 08:24:19.563396+08	\N
7f1536d9-5038-4b14-acf9-2c7ae1505f5f	Notify compliance_officer on control implementation	\N	controls	status_changed	{"status": {"field": "status", "value": "implemented", "operator": "eq"}}	[{"type": "notify_role", "config": {"body": "A control has been marked as implemented. Please schedule testing.", "role": "compliance_officer", "title": "Control Implemented: {{entityId}}"}}]	t	implement	7	system	2026-03-17 08:24:19.564412+08	2026-03-17 08:24:19.564412+08	\N
91bd0f5b-72cd-4b3a-81fd-fc2e0fb77f22	Create testing task when control implemented	\N	controls	status_changed	{"status": {"field": "status", "value": "implemented", "operator": "eq"}}	[{"type": "create_task", "config": {"title": "Test control effectiveness: {{entityId}}", "dueDays": 30, "priority": "medium", "assigneeRole": "auditor"}}]	t	implement	6	system	2026-03-17 08:24:19.565626+08	2026-03-17 08:24:19.565626+08	\N
3bb4c4e9-f378-43a2-a225-a98b9caf5d82	Require approval for policy publication	\N	policies	status_changed	{"status": {"field": "status", "value": "review", "operator": "eq"}}	[{"type": "require_approval", "config": {"slaHours": 48, "approverRole": "compliance_officer"}}, {"type": "notify_role", "config": {"body": "A policy is ready for review and approval.", "role": "admin", "title": "Policy Review: {{entityId}}"}}]	t	design	9	system	2026-03-17 08:24:19.566415+08	2026-03-17 08:24:19.566415+08	\N
6ad938fe-ac5c-4f1f-87c4-647727bb7a51	Notify all on policy approval	\N	policies	approved	{}	[{"type": "notify_role", "config": {"body": "A policy has been approved and is now active.", "role": "compliance_officer", "title": "Policy Approved: {{entityId}}"}}]	t	design	5	system	2026-03-17 08:24:19.567158+08	2026-03-17 08:24:19.567158+08	\N
204be701-f067-487e-b44b-6661fc901e96	Create mapping task on new framework	\N	frameworks	created	{}	[{"type": "create_task", "config": {"title": "Map controls for framework {{entityId}}", "dueDays": 21, "priority": "high", "assigneeRole": "compliance_officer"}}, {"type": "notify_role", "config": {"body": "A new framework has been added. Please begin control mapping.", "role": "compliance_officer", "title": "New Framework Added: {{entityId}}"}}]	t	plan	8	system	2026-03-17 08:24:19.567952+08	2026-03-17 08:24:19.567952+08	\N
83b710e7-6a48-4359-875e-d48bcded8d5b	Notify control owner on evidence upload	\N	evidence	created	{}	[{"type": "notify_role", "config": {"body": "New evidence has been uploaded and requires verification.", "role": "compliance_officer", "title": "New Evidence Submitted: {{entityId}}"}}]	t	implement	5	system	2026-03-17 08:24:19.5688+08	2026-03-17 08:24:19.5688+08	\N
5e6db93f-24ae-418f-ad66-0883292159a8	Require approval when evidence task submitted	\N	evidence	task_submitted	{}	[{"type": "require_approval", "config": {"slaHours": 48, "approverRole": "auditor"}}, {"type": "notify_role", "config": {"body": "An evidence task has been submitted and requires review and approval.", "role": "auditor", "title": "Evidence Task Submitted: {{entityId}}"}}]	t	implement	8	system	2026-03-17 08:24:19.569633+08	2026-03-17 08:24:19.569633+08	\N
31f79402-5c8c-4998-a287-e1ad9e97ec6f	Notify auditor on evidence task approval	\N	evidence	task_approved	{}	[{"type": "notify_role", "config": {"body": "An evidence task has been approved. Evidence is now validated.", "role": "compliance_officer", "title": "Evidence Task Approved: {{entityId}}"}}, {"type": "record_activity", "config": {"summary": "Evidence task {{entityId}} approved"}}]	t	implement	6	system	2026-03-17 08:24:19.570464+08	2026-03-17 08:24:19.570464+08	\N
7f121f7d-efe6-45cf-8103-ccde85a23213	Create remediation task on evidence rejection	\N	evidence	task_rejected	{}	[{"type": "create_task", "config": {"title": "Re-submit rejected evidence: {{entityId}}", "dueDays": 7, "priority": "high", "assigneeRole": "compliance_officer"}}, {"type": "notify_role", "config": {"body": "An evidence task has been rejected. Please review and re-submit.", "role": "compliance_officer", "title": "Evidence Task Rejected: {{entityId}}"}}]	t	implement	9	system	2026-03-17 08:24:19.571183+08	2026-03-17 08:24:19.571183+08	\N
92e0c926-9a37-47db-8f4d-f4552609366c	Notify on new evidence version	\N	evidence	version_created	{}	[{"type": "notify_role", "config": {"body": "A new version of evidence has been submitted. Please re-verify.", "role": "auditor", "title": "Evidence Updated: {{entityId}}"}}]	t	implement	5	system	2026-03-17 08:24:19.571893+08	2026-03-17 08:24:19.571893+08	\N
e19a5f2d-e3c5-48c6-9547-314e85158c31	Log evidence collection run	\N	evidence	collected	{}	[{"type": "record_activity", "config": {"summary": "Evidence collection completed for connector {{entityId}}"}}, {"type": "notify_role", "config": {"body": "Automated evidence collection has completed.", "role": "compliance_officer", "title": "Evidence Collected: {{entityId}}"}}]	t	operate	4	system	2026-03-17 08:24:19.572628+08	2026-03-17 08:24:19.572628+08	\N
e3467fed-ce0d-450f-b040-5988d8d2a436	Escalate critical incident	\N	incidents	created	{"severity": {"field": "severity", "value": "critical", "operator": "eq"}}	[{"type": "notify_role", "config": {"body": "A critical incident has been reported requiring immediate executive attention.", "role": "owner", "title": "CRITICAL Incident: {{entityId}}"}}, {"type": "notify_role", "config": {"body": "A critical incident has been reported.", "role": "admin", "title": "CRITICAL Incident: {{entityId}}"}}, {"type": "create_task", "config": {"title": "Investigate critical incident {{entityId}}", "dueDays": 1, "priority": "critical", "assigneeRole": "admin"}}]	t	operate	10	system	2026-03-17 08:24:19.573329+08	2026-03-17 08:24:19.573329+08	\N
16082f38-7b7f-4b7d-9c51-55cb159849c0	Create investigation task for incidents	\N	incidents	created	{}	[{"type": "create_task", "config": {"title": "Investigate incident {{entityId}}", "dueDays": 7, "priority": "high", "assigneeRole": "risk_manager"}}]	t	operate	6	system	2026-03-17 08:24:19.574071+08	2026-03-17 08:24:19.574071+08	\N
a29cadb4-80f1-43c4-a538-c343a4d59072	Notify risk_manager on new vendor	\N	vendors	created	{}	[{"type": "create_task", "config": {"title": "Assess vendor risk: {{entityId}}", "dueDays": 14, "priority": "medium", "assigneeRole": "risk_manager"}}, {"type": "notify_role", "config": {"body": "A new vendor requires a risk assessment.", "role": "risk_manager", "title": "New Vendor Added: {{entityId}}"}}]	t	assess	7	system	2026-03-17 08:24:19.574913+08	2026-03-17 08:24:19.574913+08	\N
7cd5f0d7-ea46-4190-89f7-92828ee03c2c	Notify team on assessment completion	\N	assessments	status_changed	{"status": {"field": "status", "value": "completed", "operator": "eq"}}	[{"type": "notify_role", "config": {"body": "An assessment has been completed. Please review the results.", "role": "compliance_officer", "title": "Assessment Completed: {{entityId}}"}}]	t	assure	6	system	2026-03-17 08:24:19.575578+08	2026-03-17 08:24:19.575578+08	\N
8d1be5ce-a30b-4554-9dc8-951150c7c464	Require approval for exception	\N	exceptions	created	{}	[{"type": "require_approval", "config": {"slaHours": 48, "approverRole": "compliance_officer"}}, {"type": "notify_role", "config": {"body": "A new compliance exception has been requested and needs approval.", "role": "admin", "title": "Exception Request: {{entityId}}"}}]	t	operate	9	system	2026-03-17 08:24:19.576444+08	2026-03-17 08:24:19.576444+08	\N
66a50969-7c34-4825-b512-4b13ac4d9aed	Create remediation task for findings	\N	findings	created	{}	[{"type": "create_task", "config": {"title": "Remediate finding: {{entityId}}", "dueDays": 30, "priority": "high", "assigneeRole": "compliance_officer"}}, {"type": "notify_role", "config": {"body": "A new audit finding has been recorded.", "role": "auditor", "title": "New Finding: {{entityId}}"}}]	t	assure	8	system	2026-03-17 08:24:19.577021+08	2026-03-17 08:24:19.577021+08	\N
f0893869-3091-4208-a67c-190eab546d8d	Escalate critical findings	\N	findings	created	{"severity": {"field": "severity", "value": "critical", "operator": "eq"}}	[{"type": "notify_role", "config": {"body": "A critical audit finding requires executive attention.", "role": "owner", "title": "CRITICAL Finding: {{entityId}}"}}]	t	assure	10	system	2026-03-17 08:24:19.577678+08	2026-03-17 08:24:19.577678+08	\N
0dbe56e6-d910-480e-bc80-132b058217d6	Notify on critical asset registration	\N	assets	created	{"criticality": {"field": "criticality", "value": "critical", "operator": "eq"}}	[{"type": "notify_role", "config": {"body": "A critical asset has been added to the inventory.", "role": "admin", "title": "Critical Asset Registered: {{entityId}}"}}, {"type": "create_task", "config": {"title": "Define controls for critical asset {{entityId}}", "dueDays": 14, "priority": "high", "assigneeRole": "compliance_officer"}}]	t	plan	8	system	2026-03-17 08:24:19.578324+08	2026-03-17 08:24:19.578324+08	\N
dfc8ac3c-743a-4558-914a-efad9965a63d	Notify compliance officer on training campaign launch	\N	training	campaign_launched	{}	[{"type": "notify_role", "config": {"body": "A new training campaign is active. Review assigned users and deadlines.", "role": "compliance_officer", "title": "Training Campaign Launched: {{entityId}}"}}]	t	operate	6	system	2026-03-17 08:24:19.578944+08	2026-03-17 08:24:19.578944+08	\N
04675854-85d8-457c-b0d2-a10902ea3a69	Create remediation task for overdue training	\N	training	assignment_overdue	{}	[{"type": "create_task", "config": {"title": "Resolve overdue training assignments", "dueDays": 7, "priority": "high", "assigneeRole": "compliance_officer"}}, {"type": "notify_role", "config": {"body": "Training assignments are past due. Immediate follow-up required.", "role": "admin", "title": "Training Overdue Alert"}}]	t	operate	8	system	2026-03-17 08:24:19.579583+08	2026-03-17 08:24:19.579583+08	\N
b89fea88-4ea2-4594-a0a4-d71c52c2bf04	Notify admin on certification expiry	\N	training	certification_expiring	{}	[{"type": "notify_role", "config": {"body": "Training certifications are about to expire. Schedule recertification.", "role": "admin", "title": "Certifications Expiring Soon"}}]	t	operate	7	system	2026-03-17 08:24:19.580184+08	2026-03-17 08:24:19.580184+08	\N
\.


ALTER TABLE __TENANT_SCHEMA__.automation_rules_legacy ENABLE TRIGGER ALL;

--
-- Data for Name: automation_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.automation_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.automation_log (log_id, rule_id, event, module, entity_type, entity_id, actions_executed, status, error, triggered_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.automation_log ENABLE TRIGGER ALL;

--
-- Data for Name: automation_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.automation_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.automation_rules (rule_id, rule_code, rule_name, rule_description, rule_category, trigger_event, trigger_conditions, condition_logic, actions, action_parameters, execution_order, stop_on_match, active, test_mode, test_until, execution_count, success_count, failure_count, last_executed_at, avg_execution_time_ms, created_by, created_at, updated_at) FROM stdin;
24d51db4-9387-4b28-85c5-97ed94c8269e	RACI_AUTO_ASSIGN_EVIDENCE	Auto-assign evidence tasks based on RACI	Automatically assigns evidence collection tasks to responsible teams per RACI matrix	assignment	evidence_request_created	{"auto_assign": true, "entity_type": "evidence_request"}	AND	[{"action": "assign_to_team", "use_raci": true, "raci_role": "responsible", "domain_code": "EVIDENCE", "process_code": "COLLECTION"}]	\N	10	f	t	f	\N	0	0	0	\N	\N	\N	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08
0d2a6762-06df-45e8-9aeb-02b99d1cf40d	RACI_ESCALATE_SLA_BREACH	Escalate to accountable team on SLA breach	Escalates tasks to accountable team when SLA is breached	escalation	sla_breach	{"breach_percentage": 100, "use_raci_escalation": true}	AND	[{"action": "escalate_to_team", "use_raci": true, "raci_role": "accountable", "notification_priority": "high"}]	\N	20	f	t	f	\N	0	0	0	\N	\N	\N	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08
175ed239-59c3-4d16-8077-adc760767dee	AUTO_VALIDATE_EVIDENCE	Auto-validate standard evidence formats	Automatically validates evidence that meets standard format requirements	validation	evidence_submitted	{"evidence_types": ["security_logs", "access_reports", "scan_results"], "format_compliant": true}	AND	[{"action": "validate_evidence", "validation_type": "format"}, {"action": "validate_evidence", "validation_type": "completeness"}, {"action": "approve_if_valid", "conditions": {"validation_score": ">= 90"}}]	\N	5	f	t	f	\N	0	0	0	\N	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
52d9576a-9d3c-4c08-b924-bd07a25934f1	AUTO_CREATE_REMEDIATION	Auto-create remediation tasks for failed controls	Creates remediation action items when controls fail testing	workflow	control_test_failed	{"failure_type": ["design", "operating"], "control_criticality": ["critical", "high"]}	AND	[{"type": "remediation", "action": "create_action_item"}, {"action": "assign_to_team", "use_raci": true}, {"action": "set_sla", "based_on": "control_criticality"}, {"action": "notify_stakeholders", "include": ["process_owner", "erm", "audit"]}]	{"priority_mapping": {"low": "low", "high": "high", "medium": "medium", "critical": "critical"}}	15	f	t	f	\N	0	0	0	\N	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
fe014963-56d8-49be-b37b-900f7b49245c	SMART_ESCALATION	Smart escalation based on context	Intelligently escalates based on issue type, severity, and time	escalation	sla_warning	{"priority": ["critical", "high"], "breach_percentage": ">= 75"}	AND	[{"action": "analyze_context", "factors": ["issue_type", "team_workload", "dependencies"]}, {"action": "determine_escalation_path", "use_raci": true, "consider_availability": true}, {"action": "escalate_with_context", "suggest_actions": true, "include_analysis": true}]	\N	25	f	t	f	\N	0	0	0	\N	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
603524cd-8f29-4d54-b70b-601558a64b7c	EVIDENCE_EXPIRY_WARNING	Warn before evidence expires	Sends warnings before evidence expires and needs renewal	notification	evidence_expiry_approaching	{"days_until_expiry": "<= 30", "evidence_criticality": ["critical", "high"]}	AND	[{"action": "create_renewal_task", "lead_time_days": 30}, {"action": "notify_owner", "frequency": "weekly"}, {"action": "escalate_if_ignored", "after_days": 14}]	\N	30	f	t	f	\N	0	0	0	\N	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
\.


ALTER TABLE __TENANT_SCHEMA__.automation_rules ENABLE TRIGGER ALL;

--
-- Data for Name: autonomous_workflow_config; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.autonomous_workflow_config DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.autonomous_workflow_config (config_id, enabled, sla_grace_multiplier, ai_can_execute_actions, ai_can_draft_approvals, require_human_review, cron_interval_minutes, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.autonomous_workflow_config ENABLE TRIGGER ALL;

--
-- Data for Name: bcm_audit_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.bcm_audit_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.bcm_audit_log (log_id, entity_type, entity_id, action, actor_id, actor_role, before_state, after_state, change_summary, ip_address, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.bcm_audit_log ENABLE TRIGGER ALL;

--
-- Data for Name: bcm_dependency_maps; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.bcm_dependency_maps DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.bcm_dependency_maps (map_id, title, description, map_type, status, owner_id, last_reviewed_at, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.bcm_dependency_maps ENABLE TRIGGER ALL;

--
-- Data for Name: bcm_dependency_nodes; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.bcm_dependency_nodes DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.bcm_dependency_nodes (node_id, map_id, node_type, node_name, node_ref_id, criticality, rto_hours, owner_id, metadata, position_x, position_y, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.bcm_dependency_nodes ENABLE TRIGGER ALL;

--
-- Data for Name: bcm_dependency_edges; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.bcm_dependency_edges DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.bcm_dependency_edges (edge_id, map_id, source_node_id, target_node_id, dependency_type, criticality, latency_tolerance_mins, notes, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.bcm_dependency_edges ENABLE TRIGGER ALL;

--
-- Data for Name: bcm_maturity_assessments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.bcm_maturity_assessments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.bcm_maturity_assessments (assessment_id, title, framework, status, assessor_id, assessment_date, overall_score, overall_level, domain_scores, strengths, weaknesses, recommendations, target_level, target_date, previous_assessment_id, improvement_delta, attachments, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.bcm_maturity_assessments ENABLE TRIGGER ALL;

--
-- Data for Name: bia_assessments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.bia_assessments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.bia_assessments (bia_id, title, description, status, assessment_type, scope, department_id, business_unit_id, assessor_id, reviewer_id, approved_by, approved_at, valid_until, rto_hours, rpo_hours, mtpd_hours, criticality_rating, financial_impact, operational_impact, reputational_impact, regulatory_impact, dependencies, resources_required, wizard_state, wizard_step, attachments, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.bia_assessments ENABLE TRIGGER ALL;

--
-- Data for Name: bcm_recovery_strategies; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.bcm_recovery_strategies DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.bcm_recovery_strategies (strategy_id, title, description, strategy_type, status, bia_id, bcp_plan_id, target_rto_hours, target_rpo_hours, cost_estimate, resources_needed, prerequisites, implementation_steps, activation_procedure, owner_id, approved_by, approved_at, last_tested_at, test_result, attachments, metadata, created_at, updated_at, deleted_at) FROM stdin;
632e2bad-3477-4eae-90cc-befad023ef89	Hot Standby Data Center	Fully mirrored DC with automatic failover	technology	approved	\N	\N	1	0.5	{"sar": 500000}	[]	[]	[]	\N	\N	\N	\N	\N	\N	[]	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
5f2bb0ee-15fa-4c1c-88b3-afb8617e77f4	Warm Standby DR Site	Pre-configured DR site with 4-hour data sync	technology	approved	\N	\N	4	4	{"sar": 200000}	[]	[]	[]	\N	\N	\N	\N	\N	\N	[]	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
a1b3fc72-8054-497c-aea0-c01a3edf0932	Cold Site Recovery	Basic infrastructure with manual rebuild	facility	draft	\N	\N	48	24	{"sar": 50000}	[]	[]	[]	\N	\N	\N	\N	\N	\N	[]	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
5e519377-e12e-4609-8376-392c383d89b9	Cloud-Based DR	Azure/AWS cloud-based disaster recovery	technology	approved	\N	\N	2	1	{"sar": 150000}	[]	[]	[]	\N	\N	\N	\N	\N	\N	[]	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
a0201be8-688b-45d6-b2a9-6553ac3473f8	Manual Workaround	Paper-based manual procedures for critical processes	process	approved	\N	\N	8	8	{"sar": 10000}	[]	[]	[]	\N	\N	\N	\N	\N	\N	[]	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
\.


ALTER TABLE __TENANT_SCHEMA__.bcm_recovery_strategies ENABLE TRIGGER ALL;

--
-- Data for Name: bcp_activations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.bcp_activations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.bcp_activations (activation_id, bcp_plan_id, incident_id, title, status, activated_by, activated_at, deactivated_at, deactivated_by, activation_reason, command_center, recovery_steps, communications_log, resource_allocation, status_updates, actual_rto_hours, actual_rpo_hours, post_activation_review, lessons_learned, metadata, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.bcp_activations ENABLE TRIGGER ALL;

--
-- Data for Name: bcp_exercises; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.bcp_exercises DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.bcp_exercises (exercise_id, bcp_plan_id, title, exercise_type, status, scenario, objectives, scope, facilitator_id, scheduled_date, actual_start, actual_end, duration_hours, participants, observers, inject_sequence, results_summary, rto_achieved, rpo_achieved, actual_rto_hours, actual_rpo_hours, score, max_score, pass_threshold, passed, gaps_identified, lessons_learned, corrective_actions, next_exercise_date, attachments, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.bcp_exercises ENABLE TRIGGER ALL;

--
-- Data for Name: bcp_exercise_results; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.bcp_exercise_results DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.bcp_exercise_results (result_id, exercise_id, objective_ref, result_type, description, severity, assigned_to, due_date, resolution_status, resolved_at, resolution_notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.bcp_exercise_results ENABLE TRIGGER ALL;

--
-- Data for Name: bcp_plans; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.bcp_plans DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.bcp_plans (plan_id, title, type, content, test_schedule, last_tested_at, status, created_at, is_training, deleted_at, owner_team_id, owner_dept_id, bia_id, maturity_level, last_exercise_at, next_exercise_date, review_frequency_days, next_review_date) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.bcp_plans ENABLE TRIGGER ALL;

--
-- Data for Name: bcp_recovery_step_tracking; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.bcp_recovery_step_tracking DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.bcp_recovery_step_tracking (step_id, activation_id, strategy_id, step_number, title, description, assigned_to, assigned_team_id, status, started_at, completed_at, target_duration_mins, actual_duration_mins, blockers, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.bcp_recovery_step_tracking ENABLE TRIGGER ALL;

--
-- Data for Name: bcp_team_distribution; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.bcp_team_distribution DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.bcp_team_distribution (dist_id, team_code, raci_role, plan_type, is_active, created_at) FROM stdin;
900752bc-d324-4a3c-a92f-1bb0493557c3	IT_OPS	responsible	all	t	2026-03-17 08:24:23.408019+08
158ee014-ecd4-4c45-ac17-5cfebf11c0b1	RISK	accountable	all	t	2026-03-17 08:24:23.408019+08
790cbcdd-3863-46f5-8125-f3b05683fab6	SEC_OPS	consulted	all	t	2026-03-17 08:24:23.408019+08
e3339fc8-11a4-49af-b42b-c807f49b858a	EXEC	informed	all	t	2026-03-17 08:24:23.408019+08
c225093b-e64c-4f3f-8f33-08dc854329a1	HR	consulted	pandemic	t	2026-03-17 08:24:23.408019+08
\.


ALTER TABLE __TENANT_SCHEMA__.bcp_team_distribution ENABLE TRIGGER ALL;

--
-- Data for Name: bia_process_impacts; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.bia_process_impacts DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.bia_process_impacts (impact_id, bia_id, process_name, process_owner, criticality, rto_hours, rpo_hours, mtpd_hours, peak_periods, impact_0h, impact_4h, impact_24h, impact_72h, impact_1w, workaround, min_staff_count, min_resources, upstream_deps, downstream_deps, display_order, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.bia_process_impacts ENABLE TRIGGER ALL;

--
-- Data for Name: board_attention_items; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.board_attention_items DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.board_attention_items (id, tenant_id, title, summary, source_module, source_entity_type, source_entity_id, severity, rationale, status, traceability_json, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.board_attention_items ENABLE TRIGGER ALL;

--
-- Data for Name: board_packs; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.board_packs DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.board_packs (pack_id, tenant_id, title_en, title_ar, meeting_date, status, prepared_by, approved_by, approved_at, published_at, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.board_packs ENABLE TRIGGER ALL;

--
-- Data for Name: board_pack_items; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.board_pack_items DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.board_pack_items (item_id, pack_id, item_type, title, content, sort_order, source_entity_type, source_entity_id, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.board_pack_items ENABLE TRIGGER ALL;

--
-- Data for Name: organizations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.organizations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.organizations (org_id, tenant_id, name_en, name_ar, org_type, parent_org_id, status, metadata, created_at, updated_at, deleted_at, created_by, updated_by, cr_number, cr_700_number, vat_number, isic_code, legal_structure, fiscal_year_end, regulator_ids, data_classification) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.organizations ENABLE TRIGGER ALL;

--
-- Data for Name: business_units; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.business_units DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.business_units (bu_id, org_id, name_en, name_ar, code, head_user_id, status, metadata, created_at, updated_at, deleted_at, created_by, updated_by, nca_scope, sama_scope, cma_scope, sdaia_scope, risk_tier, data_classification, org_unit_id, description_ar) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.business_units ENABLE TRIGGER ALL;

--
-- Data for Name: ucf_controls; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ucf_controls DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ucf_controls (control_id, code, title, objective_en, objective_ar, activity_en, activity_ar, owner, frequency, lifecycle_state, evidence_requirements, test_steps, exception_rules, pack_id, created_at, updated_at, category, mapped_frameworks, baseline_status, last_status_change) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ucf_controls ENABLE TRIGGER ALL;

--
-- Data for Name: cadence_tasks; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.cadence_tasks DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.cadence_tasks (task_id, control_id, period_type, period_start, period_end, task_type, assigned_to, status, due_date, completed_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.cadence_tasks ENABLE TRIGGER ALL;

--
-- Data for Name: capa_effectiveness_tests; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.capa_effectiveness_tests DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.capa_effectiveness_tests (id, tenant_id, capa_id, finding_id, test_date, tester_id, result, evidence_notes, reopen_finding, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.capa_effectiveness_tests ENABLE TRIGGER ALL;

--
-- Data for Name: ccm_cloud_mappings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ccm_cloud_mappings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ccm_cloud_mappings (mapping_id, control_id, cloud_provider, cloud_rule_id, enabled, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ccm_cloud_mappings ENABLE TRIGGER ALL;

--
-- Data for Name: ccm_cycle_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ccm_cycle_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ccm_cycle_log (cycle_id, controls_evaluated, stale_controls, escalations_triggered, risk_recalculated, cycle_ms, executed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ccm_cycle_log ENABLE TRIGGER ALL;

--
-- Data for Name: ccm_results; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ccm_results DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ccm_results (result_id, control_id, cloud_provider, resource_type, compliant, detail, checked_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ccm_results ENABLE TRIGGER ALL;

--
-- Data for Name: channels; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.channels DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.channels (channel_id, name, type, created_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.channels ENABLE TRIGGER ALL;

--
-- Data for Name: findings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.findings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.findings (finding_id, workspace_id, title, description, source_type, source_id, severity, status, remediation_id, lifecycle_phase, created_at, deleted_at, auditor_user_id, auditee_owner_user_id, approver_user_id, org_unit_id, created_by, owner_team_id, department_id, business_unit_id) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.findings ENABLE TRIGGER ALL;

--
-- Data for Name: closure_reviews; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.closure_reviews DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.closure_reviews (review_id, finding_id, reviewer_id, review_date, outcome, evidence_ids, comments, verified_effective, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.closure_reviews ENABLE TRIGGER ALL;

--
-- Data for Name: cmdb_connections; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.cmdb_connections DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.cmdb_connections (connection_id, name, cmdb_type, endpoint_url, auth_method, credentials_encrypted, sync_schedule_cron, sync_enabled, asset_class_filter, last_validated_at, validation_status, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.cmdb_connections ENABLE TRIGGER ALL;

--
-- Data for Name: cmdb_assets; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.cmdb_assets DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.cmdb_assets (cmdb_asset_id, connection_id, external_asset_id, asset_name, asset_class, asset_type, owner, department, location, criticality, status, os, ip_address, raw_data, linked_asset_id, last_synced_at, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.cmdb_assets ENABLE TRIGGER ALL;

--
-- Data for Name: cmdb_sync_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.cmdb_sync_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.cmdb_sync_history (sync_id, connection_id, status, assets_fetched, assets_created, assets_updated, errors, duration_ms, started_at, completed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.cmdb_sync_history ENABLE TRIGGER ALL;

--
-- Data for Name: command_palette_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.command_palette_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.command_palette_history (history_id, user_id, command_key, command_label, command_label_ar, command_category, usage_count, last_used_at, metadata, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.command_palette_history ENABLE TRIGGER ALL;

--
-- Data for Name: comments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.comments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.comments (comment_id, entity_type, entity_id, author_id, content, parent_comment_id, mentions, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.comments ENABLE TRIGGER ALL;

--
-- Data for Name: mandates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.mandates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.mandates (mandate_id, title_en, title_ar, description, source_type, source_reference, issuing_authority, effective_date, expiry_date, status, priority, jurisdiction, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.mandates ENABLE TRIGGER ALL;

--
-- Data for Name: obligations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.obligations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.obligations (obligation_id, mandate_id, title_en, title_ar, description, obligation_type, frequency, owner_id, status, priority, compliance_deadline, created_at, updated_at, deleted_at, owner_user_id, owner_team_id) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.obligations ENABLE TRIGGER ALL;

--
-- Data for Name: compliance_assertions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.compliance_assertions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.compliance_assertions (assertion_id, obligation_id, assertion_text, asserted_by, asserted_at, valid_until, status, confidence_level, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.compliance_assertions ENABLE TRIGGER ALL;

--
-- Data for Name: compliance_assertion_evidence; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.compliance_assertion_evidence DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.compliance_assertion_evidence (link_id, assertion_id, evidence_id, relevance_notes, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.compliance_assertion_evidence ENABLE TRIGGER ALL;

--
-- Data for Name: compliance_commitments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.compliance_commitments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.compliance_commitments (commitment_id, obligation_id, commitment_text, target_date, owner_id, status, progress_percent, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.compliance_commitments ENABLE TRIGGER ALL;

--
-- Data for Name: compliance_reviews; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.compliance_reviews DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.compliance_reviews (review_id, obligation_id, reviewer_id, review_type, outcome, findings, next_review_date, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.compliance_reviews ENABLE TRIGGER ALL;

--
-- Data for Name: compliance_scores; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.compliance_scores DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.compliance_scores (score_id, score_date, score_type, framework_code, domain_code, control_id, team_id, design_score, implementation_score, operational_score, overall_score, controls_tested, controls_passed, controls_failed, controls_not_applicable, evidence_coverage, previous_score, score_change, trend_direction, high_risk_findings, overdue_actions, upcoming_audits, calculated_at, calculation_method, data_quality_score, deleted_at) FROM stdin;
cc7c4c71-db0b-4b25-8d0a-1c4afcca7601	2026-03-17	framework	NCA-ECC	\N	\N	\N	85.50	78.20	82.00	81.90	145	119	26	\N	88.50	\N	\N	stable	0	0	0	2026-03-17 08:24:21.668446+08	weighted_average	\N	\N
510d56eb-f007-49ea-8b14-0e351ddf9e70	2026-03-17	framework	SAMA-CSF	\N	\N	\N	88.00	82.50	79.80	83.40	98	82	16	\N	91.20	\N	\N	improving	0	0	0	2026-03-17 08:24:21.668446+08	weighted_average	\N	\N
d4db32f6-1055-4b04-a3e8-9ba54900afe6	2026-03-17	framework	PDPL	\N	\N	\N	79.50	73.00	77.50	76.70	67	51	16	\N	85.00	\N	\N	improving	0	0	0	2026-03-17 08:24:21.668446+08	weighted_average	\N	\N
\.


ALTER TABLE __TENANT_SCHEMA__.compliance_scores ENABLE TRIGGER ALL;

--
-- Data for Name: connector_configs; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.connector_configs DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.connector_configs (connector_id, source_system_type, auth_method, credentials_encrypted, schedule, retry_policy, field_mapping, control_mappings, status, last_success_at, failure_count, created_at, owner_id, owner_team_id) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.connector_configs ENABLE TRIGGER ALL;

--
-- Data for Name: connector_executions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.connector_executions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.connector_executions (execution_id, connector_id, started_at, completed_at, status, records_collected, error_message) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.connector_executions ENABLE TRIGGER ALL;

--
-- Data for Name: connector_status_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.connector_status_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.connector_status_log (log_id, connector_id, from_status, to_status, changed_by, reason, changed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.connector_status_log ENABLE TRIGGER ALL;

--
-- Data for Name: connectors; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.connectors DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.connectors (connector_id, name, connector_type, endpoint_url, status, uptime_pct, latency_ms, failure_count, last_heartbeat, last_run, config, deleted_at, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.connectors ENABLE TRIGGER ALL;

--
-- Data for Name: consent_records; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.consent_records DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.consent_records (consent_id, subject_id, processing_purpose, consent_version, granted_at, withdrawn_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.consent_records ENABLE TRIGGER ALL;

--
-- Data for Name: content_pack_installations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.content_pack_installations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.content_pack_installations (installation_id, pack_id, version, status, installed_at, installed_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.content_pack_installations ENABLE TRIGGER ALL;

--
-- Data for Name: contextual_suggestions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.contextual_suggestions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.contextual_suggestions (suggestion_id, page_context, entity_type, entity_id, suggestion_type, title_en, title_ar, description_en, description_ar, action_url, priority, conditions, active, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.contextual_suggestions ENABLE TRIGGER ALL;

--
-- Data for Name: vendors; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendors DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendors (vendor_id, name, category, risk_tier, assessment_score, contract_expiry, sla_config, status, created_at, search_vector, is_training, deleted_at, workspace_id, lifecycle_phase, owner_team_id, owner_dept_id, dd_status, dd_valid_until, offboarding_status, monitoring_enabled, concentration_flags, fourth_party_count, owner_user_id, reviewer_user_id, approver_user_id, org_unit_id, created_by, dpia_required, dpia_completed_at, dpa_signed_at, sub_processor_registered, data_residency_country, data_classification_level, privacy_impact_score) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendors ENABLE TRIGGER ALL;

--
-- Data for Name: contracts; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.contracts DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.contracts (contract_id, vendor_id, title, contract_type, start_date, end_date, value, currency, status, owner_id, auto_renewal, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.contracts ENABLE TRIGGER ALL;

--
-- Data for Name: contract_control_links; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.contract_control_links DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.contract_control_links (link_id, contract_id, control_id, requirement_text, compliance_status, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.contract_control_links ENABLE TRIGGER ALL;

--
-- Data for Name: contract_tests; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.contract_tests DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.contract_tests (test_id, model_id, test_name, input_constraints, expected_output, actual_output, status, executed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.contract_tests ENABLE TRIGGER ALL;

--
-- Data for Name: control_actions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_actions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_actions (action_id, control_id, title, description, status, priority, assigned_to, due_date, completed_at, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_actions ENABLE TRIGGER ALL;

--
-- Data for Name: control_asset_links; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_asset_links DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_asset_links (link_id, control_id, asset_id, asset_type, link_purpose, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_asset_links ENABLE TRIGGER ALL;

--
-- Data for Name: control_categories; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_categories DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_categories (category_id, code, name_en, name_ar, description, parent_category_id, display_order, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_categories ENABLE TRIGGER ALL;

--
-- Data for Name: control_dependencies; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_dependencies DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_dependencies (dependency_id, workspace_id, source_control_id, target_control_id, dependency_type, description, is_active, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_dependencies ENABLE TRIGGER ALL;

--
-- Data for Name: control_design_reviews; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_design_reviews DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_design_reviews (review_id, control_id, reviewer_id, review_date, design_effectiveness, findings, recommendations, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_design_reviews ENABLE TRIGGER ALL;

--
-- Data for Name: control_effectiveness_scores; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_effectiveness_scores DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_effectiveness_scores (score_id, control_id, assessment_date, design_score, operating_score, overall_score, methodology, scored_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_effectiveness_scores ENABLE TRIGGER ALL;

--
-- Data for Name: control_evidence_requirements; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_evidence_requirements DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_evidence_requirements (requirement_id, control_id, evidence_type_code, required_cadence, min_quality_tier, freshness_days, approver_roles, is_mandatory, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_evidence_requirements ENABLE TRIGGER ALL;

--
-- Data for Name: control_exceptions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_exceptions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_exceptions (exception_id, workspace_id, title, description, control_id, risk_id, status, approved_by, expiry_date, lifecycle_phase, created_at, justification, compensating_controls, risk_impact, requested_by, requested_duration, approver_designation, approval_chain, updated_at, deleted_at, risk_accepted, approval_date, valid_from, valid_to, compensating_control_ids) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_exceptions ENABLE TRIGGER ALL;

--
-- Data for Name: control_failures; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_failures DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_failures (failure_id, control_id, failure_type, severity, description, detected_at, resolved_at, resolution_note, resolved_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_failures ENABLE TRIGGER ALL;

--
-- Data for Name: control_framework_mappings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_framework_mappings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_framework_mappings (mapping_id, control_id, framework_requirement_id, mapping_type, coverage_level, notes, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_framework_mappings ENABLE TRIGGER ALL;

--
-- Data for Name: control_issues; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_issues DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_issues (issue_id, control_id, title, description, severity, source, status, assigned_to, due_date, resolution, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_issues ENABLE TRIGGER ALL;

--
-- Data for Name: control_objectives; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_objectives DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_objectives (objective_id, code, title_en, title_ar, description, category_id, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_objectives ENABLE TRIGGER ALL;

--
-- Data for Name: control_obligation_mappings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_obligation_mappings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_obligation_mappings (mapping_id, control_id, obligation_id, mapping_type, coverage_percent, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_obligation_mappings ENABLE TRIGGER ALL;

--
-- Data for Name: control_operating_tests; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_operating_tests DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_operating_tests (test_id, control_id, test_type, tester_id, test_date, sample_size, sample_period_start, sample_period_end, test_procedure, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_operating_tests ENABLE TRIGGER ALL;

--
-- Data for Name: control_owners; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_owners DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_owners (owner_id, control_id, user_id, ownership_type, assigned_at, is_primary, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_owners ENABLE TRIGGER ALL;

--
-- Data for Name: control_policy_links; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_policy_links DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_policy_links (link_id, control_id, policy_id, link_type, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_policy_links ENABLE TRIGGER ALL;

--
-- Data for Name: control_risk_mappings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_risk_mappings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_risk_mappings (mapping_id, control_id, risk_id, mapping_type, effectiveness, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_risk_mappings ENABLE TRIGGER ALL;

--
-- Data for Name: control_schedules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_schedules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_schedules (schedule_id, control_id, schedule_type, cron_expression, next_due_at, last_completed_at, assigned_to, enabled, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_schedules ENABLE TRIGGER ALL;

--
-- Data for Name: control_status_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_status_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_status_history (history_id, control_id, previous_status, new_status, changed_by, reason, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_status_history ENABLE TRIGGER ALL;

--
-- Data for Name: control_team_distribution; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_team_distribution DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_team_distribution (distribution_id, team_code, control_domain, framework_refs, raci_role, notes, created_at) FROM stdin;
ac72b75e-eb00-4d93-8e0b-70f21508eea4	EXEC_STRATEGY	governance_policy_approval	{ISO27001-A5.1,NCA-ECC-1.1}	accountable	\N	2026-03-17 08:24:21.895808+08
0dfbb5dd-88a7-4450-81ef-05045c948288	EXEC_STRATEGY	strategic_risk_oversight	{COSO-ERM,ISO31000}	accountable	\N	2026-03-17 08:24:21.895808+08
ea50d6ca-2817-47f9-b872-efd2e2675890	EXEC_STRATEGY	enterprise_compliance_oversight	{NCA-ECC-1,ISO27001-A18}	accountable	\N	2026-03-17 08:24:21.895808+08
42f12064-2782-4713-bc19-a319b64bf18c	ERM	risk_identification	{ISO31000-6.4,NIST-CSF.ID.RA}	responsible	\N	2026-03-17 08:24:21.895808+08
71c8cdeb-a06c-4349-9257-3663dc3e9fc7	ERM	risk_assessment_scoring	{ISO31000-6.4.2,NIST-CSF.ID.RA-1}	responsible	\N	2026-03-17 08:24:21.895808+08
b264693a-71eb-47f7-84a8-f7f896c5d11b	ERM	risk_treatment_planning	{ISO31000-6.5,NIST-CSF.RS}	responsible	\N	2026-03-17 08:24:21.895808+08
50a58257-edb7-40e5-94ad-fe35115497bb	ERM	risk_register_management	{ISO31000,COSO-ERM}	responsible	\N	2026-03-17 08:24:21.895808+08
b038ecc9-2272-47bf-846d-ef7484bd14bf	ERM	kri_monitoring	{ISO31000-6.6,NIST-CSF.DE}	responsible	\N	2026-03-17 08:24:21.895808+08
f1da86b0-1c4d-4807-a13c-6797593fb4ab	ERM	risk_appetite_framework	{ISO31000-6.3,COSO-ERM}	responsible	\N	2026-03-17 08:24:21.895808+08
c55d64d1-6b9b-4d12-8082-7423f4c88c89	CYBER_GOV	access_control	{ISO27001-A9,NCA-ECC-2.1}	responsible	\N	2026-03-17 08:24:21.895808+08
85de8c2b-a46e-44ff-a4a8-adbd5580a66c	CYBER_GOV	cryptography_controls	{ISO27001-A10,NCA-ECC-2.3}	responsible	\N	2026-03-17 08:24:21.895808+08
63cce3ce-d1da-4edc-9f41-e99ec9c63868	CYBER_GOV	security_policy_management	{ISO27001-A5.1,NCA-ECC-1.1}	responsible	\N	2026-03-17 08:24:21.895808+08
17aeeb10-c922-47f6-ae03-347b4e8b8795	CYBER_GOV	supplier_security_management	{ISO27001-A15,NCA-ECC-3.3}	responsible	\N	2026-03-17 08:24:21.895808+08
0df2aa7b-8ec0-460d-9a0e-cc7b691ea8f7	CYBER_GOV	information_security_compliance	{ISO27001-A18,NCA-ECC-1.5}	responsible	\N	2026-03-17 08:24:21.895808+08
bb9f105e-4928-42da-9fc2-32dc2aab82f0	SOC_OPS	security_incident_management	{ISO27001-A16,NIST-CSF.RS,NCA-ECC-2.7}	responsible	\N	2026-03-17 08:24:21.895808+08
3a62f59d-b2bf-461d-81d3-d1efcf76027e	SOC_OPS	security_monitoring_logging	{ISO27001-A12.4,NCA-ECC-2.6}	responsible	\N	2026-03-17 08:24:21.895808+08
cdac7d69-38ca-4547-ab82-2aab1f170423	SOC_OPS	vulnerability_management	{NIST-CSF.ID.RA-1,NCA-ECC-2.5}	responsible	\N	2026-03-17 08:24:21.895808+08
f9bd9350-f182-4f25-83e5-8156ffa3c04f	SOC_OPS	threat_intelligence	{NIST-CSF.ID.TA,NCA-ECC-2.6.2}	responsible	\N	2026-03-17 08:24:21.895808+08
3d6588ca-c1b5-4415-b6d1-c11eb921c046	IAM_GOV	identity_lifecycle_management	{ISO27001-A9.2,NIST-CSF.PR.AC-1}	responsible	\N	2026-03-17 08:24:21.895808+08
4c6b660e-c79a-41e9-a0dc-5ecf5a9abdb4	IAM_GOV	privileged_access_management	{ISO27001-A9.4,NCA-ECC-2.1.3}	responsible	\N	2026-03-17 08:24:21.895808+08
e194b46e-ef4d-4ec1-895a-91b4b251c14b	IAM_GOV	access_review_certification	{ISO27001-A9.2.5,NCA-ECC-2.1.4}	responsible	\N	2026-03-17 08:24:21.895808+08
82116116-d5c6-4e03-9dd5-b91868cb3dbb	IAM_GOV	authentication_mfa_controls	{ISO27001-A9.3,NIST-CSF.PR.AC-7}	responsible	\N	2026-03-17 08:24:21.895808+08
4933d362-d493-4010-bade-efddf0c274da	DATA_GOV	data_classification	{ISO27001-A8.2,PDPL-Art9}	responsible	\N	2026-03-17 08:24:21.895808+08
4aaadb15-c2b4-4d3c-baa0-585f9a38921b	DATA_GOV	asset_inventory_management	{ISO27001-A8.1,NCA-ECC-2.2}	responsible	\N	2026-03-17 08:24:21.895808+08
ce3a6c82-a399-4faf-a3bb-f3386dcecf95	DATA_GOV	data_retention_disposal	{ISO27001-A8.3,PDPL-Art19}	responsible	\N	2026-03-17 08:24:21.895808+08
29810820-9df7-4d41-8462-90a36c48f775	PRIVACY	privacy_notice_transparency	{PDPL-Art11,ISO27701-7.3}	responsible	\N	2026-03-17 08:24:21.895808+08
a9ea63d5-f778-4b64-9a25-d231991da944	PRIVACY	consent_management	{PDPL-Art10,ISO27701-7.2}	responsible	\N	2026-03-17 08:24:21.895808+08
7eee95df-30bd-4bf4-a648-10700e00c21e	PRIVACY	data_subject_rights_handling	{PDPL-Art12-18,ISO27701-7.3.9}	responsible	\N	2026-03-17 08:24:21.895808+08
90839d3b-08ec-42d3-a388-936f23d5f313	PRIVACY	pdpl_breach_notification	{PDPL-Art24,NCA-ECC-2.7}	responsible	\N	2026-03-17 08:24:21.895808+08
c06ad216-4887-4360-85f3-022a7ffc62ea	PRIVACY	privacy_impact_assessment	{PDPL-Art29,ISO27701-7.4}	responsible	\N	2026-03-17 08:24:21.895808+08
a8eabeba-7be8-4634-93f1-d45d59c10d9b	AUDIT	control_design_testing	{ISO27001-A18.2,SOC2-CC4}	responsible	\N	2026-03-17 08:24:21.895808+08
eb33e2ea-5322-43d0-8b85-38bed39bac29	AUDIT	internal_audit_planning	{IIA-IPPF-2000,ISO27001-A18}	responsible	\N	2026-03-17 08:24:21.895808+08
72c38e7d-ec57-476f-85de-92a46cbce041	AUDIT	audit_finding_management	{IIA-IPPF-2400,ISO27001-A18.2}	responsible	\N	2026-03-17 08:24:21.895808+08
62e5d33c-de10-497e-8088-e8f9da1c8182	AUDIT	continuous_monitoring	{IIA-IPPF-2060,NIST-CSF.DE.CM}	responsible	\N	2026-03-17 08:24:21.895808+08
047777b7-9553-4448-a14a-c06d05d96196	BCM_DR	bcp_planning_maintenance	{ISO22301-8.4,ISO27001-A17.1}	responsible	\N	2026-03-17 08:24:21.895808+08
bb8880c6-3f69-4605-a9e5-64bb688868a3	BCM_DR	disaster_recovery_testing	{ISO22301-8.5,NCA-ECC-3.1}	responsible	\N	2026-03-17 08:24:21.895808+08
46e9f5fd-56fc-409f-abaf-47ae65156cb3	BCM_DR	rto_rpo_management	{ISO22301-8.3,NIST-CSF.RC}	responsible	\N	2026-03-17 08:24:21.895808+08
9d852e21-95b1-4b65-8907-caa01a23a2ac	CLOUD_INFRA	cloud_security_configuration	{ISO27001-A12,NCA-ECC-2.4,CSA-CCM}	responsible	\N	2026-03-17 08:24:21.895808+08
558eef1c-5bd6-4d72-b564-207f78519acc	CLOUD_INFRA	patch_vulnerability_management	{NCA-ECC-2.5,NIST-SP800-40}	responsible	\N	2026-03-17 08:24:21.895808+08
fb4b9779-603f-4ef1-98dd-26757ffa002d	CLOUD_INFRA	network_security_controls	{ISO27001-A13,NCA-ECC-2.4.3}	responsible	\N	2026-03-17 08:24:21.895808+08
49ca5cbf-7844-488f-a231-83cfb6b163d3	APP_ENG	secure_development_lifecycle	{ISO27001-A14,NIST-SP800-218}	responsible	\N	2026-03-17 08:24:21.895808+08
e40c7024-13af-4431-88c9-1aaadaa37f56	APP_ENG	change_management_controls	{ISO27001-A12.1,ITIL-SM}	responsible	\N	2026-03-17 08:24:21.895808+08
d7d7cc17-e6d8-44b9-ad35-d84485b7eb46	APP_ENG	application_security_testing	{ISO27001-A14.2,OWASP-SAMM}	responsible	\N	2026-03-17 08:24:21.895808+08
6b28cac6-55a1-43eb-b5fc-f4df6fa546bd	ENT_ARCH	architecture_security_review	{ISO27001-A14.1,TOGAF,SABSA}	responsible	\N	2026-03-17 08:24:21.895808+08
96665550-8e63-43c1-9a1c-004e07110f00	ENT_ARCH	technology_risk_governance	{ISO27001-A6.1,COBIT-APO12}	responsible	\N	2026-03-17 08:24:21.895808+08
28ae51d7-8d25-45bc-a464-f88bb382eee9	PMO	project_risk_controls	{ISO27001-A6.1.5,PMBOK}	responsible	\N	2026-03-17 08:24:21.895808+08
fa34fa7f-53b8-4252-a619-57383cb33877	SVC_OPS	operational_incident_handling	{ISO27001-A16.1,ITIL-IM}	responsible	\N	2026-03-17 08:24:21.895808+08
c3aebe42-ba23-438c-a6ea-d2c02b84b7da	SVC_OPS	service_continuity_controls	{ISO27001-A17,ITIL-SCONM}	responsible	\N	2026-03-17 08:24:21.895808+08
25eff5f8-ab07-4aa4-bb9f-c64d8c6bbf30	VENDOR_RISK	vendor_due_diligence	{ISO27001-A15.1,NCA-ECC-3.3.1}	responsible	\N	2026-03-17 08:24:21.895808+08
c971932b-a405-4e87-87a3-b755ba3ea76b	VENDOR_RISK	contract_security_requirements	{ISO27001-A15.1.2,PDPL-Art28}	responsible	\N	2026-03-17 08:24:21.895808+08
8627930f-74c8-4dff-933a-06df96924b14	VENDOR_RISK	vendor_performance_monitoring	{ISO27001-A15.2,NCA-ECC-3.3.3}	responsible	\N	2026-03-17 08:24:21.895808+08
cc5406c4-236e-465b-a465-07555812e055	HR_GOV	security_awareness_training	{ISO27001-A7.2.2,NCA-ECC-1.4}	responsible	\N	2026-03-17 08:24:21.895808+08
7d41c392-786f-4068-995a-5d841ca43fb0	HR_GOV	background_screening	{ISO27001-A7.1,NCA-ECC-1.3}	responsible	\N	2026-03-17 08:24:21.895808+08
1d8b479c-c191-4ffb-8aef-41ad844780be	HR_GOV	hr_offboarding_security	{ISO27001-A7.3,NCA-ECC-1.3.3}	responsible	\N	2026-03-17 08:24:21.895808+08
c909c46d-e717-4a28-ba72-b05d006bc99c	FINANCE	financial_reporting_controls	{COSO-IC,SOX-302,SOX-404}	responsible	\N	2026-03-17 08:24:21.895808+08
90c80ee7-fd91-4a6c-a0e9-7a16539c3b79	FINANCE	fraud_prevention_controls	{COSO-IC,ISO37001}	responsible	\N	2026-03-17 08:24:21.895808+08
483c8d7a-af78-4a3e-8950-6607400372ba	QUALITY	quality_management_system	{ISO9001-8,ISO27001-A10}	responsible	\N	2026-03-17 08:24:21.895808+08
49cecd2e-09be-4fa6-86f4-1cc4683b0081	QUALITY	document_control	{ISO9001-7.5,ISO27001-A5.1}	responsible	\N	2026-03-17 08:24:21.895808+08
\.


ALTER TABLE __TENANT_SCHEMA__.control_team_distribution ENABLE TRIGGER ALL;

--
-- Data for Name: control_test_procedures; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_test_procedures DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_test_procedures (procedure_id, workspace_id, control_id, procedure_name, objective, test_type, frequency, steps, expected_outcome, tools_required, sample_size, sampling_method, pass_criteria, fail_criteria, "references", owner_role, estimated_hours, is_automated, automation_script, framework_code, is_active, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_test_procedures ENABLE TRIGGER ALL;

--
-- Data for Name: control_test_results; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_test_results DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_test_results (result_id, procedure_id, control_id, workspace_id, test_date, tester_id, outcome, findings, evidence_ids, exceptions_count, population_size, sample_tested, exceptions_found, review_status, reviewed_by, reviewed_at, next_test_date, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_test_results ENABLE TRIGGER ALL;

--
-- Data for Name: control_tests; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_tests DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_tests (test_id, control_id, test_result, tester, notes, evidence_ref, tested_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_tests ENABLE TRIGGER ALL;

--
-- Data for Name: training_content; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.training_content DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.training_content (content_id, code, title, title_ar, description, content_type, category, difficulty_level, duration_minutes, passing_score, max_attempts, content_url, content_body, quiz_questions, prerequisites, tags, language, version, is_mandatory, is_active, valid_from, valid_until, recertification_days, author_id, approved_by, approved_at, attachments, metadata, created_at, updated_at, deleted_at) FROM stdin;
69e47a4a-97aa-460f-8663-0a6e81b0d6f8	SEC_AWARE_101	Security Awareness Fundamentals	أساسيات الوعي الأمني	\N	course	cybersecurity	beginner	30	70	3	\N	{}	[]	[]	{}	en	1.0	t	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:23.334954+08	2026-03-17 08:24:23.334954+08	\N
44956f11-ac8c-4d81-ae4c-60d2e12b6e59	PHISH_AWARE	Phishing Awareness	الوعي بالتصيد الإلكتروني	\N	course	phishing	beginner	20	70	3	\N	{}	[]	[]	{}	en	1.0	t	t	\N	\N	180	\N	\N	\N	[]	{}	2026-03-17 08:24:23.334954+08	2026-03-17 08:24:23.334954+08	\N
67add60d-a5ac-4096-928e-a745c8fcbd72	DATA_PRIVACY_101	Data Privacy Basics (PDPL)	أساسيات خصوصية البيانات	\N	course	data_privacy	beginner	25	70	3	\N	{}	[]	[]	{}	en	1.0	t	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:23.334954+08	2026-03-17 08:24:23.334954+08	\N
088695d6-8b27-440b-8509-1676c37f1d1e	INC_RESPONSE	Incident Response Procedure	إجراءات الاستجابة للحوادث	\N	course	incident_response	intermediate	40	70	3	\N	{}	[]	[]	{}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:23.334954+08	2026-03-17 08:24:23.334954+08	\N
13290cef-7bfd-43ad-9f09-b616e0049d97	BCP_AWARE	Business Continuity Awareness	الوعي باستمرارية الأعمال	\N	course	bcp_dr	beginner	20	70	3	\N	{}	[]	[]	{}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:23.334954+08	2026-03-17 08:24:23.334954+08	\N
392987c6-a3aa-4b91-85e0-25e672af47ff	RISK_MGMT_101	Risk Management Overview	نظرة عامة على إدارة المخاطر	\N	course	risk_management	beginner	30	70	3	\N	{}	[]	[]	{}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:23.334954+08	2026-03-17 08:24:23.334954+08	\N
fae23d3e-acf6-4d85-ae34-108e674b4487	COMPLIANCE_101	Compliance & Regulations (KSA)	الامتثال واللوائح السعودية	\N	course	regulatory	beginner	35	70	3	\N	{}	[]	[]	{}	en	1.0	t	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:23.334954+08	2026-03-17 08:24:23.334954+08	\N
1190dc2e-deaf-47a8-a1ef-4520c5b7a1df	ETHICS_CODE	Code of Ethics & Conduct	ميثاق أخلاقيات العمل	\N	policy_read	ethics	beginner	15	70	3	\N	{}	[]	[]	{}	en	1.0	t	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:23.334954+08	2026-03-17 08:24:23.334954+08	\N
a5e63615-6387-43b4-87a5-aa8f3c752caf	VENDOR_SEC	Vendor Security Requirements	متطلبات أمن الموردين	\N	course	vendor_management	intermediate	25	70	3	\N	{}	[]	[]	{}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:23.334954+08	2026-03-17 08:24:23.334954+08	\N
754b70d1-c26a-4628-b4ca-456647a38294	GOVERNANCE_101	Corporate Governance Basics	أساسيات الحوكمة المؤسسية	\N	course	governance	beginner	30	70	3	\N	{}	[]	[]	{}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:23.334954+08	2026-03-17 08:24:23.334954+08	\N
94a6c477-7795-449a-97d8-ba1ead192da5	NCA_ECC_FOUND	NCA Essential Cybersecurity Controls (ECC)	ضوابط الأمن السيبراني الأساسية - NCA	Comprehensive coverage of NCA ECC 2.0 domains: Governance, Defense, Resilience, Third-Party, and Cloud Security. Required for all organizations under NCA mandate.	course	cybersecurity	intermediate	60	80	3	\N	{}	[]	[]	{nca,ecc,cybersecurity,mandatory,ksa}	en	1.0	t	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
aef9a910-501e-4086-88d4-9950076b36f5	NCA_CSCC_GOV	NCA Critical Systems Cybersecurity Controls	ضوابط الأمن السيبراني للأنظمة الحساسة	Covers NCA CSCC requirements for critical national infrastructure: SCADA/ICS security, OT/IT convergence, and sector-specific controls.	course	cybersecurity	advanced	45	80	3	\N	{}	[]	[]	{nca,cscc,critical-infrastructure,ot,ics}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
b18bf619-1740-4c45-9625-68532fa2b14e	NCA_DCC_CLOUD	NCA Data & Cloud Cybersecurity Controls	ضوابط الأمن السيبراني للبيانات والحوسبة السحابية	NCA DCC framework covering data classification, cloud security architecture, data residency, encryption, and multi-cloud governance.	course	cybersecurity	intermediate	40	75	3	\N	{}	[]	[]	{nca,dcc,cloud,data-classification,encryption}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
d0caaedf-21fb-43a1-8a72-7066871eed38	NCA_TCC_TELECOM	NCA Telecom & IT Cybersecurity Controls	ضوابط الأمن السيبراني لقطاع الاتصالات	Telecom-specific cybersecurity controls from NCA covering network infrastructure, signaling security (SS7/Diameter), 5G security, and subscriber data protection.	course	cybersecurity	advanced	50	80	3	\N	{}	[]	[]	{nca,tcc,telecom,5g,network-security}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
1c760788-3591-40ca-bca8-99f459432bd2	NCA_INCIDENT	NCA Cybersecurity Incident Management	إدارة حوادث الأمن السيبراني - NCA	NCA incident reporting requirements, CERT-SA coordination, mandatory disclosure timelines, incident classification, and post-incident review procedures.	course	incident_response	intermediate	35	75	3	\N	{}	[]	[]	{nca,incident,cert-sa,mandatory-reporting}	en	1.0	t	t	\N	\N	180	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
b1c2a7e6-3434-4be8-ad0c-baaa4aeb46c1	SAMA_CSF_CORE	SAMA Cyber Security Framework (CSF 2.0)	إطار الأمن السيبراني للبنك المركزي السعودي	Complete SAMA CSF 2.0 coverage: 5 domains (Governance, Defense, Resilience, Third-Party, Cloud), 37 controls, maturity levels L1-L5. Required for all SAMA-regulated entities.	course	compliance	advanced	90	80	3	\N	{}	[]	[]	{sama,csf,banking,finance,mandatory}	en	1.0	t	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
ef62bbcb-76b2-4606-a210-f814303a11ba	SAMA_BCM	SAMA Business Continuity Management	إدارة استمرارية الأعمال - ساما	SAMA BCM framework covering BIA, BCP development, DR planning, testing & exercise requirements, and regulatory reporting for financial institutions.	course	bcp_dr	intermediate	45	75	3	\N	{}	[]	[]	{sama,bcm,bcp,disaster-recovery,financial}	en	1.0	t	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
26198ff1-288b-4654-b10f-11cdbc11ab24	SAMA_AML_CFT	Anti-Money Laundering & Counter-Terrorism Financing	مكافحة غسل الأموال وتمويل الإرهاب	SAMA AML/CFT regulations: KYC/CDD requirements, suspicious transaction reporting (STR), PEP screening, sanctions compliance, and FATF recommendations implementation.	course	regulatory	advanced	60	85	3	\N	{}	[]	[]	{sama,aml,cft,kyc,fatf,sanctions}	en	1.0	t	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
974ebc1d-c593-4129-8123-ba55785333a2	SAMA_OPEN_BANKING	SAMA Open Banking Framework	إطار الخدمات المصرفية المفتوحة	SAMA Open Banking standards: API security, consent management, data sharing protocols, TPP registration, and consumer protection requirements.	course	compliance	intermediate	40	75	3	\N	{}	[]	[]	{sama,open-banking,api-security,fintech}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
e2c4c7de-2795-4eba-be8c-e04e5517f306	SAMA_OUTSOURCING	SAMA Outsourcing & Third-Party Risk	الاستعانة بمصادر خارجية وإدارة مخاطر الأطراف الثالثة	SAMA outsourcing guidelines for financial institutions: due diligence, contractual requirements, ongoing monitoring, exit strategies, and material outsourcing approval.	course	vendor_management	intermediate	35	75	3	\N	{}	[]	[]	{sama,outsourcing,third-party,vendor-risk}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
32c9434e-8dd9-40f0-9bd8-152c2cabb74c	SAMA_INSURANCE	SAMA Insurance Regulations & Compliance	أنظمة ولوائح التأمين - ساما	Insurance sector regulations: Solvency requirements, actuarial standards, claims handling, reinsurance, and cooperative insurance principles.	course	regulatory	intermediate	40	75	3	\N	{}	[]	[]	{sama,insurance,solvency,cooperative-insurance}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
e0b16864-df25-4a2d-9307-50b0719009b3	PDPL_COMPLETE	KSA Personal Data Protection Law — Complete Guide	نظام حماية البيانات الشخصية - الدليل الشامل	Full PDPL coverage: 43 articles, data subject rights, lawful processing bases, cross-border transfers, DPO requirements, breach notification (72h), penalties up to SAR 5M.	course	data_privacy	intermediate	75	80	3	\N	{}	[]	[]	{pdpl,sdaia,data-protection,privacy,mandatory}	en	1.0	t	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
721d976a-2ba7-4e68-b668-da2807deea11	PDPL_DPO	Data Protection Officer (DPO) Certification	شهادة مسؤول حماية البيانات	Advanced DPO training: DPIA methodology, privacy-by-design, records of processing, regulatory coordination with SDAIA, and organizational DPO responsibilities.	course	data_privacy	advanced	120	85	3	\N	{}	[]	[]	{pdpl,dpo,dpia,privacy-by-design}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
73bffad3-6a9b-4124-92e0-239e523e3040	SDAIA_AI_ETHICS	SDAIA AI Ethics & Responsible AI	أخلاقيات الذكاء الاصطناعي والذكاء الاصطناعي المسؤول	SDAIA AI ethics principles: transparency, fairness, accountability, human oversight, bias detection, explainability, and AI governance frameworks aligned with KSA National AI Strategy.	course	governance	intermediate	50	75	3	\N	{}	[]	[]	{sdaia,ai-ethics,responsible-ai,bias,explainability}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
378a12fd-be5e-4df5-938b-8e0d7370aa6c	SDAIA_DATA_GOV	SDAIA National Data Governance Framework	إطار حوكمة البيانات الوطنية	SDAIA data governance: data classification (open/restricted/confidential/top-secret), data quality management, metadata standards, data sharing agreements, and open data policies.	course	governance	intermediate	45	75	3	\N	{}	[]	[]	{sdaia,data-governance,classification,open-data}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
bdf17c31-4b50-41a4-8c5f-9810afc220a0	PDPL_CROSS_BORDER	PDPL Cross-Border Data Transfers	نقل البيانات عبر الحدود - PDPL	PDPL Articles 28-29: adequacy decisions, standard contractual clauses, binding corporate rules, SDAIA transfer impact assessments, and data localization requirements.	course	data_privacy	advanced	30	80	3	\N	{}	[]	[]	{pdpl,cross-border,data-localization,scc}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
4b892720-c474-4090-9ce5-95719fb89f38	CMA_GOV_CODE	CMA Corporate Governance Code	نظام حوكمة الشركات - هيئة السوق المالية	CMA Corporate Governance Regulations: board composition, audit committee requirements, disclosure obligations, related-party transactions, and minority shareholder protections.	course	governance	intermediate	50	75	3	\N	{}	[]	[]	{cma,governance,board,disclosure,capital-markets}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
bca9ecd4-457f-4f7d-8857-0372093c272f	CMA_AML	CMA Anti-Money Laundering for Capital Markets	مكافحة غسل الأموال في الأسواق المالية	CMA-specific AML requirements for authorized persons, market surveillance, insider trading detection, and suspicious activity reporting for securities.	course	regulatory	advanced	45	80	3	\N	{}	[]	[]	{cma,aml,insider-trading,market-surveillance}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
39eae67a-91a1-49ca-98a5-39a7de2415ea	CMA_DISCLOSURE	CMA Disclosure & Transparency Rules	قواعد الإفصاح والشفافية	Material event disclosure, periodic reporting, ownership disclosure thresholds, and Tadawul listing requirements.	course	compliance	intermediate	35	75	3	\N	{}	[]	[]	{cma,disclosure,tadawul,transparency}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
9efd99c0-e69f-4088-a670-1b07b4aa0861	CST_DATA_LOCAL	CST Data Localization & Cloud Requirements	متطلبات توطين البيانات والحوسبة السحابية	CST cloud service provider regulations: data residency for telecom data, licensing for CSPs, SLA requirements, and data sovereignty in cloud computing.	course	data_privacy	intermediate	35	75	3	\N	{}	[]	[]	{cst,citc,data-localization,cloud,telecom}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
5ef3cf64-c7d6-4e12-9ed4-2c43f35cc5f4	CST_SPAM_FRAUD	CST Anti-Spam & Fraud Prevention	مكافحة الاحتيال والرسائل غير المرغوبة	CST regulations on spam prevention, telecom fraud detection, SIM box fraud, and subscriber protection requirements.	course	cybersecurity	beginner	25	70	3	\N	{}	[]	[]	{cst,spam,fraud,telecom-security}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
5ab3ec9e-0b34-445e-87c5-98f73254258c	CST_IOT_SEC	CST IoT Security & Smart City Standards	أمن إنترنت الأشياء ومعايير المدن الذكية	IoT device security certification, smart city data governance (NEOM, The Line, ROSHN), and connected infrastructure protection standards.	course	cybersecurity	advanced	40	75	3	\N	{}	[]	[]	{cst,iot,smart-city,neom,connected-devices}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
9d967104-b9ae-4ea5-9cde-74e625316076	ZATCA_VAT	ZATCA VAT Compliance & E-Invoicing (FATOORAH)	ضريبة القيمة المضافة والفوترة الإلكترونية	ZATCA VAT framework (15%), FATOORAH e-invoicing phases 1-2, QR code requirements, XML invoice schema, integration with ZATCA Fatoorah Portal, and compliance penalties.	course	compliance	intermediate	50	80	3	\N	{}	[]	[]	{zatca,vat,e-invoicing,fatoorah,tax}	en	1.0	t	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
22155c1c-710d-41f5-af40-5f16e748265b	ZATCA_CUSTOMS	ZATCA Customs & Excise Tax Regulations	أنظمة الجمارك والضريبة الانتقائية	Customs duties, unified GCC tariff, excise tax on tobacco/energy drinks/sweetened beverages, Free Trade Zone operations, and authorized economic operator (AEO) program.	course	regulatory	intermediate	35	75	3	\N	{}	[]	[]	{zatca,customs,excise,gcc-tariff,aeo}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
b43d5815-5c1a-4e90-b466-27aca50d5abd	ZATCA_TRANSFER	ZATCA Transfer Pricing & Zakat	التسعير التحويلي والزكاة	Transfer pricing documentation (master file, local file, CbCR), arms-length principle, Zakat computation for Saudi/GCC entities, and withholding tax obligations.	course	compliance	advanced	40	80	3	\N	{}	[]	[]	{zatca,transfer-pricing,zakat,withholding-tax}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
8fafdceb-207e-46a1-92de-76aaf5f36b76	MOH_HEALTH_DATA	MOH Health Data Governance & NPHIES	حوكمة البيانات الصحية ونظام نفيس	MOH health data regulations: NPHIES integration, health information exchange, patient consent, medical records retention, telemedicine data handling, and CBAHI accreditation.	course	data_privacy	intermediate	45	75	3	\N	{}	[]	[]	{moh,nphies,health-data,telemedicine,cbahi}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
e069838b-ea80-457b-8931-ddcd8fae9095	SFDA_PHARMA	SFDA Pharmaceutical & Medical Device Regulations	أنظمة الأدوية والأجهزة الطبية	SFDA registration, GMP compliance, pharmacovigilance reporting, medical device classification, clinical trial regulations, and halal pharmaceutical requirements.	course	regulatory	advanced	50	80	3	\N	{}	[]	[]	{sfda,pharmaceutical,medical-device,gmp,pharmacovigilance}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
02cc1ebd-8175-4250-b142-5241d28bfad0	MOH_PATIENT_SAFETY	Patient Safety & Clinical Risk Management	سلامة المرضى وإدارة المخاطر السريرية	MOH patient safety standards: adverse event reporting, root cause analysis, medication safety, infection control, and clinical governance.	course	risk_management	intermediate	40	75	3	\N	{}	[]	[]	{moh,patient-safety,clinical-risk,adverse-events}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
ee88fbd3-84d0-4f26-9dc2-d8b2334550b1	HRSD_LABOR	KSA Labor Law & Employee Rights	نظام العمل السعودي وحقوق الموظفين	KSA Labor Law: employment contracts, working hours, leave entitlements, end-of-service benefits, Saudization/Nitaqat, wage protection (WPS), and HRSD inspection requirements.	course	compliance	beginner	40	75	3	\N	{}	[]	[]	{hrsd,labor-law,nitaqat,wps,saudization}	en	1.0	t	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
fedc9fbf-d00d-44d3-b7ae-619e5113e410	HRSD_WPS	Wage Protection System (WPS) Compliance	نظام حماية الأجور	HRSD WPS requirements: timely salary disbursement, bank transfer mandates, penalty framework, and reporting obligations for employers.	course	compliance	beginner	25	75	3	\N	{}	[]	[]	{hrsd,wps,wage-protection,payroll}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
35dae908-50b9-449d-a858-c2048519297e	GOSI_SOCIAL	GOSI Social Insurance & Occupational Hazards	التأمينات الاجتماعية والأخطار المهنية	GOSI registration, contribution rates, annuities, occupational injury reporting, SANED unemployment insurance, and voluntary coverage options.	course	compliance	beginner	30	75	3	\N	{}	[]	[]	{gosi,social-insurance,saned,occupational-hazards}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
4dbc6df6-c500-411e-870d-a920caff6f12	MOC_COMMERCE	Ministry of Commerce — Corporate Compliance	وزارة التجارة - الامتثال التجاري	Companies Law, commercial registration, Qawaem financial statements, anti-concealment law, franchise regulations, and e-commerce law requirements.	course	compliance	beginner	30	75	3	\N	{}	[]	[]	{moc,companies-law,qawaem,anti-concealment,e-commerce}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
db1f31c7-beb1-4740-8aca-e7c5d331e649	GAC_COMPETITION	GAC Competition Law & Merger Control	نظام المنافسة والرقابة على التركزات الاقتصادية	Competition Law: prohibited practices (cartels, abuse of dominance), merger notification thresholds, leniency program, dawn raids, and GAC investigation procedures.	course	regulatory	intermediate	35	75	3	\N	{}	[]	[]	{gac,competition,merger-control,antitrust,cartel}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
a4bb8d85-040e-404c-a124-c5ce839b4156	NDMO_DATA_CLASS	NDMO National Data Classification	التصنيف الوطني للبيانات - مكتب إدارة البيانات	NDMO data classification framework: 4 levels (Top Secret, Confidential, Restricted, Open), labeling standards, handling procedures, and data sharing agreements between government entities.	course	data_privacy	intermediate	35	75	3	\N	{}	[]	[]	{ndmo,data-classification,government,open-data}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
76154cb8-d59e-4fd7-a753-38d8276e842b	NDMO_OPEN_DATA	NDMO Open Data & Data Sharing	البيانات المفتوحة ومشاركة البيانات	Saudi open data policy, data.gov.sa portal standards, API publishing requirements, data quality dimensions, and inter-agency data sharing governance.	course	governance	beginner	25	70	3	\N	{}	[]	[]	{ndmo,open-data,data-sharing,government}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
9661ac14-7862-48d9-a7e7-865ec84d033e	MOE_ENERGY_SEC	Energy Sector Cybersecurity & Compliance	الأمن السيبراني والامتثال في قطاع الطاقة	Energy sector regulations: SCADA/ICS security for oil & gas, pipeline PSMS, SEC environmental compliance, Aramco IKTVA requirements, and clean energy governance.	course	cybersecurity	advanced	45	80	3	\N	{}	[]	[]	{moe,energy,scada,ics,oil-gas,iktva}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
b8dfb3a7-d083-4a2e-ac1a-bbab702ac3de	MEWA_ENVIRON	Environmental Compliance & Sustainability	الامتثال البيئي والاستدامة	MEWA environmental regulations: EIA requirements, waste management, air/water quality, Saudi Green Initiative commitments, and ESG reporting standards.	course	compliance	intermediate	35	75	3	\N	{}	[]	[]	{mewa,environmental,eia,esg,green-initiative}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
d4e4c88e-2237-4917-a9ff-c04d1510d5e2	V2030_COMPLIANCE	Vision 2030 Regulatory Landscape	المشهد التنظيمي لرؤية 2030	Overview of Saudi Vision 2030 regulatory reforms: sector privatization, Special Economic Zones, investment licensing (MISA), entertainment regulations, tourism law, and Quality of Life program.	course	regulatory	beginner	40	70	3	\N	{}	[]	[]	{vision-2030,regulatory-reform,misa,privatization}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
187387f4-b146-483c-a947-482861ce3604	KSA_WHISTLEBLOWER	Whistleblower Protection & Reporting	حماية المبلغين والإبلاغ	KSA whistleblower protection framework: safe reporting channels, anonymity guarantees, retaliation protections, and regulatory reporting obligations under SAMA/CMA/NCA.	course	ethics	beginner	25	75	3	\N	{}	[]	[]	{whistleblower,ethics,reporting,protection}	en	1.0	t	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
6e492b4e-f261-474f-873a-f1edd6d6a6b9	KSA_SANCTIONS	International Sanctions & Trade Controls	العقوبات الدولية وضوابط التجارة	Sanctions compliance: UN/US/EU sanctions screening, dual-use goods, export control regulations, OFAC guidance, and KSA-specific trade restrictions.	course	regulatory	advanced	45	80	3	\N	{}	[]	[]	{sanctions,export-control,ofac,trade-compliance}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
c666f171-6f73-4e83-9efd-0ebe3c4ef064	KSA_ESG_REPORT	ESG Reporting & Sustainability Disclosure	الإفصاح عن الاستدامة ومعايير ESG	ESG reporting requirements: Tadawul ESG disclosure guidelines, GRI/SASB standards, climate risk (TCFD), social impact measurement, and Saudi Green Initiative alignment.	course	governance	intermediate	40	75	3	\N	{}	[]	[]	{esg,sustainability,tadawul,tcfd,gri}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
5d6695b3-868c-4768-98c0-45abae7f5e60	KSA_BOARD_DUTIES	Board Member Duties & Liabilities (KSA)	واجبات ومسؤوليات أعضاء مجلس الإدارة	Director duties under Companies Law: fiduciary obligations, conflict of interest, related-party transactions, audit committee requirements, and personal liability exposure.	course	governance	advanced	50	80	3	\N	{}	[]	[]	{board,directors,fiduciary,companies-law}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
d971054b-87d3-487f-a0ee-545a5cc89055	KSA_CRISIS_COMM	Crisis Communication & Regulatory Disclosure	إدارة الأزمات والإفصاح التنظيمي	Crisis management: regulatory notification timelines, media handling, stakeholder communication, CERT-SA coordination, and board-level crisis governance.	course	risk_management	intermediate	30	75	3	\N	{}	[]	[]	{crisis,communication,disclosure,cert-sa}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
cbb41a49-8492-4b75-87e6-cbd4f3cc01c2	KSA_CONTRACTS	KSA Contract Law & Procurement Compliance	نظام العقود والمشتريات في المملكة	Government procurement (GTPL), Etimad portal requirements, contractor obligations, dispute resolution (commercial courts), and Saudization clauses in contracts.	course	compliance	intermediate	35	75	3	\N	{}	[]	[]	{contracts,procurement,etimad,gtpl,dispute-resolution}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
e118b2d7-5ae8-41fa-9326-82d405026ded	KSA_CYBER_LAW	KSA Anti-Cyber Crime Law	نظام مكافحة الجرائم المعلوماتية	Anti-Cyber Crime Law: prohibited acts (unauthorized access, data interception, identity theft, defamation), penalties (up to 10 years/SAR 5M), and evidence handling procedures.	course	cybersecurity	beginner	30	75	3	\N	{}	[]	[]	{cyber-crime,law,penalties,evidence}	en	1.0	t	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
705304ba-d3aa-4e80-835e-df4425184dd1	KSA_IP_PROTECT	Intellectual Property Protection in KSA	حماية الملكية الفكرية في المملكة	IP framework: SAIP trademark/patent registration, copyright protection, trade secrets, IP enforcement, and technology transfer agreements.	course	regulatory	intermediate	30	75	3	\N	{}	[]	[]	{ip,saip,trademark,patent,copyright}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
c5dea706-946c-48ec-9b28-4c55f39bad3f	KSA_DIGITAL_ID	Digital Identity & E-Government (Absher/Nafath)	الهوية الرقمية والحكومة الإلكترونية	Digital identity ecosystem: Absher services, Nafath authentication, NIC integration, e-signature law, and digital government standards (Yesser program).	course	cybersecurity	beginner	25	70	3	\N	{}	[]	[]	{digital-id,absher,nafath,e-government,yesser}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
b5db52c0-e52d-44ca-bc6d-86035d711a4d	KSA_FINTECH	Fintech Regulations & Sandbox (SAMA/CMA)	تنظيمات التقنية المالية وبيئة التجربة	Fintech regulatory sandbox (SAMA), crowdfunding regulations (CMA), payment service provider licensing, crypto-asset framework, and insurtech guidelines.	course	regulatory	intermediate	40	75	3	\N	{}	[]	[]	{fintech,sandbox,crowdfunding,crypto,payments}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
452a4109-a0d8-47c4-ba31-19244e62151e	KSA_REAL_ESTATE	REGA Real Estate Regulations & Ejar	أنظمة العقار ومنصة إيجار	Real Estate General Authority: broker licensing, Ejar platform, off-plan sales (Wafi), strata management, and REIT regulations.	course	regulatory	beginner	30	70	3	\N	{}	[]	[]	{rega,real-estate,ejar,wafi,reit}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
7142e643-7b2d-46d2-af5f-09ad83ba87ec	KSA_EDUCATION	Education & Training Sector Regulations	أنظمة قطاع التعليم والتدريب	MOE/ETEC/TVTC regulations: institutional accreditation, NCAAA standards, student data privacy, EdTech compliance, and foreign institution licensing.	course	regulatory	beginner	25	70	3	\N	{}	[]	[]	{education,etec,tvtc,ncaaa,accreditation}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
b2b286e6-ed1d-4e86-964d-ffaac64766f0	KSA_TRANSPORT	Transport & Logistics Regulations	أنظمة النقل والخدمات اللوجستية	TGA/SRA/GACA regulations: freight licensing, last-mile delivery, aviation safety, maritime (Mawani), and Saudi Logistics Hub standards.	course	regulatory	beginner	30	70	3	\N	{}	[]	[]	{transport,logistics,gaca,sra,mawani}	en	1.0	f	t	\N	\N	365	\N	\N	\N	[]	{}	2026-03-17 08:24:24.148735+08	2026-03-17 08:24:24.148735+08	\N
\.


ALTER TABLE __TENANT_SCHEMA__.training_content ENABLE TRIGGER ALL;

--
-- Data for Name: control_training_mappings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_training_mappings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_training_mappings (mapping_id, control_code, content_id, framework_code, mapping_type, coverage_pct, is_active, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_training_mappings ENABLE TRIGGER ALL;

--
-- Data for Name: control_transition_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_transition_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_transition_rules (transition_id, control_id, from_state, to_state, actor, reason, evidence_ref, transitioned_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_transition_rules ENABLE TRIGGER ALL;

--
-- Data for Name: control_workflow_links; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.control_workflow_links DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.control_workflow_links (link_id, control_id, workflow_definition_id, trigger_event, auto_trigger, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.control_workflow_links ENABLE TRIGGER ALL;

--
-- Data for Name: copilot_proposed_actions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.copilot_proposed_actions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.copilot_proposed_actions (action_id, session_id, user_id, agent_id, action_type, title, description, priority, entity_type, entity_id, action_payload, status, auto_execute_at, auto_execute_enabled, pre_validation, post_validation, executed_at, executed_by, execution_method, delegation_action_id, rejected_at, rejected_by, rejection_reason, failure_reason, escalated_at, escalation_target, proposed_at, response_time_ms, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.copilot_proposed_actions ENABLE TRIGGER ALL;

--
-- Data for Name: copilot_sessions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.copilot_sessions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.copilot_sessions (session_id, user_id, messages, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.copilot_sessions ENABLE TRIGGER ALL;

--
-- Data for Name: crisis_comm_plans; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.crisis_comm_plans DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.crisis_comm_plans (plan_id, title, description, crisis_type, status, activation_criteria, escalation_matrix, spokesperson_primary, spokesperson_backup, internal_channels, external_channels, notification_templates, stakeholder_groups, media_guidelines, social_media_protocol, holding_statements, review_frequency_days, last_reviewed_at, next_review_date, approved_by, approved_at, attachments, metadata, created_at, updated_at, deleted_at) FROM stdin;
67ac72ed-0494-4647-9893-d483a76f08ab	Executive Crisis Communication	C-suite and board notification protocol for major incidents	executive	active	[]	[]	\N	\N	[]	[]	[]	[]	\N	\N	[]	180	\N	\N	\N	\N	[]	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
ad8ceada-63ed-49ce-aab7-5487277c9abd	IT Disaster Communication	IT team notification for system outages and cyber incidents	it_disaster	active	[]	[]	\N	\N	[]	[]	[]	[]	\N	\N	[]	180	\N	\N	\N	\N	[]	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
19e6287c-2caf-4c4f-b566-a82d37f64393	Regulatory Notification Plan	SAMA/NCA regulatory body notification for reportable incidents	regulatory	draft	[]	[]	\N	\N	[]	[]	[]	[]	\N	\N	[]	180	\N	\N	\N	\N	[]	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
\.


ALTER TABLE __TENANT_SCHEMA__.crisis_comm_plans ENABLE TRIGGER ALL;

--
-- Data for Name: crisis_comm_activations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.crisis_comm_activations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.crisis_comm_activations (activation_id, plan_id, incident_id, activated_by, activated_at, deactivated_at, deactivated_by, status, notifications_sent, timeline, post_crisis_review, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.crisis_comm_activations ENABLE TRIGGER ALL;

--
-- Data for Name: crisis_notification_tree; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.crisis_notification_tree DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.crisis_notification_tree (node_id, plan_id, parent_node_id, contact_type, contact_id, contact_name, contact_role, contact_channels, escalation_order, sla_minutes, is_active, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.crisis_notification_tree ENABLE TRIGGER ALL;

--
-- Data for Name: cross_module_links; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.cross_module_links DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.cross_module_links (link_id, source_module, source_entity, source_id, target_module, target_entity, target_id, link_type, is_active, last_verified_at, created_at, chain_instance_id, chain_step) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.cross_module_links ENABLE TRIGGER ALL;

--
-- Data for Name: crosswalk_mappings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.crosswalk_mappings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.crosswalk_mappings (mapping_id, source_control_id, target_requirement_id, relationship, confidence, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.crosswalk_mappings ENABLE TRIGGER ALL;

--
-- Data for Name: csa_questionnaires; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.csa_questionnaires DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.csa_questionnaires (questionnaire_id, workspace_id, control_id, control_title, title, description, questions, scoring_method, frequency, owner_id, is_active, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.csa_questionnaires ENABLE TRIGGER ALL;

--
-- Data for Name: csa_responses; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.csa_responses DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.csa_responses (response_id, questionnaire_id, control_id, workspace_id, respondent_id, period, answers, raw_score, weighted_score, outcome, reviewer_id, reviewed_at, reviewer_notes, status, submitted_at, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.csa_responses ENABLE TRIGGER ALL;

--
-- Data for Name: dashboard_configs; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.dashboard_configs DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.dashboard_configs (dashboard_id, dashboard_code, dashboard_name, dashboard_type, description, owner_team_id, visibility, allowed_teams, allowed_roles, layout_config, refresh_interval_seconds, time_range_default, widget_configs, active, is_default, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.dashboard_configs ENABLE TRIGGER ALL;

--
-- Data for Name: dashboard_configs_legacy; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.dashboard_configs_legacy DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.dashboard_configs_legacy (config_id, user_id, config, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.dashboard_configs_legacy ENABLE TRIGGER ALL;

--
-- Data for Name: dashboard_layouts; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.dashboard_layouts DISABLE TRIGGER ALL;


-- ============================================
-- SECTION B: AGRC Product Defaults
-- Specific to the AGRC product; swappable for other products
-- ============================================

COPY __TENANT_SCHEMA__.dashboard_layouts (layout_id, dashboard_code, name_en, name_ar, layout, audience, sort_order, created_at, updated_at, module_code, route, category, icon, description, default_filters, is_system, is_active, metadata) FROM stdin;
b8e490fc-1659-474a-902b-9e3ff914b1b6	big_picture	Big Picture	الصورة الكبيرة	{"widgets": [{"h": 1, "w": 2, "x": 0, "y": 0, "id": "executive_summary"}, {"h": 1, "w": 1, "x": 2, "y": 0, "id": "compliance_score"}, {"h": 1, "w": 2, "x": 0, "y": 1, "id": "risk_heatmap"}, {"h": 1, "w": 1, "x": 2, "y": 1, "id": "audit_readiness"}]}	all	1	2026-03-17 08:24:18.871755+08	2026-03-17 08:24:24.384572+08	*	/dashboard/big_picture	tenant	chart-bar	Full tenant overview with all major KPIs	{}	t	t	{}
2f65fc5a-cee7-483e-a7ae-e3b061fd0c07	executive	Executive	تنفيذي	{"widgets": [{"h": 1, "w": 2, "x": 0, "y": 0, "id": "executive_summary"}, {"h": 1, "w": 1, "x": 2, "y": 0, "id": "compliance_score"}, {"h": 1, "w": 2, "x": 0, "y": 1, "id": "risk_heatmap"}, {"h": 1, "w": 1, "x": 2, "y": 1, "id": "maturity_gauge"}]}	executive	2	2026-03-17 08:24:18.871755+08	2026-03-17 08:24:24.384572+08	*	/dashboard/executive	role	crown	High-level KPIs, risk heatmap, compliance score, audit readiness	{}	t	t	{}
d52efa9e-6620-49c8-b731-f9993d0aa19e	compliance_ops	Compliance Operations	عمليات الامتثال	{"widgets": [{"h": 1, "w": 2, "x": 0, "y": 0, "id": "compliance_overview"}, {"h": 1, "w": 2, "x": 0, "y": 1, "id": "framework_coverage"}, {"h": 1, "w": 2, "x": 0, "y": 2, "id": "control_progress"}, {"h": 1, "w": 1, "x": 2, "y": 0, "id": "evidence_locker"}, {"h": 1, "w": 1, "x": 2, "y": 1, "id": "audit_readiness"}]}	compliance	3	2026-03-17 08:24:18.871755+08	2026-03-17 08:24:24.384572+08	compliance	/dashboard/compliance_ops	hub	shield	Compliance assessments, findings, control testing	{}	t	t	{}
c7b08151-9364-46e9-aead-e9ff77893b07	risk_ops	Risk Operations	عمليات المخاطر	{"widgets": [{"h": 1, "w": 2, "x": 0, "y": 0, "id": "risk_heatmap"}, {"h": 1, "w": 1, "x": 2, "y": 0, "id": "risk_summary"}, {"h": 1, "w": 1, "x": 0, "y": 1, "id": "top_risks"}, {"h": 1, "w": 1, "x": 1, "y": 1, "id": "vendor_risk"}, {"h": 1, "w": 1, "x": 2, "y": 1, "id": "compliance_score"}]}	risk	4	2026-03-17 08:24:18.871755+08	2026-03-17 08:24:24.384572+08	risk	/dashboard/risk_ops	hub	exclamation-triangle	Risk register, scoring, heatmap, treatment	{}	t	t	{}
6c0414eb-5a84-44b8-8c3a-aabf44a66476	evidence_ops	Evidence Operations	عمليات الأدلة	{"widgets": [{"h": 1, "w": 1, "x": 0, "y": 0, "id": "evidence_locker"}, {"h": 1, "w": 1, "x": 1, "y": 0, "id": "evidence_freshness"}, {"h": 1, "w": 1, "x": 2, "y": 0, "id": "audit_readiness"}, {"h": 1, "w": 2, "x": 0, "y": 1, "id": "control_progress"}]}	evidence	5	2026-03-17 08:24:18.871755+08	2026-03-17 08:24:24.384572+08	evidence	/dashboard/evidence_ops	hub	folder-open	Evidence plan, catalog, tasks, upload, versions	{}	t	t	{}
cd66e478-5ab9-40c5-b67e-94b34922bf1b	governance_hub	Governance Hub	مركز الحوكمة	{"columns": 12, "widgets": [{"h": 2, "w": 3, "x": 0, "y": 0, "id": "compliance-gauge"}, {"h": 2, "w": 3, "x": 3, "y": 0, "id": "policy-scorecard"}, {"h": 2, "w": 3, "x": 6, "y": 0, "id": "control-progress"}, {"h": 2, "w": 6, "x": 0, "y": 2, "id": "framework-coverage"}, {"h": 2, "w": 6, "x": 6, "y": 2, "id": "framework-radar"}]}	all	10	2026-03-17 08:24:21.019815+08	2026-03-17 08:24:21.019815+08	governance	/dashboard/governance_hub	hub	building	Policies, controls, governance structure	{}	t	t	{}
6e67d42c-298d-4550-91e8-b583f7a33cbd	incident_hub	Incident Hub	مركز الحوادث	{"columns": 12, "widgets": [{"h": 2, "w": 4, "x": 0, "y": 0, "id": "incident-tracker"}, {"h": 1, "w": 4, "x": 4, "y": 0, "id": "exceptions-aging"}, {"h": 1, "w": 4, "x": 8, "y": 0, "id": "bcp-status"}]}	all	11	2026-03-17 08:24:21.019815+08	2026-03-17 08:24:21.019815+08	incident	/dashboard/incident_hub	hub	bolt	Incidents, exceptions, remediation, BCP	{}	t	t	{}
bc6afd28-d6e1-4a0c-9222-0b94e34008d9	vendor_hub	Vendor Hub	مركز الموردين	{"columns": 12, "widgets": [{"h": 2, "w": 6, "x": 0, "y": 0, "id": "vendor-risk"}, {"h": 2, "w": 6, "x": 6, "y": 0, "id": "risk-heatmap"}]}	all	12	2026-03-17 08:24:21.019815+08	2026-03-17 08:24:21.019815+08	vendor	/dashboard/vendor_hub	hub	truck	Vendor questionnaires, risk scoring, due diligence	{}	t	t	{}
51e7a094-3b67-4a1d-bd6e-02d6070eb6c7	ai_suite	AI Suite	جناح الذكاء الاصطناعي	{"columns": 12, "widgets": [{"h": 2, "w": 6, "x": 0, "y": 0, "id": "ai-summary"}, {"h": 2, "w": 3, "x": 6, "y": 0, "id": "program-health"}, {"h": 1, "w": 3, "x": 9, "y": 0, "id": "momentum-indicator"}]}	all	13	2026-03-17 08:24:21.019815+08	2026-03-17 08:24:21.019815+08	*	/dashboard/ai_suite	hub	microchip-ai	AI hub, copilot, insights	{}	t	t	{}
e58afb03-2c53-4c8c-b5e3-423c120122b6	role_grc_owner	GRC Owner Dashboard	لوحة مدير الحوكمة	{"columns": 12, "widgets": [{"h": 2, "w": 3, "x": 0, "y": 0, "id": "compliance-gauge"}, {"h": 2, "w": 3, "x": 3, "y": 0, "id": "evidence-locker"}, {"h": 2, "w": 3, "x": 6, "y": 0, "id": "risk-heatmap"}, {"h": 2, "w": 3, "x": 9, "y": 0, "id": "audit-readiness"}, {"h": 2, "w": 6, "x": 0, "y": 2, "id": "framework-coverage"}, {"h": 2, "w": 6, "x": 6, "y": 2, "id": "compliance-trend"}]}	grc_owner	14	2026-03-17 08:24:21.019815+08	2026-03-17 08:24:21.019815+08	*	/dashboard/role_grc_owner	role	shield	Full program view for GRC owners	{}	t	t	{}
3f4cef92-ac40-40a1-b850-0bae01d3aede	role_control_owner	Control Owner Dashboard	لوحة مالك الضوابط	{"columns": 12, "widgets": [{"h": 2, "w": 6, "x": 0, "y": 0, "id": "control-progress"}, {"h": 2, "w": 6, "x": 6, "y": 0, "id": "evidence-locker"}, {"h": 1, "w": 6, "x": 0, "y": 2, "id": "remediation-velocity"}]}	control_owner	15	2026-03-17 08:24:21.019815+08	2026-03-17 08:24:21.019815+08	*	/dashboard/role_control_owner	role	wrench	My controls, evidence due, remediation tasks	{}	t	t	{}
9861d260-e92b-4b09-a3e3-aa72b6e34448	role_auditor	Auditor Dashboard	لوحة المدقق	{"columns": 12, "widgets": [{"h": 2, "w": 4, "x": 0, "y": 0, "id": "audit-readiness"}, {"h": 2, "w": 8, "x": 4, "y": 0, "id": "findings-bar"}, {"h": 2, "w": 6, "x": 0, "y": 2, "id": "evidence-locker"}]}	auditor	16	2026-03-17 08:24:21.019815+08	2026-03-17 08:24:21.019815+08	*	/dashboard/role_auditor	role	verified	Test plans, evidence review, findings	{}	t	t	{}
338bb903-70cd-472c-a0eb-174e543a56bd	audit_ops	Audit Operations	عمليات التدقيق	{"widgets": [{"h": 1, "w": 1, "x": 0, "y": 0, "id": "audit_readiness"}, {"h": 1, "w": 1, "x": 1, "y": 0, "id": "evidence_locker"}, {"h": 1, "w": 2, "x": 0, "y": 1, "id": "compliance_overview"}, {"h": 1, "w": 1, "x": 2, "y": 0, "id": "assessment_progress"}]}	auditor	6	2026-03-17 08:24:18.871755+08	2026-03-17 08:24:24.384572+08	audit	/dashboard/audit_ops	hub	verified	Audit trail, package, workpapers, findings	{}	t	t	{}
\.


ALTER TABLE __TENANT_SCHEMA__.dashboard_layouts ENABLE TRIGGER ALL;

--
-- Data for Name: dashboard_overrides; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.dashboard_overrides DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.dashboard_overrides (override_id, dashboard_code, applies_to_role, enabled, name_en, name_ar, route, layout_patch, default_filters_patch, metadata_patch, is_active, created_at, updated_at, role_code, field, value) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.dashboard_overrides ENABLE TRIGGER ALL;

--
-- Data for Name: dashboard_registry; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.dashboard_registry DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.dashboard_registry (dashboard_id, dashboard_code, name_en, name_ar, audience, module_code, route, layout, default_filters, is_system, is_active, sort_order, metadata, created_at, updated_at) FROM stdin;
0c0a896b-8723-4ee5-ba5f-6769f0a8d946	agrc-executive	AGRC Executive Dashboard	لوحة القيادة التنفيذية للحوكمة والمخاطر والامتثال	executive_owner	dashboard	/executive/overview	{"version": 1, "widgets": [{"h": 3, "w": 6, "x": 0, "y": 0, "config": {}, "widgetKey": "executive-summary"}, {"h": 4, "w": 6, "x": 6, "y": 0, "config": {}, "widgetKey": "risk-heatmap"}, {"h": 3, "w": 6, "x": 0, "y": 4, "config": {}, "widgetKey": "overdue-actions"}, {"h": 3, "w": 6, "x": 6, "y": 4, "config": {}, "widgetKey": "audit-exposure"}]}	{}	t	t	10	\N	2026-03-17 08:24:21.040852+08	2026-03-17 08:24:24.405673+08
386af591-d5ff-48f4-a18f-5d3aca982c21	government-command	Government Command Dashboard	لوحة القيادة الحكومية	executive_owner	dashboard	/executive/overview	{"version": 1, "widgets": [{"h": 3, "w": 6, "x": 0, "y": 0, "config": {}, "widgetKey": "executive-summary"}, {"h": 3, "w": 6, "x": 6, "y": 0, "config": {}, "widgetKey": "overdue-actions"}, {"h": 4, "w": 12, "x": 0, "y": 3, "config": {}, "widgetKey": "risk-heatmap"}]}	{}	t	t	20	\N	2026-03-17 08:24:21.040852+08	2026-03-17 08:24:24.405673+08
0dbd3da4-d84a-4e60-aa4b-30f5b3f32c90	risk-operations	Risk Operations Dashboard	لوحة عمليات المخاطر	risk_manager	risk	/risk/register	{"version": 1, "widgets": [{"h": 4, "w": 8, "x": 0, "y": 0, "config": {}, "widgetKey": "risk-heatmap"}, {"h": 4, "w": 4, "x": 8, "y": 0, "config": {}, "widgetKey": "kri-status"}]}	{}	t	t	30	\N	2026-03-17 08:24:21.040852+08	2026-03-17 08:24:24.405673+08
e92ddcf0-1759-4c31-bc87-79e44d457d02	audit-evidence	Audit & Evidence Dashboard	لوحة التدقيق والأدلة	auditor	audit	/audit/engagements	{"version": 1, "widgets": [{"h": 3, "w": 6, "x": 0, "y": 0, "config": {}, "widgetKey": "audit-exposure"}, {"h": 3, "w": 6, "x": 6, "y": 0, "config": {}, "widgetKey": "evidence-coverage"}]}	{}	t	t	40	\N	2026-03-17 08:24:21.040852+08	2026-03-17 08:24:24.405673+08
dfccfeb4-2dbf-4fdd-baeb-a0d53e5310d2	privacy-assurance	Privacy Assurance Dashboard	لوحة ضمان الخصوصية	privacy_officer	privacy	/privacy/overview	{"version": 1, "widgets": [{"h": 3, "w": 6, "x": 0, "y": 0, "config": {}, "widgetKey": "privacy-incidents"}, {"h": 3, "w": 6, "x": 6, "y": 0, "config": {}, "widgetKey": "evidence-coverage"}]}	{}	t	t	50	\N	2026-03-17 08:24:21.040852+08	2026-03-17 08:24:24.405673+08
30ea359d-53b5-471f-923c-fda5175f8935	qiyas-executive	Qiyas Executive Dashboard	لوحة قياس التنفيذية	assessment_lead	qiyas	/qiyas/overview	{"version": 1, "widgets": [{"h": 3, "w": 4, "x": 0, "y": 0, "config": {}, "widgetKey": "maturity-score"}, {"h": 3, "w": 4, "x": 4, "y": 0, "config": {}, "widgetKey": "assessment-progress"}, {"h": 4, "w": 4, "x": 8, "y": 0, "config": {}, "widgetKey": "recommendations"}]}	{}	t	t	60	\N	2026-03-17 08:24:21.040852+08	2026-03-17 08:24:24.405673+08
\.


ALTER TABLE __TENANT_SCHEMA__.dashboard_registry ENABLE TRIGGER ALL;

--
-- Data for Name: dashboard_role_bindings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.dashboard_role_bindings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.dashboard_role_bindings (binding_id, dashboard_code, role_code, is_default, sort_order, is_active, created_at, is_allowed) FROM stdin;
dd075bd0-b0f6-402a-8735-6b1f400ed959	big_picture	*	t	1	t	2026-03-17 08:24:21.019815+08	t
acbc53d1-4b4a-4d74-8af6-e847de50200b	executive	owner	t	1	t	2026-03-17 08:24:21.019815+08	t
b6ae35d6-106a-4387-91fc-eda5a2fb58c8	executive	tenant_admin	t	1	t	2026-03-17 08:24:21.019815+08	t
8deacc2d-9d90-4cb3-8fe9-ba5cd7db21f3	executive	approver	f	2	t	2026-03-17 08:24:21.019815+08	t
dc7944e0-0677-4f44-a1be-e759c4ef18cf	role_grc_owner	compliance_officer	t	1	t	2026-03-17 08:24:21.019815+08	t
9b64377c-4467-4a03-b3d1-64bc8c596e07	role_grc_owner	risk_manager	t	1	t	2026-03-17 08:24:21.019815+08	t
57c9167f-45b1-4881-8d14-dffaa013627c	role_grc_owner	admin	f	2	t	2026-03-17 08:24:21.019815+08	t
64a4403d-9df5-4883-89e3-70f2763f5213	role_control_owner	manager	t	1	t	2026-03-17 08:24:21.019815+08	t
46e52e17-2c7b-4bb2-914e-a1d7f92da4b8	role_control_owner	user	t	1	t	2026-03-17 08:24:21.019815+08	t
754b18ae-6119-4615-afd5-33517b7ced55	role_auditor	auditor	t	1	t	2026-03-17 08:24:21.019815+08	t
ee8aa3d5-e65d-4493-9889-572048a18e0f	compliance_ops	*	f	10	t	2026-03-17 08:24:21.019815+08	t
92624ef1-ffe8-4a29-bd53-9df4917d1bf4	risk_ops	*	f	11	t	2026-03-17 08:24:21.019815+08	t
d2bb4ff0-e9ed-491d-b753-4a8b777ebc3d	evidence_ops	*	f	12	t	2026-03-17 08:24:21.019815+08	t
e2965e4e-2ba3-4a93-a659-961a9e72a2a8	audit_ops	*	f	13	t	2026-03-17 08:24:21.019815+08	t
65bf628b-265d-4512-8481-685f336519e9	governance_hub	*	f	14	t	2026-03-17 08:24:21.019815+08	t
79e7f86b-9bff-40d5-9c6e-9a58d89f6e69	incident_hub	*	f	15	t	2026-03-17 08:24:21.019815+08	t
1ca47cc9-7580-4b61-ae6b-5504a0000e9d	vendor_hub	*	f	16	t	2026-03-17 08:24:21.019815+08	t
55272308-30f7-433a-849c-6251bb4c76dc	ai_suite	*	f	17	t	2026-03-17 08:24:21.019815+08	t
ea8455f3-d004-4316-a690-f3f626047853	agrc-executive	executive_owner	t	0	t	2026-03-17 08:24:21.040852+08	t
8f7a066f-4312-474b-807c-2753085a0c77	government-command	executive_owner	f	0	t	2026-03-17 08:24:21.040852+08	t
0234678c-9cc1-4435-8b54-4a92ff2c5ea0	risk-operations	risk_manager	t	0	t	2026-03-17 08:24:21.040852+08	t
6a426634-5618-422a-9ea6-7269f3553db8	audit-evidence	auditor	t	0	t	2026-03-17 08:24:21.040852+08	t
a39752e6-4e19-4346-86b9-b29ffa2b18bb	privacy-assurance	privacy_officer	t	0	t	2026-03-17 08:24:21.040852+08	t
c324d6d5-7a9e-4db3-adfc-42b42b0de83a	qiyas-executive	assessment_lead	t	0	t	2026-03-17 08:24:21.040852+08	t
\.


ALTER TABLE __TENANT_SCHEMA__.dashboard_role_bindings ENABLE TRIGGER ALL;

--
-- Data for Name: dashboard_shares; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.dashboard_shares DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.dashboard_shares (share_id, dashboard_code, shared_by, share_type, shared_with, permission, custom_layout, filters, expires_at, active, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.dashboard_shares ENABLE TRIGGER ALL;

--
-- Data for Name: dashboard_widget_registry; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.dashboard_widget_registry DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.dashboard_widget_registry (widget_id, widget_key, label_en, label_ar, module_code, component_key, default_width, default_height, config_schema, default_config, is_system, is_active, sort_order, metadata, created_at, updated_at) FROM stdin;
a2957bd9-7d16-42ae-9d10-05c44eaa5e79	engine-executive-summary-widget	Engine Summary	ملخص المحرك	executive	engine-executive-summary-widget	12	4	\N	\N	t	t	1	\N	2026-03-17 08:24:21.06474+08	2026-03-17 08:24:21.06474+08
75963c88-0634-41d7-b27d-e435e8e66430	top-breached-kris-widget	Top Breached KRIs	أعلى مؤشرات المخاطر المخترقة	executive	top-breached-kris-widget	6	4	\N	\N	t	t	2	\N	2026-03-17 08:24:21.06474+08	2026-03-17 08:24:21.06474+08
007b99fc-0ce1-40c6-a9cb-77c1c4e3ba9c	policy-review-debt-widget	Policy Review Debt	ديون مراجعة السياسات	executive	policy-review-debt-widget	6	4	\N	\N	t	t	3	\N	2026-03-17 08:24:21.06474+08	2026-03-17 08:24:21.06474+08
6a5ae1d2-7618-47cf-b2e4-860f30c69024	engine-trend-widget	Engine Trend	اتجاه المحرك	executive	engine-trend-widget	12	4	\N	\N	t	t	4	\N	2026-03-17 08:24:21.06474+08	2026-03-17 08:24:21.06474+08
9af16467-58b3-487d-a6c2-1fe7206b010f	risk-heatmap	Risk Heatmap	الخريطة الحرارية للمخاطر	risk	risk-heatmap-widget	6	4	\N	{}	t	t	20	\N	2026-03-17 08:24:21.040852+08	2026-03-17 08:24:24.405673+08
6f4ad37a-51c3-4909-a80b-fea063701ba0	overdue-actions	Overdue Actions	الإجراءات المتأخرة	governance	overdue-actions-widget	6	3	\N	{}	t	t	30	\N	2026-03-17 08:24:21.040852+08	2026-03-17 08:24:24.405673+08
efeee6d2-88dd-4c06-814c-b49e4e9e48e2	audit-exposure	Audit Exposure	تعرض التدقيق	audit	audit-exposure-widget	6	3	\N	{}	t	t	40	\N	2026-03-17 08:24:21.040852+08	2026-03-17 08:24:24.405673+08
db239289-092c-4dab-91c3-182d57d52b50	privacy-incidents	Privacy Incidents	حوادث الخصوصية	privacy	privacy-incidents-widget	6	3	\N	{}	t	t	50	\N	2026-03-17 08:24:21.040852+08	2026-03-17 08:24:24.405673+08
7d08c516-6251-4564-8fea-971d3762d267	maturity-score	Maturity Score	درجة النضج	qiyas	maturity-score-widget	6	3	\N	{}	t	t	60	\N	2026-03-17 08:24:21.040852+08	2026-03-17 08:24:24.405673+08
bf5ad159-52ba-45d9-a75b-211a8c7776a4	assessment-progress	Assessment Progress	تقدم التقييم	qiyas	assessment-progress-widget	6	3	\N	{}	t	t	70	\N	2026-03-17 08:24:21.040852+08	2026-03-17 08:24:24.405673+08
81311359-bd70-4c88-9da2-044bc05a2b47	recommendations	Recommendations	التوصيات	qiyas	recommendations-widget	6	4	\N	{}	t	t	80	\N	2026-03-17 08:24:21.040852+08	2026-03-17 08:24:24.405673+08
efa9687b-3a80-4952-91ae-5eac4426ea15	evidence-coverage	Evidence Coverage	تغطية الأدلة	evidence	evidence-coverage-widget	6	3	\N	{}	t	t	90	\N	2026-03-17 08:24:21.040852+08	2026-03-17 08:24:24.405673+08
763a770d-8cc4-405c-a7bb-2cdae98079bb	kri-status	KRI Status	حالة مؤشرات المخاطر	risk	kri-status-widget	6	3	\N	{}	t	t	100	\N	2026-03-17 08:24:21.040852+08	2026-03-17 08:24:24.405673+08
6a4c77c0-bd70-4a11-b1b2-a1a1046b74f5	executive-summary	Executive Summary	الملخص التنفيذي	dashboard	executive-summary-widget	6	3	\N	{}	t	t	10	\N	2026-03-17 08:24:21.040852+08	2026-03-17 08:24:24.408872+08
2a642ef6-4b6c-4615-a94a-3b048a747980	top-breached-kris	Top Breached KRIs	أعلى مؤشرات المخاطر المتجاوزة	risk	top-breached-kris-widget	6	4	\N	{}	t	t	20	\N	2026-03-17 08:24:21.063135+08	2026-03-17 08:24:24.408872+08
16bffe2a-55d9-4463-91e3-f639ed961ae3	policy-review-debt	Policy Review Debt	ديون مراجعة السياسات	governance	policy-review-debt-widget	6	4	\N	{}	t	t	30	\N	2026-03-17 08:24:21.063135+08	2026-03-17 08:24:24.408872+08
5f8ed5c2-17b6-4891-97a7-bda758d6fa2c	engine-trend	Engine Trend	اتجاه المحرك	dashboard	engine-trend-widget	12	5	\N	{}	t	t	40	\N	2026-03-17 08:24:21.063135+08	2026-03-17 08:24:24.408872+08
\.


ALTER TABLE __TENANT_SCHEMA__.dashboard_widget_registry ENABLE TRIGGER ALL;

--
-- Data for Name: data_asset_types; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.data_asset_types DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.data_asset_types (type_id, code, name_en, name_ar, description, category, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.data_asset_types ENABLE TRIGGER ALL;

--
-- Data for Name: data_domains; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.data_domains DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.data_domains (domain_id, name_en, name_ar, description, owner_id, classification_level, parent_domain_id, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.data_domains ENABLE TRIGGER ALL;

--
-- Data for Name: data_assets; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.data_assets DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.data_assets (asset_id, domain_id, name_en, name_ar, asset_type_id, description, owner_id, classification, sensitivity_level, location, status, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.data_assets ENABLE TRIGGER ALL;

--
-- Data for Name: data_asset_owners; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.data_asset_owners DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.data_asset_owners (ownership_id, asset_id, user_id, ownership_type, is_primary, assigned_at, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.data_asset_owners ENABLE TRIGGER ALL;

--
-- Data for Name: data_classifications; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.data_classifications DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.data_classifications (classification_id, code, name_en, name_ar, description, sensitivity_level, handling_requirements, retention_requirements, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.data_classifications ENABLE TRIGGER ALL;

--
-- Data for Name: data_quality_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.data_quality_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.data_quality_rules (rule_id, domain_id, rule_name, rule_type, expression, severity, enabled, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.data_quality_rules ENABLE TRIGGER ALL;

--
-- Data for Name: data_quality_issues; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.data_quality_issues DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.data_quality_issues (issue_id, rule_id, asset_id, description, severity, status, detected_at, resolved_at, resolved_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.data_quality_issues ENABLE TRIGGER ALL;

--
-- Data for Name: data_sharing_requests; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.data_sharing_requests DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.data_sharing_requests (request_id, requester_id, requester_org, data_assets, purpose, legal_basis, recipient_org, cross_border, status, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.data_sharing_requests ENABLE TRIGGER ALL;

--
-- Data for Name: data_sharing_approvals; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.data_sharing_approvals DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.data_sharing_approvals (approval_id, request_id, approver_id, decision, conditions, approved_at, valid_until, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.data_sharing_approvals ENABLE TRIGGER ALL;

--
-- Data for Name: data_stewards; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.data_stewards DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.data_stewards (steward_id, domain_id, user_id, stewardship_type, responsibilities, assigned_at, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.data_stewards ENABLE TRIGGER ALL;

--
-- Data for Name: defense_lines; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.defense_lines DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.defense_lines (line_number, name_en, name_ar, description_en, description_ar, color) FROM stdin;
1	1st Line: Business Operations	خط الدفاع الأول: العمليات التجارية	Business units and operational management who own and manage risks	وحدات الأعمال والإدارة التشغيلية المسؤولة عن إدارة المخاطر	#3b82f6
2	2nd Line: Risk & Compliance	خط الدفاع الثاني: المخاطر والامتثال	Risk management, compliance, and oversight functions	إدارة المخاطر والامتثال ووظائف الرقابة	#f59e0b
3	3rd Line: Internal Audit	خط الدفاع الثالث: التدقيق الداخلي	Independent assurance through internal and external audit	ضمان مستقل من خلال التدقيق الداخلي والخارجي	#ef4444
\.


ALTER TABLE __TENANT_SCHEMA__.defense_lines ENABLE TRIGGER ALL;

--
-- Data for Name: delegated_authorities; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.delegated_authorities DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.delegated_authorities (delegation_id, delegator_user_id, delegate_user_id, authority_type, scope_type, scope_id, valid_from, valid_to, conditions, status, approved_by, approved_at, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.delegated_authorities ENABLE TRIGGER ALL;

--
-- Data for Name: delegation_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.delegation_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.delegation_rules (rule_id, tenant_id, user_id, agent_id, action_type, allowed, max_risk_level, requires_notification, time_window_start, time_window_end, max_per_day, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.delegation_rules ENABLE TRIGGER ALL;

--
-- Data for Name: delegations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.delegations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.delegations (id, from_user_id, to_user_id, functional_role_code, module_code, scope_type, scope_id, valid_from, valid_to, reason, is_active, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.delegations ENABLE TRIGGER ALL;

--
-- Data for Name: departments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.departments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.departments (dept_id, bu_id, name_en, name_ar, code, head_user_id, status, metadata, created_at, updated_at, deleted_at, created_by, updated_by, nca_function_code, is_critical_function, regulatory_reporting, data_classification, org_unit_id, description_ar, parent_department_id) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.departments ENABLE TRIGGER ALL;

--
-- Data for Name: digital_signatures; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.digital_signatures DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.digital_signatures (signature_id, entity_type, entity_id, signer_id, signer_name, signer_role, signature_type, signature_hash, certificate_ref, ip_address, user_agent, status, revoked_at, revoked_reason, signed_at, expires_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.digital_signatures ENABLE TRIGGER ALL;

--
-- Data for Name: documents; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.documents DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.documents (doc_id, tenant_id, title, doc_type, version, status, owner_id, dept_id, classification, file_path, file_size_bytes, content_hash, retention_until, review_date, tags, metadata, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.documents ENABLE TRIGGER ALL;

--
-- Data for Name: document_reviews; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.document_reviews DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.document_reviews (review_id, doc_id, reviewer_id, status, comments, reviewed_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.document_reviews ENABLE TRIGGER ALL;

--
-- Data for Name: document_versions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.document_versions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.document_versions (version_id, doc_id, version_number, change_summary, file_path, file_size_bytes, content_hash, created_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.document_versions ENABLE TRIGGER ALL;

--
-- Data for Name: dpia_assessments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.dpia_assessments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.dpia_assessments (dpia_id, title, status, created_by, data, created_at, updated_at, description, processing_activity, data_categories, data_subjects, legal_basis, necessity_assessment, risk_assessment, mitigation_measures, consultation_required, consultation_details, dpo_opinion, overall_risk_level, assessor_id, reviewer_id, approved_by, approved_at, linked_ropa_entry_id, linked_system_ids, workspace_id) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.dpia_assessments ENABLE TRIGGER ALL;

--
-- Data for Name: drawer_templates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.drawer_templates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.drawer_templates (template_id, template_key, name_en, name_ar, zones, context_type, sort_order, created_at, updated_at) FROM stdin;
a7947669-c16c-4a63-b04f-747449a3c7bb	entity_detail	Entity Detail	تفاصيل الكيان	[{"id": "header", "title_ar": "التفاصيل", "title_en": "Details"}, {"id": "actions", "title_ar": "الإجراءات", "title_en": "Actions"}, {"id": "timeline", "title_ar": "الجدول الزمني", "title_en": "Timeline"}, {"id": "related", "title_ar": "مرتبط", "title_en": "Related"}]	entity	1	2026-03-17 08:24:18.872899+08	2026-03-17 08:24:24.384572+08
f0d40d94-1c29-407e-899b-4fe735be525a	risk_detail	Risk Detail	تفاصيل المخاطر	[{"id": "header", "title_ar": "المخاطر", "title_en": "Risk"}, {"id": "treatment", "title_ar": "المعالجة", "title_en": "Treatment"}, {"id": "controls", "title_ar": "الضوابط", "title_en": "Controls"}, {"id": "timeline", "title_ar": "السجل", "title_en": "History"}]	risk	2	2026-03-17 08:24:18.872899+08	2026-03-17 08:24:24.384572+08
d2360c46-0fac-4ba5-978e-c02a978f319c	control_detail	Control Detail	تفاصيل الضابط	[{"id": "header", "title_ar": "الضابط", "title_en": "Control"}, {"id": "evidence", "title_ar": "الأدلة", "title_en": "Evidence"}, {"id": "tests", "title_ar": "الاختبارات", "title_en": "Tests"}, {"id": "timeline", "title_ar": "السجل", "title_en": "History"}]	control	3	2026-03-17 08:24:18.872899+08	2026-03-17 08:24:24.384572+08
fbc5d260-8284-4959-8819-b22d54bc8837	policy_detail	Policy Detail	تفاصيل السياسة	[{"id": "header", "title_ar": "السياسة", "title_en": "Policy"}, {"id": "approvals", "title_ar": "الموافقات", "title_en": "Approvals"}, {"id": "related", "title_ar": "مرتبط", "title_en": "Related"}]	policy	4	2026-03-17 08:24:18.872899+08	2026-03-17 08:24:24.384572+08
da3de9c0-9f94-4c6b-a404-07d43af061ff	assessment_detail	Assessment Detail	تفاصيل التقييم	[{"id": "header", "title_ar": "التقييم", "title_en": "Assessment"}, {"id": "progress", "title_ar": "التقدم", "title_en": "Progress"}, {"id": "findings", "title_ar": "النتائج", "title_en": "Findings"}]	assessment	5	2026-03-17 08:24:18.872899+08	2026-03-17 08:24:24.384572+08
85e05043-9573-4aa4-ba8d-c87bdbdcf8b3	evidence_detail	Evidence Detail	تفاصيل الدليل	[{"id": "header", "title_ar": "الدليل", "title_en": "Evidence"}, {"id": "custody", "title_ar": "العهدة", "title_en": "Custody"}, {"id": "linked_controls", "title_ar": "الضوابط المرتبطة", "title_en": "Linked Controls"}]	evidence	6	2026-03-17 08:24:18.872899+08	2026-03-17 08:24:24.384572+08
\.


ALTER TABLE __TENANT_SCHEMA__.drawer_templates ENABLE TRIGGER ALL;

--
-- Data for Name: email_inbox; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.email_inbox DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.email_inbox (inbox_id, graph_message_id, conversation_id, internet_message_id, subject, body_preview, body_html, body_text, from_address, from_name, to_addresses, cc_addresses, importance, has_attachments, attachments, categories, is_read, received_at, folder, status, linked_entity_type, linked_entity_id, processed_by, processed_at, synced_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.email_inbox ENABLE TRIGGER ALL;

--
-- Data for Name: email_send_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.email_send_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.email_send_log (send_id, template_key, recipient_email, recipient_user_id, subject, status, provider, provider_message_id, error_message, metadata, queued_at, sent_at, delivered_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.email_send_log ENABLE TRIGGER ALL;

--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.email_templates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.email_templates (template_id, template_key, name_en, name_ar, subject_en, subject_ar, body_html_en, body_html_ar, body_text_en, body_text_ar, variables, category, enabled, version, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.email_templates ENABLE TRIGGER ALL;

--
-- Data for Name: enforcement_gate_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.enforcement_gate_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.enforcement_gate_log (gate_log_id, gate_type, subject_id, subject_name, allowed, reason, requested_by, details, overridden, overridden_by, override_justification, overridden_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.enforcement_gate_log ENABLE TRIGGER ALL;

--
-- Data for Name: functional_roles; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.functional_roles DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.functional_roles (id, code, module_code, name, description, created_at, updated_at) FROM stdin;
1	risk_creator	risk	Risk Creator	Creates new risk records	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
2	risk_owner	risk	Risk Owner	Owns and manages risk records	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
3	risk_reviewer	risk	Risk Reviewer	Reviews risk assessments	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
4	risk_approver	risk	Risk Approver	Approves risk assessments and treatment plans	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
5	treatment_owner	risk	Treatment Owner	Owns and manages risk treatment plans	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
6	control_owner	compliance	Control Owner	Owns control design and effectiveness	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
7	control_tester	compliance	Control Tester	Tests control effectiveness	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
8	compliance_analyst	compliance	Compliance Analyst	Analyzes compliance status	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
9	compliance_manager	compliance	Compliance Manager	Manages compliance program	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
10	policy_author	policy	Policy Author	Drafts and creates policies	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
11	policy_reviewer	policy	Policy Reviewer	Reviews policy drafts	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
12	policy_approver	policy	Policy Approver	Approves policies for publication	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
13	document_controller	policy	Document Controller	Manages document lifecycle and versions	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
14	evidence_owner	evidence	Evidence Owner	Owns and uploads evidence items	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
15	evidence_reviewer	evidence	Evidence Reviewer	Reviews and validates evidence	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
16	custodian	evidence	Custodian	Manages evidence custody and retention	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
17	auditor	audit	Auditor	Performs audit procedures	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
18	audit_manager	audit	Audit Manager	Manages audit engagements and reports	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
19	auditee_owner	audit	Auditee Owner	Responds to audit findings	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
20	incident_reporter	incident	Incident Reporter	Reports new incidents	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
21	incident_owner	incident	Incident Owner	Owns and manages incidents	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
22	incident_reviewer	incident	Incident Reviewer	Reviews incident investigations	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
23	incident_approver	incident	Incident Approver	Approves incident closure	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
24	exception_requester	exception	Exception Requester	Requests policy exceptions	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
25	exception_owner	exception	Exception Owner	Owns exception management	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
26	exception_approver	exception	Exception Approver	Approves exceptions	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
27	governance_manager	governance	Governance Manager	Manages governance bodies	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
28	committee_secretary	governance	Committee Secretary	Manages committee proceedings	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
29	charter_owner	governance	Charter Owner	Owns governance charters	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
30	delegation_admin	governance	Delegation Admin	Manages delegation matrix	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
31	executive_reviewer	governance	Executive Reviewer	Executive-level review and oversight	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
32	vendor_owner	vendor	Vendor Owner	Owns vendor relationships	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
33	vendor_assessor	vendor	Vendor Assessor	Assesses vendor risk	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
34	bcp_coordinator	bcp	BCP Coordinator	Coordinates business continuity	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
35	process_owner	bcp	Process Owner	Owns business processes for BCP	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
36	asset_owner	asset	Asset Owner	Owns and manages assets	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
37	asset_custodian	asset	Asset Custodian	Manages asset custody	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
38	action_owner	action	Action Owner	Owns and executes action items	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
39	report_designer	reporting	Report Designer	Creates report templates and dashboards	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
40	report_viewer	reporting	Report Viewer	Views reports and dashboards	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
41	approval_requester	approval	Approval Requester	Creates approval requests	2026-03-17 08:24:23.656243+08	2026-03-17 08:24:23.656243+08
43	approval_admin	approval	Approval Admin	Manages approval workflows	2026-03-17 08:24:23.656243+08	2026-03-17 08:24:23.656243+08
44	team_manager	team	Team Manager	Manages team composition and RACI assignments	2026-03-17 08:24:23.660864+08	2026-03-17 08:24:23.660864+08
45	team_member	team	Team Member	Standard team member with read access	2026-03-17 08:24:23.660864+08	2026-03-17 08:24:23.660864+08
46	remediation_owner	remediation	Remediation Owner	Owns and manages remediation tasks	2026-03-17 08:24:23.660864+08	2026-03-17 08:24:23.660864+08
47	remediation_reviewer	remediation	Remediation Reviewer	Reviews remediation progress	2026-03-17 08:24:23.660864+08	2026-03-17 08:24:23.660864+08
53	ai_admin	ai	AI Admin	Manages AI models, triggers, and squads	2026-03-17 08:24:23.664693+08	2026-03-17 08:24:23.664693+08
56	integrations_admin	integrations	Integrations Admin	Manages integration connectors	2026-03-17 08:24:23.664693+08	2026-03-17 08:24:23.664693+08
59	agrc_operator	agrc	AGRC Operator	Views AGRC-OS engine and agents	2026-03-17 08:24:23.664693+08	2026-03-17 08:24:23.664693+08
60	agrc_admin	agrc	AGRC Admin	Manages AGRC-OS engine and configuration	2026-03-17 08:24:23.664693+08	2026-03-17 08:24:23.664693+08
49	workflow_user	workflow	Workflow User	Executes and participates in workflow tasks	2026-03-17 08:24:23.664693+08	2026-03-17 08:24:24.309172+08
48	workflow_designer	workflow	Workflow Designer	Designs and configures workflow templates	2026-03-17 08:24:23.664693+08	2026-03-17 08:24:24.309172+08
52	ai_operator	ai	AI Operator	Operates AI-assisted governance tools	2026-03-17 08:24:23.664693+08	2026-03-17 08:24:24.309172+08
54	analytics_viewer	analytics	Analytics Viewer	Views analytics dashboards and reports	2026-03-17 08:24:23.664693+08	2026-03-17 08:24:24.309172+08
55	analytics_admin	analytics	Analytics Admin	Administers analytics configuration and access	2026-03-17 08:24:23.664693+08	2026-03-17 08:24:24.309172+08
57	task_user	task	Task User	Creates and manages task assignments	2026-03-17 08:24:23.664693+08	2026-03-17 08:24:24.309172+08
58	knowledge_contributor	knowledge	Knowledge Contributor	Contributes to the knowledge base	2026-03-17 08:24:23.664693+08	2026-03-17 08:24:24.309172+08
50	training_admin	training	Training Admin	Administers training programs and campaigns	2026-03-17 08:24:23.664693+08	2026-03-17 08:24:24.309172+08
51	training_participant	training	Training Participant	Participates in training and awareness programs	2026-03-17 08:24:23.664693+08	2026-03-17 08:24:24.309172+08
42	approval_approver	approval	Approval Approver	Approves items in the approval center	2026-03-17 08:24:23.656243+08	2026-03-17 08:24:24.309172+08
\.


ALTER TABLE __TENANT_SCHEMA__.functional_roles ENABLE TRIGGER ALL;

--
-- Data for Name: enterprise_user_role_assignments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.enterprise_user_role_assignments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.enterprise_user_role_assignments (id, user_id, functional_role_code, module_code, scope_type, scope_id, authority_level, valid_from, valid_to, is_primary, granted_by, is_active, created_at, updated_at) FROM stdin;
1	34bd942b-c740-406b-8534-e5ea6a27324b	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
2	afa3a4b2-7c1c-42a2-a912-21b9c43302e7	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
3	89187978-3fb7-4b81-9d42-6867b0fbd9d1	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
4	32a22a87-214a-40c7-958a-88af6a66bb6e	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
5	bccfd617-2c35-4aa2-b32c-84ebc56aa644	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
6	fdf8e8e9-fbab-46fc-a4cf-266e80b252d7	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
7	f993169f-a32d-4304-85d1-d736a1a19da1	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
8	fb0472d6-1f79-4310-85fd-c2de5b059080	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
9	d1a1f005-9a77-431f-a846-c6d964271964	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
10	7c8d67d4-8558-4afa-a544-bb6c391f2f7b	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
11	f995c42f-37d9-4f4c-b4e0-823d5c53047e	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
12	bb92db5d-04c6-4488-869e-617450b3a65b	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
13	489d22da-ede6-41a7-a12c-20153811f8cd	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
14	c75df3df-dabe-4353-99e9-a694d7597941	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
15	826d68d3-8183-4ee0-abf7-c9431ead2c3f	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
16	275a7d45-b9dc-453a-a3d6-726e9cb596d8	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
17	dc96be2c-c3e1-43e0-826b-37870ac4679c	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
18	dda442b5-64f6-4757-993c-6e6930ce5d2d	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
19	089faf99-a660-4e2f-b7c2-20f0f50219c2	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
20	19708998-9a7e-4386-8ad8-ce501cddbf08	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
21	54e43730-d17d-428d-b55e-3c419c234dd1	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
22	fe3c9142-6e54-4721-8342-3e00dfd70207	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
23	d4de0404-8df5-4d9a-ba76-3ff22781c468	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
24	47de9f48-cf57-4d78-bdd0-dff86cf60470	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
25	339d11f5-ad27-4fae-98ba-7105f0856bc3	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
26	77364214-45a9-4364-9176-48b1c212f946	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
27	b4061524-0822-4774-b34b-3cb226ac30ef	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
28	451c236b-ecfb-4d57-bc45-b1a5d9c8ee53	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
29	747c4fed-b22d-4e17-a9b2-92e453d4e775	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
30	0ad3aa8d-c179-404d-ac88-dde4b09fbbde	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
31	c6b388de-0bb8-4d67-81f8-714422472508	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
32	dd62ddef-f170-4246-ba48-b18f1c78f2a4	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
33	dd7876eb-adc7-4bb3-8862-4927b65dba47	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
34	522f7096-7e84-482e-a603-34fb8ec5708a	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
35	f7746237-c031-42f9-99db-113431ab4993	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
36	1fe3d0af-d36e-4318-8c7e-cf18486f4408	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
37	b22bfa79-cc2d-42d9-89bc-c94fa2938e45	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
38	38b09f86-7742-40cc-a44a-6b8be91d129e	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
39	abcd8e69-aeff-4845-94a6-373dccc814a7	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
40	84218e79-27ea-40b8-9d2a-8c6ca2b26c4c	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
41	276b8e8b-5b4a-415e-ab9d-f1247cc8d8cd	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
42	201a9f76-ff1e-4961-8dc3-f64405ec5a46	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
43	fb6491a7-283d-4a69-82e1-082c6725fbb6	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
44	709ba336-14d7-41ba-91ac-7d750837534f	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
45	a4a3000b-4be8-40e9-8fc8-d946d7395ade	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
46	328f230b-fc86-4516-9602-ce2e0099da84	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
47	4df5f06b-567a-4dcb-a3c4-86ef33a33b1d	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
48	d49da3c5-7e80-482a-b8ca-77aad15fe06f	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
49	b4a28284-e731-4799-a3ce-db2eabcda731	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
50	abe170d4-0d8b-4fd2-98f0-9d1a838190b3	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
51	d4e5d81c-c4a7-4749-9555-87b65e9affc5	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
52	b2528b32-da5e-4fd6-b1ef-b4810436797e	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
53	b6defc0b-5556-49df-b662-38c2dc932637	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
54	5822f3db-2e68-476a-9541-da5b71318a58	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
55	d6452e40-b1c8-40a3-8e28-26fdb8ca4d7f	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
56	8915b084-33b6-4043-98ed-7a07a89a1413	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
57	cb995a5f-4ba8-4763-a4a9-fc54b796199b	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
58	1584e708-27ab-47c3-903f-6fcad5d261c0	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
59	b868f1a8-01c2-487e-ba5c-bcd355ef62ef	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
60	e529968c-138e-4c3b-9f7b-e0d0acde124a	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
61	d8d086e1-6197-4be4-abf8-75e4ae3f59c0	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
62	3d96e27f-f102-4147-8360-787c40d1176a	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
63	09ea4103-cb58-4a69-b28e-3f8c5bd5ce43	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
64	8a907c8d-c3af-4513-b4f2-12864ed35fc1	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
65	d159003f-5fd5-49c9-b3e8-3961391eeabd	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
66	e098352c-9c75-4edb-8ba3-3f635a17ac41	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
67	d077ef56-e4fd-45cd-a2b4-a71bdbf906f4	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
68	6959a7b1-846a-42c9-b72a-8b4887472d9e	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
69	4d880cd3-fa86-4cac-9364-63ffd6ca6c74	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
70	00225fee-7bf2-49e1-895f-4a5416bfc0be	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
71	653fde63-243c-46d1-8deb-ee2d876e972c	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
72	b372db2f-45fb-443e-a667-89a94d053b76	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
73	5c20bb15-0725-495d-94f2-f48d07926609	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
74	7b941b59-7eae-4958-a0b8-39e933f9879b	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
75	28fb501b-4e5d-4a83-90da-5eb549d1e77e	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
76	bcd48acd-2264-4dd9-a629-0c2ec7dc3b7c	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
77	aeb7d822-09d0-408e-8d7d-bdcd2faeac35	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
78	1b1bd698-0e29-4a0e-94f7-e6eeb30eede2	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
79	0085cf67-9de1-4047-9e18-434451b58a1d	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
80	a44004e3-7dcf-4962-bff3-ad73a5c59ee8	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
81	e60ab6d3-7dac-4cbb-ac1c-0d20d7fdf48c	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
82	66fd3f94-c63a-4233-a8f6-8aab32bfe80e	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
83	201ea33f-1432-4b03-ad43-0b3675c107a7	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
84	ab64aaa9-4a96-4676-a94c-1ade243b6db6	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
85	ce18cb4e-0731-4aab-8ad5-407e5f2e7cf4	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
86	626b314b-b196-4a85-949b-e0cfeca1da29	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
87	31d6301f-9b08-4f6a-b4aa-6a523e23c273	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
88	f2f0f208-e292-4162-a4f2-6d20796d69fc	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
89	4030aed6-4fa0-4ddc-8e4d-436673f01705	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
90	ebbe5b22-d07a-46a6-b92d-a22a20dcc518	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
91	c08c7849-d019-4be0-be62-801f0f0a35f0	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
92	546fcd00-335a-400f-b4d7-a31f8dd67d7c	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
93	f5abb52f-2e96-43c7-bcc6-4a7865f1a5f0	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
94	d9668eba-8088-42d2-ba9a-806349ab41a5	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
95	133be2a7-8046-40e3-9c60-8b0e6ddb538a	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
96	20d638f3-915c-4ee2-8621-6bf9529a34d6	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
97	6f003f82-60c6-4fc6-b915-74a7c4ef3abf	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
98	469eadeb-9e8c-4dae-8fc0-f3cc3585d2ae	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
99	9c145681-b230-4394-b4b5-b9262a28b631	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
100	dfe896d5-6e4f-47cb-b78a-fff93271b642	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
101	525f9a1d-2a10-48a0-9e09-d379f04c3f9a	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
102	a858aa79-7366-45cf-9cd4-114d33b91124	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
103	c7723648-2d95-48df-9f90-d15495d6c09d	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
104	fd629d65-3a59-4235-a594-7e3e3849070a	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
105	13c7cf0b-d2ac-4143-b816-968da18913ed	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
106	7e13eed4-791b-40d2-80d1-0b6727347ed2	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
107	538a37f1-04c6-4474-ab58-eda9ab1a15af	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
108	50510716-5e7c-4880-8a2f-d9b9c8e35405	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
109	a5956d10-5f6c-4a8a-b642-6bda384d41d3	report_viewer	reporting	tenant	\N	submit	\N	\N	f	system_migration_173	t	2026-03-17 08:24:23.75953+08	2026-03-17 08:24:23.75953+08
\.


ALTER TABLE __TENANT_SCHEMA__.enterprise_user_role_assignments ENABLE TRIGGER ALL;

--
-- Data for Name: org_dimensions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.org_dimensions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.org_dimensions (dimension_id, tenant_id, code, name_en, name_ar, description_en, description_ar, is_system, sort_order, deleted_at, created_at, updated_at) FROM stdin;
b9ffaa6d-e7f8-4ed9-8167-fe93efa487b7	00000000-0000-0000-0000-000000000000	geography	Geography	الجغرافيا	Geographic regions and locations	\N	t	1	\N	2026-03-17 08:24:24.225291+08	2026-03-17 08:24:24.225291+08
28ce15d0-5260-40c4-a8d8-e58e687907c6	00000000-0000-0000-0000-000000000000	product_line	Product Line	خط المنتجات	Business product or service lines	\N	t	2	\N	2026-03-17 08:24:24.225291+08	2026-03-17 08:24:24.225291+08
631b3ef9-bbb7-47c9-ad74-ea5af71c2eef	00000000-0000-0000-0000-000000000000	regulatory_jurisdiction	Regulatory Jurisdiction	الاختصاص التنظيمي	Regulatory jurisdictions and authorities	\N	t	3	\N	2026-03-17 08:24:24.225291+08	2026-03-17 08:24:24.225291+08
\.


ALTER TABLE __TENANT_SCHEMA__.org_dimensions ENABLE TRIGGER ALL;

--
-- Data for Name: org_dimension_values; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.org_dimension_values DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.org_dimension_values (value_id, dimension_id, tenant_id, code, label_en, label_ar, parent_value_id, metadata, sort_order, deleted_at, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.org_dimension_values ENABLE TRIGGER ALL;

--
-- Data for Name: entity_dimension_assignments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.entity_dimension_assignments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.entity_dimension_assignments (assignment_id, tenant_id, entity_type, entity_id, dimension_id, value_id, is_primary, created_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.entity_dimension_assignments ENABLE TRIGGER ALL;

--
-- Data for Name: entity_link_metadata; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.entity_link_metadata DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.entity_link_metadata (metadata_id, link_id, key, value, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.entity_link_metadata ENABLE TRIGGER ALL;

--
-- Data for Name: entity_links; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.entity_links DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.entity_links (link_id, source_type, source_id, target_type, target_id, link_type, created_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.entity_links ENABLE TRIGGER ALL;

--
-- Data for Name: entity_type_routing_config; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.entity_type_routing_config DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.entity_type_routing_config (id, entity_type, module_code, domain_code, default_functional_role, default_team_code, scope_type, active, created_at, updated_at) FROM stdin;
1	risk	risk	risk_management	risk_owner	ERM	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
2	control	compliance	compliance_monitoring	control_owner	CYBER_GOV	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
3	policy	policy	compliance_monitoring	policy_author	QUALITY	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
4	evidence	evidence	audit_assurance	evidence_owner	AUDIT	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
5	vendor	vendor	vendor_risk_assessment	vendor_owner	VENDOR_RISK	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
6	incident	incident	incident_response	incident_reporter	SOC_OPS	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
7	compliance_gap	compliance	compliance_monitoring	compliance_analyst	CYBER_GOV	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
8	finding	audit	audit_assurance	auditor	AUDIT	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
9	remediation_task	remediation	risk_management	remediation_owner	ERM	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
10	assessment	audit	audit_assurance	auditor	AUDIT	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
11	user	admin	data_protection	\N	IAM_GOV	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
12	report	analytics	audit_assurance	analytics_viewer	EXEC_STRATEGY	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
13	bcm	bcp	bcm_disaster_recovery	\N	BCM_DR	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
14	change	governance	change_management	governance_manager	SVC_OPS	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
15	privacy	governance	data_protection	\N	PRIVACY	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
16	governance_action	governance	governance_oversight	governance_manager	CYBER_GOV	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
17	committee	governance	governance_oversight	governance_manager	EXEC_STRATEGY	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
18	procedure	governance	compliance_monitoring	governance_manager	QUALITY	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
19	mandate	governance	governance_oversight	governance_manager	EXEC_STRATEGY	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
20	enforcement_violation	governance	compliance_monitoring	compliance_analyst	CYBER_GOV	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
21	exception	exception	compliance_monitoring	compliance_analyst	CYBER_GOV	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
22	asset	asset	asset_management	\N	SVC_OPS	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
23	delegation	governance	governance_oversight	governance_manager	EXEC_STRATEGY	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
24	obligation	governance	compliance_monitoring	compliance_analyst	CYBER_GOV	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
25	responsibility	governance	governance_oversight	governance_manager	EXEC_STRATEGY	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
26	charter	governance	governance_oversight	governance_manager	EXEC_STRATEGY	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
27	objective	governance	governance_oversight	governance_manager	EXEC_STRATEGY	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
28	board_pack	governance	governance_oversight	governance_manager	EXEC_STRATEGY	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
29	governance_auto_fire	governance	governance_oversight	governance_manager	CYBER_GOV	tenant	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08
\.


ALTER TABLE __TENANT_SCHEMA__.entity_type_routing_config ENABLE TRIGGER ALL;

--
-- Data for Name: erp_connections; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.erp_connections DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.erp_connections (connection_id, name, erp_type, endpoint_url, auth_method, credentials_encrypted, sync_schedule_cron, sync_enabled, last_validated_at, validation_status, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.erp_connections ENABLE TRIGGER ALL;

--
-- Data for Name: erp_field_mappings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.erp_field_mappings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.erp_field_mappings (mapping_id, connection_id, source_field_path, target_entity, target_field, transformation_rule, mapping_config_json, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.erp_field_mappings ENABLE TRIGGER ALL;

--
-- Data for Name: erp_sync_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.erp_sync_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.erp_sync_history (sync_id, connection_id, status, records_fetched, records_created, records_updated, errors, duration_ms, started_at, completed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.erp_sync_history ENABLE TRIGGER ALL;

--
-- Data for Name: escalation_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.escalation_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.escalation_log (escalation_id, entity_type, entity_id, escalation_level, escalation_reason, escalated_from_user_id, escalated_from_team_id, escalated_to_user_id, escalated_to_team_id, escalated_to_role, escalated_at, due_date, resolved_at, resolution_notes, resolved_by, auto_escalated, sla_breach_minutes, priority, tags, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.escalation_log ENABLE TRIGGER ALL;

--
-- Data for Name: escalation_thresholds; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.escalation_thresholds DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.escalation_thresholds (level, timeout_hours, notify_role, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.escalation_thresholds ENABLE TRIGGER ALL;

--
-- Data for Name: esg_categories; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.esg_categories DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.esg_categories (category_id, pillar, name_en, name_ar, description_en, description_ar, sort_order, active, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.esg_categories ENABLE TRIGGER ALL;

--
-- Data for Name: esg_metrics; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.esg_metrics DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.esg_metrics (metric_id, category_id, name_en, name_ar, unit, target_value, current_value, previous_value, data_source, reporting_period, framework_refs, status, last_updated_by, workspace_id, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.esg_metrics ENABLE TRIGGER ALL;

--
-- Data for Name: ethics_reports; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ethics_reports DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ethics_reports (report_id, report_type, title, description, severity, status, reporter_id, anonymous, assigned_investigator, category, resolution, resolution_date, escalated_to_governance, board_attention, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ethics_reports ENABLE TRIGGER ALL;

--
-- Data for Name: ethics_actions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ethics_actions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ethics_actions (action_id, report_id, title, description, action_type, assigned_to, status, due_date, completed_at, outcome, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ethics_actions ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_actions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_actions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_actions (action_id, evidence_id, action_type, title, description, assigned_to, assigned_team, assigned_dept, due_date, priority, status, completed_at, completed_by, outcome_notes, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_actions ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_attachments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_attachments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_attachments (attachment_id, entity_type, entity_id, evidence_type_code, file_name, file_size_bytes, uploaded_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_attachments ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_attachments_config; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_attachments_config DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_attachments_config (config_id, entity_type, entity_id, required_type_codes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_attachments_config ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_auto_collection; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_auto_collection DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_auto_collection (schedule_id, schedule_name, control_id, evidence_type, evidence_category, collection_frequency, collection_day_of_week, collection_day_of_month, collection_time, collection_timezone, source_system, source_type, connection_config, collection_query, collection_parameters, transformation_rules, data_mapping, file_naming_pattern, validation_rules, validation_required, auto_approve_if_valid, reject_if_invalid, assigned_team_id, review_team_id, notification_recipients, active, next_collection_date, last_collection_date, last_collection_status, last_collection_error, consecutive_failures, total_collections, successful_collections, retention_days, archive_after_days, created_by, created_at, updated_at) FROM stdin;
fbbbc80b-5ab4-4748-8b6d-066248646a68	Daily Security Logs Collection	\N	security_logs	technical	daily	\N	\N	02:00:00	Asia/Riyadh	siem	api	\N	/api/v1/logs/export?type=security&period=daily	\N	\N	\N	\N	{"format": "json", "min_records": 1000, "required_fields": ["timestamp", "event_id", "severity", "source"]}	t	t	t	4ab47114-2a8a-4da5-9e9f-dbf34143b7aa	\N	\N	t	\N	\N	\N	\N	0	0	0	90	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
9eaf4623-c691-40e2-a42c-bf61d8dcd89a	Weekly Vulnerability Scan Reports	\N	vulnerability_scan	technical	weekly	\N	1	03:00:00	Asia/Riyadh	vulnerability_scanner	api	\N	/api/scans/weekly-report	\N	\N	\N	\N	{"format": "pdf", "scan_coverage": 90, "severity_threshold": "medium"}	t	f	t	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	\N	t	\N	\N	\N	\N	0	0	0	365	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
b1d184ea-4c3f-4a03-ad18-16b276735555	Monthly Access Reviews	\N	access_review	compliance	monthly	\N	5	09:00:00	Asia/Riyadh	iam_system	database	\N	SELECT * FROM access_review_report WHERE month = CURRENT_MONTH	\N	\N	\N	\N	{"completeness": 100, "review_required": ["privileged", "service_accounts", "external"]}	t	f	t	7b86d19c-117c-4444-ae00-689ab1f7e9b7	\N	\N	t	\N	\N	\N	\N	0	0	0	730	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
fbcab6d0-098f-4760-91e4-963ee4515a58	Quarterly Control Testing Evidence	\N	control_testing	compliance	quarterly	\N	10	10:00:00	Asia/Riyadh	grc_platform	database	\N	SELECT * FROM control_test_results WHERE quarter = CURRENT_QUARTER	\N	\N	\N	\N	{"min_sample_size": 25, "confidence_level": 95, "documentation_required": true}	t	f	t	3955d2de-4d69-4de5-85a0-4b64944b3b73	\N	\N	t	\N	\N	\N	\N	0	0	0	2555	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_auto_collection ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_catalog; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_catalog DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_catalog (catalog_id, control_id, evidence_type, source_system, frequency, naming_standard, retention_days, attach_role, approve_role) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_catalog ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_collection_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_collection_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_collection_log (log_id, schedule_id, execution_timestamp, execution_trigger, collection_status, records_collected, data_size_bytes, records_processed, records_validated, records_approved, records_rejected, validation_errors, evidence_ids, evidence_request_id, execution_time_ms, connection_time_ms, processing_time_ms, error_message, error_details, retry_count, initiated_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_collection_log ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_cross_validation; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_cross_validation DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_cross_validation (validation_id, evidence_id, submitting_team_id, validating_team_id, validation_type, validation_status, validation_score, validation_comments, conditions_for_approval, validation_checklist, validated_at, validated_by, sla_hours, due_date, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_cross_validation ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_lifecycle; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_lifecycle DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_lifecycle (lifecycle_id, evidence_id, control_id, lifecycle_stage, stage_entered_at, stage_exited_at, stage_entered_by, retention_period_days, disposal_date, disposal_approved_by, disposal_approval_date, disposal_reason, validation_status, validation_errors, validation_warnings, archival_location, archival_date, next_review_date, metadata, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_lifecycle ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_owners; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_owners DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_owners (owner_id, evidence_id, user_id, ownership_type, is_primary, assigned_at, assigned_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_owners ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_requests; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_requests DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_requests (request_id, control_id, framework_code, requesting_team_id, assigned_team_id, evidence_type, evidence_period_start, evidence_period_end, request_details, validation_criteria, required_format, max_file_size_mb, due_date, reminder_count, last_reminder_at, status, content_validated, format_validated, cross_team_validated, validation_errors, submitted_at, submitted_by, submission_notes, approved_by, approval_date, approval_notes, rejection_reason, rejection_details, auto_requested, trigger_event, recurring_schedule, next_recurrence_date, tags, priority, created_by, created_at, updated_at, department_id, business_unit_id) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_requests ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_retention_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_retention_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_retention_rules (rule_id, rule_name, evidence_type, evidence_category, regulator_id, framework_code, regulation_reference, min_retention_years, max_retention_years, retention_trigger, disposal_approval_required, disposal_approval_teams, disposal_method, disposal_verification_required, archival_required, archive_after_years, archival_location, archival_format, legal_hold_override, notify_before_disposal_days, notify_teams, active, effective_date, created_by, created_at, updated_at) FROM stdin;
2d383005-9cfe-40d1-8333-7fa94a4793d3	ZATCA Financial Records Retention	financial_records	financial	ZATCA	TAX	VAT Implementing Regulations Article 70	10	15	fiscal_year_end	t	{FINANCE,AUDIT,EXEC_STRATEGY}	archive	t	t	5	\N	\N	t	90	{FINANCE,AUDIT}	t	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
76b629c8-df76-4742-bb2b-176235208597	NCA Security Logs Retention	security_logs	technical	NCA	NCA-ECC	ECC-1:2018 Requirement 2-9-2	1	3	creation_date	t	{CYBER_GOV,SOC_OPS,AUDIT}	delete	t	t	1	\N	\N	t	30	{CYBER_GOV,SOC_OPS}	t	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
36f571ce-e284-45a7-b69a-725f41671771	SDAIA Personal Data Processing Records	personal_data_processing	privacy	SDAIA	PDPL	PDPL Article 45 - Record Keeping	3	5	creation_date	t	{PRIVACY,DATA_GOV,AUDIT}	anonymize	t	t	2	\N	\N	t	60	{PRIVACY,DATA_GOV}	t	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
ebc11048-602b-49d1-81ad-c2ed8b28aa5d	CMA Audit Reports Retention	audit_reports	compliance	CMA	CMA-CGR	Corporate Governance Regulations Article 104	7	10	approval_date	t	{AUDIT,ERM,EXEC_STRATEGY}	archive	t	t	3	\N	\N	t	90	{AUDIT,ERM}	t	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
ba4b9b19-af3c-4949-94c4-8281947669c9	SAMA Incident Reports Retention	incident_reports	operational	SAMA	SAMA-CSF	SAMA Cyber Security Framework Article 3.2.5	5	7	creation_date	t	{CYBER_GOV,SOC_OPS,AUDIT,ERM}	archive	t	t	2	\N	\N	t	60	{CYBER_GOV,SOC_OPS}	t	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
e744078b-19ec-42eb-8be6-d1522346f311	MHRSD Employee Records Retention	employee_records	hr	MHRSD	LABOR-LAW	Saudi Labor Law Article 56	4	10	contract_end	t	{HR_GOV,AUDIT,PRIVACY}	archive	t	t	2	\N	\N	t	90	{HR_GOV}	t	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_retention_rules ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_reuse_links; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_reuse_links DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_reuse_links (link_id, evidence_id, source_control_id, target_control_id, source_framework_code, target_framework_code, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_reuse_links ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_reviews; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_reviews DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_reviews (review_id, evidence_id, reviewer_id, review_type, outcome, comments, reviewed_at, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_reviews ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_schedules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_schedules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_schedules (schedule_id, control_id, cron_expression, reminder_text, assigned_to, enabled, last_reminded_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_schedules ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_scores; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_scores DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_scores (evidence_id, completeness_score, freshness_score, verification_score, integrity_score, reuse_score, composite_score, computed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_scores ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_sector_mapping; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_sector_mapping DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_sector_mapping (id, evidence_type_code, sector_code, applicability, sector_priority, notes, created_at) FROM stdin;
c66a532a-c96e-48e0-88a7-e6d966f49aae	POLICY	K	mandatory	critical	\N	2026-03-17 08:24:23.022676+08
ccf7c769-1412-40e4-acba-10ca07057d94	POLICY	O	mandatory	critical	\N	2026-03-17 08:24:23.022676+08
98264539-0dcc-4166-a944-716d333b2bb0	POLICY	Q	mandatory	high	\N	2026-03-17 08:24:23.022676+08
94ec2ad8-1f13-43af-9ba8-a7e96ff05c5e	POLICY	J	mandatory	high	\N	2026-03-17 08:24:23.022676+08
b71b409c-b1fd-45f3-ad29-e587e134ba63	POLICY	D	mandatory	high	\N	2026-03-17 08:24:23.022676+08
d37f9914-6cc7-4de4-b4a9-59112c059000	AUDIT_REPORT	K	mandatory	critical	\N	2026-03-17 08:24:23.022676+08
5253c7d4-80e3-4eff-99b4-ba57da7de3d9	AUDIT_REPORT	O	mandatory	critical	\N	2026-03-17 08:24:23.022676+08
e5327494-5453-4120-aa92-1251a9ca5d02	PENTEST	K	mandatory	critical	\N	2026-03-17 08:24:23.022676+08
d2cac4f7-1b06-4794-80f2-52aa45457e37	PENTEST	J	mandatory	critical	\N	2026-03-17 08:24:23.022676+08
6fb717f8-ba4e-4362-8c7a-855c961f2d4d	PENTEST	O	mandatory	high	\N	2026-03-17 08:24:23.022676+08
f4bfb427-db65-48f8-a3b4-e1b971a84f26	RISK_ASSESSMENT	K	mandatory	critical	\N	2026-03-17 08:24:23.022676+08
bbe5fc50-7561-4168-9030-5ed452fdf8a8	RISK_ASSESSMENT	D	mandatory	critical	\N	2026-03-17 08:24:23.022676+08
65d15e35-12fc-4bba-9d62-2bfc8c6929b8	RISK_ASSESSMENT	Q	mandatory	high	\N	2026-03-17 08:24:23.022676+08
cdb86d0e-735a-4c23-bf4f-68c52dea0ed9	CERTIFICATE	K	mandatory	high	\N	2026-03-17 08:24:23.022676+08
88e11c5f-25fd-4934-93ce-acf92f726a19	CERTIFICATE	O	mandatory	high	\N	2026-03-17 08:24:23.022676+08
c7c87eb8-0ec4-4231-a764-18041233ca45	ATTESTATION	K	mandatory	critical	\N	2026-03-17 08:24:23.022676+08
faf351b6-a707-45ae-933f-e74f78a14543	ATTESTATION	O	mandatory	high	\N	2026-03-17 08:24:23.022676+08
527dc71c-4adc-46e9-a268-3b448263b9a3	SCAN_REPORT	K	mandatory	critical	\N	2026-03-17 08:24:23.022676+08
f1d10ead-72bf-461f-b0bc-e82826e22237	SCAN_REPORT	J	mandatory	critical	\N	2026-03-17 08:24:23.022676+08
866d18ee-126e-4326-b3e8-f65b8cb2d224	TRAINING	K	mandatory	high	\N	2026-03-17 08:24:23.022676+08
637cfb7b-4c1f-48b4-9a64-b4600d4dc17f	TRAINING	O	mandatory	high	\N	2026-03-17 08:24:23.022676+08
6f512700-38e7-4b7b-9ea0-5bcb621788d1	TRAINING	Q	mandatory	high	\N	2026-03-17 08:24:23.022676+08
56372400-2f17-4271-83bd-6e017e031708	CONTRACT	K	mandatory	high	\N	2026-03-17 08:24:23.022676+08
982b5148-6a9c-451a-8a78-f8c52ea5204a	LOG	K	mandatory	high	\N	2026-03-17 08:24:23.022676+08
38a44fc4-14e8-4b70-bd1d-ec015b08b64c	LOG	J	mandatory	high	\N	2026-03-17 08:24:23.022676+08
31e9cd1d-0988-4b10-8c84-f01d1376b706	CONFIG	J	mandatory	high	\N	2026-03-17 08:24:23.022676+08
60dcf9f2-07c0-48fe-95f7-e34385f9cdfd	CONFIG	D	mandatory	high	\N	2026-03-17 08:24:23.022676+08
e2e6ec9e-60bb-4c39-b7b3-765efb9d0313	SCREENSHOT	J	recommended	medium	\N	2026-03-17 08:24:23.022676+08
0a2b8e7f-5f5f-450c-815a-659148f733de	INVOICE	K	mandatory	high	\N	2026-03-17 08:24:23.022676+08
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_sector_mapping ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_status_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_status_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_status_log (log_id, evidence_id, from_status, to_status, changed_by, changed_at, reason) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_status_log ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_tasks; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_tasks DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_tasks (task_id, tenant_id, workspace_id, control_id, evidence_requirement_id, due_at, status, assigned_role, assigned_to, assigned_at, submission_evidence_id, cadence, created_at, evidence_id, title, due_date, assigned_user_id, assigned_team_id, department_id, business_unit_id) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_tasks ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_team_distribution; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_team_distribution DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_team_distribution (distribution_id, team_code, evidence_domain, framework_refs, raci_role, notes, created_at) FROM stdin;
f2db51e2-9be9-499b-9250-1f9ff92840c2	CYBER_GOV	security_policy_evidence	{ISO27001-A5.1,NCA-ECC-1.1}	responsible	\N	2026-03-17 08:24:23.022676+08
c4c6dd6c-1525-4cc9-878c-deec171b7564	CYBER_GOV	access_control_evidence	{ISO27001-A9,NCA-ECC-2.1}	responsible	\N	2026-03-17 08:24:23.022676+08
4ee2224e-44a6-49f9-9e44-66f9f15472ee	CYBER_GOV	cryptography_evidence	{ISO27001-A10,NCA-ECC-2.3}	responsible	\N	2026-03-17 08:24:23.022676+08
3218d324-05c8-4177-8fc4-2b3ee8a53c9a	SOC_OPS	monitoring_logging_evidence	{ISO27001-A12.4,NCA-ECC-2.6}	responsible	\N	2026-03-17 08:24:23.022676+08
4de2921e-0f13-4af4-ba63-0f75af1a1e11	SOC_OPS	vulnerability_scan_evidence	{NIST-CSF.ID.RA-1,NCA-ECC-2.5}	responsible	\N	2026-03-17 08:24:23.022676+08
81f5404e-a093-4051-bab2-5f92eb3da555	SOC_OPS	incident_response_evidence	{ISO27001-A16,NCA-ECC-2.7}	responsible	\N	2026-03-17 08:24:23.022676+08
958228dc-6589-4fd8-bf9a-2ee482015651	IAM_GOV	identity_management_evidence	{ISO27001-A9.2,NIST-CSF.PR.AC}	responsible	\N	2026-03-17 08:24:23.022676+08
760e522e-cdd1-4d45-adf3-314e2a1b7257	IAM_GOV	access_review_evidence	{ISO27001-A9.2.5,NCA-ECC-2.1}	responsible	\N	2026-03-17 08:24:23.022676+08
a801a504-84da-4ccf-9ed0-0056eb4e63a6	DATA_GOV	data_classification_evidence	{ISO27001-A8.2,PDPL-Art9}	responsible	\N	2026-03-17 08:24:23.022676+08
7faa357a-af86-4bec-be1e-103e09a3feca	DATA_GOV	asset_inventory_evidence	{ISO27001-A8.1,NCA-ECC-2.2}	responsible	\N	2026-03-17 08:24:23.022676+08
aa899701-1eba-4b64-bcde-4edddbfb3c79	PRIVACY	privacy_impact_evidence	{PDPL-Art29,ISO27701-7.4}	responsible	\N	2026-03-17 08:24:23.022676+08
e446160e-292f-47e0-91cb-7a7b9b6ea135	PRIVACY	consent_records_evidence	{PDPL-Art10,ISO27701-7.2}	responsible	\N	2026-03-17 08:24:23.022676+08
80ef5260-0c0b-4906-88db-23094937b468	PRIVACY	data_breach_notification_evidence	{PDPL-Art24,NCA-ECC-2.7}	responsible	\N	2026-03-17 08:24:23.022676+08
7cfd893f-7139-4187-9a6d-1ab3f6b1f51b	AUDIT	audit_report_evidence	{IIA-IPPF-2400,ISO27001-A18.2}	responsible	\N	2026-03-17 08:24:23.022676+08
6abae37c-fe3b-46df-80e7-4168b5a3cb03	AUDIT	control_test_evidence	{IIA-IPPF-2000,SOC2-CC4}	responsible	\N	2026-03-17 08:24:23.022676+08
443c9728-a988-49e8-941f-0f5fa6680005	BCM_DR	bcp_plan_evidence	{ISO22301-8.4,ISO27001-A17.1}	responsible	\N	2026-03-17 08:24:23.022676+08
0a562af7-0e78-4dce-9ed8-6119d32297ec	BCM_DR	dr_test_evidence	{ISO22301-8.5,NCA-ECC-3.1}	responsible	\N	2026-03-17 08:24:23.022676+08
7466d304-d80d-4e50-ad4f-703a69670d34	CLOUD_INFRA	cloud_config_evidence	{ISO27001-A12,CSA-CCM}	responsible	\N	2026-03-17 08:24:23.022676+08
23b55fd6-55fc-48cf-a52f-c93bd136dad3	CLOUD_INFRA	patch_management_evidence	{NCA-ECC-2.5,NIST-SP800-40}	responsible	\N	2026-03-17 08:24:23.022676+08
64825bab-b07b-4c41-a353-f9a7e34be03d	APP_ENG	sdlc_evidence	{ISO27001-A14,NIST-SP800-218}	responsible	\N	2026-03-17 08:24:23.022676+08
d953f52a-4108-4ad5-a422-3f010daff516	APP_ENG	change_management_evidence	{ISO27001-A12.1,ITIL-SM}	responsible	\N	2026-03-17 08:24:23.022676+08
674a66fe-0752-4c26-a671-9c6891ea2099	VENDOR_RISK	vendor_assessment_evidence	{ISO27001-A15.1,NCA-ECC-3.3}	responsible	\N	2026-03-17 08:24:23.022676+08
16379406-a406-4c76-8b35-ef99a9dcbb74	VENDOR_RISK	contract_security_evidence	{ISO27001-A15.1.2,PDPL-Art28}	responsible	\N	2026-03-17 08:24:23.022676+08
13a41229-11ef-4414-b076-c9496e329716	HR_GOV	training_records_evidence	{ISO27001-A7.2.2,NCA-ECC-1.4}	responsible	\N	2026-03-17 08:24:23.022676+08
be0cd5d1-0ef9-4dd5-80cf-ef7f7929f118	HR_GOV	background_check_evidence	{ISO27001-A7.1,NCA-ECC-1.3}	responsible	\N	2026-03-17 08:24:23.022676+08
aa8bf640-0a69-43a3-9c42-17b970554f0d	FINANCE	financial_controls_evidence	{COSO-IC,SOX-302,SOX-404}	responsible	\N	2026-03-17 08:24:23.022676+08
dde7be3a-da9e-40e0-8821-95e7470b7e63	QUALITY	quality_management_evidence	{ISO9001-8,ISO27001-A10}	responsible	\N	2026-03-17 08:24:23.022676+08
be63767f-18d8-4ac6-9675-58c0d5ab9710	EXEC_STRATEGY	governance_approval_evidence	{ISO27001-A5.1,NCA-ECC-1}	accountable	\N	2026-03-17 08:24:23.022676+08
39225f89-a2f3-4c6d-b4c7-300f02f9d456	ERM	risk_assessment_evidence	{ISO31000-6.4,COSO-ERM}	responsible	\N	2026-03-17 08:24:23.022676+08
6ee8bb17-4037-4fa5-88e4-b79aa8274dd3	ERM	risk_treatment_evidence	{ISO31000-6.5,NIST-CSF.RS}	responsible	\N	2026-03-17 08:24:23.022676+08
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_team_distribution ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_templates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_templates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_templates (template_id, workspace_id, control_id, framework_code, template_name, description, evidence_type, required_fields, instructions, example_url, accepted_formats, max_file_size_mb, retention_days, is_mandatory, is_active, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_templates ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_type_catalog; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_type_catalog DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_type_catalog (type_id, code, name_en, name_ar, category, source_types, default_quality_tier, retention_days, description_en, description_ar, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_type_catalog ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_validation_metrics; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_validation_metrics DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_validation_metrics (metric_id, team_id, evidence_type, period_type, period_start, period_end, total_submissions, unique_submitters, passed_validation, failed_validation, conditional_pass, pending_validation, format_failures, content_failures, completeness_failures, cross_reference_failures, cross_team_validations, cross_team_approvals, cross_team_rejections, avg_cross_team_days, auto_validated_count, auto_approved_count, auto_rejected_count, manual_override_count, avg_validation_hours, min_validation_hours, max_validation_hours, avg_quality_score, data_completeness_score, calculated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_validation_metrics ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_validation_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_validation_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_validation_rules (rule_id, evidence_type, control_id, validation_type, rule_name, rule_description, rule_definition, severity, auto_reject, requires_human_review, applicable_teams, active, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_validation_rules ENABLE TRIGGER ALL;

--
-- Data for Name: evidence_versions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.evidence_versions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.evidence_versions (version_id, evidence_id, version_number, file_hash, change_summary, uploaded_by, file_path, file_size, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.evidence_versions ENABLE TRIGGER ALL;

--
-- Data for Name: executive_attention_items; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.executive_attention_items DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.executive_attention_items (id, tenant_id, title, summary, source_module, source_entity_type, source_entity_id, severity, rationale, status, traceability_json, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.executive_attention_items ENABLE TRIGGER ALL;

--
-- Data for Name: executive_kpis; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.executive_kpis DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.executive_kpis (kpi_id, kpi_code, kpi_category, name, description, business_impact, calculation_type, calculation_sql, calculation_formula, data_sources, target_value, target_type, threshold_critical, threshold_high, threshold_medium, threshold_low, threshold_direction, acceptable_range_min, acceptable_range_max, frequency, last_calculated_at, next_calculation_at, owner_team_id, stakeholder_teams, data_quality_score, data_completeness, last_validated_at, validation_notes, display_format, decimal_places, unit_label, trend_period_days, active, created_by, created_at, updated_at) FROM stdin;
708d2a4d-9d3c-4db1-8969-c4fae221db17	EXEC_STRATEGY_PERFORMANCE	operational	Executive / Strategy / GRC Steering Performance Score	Overall performance score for Executive / Strategy / GRC Steering	\N	composite	\N	\N	\N	85.00	\N	\N	\N	\N	\N	higher_better	\N	\N	weekly	\N	\N	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	\N	\N	\N	\N	\N	2	\N	30	t	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
3bacc677-d68a-4acf-970e-b8864583fee4	SOC_OPS_PERFORMANCE	operational	SOC / Cyber Operations Performance Score	Overall performance score for SOC / Cyber Operations	\N	composite	\N	\N	\N	85.00	\N	\N	\N	\N	\N	higher_better	\N	\N	weekly	\N	\N	4ab47114-2a8a-4da5-9e9f-dbf34143b7aa	\N	\N	\N	\N	\N	\N	2	\N	30	t	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
0269902a-d146-4423-8b6f-e052c2b53cdc	IAM_GOV_PERFORMANCE	operational	IAM / Identity / Access Governance Performance Score	Overall performance score for IAM / Identity / Access Governance	\N	composite	\N	\N	\N	85.00	\N	\N	\N	\N	\N	higher_better	\N	\N	weekly	\N	\N	7b86d19c-117c-4444-ae00-689ab1f7e9b7	\N	\N	\N	\N	\N	\N	2	\N	30	t	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
c48cbc42-83d7-40d8-8e86-722cb3eabd19	DATA_GOV_PERFORMANCE	operational	Data Governance / Data Management Performance Score	Overall performance score for Data Governance / Data Management	\N	composite	\N	\N	\N	85.00	\N	\N	\N	\N	\N	higher_better	\N	\N	weekly	\N	\N	81795efe-abd5-485d-9dbc-ad5b8a80a260	\N	\N	\N	\N	\N	\N	2	\N	30	t	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
2875d569-8cd5-4ecf-aed3-d7964fbdcf6f	BCM_DR_PERFORMANCE	operational	Business Continuity / DR / Crisis Performance Score	Overall performance score for Business Continuity / DR / Crisis	\N	composite	\N	\N	\N	85.00	\N	\N	\N	\N	\N	higher_better	\N	\N	weekly	\N	\N	6c4d2f11-4f06-4796-a973-df9497fc8b93	\N	\N	\N	\N	\N	\N	2	\N	30	t	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
ff694767-99d4-44b6-94e2-d9d71c2ef090	CLOUD_INFRA_PERFORMANCE	operational	Cloud / Infrastructure / Hosting Performance Score	Overall performance score for Cloud / Infrastructure / Hosting	\N	composite	\N	\N	\N	85.00	\N	\N	\N	\N	\N	higher_better	\N	\N	weekly	\N	\N	89a742c3-a93f-4661-b10a-2ae4f9ae2329	\N	\N	\N	\N	\N	\N	2	\N	30	t	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
cc120be2-9cbc-46ae-8ff7-13443210f996	APP_ENG_PERFORMANCE	operational	Application / Platform Engineering Performance Score	Overall performance score for Application / Platform Engineering	\N	composite	\N	\N	\N	85.00	\N	\N	\N	\N	\N	higher_better	\N	\N	weekly	\N	\N	83bd0284-7e8c-489c-9200-e9b5aab55716	\N	\N	\N	\N	\N	\N	2	\N	30	t	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
e3e9fa2d-28d9-41cd-81ae-b4f20ffed0e2	ENT_ARCH_PERFORMANCE	operational	Enterprise Architecture Performance Score	Overall performance score for Enterprise Architecture	\N	composite	\N	\N	\N	85.00	\N	\N	\N	\N	\N	higher_better	\N	\N	weekly	\N	\N	00310a16-83ca-465e-94a6-2abfed5793e6	\N	\N	\N	\N	\N	\N	2	\N	30	t	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
e05b35ad-ad58-420c-9f50-ce5d6170ef5d	PMO_PERFORMANCE	operational	PMO / Transformation / Program Delivery Performance Score	Overall performance score for PMO / Transformation / Program Delivery	\N	composite	\N	\N	\N	85.00	\N	\N	\N	\N	\N	higher_better	\N	\N	weekly	\N	\N	c6298086-f66b-418c-87fc-eb8370d7747e	\N	\N	\N	\N	\N	\N	2	\N	30	t	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
51bfa7d7-db4e-4aea-bef3-fdecb2ca9d50	SVC_OPS_PERFORMANCE	operational	Service Operations / ITSM Performance Score	Overall performance score for Service Operations / ITSM	\N	composite	\N	\N	\N	85.00	\N	\N	\N	\N	\N	higher_better	\N	\N	weekly	\N	\N	419acddd-0652-4b89-936d-8f563be56a25	\N	\N	\N	\N	\N	\N	2	\N	30	t	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
cb88deed-9bb1-440c-b156-0d04e285a386	VENDOR_RISK_PERFORMANCE	operational	Vendor / Procurement / Third-Party Risk Performance Score	Overall performance score for Vendor / Procurement / Third-Party Risk	\N	composite	\N	\N	\N	85.00	\N	\N	\N	\N	\N	higher_better	\N	\N	weekly	\N	\N	ee17e8bf-6125-4317-8344-e4c4424ca33c	\N	\N	\N	\N	\N	\N	2	\N	30	t	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
697f4bd7-8cfd-4591-8207-d660b4124176	HR_GOV_PERFORMANCE	operational	HR / Workforce Governance Performance Score	Overall performance score for HR / Workforce Governance	\N	composite	\N	\N	\N	85.00	\N	\N	\N	\N	\N	higher_better	\N	\N	weekly	\N	\N	baa82233-2f98-461b-9ad1-744430c24b5b	\N	\N	\N	\N	\N	\N	2	\N	30	t	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
1aeffab5-3415-464c-8bb8-b2f1410ffff2	FINANCE_PERFORMANCE	operational	Finance / Budget Control Performance Score	Overall performance score for Finance / Budget Control	\N	composite	\N	\N	\N	85.00	\N	\N	\N	\N	\N	higher_better	\N	\N	weekly	\N	\N	0fa2f110-8687-4e71-af63-8865f07631a1	\N	\N	\N	\N	\N	\N	2	\N	30	t	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
b22acede-ec09-4ff2-b854-0608d8bee0f4	QUALITY_PERFORMANCE	operational	Quality / Policy / Documentation Office Performance Score	Overall performance score for Quality / Policy / Documentation Office	\N	composite	\N	\N	\N	85.00	\N	\N	\N	\N	\N	higher_better	\N	\N	weekly	\N	\N	c0f356ac-dadc-440c-9a2e-749fc833af3c	\N	\N	\N	\N	\N	\N	2	\N	30	t	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
256fc21e-f617-4d89-b9f3-487ddd251db0	ERM_PERFORMANCE	operational	Enterprise Risk Management Performance Score	Overall performance score for Enterprise Risk Management	\N	composite	\N	\N	\N	85.00	\N	\N	\N	\N	\N	higher_better	\N	\N	weekly	\N	\N	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	\N	\N	\N	\N	\N	2	\N	30	t	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
21b6c8f4-fbdf-4415-b508-223a84ff45c4	CYBER_GOV_PERFORMANCE	operational	Cybersecurity Governance Performance Score	Overall performance score for Cybersecurity Governance	\N	composite	\N	\N	\N	85.00	\N	\N	\N	\N	\N	higher_better	\N	\N	weekly	\N	\N	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	\N	\N	\N	\N	\N	2	\N	30	t	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
5038a27c-15ee-4af6-98c4-8d771555deb4	PRIVACY_PERFORMANCE	operational	Privacy / PDPL / Legal Compliance Performance Score	Overall performance score for Privacy / PDPL / Legal Compliance	\N	composite	\N	\N	\N	85.00	\N	\N	\N	\N	\N	higher_better	\N	\N	weekly	\N	\N	cde8e3a5-965d-4ec6-b879-5676c76567e8	\N	\N	\N	\N	\N	\N	2	\N	30	t	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
b20327ac-d3fd-4d31-b405-95661ca287d2	AUDIT_PERFORMANCE	operational	Internal Audit / Assurance Performance Score	Overall performance score for Internal Audit / Assurance	\N	composite	\N	\N	\N	85.00	\N	\N	\N	\N	\N	higher_better	\N	\N	weekly	\N	\N	3955d2de-4d69-4de5-85a0-4b64944b3b73	\N	\N	\N	\N	\N	\N	2	\N	30	t	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
\.


ALTER TABLE __TENANT_SCHEMA__.executive_kpis ENABLE TRIGGER ALL;

--
-- Data for Name: explainability_packs; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.explainability_packs DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.explainability_packs (pack_id, target_role, language, content, generated_at, generated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.explainability_packs ENABLE TRIGGER ALL;

--
-- Data for Name: external_audit_coordination; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.external_audit_coordination DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.external_audit_coordination (id, tenant_id, audit_id, auditor_firm, contact_name, contact_email, engagement_letter_ref, status, start_date, end_date, document_requests, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.external_audit_coordination ENABLE TRIGGER ALL;

--
-- Data for Name: external_user_scopes; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.external_user_scopes DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.external_user_scopes (scope_id, user_id, role, entity_type, entity_id, permissions, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.external_user_scopes ENABLE TRIGGER ALL;

--
-- Data for Name: favorites; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.favorites DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.favorites (favorite_id, user_id, entity_type, entity_id, entity_title, sort_order, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.favorites ENABLE TRIGGER ALL;

--
-- Data for Name: feature_flags; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.feature_flags DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.feature_flags (feature_key, enabled, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
agrc_engine_enabled	t	2026-03-17 08:24:19.948737+08	2026-03-17 08:24:21.062239+08	\N	\N	\N
agrc_control_monitor_enabled	t	2026-03-17 08:24:19.948737+08	2026-03-17 08:24:21.062239+08	\N	\N	\N
agrc_remediation_monitor_enabled	t	2026-03-17 08:24:19.948737+08	2026-03-17 08:24:21.062239+08	\N	\N	\N
agrc_kri_monitor_enabled	t	2026-03-17 08:24:19.948737+08	2026-03-17 08:24:21.062239+08	\N	\N	\N
agrc_policy_review_enabled	t	2026-03-17 08:24:19.948737+08	2026-03-17 08:24:21.062239+08	\N	\N	\N
agrc_auto_task_creation_enabled	t	2026-03-17 08:24:19.948737+08	2026-03-17 08:24:21.062239+08	\N	\N	\N
agrc_auto_notification_enabled	t	2026-03-17 08:24:19.948737+08	2026-03-17 08:24:21.062239+08	\N	\N	\N
\.


ALTER TABLE __TENANT_SCHEMA__.feature_flags ENABLE TRIGGER ALL;

--
-- Data for Name: file_storage; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.file_storage DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.file_storage (file_id, original_filename, storage_provider, storage_key, storage_bucket, content_type, file_size_bytes, content_hash, entity_type, entity_id, uploaded_by, access_level, virus_scan_status, virus_scan_at, retention_until, deleted_at, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.file_storage ENABLE TRIGGER ALL;

--
-- Data for Name: finding_impacts; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.finding_impacts DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.finding_impacts (impact_id, finding_id, impact_type, severity, affected_area, financial_impact, description, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.finding_impacts ENABLE TRIGGER ALL;

--
-- Data for Name: finding_root_causes; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.finding_root_causes DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.finding_root_causes (root_cause_id, finding_id, cause_type, description, analysis_method, contributing_factors, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.finding_root_causes ENABLE TRIGGER ALL;

--
-- Data for Name: framework_domains; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.framework_domains DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.framework_domains (domain_id, framework_id, code, label_en, label_ar, display_order, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.framework_domains ENABLE TRIGGER ALL;

--
-- Data for Name: framework_requirements; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.framework_requirements DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.framework_requirements (requirement_id, framework_id, domain_id, code, title_en, title_ar, requirement_text_en, requirement_text_ar, criticality_weight, display_order, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.framework_requirements ENABLE TRIGGER ALL;

--
-- Data for Name: framework_applicability_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.framework_applicability_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.framework_applicability_rules (rule_id, requirement_id, condition_expr, applicability_state, confidence_weight, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.framework_applicability_rules ENABLE TRIGGER ALL;

--
-- Data for Name: framework_cross_mappings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.framework_cross_mappings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.framework_cross_mappings (mapping_id, source_framework, target_framework, source_control, target_control, relationship, confidence, notes, created_at) FROM stdin;
b90d5a73-628f-4f70-ab99-88b55032e45c	NCA-ECC	ISO-27001	1-1-1	A.5.1	equivalent	0.90		2026-03-17 08:24:21.759458+08
b74545ab-c720-4517-b109-abe027f74c97	NCA-ECC	ISO-27001	1-1-2	A.5.2	equivalent	0.85		2026-03-17 08:24:21.759458+08
bd7e4641-b4ad-441b-973d-f8116423ee5b	NCA-ECC	ISO-27001	1-2-1	A.5.3	partial	0.70		2026-03-17 08:24:21.759458+08
e1076d29-8898-4471-b2dc-ff83426f9504	NCA-ECC	ISO-27001	1-3-1	A.6.1	equivalent	0.85		2026-03-17 08:24:21.759458+08
db56cc0d-0f16-4220-9fe8-8bca904012d2	NCA-ECC	ISO-27001	2-1-1	A.5.10	equivalent	0.90		2026-03-17 08:24:21.759458+08
07ef0396-aa93-4e4d-af30-f297b6efab32	NCA-ECC	ISO-27001	2-2-1	A.8.1	partial	0.75		2026-03-17 08:24:21.759458+08
63624ebf-085c-4250-84ac-6a364b2bcf09	NCA-ECC	ISO-27001	3-1-1	A.8.9	equivalent	0.85		2026-03-17 08:24:21.759458+08
dccdea51-9cf9-4e46-9226-1cd654a7c626	NCA-ECC	ISO-27001	4-1-1	A.5.25	equivalent	0.90		2026-03-17 08:24:21.759458+08
246fbfba-294b-4919-8b67-d7fa688bceb2	NCA-ECC	ISO-27001	5-1-1	A.5.35	equivalent	0.85		2026-03-17 08:24:21.759458+08
4f0b442d-4547-4e26-ba6f-39c4adf50209	NCA-ECC	NIST-CSF	1-1-1	GV.PO-01	equivalent	0.85		2026-03-17 08:24:21.759458+08
c8786f98-a591-4284-8bbb-51a584123fdd	NCA-ECC	NIST-CSF	1-2-1	GV.RR-01	partial	0.70		2026-03-17 08:24:21.759458+08
19d7b198-b0cf-4cc6-a141-a6767f13ac99	NCA-ECC	NIST-CSF	2-1-1	PR.AA-01	equivalent	0.85		2026-03-17 08:24:21.759458+08
f9ac446a-38be-490e-aa9b-0fb6c753bb0f	NCA-ECC	NIST-CSF	2-2-1	PR.DS-01	equivalent	0.80		2026-03-17 08:24:21.759458+08
00c5b456-f383-4910-8fb9-b5a6313a051c	NCA-ECC	NIST-CSF	3-1-1	PR.PS-01	equivalent	0.85		2026-03-17 08:24:21.759458+08
a5599787-beb8-4954-8cc4-8443092b83e6	NCA-ECC	NIST-CSF	4-1-1	DE.CM-01	equivalent	0.90		2026-03-17 08:24:21.759458+08
2adb9adb-a101-4628-913c-cce7f18e1712	NCA-ECC	NIST-CSF	5-1-1	RS.MA-01	equivalent	0.85		2026-03-17 08:24:21.759458+08
5e41a606-ae75-427f-b8f2-6c243da9b4e9	ISO-27001	NIST-CSF	A.5.1	GV.PO-01	equivalent	0.90		2026-03-17 08:24:21.759458+08
7ab38b8b-cb1e-4598-8585-e7eb5b73d4e2	ISO-27001	NIST-CSF	A.5.2	GV.RR-01	equivalent	0.85		2026-03-17 08:24:21.759458+08
74260c1d-8793-4858-8071-5d0969a2b1c3	ISO-27001	NIST-CSF	A.8.1	PR.DS-01	equivalent	0.85		2026-03-17 08:24:21.759458+08
870b14d6-2174-4f22-9b80-7ee77ec6fc9f	ISO-27001	NIST-CSF	A.5.25	RS.MA-01	equivalent	0.90		2026-03-17 08:24:21.759458+08
de128abe-58f9-4af5-b95c-3c077349ea5a	ISO-27001	NIST-CSF	A.5.35	RC.RP-01	equivalent	0.85		2026-03-17 08:24:21.759458+08
4df30666-9dbb-45f0-bf75-55bd5362b1ab	NCA-ECC	ISO-27001	1-1-1	A.5.1	equivalent	0.90		2026-03-17 08:24:24.442586+08
cca0a43a-9708-4fc4-b28a-10873c97806c	NCA-ECC	ISO-27001	1-1-2	A.5.2	equivalent	0.85		2026-03-17 08:24:24.442586+08
8738a9bd-f9b5-405f-8852-7112d173207d	NCA-ECC	ISO-27001	1-2-1	A.5.3	partial	0.70		2026-03-17 08:24:24.442586+08
a8332eb0-e1b8-4b35-b820-dfb9e3b630f9	NCA-ECC	ISO-27001	1-3-1	A.6.1	equivalent	0.85		2026-03-17 08:24:24.442586+08
7de4d953-b1e6-48cf-9f07-0146361ca0e2	NCA-ECC	ISO-27001	2-1-1	A.5.10	equivalent	0.90		2026-03-17 08:24:24.442586+08
f1f687d3-9c7a-4e46-9ad9-4ec468f1abd8	NCA-ECC	ISO-27001	2-2-1	A.8.1	partial	0.75		2026-03-17 08:24:24.442586+08
54aa985a-1d48-45f4-955e-cbf3a18777b3	NCA-ECC	ISO-27001	3-1-1	A.8.9	equivalent	0.85		2026-03-17 08:24:24.442586+08
4b364935-dca7-4e33-bc5a-e94fa50d6285	NCA-ECC	ISO-27001	4-1-1	A.5.25	equivalent	0.90		2026-03-17 08:24:24.442586+08
9675e0b2-6528-45b3-b97e-8f9ac8bd9bae	NCA-ECC	ISO-27001	5-1-1	A.5.35	equivalent	0.85		2026-03-17 08:24:24.442586+08
049517da-14cf-4ee5-8011-f47ecd979ad6	NCA-ECC	NIST-CSF	1-1-1	GV.PO-01	equivalent	0.85		2026-03-17 08:24:24.442586+08
cf30b654-8799-422d-88db-aafb854e28e7	NCA-ECC	NIST-CSF	1-2-1	GV.RR-01	partial	0.70		2026-03-17 08:24:24.442586+08
a2cd900c-389f-42ce-9244-4a1685597414	NCA-ECC	NIST-CSF	2-1-1	PR.AA-01	equivalent	0.85		2026-03-17 08:24:24.442586+08
3b6d5e86-ea8c-49a6-9620-d7e44d1f5379	NCA-ECC	NIST-CSF	2-2-1	PR.DS-01	equivalent	0.80		2026-03-17 08:24:24.442586+08
e09c2ba1-5e30-40c3-8b9a-80a5d864d7c9	NCA-ECC	NIST-CSF	3-1-1	PR.PS-01	equivalent	0.85		2026-03-17 08:24:24.442586+08
643cdf46-de06-4ef4-a978-b4c583e0038a	NCA-ECC	NIST-CSF	4-1-1	DE.CM-01	equivalent	0.90		2026-03-17 08:24:24.442586+08
4893fe11-52a9-4f11-8ee9-890b5dd10c28	NCA-ECC	NIST-CSF	5-1-1	RS.MA-01	equivalent	0.85		2026-03-17 08:24:24.442586+08
c50fcb9a-5121-4cc1-92ae-f4fc54ad7e83	ISO-27001	NIST-CSF	A.5.1	GV.PO-01	equivalent	0.90		2026-03-17 08:24:24.442586+08
12f002c3-3e9d-404f-9e54-7a64011a7778	ISO-27001	NIST-CSF	A.5.2	GV.RR-01	equivalent	0.85		2026-03-17 08:24:24.442586+08
f7b9abe1-825c-462c-a845-43c3364f03ba	ISO-27001	NIST-CSF	A.8.1	PR.DS-01	equivalent	0.85		2026-03-17 08:24:24.442586+08
e0562a3c-3711-46c5-8895-57c865682698	ISO-27001	NIST-CSF	A.5.25	RS.MA-01	equivalent	0.90		2026-03-17 08:24:24.442586+08
2463c6db-c69a-42ca-ad6b-188c449e4ead	ISO-27001	NIST-CSF	A.5.35	RC.RP-01	equivalent	0.85		2026-03-17 08:24:24.442586+08
\.


ALTER TABLE __TENANT_SCHEMA__.framework_cross_mappings ENABLE TRIGGER ALL;

--
-- Data for Name: framework_requirement_versions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.framework_requirement_versions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.framework_requirement_versions (version_id, requirement_id, version_label, effective_at, change_log, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.framework_requirement_versions ENABLE TRIGGER ALL;

--
-- Data for Name: frameworks; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.frameworks DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.frameworks (framework_id, name, description, category, total_controls, implemented_controls, completion_percent, status, seeding_tier, removed_by_admin, removed_at, removed_reason, target_date, created_at, deleted_at, workspace_id, lifecycle_phase, updated_at, owner_user_id, owner_team_id, department_id, business_unit_id) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.frameworks ENABLE TRIGGER ALL;

--
-- Data for Name: role_functions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.role_functions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.role_functions (function_code, name_en, name_ar, description_en, description_ar, is_system, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.role_functions ENABLE TRIGGER ALL;

--
-- Data for Name: function_authorities; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.function_authorities DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.function_authorities (function_code, action, resource_type, allow, max_risk_level, conditions, active, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.function_authorities ENABLE TRIGGER ALL;

--
-- Data for Name: governance_ack_campaigns; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_ack_campaigns DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_ack_campaigns (campaign_id, tenant_id, policy_id, title, due_date, created_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_ack_campaigns ENABLE TRIGGER ALL;

--
-- Data for Name: governance_committees; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_committees DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_committees (committee_id, name, purpose, members, meeting_schedule, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_committees ENABLE TRIGGER ALL;

--
-- Data for Name: governance_meetings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_meetings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_meetings (meeting_id, committee_id, title, scheduled_at, location, status, minutes, duration_minutes, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_meetings ENABLE TRIGGER ALL;

--
-- Data for Name: governance_agenda_items; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_agenda_items DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_agenda_items (item_id, meeting_id, sequence, title, description, presenter_user_id, time_allocated_minutes, status, decision_required, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_agenda_items ENABLE TRIGGER ALL;

--
-- Data for Name: governance_decisions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_decisions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_decisions (decision_id, meeting_id, agenda_item_id, decision_text, decision_type, status, effective_date, review_date, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_decisions ENABLE TRIGGER ALL;

--
-- Data for Name: governance_action_items; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_action_items DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_action_items (action_id, decision_id, title, description, assigned_to, due_date, priority, status, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_action_items ENABLE TRIGGER ALL;

--
-- Data for Name: governance_action_updates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_action_updates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_action_updates (update_id, action_id, update_text, progress_percent, updated_by, metadata, created_at, updated_at, deleted_at, created_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_action_updates ENABLE TRIGGER ALL;

--
-- Data for Name: governance_ai_feedback; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_ai_feedback DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_ai_feedback (id, tenant_id, source_type, source_id, feedback_type, feedback_text, user_id, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_ai_feedback ENABLE TRIGGER ALL;

--
-- Data for Name: governance_ai_runs; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_ai_runs DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_ai_runs (id, tenant_id, run_type, started_at, completed_at, status, stats_json, error_json) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_ai_runs ENABLE TRIGGER ALL;

--
-- Data for Name: governance_authority_levels; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_authority_levels DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_authority_levels (level_id, tenant_id, authority_type, level_name, max_amount, requires_dual_approval, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_authority_levels ENABLE TRIGGER ALL;

--
-- Data for Name: governance_auto_fire_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_auto_fire_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_auto_fire_log (fire_id, tenant_id, fire_type, components_fired, triggered_by, started_at, completed_at, status, error_message) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_auto_fire_log ENABLE TRIGGER ALL;

--
-- Data for Name: governance_bodies; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_bodies DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_bodies (body_id, tenant_id, domain_id, body_type, name_en, name_ar, description, chair_user_id, charter_id, oversight_model, sponsor_id, committee_id, status, owner_user_id, org_unit_id, sensitivity, severity, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_bodies ENABLE TRIGGER ALL;

--
-- Data for Name: governance_charters; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_charters DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_charters (charter_id, tenant_id, committee_id, title_en, title_ar, purpose, scope, responsibilities, authority, membership_criteria, meeting_frequency, quorum_requirements, version, status, approved_by, approved_at, activated_at, expires_at, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_charters ENABLE TRIGGER ALL;

--
-- Data for Name: governance_committee_members; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_committee_members DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_committee_members (member_id, committee_id, user_id, role_in_committee, joined_at, left_at, is_chair, voting_rights, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_committee_members ENABLE TRIGGER ALL;

--
-- Data for Name: governance_compensating_controls; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_compensating_controls DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_compensating_controls (control_id, tenant_id, exception_id, title, description, effectiveness, status, owner_id, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_compensating_controls ENABLE TRIGGER ALL;

--
-- Data for Name: governance_constitution; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_constitution DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_constitution (constitution_id, tenant_id, risk_appetite, authority_matrix, escalation_thresholds, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_constitution ENABLE TRIGGER ALL;

--
-- Data for Name: governance_decision_votes; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_decision_votes DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_decision_votes (vote_id, decision_id, voter_user_id, vote, comments, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_decision_votes ENABLE TRIGGER ALL;

--
-- Data for Name: governance_delegations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_delegations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_delegations (delegation_id, tenant_id, delegator_user_id, delegate_user_id, authority_type, scope_description, max_amount, currency, conditions, status, effective_date, expiry_date, expiry_alert_sent, revoked_at, revoked_by, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_delegations ENABLE TRIGGER ALL;

--
-- Data for Name: governance_domains; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_domains DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_domains (domain_id, tenant_id, name_en, name_ar, description, sponsor_id, owner_id, parent_domain_id, sort_order, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_domains ENABLE TRIGGER ALL;

--
-- Data for Name: governance_enforcement_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_enforcement_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_enforcement_log (violation_id, tenant_id, rule_code, rule_description, entity_type, entity_id, entity_label, severity, status, detected_at, resolved_at, resolved_by, resolution_notes) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_enforcement_log ENABLE TRIGGER ALL;

--
-- Data for Name: governance_signals; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_signals DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_signals (id, tenant_id, signal_type, source_module, source_entity_type, source_entity_id, severity, confidence_score, detected_at, status, board_attention_flag, recommended_action_type, recommended_escalation_level, payload_json, created_by_ai_run_id, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_signals ENABLE TRIGGER ALL;

--
-- Data for Name: governance_interpreted_issues; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_interpreted_issues DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_interpreted_issues (id, tenant_id, signal_id, governance_domain, issue_type, issue_summary, urgency, risk_level, qiyas_impact_level, affected_committee_id, affected_policy_id, affected_control_id, requires_authority_review, requires_human_approval, interpretation_json, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_interpreted_issues ENABLE TRIGGER ALL;

--
-- Data for Name: governance_escalation_events; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_escalation_events DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_escalation_events (id, tenant_id, source_signal_id, source_issue_id, escalation_level, escalation_target_type, escalation_target_id, board_attention_flag, executive_attention_flag, reason, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_escalation_events ENABLE TRIGGER ALL;

--
-- Data for Name: governance_executive_summaries; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_executive_summaries DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_executive_summaries (summary_id, tenant_id, title_en, title_ar, period_start, period_end, summary_type, status, content, highlights, key_risks, key_decisions, recommendations, prepared_by, approved_by, approved_at, published_at, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_executive_summaries ENABLE TRIGGER ALL;

--
-- Data for Name: governance_health_scores; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_health_scores DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_health_scores (score_id, tenant_id, overall_score, overall_grade, policy_health, accountability, committee_effectiveness, decision_execution, exception_exposure, action_timeliness, mandate_validity, review_discipline, computed_at, dimension_scores, dimension_details, computed_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_health_scores ENABLE TRIGGER ALL;

--
-- Data for Name: governance_health_thresholds; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_health_thresholds DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_health_thresholds (threshold_id, tenant_id, green_min, yellow_min, dimension_weights, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_health_thresholds ENABLE TRIGGER ALL;

--
-- Data for Name: governance_mandates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_mandates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_mandates (mandate_id, tenant_id, title_en, title_ar, issuing_authority, jurisdiction, priority, status, effective_date, expiry_date, description, owner_id, review_date, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_mandates ENABLE TRIGGER ALL;

--
-- Data for Name: governance_mandate_sources; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_mandate_sources DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_mandate_sources (source_id, mandate_id, document_title, document_url, source_type, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_mandate_sources ENABLE TRIGGER ALL;

--
-- Data for Name: governance_meeting_attendees; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_meeting_attendees DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_meeting_attendees (attendee_id, meeting_id, user_id, attendance_status, proxy_for_user_id, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_meeting_attendees ENABLE TRIGGER ALL;

--
-- Data for Name: governance_objectives; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_objectives DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_objectives (objective_id, title_en, title_ar, description, category, target_date, owner_id, status, progress_percent, parent_objective_id, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_objectives ENABLE TRIGGER ALL;

--
-- Data for Name: governance_obligations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_obligations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_obligations (obligation_id, tenant_id, mandate_id, title_en, title_ar, description, obligation_type, status, owner_id, review_date, board_attention, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_obligations ENABLE TRIGGER ALL;

--
-- Data for Name: governance_obligation_control_links; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_obligation_control_links DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_obligation_control_links (link_id, obligation_id, control_id, linked_at, linked_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_obligation_control_links ENABLE TRIGGER ALL;

--
-- Data for Name: governance_obligation_due_dates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_obligation_due_dates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_obligation_due_dates (due_date_id, obligation_id, due_date, status, completed_at, completed_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_obligation_due_dates ENABLE TRIGGER ALL;

--
-- Data for Name: governance_obligation_evidence_links; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_obligation_evidence_links DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_obligation_evidence_links (link_id, obligation_id, evidence_id, linked_at, linked_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_obligation_evidence_links ENABLE TRIGGER ALL;

--
-- Data for Name: governance_obligation_exemptions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_obligation_exemptions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_obligation_exemptions (exemption_id, obligation_id, reason, status, requested_by, approved_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_obligation_exemptions ENABLE TRIGGER ALL;

--
-- Data for Name: governance_policies; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_policies DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_policies (policy_id, title, content, description, category, version, status, approval_status, approved_by, approved_at, frameworks, owner, review_frequency, next_review_date, effective_date, expiry_date, policy_code_rules, linked_procedures, linked_controls, tags, created_at, updated_at, deleted_at, search_vector, is_training, workspace_id, lifecycle_phase, author_user_id, reviewer_user_id, approver_user_id, org_unit_id, version_no, classification, created_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_policies ENABLE TRIGGER ALL;

--
-- Data for Name: governance_policy_acknowledgements; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_policy_acknowledgements DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_policy_acknowledgements (ack_id, policy_id, user_id, acknowledged_at, version_acknowledged, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_policy_acknowledgements ENABLE TRIGGER ALL;

--
-- Data for Name: governance_policy_versions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_policy_versions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_policy_versions (version_id, policy_id, version, title, content, status, change_summary, changed_by, snapshot, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_policy_versions ENABLE TRIGGER ALL;

--
-- Data for Name: governance_policy_approvals; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_policy_approvals DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_policy_approvals (approval_id, policy_id, approver_id, decision, comments, version_id, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_policy_approvals ENABLE TRIGGER ALL;

--
-- Data for Name: governance_policy_reviews; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_policy_reviews DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_policy_reviews (review_id, policy_id, reviewer_id, review_type, outcome, comments, next_review_date, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_policy_reviews ENABLE TRIGGER ALL;

--
-- Data for Name: governance_policy_risk_links; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_policy_risk_links DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_policy_risk_links (link_id, policy_id, risk_id, link_type, rationale, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_policy_risk_links ENABLE TRIGGER ALL;

--
-- Data for Name: governance_procedure_versions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_procedure_versions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_procedure_versions (version_id, procedure_id, version, title, content, status, change_summary, changed_by, snapshot, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_procedure_versions ENABLE TRIGGER ALL;

--
-- Data for Name: governance_procedures; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_procedures DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_procedures (procedure_id, title, content, description, category, version, status, approval_status, approved_by, approved_at, owner, linked_policy_id, linked_controls, review_frequency, next_review_date, effective_date, expiry_date, sop_type, tags, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_procedures ENABLE TRIGGER ALL;

--
-- Data for Name: governance_raci_templates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_raci_templates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_raci_templates (template_id, tenant_id, name_en, name_ar, process_area, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_raci_templates ENABLE TRIGGER ALL;

--
-- Data for Name: governance_raci_assignments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_raci_assignments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_raci_assignments (assignment_id, template_id, activity, role_or_user, raci_type, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_raci_assignments ENABLE TRIGGER ALL;

--
-- Data for Name: governance_recommendations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_recommendations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_recommendations (id, tenant_id, interpreted_issue_id, recommendation_type, recommendation_text, suggested_owner_user_id, suggested_due_date, suggested_committee_id, suggested_action_type, accepted_status, accepted_by, accepted_at, rejected_reason, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_recommendations ENABLE TRIGGER ALL;

--
-- Data for Name: governance_registers; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_registers DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_registers (register_id, register_type, name_en, name_ar, description, owner_id, status, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_registers ENABLE TRIGGER ALL;

--
-- Data for Name: governance_reporting_lines; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_reporting_lines DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_reporting_lines (line_id, tenant_id, from_entity_type, from_entity_id, to_entity_type, to_entity_id, line_type, parent_body_id, child_body_id, relationship_type, created_by, created_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_reporting_lines ENABLE TRIGGER ALL;

--
-- Data for Name: governance_responsibilities; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_responsibilities DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_responsibilities (responsibility_id, tenant_id, title_en, title_ar, description, category, criticality, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_responsibilities ENABLE TRIGGER ALL;

--
-- Data for Name: governance_responsibility_assignments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_responsibility_assignments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_responsibility_assignments (assignment_id, responsibility_id, assignee_type, assignee_id, scope_type, scope_id, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_responsibility_assignments ENABLE TRIGGER ALL;

--
-- Data for Name: governance_risk_appetite; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_risk_appetite DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_risk_appetite (category, max_residual_score, acceptance_requires_role, review_cadence_days, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_risk_appetite ENABLE TRIGGER ALL;

--
-- Data for Name: governance_score_explanations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_score_explanations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_score_explanations (id, tenant_id, score_run_id, overall_score, previous_score, delta_score, top_negative_drivers_json, top_positive_drivers_json, recommendation_summary, explanation_text, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_score_explanations ENABLE TRIGGER ALL;

--
-- Data for Name: governance_signal_events; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_signal_events DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_signal_events (id, tenant_id, signal_id, event_type, event_payload_json, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_signal_events ENABLE TRIGGER ALL;

--
-- Data for Name: governance_signal_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.governance_signal_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.governance_signal_rules (id, tenant_id, signal_type, enabled, threshold_json, severity_mapping_json, route_config_json, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.governance_signal_rules ENABLE TRIGGER ALL;

--
-- Data for Name: grc_sector_lookup; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.grc_sector_lookup DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.grc_sector_lookup (sector_id, code, name_en, name_ar, regulator, is_active, created_at) FROM stdin;
50aa68aa-79bb-4040-a723-9ca0ff9e12b4	banking	Banking & Finance	البنوك والتمويل	SAMA	t	2026-03-17 08:24:23.408019+08
e23be7d5-1438-4f5e-92d0-8e1de27c76af	insurance	Insurance	التأمين	SAMA	t	2026-03-17 08:24:23.408019+08
a284660e-b34c-46f3-92ba-2797f323688f	capital_markets	Capital Markets	الأسواق المالية	CMA	t	2026-03-17 08:24:23.408019+08
d91fc6cd-b023-4f07-9cfb-728d4eaa24b9	telecom	Telecommunications	الاتصالات	CST	t	2026-03-17 08:24:23.408019+08
107b1283-fe98-465f-9ea1-f260fb1b19f3	healthcare	Healthcare	الرعاية الصحية	MOH	t	2026-03-17 08:24:23.408019+08
d1b695af-fef6-4e86-af94-24f076700cd1	energy	Energy & Utilities	الطاقة والمرافق	ECRA	t	2026-03-17 08:24:23.408019+08
ac1adde5-1808-4b88-9f2d-12f74f92eadd	government	Government	القطاع الحكومي	NCA	t	2026-03-17 08:24:23.408019+08
d4be194e-d642-4fe5-8d1f-1840b8b799f1	retail	Retail & E-Commerce	التجزئة والتجارة الإلكترونية	MOCI	t	2026-03-17 08:24:23.408019+08
51eaf5c9-7eff-4f51-8f43-15dd8a670382	education	Education	التعليم	MOE	t	2026-03-17 08:24:23.408019+08
f8138ec6-ea81-4c59-9662-bc71870d788b	manufacturing	Manufacturing & Industrial	التصنيع والصناعة	MODON	t	2026-03-17 08:24:23.408019+08
\.


ALTER TABLE __TENANT_SCHEMA__.grc_sector_lookup ENABLE TRIGGER ALL;

--
-- Data for Name: grc_control_sector_mapping; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.grc_control_sector_mapping DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.grc_control_sector_mapping (mapping_id, control_id, sector_id, applicability, notes, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.grc_control_sector_mapping ENABLE TRIGGER ALL;

--
-- Data for Name: grc_entity_profile_mapping; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.grc_entity_profile_mapping DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.grc_entity_profile_mapping (mapping_id, entity_type, entity_id, user_id, team_id, department_id, role_code, raci_role, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.grc_entity_profile_mapping ENABLE TRIGGER ALL;

--
-- Data for Name: grc_evidence_action_mapping; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.grc_evidence_action_mapping DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.grc_evidence_action_mapping (mapping_id, evidence_id, action_type, assigned_to, team_id, role_code, deadline_days, is_active, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.grc_evidence_action_mapping ENABLE TRIGGER ALL;

--
-- Data for Name: grc_evidence_sector_mapping; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.grc_evidence_sector_mapping DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.grc_evidence_sector_mapping (mapping_id, evidence_id, sector_id, requirement, notes, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.grc_evidence_sector_mapping ENABLE TRIGGER ALL;

--
-- Data for Name: grc_maturity_sync; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.grc_maturity_sync DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.grc_maturity_sync (sync_id, qiyas_assessment_id, sync_type, overall_maturity, domain_scores, dimension_scores, compliance_impact, synced_at, synced_by, version, is_current) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.grc_maturity_sync ENABLE TRIGGER ALL;

--
-- Data for Name: grc_plans; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.grc_plans DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.grc_plans (plan_id, title, description, policy_ids, control_ids, assessment_ids, vision_2030_tags, status, created_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.grc_plans ENABLE TRIGGER ALL;

--
-- Data for Name: grc_qiyas_control_feedback; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.grc_qiyas_control_feedback DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.grc_qiyas_control_feedback (feedback_id, grc_control_id, test_result, test_date, qiyas_indicator_id, qiyas_question_id, score_before, score_after, sync_status, synced_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.grc_qiyas_control_feedback ENABLE TRIGGER ALL;

--
-- Data for Name: grc_raci_assignments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.grc_raci_assignments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.grc_raci_assignments (assignment_id, entity_type, entity_id, team_id, dept_id, user_id, raci_role, assignment_source, is_active, effective_from, effective_to, notes, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.grc_raci_assignments ENABLE TRIGGER ALL;

--
-- Data for Name: grc_risk_sector_mapping; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.grc_risk_sector_mapping DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.grc_risk_sector_mapping (mapping_id, risk_id, sector_id, relevance, notes, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.grc_risk_sector_mapping ENABLE TRIGGER ALL;

--
-- Data for Name: grc_roadmaps; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.grc_roadmaps DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.grc_roadmaps (roadmap_id, tenant_id, company_profile, stages, regulatory_map, generated_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.grc_roadmaps ENABLE TRIGGER ALL;

--
-- Data for Name: guard_decision_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.guard_decision_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.guard_decision_log (id, tenant_id, user_id, agent_id, run_id, tool_name, check_type, decision, reason, metadata, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.guard_decision_log ENABLE TRIGGER ALL;

--
-- Data for Name: guidance_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.guidance_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.guidance_history (id, tenant_id, user_id, step_id, module_route, guidance_type, content, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.guidance_history ENABLE TRIGGER ALL;

--
-- Data for Name: handoff_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.handoff_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.handoff_log (handoff_id, source_participant_id, target_participant_id, task_id, direction, context, reason, status, error_context, partial_results, created_at, completed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.handoff_log ENABLE TRIGGER ALL;

--
-- Data for Name: hitl_states; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.hitl_states DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.hitl_states (state_id, entity_type, entity_id, hitl_state, ai_agent_id, confidence, last_actor_type, review_required, review_decision, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.hitl_states ENABLE TRIGGER ALL;

--
-- Data for Name: iam_connections; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.iam_connections DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.iam_connections (connection_id, name, iam_type, endpoint_url, auth_method, credentials_encrypted, sync_schedule_cron, sync_enabled, group_filter, last_validated_at, validation_status, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.iam_connections ENABLE TRIGGER ALL;

--
-- Data for Name: iam_identities; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.iam_identities DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.iam_identities (identity_id, connection_id, external_user_id, email, display_name, department, job_title, status, groups, roles, risk_flags, last_login_at, raw_data, linked_user_id, last_synced_at, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.iam_identities ENABLE TRIGGER ALL;

--
-- Data for Name: iam_access_reviews; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.iam_access_reviews DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.iam_access_reviews (review_id, connection_id, identity_id, review_type, status, reviewer_id, decision_note, reviewed_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.iam_access_reviews ENABLE TRIGGER ALL;

--
-- Data for Name: iam_sync_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.iam_sync_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.iam_sync_history (sync_id, connection_id, status, identities_fetched, identities_created, identities_updated, anomalies_detected, errors, duration_ms, started_at, completed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.iam_sync_history ENABLE TRIGGER ALL;

--
-- Data for Name: incident_audit_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.incident_audit_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.incident_audit_log (log_id, entity_type, entity_id, action, actor_id, actor_role, before_state, after_state, change_summary, ip_address, user_agent, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.incident_audit_log ENABLE TRIGGER ALL;

--
-- Data for Name: incidents; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.incidents DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.incidents (incident_id, title, description, category, severity, status, affected_controls, reported_by, assigned_to, ai_triage, root_cause, lessons_learned, created_at, resolved_at, search_vector, is_training, deleted_at, workspace_id, lifecycle_phase, owner, escalation_state, board_attention, sla_hours, resolution_action, taxonomy_node_id, owner_user_id, reviewer_user_id, approver_user_id, org_unit_id, created_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.incidents ENABLE TRIGGER ALL;

--
-- Data for Name: incident_pir; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.incident_pir DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.incident_pir (pir_id, incident_id, title, pir_type, status, lead_id, facilitator_id, scheduled_date, completed_date, timeline_summary, what_happened, root_causes, contributing_factors, impact_analysis, lessons_learned, recommendations, action_items, attendees, effectiveness_review_date, effectiveness_status, sign_off_by, sign_off_at, sign_off_notes, attachments, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.incident_pir ENABLE TRIGGER ALL;

--
-- Data for Name: incident_recurring_patterns; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.incident_recurring_patterns DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.incident_recurring_patterns (pattern_id, pattern_type, pattern_key, description, occurrence_count, first_seen, last_seen, avg_resolution_hours, affected_systems, taxonomy_nodes, severity_distribution, recommended_action, is_active, metadata, computed_at, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.incident_recurring_patterns ENABLE TRIGGER ALL;

--
-- Data for Name: incident_regulatory_notifications; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.incident_regulatory_notifications DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.incident_regulatory_notifications (notification_id, incident_id, regulation_code, regulation_name, authority_name, authority_contact, notification_type, status, deadline, submitted_at, submitted_by, acknowledged_at, reference_number, content_summary, content_full, response_received, follow_up_actions, sla_hours, sla_breached, attachments, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.incident_regulatory_notifications ENABLE TRIGGER ALL;

--
-- Data for Name: incident_reportable_criteria; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.incident_reportable_criteria DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.incident_reportable_criteria (criteria_id, regulation_code, criteria_name, criteria_rule, sla_hours, authority_name, is_active, created_at, updated_at, deleted_at) FROM stdin;
bb2fb819-05b3-4160-b879-d8fb93e6d79a	NCA-ECC	Critical cyber incident	{"severity": ["critical"], "taxonomy_codes": ["INC_CYBER", "INC_DATA"]}	2	National Cybersecurity Authority	t	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
4e16dacf-3b8a-4a73-8e6e-c8af859bb4c0	NCA-ECC	Data breach involving PII	{"severity": ["high", "critical"], "taxonomy_codes": ["INC_DATA_PII"]}	72	National Cybersecurity Authority	t	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
fedeaae8-6974-43ec-a96b-734a293b9785	SAMA-BCF	Financial system incident	{"severity": ["critical", "high"], "taxonomy_codes": ["INC_OPS_OUTAGE", "INC_CYBER"]}	24	Saudi Arabian Monetary Authority	t	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
59002554-05ca-4f7b-8e2c-2e2a61400fa1	NDMO	Personal data breach (PDPL)	{"taxonomy_codes": ["INC_DATA_PII", "INC_DATA_CONF"]}	72	National Data Management Office	t	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
\.


ALTER TABLE __TENANT_SCHEMA__.incident_reportable_criteria ENABLE TRIGGER ALL;

--
-- Data for Name: incident_response_actions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.incident_response_actions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.incident_response_actions (action_id, incident_id, action_type, title, description, assigned_to, due_date, status, priority, outcome, completed_at, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.incident_response_actions ENABLE TRIGGER ALL;

--
-- Data for Name: incident_risk_links; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.incident_risk_links DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.incident_risk_links (link_id, incident_id, risk_id, link_type, impact_on_risk, risk_score_delta, auto_linked, linked_by, notes, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.incident_risk_links ENABLE TRIGGER ALL;

--
-- Data for Name: incident_root_causes; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.incident_root_causes DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.incident_root_causes (root_cause_id, incident_id, category, description, contributing_factors, corrective_action, preventive_action, identified_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.incident_root_causes ENABLE TRIGGER ALL;

--
-- Data for Name: incident_taxonomy; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.incident_taxonomy DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.incident_taxonomy (node_id, parent_id, code, name_en, name_ar, node_type, severity_hint, regulatory_flag, display_order, is_active, metadata, created_at, updated_at, deleted_at) FROM stdin;
4842b818-35b7-4d19-a5a1-26fc4de68d0c	\N	INC_ROOT	All Incidents	جميع الحوادث	root	medium	f	0	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
3876a280-74bc-493d-88b8-3e6c70c3958f	4842b818-35b7-4d19-a5a1-26fc4de68d0c	INC_CYBER	Cybersecurity	الأمن السيبراني	category	high	t	1	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
854e6336-ac81-4cbf-ba98-2fb28627788e	4842b818-35b7-4d19-a5a1-26fc4de68d0c	INC_DATA	Data Breach	خرق البيانات	category	critical	t	2	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
58d87808-9ecc-402e-bb86-68ab31f9ee24	4842b818-35b7-4d19-a5a1-26fc4de68d0c	INC_OPS	Operational	تشغيلية	category	medium	f	3	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
cd62288f-c140-4974-93d7-8c490b5466f2	4842b818-35b7-4d19-a5a1-26fc4de68d0c	INC_COMPLIANCE	Compliance Violation	مخالفة امتثال	category	high	t	4	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
a730e6c8-90b6-4bda-aba2-7bdbf6356b80	4842b818-35b7-4d19-a5a1-26fc4de68d0c	INC_PHYSICAL	Physical Security	أمن مادي	category	medium	f	5	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
1dc5f507-8601-4235-b40f-358504acfad9	4842b818-35b7-4d19-a5a1-26fc4de68d0c	INC_THIRD_PARTY	Third-Party	طرف ثالث	category	high	f	6	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
d3a297a5-84c1-4797-956c-a646d855bdf4	3876a280-74bc-493d-88b8-3e6c70c3958f	INC_CYBER_MALW	Malware	برمجيات خبيثة	subcategory	high	t	1	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
c298ea7a-c9e1-4d5a-8834-ebbeeeb89f37	3876a280-74bc-493d-88b8-3e6c70c3958f	INC_CYBER_PHISH	Phishing	تصيد إلكتروني	subcategory	high	t	2	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
eab3f138-1a9c-4180-807a-930b5d2a1606	3876a280-74bc-493d-88b8-3e6c70c3958f	INC_CYBER_RANSOM	Ransomware	فدية إلكترونية	subcategory	critical	t	3	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
ad5ee44f-bba7-4e00-9b9d-c33b4abb3698	3876a280-74bc-493d-88b8-3e6c70c3958f	INC_CYBER_DDOS	DDoS	هجوم حجب الخدمة	subcategory	high	t	4	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
2fdd99b8-e1f2-4477-816a-cc798ee2aabb	3876a280-74bc-493d-88b8-3e6c70c3958f	INC_CYBER_UNAUTH	Unauthorized Access	وصول غير مصرح	subcategory	critical	t	5	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
15bfca40-fa37-4e06-a3c3-087c8606c2b2	854e6336-ac81-4cbf-ba98-2fb28627788e	INC_DATA_PII	PII Exposure	تسريب بيانات شخصية	subcategory	critical	t	1	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
6071b6e8-f476-4743-9763-222987c87971	854e6336-ac81-4cbf-ba98-2fb28627788e	INC_DATA_CONF	Confidential Leak	تسريب بيانات سرية	subcategory	critical	t	2	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
93d695a6-0835-41ee-8679-a8cfc54431af	58d87808-9ecc-402e-bb86-68ab31f9ee24	INC_OPS_OUTAGE	System Outage	انقطاع الأنظمة	subcategory	high	f	1	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
6f812bf2-b9fc-41d9-9f9c-8f776abe976b	58d87808-9ecc-402e-bb86-68ab31f9ee24	INC_OPS_PROCESS	Process Failure	فشل العملية	subcategory	medium	f	2	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
b47c8111-0ea7-4205-8af0-f360a72361e8	58d87808-9ecc-402e-bb86-68ab31f9ee24	INC_OPS_HUMAN	Human Error	خطأ بشري	subcategory	low	f	3	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
08560846-ad3b-4950-92cf-a5b1b6e7d9e3	cd62288f-c140-4974-93d7-8c490b5466f2	INC_COMPLIANCE_REG	Regulatory Breach	مخالفة تنظيمية	subcategory	critical	t	1	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
22d5b201-a386-4be1-b182-8ff6f050f6a6	cd62288f-c140-4974-93d7-8c490b5466f2	INC_COMPLIANCE_POL	Policy Violation	مخالفة سياسة	subcategory	medium	f	2	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
40525403-1b3f-46ae-9ffb-12e4bbd15fe6	a730e6c8-90b6-4bda-aba2-7bdbf6356b80	INC_PHYSICAL_ACC	Unauthorized Physical Access	دخول مادي غير مصرح	subcategory	high	f	1	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
2f4ea87d-f30d-43f3-b654-0f1b37addf8f	1dc5f507-8601-4235-b40f-358504acfad9	INC_THIRD_PARTY_BREACH	Vendor Breach	خرق مورد	subcategory	high	t	1	t	{}	2026-03-17 08:24:23.110699+08	2026-03-17 08:24:23.110699+08	\N
4c986245-fe2b-4ef1-95c6-086da19c5311	\N	SEC	Security Incident	حادث أمني	category	high	t	1	t	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
ae605c3f-b53c-49a0-9e7a-4480ec3e2e79	\N	OPS	Operational Incident	حادث تشغيلي	category	medium	f	2	t	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
4e3e47ef-e2f4-43d7-a7fe-66900a3bff36	4c986245-fe2b-4ef1-95c6-086da19c5311	SEC-MAL	Malware / Ransomware	برمجيات خبيثة	subcategory	critical	t	1	t	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
e201b253-9c42-415b-8ba9-b38ba553f17d	4c986245-fe2b-4ef1-95c6-086da19c5311	SEC-PHISH	Phishing Attack	هجوم تصيد	subcategory	high	t	2	t	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
d5313e56-2ef4-4ed3-a72c-185fbf3ae4b4	4c986245-fe2b-4ef1-95c6-086da19c5311	SEC-UNAUTH	Unauthorized Access	وصول غير مصرح	subcategory	critical	t	3	t	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
ace7492b-be34-4015-9812-1e935839ade1	4c986245-fe2b-4ef1-95c6-086da19c5311	SEC-DLP	Data Leakage	تسريب بيانات	subcategory	critical	t	4	t	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
04e4fc6a-cc04-4cd6-bd60-427dcafe2e21	ae605c3f-b53c-49a0-9e7a-4480ec3e2e79	OPS-OUT	System Outage	انقطاع النظام	subcategory	high	f	1	t	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
d9767b6c-9fc6-49f7-b648-f6c877bb5467	ae605c3f-b53c-49a0-9e7a-4480ec3e2e79	OPS-PERF	Performance Degradation	تدهور الأداء	subcategory	medium	f	2	t	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
dbbc2e81-a989-47b2-9a00-e41e703619e8	ae605c3f-b53c-49a0-9e7a-4480ec3e2e79	OPS-CFG	Configuration Error	خطأ في التهيئة	subcategory	medium	f	3	t	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
7486e294-f625-4037-a5cb-a7c646f8a7f0	\N	COMP	Compliance Incident	حادث امتثال	category	high	t	3	t	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
c93f9acd-d299-4c0e-bda9-17ea0b7801fb	\N	PHYS	Physical Incident	حادث مادي	category	medium	f	4	t	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
b9d37184-ec13-4508-86f0-be2e83492c6d	7486e294-f625-4037-a5cb-a7c646f8a7f0	COMP-REG	Regulatory Breach	مخالفة تنظيمية	subcategory	critical	t	1	t	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
32676f0f-ddce-48d2-89fe-3f1ac291af1c	7486e294-f625-4037-a5cb-a7c646f8a7f0	COMP-POL	Policy Violation	مخالفة سياسة	subcategory	high	t	2	t	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
77f11e23-c6bc-4e74-8467-e634805aa267	c93f9acd-d299-4c0e-bda9-17ea0b7801fb	PHYS-ACC	Physical Access Breach	خرق الوصول المادي	subcategory	high	f	1	t	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
287a295c-b2e6-43a9-ab55-dc49f731875e	c93f9acd-d299-4c0e-bda9-17ea0b7801fb	PHYS-ENV	Environmental Incident	حادث بيئي	subcategory	medium	f	2	t	{}	2026-03-17 08:24:23.408019+08	2026-03-17 08:24:23.408019+08	\N
\.


ALTER TABLE __TENANT_SCHEMA__.incident_taxonomy ENABLE TRIGGER ALL;

--
-- Data for Name: incident_team_distribution; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.incident_team_distribution DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.incident_team_distribution (dist_id, team_code, raci_role, incident_type, severity_filter, is_active, created_at) FROM stdin;
3eedcb9d-e6cf-4a70-a94a-65c409fd3856	SEC_OPS	responsible	all	all	t	2026-03-17 08:24:23.408019+08
4423973d-44ec-40ff-b983-4cc319299a99	SEC_OPS	accountable	security	all	t	2026-03-17 08:24:23.408019+08
29f4ad29-9521-41b4-a73a-ac31267122a4	IT_OPS	responsible	it_outage	all	t	2026-03-17 08:24:23.408019+08
1d52f4fe-f26f-4ea9-a6e3-0ca44f25132d	RISK	consulted	all	all	t	2026-03-17 08:24:23.408019+08
1b8d418b-2618-45b1-aae9-ecbbbdbae764	COMP	informed	all	all	t	2026-03-17 08:24:23.408019+08
56e9de9a-bbd3-491f-9d0a-09e408bfb8cf	EXEC	informed	critical	all	t	2026-03-17 08:24:23.408019+08
\.


ALTER TABLE __TENANT_SCHEMA__.incident_team_distribution ENABLE TRIGGER ALL;

--
-- Data for Name: incident_trend_cache; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.incident_trend_cache DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.incident_trend_cache (cache_id, trend_type, period_start, period_end, granularity, dimension_key, dimension_value, metric_name, metric_value, previous_value, change_pct, trend_direction, sample_size, metadata, computed_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.incident_trend_cache ENABLE TRIGGER ALL;

--
-- Data for Name: incident_updates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.incident_updates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.incident_updates (update_id, incident_id, update_type, update_text, updated_by, status_change_from, status_change_to, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.incident_updates ENABLE TRIGGER ALL;

--
-- Data for Name: inline_edit_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.inline_edit_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.inline_edit_history (edit_id, entity_type, entity_id, field_name, old_value, new_value, edited_by, validated, validation_errors, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.inline_edit_history ENABLE TRIGGER ALL;

--
-- Data for Name: instrument_versions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.instrument_versions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.instrument_versions (version_id, instrument_id, version_label, published_at, effective_at, retired_at, source_url, change_log, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.instrument_versions ENABLE TRIGGER ALL;

--
-- Data for Name: integration_configs; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.integration_configs DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.integration_configs (integration_id, type, config, enabled, created_at, updated_at, name, owner_id, owner_team_id, last_validated_at, validation_status, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.integration_configs ENABLE TRIGGER ALL;

--
-- Data for Name: intervention_audit_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.intervention_audit_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.intervention_audit_log (intervention_id, workflow_step_id, admin_user_id, original_assignee_id, intervention_type, justification, before_state, after_state, new_assignee_id, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.intervention_audit_log ENABLE TRIGGER ALL;

--
-- Data for Name: invitations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.invitations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.invitations (invitation_id, email, role, entity_scope, token_hash, expires_at, status, created_by, created_at, accepted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.invitations ENABLE TRIGGER ALL;

--
-- Data for Name: itsm_connections; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.itsm_connections DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.itsm_connections (connection_id, name, itsm_type, endpoint_url, auth_method, credentials_encrypted, sync_schedule_cron, sync_enabled, ticket_type_filter, bidirectional, last_validated_at, validation_status, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.itsm_connections ENABLE TRIGGER ALL;

--
-- Data for Name: itsm_sync_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.itsm_sync_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.itsm_sync_history (sync_id, connection_id, status, tickets_fetched, tickets_created, tickets_updated, tickets_pushed, errors, duration_ms, started_at, completed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.itsm_sync_history ENABLE TRIGGER ALL;

--
-- Data for Name: itsm_tickets; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.itsm_tickets DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.itsm_tickets (ticket_id, connection_id, external_ticket_id, ticket_type, summary, description, priority, status, assignee, reporter, linked_finding_id, linked_incident_id, linked_remediation_id, raw_data, external_url, last_synced_at, external_created_at, external_updated_at, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.itsm_tickets ENABLE TRIGGER ALL;

--
-- Data for Name: journey_progress; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.journey_progress DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.journey_progress (id, tenant_id, user_id, roadmap_id, current_stage_id, current_step_id, completed_stages, completed_steps, skipped_steps, stage_scores, started_at, last_activity_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.journey_progress ENABLE TRIGGER ALL;

--
-- Data for Name: knowledge_articles; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.knowledge_articles DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.knowledge_articles (article_id, title, body_md, category, tags, status, author_id, reviewer_id, published_at, tenant_id, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.knowledge_articles ENABLE TRIGGER ALL;

--
-- Data for Name: kpi_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.kpi_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.kpi_history (history_id, kpi_id, calculated_value, target_value, variance_from_target, variance_percentage, threshold_status, period_start, period_end, calculation_time_ms, data_quality_score, calculation_notes, calculated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.kpi_history ENABLE TRIGGER ALL;

--
-- Data for Name: kpi_snapshots; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.kpi_snapshots DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.kpi_snapshots (snapshot_id, snapshot_date, compliance_score, risk_score, evidence_coverage, remediation_closure_rate, raw_data, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.kpi_snapshots ENABLE TRIGGER ALL;

--
-- Data for Name: risk_kris; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_kris DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_kris (kri_id, name, description, linked_risk_id, linked_category, owner, threshold_red, threshold_amber, threshold_green, current_value, status, trend, collection_frequency, last_collected_at, created_at, updated_at, deleted_at, deleted_by, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_kris ENABLE TRIGGER ALL;

--
-- Data for Name: kri_breach_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.kri_breach_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.kri_breach_log (breach_id, kri_id, breach_value, threshold_breached, threshold_value, linked_risk_id, owner, action_taken, status, breached_at, resolved_at, resolved_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.kri_breach_log ENABLE TRIGGER ALL;

--
-- Data for Name: kri_data_points; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.kri_data_points DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.kri_data_points (data_point_id, kri_id, value, collected_at, collected_by, notes, deleted_at, deleted_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.kri_data_points ENABLE TRIGGER ALL;

--
-- Data for Name: legal_entities; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.legal_entities DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.legal_entities (entity_id, name_en, name_ar, entity_type, registration_no, country, description, is_active, deleted_at, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.legal_entities ENABLE TRIGGER ALL;

--
-- Data for Name: llm_traces; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.llm_traces DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.llm_traces (trace_id, run_id, span_id, parent_span_id, agent_id, tenant_id, user_id, operation, provider, model, input_preview, output_preview, input_tokens, output_tokens, latency_ms, status, error_message, metadata, prompt_version, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.llm_traces ENABLE TRIGGER ALL;

--
-- Data for Name: llm_usage_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.llm_usage_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.llm_usage_log (usage_id, tenant_id, user_id, agent_id, run_id, provider, model, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms, cache_hit, endpoint_type, error, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.llm_usage_log ENABLE TRIGGER ALL;

--
-- Data for Name: locations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.locations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.locations (location_id, name_en, name_ar, location_type, parent_location_id, address_line1, address_line2, city, state_province, country, postal_code, latitude, longitude, timezone, employee_count, is_critical, applicable_jurisdictions, status, workspace_id, created_at, updated_at, name, address, country_name, deleted_at, data_residency_zone, is_primary, pdpl_applies, cross_border_transfer, address_ar, city_ar, country_code) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.locations ENABLE TRIGGER ALL;

--
-- Data for Name: m365_connections; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.m365_connections DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.m365_connections (connection_id, name, tenant_azure_id, client_id, credentials_encrypted, scopes, sync_schedule_cron, sync_enabled, sharepoint_sites, compliance_center_enabled, security_center_enabled, last_validated_at, validation_status, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.m365_connections ENABLE TRIGGER ALL;

--
-- Data for Name: m365_evidence_items; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.m365_evidence_items DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.m365_evidence_items (item_id, connection_id, source_type, external_item_id, file_name, file_path, site_name, content_hash, file_size_bytes, last_modified_by, last_modified_at, linked_evidence_id, linked_control_ids, raw_metadata, status, last_synced_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.m365_evidence_items ENABLE TRIGGER ALL;

--
-- Data for Name: m365_sync_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.m365_sync_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.m365_sync_history (sync_id, connection_id, status, items_fetched, items_new, items_updated, errors, duration_ms, started_at, completed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.m365_sync_history ENABLE TRIGGER ALL;

--
-- Data for Name: management_responses; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.management_responses DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.management_responses (response_id, finding_id, respondent_id, decision, response_text, action_plan, target_date, status, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.management_responses ENABLE TRIGGER ALL;

--
-- Data for Name: mandate_sources; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.mandate_sources DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.mandate_sources (source_id, mandate_id, source_type, source_name, source_url, document_ref, published_at, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.mandate_sources ENABLE TRIGGER ALL;

--
-- Data for Name: maturity_assessments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.maturity_assessments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.maturity_assessments (assessment_id, assessment_date, assessment_type, framework_code, current_maturity_level, target_maturity_level, process_maturity, technology_maturity, people_maturity, governance_maturity, gaps_identified, improvement_areas, roadmap_items, estimated_time_to_target, investment_required, industry_average, peer_comparison, assessed_by, assessment_method, confidence_level, next_assessment_date, created_at) FROM stdin;
3fc9c9b6-47fa-4822-a43a-095fafe35bbc	2026-03-17	comprehensive	NCA-ECC	3.20	4.50	3.00	3.50	2.80	3.50	["Automated evidence collection not fully implemented", "Cross-team validation processes need improvement", "Risk quantification models require enhancement", "Executive dashboards lack real-time data"]	["Process automation", "Team training and certification", "Advanced analytics implementation", "Integration with external data sources"]	[{"item": "Implement ML-based risk scoring", "quarter": "Q2 2026"}, {"item": "Deploy automated evidence collection", "quarter": "Q2 2026"}, {"item": "Complete team certification program", "quarter": "Q3 2026"}, {"item": "Launch executive dashboard v2", "quarter": "Q4 2026"}]	12	\N	3.80	below_average	SYSTEM	\N	\N	2026-09-17	2026-03-17 08:24:21.668446+08
\.


ALTER TABLE __TENANT_SCHEMA__.maturity_assessments ENABLE TRIGGER ALL;

--
-- Data for Name: maturity_scores; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.maturity_scores DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.maturity_scores (id, tenant_id, domain, score, previous_score, factors, assessed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.maturity_scores ENABLE TRIGGER ALL;

--
-- Data for Name: member_lifecycle_events; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.member_lifecycle_events DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.member_lifecycle_events (event_id, user_id, team_id, event_type, from_status, to_status, metadata, performed_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.member_lifecycle_events ENABLE TRIGGER ALL;

--
-- Data for Name: member_profiles; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.member_profiles DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.member_profiles (profile_id, user_id, team_id, profile_name, profile_name_ar, role_code, permissions, raci_summary, is_default, assigned_by, assigned_at, active) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.member_profiles ENABLE TRIGGER ALL;

--
-- Data for Name: memory_access_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.memory_access_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.memory_access_log (log_id, tenant_id, user_id, agent_id, namespace, action, memory_ids, query_text, result_count, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.memory_access_log ENABLE TRIGGER ALL;

--
-- Data for Name: memory_consent_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.memory_consent_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.memory_consent_log (log_id, tenant_id, user_id, action, purpose, metadata, performed_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.memory_consent_log ENABLE TRIGGER ALL;

--
-- Data for Name: memory_summaries; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.memory_summaries DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.memory_summaries (summary_id, tenant_id, namespace, summary_text, memory_count, last_compacted_at, embedding, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.memory_summaries ENABLE TRIGGER ALL;

--
-- Data for Name: message_read_status; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.message_read_status DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.message_read_status (user_id, channel_id, last_read_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.message_read_status ENABLE TRIGGER ALL;

--
-- Data for Name: messages; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.messages DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.messages (message_id, channel_id, sender_id, recipient_id, content, entity_attachments, mentions, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.messages ENABLE TRIGGER ALL;

--
-- Data for Name: metadata_records; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.metadata_records DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.metadata_records (record_id, asset_id, metadata_key, metadata_value, metadata_type, source, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.metadata_records ENABLE TRIGGER ALL;

--
-- Data for Name: risk_consequences; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_consequences DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_consequences (consequence_id, risk_id, name, description, consequence_type, impact, financial_estimate, currency, is_active, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_consequences ENABLE TRIGGER ALL;

--
-- Data for Name: mitigating_control_mappings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.mitigating_control_mappings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.mitigating_control_mappings (mapping_id, consequence_id, control_id, control_title, effectiveness, notes, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.mitigating_control_mappings ENABLE TRIGGER ALL;

--
-- Data for Name: mode_operation_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.mode_operation_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.mode_operation_log (log_id, user_id, team_id, operation_mode, action_type, entity_type, entity_id, agent_id, confidence_score, was_overridden, override_reason, outcome, metadata, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.mode_operation_log ENABLE TRIGGER ALL;

--
-- Data for Name: model_inventory; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.model_inventory DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.model_inventory (model_id, name, description, model_type, version, owner, department, vendor, status, risk_tier, use_case, input_data_types, output_description, regulatory_frameworks, last_validated_at, next_review_date, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.model_inventory ENABLE TRIGGER ALL;

--
-- Data for Name: model_risk_scores; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.model_risk_scores DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.model_risk_scores (score_id, model_id, inherent_risk, residual_risk, data_quality_score, performance_score, compliance_score, overall_score, zone, scored_by, scored_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.model_risk_scores ENABLE TRIGGER ALL;

--
-- Data for Name: model_validations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.model_validations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.model_validations (validation_id, model_id, validation_type, result, score, findings, validated_by, validated_at, next_validation_date, notes) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.model_validations ENABLE TRIGGER ALL;

--
-- Data for Name: module_assignments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.module_assignments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.module_assignments (assignment_id, user_id, organization_id, module_code, scope_type, scope_id, responsibility_type, is_primary, backup_user_id, approval_level, sla_hours, escalation_rule_id, delegate_user_id, effective_from, effective_to, status, source, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.module_assignments ENABLE TRIGGER ALL;

--
-- Data for Name: module_workflow_registry; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.module_workflow_registry DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.module_workflow_registry (module_code, display_name_en, display_name_ar, module_category, has_lifecycle, lifecycle_statuses, initial_status, terminal_statuses, primary_template_code, secondary_templates, chain_codes, chain_trigger_events, kickstart_status, kickstart_at, permission_prefix, primary_roles, sla_default_hours, automation_level, event_types, icon, color, sort_order, is_active, licensed, created_at, updated_at) FROM stdin;
action	Action Items	بنود الإجراء	core_grc	t	{open,in_progress,completed,verified,closed,overdue,escalated}	open	{closed}	\N	{}	{}	{}	\N	\N	action	{action_owner}	168	full	{action.created,action.completed,action.status_changed}	\N	\N	13	t	t	2026-03-17 08:24:23.814471+08	2026-03-17 08:24:23.814471+08
risk	Risk Management	ادارة المخاطر	core_grc	t	{draft,submitted,under_review,assessed,treatment_planned,approved,active,monitoring,closed,retired,returned}	draft	{closed,retired}	risk_treatment	{}	{risk_to_compliance_score}	{risk.treatment_updated}	\N	\N	risk	{risk_owner,risk_reviewer,risk_approver,risk_creator}	168	semi	{risk.created,risk.score_changed,risk.exceeded_appetite,risk.treatment_updated,risk.status_changed}	\N	\N	1	t	t	2026-03-17 08:24:23.814471+08	2026-03-17 08:24:23.814471+08
compliance	Compliance & Controls	الامتثال والضوابط	core_grc	t	{draft,designed,implemented,test_planned,testing,tested,review,approved,effective,monitoring,deficiency_found,retired}	draft	{retired}	compliance_remediation	{}	{risk_to_compliance_score,audit_to_control_update}	{}	\N	\N	compliance	{control_owner,control_tester,compliance_analyst,compliance_manager}	168	semi	{control.implemented,control.failed,control.stale,compliance.gap_detected,compliance.assessment_completed,compliance.posture_changed,compliance.status_changed}	\N	\N	2	t	t	2026-03-17 08:24:23.814471+08	2026-03-17 08:24:23.814471+08
policy	Policy Management	ادارة السياسات	governance	t	{draft,submitted,under_review,revision_requested,resubmitted,approved,published,active,review_due,under_revision,retired}	draft	{retired}	policy_lifecycle	{}	{policy_to_compliance_impact}	{policy.published}	\N	\N	policy	{policy_author,policy_reviewer,policy_approver,document_controller}	336	semi	{policy.approved,policy.violated,policy.expired,policy.published,policy.status_changed}	\N	\N	3	t	t	2026-03-17 08:24:23.814471+08	2026-03-17 08:24:23.814471+08
evidence	Evidence Management	ادارة الأدلة	core_grc	t	{requested,collecting,uploaded,under_review,verified,locked,released,archived,rejected_quality}	requested	{archived}	evidence_collection	{}	{risk_to_compliance_score,audit_to_control_update}	{}	\N	\N	evidence	{evidence_owner,evidence_reviewer,custodian}	168	full	{evidence.uploaded,evidence.expired,evidence.coverage_low,evidence.status_changed}	\N	\N	4	t	t	2026-03-17 08:24:23.814471+08	2026-03-17 08:24:23.814471+08
audit	Internal Audit	التدقيق الداخلي	core_grc	t	{planned,scoped,fieldwork,draft_report,management_response,final_report,approved,issued,finding_tracking,closed}	planned	{closed}	audit_cycle	{}	{audit_to_control_update}	{audit.finding.issued}	\N	\N	audit	{audit_manager,auditor,auditee_owner}	504	semi	{audit.finding_created,audit.completed,audit.remediation_due,audit.finding.issued,audit.status_changed}	\N	\N	5	t	t	2026-03-17 08:24:23.814471+08	2026-03-17 08:24:23.814471+08
incident	Incident Management	ادارة الحوادث	operational	t	{reported,triaged,investigating,contained,eradicated,recovered,under_review,approved_closure,closed,lessons_learned,escalated}	reported	{closed,lessons_learned}	incident_response	{}	{incident_to_remediation}	{incident.escalated}	\N	\N	incident	{incident_reporter,incident_owner,incident_reviewer,incident_approver}	24	full	{incident.created,incident.resolved,incident.escalated,incident.status_changed}	\N	\N	6	t	t	2026-03-17 08:24:23.814471+08	2026-03-17 08:24:23.814471+08
exception	Exception Governance	ادارة الاستثناءات	governance	t	{draft,submitted,risk_assessed,under_review,approved,rejected,active,monitoring,expiring,expired,renewed,closed}	draft	{closed,rejected,expired}	\N	{}	{}	{}	\N	\N	exception	{exception_requester,exception_approver}	168	semi	{exception.created,exception.approved,exception.rejected,exception.status_changed}	\N	\N	7	t	t	2026-03-17 08:24:23.814471+08	2026-03-17 08:24:23.814471+08
governance	Governance Bodies	هيئات الحوكمة	governance	t	{draft,proposed,committee_review,approved,active,annual_review,under_revision,re_approved,dissolved}	draft	{dissolved}	\N	{}	{}	{}	\N	\N	governance	{governance_manager,committee_secretary,charter_owner,executive_reviewer}	720	manual	{governance.status_changed}	\N	\N	8	t	t	2026-03-17 08:24:23.814471+08	2026-03-17 08:24:23.814471+08
vendor	Vendor Management	ادارة الموردين	operational	t	{identified,questionnaire_sent,questionnaire_received,assessing,assessed,approved,rejected,onboarded,active,annual_review,re_assessed,offboarding,offboarded}	identified	{offboarded,rejected}	vendor_assessment	{}	{vendor_to_bcp_impact}	{vendor.dd_completed}	\N	\N	vendor	{vendor_owner,vendor_assessor}	336	semi	{vendor.onboarded,vendor.risk_changed,vendor.contract_expiring,vendor.dd_completed,vendor.offboarding_initiated,vendor.status_changed}	\N	\N	9	t	t	2026-03-17 08:24:23.814471+08	2026-03-17 08:24:23.814471+08
bcp	Business Continuity	استمرارية الأعمال	operational	t	{draft,planned,tested,evaluated,approved,active,exercised,review_due,under_revision,re_approved,retired}	draft	{retired}	bcp_testing	{}	{vendor_to_bcp_impact}	{}	\N	\N	bcp	{bcp_coordinator,bcp_owner}	720	semi	{bcp.exercise_completed,bcp.status_changed}	\N	\N	10	t	t	2026-03-17 08:24:23.814471+08	2026-03-17 08:24:23.814471+08
asset	Asset Management	ادارة الأصول	operational	t	{draft,registered,classified,under_review,approved,active,review_due,under_reclassification,re_approved,decommissioned}	draft	{decommissioned}	\N	{}	{}	{}	\N	\N	asset	{asset_owner,asset_custodian}	168	semi	{asset.created,asset.classified,asset.decommissioned,asset.status_changed}	\N	\N	11	t	t	2026-03-17 08:24:23.814471+08	2026-03-17 08:24:23.814471+08
remediation	Remediation	المعالجة	core_grc	t	{identified,planned,in_progress,verification_pending,verified,verification_failed,closed}	identified	{closed}	\N	{}	{incident_to_remediation,audit_to_control_update}	{}	\N	\N	remediation	{remediation_owner,compliance_analyst}	168	full	{remediation.created,remediation.completed,remediation.status_changed}	\N	\N	12	t	t	2026-03-17 08:24:23.814471+08	2026-03-17 08:24:23.814471+08
\.


ALTER TABLE __TENANT_SCHEMA__.module_workflow_registry ENABLE TRIGGER ALL;

--
-- Data for Name: module_automation_config; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.module_automation_config DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.module_automation_config (id, module_code, rule_code, rule_name_en, trigger_event, action_type, action_config, conditions, enabled, created_at) FROM stdin;
1	evidence	auto_collect_on_control_change	Auto-collect evidence on control update	compliance.status_changed	create_task	{"taskType": "evidence_request", "dueInHours": 168, "assigneeRole": "evidence_owner"}	{}	t	2026-03-17 08:24:23.814471+08
2	evidence	auto_lock_verified	Auto-lock verified evidence	evidence.status_changed	transition_entity	{"toStatus": "locked", "conditions": {"toStatus": "verified"}, "fromStatus": "verified"}	{}	t	2026-03-17 08:24:23.814471+08
3	incident	auto_escalate_critical	Auto-escalate critical incidents	incident.created	start_chain	{"chainCode": "incident_to_remediation", "conditions": {"severity": "critical"}}	{}	t	2026-03-17 08:24:23.814471+08
4	remediation	auto_close_verified	Auto-close verified remediation	remediation.status_changed	transition_entity	{"toStatus": "closed", "conditions": {"toStatus": "verified"}, "fromStatus": "verified"}	{}	t	2026-03-17 08:24:23.814471+08
5	action	auto_complete_parent_resolved	Auto-complete on parent resolution	remediation.status_changed	auto_close	{"conditions": {"toStatus": "closed"}}	{}	t	2026-03-17 08:24:23.814471+08
6	risk	schedule_quarterly_review	Schedule quarterly risk review	risk.status_changed	schedule_review	{"conditions": {"toStatus": "monitoring"}, "assigneeRole": "risk_reviewer", "intervalDays": 90}	{}	t	2026-03-17 08:24:23.814471+08
7	policy	auto_notify_expiry	Auto-notify 30 days before policy expiry	policy.status_changed	send_notification	{"conditions": {"toStatus": "active"}, "daysBeforeExpiry": 30}	{}	t	2026-03-17 08:24:23.814471+08
8	compliance	auto_reassess_framework	Auto-reassess on framework update	framework.updated	create_task	{"taskType": "control_review", "dueInHours": 336, "assigneeRole": "compliance_analyst"}	{}	t	2026-03-17 08:24:23.814471+08
\.


ALTER TABLE __TENANT_SCHEMA__.module_automation_config ENABLE TRIGGER ALL;

--
-- Data for Name: module_contact_points; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.module_contact_points DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.module_contact_points (contact_id, module_code, owner_user_id, owner_team_id, owner_role, backup_user_id, backup_team_id, escalation_role_id, escalation_team_id, notification_email, onboarding_question_code, is_active, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.module_contact_points ENABLE TRIGGER ALL;

--
-- Data for Name: module_dependency_graph; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.module_dependency_graph DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.module_dependency_graph (id, source_module, target_module, dependency_type, via_event, via_chain, is_active) FROM stdin;
1	risk	compliance	triggers	risk.treatment_updated	risk_to_compliance_score	t
2	compliance	evidence	triggers	control.implemented	risk_to_compliance_score	t
3	evidence	compliance	validates	evidence.uploaded	risk_to_compliance_score	t
4	incident	governance	triggers	incident.escalated	incident_to_remediation	t
5	governance	remediation	triggers	\N	incident_to_remediation	t
6	remediation	action	feeds_into	remediation.completed	incident_to_remediation	t
7	audit	remediation	triggers	audit.finding.issued	audit_to_control_update	t
8	remediation	evidence	triggers	remediation.completed	audit_to_control_update	t
10	policy	compliance	triggers	policy.published	policy_to_compliance_impact	t
11	policy	exception	feeds_into	policy.published	policy_to_compliance_impact	t
12	vendor	risk	triggers	vendor.dd_completed	vendor_to_bcp_impact	t
13	risk	bcp	feeds_into	risk.exceeded_appetite	vendor_to_bcp_impact	t
14	risk	incident	feeds_into	risk.exceeded_appetite	\N	t
15	incident	risk	feeds_into	incident.created	\N	t
16	compliance	risk	feeds_into	compliance.gap_detected	\N	t
17	audit	compliance	validates	audit.completed	\N	t
18	evidence	audit	validates	evidence.uploaded	\N	t
19	policy	governance	requires	\N	\N	t
20	exception	policy	requires	\N	\N	t
21	asset	risk	feeds_into	asset.classified	\N	t
22	bcp	vendor	requires	\N	\N	t
\.


ALTER TABLE __TENANT_SCHEMA__.module_dependency_graph ENABLE TRIGGER ALL;

--
-- Data for Name: module_kickstart_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.module_kickstart_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.module_kickstart_log (log_id, module_code, status, kicked_at, kicked_by, artifacts_created, errors, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.module_kickstart_log ENABLE TRIGGER ALL;

--
-- Data for Name: module_lifecycle_definitions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.module_lifecycle_definitions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.module_lifecycle_definitions (id, module_code, statuses, initial_status, terminal_statuses, created_at, updated_at) FROM stdin;
1	risk	{draft,submitted,under_review,assessed,treatment_planned,approved,active,monitoring,closed,retired,returned}	draft	{closed,retired}	2026-03-17 08:24:23.698254+08	2026-03-17 08:24:23.698254+08
2	compliance	{draft,designed,implemented,test_planned,testing,tested,review,approved,effective,monitoring,deficiency_found,retired}	draft	{retired}	2026-03-17 08:24:23.698254+08	2026-03-17 08:24:23.698254+08
3	policy	{draft,submitted,under_review,revision_requested,resubmitted,approved,published,active,review_due,under_revision,retired}	draft	{retired}	2026-03-17 08:24:23.698254+08	2026-03-17 08:24:23.698254+08
4	evidence	{requested,collecting,uploaded,under_review,verified,locked,released,archived,rejected_quality}	requested	{archived}	2026-03-17 08:24:23.698254+08	2026-03-17 08:24:23.698254+08
5	audit	{planned,scoped,fieldwork,draft_report,management_response,final_report,approved,issued,finding_tracking,closed}	planned	{closed}	2026-03-17 08:24:23.698254+08	2026-03-17 08:24:23.698254+08
6	incident	{reported,triaged,investigating,contained,eradicated,recovered,under_review,approved_closure,closed,lessons_learned,escalated}	reported	{closed,lessons_learned}	2026-03-17 08:24:23.698254+08	2026-03-17 08:24:23.698254+08
7	exception	{draft,submitted,risk_assessed,under_review,approved,rejected,active,monitoring,expiring,expired,renewed,closed}	draft	{closed,rejected,expired}	2026-03-17 08:24:23.698254+08	2026-03-17 08:24:23.698254+08
8	governance	{draft,proposed,committee_review,approved,active,annual_review,under_revision,re_approved,dissolved}	draft	{dissolved}	2026-03-17 08:24:23.698254+08	2026-03-17 08:24:23.698254+08
9	vendor	{identified,questionnaire_sent,questionnaire_received,assessing,assessed,approved,rejected,onboarded,active,annual_review,re_assessed,offboarding,offboarded}	identified	{offboarded,rejected}	2026-03-17 08:24:23.698254+08	2026-03-17 08:24:23.698254+08
10	bcp	{draft,planned,tested,evaluated,approved,active,exercised,review_due,under_revision,re_approved,retired}	draft	{retired}	2026-03-17 08:24:23.698254+08	2026-03-17 08:24:23.698254+08
11	asset	{draft,registered,classified,under_review,approved,active,review_due,under_reclassification,re_approved,decommissioned}	draft	{decommissioned}	2026-03-17 08:24:23.698254+08	2026-03-17 08:24:23.698254+08
12	remediation	{identified,planned,in_progress,verification_pending,verified,verification_failed,closed}	identified	{closed}	2026-03-17 08:24:23.698254+08	2026-03-17 08:24:23.698254+08
13	action	{open,in_progress,completed,verified,closed,overdue,escalated}	open	{closed}	2026-03-17 08:24:23.698254+08	2026-03-17 08:24:23.698254+08
14	training	{draft,scheduled,active,paused,completed,cancelled,archived}	draft	{completed,cancelled,archived}	2026-03-17 08:24:23.900331+08	2026-03-17 08:24:23.900331+08
\.


ALTER TABLE __TENANT_SCHEMA__.module_lifecycle_definitions ENABLE TRIGGER ALL;

--
-- Data for Name: module_lifecycle_transitions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.module_lifecycle_transitions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.module_lifecycle_transitions (id, module_code, from_status, to_status, required_functional_roles, required_permission_code, authority_gate, authority_severity_map, sod_check, ownership_assignment, sla_hours, description_en, description_ar) FROM stdin;
1	risk	draft	submitted	{risk_creator,risk_owner}	risk.record.submit	submit	\N	f	{"field": "owner_user_id", "source": "actor"}	\N	Submit risk for review	\N
2	risk	submitted	under_review	{risk_reviewer}	risk.record.review	review	\N	f	{"field": "reviewer_user_id", "source": "actor"}	48	Begin risk review	\N
3	risk	under_review	returned	{risk_reviewer}	risk.record.review	review	\N	f	\N	\N	Return risk to draft for rework	\N
4	risk	under_review	assessed	{risk_reviewer}	risk.record.review	review	\N	f	\N	24	Complete risk assessment	\N
5	risk	assessed	treatment_planned	{treatment_owner}	risk.treatment.assign	submit	\N	f	\N	72	Assign risk treatment plan	\N
6	risk	treatment_planned	approved	{risk_approver}	risk.record.approve	\N	{"low": "approve_low", "high": "approve_high", "medium": "approve_medium", "critical": "approve_high"}	t	{"field": "approver_user_id", "source": "actor"}	48	Approve risk treatment	\N
7	risk	approved	active	{risk_owner}	risk.record.update	\N	\N	f	\N	\N	Activate risk monitoring	\N
8	risk	active	monitoring	{risk_owner}	risk.record.update	\N	\N	f	\N	\N	Begin continuous monitoring	\N
9	risk	monitoring	closed	{risk_approver}	risk.record.close	approve_low	\N	t	\N	\N	Close risk	\N
10	risk	closed	active	{risk_owner}	risk.record.update	\N	\N	f	\N	\N	Reopen closed risk	\N
11	risk	returned	submitted	{risk_creator,risk_owner}	risk.record.submit	submit	\N	f	\N	\N	Resubmit after rework	\N
12	compliance	draft	designed	{control_owner}	compliance.control.update	submit	\N	f	{"field": "owner_user_id", "source": "actor"}	\N	Design control	\N
13	compliance	designed	implemented	{control_owner}	compliance.control.update	\N	\N	f	\N	72	Implement control	\N
14	compliance	implemented	test_planned	{control_tester,compliance_manager}	compliance.test.execute	\N	\N	t	\N	24	Plan control test	\N
15	compliance	test_planned	testing	{control_tester}	compliance.test.execute	\N	\N	f	{"field": "reviewer_user_id", "source": "actor"}	\N	Execute control test	\N
16	compliance	testing	tested	{control_tester}	compliance.test.execute	review	\N	f	\N	48	Complete testing	\N
17	compliance	tested	review	{compliance_analyst}	compliance.score.review	review	\N	f	\N	24	Review compliance score	\N
18	compliance	review	approved	{compliance_manager}	compliance.score.approve	approve_low	\N	f	{"field": "approver_user_id", "source": "actor"}	24	Approve compliance	\N
19	compliance	approved	effective	{compliance_manager}	compliance.control.update	\N	\N	f	\N	\N	Mark control effective	\N
20	compliance	effective	monitoring	{control_owner}	compliance.control.update	\N	\N	f	\N	\N	Begin monitoring	\N
21	compliance	monitoring	deficiency_found	{control_tester,compliance_analyst}	compliance.test.execute	\N	\N	f	\N	\N	Report deficiency	\N
22	compliance	deficiency_found	test_planned	{control_owner}	compliance.control.update	\N	\N	f	\N	24	Replan after deficiency	\N
23	policy	draft	submitted	{policy_author}	policy.document.update	submit	\N	f	{"field": "author_user_id", "source": "actor"}	\N	Submit policy for review	\N
24	policy	submitted	under_review	{policy_reviewer}	policy.document.review	review	\N	f	{"field": "reviewer_user_id", "source": "actor"}	48	Begin policy review	\N
25	policy	under_review	revision_requested	{policy_reviewer}	policy.document.review	review	\N	f	\N	\N	Request revision	\N
26	policy	under_review	approved	{policy_approver}	policy.document.approve	\N	{"org_wide": "approve_medium", "standard": "approve_low", "regulatory": "approve_high"}	t	{"field": "approver_user_id", "source": "actor"}	48	Approve policy	\N
27	policy	revision_requested	resubmitted	{policy_author}	policy.document.update	submit	\N	f	\N	\N	Resubmit revised policy	\N
28	policy	resubmitted	under_review	{policy_reviewer}	policy.document.review	review	\N	f	\N	48	Re-review revised policy	\N
29	policy	approved	published	{document_controller}	policy.document.publish	\N	\N	f	\N	24	Publish policy	\N
30	policy	published	active	{document_controller}	policy.document.publish	\N	\N	f	\N	\N	Activate policy	\N
31	policy	active	review_due	{policy_author,document_controller}	policy.document.update	\N	\N	f	\N	\N	Flag for periodic review	\N
32	policy	review_due	under_revision	{policy_author}	policy.document.update	\N	\N	f	\N	\N	Begin revision	\N
33	policy	active	retired	{document_controller}	policy.document.retire	approve_low	\N	f	\N	\N	Retire policy	\N
34	evidence	requested	collecting	{evidence_owner}	evidence.item.upload	\N	\N	f	{"field": "owner_user_id", "source": "actor"}	72	Begin evidence collection	\N
35	evidence	collecting	uploaded	{evidence_owner}	evidence.item.upload	submit	\N	f	\N	\N	Upload evidence	\N
36	evidence	uploaded	under_review	{evidence_reviewer}	evidence.item.verify	review	\N	t	{"field": "reviewer_user_id", "source": "actor"}	48	Review evidence	\N
37	evidence	under_review	rejected_quality	{evidence_reviewer}	evidence.item.verify	review	\N	f	\N	\N	Reject evidence quality	\N
38	evidence	under_review	verified	{evidence_reviewer}	evidence.item.verify	approve_low	\N	f	\N	\N	Verify evidence	\N
39	evidence	rejected_quality	collecting	{evidence_owner}	evidence.item.upload	\N	\N	f	\N	24	Re-collect after rejection	\N
40	evidence	verified	locked	{custodian}	evidence.item.lock	\N	\N	f	{"field": "custodian_user_id", "source": "actor"}	\N	Lock evidence	\N
41	evidence	locked	released	{custodian}	evidence.item.release	\N	\N	f	\N	\N	Release evidence	\N
42	evidence	released	archived	{custodian}	evidence.item.archive	approve_low	\N	f	\N	\N	Archive evidence	\N
43	audit	planned	scoped	{audit_manager}	audit.engagement.create	\N	\N	f	\N	72	Scope audit engagement	\N
44	audit	scoped	fieldwork	{auditor}	audit.workpaper.update	\N	\N	f	{"field": "auditor_user_id", "source": "actor"}	\N	Begin fieldwork	\N
45	audit	fieldwork	draft_report	{auditor}	audit.report.create	submit	\N	f	\N	120	Draft audit report	\N
46	audit	draft_report	management_response	{auditee_owner}	audit.finding.respond	\N	\N	t	{"field": "auditee_owner_user_id", "source": "actor"}	72	Management response to findings	\N
47	audit	management_response	final_report	{auditor}	audit.report.create	review	\N	f	\N	48	Finalize audit report	\N
48	audit	final_report	approved	{audit_manager}	audit.report.approve	approve_medium	\N	f	{"field": "approver_user_id", "source": "actor"}	24	Approve audit report	\N
49	audit	approved	issued	{audit_manager}	audit.report.approve	\N	\N	f	\N	\N	Issue audit report	\N
50	audit	issued	finding_tracking	{auditor}	audit.finding.issue	\N	\N	f	\N	\N	Track audit findings	\N
51	audit	finding_tracking	closed	{audit_manager}	audit.finding.close	approve_low	\N	f	\N	\N	Close audit engagement	\N
52	incident	reported	triaged	{incident_owner}	incident.record.update	\N	\N	f	{"field": "owner_user_id", "source": "actor"}	4	Triage incident	\N
53	incident	triaged	investigating	{incident_owner}	incident.record.update	\N	\N	f	\N	24	Begin investigation	\N
54	incident	investigating	contained	{incident_owner}	incident.record.update	\N	\N	f	\N	\N	Contain incident	\N
55	incident	contained	escalated	{incident_owner}	incident.record.escalate	escalate	\N	f	\N	\N	Escalate incident	\N
56	incident	contained	eradicated	{incident_owner}	incident.record.update	\N	\N	f	\N	48	Eradicate root cause	\N
57	incident	eradicated	recovered	{incident_owner}	incident.record.update	\N	\N	f	\N	24	Recovery complete	\N
58	incident	recovered	under_review	{incident_reviewer}	incident.record.review	review	\N	f	{"field": "reviewer_user_id", "source": "actor"}	48	Post-incident review	\N
59	incident	under_review	approved_closure	{incident_approver}	incident.record.approve	\N	{"low": "approve_low", "high": "approve_high", "medium": "approve_medium", "critical": "approve_high"}	t	{"field": "approver_user_id", "source": "actor"}	24	Approve incident closure	\N
60	incident	approved_closure	closed	{incident_approver}	incident.record.approve	\N	\N	f	\N	\N	Close incident	\N
61	incident	closed	lessons_learned	{incident_reviewer}	incident.record.review	\N	\N	f	\N	\N	Conduct lessons learned	\N
62	exception	draft	submitted	{exception_requester}	exception.request.create	submit	\N	f	\N	\N	Submit exception request	\N
63	exception	submitted	risk_assessed	{exception_owner}	exception.request.review	review	\N	f	{"field": "owner_user_id", "source": "actor"}	48	Assess exception risk	\N
64	exception	risk_assessed	under_review	{exception_owner}	exception.request.review	review	\N	f	\N	24	Route for approval	\N
65	exception	under_review	approved	{exception_approver}	exception.request.approve	\N	{"low": "approve_low", "high": "approve_high", "medium": "approve_medium"}	t	{"field": "approver_user_id", "source": "actor"}	48	Approve exception	\N
66	exception	under_review	rejected	{exception_approver}	exception.request.approve	approve_low	\N	f	\N	\N	Reject exception	\N
67	exception	approved	active	{exception_owner}	exception.request.review	\N	\N	f	\N	\N	Activate exception	\N
68	exception	active	monitoring	{exception_owner}	exception.request.review	\N	\N	f	\N	\N	Monitor exception	\N
69	exception	monitoring	expired	{exception_owner}	exception.request.review	\N	\N	f	\N	\N	Exception expired	\N
70	exception	expired	renewed	{exception_requester}	exception.request.create	submit	\N	f	\N	\N	Renew exception	\N
71	exception	expired	closed	{exception_owner}	exception.request.review	\N	\N	f	\N	\N	Close expired exception	\N
72	governance	draft	proposed	{governance_manager,charter_owner}	governance.charter.update	submit	\N	f	\N	\N	Propose governance body	\N
73	governance	proposed	committee_review	{committee_secretary}	governance.meeting.manage	review	\N	f	\N	72	Schedule committee review	\N
74	governance	committee_review	approved	{executive_reviewer}	governance.body.create	approve_high	\N	f	{"field": "approver_user_id", "source": "actor"}	48	Approve governance body	\N
75	governance	approved	active	{governance_manager}	governance.charter.update	\N	\N	f	\N	\N	Activate governance body	\N
76	governance	active	annual_review	{governance_manager,charter_owner}	governance.charter.update	\N	\N	f	\N	\N	Trigger annual review	\N
77	governance	annual_review	under_revision	{charter_owner}	governance.charter.update	\N	\N	f	\N	\N	Begin charter revision	\N
78	governance	under_revision	re_approved	{executive_reviewer}	governance.body.create	approve_high	\N	f	\N	48	Re-approve revised charter	\N
79	governance	re_approved	active	{governance_manager}	governance.charter.update	\N	\N	f	\N	\N	Reactivate governance body	\N
80	governance	active	dissolved	{executive_reviewer}	governance.body.create	override	\N	f	\N	\N	Dissolve governance body	\N
81	vendor	identified	questionnaire_sent	{vendor_owner}	vendor.record.create	\N	\N	f	{"field": "owner_user_id", "source": "actor"}	24	Send vendor questionnaire	\N
82	vendor	questionnaire_sent	questionnaire_received	{vendor_owner}	vendor.record.create	\N	\N	f	\N	\N	Receive questionnaire	\N
83	vendor	questionnaire_received	assessing	{vendor_assessor}	vendor.assessment.execute	\N	\N	t	\N	72	Begin vendor assessment	\N
84	vendor	assessing	assessed	{vendor_assessor}	vendor.assessment.execute	review	\N	f	\N	48	Complete assessment	\N
85	vendor	assessed	approved	{vendor_assessor}	vendor.assessment.approve	\N	{"low": "approve_low", "medium": "approve_medium", "critical": "approve_high"}	f	{"field": "approver_user_id", "source": "actor"}	24	Approve vendor	\N
86	vendor	assessed	rejected	{vendor_assessor}	vendor.assessment.approve	approve_low	\N	f	\N	\N	Reject vendor	\N
87	vendor	approved	onboarded	{vendor_owner}	vendor.record.create	\N	\N	f	\N	\N	Onboard vendor	\N
88	vendor	onboarded	active	{vendor_owner}	vendor.record.create	\N	\N	f	\N	\N	Activate vendor	\N
89	vendor	active	annual_review	{vendor_assessor}	vendor.assessment.execute	\N	\N	f	\N	\N	Trigger annual review	\N
90	vendor	annual_review	re_assessed	{vendor_assessor}	vendor.assessment.execute	review	\N	f	\N	72	Re-assess vendor	\N
91	vendor	active	offboarding	{vendor_owner}	vendor.record.create	\N	\N	f	\N	\N	Begin offboarding	\N
92	vendor	offboarding	offboarded	{vendor_owner}	vendor.record.create	approve_low	\N	f	\N	\N	Complete offboarding	\N
93	bcp	draft	planned	{bcp_coordinator}	bcp.plan.update	submit	\N	f	{"field": "owner_user_id", "source": "actor"}	\N	Plan BCP	\N
94	bcp	planned	tested	{process_owner}	bcp.plan.update	\N	\N	f	\N	120	Test BCP plan	\N
95	bcp	tested	evaluated	{bcp_coordinator}	bcp.exercise.approve	review	\N	f	\N	48	Evaluate test results	\N
96	bcp	evaluated	approved	{bcp_coordinator}	bcp.exercise.approve	approve_medium	\N	f	{"field": "approver_user_id", "source": "actor"}	24	Approve BCP plan	\N
97	bcp	approved	active	{bcp_coordinator}	bcp.plan.update	\N	\N	f	\N	\N	Activate BCP plan	\N
98	bcp	active	exercised	{process_owner}	bcp.plan.update	\N	\N	f	\N	\N	Exercise BCP plan	\N
99	bcp	exercised	review_due	{bcp_coordinator}	bcp.plan.update	\N	\N	f	\N	\N	Schedule review	\N
100	bcp	review_due	under_revision	{bcp_coordinator}	bcp.plan.update	\N	\N	f	\N	\N	Begin BCP revision	\N
101	bcp	under_revision	re_approved	{bcp_coordinator}	bcp.exercise.approve	approve_medium	\N	f	\N	48	Re-approve BCP	\N
102	bcp	re_approved	active	{bcp_coordinator}	bcp.plan.update	\N	\N	f	\N	\N	Reactivate BCP	\N
103	bcp	active	retired	{bcp_coordinator}	bcp.plan.update	approve_low	\N	f	\N	\N	Retire BCP plan	\N
104	asset	draft	registered	{asset_owner}	asset.record.update	submit	\N	f	{"field": "owner_user_id", "source": "actor"}	\N	Register asset	\N
105	asset	registered	classified	{asset_custodian}	asset.record.update	\N	\N	f	{"field": "custodian_user_id", "source": "actor"}	48	Classify asset	\N
106	asset	classified	under_review	{asset_custodian}	asset.classification.review	review	\N	f	\N	24	Review classification	\N
107	asset	under_review	approved	{asset_owner}	asset.classification.review	approve_low	\N	f	\N	24	Approve classification	\N
108	asset	approved	active	{asset_owner}	asset.record.update	\N	\N	f	\N	\N	Activate asset	\N
109	asset	active	review_due	{asset_custodian}	asset.record.update	\N	\N	f	\N	\N	Schedule review	\N
110	asset	review_due	under_reclassification	{asset_custodian}	asset.record.update	\N	\N	f	\N	\N	Begin reclassification	\N
111	asset	under_reclassification	re_approved	{asset_owner}	asset.classification.review	approve_low	\N	f	\N	24	Re-approve classification	\N
112	asset	re_approved	active	{asset_owner}	asset.record.update	\N	\N	f	\N	\N	Reactivate asset	\N
113	asset	active	decommissioned	{asset_owner}	asset.record.update	approve_low	\N	f	\N	\N	Decommission asset	\N
114	remediation	identified	planned	{remediation_owner}	remediation.task.update	submit	\N	f	{"field": "owner_user_id", "source": "actor"}	48	Plan remediation	\N
115	remediation	planned	in_progress	{remediation_owner}	remediation.task.update	\N	\N	f	\N	\N	Begin remediation work	\N
116	remediation	in_progress	verification_pending	{remediation_owner}	remediation.task.update	submit	\N	f	\N	\N	Submit for verification	\N
117	remediation	verification_pending	verified	{remediation_reviewer}	remediation.task.read	review	\N	f	{"field": "reviewer_user_id", "source": "actor"}	48	Verify remediation	\N
118	remediation	verification_pending	verification_failed	{remediation_reviewer}	remediation.task.read	review	\N	f	\N	\N	Fail verification	\N
119	remediation	verification_failed	in_progress	{remediation_owner}	remediation.task.update	\N	\N	f	\N	24	Rework after failed verification	\N
120	remediation	verified	closed	{remediation_reviewer}	remediation.task.close	approve_low	\N	f	\N	\N	Close remediation	\N
121	action	open	in_progress	{action_owner}	action.item.update	\N	\N	f	{"field": "owner_user_id", "source": "actor"}	\N	Start action item	\N
122	action	in_progress	completed	{action_owner}	action.item.update	submit	\N	f	\N	\N	Complete action item	\N
123	action	completed	verified	{action_owner}	action.item.close	review	\N	f	\N	48	Verify completion	\N
124	action	verified	closed	{action_owner}	action.item.close	approve_low	\N	f	\N	\N	Close action item	\N
125	action	in_progress	overdue	{action_owner}	action.item.update	\N	\N	f	\N	\N	Mark overdue	\N
126	action	overdue	escalated	{action_owner}	action.item.update	escalate	\N	f	\N	\N	Escalate overdue item	\N
127	action	escalated	in_progress	{action_owner}	action.item.update	\N	\N	f	\N	\N	Resume after escalation	\N
128	training	draft	scheduled	{training_manager,campaign_owner}	training.program.manage	\N	\N	f	\N	\N	Schedule campaign for launch	\N
129	training	scheduled	active	{training_manager,campaign_owner}	training.program.manage	\N	\N	f	\N	\N	Launch campaign	\N
130	training	active	paused	{training_manager,campaign_owner}	training.program.manage	\N	\N	f	\N	\N	Pause active campaign	\N
131	training	paused	active	{training_manager,campaign_owner}	training.program.manage	\N	\N	f	\N	\N	Resume paused campaign	\N
132	training	active	completed	{training_manager,campaign_owner}	training.program.manage	\N	\N	f	\N	\N	Mark campaign as completed	\N
133	training	draft	cancelled	{training_manager,campaign_owner}	training.program.manage	\N	\N	f	\N	\N	Cancel draft campaign	\N
134	training	scheduled	cancelled	{training_manager,campaign_owner}	training.program.manage	\N	\N	f	\N	\N	Cancel scheduled campaign	\N
135	training	completed	archived	{training_manager,admin}	training.program.manage	\N	\N	f	\N	\N	Archive completed campaign	\N
\.


ALTER TABLE __TENANT_SCHEMA__.module_lifecycle_transitions ENABLE TRIGGER ALL;

--
-- Data for Name: modules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.modules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.modules (id, module_id, module_code, name, display_name_en, display_name_ar, category, description, enabled, status, customer_visible, nav_enabled, readiness_level, route_base, primary_table, lifecycle_table, lifecycle_id_column, assigned_agent_id, entitlement_key, support_level, sort_order, created_by, created_at, updated_at, deleted_at) FROM stdin;
1	4c764846-5885-4701-8a07-2b3b343c926d	governance	Governance	Governance	الحوكمة	core	Governance framework, bodies, charters, mandates	t	active	t	t	complete	/governance	governance_bodies	governance_bodies	body_id	A08	grc	full	10	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
2	830deb44-a5b6-429f-8960-be8262c4cf3c	risk	Risk Management	Risk Management	إدارة المخاطر	core	Risk register, assessments, treatments, KRIs	t	active	t	t	complete	/risks	risks	risks	risk_id	A07	grc	full	20	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
3	0f0488b0-d5e7-45bb-887b-03b48541e9d7	compliance	Compliance	Compliance	الامتثال	core	Control management, framework mapping, UCF	t	active	t	t	complete	/compliance	controls	controls	control_id	A04	grc	full	30	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
4	3d5cf25a-aecc-48fe-8249-5fd617659cc0	policy	Policy	Policy	السياسات	core	Policy lifecycle, procedures, attestation	t	active	t	t	complete	/policies	policies	policies	policy_id	A08	grc	full	40	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
5	f50cc28a-d2af-48e4-95d7-f633c32a0ce9	audit	Audit	Audit	التدقيق	core	Audit engagements, findings, working papers, CAPA, schedules, team, risk planning	t	active	t	t	complete	/audit	audit_engagements	audit_engagements	engagement_id	A10	grc	full	50	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
6	4df6a9fe-0022-4651-b671-b344c684584d	evidence	Evidence	Evidence	الأدلة	core	Evidence collection, catalog, chain-of-custody	t	active	t	t	complete	/evidence	evidence	evidence	evidence_id	A05	grc	full	60	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
7	a1d911a6-9139-48bf-b844-7760134f504c	incident	Incident	Incident	الحوادث	core	Incident management and response	t	active	t	t	complete	/incidents	incidents	incidents	incident_id	\N	grc	full	70	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
8	797a9b55-f37e-4ec3-a17a-624aa79ad5b1	vendor	Vendor	Vendor	الموردين	core	Third-party risk, assessments, portal	t	active	t	t	complete	/vendors	vendors	vendors	vendor_id	A09	grc	full	80	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
9	83bea9cf-2704-4733-b01d-64612c409f6d	bcp	BCP	BCP	استمرارية الأعمال	core	Business continuity planning, BIA, exercises, crisis communications	t	active	t	t	partial	/bcp	bcp_plans	bcp_plans	plan_id	\N	grc	full	90	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
10	7a22b880-1c3c-44d5-8ebc-e3ead47af8be	assessment	Assessment	Assessment	التقييم	supporting	Assessments, templates, NCA/SAMA	t	active	t	t	complete	/assessments	assessments	assessments	assessment_id	A03	grc	full	100	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
11	156d743c-51d0-41e0-943f-1ab7b18073fa	reporting	Reporting	Reporting	التقارير	supporting	Report generation, center, hub	t	active	t	t	partial	/reports	reports	reports	report_id	A10	grc	full	110	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
12	91b96825-3d22-4530-b4c8-ed4d779d647b	workflow	Workflow	Workflow	سير العمل	supporting	Workflow templates, builder, automation	t	active	t	t	complete	/workflows	workflows	workflows	workflow_id	A08	grc	full	120	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
13	6bd040ab-fa00-4484-88c8-f311db0299d2	analytics	Analytics	Analytics	التحليلات	supporting	Dashboard analytics and charts	t	active	t	t	complete	/analytics-dashboard	dashboard_configs				grc	full	130	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
14	83e919bc-4c02-493b-8508-d20a290b3956	ai	AI Hub	AI Hub	مركز الذكاء الاصطناعي	ai	Copilot, AI squad, contextual AI	t	active	t	t	complete	/ai-hub	copilot_sessions			A04	grc	full	140	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
15	0a6705c2-ff9a-42a1-9bf9-820c191d93d4	ai-governance	AI Governance	AI Governance	حوكمة الذكاء الاصطناعي	ai	Model, prompt, agent registry and governance	t	active	t	t	partial	/ai-governance	ai_asset_inventory				ai	full	150	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
16	05588237-e618-4bbd-bfea-16c422f38354	integrations	Integrations	Integrations	التكاملات	platform	Connector management and health	t	active	t	t	complete	/integrations	integration_configs			A01	grc	full	160	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
17	b14dc62b-fce1-49e4-905f-1268bd1ad5f7	foundation	Foundation	Foundation	الأساسيات	platform	Organization structure, business units, departments, locations, teams, users, roles	t	active	t	t	complete	/foundation	organizations			A02	grc	full	5	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
18	96e2c0b8-3130-4ed0-a2ae-4a1b975c0978	workspace	Workspace	Workspace	بيئة العمل	platform	Workspace management, teams, roles	t	active	t	t	complete	/workspace-home	workspaces			A02	grc	full	170	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
19	5ece8f28-cebb-488b-b7a0-0edf9b3d584a	maturity	Maturity	Maturity	النضج	supporting	Maturity assessment and scoring	t	active	t	t	complete	/maturity	maturity_scores				grc	full	180	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
20	57471700-3ebf-410e-83a6-9cc0fe6ef233	remediation	Remediation	Remediation	المعالجة	supporting	Remediation task CRUD with priority, assignment, overdue tracking	t	active	t	t	partial	/remediation	remediation_tasks	remediation_tasks	task_id	\N	grc	full	190	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
21	c9507d2b-d567-4ccd-af37-88c83667fe2a	action	Action Items	Action Items	بنود العمل	supporting	Action item tracking	t	active	f	f	partial	/action-items	action_items	action_items	item_id	\N	grc	internal	200	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
22	af6820a9-bdd7-4f30-af2b-9e02ef65fb2e	training	Training	Training	التدريب	supporting	Training & awareness campaigns, assignments, certifications, phishing simulations	t	active	t	t	partial	/training	training_campaigns	training_campaigns	campaign_id		grc	full	210	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
23	d52832ea-2472-43a0-acec-2c2f9b8348a6	knowledge	Knowledge	Knowledge	المعرفة	supporting	Knowledge base, entity graph, KSA hub	t	active	t	t	partial	/knowledge-hub	knowledge_articles			A03	grc	full	220	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
24	17238264-82b2-4997-bf95-9aefa131d37a	messaging	Messaging	Messaging	المراسلة	platform	Internal messaging	t	active	t	t	complete	/messaging	messages				grc	full	230	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
25	2934f5b9-eb30-482f-8d77-4b26437b4b22	exception	Exception	Exception	الاستثناءات	supporting	Exception governance	t	active	f	f	partial	/exceptions	exceptions	exceptions	exception_id	\N	grc	full	240	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
26	380b9382-a36a-4a93-b43d-a3eee9150813	asset	Asset	Asset	الأصول	supporting	Asset inventory	t	active	f	f	partial	/assets	assets	assets	asset_id	\N	grc	internal	250	system	2026-03-17 08:24:21.136115+08	2026-03-17 08:24:21.136115+08	\N
\.


ALTER TABLE __TENANT_SCHEMA__.modules ENABLE TRIGGER ALL;

--
-- Data for Name: navigation_overrides; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.navigation_overrides DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.navigation_overrides (override_id, nav_key, applies_to_role, label_en, label_ar, route, icon, module_code, sort_order, enabled, is_active, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.navigation_overrides ENABLE TRIGGER ALL;

--
-- Data for Name: navigation_registry; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.navigation_registry DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.navigation_registry (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code, item_type, sort_order, is_system, is_active, created_at, updated_at, metadata, audience) FROM stdin;
foundation-teams	foundation	Teams	الفِرَق	/foundation/teams	users	foundation	link	107	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
reports-overview	reports	Reports Overview	نظرة عامة للتقارير	/reports/overview	\N	reports	link	700	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
reports-builder	reports	Report Builder	منشئ التقارير	/reports/builder	\N	reports	link	708	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
vendor	\N	Vendor Risk	مخاطر الموردين	\N	truck	vendor	group	750	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
incidents	\N	Incidents	الحوادث	\N	alert-triangle	incident	group	650	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
incidents-overview	incidents	Overview	نظرة عامة	/incidents/overview	\N	incident	link	651	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
incidents-register	incidents	Register	السجل	/incidents/register	\N	incident	link	652	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
vendor-overview	vendor	Overview	نظرة عامة	/vendor-risk/overview	\N	vendor	link	751	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
vendor-register	vendor	Vendor Register	سجل الموردين	/vendor-risk/register	\N	vendor	link	752	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
vendor-assessments	vendor	Risk Assessments	تقييمات المخاطر	/vendor-risk/assessments	\N	vendor	link	753	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
vendor-due-diligence	vendor	Due Diligence	العناية الواجبة	/vendor-risk/due-diligence	\N	vendor	link	754	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
vendor-sla	vendor	SLA Monitoring	مراقبة الاتفاقيات	/vendor-risk/sla	\N	vendor	link	755	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
vendor-fourth-party	vendor	Fourth-Party Risk	مخاطر الطرف الرابع	/vendor-risk/fourth-party	\N	vendor	link	756	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
vendor-concentration	vendor	Concentration Risk	مخاطر التركز	/vendor-risk/concentration	\N	vendor	link	757	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
vendor-offboarding	vendor	Offboarding	إنهاء التعاقد	/vendor-risk/offboarding	\N	vendor	link	758	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
vendor-monitoring	vendor	Continuous Monitoring	المراقبة المستمرة	/vendor-risk/monitoring	\N	vendor	link	759	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
bcp-nav	\N	BCP	استمرارية الأعمال	\N	shield	bcp	group	800	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
bcp-overview	bcp-nav	Overview	نظرة عامة	/bcp/overview	\N	bcp	link	801	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
bcp-plans	bcp-nav	Plans	الخطط	/bcp/plans	\N	bcp	link	802	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
incidents-investigation	incidents	Investigation	التحقيق	/incidents/investigation	\N	incident	link	653	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
incidents-war-room	incidents	War Room	غرفة العمليات	/incidents/war-room	\N	incident	link	654	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
incidents-near-miss	incidents	Near-Miss	الحوادث الوشيكة	/incidents/near-miss	\N	incident	link	655	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
incidents-pir	incidents	Post-Incident Review	مراجعة ما بعد الحادث	/incidents/pir	\N	incident	link	656	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
bcp-bia	bcp-nav	BIA Wizard	معالج تحليل الأثر	/bcp/bia	\N	bcp	link	803	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
bcp-exercises	bcp-nav	Exercises & DR Tests	التمارين والاختبارات	/bcp/exercises	\N	bcp	link	804	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
bcp-crisis-comm	bcp-nav	Crisis Communication	اتصالات الأزمات	/bcp/crisis-comm	\N	bcp	link	805	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
bcp-recovery	bcp-nav	Recovery Strategies	استراتيجيات التعافي	/bcp/recovery	\N	bcp	link	806	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
bcp-activation	bcp-nav	Plan Activation	تفعيل الخطة	/bcp/activation	\N	bcp	link	807	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
bcp-dependencies	bcp-nav	Dependency Maps	خرائط التبعية	/bcp/dependencies	\N	bcp	link	808	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
bcp-maturity	bcp-nav	Maturity Assessment	تقييم النضج	/bcp/maturity	\N	bcp	link	809	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
ai-governance	ai	AI Governance	حوكمة الذكاء	/ai-governance/assets	\N	ai-governance	link	902	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
knowledge	\N	Knowledge	المعرفة	/knowledge-hub	book-open	knowledge	link	850	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
training-nav	\N	Training	التدريب	\N	graduation-cap	training	group	860	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
training-overview	training-nav	Overview	نظرة عامة	/training/overview	\N	training	link	861	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
home	\N	Home	الرئيسية	/workspace-home	home	\N	link	10	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
foundation	\N	Foundation	الأساسيات	\N	database	\N	group	100	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
foundation-overview	foundation	Overview	نظرة عامة	/foundation/overview	home	\N	link	101	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
foundation-organization	foundation	Organization	المنظمة	/foundation/organization	building-2	\N	link	102	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
foundation-business-units	foundation	Business Units	وحدات الأعمال	/foundation/business-units	briefcase	\N	link	103	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
foundation-departments	foundation	Departments	الأقسام	/foundation/departments	layers	\N	link	104	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
foundation-users	foundation	Users	المستخدمون	/foundation/users	users	\N	link	105	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
foundation-roles	foundation	Roles & Permissions	الأدوار والصلاحيات	/foundation/roles	key	\N	link	106	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
foundation-locations	foundation	Locations	المواقع	/foundation/locations	map-pin	\N	link	107	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
evidence-overview	evidence	Overview	نظرة عامة	/evidence/overview	\N	evidence	link	501	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
evidence-requests	evidence	Requests	الطلبات	/evidence/requests	\N	evidence	link	503	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
evidence-reviews	evidence	Reviews	المراجعات	/evidence/reviews	\N	evidence	link	504	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
evidence-expiry	evidence	Expiry & Coverage	الانتهاء والتغطية	/evidence/expiry	\N	evidence	link	505	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
evidence-automated	evidence	Automated Collection	التجميع التلقائي	/evidence/automated-collection	\N	evidence	link	506	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
evidence-mappings	evidence	Mappings	الربط	/evidence/mappings	\N	evidence	link	507	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
incidents-trends	incidents	Trends & Analytics	الاتجاهات والتحليلات	/incidents/trends	\N	incident	link	657	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
incidents-regulatory	incidents	Regulatory Reporting	الإبلاغ التنظيمي	/incidents/regulatory	\N	incident	link	658	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
incidents-taxonomy	incidents	Taxonomy	التصنيف	/incidents/taxonomy	\N	incident	link	659	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
incidents-lessons	incidents	Lessons Learned	الدروس المستفادة	/incidents/lessons	\N	incident	link	660	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
training-campaigns	training-nav	Campaigns	الحملات	/training/campaigns	\N	training	link	862	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
training-assignments	training-nav	Assignments	التكليفات	/training/assignments	\N	training	link	863	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
training-content	training-nav	Content Library	مكتبة المحتوى	/training/content	\N	training	link	864	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
training-certifications	training-nav	Certifications	الشهادات	/training/certifications	\N	training	link	865	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
training-phishing	training-nav	Phishing Simulations	محاكاة التصيد	/training/phishing	\N	training	link	866	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
training-compliance	training-nav	Compliance Tracker	متابعة الامتثال	/training/compliance	\N	training	link	867	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
training-reports	training-nav	Reports	التقارير	/training/reports	\N	training	link	868	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
remediation-nav	\N	Remediation	المعالجة	/remediation	wrench	remediation	link	870	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
asset-nav	\N	Assets	الأصول	/assets	server	asset	link	880	t	f	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:21.23364+08	\N	\N
remediation	\N	Remediation	المعالجة	/remediation	wrench	remediation	link	64	t	f	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:22.279253+08	\N	\N
executive	\N	Executive	التنفيذي	/executive/overview	layout-dashboard	dashboard	link	20	t	f	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.409982+08	\N	\N
controls	\N	Controls	الضوابط	\N	shield-check	controls	group	50	t	f	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.409982+08	\N	\N
controls-library	controls	Control Library	مكتبة الضوابط	/controls/library	\N	controls	link	51	t	f	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.409982+08	\N	\N
controls-testing	controls	Testing	الاختبارات	/controls/testing	\N	controls	link	52	t	f	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.409982+08	\N	\N
controls-exceptions	controls	Exceptions	الاستثناءات	/controls/exceptions	\N	controls	link	53	t	f	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.409982+08	\N	\N
privacy	\N	Privacy	الخصوصية	\N	lock	privacy	group	80	t	f	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.409982+08	\N	\N
governance-mandates	governance	Mandates	التفويضات	/governance/mandates	\N	governance	link	209	t	f	2026-03-17 08:24:23.849535+08	2026-03-17 08:24:23.849535+08	\N	\N
governance-reviews	governance	Reviews	المراجعات	/governance/reviews	\N	governance	link	210	t	f	2026-03-17 08:24:23.849535+08	2026-03-17 08:24:23.849535+08	\N	\N
governance-acknowledgements	governance	Acknowledgements	الإقرارات	/governance/acknowledgements	\N	governance	link	211	t	f	2026-03-17 08:24:23.849535+08	2026-03-17 08:24:23.849535+08	\N	\N
governance-objectives	governance	Objectives	الأهداف	/governance/objectives	\N	governance	link	212	t	f	2026-03-17 08:24:23.849535+08	2026-03-17 08:24:23.849535+08	\N	\N
governance-delegations	governance	Delegations	التفويضات	/governance/delegations	\N	governance	link	213	t	f	2026-03-17 08:24:23.849535+08	2026-03-17 08:24:23.849535+08	\N	\N
governance-responsibilities	governance	Responsibilities	المسؤوليات	/governance/responsibilities	\N	governance	link	214	t	f	2026-03-17 08:24:23.849535+08	2026-03-17 08:24:23.849535+08	\N	\N
governance-raci-templates	governance	RACI Templates	قوالب RACI	/governance/raci-templates	\N	governance	link	215	t	f	2026-03-17 08:24:23.849535+08	2026-03-17 08:24:23.849535+08	\N	\N
governance-obligations	governance	Obligations	الالتزامات	/governance/obligations	\N	governance	link	216	t	f	2026-03-17 08:24:23.849535+08	2026-03-17 08:24:23.849535+08	\N	\N
governance-charters	governance	Charters	المواثيق	/governance/charters	\N	governance	link	217	t	f	2026-03-17 08:24:23.849535+08	2026-03-17 08:24:23.849535+08	\N	\N
governance-health	governance	Health	الصحة	/governance/health	\N	governance	link	218	t	f	2026-03-17 08:24:23.849535+08	2026-03-17 08:24:23.849535+08	\N	\N
governance-structure	governance	Structure	الهيكل	/governance/structure	\N	governance	link	219	t	f	2026-03-17 08:24:23.849535+08	2026-03-17 08:24:23.849535+08	\N	\N
governance-board-packs	governance	Board Packs	حزم المجلس	/governance/board-packs	\N	governance	link	220	t	f	2026-03-17 08:24:23.849535+08	2026-03-17 08:24:23.849535+08	\N	\N
governance-raci	governance	RACI	RACI	/governance/raci	\N	governance	link	221	t	f	2026-03-17 08:24:23.849535+08	2026-03-17 08:24:23.849535+08	\N	\N
governance-executive-summaries	governance	Executive Summaries	الملخصات التنفيذية	/governance/executive-summaries	\N	governance	link	222	t	f	2026-03-17 08:24:23.849535+08	2026-03-17 08:24:23.849535+08	\N	\N
risk-appetite	risk	Appetite	شهية المخاطر	/risk/appetite	\N	risk	link	309	t	f	2026-03-17 08:24:23.855935+08	2026-03-17 08:24:23.855935+08	\N	\N
risk-metrics	risk	Metrics	مقاييس المخاطر	/risk/metrics	\N	risk	link	310	t	f	2026-03-17 08:24:23.855935+08	2026-03-17 08:24:23.855935+08	\N	\N
risk-scenarios	risk	Scenarios	سيناريوهات	/risk/scenarios	\N	risk	link	311	t	f	2026-03-17 08:24:23.855935+08	2026-03-17 08:24:23.855935+08	\N	\N
risk-bowtie	risk	Bow-Tie	ربطة القوس	/risk/bowtie	\N	risk	link	312	t	f	2026-03-17 08:24:23.855935+08	2026-03-17 08:24:23.855935+08	\N	\N
compliance-templates	compliance	Templates	القوالب	/compliance/templates	\N	compliance	link	409	t	f	2026-03-17 08:24:23.869879+08	2026-03-17 08:24:23.869879+08	\N	\N
compliance-findings	compliance	Findings	النتائج	/compliance/findings	\N	compliance	link	410	t	f	2026-03-17 08:24:23.869879+08	2026-03-17 08:24:23.869879+08	\N	\N
compliance-sox	compliance	SOX	SOX	/compliance/sox	\N	compliance	link	411	t	f	2026-03-17 08:24:23.869879+08	2026-03-17 08:24:23.869879+08	\N	\N
compliance-esg	compliance	ESG	ESG	/compliance/esg	\N	compliance	link	412	t	f	2026-03-17 08:24:23.869879+08	2026-03-17 08:24:23.869879+08	\N	\N
compliance-savings	compliance	Savings	التوفير	/compliance/savings	\N	compliance	link	413	t	f	2026-03-17 08:24:23.869879+08	2026-03-17 08:24:23.869879+08	\N	\N
compliance-rcsa	compliance	RCSA	RCSA	/compliance/rcsa	\N	compliance	link	414	t	f	2026-03-17 08:24:23.869879+08	2026-03-17 08:24:23.869879+08	\N	\N
policy	\N	Policy	السياسات	/policies	pi pi-file-edit	policy	group	350	t	f	2026-03-17 08:24:23.872091+08	2026-03-17 08:24:23.872091+08	\N	\N
policy-register	policy	Policy Register	سجل السياسات	/policies	\N	policy	link	351	t	f	2026-03-17 08:24:23.872091+08	2026-03-17 08:24:23.872091+08	\N	\N
policy-procedures	policy	Procedures	الإجراءات	/procedures	\N	policy	link	352	t	f	2026-03-17 08:24:23.872091+08	2026-03-17 08:24:23.872091+08	\N	\N
policy-versions	policy	Version History	سجل الإصدارات	/policy-versions	\N	policy	link	353	t	f	2026-03-17 08:24:23.872091+08	2026-03-17 08:24:23.872091+08	\N	\N
policy-code	policy	Policy as Code	السياسة كرمز	/policy-code	\N	policy	link	354	t	f	2026-03-17 08:24:23.872091+08	2026-03-17 08:24:23.872091+08	\N	\N
exceptions	\N	Exceptions	الاستثناءات	/exceptions	ban	exception	link	65	t	f	2026-03-17 08:24:23.897472+08	2026-03-17 08:24:23.897472+08	\N	\N
audit-remediation	audit	Remediation	المعالجة	/audit/remediation	\N	audit	link	63	t	f	2026-03-17 08:24:24.409982+08	2026-03-17 08:24:24.409982+08	\N	\N
privacy-overview	privacy	Overview	نظرة عامة	/privacy/overview	\N	privacy	link	81	t	f	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.409982+08	\N	\N
privacy-dpia	privacy	DPIA	تقييم الأثر	/privacy/dpia	\N	privacy	link	82	t	f	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.409982+08	\N	\N
privacy-ropa	privacy	ROPA	سجل المعالجات	/privacy/ropa	\N	privacy	link	83	t	f	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.409982+08	\N	\N
qiyas-overview	qiyas	Overview	نظرة عامة	/qiyas/overview	\N	qiyas	link	91	t	f	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.409982+08	\N	\N
qiyas-benchmarks	qiyas	Benchmarks	المقارنات المرجعية	/qiyas/benchmarks	\N	qiyas	link	93	t	f	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.409982+08	\N	\N
qiyas-roadmaps	qiyas	Roadmaps	خرائط الطريق	/qiyas/roadmaps	\N	qiyas	link	94	t	f	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.409982+08	\N	\N
integrations-overview	integrations	Overview	نظرة عامة	/integrations/overview	\N	integrations	link	101	t	f	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.409982+08	\N	\N
integrations-connectors	integrations	Connectors	الموصلات	/integrations/connectors	\N	integrations	link	102	t	f	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.409982+08	\N	\N
settings	\N	Settings	الإعدادات	/settings	settings	\N	link	900	t	f	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.409982+08	\N	\N
foundation-reference-data	foundation	Reference Data	البيانات المرجعية	/foundation/reference-data	database	\N	link	108	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
foundation-notifications	foundation	Notifications	الإشعارات	/foundation/notifications	bell	\N	link	109	t	t	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.447336+08	\N	\N
foundation-audit	foundation	Audit Log	سجل التدقيق	/foundation/audit	clock	\N	link	110	t	t	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.447336+08	\N	\N
foundation-settings	foundation	Settings	الإعدادات	/foundation/settings	settings	\N	link	111	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
governance	\N	Governance	الحوكمة	\N	building-2	governance	group	200	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
governance-overview	governance	Overview	نظرة عامة	/governance/overview	\N	governance	link	201	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
governance-policies	governance	Policies	السياسات	/governance/policies	\N	governance	link	202	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
governance-procedures	governance	Procedures & Standards	الإجراءات والمعايير	/governance/procedures	\N	governance	link	203	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
governance-committees	governance	Committees	اللجان	/governance/committees	\N	governance	link	204	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
governance-decisions	governance	Decisions	القرارات	/governance/decisions	\N	governance	link	205	t	t	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.447336+08	\N	\N
governance-actions	governance	Actions	الإجراءات	/governance/actions	\N	governance	link	206	t	t	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.447336+08	\N	\N
governance-exceptions	governance	Exceptions	الاستثناءات	/governance/exceptions	\N	governance	link	207	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
governance-calendar	governance	Calendar	التقويم	/governance/calendar	\N	governance	link	208	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
risk	\N	Risk	المخاطر	\N	shield-alert	risk	group	300	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
risk-overview	risk	Overview	نظرة عامة	/risk/overview	\N	risk	link	301	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
risk-register	risk	Risk Register	سجل المخاطر	/risk/register	\N	risk	link	302	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
risk-assessments	risk	Assessments	تقييمات المخاطر	/risk/assessments	\N	risk	link	303	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
risk-scoring	risk	Methodology	المنهجية	/risk/scoring	\N	risk	link	304	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
risk-treatments	risk	Treatment Plans	خطط المعالجة	/risk/treatments	\N	risk	link	305	t	t	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.447336+08	\N	\N
risk-kris	risk	KRIs	مؤشرات المخاطر	/risk/kris	\N	risk	link	306	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
risk-acceptance	risk	Risk Acceptance	قبول المخاطر	/risk/acceptance	\N	risk	link	307	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
risk-heatmap	risk	Heatmap & Reports	الخريطة والتقارير	/risk/heatmap	\N	risk	link	308	t	t	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.447336+08	\N	\N
compliance	\N	Compliance	الامتثال	\N	shield-check	controls	group	400	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
compliance-overview	compliance	Overview	نظرة عامة	/compliance/overview	\N	controls	link	401	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
compliance-frameworks	compliance	Frameworks	الأطر	/compliance/frameworks	\N	controls	link	402	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
compliance-controls	compliance	Controls	الضوابط	/compliance/controls	\N	controls	link	403	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
compliance-obligations	compliance	Obligations	الالتزامات	/compliance/obligations	\N	controls	link	404	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
compliance-assessments	compliance	Assessments	التقييمات	/compliance/assessments	\N	controls	link	405	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
compliance-gaps	compliance	Gaps	الفجوات	/compliance/gaps	\N	controls	link	406	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
compliance-mappings	compliance	Mappings	الربط	/compliance/mappings	\N	controls	link	407	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
compliance-posture	compliance	Posture Dashboard	لوحة الوضع	/compliance/posture	\N	controls	link	408	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
evidence	\N	Evidence	الأدلة	\N	folder-check	evidence	group	500	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
evidence-vault	evidence	Evidence Vault	خزينة الأدلة	/evidence/vault	\N	evidence	link	502	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
evidence-catalog	evidence	Catalog	الفهرس	/evidence/catalog	\N	evidence	link	508	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
evidence-tasks	evidence	Tasks	المهام	/evidence/tasks	\N	evidence	link	509	t	t	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.447336+08	\N	\N
audit	\N	Audit	التدقيق	\N	search-check	audit	group	600	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
audit-overview	audit	Overview	نظرة عامة	/audit/overview	\N	audit	link	601	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
audit-plan	audit	Audit Plan	خطة التدقيق	/audit/plan	\N	audit	link	602	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
audit-engagements	audit	Audits	عمليات التدقيق	/audit/engagements	\N	audit	link	603	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
audit-findings	audit	Findings	النتائج	/audit/findings	\N	audit	link	604	t	t	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.447336+08	\N	\N
audit-capa	audit	CAPA	الإجراءات التصحيحية	/audit/capa	\N	audit	link	605	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
audit-validation	audit	Validation	التحقق	/audit/validation	\N	audit	link	606	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
audit-reports	audit	Reports	التقارير	/audit/reports	\N	audit	link	607	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
reports	\N	Reports	التقارير	\N	file-bar-chart	reports	group	700	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
reports-executive	reports	Executive Dashboard	لوحة تنفيذية	/reports/executive	\N	reports	link	701	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
reports-risk	reports	Risk Analytics	تحليلات المخاطر	/reports/risk	\N	reports	link	702	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
reports-compliance	reports	Compliance Analytics	تحليلات الامتثال	/reports/compliance	\N	reports	link	703	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
reports-audit	reports	Audit Analytics	تحليلات التدقيق	/reports/audit	\N	reports	link	704	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
reports-evidence	reports	Evidence Analytics	تحليلات الأدلة	/reports/evidence	\N	reports	link	705	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
reports-scheduled	reports	Scheduled Reports	التقارير المجدولة	/reports/scheduled	\N	reports	link	706	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
reports-exports	reports	Exports	التصدير	/reports/exports	\N	reports	link	707	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
qiyas	\N	Qiyas	قياس	\N	bar-chart-3	qiyas	group	800	t	t	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.447336+08	\N	\N
qiyas-dashboard	qiyas	Dashboard	لوحة قياس	/qiyas	\N	qiyas	link	801	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
qiyas-assessments	qiyas	Assessments	التقييمات	/qiyas/assessments	\N	qiyas	link	802	t	t	2026-03-17 08:24:21.23364+08	2026-03-17 08:24:24.447336+08	\N	\N
qiyas-models	qiyas	Models	النماذج	/qiyas/models	\N	qiyas	link	803	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
qiyas-maturity	qiyas	Maturity Wizard	معالج النضج	/maturity	\N	qiyas	link	804	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
ai	\N	AI & Automation	الذكاء الاصطناعي	\N	cpu	ai	group	900	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
ai-hub	ai	AI Hub	مركز الذكاء	/ai-hub	\N	ai	link	901	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
ai-workflows	ai	Workflows	سير العمل	/workflows	\N	ai	link	902	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
ai-task-board	ai	Task Board	لوحة المهام	/task-board	\N	ai	link	903	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
ai-agrc-os	ai	AGRC-OS	نظام التشغيل	/agrc-os	\N	ai	link	904	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
integrations	\N	Integrations	التكاملات	\N	plug-zap	integrations	group	1000	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
integrations-connector	integrations	Connector Hub	مركز الموصلات	/connector-hub	\N	integrations	link	1001	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
integrations-marketplace	integrations	Marketplace	السوق	/integration-marketplace	\N	integrations	link	1002	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
admin	\N	Administration	الإدارة	\N	settings	admin	group	1100	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
admin-team	admin	Team	الفريق	/team	\N	admin	link	1101	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
admin-hub	admin	Admin Hub	مركز الإدارة	/admin-hub	\N	admin	link	1102	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
admin-config	admin	Configuration	التكوين	/tenant-config	\N	admin	link	1103	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
settings-secondary	\N	Settings	الإعدادات	/tenant-config	settings	\N	link	9000	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
account-secondary	\N	Account	الحساب	/account-settings	user	\N	link	9001	t	t	2026-03-17 08:24:21.867111+08	2026-03-17 08:24:24.447336+08	\N	\N
help	\N	Help	المساعدة	/help	circle-help	\N	link	9100	t	t	2026-03-17 08:24:21.138384+08	2026-03-17 08:24:24.447336+08	\N	\N
\.


ALTER TABLE __TENANT_SCHEMA__.navigation_registry ENABLE TRIGGER ALL;

--
-- Data for Name: navigation_role_bindings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.navigation_role_bindings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.navigation_role_bindings (binding_id, nav_key, role_code, is_allowed, created_at) FROM stdin;
a1695433-6194-41d9-89a4-34a59355d52c	foundation	admin	t	2026-03-17 08:24:22.279253+08
47e50cd5-c6dc-4533-bee0-0532be2089d5	foundation	owner	t	2026-03-17 08:24:22.279253+08
900ded10-bcdb-4080-af84-7591cf4be91d	foundation	compliance_officer	t	2026-03-17 08:24:22.279253+08
f3c769e1-7e40-4ac4-b76a-e427048ea9ff	foundation	risk_manager	t	2026-03-17 08:24:22.279253+08
2357158a-b241-4ef2-823f-bdb155163d6f	foundation	auditor	t	2026-03-17 08:24:22.279253+08
2641ef33-2ef4-42d3-a681-b490619dca05	foundation	viewer	t	2026-03-17 08:24:22.279253+08
e5432b31-5f45-49cc-966f-826a3a22d903	foundation	ceo	t	2026-03-17 08:24:22.279253+08
b14beb0d-a65c-4f09-a07c-e5dc1390a001	foundation	ciso	t	2026-03-17 08:24:22.279253+08
cfefa7ae-03ef-497d-8d31-0606d894709d	foundation	cto	t	2026-03-17 08:24:22.279253+08
6e6333e2-9699-4670-b861-1d327c630837	foundation	cfo	t	2026-03-17 08:24:22.279253+08
525de109-0572-4d06-aab6-af3054d16d2e	governance	admin	t	2026-03-17 08:24:22.279253+08
b0ab7a9b-fd29-4b8a-8a30-5669b87c37c4	governance	owner	t	2026-03-17 08:24:22.279253+08
42ac5b23-d37b-46d8-aea2-31f5f9708e8b	governance	compliance_officer	t	2026-03-17 08:24:22.279253+08
c2f7bbd0-0012-4705-afdb-6f0fbc9db2f7	governance	risk_manager	t	2026-03-17 08:24:22.279253+08
25050cab-9ecd-4d21-9954-da267f2eb9c4	governance	auditor	t	2026-03-17 08:24:22.279253+08
ef3a0357-1545-498e-b6d0-c428af2c1f60	governance	viewer	t	2026-03-17 08:24:22.279253+08
6e9a11da-9e97-4844-a49d-efa80d1cf21a	governance	ceo	t	2026-03-17 08:24:22.279253+08
93455730-a7a5-43bd-ac92-57aca1907bfa	governance	ciso	t	2026-03-17 08:24:22.279253+08
455c3e12-8622-4efd-a7d6-41fdde77cb74	governance	cto	t	2026-03-17 08:24:22.279253+08
1e63f550-74de-444f-b88c-a500c0a99203	governance	cfo	t	2026-03-17 08:24:22.279253+08
53e36721-0d5d-4bef-a33e-a194ff4406cd	risk	admin	t	2026-03-17 08:24:22.279253+08
718d2942-d0c7-420b-87a0-b11860d6914f	risk	owner	t	2026-03-17 08:24:22.279253+08
24e82fd0-a03a-4a71-9274-aa373b66a55a	risk	risk_manager	t	2026-03-17 08:24:22.279253+08
203c6b15-8172-42a8-8d2e-115fe1bc376e	risk	compliance_officer	t	2026-03-17 08:24:22.279253+08
5e33bbed-d882-4868-89d5-bb56984412be	risk	auditor	t	2026-03-17 08:24:22.279253+08
a7fec1ab-d1a5-4a34-b4e0-ae7198343c8d	risk	viewer	t	2026-03-17 08:24:22.279253+08
b1e0b70d-7b20-4d60-be32-64887b93cffb	risk	ceo	t	2026-03-17 08:24:22.279253+08
27eeb8a0-d258-48f2-9172-9f67242fc4f3	risk	ciso	t	2026-03-17 08:24:22.279253+08
43816bfe-6e44-4e08-aed0-4e1dd9f1d144	risk	cto	t	2026-03-17 08:24:22.279253+08
8e678e8f-16c5-4b33-85ce-7a6a2de60933	risk	cfo	t	2026-03-17 08:24:22.279253+08
cdb4a4f6-43d1-4d30-8882-db450e3e934f	compliance	admin	t	2026-03-17 08:24:22.279253+08
36d73edd-7a59-415c-8348-4981f6fedfcc	compliance	owner	t	2026-03-17 08:24:22.279253+08
20fa1b6c-31f7-4d5c-bfc7-8d171a0606e4	compliance	compliance_officer	t	2026-03-17 08:24:22.279253+08
a00d694a-6265-4cb7-91e9-c51d196a40b0	compliance	risk_manager	t	2026-03-17 08:24:22.279253+08
b26ccbfd-6a58-49af-b10d-23d6ebacb7e9	compliance	auditor	t	2026-03-17 08:24:22.279253+08
17653d23-6332-4243-9297-178c9bb8fdef	compliance	viewer	t	2026-03-17 08:24:22.279253+08
8c1fcd48-65ec-4be7-a937-b0d3e0d39f35	compliance	ceo	t	2026-03-17 08:24:22.279253+08
f9bd8737-4c18-47e8-9179-9d1a24a4cb3b	compliance	ciso	t	2026-03-17 08:24:22.279253+08
052fb83b-b052-4789-9034-66a9c2e83f59	compliance	cto	t	2026-03-17 08:24:22.279253+08
11212bf7-5a63-4cde-a113-d925ff47321e	compliance	cfo	t	2026-03-17 08:24:22.279253+08
b7450aa6-daa2-4dff-a9d2-0031e03ca873	evidence	admin	t	2026-03-17 08:24:22.279253+08
37ffccbc-4493-4e8f-9abd-8e8a65fb16c5	evidence	owner	t	2026-03-17 08:24:22.279253+08
d832f1f3-fd22-4dd4-846c-af5a3fc1290c	evidence	compliance_officer	t	2026-03-17 08:24:22.279253+08
c7937782-2bcc-4cf1-b29e-f1313d3cf956	evidence	risk_manager	t	2026-03-17 08:24:22.279253+08
eff6de3c-9403-4192-bd82-7f1644e0663c	evidence	auditor	t	2026-03-17 08:24:22.279253+08
a4511fac-c5ce-49d1-adbf-8cfcd5c8ca7f	evidence	ceo	t	2026-03-17 08:24:22.279253+08
ee6a749d-c3bb-4cb3-bd5a-c3a3a2cce677	evidence	ciso	t	2026-03-17 08:24:22.279253+08
2b62d499-8ccf-40e9-bd3a-b15f054edf04	audit	admin	t	2026-03-17 08:24:22.279253+08
2c0f551b-ff4c-4b7e-8a47-9708539e74a4	audit	owner	t	2026-03-17 08:24:22.279253+08
b82016f3-968e-4693-93ab-d999478a51f5	audit	auditor	t	2026-03-17 08:24:22.279253+08
6e5145dd-3478-439c-8446-8aef24081f2b	audit	compliance_officer	t	2026-03-17 08:24:22.279253+08
6e9d82ff-e487-497d-950e-bddcc895a40a	audit	risk_manager	t	2026-03-17 08:24:22.279253+08
fb880a8a-d1f3-45f9-bc28-3bd66ae94b94	audit	ceo	t	2026-03-17 08:24:22.279253+08
4a97a1be-c002-4c06-b6f6-8b792d73d07b	audit	ciso	t	2026-03-17 08:24:22.279253+08
1a112a13-0744-40f9-bd4d-7ab622ba3186	reports	admin	t	2026-03-17 08:24:22.279253+08
4937bbd8-eaac-4d0c-b98e-a196a5c4993d	reports	owner	t	2026-03-17 08:24:22.279253+08
56c1a665-ed04-42ad-81bf-257c13c2c674	reports	compliance_officer	t	2026-03-17 08:24:22.279253+08
b604a49a-a038-47a8-b47d-f2441c222d69	reports	risk_manager	t	2026-03-17 08:24:22.279253+08
9817136f-2902-4d8c-be83-6cbdb62c9d75	reports	auditor	t	2026-03-17 08:24:22.279253+08
0a6ba3a8-f253-45c6-8361-2cd26327b821	reports	viewer	t	2026-03-17 08:24:22.279253+08
1fadf200-9882-40b8-a754-97f6b0a71afc	reports	ceo	t	2026-03-17 08:24:22.279253+08
1b71477b-eae6-4f6c-8e6e-d16b3c415fe9	reports	ciso	t	2026-03-17 08:24:22.279253+08
a465c916-a16d-4850-b103-2cf875b5b9d9	reports	cto	t	2026-03-17 08:24:22.279253+08
ca4947ea-077d-4c42-a541-6e970d48fe1a	reports	cfo	t	2026-03-17 08:24:22.279253+08
36f50548-a08a-402b-8526-caf31ee7a77f	qiyas	admin	t	2026-03-17 08:24:22.279253+08
c04d9a2e-8d44-44a2-9bd4-dac55eaae3c5	qiyas	owner	t	2026-03-17 08:24:22.279253+08
c787d723-a972-4153-b62a-6924995aa137	qiyas	compliance_officer	t	2026-03-17 08:24:22.279253+08
75eb14fb-f6df-413b-a610-d81f2f019b69	qiyas	risk_manager	t	2026-03-17 08:24:22.279253+08
a9acad81-d107-4a9c-bf2c-f9058ae1d7d9	qiyas	auditor	t	2026-03-17 08:24:22.279253+08
4f631a4a-eae4-409f-9db7-318e5384eef6	ai	admin	t	2026-03-17 08:24:22.279253+08
61e4b9cf-2dd8-4744-a18e-0a58478ed8cd	ai	owner	t	2026-03-17 08:24:22.279253+08
c52bd03a-92f5-4b70-99d3-875ed41d02ad	ai	ceo	t	2026-03-17 08:24:22.279253+08
799ef247-61ed-4048-8f22-689bbee3f184	ai	ciso	t	2026-03-17 08:24:22.279253+08
15aeeb52-21c4-474f-9943-94caab9e6581	ai	cto	t	2026-03-17 08:24:22.279253+08
5d3c4de1-4125-47dc-9813-26bd4a835c8f	integrations	admin	t	2026-03-17 08:24:22.279253+08
614b631e-9a25-44ca-8b7a-23781c4672c4	integrations	owner	t	2026-03-17 08:24:22.279253+08
eb2ce30c-5c21-4f28-86a2-d83f184b55e3	integrations	cto	t	2026-03-17 08:24:22.279253+08
bb80ef2c-bda1-425a-89b6-6408ffe9fe1b	admin	admin	t	2026-03-17 08:24:22.279253+08
1734e261-bfe8-40d8-8fdc-e9f9c4bedfac	admin	owner	t	2026-03-17 08:24:22.279253+08
\.


ALTER TABLE __TENANT_SCHEMA__.navigation_role_bindings ENABLE TRIGGER ALL;

--
-- Data for Name: near_miss_reports; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.near_miss_reports DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.near_miss_reports (near_miss_id, title, description, taxonomy_node_id, reported_by, reported_at, location, department_id, severity_estimate, potential_impact, root_cause_hint, preventive_action, status, converted_to_incident_id, reviewer_id, reviewed_at, review_notes, tags, attachments, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.near_miss_reports ENABLE TRIGGER ALL;

--
-- Data for Name: ninety_day_plans; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ninety_day_plans DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ninety_day_plans (plan90_id, tenant_id, workspace_id, template_code, start_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ninety_day_plans ENABLE TRIGGER ALL;

--
-- Data for Name: notification_preferences; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.notification_preferences DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.notification_preferences (preference_id, user_id, team_id, notification_category, email_enabled, sms_enabled, push_enabled, in_app_enabled, immediate_for_critical, batch_non_critical, batch_frequency, quiet_hours_start, quiet_hours_end, timezone, min_severity, filter_rules, subscribed, subscription_start, subscription_end, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.notification_preferences ENABLE TRIGGER ALL;

--
-- Data for Name: notification_preferences_legacy; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.notification_preferences_legacy DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.notification_preferences_legacy (user_id, preferences, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.notification_preferences_legacy ENABLE TRIGGER ALL;

--
-- Data for Name: notification_queue; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.notification_queue DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.notification_queue (notification_id, recipient_id, recipient_team_id, recipient_role, recipient_email, notification_type, notification_category, priority, subject, body, body_html, entity_type, entity_id, entity_url, action_required, action_url, action_deadline, delivery_channel, delivery_config, scheduled_at, send_after, expires_at, status, sent_at, delivered_at, read_at, retry_count, max_retries, last_error, error_details, tags, correlation_id, created_by, created_at) FROM stdin;
21d5ab9a-dad1-4c5a-8f09-5bf928fe987b	\N	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Executive / Strategy / GRC Steering	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:21.610518+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:21.610518+08
4ae0ca85-2a03-47b8-860b-beedb2ce354d	\N	4ab47114-2a8a-4da5-9e9f-dbf34143b7aa	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - SOC / Cyber Operations	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:21.610518+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:21.610518+08
46ed20fc-3b64-46a2-94ad-72ea8cfb9070	\N	7b86d19c-117c-4444-ae00-689ab1f7e9b7	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - IAM / Identity / Access Governance	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:21.610518+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:21.610518+08
c6641874-f61c-4446-9aa2-bbf067be15f5	\N	81795efe-abd5-485d-9dbc-ad5b8a80a260	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Data Governance / Data Management	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:21.610518+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:21.610518+08
02512cf1-6f08-46d2-9850-b92beee1017b	\N	6c4d2f11-4f06-4796-a973-df9497fc8b93	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Business Continuity / DR / Crisis	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:21.610518+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:21.610518+08
60ef019a-6f84-48cf-ba1d-898c917ca6e1	\N	89a742c3-a93f-4661-b10a-2ae4f9ae2329	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Cloud / Infrastructure / Hosting	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:21.610518+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:21.610518+08
02e72a79-03e9-40d2-84dd-158f89b5d607	\N	83bd0284-7e8c-489c-9200-e9b5aab55716	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Application / Platform Engineering	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:21.610518+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:21.610518+08
e81b75d4-2409-43d6-9820-45d07ec03b9c	\N	00310a16-83ca-465e-94a6-2abfed5793e6	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Enterprise Architecture	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:21.610518+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:21.610518+08
835fc939-e606-481d-a734-fd0cf59819e9	\N	c6298086-f66b-418c-87fc-eb8370d7747e	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - PMO / Transformation / Program Delivery	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:21.610518+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:21.610518+08
bcf64885-c103-4118-ad79-bf2767f359cf	\N	419acddd-0652-4b89-936d-8f563be56a25	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Service Operations / ITSM	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:21.610518+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:21.610518+08
91518ba7-7555-49c7-ad91-2b29accc431e	\N	ee17e8bf-6125-4317-8344-e4c4424ca33c	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Vendor / Procurement / Third-Party Risk	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:21.610518+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:21.610518+08
3b746568-b76d-4cd7-9fd4-e360ddc51fd3	\N	baa82233-2f98-461b-9ad1-744430c24b5b	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - HR / Workforce Governance	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:21.610518+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:21.610518+08
97628bf7-afd2-405f-b922-f217a307d994	\N	0fa2f110-8687-4e71-af63-8865f07631a1	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Finance / Budget Control	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:21.610518+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:21.610518+08
6ea273b3-c54d-4233-a81b-9e98ae3a4962	\N	c0f356ac-dadc-440c-9a2e-749fc833af3c	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Quality / Policy / Documentation Office	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:21.610518+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:21.610518+08
2ec2a98f-3cbd-424a-aa96-b217765f9297	\N	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Enterprise Risk Management	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:21.610518+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:21.610518+08
7f599023-22d0-4c96-8e2f-a17c60acdd27	\N	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Cybersecurity Governance	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:21.610518+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:21.610518+08
c6967fa8-b94f-45da-96e2-1d085b5c441c	\N	cde8e3a5-965d-4ec6-b879-5676c76567e8	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Privacy / PDPL / Legal Compliance	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:21.610518+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:21.610518+08
7a36dec8-4d21-46e2-97c5-7765ca23c643	\N	3955d2de-4d69-4de5-85a0-4b64944b3b73	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Internal Audit / Assurance	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:21.610518+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:21.610518+08
6b4e3f51-4a8e-47ef-ab9e-b934bba27cb9	\N	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Executive / Strategy / GRC Steering	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:24.413471+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:24.413471+08
fd0f904b-ac39-4359-bc70-287db42997d9	\N	4ab47114-2a8a-4da5-9e9f-dbf34143b7aa	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - SOC / Cyber Operations	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:24.413471+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:24.413471+08
2c56511b-662f-4041-a0a8-130362656042	\N	7b86d19c-117c-4444-ae00-689ab1f7e9b7	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - IAM / Identity / Access Governance	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:24.413471+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:24.413471+08
d21bbf19-f0c7-481c-9cdb-5312f88e2572	\N	81795efe-abd5-485d-9dbc-ad5b8a80a260	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Data Governance / Data Management	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:24.413471+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:24.413471+08
7a08671e-829d-4a33-915e-8fcf29c01cdd	\N	6c4d2f11-4f06-4796-a973-df9497fc8b93	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Business Continuity / DR / Crisis	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:24.413471+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:24.413471+08
d9ace8f2-a90e-43d4-86ed-71090a8cb57d	\N	89a742c3-a93f-4661-b10a-2ae4f9ae2329	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Cloud / Infrastructure / Hosting	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:24.413471+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:24.413471+08
61de579d-f2ec-4221-a1a0-b5370127a8f8	\N	83bd0284-7e8c-489c-9200-e9b5aab55716	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Application / Platform Engineering	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:24.413471+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:24.413471+08
73d73c17-77ee-44da-8710-595398f08c72	\N	00310a16-83ca-465e-94a6-2abfed5793e6	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Enterprise Architecture	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:24.413471+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:24.413471+08
02e10680-5381-470e-a355-4ea935f89f9e	\N	c6298086-f66b-418c-87fc-eb8370d7747e	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - PMO / Transformation / Program Delivery	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:24.413471+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:24.413471+08
229a1efc-9e21-47eb-8773-c5f030a6f6b4	\N	419acddd-0652-4b89-936d-8f563be56a25	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Service Operations / ITSM	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:24.413471+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:24.413471+08
53855a28-7e9b-4e45-8658-6b245ceffbd1	\N	ee17e8bf-6125-4317-8344-e4c4424ca33c	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Vendor / Procurement / Third-Party Risk	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:24.413471+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:24.413471+08
67b8e792-2eb7-4165-9baa-eb009bd79b14	\N	baa82233-2f98-461b-9ad1-744430c24b5b	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - HR / Workforce Governance	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:24.413471+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:24.413471+08
cc147013-3d55-4dc6-937f-c06697ccb81c	\N	0fa2f110-8687-4e71-af63-8865f07631a1	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Finance / Budget Control	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:24.413471+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:24.413471+08
d006f472-94aa-493f-bafc-e0874fbf37a5	\N	c0f356ac-dadc-440c-9a2e-749fc833af3c	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Quality / Policy / Documentation Office	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:24.413471+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:24.413471+08
02d1da6d-f25e-4f0a-b6ac-53ba987c9c3a	\N	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Enterprise Risk Management	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:24.413471+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:24.413471+08
6eb1b38a-41c1-45d2-aab0-bd3b91694398	\N	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Cybersecurity Governance	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:24.413471+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:24.413471+08
6bac33f0-8fdc-47dc-a1fd-cf467221df3f	\N	cde8e3a5-965d-4ec6-b879-5676c76567e8	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Privacy / PDPL / Legal Compliance	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:24.413471+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:24.413471+08
0a6778d1-9155-4eec-890f-4a6e37006b56	\N	3955d2de-4d69-4de5-85a0-4b64944b3b73	\N	\N	team_onboarding	\N	info	Welcome to AGRC-OS - Internal Audit / Assurance	Your team has been successfully configured in AGRC-OS. Access your dashboard to review assigned tasks, evidence requests, and collaboration requirements.	\N	\N	\N	\N	f	\N	\N	in_app	\N	2026-03-17 08:25:24.413471+08	\N	\N	pending	\N	\N	\N	0	3	\N	\N	\N	\N	SYSTEM	2026-03-17 08:24:24.413471+08
\.


ALTER TABLE __TENANT_SCHEMA__.notification_queue ENABLE TRIGGER ALL;

--
-- Data for Name: object_mappings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.object_mappings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.object_mappings (mapping_id, source_type, source_id, target_type, target_id, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.object_mappings ENABLE TRIGGER ALL;

--
-- Data for Name: scope_dimensions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.scope_dimensions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.scope_dimensions (scope_id, workspace_id, dimension_type, name, parent_scope_id, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.scope_dimensions ENABLE TRIGGER ALL;

--
-- Data for Name: object_scopes; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.object_scopes DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.object_scopes (object_type, object_id, scope_id) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.object_scopes ENABLE TRIGGER ALL;

--
-- Data for Name: obligation_assignments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.obligation_assignments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.obligation_assignments (assignment_id, obligation_id, assignee_type, assignee_id, assigned_by, assigned_at, due_date, status, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.obligation_assignments ENABLE TRIGGER ALL;

--
-- Data for Name: obligation_control_links; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.obligation_control_links DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.obligation_control_links (link_id, obligation_id, control_id, mapping_type, coverage_percent, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.obligation_control_links ENABLE TRIGGER ALL;

--
-- Data for Name: obligation_due_dates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.obligation_due_dates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.obligation_due_dates (due_date_id, obligation_id, period_start, period_end, due_date, status, completed_at, completed_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.obligation_due_dates ENABLE TRIGGER ALL;

--
-- Data for Name: obligation_evidence_links; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.obligation_evidence_links DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.obligation_evidence_links (link_id, obligation_id, evidence_id, link_type, sufficiency_score, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.obligation_evidence_links ENABLE TRIGGER ALL;

--
-- Data for Name: obligation_exemptions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.obligation_exemptions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.obligation_exemptions (exemption_id, obligation_id, reason, approved_by, approved_at, valid_from, valid_to, status, conditions, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.obligation_exemptions ENABLE TRIGGER ALL;

--
-- Data for Name: obligation_status_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.obligation_status_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.obligation_status_history (history_id, obligation_id, previous_status, new_status, changed_by, reason, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.obligation_status_history ENABLE TRIGGER ALL;

--
-- Data for Name: obligation_templates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.obligation_templates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.obligation_templates (template_id, name_en, name_ar, obligation_type, framework_id, default_cadence, default_evidence_types, template_body, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.obligation_templates ENABLE TRIGGER ALL;

--
-- Data for Name: obligation_versions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.obligation_versions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.obligation_versions (version_id, obligation_id, version_number, change_summary, effective_at, changed_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.obligation_versions ENABLE TRIGGER ALL;

--
-- Data for Name: onboarding_answers; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.onboarding_answers DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.onboarding_answers (answer_id, user_id, wizard_step, field_id, answer_value, version, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.onboarding_answers ENABLE TRIGGER ALL;

--
-- Data for Name: onboarding_assessment_drafts; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.onboarding_assessment_drafts DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.onboarding_assessment_drafts (draft_id, tenant_id, assessment_id, answers, active_category_key, current_question_index, completion_percent, status, consensus_status, submitted_by, submitted_at, created_by, updated_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.onboarding_assessment_drafts ENABLE TRIGGER ALL;

--
-- Data for Name: onboarding_consensus; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.onboarding_consensus DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.onboarding_consensus (consensus_id, draft_id, tenant_id, reviewer_user_id, reviewer_name, decision, comments, decided_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.onboarding_consensus ENABLE TRIGGER ALL;

--
-- Data for Name: operating_packs; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.operating_packs DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.operating_packs (pack_id, pack_code, name_en, name_ar, pack_type, version, status, manifest, metadata, is_system, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.operating_packs ENABLE TRIGGER ALL;

--
-- Data for Name: org_hierarchy_nodes; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.org_hierarchy_nodes DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.org_hierarchy_nodes (node_id, node_type, entity_id, label_en, label_ar, level, path, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.org_hierarchy_nodes ENABLE TRIGGER ALL;

--
-- Data for Name: org_hierarchy_edges; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.org_hierarchy_edges DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.org_hierarchy_edges (edge_id, parent_node_id, child_node_id, edge_type, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.org_hierarchy_edges ENABLE TRIGGER ALL;

--
-- Data for Name: pack_installations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.pack_installations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.pack_installations (installation_id, pack_code, pack_version, installation_scope, workspace_id, applies_to_role, installed_by, install_status, install_log, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.pack_installations ENABLE TRIGGER ALL;

--
-- Data for Name: pack_selection_decisions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.pack_selection_decisions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.pack_selection_decisions (decision_id, session_id, tenant_id, policy_code, target_pack_code, decision_status, matched, priority, rationale, evaluation_snapshot, selected_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.pack_selection_decisions ENABLE TRIGGER ALL;

--
-- Data for Name: pack_selection_policies; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.pack_selection_policies DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.pack_selection_policies (policy_id, policy_code, name_en, name_ar, target_pack_code, priority, enabled, stop_on_match, conditions, outcome, notes, is_system, created_at, updated_at) FROM stdin;
b5411400-9395-405d-908a-bdffe74b5bb0	always_agrc_core	Always install AGRC Core	تثبيت حزمة الحوكمة والمخاطر والامتثال الأساسية دائمًا	agrc-core	10	t	f	[{"type": "always"}]	{"action": "select", "reason": "Base AGRC operating model is mandatory"}	Foundation pack for all governed tenants	t	2026-03-17 08:24:21.06106+08	2026-03-17 08:24:24.40764+08
0bf76547-46c7-4c4c-a528-ed64b1abd29d	government_org_model	Government operating model	نموذج التشغيل الحكومي	nic-government-core	20	t	f	[{"type": "answer_includes_any", "field": "organization_type", "values": ["government", "ministry", "authority", "public"]}, {"type": "answer_includes_any", "field": "industry_sector", "values": ["government", "public sector"]}, {"type": "recommendation_modules_include_any", "values": ["government"]}]	{"action": "select", "reason": "Government/public-sector profile inferred"}	Installs government reference operating model	t	2026-03-17 08:24:21.06106+08	2026-03-17 08:24:24.40764+08
a15a1a3c-4211-4817-8201-7cb09ae99a63	qiyas_required	Qiyas required	حزمة قياس مطلوبة	qiyas-core	30	t	f	[{"type": "answer_truthy", "field": "enable_qiyas"}, {"type": "answer_truthy", "field": "needs_maturity_assessment"}, {"type": "answer_truthy", "field": "needs_benchmarking"}, {"type": "recommendation_modules_include_any", "values": ["qiyas", "assessment", "benchmarking", "maturity"]}]	{"action": "select", "reason": "Maturity/assessment capability required"}	Installs Qiyas assessment domain	t	2026-03-17 08:24:21.06106+08	2026-03-17 08:24:24.40764+08
\.


ALTER TABLE __TENANT_SCHEMA__.pack_selection_policies ENABLE TRIGGER ALL;

--
-- Data for Name: pdpl_consent_records; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.pdpl_consent_records DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.pdpl_consent_records (id, user_id, consent_type, consent_version, granted, granted_at, revoked_at, ip_address, user_agent, legal_basis, data_categories, retention_period_days, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.pdpl_consent_records ENABLE TRIGGER ALL;

--
-- Data for Name: pending_assignment_queue; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.pending_assignment_queue DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.pending_assignment_queue (queue_id, instance_id, assignee_user_id, task_id, payload, status, retry_count, created_at, delivered_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.pending_assignment_queue ENABLE TRIGGER ALL;

--
-- Data for Name: performance_cache; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.performance_cache DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.performance_cache (cache_key, cache_type, cached_data, computation_time_ms, data_sources, cached_at, expires_at, hit_count, last_accessed, invalidation_triggers, force_refresh) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.performance_cache ENABLE TRIGGER ALL;

--
-- Data for Name: permissions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.permissions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.permissions (id, code, module_code, resource_code, action_code, description, created_at) FROM stdin;
1	risk.record.create	risk	record	create	Create new risk records	2026-03-17 08:24:23.609869+08
2	risk.record.read	risk	record	read	View risk records	2026-03-17 08:24:23.609869+08
3	risk.record.update	risk	record	update	Edit risk records	2026-03-17 08:24:23.609869+08
4	risk.record.submit	risk	record	submit	Submit risk for review	2026-03-17 08:24:23.609869+08
5	risk.record.review	risk	record	review	Review risk assessments	2026-03-17 08:24:23.609869+08
6	risk.record.approve	risk	record	approve	Approve risk assessments	2026-03-17 08:24:23.609869+08
7	risk.record.close	risk	record	close	Close risk records	2026-03-17 08:24:23.609869+08
8	risk.treatment.assign	risk	treatment	assign	Assign risk treatment plans	2026-03-17 08:24:23.609869+08
9	risk.treatment.update	risk	treatment	update	Update risk treatment plans	2026-03-17 08:24:23.609869+08
10	compliance.control.read	compliance	control	read	View controls	2026-03-17 08:24:23.609869+08
11	compliance.control.create	compliance	control	create	Create controls	2026-03-17 08:24:23.609869+08
12	compliance.control.update	compliance	control	update	Update controls	2026-03-17 08:24:23.609869+08
13	compliance.test.execute	compliance	test	execute	Execute control tests	2026-03-17 08:24:23.609869+08
14	compliance.test.review	compliance	test	review	Review test results	2026-03-17 08:24:23.609869+08
15	compliance.score.review	compliance	score	review	Review compliance scores	2026-03-17 08:24:23.609869+08
16	compliance.score.approve	compliance	score	approve	Approve compliance scores	2026-03-17 08:24:23.609869+08
17	compliance.report.generate	compliance	report	generate	Generate compliance reports	2026-03-17 08:24:23.609869+08
18	policy.document.create	policy	document	create	Draft new policies	2026-03-17 08:24:23.609869+08
19	policy.document.read	policy	document	read	View policies	2026-03-17 08:24:23.609869+08
20	policy.document.update	policy	document	update	Edit policy drafts	2026-03-17 08:24:23.609869+08
21	policy.document.review	policy	document	review	Review policies	2026-03-17 08:24:23.609869+08
22	policy.document.approve	policy	document	approve	Approve policies	2026-03-17 08:24:23.609869+08
23	policy.document.publish	policy	document	publish	Publish approved policies	2026-03-17 08:24:23.609869+08
24	policy.document.retire	policy	document	retire	Retire policies	2026-03-17 08:24:23.609869+08
25	policy.ack.attest	policy	ack	attest	Attest to policy acknowledgement	2026-03-17 08:24:23.609869+08
26	evidence.item.upload	evidence	item	upload	Upload evidence items	2026-03-17 08:24:23.609869+08
27	evidence.item.read	evidence	item	read	View evidence items	2026-03-17 08:24:23.609869+08
28	evidence.item.verify	evidence	item	verify	Verify evidence completeness	2026-03-17 08:24:23.609869+08
29	evidence.item.lock	evidence	item	lock	Lock evidence items	2026-03-17 08:24:23.609869+08
30	evidence.item.release	evidence	item	release	Release evidence to audit package	2026-03-17 08:24:23.609869+08
31	evidence.item.archive	evidence	item	archive	Archive evidence items	2026-03-17 08:24:23.609869+08
32	audit.engagement.create	audit	engagement	create	Create audit engagements	2026-03-17 08:24:23.609869+08
33	audit.engagement.read	audit	engagement	read	View audit engagements	2026-03-17 08:24:23.609869+08
34	audit.workpaper.update	audit	workpaper	update	Update audit workpapers	2026-03-17 08:24:23.609869+08
35	audit.finding.issue	audit	finding	issue	Issue audit findings	2026-03-17 08:24:23.609869+08
36	audit.finding.respond	audit	finding	respond	Respond to audit findings	2026-03-17 08:24:23.609869+08
37	audit.finding.close	audit	finding	close	Close audit findings	2026-03-17 08:24:23.609869+08
38	audit.report.create	audit	report	create	Create audit reports	2026-03-17 08:24:23.609869+08
39	audit.report.approve	audit	report	approve	Approve audit reports	2026-03-17 08:24:23.609869+08
40	incident.record.create	incident	record	create	Report new incidents	2026-03-17 08:24:23.609869+08
41	incident.record.read	incident	record	read	View incidents	2026-03-17 08:24:23.609869+08
42	incident.record.update	incident	record	update	Update incident records	2026-03-17 08:24:23.609869+08
43	incident.record.review	incident	record	review	Review incident investigations	2026-03-17 08:24:23.609869+08
44	incident.record.approve	incident	record	approve	Approve incident closure	2026-03-17 08:24:23.609869+08
45	incident.record.escalate	incident	record	escalate	Escalate incident severity	2026-03-17 08:24:23.609869+08
46	exception.request.create	exception	request	create	Request policy exceptions	2026-03-17 08:24:23.609869+08
47	exception.request.read	exception	request	read	View exceptions	2026-03-17 08:24:23.609869+08
48	exception.request.review	exception	request	review	Review exception requests	2026-03-17 08:24:23.609869+08
49	exception.request.approve	exception	request	approve	Approve exceptions	2026-03-17 08:24:23.609869+08
50	governance.body.create	governance	body	create	Create governance bodies	2026-03-17 08:24:23.609869+08
51	governance.body.read	governance	body	read	View governance bodies	2026-03-17 08:24:23.609869+08
52	governance.charter.update	governance	charter	update	Update governance charters	2026-03-17 08:24:23.609869+08
53	governance.delegation.manage	governance	delegation	manage	Manage delegation matrix	2026-03-17 08:24:23.609869+08
54	governance.meeting.manage	governance	meeting	manage	Manage meeting packs	2026-03-17 08:24:23.609869+08
55	vendor.record.create	vendor	record	create	Onboard vendors	2026-03-17 08:24:23.609869+08
56	vendor.record.read	vendor	record	read	View vendor records	2026-03-17 08:24:23.609869+08
57	vendor.assessment.execute	vendor	assessment	execute	Execute vendor assessments	2026-03-17 08:24:23.609869+08
58	vendor.assessment.approve	vendor	assessment	approve	Approve vendor assessments	2026-03-17 08:24:23.609869+08
59	bcp.plan.create	bcp	plan	create	Create continuity plans	2026-03-17 08:24:23.609869+08
60	bcp.plan.read	bcp	plan	read	View continuity plans	2026-03-17 08:24:23.609869+08
61	bcp.plan.update	bcp	plan	update	Update continuity plans	2026-03-17 08:24:23.609869+08
62	bcp.exercise.approve	bcp	exercise	approve	Approve BCP exercises	2026-03-17 08:24:23.609869+08
63	asset.record.create	asset	record	create	Register assets	2026-03-17 08:24:23.609869+08
64	asset.record.read	asset	record	read	View assets	2026-03-17 08:24:23.609869+08
65	asset.record.update	asset	record	update	Update asset records	2026-03-17 08:24:23.609869+08
66	asset.classification.review	asset	classification	review	Review asset classifications	2026-03-17 08:24:23.609869+08
67	reporting.dashboard.create	reporting	dashboard	create	Create dashboards	2026-03-17 08:24:23.609869+08
68	reporting.dashboard.read	reporting	dashboard	read	View dashboards	2026-03-17 08:24:23.609869+08
69	reporting.report.export	reporting	report	export	Export reports	2026-03-17 08:24:23.609869+08
70	action.item.create	action	item	create	Create action items	2026-03-17 08:24:23.656243+08
71	action.item.read	action	item	read	View action items	2026-03-17 08:24:23.656243+08
72	action.item.update	action	item	update	Update action items	2026-03-17 08:24:23.656243+08
73	action.item.close	action	item	close	Close action items	2026-03-17 08:24:23.656243+08
74	action.item.reassign	action	item	reassign	Reassign action items	2026-03-17 08:24:23.656243+08
75	approval.request.create	approval	request	create	Create approval requests	2026-03-17 08:24:23.656243+08
76	approval.request.read	approval	request	read	View approval requests	2026-03-17 08:24:23.656243+08
77	approval.request.approve	approval	request	approve	Approve requests	2026-03-17 08:24:23.656243+08
78	approval.request.reject	approval	request	reject	Reject requests	2026-03-17 08:24:23.656243+08
79	approval.request.reassign	approval	request	reassign	Reassign requests	2026-03-17 08:24:23.656243+08
80	approval.request.escalate	approval	request	escalate	Escalate requests	2026-03-17 08:24:23.656243+08
81	incident.record.delete	incident	record	delete	Delete incident records	2026-03-17 08:24:23.656243+08
82	vendor.record.update	vendor	record	update	Update vendor records	2026-03-17 08:24:23.656243+08
83	vendor.record.delete	vendor	record	delete	Delete vendor records	2026-03-17 08:24:23.656243+08
84	bcp.plan.delete	bcp	plan	delete	Delete BCP plans	2026-03-17 08:24:23.656243+08
85	governance.body.update	governance	body	update	Update governance bodies	2026-03-17 08:24:23.660864+08
86	governance.body.delete	governance	body	delete	Delete governance bodies	2026-03-17 08:24:23.660864+08
87	governance.register.create	governance	register	create	Create governance registers	2026-03-17 08:24:23.660864+08
88	governance.register.read	governance	register	read	View governance registers	2026-03-17 08:24:23.660864+08
89	governance.register.update	governance	register	update	Update governance registers	2026-03-17 08:24:23.660864+08
90	governance.register.delete	governance	register	delete	Delete governance registers	2026-03-17 08:24:23.660864+08
91	governance.action.create	governance	action	create	Create governance action items	2026-03-17 08:24:23.660864+08
92	governance.action.read	governance	action	read	View governance action items	2026-03-17 08:24:23.660864+08
93	governance.action.update	governance	action	update	Update governance action items	2026-03-17 08:24:23.660864+08
94	governance.action.close	governance	action	close	Close governance action items	2026-03-17 08:24:23.660864+08
95	team.record.create	team	record	create	Create teams	2026-03-17 08:24:23.660864+08
96	team.record.read	team	record	read	View teams	2026-03-17 08:24:23.660864+08
97	team.record.update	team	record	update	Update teams	2026-03-17 08:24:23.660864+08
98	team.record.delete	team	record	delete	Delete teams	2026-03-17 08:24:23.660864+08
99	team.member.add	team	member	add	Add team members	2026-03-17 08:24:23.660864+08
100	team.member.remove	team	member	remove	Remove team members	2026-03-17 08:24:23.660864+08
101	team.raci.manage	team	raci	manage	Manage RACI assignments	2026-03-17 08:24:23.660864+08
102	remediation.task.create	remediation	task	create	Create remediation tasks	2026-03-17 08:24:23.660864+08
103	remediation.task.read	remediation	task	read	View remediation tasks	2026-03-17 08:24:23.660864+08
104	remediation.task.update	remediation	task	update	Update remediation tasks	2026-03-17 08:24:23.660864+08
105	remediation.task.close	remediation	task	close	Close remediation tasks	2026-03-17 08:24:23.660864+08
106	remediation.task.delete	remediation	task	delete	Delete remediation tasks	2026-03-17 08:24:23.660864+08
107	workflow.template.create	workflow	template	create	Create workflow templates	2026-03-17 08:24:23.664693+08
108	workflow.template.read	workflow	template	read	View workflow templates	2026-03-17 08:24:23.664693+08
109	workflow.template.update	workflow	template	update	Update workflow templates	2026-03-17 08:24:23.664693+08
110	workflow.template.delete	workflow	template	delete	Delete workflow templates	2026-03-17 08:24:23.664693+08
111	workflow.instance.create	workflow	instance	create	Create workflow instances	2026-03-17 08:24:23.664693+08
112	workflow.instance.read	workflow	instance	read	View workflow instances	2026-03-17 08:24:23.664693+08
113	workflow.instance.cancel	workflow	instance	cancel	Cancel workflow instances	2026-03-17 08:24:23.664693+08
114	training.campaign.create	training	campaign	create	Create training campaigns	2026-03-17 08:24:23.664693+08
115	training.campaign.read	training	campaign	read	View training campaigns	2026-03-17 08:24:23.664693+08
116	training.campaign.update	training	campaign	update	Update training campaigns	2026-03-17 08:24:23.664693+08
117	training.content.create	training	content	create	Create training content	2026-03-17 08:24:23.664693+08
118	training.content.read	training	content	read	View training content	2026-03-17 08:24:23.664693+08
119	training.assignment.read	training	assignment	read	View training assignments	2026-03-17 08:24:23.664693+08
120	training.assignment.manage	training	assignment	manage	Manage training assignments	2026-03-17 08:24:23.664693+08
121	training.report.read	training	report	read	View training reports	2026-03-17 08:24:23.664693+08
122	messaging.thread.create	messaging	thread	create	Create message threads	2026-03-17 08:24:23.664693+08
123	messaging.thread.read	messaging	thread	read	View message threads	2026-03-17 08:24:23.664693+08
124	messaging.message.send	messaging	message	send	Send messages	2026-03-17 08:24:23.664693+08
125	messaging.message.read	messaging	message	read	Read messages	2026-03-17 08:24:23.664693+08
126	ai.copilot.read	ai	copilot	read	Access AI copilot	2026-03-17 08:24:23.664693+08
127	ai.copilot.execute	ai	copilot	execute	Execute AI copilot actions	2026-03-17 08:24:23.664693+08
128	ai.model.read	ai	model	read	View AI models	2026-03-17 08:24:23.664693+08
129	ai.model.manage	ai	model	manage	Manage AI models and config	2026-03-17 08:24:23.664693+08
130	ai.trigger.read	ai	trigger	read	View AI triggers	2026-03-17 08:24:23.664693+08
131	ai.trigger.manage	ai	trigger	manage	Manage AI triggers	2026-03-17 08:24:23.664693+08
132	ai.squad.read	ai	squad	read	View AI agent squads	2026-03-17 08:24:23.664693+08
133	ai.squad.manage	ai	squad	manage	Manage AI agent squads	2026-03-17 08:24:23.664693+08
134	timeline.activity.read	timeline	activity	read	View activity timeline	2026-03-17 08:24:23.664693+08
135	timeline.event.read	timeline	event	read	View timeline events	2026-03-17 08:24:23.664693+08
136	integrations.connector.create	integrations	connector	create	Create integration connectors	2026-03-17 08:24:23.664693+08
137	integrations.connector.read	integrations	connector	read	View integration connectors	2026-03-17 08:24:23.664693+08
138	integrations.connector.update	integrations	connector	update	Update integration connectors	2026-03-17 08:24:23.664693+08
139	integrations.connector.delete	integrations	connector	delete	Delete integration connectors	2026-03-17 08:24:23.664693+08
140	task.item.create	task	item	create	Create tasks	2026-03-17 08:24:23.664693+08
141	task.item.read	task	item	read	View tasks	2026-03-17 08:24:23.664693+08
142	task.item.update	task	item	update	Update tasks	2026-03-17 08:24:23.664693+08
143	task.item.close	task	item	close	Close tasks	2026-03-17 08:24:23.664693+08
144	procedure.document.create	procedure	document	create	Create procedures	2026-03-17 08:24:23.664693+08
145	procedure.document.read	procedure	document	read	View procedures	2026-03-17 08:24:23.664693+08
146	procedure.document.update	procedure	document	update	Update procedures	2026-03-17 08:24:23.664693+08
147	procedure.document.delete	procedure	document	delete	Delete procedures	2026-03-17 08:24:23.664693+08
148	notification.alert.read	notification	alert	read	View notifications	2026-03-17 08:24:23.664693+08
149	notification.alert.manage	notification	alert	manage	Manage notification preferences	2026-03-17 08:24:23.664693+08
150	analytics.dashboard.read	analytics	dashboard	read	View analytics dashboards	2026-03-17 08:24:23.664693+08
151	analytics.dashboard.create	analytics	dashboard	create	Create analytics dashboards	2026-03-17 08:24:23.664693+08
152	analytics.kpi.read	analytics	kpi	read	View KPI metrics	2026-03-17 08:24:23.664693+08
153	analytics.report.export	analytics	report	export	Export analytics reports	2026-03-17 08:24:23.664693+08
154	workspace.config.read	workspace	config	read	View workspace configuration	2026-03-17 08:24:23.664693+08
155	workspace.config.update	workspace	config	update	Update workspace configuration	2026-03-17 08:24:23.664693+08
156	workspace.user.manage	workspace	user	manage	Manage workspace users	2026-03-17 08:24:23.664693+08
157	knowledge.article.read	knowledge	article	read	View knowledge base articles	2026-03-17 08:24:23.664693+08
158	knowledge.article.create	knowledge	article	create	Create knowledge base articles	2026-03-17 08:24:23.664693+08
159	knowledge.article.update	knowledge	article	update	Update knowledge base articles	2026-03-17 08:24:23.664693+08
160	maturity.assessment.create	maturity	assessment	create	Create maturity assessments	2026-03-17 08:24:23.664693+08
161	maturity.assessment.read	maturity	assessment	read	View maturity assessments	2026-03-17 08:24:23.664693+08
162	maturity.assessment.update	maturity	assessment	update	Update maturity assessments	2026-03-17 08:24:23.664693+08
163	agrc.engine.read	agrc	engine	read	View AGRC-OS engine status	2026-03-17 08:24:23.664693+08
164	agrc.engine.manage	agrc	engine	manage	Manage AGRC-OS engine	2026-03-17 08:24:23.664693+08
165	agrc.agent.read	agrc	agent	read	View AI agents	2026-03-17 08:24:23.664693+08
166	agrc.agent.manage	agrc	agent	manage	Manage AI agents	2026-03-17 08:24:23.664693+08
167	agrc.constitution.read	agrc	constitution	read	View governance constitution	2026-03-17 08:24:23.664693+08
168	agrc.constitution.update	agrc	constitution	update	Update governance constitution	2026-03-17 08:24:23.664693+08
169	agrc.autonomous.read	agrc	autonomous	read	View autonomous workflow status	2026-03-17 08:24:23.664693+08
170	agrc.autonomous.config	agrc	autonomous	config	Configure autonomous workflows	2026-03-17 08:24:23.664693+08
171	workspace.config.delete	workspace	config	delete	Delete workspace configuration entries	2026-03-17 08:24:23.680694+08
172	workspace.tenant.manage	workspace	tenant	manage	Full tenant lifecycle management	2026-03-17 08:24:23.680694+08
173	workspace.platform.admin	workspace	platform	admin	Platform-level super admin operations	2026-03-17 08:24:23.680694+08
174	agrc.engine.override	agrc	engine	override	Override AGRC-OS engine decisions	2026-03-17 08:24:23.680694+08
177	agrc.gate.read	agrc	gate	read	View governance gates	2026-03-17 08:24:23.680694+08
178	agrc.gate.override	agrc	gate	override	Override governance gate decisions	2026-03-17 08:24:23.680694+08
179	agrc.telemetry.read	agrc	telemetry	read	View AGRC telemetry data	2026-03-17 08:24:23.680694+08
180	agrc.telemetry.write	agrc	telemetry	write	Write AGRC telemetry data	2026-03-17 08:24:23.680694+08
181	agrc.ccm.read	agrc	ccm	read	View continuous control monitoring	2026-03-17 08:24:23.680694+08
182	agrc.ccm.manage	agrc	ccm	manage	Manage continuous control monitoring	2026-03-17 08:24:23.680694+08
183	agrc.runbook.read	agrc	runbook	read	View AGRC runbooks	2026-03-17 08:24:23.680694+08
184	agrc.runbook.write	agrc	runbook	write	Create/update AGRC runbooks	2026-03-17 08:24:23.680694+08
185	agrc.sop.read	agrc	sop	read	View standard operating procedures	2026-03-17 08:24:23.680694+08
186	agrc.sop.write	agrc	sop	write	Create/update standard operating procedures	2026-03-17 08:24:23.680694+08
187	agrc.event_log.read	agrc	event_log	read	View AGRC event logs	2026-03-17 08:24:23.680694+08
188	agrc.autonomous.manage	agrc	autonomous	manage	Full autonomous workflow management	2026-03-17 08:24:23.680694+08
189	governance.delegation.read	governance	delegation	read	View delegations	2026-03-17 08:24:23.680694+08
190	governance.delegation.create	governance	delegation	create	Create delegations	2026-03-17 08:24:23.680694+08
191	workspace.entity_link.read	workspace	entity_link	read	View entity links	2026-03-17 08:24:23.680694+08
192	workspace.entity_link.create	workspace	entity_link	create	Create entity links	2026-03-17 08:24:23.680694+08
193	workspace.entity_link.delete	workspace	entity_link	delete	Delete entity links	2026-03-17 08:24:23.680694+08
194	workspace.command_palette.read	workspace	command_palette	read	Access command palette	2026-03-17 08:24:23.680694+08
195	workspace.search.read	workspace	search	read	Use global search	2026-03-17 08:24:23.680694+08
196	workspace.quote.read	workspace	quote	read	View motivational quotes	2026-03-17 08:24:23.680694+08
197	workspace.inline_edit.read	workspace	inline_edit	read	View inline editable fields	2026-03-17 08:24:23.680694+08
198	workspace.inline_edit.write	workspace	inline_edit	write	Perform inline edits	2026-03-17 08:24:23.680694+08
199	ai.contextual.read	ai	contextual	read	View contextual AI suggestions	2026-03-17 08:24:23.680694+08
200	ai.contextual.execute	ai	contextual	execute	Execute contextual AI actions	2026-03-17 08:24:23.680694+08
201	workspace.journey.read	workspace	journey	read	View workspace journey/lifecycle	2026-03-17 08:24:23.680694+08
202	workspace.journey.manage	workspace	journey	manage	Manage workspace journey/lifecycle	2026-03-17 08:24:23.680694+08
203	workflow.task.read	workflow	task	read	View workflow task queue	2026-03-17 08:24:24.309172+08
204	workflow.task.execute	workflow	task	execute	Execute assigned workflow steps	2026-03-17 08:24:24.309172+08
206	workflow.template.manage	workflow	template	manage	Create and edit workflow templates	2026-03-17 08:24:24.309172+08
207	ai.tool.use	ai	tool	use	Access AI-assisted tools	2026-03-17 08:24:24.309172+08
208	ai.config.manage	ai	config	manage	Configure AI tool settings	2026-03-17 08:24:24.309172+08
210	analytics.report.read	analytics	report	read	View analytics reports	2026-03-17 08:24:24.309172+08
211	analytics.config.manage	analytics	config	manage	Configure analytics settings	2026-03-17 08:24:24.309172+08
212	task.record.create	task	record	create	Create task assignments	2026-03-17 08:24:24.309172+08
213	task.record.read	task	record	read	View task assignments	2026-03-17 08:24:24.309172+08
214	task.record.update	task	record	update	Update task assignments	2026-03-17 08:24:24.309172+08
218	training.program.read	training	program	read	View training programs	2026-03-17 08:24:24.309172+08
219	training.program.manage	training	program	manage	Create and manage training programs	2026-03-17 08:24:24.309172+08
220	training.campaign.manage	training	campaign	manage	Create and manage training campaigns	2026-03-17 08:24:24.309172+08
222	training.completion.submit	training	completion	submit	Complete training assignments	2026-03-17 08:24:24.309172+08
\.


ALTER TABLE __TENANT_SCHEMA__.permissions ENABLE TRIGGER ALL;

--
-- Data for Name: permissions_legacy; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.permissions_legacy DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.permissions_legacy (permission_id, permission_code, module, resource, action, description_en, description_ar, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.permissions_legacy ENABLE TRIGGER ALL;

--
-- Data for Name: person_profiles; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.person_profiles DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.person_profiles (profile_id, user_id, full_name, work_email, phone, department_id, job_title, direct_manager_user_id, language_code, business_function, notification_channels, source, status, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.person_profiles ENABLE TRIGGER ALL;

--
-- Data for Name: training_campaigns; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.training_campaigns DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.training_campaigns (campaign_id, title, title_ar, description, campaign_type, status, target_audience, target_roles, target_departments, target_teams, target_user_ids, content_ids, mandatory, start_date, end_date, reminder_schedule, escalation_after_days, completion_target_pct, actual_completion_pct, total_assigned, total_completed, total_passed, total_failed, total_overdue, owner_id, approved_by, approved_at, launched_at, completed_at, recurrence, next_recurrence, attachments, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.training_campaigns ENABLE TRIGGER ALL;

--
-- Data for Name: phishing_campaigns; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.phishing_campaigns DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.phishing_campaigns (phishing_id, campaign_id, title, description, status, template_type, difficulty, email_subject, email_body, sender_display, landing_page_url, target_user_ids, target_departments, target_roles, scheduled_at, launched_at, completed_at, total_sent, total_opened, total_clicked, total_reported, total_submitted_data, open_rate_pct, click_rate_pct, report_rate_pct, submit_rate_pct, benchmark_click_rate, remediation_content_id, auto_assign_training, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.phishing_campaigns ENABLE TRIGGER ALL;

--
-- Data for Name: phishing_user_results; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.phishing_user_results DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.phishing_user_results (result_id, phishing_id, user_id, email_sent_at, email_opened_at, link_clicked_at, data_submitted_at, reported_at, user_action, remediation_assigned, remediation_completed, metadata, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.phishing_user_results ENABLE TRIGGER ALL;

--
-- Data for Name: pir_sign_offs; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.pir_sign_offs DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.pir_sign_offs (sign_off_id, pir_id, signer_id, signer_role, decision, comments, signed_at, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.pir_sign_offs ENABLE TRIGGER ALL;

--
-- Data for Name: plan_item_instances; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.plan_item_instances DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.plan_item_instances (item_id, plan90_id, tenant_id, week, type, title_en, title_ar, owner_role, due_at, status, completed_at, owner_user_id) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.plan_item_instances ENABLE TRIGGER ALL;

--
-- Data for Name: platform_operation_config; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.platform_operation_config DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.platform_operation_config (config_id, config_key, config_value, description_en, description_ar, is_sensitive, updated_by, updated_at) FROM stdin;
ea7ea1bb-6aac-461a-909a-929d9841404d	modules_enabled	{"grc": true, "qiyas": false}	Active modules for this tenant workspace	الوحدات النشطة لمساحة عمل هذا المستأجر	f	\N	2026-03-17 08:24:21.909091+08
53e0a42e-a427-44e7-a125-fa92d79260f9	default_operation_mode	"human_only"	Tenant-wide default operation mode: human_only | hybrid_shadow | hybrid_active | autonomous	وضع التشغيل الافتراضي للمستأجر	f	\N	2026-03-17 08:24:21.909091+08
a2a2c2b4-1983-410c-9ebf-84b9a9ba04f9	agent_confidence_threshold	0.85	Minimum AI confidence (0–1) required before autonomous agent action executes	الحد الأدنى لثقة الذكاء الاصطناعي قبل تنفيذ إجراء وكيل مستقل	f	\N	2026-03-17 08:24:21.909091+08
b75a417d-befd-4f50-a174-6dd812f55527	qiyas_grc_sync_enabled	false	Enable automatic Qiyas → GRC maturity score synchronisation	تمكين المزامنة التلقائية من قياس إلى حوكمة المخاطر والامتثال	f	\N	2026-03-17 08:24:21.909091+08
742fe5a8-8fd0-4aad-bcd2-b215f06ce86e	workflow_mode_enforcement	"per_step"	Granularity of operation mode enforcement: tenant_wide | per_team | per_step	دقة تطبيق وضع التشغيل: على مستوى المستأجر أو الفريق أو الخطوة	f	\N	2026-03-17 08:24:21.909091+08
54a7696e-85f6-462a-89f7-00a1c7983b40	qiyas_auto_task_creation	false	Auto-create GRC remediation tasks when Qiyas gap severity is critical/high	إنشاء مهام معالجة GRC تلقائيًا عند اكتشاف فجوات قياس حرجة أو عالية	f	\N	2026-03-17 08:24:21.909091+08
2a66e47f-57bd-4302-9cb3-3c9df10b422a	mode_audit_enabled	true	Log every agent action with its operation mode into mode_operation_log	تسجيل كل إجراء وكيل مع وضع تشغيله في سجل وضع التشغيل	f	\N	2026-03-17 08:24:21.909091+08
26f9e414-c00f-4920-8b86-87da0f663bd9	ai_governance_enforcement_mode	"audit"	AI governance enforcement mode for model/agent registries: audit | warn | enforce	وضع تطبيق حوكمة الذكاء الاصطناعي لسجلات النماذج والوكلاء: تدقيق | تحذير | تطبيق	f	\N	2026-03-17 08:24:23.527699+08
5249f6ab-d721-47ec-8728-262a79858411	governance_policy_approval_sod	"enforce"	Separation of Duties mode for policy approval: enforce | warn | off. When enforce, the policy author/owner cannot approve their own policy.	وضع الفصل بين المهام لاعتماد السياسات: فرض | تحذير | إيقاف. عند الفرض، لا يمكن لمؤلف/مالك السياسة اعتماد سياسته.	f	\N	2026-03-17 08:24:23.872091+08
27f8d802-8bbd-429a-8672-436418c74eca	incident_sla_defaults	{"low": 168, "high": 24, "medium": 72, "critical": 4}	Incident SLA response-time defaults (hours) by severity level	إعدادات اتفاقية مستوى الخدمة الافتراضية للحوادث (ساعات) حسب مستوى الخطورة	f	\N	2026-03-17 08:24:23.877338+08
\.


ALTER TABLE __TENANT_SCHEMA__.platform_operation_config ENABLE TRIGGER ALL;

--
-- Data for Name: policy_control_mappings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.policy_control_mappings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.policy_control_mappings (mapping_id, policy_id, control_id, alignment_status, notes, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.policy_control_mappings ENABLE TRIGGER ALL;

--
-- Data for Name: policy_guidance; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.policy_guidance DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.policy_guidance (guidance_id, policy_id, template_key, guidance_type, title_en, title_ar, content_en, content_ar, frameworks, sort_order, is_active, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.policy_guidance ENABLE TRIGGER ALL;

--
-- Data for Name: policy_metrics; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.policy_metrics DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.policy_metrics (metric_id, period_type, period_start, period_end, policies_drafted, policies_created, policies_updated, policies_retired, policies_under_review, reviews_completed, reviews_overdue, avg_review_cycle_days, pending_approvals, approvals_completed, approvals_rejected, avg_approval_days, avg_creation_days, min_creation_days, max_creation_days, auto_initiated_count, auto_review_triggered, controls_covered, frameworks_covered, coverage_percentage, calculated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.policy_metrics ENABLE TRIGGER ALL;

--
-- Data for Name: policy_mom_records; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.policy_mom_records DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.policy_mom_records (mom_id, policy_id, mom_type, title, meeting_date, location, chairperson, attendees, absentees, agenda_items, discussion_notes, decisions, action_items, next_meeting_date, attachments, status, approved_by, approved_at, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.policy_mom_records ENABLE TRIGGER ALL;

--
-- Data for Name: policy_process_actions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.policy_process_actions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.policy_process_actions (action_id, policy_id, step_key, step_order, status, assigned_to, assigned_role, due_date, completed_at, completed_by, notes, sla_hours, is_required, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.policy_process_actions ENABLE TRIGGER ALL;

--
-- Data for Name: policy_templates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.policy_templates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.policy_templates (template_id, template_key, title_en, title_ar, category, description_en, description_ar, frameworks, sectors, content_en, content_ar, guidance_en, guidance_ar, variables, review_frequency, tags, sort_order, is_active, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.policy_templates ENABLE TRIGGER ALL;

--
-- Data for Name: policy_workflow_tracker; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.policy_workflow_tracker DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.policy_workflow_tracker (tracker_id, policy_id, action, actor_user_id, actor_role, from_status, to_status, comment, metadata, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.policy_workflow_tracker ENABLE TRIGGER ALL;

--
-- Data for Name: policy_workflows; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.policy_workflows DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.policy_workflows (workflow_id, policy_code, policy_type, title, description, initiating_team_id, policy_owner_team_id, current_stage, current_assignee_team_id, current_assignee_user_id, draft_document_id, draft_version, final_document_id, published_version, review_comments, review_history, risk_assessment_complete, legal_review_complete, approval_chain, approval_deadline, target_publish_date, actual_publish_date, effective_date, next_review_date, retirement_date, retirement_reason, mapped_controls, mapped_frameworks, auto_initiated, trigger_source, trigger_data, parent_policy_id, tags, priority, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.policy_workflows ENABLE TRIGGER ALL;

--
-- Data for Name: positions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.positions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.positions (position_id, dept_id, title_en, title_ar, grade, reports_to_position_id, status, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.positions ENABLE TRIGGER ALL;

--
-- Data for Name: powerbi_reports; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.powerbi_reports DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.powerbi_reports (report_id, name, report_url, embed_url, dataset_id, workspace_id, status, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.powerbi_reports ENABLE TRIGGER ALL;

--
-- Data for Name: risk_threats; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_threats DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_threats (threat_id, risk_id, name, description, threat_category, likelihood, source, is_active, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_threats ENABLE TRIGGER ALL;

--
-- Data for Name: preventive_control_mappings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.preventive_control_mappings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.preventive_control_mappings (mapping_id, threat_id, control_id, control_title, effectiveness, notes, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.preventive_control_mappings ENABLE TRIGGER ALL;

--
-- Data for Name: privacy_budget; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.privacy_budget DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.privacy_budget (budget_id, dataset_id, total_epsilon, consumed_epsilon, query_log, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.privacy_budget ENABLE TRIGGER ALL;

--
-- Data for Name: privacy_control_links; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.privacy_control_links DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.privacy_control_links (link_id, control_id, privacy_domain, link_type, coverage_notes, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.privacy_control_links ENABLE TRIGGER ALL;

--
-- Data for Name: privacy_data_subject_requests; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.privacy_data_subject_requests DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.privacy_data_subject_requests (request_id, request_type, subject_identifier, status, received_at, due_date, completed_at, response_details, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.privacy_data_subject_requests ENABLE TRIGGER ALL;

--
-- Data for Name: privacy_incidents; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.privacy_incidents DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.privacy_incidents (incident_id, title, description, incident_type, severity, affected_data_types, affected_count, detected_at, reported_at, status, dpa_notified, data_subjects_notified, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.privacy_incidents ENABLE TRIGGER ALL;

--
-- Data for Name: privacy_legal_bases; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.privacy_legal_bases DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.privacy_legal_bases (basis_id, code, name_en, name_ar, description, requires_consent, requires_dpia, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.privacy_legal_bases ENABLE TRIGGER ALL;

--
-- Data for Name: privacy_reviews; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.privacy_reviews DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.privacy_reviews (review_id, review_type, scope, reviewer_id, outcome, findings, next_review_date, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.privacy_reviews ENABLE TRIGGER ALL;

--
-- Data for Name: process_audit_trail; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.process_audit_trail DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.process_audit_trail (audit_id, entity_type, entity_id, action, action_details, performed_by, performed_by_team_id, performed_at, ip_address, user_agent, session_id, workflow_execution_id) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.process_audit_trail ENABLE TRIGGER ALL;

--
-- Data for Name: process_metrics; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.process_metrics DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.process_metrics (metric_id, metric_type, team_id, period_type, period_start, period_end, items_created, items_assigned, items_started, items_completed, items_cancelled, items_overdue, items_escalated, avg_completion_hours, min_completion_hours, max_completion_hours, median_completion_hours, total_work_hours, sla_met_count, sla_breach_count, sla_compliance_rate, avg_sla_variance_hours, first_time_pass_rate, rework_count, rejection_count, escalation_count, avg_escalation_level, escalation_resolution_hours, automation_rate, productivity_score, calculated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.process_metrics ENABLE TRIGGER ALL;

--
-- Data for Name: process_tasks; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.process_tasks DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.process_tasks (task_id, control_id, team_id, assigned_user_id, task_type, title, description, priority, status, sla_hours, due_date, started_at, completed_at, breached_at, escalation_level, parent_task_id, blocking_tasks, auto_initiated, trigger_source, trigger_data, completion_evidence, created_by, created_at, updated_at, entity_type, entity_id, routing_tier, routing_metadata, auto_resolved, resolution_source, resolution_evidence, workflow_execution_id, workflow_step_id) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.process_tasks ENABLE TRIGGER ALL;

--
-- Data for Name: process_templates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.process_templates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.process_templates (template_id, process_type, name_en, name_ar, stages, required_roles, applicable_frameworks, sector_id, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.process_templates ENABLE TRIGGER ALL;

--
-- Data for Name: processes; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.processes DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.processes (process_id, name, description, owner, department, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.processes ENABLE TRIGGER ALL;

--
-- Data for Name: products; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.products DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.products (product_id, name, category, owner, version, description, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.products ENABLE TRIGGER ALL;

--
-- Data for Name: projects; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.projects DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.projects (project_id, title, description, project_type, owner_id, sponsor_id, start_date, target_end_date, actual_end_date, status, priority, budget, created_at, updated_at, deleted_at, project_code, name, business_justification, owner_team_id, project_manager, stakeholder_teams, linked_frameworks, linked_controls, linked_risks, linked_findings, target_date, revised_date, health_status, progress_percentage, budget_allocated, budget_spent, budget_status, risk_level, open_risks, open_issues, open_action_items, tags, created_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.projects ENABLE TRIGGER ALL;

--
-- Data for Name: project_assurance_links; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.project_assurance_links DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.project_assurance_links (link_id, project_id, linked_entity_type, linked_entity_id, link_type, notes, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.project_assurance_links ENABLE TRIGGER ALL;

--
-- Data for Name: project_deliverables; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.project_deliverables DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.project_deliverables (deliverable_id, project_id, deliverable_code, deliverable_type, name, description, control_ids, control_coverage_percentage, responsible_team_id, assigned_to, reviewer_team_id, planned_start, planned_end, actual_start, actual_end, status, completion_percentage, evidence_urls, documentation_links, acceptance_criteria, quality_score, verified_by, verification_date, verification_notes, depends_on, blocks, priority, estimated_effort_hours, actual_effort_hours, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.project_deliverables ENABLE TRIGGER ALL;

--
-- Data for Name: project_exceptions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.project_exceptions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.project_exceptions (exception_id, project_id, exception_type, title, description, justification, risk_impact, approved_by, approval_date, valid_until, status, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.project_exceptions ENABLE TRIGGER ALL;

--
-- Data for Name: project_milestones; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.project_milestones DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.project_milestones (milestone_id, project_id, title, description, target_date, actual_date, status, deliverables, gate_review_required, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.project_milestones ENABLE TRIGGER ALL;

--
-- Data for Name: project_gate_reviews; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.project_gate_reviews DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.project_gate_reviews (review_id, milestone_id, reviewer_id, review_date, outcome, conditions, risk_assessment, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.project_gate_reviews ENABLE TRIGGER ALL;

--
-- Data for Name: prompt_injection_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.prompt_injection_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.prompt_injection_log (log_id, tenant_id, user_id, agent_id, input_preview, detection_type, severity, blocked, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.prompt_injection_log ENABLE TRIGGER ALL;

--
-- Data for Name: provisioning_jobs; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.provisioning_jobs DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.provisioning_jobs (job_id, tenant_id, user_id, status, percent, workspace_id, seed_id, answers_hash, counts, error_message, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.provisioning_jobs ENABLE TRIGGER ALL;

--
-- Data for Name: provisioning_steps; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.provisioning_steps DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.provisioning_steps (step_id, job_id, name, stage_index, status, started_at, completed_at, error_message) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.provisioning_steps ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_assessment_exports; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_assessment_exports DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_assessment_exports (export_id, assessment_id, export_type, file_name, file_path, file_size_bytes, template_used, filters, generated_by, generated_at, expires_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_assessment_exports ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_assessments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_assessments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_assessments (qiyas_assessment_id, assessment_id, model_id, template_id, title_en, title_ar, description_en, description_ar, assessment_type, status, target_date, started_at, completed_at, finalized_at, finalized_by, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_assessments ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_assessment_respondents; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_assessment_respondents DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_assessment_respondents (respondent_id, qiyas_assessment_id, user_id, user_name, role, assigned_sections, status, invited_at, started_at, submitted_at, reminder_count, last_reminded_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_assessment_respondents ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_assessment_reviews; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_assessment_reviews DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_assessment_reviews (review_id, qiyas_assessment_id, reviewer_id, reviewer_name, scope, scope_entity_id, decision, comments, score_adjustments, decided_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_assessment_reviews ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_assessment_scopes; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_assessment_scopes DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_assessment_scopes (scope_id, qiyas_assessment_id, scope_type, scope_entity_id, scope_name, included, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_assessment_scopes ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_assessment_status_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_assessment_status_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_assessment_status_history (history_id, qiyas_assessment_id, from_status, to_status, changed_by, reason, metadata, changed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_assessment_status_history ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_grc_trigger_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_grc_trigger_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_grc_trigger_log (trigger_id, trigger_type, source_module, source_entity, source_id, target_module, target_action, target_entity_type, target_entity_id, payload, status, error_message, processed_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_grc_trigger_log ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_auto_tasks; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_auto_tasks DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_auto_tasks (auto_task_id, trigger_id, qiyas_assessment_id, qiyas_gap_id, qiyas_rec_id, grc_task_id, grc_control_id, task_title, task_description, priority, assigned_team_code, due_date, status, gap_severity, gap_score, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_auto_tasks ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_benchmark_datasets; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_benchmark_datasets DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_benchmark_datasets (dataset_id, code, name_en, name_ar, description_en, description_ar, source, model_id, sector_id, region, sample_size, collection_period, valid_from, valid_to, data, status, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_benchmark_datasets ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_benchmark_cohorts; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_benchmark_cohorts DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_benchmark_cohorts (cohort_id, dataset_id, code, name_en, name_ar, description_en, criteria, member_count, sector_filter, size_filter, region_filter, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_benchmark_cohorts ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_benchmark_comparisons; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_benchmark_comparisons DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_benchmark_comparisons (comparison_id, qiyas_assessment_id, dataset_id, cohort_id, entity_type, entity_id, org_score, benchmark_mean, benchmark_median, percentile_rank, rating, compared_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_benchmark_comparisons ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_benchmark_metrics; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_benchmark_metrics DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_benchmark_metrics (metric_id, dataset_id, cohort_id, entity_type, entity_id, metric_name, mean_value, median_value, std_deviation, min_value, max_value, p25, p75, p90, sample_size, computed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_benchmark_metrics ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_benchmark_percentiles; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_benchmark_percentiles DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_benchmark_percentiles (percentile_id, dataset_id, cohort_id, entity_type, entity_id, percentile, score_value, computed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_benchmark_percentiles ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_models; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_models DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_models (model_id, code, name_en, name_ar, description_en, description_ar, model_type, owner, status, tags, metadata, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_models ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_benchmark_profiles; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_benchmark_profiles DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_benchmark_profiles (profile_id, model_id, code, name_en, name_ar, profile_type, sector_id, baseline_scores, valid_from, valid_to, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_benchmark_profiles ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_scores; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_scores DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_scores (score_id, qiyas_assessment_id, model_id, overall_score, overall_level, max_possible, completion_pct, scoring_method, scored_at, scored_by, is_final, metadata) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_scores ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_benchmark_results; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_benchmark_results DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_benchmark_results (result_id, score_id, profile_id, entity_type, entity_id, actual_score, benchmark_score, percentile, rating, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_benchmark_results ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_benchmark_trends; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_benchmark_trends DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_benchmark_trends (trend_id, dataset_id, entity_type, entity_id, period_label, period_start, period_end, mean_score, median_score, sample_size, trend_direction, change_pct, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_benchmark_trends ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_calibration_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_calibration_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_calibration_log (calibration_id, assessment_id, entity_type, entity_id, original_value, adjusted_value, reason, calibrated_by, calibrated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_calibration_log ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_certification_readiness; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_certification_readiness DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_certification_readiness (readiness_id, qiyas_assessment_id, framework_requirement_id, framework_name, certification_body, target_date, overall_readiness_pct, controls_ready, controls_total, evidence_ready, evidence_total, critical_gaps, status, assessed_by, assessed_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_certification_readiness ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_certification_gaps; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_certification_gaps DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_certification_gaps (gap_id, readiness_id, gap_type, entity_type, entity_id, description_en, description_ar, severity, remediation_effort, estimated_days, assigned_to, status, resolved_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_certification_gaps ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_certification_action_plans; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_certification_action_plans DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_certification_action_plans (plan_id, readiness_id, gap_id, title_en, title_ar, description_en, description_ar, priority, owner, target_date, actual_completion_date, actions, dependencies, progress_pct, status, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_certification_action_plans ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_certification_evidence_packs; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_certification_evidence_packs DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_certification_evidence_packs (pack_id, readiness_id, name_en, name_ar, description_en, pack_type, evidence_ids, document_ids, total_items, completeness_pct, status, prepared_by, reviewed_by, approved_by, approved_at, submitted_at, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_certification_evidence_packs ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_certification_milestones; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_certification_milestones DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_certification_milestones (milestone_id, readiness_id, code, name_en, name_ar, description_en, milestone_type, target_date, actual_date, status, owner, dependencies, sort_order, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_certification_milestones ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_certification_simulations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_certification_simulations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_certification_simulations (simulation_id, readiness_id, scenario_name, scenario_description, assumptions, projected_readiness_pct, projected_gaps, projected_timeline_days, simulated_changes, result_summary, simulated_by, simulated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_certification_simulations ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_consensus_reviews; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_consensus_reviews DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_consensus_reviews (review_id, assessment_id, reviewer_id, reviewer_name, reviewer_role, overall_score, comments, domain_scores, decision, decided_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_consensus_reviews ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_dimension_scores; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_dimension_scores DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_dimension_scores (dimension_score_id, score_id, dimension_id, domain_id, score, level, max_possible, weight_applied, questions_total, questions_answered, metadata) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_dimension_scores ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_domains; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_domains DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_domains (domain_id, model_id, code, name_en, name_ar, description_en, description_ar, sort_order, weight, parent_domain_id, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_domains ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_dimensions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_dimensions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_dimensions (dimension_id, domain_id, code, name_en, name_ar, description_en, description_ar, sort_order, weight, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_dimensions ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_evidence_chain_validations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_evidence_chain_validations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_evidence_chain_validations (validation_id, evidence_id, qiyas_assessment_id, chain_length, all_hashes_valid, broken_links, provenance_score, tamper_detected, validated_by, validated_at, notes) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_evidence_chain_validations ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_evidence_coverage_analysis; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_evidence_coverage_analysis DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_evidence_coverage_analysis (analysis_id, qiyas_assessment_id, entity_type, entity_id, required_evidence_types, provided_evidence_types, coverage_pct, missing_types, status, analyzed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_evidence_coverage_analysis ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_evidence_quality_metrics; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_evidence_quality_metrics DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_evidence_quality_metrics (metric_id, entity_type, entity_id, qiyas_assessment_id, total_evidence, scored_evidence, avg_quality_score, excellent_count, good_count, acceptable_count, poor_count, insufficient_count, freshness_pct, computed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_evidence_quality_metrics ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_templates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_templates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_templates (template_id, model_id, code, name_en, name_ar, description_en, description_ar, template_type, status, estimated_minutes, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_templates ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_sections; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_sections DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_sections (section_id, template_id, domain_id, code, name_en, name_ar, description_en, description_ar, sort_order, is_required, visibility_rule, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_sections ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_questions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_questions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_questions (question_id, section_id, code, text_en, text_ar, help_text_en, help_text_ar, question_type, is_required, sort_order, visibility_rule, validation_rule, metadata, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_questions ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_evidence_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_evidence_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_evidence_rules (rule_id, question_id, trigger_condition, evidence_type, description_en, description_ar, is_mandatory, max_age_days, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_evidence_rules ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_evidence_scoring_models; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_evidence_scoring_models DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_evidence_scoring_models (model_id, code, name_en, name_ar, description_en, description_ar, scoring_dimensions, weight_config, status, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_evidence_scoring_models ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_evidence_scores; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_evidence_scores DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_evidence_scores (score_id, evidence_id, scoring_model_id, qiyas_assessment_id, control_id, obligation_id, overall_score, dimension_scores, criteria_scores, quality_grade, scored_by, scored_at, notes) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_evidence_scores ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_evidence_scoring_criteria; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_evidence_scoring_criteria DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_evidence_scoring_criteria (criteria_id, model_id, dimension, code, name_en, name_ar, description_en, description_ar, max_score, weight, scoring_guide, sort_order) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_evidence_scoring_criteria ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_evidence_sufficiency_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_evidence_sufficiency_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_evidence_sufficiency_rules (rule_id, context_type, context_id, model_id, min_evidence_count, required_types, max_age_days, min_quality_grade, min_quality_score, is_default, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_evidence_sufficiency_rules ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_gap_scores; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_gap_scores DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_gap_scores (gap_id, score_id, entity_type, entity_id, current_score, target_score, gap_pct, severity, recommendations_count) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_gap_scores ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_grc_automation_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_grc_automation_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_grc_automation_rules (rule_id, rule_code, trigger_type, trigger_condition, action_type, action_config, enabled, description_en, description_ar, created_at) FROM stdin;
98ea2f81-5ae9-4fcc-8b46-08d994997dd0	RULE-QG-01	gap_critical	{"modules": ["qiyas"], "min_severity": "critical"}	create_grc_remediation_workflow	{"priority": "critical", "workflow_template": "WF-QIYAS-02: Gap-Triggered Remediation", "auto_assign_to_control_owner": true}	f	Auto-create GRC remediation workflow when Qiyas gap severity is critical	إنشاء سير عمل معالجة GRC تلقائيًا عند وجود فجوة قياس حرجة	2026-03-17 08:24:21.955589+08
f283665a-1b10-4f74-96c6-f8566d0a77f7	RULE-QG-02	gap_high	{"modules": ["qiyas"], "min_severity": "high"}	create_grc_remediation_task	{"priority": "high", "task_type": "remediation", "notify_team_lead": true}	f	Auto-create GRC remediation task when Qiyas gap severity is high	إنشاء مهمة معالجة GRC تلقائيًا عند وجود فجوة قياس عالية	2026-03-17 08:24:21.955589+08
a1ecb733-5acc-4f18-b879-ddac4f9ec0e9	RULE-QG-03	recommendation_accepted	{"modules": ["qiyas"], "requires_human_confirmation": true}	create_grc_remediation_task	{"task_type": "remediation", "map_to_controls": true, "map_to_policies": true}	f	Auto-create GRC remediation task when Qiyas recommendation is accepted	إنشاء مهمة معالجة تلقائيًا عند قبول توصية قياس	2026-03-17 08:24:21.955589+08
ddc07deb-9256-4242-9fb7-71a2e2cfdfe6	RULE-QG-04	control_test_fail	{"modules": ["grc"], "test_result": "fail"}	update_qiyas_indicator_score	{"sync_direction": "grc_to_qiyas", "recalculate_domain_score": true}	f	Update Qiyas indicator scores when GRC control test fails	تحديث مؤشرات قياس تلقائيًا عند فشل اختبار ضابط GRC	2026-03-17 08:24:21.955589+08
32ad605d-171c-42e1-be1e-9ecf9f246d4a	RULE-QG-05	assessment_finalized	{"modules": ["qiyas"]}	sync_maturity_to_grc_dashboard	{"sync_type": "full", "notify_roles": ["ciso", "ceo", "erm_lead"], "update_compliance_score": true}	f	Sync Qiyas maturity scores to GRC dashboard when assessment is finalised	مزامنة درجات نضج قياس مع لوحة GRC عند الانتهاء من التقييم	2026-03-17 08:24:21.955589+08
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_grc_automation_rules ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_improvement_paths; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_improvement_paths DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_improvement_paths (path_id, assessment_id, domain_id, current_level, target_level, steps, estimated_months, effort_estimate, priority, status, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_improvement_paths ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_indicator_scores; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_indicator_scores DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_indicator_scores (indicator_score_id, score_id, indicator_id, dimension_id, score, raw_value, normalized_value, weight_applied, evidence_count, metadata) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_indicator_scores ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_indicators; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_indicators DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_indicators (indicator_id, dimension_id, code, name_en, name_ar, description_en, description_ar, measurement_type, target_value, weight, sort_order, evidence_required, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_indicators ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_maturity_models; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_maturity_models DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_maturity_models (maturity_model_id, qiyas_model_id, code, name_en, name_ar, description_en, description_ar, total_levels, level_labels, status, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_maturity_models ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_maturity_assessments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_maturity_assessments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_maturity_assessments (maturity_assessment_id, maturity_model_id, qiyas_assessment_id, entity_type, entity_id, assessment_period, period_start, period_end, overall_level, domain_levels, status, assessed_by, validated_by, created_at, completed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_maturity_assessments ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_maturity_dimension_results; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_maturity_dimension_results DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_maturity_dimension_results (result_id, maturity_assessment_id, domain_id, dimension_id, achieved_level, target_level, criteria_met, criteria_total, evidence_coverage_pct, notes) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_maturity_dimension_results ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_maturity_levels; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_maturity_levels DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_maturity_levels (level_id, maturity_model_id, level_number, name_en, name_ar, description_en, description_ar, color_code, sort_order) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_maturity_levels ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_maturity_level_criteria; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_maturity_level_criteria DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_maturity_level_criteria (criteria_id, level_id, domain_id, code, description_en, description_ar, evidence_required, weight, sort_order) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_maturity_level_criteria ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_maturity_progression_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_maturity_progression_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_maturity_progression_history (progression_id, maturity_model_id, entity_type, entity_id, domain_id, previous_level, new_level, assessment_ref, recorded_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_maturity_progression_history ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_maturity_target_profiles; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_maturity_target_profiles DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_maturity_target_profiles (profile_id, maturity_model_id, name_en, name_ar, target_date, overall_target_level, domain_targets, rationale, approved_by, approved_at, status, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_maturity_target_profiles ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_maturity_roadmaps; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_maturity_roadmaps DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_maturity_roadmaps (roadmap_id, maturity_model_id, target_profile_id, name_en, name_ar, description_en, description_ar, milestones, estimated_months, current_progress_pct, status, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_maturity_roadmaps ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_maturity_scores; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_maturity_scores DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_maturity_scores (maturity_score_id, score_id, domain_id, current_level, target_level, level_label_en, level_label_ar, criteria_met, criteria_unmet, evidence_coverage_pct) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_maturity_scores ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_model_versions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_model_versions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_model_versions (version_id, model_id, version_number, label, change_summary, definition, published_at, published_by, status, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_model_versions ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_question_mappings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_question_mappings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_question_mappings (mapping_id, question_id, entity_type, entity_id, mapping_type, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_question_mappings ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_question_options; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_question_options DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_question_options (option_id, question_id, code, label_en, label_ar, score_value, sort_order, is_disqualifying, metadata) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_question_options ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_question_weights; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_question_weights DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_question_weights (weight_id, question_id, indicator_id, dimension_id, weight, context, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_question_weights ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_rating_scales; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_rating_scales DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_rating_scales (scale_id, model_id, code, name_en, name_ar, scale_type, levels, min_value, max_value, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_rating_scales ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_recommendations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_recommendations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_recommendations (recommendation_id, assessment_id, domain_id, dimension_id, code, title_en, title_ar, description_en, description_ar, priority, category, effort_level, estimated_days, impact_score, source, status, accepted_by, accepted_at, completed_at, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_recommendations ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_recommendation_mappings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_recommendation_mappings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_recommendation_mappings (mapping_id, recommendation_id, target_type, target_id, mapping_type, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_recommendation_mappings ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_responses; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_responses DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_responses (response_id, qiyas_assessment_id, question_id, respondent_id, answer_value, score, confidence, notes, flagged, flag_reason, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_responses ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_response_attachments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_response_attachments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_response_attachments (attachment_id, response_id, file_name, file_path, file_size_bytes, content_type, content_hash, evidence_id, uploaded_by, uploaded_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_response_attachments ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_response_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_response_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_response_history (history_id, response_id, version, previous_value, new_value, previous_score, new_score, changed_by, change_reason, changed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_response_history ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_score_explanations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_score_explanations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_score_explanations (explanation_id, score_id, entity_type, entity_id, language, summary, details, key_findings, source, generated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_score_explanations ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_score_snapshots; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_score_snapshots DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_score_snapshots (snapshot_id, qiyas_assessment_id, model_id, snapshot_type, overall_score, domain_scores, dimension_scores, gap_summary, maturity_summary, snapshot_date, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_score_snapshots ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_scoring_methods; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_scoring_methods DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_scoring_methods (method_id, model_id, code, name_en, name_ar, method_type, formula, normalization, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_scoring_methods ENABLE TRIGGER ALL;

--
-- Data for Name: qiyas_template_versions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.qiyas_template_versions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.qiyas_template_versions (version_id, template_id, version_number, change_summary, snapshot, published_at, published_by, status, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.qiyas_template_versions ENABLE TRIGGER ALL;

--
-- Data for Name: raci_templates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.raci_templates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.raci_templates (template_id, name_en, name_ar, process_type, version, status, is_default, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.raci_templates ENABLE TRIGGER ALL;

--
-- Data for Name: raci_assignments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.raci_assignments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.raci_assignments (assignment_id, template_id, activity_code, activity_name_en, activity_name_ar, responsible_id, accountable_id, consulted_ids, informed_ids, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.raci_assignments ENABLE TRIGGER ALL;

--
-- Data for Name: raci_matrices; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.raci_matrices DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.raci_matrices (id, tenant_id, entries, roles, generated_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.raci_matrices ENABLE TRIGGER ALL;

--
-- Data for Name: raci_matrix; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.raci_matrix DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.raci_matrix (raci_id, domain_code, process_code, stage_code, activity_code, scope_type, scope_id, responsible_role_codes, accountable_role_codes, consulted_role_codes, informed_role_codes, description_en, description_ar, active, created_at, updated_at, validation_required, sla_hours, escalation_threshold_hours, notification_settings) FROM stdin;
cb02fa06-8a98-46f6-a142-afce45466a2b	EVIDENCE	COLLECTION	INITIATION	REQUEST	workspace	\N	{AUDIT}	{ERM}	{CYBER_GOV,DATA_GOV}	{EXEC_STRATEGY,PMO}	Initiate evidence collection request based on control requirements or audit needs	بدء طلب جمع الأدلة بناءً على متطلبات الضوابط أو احتياجات التدقيق	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	t	96	72	\N
5daf2cc5-4dd2-4f6a-a31e-6df3214dbcd4	EVIDENCE	COLLECTION	GATHERING	COLLECT	workspace	\N	{SVC_OPS,APP_ENG,CLOUD_INFRA}	{CYBER_GOV}	{AUDIT,QUALITY}	{ERM,PMO}	Gather required evidence from systems, processes, and documentation	جمع الأدلة المطلوبة من الأنظمة والعمليات والوثائق	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	t	48	72	\N
40d7d10e-57e9-4925-946c-a15ec80ec4be	EVIDENCE	VALIDATION	TECHNICAL	CONTENT_CHECK	workspace	\N	{CYBER_GOV,DATA_GOV}	{AUDIT}	{QUALITY,ENT_ARCH}	{ERM}	Technical validation of evidence content, format, and completeness	التحقق الفني من محتوى وشكل واكتمال الأدلة	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	t	96	72	\N
7870130f-8fea-448e-997f-ba144657977b	EVIDENCE	VALIDATION	CROSS_TEAM	PEER_REVIEW	workspace	\N	{CYBER_GOV,DATA_GOV,PRIVACY}	{ERM}	{AUDIT,QUALITY}	{EXEC_STRATEGY}	Cross-team validation ensuring evidence meets multi-domain requirements	التحقق عبر الفرق لضمان تلبية الأدلة لمتطلبات متعددة المجالات	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	t	96	72	\N
72508899-77bd-4bed-970f-0ad52f26a697	EVIDENCE	VALIDATION	APPROVAL	FINAL_APPROVAL	workspace	\N	{AUDIT}	{ERM}	{EXEC_STRATEGY}	{ALL_TEAMS}	Final approval of validated evidence for compliance records	الموافقة النهائية على الأدلة المحققة لسجلات الامتثال	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	t	24	72	\N
4a3f3fe4-5507-4b4e-aa9b-20a336ae0649	EVIDENCE	LIFECYCLE	RETENTION	MANAGE	workspace	\N	{DATA_GOV,QUALITY}	{PRIVACY}	{AUDIT,FINANCE}	{ERM}	Manage evidence retention, archival, and disposal per regulatory requirements	إدارة الاحتفاظ بالأدلة والأرشفة والتخلص وفقًا للمتطلبات التنظيمية	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	t	96	72	\N
31e8a709-7893-4609-8cdd-7a63a883d9bf	RISK	ASSESSMENT	IDENTIFICATION	IDENTIFY	workspace	\N	{ERM}	{EXEC_STRATEGY}	{CYBER_GOV,DATA_GOV,BCM_DR,VENDOR_RISK}	{ALL_TEAMS}	Identify and catalog risks across all business domains	تحديد وفهرسة المخاطر عبر جميع مجالات الأعمال	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	72	96	\N
a4b5cc39-6f1d-4e4c-9c74-aa7bbbac52db	RISK	ASSESSMENT	EVALUATION	ASSESS	workspace	\N	{ERM,CYBER_GOV}	{EXEC_STRATEGY}	{AUDIT,BCM_DR}	{PMO,FINANCE}	Evaluate risk likelihood, impact, and calculate risk scores	تقييم احتمالية المخاطر والتأثير وحساب درجات المخاطر	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	72	96	\N
186b9747-ecb5-463a-9b33-186a079c01e0	RISK	MITIGATION	PLANNING	PLAN	workspace	\N	{ERM}	{RISK_OWNER}	{PMO,FINANCE,CYBER_GOV}	{EXEC_STRATEGY,AUDIT}	Develop risk mitigation strategies and action plans	تطوير استراتيجيات تخفيف المخاطر وخطط العمل	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	96	96	\N
5f2698fe-87a2-4c7d-b4da-654c2284f665	RISK	MITIGATION	IMPLEMENTATION	EXECUTE	workspace	\N	{RISK_OWNER,PMO}	{ERM}	{CYBER_GOV,AUDIT}	{EXEC_STRATEGY}	Implement risk mitigation controls and measures	تنفيذ ضوابط وتدابير تخفيف المخاطر	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	96	96	\N
0df9857d-256e-4f8a-83d9-104b88192d91	RISK	MONITORING	CONTINUOUS	MONITOR	workspace	\N	{ERM,SOC_OPS}	{CYBER_GOV}	{AUDIT}	{EXEC_STRATEGY}	Continuous monitoring of risk indicators and control effectiveness	المراقبة المستمرة لمؤشرات المخاطر وفعالية الضوابط	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	96	96	\N
442f1de8-fc3b-4bb1-8e37-f52f0511e141	CONTROL	TESTING	DESIGN	ASSESS_DESIGN	workspace	\N	{AUDIT}	{ERM}	{CYBER_GOV,PROCESS_OWNER}	{QUALITY}	Assess control design effectiveness and suitability	تقييم فعالية ومناسبة تصميم الضوابط	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	t	120	120	\N
8c333329-5943-4eb6-91fe-2e5d81a7854e	CONTROL	TESTING	EXECUTION	TEST_OPERATION	workspace	\N	{AUDIT,PROCESS_OWNER}	{ERM}	{CYBER_GOV,QUALITY}	{EXEC_STRATEGY}	Test control operating effectiveness through sampling and testing	اختبار فعالية تشغيل الضوابط من خلال أخذ العينات والاختبار	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	t	120	120	\N
be8c96ac-bff7-4090-91a6-59faee262559	CONTROL	REMEDIATION	PLANNING	PLAN_FIX	workspace	\N	{PROCESS_OWNER}	{ERM}	{PMO,AUDIT}	{EXEC_STRATEGY}	Plan remediation for failed or ineffective controls	تخطيط المعالجة للضوابط الفاشلة أو غير الفعالة	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	t	96	120	\N
cb6c0dc4-bbd0-4a1f-aab0-298d246e35b2	CONTROL	REMEDIATION	IMPLEMENTATION	IMPLEMENT_FIX	workspace	\N	{PROCESS_OWNER,PMO}	{ERM}	{AUDIT,CYBER_GOV}	{EXEC_STRATEGY}	Implement control remediation and improvements	تنفيذ معالجة وتحسينات الضوابط	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	t	96	120	\N
f99ee147-2520-4ba9-a021-0ad91371f158	POLICY	CREATION	DRAFTING	DRAFT	workspace	\N	{QUALITY,SUBJECT_MATTER_TEAM}	{CYBER_GOV}	{PRIVACY,AUDIT,HR_GOV}	{ERM}	Draft new policies based on regulatory requirements or business needs	صياغة سياسات جديدة بناءً على المتطلبات التنظيمية أو احتياجات العمل	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	240	120	\N
e35b260a-239e-420b-bfa5-02d0d1210445	POLICY	CREATION	REVIEW	LEGAL_REVIEW	workspace	\N	{PRIVACY}	{EXEC_STRATEGY}	{AUDIT,ERM,CYBER_GOV}	{QUALITY}	Legal and compliance review of policy drafts	المراجعة القانونية والامتثال لمسودات السياسات	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	t	240	120	\N
269f9330-b8c9-458d-8c87-bcfda86e4199	POLICY	CREATION	APPROVAL	APPROVE	workspace	\N	{EXEC_STRATEGY}	{CYBER_GOV}	{AUDIT,ERM}	{ALL_TEAMS}	Executive approval of policies before publication	الموافقة التنفيذية على السياسات قبل النشر	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	t	240	120	\N
da651814-476b-4656-bad8-f3746a9e9d7b	POLICY	IMPLEMENTATION	ROLLOUT	DEPLOY	workspace	\N	{QUALITY,HR_GOV}	{POLICY_OWNER}	{PMO,SVC_OPS}	{ALL_TEAMS}	Roll out approved policies with training and awareness	نشر السياسات المعتمدة مع التدريب والتوعية	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	96	120	\N
d7afdf21-c594-4ca0-95bc-686591f89643	POLICY	MONITORING	COMPLIANCE	MONITOR	workspace	\N	{AUDIT,ERM}	{POLICY_OWNER}	{QUALITY}	{EXEC_STRATEGY}	Monitor policy compliance and effectiveness	مراقبة الامتثال للسياسات وفعاليتها	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	96	120	\N
7fe09b9b-b025-4282-9221-db0626289721	INCIDENT	RESPONSE	DETECTION	DETECT	workspace	\N	{SOC_OPS}	{CYBER_GOV}	{SVC_OPS}	{ERM,EXEC_STRATEGY}	Detect and identify security incidents through monitoring	اكتشاف وتحديد الحوادث الأمنية من خلال المراقبة	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	2	4	\N
49385e2c-0f10-48e9-8f73-6432496f2973	INCIDENT	RESPONSE	TRIAGE	ASSESS	workspace	\N	{SOC_OPS,CYBER_GOV}	{CYBER_GOV}	{BCM_DR,PRIVACY}	{ERM,EXEC_STRATEGY}	Triage incidents to determine severity and response requirements	فرز الحوادث لتحديد الخطورة ومتطلبات الاستجابة	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	2	4	\N
f56f6229-38a1-4a9a-8cca-b7dff36fc54c	INCIDENT	RESPONSE	CONTAINMENT	CONTAIN	workspace	\N	{SOC_OPS,CLOUD_INFRA}	{CYBER_GOV}	{APP_ENG,BCM_DR}	{EXEC_STRATEGY,PRIVACY}	Contain incident to prevent further damage or spread	احتواء الحادث لمنع مزيد من الضرر أو الانتشار	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	2	4	\N
29cdaea3-1435-47de-97af-0ac8260ed634	INCIDENT	RESPONSE	RECOVERY	RECOVER	workspace	\N	{BCM_DR,CLOUD_INFRA,APP_ENG}	{CYBER_GOV}	{SOC_OPS,SVC_OPS}	{EXEC_STRATEGY,ERM}	Recover systems and services to normal operations	استعادة الأنظمة والخدمات إلى العمليات الطبيعية	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	2	4	\N
c80607df-222d-4944-9a6d-093cc408c334	AUDIT	EXECUTION	PLANNING	PLAN	workspace	\N	{AUDIT}	{AUDIT}	{ERM,CYBER_GOV}	{EXEC_STRATEGY,PROCESS_OWNERS}	Plan audit scope, objectives, and resource allocation	تخطيط نطاق التدقيق والأهداف وتخصيص الموارد	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	t	96	120	\N
960be7c6-9308-42ce-a604-50d8a4b42b07	AUDIT	EXECUTION	FIELDWORK	EXECUTE	workspace	\N	{AUDIT}	{AUDIT}	{PROCESS_OWNERS}	{ERM,CYBER_GOV}	Execute audit fieldwork including testing and evidence collection	تنفيذ العمل الميداني للتدقيق بما في ذلك الاختبار وجمع الأدلة	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	t	96	120	\N
8686ad7a-e299-4508-afb6-271af180bb91	AUDIT	EXECUTION	REPORTING	REPORT	workspace	\N	{AUDIT}	{AUDIT}	{ERM,PROCESS_OWNERS}	{EXEC_STRATEGY,CYBER_GOV}	Prepare and issue audit reports with findings and recommendations	إعداد وإصدار تقارير التدقيق مع النتائج والتوصيات	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	t	96	120	\N
898be480-9fad-4e4f-9433-6c4124ab1763	AUDIT	REMEDIATION	ACTION	REMEDIATE	workspace	\N	{PROCESS_OWNERS,PMO}	{ERM}	{AUDIT}	{EXEC_STRATEGY}	Remediate audit findings through corrective actions	معالجة نتائج التدقيق من خلال الإجراءات التصحيحية	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	t	96	120	\N
ce37e77f-43f2-4f00-8e83-5b7dd69bf9c4	VENDOR	RISK	ASSESSMENT	ASSESS	workspace	\N	{VENDOR_RISK}	{VENDOR_RISK}	{CYBER_GOV,PRIVACY,FINANCE}	{ERM}	Assess vendor risks through due diligence and questionnaires	تقييم مخاطر الموردين من خلال العناية الواجبة والاستبيانات	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	96	120	\N
5c215620-ade0-462b-b00c-13a96cd2155b	VENDOR	ONBOARDING	APPROVAL	ONBOARD	workspace	\N	{VENDOR_RISK,FINANCE}	{VENDOR_RISK}	{CYBER_GOV,PRIVACY,HR_GOV}	{ERM,EXEC_STRATEGY}	Onboard approved vendors with appropriate controls	إدخال الموردين المعتمدين مع الضوابط المناسبة	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	t	96	120	\N
99726a41-cbbb-4a78-898a-8e9e68b231f2	VENDOR	MONITORING	CONTINUOUS	MONITOR	workspace	\N	{VENDOR_RISK}	{VENDOR_RISK}	{CYBER_GOV,SVC_OPS}	{ERM,FINANCE}	Continuous monitoring of vendor performance and risks	المراقبة المستمرة لأداء الموردين والمخاطر	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	96	120	\N
ae591c7d-0ae9-4a99-865f-2886b59cfc98	DATA	GOVERNANCE	CLASSIFICATION	CLASSIFY	workspace	\N	{DATA_GOV}	{DATA_GOV}	{PRIVACY,CYBER_GOV}	{ALL_DATA_OWNERS}	Classify data according to sensitivity and regulatory requirements	تصنيف البيانات وفقًا للحساسية والمتطلبات التنظيمية	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	96	120	\N
2e18ec3d-5f2a-47f1-9225-4eae197dda09	DATA	PROTECTION	IMPLEMENTATION	PROTECT	workspace	\N	{DATA_GOV,CYBER_GOV}	{DATA_GOV}	{PRIVACY,CLOUD_INFRA}	{ERM,AUDIT}	Implement data protection controls based on classification	تنفيذ ضوابط حماية البيانات بناءً على التصنيف	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	96	120	\N
71535f32-9248-4f95-a8ce-c82e0bcb93a1	DATA	LIFECYCLE	RETENTION	RETAIN	workspace	\N	{DATA_GOV,QUALITY}	{PRIVACY}	{FINANCE,AUDIT}	{ERM}	Manage data retention and disposal per regulatory requirements	إدارة الاحتفاظ بالبيانات والتخلص منها وفقًا للمتطلبات التنظيمية	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	96	120	\N
487b2c5f-e271-4a13-ae3c-90f14d1f8abb	BCM	PLANNING	DEVELOPMENT	PLAN	workspace	\N	{BCM_DR}	{BCM_DR}	{ERM,CLOUD_INFRA,SVC_OPS}	{EXEC_STRATEGY,ALL_TEAMS}	Develop business continuity plans and procedures	تطوير خطط وإجراءات استمرارية الأعمال	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	96	120	\N
90c0ed90-cf26-4c0a-a601-5a339215b444	BCM	TESTING	EXECUTION	TEST	workspace	\N	{BCM_DR,CLOUD_INFRA}	{BCM_DR}	{SVC_OPS,APP_ENG}	{ERM,EXEC_STRATEGY}	Execute disaster recovery tests and simulations	تنفيذ اختبارات ومحاكاة التعافي من الكوارث	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	96	120	\N
f9bb6c05-24ef-467d-bcfb-755c22f316a2	BCM	CRISIS	RESPONSE	MANAGE	workspace	\N	{BCM_DR,EXEC_STRATEGY}	{EXEC_STRATEGY}	{CYBER_GOV,ERM,PRIVACY}	{ALL_TEAMS}	Manage crisis response and communication	إدارة الاستجابة للأزمات والتواصل	t	2026-03-17 08:24:21.643367+08	2026-03-17 08:24:21.643367+08	f	96	120	\N
83b1c98b-ac98-4e8a-9d4a-0cdabdbae9fb	governance	committee_oversight	scheduling	schedule_meeting	process	\N	{governance_manager}	{executive_owner}	{compliance_analyst}	{analytics_viewer}	\N	\N	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08	f	\N	\N	\N
edbed885-dc0c-48fd-8e85-f93ab399d26a	governance	procedure_management	review	review_procedure	process	\N	{governance_manager}	{policy_approver}	{compliance_analyst}	{auditor}	\N	\N	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08	f	\N	\N	\N
e1656d5d-74ff-4047-85b1-805696cf22b3	governance	mandate_management	renewal	renew_mandate	process	\N	{governance_manager}	{executive_owner}	{compliance_analyst}	{analytics_viewer}	\N	\N	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08	f	\N	\N	\N
6886a5bc-6bfd-4413-9df0-a8c99b86b102	governance	enforcement	remediation	enforce_action	process	\N	{compliance_analyst}	{governance_manager}	{risk_owner}	{auditor}	\N	\N	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08	f	\N	\N	\N
099df86b-86da-4d07-b568-54e6b7ce35fa	governance	action_tracking	followup	track_action	process	\N	{governance_manager}	{compliance_analyst}	{risk_owner}	{analytics_viewer}	\N	\N	t	2026-03-17 08:24:23.742085+08	2026-03-17 08:24:23.742085+08	f	\N	\N	\N
\.


ALTER TABLE __TENANT_SCHEMA__.raci_matrix ENABLE TRIGGER ALL;

--
-- Data for Name: rcsa_campaigns; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.rcsa_campaigns DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.rcsa_campaigns (campaign_id, name, type, status, assessor_ids, risk_ids, control_ids, due_date, scoring_template, created_at, created_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.rcsa_campaigns ENABLE TRIGGER ALL;

--
-- Data for Name: rcsa_responses; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.rcsa_responses DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.rcsa_responses (response_id, campaign_id, assessor_id, risk_id, status, inherent_likelihood, inherent_impact, control_design_effectiveness, control_operating_effectiveness, residual_likelihood, residual_impact, comments, evidence_ids, submitted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.rcsa_responses ENABLE TRIGGER ALL;

--
-- Data for Name: red_team_runs; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.red_team_runs DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.red_team_runs (run_id, model_id, canary_prompt, result, vulnerability_type, severity, incident_id, executed_at, retest_scheduled_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.red_team_runs ENABLE TRIGGER ALL;

--
-- Data for Name: reference_categories; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.reference_categories DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.reference_categories (category_id, category_type, code, name_en, name_ar, description, status, display_order, usage_count, metadata, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.reference_categories ENABLE TRIGGER ALL;

--
-- Data for Name: regulatory_audit_requirements; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.regulatory_audit_requirements DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.regulatory_audit_requirements (id, tenant_id, framework_code, requirement_ref, description, frequency, last_completed_at, next_due_at, responsible_team_id, status, audit_id, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.regulatory_audit_requirements ENABLE TRIGGER ALL;

--
-- Data for Name: regulatory_change_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.regulatory_change_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.regulatory_change_log (change_id, framework_code, from_version, to_version, change_type, effective_date, affected_controls, summary, impact_assessed, impacted_tenants, published_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.regulatory_change_log ENABLE TRIGGER ALL;

--
-- Data for Name: regulatory_changes; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.regulatory_changes DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.regulatory_changes (change_id, regulator_id, framework_code, regulation_name, change_type, change_summary, change_details, impact_level, affected_domains, affected_controls, affected_teams, published_date, effective_date, compliance_deadline, grace_period_days, response_status, response_plan, implementation_tasks, source_url, source_document_id, detected_by, detected_at, created_at, status, severity, impact_assessment, owner_user_id, owner_team_id, department_id, business_unit_id) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.regulatory_changes ENABLE TRIGGER ALL;

--
-- Data for Name: regulatory_sla_requirements; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.regulatory_sla_requirements DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.regulatory_sla_requirements (sla_requirement_id, regulator_id, framework_code, control_id, requirement_name, process_type, required_sla_hours, required_sla_description, escalation_required, escalation_levels, penalties_for_breach, applicable_sectors, effective_date, expiry_date, source_regulation, source_article, created_at, updated_at) FROM stdin;
7763d1c5-c499-4e67-aa8f-10db6a0bc85c	SAMA	SAMA-CSF	\N	Cybersecurity Incident Reporting	incident_reporting	2	Report cybersecurity incidents to SAMA within 2 hours of detection	t	3	{"severe": "license_review", "repeated": "fine_up_to_5m_sar", "first_breach": "warning"}	{K,K64,K65}	2020-01-01	\N	SAMA Cyber Security Framework	Article 3.2.1 - Incident Reporting	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
3ad3f47d-9c9a-41ab-a60d-03b88ffc1fa2	SAMA	SAMA-CSF	\N	Vulnerability Remediation - Critical	vulnerability_remediation	24	Critical vulnerabilities must be remediated within 24 hours	t	2	{"breach": "increased_oversight", "repeated": "mandatory_audit"}	{K,K64,K65}	2020-01-01	\N	SAMA Cyber Security Framework	Article 2.3.4 - Vulnerability Management	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
35221d46-544d-4a00-b56b-3ca82f2580c8	NCA	NCA-ECC	\N	Security Breach Notification	breach_notification	72	Notify NCA of security breaches within 72 hours	t	2	{"repeated": "fine_percentage_revenue", "concealment": "criminal_liability", "first_breach": "warning"}	{ALL}	2018-11-01	\N	NCA Essential Cybersecurity Controls	ECC-1:2018 Requirement 2-8-3	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
15e440d4-26be-4097-b58e-23f963e7d42d	NCA	NCA-ECC	\N	Access Review Completion	access_review	720	Complete user access reviews within 30 days of initiation	t	2	{"breach": "compliance_notice", "repeated": "mandatory_improvement_plan"}	{ALL}	2018-11-01	\N	NCA Essential Cybersecurity Controls	ECC-1:2018 Requirement 2-4-1	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
de6309cd-9307-4849-a4cc-c62e920c4bf1	SDAIA	PDPL	\N	Personal Data Breach Notification	data_breach_notification	72	Notify SDAIA and affected individuals within 72 hours of personal data breach	t	3	{"severe": "fine_up_to_5m_sar", "willful": "criminal_prosecution", "first_breach": "warning_fine_up_to_1m"}	{ALL}	2023-09-14	\N	Personal Data Protection Law	Article 42 - Breach Notification	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
e95b7ae3-afcb-484b-94b1-8cee238291b3	SDAIA	PDPL	\N	Data Subject Request Response	dsr_response	720	Respond to data subject requests within 30 days	t	2	{"breach": "fine_up_to_500k", "repeated": "fine_up_to_1m_sar"}	{ALL}	2023-09-14	\N	Personal Data Protection Law	Article 11 - Data Subject Rights	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
d934813e-6ffa-4613-b130-9710b08e2f1a	ZATCA	E-INVOICING	\N	E-Invoice Submission	invoice_submission	24	Submit e-invoices to ZATCA within 24 hours	t	2	{"fraud": "criminal_charges", "breach": "fine_percentage_invoice", "repeated": "suspension"}	{ALL}	2021-12-04	\N	E-Invoicing Regulation Phase 2	Article 5.2 - Submission Requirements	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
8ea8114a-1970-43d0-8341-e3c6c7e0ffbc	ZATCA	TAX	\N	VAT Return Filing	tax_filing	720	File VAT returns within 30 days of period end	t	2	{"non_filing": "penalty_up_to_50_percent", "late_filing": "penalty_5_to_25_percent"}	{ALL}	2018-01-01	\N	VAT Implementing Regulations	Article 67 - Filing Deadlines	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
e8fc7d88-2416-4595-baf6-c9d4e1992f79	CMA	CMA-CGR	\N	Material Event Disclosure	material_disclosure	2	Disclose material events within 2 hours during trading	t	3	{"breach": "public_warning", "repeated": "trading_suspension", "insider_trading": "criminal_prosecution"}	{K}	2017-01-01	\N	Corporate Governance Regulations	Article 89 - Disclosure Policy	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
289ffcb7-c9bb-42f5-939a-d36f19e2de4c	MHRSD	LABOR-LAW	\N	Work Injury Reporting	injury_reporting	24	Report work injuries to MHRSD within 24 hours	t	2	{"breach": "fine_up_to_10k_sar", "repeated": "increased_inspections", "serious_injury_unreported": "criminal_liability"}	{ALL}	2020-01-01	\N	Saudi Labor Law	Article 142 - Injury Reporting	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
\.


ALTER TABLE __TENANT_SCHEMA__.regulatory_sla_requirements ENABLE TRIGGER ALL;

--
-- Data for Name: remediation_plans; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.remediation_plans DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.remediation_plans (plan_id, finding_id, title, description, owner_id, target_date, status, priority, approach, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.remediation_plans ENABLE TRIGGER ALL;

--
-- Data for Name: remediation_tasks; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.remediation_tasks DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.remediation_tasks (task_id, title, description, linked_entity_type, linked_entity_id, assigned_to, created_by, status, priority, due_date, completed_at, root_cause_analysis, created_at, deleted_at, workspace_id, lifecycle_phase) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.remediation_tasks ENABLE TRIGGER ALL;

--
-- Data for Name: remediation_tracking; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.remediation_tracking DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.remediation_tracking (tracking_id, action_item_id, milestone_number, milestone_title, milestone_description, responsible_team_id, responsible_user_id, target_date, revised_date, completed_date, completion_percentage, completion_evidence, blockers, blocker_resolution, status, verification_status, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.remediation_tracking ENABLE TRIGGER ALL;

--
-- Data for Name: repeat_findings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.repeat_findings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.repeat_findings (repeat_id, original_finding_id, current_finding_id, recurrence_count, root_cause_same, escalation_required, notes, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.repeat_findings ENABLE TRIGGER ALL;

--
-- Data for Name: report_schedules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.report_schedules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.report_schedules (schedule_id, report_type, parameters, cron_expression, enabled, subscribers, last_run_at, created_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.report_schedules ENABLE TRIGGER ALL;

--
-- Data for Name: report_shares; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.report_shares DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.report_shares (share_id, report_id, shared_by, recipient_id, recipient_type, shared_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.report_shares ENABLE TRIGGER ALL;

--
-- Data for Name: report_templates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.report_templates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.report_templates (template_id, name, key, description, category, parameters_schema, is_active, created_at) FROM stdin;
ff0025e4-360f-4b80-b8c4-14ab565f0388	Risk Posture Report	risk_posture	Distribution, trends, and owner analysis of organizational risks	risk	{"language": "language", "dateRange": "date_range"}	t	2026-03-17 08:24:18.532747+08
6f77948e-7397-4e6c-8455-3e655e083926	Audit Readiness Report	audit_readiness	Control, evidence, and finding analysis with readiness score	audit	{"language": "language", "frameworkId": "framework_filter"}	t	2026-03-17 08:24:18.532747+08
847f957b-9806-4d20-ab1d-2bfe10356a9c	Vendor Risk Summary	vendor_risk_summary	Vendor tier distribution, expiring contracts, overdue assessments	vendor	{"language": "language"}	t	2026-03-17 08:24:18.532747+08
096ebe15-7e60-402c-9f3b-8a8780708970	Incident Trend Report	incident_trend	Severity and category breakdown with monthly trends	incident	{"language": "language", "dateRange": "date_range"}	t	2026-03-17 08:24:18.532747+08
0a02614c-c9f2-49e0-a44d-f35fb1426da1	Evidence Coverage Report	evidence_coverage	Coverage matrix, verification status, and gap analysis	evidence	{"language": "language", "frameworkId": "framework_filter"}	t	2026-03-17 08:24:18.532747+08
ff5736bb-6dab-4798-8bc7-43774dc05422	Maturity Assessment Report	maturity_assessment	Domain-specific maturity scores with recommendations	maturity	{"language": "language"}	t	2026-03-17 08:24:18.532747+08
ff4395c5-2a35-4bc6-bd95-b549e8d983b6	Executive Summary	executive_summary	Cross-domain KPI aggregation with health score (bilingual)	executive	{"dateRange": "date_range"}	t	2026-03-17 08:24:18.532747+08
ed78b6a5-c061-4ad5-9c10-a12e680d1d9f	Regulatory Change Impact	regulatory_change_impact	Framework-specific gap analysis for regulatory changes	regulatory	{"language": "language", "frameworkId": "framework_filter"}	t	2026-03-17 08:24:18.532747+08
9f583cf7-6e9e-4e39-a97f-2a8a0ffd17f5	KPI Trend Report	kpi_trend	Time-series trend analysis with period comparison	analytics	{"language": "language", "dateRange": "date_range"}	t	2026-03-17 08:24:18.532747+08
2d8b3733-3897-4bc3-89f2-15307706dded	Remediation Progress Report	remediation_progress	Task completion tracking with assignee breakdown	remediation	{"language": "language", "dateRange": "date_range"}	t	2026-03-17 08:24:18.532747+08
\.


ALTER TABLE __TENANT_SCHEMA__.report_templates ENABLE TRIGGER ALL;

--
-- Data for Name: reports; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.reports DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.reports (report_id, title, type, parameters, content, format, language, status, file_path, generated_by, generated_at, deleted_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.reports ENABLE TRIGGER ALL;

--
-- Data for Name: responsibilities; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.responsibilities DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.responsibilities (responsibility_id, code, name_en, name_ar, description_en, description_ar, category, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.responsibilities ENABLE TRIGGER ALL;

--
-- Data for Name: responsibility_assignments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.responsibility_assignments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.responsibility_assignments (assignment_id, responsibility_id, assignee_type, assignee_id, scope_type, scope_id, is_primary, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.responsibility_assignments ENABLE TRIGGER ALL;

--
-- Data for Name: responsibility_suggestions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.responsibility_suggestions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.responsibility_suggestions (suggestion_id, session_id, user_id, module_code, scope_type, scope_id, responsibility_type, confidence, reason_en, reason_ar, status, resolved_by, resolved_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.responsibility_suggestions ENABLE TRIGGER ALL;

--
-- Data for Name: retention_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.retention_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.retention_rules (rule_id, classification_id, entity_type, retention_period_days, action_after_expiry, legal_hold_override, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.retention_rules ENABLE TRIGGER ALL;

--
-- Data for Name: risk_acceptance_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_acceptance_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_acceptance_log (acceptance_id, risk_id, residual_score, appetite_threshold, breach_amount, reason, requested_by, requested_at, decision, decided_by, decided_at, decision_comments, expiry_date, status) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_acceptance_log ENABLE TRIGGER ALL;

--
-- Data for Name: risk_appetite_config; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_appetite_config DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_appetite_config (config_id, workspace_id, appetite_name, overall_score, thresholds, by_domain, approved_by, approved_at, review_cycle, next_review, status, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_appetite_config ENABLE TRIGGER ALL;

--
-- Data for Name: risk_assessments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_assessments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_assessments (assessment_id, risk_id, assessment_type, assessor_id, assessed_at, inherent_likelihood, inherent_impact, inherent_score, residual_likelihood, residual_impact, residual_score, methodology, notes, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_assessments ENABLE TRIGGER ALL;

--
-- Data for Name: risk_categories; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_categories DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_categories (category_id, code, name_en, name_ar, description, parent_category_id, display_order, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_categories ENABLE TRIGGER ALL;

--
-- Data for Name: risk_dependencies; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_dependencies DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_dependencies (dependency_id, risk_id, dependent_risk_id, dependency_type, description, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_dependencies ENABLE TRIGGER ALL;

--
-- Data for Name: risk_escalation_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_escalation_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_escalation_log (escalation_id, risk_id, escalated_by, escalated_to, reason, status, escalated_at, resolved_at, resolution_notes) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_escalation_log ENABLE TRIGGER ALL;

--
-- Data for Name: risk_fair_assessments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_fair_assessments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_fair_assessments (assessment_id, risk_id, workspace_id, assessor_id, tef_min, tef_likely, tef_max, vulnerability_pct, plm_min, plm_likely, plm_max, slm_min, slm_likely, slm_max, currency, annualised_loss_expectancy, risk_percentile_90, risk_percentile_99, confidence_interval, notes, status, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_fair_assessments ENABLE TRIGGER ALL;

--
-- Data for Name: risk_taxonomy; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_taxonomy DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_taxonomy (taxonomy_id, name_en, name_ar, version, status, is_default, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_taxonomy ENABLE TRIGGER ALL;

--
-- Data for Name: risk_impact_scales; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_impact_scales DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_impact_scales (scale_id, taxonomy_id, level, label_en, label_ar, description, monetary_range_min, monetary_range_max, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_impact_scales ENABLE TRIGGER ALL;

--
-- Data for Name: risk_likelihood_scales; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_likelihood_scales DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_likelihood_scales (scale_id, taxonomy_id, level, label_en, label_ar, description, frequency_description, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_likelihood_scales ENABLE TRIGGER ALL;

--
-- Data for Name: risk_owners; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_owners DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_owners (owner_id, risk_id, user_id, ownership_type, assigned_at, is_primary, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_owners ENABLE TRIGGER ALL;

--
-- Data for Name: risk_review_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_review_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_review_log (review_id, risk_id, reviewer, review_date, outcome, previous_score, new_score, notes, next_review_date) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_review_log ENABLE TRIGGER ALL;

--
-- Data for Name: risk_scenarios; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_scenarios DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_scenarios (scenario_id, risk_id, scenario_name, baseline_score, scenario_score, assumptions, mc_mean_loss, mc_p95_loss, created_at, created_by, deleted_at, deleted_by, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_scenarios ENABLE TRIGGER ALL;

--
-- Data for Name: risk_scoring_models; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_scoring_models DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_scoring_models (model_id, name_en, name_ar, dimensions, thresholds, formula, zone_definitions, created_at, deleted_at, deleted_by, updated_at) FROM stdin;
default-5x5	Standard 5×5 Risk Matrix	مصفوفة المخاطر القياسية 5×5	[{"key": "likelihood", "label": "Likelihood", "scale": 5, "weight": 50}, {"key": "impact", "label": "Impact", "scale": 5, "weight": 50}]	{"low": {"max": 6}, "high": {"max": 19, "min": 13}, "medium": {"max": 12, "min": 7}, "critical": {"min": 20}}	multiply	{"red": "Critical — immediate escalation", "green": "Low risk — monitor", "orange": "High risk — treat urgently", "yellow": "Medium risk — mitigate"}	2026-03-17 08:24:21.759458+08	\N	\N	2026-03-17 08:24:24.035552+08
\.


ALTER TABLE __TENANT_SCHEMA__.risk_scoring_models ENABLE TRIGGER ALL;

--
-- Data for Name: risk_sector_applicability; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_sector_applicability DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_sector_applicability (id, risk_id, sector_code, applicability, sector_impact, regulatory_req, notes, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_sector_applicability ENABLE TRIGGER ALL;

--
-- Data for Name: risk_status_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_status_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_status_history (history_id, risk_id, previous_status, new_status, previous_score, new_score, changed_by, reason, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_status_history ENABLE TRIGGER ALL;

--
-- Data for Name: risk_team_distribution; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_team_distribution DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_team_distribution (distribution_id, team_code, risk_domain, framework_refs, raci_role, notes, created_at) FROM stdin;
b8c75c9d-5747-4112-bfa4-854e8972f701	ERM	risk_identification	{ISO31000-6.4,NIST-CSF.ID.RA}	responsible	\N	2026-03-17 08:24:23.022676+08
15926f25-b6d9-455b-9a1f-e69a54c25bde	ERM	risk_assessment	{ISO31000-6.4.2,COSO-ERM}	responsible	\N	2026-03-17 08:24:23.022676+08
ef604481-9912-48a8-b1c2-a09ba2a8c538	ERM	risk_treatment	{ISO31000-6.5,NIST-CSF.RS}	responsible	\N	2026-03-17 08:24:23.022676+08
c0ae834c-8c1d-4425-a520-44c4e6443861	ERM	risk_monitoring	{ISO31000-6.6,NIST-CSF.DE}	responsible	\N	2026-03-17 08:24:23.022676+08
70bd550f-842a-4561-b2d3-6bb436fd2826	ERM	risk_appetite	{ISO31000-6.3,COSO-ERM}	responsible	\N	2026-03-17 08:24:23.022676+08
f1ecbbe0-bb37-4138-8eb6-b591ef82c0ac	ERM	emerging_risks	{ISO31000,COSO-ERM}	responsible	\N	2026-03-17 08:24:23.022676+08
01094db3-91e0-49a1-a4b1-f4f04da9c3e7	ERM	kri_management	{ISO31000-6.6,NIST-CSF.DE.CM}	responsible	\N	2026-03-17 08:24:23.022676+08
b4544b87-e790-49c1-972b-c4ce31764fb6	ERM	loss_events	{ISO31000,COSO-ERM}	responsible	\N	2026-03-17 08:24:23.022676+08
2ce5d871-8df4-434f-8229-47d9df59d208	EXEC_STRATEGY	risk_appetite	{ISO31000-6.3,COSO-ERM}	accountable	\N	2026-03-17 08:24:23.022676+08
a632f5df-53cf-44e1-aafb-d0a0e506c058	EXEC_STRATEGY	risk_oversight	{ISO31000,COSO-ERM}	accountable	\N	2026-03-17 08:24:23.022676+08
dbcf776c-4109-452f-b676-714891b213ab	EXEC_STRATEGY	emerging_risks	{ISO31000,COSO-ERM}	informed	\N	2026-03-17 08:24:23.022676+08
da86878f-499b-403c-bbd9-feab3cd6d215	CYBER_GOV	cyber_risk_assessment	{NCA-ECC-2,ISO27001-A12}	responsible	\N	2026-03-17 08:24:23.022676+08
c82fb838-54e9-43cb-b28b-8756b12f33f8	CYBER_GOV	threat_risk_management	{NCA-ECC-2.6,NIST-CSF.ID.RA}	responsible	\N	2026-03-17 08:24:23.022676+08
c142f21a-c473-4f93-998e-8c957721e880	SOC_OPS	threat_risk_monitoring	{NIST-CSF.DE,NCA-ECC-2.6}	responsible	\N	2026-03-17 08:24:23.022676+08
d70a2807-d646-49e2-a34f-2812fb295995	SOC_OPS	incident_risk_impact	{ISO27001-A16,NCA-ECC-2.7}	responsible	\N	2026-03-17 08:24:23.022676+08
feac4aa7-c76e-40ca-84ed-c254cd0726ac	PRIVACY	data_privacy_risk	{PDPL-Art29,ISO27701-7.4}	responsible	\N	2026-03-17 08:24:23.022676+08
a9fe0cad-8235-4d08-89be-562345c40a53	PRIVACY	pdpl_violation_risk	{PDPL,ISO27701}	responsible	\N	2026-03-17 08:24:23.022676+08
260269b2-2afb-44e1-aa51-5e135fb3c202	BCM_DR	continuity_risk	{ISO22301-8,NCA-ECC-3.1}	responsible	\N	2026-03-17 08:24:23.022676+08
02457816-cfe5-4eca-86b5-54d7bd7d637a	BCM_DR	disaster_risk	{ISO22301-8.5,NIST-CSF.RC}	responsible	\N	2026-03-17 08:24:23.022676+08
84d27a11-a83d-4e32-b969-dbc3274fd3e1	VENDOR_RISK	third_party_risk	{ISO27001-A15,NCA-ECC-3.3}	responsible	\N	2026-03-17 08:24:23.022676+08
16d238b4-14db-44da-abe9-8ec6339bc4ea	VENDOR_RISK	concentration_risk	{ISO27001-A15,NCA-ECC-3.3}	responsible	\N	2026-03-17 08:24:23.022676+08
89567d37-3093-4e20-8614-6649cd21c422	FINANCE	financial_risk	{COSO-IC,SOX}	responsible	\N	2026-03-17 08:24:23.022676+08
badd7002-65f4-4e6d-9ab9-fca475327648	FINANCE	fraud_risk	{COSO-IC,ISO37001}	responsible	\N	2026-03-17 08:24:23.022676+08
477245fa-b2c9-47de-9adb-f239fa189a63	AUDIT	audit_risk_assessment	{IIA-IPPF-2010,ISO27001-A18}	responsible	\N	2026-03-17 08:24:23.022676+08
f9fe4775-aca0-415c-a705-115718630cfd	AUDIT	residual_risk_validation	{IIA-IPPF-2400,NIST-CSF}	responsible	\N	2026-03-17 08:24:23.022676+08
1e6cc302-b8e2-4abc-8c4f-c99ec4e11854	DATA_GOV	data_classification_risk	{ISO27001-A8.2,PDPL-Art9}	responsible	\N	2026-03-17 08:24:23.022676+08
a519d238-4e7d-47c4-87e0-5f374838f361	CLOUD_INFRA	cloud_infrastructure_risk	{ISO27001-A12,CSA-CCM}	responsible	\N	2026-03-17 08:24:23.022676+08
6c11d629-0f0b-4eb2-8ee2-13ecef263e0a	APP_ENG	application_security_risk	{ISO27001-A14,OWASP}	responsible	\N	2026-03-17 08:24:23.022676+08
ccfbdedd-f809-4d7f-af30-ae2ce624af48	HR_GOV	insider_threat_risk	{ISO27001-A7,NCA-ECC-1.3}	responsible	\N	2026-03-17 08:24:23.022676+08
647ff76e-87fa-45a5-9bc8-2789fdd56b8d	QUALITY	quality_assurance_risk	{ISO9001,ISO27001-A10}	responsible	\N	2026-03-17 08:24:23.022676+08
\.


ALTER TABLE __TENANT_SCHEMA__.risk_team_distribution ENABLE TRIGGER ALL;

--
-- Data for Name: risk_tolerance_bands; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_tolerance_bands DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_tolerance_bands (band_id, category, appetite_threshold, tolerance_upper, tolerance_lower, escalation_trigger, review_cadence_days, active, updated_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_tolerance_bands ENABLE TRIGGER ALL;

--
-- Data for Name: risk_treatments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_treatments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_treatments (treatment_id, risk_id, title, description, strategy, owner, status, target_date, expected_reduction, actual_reduction, target_residual_score, validated_by, validated_at, validation_evidence_id, validation_notes, created_at, updated_at, cost_estimate, benefit_estimate, roi_percentage, implementation_effort, annual_recurring_cost, deleted_at, deleted_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_treatments ENABLE TRIGGER ALL;

--
-- Data for Name: risk_treatment_actions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_treatment_actions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_treatment_actions (action_id, treatment_id, title, description, assigned_to, due_date, status, priority, completion_percent, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_treatment_actions ENABLE TRIGGER ALL;

--
-- Data for Name: risk_velocity_scales; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.risk_velocity_scales DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.risk_velocity_scales (scale_id, taxonomy_id, level, label_en, label_ar, description, time_to_impact, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.risk_velocity_scales ENABLE TRIGGER ALL;

--
-- Data for Name: role_assignment_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.role_assignment_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.role_assignment_history (id, user_id, role_code, role_name, action, assigned_by, revoked_by, reason, valid_from, valid_to, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.role_assignment_history ENABLE TRIGGER ALL;

--
-- Data for Name: role_defense_line_mappings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.role_defense_line_mappings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.role_defense_line_mappings (role_code, defense_line, is_primary) FROM stdin;
admin	1	t
owner	1	t
executive_owner	1	t
grc_manager	1	t
compliance_officer	2	t
risk_manager	2	t
auditor	3	t
\.


ALTER TABLE __TENANT_SCHEMA__.role_defense_line_mappings ENABLE TRIGGER ALL;

--
-- Data for Name: role_function_map; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.role_function_map DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.role_function_map (role_id, function_code, can_author, can_approve, is_responsible, is_accountable, is_consulted, is_informed, enabled, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.role_function_map ENABLE TRIGGER ALL;

--
-- Data for Name: role_function_scope_map; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.role_function_scope_map DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.role_function_scope_map (scope_map_id, role_id, function_code, scope_type, scope_id, enabled, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.role_function_scope_map ENABLE TRIGGER ALL;

--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.role_permissions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.role_permissions (functional_role_id, permission_id) FROM stdin;
2	2
2	3
2	4
2	8
2	9
1	1
1	2
1	3
3	2
3	5
4	2
4	6
4	7
5	2
5	9
6	10
6	11
6	12
7	10
7	13
8	10
8	15
8	17
9	10
9	11
9	12
9	14
9	15
9	16
9	17
10	18
10	19
10	20
11	19
11	21
12	19
12	22
12	23
13	19
13	20
13	23
13	24
14	26
14	27
14	30
15	27
15	28
16	27
16	29
16	31
17	27
17	33
17	34
17	35
17	38
18	27
18	32
18	33
18	34
18	35
18	37
18	38
18	39
19	33
19	36
21	40
21	41
21	42
22	41
22	43
23	41
23	44
24	46
24	47
25	47
25	48
26	47
26	49
27	50
27	51
27	52
27	53
27	54
31	2
31	6
31	10
31	33
31	39
31	51
31	68
31	69
32	55
32	56
32	57
33	56
33	57
33	58
34	59
34	60
34	61
34	62
36	63
36	64
36	65
38	2
38	10
38	26
39	67
39	68
39	69
40	68
20	40
20	41
28	51
28	54
29	51
29	52
30	51
30	53
35	60
35	61
37	64
37	65
37	66
38	70
38	71
38	72
38	73
21	81
32	82
32	83
41	75
41	76
42	76
42	77
42	78
42	79
42	80
43	75
43	76
43	77
43	78
43	79
43	80
34	84
27	85
27	86
27	87
27	88
27	89
27	90
27	91
27	92
27	93
27	94
28	88
28	91
28	92
29	88
29	92
30	88
30	92
31	85
31	88
31	92
44	95
44	96
44	97
44	98
44	99
44	100
44	101
45	96
46	102
46	103
46	104
46	105
47	103
47	104
38	103
38	104
48	107
48	108
48	109
48	110
48	111
48	112
48	113
49	108
49	111
49	112
50	114
50	115
50	116
50	117
50	118
50	119
50	120
50	121
51	115
51	118
51	119
52	126
52	127
52	128
52	130
52	132
53	126
53	127
53	128
53	129
53	130
53	131
53	132
53	133
54	150
54	152
55	150
55	151
55	152
55	153
56	136
56	137
56	138
56	139
57	140
57	141
57	142
57	143
58	157
58	158
58	159
59	163
59	165
59	167
59	169
60	163
60	164
60	165
60	166
60	167
60	168
60	169
60	170
27	108
27	112
27	134
27	140
27	141
27	142
27	150
27	152
9	134
9	140
9	141
9	150
9	152
18	134
18	150
18	152
31	134
31	135
31	150
31	152
31	153
60	174
60	177
60	178
60	179
60	180
60	181
60	182
60	183
60	184
60	185
60	186
60	187
60	188
59	177
59	179
59	181
59	183
59	185
59	187
27	189
27	190
30	189
30	190
52	199
52	200
53	199
53	200
9	185
9	191
9	192
8	185
8	191
54	201
55	201
55	202
49	203
49	204
48	203
48	204
48	206
52	207
52	208
54	210
55	210
55	211
57	212
57	213
57	214
50	218
50	219
50	220
51	218
51	222
\.


ALTER TABLE __TENANT_SCHEMA__.role_permissions ENABLE TRIGGER ALL;

--
-- Data for Name: roles; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.roles DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.roles (role_id, role_code, name_en, name_ar, description_en, description_ar, role_category, is_system, active, sort_order, created_at, updated_at, nca_role_alignment, regulatory_mandated, sod_conflict_roles, max_combined_risk, defense_line) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.roles ENABLE TRIGGER ALL;

--
-- Data for Name: role_permissions_legacy; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.role_permissions_legacy DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.role_permissions_legacy (role_permission_id, role_id, permission_id, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.role_permissions_legacy ENABLE TRIGGER ALL;

--
-- Data for Name: role_profiles; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.role_profiles DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.role_profiles (role, modules, dashboard_widgets, default_landing_page, custom, updated_at) FROM stdin;
owner	["*"]	["risk_heatmap", "compliance_score", "executive_summary", "audit_readiness"]	/dashboard	f	2026-03-17 08:24:24.384572+08
admin	["governance", "risk", "compliance", "evidence", "reports", "assessment", "workflow", "ai"]	["risk_heatmap", "compliance_score", "control_progress", "evidence_locker", "audit_readiness", "executive_summary"]	/dashboard	f	2026-03-17 08:24:24.384572+08
compliance_officer	["governance", "compliance", "evidence", "reports", "assessment", "workflow"]	["compliance_score", "framework_coverage", "control_progress", "evidence_locker", "audit_readiness"]	/dashboard	f	2026-03-17 08:24:24.384572+08
risk_manager	["risk", "compliance", "evidence", "reports", "assessment", "workflow"]	["risk_heatmap", "risk_summary", "compliance_score", "control_progress", "vendor_risk"]	/dashboard	f	2026-03-17 08:24:24.384572+08
auditor	["governance", "risk", "compliance", "evidence", "reports", "assessment"]	["audit_readiness", "evidence_locker", "compliance_score", "risk_heatmap"]	/dashboard	f	2026-03-17 08:24:24.384572+08
viewer	["governance", "risk", "compliance", "evidence", "reports"]	["compliance_score", "risk_heatmap", "executive_summary"]	/dashboard	f	2026-03-17 08:24:24.384572+08
it_security	["risk", "compliance", "evidence", "workflow"]	["risk_heatmap", "control_progress", "incident_tracker", "evidence_locker"]	/dashboard	f	2026-03-17 08:24:24.384572+08
\.


ALTER TABLE __TENANT_SCHEMA__.role_profiles ENABLE TRIGGER ALL;

--
-- Data for Name: role_team_mapping; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.role_team_mapping DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.role_team_mapping (mapping_id, role_code, team_code, team_role, auto_enroll, auto_remove, active, created_at) FROM stdin;
3ff0e88b-4eaf-4056-8a45-85dd7de45c12	owner	EXEC_STRATEGY	lead	t	f	t	2026-03-17 08:24:22.970118+08
4ccf4a51-08ea-4641-ba90-2110a34af386	admin	EXEC_STRATEGY	lead	t	f	t	2026-03-17 08:24:22.970118+08
a6536c14-2153-43e2-87f2-94a338117f80	compliance_officer	CYBER_GOV	member	t	f	t	2026-03-17 08:24:22.970118+08
a842ea82-1227-4047-8850-617b453f7db5	compliance_officer	PRIVACY	member	t	f	t	2026-03-17 08:24:22.970118+08
70be4102-7e9b-42c9-9d3d-31c687d05fc2	risk_manager	ERM	member	t	f	t	2026-03-17 08:24:22.970118+08
442fc041-ef2d-453a-80f6-9952fa31bea9	risk_manager	RISK_OPS	member	t	f	t	2026-03-17 08:24:22.970118+08
85dc8c6e-e39d-4182-a9ca-8575438a1694	auditor	INTERNAL_AUDIT	member	t	f	t	2026-03-17 08:24:22.970118+08
bbfde242-e9f4-4133-90dc-3e050abd850e	ciso	CYBER_GOV	lead	t	f	t	2026-03-17 08:24:22.970118+08
394f66f7-190f-4211-93ca-a0581f467d39	ciso	SOC_OPS	lead	t	f	t	2026-03-17 08:24:22.970118+08
4a24b6e6-56d2-4e7c-8adf-d425c2b80ccc	cto	CLOUD_INFRA	lead	t	f	t	2026-03-17 08:24:22.970118+08
6f96d69a-b8ee-47d4-a2c8-3da3e91f71da	cto	APP_ENG	lead	t	f	t	2026-03-17 08:24:22.970118+08
832d91c2-7897-4558-b5cc-733ea8cb7a45	cto	ENT_ARCH	lead	t	f	t	2026-03-17 08:24:22.970118+08
60452093-ce47-4ddf-bd21-f2344c828b3c	cfo	FINANCE	lead	t	f	t	2026-03-17 08:24:22.970118+08
0d38d410-1b0b-48f8-bfc2-808f7adf8fa9	compliance_manager	CYBER_GOV	member	t	f	t	2026-03-17 08:24:22.970118+08
69a2b4e9-4a64-47ba-908c-50390c97d40c	compliance_manager	PRIVACY	member	t	f	t	2026-03-17 08:24:22.970118+08
34f2d588-bfff-419a-8c82-00d2b1e06d80	compliance_manager	QUALITY	member	t	f	t	2026-03-17 08:24:22.970118+08
\.


ALTER TABLE __TENANT_SCHEMA__.role_team_mapping ENABLE TRIGGER ALL;

--
-- Data for Name: ropa_entries; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ropa_entries DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ropa_entries (entry_id, processing_purpose, legal_basis, data_categories, data_subjects, recipients, retention_days, transfer_details, technical_measures, organizational_measures, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ropa_entries ENABLE TRIGGER ALL;

--
-- Data for Name: saved_views; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.saved_views DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.saved_views (view_id, user_id, name, page_route, filters, sort_config, column_config, is_default, shared, shared_with_roles, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.saved_views ENABLE TRIGGER ALL;

--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.schema_migrations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.schema_migrations (version, filename, checksum, applied_at) FROM stdin;
1	001_add_deleted_at_columns.sql	68c36505311d66ddef824d4acd55a9bb5f1bf0bd549551d22a30abd05e8e498e	2026-03-17 08:24:21.171905+08
2	002_enhanced_platform_tables.sql	3a234c902c3406b3fb1a19e7c179514ab7e5b1b523d16928c26574235c2a00f7	2026-03-17 08:24:21.173469+08
3	003_entity_links.sql	434236f6c7d4850cb406fb591983bf8cb881d1866e4e57c3d74bdcbf68c63264	2026-03-17 08:24:21.17409+08
4	004_activity_feed_enhancements.sql	676dd68d9df824960ac07e24916616f949ba84cd649e2fbaff37ca2c716c4828	2026-03-17 08:24:21.174572+08
5	005_notification_preferences.sql	a980059c4405fa900a506ab7410392c7025bea0cc7c92172ea52389c92754ef6	2026-03-17 08:24:21.175086+08
6	006_search_command_tables.sql	20eed503a58b46c0784fff1d876d309237c53312cf3cab42bf04f5ed19b1f885	2026-03-17 08:24:21.17551+08
7	007_ai_sessions.sql	cb16e65b38fca9a509e159fe8b4bcde370257c7311bf1cbad5619201f0b90e2e	2026-03-17 08:24:21.176003+08
8	008_autonomous_workflow_tables.sql	3a4cab5c1a33c700881c73f94cb4f9521fb619bb5f5efd312f506827bf47a729	2026-03-17 08:24:21.176465+08
9	009_journey_tables.sql	67cc00bac56a77232b728217711e0847f3654f95a25f3483aa3ff327258a7f23	2026-03-17 08:24:21.176947+08
10	010_agrc_os_tables.sql	a44c1cc2298be838596343499085ab0c5518afc9d8113c6c451abbbf4c6551a9	2026-03-17 08:24:21.177477+08
11	011_engagement_intelligence_tables.sql	efb099e1466b5b5acefc8ba26852254a41f3b50eeee2f0fa892800b58e595834	2026-03-17 08:24:21.177988+08
12	012_raci_cadence_tables.sql	02344e8d48facdbc9eca7d39dbd6f0ab42d99858eb2e34217b11bff4cddd8429	2026-03-17 08:24:21.178444+08
13	013_push_tokens.sql	4ab08c1bd1b0a031f987258b62fa5218d845ddb21d1ec6ee8d04e0722bb4991b	2026-03-17 08:24:21.178914+08
14	014_cooperative_workflows.sql	e01d81fe21d6b20831aa11e0add9eccc8cf678e08de76510d305a24ad57cfec3	2026-03-17 08:24:21.179336+08
15	015_report_shares.sql	ad636f3f0e8651c6b21bed6a235340719878565a22b59d945176c08ec54dee8d	2026-03-17 08:24:21.179778+08
16	016_workspace_lifecycle_tables.sql	8779fc9d071f5f69897ea75591a3c3e12c9d32abf2666c58dd4b75feb3390b01	2026-03-17 08:24:21.18029+08
17	017_agrc_os_ui_tables.sql	fbc855d6f3a9171ca83cdfc78345c946aa6e0ec0f73049c6a0d49bf738f879ac	2026-03-17 08:24:21.18088+08
18	018_workspace_seed_provisioning_90d.sql	329b1e3f3b04e4a5648c8d6a1541ac428870ddfe79607148d7e26adf7e50dfe0	2026-03-17 08:24:21.181535+08
19	019_agrc_os_ui_config.sql	6db3ab4452cbd03cdf9e6089151b859fe6b011327bf3cc0276083d9c1f6ac88b	2026-03-17 08:24:21.182063+08
20	020_team_raci_assignments.sql	2483d853f213b864d06dd4ab78078a07dc653c17cd7958d3fe071d76d5dd1327	2026-03-17 08:24:21.182949+08
21	021_mobile_push_tokens.sql	1ae1983ef576ffbdd92391ac5415e2825f7c01977e2cdfe4e6e915a80f9b8ca0	2026-03-17 08:24:21.183509+08
22	022_role_matrix_authz.sql	aa60f2f1f63486a78cf8fedb9015e97bced13e8b4bca6aeff6fbc4c179c35c13	2026-03-17 08:24:21.183977+08
23	023_connector_tables.sql	986157f1c06d525736cdd5c7efc2d2f31aa510f87b1cb207f95eaf3d115d1208	2026-03-17 08:24:21.184413+08
24	024_missing_feature_tables.sql	885fae989775e60783e0db71924c986b41bec30362600562f76b85cf1151c39c	2026-03-17 08:24:21.184873+08
25	025_missing_indexes.sql	85f976b7d9a67bbba852ef810e3970c83dc2adad35f4f0445587e8155c0eb114	2026-03-17 08:24:21.185371+08
26	026_agrc_os_repair.sql	2ca07731f911d9017d872a288f3211df9a0ad4e78597174dd42c9768ee59a5a5	2026-03-17 08:24:21.185926+08
27	027_automation_eventbus_tables.sql	122a4087cfd90c3d6e8337661d7fc75dd89658cff1771e397acab3933d68942a	2026-03-17 08:24:21.186308+08
28	028_workspace_profile_agrc_columns.sql	c58a760a4c48dbf195a24334c50821fc376cda40e98be66bd798e55482dc9694	2026-03-17 08:24:21.186939+08
29	029_plan_item_completed_at.sql	292929fa6c2886c5938c2d3c14dd3ac2e202d3a3cdc4f4e86046426889f35fb8	2026-03-17 08:24:21.187519+08
30	030_authorization_redesign_tenant.sql	df521e6baaec579fc9333f3ef861351d00ba7d58bb53fe3a12ee99c5a7bab901	2026-03-17 08:24:21.188097+08
31	031_authorization_seed_data.sql	92df841edcf7a02ab67bedd4d12d1d49c8a58707f8c94fe9c56960e51619509c	2026-03-17 08:24:21.18868+08
32	032_rename_to_target.sql	56395b31d43f7e4b2cfed08167055259cfcb6e8f9284527e60d550747074d0bf	2026-03-17 08:24:21.189402+08
33	033_core_platform_additions.sql	9cdfa5119797dcb3548c93a67c9f4cbaf5c90852699f210d5685c54621004826	2026-03-17 08:24:21.189984+08
34	034_identity_authority_additions.sql	03dce8a86ac948e59bb230667efa4aedf829fd4c0fabd832e25bbd64871e7456	2026-03-17 08:24:21.190572+08
35	035_registry_knowledge_additions.sql	eeb887c72a27f1b024710e27b474b21cf535147f3dd3a216098c3f3ced6d0886	2026-03-17 08:24:21.191137+08
36	036_governance_command_center.sql	4ccce0a4f51e7bd5a929156e96ad69dd837cf42c9b7377e2835269b1d4060a65	2026-03-17 08:24:21.191717+08
37	037_mandates_obligations.sql	32c7fc36d4e2bb561bd667f8fc4720fac172d08346b5a78cec1490e8f3800b1c	2026-03-17 08:24:21.192342+08
38	038_risk_operating_model.sql	81b61289dee816b892646a535af338c85521bffb20c28e9030332d1ab873109e	2026-03-17 08:24:21.192819+08
39	039_control_operations.sql	2e3db5f0fa88b39a9441eca8e13a09ebb3b7141a841394c92fd01757212e6357	2026-03-17 08:24:21.193323+08
40	040_workflow_normalization.sql	99cb71b905c9190a8c9c199116c59b26fb4dc7d08f819d4b2b946a054a7d5504	2026-03-17 08:24:21.193741+08
41	041_audit_evidence_additions.sql	62b27cee9f8fb4a5de367dee15060b1f8a498f79053ad359923f99e1a33049c7	2026-03-17 08:24:21.194185+08
42	042_incidents_ops_additions.sql	e7a665faf6445e305b83c2aaa0dfed38c1dc4ef712e09df76e46ea2315e1794b	2026-03-17 08:24:21.194644+08
43	043_data_governance_privacy.sql	02491d98f575946b681c989591d96513d4e9300d91cf82dda9c8c00b3f28a107	2026-03-17 08:24:21.19505+08
44	044_thirdparty_project_delivery.sql	f4a437bb8f5abf83eda0613756c77734fa2f9949f1e40b21eecd861b09c5e084	2026-03-17 08:24:21.195527+08
45	045_shared_platform_additions.sql	b9781b41a59f562a2cd4b7a391a25d50db3f0cfbe498c0e0294565a1406a508d	2026-03-17 08:24:21.195958+08
46	046_qiyas_model_registry_and_question_bank.sql	e6d233498471840807d2bd0c2a5e7f8b609d3ba36660e10048b6c0cceef051b6	2026-03-17 08:24:21.196412+08
47	047_qiyas_assessment_runtime.sql	652d8adcf18cff70627c506a5c14beaf1e9a6e696dfec4eca9b431a30b01b3cb	2026-03-17 08:24:21.196998+08
48	048_qiyas_recommendations_calibration.sql	2013f0e169c2249b30980f81b56717df370e149fa017a8c901ffdbab05c25fcc	2026-03-17 08:24:21.197516+08
49	049_qiyas_evidence_scoring_and_maturity.sql	015cecf60129178104dbbe79eec8923b9a483f9394c1cc61991b0eb9bfbd2f62	2026-03-17 08:24:21.198006+08
50	050_qiyas_benchmarking_and_certification.sql	27900ebfec9aa1a2a642f9b9dcb01f47c150c7b7261f934b7b298a9a8d8eec1f	2026-03-17 08:24:21.19849+08
51	051_cross_table_relationship_columns.sql	85034490ae6dac9fb5c844e77cc935d114f8c89ac6d8dba0a6331c92ebf39f41	2026-03-17 08:24:21.199003+08
53	053_dashboard_extensions.sql	93a12ed25c2b2fed3843d897ca45db2c2bb54c6170cba5665c5350f9bbf5421c	2026-03-17 08:24:21.199535+08
54	054_seed_dashboard_registry.sql	68cb81c0b6178d57c03a135a5a5e1b33bf0079c89a33cb2eab3f540f8806ebec	2026-03-17 08:24:21.199958+08
55	055_dashboard_registry_v2.sql	00920477343586d695acb4fb1bc6fb0ba32c37c4b3acd9520b285a12e5a66e5b	2026-03-17 08:24:21.200457+08
56	056_seed_dashboard_registry_v2.sql	00bb2bc47c064cead08c6d0b822a8c030ae95abefddc1db5608d97e2b2dda035	2026-03-17 08:24:21.200941+08
57	057_pack_registry.sql	a315621877d4a97b1e9cce481da8c50867bfc3e9612a415ceca51148f0a8e1c5	2026-03-17 08:24:21.201529+08
58	058_pack_selection_policy.sql	7c70c6713fdc084b4ad0e784d8aa07e88bea9638a0a8651d6b0ce83d475c7312	2026-03-17 08:24:21.202058+08
59	059_seed_pack_selection_policy.sql	05ffd070eeefcde25247e07f87228dd1ee0e60ba05feb48dd5add610564bdebb	2026-03-17 08:24:21.202512+08
60	060_agrc_engine_support.sql	857d4545ffe5e28acfe13e4d54fc6a0f80e707bdfe1d38e78094c4974fcf2547	2026-03-17 08:24:21.202983+08
61	061_seed_executive_widgets.sql	6756e278eb3e9dacf836b4032a293bfe3bc01a88176e755a93e5478d6fdce07a	2026-03-17 08:24:21.203706+08
62	062_navigation_registry.sql	0d0d79d81dd5fc27191cb19cb135708e957e29f405673956f6cf5718ae995e9c	2026-03-17 08:24:21.232772+08
63	063_seed_navigation_registry.sql	3e1f14e372f0a4177494673c0a270376fecc84e415fa703488cbbae43cb867f1	2026-03-17 08:24:21.236997+08
64	064_report_schedule_subscribers.sql	3a793dfb8e3e5d8829e9a9c10dcfb8b7d4265139213650ad54789f0ababa8e27	2026-03-17 08:24:21.237557+08
65	065_agrc_execution_platform.sql	0013667e4d8a9918b6d92ee55a97bc9643478a7eb26dc1ba40d11ca8194d58a0	2026-03-17 08:24:21.238818+08
66	066_agrc_visibility_monitoring.sql	88667801894f23172ddb1a3cc1a12a6cecb67ee85fe1fd523f38e117c3766eaf	2026-03-17 08:24:21.376488+08
67	067_agrc_automation_intelligence.sql	635430e1c3376280a4332c1db55ae38899d9e8bbcf94fd743e43445cabbe5ee4	2026-03-17 08:24:21.497133+08
68	068_populate_18_teams_enhanced.sql	dc467238009706e17f5ee3dd8c84cda8f7e22e86cf9911756f577a5aaf732a2b	2026-03-17 08:24:21.610518+08
69	069_raci_matrix_validation.sql	65628040b23bc03f6bb86239773d4f1b53dd075e8e2e12a055d8c6b6839f9127	2026-03-17 08:24:21.643367+08
70	070_intelligent_automation.sql	42a2d0ed5a3f70b9d5a2736cb9bbc210bcdc435a535b7a198e14d166c67ebbd7	2026-03-17 08:24:21.657426+08
71	071_platform_enhancements.sql	cb13c5c7516e752d969ebbec1b537d8519bc130177e109583d44e446e9548db0	2026-03-17 08:24:21.668446+08
72	072_assets_table.sql	9c83c16f2658be8163fe16618f5950df4756577a8c6fa89528d1128b9f42eb01	2026-03-17 08:24:21.751754+08
73	073_seed_platform_defaults.sql	57eb48b5ee2766e9127d1b1652af9fe125317d375c0166810180dd22c5950e54	2026-03-17 08:24:21.759458+08
74	074_team_workflow_activation.sql	fbd0100c9f0775bd4f2ebc43dd4126ce33aa7e92d58d0523a05dca44525b1beb	2026-03-17 08:24:21.775115+08
75	075_populate_all_team_members.sql	773b2dc819908ae45f64a3b2252a62b8b9eb64de307646f1a584a884121b982f	2026-03-17 08:24:21.782778+08
76	076_seed_evidence_schedules.sql	aab3102f5669139ddc09e2965704f71e79f55076af39680fc1089040ec70ce7e	2026-03-17 08:24:21.785618+08
77	077_copilot_proposed_actions.sql	44d68e802dff24e8da1fee397e4acb890ddd4825a93c8ac485eb6f48c0cddea9	2026-03-17 08:24:21.787926+08
78	078_action_items_compat.sql	e858a8730286fc0114fdb2b1581178d4a4ee5dbe4e046125bd7efd6e2952b62a	2026-03-17 08:24:21.797772+08
79	079_missing_entity_tables.sql	11f04002c3d0fb0049673b65d585f2b32ed4d1b799be57a83412318b37c6774b	2026-03-17 08:24:21.816011+08
80	080_tenant_email_config.sql	20193ae0ed12addee5157033dcdcd28e62928c7c52a9a985c792878b13ff81f1	2026-03-17 08:24:21.860071+08
81	081_seed_navigation_registry_v2.sql	395ca905fb4a87822540125e1daab3de4cb3c9596e6d649aeca3ea6d3777290e	2026-03-17 08:24:21.872133+08
90	090_team_member_lifecycle.sql	4a244deefa21340ee882356bed240dc79df6329fd9280568b94d2b016b98dfcb	2026-03-17 08:24:21.872857+08
91	091_evidence_attachments.sql	9f5a209acfa6e6168c60076793c8e037f049496617791f7651bdeb980d84b0a6	2026-03-17 08:24:21.882592+08
92	092_controls_team_ownership.sql	d5ad98af672b6a849cdaea111ac3921379fb453b4381d26ae585e17b16fab5e4	2026-03-17 08:24:21.895808+08
93	093_platform_operation_config.sql	a0827b91621e0c6ab22b9dcef831079eb3930dab2354d8e1962c05c991ba6822	2026-03-17 08:24:21.909091+08
94	094_operation_mode_v2.sql	c010fb9319f5d81db83076625550673ba862ce08b4ceb329adcd6d01a632e917	2026-03-17 08:24:21.922041+08
95	095_workflow_team_extensions.sql	c7b09c42ae8ceb70b6506d0812bbaab3b81da24e30b5e9051894d38bc01e684d	2026-03-17 08:24:21.940575+08
96	096_qiyas_grc_automation.sql	b5b482f2bd6af047efa81744afb0d829322b93faaaada5929ea852f9eafd3cc8	2026-03-17 08:24:21.955589+08
97	097_users_department_id.sql	39e8f5c39fbdc377ed3a1e78b34e4cb6241448670a3bb8eeaaee5764e589d243	2026-03-17 08:24:21.990916+08
98	098_schema_repair.sql	9a8a9b4c58d7e4abd21da206ec786ce04fba86704f72eb600cd40634ac2e2538	2026-03-17 08:24:21.993501+08
99	099_navigation_module_alignment.sql	c368671a9b1a345209b4b36cec5df292d2e4775280759b072f76ff1b3f92c100	2026-03-17 08:24:22.284713+08
100	100_governance_wiring_additions.sql	d1970559f28fd412412e178cd77507e6c857b5d02900745a75bb4f97d63dbd22	2026-03-17 08:24:22.285332+08
101	101_module_fire_points.sql	ca2e925b108a3fbd8558dd89f46affc58157cd124d293d70b4a015683bcf0843	2026-03-17 08:24:22.321362+08
102	102_governance_enforcement.sql	fbafbcd5fcd4dd52f586a977d1fe51009bb801432ec3626ea69375c4d2855be4	2026-03-17 08:24:22.323065+08
103	103_governance_health_scores.sql	8e8cd76b8cba6d0d45066238eb8c18dd3a6d3da31662a9fa634addc11dc69dfe	2026-03-17 08:24:22.338652+08
104	104_governance_structural_modules.sql	4afe967769cdaa7dfaa93ea4c2dcd7e7ef580b3ae57f1b0fb3eee0a6bde81648	2026-03-17 08:24:22.348839+08
105	105_audit_enterprise.sql	97feff1fe0be3b2414330f31d273ac031166734aade9e7c2fc9dd51699c7fd00	2026-03-17 08:24:22.373779+08
106	106_governance_phase2_consolidation.sql	eb15d4915cd0f94e304ddfe405cc33244fb31efb08e44573e49e2c90c3729f74	2026-03-17 08:24:22.425304+08
107	107_agent_orchestration_v1.sql	dc73ba6bd3d7798a7fd91e20626baa6bd013f27634e2475da77512dde367f4f0	2026-03-17 08:24:22.50248+08
108	108_memory_vector_store.sql	acaa1a727a7eff31d6f1fadd5f7363391a0f7e3d1c60c8d027628d71a32b3904	2026-03-17 08:24:22.549373+08
109	109_memory_hnsw_index.sql	97435416e3526b130e0c82dbd064ac0f9e8553e682d7b53e8e3f4cd427251951	2026-03-17 08:24:22.573115+08
110	110_shadow_delegation_consent_versioning.sql	b0cb75fe7d54e9e5544e08b76ac03bc5587764ed0251608c5e3364c4a5a8c7ed	2026-03-17 08:24:22.575507+08
111	111_ai_layer_enhancements.sql	5ca3ceffd7e49c023ff3f0f27423c18762a2cd0828aab10bafd4d0a9b8d82662	2026-03-17 08:24:22.590273+08
112	112_policy_templates.sql	b853e795fae270ade91898765e38dd424b8965cb7c47fa2668a4baaa589615a8	2026-03-17 08:24:22.622629+08
113	113_control_monitoring_tables.sql	cdef36d0f94a4adaabf82ab1e557e2648cf589378b06d3d5f7f7d8b3fac3b1d7	2026-03-17 08:24:22.653669+08
114	114_incident_governance_pipeline.sql	19f290189f99b158b2a4ed88a24d3711b9a98fce3342c008e36fe87c28a3b79a	2026-03-17 08:24:22.672487+08
115	115_ethics_governance.sql	215962bb6bf6b9cf21ac9a868aeec57f5a8b47ee6f46d7ce98b05d53c6487044	2026-03-17 08:24:22.679614+08
116	116_governance_ai_engine.sql	8cc1dbcf02142f48c0f2d0770b9f47397b078b95814977e4fce2cf2e59e86b1a	2026-03-17 08:24:22.689846+08
117	117_foundation_regulatory_fields.sql	0f40f9eb6896a09450d860a582865587f8a0b346e1b390738059c2d2524d6576	2026-03-17 08:24:22.733791+08
118	118_risk_scenarios.sql	fba48b321fa603ead4595e6780a6fd2258a29f075893251e14c6bd4887445d70	2026-03-17 08:24:22.759859+08
119	119_rcsa_campaigns.sql	e9c614966f9d546489c6934fa68391a57cf1adcc0adbb430c125e2a867cdcb87	2026-03-17 08:24:22.765318+08
120	120_attestation_campaigns.sql	921e24c1166a70f12909e20bb810117b8db523d251f367d9621a2454ce7680b1	2026-03-17 08:24:22.775145+08
121	121_ccm_cloud.sql	daf3d9cd99682a1357b9a15e7b80283b4f65532a58e5ffb5bf1007b67f84d2d8	2026-03-17 08:24:22.783842+08
122	122_vendor_portal.sql	1b260f36d97592889c0e9d041c5c6c38ff3aaf51374e77679a49dbe222754a7d	2026-03-17 08:24:22.792339+08
123	123_event_log_archive.sql	dc6ca0e176d1662704a484fa27a174c0d2b7046f834e66790fd0372880fdb9ad	2026-03-17 08:24:22.803572+08
124	124_webhook_subscriptions.sql	6d873550a2993a98d563e6ea8d2ad43262f4be0c2c57b0d76d2f7463c30b70f9	2026-03-17 08:24:22.813155+08
125	125_governance_constitution.sql	8b3271d70ae61d8f7ec94b6147b1af5acf7976002f586959ca92efe186ca504e	2026-03-17 08:24:22.821798+08
126	126_data_integrity_fixes.sql	3f1e2a08ece32c1113c1b42f1a4467182575535ed5700968b27097d2481062e2	2026-03-17 08:24:22.839969+08
127	127_vendor_ext.sql	71a262eff20b5f3b37c719be02b8562c3529f8c3e7c2b9ca43ebc7af351be0ff	2026-03-17 08:24:22.865594+08
128	128_control_procedures.sql	6afbd67a32b76038c4a3746a020836234255665164ace8d5f65f77e56f83d42b	2026-03-17 08:24:22.889891+08
129	129_bowtie_fair_csa.sql	33c5cf971d233397b2452fd67e2ca4b4f361d2f8639d75f4fc11f78767ce464b	2026-03-17 08:24:22.920064+08
130	130_audit_trail_table.sql	74505a17f8464c3a50de7ff1ae9534b9854a222df7fb12bb6b2368e428ed1e88	2026-03-17 08:24:22.962174+08
131	131_risk_team_ownership.sql	3ca427a9edbf8eecc219ecbece092fdeb32c2acedc2b8c592d72c4f7aa9eb7c5	2026-03-17 08:24:22.966518+08
132	132_role_lifecycle_config.sql	f65234426077cca90c3789ca1e55f9e75aac9686168a51b615643f85a362f242	2026-03-17 08:24:22.970118+08
133	133_workspace_profile_settings_json.sql	9b9edad6df2d4701bc1c5cb45d92b8b98c147b79a205325d0e99d3125b21d481	2026-03-17 08:24:22.976558+08
134	134_process_task_entity_link.sql	1bc9e5c4b5ac2a438f1bbd8b3c299a6bafef4e0791dabb25ca183ef416926660	2026-03-17 08:24:22.978122+08
135	135_departments_legal_entities.sql	e0cfc89dfc29c6d9f622266f121ebeb44a08e194bc50946b08a2886e3e82eee0	2026-03-17 08:24:22.981701+08
136	136_process_tasks_control_id_varchar.sql	07355c0fbd0daff40c183e13f603cab66a4ac3f4146ca00d45aeed34fd3ee257	2026-03-17 08:24:22.98575+08
137	137_teams_department_link.sql	73aa98c1d1398fdf457d8bcbec79b3016156a7736ce71bfe8aa1548125f2a75d	2026-03-17 08:24:23.003176+08
138	138_governance_executive_summaries.sql	45d9de8183850b48b745bfaf3d01542c5c1e57337545c2d086754487eb139626	2026-03-17 08:24:23.007968+08
139	139_catchup_skipped_duplicates.sql	9304e4283cfee70b487a35aab49686db9cbef0ba30a540f43b4d54940e481981	2026-03-17 08:24:23.015252+08
140	140_grc_entity_raci_ownership.sql	32501da2bc68ad0a2dcf91326c83bff15b5b61d88616030afd6ef6173e28c145	2026-03-17 08:24:23.022676+08
142	142_ai_asset_inventory.sql	755823a0de9f374e4b0613dfd5f3135074bc6d698efc0aaf562aeeb72300a9b6	2026-03-17 08:24:23.084173+08
143	143_ai_model_registry.sql	7d8985eb976313543d77e77ac00987abd5dcd9d3fc090e20116e7d22782b6ade	2026-03-17 08:24:23.090115+08
144	144_ai_model_registry_deployment_status.sql	f8c3280993614f9cdd7699cdca4fea6b8c37ee1d970490d192cd67728220fb23	2026-03-17 08:24:23.101062+08
145	145_ai_prompt_registry.sql	db3ca1591335313b3ea9dbebe35283db96ce23e818cc9ce4f72fe0a89879d95d	2026-03-17 08:24:23.103816+08
150	150_incident_advanced_tables.sql	09878b881e3cd450bd2a9f4f680adcd558d5f60cbab9e5e1c3b0a583c453abb6	2026-03-17 08:24:23.110699+08
151	151_bcm_advanced_tables.sql	1138d793da0885a0e9753a57bbe5f2cd0f4168badc8513b08d8268e10573ef80	2026-03-17 08:24:23.180393+08
152	152_vendor_advanced_tables.sql	67c84ed86f1b14ff7d1ae2442d0aa7ba9a10487d901d7983a85d96e2313b1922	2026-03-17 08:24:23.265424+08
153	153_training_advanced_tables.sql	fa19b1890fa74541c91f301a02904475d75b72f840f62b7ab1f11d6fe99f98e1	2026-03-17 08:24:23.334954+08
154	154_module_seeds_lookups_views.sql	542c47d076fe4d58763127b29d6e4eec075a2171c5462483a9f4083a0a184d03	2026-03-17 08:24:23.408019+08
156	156_rls_phase2a_audit_tables.sql	da4d656646773f83d9b71a76aaf65ab936397a3764a6febccb87b8af8354d900	2026-03-17 08:24:23.47253+08
157	157_rls_phase2b_grc_tables.sql	b1ceec86054ef54724e600002e5f96a11bf3edcf23e0c50c6a9adfba9d8d5eb1	2026-03-17 08:24:23.48065+08
158	158_role_profiles_add_new_modules.sql	7200955170309a22b68e6401e3f732b04e37872f2c3b46a96dccf0f59a28dec2	2026-03-17 08:24:23.489816+08
159	159_ai_agent_registry.sql	f4601d70bf1662ce7033327470162888900913bae52773edce7a4e7de7313602	2026-03-17 08:24:23.492544+08
160	160_responsibility_graph.sql	6b595a6bb2c9ce51afb72db23619af17c98e8fcdbf6bb83c3542826c454fddc3	2026-03-17 08:24:23.501347+08
161	161_ai_governance_enforcement_config.sql	a8686e66919a43f8668141f4c4b5efc5bcee08dda90232002a873bb9f7724047	2026-03-17 08:24:23.527699+08
162	162_ai_binding_governance.sql	9a2c72bcf1930b3f01223170a406306cf93be5be8615e1f6a7741cef643ea1fb	2026-03-17 08:24:23.529585+08
163	163_enterprise_authorization_tables.sql	bc7e3c6e949cb2086dc7cd40a70bd454530a25308d6e160ddb4e07cbe2bc8188	2026-03-17 08:24:23.548116+08
164	164_seed_enterprise_authorization_seed_data.sql	50c8c5e2335200db29453884d4198499b0219039866c5e9f01b27a69d162f213	2026-03-17 08:24:23.609869+08
165	165_record_ownership_columns.sql	e8bb71e6abba684dacacd5abf39317ab5ce4124fe47942d0d2ac5b036a4f2e45	2026-03-17 08:24:23.623923+08
166	166_provision_enterprise_roles_from_legacy.sql	1c9590f9181e76fbac50a770608927aa00f7d19cb7c330612b0808b75a98f6fc	2026-03-17 08:24:23.651178+08
167	167_fix_enterprise_authz_gaps.sql	50600394f846c222caa74d7ceb45fac2d9fb3ef3ae2432cb2884f8c8a97095fc	2026-03-17 08:24:23.656243+08
168	168_governance_remediation_team_enterprise_permissions.sql	dec5dfa8ac5daaee8859f8f7cdc068ab4d04b0db1c6a230a1e56d5c467b4ba4e	2026-03-17 08:24:23.660864+08
169	169_complete_enterprise_permissions_coverage.sql	c4f5efbe4b532353845d51618a3c7a27b7bd9de8744f51116ba30e6779982519	2026-03-17 08:24:23.664693+08
170	170_ai_binding_governance_spec_alignment.sql	416b2e3372ad6b760dcbc8f4ec8efcec9e37d279fb8e16ba485b800e5726d92d	2026-03-17 08:24:23.672093+08
171	171_complete_enterprise_permissions_final.sql	ae92023b7626948b425462d05637f733097d2651c39fcb3af5ac69310c7cb96a	2026-03-17 08:24:23.680694+08
172	172_governance_auto_fire_baseline.sql	74e75bf8c23f98640dbd445fa7c49676c62af5f5b0810f1c3229466bac321deb	2026-03-17 08:24:23.68534+08
173	173_ai_binding_governance_spec_final.sql	de586ffd9477b65521df5efa2c0871b181040e2b0b533d08df9ec13613611689	2026-03-17 08:24:23.692185+08
174	174_module_lifecycle_definitions.sql	91587e14a3deda06cbbfaa76f39a4913a3813f2e9daf356b1ec4f7a33c1860b9	2026-03-17 08:24:23.698254+08
175	175_cross_module_workflow_chains.sql	dbe0f8e463174bc97ea5570a4f6e988e6dde115d384a5ea56f4980ce735d2468	2026-03-17 08:24:23.716086+08
176	176_orchestration_routing_metadata.sql	31ed8780a675a137cade2ce0266b583c818385dced65d574875804d9d647b785	2026-03-17 08:24:23.742085+08
177	177_org_foundation_authz_binding.sql	7a4ffb4cb8b7406816fde9d1cf29300c3b958b6635605818efd8bc3ae1af956c	2026-03-17 08:24:23.75953+08
178	178_autonomous_governance_rules.sql	df76686770a0d5918d090ad4090a5cb2c2ed7d30b423a8c8fe48fd4469b62c6e	2026-03-17 08:24:23.793625+08
179	179_module_workflow_registry.sql	efbebc7ba570a9a198309d7842bac119cf09d1cc8ec154884f1c10cb496494b6	2026-03-17 08:24:23.814471+08
180	180_guard_decision_log.sql	df2d07bc7a24427415058973d85e545b04c5240c51c9eb1385f88ce61aee4823	2026-03-17 08:24:23.840118+08
181	181_authz_security_fixes.sql	9bddd9d9923a4eac096bc0fd351701b552c11fd3f34c3876aeeb0ee4296a24de	2026-03-17 08:24:23.848038+08
182	182_governance_r1_normalization.sql	51f6d612324643af88fe7e36a71f722f556a790de481ae514b1a338889ff0e12	2026-03-17 08:24:23.85235+08
183	183_governance_r1_2_fresh_tenant_baseline.sql	46f3e1bb78efcce2340fff89a285a2be379560050f01fca23b786a5ae391bb49	2026-03-17 08:24:23.855372+08
184	184_risk_r1_nav_and_baseline.sql	8e9c08854c8105260de598d7f2516b240c4cc455c56f457705983573611a1947	2026-03-17 08:24:23.869171+08
185	185_compliance_r1_nav_and_baseline.sql	a1d56d7746fd6b31ada06d2269f6430d2b9b567ae4c3a9960ffe1c79b1309f8c	2026-03-17 08:24:23.871448+08
186	186_policy_r1_nav_and_independence.sql	135c81fa93e1104b58bf166bdef11ccc6a1892a4b1d2d12f3392523b02be4851	2026-03-17 08:24:23.873478+08
187	187_incident_r1_structural_hardening.sql	55ce506d623107d01e254777f47396a1ea32381a81bf5179afdc5ff517d80661	2026-03-17 08:24:23.876776+08
188	188_incident_r1.1_sla_config.sql	6e22d0dfb5dd1c95738bca8edba6ab4677730a61e040ea87315240ba50e13424	2026-03-17 08:24:23.878264+08
189	189_bcp_r1_structural_hardening.sql	0afce418b5c139a23eed5d7d59f64a17a260cccfc62849044867dcea886e3846	2026-03-17 08:24:23.88126+08
190	190_reports_r1_structural_hardening.sql	15a5d9e07abad4640bb9787cdbac56cf71e5a883252a43f607be514ffe987d48	2026-03-17 08:24:23.881895+08
191	191_remediation_r1_structural_hardening.sql	b192573ae6ca344c09d547a2147a9f2e18398d226a20dac16529780f3c9da93f	2026-03-17 08:24:23.886491+08
192	192_exception_r1_structural_hardening.sql	16808cd7949e470ca7f8439e4f07e692b172829268ef56a4c1b12d503b4292e2	2026-03-17 08:24:23.897472+08
193	193_training_lifecycle_definition.sql	d02af4da5743b4428525c7a50566504b3c40324d411fd3eef9fab60f5d15ad87	2026-03-17 08:24:23.900331+08
194	194_tenant_config_versions_recovery.sql	fe4875acdb0dca56d678f33cc4758da066fd1d1cd57157f57844a0b06c9b2ac0	2026-03-17 08:24:23.902322+08
195	195_drop_settings_json_column.sql	eca1308d7fe18aee7f594133c6b226e14649e1f5ed78926edbfa6c90b987c42a	2026-03-17 08:24:23.905709+08
196	196_drop_dead_workspace_profiles.sql	36ae26bff80066cf2cf818f22644aa599229fda9d615eaae07b8edbd48fe6e65	2026-03-17 08:24:23.907105+08
197	197_user_last_login_tracking.sql	7079e7f68c88e8e03881b78a4651e4bd262c247900c520213aa37cdff39913ef	2026-03-17 08:24:23.908217+08
198	198_workflow_advanced_features.sql	9ded72e7413f5ee82863f95ac6f6cc46f2b5600204e99a3254e27ba3b829baae	2026-03-17 08:24:23.909198+08
199	199_ai_governance_wave1.sql	475a1ec6000664a38876041e834c5d377f02d8d79f226b00860b04e80a2dd816	2026-03-17 08:24:23.919593+08
200	200_ai_governance_wave2.sql	ece134e8284ac5213824da3ce1d44d11695c010df467fcb91821c169a8544c93	2026-03-17 08:24:23.943253+08
201	201_workflow_deferred_features.sql	647ae93b8bb34c927338b728e1c933376210a323e494c66968a69ba8a4d6322b	2026-03-17 08:24:23.985574+08
202	202_foundation_enterprise_completion.sql	433457f11c90348107f245bc548706b6f2bb803af76c10291cbe1d49de454958	2026-03-17 08:24:24.007207+08
203	203_risk_production_readiness.sql	8afc09b19e145d22ec45725039288196bfab1b78da1c4c1e5e8f07287860c124	2026-03-17 08:24:24.035552+08
204	204_compliance_enterprise_completion.sql	e1fb1c6711ba578bc11549c76f26250d27869f2941dadf046e114365737a50e5	2026-03-17 08:24:24.072891+08
205	205_evidence_lifecycle_ownership.sql	89a0e0732dc10ee907d604934185a40edce929efd2dd56d8e04885d0195a7608	2026-03-17 08:24:24.081784+08
206	206_integration_hub_production.sql	0af9a5bb1af6d05d4164b24a778d7e873ae9f074833e99768b1c4786ab616f71	2026-03-17 08:24:24.103406+08
207	207_vendor_cross_agent_enhancements.sql	2db2b621ad7ef77ceefb4b9a3f8c943d8ad0d7465a70ce59d8b9a292df41e7f9	2026-03-17 08:24:24.129497+08
208	208_ksa_regulatory_training_complete.sql	7be55fdb47f9a283e343d63c385cfcaa6741e0e0c49bcb7bba2b1145f5fdb628	2026-03-17 08:24:24.148735+08
209	209_audit_trail_immutability.sql	9ebf04b3facd56972c52c9d91c64a1876e014126dddb2ff19953b6fb7f4eff08	2026-03-17 08:24:24.175912+08
210	210_audit_trail_hash_chain.sql	94df01320162139d625c0c7640bf569bdbb12b0fcebb5b2f0679af0168949f5b	2026-03-17 08:24:24.178799+08
211	211_audit_trail_retention.sql	61cb271ec9508e44444186b7890e2912a8aacb5cdcbd943aa66cefbf335ae599	2026-03-17 08:24:24.181756+08
212	212_key_risk_indicators.sql	1cd19e54607308c5b1a9bb9fd14283807ff65c388527c3a223f588b5c13d939a	2026-03-17 08:24:24.187761+08
213	213_assets_nca_enhancement.sql	f3566de63c4f6a81f695b8a3d3442116ed46a3fa09a6789bb40de9e98a175990	2026-03-17 08:24:24.193951+08
214	214_foundation_enterprise_completion.sql	1ea066f448bdff07c74c29d05978494e690e219e228294b6bcc216413d955e7f	2026-03-17 08:24:24.201115+08
215	215_workflow_execution_bridge.sql	636c061203cdf703890fac111dd46c03a263e6144295388e7f9c4e32a079116f	2026-03-17 08:24:24.202637+08
216	216_workflow_sla_and_raci_seeds.sql	99a7fc0070a5038f5ffb63e19b04cad6b1a6277f6be567da0f5664f271a804b6	2026-03-17 08:24:24.209371+08
217	217_three_lines_of_defense.sql	77c65113016e3e33945c2f871ff67b94050354d5b48a7f3c303f701546f652d3	2026-03-17 08:24:24.214361+08
218	218_multi_dimensional_org.sql	5f3e6aff6a5dd17975b41099cd9e2a64bdab2eeeb51f83bda74d13c721c092fc	2026-03-17 08:24:24.225291+08
219	219_foundation_defensive_columns.sql	6736bb3a4b10cfc4e069552dac08c434fc493f816a16271619bb017be7730ae4	2026-03-17 08:24:24.242679+08
220	220_workflow_bridge_hardening.sql	4c66e2fc19bd4c9db918b3390d7d43dda5e5ed9a7f19d3a10323991eb2ca00ee	2026-03-17 08:24:24.247153+08
221	221_production_readiness_indexes.sql	d9bffc7606a65e10732996e87891af952002eb09580eafe1759db4a06b2ddb8c	2026-03-17 08:24:24.251131+08
222	222_tenancy_audit_hardening.sql	0c8fa39bbcf93aa5c10320efde2abac15737b89cc7555ad8f679017b1e48973b	2026-03-17 08:24:24.259599+08
223	223_document_management.sql	5224eb0516fa006314a37ef1b2b8bfc70db963d3323d32e5c7f3531cced280ff	2026-03-17 08:24:24.270581+08
224	224_process_tasks_constraint_fix.sql	558b4ffaef1af0d9c08556d7050300b4bb6ae072c6913f095e1380e5108748d5	2026-03-17 08:24:24.298575+08
252	252_fix_admin_enterprise_role_assignments.sql	c3ba06662344ab66204ca3a0b325db8401b8746c374cf354857287b04883a90b	2026-03-17 08:24:24.306269+08
253	253_seed_missing_enterprise_functional_roles.sql	9e593cbeecbcbcc7db9d333ef5bd654af40654040d015a445bf51975a9d076c5	2026-03-17 08:24:24.309172+08
254	254_agent_user_feedback.sql	551a35f43637dbf3723cdc75a1d9bbf9bb1d8821dbb7db6e9fad354d454f6241	2026-03-17 08:24:24.312509+08
255	255_training_programs.sql	421e5b433db4dfd7c5da85669b70c719e3633eca98cacee4f4de09ddbe694d7d	2026-03-17 08:24:24.319544+08
256	256_tenant_ai_config.sql	a5fb86e524650108ffca2617e10bbdc9a17a59f5cee476d85e3e9a9702279a68	2026-03-17 08:24:24.325972+08
257	257_unified_squad_tables.sql	c992324edbf67f9e8d2644ccefd3ebc767c06c85f30b8b2ddb4f8e15d497e176	2026-03-17 08:24:24.330299+08
\.


ALTER TABLE __TENANT_SCHEMA__.schema_migrations ENABLE TRIGGER ALL;

--
-- Data for Name: scoring_policies; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.scoring_policies DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.scoring_policies (policy_id, name, weights, is_default, created_at, name_en, name_ar, description) FROM stdin;
3f2775e6-77ec-4ac1-aa69-ae36d1266b96	Standard GRC Scoring Policy	{"risk": 25, "audit": 15, "evidence": 15, "compliance": 25, "governance": 20}	t	2026-03-17 08:24:21.759458+08	\N	\N	\N
1d99ba89-86e5-4b31-8adf-d8274052ee94	Standard GRC Scoring Policy	{"risk": 25, "audit": 15, "evidence": 15, "compliance": 25, "governance": 20}	t	2026-03-17 08:24:24.442586+08	\N	\N	\N
\.


ALTER TABLE __TENANT_SCHEMA__.scoring_policies ENABLE TRIGGER ALL;

--
-- Data for Name: search_index_config; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.search_index_config DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.search_index_config (config_id, entity_type, weight_title, weight_description, boost_recent_days, boost_factor, enabled, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.search_index_config ENABLE TRIGGER ALL;

--
-- Data for Name: sector_training_paths; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.sector_training_paths DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.sector_training_paths (path_id, sector_code, content_id, path_order, is_mandatory, due_days, role_scope, created_at) FROM stdin;
bed1ba2f-8912-4c94-82e2-333fead819de	SEC-KSA-FIN-BANK	94a6c477-7795-449a-97d8-ba1ead192da5	2	t	30	{all}	2026-03-17 08:24:24.148735+08
2fadfe04-6830-4fa4-a4bd-f1b91c19e78f	SEC-KSA-FIN-BANK	1c760788-3591-40ca-bca8-99f459432bd2	6	t	30	{all}	2026-03-17 08:24:24.148735+08
db82d7c3-b34c-49ba-a3ae-e750c9302221	SEC-KSA-FIN-BANK	b1c2a7e6-3434-4be8-ad0c-baaa4aeb46c1	1	t	30	{all}	2026-03-17 08:24:24.148735+08
2bf60230-363e-463a-aef5-71d532d3436e	SEC-KSA-FIN-BANK	ef62bbcb-76b2-4606-a210-f814303a11ba	5	t	45	{risk_manager,admin}	2026-03-17 08:24:24.148735+08
05451c6a-7e02-4ad0-a45e-038119baaeed	SEC-KSA-FIN-BANK	26198ff1-288b-4654-b10f-11cdbc11ab24	4	t	30	{compliance_officer,risk_manager,admin}	2026-03-17 08:24:24.148735+08
d6d890a6-cd95-4676-9afe-ecfce245bcdf	SEC-KSA-FIN-BANK	974ebc1d-c593-4129-8123-ba55785333a2	9	f	60	{compliance_officer,admin}	2026-03-17 08:24:24.148735+08
400c07f2-0bc1-453e-b230-e342e0e0b990	SEC-KSA-FIN-BANK	e2c4c7de-2795-4eba-be8c-e04e5517f306	10	f	60	{risk_manager,vendor_manager}	2026-03-17 08:24:24.148735+08
72fb7786-c6e8-4efc-9c5d-604cba3068bd	SEC-KSA-FIN-BANK	e0b16864-df25-4a2d-9307-50b0719009b3	3	t	30	{all}	2026-03-17 08:24:24.148735+08
dce8447b-c2d9-431f-b443-9a5d9e8acd69	SEC-KSA-FIN-BANK	187387f4-b146-483c-a947-482861ce3604	7	t	30	{all}	2026-03-17 08:24:24.148735+08
71cf8c24-6f03-4ce6-8ccb-bf9a49649939	SEC-KSA-FIN-BANK	e118b2d7-5ae8-41fa-9326-82d405026ded	8	t	30	{all}	2026-03-17 08:24:24.148735+08
ff607759-258f-4bda-b874-c944060cfd97	SEC-KSA-FIN-BANK	b5db52c0-e52d-44ca-bc6d-86035d711a4d	11	f	60	{compliance_officer,admin}	2026-03-17 08:24:24.148735+08
c50229a1-0c96-40c8-bfb1-d662b7785fb3	SEC-KSA-FIN-INS	94a6c477-7795-449a-97d8-ba1ead192da5	2	t	30	{all}	2026-03-17 08:24:24.148735+08
26fa69a6-db9c-4c75-8085-81d311553201	SEC-KSA-FIN-INS	1c760788-3591-40ca-bca8-99f459432bd2	6	t	30	{all}	2026-03-17 08:24:24.148735+08
16862bbf-909a-4f8f-9f91-6673c279f79c	SEC-KSA-FIN-INS	b1c2a7e6-3434-4be8-ad0c-baaa4aeb46c1	1	t	30	{all}	2026-03-17 08:24:24.148735+08
42b7e69e-4257-4777-a678-8c30556e8d46	SEC-KSA-FIN-INS	26198ff1-288b-4654-b10f-11cdbc11ab24	5	t	30	{compliance_officer,risk_manager}	2026-03-17 08:24:24.148735+08
7fee6b4d-b87c-44aa-952c-81dad888b8f2	SEC-KSA-FIN-INS	32c9434e-8dd9-40f0-9bd8-152c2cabb74c	4	t	30	{compliance_officer,admin}	2026-03-17 08:24:24.148735+08
ea51917b-8b78-4cd2-ae3a-00eaa6950dae	SEC-KSA-FIN-INS	e0b16864-df25-4a2d-9307-50b0719009b3	3	t	30	{all}	2026-03-17 08:24:24.148735+08
4e8ea330-3a81-4158-8a88-48d7861cabac	SEC-KSA-FIN-INS	187387f4-b146-483c-a947-482861ce3604	7	t	30	{all}	2026-03-17 08:24:24.148735+08
4a09f974-9fc6-447e-b31d-ea6f95c5e290	SEC-KSA-FIN-CAP	94a6c477-7795-449a-97d8-ba1ead192da5	4	t	30	{all}	2026-03-17 08:24:24.148735+08
5f6de874-98fe-410a-9461-ea3b28cbe12a	SEC-KSA-FIN-CAP	e0b16864-df25-4a2d-9307-50b0719009b3	5	t	30	{all}	2026-03-17 08:24:24.148735+08
8c99e764-a577-4953-85ab-8a5b311ed3e7	SEC-KSA-FIN-CAP	4b892720-c474-4090-9ce5-95719fb89f38	1	t	30	{all}	2026-03-17 08:24:24.148735+08
e5fd76c3-6ce0-480d-af78-67a3693a5e8a	SEC-KSA-FIN-CAP	bca9ecd4-457f-4f7d-8857-0372093c272f	2	t	30	{compliance_officer,risk_manager}	2026-03-17 08:24:24.148735+08
856caed8-e3b2-4f71-aace-863ae327af03	SEC-KSA-FIN-CAP	39eae67a-91a1-49ca-98a5-39a7de2415ea	3	t	30	{compliance_officer,admin}	2026-03-17 08:24:24.148735+08
2710afd9-8253-4b1c-9c89-456cf9073128	SEC-KSA-FIN-CAP	c666f171-6f73-4e83-9efd-0ebe3c4ef064	6	f	60	{admin,compliance_officer}	2026-03-17 08:24:24.148735+08
b8bacc69-9454-4981-ae5a-c948527da1ea	SEC-KSA-FIN-CAP	5d6695b3-868c-4768-98c0-45abae7f5e60	7	f	60	{admin}	2026-03-17 08:24:24.148735+08
27501c30-5425-4311-91ed-e1482d6f1e32	SEC-KSA-HEALTH-HOSP	94a6c477-7795-449a-97d8-ba1ead192da5	3	t	30	{all}	2026-03-17 08:24:24.148735+08
09c3c150-f2d8-42c2-8339-972f042e4b82	SEC-KSA-HEALTH-HOSP	1c760788-3591-40ca-bca8-99f459432bd2	6	t	30	{all}	2026-03-17 08:24:24.148735+08
09f0ec29-d20e-4ae3-b4c5-498977454dae	SEC-KSA-HEALTH-HOSP	e0b16864-df25-4a2d-9307-50b0719009b3	2	t	30	{all}	2026-03-17 08:24:24.148735+08
3ebfa191-d66d-4fd3-b33e-f441ca61c57e	SEC-KSA-HEALTH-HOSP	8fafdceb-207e-46a1-92de-76aaf5f36b76	1	t	30	{all}	2026-03-17 08:24:24.148735+08
437fc5ae-1ab4-4232-bc98-fbccdea3a610	SEC-KSA-HEALTH-HOSP	e069838b-ea80-457b-8931-ddcd8fae9095	5	f	60	{compliance_officer,admin}	2026-03-17 08:24:24.148735+08
04df3c0d-23a8-42de-8e39-55b75a1c1fb8	SEC-KSA-HEALTH-HOSP	02cc1ebd-8175-4250-b142-5241d28bfad0	4	t	30	{all}	2026-03-17 08:24:24.148735+08
67e30990-4cd0-4f33-9e28-a2f044e4a02f	SEC-KSA-ICT-TELCO	94a6c477-7795-449a-97d8-ba1ead192da5	1	t	30	{all}	2026-03-17 08:24:24.148735+08
27617a68-3014-444a-94ab-4e3dd3894552	SEC-KSA-ICT-TELCO	b18bf619-1740-4c45-9625-68532fa2b14e	6	f	60	{compliance_officer}	2026-03-17 08:24:24.148735+08
8bc53ad2-77a2-416a-a85f-948f9984ea0a	SEC-KSA-ICT-TELCO	d0caaedf-21fb-43a1-8a72-7066871eed38	2	t	30	{all}	2026-03-17 08:24:24.148735+08
7150f6f7-753d-4133-aef1-cdc9731c5af6	SEC-KSA-ICT-TELCO	1c760788-3591-40ca-bca8-99f459432bd2	7	t	30	{all}	2026-03-17 08:24:24.148735+08
44720841-4ddc-4f34-a359-688d2b12b9f8	SEC-KSA-ICT-TELCO	e0b16864-df25-4a2d-9307-50b0719009b3	4	t	30	{all}	2026-03-17 08:24:24.148735+08
f6db3bdd-9379-42cd-b391-ccc34ccdbb25	SEC-KSA-ICT-TELCO	9efd99c0-e69f-4088-a670-1b07b4aa0861	3	t	30	{compliance_officer,admin}	2026-03-17 08:24:24.148735+08
5ce722eb-845b-4609-9bab-54bea5af5936	SEC-KSA-ICT-TELCO	5ab3ec9e-0b34-445e-87c5-98f73254258c	5	f	60	{risk_manager,admin}	2026-03-17 08:24:24.148735+08
327b220e-4479-41b4-b8e7-94eba67ce128	SEC-KSA-ENERGY-OIL	94a6c477-7795-449a-97d8-ba1ead192da5	1	t	30	{all}	2026-03-17 08:24:24.148735+08
0d026b93-0aa6-4a29-9332-eb97c1236a6c	SEC-KSA-ENERGY-OIL	aef9a910-501e-4086-88d4-9950076b36f5	2	t	30	{all}	2026-03-17 08:24:24.148735+08
f54318dd-92a6-4fbe-9a21-545f937c8861	SEC-KSA-ENERGY-OIL	1c760788-3591-40ca-bca8-99f459432bd2	6	t	30	{all}	2026-03-17 08:24:24.148735+08
7aa4590d-cc69-43c7-bdd4-e2d7192bacf4	SEC-KSA-ENERGY-OIL	e0b16864-df25-4a2d-9307-50b0719009b3	4	t	30	{all}	2026-03-17 08:24:24.148735+08
c9636f9c-9523-4af9-9b02-653173535bf2	SEC-KSA-ENERGY-OIL	9661ac14-7862-48d9-a7e7-865ec84d033e	3	t	30	{all}	2026-03-17 08:24:24.148735+08
d2344bcb-8fb5-4f6a-a8f3-66226c6bdfa4	SEC-KSA-ENERGY-OIL	b8dfb3a7-d083-4a2e-ac1a-bbab702ac3de	5	t	45	{compliance_officer,risk_manager}	2026-03-17 08:24:24.148735+08
871545bb-3308-4162-88cb-52cbcede8462	SEC-KSA-GOV-FED	94a6c477-7795-449a-97d8-ba1ead192da5	1	t	30	{all}	2026-03-17 08:24:24.148735+08
6d933ffc-dd22-4a80-bbee-0d916e7d3ceb	SEC-KSA-GOV-FED	e0b16864-df25-4a2d-9307-50b0719009b3	3	t	30	{all}	2026-03-17 08:24:24.148735+08
a93aa2d9-1ea2-4ee6-8c39-7247b2dabb9d	SEC-KSA-GOV-FED	a4bb8d85-040e-404c-a124-c5ce839b4156	2	t	30	{all}	2026-03-17 08:24:24.148735+08
9c44ed29-6d5d-405c-bcba-a99863b558ca	SEC-KSA-GOV-FED	76154cb8-d59e-4fd7-a753-38d8276e842b	6	f	60	{compliance_officer,admin}	2026-03-17 08:24:24.148735+08
b654ecd8-e77b-4342-9bd7-0f682e54f6ca	SEC-KSA-GOV-FED	d4e4c88e-2237-4917-a9ff-c04d1510d5e2	7	f	60	{admin}	2026-03-17 08:24:24.148735+08
a23f561b-9c44-4ccd-8980-2613da1cd4f3	SEC-KSA-GOV-FED	e118b2d7-5ae8-41fa-9326-82d405026ded	4	t	30	{all}	2026-03-17 08:24:24.148735+08
7e8d686c-c2d6-49ec-8c4b-b86b968aef4f	SEC-KSA-GOV-FED	c5dea706-946c-48ec-9b28-4c55f39bad3f	5	f	60	{admin}	2026-03-17 08:24:24.148735+08
2fd9b8dc-5d8a-49a9-a044-af28da0c38bd	SEC-KSA-DEFAULT	94a6c477-7795-449a-97d8-ba1ead192da5	1	t	30	{all}	2026-03-17 08:24:24.148735+08
b78f2148-14a3-4cd4-8d99-9af1e5971805	SEC-KSA-DEFAULT	1c760788-3591-40ca-bca8-99f459432bd2	7	f	60	{all}	2026-03-17 08:24:24.148735+08
7d461ea5-0894-41a2-805f-4e3dd4ec216a	SEC-KSA-DEFAULT	e0b16864-df25-4a2d-9307-50b0719009b3	2	t	30	{all}	2026-03-17 08:24:24.148735+08
afbc7f3c-588a-476d-abfe-680194779138	SEC-KSA-DEFAULT	9d967104-b9ae-4ea5-9cde-74e625316076	6	t	45	{admin,compliance_officer}	2026-03-17 08:24:24.148735+08
a4524cb6-1a2a-492c-9a44-8779f43eb7df	SEC-KSA-DEFAULT	ee88fbd3-84d0-4f26-9dc2-d8b2334550b1	5	t	45	{admin,compliance_officer}	2026-03-17 08:24:24.148735+08
a1cbc3b5-2e27-4043-be86-112b4c9914d2	SEC-KSA-DEFAULT	187387f4-b146-483c-a947-482861ce3604	4	t	30	{all}	2026-03-17 08:24:24.148735+08
20de0892-7ea8-4eaf-8acd-0ad55c9dceb7	SEC-KSA-DEFAULT	e118b2d7-5ae8-41fa-9326-82d405026ded	3	t	30	{all}	2026-03-17 08:24:24.148735+08
9a0ee893-663f-47b0-8bcb-b2387023c24b	SEC-KSA-RETAIL	94a6c477-7795-449a-97d8-ba1ead192da5	2	t	30	{all}	2026-03-17 08:24:24.148735+08
542a9a2c-1314-4a66-a094-e3b0fe7e89fa	SEC-KSA-RETAIL	e0b16864-df25-4a2d-9307-50b0719009b3	1	t	30	{all}	2026-03-17 08:24:24.148735+08
c64aaa56-8b71-48f3-88db-b3880fe3a459	SEC-KSA-RETAIL	9d967104-b9ae-4ea5-9cde-74e625316076	3	t	30	{admin,compliance_officer}	2026-03-17 08:24:24.148735+08
f9c65df9-82bf-4271-8858-93c91c693660	SEC-KSA-RETAIL	ee88fbd3-84d0-4f26-9dc2-d8b2334550b1	5	t	45	{admin}	2026-03-17 08:24:24.148735+08
3ee5df8e-16d9-4e96-ba79-8b028b782dc3	SEC-KSA-RETAIL	4dbc6df6-c500-411e-870d-a920caff6f12	4	t	30	{admin,compliance_officer}	2026-03-17 08:24:24.148735+08
20fff616-94bd-4626-a30b-58684b26a54a	SEC-KSA-RETAIL	db1f31c7-beb1-4740-8aca-e7c5d331e649	6	f	60	{compliance_officer}	2026-03-17 08:24:24.148735+08
af3478d6-33d2-4346-8757-d67815c5fa1c	SEC-KSA-RETAIL	cbb41a49-8492-4b75-87e6-cbd4f3cc01c2	7	f	60	{admin}	2026-03-17 08:24:24.148735+08
\.


ALTER TABLE __TENANT_SCHEMA__.sector_training_paths ENABLE TRIGGER ALL;

--
-- Data for Name: settings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.settings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.settings (setting_id, setting_key, setting_value, category, description, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.settings ENABLE TRIGGER ALL;

--
-- Data for Name: shadow_agent_config; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.shadow_agent_config DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.shadow_agent_config (config_id, tenant_id, user_id, enabled, autonomy_level, allowed_agents, delegation_rules, memory_namespace, preferences, max_actions_per_day, actions_today, actions_today_reset, last_active_at, created_at, updated_at, consent_granted, consent_granted_at, consent_purpose, consent_revoked_at, pii_redaction_enabled) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.shadow_agent_config ENABLE TRIGGER ALL;

--
-- Data for Name: siem_connections; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.siem_connections DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.siem_connections (connection_id, name, siem_type, endpoint_url, auth_method, credentials_encrypted, sync_schedule_cron, sync_enabled, event_types_filter, severity_filter, last_validated_at, validation_status, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.siem_connections ENABLE TRIGGER ALL;

--
-- Data for Name: siem_events; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.siem_events DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.siem_events (event_id, connection_id, external_event_id, event_type, severity, source_ip, destination_ip, raw_log, parsed_data, matched_control_ids, matched_risk_ids, incident_id, status, ingested_at, event_timestamp) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.siem_events ENABLE TRIGGER ALL;

--
-- Data for Name: siem_sync_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.siem_sync_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.siem_sync_history (sync_id, connection_id, status, events_fetched, events_new, events_duplicate, errors, duration_ms, started_at, completed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.siem_sync_history ENABLE TRIGGER ALL;

--
-- Data for Name: sign_off_authority_matrix; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.sign_off_authority_matrix DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.sign_off_authority_matrix (rule_id, finding_severity, required_role, escalation_timeout_hours, requires_dual_approval, severity_order, active, created_by, created_at, updated_at) FROM stdin;
74456cd3-8b31-40c0-9131-ca77d8c2d4fb	critical	owner	48	t	1	t	\N	2026-03-17 08:24:18.915427+08	2026-03-17 08:24:18.915427+08
1b89f834-226c-4b3c-a81d-33a0f14c5d29	high	admin	48	t	2	t	\N	2026-03-17 08:24:18.915427+08	2026-03-17 08:24:18.915427+08
265b01a8-0663-4de4-aa83-e515ba261412	medium	compliance_officer	48	f	3	t	\N	2026-03-17 08:24:18.915427+08	2026-03-17 08:24:18.915427+08
e1e0e498-1790-46e4-9eaa-643b1d0a3c93	low	auditor	48	f	4	t	\N	2026-03-17 08:24:18.915427+08	2026-03-17 08:24:18.915427+08
\.


ALTER TABLE __TENANT_SCHEMA__.sign_off_authority_matrix ENABLE TRIGGER ALL;

--
-- Data for Name: simulations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.simulations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.simulations (simulation_id, source_snapshot, changes_applied, impact_projection, status, created_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.simulations ENABLE TRIGGER ALL;

--
-- Data for Name: sla_auto_setup_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.sla_auto_setup_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.sla_auto_setup_log (setup_id, regulation_source, team_id, process_type, configured_sla_hours, warning_threshold_percent, escalation_levels, framework_code, control_id, regulator_id, regulation_citation, setup_timestamp, setup_reason, setup_method, overridden, override_by, override_timestamp, override_reason, override_approved, original_sla_hours, validated_against_source, validation_timestamp, validation_notes, created_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.sla_auto_setup_log ENABLE TRIGGER ALL;

--
-- Data for Name: sla_definitions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.sla_definitions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.sla_definitions (sla_id, name, description, entity_type, metric_type, target_value, target_unit, warning_threshold, critical_threshold, escalation_chain, applicable_severities, applicable_priorities, enabled, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.sla_definitions ENABLE TRIGGER ALL;

--
-- Data for Name: sla_breaches; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.sla_breaches DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.sla_breaches (breach_id, sla_id, entity_type, entity_id, expected_value, actual_value, breach_severity, acknowledged, acknowledged_by, acknowledged_at, resolved, resolved_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.sla_breaches ENABLE TRIGGER ALL;

--
-- Data for Name: sla_config; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.sla_config DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.sla_config (config_id, process_type, team_id, priority_level, initial_sla_hours, warning_threshold_percent, critical_threshold_percent, escalation_1_hours, escalation_1_to_team_id, escalation_1_to_role, escalation_2_hours, escalation_2_to_team_id, escalation_2_to_role, escalation_3_hours, escalation_3_to_team_id, escalation_3_to_role, auto_escalate, auto_notify, auto_reassign, auto_configured, configured_from_regulation, override_allowed, override_justification, override_approved_by, override_approved_date, business_hours_only, business_hours_start, business_hours_end, business_days, active, created_by, created_at, updated_at) FROM stdin;
f869876c-d04f-4224-b8b4-60d876910525	incident_reporting	4ab47114-2a8a-4da5-9e9f-dbf34143b7aa	\N	2	75	90	2	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	4	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	2	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	t	t	f	t	7763d1c5-c499-4e67-aa8f-10db6a0bc85c	f	\N	\N	\N	f	08:00:00	18:00:00	MTWTF	t	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
425f8458-1393-4c68-802c-cb0e0263e11a	vulnerability_remediation	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	24	75	90	12	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	18	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	24	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	t	t	f	t	3ad3f47d-9c9a-41ab-a60d-03b88ffc1fa2	f	\N	\N	\N	f	08:00:00	18:00:00	MTWTF	t	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
2b8dad51-16f1-4129-b25f-810a9f475c88	breach_notification	cde8e3a5-965d-4ec6-b879-5676c76567e8	\N	72	75	90	36	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	54	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	72	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	t	t	f	t	35221d46-544d-4a00-b56b-3ca82f2580c8	f	\N	\N	\N	t	08:00:00	18:00:00	MTWTF	t	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
8fe2c768-0336-43c8-bbbd-2a2f84ad6269	access_review	7b86d19c-117c-4444-ae00-689ab1f7e9b7	\N	720	75	90	360	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	540	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	720	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	t	t	f	t	15e440d4-26be-4097-b58e-23f963e7d42d	f	\N	\N	\N	t	08:00:00	18:00:00	MTWTF	t	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
801b37ac-4a1e-4245-9854-c56921f68683	data_breach_notification	cde8e3a5-965d-4ec6-b879-5676c76567e8	\N	72	75	90	36	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	54	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	72	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	t	t	f	t	de6309cd-9307-4849-a4cc-c62e920c4bf1	f	\N	\N	\N	t	08:00:00	18:00:00	MTWTF	t	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
29319ce2-7a41-4694-9983-ef486661730f	dsr_response	cde8e3a5-965d-4ec6-b879-5676c76567e8	\N	720	75	90	360	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	540	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	720	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	t	t	f	t	e95b7ae3-afcb-484b-94b1-8cee238291b3	f	\N	\N	\N	t	08:00:00	18:00:00	MTWTF	t	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
fcbc1231-3163-46fd-94ba-ab3153ac5b87	invoice_submission	0fa2f110-8687-4e71-af63-8865f07631a1	\N	24	75	90	12	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	18	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	24	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	t	t	f	t	d934813e-6ffa-4613-b130-9710b08e2f1a	f	\N	\N	\N	f	08:00:00	18:00:00	MTWTF	t	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
dd68b126-86b7-4a5b-8977-82a6e4a889ba	tax_filing	0fa2f110-8687-4e71-af63-8865f07631a1	\N	720	75	90	360	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	540	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	720	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	t	t	f	t	8ea8114a-1970-43d0-8341-e3c6c7e0ffbc	f	\N	\N	\N	t	08:00:00	18:00:00	MTWTF	t	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
e36256c9-0d9b-4609-bbf4-114782c21d6f	material_disclosure	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	2	75	90	2	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	4	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	2	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	t	t	f	t	e8fc7d88-2416-4595-baf6-c9d4e1992f79	f	\N	\N	\N	f	08:00:00	18:00:00	MTWTF	t	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
56e477b4-9f31-44b8-b120-722288a86796	injury_reporting	baa82233-2f98-461b-9ad1-744430c24b5b	\N	24	75	90	12	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	18	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	24	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	t	t	f	t	289ffcb7-c9bb-42f5-939a-d36f19e2de4c	f	\N	\N	\N	f	08:00:00	18:00:00	MTWTF	t	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
79d7d3e6-cca9-447d-bc69-0a8a65bf3a55	workflow_task	c0f356ac-dadc-440c-9a2e-749fc833af3c	critical	4	75	90	2	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	3	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	4	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	t	t	f	f	\N	f	\N	\N	\N	t	08:00:00	18:00:00	MTWTF	t	\N	2026-03-17 08:24:24.209371+08	2026-03-17 08:24:24.209371+08
33b2c573-6a43-4edf-a1e5-bbb00f15d66d	workflow_task	c0f356ac-dadc-440c-9a2e-749fc833af3c	high	8	75	90	4	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	6	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	8	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	t	t	f	f	\N	f	\N	\N	\N	t	08:00:00	18:00:00	MTWTF	t	\N	2026-03-17 08:24:24.209371+08	2026-03-17 08:24:24.209371+08
454cca03-75c4-4740-b362-ead25ee8480b	workflow_task	c0f356ac-dadc-440c-9a2e-749fc833af3c	medium	24	75	90	12	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	18	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	24	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	t	t	f	f	\N	f	\N	\N	\N	t	08:00:00	18:00:00	MTWTF	t	\N	2026-03-17 08:24:24.209371+08	2026-03-17 08:24:24.209371+08
84a75e7c-a241-40b1-b1b4-9470b1462476	workflow_task	c0f356ac-dadc-440c-9a2e-749fc833af3c	low	72	75	90	36	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	54	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	72	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	t	t	f	f	\N	f	\N	\N	\N	t	08:00:00	18:00:00	MTWTF	t	\N	2026-03-17 08:24:24.209371+08	2026-03-17 08:24:24.209371+08
0a6e81ac-3451-414b-8b03-c0c24d72d711	workflow_approval	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	critical	2	75	90	1	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	2	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	2	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	t	t	f	f	\N	f	\N	\N	\N	t	08:00:00	18:00:00	MTWTF	t	\N	2026-03-17 08:24:24.209371+08	2026-03-17 08:24:24.209371+08
18aa9131-b4a9-4f7e-9793-e967d6ca215c	workflow_approval	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	high	4	75	90	2	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	3	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	4	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	t	t	f	f	\N	f	\N	\N	\N	t	08:00:00	18:00:00	MTWTF	t	\N	2026-03-17 08:24:24.209371+08	2026-03-17 08:24:24.209371+08
5206b5af-954f-40d3-8966-4ab4a0d7824b	workflow_approval	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	medium	12	75	90	6	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	9	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	12	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	t	t	f	f	\N	f	\N	\N	\N	t	08:00:00	18:00:00	MTWTF	t	\N	2026-03-17 08:24:24.209371+08	2026-03-17 08:24:24.209371+08
3c11a08f-1d86-49b7-8ad6-33eb4f7f5d78	workflow_approval	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	low	48	75	90	24	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	\N	36	58813635-5385-4a0f-8ee1-b5dc871b4744	\N	48	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	\N	t	t	f	f	\N	f	\N	\N	\N	t	08:00:00	18:00:00	MTWTF	t	\N	2026-03-17 08:24:24.209371+08	2026-03-17 08:24:24.209371+08
\.


ALTER TABLE __TENANT_SCHEMA__.sla_config ENABLE TRIGGER ALL;

--
-- Data for Name: sla_predictions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.sla_predictions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.sla_predictions (prediction_id, entity_type, entity_id, predicted_completion_time, confidence_level, risk_of_breach, recommended_action, historical_performance, team_workload_factor, complexity_factor, dependency_factor, actual_completion_time, prediction_accuracy, predicted_at, model_used, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.sla_predictions ENABLE TRIGGER ALL;

--
-- Data for Name: sod_conflict_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.sod_conflict_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.sod_conflict_log (id, user_id, role_a, role_b, conflict_type, risk_level, detected_at, resolved_at, resolved_by, resolution_notes, status, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.sod_conflict_log ENABLE TRIGGER ALL;

--
-- Data for Name: sod_conflict_matrix; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.sod_conflict_matrix DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.sod_conflict_matrix (conflict_id, role_a, role_b, scope, reason_en, reason_ar, severity, active, created_at) FROM stdin;
52f3e68f-ec57-441d-b5d1-c88ae3140b9b	risk_manager	auditor	tenant	Cannot audit own risk assessments	لا يمكن تدقيق تقييمات المخاطر الخاصة	hard	t	2026-03-17 08:24:18.812734+08
cf42fa99-b315-4c9c-9638-32d73df26b81	compliance_officer	auditor	tenant	Cannot audit own compliance work	لا يمكن تدقيق أعمال الامتثال الخاصة	hard	t	2026-03-17 08:24:18.812734+08
a095b6c3-f0c0-4e30-9af5-9c3dd792dad0	admin	auditor	tenant	Admin can modify anything auditor reviews	يمكن للمسؤول تعديل أي شيء يراجعه المدقق	soft	t	2026-03-17 08:24:18.812734+08
\.


ALTER TABLE __TENANT_SCHEMA__.sod_conflict_matrix ENABLE TRIGGER ALL;

--
-- Data for Name: sod_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.sod_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.sod_rules (id, role_code_a, role_code_b, module_code, conflict_level, scope_rule, description, is_active, created_at, cross_module, module_code_b) FROM stdin;
1	policy_author	policy_approver	policy	block	same_scope	Author cannot approve own policy	t	2026-03-17 08:24:23.609869+08	f	\N
2	risk_owner	risk_approver	risk	block	same_scope	Owner cannot approve critical risk in same scope	t	2026-03-17 08:24:23.609869+08	f	\N
3	control_owner	control_tester	compliance	block	same_scope	Control owner cannot test same control	t	2026-03-17 08:24:23.609869+08	f	\N
4	auditor	auditee_owner	audit	block	same_scope	Auditor cannot be auditee owner in same scope	t	2026-03-17 08:24:23.609869+08	f	\N
5	evidence_owner	evidence_reviewer	evidence	warn	same_scope	Maker-checker separation preferred	t	2026-03-17 08:24:23.609869+08	f	\N
6	exception_requester	exception_approver	exception	block	same_scope	Requester cannot approve own exception	t	2026-03-17 08:24:23.609869+08	f	\N
7	incident_owner	incident_approver	incident	warn	same_scope	Incident owner should not approve own incident	t	2026-03-17 08:24:23.609869+08	f	\N
8	vendor_owner	vendor_assessor	vendor	warn	same_scope	Vendor owner should not assess own vendor	t	2026-03-17 08:24:23.609869+08	f	\N
9	tenant_admin	external_auditor	\N	block	tenant_wide	External auditor must stay independent from tenant administration	t	2026-03-17 08:24:23.656243+08	f	\N
10	policy_author	policy_reviewer	policy	warn	same_scope	Author should not review own policy	t	2026-03-17 08:24:23.656243+08	f	\N
11	governance_manager	executive_reviewer	governance	warn	same_scope	Governance manager should not self-review	t	2026-03-17 08:24:23.656243+08	f	\N
12	auditor	evidence_owner	audit	block	same_scope	Auditor cannot own evidence for the scope they audit	t	2026-03-17 08:24:23.716086+08	t	evidence
13	risk_owner	evidence_owner	risk	warn	same_scope	Risk identifier should not provide mitigation evidence	t	2026-03-17 08:24:23.716086+08	t	evidence
14	vendor_assessor	risk_approver	vendor	warn	tenant_wide	Vendor risk assessor should not approve resulting risks	t	2026-03-17 08:24:23.716086+08	t	risk
15	policy_author	exception_approver	policy	warn	same_scope	Policy author should not approve exceptions to own policy	t	2026-03-17 08:24:23.716086+08	t	exception
16	tenant_admin	external_auditor	\N	block	tenant_wide	Tenant admin cannot also be external auditor	t	2026-03-17 08:24:23.716086+08	f	\N
17	tenant_admin	external_auditor	\N	block	tenant_wide	Tenant administrators cannot simultaneously hold external auditor roles to preserve audit independence	t	2026-03-17 08:24:23.848038+08	f	\N
\.


ALTER TABLE __TENANT_SCHEMA__.sod_rules ENABLE TRIGGER ALL;

--
-- Data for Name: sop_procedures; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.sop_procedures DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.sop_procedures (sop_id, process_type, stage_id, role_id, title_en, title_ar, steps_en, steps_ar, prerequisites, expected_output, sla_hours, version, status, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.sop_procedures ENABLE TRIGGER ALL;

--
-- Data for Name: supervisory_reviews; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.supervisory_reviews DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.supervisory_reviews (review_id, report_id, requested_by, supervisor_id, decision, comments, status, decided_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.supervisory_reviews ENABLE TRIGGER ALL;

--
-- Data for Name: task_auto_resolution_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.task_auto_resolution_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.task_auto_resolution_rules (id, entity_type, task_type, trigger_event, resolution_conditions, auto_close, require_validation, validation_min_score, active, created_at, updated_at) FROM stdin;
1	evidence	evidence_request	evidence.submitted	{}	t	f	0.00	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
2	evidence	evidence_request	evidence.validated	{}	t	f	0.00	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
3	control	control_review	evidence.validated	{}	t	t	0.80	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
4	control	control_review	control.assessment_complete	{}	t	f	0.00	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
5	policy	policy_creation	policy.published	{}	t	f	0.00	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
6	policy	control_review	policy.reviewed	{}	t	f	0.00	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
7	risk	risk_assessment	risk.score_updated	{}	t	f	0.00	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
8	risk	remediation	risk.treatment_completed	{}	t	t	0.00	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
9	incident	incident_response	incident.resolved	{}	t	f	0.00	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
10	vendor	risk_assessment	vendor.assessment_complete	{}	t	f	0.00	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
11	finding	audit_response	finding.remediated	{}	t	f	0.00	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
12	approval	verification	approval.completed	{}	t	f	0.00	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
13	governance_action	remediation	governance.action_completed	{}	t	f	0.00	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
14	committee	verification	governance.meeting_held	{}	t	f	0.00	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
15	procedure	control_review	governance.procedure_reviewed	{}	t	f	0.00	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
16	mandate	verification	governance.mandate_renewed	{}	t	f	0.00	t	2026-03-17 08:24:23.793625+08	2026-03-17 08:24:23.793625+08
\.


ALTER TABLE __TENANT_SCHEMA__.task_auto_resolution_rules ENABLE TRIGGER ALL;

--
-- Data for Name: task_routing_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.task_routing_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.task_routing_rules (rule_id, rule_name, rule_priority, task_type, task_attributes, routing_algorithm, eligible_teams, required_skills, exclude_teams, max_concurrent_per_user, max_concurrent_per_team, consider_time_zones, consider_leave_calendar, assignments_made, successful_completions, average_completion_hours, active, created_at, updated_at) FROM stdin;
36f1d71d-376e-432f-b99a-d9b20879c154	Critical Incident Routing	10	incident_response	{"severity": "critical"}	skill_based	\N	{"forensics": "intermediate", "crisis_management": "advanced", "incident_response": "advanced"}	\N	1	3	t	t	0	0	\N	t	2026-03-17 08:24:21.668446+08	2026-03-17 08:24:21.668446+08
dd707d3c-a37e-4e47-9706-5fa9b5308b04	Evidence Collection Load Balancing	50	evidence_request	{"priority": {"$in": ["medium", "low"]}}	least_loaded	\N	{"evidence_collection": "basic"}	\N	5	20	t	t	0	0	\N	t	2026-03-17 08:24:21.668446+08	2026-03-17 08:24:21.668446+08
88140112-9760-4467-974d-e7bd16f00561	High-Risk Assessment Expert Routing	20	risk_assessment	{"risk_score": {"$gte": 80}}	skill_based	\N	{"risk_assessment": "expert", "regulatory_compliance": "advanced"}	\N	2	5	t	t	0	0	\N	t	2026-03-17 08:24:21.668446+08	2026-03-17 08:24:21.668446+08
\.


ALTER TABLE __TENANT_SCHEMA__.task_routing_rules ENABLE TRIGGER ALL;

--
-- Data for Name: team_collaboration_matrix; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.team_collaboration_matrix DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.team_collaboration_matrix (collaboration_id, matrix_name, process_type, process_stage, primary_team_id, supporting_team_id, collaboration_type, collaboration_role, mandatory, conditional_rule, sequence_order, can_parallel, sla_hours, warning_threshold_hours, escalation_threshold_hours, handoff_requirements, deliverables_expected, success_criteria, escalation_path, escalation_team_id, active, effective_date, expiry_date, created_by, created_at, updated_at) FROM stdin;
a0a0356a-37a4-4fc8-b30d-28154d60cf2d	Evidence Validation - ERM to DATA_GOV	evidence_validation	\N	58813635-5385-4a0f-8ee1-b5dc871b4744	81795efe-abd5-485d-9dbc-ad5b8a80a260	validation	\N	t	\N	\N	f	24	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
97d0c190-9cd0-4072-b0f6-830f67385693	Evidence Validation - ERM to QUALITY	evidence_validation	\N	58813635-5385-4a0f-8ee1-b5dc871b4744	c0f356ac-dadc-440c-9a2e-749fc833af3c	validation	\N	t	\N	\N	f	24	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
18f9a34f-16ae-4571-acec-f91659281f54	Evidence Validation - ERM to PRIVACY	evidence_validation	\N	58813635-5385-4a0f-8ee1-b5dc871b4744	cde8e3a5-965d-4ec6-b879-5676c76567e8	validation	\N	t	\N	\N	f	24	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
4737316a-9881-431d-8bb5-b12120a96cad	Evidence Validation - CYBER_GOV to DATA_GOV	evidence_validation	\N	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	81795efe-abd5-485d-9dbc-ad5b8a80a260	validation	\N	t	\N	\N	f	24	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
fef88540-f69f-484a-9f20-37151e6cfafa	Evidence Validation - CYBER_GOV to QUALITY	evidence_validation	\N	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	c0f356ac-dadc-440c-9a2e-749fc833af3c	validation	\N	t	\N	\N	f	24	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
9096af7c-cdd9-4ec1-b1ff-cdb6aae6d0f4	Evidence Validation - CYBER_GOV to PRIVACY	evidence_validation	\N	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	cde8e3a5-965d-4ec6-b879-5676c76567e8	validation	\N	t	\N	\N	f	24	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
c76d67ae-0624-422f-a090-d761dc94db1a	Evidence Validation - AUDIT to DATA_GOV	evidence_validation	\N	3955d2de-4d69-4de5-85a0-4b64944b3b73	81795efe-abd5-485d-9dbc-ad5b8a80a260	validation	\N	t	\N	\N	f	24	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
186947a3-6096-4b51-af28-495ad73ecd78	Evidence Validation - AUDIT to QUALITY	evidence_validation	\N	3955d2de-4d69-4de5-85a0-4b64944b3b73	c0f356ac-dadc-440c-9a2e-749fc833af3c	validation	\N	t	\N	\N	f	24	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
6eba6953-a9d1-4d83-a753-90977f4beae5	Evidence Validation - AUDIT to PRIVACY	evidence_validation	\N	3955d2de-4d69-4de5-85a0-4b64944b3b73	cde8e3a5-965d-4ec6-b879-5676c76567e8	validation	\N	t	\N	\N	f	24	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	2026-03-17 08:24:21.610518+08	2026-03-17 08:24:21.610518+08
f1b67667-2eca-4b03-bde8-8bedf5d4fd4e	Evidence Validation - ERM to DATA_GOV	evidence_validation	\N	58813635-5385-4a0f-8ee1-b5dc871b4744	81795efe-abd5-485d-9dbc-ad5b8a80a260	validation	\N	t	\N	\N	f	24	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	2026-03-17 08:24:24.413471+08	2026-03-17 08:24:24.413471+08
648ed99d-b726-4566-ac10-e052a44646d0	Evidence Validation - ERM to QUALITY	evidence_validation	\N	58813635-5385-4a0f-8ee1-b5dc871b4744	c0f356ac-dadc-440c-9a2e-749fc833af3c	validation	\N	t	\N	\N	f	24	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	2026-03-17 08:24:24.413471+08	2026-03-17 08:24:24.413471+08
36558f3a-42f3-4963-b3c8-d820303f0d0f	Evidence Validation - ERM to PRIVACY	evidence_validation	\N	58813635-5385-4a0f-8ee1-b5dc871b4744	cde8e3a5-965d-4ec6-b879-5676c76567e8	validation	\N	t	\N	\N	f	24	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	2026-03-17 08:24:24.413471+08	2026-03-17 08:24:24.413471+08
536e5f10-fdbb-443c-baf7-eada079bff30	Evidence Validation - CYBER_GOV to DATA_GOV	evidence_validation	\N	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	81795efe-abd5-485d-9dbc-ad5b8a80a260	validation	\N	t	\N	\N	f	24	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	2026-03-17 08:24:24.413471+08	2026-03-17 08:24:24.413471+08
10d1231a-302d-4e59-be84-c2fbdb6ea3e3	Evidence Validation - CYBER_GOV to QUALITY	evidence_validation	\N	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	c0f356ac-dadc-440c-9a2e-749fc833af3c	validation	\N	t	\N	\N	f	24	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	2026-03-17 08:24:24.413471+08	2026-03-17 08:24:24.413471+08
c46bb476-9d20-4d07-9620-1dd56e08def5	Evidence Validation - CYBER_GOV to PRIVACY	evidence_validation	\N	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	cde8e3a5-965d-4ec6-b879-5676c76567e8	validation	\N	t	\N	\N	f	24	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	2026-03-17 08:24:24.413471+08	2026-03-17 08:24:24.413471+08
646a01f3-f82c-454a-82f2-02e2e3e9a4d9	Evidence Validation - AUDIT to DATA_GOV	evidence_validation	\N	3955d2de-4d69-4de5-85a0-4b64944b3b73	81795efe-abd5-485d-9dbc-ad5b8a80a260	validation	\N	t	\N	\N	f	24	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	2026-03-17 08:24:24.413471+08	2026-03-17 08:24:24.413471+08
44554899-df46-4af2-b2bd-d466fef55e34	Evidence Validation - AUDIT to QUALITY	evidence_validation	\N	3955d2de-4d69-4de5-85a0-4b64944b3b73	c0f356ac-dadc-440c-9a2e-749fc833af3c	validation	\N	t	\N	\N	f	24	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	2026-03-17 08:24:24.413471+08	2026-03-17 08:24:24.413471+08
5184afa3-0c58-4588-ab15-6a58a09910eb	Evidence Validation - AUDIT to PRIVACY	evidence_validation	\N	3955d2de-4d69-4de5-85a0-4b64944b3b73	cde8e3a5-965d-4ec6-b879-5676c76567e8	validation	\N	t	\N	\N	f	24	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	2026-03-17 08:24:24.413471+08	2026-03-17 08:24:24.413471+08
\.


ALTER TABLE __TENANT_SCHEMA__.team_collaboration_matrix ENABLE TRIGGER ALL;

--
-- Data for Name: team_escalation_paths; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.team_escalation_paths DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.team_escalation_paths (id, from_team_id, escalate_to_team_id, escalation_level, created_at, conditions) FROM stdin;
ab65e21c-7dc1-4e3d-a180-ea5fc42bcd05	4ab47114-2a8a-4da5-9e9f-dbf34143b7aa	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	1	2026-03-17 08:24:21.610518+08	{"priority": "high", "auto_escalate": true, "sla_breach_hours": 24}
732c3e17-7265-4e21-bed7-1f6646a3b0eb	7b86d19c-117c-4444-ae00-689ab1f7e9b7	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	1	2026-03-17 08:24:21.610518+08	{"priority": "high", "auto_escalate": true, "sla_breach_hours": 24}
31797c49-b601-42d5-aca1-07c50a1de48d	81795efe-abd5-485d-9dbc-ad5b8a80a260	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	1	2026-03-17 08:24:21.610518+08	{"priority": "high", "auto_escalate": true, "sla_breach_hours": 24}
08cf62df-277e-4a0a-9882-de4300cd6afa	6c4d2f11-4f06-4796-a973-df9497fc8b93	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	1	2026-03-17 08:24:21.610518+08	{"priority": "high", "auto_escalate": true, "sla_breach_hours": 24}
3d6554c1-9c51-45ac-901f-8fee3645ded2	89a742c3-a93f-4661-b10a-2ae4f9ae2329	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	1	2026-03-17 08:24:21.610518+08	{"priority": "high", "auto_escalate": true, "sla_breach_hours": 24}
6908f2ff-a8f1-4675-aed1-b85236e513b8	83bd0284-7e8c-489c-9200-e9b5aab55716	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	1	2026-03-17 08:24:21.610518+08	{"priority": "high", "auto_escalate": true, "sla_breach_hours": 24}
d9877f92-792b-476f-ad51-2d105bc5e6d6	00310a16-83ca-465e-94a6-2abfed5793e6	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	1	2026-03-17 08:24:21.610518+08	{"priority": "high", "auto_escalate": true, "sla_breach_hours": 24}
95c288b8-086f-49c2-b280-c673ebb2a1b0	c6298086-f66b-418c-87fc-eb8370d7747e	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	1	2026-03-17 08:24:21.610518+08	{"priority": "high", "auto_escalate": true, "sla_breach_hours": 24}
c470773c-a38b-4351-9efa-f50a03063f99	419acddd-0652-4b89-936d-8f563be56a25	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	1	2026-03-17 08:24:21.610518+08	{"priority": "high", "auto_escalate": true, "sla_breach_hours": 24}
7944d66b-4a47-40ed-8a5c-c886ff767233	ee17e8bf-6125-4317-8344-e4c4424ca33c	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	1	2026-03-17 08:24:21.610518+08	{"priority": "high", "auto_escalate": true, "sla_breach_hours": 24}
0a62021c-3139-431d-b42a-a056c930176b	baa82233-2f98-461b-9ad1-744430c24b5b	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	1	2026-03-17 08:24:21.610518+08	{"priority": "high", "auto_escalate": true, "sla_breach_hours": 24}
aa388149-f52a-446c-b481-f081283ad55c	0fa2f110-8687-4e71-af63-8865f07631a1	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	1	2026-03-17 08:24:21.610518+08	{"priority": "high", "auto_escalate": true, "sla_breach_hours": 24}
a8c04aa4-5034-47b6-8b62-cf1803e84af7	c0f356ac-dadc-440c-9a2e-749fc833af3c	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	1	2026-03-17 08:24:21.610518+08	{"priority": "high", "auto_escalate": true, "sla_breach_hours": 24}
a145fa28-2e78-410c-91f9-ca3d5d3029bc	58813635-5385-4a0f-8ee1-b5dc871b4744	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	1	2026-03-17 08:24:21.610518+08	{"priority": "high", "auto_escalate": true, "sla_breach_hours": 24}
59a477e5-f708-42c8-8a21-7744b3e5c9a2	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	1	2026-03-17 08:24:21.610518+08	{"priority": "high", "auto_escalate": true, "sla_breach_hours": 24}
19634c5e-8f86-45aa-96ef-c0a1c76583df	cde8e3a5-965d-4ec6-b879-5676c76567e8	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	1	2026-03-17 08:24:21.610518+08	{"priority": "high", "auto_escalate": true, "sla_breach_hours": 24}
5fff188a-d3ac-4598-aa4c-65730dc9a3e4	3955d2de-4d69-4de5-85a0-4b64944b3b73	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	1	2026-03-17 08:24:21.610518+08	{"priority": "high", "auto_escalate": true, "sla_breach_hours": 24}
\.


ALTER TABLE __TENANT_SCHEMA__.team_escalation_paths ENABLE TRIGGER ALL;

--
-- Data for Name: team_function_mappings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.team_function_mappings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.team_function_mappings (mapping_id, team_code, function_code, is_primary, is_backup, created_at) FROM stdin;
8d1893f4-9d02-40ec-9e4d-9d221e0d7ffc	ERM	RISK_OWNER	t	f	2026-03-17 08:24:21.643367+08
669874f5-5d2c-45e7-961e-b1f134c57f9d	CYBER_GOV	SECURITY_OWNER	t	f	2026-03-17 08:24:21.643367+08
5d2f1116-3a1a-4249-a7bb-a2f72dd6d3ce	DATA_GOV	DATA_OWNER	t	f	2026-03-17 08:24:21.643367+08
0526533c-66fb-4a64-b8d1-116225905b3b	PRIVACY	PRIVACY_OWNER	t	f	2026-03-17 08:24:21.643367+08
891c990d-05bb-48da-b9d4-f11d82d00586	AUDIT	AUDIT_LEAD	t	f	2026-03-17 08:24:21.643367+08
695f9acd-e5f2-4b95-a62f-0f847f521457	BCM_DR	BCM_COORDINATOR	t	f	2026-03-17 08:24:21.643367+08
f05c1cf0-a9f6-4648-a8de-8e5a126be9f2	VENDOR_RISK	VENDOR_MANAGER	t	f	2026-03-17 08:24:21.643367+08
831d02af-8b51-46d1-88ae-b5e4bc6199f7	PMO	PROJECT_MANAGER	t	f	2026-03-17 08:24:21.643367+08
373c42af-7caa-48d4-8910-f22a2874eeb5	QUALITY	POLICY_OWNER	t	f	2026-03-17 08:24:21.643367+08
75d0f7d6-6b7c-4033-a41f-e3cac09cc0f1	SOC_OPS	INCIDENT_HANDLER	t	f	2026-03-17 08:24:21.643367+08
0ada0ce1-1b64-4b9e-8014-dec80a0dd912	CLOUD_INFRA	INFRASTRUCTURE_OWNER	t	f	2026-03-17 08:24:21.643367+08
1042b807-9483-4d4c-bca4-19aa9be95387	APP_ENG	APPLICATION_OWNER	t	f	2026-03-17 08:24:21.643367+08
9414c972-573a-4761-9972-b1030588ea1c	HR_GOV	HR_PROCESS_OWNER	t	f	2026-03-17 08:24:21.643367+08
548aadf4-1003-4124-a1e1-1ef4303d7659	FINANCE	FINANCIAL_CONTROLLER	t	f	2026-03-17 08:24:21.643367+08
c3e10a4e-6232-4caf-b5ba-b0c3cbd8a180	SVC_OPS	SERVICE_OWNER	t	f	2026-03-17 08:24:21.643367+08
\.


ALTER TABLE __TENANT_SCHEMA__.team_function_mappings ENABLE TRIGGER ALL;

--
-- Data for Name: team_handoffs; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.team_handoffs DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.team_handoffs (handoff_id, from_team_id, to_team_id, entity_type, entity_id, entity_title, handoff_type, handoff_reason, expected_action, deliverables_included, success_criteria, sla_hours, due_date, handoff_status, handoff_at, accepted_at, accepted_by, completed_at, completed_by, completion_quality, feedback, rework_required, rework_reason, priority, tags, created_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.team_handoffs ENABLE TRIGGER ALL;

--
-- Data for Name: team_members; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.team_members DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.team_members (team_member_id, team_id, user_id, team_role, joined_at, left_at, active, lifecycle_status, activation_mode, active_profile_id, onboarded_at, last_review_at, performance_score) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.team_members ENABLE TRIGGER ALL;

--
-- Data for Name: team_operation_modes; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.team_operation_modes DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.team_operation_modes (team_mode_id, team_id, operation_mode, confidence_threshold, override_reason, set_by, effective_from, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.team_operation_modes ENABLE TRIGGER ALL;

--
-- Data for Name: team_raci_assignments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.team_raci_assignments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.team_raci_assignments (id, scope_type, scope_id, team_id, raci_role, notes, created_by, created_at, platform_role, updated_at) FROM stdin;
d1408561-4498-46ab-bcbc-bf12b04fc16c	workflow	workflow_automation	c0f356ac-dadc-440c-9a2e-749fc833af3c	responsible	Workflow task routing — default responsible team for workflow-generated tasks	00000000-0000-0000-0000-000000000000	2026-03-17 08:24:24.209371+08	\N	2026-03-17 08:24:24.251131+08
7f6ce792-9686-418e-9546-28e8eede5c44	workflow	workflow_automation	e5139f89-ffbd-4e89-9b85-adb63fd0ce4b	accountable	Workflow oversight — accountable for workflow execution completion	00000000-0000-0000-0000-000000000000	2026-03-17 08:24:24.209371+08	\N	2026-03-17 08:24:24.251131+08
5952c6ef-47c6-47d5-8028-f7ba2b4fffc4	workflow	workflow_automation	f7515ebf-bb79-4945-a3bf-d6367a82cf2c	consulted	Workflow governance — consulted on workflow design and compliance	00000000-0000-0000-0000-000000000000	2026-03-17 08:24:24.209371+08	\N	2026-03-17 08:24:24.251131+08
d59f4569-0385-4157-aa6e-51e417fa8d53	workflow	workflow_automation	3955d2de-4d69-4de5-85a0-4b64944b3b73	informed	Workflow audit trail — informed on all workflow execution activity	00000000-0000-0000-0000-000000000000	2026-03-17 08:24:24.209371+08	\N	2026-03-17 08:24:24.251131+08
\.


ALTER TABLE __TENANT_SCHEMA__.team_raci_assignments ENABLE TRIGGER ALL;

--
-- Data for Name: team_workload; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.team_workload DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.team_workload (workload_id, team_id, measurement_date, open_tasks, assigned_tasks, in_progress_tasks, overdue_tasks, completed_today, pending_evidence_requests, evidence_validations_pending, open_action_items, blocked_action_items, team_capacity_hours, allocated_hours, utilization_percentage, items_approaching_sla, items_breaching_sla, rework_items, quality_score, calculated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.team_workload ENABLE TRIGGER ALL;

--
-- Data for Name: telemetry_signals; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.telemetry_signals DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.telemetry_signals (signal_id, subject_key, signal_type, severity, source, payload, occurred_at, ingested_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.telemetry_signals ENABLE TRIGGER ALL;

--
-- Data for Name: tenant_ai_allowlist; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.tenant_ai_allowlist DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.tenant_ai_allowlist (allowlist_id, tenant_id, provider, model_id, is_enabled, max_tokens_limit, temperature_limit, notes, created_by, updated_by, created_at, updated_at, asset_id, asset_type) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.tenant_ai_allowlist ENABLE TRIGGER ALL;

--
-- Data for Name: tenant_ai_config; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.tenant_ai_config DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.tenant_ai_config (tenant_id, autonomy_level, operation_mode, max_concurrent_llm, monthly_token_budget, monthly_cost_budget, settings, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.tenant_ai_config ENABLE TRIGGER ALL;

--
-- Data for Name: tenant_config_versions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.tenant_config_versions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.tenant_config_versions (version_id, version_number, version, tier, config, changed_by, changed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.tenant_config_versions ENABLE TRIGGER ALL;

--
-- Data for Name: tenant_domains; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.tenant_domains DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.tenant_domains (domain_id, tenant_id, domain, is_primary, verified, verified_at, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.tenant_domains ENABLE TRIGGER ALL;

--
-- Data for Name: tenant_email_config; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.tenant_email_config DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.tenant_email_config (config_id, provider, enabled, ms_tenant_id, ms_client_id, ms_client_secret, ms_from_email, ms_from_name, ms_from_name_ar, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure, last_test_at, last_test_result, configured_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.tenant_email_config ENABLE TRIGGER ALL;

--
-- Data for Name: tenant_llm_budgets; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.tenant_llm_budgets DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.tenant_llm_budgets (tenant_id, monthly_token_limit, monthly_cost_limit, tokens_used_month, cost_used_month, budget_reset_at, soft_limit_pct, hard_limit_action, notified_soft, notified_hard, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.tenant_llm_budgets ENABLE TRIGGER ALL;

--
-- Data for Name: tenant_security_config; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.tenant_security_config DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.tenant_security_config (config_id, config_key, config_value, data_type, description, description_ar, category, updated_at, updated_by) FROM stdin;
55110b60-cab7-4e8d-be61-42c5478b5e58	password_reset_token_expiry_minutes	30	number	Minutes before a password-reset token expires	دقائق قبل انتهاء صلاحية رمز إعادة تعيين كلمة المرور	password	2026-03-17 08:24:19.920943+08	\N
227f8039-be54-4bd9-803d-85f6cc4c047d	bcrypt_rounds	12	number	Number of bcrypt hashing rounds for passwords	عدد جولات تشفير bcrypt لكلمات المرور	password	2026-03-17 08:24:19.920943+08	\N
e1391a8c-197f-430c-aea5-db3b6f151cb1	password_min_length	8	number	Minimum password length	الحد الأدنى لطول كلمة المرور	password	2026-03-17 08:24:19.920943+08	\N
a8f1b5e2-1e37-43ef-945c-26c54bf6a436	password_require_special	true	boolean	Require at least one special character in passwords	يتطلب حرفاً خاصاً واحداً على الأقل في كلمات المرور	password	2026-03-17 08:24:19.920943+08	\N
deb01ddf-921c-4bab-bd50-40cbec1bb313	mfa_max_failures	3	number	Consecutive MFA failures before lockout	الإخفاقات المتتالية في MFA قبل القفل	mfa	2026-03-17 08:24:19.920943+08	\N
e7164392-a296-4bea-93c2-3d0e76a36002	mfa_lockout_minutes	15	number	Minutes to lock MFA verification after max failures	دقائق قفل التحقق من MFA بعد الحد الأقصى للإخفاقات	mfa	2026-03-17 08:24:19.920943+08	\N
e5ddc9a4-1764-4da6-9a9d-b06ffbdef3b7	email_mfa_code_expiry_minutes	10	number	Minutes before email MFA code expires	دقائق قبل انتهاء صلاحية رمز MFA بالبريد الإلكتروني	mfa	2026-03-17 08:24:19.920943+08	\N
362c39e7-98cf-4fae-b910-0253d6c12f88	jwt_access_token_expiry_minutes	15	number	JWT access token lifetime in minutes	عمر رمز الوصول JWT بالدقائق	session	2026-03-17 08:24:19.920943+08	\N
21b63fe1-fbe7-4fc1-b575-f6ccbca2fe2a	jwt_refresh_token_expiry_days	7	number	JWT refresh token lifetime in days	عمر رمز التحديث JWT بالأيام	session	2026-03-17 08:24:19.920943+08	\N
4b517cfc-4e3b-4666-af78-dc3ed152fbf6	session_idle_timeout_minutes	30	number	Idle session timeout in minutes	مهلة الخمول للجلسة بالدقائق	session	2026-03-17 08:24:19.920943+08	\N
5828f9c8-333c-47a4-ae3e-2fa3a2fbf622	max_login_attempts	5	number	Login attempts before progressive throttle kicks in	محاولات تسجيل الدخول قبل بدء التأخير التدريجي	throttle	2026-03-17 08:24:19.920943+08	\N
cbd9ecf8-1e42-44a7-a4e8-afacbc52ca7a	login_throttle_window_minutes	10	number	Rolling window to count failed login attempts	النافذة الزمنية المتدحرجة لحساب محاولات الدخول الفاشلة	throttle	2026-03-17 08:24:19.920943+08	\N
d98eca37-aec5-4659-bac9-fea0b78c55c0	login_throttle_max_delay_ms	60000	number	Maximum progressive delay in milliseconds	الحد الأقصى للتأخير التدريجي بالملي ثانية	throttle	2026-03-17 08:24:19.920943+08	\N
\.


ALTER TABLE __TENANT_SCHEMA__.tenant_security_config ENABLE TRIGGER ALL;

--
-- Data for Name: tenant_settings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.tenant_settings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.tenant_settings (setting_id, key, value, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.tenant_settings ENABLE TRIGGER ALL;

--
-- Data for Name: training_assignments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.training_assignments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.training_assignments (assignment_id, campaign_id, content_id, user_id, status, assigned_by, assigned_at, due_date, started_at, completed_at, time_spent_minutes, attempt_count, score, passing_score, passed, certificate_id, reminder_count, last_reminder_at, escalated, escalated_to, waived_by, waived_reason, feedback, feedback_rating, metadata, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.training_assignments ENABLE TRIGGER ALL;

--
-- Data for Name: training_audit_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.training_audit_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.training_audit_log (log_id, entity_type, entity_id, action, actor_id, actor_role, before_state, after_state, change_summary, ip_address, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.training_audit_log ENABLE TRIGGER ALL;

--
-- Data for Name: training_certifications; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.training_certifications DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.training_certifications (certificate_id, user_id, content_id, campaign_id, assignment_id, certificate_code, certificate_name, issued_at, valid_until, score, issuer, verification_url, revoked, revoked_at, revoked_reason, metadata, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.training_certifications ENABLE TRIGGER ALL;

--
-- Data for Name: training_completion_snapshots; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.training_completion_snapshots DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.training_completion_snapshots (snapshot_id, snapshot_date, dimension_type, dimension_id, dimension_name, total_assignments, completed, passed, failed, overdue, in_progress, not_started, waived, completion_pct, pass_rate_pct, avg_score, avg_time_minutes, compliance_status, metadata, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.training_completion_snapshots ENABLE TRIGGER ALL;

--
-- Data for Name: training_programs; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.training_programs DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.training_programs (training_id, tenant_id, title, category, description, target_roles, status, due_date, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.training_programs ENABLE TRIGGER ALL;

--
-- Data for Name: training_team_distribution; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.training_team_distribution DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.training_team_distribution (dist_id, team_code, raci_role, training_type, is_active, created_at) FROM stdin;
f58fe562-6876-494b-bb6b-1e3b73add6e8	HR	responsible	all	t	2026-03-17 08:24:23.408019+08
3e47f93b-a89f-422a-9f6d-8c5bba234fb5	COMP	accountable	compliance	t	2026-03-17 08:24:23.408019+08
50cc80bf-8849-4e6a-9d23-68aa36af8ae6	SEC_OPS	responsible	security_awareness	t	2026-03-17 08:24:23.408019+08
f5d4b7a1-130e-46aa-b9b9-0c960c73b21b	SEC_OPS	accountable	phishing	t	2026-03-17 08:24:23.408019+08
97f22c83-1629-4fbd-a059-9691fcfcd4f5	EXEC	informed	all	t	2026-03-17 08:24:23.408019+08
a2a807cd-8006-4d2a-8bcc-5100bb86840b	RISK	consulted	all	t	2026-03-17 08:24:23.408019+08
\.


ALTER TABLE __TENANT_SCHEMA__.training_team_distribution ENABLE TRIGGER ALL;

--
-- Data for Name: training_user_progress; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.training_user_progress DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.training_user_progress (progress_id, user_id, content_id, assignment_id, progress_pct, current_section, sections_completed, quiz_answers, bookmarks, notes, last_accessed_at, total_time_minutes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.training_user_progress ENABLE TRIGGER ALL;

--
-- Data for Name: ucf_control_versions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.ucf_control_versions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.ucf_control_versions (version_id, control_id, version_number, change_type, change_summary, previous_snapshot, changed_by, metadata, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.ucf_control_versions ENABLE TRIGGER ALL;

--
-- Data for Name: unified_squad_members; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.unified_squad_members DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.unified_squad_members (member_id, user_id, display_name_en, display_name_ar, role, deployment_mode, is_agent, capabilities, specialization, current_status, delivery_channel, webhook_url, task_queue, last_activity_at, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.unified_squad_members ENABLE TRIGGER ALL;

--
-- Data for Name: user_access_profiles; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.user_access_profiles DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.user_access_profiles (id, user_id, access_profile_code, valid_from, valid_to, is_active, granted_by, created_at, updated_at) FROM stdin;
1	00225fee-7bf2-49e1-895f-4a5416bfc0be	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
2	0085cf67-9de1-4047-9e18-434451b58a1d	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
3	089faf99-a660-4e2f-b7c2-20f0f50219c2	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
4	09ea4103-cb58-4a69-b28e-3f8c5bd5ce43	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
5	0ad3aa8d-c179-404d-ac88-dde4b09fbbde	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
6	133be2a7-8046-40e3-9c60-8b0e6ddb538a	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
7	13c7cf0b-d2ac-4143-b816-968da18913ed	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
8	1584e708-27ab-47c3-903f-6fcad5d261c0	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
9	19708998-9a7e-4386-8ad8-ce501cddbf08	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
10	1b1bd698-0e29-4a0e-94f7-e6eeb30eede2	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
11	1fe3d0af-d36e-4318-8c7e-cf18486f4408	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
12	201a9f76-ff1e-4961-8dc3-f64405ec5a46	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
13	201ea33f-1432-4b03-ad43-0b3675c107a7	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
14	20d638f3-915c-4ee2-8621-6bf9529a34d6	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
15	275a7d45-b9dc-453a-a3d6-726e9cb596d8	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
16	276b8e8b-5b4a-415e-ab9d-f1247cc8d8cd	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
17	28fb501b-4e5d-4a83-90da-5eb549d1e77e	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
18	31d6301f-9b08-4f6a-b4aa-6a523e23c273	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
19	328f230b-fc86-4516-9602-ce2e0099da84	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
20	32a22a87-214a-40c7-958a-88af6a66bb6e	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
21	339d11f5-ad27-4fae-98ba-7105f0856bc3	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
22	34bd942b-c740-406b-8534-e5ea6a27324b	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
23	38b09f86-7742-40cc-a44a-6b8be91d129e	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
24	3d96e27f-f102-4147-8360-787c40d1176a	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
25	4030aed6-4fa0-4ddc-8e4d-436673f01705	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
26	451c236b-ecfb-4d57-bc45-b1a5d9c8ee53	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
27	469eadeb-9e8c-4dae-8fc0-f3cc3585d2ae	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
28	47de9f48-cf57-4d78-bdd0-dff86cf60470	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
29	489d22da-ede6-41a7-a12c-20153811f8cd	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
30	4d880cd3-fa86-4cac-9364-63ffd6ca6c74	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
31	4df5f06b-567a-4dcb-a3c4-86ef33a33b1d	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
32	50510716-5e7c-4880-8a2f-d9b9c8e35405	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
33	522f7096-7e84-482e-a603-34fb8ec5708a	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
34	525f9a1d-2a10-48a0-9e09-d379f04c3f9a	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
35	538a37f1-04c6-4474-ab58-eda9ab1a15af	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
36	546fcd00-335a-400f-b4d7-a31f8dd67d7c	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
37	54e43730-d17d-428d-b55e-3c419c234dd1	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
38	5822f3db-2e68-476a-9541-da5b71318a58	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
39	5c20bb15-0725-495d-94f2-f48d07926609	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
40	626b314b-b196-4a85-949b-e0cfeca1da29	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
41	653fde63-243c-46d1-8deb-ee2d876e972c	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
42	66fd3f94-c63a-4233-a8f6-8aab32bfe80e	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
43	6959a7b1-846a-42c9-b72a-8b4887472d9e	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
44	6f003f82-60c6-4fc6-b915-74a7c4ef3abf	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
45	709ba336-14d7-41ba-91ac-7d750837534f	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
46	747c4fed-b22d-4e17-a9b2-92e453d4e775	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
47	77364214-45a9-4364-9176-48b1c212f946	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
48	7b941b59-7eae-4958-a0b8-39e933f9879b	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
49	7c8d67d4-8558-4afa-a544-bb6c391f2f7b	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
50	7e13eed4-791b-40d2-80d1-0b6727347ed2	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
51	826d68d3-8183-4ee0-abf7-c9431ead2c3f	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
52	84218e79-27ea-40b8-9d2a-8c6ca2b26c4c	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
53	8915b084-33b6-4043-98ed-7a07a89a1413	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
54	89187978-3fb7-4b81-9d42-6867b0fbd9d1	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
55	8a907c8d-c3af-4513-b4f2-12864ed35fc1	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
56	9c145681-b230-4394-b4b5-b9262a28b631	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
57	a44004e3-7dcf-4962-bff3-ad73a5c59ee8	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
58	a4a3000b-4be8-40e9-8fc8-d946d7395ade	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
59	a5956d10-5f6c-4a8a-b642-6bda384d41d3	standard_user	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
60	a858aa79-7366-45cf-9cd4-114d33b91124	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
61	ab64aaa9-4a96-4676-a94c-1ade243b6db6	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
62	abcd8e69-aeff-4845-94a6-373dccc814a7	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
63	abe170d4-0d8b-4fd2-98f0-9d1a838190b3	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
64	aeb7d822-09d0-408e-8d7d-bdcd2faeac35	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
65	afa3a4b2-7c1c-42a2-a912-21b9c43302e7	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
66	b22bfa79-cc2d-42d9-89bc-c94fa2938e45	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
67	b2528b32-da5e-4fd6-b1ef-b4810436797e	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
68	b372db2f-45fb-443e-a667-89a94d053b76	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
69	b4061524-0822-4774-b34b-3cb226ac30ef	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
70	b4a28284-e731-4799-a3ce-db2eabcda731	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
71	b6defc0b-5556-49df-b662-38c2dc932637	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
72	b868f1a8-01c2-487e-ba5c-bcd355ef62ef	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
73	bb92db5d-04c6-4488-869e-617450b3a65b	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
74	bccfd617-2c35-4aa2-b32c-84ebc56aa644	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
75	bcd48acd-2264-4dd9-a629-0c2ec7dc3b7c	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
76	c08c7849-d019-4be0-be62-801f0f0a35f0	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
77	c6b388de-0bb8-4d67-81f8-714422472508	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
78	c75df3df-dabe-4353-99e9-a694d7597941	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
79	c7723648-2d95-48df-9f90-d15495d6c09d	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
80	cb995a5f-4ba8-4763-a4a9-fc54b796199b	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
81	ce18cb4e-0731-4aab-8ad5-407e5f2e7cf4	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
82	d077ef56-e4fd-45cd-a2b4-a71bdbf906f4	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
83	d159003f-5fd5-49c9-b3e8-3961391eeabd	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
84	d1a1f005-9a77-431f-a846-c6d964271964	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
85	d49da3c5-7e80-482a-b8ca-77aad15fe06f	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
86	d4de0404-8df5-4d9a-ba76-3ff22781c468	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
87	d4e5d81c-c4a7-4749-9555-87b65e9affc5	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
88	d6452e40-b1c8-40a3-8e28-26fdb8ca4d7f	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
89	d8d086e1-6197-4be4-abf8-75e4ae3f59c0	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
90	d9668eba-8088-42d2-ba9a-806349ab41a5	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
91	dc96be2c-c3e1-43e0-826b-37870ac4679c	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
92	dd62ddef-f170-4246-ba48-b18f1c78f2a4	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
93	dd7876eb-adc7-4bb3-8862-4927b65dba47	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
94	dda442b5-64f6-4757-993c-6e6930ce5d2d	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
95	dfe896d5-6e4f-47cb-b78a-fff93271b642	standard_user	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
96	e098352c-9c75-4edb-8ba3-3f635a17ac41	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
97	e529968c-138e-4c3b-9f7b-e0d0acde124a	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
98	e60ab6d3-7dac-4cbb-ac1c-0d20d7fdf48c	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
99	ebbe5b22-d07a-46a6-b92d-a22a20dcc518	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
100	f2f0f208-e292-4162-a4f2-6d20796d69fc	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
101	f5abb52f-2e96-43c7-bcc6-4a7865f1a5f0	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
102	f7746237-c031-42f9-99db-113431ab4993	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
103	f993169f-a32d-4304-85d1-d736a1a19da1	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
104	f995c42f-37d9-4f4c-b4e0-823d5c53047e	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
105	fb0472d6-1f79-4310-85fd-c2de5b059080	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
106	fb6491a7-283d-4a69-82e1-082c6725fbb6	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
107	fd629d65-3a59-4235-a594-7e3e3849070a	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
108	fdf8e8e9-fbab-46fc-a4cf-266e80b252d7	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
109	fe3c9142-6e54-4721-8342-3e00dfd70207	tenant_admin	\N	\N	t	system	2026-03-17 08:24:23.609869+08	2026-03-17 08:24:23.609869+08
\.


ALTER TABLE __TENANT_SCHEMA__.user_access_profiles ENABLE TRIGGER ALL;

--
-- Data for Name: user_function_overrides; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.user_function_overrides DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.user_function_overrides (override_id, user_id, function_code, action, resource_type, allow, scope_type, scope_id, reason, expires_at, created_by, active, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.user_function_overrides ENABLE TRIGGER ALL;

--
-- Data for Name: user_performance; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.user_performance DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.user_performance (performance_id, user_id, team_id, measurement_period_start, measurement_period_end, tasks_completed, tasks_on_time, avg_completion_hours, first_time_pass_rate, validation_accuracy, rework_required, cross_team_assists, escalations_resolved, reviews_performed, sla_compliance_rate, sla_breaches, productivity_score, quality_score, collaboration_score, overall_score, calculated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.user_performance ENABLE TRIGGER ALL;

--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.user_preferences DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.user_preferences (user_id, sidebar_collapsed, theme, language, command_palette_shortcut, recent_pages, pinned_entities, search_history, notification_sound, updated_at, dashboard_layout, dashboard_config) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.user_preferences ENABLE TRIGGER ALL;

--
-- Data for Name: user_role_assignments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.user_role_assignments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.user_role_assignments (assignment_id, tenant_id, user_id, role_id, scope_type, scope_id, is_primary, valid_from, valid_to, assigned_by, reason, active, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.user_role_assignments ENABLE TRIGGER ALL;

--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.user_roles DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.user_roles (user_role_id, user_id, role_id, tenant_id, scope_type, scope_id, is_primary, valid_from, valid_to, assigned_by, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.user_roles ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_assessments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_assessments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_assessments (assessment_id, vendor_id, assessment_type, assessor_id, assessed_at, overall_score, status, findings, next_assessment_date, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_assessments ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_audit_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_audit_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_audit_log (log_id, entity_type, entity_id, action, actor_id, actor_role, before_state, after_state, change_summary, ip_address, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_audit_log ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_bcp_requirements; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_bcp_requirements DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_bcp_requirements (requirement_id, vendor_id, bcp_plan_id, test_type, required_frequency, last_tested_at, next_test_due, test_result, status, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_bcp_requirements ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_benchmark_cohorts; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_benchmark_cohorts DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_benchmark_cohorts (cohort_id, cohort_name, dimension, dimension_value, vendor_count, avg_score, p25_score, median_score, p75_score, computed_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_benchmark_cohorts ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_concentration_analysis; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_concentration_analysis DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_concentration_analysis (analysis_id, analysis_date, dimension, dimension_value, vendor_count, total_spend, spend_pct, risk_level, concentration_score, affected_vendors, mitigation_status, mitigation_plan, metadata, created_at, updated_at, mitigation_task_id, mitigation_due_date, mitigation_assigned_to) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_concentration_analysis ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_contacts; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_contacts DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_contacts (contact_id, vendor_id, name, email, phone, role, is_primary, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_contacts ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_due_diligence; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_due_diligence (dd_id, vendor_id, dd_type, status, risk_tier, initiated_by, initiated_at, due_date, completed_at, reviewer_id, approver_id, approved_at, overall_rating, findings_summary, conditions, valid_until, renewal_reminder_days, attachments, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_dd_steps; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_dd_steps DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_dd_steps (step_id, dd_id, step_number, step_code, step_name, step_type, status, assigned_to, due_date, completed_at, completed_by, result, evidence, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_dd_steps ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_documents; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_documents DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_documents (document_id, vendor_id, workspace_id, document_type, title, file_name, file_url, file_hash, file_size_bytes, mime_type, issue_date, expiry_date, issuer, scope, status, verified, verified_by, verified_at, uploaded_by, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_documents ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_findings; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_findings DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_findings (finding_id, vendor_id, workspace_id, title, description, severity, status, source, control_reference, due_date, remediation_plan, remediated_at, accepted_by, accepted_at, acceptance_reason, created_by, assigned_to, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_findings ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_fourth_party_risk; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_fourth_party_risk DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_fourth_party_risk (fp_risk_id, vendor_id, sub_vendor_id, sub_vendor_name, service_provided, data_access_level, geographic_location, jurisdiction, risk_tier, risk_score, assessment_status, last_assessed_at, contractual_controls, identified_risks, mitigation_actions, is_active, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_fourth_party_risk ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_monitoring_signals; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_monitoring_signals DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_monitoring_signals (signal_id, vendor_id, signal_type, severity, source, source_name, source_url, title, description, detected_at, acknowledged, acknowledged_by, acknowledged_at, action_taken, action_status, risk_impact, auto_risk_update, metadata, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_monitoring_signals ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_obligations; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_obligations DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_obligations (obligation_id, vendor_id, contract_id, obligation_type, title, description, due_date, status, evidence_required, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_obligations ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_offboarding; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_offboarding DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_offboarding (offboarding_id, vendor_id, status, reason, initiated_by, initiated_at, target_completion, completed_at, completed_by, transition_plan, replacement_vendor_id, data_handling, access_revocation, knowledge_transfer, financial_settlement, exit_interview_notes, risk_assessment, attachments, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_offboarding ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_offboarding_checklist; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_offboarding_checklist DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_offboarding_checklist (checklist_id, offboarding_id, step_number, step_code, step_name, category, status, assigned_to, due_date, completed_at, completed_by, evidence, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_offboarding_checklist ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_portal_messages; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_portal_messages DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_portal_messages (message_id, vendor_id, thread_id, sender_type, sender_id, sender_name, subject, body, is_read, read_at, attachments, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_portal_messages ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_portal_tokens; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_portal_tokens DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_portal_tokens (token_id, vendor_id, token_hash, scope, expires_at, last_used_at, revoked, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_portal_tokens ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_questionnaire_submissions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_questionnaire_submissions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_questionnaire_submissions (submission_id, vendor_id, questionnaire_id, token_id, answers, status, submitted_at, reviewed_at, reviewer_id, review_notes, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_questionnaire_submissions ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_risks; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_risks DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_risks (risk_id, vendor_id, risk_type, title, description, severity, likelihood, status, mitigations, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_risks ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_shared_responsibility; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_shared_responsibility DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_shared_responsibility (responsibility_id, vendor_id, workspace_id, control_id, control_title, framework_code, customer_scope, vendor_scope, shared_scope, ownership, customer_status, vendor_status, last_reviewed_at, next_review_date, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_shared_responsibility ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_sla_definitions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_sla_definitions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_sla_definitions (sla_def_id, vendor_id, contract_ref, metric_code, metric_name, metric_type, target_value, target_unit, warning_threshold, breach_threshold, measurement_period, penalty_clause, penalty_amount, is_active, metadata, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_sla_definitions ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_sla_measurements; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_sla_measurements DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_sla_measurements (measurement_id, sla_def_id, vendor_id, period_start, period_end, actual_value, target_value, is_met, is_warning, is_breached, deviation_pct, source, recorded_by, evidence, notes, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_sla_measurements ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_sla_breach_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_sla_breach_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_sla_breach_log (breach_id, measurement_id, sla_def_id, vendor_id, breach_type, severity, description, actual_value, target_value, deviation_pct, remediation_status, remediation_action, resolved_at, penalty_applied, penalty_amount, escalated_to, metadata, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_sla_breach_log ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_subcontractors; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_subcontractors DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_subcontractors (subcontractor_id, vendor_id, workspace_id, name, website, country, services_provided, data_access, data_types, risk_tier, status, approved_by, approved_at, review_date, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_subcontractors ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_team_distribution; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_team_distribution DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_team_distribution (dist_id, team_code, raci_role, vendor_tier, is_active, created_at) FROM stdin;
967bfc97-e0df-46ef-bce3-629ba9dab1b3	PROC	responsible	all	t	2026-03-17 08:24:23.408019+08
87ca1e39-a2e1-4f3e-b05d-960b4dbcb7b5	RISK	accountable	critical	t	2026-03-17 08:24:23.408019+08
f255ff0e-5ad2-4082-a120-46a006524e8d	RISK	consulted	high	t	2026-03-17 08:24:23.408019+08
4d66d017-f275-48de-b971-a71f7c4d143a	LEGAL	consulted	all	t	2026-03-17 08:24:23.408019+08
d18a85a0-d789-467b-9b32-eb97f2f9f419	COMP	informed	all	t	2026-03-17 08:24:23.408019+08
d4e0b438-0a33-4692-92af-01e3331fa396	SEC_OPS	consulted	critical	t	2026-03-17 08:24:23.408019+08
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_team_distribution ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_tier_config; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_tier_config DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_tier_config (tier, min_requirements, review_frequency, remediation_sla_days) FROM stdin;
low	{"steps": ["basic_info", "contract_review"]}	annually	90
medium	{"steps": ["basic_info", "contract_review", "risk_assessment"]}	semi_annual	60
high	{"steps": ["basic_info", "contract_review", "risk_assessment", "security_review", "compliance_check"]}	quarterly	30
critical	{"steps": ["basic_info", "contract_review", "risk_assessment", "security_review", "compliance_check", "site_visit", "executive_approval"]}	monthly	14
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_tier_config ENABLE TRIGGER ALL;

--
-- Data for Name: vendor_training_requirements; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vendor_training_requirements DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vendor_training_requirements (requirement_id, vendor_id, training_type, required_by, completed_at, status, certificate_id, notes, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vendor_training_requirements ENABLE TRIGGER ALL;

--
-- Data for Name: vuln_scanner_connections; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vuln_scanner_connections DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vuln_scanner_connections (connection_id, name, scanner_type, endpoint_url, auth_method, credentials_encrypted, sync_schedule_cron, sync_enabled, severity_filter, asset_group_filter, auto_create_vulnerabilities, last_validated_at, validation_status, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vuln_scanner_connections ENABLE TRIGGER ALL;

--
-- Data for Name: vuln_scan_results; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vuln_scan_results DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vuln_scan_results (result_id, connection_id, external_finding_id, cve_id, title, description, severity, cvss_score, affected_host, affected_port, affected_service, solution, raw_data, linked_vulnerability_id, linked_asset_id, status, first_detected_at, last_detected_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vuln_scan_results ENABLE TRIGGER ALL;

--
-- Data for Name: vuln_scan_sync_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vuln_scan_sync_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vuln_scan_sync_history (sync_id, connection_id, status, findings_fetched, findings_new, findings_updated, vulns_auto_created, errors, duration_ms, started_at, completed_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vuln_scan_sync_history ENABLE TRIGGER ALL;

--
-- Data for Name: vulnerabilities; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vulnerabilities DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vulnerabilities (vulnerability_id, title, description, cve_id, source, severity, cvss_score, status, affected_asset_ids, affected_control_ids, assigned_to, remediation_plan, remediation_due, remediation_task_id, detected_at, resolved_at, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vulnerabilities ENABLE TRIGGER ALL;

--
-- Data for Name: vulnerability_findings_map; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.vulnerability_findings_map DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.vulnerability_findings_map (map_id, vulnerability_id, finding_id, mapping_type, notes, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.vulnerability_findings_map ENABLE TRIGGER ALL;

--
-- Data for Name: webhooks; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.webhooks DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.webhooks (webhook_id, url, event_types, secret, enabled, failure_count, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.webhooks ENABLE TRIGGER ALL;

--
-- Data for Name: webhook_deliveries; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.webhook_deliveries DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.webhook_deliveries (delivery_id, webhook_id, event_type, payload, status, attempts, last_attempt_at, response_code, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.webhook_deliveries ENABLE TRIGGER ALL;

--
-- Data for Name: webhook_subscriptions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.webhook_subscriptions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.webhook_subscriptions (webhook_id, url, events, secret_hash, description, active, failure_count, last_triggered_at, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.webhook_subscriptions ENABLE TRIGGER ALL;

--
-- Data for Name: webhook_delivery_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.webhook_delivery_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.webhook_delivery_log (delivery_id, webhook_id, status_code, success, payload_size, delivered_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.webhook_delivery_log ENABLE TRIGGER ALL;

--
-- Data for Name: websocket_event_queue; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.websocket_event_queue DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.websocket_event_queue (event_id, target_user_id, event_type, event_data, delivered, created_at, delivered_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.websocket_event_queue ENABLE TRIGGER ALL;

--
-- Data for Name: wf_approval_decisions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.wf_approval_decisions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.wf_approval_decisions (decision_id, approval_id, decision, decided_by, decided_at, comments, conditions, delegated_from_user_id, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.wf_approval_decisions ENABLE TRIGGER ALL;

--
-- Data for Name: widget_registry; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.widget_registry DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.widget_registry (widget_key, label_en, label_ar, category, default_width, default_height, sort_order, created_at, module_code, component_key, data_endpoint, default_config, config_schema, is_system, is_active, metadata) FROM stdin;
risk_heatmap	Risk Heatmap	خريطة المخاطر الحرارية	risk	2	1	1	2026-03-17 08:24:18.870621+08	risk	RiskHeatmapWidget	/api/dashboard/risks	{}	{}	t	t	{}
compliance_score	Compliance Score	نسبة الامتثال	compliance	1	1	2	2026-03-17 08:24:18.870621+08	compliance	ComplianceScoreWidget	/api/dashboard	{}	{}	t	t	{}
compliance_overview	Compliance Overview	نظرة عامة على الامتثال	compliance	2	1	3	2026-03-17 08:24:18.870621+08	compliance	ComplianceOverviewWidget	\N	{}	{}	t	t	{}
executive_summary	Executive Summary	ملخص تنفيذي	overview	2	1	4	2026-03-17 08:24:18.870621+08	*	ExecutiveSummaryWidget	\N	{}	{}	t	t	{}
audit_readiness	Audit Readiness	جاهزية التدقيق	evidence	1	1	5	2026-03-17 08:24:18.870621+08	audit	AuditReadinessWidget	/api/dashboard/audit-pack	{}	{}	t	t	{}
control_progress	Control Progress	تقدم الضوابط	compliance	2	1	6	2026-03-17 08:24:18.870621+08	compliance	ControlProgressWidget	/api/dashboard/controls	{}	{}	t	t	{}
evidence_locker	Evidence Locker	خزنة الأدلة	evidence	1	1	7	2026-03-17 08:24:18.870621+08	evidence	EvidenceLockerWidget	/api/dashboard/evidence-queue	{}	{}	t	t	{}
framework_coverage	Framework Coverage	تغطية الأطر	compliance	2	1	8	2026-03-17 08:24:18.870621+08	compliance	FrameworkCoverageWidget	/api/dashboard/frameworks	{}	{}	t	t	{}
risk_summary	Risk Summary	ملخص المخاطر	risk	1	1	9	2026-03-17 08:24:18.870621+08	risk	RiskSummaryWidget	/api/dashboard/risks	{}	{}	t	t	{}
vendor_risk	Vendor Risk Snapshot	مخاطر الموردين	risk	1	1	10	2026-03-17 08:24:18.870621+08	vendor	VendorRiskWidget	/api/dashboard/risks	{}	{}	t	t	{}
incident_tracker	Incident Tracker	متتبع الحوادث	security	1	1	11	2026-03-17 08:24:18.870621+08	incident	IncidentTrackerWidget	\N	{}	{}	t	t	{}
policy_scorecard	Policy Scorecard	بطاقة السياسات	compliance	1	1	12	2026-03-17 08:24:18.870621+08	governance	PolicyScorecardWidget	\N	{}	{}	t	t	{}
compliance_trend	Compliance Trend	اتجاه الامتثال	compliance	2	1	13	2026-03-17 08:24:18.870621+08	compliance	ComplianceTrendWidget	\N	{}	{}	t	t	{}
program_health	Program Health	صحة البرنامج	overview	3	2	21	2026-03-17 08:24:21.019815+08	*	ProgramHealthWidget	/api/dashboard/program-health	{}	{}	t	t	{}
exceptions_aging	Exceptions Aging	تقادم الاستثناءات	compliance	4	1	22	2026-03-17 08:24:21.019815+08	compliance	ExceptionsAgingWidget	/api/dashboard/exceptions-aging	{}	{}	t	t	{}
control_drift	Control Drift	انحراف الضوابط	compliance	4	1	23	2026-03-17 08:24:21.019815+08	compliance	ControlDriftWidget	/api/dashboard/control-drift	{}	{}	t	t	{}
evidence_queue	Evidence Queue	قائمة الأدلة المعلقة	evidence	4	2	24	2026-03-17 08:24:21.019815+08	evidence	EvidenceQueueWidget	/api/dashboard/evidence-queue	{}	{}	t	t	{}
remediation_velocity	Remediation Velocity	سرعة المعالجة	compliance	6	1	25	2026-03-17 08:24:21.019815+08	compliance	RemediationVelocityWidget	\N	{}	{}	t	t	{}
momentum_indicator	Momentum Indicator	مؤشر الزخم	overview	3	1	26	2026-03-17 08:24:21.019815+08	*	MomentumIndicatorWidget	\N	{}	{}	t	t	{}
findings_bar	Findings Bar Chart	مخطط النتائج	audit	6	2	27	2026-03-17 08:24:21.019815+08	audit	FindingsBarWidget	\N	{}	{}	t	t	{}
bcp_status	BCP Status	حالة استمرارية الأعمال	incident	4	1	28	2026-03-17 08:24:21.019815+08	incident	BcpStatusWidget	\N	{}	{}	t	t	{}
compliance_gauge	Compliance Gauge	مقياس الامتثال	compliance	3	2	29	2026-03-17 08:24:21.019815+08	compliance	ComplianceGaugeWidget	/api/dashboard	{}	{}	t	t	{}
activity_feed	Activity Feed	موجز النشاط	overview	6	2	30	2026-03-17 08:24:21.019815+08	*	ActivityFeedWidget	\N	{}	{}	t	t	{}
risk_distribution	Risk Distribution	توزيع المخاطر	risk	1	1	14	2026-03-17 08:24:18.870621+08	risk	RiskDistributionWidget	\N	{}	{}	t	t	{}
framework_radar	Framework Radar	رادار الأطر	compliance	2	1	15	2026-03-17 08:24:18.870621+08	compliance	FrameworkRadarWidget	\N	{}	{}	t	t	{}
maturity_gauge	Maturity Gauge	مقياس النضج	overview	1	1	16	2026-03-17 08:24:18.870621+08	*	MaturityGaugeWidget	\N	{}	{}	t	t	{}
evidence_freshness	Evidence Freshness	حداثة الأدلة	evidence	1	1	17	2026-03-17 08:24:18.870621+08	evidence	EvidenceFreshnessWidget	\N	{}	{}	t	t	{}
assessment_progress	Assessment Progress	تقدم التقييم	assessment	1	1	18	2026-03-17 08:24:18.870621+08	audit	AssessmentProgressWidget	\N	{}	{}	t	t	{}
top_risks	Top Risks	أهم المخاطر	risk	1	1	19	2026-03-17 08:24:18.870621+08	risk	TopRisksWidget	/api/dashboard/risk-prediction	{}	{}	t	t	{}
ai_summary	AI Summary	ملخص الذكاء الاصطناعي	ai	2	1	20	2026-03-17 08:24:18.870621+08	*	AISummaryWidget	/api/dashboard/ai-summary	{}	{}	t	t	{}
\.


ALTER TABLE __TENANT_SCHEMA__.widget_registry ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_acl; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_acl DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_acl (acl_id, workflow_id, grantee_type, grantee_id, permission, granted_by, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_acl ENABLE TRIGGER ALL;

--
-- Data for Name: workflows; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflows DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflows (workflow_id, name, definition, version, status, created_by, created_at, updated_at, category_id) FROM stdin;
4adbf51e-b617-44dc-b773-c25970249882	Policy Approval Workflow	{"type": "template", "edges": [{"id": "e1", "source": "start", "target": "draft_review"}, {"id": "e2", "source": "draft_review", "target": "manager_approval"}, {"id": "e3", "source": "manager_approval", "target": "publish"}, {"id": "e4", "source": "publish", "target": "end"}], "nodes": [{"id": "start", "type": "trigger", "config": {}, "subType": "manual", "position": {"x": 0, "y": 0}}, {"id": "draft_review", "type": "action", "config": {"role": "compliance_officer", "label": "Draft Review"}, "subType": "manual_review", "position": {"x": 200, "y": 0}}, {"id": "manager_approval", "type": "governance", "config": {"role": "admin", "label": "Manager Approval"}, "subType": "approval", "position": {"x": 400, "y": 0}}, {"id": "publish", "type": "action", "config": {"target": "policies"}, "subType": "auto_publish", "position": {"x": 600, "y": 0}}, {"id": "end", "type": "end", "config": {}, "subType": "complete", "position": {"x": 800, "y": 0}}], "triggers": [], "swimlanes": [], "description": "Standard policy review and approval workflow"}	1	template	system	2026-03-17 08:24:21.759458+08	2026-03-17 08:24:21.759458+08	\N
06bbc11e-8b94-46e8-a443-ecce954dec7c	Risk Assessment Workflow	{"type": "template", "edges": [{"id": "e1", "source": "start", "target": "identify"}, {"id": "e2", "source": "identify", "target": "assess"}, {"id": "e3", "source": "assess", "target": "treatment"}, {"id": "e4", "source": "treatment", "target": "review"}, {"id": "e5", "source": "review", "target": "end"}], "nodes": [{"id": "start", "type": "trigger", "config": {}, "subType": "manual", "position": {"x": 0, "y": 0}}, {"id": "identify", "type": "action", "config": {"role": "risk_manager"}, "subType": "risk_identify", "position": {"x": 200, "y": 0}}, {"id": "assess", "type": "action", "config": {"role": "risk_manager"}, "subType": "risk_assess", "position": {"x": 400, "y": 0}}, {"id": "treatment", "type": "action", "config": {"role": "risk_manager"}, "subType": "risk_treat", "position": {"x": 600, "y": 0}}, {"id": "review", "type": "governance", "config": {"role": "admin"}, "subType": "approval", "position": {"x": 800, "y": 0}}, {"id": "end", "type": "end", "config": {}, "subType": "complete", "position": {"x": 1000, "y": 0}}], "triggers": [], "swimlanes": [], "description": "Standard risk identification, assessment, and treatment workflow"}	1	template	system	2026-03-17 08:24:21.759458+08	2026-03-17 08:24:21.759458+08	\N
ca19007d-50aa-4fcf-84bd-d7e0aec17009	Incident Response Workflow	{"type": "template", "edges": [{"id": "e1", "source": "start", "target": "triage"}, {"id": "e2", "source": "triage", "target": "contain"}, {"id": "e3", "source": "contain", "target": "investigate"}, {"id": "e4", "source": "investigate", "target": "resolve"}, {"id": "e5", "source": "resolve", "target": "end"}], "nodes": [{"id": "start", "type": "trigger", "config": {"event": "incident_reported"}, "subType": "event", "position": {"x": 0, "y": 0}}, {"id": "triage", "type": "action", "config": {"role": "admin", "label": "Triage"}, "subType": "manual_review", "position": {"x": 200, "y": 0}}, {"id": "contain", "type": "action", "config": {"role": "admin"}, "subType": "containment", "position": {"x": 400, "y": 0}}, {"id": "investigate", "type": "action", "config": {"role": "auditor"}, "subType": "investigation", "position": {"x": 600, "y": 0}}, {"id": "resolve", "type": "action", "config": {"role": "admin"}, "subType": "resolution", "position": {"x": 800, "y": 0}}, {"id": "end", "type": "end", "config": {}, "subType": "complete", "position": {"x": 1000, "y": 0}}], "triggers": [], "swimlanes": [], "description": "Standard incident detection, triage, containment, and resolution workflow"}	1	template	system	2026-03-17 08:24:21.759458+08	2026-03-17 08:24:21.759458+08	\N
fcb80daf-a179-4b9d-9f1d-549aa8e82c1c	Evidence Collection Workflow	{"type": "template", "edges": [{"id": "e1", "source": "start", "target": "request"}, {"id": "e2", "source": "request", "target": "collect"}, {"id": "e3", "source": "collect", "target": "review"}, {"id": "e4", "source": "review", "target": "end"}], "nodes": [{"id": "start", "type": "trigger", "config": {}, "subType": "manual", "position": {"x": 0, "y": 0}}, {"id": "request", "type": "action", "config": {"role": "compliance_officer"}, "subType": "evidence_request", "position": {"x": 200, "y": 0}}, {"id": "collect", "type": "action", "config": {"role": "viewer"}, "subType": "evidence_collect", "position": {"x": 400, "y": 0}}, {"id": "review", "type": "governance", "config": {"role": "auditor"}, "subType": "approval", "position": {"x": 600, "y": 0}}, {"id": "end", "type": "end", "config": {}, "subType": "complete", "position": {"x": 800, "y": 0}}], "triggers": [], "swimlanes": [], "description": "Standard evidence request, collection, review, and approval workflow"}	1	template	system	2026-03-17 08:24:21.759458+08	2026-03-17 08:24:21.759458+08	\N
286f001c-46ee-43ef-b9e8-2bb6ecfe4611	Audit Execution Workflow	{"type": "template", "edges": [{"id": "e1", "source": "start", "target": "plan"}, {"id": "e2", "source": "plan", "target": "fieldwork"}, {"id": "e3", "source": "fieldwork", "target": "report"}, {"id": "e4", "source": "report", "target": "followup"}, {"id": "e5", "source": "followup", "target": "end"}], "nodes": [{"id": "start", "type": "trigger", "config": {}, "subType": "manual", "position": {"x": 0, "y": 0}}, {"id": "plan", "type": "action", "config": {"role": "auditor"}, "subType": "audit_plan", "position": {"x": 200, "y": 0}}, {"id": "fieldwork", "type": "action", "config": {"role": "auditor"}, "subType": "audit_fieldwork", "position": {"x": 400, "y": 0}}, {"id": "report", "type": "action", "config": {"role": "auditor"}, "subType": "audit_report", "position": {"x": 600, "y": 0}}, {"id": "followup", "type": "governance", "config": {"role": "admin"}, "subType": "approval", "position": {"x": 800, "y": 0}}, {"id": "end", "type": "end", "config": {}, "subType": "complete", "position": {"x": 1000, "y": 0}}], "triggers": [], "swimlanes": [], "description": "Standard audit planning, fieldwork, reporting, and follow-up workflow"}	1	template	system	2026-03-17 08:24:21.759458+08	2026-03-17 08:24:21.759458+08	\N
22860ef6-8dcc-4ce9-991d-b6c4a2ff41d9	WF-GOV-01: Policy Development & Approval	{"steps": [{"seq": 1, "mode": "human_only", "team": "CYBER_GOV", "sla_h": 24, "action": "draft_policy"}, {"seq": 2, "mode": "hybrid_shadow", "team": "CYBER_GOV", "sla_h": 48, "action": "technical_review"}, {"seq": 3, "mode": "hybrid_shadow", "team": "ERM", "sla_h": 24, "action": "risk_impact_review"}, {"seq": 4, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 72, "action": "final_approval"}], "teams": ["CYBER_GOV", "ERM", "EXEC_STRATEGY"], "domain": "governance", "pattern": "sequential_handoff", "category": "policy", "sla_hours": 168}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
33ef6dd7-3eb4-4229-a7c1-90777b38efba	WF-GOV-02: Policy Exception Request	{"steps": [{"seq": 1, "mode": "human_only", "team": "requester", "sla_h": 0, "action": "submit_exception_request"}, {"seq": 2, "mode": "hybrid_shadow", "team": "CYBER_GOV", "sla_h": 48, "action": "assess_exception"}, {"seq": 3, "mode": "hybrid_shadow", "team": "ERM", "sla_h": 24, "action": "risk_rating"}, {"seq": 4, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 48, "action": "approve_or_reject"}], "teams": ["CYBER_GOV", "ERM", "EXEC_STRATEGY"], "domain": "governance", "pattern": "sequential_handoff", "category": "exception", "sla_hours": 120}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
dde1660e-3dda-45d1-8ac9-cea887dbdded	WF-GOV-03: Annual Policy Review	{"steps": [{"seq": 1, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 72, "action": "policy_gap_analysis"}, {"seq": 2, "mode": "human_only", "team": "CYBER_GOV", "sla_h": 120, "action": "update_policy"}, {"seq": 3, "mode": "hybrid_shadow", "team": "ERM", "sla_h": 48, "action": "risk_alignment_check"}, {"seq": 4, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 96, "action": "board_approval"}], "teams": ["CYBER_GOV", "ERM", "EXEC_STRATEGY"], "domain": "governance", "pattern": "sequential_handoff", "trigger": "schedule_annual", "category": "review", "sla_hours": 336}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
ef6ad796-5884-4db6-bf92-43ae2de0bee2	WF-GOV-04: Board GRC Reporting	{"steps": [{"seq": 1, "mode": "autonomous", "team": "ERM", "sla_h": 8, "action": "compile_risk_status", "parallel_group": "compile"}, {"seq": 1, "mode": "autonomous", "team": "CYBER_GOV", "sla_h": 8, "action": "compile_compliance_status", "parallel_group": "compile"}, {"seq": 1, "mode": "autonomous", "team": "AUDIT", "sla_h": 8, "action": "compile_audit_findings", "parallel_group": "compile"}, {"seq": 2, "mode": "hybrid_shadow", "team": "EXEC_STRATEGY", "sla_h": 48, "action": "draft_board_report"}, {"seq": 3, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 24, "action": "present_to_board"}], "teams": ["ERM", "CYBER_GOV", "AUDIT", "EXEC_STRATEGY"], "domain": "governance", "pattern": "hub_and_spoke", "trigger": "schedule_quarterly", "category": "reporting", "sla_hours": 168}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
58b92743-da7e-42ff-b162-a44baa612517	WF-GOV-05: GRC Framework Setup	{"steps": [{"seq": 1, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 48, "action": "select_frameworks"}, {"seq": 2, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 240, "action": "control_mapping"}, {"seq": 3, "mode": "human_only", "team": "ERM", "sla_h": 96, "action": "risk_appetite_setting"}, {"seq": 4, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 72, "action": "approve_framework_config"}], "teams": ["EXEC_STRATEGY", "CYBER_GOV", "ERM"], "domain": "governance", "pattern": "sequential_handoff", "category": "setup", "sla_hours": 720}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
10a94680-47c4-410b-882b-94c0f4c5428d	WF-RISK-01: Enterprise Risk Identification	{"steps": [{"seq": 1, "mode": "autonomous", "team": "ERM", "sla_h": 4, "action": "initiate_risk_survey"}, {"seq": 2, "mode": "human_only", "team": "all_teams", "sla_h": 168, "action": "submit_team_risks"}, {"seq": 3, "mode": "hybrid_active", "team": "ERM", "sla_h": 48, "action": "consolidate_risk_register"}, {"seq": 4, "mode": "hybrid_shadow", "team": "ERM", "sla_h": 24, "action": "publish_risk_register"}], "teams": ["ERM", "all_operational_teams"], "domain": "risk_management", "pattern": "hub_and_spoke", "category": "identification", "sla_hours": 336}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
8c267520-b8d7-4438-8a4c-86890af0b431	WF-RISK-02: Risk Assessment & Scoring	{"steps": [{"seq": 1, "mode": "hybrid_shadow", "team": "ERM", "sla_h": 24, "action": "identify_risk_context"}, {"seq": 2, "mode": "hybrid_active", "team": "ERM", "sla_h": 24, "action": "score_likelihood_and_impact"}, {"seq": 3, "mode": "hybrid_shadow", "team": "CYBER_GOV", "sla_h": 24, "action": "validate_cyber_risk_score"}, {"seq": 4, "mode": "human_only", "team": "ERM", "sla_h": 24, "action": "finalize_risk_record"}, {"seq": 5, "mode": "autonomous", "team": "ERM", "sla_h": 2, "action": "notify_risk_owners"}], "teams": ["ERM", "CYBER_GOV"], "domain": "risk_management", "pattern": "sequential_handoff", "category": "assessment", "sla_hours": 120}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
770f6b87-d2c7-4c21-8d90-99d64250c6b0	WF-RISK-03: Risk Treatment Planning	{"steps": [{"seq": 1, "mode": "hybrid_active", "team": "ERM", "sla_h": 48, "action": "propose_treatment_options"}, {"seq": 2, "mode": "human_only", "team": "owner_team", "sla_h": 72, "action": "select_treatment_strategy"}, {"seq": 3, "mode": "hybrid_active", "team": "ERM", "sla_h": 48, "action": "create_treatment_plan"}, {"seq": 4, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 96, "action": "approve_treatment_budget"}, {"seq": 5, "mode": "human_only", "team": "owner_team", "sla_h": 720, "action": "implement_treatment"}], "teams": ["ERM", "owner_team", "EXEC_STRATEGY"], "domain": "risk_management", "pattern": "sequential_handoff", "category": "treatment", "sla_hours": 336}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
a7f6f203-a621-4e2d-ba5b-c947c89e81a0	WF-RISK-04: Risk Appetite Review	{"steps": [{"seq": 1, "mode": "hybrid_active", "team": "ERM", "sla_h": 72, "action": "analyze_current_appetite_vs_exposure"}, {"seq": 2, "mode": "hybrid_shadow", "team": "ERM", "sla_h": 48, "action": "propose_revised_appetite"}, {"seq": 3, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 120, "action": "board_approval_of_appetite"}], "teams": ["ERM", "EXEC_STRATEGY"], "domain": "risk_management", "pattern": "sequential_handoff", "trigger": "schedule_annual", "category": "governance", "sla_hours": 336}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
80f67b8c-4fa5-44fb-a63f-cd2799a661de	WF-RISK-05: KRI Threshold Breach Response	{"steps": [{"seq": 1, "mode": "autonomous", "team": "ERM", "sla_h": 1, "action": "kri_alert_notification"}, {"seq": 2, "mode": "human_only", "team": "owner_team", "sla_h": 4, "action": "acknowledge_kri_breach"}, {"seq": 3, "mode": "hybrid_shadow", "team": "owner_team", "sla_h": 8, "action": "initiate_risk_remediation"}, {"seq": 4, "mode": "hybrid_active", "team": "ERM", "sla_h": 168, "action": "monitor_and_close_kri"}], "teams": ["ERM", "owner_team"], "domain": "risk_management", "pattern": "escalation_chain", "trigger": "kri_threshold_breach", "category": "monitoring", "sla_hours": 24}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
4565edd7-e2a5-4dca-ab52-16376d9e2282	WF-RISK-06: Risk Register Periodic Review	{"steps": [{"seq": 1, "mode": "autonomous", "team": "ERM", "sla_h": 4, "action": "distribute_review_assignments"}, {"seq": 2, "mode": "human_only", "team": "all_teams", "sla_h": 168, "action": "review_and_update_owned_risks"}, {"seq": 3, "mode": "hybrid_active", "team": "ERM", "sla_h": 48, "action": "consolidate_updated_register"}, {"seq": 4, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 48, "action": "risk_status_sign_off"}], "teams": ["ERM", "all_teams"], "domain": "risk_management", "pattern": "hub_and_spoke", "trigger": "schedule_quarterly", "category": "review", "sla_hours": 336}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
3870f57c-53a1-40dd-b549-78d82ec95e06	WF-COMP-01: Control Design & Implementation	{"steps": [{"seq": 1, "mode": "hybrid_shadow", "team": "CYBER_GOV", "sla_h": 48, "action": "draft_control_design"}, {"seq": 2, "mode": "human_only", "team": "owner_team", "sla_h": 72, "action": "technical_feasibility_review"}, {"seq": 3, "mode": "human_only", "team": "AUDIT", "sla_h": 72, "action": "design_effectiveness_review"}, {"seq": 4, "mode": "human_only", "team": "owner_team", "sla_h": 480, "action": "implement_control"}, {"seq": 5, "mode": "hybrid_active", "team": "AUDIT", "sla_h": 72, "action": "implementation_verification"}], "teams": ["CYBER_GOV", "owner_team", "AUDIT"], "domain": "compliance", "pattern": "sequential_handoff", "category": "control_lifecycle", "sla_hours": 720}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
7e0eff31-2813-42ae-a57c-0bb51bf24729	WF-COMP-02: Control Operating Effectiveness Test	{"steps": [{"seq": 1, "mode": "hybrid_shadow", "team": "AUDIT", "sla_h": 24, "action": "plan_control_test_procedures"}, {"seq": 2, "mode": "hybrid_active", "team": "AUDIT", "sla_h": 120, "action": "execute_test_procedures"}, {"seq": 3, "mode": "human_only", "team": "owner_team", "sla_h": 48, "action": "provide_requested_evidence"}, {"seq": 4, "mode": "hybrid_shadow", "team": "AUDIT", "sla_h": 24, "action": "document_test_findings"}, {"seq": 5, "mode": "human_only", "team": "CYBER_GOV", "sla_h": 24, "action": "review_test_results"}], "teams": ["AUDIT", "owner_team", "CYBER_GOV"], "domain": "compliance", "pattern": "sequential_handoff", "category": "control_testing", "sla_hours": 240}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
78002fff-8023-442e-99bd-3d5cd6a8df98	WF-COMP-03: Control Deficiency Remediation	{"steps": [{"seq": 1, "mode": "autonomous", "team": "AUDIT", "sla_h": 4, "action": "raise_deficiency_finding"}, {"seq": 2, "mode": "human_only", "team": "owner_team", "sla_h": 24, "action": "acknowledge_finding"}, {"seq": 3, "mode": "hybrid_shadow", "team": "owner_team", "sla_h": 72, "action": "create_remediation_plan"}, {"seq": 4, "mode": "human_only", "team": "CYBER_GOV", "sla_h": 48, "action": "approve_remediation_plan"}, {"seq": 5, "mode": "human_only", "team": "owner_team", "sla_h": 480, "action": "implement_remediation"}, {"seq": 6, "mode": "hybrid_active", "team": "AUDIT", "sla_h": 72, "action": "verify_remediation_effectiveness"}], "teams": ["AUDIT", "owner_team", "CYBER_GOV"], "domain": "compliance", "pattern": "sequential_handoff", "trigger": "control_test_fail", "category": "remediation", "sla_hours": 720}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
459c52a0-ee7b-4d1b-82e0-f00706f3d2d4	WF-COMP-04: Compliance Gap Assessment	{"steps": [{"seq": 1, "mode": "autonomous", "team": "CYBER_GOV", "sla_h": 4, "action": "initiate_gap_assessment"}, {"seq": 2, "mode": "human_only", "team": "all_teams", "sla_h": 168, "action": "complete_gap_questionnaire"}, {"seq": 3, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 72, "action": "analyze_and_score_gaps"}, {"seq": 4, "mode": "hybrid_shadow", "team": "ERM", "sla_h": 48, "action": "prioritize_gaps_by_risk"}, {"seq": 5, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 24, "action": "produce_gap_report"}], "teams": ["CYBER_GOV", "ERM", "all_teams"], "domain": "compliance", "pattern": "hub_and_spoke", "category": "assessment", "sla_hours": 336}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
ca9d9c9a-c90f-406c-856b-fef6eb947016	WF-COMP-05: Regulatory Obligation Mapping	{"steps": [{"seq": 1, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 48, "action": "identify_applicable_regulations"}, {"seq": 2, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 168, "action": "map_controls_to_security_obligations", "parallel_group": "mapping"}, {"seq": 2, "mode": "hybrid_active", "team": "PRIVACY", "sla_h": 120, "action": "map_pdpl_and_privacy_obligations", "parallel_group": "mapping"}, {"seq": 2, "mode": "hybrid_shadow", "team": "FINANCE", "sla_h": 96, "action": "map_financial_reporting_obligations", "parallel_group": "mapping"}, {"seq": 3, "mode": "human_only", "team": "CYBER_GOV", "sla_h": 48, "action": "finalize_obligation_register"}], "teams": ["CYBER_GOV", "PRIVACY", "FINANCE"], "domain": "compliance", "pattern": "parallel_lanes", "category": "mapping", "sla_hours": 480}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
59c18f53-cafe-4545-875a-4e8bbdc237c4	WF-COMP-06: Certification Readiness Assessment	{"steps": [{"seq": 1, "mode": "hybrid_active", "team": "AUDIT", "sla_h": 120, "action": "pre_certification_gap_analysis"}, {"seq": 2, "mode": "human_only", "team": "all_teams", "sla_h": 480, "action": "remediate_critical_gaps"}, {"seq": 3, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 72, "action": "prepare_evidence_package"}, {"seq": 4, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 48, "action": "management_sign_off"}], "teams": ["CYBER_GOV", "AUDIT", "all_teams"], "domain": "compliance", "pattern": "hub_and_spoke", "category": "certification", "sla_hours": 720}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
01066373-b311-401c-8e89-a9ccbc6a5309	WF-COMP-07: Annual Compliance Program Review	{"steps": [{"seq": 1, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 72, "action": "evaluate_compliance_program"}, {"seq": 2, "mode": "hybrid_active", "team": "ERM", "sla_h": 72, "action": "evaluate_risk_program"}, {"seq": 3, "mode": "hybrid_active", "team": "AUDIT", "sla_h": 72, "action": "evaluate_audit_program"}, {"seq": 4, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 120, "action": "approve_program_roadmap"}], "teams": ["CYBER_GOV", "ERM", "AUDIT", "EXEC_STRATEGY"], "domain": "compliance", "pattern": "sequential_handoff", "trigger": "schedule_annual", "category": "program_review", "sla_hours": 336}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
bce53b15-27b2-45ca-a011-ef24f5a049c0	WF-AUDIT-01: Annual Audit Plan Development	{"steps": [{"seq": 1, "mode": "autonomous", "team": "ERM", "sla_h": 8, "action": "provide_risk_based_priorities"}, {"seq": 2, "mode": "hybrid_shadow", "team": "AUDIT", "sla_h": 120, "action": "draft_risk_based_audit_plan"}, {"seq": 3, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 72, "action": "approve_audit_plan"}, {"seq": 4, "mode": "hybrid_active", "team": "AUDIT", "sla_h": 48, "action": "schedule_audit_engagements"}], "teams": ["AUDIT", "ERM", "EXEC_STRATEGY"], "domain": "audit", "pattern": "sequential_handoff", "trigger": "schedule_annual", "category": "planning", "sla_hours": 336}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
6e33ba2c-378b-4773-95c5-83a52b92616d	WF-AUDIT-02: Internal Audit Execution	{"steps": [{"seq": 1, "mode": "human_only", "team": "AUDIT", "sla_h": 8, "action": "opening_meeting_and_scope"}, {"seq": 2, "mode": "hybrid_active", "team": "AUDIT", "sla_h": 240, "action": "fieldwork_and_evidence_collection"}, {"seq": 3, "mode": "human_only", "team": "auditee_team", "sla_h": 120, "action": "provide_requested_evidence"}, {"seq": 4, "mode": "hybrid_shadow", "team": "AUDIT", "sla_h": 72, "action": "draft_audit_report"}, {"seq": 5, "mode": "human_only", "team": "auditee_team", "sla_h": 72, "action": "submit_management_response"}, {"seq": 6, "mode": "human_only", "team": "AUDIT", "sla_h": 24, "action": "issue_final_report"}], "teams": ["AUDIT", "auditee_team"], "domain": "audit", "pattern": "sequential_handoff", "category": "execution", "sla_hours": 480}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
6de179b7-db63-4cc6-ab6d-ec2c9ff22e0a	WF-AUDIT-03: Audit Finding Remediation	{"steps": [{"seq": 1, "mode": "hybrid_shadow", "team": "AUDIT", "sla_h": 8, "action": "classify_and_rate_finding"}, {"seq": 2, "mode": "human_only", "team": "owner_team", "sla_h": 24, "action": "assign_remediation_owner"}, {"seq": 3, "mode": "human_only", "team": "owner_team", "sla_h": 480, "action": "implement_corrective_action"}, {"seq": 4, "mode": "hybrid_active", "team": "AUDIT", "sla_h": 72, "action": "verify_corrective_action"}, {"seq": 5, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 24, "action": "close_finding_sign_off"}], "teams": ["AUDIT", "owner_team", "EXEC_STRATEGY"], "domain": "audit", "pattern": "escalation_chain", "trigger": "audit_finding_raised", "category": "findings", "sla_hours": 720}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
83ed6ad7-af0d-4a8f-b1c5-5513bf98a914	WF-AUDIT-04: External Audit Support	{"steps": [{"seq": 1, "mode": "human_only", "team": "AUDIT", "sla_h": 48, "action": "coordinate_audit_logistics"}, {"seq": 2, "mode": "autonomous", "team": "AUDIT", "sla_h": 4, "action": "distribute_evidence_requests_to_teams"}, {"seq": 3, "mode": "human_only", "team": "all_teams", "sla_h": 168, "action": "provide_evidence_to_auditors"}, {"seq": 4, "mode": "hybrid_shadow", "team": "AUDIT", "sla_h": 168, "action": "review_auditor_queries"}, {"seq": 5, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 72, "action": "management_letter_response"}], "teams": ["AUDIT", "CYBER_GOV", "all_teams"], "domain": "audit", "pattern": "hub_and_spoke", "category": "external", "sla_hours": 720}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
96e31c85-b1b1-408d-b9e4-9ad9be299a59	WF-AUDIT-05: Continuous Audit Monitoring	{"steps": [{"seq": 1, "mode": "autonomous", "team": "AUDIT", "sla_h": 2, "action": "automated_control_sampling"}, {"seq": 2, "mode": "hybrid_shadow", "team": "AUDIT", "sla_h": 8, "action": "exception_triage"}, {"seq": 3, "mode": "human_only", "team": "CYBER_GOV", "sla_h": 24, "action": "remediate_control_exceptions"}], "teams": ["AUDIT", "CYBER_GOV"], "domain": "audit", "pattern": "sequential_handoff", "trigger": "schedule_weekly", "category": "continuous_monitoring", "sla_hours": 24}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
6699071a-152a-43c9-9689-ddcf7985c02f	WF-EVID-01: Scheduled Evidence Collection	{"steps": [{"seq": 1, "mode": "autonomous", "team": "CYBER_GOV", "sla_h": 2, "action": "send_evidence_collection_requests"}, {"seq": 2, "mode": "human_only", "team": "owner_team", "sla_h": 120, "action": "collect_and_upload_evidence"}, {"seq": 3, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 24, "action": "review_evidence_quality"}, {"seq": 4, "mode": "hybrid_shadow", "team": "AUDIT", "sla_h": 24, "action": "approve_evidence_for_controls"}], "teams": ["CYBER_GOV", "owner_team", "AUDIT"], "domain": "evidence", "pattern": "sequential_handoff", "trigger": "schedule_monthly", "category": "collection", "sla_hours": 168}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
c6b39575-0798-4c5d-a1a2-3edb6a9467fa	WF-EVID-02: Evidence Expiry & Renewal	{"steps": [{"seq": 1, "mode": "autonomous", "team": "CYBER_GOV", "sla_h": 1, "action": "notify_evidence_expiry"}, {"seq": 2, "mode": "human_only", "team": "owner_team", "sla_h": 48, "action": "renew_or_refresh_evidence"}, {"seq": 3, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 24, "action": "validate_renewed_evidence"}], "teams": ["CYBER_GOV", "owner_team"], "domain": "evidence", "pattern": "sequential_handoff", "trigger": "evidence_expiry_approaching", "category": "renewal", "sla_hours": 72}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
759f880b-edf3-44e7-aea6-f36219c19c2f	WF-EVID-03: Evidence Cross-Validation	{"steps": [{"seq": 1, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 48, "action": "technical_evidence_review", "parallel_group": "validation"}, {"seq": 1, "mode": "hybrid_active", "team": "AUDIT", "sla_h": 48, "action": "audit_evidence_review", "parallel_group": "validation"}, {"seq": 2, "mode": "hybrid_shadow", "team": "CYBER_GOV", "sla_h": 24, "action": "reconcile_discrepancies"}], "teams": ["CYBER_GOV", "AUDIT"], "domain": "evidence", "pattern": "parallel_lanes", "category": "validation", "sla_hours": 72}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
b9bde52d-fc14-4f96-85e6-031142d3b671	WF-INC-01: Security Incident Response	{"steps": [{"seq": 1, "mode": "autonomous", "team": "SOC_OPS", "sla_h": 1, "action": "detect_and_triage_incident"}, {"seq": 2, "mode": "human_only", "team": "SOC_OPS", "sla_h": 1, "action": "declare_incident_severity"}, {"seq": 3, "mode": "human_only", "team": "CYBER_GOV", "sla_h": 1, "action": "activate_war_room"}, {"seq": 4, "mode": "hybrid_active", "team": "SOC_OPS", "sla_h": 4, "action": "contain_threat", "parallel_group": "response"}, {"seq": 4, "mode": "autonomous", "team": "IAM_GOV", "sla_h": 1, "action": "revoke_compromised_access", "parallel_group": "response"}, {"seq": 4, "mode": "hybrid_shadow", "team": "DATA_GOV", "sla_h": 4, "action": "assess_data_exposure", "parallel_group": "response"}, {"seq": 5, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 8, "action": "eradicate_and_recover"}, {"seq": 6, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 4, "action": "executive_briefing"}, {"seq": 7, "mode": "hybrid_shadow", "team": "SOC_OPS", "sla_h": 72, "action": "post_incident_report"}], "teams": ["SOC_OPS", "CYBER_GOV", "IAM_GOV", "DATA_GOV", "EXEC_STRATEGY"], "domain": "incident", "pattern": "war_room", "trigger": "security_incident_detected", "category": "response", "sla_hours": 4}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
2e74d335-21a1-4e79-aa27-0b0642872182	WF-INC-02: PDPL Data Breach Notification (72h)	{"steps": [{"seq": 1, "mode": "human_only", "team": "PRIVACY", "sla_h": 4, "action": "assess_breach_scope"}, {"seq": 2, "mode": "hybrid_active", "team": "SOC_OPS", "sla_h": 4, "action": "contain_breach", "parallel_group": "breach_response"}, {"seq": 2, "mode": "hybrid_shadow", "team": "PRIVACY", "sla_h": 24, "action": "draft_sdaia_notification", "parallel_group": "breach_response"}, {"seq": 3, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 12, "action": "approve_notification"}, {"seq": 4, "mode": "human_only", "team": "PRIVACY", "sla_h": 4, "action": "submit_breach_to_sdaia"}, {"seq": 5, "mode": "hybrid_active", "team": "PRIVACY", "sla_h": 24, "action": "notify_affected_data_subjects"}], "teams": ["PRIVACY", "SOC_OPS", "EXEC_STRATEGY", "CYBER_GOV"], "domain": "incident", "pattern": "war_room", "trigger": "pdpl_breach_confirmed", "category": "breach_notification", "sla_hours": 72, "hard_deadline_hours": 72}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
8d5add7b-2dba-4312-978e-307378d66110	WF-INC-03: Operational Incident Management	{"steps": [{"seq": 1, "mode": "hybrid_shadow", "team": "SVC_OPS", "sla_h": 1, "action": "log_and_classify_incident"}, {"seq": 2, "mode": "human_only", "team": "owner_team", "sla_h": 4, "action": "resolve_or_escalate"}, {"seq": 3, "mode": "autonomous", "team": "SOC_OPS", "sla_h": 2, "action": "security_impact_check"}, {"seq": 4, "mode": "hybrid_active", "team": "SVC_OPS", "sla_h": 4, "action": "close_and_report"}], "teams": ["SVC_OPS", "SOC_OPS", "owner_team"], "domain": "incident", "pattern": "escalation_chain", "trigger": "operational_incident", "category": "operational", "sla_hours": 8}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
b545eb66-3d92-4b0c-aa19-2e2c7578b11f	WF-VND-01: Vendor Risk Onboarding	{"steps": [{"seq": 1, "mode": "human_only", "team": "VENDOR_RISK", "sla_h": 8, "action": "initiate_vendor_assessment"}, {"seq": 2, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 72, "action": "security_due_diligence", "parallel_group": "vendor_review"}, {"seq": 2, "mode": "hybrid_active", "team": "PRIVACY", "sla_h": 72, "action": "privacy_compliance_review", "parallel_group": "vendor_review"}, {"seq": 2, "mode": "hybrid_shadow", "team": "FINANCE", "sla_h": 48, "action": "financial_risk_check", "parallel_group": "vendor_review"}, {"seq": 3, "mode": "autonomous", "team": "VENDOR_RISK", "sla_h": 4, "action": "consolidate_vendor_risk_score"}, {"seq": 4, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 48, "action": "approve_vendor"}], "teams": ["VENDOR_RISK", "CYBER_GOV", "PRIVACY", "FINANCE"], "domain": "vendor_risk", "pattern": "parallel_lanes", "category": "onboarding", "sla_hours": 240}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
e9d3bd0c-999d-4683-bcba-018e84a068f6	WF-VND-02: Vendor Annual Re-certification	{"steps": [{"seq": 1, "mode": "autonomous", "team": "VENDOR_RISK", "sla_h": 4, "action": "send_recertification_questionnaire"}, {"seq": 2, "mode": "human_only", "team": "vendor", "sla_h": 168, "action": "complete_questionnaire"}, {"seq": 3, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 72, "action": "review_vendor_responses"}, {"seq": 4, "mode": "autonomous", "team": "VENDOR_RISK", "sla_h": 8, "action": "update_vendor_risk_score"}], "teams": ["VENDOR_RISK", "CYBER_GOV"], "domain": "vendor_risk", "pattern": "sequential_handoff", "trigger": "schedule_annual", "category": "review", "sla_hours": 336}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
56b2180a-7ab3-4738-a8da-8fc5970c195c	WF-VND-03: Vendor Offboarding & Termination	{"steps": [{"seq": 1, "mode": "human_only", "team": "VENDOR_RISK", "sla_h": 4, "action": "initiate_vendor_termination"}, {"seq": 2, "mode": "autonomous", "team": "IAM_GOV", "sla_h": 4, "action": "revoke_vendor_system_access", "parallel_group": "term_tasks"}, {"seq": 2, "mode": "hybrid_active", "team": "DATA_GOV", "sla_h": 48, "action": "data_return_or_secure_destruction", "parallel_group": "term_tasks"}, {"seq": 2, "mode": "human_only", "team": "FINANCE", "sla_h": 72, "action": "close_contracts_and_settle", "parallel_group": "term_tasks"}, {"seq": 3, "mode": "human_only", "team": "VENDOR_RISK", "sla_h": 8, "action": "confirm_termination_complete"}], "teams": ["VENDOR_RISK", "IAM_GOV", "DATA_GOV", "FINANCE"], "domain": "vendor_risk", "pattern": "parallel_lanes", "category": "offboarding", "sla_hours": 72}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
3a9a67a3-c070-4a7b-8861-eef1814ff723	WF-IAM-01: Access Request & Provisioning	{"steps": [{"seq": 1, "mode": "human_only", "team": "requester", "sla_h": 0, "action": "submit_access_request"}, {"seq": 2, "mode": "human_only", "team": "owner_team", "sla_h": 8, "action": "business_justification_review"}, {"seq": 3, "mode": "hybrid_shadow", "team": "CYBER_GOV", "sla_h": 4, "action": "security_policy_compliance_check"}, {"seq": 4, "mode": "autonomous", "team": "IAM_GOV", "sla_h": 4, "action": "provision_access"}, {"seq": 5, "mode": "autonomous", "team": "IAM_GOV", "sla_h": 1, "action": "notify_and_log_access_grant"}], "teams": ["IAM_GOV", "CYBER_GOV", "owner_team"], "domain": "identity_access", "pattern": "sequential_handoff", "category": "provisioning", "sla_hours": 24}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
14b9270a-316b-4968-ab3a-c82b0b31fa2a	WF-IAM-02: Privileged Access Request	{"steps": [{"seq": 1, "mode": "human_only", "team": "requester", "sla_h": 0, "action": "request_privileged_access"}, {"seq": 2, "mode": "hybrid_shadow", "team": "CYBER_GOV", "sla_h": 8, "action": "security_risk_assessment_of_request"}, {"seq": 3, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 12, "action": "executive_approval"}, {"seq": 4, "mode": "autonomous", "team": "IAM_GOV", "sla_h": 2, "action": "provision_time_bound_privileged_access"}, {"seq": 5, "mode": "autonomous", "team": "IAM_GOV", "sla_h": 4, "action": "monitor_and_auto_revoke"}], "teams": ["IAM_GOV", "CYBER_GOV", "EXEC_STRATEGY"], "domain": "identity_access", "pattern": "sequential_handoff", "category": "privileged_access", "sla_hours": 24}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
58b3f98c-8921-492d-8963-7b67c6a2dbcf	WF-IAM-03: User Offboarding (2h IAM SLA)	{"steps": [{"seq": 1, "mode": "human_only", "team": "HR_GOV", "sla_h": 0, "action": "trigger_offboarding_workflow"}, {"seq": 2, "mode": "autonomous", "team": "IAM_GOV", "sla_h": 2, "action": "revoke_all_system_access", "parallel_group": "offboard"}, {"seq": 2, "mode": "hybrid_active", "team": "DATA_GOV", "sla_h": 24, "action": "transfer_or_archive_data", "parallel_group": "offboard"}, {"seq": 2, "mode": "autonomous", "team": "SVC_OPS", "sla_h": 4, "action": "deactivate_accounts_and_devices", "parallel_group": "offboard"}, {"seq": 3, "mode": "human_only", "team": "HR_GOV", "sla_h": 24, "action": "confirm_offboarding_complete"}], "teams": ["IAM_GOV", "HR_GOV", "DATA_GOV", "SVC_OPS"], "domain": "identity_access", "pattern": "parallel_lanes", "trigger": "hr_offboarding_initiated", "category": "offboarding", "sla_hours": 2, "hard_sla_hours": 2}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
ab687f5e-ee0e-4beb-8f64-db05aaf03318	WF-IAM-04: Periodic Access Review & Recertification	{"steps": [{"seq": 1, "mode": "autonomous", "team": "IAM_GOV", "sla_h": 4, "action": "generate_access_review_reports"}, {"seq": 2, "mode": "human_only", "team": "all_team_leads", "sla_h": 168, "action": "certify_or_revoke_team_access"}, {"seq": 3, "mode": "autonomous", "team": "IAM_GOV", "sla_h": 8, "action": "revoke_uncertified_access"}, {"seq": 4, "mode": "hybrid_shadow", "team": "AUDIT", "sla_h": 24, "action": "access_review_sign_off"}], "teams": ["IAM_GOV", "all_team_leads"], "domain": "identity_access", "pattern": "hub_and_spoke", "trigger": "schedule_quarterly", "category": "access_review", "sla_hours": 336}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
a9c049cd-a65a-4cd7-ad4d-64599c92fbe3	WF-PRIV-01: Data Protection Impact Assessment (DPIA)	{"steps": [{"seq": 1, "mode": "hybrid_shadow", "team": "PRIVACY", "sla_h": 24, "action": "screen_project_for_dpia_requirement"}, {"seq": 2, "mode": "human_only", "team": "PRIVACY", "sla_h": 240, "action": "conduct_dpia"}, {"seq": 3, "mode": "hybrid_active", "team": "DATA_GOV", "sla_h": 48, "action": "data_flow_validation"}, {"seq": 4, "mode": "hybrid_shadow", "team": "ERM", "sla_h": 48, "action": "residual_risk_assessment"}, {"seq": 5, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 48, "action": "dpia_approval"}, {"seq": 6, "mode": "hybrid_active", "team": "PRIVACY", "sla_h": 24, "action": "publish_and_monitor_dpia"}], "teams": ["PRIVACY", "DATA_GOV", "ERM", "EXEC_STRATEGY"], "domain": "privacy", "pattern": "sequential_handoff", "category": "assessment", "sla_hours": 480}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
795e25d8-146f-497a-830e-7219d3057366	WF-PRIV-02: Data Subject Rights Request (DSR)	{"steps": [{"seq": 1, "mode": "human_only", "team": "PRIVACY", "sla_h": 24, "action": "acknowledge_and_verify_identity"}, {"seq": 2, "mode": "hybrid_active", "team": "DATA_GOV", "sla_h": 168, "action": "locate_and_retrieve_personal_data"}, {"seq": 3, "mode": "autonomous", "team": "IAM_GOV", "sla_h": 8, "action": "check_system_access_logs"}, {"seq": 4, "mode": "human_only", "team": "PRIVACY", "sla_h": 48, "action": "fulfill_dsr_request"}, {"seq": 5, "mode": "hybrid_active", "team": "PRIVACY", "sla_h": 24, "action": "document_and_close_dsr"}], "teams": ["PRIVACY", "DATA_GOV", "IAM_GOV"], "domain": "privacy", "pattern": "sequential_handoff", "trigger": "dsr_received", "category": "dsr", "sla_hours": 720, "hard_deadline_days": 30}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
98cd5672-e796-4ec3-ab6f-8caee1e3180f	WF-PRIV-03: ROPA Maintenance	{"steps": [{"seq": 1, "mode": "autonomous", "team": "PRIVACY", "sla_h": 4, "action": "distribute_ropa_update_forms"}, {"seq": 2, "mode": "human_only", "team": "all_teams", "sla_h": 168, "action": "update_data_processing_activities"}, {"seq": 3, "mode": "hybrid_active", "team": "PRIVACY", "sla_h": 72, "action": "consolidate_and_validate_ropa"}, {"seq": 4, "mode": "hybrid_shadow", "team": "DATA_GOV", "sla_h": 48, "action": "cross_reference_data_flows"}, {"seq": 5, "mode": "human_only", "team": "PRIVACY", "sla_h": 24, "action": "publish_updated_ropa"}], "teams": ["PRIVACY", "DATA_GOV", "all_teams"], "domain": "privacy", "pattern": "hub_and_spoke", "trigger": "schedule_annual", "category": "ropa", "sla_hours": 336}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
f7c306d7-a613-4cd5-a48d-7a674e0a5703	WF-ARCH-01: Change Advisory Board (CAB)	{"steps": [{"seq": 1, "mode": "human_only", "team": "APP_ENG", "sla_h": 0, "action": "submit_change_request"}, {"seq": 2, "mode": "hybrid_shadow", "team": "ENT_ARCH", "sla_h": 48, "action": "architecture_impact_assessment"}, {"seq": 3, "mode": "hybrid_shadow", "team": "CYBER_GOV", "sla_h": 24, "action": "security_risk_assessment"}, {"seq": 4, "mode": "human_only", "team": "SVC_OPS", "sla_h": 24, "action": "operational_impact_review"}, {"seq": 5, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 48, "action": "cab_approval"}, {"seq": 6, "mode": "human_only", "team": "APP_ENG", "sla_h": 168, "action": "implement_change"}, {"seq": 7, "mode": "hybrid_shadow", "team": "SVC_OPS", "sla_h": 24, "action": "post_change_review"}], "teams": ["APP_ENG", "ENT_ARCH", "CYBER_GOV", "SVC_OPS", "EXEC_STRATEGY"], "domain": "architecture", "pattern": "sequential_handoff", "category": "change_management", "sla_hours": 168}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
829982ca-d474-4a8e-8f7e-d7ef4b8428a8	WF-ARCH-02: Architecture Security Review	{"steps": [{"seq": 1, "mode": "human_only", "team": "ENT_ARCH", "sla_h": 0, "action": "submit_architecture_design"}, {"seq": 2, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 72, "action": "security_threat_modelling"}, {"seq": 3, "mode": "hybrid_shadow", "team": "ERM", "sla_h": 48, "action": "residual_risk_assessment"}, {"seq": 4, "mode": "human_only", "team": "CYBER_GOV", "sla_h": 24, "action": "issue_security_sign_off"}, {"seq": 5, "mode": "human_only", "team": "ENT_ARCH", "sla_h": 72, "action": "update_architecture_with_controls"}], "teams": ["ENT_ARCH", "CYBER_GOV", "ERM"], "domain": "architecture", "pattern": "sequential_handoff", "category": "security_review", "sla_hours": 240}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
d940bc70-029d-47a7-8d19-ce954130d4b1	WF-HR-01: Security Awareness Training Campaign	{"steps": [{"seq": 1, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 240, "action": "develop_training_content"}, {"seq": 2, "mode": "autonomous", "team": "HR_GOV", "sla_h": 4, "action": "assign_mandatory_training"}, {"seq": 3, "mode": "autonomous", "team": "HR_GOV", "sla_h": 672, "action": "track_completion_rates"}, {"seq": 4, "mode": "hybrid_shadow", "team": "CYBER_GOV", "sla_h": 48, "action": "evaluate_training_effectiveness"}], "teams": ["HR_GOV", "CYBER_GOV"], "domain": "hr_workforce", "pattern": "hub_and_spoke", "trigger": "schedule_annual", "category": "training", "sla_hours": 720}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
32e15aef-ea0c-4d02-ad3a-28a9a791513a	WF-HR-02: Workforce Risk & Background Screening	{"steps": [{"seq": 1, "mode": "human_only", "team": "HR_GOV", "sla_h": 8, "action": "initiate_background_screening"}, {"seq": 2, "mode": "human_only", "team": "HR_GOV", "sla_h": 168, "action": "collect_screening_documents"}, {"seq": 3, "mode": "hybrid_shadow", "team": "CYBER_GOV", "sla_h": 24, "action": "assess_security_risk_of_candidate"}, {"seq": 4, "mode": "human_only", "team": "HR_GOV", "sla_h": 48, "action": "approve_or_flag_candidate"}], "teams": ["HR_GOV", "CYBER_GOV"], "domain": "hr_workforce", "pattern": "sequential_handoff", "category": "screening", "sla_hours": 336}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
6bebf1bf-7fbf-4fa5-acfe-f33a97026cc8	WF-BCP-01: BCP Activation & Crisis Management	{"steps": [{"seq": 1, "mode": "human_only", "team": "BCM_DR", "sla_h": 1, "action": "declare_disaster_and_bcp_activation"}, {"seq": 2, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 1, "action": "crisis_management_team_assembly"}, {"seq": 3, "mode": "hybrid_active", "team": "SOC_OPS", "sla_h": 4, "action": "cyber_threat_containment", "parallel_group": "recovery"}, {"seq": 3, "mode": "autonomous", "team": "CLOUD_INFRA", "sla_h": 2, "action": "activate_dr_failover", "parallel_group": "recovery"}, {"seq": 3, "mode": "hybrid_active", "team": "SVC_OPS", "sla_h": 8, "action": "restore_critical_services", "parallel_group": "recovery"}, {"seq": 4, "mode": "hybrid_shadow", "team": "BCM_DR", "sla_h": 4, "action": "communication_to_stakeholders"}, {"seq": 5, "mode": "hybrid_shadow", "team": "BCM_DR", "sla_h": 168, "action": "post_event_review_and_lessons_learned"}], "teams": ["BCM_DR", "EXEC_STRATEGY", "SOC_OPS", "CLOUD_INFRA", "SVC_OPS"], "domain": "bcp_dr", "pattern": "war_room", "trigger": "bcp_trigger_event", "category": "activation", "sla_hours": 4}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
23a5e9c7-5cc0-4ef6-9682-2e5bd8eea0ba	WF-QIYAS-01: Maturity Assessment Execution	{"steps": [{"seq": 1, "mode": "autonomous", "team": "CYBER_GOV", "sla_h": 4, "action": "initiate_qiyas_assessment"}, {"seq": 2, "mode": "human_only", "team": "all_teams", "sla_h": 240, "action": "respond_to_maturity_questionnaire"}, {"seq": 3, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 48, "action": "score_and_calibrate"}, {"seq": 4, "mode": "hybrid_shadow", "team": "ERM", "sla_h": 48, "action": "review_and_validate_maturity_scores"}, {"seq": 5, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 48, "action": "approve_maturity_report"}], "teams": ["CYBER_GOV", "ERM", "all_teams"], "domain": "qiyas", "pattern": "hub_and_spoke", "category": "assessment", "sla_hours": 480}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
8aa3b230-2ffd-4190-b6de-a706060bba0d	WF-QIYAS-02: Gap-Triggered Remediation	{"steps": [{"seq": 1, "mode": "autonomous", "team": "CYBER_GOV", "sla_h": 2, "action": "auto_create_remediation_task_from_gap"}, {"seq": 2, "mode": "human_only", "team": "owner_team", "sla_h": 48, "action": "acknowledge_gap_and_plan_remediation"}, {"seq": 3, "mode": "hybrid_shadow", "team": "ERM", "sla_h": 24, "action": "validate_risk_alignment"}, {"seq": 4, "mode": "human_only", "team": "owner_team", "sla_h": 480, "action": "implement_improvement"}, {"seq": 5, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 72, "action": "verify_gap_closure_via_qiyas_retest"}], "teams": ["CYBER_GOV", "owner_team", "ERM"], "domain": "qiyas", "pattern": "sequential_handoff", "trigger": "qiyas_gap_critical_or_high", "category": "gap_remediation", "sla_hours": 720}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
0116c780-b302-4107-b754-4349a881c612	WF-QIYAS-03: Recommendation Acceptance & Execution	{"steps": [{"seq": 1, "mode": "autonomous", "team": "CYBER_GOV", "sla_h": 2, "action": "auto_create_grc_task_from_recommendation"}, {"seq": 2, "mode": "hybrid_active", "team": "ERM", "sla_h": 8, "action": "assign_task_to_control_owner"}, {"seq": 3, "mode": "human_only", "team": "owner_team", "sla_h": 480, "action": "execute_recommendation"}, {"seq": 4, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 48, "action": "verify_and_update_qiyas_indicator"}], "teams": ["CYBER_GOV", "ERM"], "domain": "qiyas", "pattern": "sequential_handoff", "trigger": "qiyas_recommendation_accepted", "category": "recommendations", "sla_hours": 168}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
2ccc279a-bfbb-4984-a39b-bd794d7dde18	WF-QIYAS-04: Assessment Finalization & GRC Sync	{"steps": [{"seq": 1, "mode": "autonomous", "team": "CYBER_GOV", "sla_h": 1, "action": "push_maturity_scores_to_grc_dashboard"}, {"seq": 2, "mode": "autonomous", "team": "ERM", "sla_h": 2, "action": "update_risk_posture_from_maturity"}, {"seq": 3, "mode": "autonomous", "team": "CYBER_GOV", "sla_h": 1, "action": "notify_ciso_and_erm_of_assessment_results"}], "teams": ["CYBER_GOV", "ERM"], "domain": "qiyas", "pattern": "sequential_handoff", "trigger": "qiyas_assessment_finalized", "category": "sync", "sla_hours": 24}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
763b29b6-a96b-4cfe-8da7-042956a78bdd	WF-QIYAS-05: Benchmarking & Peer Comparison	{"steps": [{"seq": 1, "mode": "autonomous", "team": "CYBER_GOV", "sla_h": 4, "action": "run_qiyas_benchmark_comparison"}, {"seq": 2, "mode": "hybrid_shadow", "team": "ERM", "sla_h": 48, "action": "analyze_benchmark_gaps"}, {"seq": 3, "mode": "hybrid_active", "team": "CYBER_GOV", "sla_h": 48, "action": "draft_benchmarking_report"}, {"seq": 4, "mode": "human_only", "team": "EXEC_STRATEGY", "sla_h": 72, "action": "review_and_set_improvement_targets"}], "teams": ["CYBER_GOV", "ERM", "EXEC_STRATEGY"], "domain": "qiyas", "pattern": "sequential_handoff", "trigger": "schedule_semi_annual", "category": "benchmarking", "sla_hours": 168}	1	template	system	2026-03-17 08:24:21.940575+08	2026-03-17 08:24:21.940575+08	\N
\.


ALTER TABLE __TENANT_SCHEMA__.workflows ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_steps; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_steps DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_steps (step_id, workflow_id, step_name, step_order, step_type, assignee_type, config, status, responsible_team_code, responsible_team_id, operation_mode, sla_minutes, confidence_threshold, escalation_team_code, is_parallel_branch, parallel_group_id, created_at, updated_at, deleted_at, definition_id, version_id, step_code, name_en, name_ar, description, sequence_order, is_start, is_end, sla_hours, auto_assign_rule, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_steps ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_assignments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_assignments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_assignments (assignment_id, instance_id, step_id, assignee_user_id, assignee_role_id, assigned_at, claimed_at, completed_at, status, delegated_to_user_id, delegation_reason, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_assignments ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_attachments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_attachments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_attachments (attachment_id, instance_id, step_id, file_id, file_name, file_type, file_size, uploaded_by, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_attachments ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_triggers; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_triggers DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_triggers (trigger_id, trigger_name, trigger_description, trigger_type, source_system, trigger_conditions, target_workflow_type, workflow_parameters, priority_override, assign_to_team_id, assign_to_user_id, active, last_triggered_at, last_trigger_result, trigger_count, success_count, failure_count, schedule_cron, schedule_timezone, next_scheduled_run, created_by, created_at, updated_at) FROM stdin;
8701ab44-183d-455b-b450-c9eddc902afc	New Saudi Regulation Published	Triggers policy update workflow when new Saudi regulations are published	event	regulatory_monitor	{"event": "new_regulation", "source": "regulatory_monitor", "country": "SAU", "regulators": ["NCA", "SAMA", "SDAIA", "ZATCA", "CMA", "MHRSD"]}	policy_update	{"priority": "high", "notify_teams": ["PRIVACY", "CYBER_GOV", "QUALITY", "ERM"], "deadline_days": 90, "require_legal_review": true}	high	\N	\N	t	\N	\N	0	0	0	\N	Asia/Riyadh	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
15d1b64d-bf01-49a3-bae7-79276838403b	Framework Update Detection	Triggers control reassessment when frameworks are updated	event	framework_monitor	{"event": "framework_updated", "frameworks": ["NCA-ECC", "SAMA-CSF", "PDPL"], "change_type": ["new_control", "control_modified", "control_removed"]}	control_reassessment	{"priority": "high", "assessment_scope": "affected_controls", "require_evidence_update": true}	high	\N	\N	t	\N	\N	0	0	0	\N	Asia/Riyadh	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
ad9b08e4-63e6-48f4-bfb5-5723e521a79b	Quarterly Evidence Collection - Q1	Automated evidence collection for Q1 (January)	schedule	scheduler	{"quarter": 1, "frequency": "quarterly", "frameworks": ["NCA-ECC", "SAMA-CSF", "PDPL"], "evidence_types": ["all_controls"]}	evidence_collection	{"auto_reminders": true, "collection_period": "Q1", "validation_required": true, "reminder_frequency_days": 7}	medium	\N	\N	t	\N	\N	0	0	0	0 0 1 1 *	Asia/Riyadh	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
5292fe46-73ea-4919-95ff-8d9b910f6034	Quarterly Evidence Collection - Q2	Automated evidence collection for Q2 (April)	schedule	scheduler	{"quarter": 2, "frequency": "quarterly", "frameworks": ["NCA-ECC", "SAMA-CSF", "PDPL"], "evidence_types": ["all_controls"]}	evidence_collection	{"auto_reminders": true, "collection_period": "Q2", "validation_required": true, "reminder_frequency_days": 7}	medium	\N	\N	t	\N	\N	0	0	0	0 0 1 4 *	Asia/Riyadh	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
ae7da7c9-29f0-4c34-9522-0163f63815b4	Quarterly Evidence Collection - Q3	Automated evidence collection for Q3 (July)	schedule	scheduler	{"quarter": 3, "frequency": "quarterly", "frameworks": ["NCA-ECC", "SAMA-CSF", "PDPL"], "evidence_types": ["all_controls"]}	evidence_collection	{"auto_reminders": true, "collection_period": "Q3", "validation_required": true, "reminder_frequency_days": 7}	medium	\N	\N	t	\N	\N	0	0	0	0 0 1 7 *	Asia/Riyadh	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
ccb5ce68-da40-499a-b35c-361870429354	Quarterly Evidence Collection - Q4	Automated evidence collection for Q4 (October)	schedule	scheduler	{"quarter": 4, "frequency": "quarterly", "frameworks": ["NCA-ECC", "SAMA-CSF", "PDPL"], "evidence_types": ["all_controls"]}	evidence_collection	{"auto_reminders": true, "collection_period": "Q4", "validation_required": true, "reminder_frequency_days": 7}	medium	\N	\N	t	\N	\N	0	0	0	0 0 1 10 *	Asia/Riyadh	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
3757de1d-5f5a-4c04-9b3c-943fe4147b0d	Monthly Policy Review	Triggers policy review workflow monthly	schedule	scheduler	{"scope": "due_for_review", "review_type": "policy"}	policy_review	{"review_depth": "standard", "notify_owners": true}	low	\N	\N	t	\N	\N	0	0	0	0 0 1 * *	Asia/Riyadh	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
5bf71c4c-8e34-4e17-ba04-82845cd61411	Monthly Vendor Risk Review	Triggers vendor risk assessment monthly	schedule	scheduler	{"scope": "critical_vendors", "review_type": "vendor_risk"}	vendor_assessment	{"assessment_type": "continuous_monitoring", "include_performance": true}	medium	\N	\N	t	\N	\N	0	0	0	0 0 15 * *	Asia/Riyadh	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
4a971ffd-24ff-4039-951a-9977616c088d	High Risk Identified	Triggers immediate risk mitigation workflow for high risks	condition	risk_engine	{"impact": {"value": ["high", "critical"], "operator": "IN"}, "likelihood": {"value": ["high", "very_high"], "operator": "IN"}, "risk_score": {"value": 80, "operator": ">="}}	risk_mitigation	{"priority": "critical", "sla_hours": 24, "escalate_to": "EXEC_STRATEGY", "require_action_plan": true}	critical	\N	\N	t	\N	\N	0	0	0	\N	Asia/Riyadh	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
62c9fc75-dd10-4df2-a150-14dcd576db9f	Critical Control Failure	Triggers remediation workflow when critical control fails	event	control_testing	{"result": "failed", "source": "control_testing", "frameworks": ["NCA-ECC", "SAMA-CSF"], "control_criticality": ["critical", "high"]}	remediation_workflow	{"priority": "critical", "notify_teams": ["ERM", "AUDIT", "EXEC_STRATEGY"], "require_root_cause": true, "require_action_plan": true}	critical	\N	\N	t	\N	\N	0	0	0	\N	Asia/Riyadh	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
d07beb41-1902-4f4b-8978-6a12924beabb	Security Incident Detected	Triggers incident response workflow	event	siem	{"source": "siem", "severity": {"value": ["high", "critical"], "operator": "IN"}, "confirmed": true}	incident_response	{"activate_soc": true, "notify_teams": ["SOC_OPS", "CYBER_GOV", "BCM_DR"], "require_forensics": true}	critical	\N	\N	t	\N	\N	0	0	0	\N	Asia/Riyadh	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
2729dfaf-356d-4b2b-ae77-5b15ad0cf49d	Data Breach Detected	Triggers data breach response per PDPL requirements	event	dlp	{"event_type": "data_breach", "data_classification": ["personal", "sensitive", "confidential"]}	breach_response	{"notify_teams": ["PRIVACY", "CYBER_GOV", "EXEC_STRATEGY"], "regulatory_notification": true, "notification_deadline_hours": 72, "sdaia_notification_required": true}	critical	\N	\N	t	\N	\N	0	0	0	\N	Asia/Riyadh	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
3d1e21fb-582c-49f9-a20e-a2586fce5fd6	Annual Audit Planning	Triggers annual audit planning process	schedule	scheduler	{"scope": "enterprise", "audit_type": "annual_plan"}	audit_planning	{"planning_horizon": "annual", "risk_based_approach": true, "regulatory_requirements": true}	medium	\N	\N	t	\N	\N	0	0	0	0 0 1 11 *	Asia/Riyadh	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
bcb22126-726f-43b1-b392-5d8534eeddd5	Audit Finding Follow-up	Triggers follow-up for overdue audit findings	schedule	scheduler	{"days_overdue": {"value": 30, "operator": ">"}, "finding_status": "open"}	finding_followup	{"escalate_if_critical": true, "require_status_update": true}	high	\N	\N	t	\N	\N	0	0	0	0 9 * * 1	Asia/Riyadh	\N	\N	2026-03-17 08:24:21.657426+08	2026-03-17 08:24:21.657426+08
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_triggers ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_auto_initiation; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_auto_initiation DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_auto_initiation (initiation_id, trigger_id, trigger_name, trigger_type, initiated_workflow_id, initiated_workflow_type, initiated_entity_type, initiated_entity_id, initiation_timestamp, trigger_data, workflow_parameters, success, error_message, error_details, retry_count, retry_after, execution_time_ms, created_tasks, assigned_teams, initiated_by, correlation_id, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_auto_initiation ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_categories; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_categories DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_categories (category_id, tenant_id, name_en, name_ar, parent_category_id, icon, color, sort_order, created_at, updated_at, deleted_at) FROM stdin;
f0b92fe0-8d1d-4021-a509-7391ab5adfd1	\N	Approval	موافقات	\N	pi pi-check-square	#22c55e	1	2026-03-17 08:24:23.985574+08	2026-03-17 08:24:23.985574+08	\N
bd46f042-3315-4075-b214-1486bf7007c7	\N	Review	مراجعات	\N	pi pi-eye	#3b82f6	2	2026-03-17 08:24:23.985574+08	2026-03-17 08:24:23.985574+08	\N
7790c83c-f11c-47cf-99f4-22913deb3b2c	\N	Assessment	تقييمات	\N	pi pi-chart-bar	#f59e0b	3	2026-03-17 08:24:23.985574+08	2026-03-17 08:24:23.985574+08	\N
594974cc-c271-4260-b8e1-e178cbe0d9a1	\N	Compliance	امتثال	\N	pi pi-shield	#8b5cf6	4	2026-03-17 08:24:23.985574+08	2026-03-17 08:24:23.985574+08	\N
72cebcc6-b902-408b-8dab-bc0a8f1fc066	\N	Incident	حوادث	\N	pi pi-exclamation-triangle	#ef4444	5	2026-03-17 08:24:23.985574+08	2026-03-17 08:24:23.985574+08	\N
938e4f99-6a3c-4b2f-acac-74670fc0db92	\N	Evidence	أدلة	\N	pi pi-file	#06b6d4	6	2026-03-17 08:24:23.985574+08	2026-03-17 08:24:23.985574+08	\N
63a40282-1447-424e-8796-5b54a95108c2	\N	Governance	حوكمة	\N	pi pi-building	#6366f1	7	2026-03-17 08:24:23.985574+08	2026-03-17 08:24:23.985574+08	\N
17de81bf-1d2f-4a93-9f4d-c51deee887aa	\N	Custom	مخصص	\N	pi pi-cog	#64748b	99	2026-03-17 08:24:23.985574+08	2026-03-17 08:24:23.985574+08	\N
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_categories ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_chain_definitions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_chain_definitions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_chain_definitions (chain_code, name_en, name_ar, steps, sod_rules, is_active, created_at, updated_at) FROM stdin;
risk_to_compliance_score	Risk to Compliance Score Chain	سلسلة المخاطر إلى درجة الامتثال	[{"stepNo": 1, "roleCode": "risk_owner", "slaHours": 48, "taskType": "risk_assessment", "nextEvent": "control.linked", "moduleCode": "risk", "eventTrigger": "risk.treatment_updated"}, {"stepNo": 2, "roleCode": "control_owner", "slaHours": 72, "taskType": "control_review", "nextEvent": "evidence.requested", "moduleCode": "compliance", "eventTrigger": "control.linked"}, {"stepNo": 3, "roleCode": "evidence_owner", "slaHours": 120, "taskType": "evidence_request", "nextEvent": "evidence.collected", "moduleCode": "evidence", "eventTrigger": "evidence.requested"}, {"stepNo": 4, "roleCode": "compliance_analyst", "slaHours": 48, "taskType": "verification", "nextEvent": "compliance.posture_changed", "moduleCode": "compliance", "eventTrigger": "evidence.collected"}]	[{"level": "warn", "roleA": "risk_owner", "roleB": "evidence_owner", "moduleA": "risk", "moduleB": "evidence"}]	t	2026-03-17 08:24:23.716086+08	2026-03-17 08:24:23.716086+08
incident_to_remediation	Incident to Remediation Chain	سلسلة الحوادث إلى المعالجة	[{"stepNo": 1, "roleCode": "incident_owner", "slaHours": 4, "taskType": "incident_response", "condition": {"op": "gte", "field": "severity", "value": "high"}, "nextEvent": "governance.review_required", "moduleCode": "incident", "eventTrigger": "incident.escalated"}, {"stepNo": 2, "roleCode": "governance_manager", "slaHours": 48, "taskType": "approval", "nextEvent": "approval.completed", "moduleCode": "governance", "eventTrigger": "governance.review_required"}, {"stepNo": 3, "roleCode": "remediation_owner", "slaHours": 120, "taskType": "remediation", "nextEvent": "remediation.completed", "moduleCode": "remediation", "eventTrigger": "approval.completed"}, {"stepNo": 4, "roleCode": "action_owner", "slaHours": 72, "taskType": "verification", "nextEvent": "incident.resolved", "moduleCode": "action", "eventTrigger": "remediation.completed"}]	[]	t	2026-03-17 08:24:23.716086+08	2026-03-17 08:24:23.716086+08
audit_to_control_update	Audit to Control Update Chain	سلسلة التدقيق إلى تحديث الضوابط	[{"stepNo": 1, "roleCode": "auditee_owner", "slaHours": 72, "taskType": "audit_response", "nextEvent": "capa.planned", "moduleCode": "audit", "eventTrigger": "audit.finding.issued"}, {"stepNo": 2, "roleCode": "remediation_owner", "slaHours": 120, "taskType": "remediation", "nextEvent": "evidence.requested", "moduleCode": "remediation", "eventTrigger": "capa.planned"}, {"stepNo": 3, "roleCode": "evidence_owner", "slaHours": 96, "taskType": "evidence_request", "nextEvent": "evidence.collected", "moduleCode": "evidence", "eventTrigger": "evidence.requested"}, {"stepNo": 4, "roleCode": "auditor", "slaHours": 48, "taskType": "verification", "nextEvent": "control.effectiveness_updated", "moduleCode": "audit", "eventTrigger": "evidence.collected"}]	[{"level": "block", "roleA": "auditor", "roleB": "evidence_owner", "moduleA": "audit", "moduleB": "evidence"}]	t	2026-03-17 08:24:23.716086+08	2026-03-17 08:24:23.716086+08
policy_to_compliance_impact	Policy to Compliance Impact Chain	سلسلة السياسات إلى أثر الامتثال	[{"stepNo": 1, "roleCode": "document_controller", "slaHours": 24, "taskType": "verification", "nextEvent": "attestation.required", "moduleCode": "policy", "eventTrigger": "policy.published"}, {"stepNo": 2, "roleCode": "compliance_analyst", "slaHours": 168, "taskType": "verification", "nextEvent": "attestation.completed_or_exception", "moduleCode": "compliance", "eventTrigger": "attestation.required"}, {"stepNo": 3, "roleCode": "exception_approver", "slaHours": 72, "taskType": "approval", "nextEvent": "exception.decided", "moduleCode": "exception", "eventTrigger": "exception.request.created"}, {"stepNo": 4, "roleCode": "compliance_manager", "slaHours": 48, "taskType": "verification", "nextEvent": "compliance.posture_changed", "moduleCode": "compliance", "eventTrigger": "compliance.recalculate"}]	[{"level": "warn", "roleA": "policy_author", "roleB": "exception_approver", "moduleA": "policy", "moduleB": "exception"}]	t	2026-03-17 08:24:23.716086+08	2026-03-17 08:24:23.716086+08
vendor_to_bcp_impact	Vendor to BCP Impact Chain	سلسلة الموردين إلى أثر استمرارية الأعمال	[{"stepNo": 1, "roleCode": "vendor_assessor", "slaHours": 72, "taskType": "risk_assessment", "condition": {"op": "gte", "field": "risk_rating", "value": "high"}, "nextEvent": "vendor.risk_identified", "moduleCode": "vendor", "eventTrigger": "vendor.dd_completed"}, {"stepNo": 2, "roleCode": "risk_owner", "slaHours": 48, "taskType": "risk_assessment", "nextEvent": "risk.created", "moduleCode": "risk", "eventTrigger": "vendor.risk_identified"}, {"stepNo": 3, "roleCode": "bcp_coordinator", "slaHours": 96, "taskType": "verification", "condition": {"op": "eq", "field": "vendor_criticality", "value": "critical"}, "nextEvent": "bcp.impact_assessed", "moduleCode": "bcp", "eventTrigger": "bcp.dependency_critical"}]	[{"level": "warn", "roleA": "vendor_assessor", "roleB": "risk_approver", "moduleA": "vendor", "moduleB": "risk"}]	t	2026-03-17 08:24:23.716086+08	2026-03-17 08:24:23.716086+08
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_chain_definitions ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_chain_instances; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_chain_instances DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_chain_instances (instance_id, chain_code, tenant_id, current_step, status, context, trigger_entity_type, trigger_entity_id, started_at, completed_at, created_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_chain_instances ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_chain_step_log; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_chain_step_log DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_chain_step_log (log_id, instance_id, step_no, module_code, task_type, task_id, status, actor_user_id, started_at, completed_at, notes) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_chain_step_log ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_comments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_comments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_comments (comment_id, instance_id, step_id, commenter_id, comment_text, visibility, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_comments ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_transitions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_transitions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_transitions (transition_id, definition_id, from_step_id, to_step_id, transition_type, label_en, label_ar, priority, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_transitions ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_conditions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_conditions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_conditions (condition_id, transition_id, condition_type, expression, evaluation_order, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_conditions ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_definitions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_definitions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_definitions (workflow_id, name, definition, version, status, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_definitions ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_sla_policies; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_sla_policies DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_sla_policies (policy_id, definition_id, step_id, policy_name, warning_hours, breach_hours, escalation_action, notification_config, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_sla_policies ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_escalation_policies; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_escalation_policies DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_escalation_policies (escalation_id, policy_id, escalation_level, delay_hours, escalation_to_role_id, escalation_to_user_id, notification_template, action_type, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_escalation_policies ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_events; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_events DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_events (event_id, instance_id, event_type, step_id, payload, triggered_by, occurred_at, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_events ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_executions_archive; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_executions_archive DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_executions_archive (execution_id, workflow_id, trigger_type, status, started_at, completed_at, step_log, is_simulation, sla_deadline, deadline, due_at, parent_execution_id, depth, archived_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_executions_archive ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_graph_versions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_graph_versions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_graph_versions (version_id, tenant_id, run_id, version_number, graph_snapshot, change_summary, changed_by, change_type, created_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_graph_versions ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_instance_steps; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_instance_steps DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_instance_steps (instance_step_id, instance_id, step_id, status, started_at, completed_at, outcome, outcome_data, actor_user_id, duration_seconds, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_instance_steps ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_instances; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_instances DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_instances (execution_id, workflow_id, trigger_type, status, started_at, completed_at, step_log, is_simulation) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_instances ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_retention_policies; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_retention_policies DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_retention_policies (policy_id, workflow_id, retention_days, archive_after_days, auto_delete, applies_to, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_retention_policies ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_rules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_rules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_rules (rule_id, definition_id, rule_type, rule_name, trigger_event, condition_expr, action_expr, priority, enabled, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_rules ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_schedules; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_schedules DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_schedules (schedule_id, workflow_id, cron_expr, label, enabled, next_run_at, last_run_at, run_count, context_data, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_schedules ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_state_history; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_state_history DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_state_history (history_id, instance_id, step_id, previous_state, new_state, changed_by, reason, metadata, created_at, updated_at, deleted_at, created_by, updated_by, execution_id, process_task_id) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_state_history ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_step_roles; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_step_roles DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_step_roles (step_role_id, step_id, role_id, assignment_type, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_step_roles ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_subscribers; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_subscribers DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_subscribers (subscriber_id, workflow_id, user_id, events, channel, created_at, updated_at, deleted_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_subscribers ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_tasks; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_tasks DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_tasks (task_id, instance_step_id, task_type, title, description, assigned_to, due_date, priority, status, form_data, completion_data, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_tasks ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_task_assignments; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_task_assignments DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_task_assignments (task_assignment_id, task_id, user_id, role, assigned_at, responded_at, status, response_data, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_task_assignments ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_templates; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_templates DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_templates (template_id, name, description, definition, parameters_schema, created_by, created_at, category_id) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_templates ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_timeline_entries; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_timeline_entries DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_timeline_entries (entry_id, workflow_type, workflow_step_id, assigned_participant_id, participant_name, participant_role, is_agent, status, due_date, assigned_at, completed_at, context, parent_workflow_id, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_timeline_entries ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_versions; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_versions DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_versions (version_id, definition_id, version_number, status, definition_snapshot, published_at, published_by, change_notes, is_current, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_versions ENABLE TRIGGER ALL;

--
-- Data for Name: workflow_webhooks; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workflow_webhooks DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workflow_webhooks (webhook_id, definition_id, event_type, target_url, method, headers, enabled, secret_hash, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workflow_webhooks ENABLE TRIGGER ALL;

--
-- Data for Name: workspace_profile; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workspace_profile DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workspace_profile (tenant_id, industry, org_size, sectors, default_dashboard, risk_appetite, escalation_level, orchestrator_enabled, reporting_cadence, enforcement_mode, evidence_freshness_days, created_at, updated_at) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workspace_profile ENABLE TRIGGER ALL;

--
-- Data for Name: workspace_seeds; Type: TABLE DATA; Schema: __TENANT_SCHEMA__; Owner: -
--

ALTER TABLE __TENANT_SCHEMA__.workspace_seeds DISABLE TRIGGER ALL;

COPY __TENANT_SCHEMA__.workspace_seeds (seed_id, tenant_id, schema_version, seed_payload, answers_hash, provisioning_job_id, created_at, created_by) FROM stdin;
\.


ALTER TABLE __TENANT_SCHEMA__.workspace_seeds ENABLE TRIGGER ALL;

--
-- Name: access_profiles_id_seq; Type: SEQUENCE SET; Schema: __TENANT_SCHEMA__; Owner: -
--

SELECT pg_catalog.setval('__TENANT_SCHEMA__.access_profiles_id_seq', 7, true);


--
-- Name: agent_trigger_chains_id_seq; Type: SEQUENCE SET; Schema: __TENANT_SCHEMA__; Owner: -
--

SELECT pg_catalog.setval('__TENANT_SCHEMA__.agent_trigger_chains_id_seq', 10, true);


--
-- Name: authz_decision_log_id_seq; Type: SEQUENCE SET; Schema: __TENANT_SCHEMA__; Owner: -
--

SELECT pg_catalog.setval('__TENANT_SCHEMA__.authz_decision_log_id_seq', 1, false);


--
-- Name: auto_approval_config_id_seq; Type: SEQUENCE SET; Schema: __TENANT_SCHEMA__; Owner: -
--

SELECT pg_catalog.setval('__TENANT_SCHEMA__.auto_approval_config_id_seq', 8, true);


--
-- Name: delegations_id_seq; Type: SEQUENCE SET; Schema: __TENANT_SCHEMA__; Owner: -
--

SELECT pg_catalog.setval('__TENANT_SCHEMA__.delegations_id_seq', 1, false);


--
-- Name: enterprise_user_role_assignments_id_seq; Type: SEQUENCE SET; Schema: __TENANT_SCHEMA__; Owner: -
--

SELECT pg_catalog.setval('__TENANT_SCHEMA__.enterprise_user_role_assignments_id_seq', 109, true);


--
-- Name: entity_type_routing_config_id_seq; Type: SEQUENCE SET; Schema: __TENANT_SCHEMA__; Owner: -
--

SELECT pg_catalog.setval('__TENANT_SCHEMA__.entity_type_routing_config_id_seq', 29, true);


--
-- Name: functional_roles_id_seq; Type: SEQUENCE SET; Schema: __TENANT_SCHEMA__; Owner: -
--

SELECT pg_catalog.setval('__TENANT_SCHEMA__.functional_roles_id_seq', 70, true);


--
-- Name: module_automation_config_id_seq; Type: SEQUENCE SET; Schema: __TENANT_SCHEMA__; Owner: -
--

SELECT pg_catalog.setval('__TENANT_SCHEMA__.module_automation_config_id_seq', 8, true);


--
-- Name: module_dependency_graph_id_seq; Type: SEQUENCE SET; Schema: __TENANT_SCHEMA__; Owner: -
--

SELECT pg_catalog.setval('__TENANT_SCHEMA__.module_dependency_graph_id_seq', 22, true);


--
-- Name: module_lifecycle_definitions_id_seq; Type: SEQUENCE SET; Schema: __TENANT_SCHEMA__; Owner: -
--

SELECT pg_catalog.setval('__TENANT_SCHEMA__.module_lifecycle_definitions_id_seq', 14, true);


--
-- Name: module_lifecycle_transitions_id_seq; Type: SEQUENCE SET; Schema: __TENANT_SCHEMA__; Owner: -
--

SELECT pg_catalog.setval('__TENANT_SCHEMA__.module_lifecycle_transitions_id_seq', 135, true);


--
-- Name: modules_id_seq; Type: SEQUENCE SET; Schema: __TENANT_SCHEMA__; Owner: -
--

SELECT pg_catalog.setval('__TENANT_SCHEMA__.modules_id_seq', 26, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: __TENANT_SCHEMA__; Owner: -
--

SELECT pg_catalog.setval('__TENANT_SCHEMA__.permissions_id_seq', 224, true);


--
-- Name: sod_rules_id_seq; Type: SEQUENCE SET; Schema: __TENANT_SCHEMA__; Owner: -
--

SELECT pg_catalog.setval('__TENANT_SCHEMA__.sod_rules_id_seq', 17, true);


--
-- Name: task_auto_resolution_rules_id_seq; Type: SEQUENCE SET; Schema: __TENANT_SCHEMA__; Owner: -
--

SELECT pg_catalog.setval('__TENANT_SCHEMA__.task_auto_resolution_rules_id_seq', 16, true);


--
-- Name: user_access_profiles_id_seq; Type: SEQUENCE SET; Schema: __TENANT_SCHEMA__; Owner: -
--

SELECT pg_catalog.setval('__TENANT_SCHEMA__.user_access_profiles_id_seq', 109, true);


--

--

\unrestrict SdDAtdhTSob727cUAbNtBkGAeSfd6ag9gP3Gl0Hz3eoelEg46g4N5UsydTOGZz9
