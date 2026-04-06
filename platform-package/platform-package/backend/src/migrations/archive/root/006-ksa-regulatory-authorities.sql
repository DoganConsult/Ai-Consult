-- =====================================================
-- Migration 006: KSA Regulatory Authorities
-- Source: Official Saudi Government Agencies
-- References:
--   - Official .gov.sa websites
--   - Royal Decrees establishing each authority
--   - SAMA Rulebook Annex A
-- Last Updated: 2026-03-02
-- =====================================================

-- =====================================================
-- 1. REGULATORY AUTHORITIES TABLE
-- Track all KSA regulatory bodies with their jurisdiction
-- =====================================================
CREATE TABLE IF NOT EXISTS lookup_ksa_regulatory_authorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authority_code VARCHAR(20) UNIQUE NOT NULL,
  authority_name_en VARCHAR(255) NOT NULL,
  authority_name_ar VARCHAR(255),
  authority_acronym VARCHAR(20) NOT NULL,
  authority_type VARCHAR(50), -- Ministry, Authority, Commission, Organization, Institution
  parent_ministry VARCHAR(255), -- If under a ministry
  website_url VARCHAR(255),
  establishment_decree VARCHAR(100), -- Royal Decree reference
  establishment_date DATE,
  mandate_en TEXT, -- Official mandate/scope
  regulated_sectors TEXT[], -- Array of ISIC4 sector codes
  key_regulations TEXT[], -- Major regulations issued
  enforcement_powers TEXT[], -- Types of enforcement actions
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2. INSERT REGULATORY AUTHORITIES
-- Source: Official government sources
-- =====================================================
INSERT INTO lookup_ksa_regulatory_authorities (
  authority_code, authority_name_en, authority_name_ar, authority_acronym,
  authority_type, parent_ministry, website_url, establishment_date,
  mandate_en, regulated_sectors, key_regulations, enforcement_powers, sort_order
) VALUES

-- Financial Sector Regulators
('SAMA', 'Saudi Central Bank', 'البنك المركزي السعودي', 'SAMA',
 'Central Bank', NULL, 'https://www.sama.gov.sa', '1952-10-04',
 'Central bank and primary financial regulator. Oversees banks, insurance companies, manages monetary policy, and safeguards financial system stability.',
 ARRAY['K'], -- Financial and insurance activities
 ARRAY['Banking Control Law', 'Insurance Market Supervision Law', 'SAMA Cybersecurity Framework'],
 ARRAY['License revocation', 'Fines', 'Supervision', 'Inspection'], 1),

('CMA', 'Capital Market Authority', 'هيئة السوق المالية', 'CMA',
 'Authority', NULL, 'https://cma.gov.sa', '2003-07-31',
 'Regulates and develops capital markets, oversees securities business, investment banks, asset managers, brokers, and financial advisers.',
 ARRAY['K'], -- Financial and insurance activities
 ARRAY['Capital Market Law', 'Securities Business Regulations', 'Market Conduct Regulations'],
 ARRAY['License suspension', 'Fines', 'Trading halts', 'Criminal referral'], 2),

-- Cybersecurity & Technology Regulators
('NCA', 'National Cybersecurity Authority', 'الهيئة الوطنية للأمن السيبراني', 'NCA',
 'Authority', NULL, 'https://nca.gov.sa', '2017-10-31',
 'National authority for cybersecurity, protecting critical infrastructure and government services.',
 ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S'], -- All sectors
 ARRAY['Essential Cybersecurity Controls (ECC)', 'Critical Systems Cybersecurity Controls (CSCC)', 'Data Cybersecurity Controls (DCC)', 'Cloud Cybersecurity Controls (CCC)'],
 ARRAY['Compliance orders', 'Incident response', 'Security audits'], 3),

('CST', 'Communications, Space and Technology Commission', 'هيئة الاتصالات والفضاء والتقنية', 'CST',
 'Commission', NULL, 'https://cst.gov.sa', '2001-03-03',
 'Regulates telecommunications, ICT infrastructure, space sector, and emerging technologies. Previously CITC.',
 ARRAY['J'], -- Information and communication
 ARRAY['Telecommunications Act', 'Space Regulations', 'IoT Regulatory Framework', 'Data Localization Requirements'],
 ARRAY['License revocation', 'Spectrum management', 'Service blocking', 'Fines'], 4),

-- Food, Drug & Standards Regulators
('SFDA', 'Saudi Food and Drug Authority', 'الهيئة العامة للغذاء والدواء', 'SFDA',
 'Authority', NULL, 'https://sfda.gov.sa', '2003-08-29',
 'Ensures safety of food, drugs, medical devices, cosmetics, pesticides, and feed through regulations and controls.',
 ARRAY['C','G','I','Q'], -- Manufacturing, Wholesale/retail, Accommodation/food, Health
 ARRAY['Food Law', 'Drug Law', 'Medical Device Regulations', 'Cosmetics Regulations'],
 ARRAY['Product recall', 'Import bans', 'Facility closure', 'Fines'], 5),

('SASO', 'Saudi Standards, Metrology and Quality Organization', 'الهيئة السعودية للمواصفات والمقاييس والجودة', 'SASO',
 'Organization', 'Ministry of Commerce', 'https://saso.gov.sa', '1972-04-16',
 'Sets national standards for commodities, products, measurements, testing methods, and quality control.',
 ARRAY['C','G'], -- Manufacturing, Trade
 ARRAY['Saudi Standards', 'Technical Regulations', 'Conformity Assessment Procedures'],
 ARRAY['Product testing', 'Certification', 'Market surveillance'], 6),

-- Data & AI Regulator
('SDAIA', 'Saudi Data and Artificial Intelligence Authority', 'الهيئة السعودية للبيانات والذكاء الاصطناعي', 'SDAIA',
 'Authority', NULL, 'https://sdaia.gov.sa', '2019-08-30',
 'Oversees data governance, artificial intelligence, and national data strategies. Houses NDMO and SCAI.',
 ARRAY['J','M','O'], -- Information, Professional services, Public administration
 ARRAY['Personal Data Protection Law (PDPL)', 'National Data Governance Policy', 'AI Ethics Principles'],
 ARRAY['Data audits', 'Privacy enforcement', 'Compliance orders'], 7),

-- Digital Government
('DGA', 'Digital Government Authority', 'هيئة الحكومة الرقمية', 'DGA',
 'Authority', NULL, 'https://dga.gov.sa', '2021-03-09',
 'Regulates digital government operations, digital transformation, and government IT standards.',
 ARRAY['O'], -- Public administration
 ARRAY['Digital Government Regulatory Framework', 'Cloud First Policy', 'Open Data Policy'],
 ARRAY['System audits', 'Compliance monitoring', 'Standards enforcement'], 8),

-- Tax & Customs
('ZATCA', 'Zakat, Tax and Customs Authority', 'هيئة الزكاة والضريبة والجمارك', 'ZATCA',
 'Authority', 'Ministry of Finance', 'https://zatca.gov.sa', '2021-05-04',
 'Administers and collects zakat, taxes including VAT, and manages customs operations. Formerly GAZT.',
 ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','P','Q','R','S'], -- All commercial sectors
 ARRAY['VAT Law', 'Income Tax Law', 'Zakat Regulations', 'Customs Law'],
 ARRAY['Tax audits', 'Penalties', 'Asset freezing', 'Criminal prosecution'], 9),

-- Labor & Social Insurance
('GOSI', 'General Organization for Social Insurance', 'المؤسسة العامة للتأمينات الاجتماعية', 'GOSI',
 'Organization', 'Ministry of Human Resources and Social Development', 'https://gosi.gov.sa', '1973-01-01',
 'Manages social insurance system, provides pension, disability, unemployment benefits, and work injury protection.',
 ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','P','Q','R','S'], -- All employment sectors
 ARRAY['Social Insurance Law', 'SANED Unemployment Insurance', 'Occupational Hazards Branch'],
 ARRAY['Contribution collection', 'Benefit suspension', 'Employer penalties'], 10),

('HRSD', 'Ministry of Human Resources and Social Development', 'وزارة الموارد البشرية والتنمية الاجتماعية', 'HRSD',
 'Ministry', NULL, 'https://hrsd.gov.sa', '1960-01-01',
 'Regulates labor market, employment relations, Saudization, and social development programs.',
 ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','P','Q','R','S'], -- All employment sectors
 ARRAY['Labor Law', 'Saudization Requirements (Nitaqat)', 'Wage Protection System'],
 ARRAY['Work permits', 'Facility closure', 'Saudization enforcement', 'Labor disputes'], 11),

-- Competition & Consumer Protection
('GAC', 'General Authority for Competition', 'الهيئة العامة للمنافسة', 'GAC',
 'Authority', NULL, 'https://gac.gov.sa', '2004-01-01',
 'Protects and encourages fair competition, combats monopolistic practices, and reviews mergers.',
 ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','P','Q','R','S'], -- All commercial sectors
 ARRAY['Competition Law', 'Merger Control Regulations', 'Anti-monopoly Rules'],
 ARRAY['Merger blocking', 'Fines up to 10% revenue', 'Market investigations'], 12),

-- Health Sector
('MOH', 'Ministry of Health', 'وزارة الصحة', 'MOH',
 'Ministry', NULL, 'https://moh.gov.sa', '1950-01-01',
 'Provides healthcare services, regulates private healthcare sector, and manages public health.',
 ARRAY['Q'], -- Human health and social work
 ARRAY['Healthcare Licensing Regulations', 'Private Healthcare Institutions Law', 'Public Health Law'],
 ARRAY['Facility licensing', 'Practice restrictions', 'Health emergency powers'], 13),

-- Environment
('MEWA', 'Ministry of Environment, Water and Agriculture', 'وزارة البيئة والمياه والزراعة', 'MEWA',
 'Ministry', NULL, 'https://mewa.gov.sa', '2016-05-07',
 'Regulates environmental protection, water resources, and agricultural sector.',
 ARRAY['A','E'], -- Agriculture, Water supply
 ARRAY['Environmental Law', 'Water Law', 'Agricultural Investment Law'],
 ARRAY['Environmental permits', 'Water allocation', 'Agricultural subsidies'], 14),

-- Energy Sector
('MOE', 'Ministry of Energy', 'وزارة الطاقة', 'MOE',
 'Ministry', NULL, 'https://moenergy.gov.sa', '2019-08-30',
 'Oversees energy sector including oil, gas, electricity, and renewable energy policies.',
 ARRAY['B','D'], -- Mining, Electricity/gas
 ARRAY['Electricity Law', 'Gas Supply Regulations', 'Renewable Energy Framework'],
 ARRAY['Production quotas', 'Price regulation', 'License issuance'], 15),

-- Commerce & Trade
('MOC', 'Ministry of Commerce', 'وزارة التجارة', 'MOC',
 'Ministry', NULL, 'https://mc.gov.sa', '1954-01-01',
 'Regulates commercial activities, company registration, consumer protection, and trade practices.',
 ARRAY['G'], -- Wholesale and retail trade
 ARRAY['Companies Law', 'Commercial Registration Law', 'Consumer Protection Law', 'E-Commerce Law'],
 ARRAY['Business licensing', 'Consumer complaints', 'Trade violations'], 16),

-- Investment
('MISA', 'Ministry of Investment', 'وزارة الاستثمار', 'MISA',
 'Ministry', NULL, 'https://misa.gov.sa', '2020-02-20',
 'Promotes and facilitates foreign and domestic investment, manages investment licensing.',
 ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','P','Q','R','S'], -- All investment sectors
 ARRAY['Foreign Investment Law', 'Investment Fund Regulations', 'Special Economic Zones Law'],
 ARRAY['Investment licensing', 'Incentive programs', 'Investor services'], 17),

-- Statistics
('GASTAT', 'General Authority for Statistics', 'الهيئة العامة للإحصاء', 'GASTAT',
 'Authority', NULL, 'https://stats.gov.sa', '2015-01-13',
 'Official statistical reference for Saudi Arabia, conducts census and economic surveys.',
 ARRAY['O'], -- Public administration
 ARRAY['Statistics Law', 'Census Regulations', 'Data Collection Standards'],
 ARRAY['Data collection mandate', 'Survey enforcement', 'Statistical standards'], 18),

-- Real Estate
('REGA', 'Real Estate General Authority', 'الهيئة العامة للعقار', 'REGA',
 'Authority', 'Ministry of Housing', 'https://rega.gov.sa', '2017-01-01',
 'Regulates real estate sector, licenses brokers, and manages property databases.',
 ARRAY['L'], -- Real estate activities
 ARRAY['Real Estate Law', 'Broker Licensing Regulations', 'White Land Tax'],
 ARRAY['Broker licensing', 'Property registration', 'Tax enforcement'], 19),

-- Tourism
('MOT', 'Ministry of Tourism', 'وزارة السياحة', 'MOT',
 'Ministry', NULL, 'https://mt.gov.sa', '2020-02-27',
 'Develops tourism sector, licenses tourism facilities, and implements tourism strategies.',
 ARRAY['I','R'], -- Accommodation/food, Arts/entertainment
 ARRAY['Tourism Law', 'Tourism Licensing Regulations', 'Hotel Classification System'],
 ARRAY['Facility licensing', 'Quality standards', 'Tourism promotion'], 20)

ON CONFLICT (authority_code) DO UPDATE SET
  authority_name_en = EXCLUDED.authority_name_en,
  mandate_en = EXCLUDED.mandate_en,
  regulated_sectors = EXCLUDED.regulated_sectors,
  key_regulations = EXCLUDED.key_regulations,
  updated_at = NOW()
WHERE lookup_ksa_regulatory_authorities.authority_name_en IS DISTINCT FROM EXCLUDED.authority_name_en;

-- =====================================================
-- 3. REGULATORY AUTHORITY SECTOR MAPPING
-- Maps authorities to specific ISIC4 sectors they regulate
-- =====================================================
CREATE TABLE IF NOT EXISTS lookup_authority_sector_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authority_code VARCHAR(20) REFERENCES lookup_ksa_regulatory_authorities(authority_code),
  sector_code CHAR(1) REFERENCES lookup_isic4_sectors(section_code),
  regulation_type VARCHAR(50), -- Primary, Secondary, Oversight, Advisory
  specific_activities TEXT[], -- Specific ISIC4 division codes
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 4. REGULATORY FRAMEWORKS BY AUTHORITY
-- Links frameworks to their issuing authorities
-- =====================================================
CREATE TABLE IF NOT EXISTS lookup_authority_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authority_code VARCHAR(20) REFERENCES lookup_ksa_regulatory_authorities(authority_code),
  framework_code VARCHAR(50), -- SAMA_CSF, NCA_ECC, etc.
  framework_name VARCHAR(255),
  framework_version VARCHAR(20),
  issue_date DATE,
  mandatory_for_sectors TEXT[],
  compliance_deadline DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert key frameworks
INSERT INTO lookup_authority_frameworks (authority_code, framework_code, framework_name, framework_version, issue_date, mandatory_for_sectors)
VALUES
('SAMA', 'SAMA_CSF', 'SAMA Cybersecurity Framework', '1.0', '2017-05-01', ARRAY['K']),
('NCA', 'NCA_ECC', 'Essential Cybersecurity Controls', '1.1', '2018-11-01', ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S']),
('NCA', 'NCA_CSCC', 'Critical Systems Cybersecurity Controls', '1.0', '2019-04-01', ARRAY['D','H','J','K','O']),
('NCA', 'NCA_DCC', 'Data Cybersecurity Controls', '1.0', '2022-07-01', ARRAY['J','K','O']),
('NCA', 'NCA_CCC', 'Cloud Cybersecurity Controls', '1.0', '2020-02-01', ARRAY['J','K','M','O']),
('SDAIA', 'PDPL', 'Personal Data Protection Law', '1.0', '2021-09-24', ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S']),
('CST', 'IoT_REG', 'IoT Regulatory Framework', '1.0', '2023-01-01', ARRAY['J','C']),
('DGA', 'DGRF', 'Digital Government Regulatory Framework', '1.0', '2021-06-01', ARRAY['O'])
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. UPDATE DATA SOURCES
-- =====================================================
INSERT INTO lookup_data_sources (table_name, source_name, source_document, source_date, last_verified)
VALUES
  ('lookup_ksa_regulatory_authorities', 'Saudi Government Official Websites', '*.gov.sa sites', '2024-01-01', CURRENT_DATE),
  ('lookup_ksa_regulatory_authorities', 'SAMA Rulebook Annex A', 'sama.gov.sa/rulebook', '2024-01-01', CURRENT_DATE),
  ('lookup_authority_frameworks', 'National Cybersecurity Authority', 'nca.gov.sa/frameworks', '2024-01-01', CURRENT_DATE),
  ('lookup_authority_frameworks', 'SAMA Cybersecurity Framework', 'sama.gov.sa/csf', '2017-05-01', CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_authorities_type ON lookup_ksa_regulatory_authorities(authority_type);
CREATE INDEX IF NOT EXISTS idx_authorities_acronym ON lookup_ksa_regulatory_authorities(authority_acronym);
CREATE INDEX IF NOT EXISTS idx_auth_sector_mapping ON lookup_authority_sector_mapping(authority_code, sector_code);
CREATE INDEX IF NOT EXISTS idx_auth_frameworks ON lookup_authority_frameworks(authority_code);

-- =====================================================
-- 7. VERIFICATION
-- =====================================================
SELECT
  'Migration 006 Complete' AS status,
  (SELECT COUNT(*) FROM lookup_ksa_regulatory_authorities) AS authorities_count,
  (SELECT COUNT(*) FROM lookup_authority_frameworks) AS frameworks_count,
  (SELECT COUNT(DISTINCT authority_type) FROM lookup_ksa_regulatory_authorities) AS authority_types;