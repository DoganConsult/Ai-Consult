-- ============================================================================
-- Migration 208: KSA Regulatory Training — Complete Coverage
-- Expands training content from 10 generic courses to 60+ KSA regulator-
-- specific courses, adds control_training_mappings for direct control→training
-- linkage, and seeds sector-based training paths.
-- ============================================================================

-- ── 1. Control-to-Training Mapping Table ────────────────────────────────────

CREATE TABLE IF NOT EXISTS control_training_mappings (
  mapping_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_code      VARCHAR(100) NOT NULL,
  content_id        UUID NOT NULL REFERENCES training_content(content_id) ON DELETE CASCADE,
  framework_code    VARCHAR(50),
  mapping_type      VARCHAR(30) DEFAULT 'direct' CHECK (mapping_type IN ('direct','supporting','prerequisite')),
  coverage_pct      NUMERIC DEFAULT 100,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ctm_control ON control_training_mappings(control_code);
CREATE INDEX IF NOT EXISTS idx_ctm_content ON control_training_mappings(content_id);
CREATE INDEX IF NOT EXISTS idx_ctm_framework ON control_training_mappings(framework_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ctm_control_content ON control_training_mappings(control_code, content_id) WHERE deleted_at IS NULL;

-- ── 2. Sector Training Paths Table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sector_training_paths (
  path_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_code       VARCHAR(60) NOT NULL,
  content_id        UUID NOT NULL REFERENCES training_content(content_id) ON DELETE CASCADE,
  path_order        INT DEFAULT 1,
  is_mandatory      BOOLEAN DEFAULT TRUE,
  due_days          INT DEFAULT 30,
  role_scope        TEXT[] DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stp_sector ON sector_training_paths(sector_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_stp_sector_content ON sector_training_paths(sector_code, content_id);

-- ── 3. Training Regulatory Compliance View ──────────────────────────────────

CREATE OR REPLACE VIEW v_training_regulatory_coverage AS
SELECT
  ctm.framework_code,
  tc.content_id,
  tc.code AS content_code,
  tc.title,
  tc.title_ar,
  tc.category,
  tc.is_mandatory,
  tc.duration_minutes,
  tc.recertification_days,
  ctm.mapping_type,
  ctm.coverage_pct,
  COUNT(DISTINCT ctm.control_code) AS controls_covered
FROM control_training_mappings ctm
JOIN training_content tc ON tc.content_id = ctm.content_id AND tc.deleted_at IS NULL AND tc.is_active = TRUE
WHERE ctm.deleted_at IS NULL AND ctm.is_active = TRUE
GROUP BY ctm.framework_code, tc.content_id, tc.code, tc.title, tc.title_ar, tc.category, tc.is_mandatory, tc.duration_minutes, tc.recertification_days, ctm.mapping_type, ctm.coverage_pct;

-- ── 4. KSA Regulatory Training Content (50+ courses) ───────────────────────
-- Covers: NCA, SAMA, SDAIA/PDPL, CMA, CST/CITC, ZATCA, SFDA, SASO,
--         MOH, HRSD, GOSI, GAC, NDMO, Vision 2030, and cross-cutting topics.

-- ─── NCA (National Cybersecurity Authority) ─────────────────────────────────

INSERT INTO training_content (code, title, title_ar, content_type, category, difficulty_level, duration_minutes, is_mandatory, passing_score, recertification_days, description, tags)
VALUES
('NCA_ECC_FOUND', 'NCA Essential Cybersecurity Controls (ECC)', 'ضوابط الأمن السيبراني الأساسية - NCA', 'course', 'cybersecurity', 'intermediate', 60, TRUE, 80, 365,
 'Comprehensive coverage of NCA ECC 2.0 domains: Governance, Defense, Resilience, Third-Party, and Cloud Security. Required for all organizations under NCA mandate.',
 ARRAY['nca','ecc','cybersecurity','mandatory','ksa']),

('NCA_CSCC_GOV', 'NCA Critical Systems Cybersecurity Controls', 'ضوابط الأمن السيبراني للأنظمة الحساسة', 'course', 'cybersecurity', 'advanced', 45, FALSE, 80, 365,
 'Covers NCA CSCC requirements for critical national infrastructure: SCADA/ICS security, OT/IT convergence, and sector-specific controls.',
 ARRAY['nca','cscc','critical-infrastructure','ot','ics']),

('NCA_DCC_CLOUD', 'NCA Data & Cloud Cybersecurity Controls', 'ضوابط الأمن السيبراني للبيانات والحوسبة السحابية', 'course', 'cybersecurity', 'intermediate', 40, FALSE, 75, 365,
 'NCA DCC framework covering data classification, cloud security architecture, data residency, encryption, and multi-cloud governance.',
 ARRAY['nca','dcc','cloud','data-classification','encryption']),

('NCA_TCC_TELECOM', 'NCA Telecom & IT Cybersecurity Controls', 'ضوابط الأمن السيبراني لقطاع الاتصالات', 'course', 'cybersecurity', 'advanced', 50, FALSE, 80, 365,
 'Telecom-specific cybersecurity controls from NCA covering network infrastructure, signaling security (SS7/Diameter), 5G security, and subscriber data protection.',
 ARRAY['nca','tcc','telecom','5g','network-security']),

('NCA_INCIDENT', 'NCA Cybersecurity Incident Management', 'إدارة حوادث الأمن السيبراني - NCA', 'course', 'incident_response', 'intermediate', 35, TRUE, 75, 180,
 'NCA incident reporting requirements, CERT-SA coordination, mandatory disclosure timelines, incident classification, and post-incident review procedures.',
 ARRAY['nca','incident','cert-sa','mandatory-reporting'])
ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING;

-- ─── SAMA (Saudi Central Bank) ──────────────────────────────────────────────

INSERT INTO training_content (code, title, title_ar, content_type, category, difficulty_level, duration_minutes, is_mandatory, passing_score, recertification_days, description, tags)
VALUES
('SAMA_CSF_CORE', 'SAMA Cyber Security Framework (CSF 2.0)', 'إطار الأمن السيبراني للبنك المركزي السعودي', 'course', 'compliance', 'advanced', 90, TRUE, 80, 365,
 'Complete SAMA CSF 2.0 coverage: 5 domains (Governance, Defense, Resilience, Third-Party, Cloud), 37 controls, maturity levels L1-L5. Required for all SAMA-regulated entities.',
 ARRAY['sama','csf','banking','finance','mandatory']),

('SAMA_BCM', 'SAMA Business Continuity Management', 'إدارة استمرارية الأعمال - ساما', 'course', 'bcp_dr', 'intermediate', 45, TRUE, 75, 365,
 'SAMA BCM framework covering BIA, BCP development, DR planning, testing & exercise requirements, and regulatory reporting for financial institutions.',
 ARRAY['sama','bcm','bcp','disaster-recovery','financial']),

('SAMA_AML_CFT', 'Anti-Money Laundering & Counter-Terrorism Financing', 'مكافحة غسل الأموال وتمويل الإرهاب', 'course', 'regulatory', 'advanced', 60, TRUE, 85, 365,
 'SAMA AML/CFT regulations: KYC/CDD requirements, suspicious transaction reporting (STR), PEP screening, sanctions compliance, and FATF recommendations implementation.',
 ARRAY['sama','aml','cft','kyc','fatf','sanctions']),

('SAMA_OPEN_BANKING', 'SAMA Open Banking Framework', 'إطار الخدمات المصرفية المفتوحة', 'course', 'compliance', 'intermediate', 40, FALSE, 75, 365,
 'SAMA Open Banking standards: API security, consent management, data sharing protocols, TPP registration, and consumer protection requirements.',
 ARRAY['sama','open-banking','api-security','fintech']),

('SAMA_OUTSOURCING', 'SAMA Outsourcing & Third-Party Risk', 'الاستعانة بمصادر خارجية وإدارة مخاطر الأطراف الثالثة', 'course', 'vendor_management', 'intermediate', 35, FALSE, 75, 365,
 'SAMA outsourcing guidelines for financial institutions: due diligence, contractual requirements, ongoing monitoring, exit strategies, and material outsourcing approval.',
 ARRAY['sama','outsourcing','third-party','vendor-risk']),

('SAMA_INSURANCE', 'SAMA Insurance Regulations & Compliance', 'أنظمة ولوائح التأمين - ساما', 'course', 'regulatory', 'intermediate', 40, FALSE, 75, 365,
 'Insurance sector regulations: Solvency requirements, actuarial standards, claims handling, reinsurance, and cooperative insurance principles.',
 ARRAY['sama','insurance','solvency','cooperative-insurance'])
ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING;

-- ─── SDAIA / PDPL (Data & AI Authority / Personal Data Protection) ──────────

INSERT INTO training_content (code, title, title_ar, content_type, category, difficulty_level, duration_minutes, is_mandatory, passing_score, recertification_days, description, tags)
VALUES
('PDPL_COMPLETE', 'KSA Personal Data Protection Law — Complete Guide', 'نظام حماية البيانات الشخصية - الدليل الشامل', 'course', 'data_privacy', 'intermediate', 75, TRUE, 80, 365,
 'Full PDPL coverage: 43 articles, data subject rights, lawful processing bases, cross-border transfers, DPO requirements, breach notification (72h), penalties up to SAR 5M.',
 ARRAY['pdpl','sdaia','data-protection','privacy','mandatory']),

('PDPL_DPO', 'Data Protection Officer (DPO) Certification', 'شهادة مسؤول حماية البيانات', 'course', 'data_privacy', 'advanced', 120, FALSE, 85, 365,
 'Advanced DPO training: DPIA methodology, privacy-by-design, records of processing, regulatory coordination with SDAIA, and organizational DPO responsibilities.',
 ARRAY['pdpl','dpo','dpia','privacy-by-design']),

('SDAIA_AI_ETHICS', 'SDAIA AI Ethics & Responsible AI', 'أخلاقيات الذكاء الاصطناعي والذكاء الاصطناعي المسؤول', 'course', 'governance', 'intermediate', 50, FALSE, 75, 365,
 'SDAIA AI ethics principles: transparency, fairness, accountability, human oversight, bias detection, explainability, and AI governance frameworks aligned with KSA National AI Strategy.',
 ARRAY['sdaia','ai-ethics','responsible-ai','bias','explainability']),

('SDAIA_DATA_GOV', 'SDAIA National Data Governance Framework', 'إطار حوكمة البيانات الوطنية', 'course', 'governance', 'intermediate', 45, FALSE, 75, 365,
 'SDAIA data governance: data classification (open/restricted/confidential/top-secret), data quality management, metadata standards, data sharing agreements, and open data policies.',
 ARRAY['sdaia','data-governance','classification','open-data']),

('PDPL_CROSS_BORDER', 'PDPL Cross-Border Data Transfers', 'نقل البيانات عبر الحدود - PDPL', 'course', 'data_privacy', 'advanced', 30, FALSE, 80, 365,
 'PDPL Articles 28-29: adequacy decisions, standard contractual clauses, binding corporate rules, SDAIA transfer impact assessments, and data localization requirements.',
 ARRAY['pdpl','cross-border','data-localization','scc'])
ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING;

-- ─── CMA (Capital Markets Authority) ────────────────────────────────────────

INSERT INTO training_content (code, title, title_ar, content_type, category, difficulty_level, duration_minutes, is_mandatory, passing_score, recertification_days, description, tags)
VALUES
('CMA_GOV_CODE', 'CMA Corporate Governance Code', 'نظام حوكمة الشركات - هيئة السوق المالية', 'course', 'governance', 'intermediate', 50, FALSE, 75, 365,
 'CMA Corporate Governance Regulations: board composition, audit committee requirements, disclosure obligations, related-party transactions, and minority shareholder protections.',
 ARRAY['cma','governance','board','disclosure','capital-markets']),

('CMA_AML', 'CMA Anti-Money Laundering for Capital Markets', 'مكافحة غسل الأموال في الأسواق المالية', 'course', 'regulatory', 'advanced', 45, FALSE, 80, 365,
 'CMA-specific AML requirements for authorized persons, market surveillance, insider trading detection, and suspicious activity reporting for securities.',
 ARRAY['cma','aml','insider-trading','market-surveillance']),

('CMA_DISCLOSURE', 'CMA Disclosure & Transparency Rules', 'قواعد الإفصاح والشفافية', 'course', 'compliance', 'intermediate', 35, FALSE, 75, 365,
 'Material event disclosure, periodic reporting, ownership disclosure thresholds, and Tadawul listing requirements.',
 ARRAY['cma','disclosure','tadawul','transparency'])
ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING;

-- ─── CST / CITC (Communications & IT) ───────────────────────────────────────

INSERT INTO training_content (code, title, title_ar, content_type, category, difficulty_level, duration_minutes, is_mandatory, passing_score, recertification_days, description, tags)
VALUES
('CST_DATA_LOCAL', 'CST Data Localization & Cloud Requirements', 'متطلبات توطين البيانات والحوسبة السحابية', 'course', 'data_privacy', 'intermediate', 35, FALSE, 75, 365,
 'CST cloud service provider regulations: data residency for telecom data, licensing for CSPs, SLA requirements, and data sovereignty in cloud computing.',
 ARRAY['cst','citc','data-localization','cloud','telecom']),

('CST_SPAM_FRAUD', 'CST Anti-Spam & Fraud Prevention', 'مكافحة الاحتيال والرسائل غير المرغوبة', 'course', 'cybersecurity', 'beginner', 25, FALSE, 70, 365,
 'CST regulations on spam prevention, telecom fraud detection, SIM box fraud, and subscriber protection requirements.',
 ARRAY['cst','spam','fraud','telecom-security']),

('CST_IOT_SEC', 'CST IoT Security & Smart City Standards', 'أمن إنترنت الأشياء ومعايير المدن الذكية', 'course', 'cybersecurity', 'advanced', 40, FALSE, 75, 365,
 'IoT device security certification, smart city data governance (NEOM, The Line, ROSHN), and connected infrastructure protection standards.',
 ARRAY['cst','iot','smart-city','neom','connected-devices'])
ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING;

-- ─── ZATCA (Zakat, Tax & Customs) ───────────────────────────────────────────

INSERT INTO training_content (code, title, title_ar, content_type, category, difficulty_level, duration_minutes, is_mandatory, passing_score, recertification_days, description, tags)
VALUES
('ZATCA_VAT', 'ZATCA VAT Compliance & E-Invoicing (FATOORAH)', 'ضريبة القيمة المضافة والفوترة الإلكترونية', 'course', 'compliance', 'intermediate', 50, TRUE, 80, 365,
 'ZATCA VAT framework (15%), FATOORAH e-invoicing phases 1-2, QR code requirements, XML invoice schema, integration with ZATCA Fatoorah Portal, and compliance penalties.',
 ARRAY['zatca','vat','e-invoicing','fatoorah','tax']),

('ZATCA_CUSTOMS', 'ZATCA Customs & Excise Tax Regulations', 'أنظمة الجمارك والضريبة الانتقائية', 'course', 'regulatory', 'intermediate', 35, FALSE, 75, 365,
 'Customs duties, unified GCC tariff, excise tax on tobacco/energy drinks/sweetened beverages, Free Trade Zone operations, and authorized economic operator (AEO) program.',
 ARRAY['zatca','customs','excise','gcc-tariff','aeo']),

('ZATCA_TRANSFER', 'ZATCA Transfer Pricing & Zakat', 'التسعير التحويلي والزكاة', 'course', 'compliance', 'advanced', 40, FALSE, 80, 365,
 'Transfer pricing documentation (master file, local file, CbCR), arms-length principle, Zakat computation for Saudi/GCC entities, and withholding tax obligations.',
 ARRAY['zatca','transfer-pricing','zakat','withholding-tax'])
ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING;

-- ─── Healthcare (MOH, SFDA) ─────────────────────────────────────────────────

INSERT INTO training_content (code, title, title_ar, content_type, category, difficulty_level, duration_minutes, is_mandatory, passing_score, recertification_days, description, tags)
VALUES
('MOH_HEALTH_DATA', 'MOH Health Data Governance & NPHIES', 'حوكمة البيانات الصحية ونظام نفيس', 'course', 'data_privacy', 'intermediate', 45, FALSE, 75, 365,
 'MOH health data regulations: NPHIES integration, health information exchange, patient consent, medical records retention, telemedicine data handling, and CBAHI accreditation.',
 ARRAY['moh','nphies','health-data','telemedicine','cbahi']),

('SFDA_PHARMA', 'SFDA Pharmaceutical & Medical Device Regulations', 'أنظمة الأدوية والأجهزة الطبية', 'course', 'regulatory', 'advanced', 50, FALSE, 80, 365,
 'SFDA registration, GMP compliance, pharmacovigilance reporting, medical device classification, clinical trial regulations, and halal pharmaceutical requirements.',
 ARRAY['sfda','pharmaceutical','medical-device','gmp','pharmacovigilance']),

('MOH_PATIENT_SAFETY', 'Patient Safety & Clinical Risk Management', 'سلامة المرضى وإدارة المخاطر السريرية', 'course', 'risk_management', 'intermediate', 40, FALSE, 75, 365,
 'MOH patient safety standards: adverse event reporting, root cause analysis, medication safety, infection control, and clinical governance.',
 ARRAY['moh','patient-safety','clinical-risk','adverse-events'])
ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING;

-- ─── Labor & Commerce (HRSD, MOC, GOSI) ────────────────────────────────────

INSERT INTO training_content (code, title, title_ar, content_type, category, difficulty_level, duration_minutes, is_mandatory, passing_score, recertification_days, description, tags)
VALUES
('HRSD_LABOR', 'KSA Labor Law & Employee Rights', 'نظام العمل السعودي وحقوق الموظفين', 'course', 'compliance', 'beginner', 40, TRUE, 75, 365,
 'KSA Labor Law: employment contracts, working hours, leave entitlements, end-of-service benefits, Saudization/Nitaqat, wage protection (WPS), and HRSD inspection requirements.',
 ARRAY['hrsd','labor-law','nitaqat','wps','saudization']),

('HRSD_WPS', 'Wage Protection System (WPS) Compliance', 'نظام حماية الأجور', 'course', 'compliance', 'beginner', 25, FALSE, 75, 365,
 'HRSD WPS requirements: timely salary disbursement, bank transfer mandates, penalty framework, and reporting obligations for employers.',
 ARRAY['hrsd','wps','wage-protection','payroll']),

('GOSI_SOCIAL', 'GOSI Social Insurance & Occupational Hazards', 'التأمينات الاجتماعية والأخطار المهنية', 'course', 'compliance', 'beginner', 30, FALSE, 75, 365,
 'GOSI registration, contribution rates, annuities, occupational injury reporting, SANED unemployment insurance, and voluntary coverage options.',
 ARRAY['gosi','social-insurance','saned','occupational-hazards']),

('MOC_COMMERCE', 'Ministry of Commerce — Corporate Compliance', 'وزارة التجارة - الامتثال التجاري', 'course', 'compliance', 'beginner', 30, FALSE, 75, 365,
 'Companies Law, commercial registration, Qawaem financial statements, anti-concealment law, franchise regulations, and e-commerce law requirements.',
 ARRAY['moc','companies-law','qawaem','anti-concealment','e-commerce'])
ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING;

-- ─── Competition (GAC) ──────────────────────────────────────────────────────

INSERT INTO training_content (code, title, title_ar, content_type, category, difficulty_level, duration_minutes, is_mandatory, passing_score, recertification_days, description, tags)
VALUES
('GAC_COMPETITION', 'GAC Competition Law & Merger Control', 'نظام المنافسة والرقابة على التركزات الاقتصادية', 'course', 'regulatory', 'intermediate', 35, FALSE, 75, 365,
 'Competition Law: prohibited practices (cartels, abuse of dominance), merger notification thresholds, leniency program, dawn raids, and GAC investigation procedures.',
 ARRAY['gac','competition','merger-control','antitrust','cartel'])
ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING;

-- ─── NDMO (National Data Management Office) ─────────────────────────────────

INSERT INTO training_content (code, title, title_ar, content_type, category, difficulty_level, duration_minutes, is_mandatory, passing_score, recertification_days, description, tags)
VALUES
('NDMO_DATA_CLASS', 'NDMO National Data Classification', 'التصنيف الوطني للبيانات - مكتب إدارة البيانات', 'course', 'data_privacy', 'intermediate', 35, FALSE, 75, 365,
 'NDMO data classification framework: 4 levels (Top Secret, Confidential, Restricted, Open), labeling standards, handling procedures, and data sharing agreements between government entities.',
 ARRAY['ndmo','data-classification','government','open-data']),

('NDMO_OPEN_DATA', 'NDMO Open Data & Data Sharing', 'البيانات المفتوحة ومشاركة البيانات', 'course', 'governance', 'beginner', 25, FALSE, 70, 365,
 'Saudi open data policy, data.gov.sa portal standards, API publishing requirements, data quality dimensions, and inter-agency data sharing governance.',
 ARRAY['ndmo','open-data','data-sharing','government'])
ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING;

-- ─── Energy & Environment ───────────────────────────────────────────────────

INSERT INTO training_content (code, title, title_ar, content_type, category, difficulty_level, duration_minutes, is_mandatory, passing_score, recertification_days, description, tags)
VALUES
('MOE_ENERGY_SEC', 'Energy Sector Cybersecurity & Compliance', 'الأمن السيبراني والامتثال في قطاع الطاقة', 'course', 'cybersecurity', 'advanced', 45, FALSE, 80, 365,
 'Energy sector regulations: SCADA/ICS security for oil & gas, pipeline PSMS, SEC environmental compliance, Aramco IKTVA requirements, and clean energy governance.',
 ARRAY['moe','energy','scada','ics','oil-gas','iktva']),

('MEWA_ENVIRON', 'Environmental Compliance & Sustainability', 'الامتثال البيئي والاستدامة', 'course', 'compliance', 'intermediate', 35, FALSE, 75, 365,
 'MEWA environmental regulations: EIA requirements, waste management, air/water quality, Saudi Green Initiative commitments, and ESG reporting standards.',
 ARRAY['mewa','environmental','eia','esg','green-initiative'])
ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING;

-- ─── Vision 2030 & Cross-Cutting Topics ─────────────────────────────────────

INSERT INTO training_content (code, title, title_ar, content_type, category, difficulty_level, duration_minutes, is_mandatory, passing_score, recertification_days, description, tags)
VALUES
('V2030_COMPLIANCE', 'Vision 2030 Regulatory Landscape', 'المشهد التنظيمي لرؤية 2030', 'course', 'regulatory', 'beginner', 40, FALSE, 70, 365,
 'Overview of Saudi Vision 2030 regulatory reforms: sector privatization, Special Economic Zones, investment licensing (MISA), entertainment regulations, tourism law, and Quality of Life program.',
 ARRAY['vision-2030','regulatory-reform','misa','privatization']),

('KSA_WHISTLEBLOWER', 'Whistleblower Protection & Reporting', 'حماية المبلغين والإبلاغ', 'course', 'ethics', 'beginner', 25, TRUE, 75, 365,
 'KSA whistleblower protection framework: safe reporting channels, anonymity guarantees, retaliation protections, and regulatory reporting obligations under SAMA/CMA/NCA.',
 ARRAY['whistleblower','ethics','reporting','protection']),

('KSA_SANCTIONS', 'International Sanctions & Trade Controls', 'العقوبات الدولية وضوابط التجارة', 'course', 'regulatory', 'advanced', 45, FALSE, 80, 365,
 'Sanctions compliance: UN/US/EU sanctions screening, dual-use goods, export control regulations, OFAC guidance, and KSA-specific trade restrictions.',
 ARRAY['sanctions','export-control','ofac','trade-compliance']),

('KSA_ESG_REPORT', 'ESG Reporting & Sustainability Disclosure', 'الإفصاح عن الاستدامة ومعايير ESG', 'course', 'governance', 'intermediate', 40, FALSE, 75, 365,
 'ESG reporting requirements: Tadawul ESG disclosure guidelines, GRI/SASB standards, climate risk (TCFD), social impact measurement, and Saudi Green Initiative alignment.',
 ARRAY['esg','sustainability','tadawul','tcfd','gri']),

('KSA_BOARD_DUTIES', 'Board Member Duties & Liabilities (KSA)', 'واجبات ومسؤوليات أعضاء مجلس الإدارة', 'course', 'governance', 'advanced', 50, FALSE, 80, 365,
 'Director duties under Companies Law: fiduciary obligations, conflict of interest, related-party transactions, audit committee requirements, and personal liability exposure.',
 ARRAY['board','directors','fiduciary','companies-law']),

('KSA_CRISIS_COMM', 'Crisis Communication & Regulatory Disclosure', 'إدارة الأزمات والإفصاح التنظيمي', 'course', 'risk_management', 'intermediate', 30, FALSE, 75, 365,
 'Crisis management: regulatory notification timelines, media handling, stakeholder communication, CERT-SA coordination, and board-level crisis governance.',
 ARRAY['crisis','communication','disclosure','cert-sa']),

('KSA_CONTRACTS', 'KSA Contract Law & Procurement Compliance', 'نظام العقود والمشتريات في المملكة', 'course', 'compliance', 'intermediate', 35, FALSE, 75, 365,
 'Government procurement (GTPL), Etimad portal requirements, contractor obligations, dispute resolution (commercial courts), and Saudization clauses in contracts.',
 ARRAY['contracts','procurement','etimad','gtpl','dispute-resolution']),

('KSA_CYBER_LAW', 'KSA Anti-Cyber Crime Law', 'نظام مكافحة الجرائم المعلوماتية', 'course', 'cybersecurity', 'beginner', 30, TRUE, 75, 365,
 'Anti-Cyber Crime Law: prohibited acts (unauthorized access, data interception, identity theft, defamation), penalties (up to 10 years/SAR 5M), and evidence handling procedures.',
 ARRAY['cyber-crime','law','penalties','evidence']),

('KSA_IP_PROTECT', 'Intellectual Property Protection in KSA', 'حماية الملكية الفكرية في المملكة', 'course', 'regulatory', 'intermediate', 30, FALSE, 75, 365,
 'IP framework: SAIP trademark/patent registration, copyright protection, trade secrets, IP enforcement, and technology transfer agreements.',
 ARRAY['ip','saip','trademark','patent','copyright']),

('KSA_DIGITAL_ID', 'Digital Identity & E-Government (Absher/Nafath)', 'الهوية الرقمية والحكومة الإلكترونية', 'course', 'cybersecurity', 'beginner', 25, FALSE, 70, 365,
 'Digital identity ecosystem: Absher services, Nafath authentication, NIC integration, e-signature law, and digital government standards (Yesser program).',
 ARRAY['digital-id','absher','nafath','e-government','yesser'])
ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING;

-- ─── Industry-Specific ──────────────────────────────────────────────────────

INSERT INTO training_content (code, title, title_ar, content_type, category, difficulty_level, duration_minutes, is_mandatory, passing_score, recertification_days, description, tags)
VALUES
('KSA_FINTECH', 'Fintech Regulations & Sandbox (SAMA/CMA)', 'تنظيمات التقنية المالية وبيئة التجربة', 'course', 'regulatory', 'intermediate', 40, FALSE, 75, 365,
 'Fintech regulatory sandbox (SAMA), crowdfunding regulations (CMA), payment service provider licensing, crypto-asset framework, and insurtech guidelines.',
 ARRAY['fintech','sandbox','crowdfunding','crypto','payments']),

('KSA_REAL_ESTATE', 'REGA Real Estate Regulations & Ejar', 'أنظمة العقار ومنصة إيجار', 'course', 'regulatory', 'beginner', 30, FALSE, 70, 365,
 'Real Estate General Authority: broker licensing, Ejar platform, off-plan sales (Wafi), strata management, and REIT regulations.',
 ARRAY['rega','real-estate','ejar','wafi','reit']),

('KSA_EDUCATION', 'Education & Training Sector Regulations', 'أنظمة قطاع التعليم والتدريب', 'course', 'regulatory', 'beginner', 25, FALSE, 70, 365,
 'MOE/ETEC/TVTC regulations: institutional accreditation, NCAAA standards, student data privacy, EdTech compliance, and foreign institution licensing.',
 ARRAY['education','etec','tvtc','ncaaa','accreditation']),

('KSA_TRANSPORT', 'Transport & Logistics Regulations', 'أنظمة النقل والخدمات اللوجستية', 'course', 'regulatory', 'beginner', 30, FALSE, 70, 365,
 'TGA/SRA/GACA regulations: freight licensing, last-mile delivery, aviation safety, maritime (Mawani), and Saudi Logistics Hub standards.',
 ARRAY['transport','logistics','gaca','sra','mawani'])
ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING;

-- ── 5. Sector Training Paths ────────────────────────────────────────────────
-- Maps each KSA sector to required + recommended training courses.
-- Mandatory courses are always assigned; recommended are suggested.

-- Financial Services (Banking)
INSERT INTO sector_training_paths (sector_code, content_id, path_order, is_mandatory, due_days, role_scope)
SELECT 'SEC-KSA-FIN-BANK', content_id, ord, mand, days, roles::text[] FROM (VALUES
  ('SAMA_CSF_CORE', 1, TRUE, 30, '{all}'),
  ('NCA_ECC_FOUND', 2, TRUE, 30, '{all}'),
  ('PDPL_COMPLETE', 3, TRUE, 30, '{all}'),
  ('SAMA_AML_CFT', 4, TRUE, 30, '{compliance_officer,risk_manager,admin}'),
  ('SAMA_BCM', 5, TRUE, 45, '{risk_manager,admin}'),
  ('NCA_INCIDENT', 6, TRUE, 30, '{all}'),
  ('KSA_WHISTLEBLOWER', 7, TRUE, 30, '{all}'),
  ('KSA_CYBER_LAW', 8, TRUE, 30, '{all}'),
  ('SAMA_OPEN_BANKING', 9, FALSE, 60, '{compliance_officer,admin}'),
  ('SAMA_OUTSOURCING', 10, FALSE, 60, '{risk_manager,vendor_manager}'),
  ('KSA_FINTECH', 11, FALSE, 60, '{compliance_officer,admin}')
) AS v(code, ord, mand, days, roles)
JOIN training_content tc ON tc.code = v.code
ON CONFLICT (sector_code, content_id) DO NOTHING;

-- Financial Services (Insurance)
INSERT INTO sector_training_paths (sector_code, content_id, path_order, is_mandatory, due_days, role_scope)
SELECT 'SEC-KSA-FIN-INS', content_id, ord, mand, days, roles::text[] FROM (VALUES
  ('SAMA_CSF_CORE', 1, TRUE, 30, '{all}'),
  ('NCA_ECC_FOUND', 2, TRUE, 30, '{all}'),
  ('PDPL_COMPLETE', 3, TRUE, 30, '{all}'),
  ('SAMA_INSURANCE', 4, TRUE, 30, '{compliance_officer,admin}'),
  ('SAMA_AML_CFT', 5, TRUE, 30, '{compliance_officer,risk_manager}'),
  ('NCA_INCIDENT', 6, TRUE, 30, '{all}'),
  ('KSA_WHISTLEBLOWER', 7, TRUE, 30, '{all}')
) AS v(code, ord, mand, days, roles)
JOIN training_content tc ON tc.code = v.code
ON CONFLICT (sector_code, content_id) DO NOTHING;

-- Capital Markets
INSERT INTO sector_training_paths (sector_code, content_id, path_order, is_mandatory, due_days, role_scope)
SELECT 'SEC-KSA-FIN-CAP', content_id, ord, mand, days, roles::text[] FROM (VALUES
  ('CMA_GOV_CODE', 1, TRUE, 30, '{all}'),
  ('CMA_AML', 2, TRUE, 30, '{compliance_officer,risk_manager}'),
  ('CMA_DISCLOSURE', 3, TRUE, 30, '{compliance_officer,admin}'),
  ('NCA_ECC_FOUND', 4, TRUE, 30, '{all}'),
  ('PDPL_COMPLETE', 5, TRUE, 30, '{all}'),
  ('KSA_ESG_REPORT', 6, FALSE, 60, '{admin,compliance_officer}'),
  ('KSA_BOARD_DUTIES', 7, FALSE, 60, '{admin}')
) AS v(code, ord, mand, days, roles)
JOIN training_content tc ON tc.code = v.code
ON CONFLICT (sector_code, content_id) DO NOTHING;

-- Healthcare
INSERT INTO sector_training_paths (sector_code, content_id, path_order, is_mandatory, due_days, role_scope)
SELECT 'SEC-KSA-HEALTH-HOSP', content_id, ord, mand, days, roles::text[] FROM (VALUES
  ('MOH_HEALTH_DATA', 1, TRUE, 30, '{all}'),
  ('PDPL_COMPLETE', 2, TRUE, 30, '{all}'),
  ('NCA_ECC_FOUND', 3, TRUE, 30, '{all}'),
  ('MOH_PATIENT_SAFETY', 4, TRUE, 30, '{all}'),
  ('SFDA_PHARMA', 5, FALSE, 60, '{compliance_officer,admin}'),
  ('NCA_INCIDENT', 6, TRUE, 30, '{all}')
) AS v(code, ord, mand, days, roles)
JOIN training_content tc ON tc.code = v.code
ON CONFLICT (sector_code, content_id) DO NOTHING;

-- Telecom & IT
INSERT INTO sector_training_paths (sector_code, content_id, path_order, is_mandatory, due_days, role_scope)
SELECT 'SEC-KSA-ICT-TELCO', content_id, ord, mand, days, roles::text[] FROM (VALUES
  ('NCA_ECC_FOUND', 1, TRUE, 30, '{all}'),
  ('NCA_TCC_TELECOM', 2, TRUE, 30, '{all}'),
  ('CST_DATA_LOCAL', 3, TRUE, 30, '{compliance_officer,admin}'),
  ('PDPL_COMPLETE', 4, TRUE, 30, '{all}'),
  ('CST_IOT_SEC', 5, FALSE, 60, '{risk_manager,admin}'),
  ('NCA_DCC_CLOUD', 6, FALSE, 60, '{compliance_officer}'),
  ('NCA_INCIDENT', 7, TRUE, 30, '{all}')
) AS v(code, ord, mand, days, roles)
JOIN training_content tc ON tc.code = v.code
ON CONFLICT (sector_code, content_id) DO NOTHING;

-- Energy (Oil & Gas)
INSERT INTO sector_training_paths (sector_code, content_id, path_order, is_mandatory, due_days, role_scope)
SELECT 'SEC-KSA-ENERGY-OIL', content_id, ord, mand, days, roles::text[] FROM (VALUES
  ('NCA_ECC_FOUND', 1, TRUE, 30, '{all}'),
  ('NCA_CSCC_GOV', 2, TRUE, 30, '{all}'),
  ('MOE_ENERGY_SEC', 3, TRUE, 30, '{all}'),
  ('PDPL_COMPLETE', 4, TRUE, 30, '{all}'),
  ('MEWA_ENVIRON', 5, TRUE, 45, '{compliance_officer,risk_manager}'),
  ('NCA_INCIDENT', 6, TRUE, 30, '{all}')
) AS v(code, ord, mand, days, roles)
JOIN training_content tc ON tc.code = v.code
ON CONFLICT (sector_code, content_id) DO NOTHING;

-- Government / Public Sector
INSERT INTO sector_training_paths (sector_code, content_id, path_order, is_mandatory, due_days, role_scope)
SELECT 'SEC-KSA-GOV-FED', content_id, ord, mand, days, roles::text[] FROM (VALUES
  ('NCA_ECC_FOUND', 1, TRUE, 30, '{all}'),
  ('NDMO_DATA_CLASS', 2, TRUE, 30, '{all}'),
  ('PDPL_COMPLETE', 3, TRUE, 30, '{all}'),
  ('KSA_CYBER_LAW', 4, TRUE, 30, '{all}'),
  ('KSA_DIGITAL_ID', 5, FALSE, 60, '{admin}'),
  ('NDMO_OPEN_DATA', 6, FALSE, 60, '{compliance_officer,admin}'),
  ('V2030_COMPLIANCE', 7, FALSE, 60, '{admin}')
) AS v(code, ord, mand, days, roles)
JOIN training_content tc ON tc.code = v.code
ON CONFLICT (sector_code, content_id) DO NOTHING;

-- Generic / Cross-Sector (fallback)
INSERT INTO sector_training_paths (sector_code, content_id, path_order, is_mandatory, due_days, role_scope)
SELECT 'SEC-KSA-DEFAULT', content_id, ord, mand, days, roles::text[] FROM (VALUES
  ('NCA_ECC_FOUND', 1, TRUE, 30, '{all}'),
  ('PDPL_COMPLETE', 2, TRUE, 30, '{all}'),
  ('KSA_CYBER_LAW', 3, TRUE, 30, '{all}'),
  ('KSA_WHISTLEBLOWER', 4, TRUE, 30, '{all}'),
  ('HRSD_LABOR', 5, TRUE, 45, '{admin,compliance_officer}'),
  ('ZATCA_VAT', 6, TRUE, 45, '{admin,compliance_officer}'),
  ('NCA_INCIDENT', 7, FALSE, 60, '{all}')
) AS v(code, ord, mand, days, roles)
JOIN training_content tc ON tc.code = v.code
ON CONFLICT (sector_code, content_id) DO NOTHING;

-- Retail / E-Commerce
INSERT INTO sector_training_paths (sector_code, content_id, path_order, is_mandatory, due_days, role_scope)
SELECT 'SEC-KSA-RETAIL', content_id, ord, mand, days, roles::text[] FROM (VALUES
  ('PDPL_COMPLETE', 1, TRUE, 30, '{all}'),
  ('NCA_ECC_FOUND', 2, TRUE, 30, '{all}'),
  ('ZATCA_VAT', 3, TRUE, 30, '{admin,compliance_officer}'),
  ('MOC_COMMERCE', 4, TRUE, 30, '{admin,compliance_officer}'),
  ('HRSD_LABOR', 5, TRUE, 45, '{admin}'),
  ('GAC_COMPETITION', 6, FALSE, 60, '{compliance_officer}'),
  ('KSA_CONTRACTS', 7, FALSE, 60, '{admin}')
) AS v(code, ord, mand, days, roles)
JOIN training_content tc ON tc.code = v.code
ON CONFLICT (sector_code, content_id) DO NOTHING;
