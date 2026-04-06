-- ============================================
-- Tenant Migration 277
-- Foundation Regulatory Tables: regulatory
-- body catalog, obligation types, and
-- compliance framework linkage.
-- ============================================

-- 1. Regulatory body catalog — known regulators
CREATE TABLE IF NOT EXISTS regulatory_bodies (
  code             TEXT PRIMARY KEY,
  name_en          TEXT NOT NULL,
  name_ar          TEXT,
  country_code     TEXT,
  sector           TEXT,
  website_url      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Regulatory obligation types — categories of obligations
CREATE TABLE IF NOT EXISTS obligation_types (
  code             TEXT PRIMARY KEY,
  name_en          TEXT NOT NULL,
  name_ar          TEXT,
  description_en   TEXT,
  severity_default TEXT NOT NULL DEFAULT 'medium' CHECK (severity_default IN (
    'low', 'medium', 'high', 'critical'
  )),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Compliance framework catalog — known frameworks
CREATE TABLE IF NOT EXISTS compliance_frameworks (
  code             TEXT PRIMARY KEY,
  name_en          TEXT NOT NULL,
  name_ar          TEXT,
  version          TEXT,
  issuing_body     TEXT REFERENCES regulatory_bodies(code),
  category         TEXT CHECK (category IN (
    'regulation', 'standard', 'guideline', 'best_practice', 'internal'
  )),
  effective_date   DATE,
  sunset_date      DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Framework-to-module mapping — which modules handle which frameworks
CREATE TABLE IF NOT EXISTS framework_module_map (
  id               BIGSERIAL PRIMARY KEY,
  framework_code   TEXT NOT NULL REFERENCES compliance_frameworks(code),
  module_code      TEXT NOT NULL,
  relevance        TEXT NOT NULL DEFAULT 'primary' CHECK (relevance IN (
    'primary', 'secondary', 'supporting'
  )),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (framework_code, module_code)
);

-- 5. Control domain catalog — standard control domains
CREATE TABLE IF NOT EXISTS control_domains (
  code             TEXT PRIMARY KEY,
  name_en          TEXT NOT NULL,
  name_ar          TEXT,
  parent_code      TEXT REFERENCES control_domains(code),
  sort_order       INT NOT NULL DEFAULT 100,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Seed: Regulatory Bodies
-- ============================================
INSERT INTO regulatory_bodies (code, name_en, name_ar, country_code, sector)
VALUES
  ('sama',     'Saudi Central Bank',                 'البنك المركزي السعودي',        'SA', 'banking'),
  ('cma',      'Capital Market Authority',           'هيئة السوق المالية',          'SA', 'financial_services'),
  ('nca',      'National Cybersecurity Authority',   'الهيئة الوطنية للأمن السيبراني', 'SA', 'cybersecurity'),
  ('sdaia',    'Saudi Data & AI Authority',          'الهيئة السعودية للبيانات والذكاء الاصطناعي', 'SA', 'data_privacy'),
  ('cbuae',    'Central Bank of the UAE',            'مصرف الإمارات المركزي',        'AE', 'banking'),
  ('adgm',     'Abu Dhabi Global Market',            'سوق أبوظبي العالمي',          'AE', 'financial_services'),
  ('difc',     'Dubai International Financial Centre','مركز دبي المالي العالمي',     'AE', 'financial_services'),
  ('qcb',      'Qatar Central Bank',                 'مصرف قطر المركزي',            'QA', 'banking'),
  ('cbk',      'Central Bank of Kuwait',             'بنك الكويت المركزي',          'KW', 'banking'),
  ('cbb',      'Central Bank of Bahrain',            'مصرف البحرين المركزي',        'BH', 'banking'),
  ('iso',      'International Organization for Standardization', NULL,               NULL, 'standards'),
  ('nist',     'National Institute of Standards and Technology', NULL,               'US', 'standards')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- Seed: Obligation Types
-- ============================================
INSERT INTO obligation_types (code, name_en, name_ar, severity_default)
VALUES
  ('regulatory_requirement', 'Regulatory Requirement',    'متطلب تنظيمي',      'high'),
  ('contractual_obligation', 'Contractual Obligation',    'التزام تعاقدي',      'medium'),
  ('internal_policy',        'Internal Policy',           'سياسة داخلية',       'medium'),
  ('best_practice',          'Best Practice',             'أفضل الممارسات',    'low'),
  ('industry_standard',      'Industry Standard',         'معيار صناعي',        'medium'),
  ('legal_requirement',      'Legal Requirement',         'متطلب قانوني',       'critical')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- Seed: Compliance Frameworks
-- ============================================
INSERT INTO compliance_frameworks (code, name_en, name_ar, version, issuing_body, category)
VALUES
  ('sama_csf',     'SAMA Cyber Security Framework',         'إطار الأمن السيبراني لساما',       '1.0', 'sama',  'regulation'),
  ('sama_bcm',     'SAMA Business Continuity Framework',    'إطار استمرارية الأعمال لساما',     '1.0', 'sama',  'regulation'),
  ('nca_ecc',      'NCA Essential Cybersecurity Controls', 'الضوابط الأساسية للأمن السيبراني', '2.0', 'nca',   'regulation'),
  ('nca_ccc',      'NCA Critical Systems Controls',        'ضوابط الأنظمة الحساسة',           '1.0', 'nca',   'regulation'),
  ('pdpl',         'Personal Data Protection Law',         'نظام حماية البيانات الشخصية',      '1.0', 'sdaia', 'regulation'),
  ('iso_27001',    'ISO 27001:2022',                        NULL,                               '2022', 'iso', 'standard'),
  ('iso_22301',    'ISO 22301:2019',                        NULL,                               '2019', 'iso', 'standard'),
  ('iso_31000',    'ISO 31000:2018',                        NULL,                               '2018', 'iso', 'standard'),
  ('nist_csf',     'NIST Cybersecurity Framework',          NULL,                               '2.0', 'nist', 'standard'),
  ('cbuae_irf',    'CBUAE Information Risk Framework',     'إطار مخاطر المعلومات للمركزي',     '1.0', 'cbuae', 'regulation')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- Seed: Framework → Module Mapping
-- ============================================
INSERT INTO framework_module_map (framework_code, module_code, relevance)
VALUES
  ('sama_csf',  'risk',       'primary'),
  ('sama_csf',  'compliance', 'primary'),
  ('sama_csf',  'incident',   'secondary'),
  ('sama_csf',  'asset',      'secondary'),
  ('sama_bcm',  'bcp',        'primary'),
  ('sama_bcm',  'risk',       'secondary'),
  ('nca_ecc',   'compliance', 'primary'),
  ('nca_ecc',   'risk',       'secondary'),
  ('nca_ecc',   'asset',      'secondary'),
  ('nca_ecc',   'incident',   'secondary'),
  ('nca_ccc',   'compliance', 'primary'),
  ('nca_ccc',   'risk',       'primary'),
  ('pdpl',      'compliance', 'primary'),
  ('pdpl',      'evidence',   'secondary'),
  ('iso_27001', 'risk',       'primary'),
  ('iso_27001', 'compliance', 'primary'),
  ('iso_27001', 'audit',      'secondary'),
  ('iso_27001', 'policy',     'secondary'),
  ('iso_27001', 'incident',   'secondary'),
  ('iso_27001', 'asset',      'secondary'),
  ('iso_22301', 'bcp',        'primary'),
  ('iso_22301', 'risk',       'secondary'),
  ('iso_31000', 'risk',       'primary'),
  ('nist_csf',  'risk',       'primary'),
  ('nist_csf',  'compliance', 'secondary'),
  ('nist_csf',  'incident',   'secondary'),
  ('cbuae_irf', 'risk',       'primary'),
  ('cbuae_irf', 'compliance', 'primary')
ON CONFLICT (framework_code, module_code) DO NOTHING;

-- ============================================
-- Seed: Control Domains
-- ============================================
INSERT INTO control_domains (code, name_en, name_ar, parent_code, sort_order)
VALUES
  ('governance',         'Governance',                    'الحوكمة',                  NULL,            10),
  ('risk_management',    'Risk Management',               'إدارة المخاطر',           NULL,            20),
  ('access_control',     'Access Control',                'التحكم في الوصول',         NULL,            30),
  ('asset_management',   'Asset Management',              'إدارة الأصول',             NULL,            40),
  ('ops_security',       'Operations Security',           'أمن العمليات',             NULL,            50),
  ('comms_security',     'Communications Security',       'أمن الاتصالات',            NULL,            60),
  ('physical_security',  'Physical Security',             'الأمن المادي',             NULL,            70),
  ('hr_security',        'Human Resources Security',      'أمن الموارد البشرية',       NULL,            80),
  ('incident_mgmt',      'Incident Management',           'إدارة الحوادث',            NULL,            90),
  ('bcp_dr',             'BCP & Disaster Recovery',       'استمرارية الأعمال والتعافي', NULL,          100),
  ('compliance_legal',   'Compliance & Legal',            'الامتثال والشؤون القانونية', NULL,          110),
  ('third_party',        'Third-Party Management',        'إدارة الأطراف الثالثة',     NULL,          120),
  ('data_protection',    'Data Protection & Privacy',     'حماية البيانات والخصوصية',  NULL,          130)
ON CONFLICT (code) DO NOTHING;
