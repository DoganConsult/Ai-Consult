-- ============================================================================
-- Migration 032: Complete Authority-Framework Wiring
-- Populates lookup_authority_frameworks for ALL 50+ authorities
-- Ensures every sector resolves to non-zero frameworks via regulatory resolution
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART A: Ensure all Tier-1 authorities have complete framework linkage
-- (Migration 006 only seeded 8 entries; many Tier-1 authorities are empty)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.lookup_authority_frameworks
  (authority_code, framework_code, framework_name, framework_version, issue_date, mandatory_for_sectors, is_active)
VALUES
  -- SFDA — Food, Drug & Medical Device Standards
  ('SFDA', 'sfda_food_safety', 'SFDA Food Safety Regulations', '2.0', '2023-01-15', ARRAY['C','G','I'], true),
  ('SFDA', 'sfda_drug_reg', 'SFDA Drug Registration & Pharmacovigilance', '1.0', '2022-06-01', ARRAY['C','Q'], true),
  ('SFDA', 'sfda_mds', 'SFDA Medical Device Safety Standards', '1.0', '2022-09-01', ARRAY['C','Q'], true),
  ('SFDA', 'sfda_cosmetics', 'SFDA Cosmetics Safety Requirements', '1.0', '2023-03-01', ARRAY['C','G'], true),

  -- SASO — Standards & Quality
  ('SASO', 'saso_product', 'SASO Product Safety Standards', '3.0', '2022-01-01', ARRAY['C','G'], true),
  ('SASO', 'saso_metrology', 'SASO Metrology & Calibration Standards', '1.0', '2021-06-01', ARRAY['C','D','E'], true),
  ('SASO', 'saso_halal', 'SASO Halal Certification Standards', '1.0', '2020-01-01', ARRAY['C','G','I'], true),

  -- ZATCA — Additional frameworks beyond zatca_einv
  ('ZATCA', 'zatca_vat', 'VAT Implementing Regulations', '2.0', '2018-01-01',
   ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','P','Q','R','S'], true),
  ('ZATCA', 'zatca_customs', 'Customs Tariff & Classification Rules', '1.0', '2020-07-01',
   ARRAY['B','C','G','H'], true),
  ('ZATCA', 'zatca_excise', 'Excise Tax Regulations', '1.0', '2017-06-10', ARRAY['C','G','I'], true),
  ('ZATCA', 'zatca_transfer_pricing', 'Transfer Pricing Guidelines', '1.0', '2023-01-01', ARRAY['K','M'], true),

  -- MOH — Health Sector
  ('MOH', 'moh_his', 'MOH Health Information Security', '1.0', '2021-01-01', ARRAY['Q'], true),
  ('MOH', 'moh_licensing', 'Healthcare Facility Licensing Standards', '2.0', '2022-01-01', ARRAY['Q'], true),
  ('MOH', 'moh_telemedicine', 'Telemedicine Regulatory Framework', '1.0', '2020-06-01', ARRAY['J','Q'], true),
  ('MOH', 'moh_pharmacy', 'Pharmacy Practice Regulations', '1.0', '2019-01-01', ARRAY['G','Q'], true),

  -- GOSI — Social Insurance
  ('GOSI', 'gosi_social_insurance', 'Social Insurance Law & Regulations', '3.0', '2022-01-01',
   ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','P','Q','R','S'], true),
  ('GOSI', 'gosi_occupational_hazards', 'Occupational Hazards Insurance', '2.0', '2021-01-01',
   ARRAY['B','C','D','E','F','H'], true),

  -- HRSD — Labor & Human Resources
  ('HRSD', 'hrsd_labor_law', 'Labor Law & Employment Regulations', '4.0', '2023-03-14',
   ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','P','Q','R','S'], true),
  ('HRSD', 'hrsd_nitaqat', 'Nitaqat (Saudization) Program', '3.0', '2022-01-01',
   ARRAY['C','D','E','F','G','H','I','J','K','L','M','N','P','Q','R','S'], true),
  ('HRSD', 'hrsd_wage_protection', 'Wage Protection System', '2.0', '2023-01-01',
   ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','P','Q','R','S'], true),
  ('HRSD', 'hrsd_wps', 'Worker Protection Standards', '1.0', '2021-06-01',
   ARRAY['B','C','D','E','F','H'], true),

  -- GAC — Competition
  ('GAC', 'gac_competition', 'Competition Law & Anti-Monopoly Regulations', '2.0', '2019-09-20',
   ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','P','Q','R','S'], true),
  ('GAC', 'gac_merger_control', 'Merger Control & Economic Concentration', '1.0', '2020-01-01',
   ARRAY['C','G','J','K'], true),

  -- MEWA — Environment & Water
  ('MEWA', 'mewa_environmental', 'Environmental Protection Standards', '2.0', '2020-01-01',
   ARRAY['A','B','C','D','E','F'], true),
  ('MEWA', 'mewa_water', 'Water Resource Management Regulations', '1.0', '2019-01-01',
   ARRAY['A','D','E'], true),
  ('MEWA', 'mewa_agriculture', 'Agricultural Compliance Standards', '1.0', '2021-01-01',
   ARRAY['A'], true),
  ('MEWA', 'mewa_waste', 'Waste Management & Recycling Standards', '1.0', '2022-01-01',
   ARRAY['C','E','F'], true),

  -- MOE — Energy
  ('MOE', 'moe_electricity', 'Electricity Regulation & Grid Standards', '2.0', '2021-01-01',
   ARRAY['D'], true),
  ('MOE', 'moe_gas', 'Gas Sector Regulatory Framework', '1.0', '2020-01-01',
   ARRAY['B','D'], true),
  ('MOE', 'moe_renewable', 'Renewable Energy Regulatory Framework', '1.0', '2023-01-01',
   ARRAY['D'], true),
  ('MOE', 'moe_petroleum', 'Petroleum Operations Compliance Standards', '2.0', '2019-01-01',
   ARRAY['B'], true),

  -- MOC — Commerce
  ('MOC', 'moc_companies_law', 'Companies Law', '3.0', '2023-01-01',
   ARRAY['C','G','J','K','L','M'], true),
  ('MOC', 'moc_commercial_registry', 'Commercial Registration Requirements', '2.0', '2022-01-01',
   ARRAY['C','G','H','I','J','K','L','M','N','R','S'], true),
  ('MOC', 'moc_consumer_protection', 'Consumer Protection Regulations', '1.0', '2020-01-01',
   ARRAY['G','I','J'], true),
  ('MOC', 'moc_ecommerce', 'E-Commerce Law & Regulations', '1.0', '2019-10-01',
   ARRAY['G','J'], true),
  ('MOC', 'moc_franchise', 'Franchise Law & Regulations', '1.0', '2020-01-01',
   ARRAY['G','I'], true),

  -- MISA — Investment
  ('MISA', 'misa_foreign_investment', 'Foreign Investment Law', '2.0', '2021-01-01',
   ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','P','Q','R','S'], true),
  ('MISA', 'misa_investment_licensing', 'Investment Licensing Requirements', '1.0', '2022-01-01',
   ARRAY['C','G','H','J','K','M'], true),

  -- MOT — Tourism
  ('MOT', 'mot_tourism', 'Tourism Licensing & Standards', '1.0', '2020-01-01',
   ARRAY['I','N','R'], true),
  ('MOT', 'mot_hospitality', 'Hospitality Classification Standards', '2.0', '2023-01-01',
   ARRAY['I'], true),

  -- REGA — Real Estate
  ('REGA', 'rega_real_estate', 'Real Estate Brokerage & Management Law', '1.0', '2020-01-01',
   ARRAY['L'], true),
  ('REGA', 'rega_off_plan', 'Off-Plan Sales (Wafi) Regulations', '1.0', '2021-01-01',
   ARRAY['F','L'], true),

  -- GASTAT — Statistics
  ('GASTAT', 'gastat_statistical', 'Official Statistics Compliance Standards', '1.0', '2022-01-01',
   ARRAY['O'], true),

  -- NCA — Additional sub-frameworks
  ('NCA', 'NCA_OTCC', 'Operational Technology Cybersecurity Controls', '1.0', '2022-01-01',
   ARRAY['B','C','D','E','H'], true),

  -- SDAIA — Additional frameworks
  ('SDAIA', 'sdaia_aie', 'SDAIA AI Ethics Principles', '1.0', '2023-09-01',
   ARRAY['J','K','O','Q'], true),
  ('SDAIA', 'sdaia_ndg', 'National Data Governance Standards', '1.0', '2023-01-01',
   ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S'], true),

  -- CMA — Additional
  ('CMA', 'cma_cyber', 'CMA Cybersecurity Regulations', '1.0', '2022-01-01', ARRAY['K'], true),
  ('CMA', 'cma_governance', 'Corporate Governance Regulations', '3.0', '2023-01-01', ARRAY['K'], true),
  ('CMA', 'cma_aml', 'CMA Anti-Money Laundering Rules', '2.0', '2022-01-01', ARRAY['K'], true),

  -- CST — Additional
  ('CST', 'cst_crf', 'CST Communications Regulatory Framework', '1.0', '2022-01-01', ARRAY['J'], true),
  ('CST', 'cst_data_localization', 'Data Localization Requirements', '1.0', '2023-01-01', ARRAY['J','K'], true),

  -- SAMA — Additional
  ('SAMA', 'sama_psr', 'SAMA Payment Systems Regulations', '2.0', '2023-01-01', ARRAY['K'], true),
  ('SAMA', 'sama_aml', 'SAMA AML/CFT Compliance Framework', '3.0', '2022-01-01', ARRAY['K'], true),
  ('SAMA', 'sama_fintech', 'SAMA FinTech Regulatory Sandbox', '1.0', '2022-01-01', ARRAY['K'], true),
  ('SAMA', 'sama_insurance', 'Insurance Supervisory Framework', '2.0', '2021-01-01', ARRAY['K'], true),
  ('SAMA', 'sama_open_banking', 'Open Banking Framework', '1.0', '2023-06-01', ARRAY['K'], true)

ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART B: Wire Tier-2 Authorities (from migration 007)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.lookup_authority_frameworks
  (authority_code, framework_code, framework_name, framework_version, issue_date, mandatory_for_sectors, is_active)
VALUES
  -- GACA — Civil Aviation
  ('GACA', 'gaca_aviation_safety', 'Civil Aviation Safety Regulations', '2.0', '2020-01-01', ARRAY['H'], true),
  ('GACA', 'gaca_airworthiness', 'Airworthiness Standards', '1.0', '2019-01-01', ARRAY['H'], true),
  ('GACA', 'gaca_airport_security', 'Airport Security Standards', '1.0', '2021-01-01', ARRAY['H'], true),

  -- PPA — Public Transport
  ('PPA', 'ppa_transport_safety', 'Public Transport Safety Standards', '1.0', '2022-01-01', ARRAY['H'], true),
  ('PPA', 'ppa_logistics', 'Logistics Regulatory Framework', '1.0', '2023-01-01', ARRAY['H'], true),

  -- SPA — Ports Authority (MAWANI)
  ('SPA', 'spa_maritime_safety', 'Maritime Safety & Port Regulations', '1.0', '2021-01-01', ARRAY['H'], true),
  ('SPA', 'spa_customs_clearance', 'Port Customs Clearance Standards', '1.0', '2022-01-01', ARRAY['H'], true),

  -- SRA — Railways
  ('SRA', 'sra_railway_safety', 'Railway Safety & Operations Standards', '1.0', '2020-01-01', ARRAY['H'], true),

  -- ETEC — Education Evaluation
  ('ETEC', 'etec_accreditation', 'Education Accreditation Standards', '2.0', '2021-01-01', ARRAY['P'], true),
  ('ETEC', 'etec_quality', 'Education Quality Assurance Framework', '1.0', '2022-01-01', ARRAY['P'], true),

  -- TVTC — Vocational Training
  ('TVTC', 'tvtc_vocational', 'Vocational Training Standards', '1.0', '2020-01-01', ARRAY['P'], true),

  -- GMA — General Media Authority
  ('GMA', 'gma_media_regulation', 'Media Content Regulation Framework', '1.0', '2021-01-01', ARRAY['J','R'], true),
  ('GMA', 'gma_advertising', 'Advertising Standards & Regulations', '1.0', '2022-01-01', ARRAY['J','R'], true),

  -- GCAM — General Commission for Audiovisual Media
  ('GCAM', 'gcam_audiovisual', 'Audiovisual Content Standards', '1.0', '2021-01-01', ARRAY['J','R'], true),

  -- HCA — Heritage Commission Authority
  ('HCA', 'hca_heritage', 'Cultural Heritage Protection Standards', '1.0', '2022-01-01', ARRAY['R'], true),

  -- MOS — Ministry of Sport
  ('MOS', 'mos_sports', 'Sports Governance & Safety Standards', '1.0', '2022-01-01', ARRAY['R'], true),

  -- KACARE — Atomic & Renewable Energy
  ('KACARE', 'kacare_nuclear', 'Nuclear Energy Safety Standards', '1.0', '2020-01-01', ARRAY['D'], true),
  ('KACARE', 'kacare_renewable', 'Renewable Energy Regulatory Framework', '1.0', '2021-01-01', ARRAY['D'], true),

  -- MINING — Mining Ministry
  ('MINING', 'mining_licensing', 'Mining Licensing & Safety Standards', '1.0', '2021-01-01', ARRAY['B'], true),
  ('MINING', 'mining_environmental', 'Mining Environmental Compliance', '1.0', '2022-01-01', ARRAY['B'], true),

  -- MOHU — Hajj & Umrah
  ('MOHU', 'mohu_services', 'Hajj & Umrah Service Standards', '2.0', '2023-01-01', ARRAY['I','N'], true),
  ('MOHU', 'mohu_safety', 'Pilgrimage Safety & Security', '1.0', '2022-01-01', ARRAY['I','N'], true),

  -- NAZAHA — Anti-Corruption
  ('NAZAHA', 'nazaha_anticorruption', 'Anti-Corruption Compliance Framework', '1.0', '2019-01-01',
   ARRAY['O','K'], true),

  -- HRC — Human Rights Commission
  ('HRC', 'hrc_labor_rights', 'Labor Rights Compliance Standards', '1.0', '2020-01-01',
   ARRAY['N','S'], true),

  -- SSC — Space Commission
  ('SSC', 'ssc_space', 'Space Operations Regulatory Framework', '1.0', '2022-01-01', ARRAY['J'], true),

  -- SIDF — Saudi Industrial Development Fund
  ('SIDF', 'sidf_industrial', 'Industrial Development Compliance', '1.0', '2021-01-01', ARRAY['C'], true),

  -- ADF — Agricultural Development Fund
  ('ADF', 'adf_agricultural', 'Agricultural Finance Compliance', '1.0', '2020-01-01', ARRAY['A'], true),

  -- RCJY — Royal Commission Jubail/Yanbu
  ('RCJY', 'rcjy_industrial_city', 'Industrial City Regulations', '2.0', '2019-01-01', ARRAY['C','D'], true),

  -- NEOM
  ('NEOM', 'neom_development', 'NEOM Development & Operations Standards', '1.0', '2023-01-01',
   ARRAY['F','J','L'], true),

  -- LCGPA — Local Content
  ('LCGPA', 'lcgpa_local_content', 'Local Content & Government Procurement', '2.0', '2022-01-01',
   ARRAY['B','C','F','H','J'], true),

  -- SAIP — Intellectual Property
  ('SAIP', 'saip_ip', 'Intellectual Property Protection Law', '1.0', '2021-01-01',
   ARRAY['C','J','M','R'], true),

  -- TRSDC — Red Sea Tourism
  ('TRSDC', 'trsdc_sustainability', 'Red Sea Sustainability Standards', '1.0', '2023-01-01',
   ARRAY['I','R'], true),

  -- QIDDIYA — Entertainment
  ('QIDDIYA', 'qiddiya_entertainment', 'Entertainment & Leisure Standards', '1.0', '2023-01-01',
   ARRAY['R','I'], true)

ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART C: Ensure lowercase framework_code normalization
-- The resolution service uses lowercase codes from lookup_frameworks,
-- but lookup_authority_frameworks has mixed case from migration 006.
-- Add lowercase aliases for the original entries.
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE public.lookup_authority_frameworks
SET framework_code = LOWER(framework_code)
WHERE framework_code <> LOWER(framework_code);


-- ═══════════════════════════════════════════════════════════════════════════
-- PART D: Ensure all new framework_codes exist in lookup_frameworks
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.lookup_frameworks (framework_code, framework_name, framework_acronym, regulatory_body, jurisdiction, is_active, sort_order)
VALUES
  -- Tier-1 completions
  ('sfda_food_safety',       'SFDA Food Safety Regulations',               'SFDA-FS',     'SFDA',    'KSA', true, 110),
  ('sfda_drug_reg',          'SFDA Drug Registration & Pharmacovigilance', 'SFDA-DR',     'SFDA',    'KSA', true, 111),
  ('sfda_cosmetics',         'SFDA Cosmetics Safety Requirements',         'SFDA-COS',    'SFDA',    'KSA', true, 112),
  ('saso_metrology',         'SASO Metrology & Calibration Standards',     'SASO-MET',    'SASO',    'KSA', true, 113),
  ('saso_halal',             'SASO Halal Certification Standards',         'SASO-HAL',    'SASO',    'KSA', true, 114),
  ('zatca_vat',              'VAT Implementing Regulations',               'ZATCA-VAT',   'ZATCA',   'KSA', true, 115),
  ('zatca_customs',          'Customs Tariff & Classification Rules',      'ZATCA-CUS',   'ZATCA',   'KSA', true, 116),
  ('zatca_excise',           'Excise Tax Regulations',                     'ZATCA-EXC',   'ZATCA',   'KSA', true, 117),
  ('zatca_transfer_pricing', 'Transfer Pricing Guidelines',                'ZATCA-TP',    'ZATCA',   'KSA', true, 118),
  ('zatca_einv',             'ZATCA E-Invoicing Regulations',              'ZATCA-EINV',  'ZATCA',   'KSA', true, 119),
  ('moh_licensing',          'Healthcare Facility Licensing Standards',    'MOH-LIC',     'MOH',     'KSA', true, 120),
  ('moh_telemedicine',       'Telemedicine Regulatory Framework',          'MOH-TELE',    'MOH',     'KSA', true, 121),
  ('moh_pharmacy',           'Pharmacy Practice Regulations',              'MOH-PHAR',    'MOH',     'KSA', true, 122),
  ('gosi_social_insurance',  'Social Insurance Law & Regulations',         'GOSI-SI',     'GOSI',    'KSA', true, 123),
  ('gosi_occupational_hazards','Occupational Hazards Insurance',           'GOSI-OH',     'GOSI',    'KSA', true, 124),
  ('hrsd_labor_law',         'Labor Law & Employment Regulations',         'HRSD-LL',     'HRSD',    'KSA', true, 125),
  ('hrsd_nitaqat',           'Nitaqat (Saudization) Program',              'HRSD-NIT',    'HRSD',    'KSA', true, 126),
  ('hrsd_wage_protection',   'Wage Protection System',                     'HRSD-WPS',    'HRSD',    'KSA', true, 127),
  ('hrsd_wps',               'Worker Protection Standards',                'HRSD-WP',     'HRSD',    'KSA', true, 128),
  ('gac_competition',        'Competition Law & Anti-Monopoly',            'GAC-COMP',    'GAC',     'KSA', true, 129),
  ('gac_merger_control',     'Merger Control & Economic Concentration',    'GAC-MC',      'GAC',     'KSA', true, 130),
  ('mewa_environmental',     'Environmental Protection Standards',         'MEWA-ENV',    'MEWA',    'KSA', true, 131),
  ('mewa_water',             'Water Resource Management Regulations',      'MEWA-WAT',    'MEWA',    'KSA', true, 132),
  ('mewa_agriculture',       'Agricultural Compliance Standards',          'MEWA-AGR',    'MEWA',    'KSA', true, 133),
  ('mewa_waste',             'Waste Management & Recycling Standards',     'MEWA-WST',    'MEWA',    'KSA', true, 134),
  ('moe_electricity',        'Electricity Regulation & Grid Standards',    'MOE-ELEC',    'MOE',     'KSA', true, 135),
  ('moe_gas',                'Gas Sector Regulatory Framework',            'MOE-GAS',     'MOE',     'KSA', true, 136),
  ('moe_renewable',          'Renewable Energy Regulatory Framework',      'MOE-REN',     'MOE',     'KSA', true, 137),
  ('moe_petroleum',          'Petroleum Operations Compliance Standards',  'MOE-PET',     'MOE',     'KSA', true, 138),
  ('moc_companies_law',      'Companies Law',                              'MOC-CL',      'MOC',     'KSA', true, 139),
  ('moc_commercial_registry','Commercial Registration Requirements',      'MOC-CR',      'MOC',     'KSA', true, 140),
  ('moc_consumer_protection','Consumer Protection Regulations',            'MOC-CP',      'MOC',     'KSA', true, 141),
  ('moc_ecommerce',          'E-Commerce Law & Regulations',               'MOC-EC',      'MOC',     'KSA', true, 142),
  ('moc_franchise',          'Franchise Law & Regulations',                'MOC-FR',      'MOC',     'KSA', true, 143),
  ('misa_foreign_investment','Foreign Investment Law',                     'MISA-FI',     'MISA',    'KSA', true, 144),
  ('misa_investment_licensing','Investment Licensing Requirements',        'MISA-IL',     'MISA',    'KSA', true, 145),
  ('mot_tourism',            'Tourism Licensing & Standards',              'MOT-TL',      'MOT',     'KSA', true, 146),
  ('mot_hospitality',        'Hospitality Classification Standards',       'MOT-HC',      'MOT',     'KSA', true, 147),
  ('rega_real_estate',       'Real Estate Brokerage & Management Law',     'REGA-RE',     'REGA',    'KSA', true, 148),
  ('rega_off_plan',          'Off-Plan Sales (Wafi) Regulations',          'REGA-OP',     'REGA',    'KSA', true, 149),
  ('gastat_statistical',     'Official Statistics Compliance Standards',   'GASTAT-ST',   'GASTAT',  'KSA', true, 150),
  ('sdaia_ndg',              'National Data Governance Standards',         'SDAIA-NDG',   'SDAIA',   'KSA', true, 151),
  ('cma_governance',         'Corporate Governance Regulations',           'CMA-CG',      'CMA',     'KSA', true, 152),
  ('cma_aml',                'CMA Anti-Money Laundering Rules',            'CMA-AML',     'CMA',     'KSA', true, 153),
  ('cst_data_localization',  'Data Localization Requirements',             'CST-DL',      'CST',     'KSA', true, 154),
  ('sama_psr',               'SAMA Payment Systems Regulations',           'SAMA-PSR',    'SAMA',    'KSA', true, 155),
  ('sama_aml',               'SAMA AML/CFT Compliance Framework',         'SAMA-AML',    'SAMA',    'KSA', true, 156),
  ('sama_insurance',         'Insurance Supervisory Framework',            'SAMA-INS',    'SAMA',    'KSA', true, 157),
  ('sama_open_banking',      'Open Banking Framework',                     'SAMA-OB',     'SAMA',    'KSA', true, 158),
  -- Tier-2
  ('gaca_aviation_safety',   'Civil Aviation Safety Regulations',          'GACA-AS',     'GACA',    'KSA', true, 200),
  ('gaca_airworthiness',     'Airworthiness Standards',                    'GACA-AW',     'GACA',    'KSA', true, 201),
  ('gaca_airport_security',  'Airport Security Standards',                 'GACA-SEC',    'GACA',    'KSA', true, 202),
  ('ppa_transport_safety',   'Public Transport Safety Standards',          'PPA-TS',      'PPA',     'KSA', true, 203),
  ('ppa_logistics',          'Logistics Regulatory Framework',             'PPA-LOG',     'PPA',     'KSA', true, 204),
  ('spa_maritime_safety',    'Maritime Safety & Port Regulations',         'SPA-MS',      'SPA',     'KSA', true, 205),
  ('spa_customs_clearance',  'Port Customs Clearance Standards',           'SPA-CC',      'SPA',     'KSA', true, 206),
  ('sra_railway_safety',     'Railway Safety & Operations Standards',      'SRA-RS',      'SRA',     'KSA', true, 207),
  ('etec_accreditation',     'Education Accreditation Standards',           'ETEC-ACC',    'ETEC',    'KSA', true, 208),
  ('etec_quality',           'Education Quality Assurance Framework',      'ETEC-QA',     'ETEC',    'KSA', true, 209),
  ('tvtc_vocational',        'Vocational Training Standards',              'TVTC-VT',     'TVTC',    'KSA', true, 210),
  ('gma_media_regulation',   'Media Content Regulation Framework',         'GMA-MR',      'GMA',     'KSA', true, 211),
  ('gma_advertising',        'Advertising Standards & Regulations',        'GMA-AD',      'GMA',     'KSA', true, 212),
  ('gcam_audiovisual',       'Audiovisual Content Standards',              'GCAM-AV',     'GCAM',    'KSA', true, 213),
  ('hca_heritage',           'Cultural Heritage Protection Standards',     'HCA-HP',      'HCA',     'KSA', true, 214),
  ('mos_sports',             'Sports Governance & Safety Standards',        'MOS-SG',      'MOS',     'KSA', true, 215),
  ('kacare_nuclear',         'Nuclear Energy Safety Standards',             'KACARE-NUC',  'KACARE',  'KSA', true, 216),
  ('kacare_renewable',       'Renewable Energy Regulatory Framework',      'KACARE-REN',  'KACARE',  'KSA', true, 217),
  ('mining_licensing',       'Mining Licensing & Safety Standards',         'MINING-LS',   'MINING',  'KSA', true, 218),
  ('mining_environmental',   'Mining Environmental Compliance',            'MINING-ENV',  'MINING',  'KSA', true, 219),
  ('mohu_services',          'Hajj & Umrah Service Standards',             'MOHU-SVC',    'MOHU',    'KSA', true, 220),
  ('mohu_safety',            'Pilgrimage Safety & Security',               'MOHU-SAF',    'MOHU',    'KSA', true, 221),
  ('nazaha_anticorruption',  'Anti-Corruption Compliance Framework',       'NAZ-AC',      'NAZAHA',  'KSA', true, 222),
  ('hrc_labor_rights',       'Labor Rights Compliance Standards',          'HRC-LR',      'HRC',     'KSA', true, 223),
  ('ssc_space',              'Space Operations Regulatory Framework',      'SSC-SP',      'SSC',     'KSA', true, 224),
  ('sidf_industrial',        'Industrial Development Compliance',          'SIDF-ID',     'SIDF',    'KSA', true, 225),
  ('adf_agricultural',       'Agricultural Finance Compliance',            'ADF-AF',      'ADF',     'KSA', true, 226),
  ('rcjy_industrial_city',   'Industrial City Regulations',                'RCJY-IC',     'RCJY',    'KSA', true, 227),
  ('neom_development',       'NEOM Development & Operations Standards',    'NEOM-DEV',    'NEOM',    'KSA', true, 228),
  ('lcgpa_local_content',    'Local Content & Government Procurement',     'LCGPA-LC',    'LCGPA',   'KSA', true, 229),
  ('saip_ip',                'Intellectual Property Protection Law',        'SAIP-IP',     'SAIP',    'KSA', true, 230),
  ('trsdc_sustainability',   'Red Sea Sustainability Standards',           'TRSDC-SUS',   'TRSDC',   'KSA', true, 231),
  ('qiddiya_entertainment',  'Entertainment & Leisure Standards',          'QID-ENT',     'QIDDIYA', 'KSA', true, 232)
ON CONFLICT (framework_code) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART E: Add framework_alias entries for new frameworks
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.framework_alias (alias_code, framework_code) VALUES
  ('INST-KSA-SFDA-FS',     'sfda_food_safety'),
  ('INST-KSA-SFDA-DR',     'sfda_drug_reg'),
  ('INST-KSA-SFDA-MDS',    'sfda_mds'),
  ('INST-KSA-SFDA-COS',    'sfda_cosmetics'),
  ('INST-KSA-SASO-PS',     'saso_product'),
  ('INST-KSA-SASO-MET',    'saso_metrology'),
  ('INST-KSA-SASO-HAL',    'saso_halal'),
  ('INST-KSA-ZATCA-VAT',   'zatca_vat'),
  ('INST-KSA-ZATCA-CUS',   'zatca_customs'),
  ('INST-KSA-ZATCA-EXC',   'zatca_excise'),
  ('INST-KSA-ZATCA-TP',    'zatca_transfer_pricing'),
  ('INST-KSA-MOH-HIS',     'moh_his'),
  ('INST-KSA-MOH-LIC',     'moh_licensing'),
  ('INST-KSA-MOH-TELE',    'moh_telemedicine'),
  ('INST-KSA-MOH-PHAR',    'moh_pharmacy'),
  ('INST-KSA-GOSI-SI',     'gosi_social_insurance'),
  ('INST-KSA-GOSI-OH',     'gosi_occupational_hazards'),
  ('INST-KSA-HRSD-LL',     'hrsd_labor_law'),
  ('INST-KSA-HRSD-NIT',    'hrsd_nitaqat'),
  ('INST-KSA-HRSD-WPS',    'hrsd_wage_protection'),
  ('INST-KSA-HRSD-WP',     'hrsd_wps'),
  ('INST-KSA-GAC-COMP',    'gac_competition'),
  ('INST-KSA-GAC-MC',      'gac_merger_control'),
  ('INST-KSA-MEWA-ENV',    'mewa_environmental'),
  ('INST-KSA-MEWA-WAT',    'mewa_water'),
  ('INST-KSA-MEWA-AGR',    'mewa_agriculture'),
  ('INST-KSA-MEWA-WST',    'mewa_waste'),
  ('INST-KSA-MOE-ELEC',    'moe_electricity'),
  ('INST-KSA-MOE-GAS',     'moe_gas'),
  ('INST-KSA-MOE-REN',     'moe_renewable'),
  ('INST-KSA-MOE-PET',     'moe_petroleum'),
  ('INST-KSA-MOC-CL',      'moc_companies_law'),
  ('INST-KSA-MOC-CR',      'moc_commercial_registry'),
  ('INST-KSA-MOC-CP',      'moc_consumer_protection'),
  ('INST-KSA-MOC-EC',      'moc_ecommerce'),
  ('INST-KSA-MOC-FR',      'moc_franchise'),
  ('INST-KSA-MISA-FI',     'misa_foreign_investment'),
  ('INST-KSA-MISA-IL',     'misa_investment_licensing'),
  ('INST-KSA-MOT-TL',      'mot_tourism'),
  ('INST-KSA-MOT-HC',      'mot_hospitality'),
  ('INST-KSA-REGA-RE',     'rega_real_estate'),
  ('INST-KSA-REGA-OP',     'rega_off_plan'),
  ('INST-KSA-GASTAT-ST',   'gastat_statistical'),
  ('INST-KSA-SDAIA-NDG',   'sdaia_ndg'),
  ('INST-KSA-CMA-GOV',     'cma_governance'),
  ('INST-KSA-CMA-AML',     'cma_aml'),
  ('INST-KSA-CST-DL',      'cst_data_localization'),
  ('INST-KSA-SAMA-PSR',    'sama_psr'),
  ('INST-KSA-SAMA-AML',    'sama_aml'),
  ('INST-KSA-SAMA-INS',    'sama_insurance'),
  ('INST-KSA-SAMA-OB',     'sama_open_banking'),
  ('INST-KSA-GACA-AS',     'gaca_aviation_safety'),
  ('INST-KSA-GACA-AW',     'gaca_airworthiness'),
  ('INST-KSA-GACA-SEC',    'gaca_airport_security'),
  ('INST-KSA-PPA-TS',      'ppa_transport_safety'),
  ('INST-KSA-PPA-LOG',     'ppa_logistics'),
  ('INST-KSA-SPA-MS',      'spa_maritime_safety'),
  ('INST-KSA-SPA-CC',      'spa_customs_clearance'),
  ('INST-KSA-SRA-RS',      'sra_railway_safety'),
  ('INST-KSA-ETEC-ACC',    'etec_accreditation'),
  ('INST-KSA-ETEC-QA',     'etec_quality'),
  ('INST-KSA-TVTC-VT',     'tvtc_vocational'),
  ('INST-KSA-GMA-MR',      'gma_media_regulation'),
  ('INST-KSA-GMA-AD',      'gma_advertising'),
  ('INST-KSA-GCAM-AV',     'gcam_audiovisual'),
  ('INST-KSA-HCA-HP',      'hca_heritage'),
  ('INST-KSA-MOS-SG',      'mos_sports'),
  ('INST-KSA-KACARE-NUC',  'kacare_nuclear'),
  ('INST-KSA-KACARE-REN',  'kacare_renewable'),
  ('INST-KSA-MINING-LS',   'mining_licensing'),
  ('INST-KSA-MINING-ENV',  'mining_environmental'),
  ('INST-KSA-MOHU-SVC',    'mohu_services'),
  ('INST-KSA-MOHU-SAF',    'mohu_safety'),
  ('INST-KSA-NAZ-AC',      'nazaha_anticorruption'),
  ('INST-KSA-HRC-LR',      'hrc_labor_rights'),
  ('INST-KSA-SSC-SP',      'ssc_space'),
  ('INST-KSA-SIDF-ID',     'sidf_industrial'),
  ('INST-KSA-ADF-AF',      'adf_agricultural'),
  ('INST-KSA-RCJY-IC',     'rcjy_industrial_city'),
  ('INST-KSA-NEOM-DEV',    'neom_development'),
  ('INST-KSA-LCGPA-LC',    'lcgpa_local_content'),
  ('INST-KSA-SAIP-IP',     'saip_ip'),
  ('INST-KSA-TRSDC-SUS',   'trsdc_sustainability'),
  ('INST-KSA-QID-ENT',     'qiddiya_entertainment')
ON CONFLICT (alias_code) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  'Migration 032 Complete' AS status,
  (SELECT COUNT(*) FROM public.lookup_authority_frameworks WHERE is_active) AS total_frameworks,
  (SELECT COUNT(DISTINCT authority_code) FROM public.lookup_authority_frameworks WHERE is_active) AS wired_authorities,
  (SELECT COUNT(*) FROM public.lookup_frameworks WHERE is_active) AS catalog_frameworks,
  (SELECT COUNT(*) FROM public.framework_alias) AS alias_count;

COMMIT;
