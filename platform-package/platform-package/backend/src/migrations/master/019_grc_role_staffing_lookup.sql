-- Migration 019: GRC Role Staffing Lookup
-- Maps (employee_range + sector) → recommended GRC roles with headcount
-- Used by provisioning seed builder to propose role configurations

CREATE TABLE IF NOT EXISTS lookup_grc_role_staffing (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  range_code       VARCHAR(20)  NOT NULL,
  sector_code      VARCHAR(50)  DEFAULT '*',
  role_code        VARCHAR(100) NOT NULL,
  role_name_en     TEXT         NOT NULL,
  role_name_ar     TEXT,
  role_category    VARCHAR(50)  DEFAULT 'core',
  recommended_fte  NUMERIC(4,1) NOT NULL DEFAULT 1.0,
  is_mandatory     BOOLEAN      NOT NULL DEFAULT false,
  priority         INTEGER      NOT NULL DEFAULT 50,
  shahin_title_en  TEXT,
  shahin_title_ar  TEXT,
  description_en   TEXT,
  description_ar   TEXT,
  is_active        BOOLEAN      NOT NULL DEFAULT true,
  sort_order       INTEGER      NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grc_role_staffing_range ON lookup_grc_role_staffing(range_code);
CREATE INDEX IF NOT EXISTS idx_grc_role_staffing_sector ON lookup_grc_role_staffing(sector_code);
CREATE UNIQUE INDEX IF NOT EXISTS uk_grc_role_staffing ON lookup_grc_role_staffing(range_code, sector_code, role_code);

-- ═══ Seed: universal roles (sector='*') per org size ═══

-- 1-10 (micro)
INSERT INTO lookup_grc_role_staffing (range_code, sector_code, role_code, role_name_en, role_name_ar, role_category, recommended_fte, is_mandatory, priority, shahin_title_en, shahin_title_ar, sort_order)
VALUES
  ('1_10','*','grc_officer','GRC Officer','مسؤول الحوكمة والمخاطر والامتثال','core',0.5,true,10,'GRC Officer','مسؤول الحوكمة',1),
  ('1_10','*','it_security_lead','IT Security Lead','قائد أمن تقنية المعلومات','technical',0.5,false,20,'IT Security Lead','قائد أمن تقنية المعلومات',2)
ON CONFLICT (range_code,sector_code,role_code) DO NOTHING;

-- 11-50 (small)
INSERT INTO lookup_grc_role_staffing (range_code, sector_code, role_code, role_name_en, role_name_ar, role_category, recommended_fte, is_mandatory, priority, shahin_title_en, shahin_title_ar, sort_order)
VALUES
  ('11_50','*','grc_manager','GRC Manager','مدير الحوكمة والمخاطر والامتثال','core',1,true,10,'GRC Manager','مدير الحوكمة',1),
  ('11_50','*','risk_analyst','Risk Analyst','محلل المخاطر','core',0.5,false,20,'Risk Analyst','محلل المخاطر',2),
  ('11_50','*','it_security_lead','IT Security Lead','قائد أمن تقنية المعلومات','technical',1,true,15,'IT Security Lead','قائد أمن تقنية المعلومات',3)
ON CONFLICT (range_code,sector_code,role_code) DO NOTHING;

-- 51-200 (small-medium)
INSERT INTO lookup_grc_role_staffing (range_code, sector_code, role_code, role_name_en, role_name_ar, role_category, recommended_fte, is_mandatory, priority, shahin_title_en, shahin_title_ar, sort_order)
VALUES
  ('51_200','*','ciso','Chief Information Security Officer','رئيس أمن المعلومات','executive',1,true,5,'CISO','رئيس أمن المعلومات',1),
  ('51_200','*','grc_manager','GRC Manager','مدير الحوكمة والمخاطر والامتثال','core',1,true,10,'GRC Manager','مدير الحوكمة',2),
  ('51_200','*','risk_manager','Risk Manager','مدير المخاطر','core',1,true,12,'Risk Manager','مدير المخاطر',3),
  ('51_200','*','compliance_officer','Compliance Officer','مسؤول الامتثال','core',1,true,15,'Compliance Officer','مسؤول الامتثال',4),
  ('51_200','*','internal_auditor','Internal Auditor','المدقق الداخلي','audit',1,false,20,'Internal Auditor','المدقق الداخلي',5),
  ('51_200','*','it_security_analyst','IT Security Analyst','محلل أمن تقنية المعلومات','technical',1,false,25,'Security Analyst','محلل أمني',6)
ON CONFLICT (range_code,sector_code,role_code) DO NOTHING;

-- 201-500 (medium)
INSERT INTO lookup_grc_role_staffing (range_code, sector_code, role_code, role_name_en, role_name_ar, role_category, recommended_fte, is_mandatory, priority, shahin_title_en, shahin_title_ar, sort_order)
VALUES
  ('201_500','*','ciso','Chief Information Security Officer','رئيس أمن المعلومات','executive',1,true,5,'CISO','رئيس أمن المعلومات',1),
  ('201_500','*','grc_director','GRC Director','مدير إدارة الحوكمة والمخاطر','executive',1,true,8,'GRC Director','مدير إدارة الحوكمة',2),
  ('201_500','*','risk_manager','Risk Manager','مدير المخاطر','core',1,true,10,'Risk Manager','مدير المخاطر',3),
  ('201_500','*','compliance_manager','Compliance Manager','مدير الامتثال','core',1,true,12,'Compliance Manager','مدير الامتثال',4),
  ('201_500','*','control_owner','Control Owner','مالك الضبط','core',2,true,15,'Control Owner','مالك الضبط',5),
  ('201_500','*','internal_auditor','Internal Auditor','المدقق الداخلي','audit',1,true,18,'Internal Auditor','المدقق الداخلي',6),
  ('201_500','*','privacy_officer','Data Protection Officer','مسؤول حماية البيانات','privacy',1,false,20,'DPO','مسؤول حماية البيانات',7),
  ('201_500','*','soc_analyst','SOC Analyst','محلل مركز العمليات الأمنية','operations',2,false,25,'SOC Analyst','محلل العمليات الأمنية',8),
  ('201_500','*','incident_responder','Incident Responder','مستجيب للحوادث','operations',1,false,28,'Incident Responder','مستجيب للحوادث',9),
  ('201_500','*','vendor_risk_analyst','Vendor Risk Analyst','محلل مخاطر الموردين','risk',1,false,30,'Vendor Risk Analyst','محلل مخاطر الموردين',10)
ON CONFLICT (range_code,sector_code,role_code) DO NOTHING;

-- 501-1000 (medium-large)
INSERT INTO lookup_grc_role_staffing (range_code, sector_code, role_code, role_name_en, role_name_ar, role_category, recommended_fte, is_mandatory, priority, shahin_title_en, shahin_title_ar, sort_order)
VALUES
  ('501_1000','*','ciso','Chief Information Security Officer','رئيس أمن المعلومات','executive',1,true,5,'CISO','رئيس أمن المعلومات',1),
  ('501_1000','*','grc_director','GRC Director','مدير إدارة الحوكمة والمخاطر','executive',1,true,8,'GRC Director','مدير إدارة الحوكمة',2),
  ('501_1000','*','risk_manager','Risk Manager','مدير المخاطر','core',1,true,10,'Risk Manager','مدير المخاطر',3),
  ('501_1000','*','compliance_manager','Compliance Manager','مدير الامتثال','core',1,true,12,'Compliance Manager','مدير الامتثال',4),
  ('501_1000','*','control_owner','Control Owner','مالك الضبط','core',3,true,15,'Control Owner','مالك الضبط',5),
  ('501_1000','*','audit_manager','Audit Manager','مدير التدقيق','audit',1,true,18,'Audit Manager','مدير التدقيق',6),
  ('501_1000','*','internal_auditor','Internal Auditor','المدقق الداخلي','audit',2,true,20,'Internal Auditor','المدقق الداخلي',7),
  ('501_1000','*','privacy_officer','Data Protection Officer','مسؤول حماية البيانات','privacy',1,true,22,'DPO','مسؤول حماية البيانات',8),
  ('501_1000','*','soc_manager','SOC Manager','مدير مركز العمليات الأمنية','operations',1,false,25,'SOC Manager','مدير العمليات الأمنية',9),
  ('501_1000','*','soc_analyst','SOC Analyst','محلل مركز العمليات الأمنية','operations',3,false,28,'SOC Analyst','محلل العمليات الأمنية',10),
  ('501_1000','*','security_architect','Security Architect','مهندس أمن','technical',1,false,30,'Security Architect','مهندس أمن',11),
  ('501_1000','*','vendor_risk_analyst','Vendor Risk Analyst','محلل مخاطر الموردين','risk',1,false,32,'Vendor Risk Analyst','محلل مخاطر الموردين',12),
  ('501_1000','*','bcp_coordinator','BCP Coordinator','منسق استمرارية الأعمال','resilience',1,false,35,'BCP Coordinator','منسق استمرارية الأعمال',13)
ON CONFLICT (range_code,sector_code,role_code) DO NOTHING;

-- 1001-5000 (large)
INSERT INTO lookup_grc_role_staffing (range_code, sector_code, role_code, role_name_en, role_name_ar, role_category, recommended_fte, is_mandatory, priority, shahin_title_en, shahin_title_ar, sort_order)
VALUES
  ('1001_5000','*','ciso','Chief Information Security Officer','رئيس أمن المعلومات','executive',1,true,5,'CISO','رئيس أمن المعلومات',1),
  ('1001_5000','*','deputy_ciso','Deputy CISO','نائب رئيس أمن المعلومات','executive',1,false,7,'Deputy CISO','نائب رئيس أمن المعلومات',2),
  ('1001_5000','*','grc_director','GRC Director','مدير إدارة الحوكمة والمخاطر','executive',1,true,8,'GRC Director','مدير إدارة الحوكمة',3),
  ('1001_5000','*','risk_manager','Risk Manager','مدير المخاطر','core',2,true,10,'Risk Manager','مدير المخاطر',4),
  ('1001_5000','*','compliance_manager','Compliance Manager','مدير الامتثال','core',1,true,12,'Compliance Manager','مدير الامتثال',5),
  ('1001_5000','*','compliance_analyst','Compliance Analyst','محلل الامتثال','core',2,false,14,'Compliance Analyst','محلل الامتثال',6),
  ('1001_5000','*','control_owner','Control Owner','مالك الضبط','core',5,true,15,'Control Owner','مالك الضبط',7),
  ('1001_5000','*','audit_manager','Audit Manager','مدير التدقيق','audit',1,true,18,'Audit Manager','مدير التدقيق',8),
  ('1001_5000','*','internal_auditor','Internal Auditor','المدقق الداخلي','audit',3,true,20,'Internal Auditor','المدقق الداخلي',9),
  ('1001_5000','*','privacy_officer','Data Protection Officer','مسؤول حماية البيانات','privacy',1,true,22,'DPO','مسؤول حماية البيانات',10),
  ('1001_5000','*','privacy_analyst','Privacy Analyst','محلل الخصوصية','privacy',1,false,24,'Privacy Analyst','محلل الخصوصية',11),
  ('1001_5000','*','soc_manager','SOC Manager','مدير مركز العمليات الأمنية','operations',1,true,25,'SOC Manager','مدير العمليات الأمنية',12),
  ('1001_5000','*','soc_analyst','SOC Analyst','محلل مركز العمليات الأمنية','operations',5,true,28,'SOC Analyst','محلل العمليات الأمنية',13),
  ('1001_5000','*','incident_responder','Incident Responder','مستجيب للحوادث','operations',2,false,30,'Incident Responder','مستجيب للحوادث',14),
  ('1001_5000','*','security_architect','Security Architect','مهندس أمن','technical',2,false,32,'Security Architect','مهندس أمن',15),
  ('1001_5000','*','vuln_manager','Vulnerability Manager','مدير الثغرات','technical',1,false,34,'Vulnerability Manager','مدير الثغرات',16),
  ('1001_5000','*','vendor_risk_manager','Vendor Risk Manager','مدير مخاطر الموردين','risk',1,false,36,'Vendor Risk Manager','مدير مخاطر الموردين',17),
  ('1001_5000','*','bcp_manager','BCP Manager','مدير استمرارية الأعمال','resilience',1,false,38,'BCP Manager','مدير استمرارية الأعمال',18),
  ('1001_5000','*','threat_intel_analyst','Threat Intelligence Analyst','محلل استخبارات التهديدات','operations',1,false,40,'Threat Intel Analyst','محلل استخبارات التهديدات',19),
  ('1001_5000','*','grc_pmo_lead','GRC PMO Lead','قائد مكتب إدارة برنامج الحوكمة','management',1,false,42,'GRC PMO Lead','قائد مكتب إدارة الحوكمة',20)
ON CONFLICT (range_code,sector_code,role_code) DO NOTHING;

-- 5001-10000 (large)
INSERT INTO lookup_grc_role_staffing (range_code, sector_code, role_code, role_name_en, role_name_ar, role_category, recommended_fte, is_mandatory, priority, shahin_title_en, shahin_title_ar, sort_order)
VALUES
  ('5001_10000','*','ciso','Chief Information Security Officer','رئيس أمن المعلومات','executive',1,true,5,'CISO','رئيس أمن المعلومات',1),
  ('5001_10000','*','deputy_ciso','Deputy CISO','نائب رئيس أمن المعلومات','executive',1,true,7,'Deputy CISO','نائب رئيس أمن المعلومات',2),
  ('5001_10000','*','grc_director','GRC Director','مدير إدارة الحوكمة والمخاطر','executive',1,true,8,'GRC Director','مدير إدارة الحوكمة',3),
  ('5001_10000','*','risk_director','Risk Director','مدير إدارة المخاطر','executive',1,true,9,'Risk Director','مدير إدارة المخاطر',4),
  ('5001_10000','*','risk_manager','Risk Manager','مدير المخاطر','core',2,true,10,'Risk Manager','مدير المخاطر',5),
  ('5001_10000','*','risk_analyst','Risk Analyst','محلل المخاطر','core',3,false,11,'Risk Analyst','محلل المخاطر',6),
  ('5001_10000','*','compliance_director','Compliance Director','مدير إدارة الامتثال','executive',1,true,12,'Compliance Director','مدير إدارة الامتثال',7),
  ('5001_10000','*','compliance_manager','Compliance Manager','مدير الامتثال','core',2,true,13,'Compliance Manager','مدير الامتثال',8),
  ('5001_10000','*','compliance_analyst','Compliance Analyst','محلل الامتثال','core',3,false,14,'Compliance Analyst','محلل الامتثال',9),
  ('5001_10000','*','control_owner','Control Owner','مالك الضبط','core',8,true,15,'Control Owner','مالك الضبط',10),
  ('5001_10000','*','audit_director','Audit Director','مدير إدارة التدقيق','audit',1,true,17,'Audit Director','مدير إدارة التدقيق',11),
  ('5001_10000','*','audit_manager','Audit Manager','مدير التدقيق','audit',2,true,18,'Audit Manager','مدير التدقيق',12),
  ('5001_10000','*','internal_auditor','Internal Auditor','المدقق الداخلي','audit',4,true,20,'Internal Auditor','المدقق الداخلي',13),
  ('5001_10000','*','privacy_officer','Data Protection Officer','مسؤول حماية البيانات','privacy',1,true,22,'DPO','مسؤول حماية البيانات',14),
  ('5001_10000','*','privacy_analyst','Privacy Analyst','محلل الخصوصية','privacy',2,false,24,'Privacy Analyst','محلل الخصوصية',15),
  ('5001_10000','*','soc_director','SOC Director','مدير مركز العمليات الأمنية','operations',1,true,25,'SOC Director','مدير العمليات الأمنية',16),
  ('5001_10000','*','soc_manager','SOC Manager','مدير فريق العمليات','operations',2,true,27,'SOC Manager','مدير فريق العمليات',17),
  ('5001_10000','*','soc_analyst','SOC Analyst','محلل العمليات الأمنية','operations',8,true,28,'SOC Analyst','محلل العمليات الأمنية',18),
  ('5001_10000','*','incident_manager','Incident Manager','مدير الحوادث','operations',1,true,29,'Incident Manager','مدير الحوادث',19),
  ('5001_10000','*','incident_responder','Incident Responder','مستجيب للحوادث','operations',3,false,30,'Incident Responder','مستجيب للحوادث',20),
  ('5001_10000','*','security_architect','Security Architect','مهندس أمن','technical',3,true,32,'Security Architect','مهندس أمن',21),
  ('5001_10000','*','appsec_engineer','Application Security Engineer','مهندس أمن التطبيقات','technical',2,false,33,'AppSec Engineer','مهندس أمن التطبيقات',22),
  ('5001_10000','*','vuln_manager','Vulnerability Manager','مدير الثغرات','technical',2,false,34,'Vulnerability Manager','مدير الثغرات',23),
  ('5001_10000','*','vendor_risk_manager','Vendor Risk Manager','مدير مخاطر الموردين','risk',1,true,36,'Vendor Risk Manager','مدير مخاطر الموردين',24),
  ('5001_10000','*','bcp_manager','BCP Manager','مدير استمرارية الأعمال','resilience',1,true,38,'BCP Manager','مدير استمرارية الأعمال',25),
  ('5001_10000','*','threat_intel_analyst','Threat Intelligence Analyst','محلل استخبارات التهديدات','operations',2,false,40,'Threat Intel Analyst','محلل استخبارات التهديدات',26),
  ('5001_10000','*','grc_pmo_lead','GRC PMO Lead','قائد مكتب إدارة برنامج الحوكمة','management',1,true,42,'GRC PMO Lead','قائد مكتب إدارة الحوكمة',27),
  ('5001_10000','*','sector_liaison','Sector Coordination Officer','مسؤول التنسيق القطاعي','management',1,false,44,'Sector Liaison','مسؤول التنسيق القطاعي',28)
ON CONFLICT (range_code,sector_code,role_code) DO NOTHING;

-- 10001-50000 & 50001+ → same as 5001_10000 but with higher headcounts
INSERT INTO lookup_grc_role_staffing (range_code, sector_code, role_code, role_name_en, role_name_ar, role_category, recommended_fte, is_mandatory, priority, shahin_title_en, shahin_title_ar, sort_order)
SELECT '10001_50000', sector_code, role_code, role_name_en, role_name_ar, role_category,
       CASE WHEN recommended_fte <= 1 THEN recommended_fte ELSE LEAST(recommended_fte * 1.5, 20) END,
       is_mandatory, priority, shahin_title_en, shahin_title_ar, sort_order
FROM lookup_grc_role_staffing WHERE range_code = '5001_10000'
ON CONFLICT (range_code,sector_code,role_code) DO NOTHING;

INSERT INTO lookup_grc_role_staffing (range_code, sector_code, role_code, role_name_en, role_name_ar, role_category, recommended_fte, is_mandatory, priority, shahin_title_en, shahin_title_ar, sort_order)
SELECT '50001_plus', sector_code, role_code, role_name_en, role_name_ar, role_category,
       CASE WHEN recommended_fte <= 1 THEN recommended_fte ELSE LEAST(recommended_fte * 2, 30) END,
       is_mandatory, priority, shahin_title_en, shahin_title_ar, sort_order
FROM lookup_grc_role_staffing WHERE range_code = '5001_10000'
ON CONFLICT (range_code,sector_code,role_code) DO NOTHING;

-- ═══ Sector overrides: government needs more mandatory roles ═══
INSERT INTO lookup_grc_role_staffing (range_code, sector_code, role_code, role_name_en, role_name_ar, role_category, recommended_fte, is_mandatory, priority, shahin_title_en, shahin_title_ar, sort_order)
VALUES
  ('51_200','government','sector_liaison','Sector Coordination Officer','مسؤول التنسيق القطاعي','management',1,true,25,'Sector Liaison','مسؤول التنسيق القطاعي',10),
  ('51_200','government','bcp_coordinator','BCP Coordinator','منسق استمرارية الأعمال','resilience',1,true,30,'BCP Coordinator','منسق استمرارية الأعمال',11),
  ('201_500','government','sector_liaison','Sector Coordination Officer','مسؤول التنسيق القطاعي','management',1,true,25,'Sector Liaison','مسؤول التنسيق القطاعي',11),
  ('201_500','government','threat_intel_analyst','Threat Intelligence Analyst','محلل استخبارات التهديدات','operations',1,true,28,'Threat Intel Analyst','محلل استخبارات التهديدات',12)
ON CONFLICT (range_code,sector_code,role_code) DO NOTHING;

-- ═══ Sector overrides: banking/finance needs more compliance ═══
INSERT INTO lookup_grc_role_staffing (range_code, sector_code, role_code, role_name_en, role_name_ar, role_category, recommended_fte, is_mandatory, priority, shahin_title_en, shahin_title_ar, sort_order)
VALUES
  ('51_200','banking','aml_officer','AML/CFT Officer','مسؤول مكافحة غسل الأموال','compliance',1,true,18,'AML Officer','مسؤول مكافحة غسل الأموال',8),
  ('201_500','banking','aml_officer','AML/CFT Officer','مسؤول مكافحة غسل الأموال','compliance',1,true,18,'AML Officer','مسؤول مكافحة غسل الأموال',11),
  ('201_500','banking','fraud_analyst','Fraud Analyst','محلل الاحتيال','compliance',1,false,22,'Fraud Analyst','محلل الاحتيال',12),
  ('51_200','healthcare','hipaa_officer','Healthcare Compliance Officer','مسؤول امتثال الرعاية الصحية','compliance',1,true,18,'HC Compliance Officer','مسؤول امتثال الرعاية الصحية',8)
ON CONFLICT (range_code,sector_code,role_code) DO NOTHING;
