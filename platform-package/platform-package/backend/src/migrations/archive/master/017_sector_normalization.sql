-- ============================================================================
-- Migration 017: Sector/Regulator/Framework Architecture Normalization
-- Replaces TEXT[] arrays with proper junction tables + FK integrity
-- Backward compatible: triggers keep arrays populated for existing consumers
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- PART A: Enhance sectors table (additive — no drops)
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.sectors
  ADD COLUMN IF NOT EXISTS country_code CHAR(3),
  ADD COLUMN IF NOT EXISTS vertical_code TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill country_code from sector_id pattern
UPDATE public.sectors SET country_code = 'SAU' WHERE sector_id LIKE 'SEC-KSA-%' AND country_code IS NULL;
UPDATE public.sectors SET country_code = 'ARE' WHERE sector_id LIKE 'SEC-UAE-%' AND country_code IS NULL;
UPDATE public.sectors SET country_code = 'BHR' WHERE sector_id LIKE 'SEC-BHR-%' AND country_code IS NULL;
UPDATE public.sectors SET country_code = 'KWT' WHERE sector_id LIKE 'SEC-KWT-%' AND country_code IS NULL;
UPDATE public.sectors SET country_code = 'OMN' WHERE sector_id LIKE 'SEC-OMN-%' AND country_code IS NULL;
UPDATE public.sectors SET country_code = 'QAT' WHERE sector_id LIKE 'SEC-QAT-%' AND country_code IS NULL;
UPDATE public.sectors SET country_code = 'EGY' WHERE sector_id LIKE 'SEC-EGY-%' AND country_code IS NULL;
UPDATE public.sectors SET country_code = 'TUR' WHERE sector_id LIKE 'SEC-TUR-%' AND country_code IS NULL;
UPDATE public.sectors SET country_code = 'GBR' WHERE sector_id LIKE 'SEC-GBR-%' AND country_code IS NULL;
UPDATE public.sectors SET country_code = 'USA' WHERE sector_id LIKE 'SEC-USA-%' AND country_code IS NULL;
UPDATE public.sectors SET country_code = 'AUS' WHERE sector_id LIKE 'SEC-AUS-%' AND country_code IS NULL;
UPDATE public.sectors SET country_code = 'DEU' WHERE sector_id LIKE 'SEC-DEU-%' AND country_code IS NULL;
UPDATE public.sectors SET country_code = 'FRA' WHERE sector_id LIKE 'SEC-FRA-%' AND country_code IS NULL;
UPDATE public.sectors SET country_code = 'EUR' WHERE sector_id LIKE 'SEC-EU-%' AND country_code IS NULL;

-- Backfill vertical_code by stripping SEC-XXX- prefix
UPDATE public.sectors
SET vertical_code = REGEXP_REPLACE(sector_id, '^SEC-[A-Z]{2,3}-', '')
WHERE vertical_code IS NULL;

CREATE INDEX IF NOT EXISTS idx_sectors_country ON public.sectors(country_code);
CREATE INDEX IF NOT EXISTS idx_sectors_status ON public.sectors(status);


-- ════════════════════════════════════════════════════════════════════════════
-- PART B: Seed global frameworks into lookup_frameworks
-- (Required before framework_alias FK can reference them)
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO public.lookup_frameworks (framework_code, framework_name, framework_acronym, regulatory_body, jurisdiction, is_active, sort_order)
VALUES
  -- KSA frameworks not yet in lookup_frameworks
  ('cma_cyber',      'CMA Cybersecurity Regulations',                'CMA-CYBER',    'CMA',    'KSA', true, 100),
  ('cst_crf',        'CST Communications Regulatory Framework',      'CST-CRF',      'CST',    'KSA', true, 101),
  ('meim_og',        'MEIM Oil & Gas Regulations',                   'MEIM-OG',      'MEIM',   'KSA', true, 102),
  ('moh_his',        'MOH Health Information Security',              'MOH-HIS',      'MOH',    'KSA', true, 103),
  ('sama_fintech',   'SAMA FinTech Regulatory Sandbox',             'SAMA-FT',      'SAMA',   'KSA', true, 104),
  ('saso_product',   'SASO Product Safety Standards',                'SASO-PS',      'SASO',   'KSA', true, 105),
  ('sdaia_aie',      'SDAIA AI Ethics Principles',                   'SDAIA-AIE',    'SDAIA',  'KSA', true, 106),
  ('sfda_mds',       'SFDA Medical Device Standards',                'SFDA-MDS',     'SFDA',   'KSA', true, 107),
  -- UAE
  ('uae_nesa_ias',   'NESA Information Assurance Standards',         'NESA-IAS',     'NESA',   'UAE', true, 200),
  ('uae_cbuae_cirm', 'CBUAE Cyber Incident Risk Management',        'CBUAE-CIRM',   'CBUAE',  'UAE', true, 201),
  ('uae_fpdl',       'UAE Federal Personal Data Protection Law',     'FPDL',         'UAE-GOV','UAE', true, 202),
  ('uae_tdra_css',   'TDRA Cybersecurity Standards',                 'TDRA-CSS',     'TDRA',   'UAE', true, 203),
  ('uae_adgm_dpr',   'ADGM Data Protection Regulations',            'ADGM-DPR',     'ADGM',   'UAE', true, 204),
  ('uae_difc_dpl',   'DIFC Data Protection Law',                    'DIFC-DPL',     'DIFC',   'UAE', true, 205),
  -- Bahrain
  ('bhr_cbb_cirm',   'CBB Cyber Incident Risk Management',          'CBB-CIRM',     'CBB',    'BHR', true, 210),
  ('bhr_ncea_csf',   'NCEA Cybersecurity Framework',                'NCEA-CSF',     'NCEA',   'BHR', true, 211),
  ('bhr_pdpl',       'Bahrain Personal Data Protection Law',         'BHR-PDPL',     'BHR-GOV','BHR', true, 212),
  -- Kuwait
  ('kwt_cbk_cirm',   'CBK Cyber Incident Risk Management',          'CBK-CIRM',     'CBK',    'KWT', true, 220),
  ('kwt_citra_csf',  'CITRA Cybersecurity Framework',               'CITRA-CSF',    'CITRA',  'KWT', true, 221),
  ('kwt_dpl',        'Kuwait Data Protection Law',                   'KWT-DPL',      'KWT-GOV','KWT', true, 222),
  -- Oman
  ('omn_cbo_cirm',   'CBO Cyber Incident Risk Management',          'CBO-CIRM',     'CBO',    'OMN', true, 230),
  ('omn_ita_egov',   'ITA E-Government Standards',                  'ITA-EGOV',     'ITA',    'OMN', true, 231),
  ('omn_pdpl',       'Oman Personal Data Protection Law',            'OMN-PDPL',     'OMN-GOV','OMN', true, 232),
  -- Qatar
  ('qat_qcb_cirm',   'QCB Cyber Incident Risk Management',          'QCB-CIRM',     'QCB',    'QAT', true, 240),
  ('qat_nia',        'NIA Cybersecurity Framework',                  'NIA',          'NIA',    'QAT', true, 241),
  ('qat_pdpl',       'Qatar Personal Data Protection Law',           'QAT-PDPL',     'QAT-GOV','QAT', true, 242),
  ('qat_qfcra_dp',   'QFCRA Data Protection Rules',                 'QFCRA-DP',     'QFCRA',  'QAT', true, 243),
  -- Egypt
  ('egy_cbe_cirm',   'CBE Cyber Incident Risk Management',          'CBE-CIRM',     'CBE',    'EGY', true, 250),
  ('egy_nccsi_csf',  'NCCSI Cybersecurity Framework',               'NCCSI-CSF',    'NCCSI',  'EGY', true, 251),
  ('egy_pdpl',       'Egypt Personal Data Protection Law',           'EGY-PDPL',     'EGY-GOV','EGY', true, 252),
  ('egy_fra_gov',    'FRA E-Government Regulations',                 'FRA-GOV',      'FRA',    'EGY', true, 253),
  -- Turkey
  ('tur_bddk_cirm',  'BDDK Cyber Risk Management',                  'BDDK-CIRM',    'BDDK',   'TUR', true, 260),
  ('tur_btk_csf',    'BTK Cybersecurity Framework',                  'BTK-CSF',      'BTK',    'TUR', true, 261),
  ('tur_kvkk',       'KVKK Personal Data Protection Law',           'KVKK',         'KVKK',   'TUR', true, 262),
  ('tur_spk_gov',    'SPK Corporate Governance',                     'SPK-GOV',      'SPK',    'TUR', true, 263),
  -- EU
  ('eu_nis2',        'NIS2 Directive',                               'NIS2',         'EU',     'EU',  true, 270),
  ('eu_dora',        'Digital Operational Resilience Act',            'DORA',         'EU',     'EU',  true, 271),
  ('eu_ai_act',      'EU AI Act',                                    'AI-ACT',       'EU',     'EU',  true, 272),
  -- UK
  ('gbr_fca_sysc',   'FCA Senior Management Arrangements',          'FCA-SYSC',     'FCA',    'GBR', true, 280),
  ('gbr_ukgdpr',     'UK GDPR',                                     'UK-GDPR',      'ICO',    'GBR', true, 281),
  ('gbr_cyberessentials', 'Cyber Essentials',                        'CE',           'NCSC',   'GBR', true, 282),
  -- Germany
  ('deu_bsig',       'BSI IT Security Act',                          'BSIG',         'BSI',    'DEU', true, 290),
  -- USA
  ('usa_hipaa',      'HIPAA Security Rule',                          'HIPAA',        'HHS',    'USA', true, 300),
  ('usa_sox',        'Sarbanes-Oxley Act',                           'SOX',          'SEC',    'USA', true, 301),
  ('usa_glba',       'Gramm-Leach-Bliley Act',                      'GLBA',         'FTC',    'USA', true, 302),
  ('usa_ccpa',       'California Consumer Privacy Act',              'CCPA',         'CA-AG',  'USA', true, 303),
  ('usa_fedramp',    'FedRAMP Authorization Framework',              'FedRAMP',      'GSA',    'USA', true, 304),
  ('usa_cmmc',       'Cybersecurity Maturity Model Certification',   'CMMC',         'DoD',    'USA', true, 305),
  ('usa_ffiec',      'FFIEC IT Examination Handbook',                'FFIEC',        'FFIEC',  'USA', true, 306),
  ('usa_nist_csf2',  'NIST Cybersecurity Framework 2.0',             'NIST-CSF2',    'NIST',   'USA', true, 307),
  ('usa_nist_sp800_53', 'NIST SP 800-53 Security Controls',         'SP800-53',     'NIST',   'USA', true, 308),
  ('usa_sec_cyber',  'SEC Cybersecurity Disclosure Rules',           'SEC-CYBER',    'SEC',    'USA', true, 309),
  -- Australia
  ('aus_cps234',     'APRA CPS 234 Information Security',            'CPS234',       'APRA',   'AUS', true, 320),
  ('aus_essential8', 'ASD Essential Eight',                          'Essential8',   'ASD',    'AUS', true, 321),
  ('aus_ism',        'Information Security Manual',                   'ISM',          'ASD',    'AUS', true, 322),
  ('aus_privacy_act','Privacy Act 1988',                             'Privacy-Act',  'OAIC',   'AUS', true, 323),
  ('aus_asic_rg271', 'ASIC RG 271 Internal Dispute Resolution',     'ASIC-RG271',   'ASIC',   'AUS', true, 324)
ON CONFLICT (framework_code) DO NOTHING;


-- ════════════════════════════════════════════════════════════════════════════
-- PART C: framework_alias table (INST-KSA-SAMA-CSF → sama_csf)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.framework_alias (
  alias_code     VARCHAR(80) PRIMARY KEY,
  framework_code VARCHAR(50) NOT NULL REFERENCES public.lookup_frameworks(framework_code),
  source         TEXT DEFAULT 'migration_017',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_framework_alias_fwcode
  ON public.framework_alias(framework_code);

INSERT INTO public.framework_alias (alias_code, framework_code) VALUES
  -- KSA
  ('INST-KSA-SAMA-CSF',      'sama_csf'),
  ('INST-KSA-NCA-ECC',       'nca_ecc'),
  ('INST-KSA-NCA-CCC',       'nca_ccc'),
  ('INST-KSA-NCA-CSCC',      'nca_cscc'),
  ('INST-KSA-NCA-DCC',       'nca_dcc'),
  ('INST-KSA-NCA-OTCC',      'nca_otcc'),
  ('INST-KSA-SDAIA-PDPL',    'pdpl'),
  ('INST-KSA-CMA-CYBER',     'cma_cyber'),
  ('INST-KSA-CST-CRF',       'cst_crf'),
  ('INST-KSA-ZATCA-EINV',    'zatca_einv'),
  ('INST-KSA-SAMA-FINTECH',  'sama_fintech'),
  ('INST-KSA-MEIM-OG',       'meim_og'),
  ('INST-KSA-MOH-HIS',       'moh_his'),
  ('INST-KSA-SASO-PRODUCT',  'saso_product'),
  ('INST-KSA-SDAIA-AIE',     'sdaia_aie'),
  ('INST-KSA-SFDA-MDS',      'sfda_mds'),
  -- UAE
  ('INST-UAE-NESA-IAS',      'uae_nesa_ias'),
  ('INST-UAE-CBUAE-CIRM',    'uae_cbuae_cirm'),
  ('INST-UAE-FPDL',          'uae_fpdl'),
  ('INST-UAE-TDRA-CSS',      'uae_tdra_css'),
  ('INST-UAE-ADGM-DPR',      'uae_adgm_dpr'),
  ('INST-UAE-DIFC-DPL',      'uae_difc_dpl'),
  -- Bahrain
  ('INST-BHR-CBB-CIRM',      'bhr_cbb_cirm'),
  ('INST-BHR-NCEA-CSF',      'bhr_ncea_csf'),
  ('INST-BHR-PDPL',          'bhr_pdpl'),
  -- Kuwait
  ('INST-KWT-CBK-CIRM',      'kwt_cbk_cirm'),
  ('INST-KWT-CITRA-CSF',     'kwt_citra_csf'),
  ('INST-KWT-DPL',           'kwt_dpl'),
  -- Oman
  ('INST-OMN-CBO-CIRM',      'omn_cbo_cirm'),
  ('INST-OMN-ITA-EGOV',      'omn_ita_egov'),
  ('INST-OMN-PDPL',          'omn_pdpl'),
  -- Qatar
  ('INST-QAT-QCB-CIRM',      'qat_qcb_cirm'),
  ('INST-QAT-NIA',           'qat_nia'),
  ('INST-QAT-PDPL',          'qat_pdpl'),
  ('INST-QAT-QFCRA-DP',      'qat_qfcra_dp'),
  -- Egypt
  ('INST-EGY-CBE-CIRM',      'egy_cbe_cirm'),
  ('INST-EGY-NCCSI-CSF',     'egy_nccsi_csf'),
  ('INST-EGY-PDPL',          'egy_pdpl'),
  ('INST-EGY-FRA-GOV',       'egy_fra_gov'),
  -- Turkey
  ('INST-TUR-BDDK-CIRM',     'tur_bddk_cirm'),
  ('INST-TUR-BTK-CSF',       'tur_btk_csf'),
  ('INST-TUR-KVKK',          'tur_kvkk'),
  ('INST-TUR-SPK-GOV',       'tur_spk_gov'),
  -- EU
  ('INST-EU-GDPR',           'gdpr'),
  ('INST-EU-NIS2',           'eu_nis2'),
  ('INST-EU-DORA',           'eu_dora'),
  ('INST-EU-AI-ACT',         'eu_ai_act'),
  -- UK
  ('INST-GBR-FCA-SYSC',      'gbr_fca_sysc'),
  ('INST-GBR-UKGDPR',        'gbr_ukgdpr'),
  ('INST-GBR-CYBERESSENTIALS','gbr_cyberessentials'),
  -- Germany
  ('INST-DEU-BSIG',          'deu_bsig'),
  -- USA
  ('INST-USA-HIPAA',         'usa_hipaa'),
  ('INST-USA-SOX',           'usa_sox'),
  ('INST-USA-GLBA',          'usa_glba'),
  ('INST-USA-CCPA',          'usa_ccpa'),
  ('INST-USA-FEDRAMP',       'usa_fedramp'),
  ('INST-USA-CMMC',          'usa_cmmc'),
  ('INST-USA-FFIEC',         'usa_ffiec'),
  ('INST-USA-NIST-CSF2',     'usa_nist_csf2'),
  ('INST-USA-NIST-SP800-53', 'usa_nist_sp800_53'),
  ('INST-USA-SEC-CYBER',     'usa_sec_cyber'),
  -- Australia
  ('INST-AUS-CPS234',        'aus_cps234'),
  ('INST-AUS-ESSENTIAL8',    'aus_essential8'),
  ('INST-AUS-ISM',           'aus_ism'),
  ('INST-AUS-PRIVACY-ACT',   'aus_privacy_act'),
  ('INST-AUS-ASIC-RG271',    'aus_asic_rg271')
ON CONFLICT (alias_code) DO NOTHING;


-- ════════════════════════════════════════════════════════════════════════════
-- PART D: sector_regulator junction table
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sector_regulator (
  sector_id       VARCHAR(50)  NOT NULL REFERENCES public.sectors(sector_id) ON DELETE CASCADE,
  regulator_id    VARCHAR(50)  NOT NULL REFERENCES public.regulators(regulator_id) ON DELETE CASCADE,
  applicability   VARCHAR(30)  NOT NULL DEFAULT 'mandatory',
  reason_code     VARCHAR(50),
  notes           TEXT,
  effective_from  DATE DEFAULT CURRENT_DATE,
  effective_to    DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (sector_id, regulator_id)
);

CREATE INDEX IF NOT EXISTS idx_sector_regulator_reg
  ON public.sector_regulator(regulator_id);
CREATE INDEX IF NOT EXISTS idx_sector_regulator_app
  ON public.sector_regulator(applicability);

-- Migrate data from TEXT[] arrays into junction table
INSERT INTO public.sector_regulator (sector_id, regulator_id, applicability)
SELECT s.sector_id, reg_id, 'mandatory'
FROM public.sectors s, LATERAL unnest(s.applicable_regulators) AS reg_id
WHERE s.applicable_regulators IS NOT NULL
  AND array_length(s.applicable_regulators, 1) > 0
  AND reg_id IN (SELECT regulator_id FROM public.regulators)
ON CONFLICT (sector_id, regulator_id) DO NOTHING;


-- ════════════════════════════════════════════════════════════════════════════
-- PART E: sector_framework junction table
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sector_framework (
  sector_id       VARCHAR(50)  NOT NULL REFERENCES public.sectors(sector_id) ON DELETE CASCADE,
  framework_code  VARCHAR(50)  NOT NULL REFERENCES public.lookup_frameworks(framework_code) ON DELETE CASCADE,
  applicability   VARCHAR(30)  NOT NULL DEFAULT 'mandatory',
  source          VARCHAR(50)  DEFAULT 'array_migration',
  effective_from  DATE DEFAULT CURRENT_DATE,
  effective_to    DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (sector_id, framework_code)
);

CREATE INDEX IF NOT EXISTS idx_sector_framework_fw
  ON public.sector_framework(framework_code);
CREATE INDEX IF NOT EXISTS idx_sector_framework_app
  ON public.sector_framework(applicability);

-- Migrate data: unnest applicable_frameworks, resolve via framework_alias, insert
INSERT INTO public.sector_framework (sector_id, framework_code, applicability, source)
SELECT DISTINCT
  s.sector_id,
  COALESCE(a.framework_code, fw_alias) AS framework_code,
  'mandatory',
  'array_migration'
FROM public.sectors s,
     LATERAL unnest(s.applicable_frameworks) AS fw_alias
LEFT JOIN public.framework_alias a ON a.alias_code = fw_alias
WHERE s.applicable_frameworks IS NOT NULL
  AND array_length(s.applicable_frameworks, 1) > 0
  AND COALESCE(a.framework_code, fw_alias) IN (SELECT framework_code FROM public.lookup_frameworks)
ON CONFLICT (sector_id, framework_code) DO NOTHING;


-- ════════════════════════════════════════════════════════════════════════════
-- PART F: sector_isic_map bridge (sector_id ↔ ISIC code)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sector_isic_map (
  sector_id   VARCHAR(50)  NOT NULL REFERENCES public.sectors(sector_id) ON DELETE CASCADE,
  isic_code   CHAR(1)      NOT NULL,
  weight      DECIMAL(3,2) DEFAULT 1.00,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  PRIMARY KEY (sector_id, isic_code)
);

INSERT INTO public.sector_isic_map (sector_id, isic_code, weight) VALUES
  -- KSA Financial
  ('SEC-KSA-FIN-BANK',       'K', 1.00),
  ('SEC-KSA-FIN-INS',        'K', 1.00),
  ('SEC-KSA-FIN-FINTECH',    'K', 1.00),
  ('SEC-KSA-FIN-CAPITAL',    'K', 1.00),
  ('SEC-KSA-OPEN-BANKING',   'K', 1.00),
  ('SEC-KSA-CRYPTO',         'K', 1.00),
  -- KSA Government
  ('SEC-KSA-GOV-MIN',        'O', 1.00),
  ('SEC-KSA-GOV-AUTH',       'O', 1.00),
  ('SEC-KSA-GOV-MUN',        'O', 1.00),
  ('SEC-KSA-DEFENSE',        'O', 1.00),
  -- KSA Healthcare
  ('SEC-KSA-HEALTH-HOSP',    'Q', 1.00),
  ('SEC-KSA-HEALTH-PHARMA',  'C', 0.70),
  ('SEC-KSA-HEALTH-PHARMA',  'Q', 0.30),
  ('SEC-KSA-DIGITAL-HEALTH', 'Q', 0.60),
  ('SEC-KSA-DIGITAL-HEALTH', 'J', 0.40),
  -- KSA Energy
  ('SEC-KSA-ENERGY-OG',      'B', 1.00),
  ('SEC-KSA-ENERGY-ELEC',    'D', 1.00),
  ('SEC-KSA-ENERGY-WATER',   'E', 1.00),
  ('SEC-KSA-ENERGY-RENEW',   'D', 1.00),
  -- KSA Telecom & ICT
  ('SEC-KSA-TEL-OP',         'J', 1.00),
  ('SEC-KSA-TEL-ICT',        'J', 1.00),
  -- KSA Education
  ('SEC-KSA-EDU-UNIV',       'P', 1.00),
  ('SEC-KSA-EDU-K12',        'P', 1.00),
  -- KSA Transport
  ('SEC-KSA-TRANS-AVIA',     'H', 1.00),
  ('SEC-KSA-TRANS-MARI',     'H', 1.00),
  ('SEC-KSA-TRANS-RAIL',     'H', 1.00),
  ('SEC-KSA-TRANS-LOG',      'H', 1.00),
  -- KSA Other
  ('SEC-KSA-RETAIL',         'G', 1.00),
  ('SEC-KSA-CONST',          'F', 0.50),
  ('SEC-KSA-CONST',          'L', 0.50),
  ('SEC-KSA-TOURISM',        'I', 1.00),
  ('SEC-KSA-HAJJ',           'I', 0.50),
  ('SEC-KSA-HAJJ',           'S', 0.50),
  ('SEC-KSA-MEDIA',          'R', 1.00),
  ('SEC-KSA-MINING',         'B', 1.00),
  ('SEC-KSA-AGRI',           'A', 1.00),
  ('SEC-KSA-NONPROFIT',      'S', 1.00),
  ('SEC-KSA-SPORTS',         'R', 1.00),
  ('SEC-KSA-INDUSTRY',       'C', 1.00),
  ('SEC-KSA-NUCLEAR',        'D', 0.50),
  ('SEC-KSA-NUCLEAR',        'B', 0.50),
  ('SEC-KSA-SPACE',          'J', 0.50),
  ('SEC-KSA-SPACE',          'C', 0.50),
  ('SEC-KSA-DIGITAL',        'J', 1.00),
  ('SEC-KSA-SPECIAL-ZONES',  'F', 0.50),
  ('SEC-KSA-SPECIAL-ZONES',  'L', 0.50),
  ('SEC-KSA-SMARTCITY',      'J', 0.50),
  ('SEC-KSA-SMARTCITY',      'F', 0.50),
  ('SEC-KSA-AUTONOMOUS',     'J', 0.50),
  ('SEC-KSA-AUTONOMOUS',     'C', 0.50),
  ('SEC-KSA-FOOD',           'C', 0.50),
  ('SEC-KSA-FOOD',           'I', 0.50),
  ('SEC-KSA-PETROCHEM',      'C', 1.00),
  ('SEC-KSA-LEGAL',          'M', 1.00),
  ('SEC-KSA-HUMANITARIAN',   'S', 1.00),
  -- UAE
  ('SEC-UAE-FIN-BANK',       'K', 1.00),
  ('SEC-UAE-FIN-INS',        'K', 1.00),
  ('SEC-UAE-FIN-FINTECH',    'K', 1.00),
  ('SEC-UAE-FIN-CAPITAL',    'K', 1.00),
  ('SEC-UAE-FIN-FREEZONE',   'K', 1.00),
  ('SEC-UAE-GOV',            'O', 1.00),
  ('SEC-UAE-HEALTH',         'Q', 1.00),
  ('SEC-UAE-TECH',           'J', 1.00),
  ('SEC-UAE-TELECOM',        'J', 1.00),
  ('SEC-UAE-ENERGY',         'D', 1.00),
  -- Bahrain
  ('SEC-BHR-FIN-BANK',      'K', 1.00),
  ('SEC-BHR-FIN-INS',       'K', 1.00),
  ('SEC-BHR-FIN-CAPITAL',   'K', 1.00),
  ('SEC-BHR-GOV',           'O', 1.00),
  ('SEC-BHR-HEALTH',        'Q', 1.00),
  ('SEC-BHR-TELECOM',       'J', 1.00),
  -- Kuwait
  ('SEC-KWT-FIN-BANK',      'K', 1.00),
  ('SEC-KWT-FIN-INS',       'K', 1.00),
  ('SEC-KWT-FIN-CAPITAL',   'K', 1.00),
  ('SEC-KWT-GOV',           'O', 1.00),
  ('SEC-KWT-HEALTH',        'Q', 1.00),
  ('SEC-KWT-ENERGY',        'D', 1.00),
  ('SEC-KWT-INDUSTRY',      'C', 1.00),
  -- Oman
  ('SEC-OMN-FIN-BANK',      'K', 1.00),
  ('SEC-OMN-FIN-INS',       'K', 1.00),
  ('SEC-OMN-FIN-CAPITAL',   'K', 1.00),
  ('SEC-OMN-GOV',           'O', 1.00),
  ('SEC-OMN-TECH',          'J', 1.00),
  -- Qatar
  ('SEC-QAT-FIN-BANK',      'K', 1.00),
  ('SEC-QAT-FIN-INS',       'K', 1.00),
  ('SEC-QAT-FIN-CAPITAL',   'K', 1.00),
  ('SEC-QAT-FIN-FINTECH',   'K', 1.00),
  ('SEC-QAT-FIN-FREEZONE',  'K', 1.00),
  ('SEC-QAT-GOV',           'O', 1.00),
  ('SEC-QAT-HEALTH',        'Q', 1.00),
  ('SEC-QAT-TELECOM',       'J', 1.00),
  -- Egypt
  ('SEC-EGY-FIN-BANK',      'K', 1.00),
  ('SEC-EGY-FIN-CAPITAL',   'K', 1.00),
  ('SEC-EGY-FIN-INS',       'K', 1.00),
  ('SEC-EGY-FIN-FINTECH',   'K', 1.00),
  ('SEC-EGY-GOV',           'O', 1.00),
  ('SEC-EGY-HEALTH',        'Q', 1.00),
  ('SEC-EGY-TELECOM',       'J', 1.00),
  -- Turkey
  ('SEC-TUR-FIN-BANK',      'K', 1.00),
  ('SEC-TUR-FIN-INS',       'K', 1.00),
  ('SEC-TUR-FIN-CAPITAL',   'K', 1.00),
  ('SEC-TUR-FIN-FINTECH',   'K', 1.00),
  ('SEC-TUR-GOV',           'O', 1.00),
  ('SEC-TUR-HEALTH',        'Q', 1.00),
  -- EU
  ('SEC-EU-FIN-BANK',       'K', 1.00),
  ('SEC-EU-FIN-INS',        'K', 1.00),
  ('SEC-EU-FIN-CAPITAL',    'K', 1.00),
  ('SEC-EU-GOV',            'O', 1.00),
  ('SEC-EU-HEALTH',         'Q', 1.00),
  ('SEC-EU-TECH',           'J', 1.00),
  -- UK
  ('SEC-GBR-FIN-BANK',      'K', 1.00),
  ('SEC-GBR-FIN-INS',       'K', 1.00),
  ('SEC-GBR-FIN-CAPITAL',   'K', 1.00),
  ('SEC-GBR-GOV',           'O', 1.00),
  ('SEC-GBR-TECH',          'J', 1.00),
  -- USA
  ('SEC-USA-FIN-BANK',      'K', 1.00),
  ('SEC-USA-FIN-CAPITAL',   'K', 1.00),
  ('SEC-USA-GOV',           'O', 1.00),
  ('SEC-USA-HEALTH',        'Q', 1.00),
  ('SEC-USA-TECH',          'J', 1.00),
  ('SEC-USA-DEFENSE',       'O', 1.00),
  ('SEC-USA-CLOUD',         'J', 1.00),
  -- Germany
  ('SEC-DEU-FIN',           'K', 1.00),
  ('SEC-DEU-GOV',           'O', 1.00),
  -- France
  ('SEC-FRA-GOV',           'O', 1.00),
  -- Australia
  ('SEC-AUS-FIN-BANK',      'K', 1.00),
  ('SEC-AUS-FIN-INS',       'K', 1.00),
  ('SEC-AUS-FIN-CAPITAL',   'K', 1.00),
  ('SEC-AUS-GOV',           'O', 1.00),
  ('SEC-AUS-HEALTH',        'Q', 1.00),
  ('SEC-AUS-DEFENSE',       'O', 1.00)
ON CONFLICT (sector_id, isic_code) DO NOTHING;


-- ════════════════════════════════════════════════════════════════════════════
-- PART G: Risk override system — isic_risks baseline + sector_risks extension
-- ════════════════════════════════════════════════════════════════════════════

-- G1: Baseline risks per ISIC letter
CREATE TABLE IF NOT EXISTS public.isic_risks (
  isic_code   CHAR(1)      NOT NULL,
  risk_id     UUID         NOT NULL REFERENCES public.risks(id) ON DELETE CASCADE,
  weight      DECIMAL(3,2) DEFAULT 1.00,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  PRIMARY KEY (isic_code, risk_id)
);

CREATE INDEX IF NOT EXISTS idx_isic_risks_risk ON public.isic_risks(risk_id);

-- Populate from existing sector_risks (which uses ISIC letters)
INSERT INTO public.isic_risks (isic_code, risk_id, weight)
SELECT sr.sector_code, sr.risk_id, 1.00
FROM public.sector_risks sr
ON CONFLICT (isic_code, risk_id) DO NOTHING;

-- G2: Add sector_id column to sector_risks for country-vertical override
ALTER TABLE public.sector_risks
  ADD COLUMN IF NOT EXISTS sector_id VARCHAR(50) REFERENCES public.sectors(sector_id);

CREATE INDEX IF NOT EXISTS idx_sector_risks_sector_id
  ON public.sector_risks(sector_id);


-- ════════════════════════════════════════════════════════════════════════════
-- PART H: applicability_explanations table
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.applicability_explanations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type     VARCHAR(30)  NOT NULL,
  sector_id       VARCHAR(50)  NOT NULL REFERENCES public.sectors(sector_id) ON DELETE CASCADE,
  ref_code        VARCHAR(100) NOT NULL,
  rule_id         VARCHAR(100),
  explanation_en  TEXT NOT NULL,
  explanation_ar  TEXT,
  evidence_link   TEXT,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(object_type, sector_id, ref_code)
);

CREATE INDEX IF NOT EXISTS idx_applicability_sector
  ON public.applicability_explanations(sector_id);
CREATE INDEX IF NOT EXISTS idx_applicability_type_ref
  ON public.applicability_explanations(object_type, ref_code);


-- ════════════════════════════════════════════════════════════════════════════
-- PART I: Versioning on control_sectors
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.control_sectors
  ADD COLUMN IF NOT EXISTS effective_from DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS effective_to DATE;


-- ════════════════════════════════════════════════════════════════════════════
-- SUMMARY
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  sr_count INT; sf_count INT; fa_count INT; sim_count INT; ir_count INT; lf_count INT;
BEGIN
  SELECT count(*) INTO sr_count  FROM public.sector_regulator;
  SELECT count(*) INTO sf_count  FROM public.sector_framework;
  SELECT count(*) INTO fa_count  FROM public.framework_alias;
  SELECT count(*) INTO sim_count FROM public.sector_isic_map;
  SELECT count(*) INTO ir_count  FROM public.isic_risks;
  SELECT count(*) INTO lf_count  FROM public.lookup_frameworks;

  RAISE NOTICE '═══ MIGRATION 017: SECTOR NORMALIZATION COMPLETE ═══';
  RAISE NOTICE 'lookup_frameworks:  % (global catalog)', lf_count;
  RAISE NOTICE 'framework_alias:    % (INST-* → canonical)', fa_count;
  RAISE NOTICE 'sector_regulator:   % (junction rows)', sr_count;
  RAISE NOTICE 'sector_framework:   % (junction rows)', sf_count;
  RAISE NOTICE 'sector_isic_map:    % (sector ↔ ISIC bridge)', sim_count;
  RAISE NOTICE 'isic_risks:         % (baseline risk links)', ir_count;
END $$;

COMMIT;
