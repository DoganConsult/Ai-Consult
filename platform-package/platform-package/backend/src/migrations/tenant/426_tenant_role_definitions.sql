-- ============================================
-- AGRC-OS Tenant Migration 426
-- Tenant Role Definitions: DB-driven GRC role experience configuration
-- Replaces hardcoded GRC_ROLES dict in role-experience.service.ts
-- (Law 4: Configuration Over Hardcoding)
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_role_definitions (
  role_code        VARCHAR(50) PRIMARY KEY,
  archetype        VARCHAR(50) NOT NULL,
  display_name_en  VARCHAR(200) NOT NULL,
  display_name_ar  VARCHAR(200),
  screens          JSONB NOT NULL DEFAULT '[]',
  checklists       JSONB NOT NULL DEFAULT '[]',
  deliverables     JSONB NOT NULL DEFAULT '[]',
  lifecycle_participation JSONB NOT NULL DEFAULT '[]',
  description_en   TEXT,
  description_ar   TEXT,
  icon             VARCHAR(50),
  color            VARCHAR(20),
  sort_order       INT NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed all 7 GRC functional roles from GRC_ROLES in role-experience.service.ts

INSERT INTO tenant_role_definitions (role_code, archetype, display_name_en, display_name_ar, screens, checklists, deliverables, lifecycle_participation, description_en, description_ar, icon, sort_order) VALUES
(
  'executive_owner',
  'executive',
  'Executive Owner',
  'المالك التنفيذي',
  '[
    {"id":"exec-dashboard","label":"Executive Dashboard","labelAr":"لوحة المعلومات التنفيذية","route":"/workspace-home","icon":"dashboard","description":"Overall compliance index, top risks, overdue items, audit readiness"},
    {"id":"risk-hub","label":"Risk Hub","labelAr":"مركز المخاطر","route":"/risk-hub","icon":"exclamation-triangle","description":"Risk heatmap, appetite thresholds, treatment plans"},
    {"id":"analytics-hub","label":"Analytics Hub","labelAr":"مركز التحليلات","route":"/analytics-hub","icon":"chart-line","description":"Executive analytics dashboards and data explorer"},
    {"id":"reports-hub","label":"Reports Hub","labelAr":"مركز التقارير","route":"/reports-hub","icon":"file-pdf","description":"Executive summary reports (PDF/Excel, bilingual)"},
    {"id":"agrc-os","label":"AGRC-OS","labelAr":"نظام الحوكمة الذاتي","route":"/agrc-os","icon":"agrc-os","description":"Autonomous GRC Operating System status and health"}
  ]'::jsonb,
  '[
    {"id":"exec-1","label":"Review Executive Dashboard","labelAr":"مراجعة لوحة المعلومات التنفيذية","route":"/workspace-home","description":"Check overall compliance score, top risks, overdue items","order":1},
    {"id":"exec-2","label":"Review Risk Heatmap","labelAr":"مراجعة خريطة المخاطر","route":"/risk-hub","description":"Any risks exceeding appetite? New critical risks?","order":2},
    {"id":"exec-3","label":"Check Pending Approvals","labelAr":"مراجعة الاعتمادات المعلقة","route":"/operations-hub","description":"Exception requests, policy approvals, risk acceptances waiting","order":3},
    {"id":"exec-4","label":"View Analytics","labelAr":"عرض التحليلات","route":"/analytics-hub","description":"Trend analysis and KPI tracking","order":4}
  ]'::jsonb,
  '[
    {"id":"risk-appetite","label":"Approved Risk Appetite Statement","labelAr":"بيان تقبل المخاطر المعتمد","description":"Define and approve acceptable risk levels per category","frequency":"annual"},
    {"id":"compliance-plan","label":"Approved Compliance Plan","labelAr":"خطة الامتثال المعتمدة","description":"Annual GRC calendar and compliance roadmap","frequency":"annual"},
    {"id":"exception-approvals","label":"Exception Approvals","labelAr":"اعتمادات الاستثناءات","description":"Signed approvals when accepting a gap temporarily","frequency":"continuous"}
  ]'::jsonb,
  '[1,5,7]'::jsonb,
  'Own risk appetite, accept residual risk, and approve the compliance plan.',
  'تحديد مستوى تقبل المخاطر، قبول المخاطر المتبقية، واعتماد خطة الامتثال.',
  'crown',
  1
),
(
  'grc_owner',
  'manager',
  'GRC Owner / Compliance Manager',
  'مدير الحوكمة والمخاطر والامتثال',
  '[
    {"id":"dashboard","label":"Program Dashboard","labelAr":"لوحة البرنامج","route":"/workspace-home","icon":"dashboard","description":"Overall compliance index, top risks, overdue items, audit readiness"},
    {"id":"governance-hub","label":"Governance Hub","labelAr":"مركز الحوكمة","route":"/governance-hub","icon":"building","description":"Policies, controls, policy-code, governance structure"},
    {"id":"knowledge-hub","label":"Knowledge Hub","labelAr":"مركز المعرفة","route":"/knowledge-hub","icon":"sitemap","description":"Ontology, taxonomy, entity-links, knowledge base"},
    {"id":"ninety-day-plan","label":"90-Day Plan","labelAr":"خطة 90 يوم","route":"/ninety-day-plan","icon":"calendar","description":"Onboarding milestones and implementation roadmap"},
    {"id":"risk-hub","label":"Risk Hub","labelAr":"مركز المخاطر","route":"/risk-hub","icon":"exclamation-triangle","description":"Risk register, scoring, model-risk, vulnerabilities"},
    {"id":"vendor-hub","label":"Vendor Hub","labelAr":"مركز الموردين","route":"/vendor-hub","icon":"truck","description":"Vendor questionnaires, risk scoring, due diligence"},
    {"id":"compliance-hub","label":"Compliance Hub","labelAr":"مركز الامتثال","route":"/compliance-hub","icon":"shield","description":"Compliance assessments, templates, findings"},
    {"id":"evidence-hub","label":"Evidence Hub","labelAr":"مركز الأدلة","route":"/evidence-hub","icon":"folder-open","description":"Evidence plan, catalog, tasks, upload"},
    {"id":"framework-hub","label":"Framework Hub","labelAr":"مركز الأطر","route":"/framework-hub","icon":"book","description":"UCF, control-lifecycle, regulation mappings, content packs"},
    {"id":"operations-hub","label":"Operations Hub","labelAr":"مركز العمليات","route":"/operations-hub","icon":"calendar","description":"Timeline, task-board, action-items, messaging"},
    {"id":"incident-hub","label":"Incident Hub","labelAr":"مركز الحوادث","route":"/incident-hub","icon":"bolt","description":"Incident tracking, exceptions, remediation, BCP"},
    {"id":"audit-hub","label":"Audit Hub","labelAr":"مركز التدقيق","route":"/audit-hub","icon":"verified","description":"Audit trail, package, workpapers"},
    {"id":"intelligence-hub","label":"Intelligence Hub","labelAr":"مركز الاستخبارات","route":"/intelligence-hub","icon":"globe","description":"Registry, regulator heatmap, framework mapping, KSA explorer"},
    {"id":"reports-hub","label":"Reports Hub","labelAr":"مركز التقارير","route":"/reports-hub","icon":"file-pdf","description":"Report center, builder, board reports"}
  ]'::jsonb,
  '[
    {"id":"grc-1","label":"Open Program Dashboard","labelAr":"فتح لوحة البرنامج","route":"/workspace-home","description":"What is red (non-compliant), overdue, expiring soon?","order":1},
    {"id":"grc-2","label":"Check Evidence Due","labelAr":"مراجعة الأدلة المستحقة","route":"/evidence-hub","description":"Send requests to control owners and vendors","order":2},
    {"id":"grc-3","label":"Review Findings & Actions","labelAr":"مراجعة النتائج والإجراءات","route":"/operations-hub","description":"Push remediation tasks and escalate overdue items","order":3},
    {"id":"grc-4","label":"Generate Weekly Report","labelAr":"إنشاء التقرير الأسبوعي","route":"/reports-hub","description":"Audit readiness or Top 10 gaps for executives","order":4},
    {"id":"grc-5","label":"Check Vendor Risk","labelAr":"مراجعة مخاطر الموردين","route":"/vendor-hub","description":"Pending questionnaires, expiring contracts, risk changes","order":5},
    {"id":"grc-6","label":"Review Compliance Status","labelAr":"مراجعة حالة الامتثال","route":"/compliance-hub","description":"Control implementation status across frameworks","order":6}
  ]'::jsonb,
  '[
    {"id":"scope","label":"Scope Definition","labelAr":"تعريف النطاق","description":"Org units, systems, vendors, data types in scope","frequency":"once"},
    {"id":"fw-selection","label":"Framework Selection","labelAr":"اختيار الأطر التنظيمية","description":"Applicable frameworks (NCA ECC, SAMA CSF, PDPL, ISO, etc.)","frequency":"annual"},
    {"id":"control-assignments","label":"Control Ownership Assignments","labelAr":"تعيين ملكية الضوابط","description":"Who owns which control families","frequency":"annual"},
    {"id":"evidence-plan","label":"Evidence Plan","labelAr":"خطة الأدلة","description":"What evidence, who provides, frequency","frequency":"annual"},
    {"id":"audit-package","label":"Audit Package","labelAr":"حزمة التدقيق","description":"Complete evidence + status package for auditors/regulators","frequency":"quarterly"},
    {"id":"gap-report","label":"Gap Analysis Report","labelAr":"تقرير تحليل الفجوات","description":"Current compliance gaps with remediation priorities","frequency":"monthly"}
  ]'::jsonb,
  '[1,2,3,4,5,6,7]'::jsonb,
  'Run the GRC program end-to-end and keep the organization audit-ready 24/7.',
  'إدارة برنامج الحوكمة والمخاطر والامتثال من البداية إلى النهاية وإبقاء المنظمة جاهزة للتدقيق.',
  'shield',
  2
),
(
  'control_owner',
  'operator',
  'Control Owner',
  'مالك الضابط',
  '[
    {"id":"dashboard","label":"Dashboard","labelAr":"لوحة المعلومات","route":"/workspace-home","icon":"dashboard","description":"Your personalized dashboard with assigned items"},
    {"id":"compliance-hub","label":"Compliance Hub (My Controls)","labelAr":"مركز الامتثال (ضوابطي)","route":"/compliance-hub","icon":"shield","description":"Controls assigned to you with implementation status"},
    {"id":"evidence-hub","label":"Evidence Hub","labelAr":"مركز الأدلة","route":"/evidence-hub","icon":"folder-open","description":"Upload or link evidence for your controls"},
    {"id":"operations-hub","label":"Operations Hub (Tasks)","labelAr":"مركز العمليات (المهام)","route":"/operations-hub","icon":"calendar","description":"Remediation tasks assigned to fix compliance gaps"},
    {"id":"incident-hub","label":"Incident Hub","labelAr":"مركز الحوادث","route":"/incident-hub","icon":"bolt","description":"Report and track incidents in your domain"}
  ]'::jsonb,
  '[
    {"id":"co-1","label":"Check My Controls Queue","labelAr":"مراجعة قائمة ضوابطي","route":"/compliance-hub","description":"Any controls needing attention or past due?","order":1},
    {"id":"co-2","label":"Upload Pending Evidence","labelAr":"رفع الأدلة المعلقة","route":"/evidence-hub","description":"Evidence requests waiting for you","order":2},
    {"id":"co-3","label":"Update Remediation Tasks","labelAr":"تحديث مهام المعالجة","route":"/operations-hub","description":"Progress on assigned remediation tasks","order":3}
  ]'::jsonb,
  '[
    {"id":"impl-procedure","label":"Implemented Procedure","labelAr":"الإجراء المنفذ","description":"Procedure or configuration implementing the control","frequency":"once"},
    {"id":"evidence-artifacts","label":"Evidence Artifacts","labelAr":"مخرجات الأدلة","description":"Policy docs, logs, screenshots, tickets, training records","frequency":"continuous"},
    {"id":"remediation-plan","label":"Remediation Plan","labelAr":"خطة المعالجة","description":"Plan to fix non-compliant controls with target dates","frequency":"continuous"}
  ]'::jsonb,
  '[2,3,5]'::jsonb,
  'Implement and maintain controls in your domain. Provide evidence and remediate gaps.',
  'تنفيذ وصيانة الضوابط في مجالك. تقديم الأدلة ومعالجة الفجوات.',
  'wrench',
  3
),
(
  'evidence_owner',
  'operator',
  'Evidence Owner',
  'مالك الأدلة',
  '[
    {"id":"dashboard","label":"Dashboard","labelAr":"لوحة المعلومات","route":"/workspace-home","icon":"dashboard","description":"Your personalized dashboard with evidence alerts"},
    {"id":"evidence-hub","label":"Evidence Hub","labelAr":"مركز الأدلة","route":"/evidence-hub","icon":"folder-open","description":"Evidence inbox, vault, catalog, upload, versions, approvals"},
    {"id":"operations-hub","label":"Operations Hub (Tasks)","labelAr":"مركز العمليات (المهام)","route":"/operations-hub","icon":"calendar","description":"Evidence-related tasks and deadlines"}
  ]'::jsonb,
  '[
    {"id":"eo-1","label":"Check Evidence Inbox","labelAr":"مراجعة صندوق الأدلة","route":"/evidence-hub","description":"What evidence is due this week?","order":1},
    {"id":"eo-2","label":"Upload/Renew Evidence","labelAr":"رفع/تجديد الأدلة","route":"/evidence-hub","description":"Upload new or renew expiring evidence","order":2},
    {"id":"eo-3","label":"Check Rejected Evidence","labelAr":"مراجعة الأدلة المرفوضة","route":"/evidence-hub","description":"Re-submit evidence that was rejected by reviewer","order":3}
  ]'::jsonb,
  '[
    {"id":"evidence-items","label":"Evidence Items","labelAr":"عناصر الأدلة","description":"Evidence with correct metadata: control, period, owner, expiry","frequency":"continuous"},
    {"id":"evidence-renewals","label":"Evidence Renewals","labelAr":"تجديدات الأدلة","description":"Monthly/quarterly/annual evidence refreshes","frequency":"continuous"}
  ]'::jsonb,
  '[3]'::jsonb,
  'Provide clean evidence on time, in the required format. Manage renewals.',
  'تقديم أدلة نظيفة في الوقت المحدد وبالتنسيق المطلوب. إدارة التجديدات.',
  'folder-open',
  4
),
(
  'internal_auditor',
  'assurance',
  'Internal Auditor / Assurance',
  'المدقق الداخلي / الضمان',
  '[
    {"id":"dashboard","label":"Dashboard","labelAr":"لوحة المعلومات","route":"/workspace-home","icon":"dashboard","description":"Audit-focused dashboard with findings and evidence status"},
    {"id":"audit-hub","label":"Audit Hub","labelAr":"مركز التدقيق","route":"/audit-hub","icon":"verified","description":"Audit trail, test plans, workpapers, packages"},
    {"id":"evidence-hub","label":"Evidence Hub (Review)","labelAr":"مركز الأدلة (مراجعة)","route":"/evidence-hub","icon":"folder-open","description":"Review and approve/reject evidence quality"},
    {"id":"compliance-hub","label":"Compliance Hub","labelAr":"مركز الامتثال","route":"/compliance-hub","icon":"shield","description":"Assessment results and compliance status"},
    {"id":"nca-assessment","label":"NCA Assessment","labelAr":"تقييم الهيئة الوطنية","route":"/nca-assessment","icon":"nca-assessment","description":"NCA-specific assessment tools"},
    {"id":"intelligence-hub","label":"Intelligence Hub","labelAr":"مركز الاستخبارات","route":"/intelligence-hub","icon":"globe","description":"Registry and regulatory intelligence"},
    {"id":"reports-hub","label":"Reports Hub","labelAr":"مركز التقارير","route":"/reports-hub","icon":"file-pdf","description":"Audit reports and compliance packages"}
  ]'::jsonb,
  '[
    {"id":"ia-1","label":"Review Pending Tests","labelAr":"مراجعة الاختبارات المعلقة","route":"/audit-hub","description":"Assessments scheduled or in progress","order":1},
    {"id":"ia-2","label":"Review Evidence Quality","labelAr":"مراجعة جودة الأدلة","route":"/evidence-hub","description":"Evidence submitted for review - approve or reject","order":2},
    {"id":"ia-3","label":"Track Open Findings","labelAr":"متابعة النتائج المفتوحة","route":"/compliance-hub","description":"Findings pending remediation - escalate overdue","order":3},
    {"id":"ia-4","label":"Generate Audit Reports","labelAr":"إنشاء تقارير التدقيق","route":"/reports-hub","description":"Generate and export audit reports","order":4}
  ]'::jsonb,
  '[
    {"id":"test-plans","label":"Test Plans & Results","labelAr":"خطط ونتائج الاختبارات","description":"Test plans with methodology, scope, and results","frequency":"quarterly"},
    {"id":"findings","label":"Findings & Issues","labelAr":"النتائج والملاحظات","description":"Non-conformities and observations with severity","frequency":"quarterly"},
    {"id":"audit-report","label":"Audit Report","labelAr":"تقرير التدقيق","description":"Final audit report with conclusions and recommendations","frequency":"quarterly"},
    {"id":"closure-confirm","label":"Closure Confirmation","labelAr":"تأكيد الإغلاق","description":"Verify remediation was completed and effective","frequency":"continuous"}
  ]'::jsonb,
  '[3,4]'::jsonb,
  'Test controls, validate evidence quality, issue findings, and confirm closure.',
  'اختبار الضوابط، التحقق من جودة الأدلة، إصدار النتائج، وتأكيد الإغلاق.',
  'verified',
  5
),
(
  'external_party',
  'external',
  'External Party (Vendor / Consultant)',
  'طرف خارجي (مورد / مستشار)',
  '[
    {"id":"vendor-hub","label":"Vendor Hub (Portal)","labelAr":"مركز الموردين (البوابة)","route":"/vendor-hub","icon":"truck","description":"Vendor questionnaire + evidence upload + decision status"},
    {"id":"evidence-hub","label":"Evidence Hub","labelAr":"مركز الأدلة","route":"/evidence-hub","icon":"folder-open","description":"Upload vendor certificates, SOC reports, pentest summaries"}
  ]'::jsonb,
  '[
    {"id":"ep-1","label":"Check Pending Questionnaires","labelAr":"مراجعة الاستبيانات المعلقة","route":"/vendor-hub","description":"Questionnaires waiting for your response","order":1},
    {"id":"ep-2","label":"Upload Requested Evidence","labelAr":"رفع الأدلة المطلوبة","route":"/evidence-hub","description":"Evidence items requested by the GRC team","order":2}
  ]'::jsonb,
  '[
    {"id":"questionnaire","label":"Completed Questionnaires","labelAr":"الاستبيانات المكتملة","description":"Vendor due diligence questionnaire responses","frequency":"annual"},
    {"id":"vendor-evidence","label":"Vendor Evidence","labelAr":"أدلة المورد","description":"Certificates, policies, pentest summaries, SOC reports","frequency":"annual"},
    {"id":"consultant-drafts","label":"Policy/Procedure Drafts","labelAr":"مسودات السياسات/الإجراءات","description":"Consultant: policy drafts, implementation guidance","frequency":"continuous"}
  ]'::jsonb,
  '[6]'::jsonb,
  'Vendor: answer due diligence and provide evidence. Consultant: accelerate implementation and close gaps.',
  'المورد: الإجابة على العناية الواجبة وتقديم الأدلة. المستشار: تسريع التنفيذ وإغلاق الفجوات.',
  'truck',
  6
),
(
  'regulator',
  'external',
  'Regulator / External Auditor',
  'الجهة التنظيمية / المدقق الخارجي',
  '[
    {"id":"dashboard","label":"Dashboard","labelAr":"لوحة المعلومات","route":"/workspace-home","icon":"dashboard","description":"Read-only overview of compliance posture"},
    {"id":"audit-hub","label":"Audit Hub (Read-Only)","labelAr":"مركز التدقيق (للقراءة فقط)","route":"/audit-hub","icon":"verified","description":"RFI list + evidence viewer + export (no edit)"},
    {"id":"evidence-hub","label":"Evidence Hub (Viewer)","labelAr":"مركز الأدلة (عرض)","route":"/evidence-hub","icon":"folder-open","description":"Browse and download evidence packages"},
    {"id":"reports-hub","label":"Reports Hub","labelAr":"مركز التقارير","route":"/reports-hub","icon":"file-pdf","description":"Download compliance reports (Arabic/English PDF)"},
    {"id":"intelligence-hub","label":"Intelligence Hub","labelAr":"مركز الاستخبارات","route":"/intelligence-hub","icon":"globe","description":"Regulatory intelligence and framework mapping"}
  ]'::jsonb,
  '[
    {"id":"reg-1","label":"Review Submitted Evidence","labelAr":"مراجعة الأدلة المقدمة","route":"/evidence-hub","description":"Evidence packages submitted for your review","order":1},
    {"id":"reg-2","label":"Submit RFIs","labelAr":"تقديم طلبات المعلومات","route":"/audit-hub","description":"Request additional information or evidence","order":2},
    {"id":"reg-3","label":"Download Reports","labelAr":"تحميل التقارير","route":"/reports-hub","description":"Download audit-ready compliance reports","order":3}
  ]'::jsonb,
  '[
    {"id":"audit-observations","label":"Audit Observations","labelAr":"ملاحظات التدقيق","description":"Formal observations and regulatory requirements","frequency":"annual"},
    {"id":"audit-outcome","label":"Audit Outcome","labelAr":"نتيجة التدقيق","description":"Final audit statement: pass/fail/conditions","frequency":"annual"}
  ]'::jsonb,
  '[4,7]'::jsonb,
  'Verify compliance and evidence. Request information. Issue audit observations.',
  'التحقق من الامتثال والأدلة. طلب المعلومات. إصدار ملاحظات التدقيق.',
  'globe',
  7
)
ON CONFLICT DO NOTHING;
