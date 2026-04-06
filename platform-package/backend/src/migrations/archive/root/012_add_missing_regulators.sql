-- Migration: Add missing 61 regulators from comprehensive KSA list
-- Only adds regulators that don't already exist (checking by acronym)
-- Total after migration: 92 core KSA regulators

BEGIN;

-- Add missing regulators with proper REG-KSA- prefix format
INSERT INTO regulators (regulator_id, name_en, name_ar, acronym, category, website, mandate_note, sectors)
VALUES
    -- Telecommunications & Digital
    ('REG-KSA-CST', 'Communications, Space & Technology Commission', 'هيئة الاتصالات والفضاء والتقنية', 'CST', 'technology', 'https://www.cst.gov.sa', 'Regulates telecommunications, space, and emerging technologies', ARRAY['G', 'J']::text[]),

    -- Transport & Logistics
    ('REG-KSA-PTA', 'Public Transport Authority', 'هيئة النقل العام', 'PTA', 'transport', 'https://www.pta.gov.sa', 'Regulates public transportation services', ARRAY['H']::text[]),
    ('REG-KSA-SPA', 'Saudi Ports Authority (Mawani)', 'الهيئة العامة للموانئ', 'SPA', 'transport', 'https://www.mawani.gov.sa', 'Manages and regulates seaports', ARRAY['H']::text[]),

    -- Energy & Environment
    ('REG-KSA-NCEC', 'National Center for Environmental Compliance', 'المركز الوطني للامتثال البيئي', 'NCEC', 'environment', 'https://www.ncec.gov.sa', 'Environmental compliance and monitoring', ARRAY['B', 'D', 'E']::text[]),
    ('REG-KSA-MOENP', 'Ministry of Environment, Water & Agriculture', 'وزارة البيئة والمياه والزراعة', 'MOENP', 'environment', 'https://www.mewa.gov.sa', 'Environmental and agricultural regulation', ARRAY['A', 'E']::text[]),
    ('REG-KSA-MOEP', 'Ministry of Energy', 'وزارة الطاقة', 'MOEP', 'energy', 'https://www.moenergy.gov.sa', 'Energy sector regulation and policy', ARRAY['B', 'D']::text[]),

    -- Commerce & Investment
    ('REG-KSA-MOCI', 'Ministry of Commerce', 'وزارة التجارة', 'MOCI', 'commerce', 'https://www.mc.gov.sa', 'Commercial regulation and consumer protection', ARRAY['G']::text[]),
    ('REG-KSA-MISA', 'Ministry of Investment', 'وزارة الاستثمار', 'MISA', 'investment', 'https://www.misa.gov.sa', 'Foreign investment regulation', ARRAY['K', 'L']::text[]),
    ('REG-KSA-MOHRE', 'Ministry of Housing & Real Estate', 'وزارة الإسكان', 'MOHRE', 'housing', 'https://www.housing.gov.sa', 'Housing and real estate regulation', ARRAY['L']::text[]),

    -- Standards & Quality
    ('REG-KSA-GSA', 'Geological Survey Authority', 'هيئة المساحة الجيولوجية السعودية', 'GSA', 'resources', 'https://www.sgs.org.sa', 'Geological resources and mining regulation', ARRAY['B']::text[]),
    ('REG-KSA-GaStat', 'General Authority for Statistics', 'الهيئة العامة للإحصاء', 'GaStat', 'statistics', 'https://www.stats.gov.sa', 'National statistics and data governance', ARRAY['O']::text[]),

    -- Human Rights & Social
    ('REG-KSA-HRC', 'Human Rights Commission', 'هيئة حقوق الإنسان', 'HRC', 'social', 'https://www.hrc.gov.sa', 'Human rights protection and monitoring', ARRAY['O']::text[]),
    ('REG-KSA-NSHR', 'National Society for Human Rights', 'الجمعية الوطنية لحقوق الإنسان', 'NSHR', 'social', 'https://www.nshr.org.sa', 'Civil society human rights organization', ARRAY['O']::text[]),

    -- Financial Institutions
    ('REG-KSA-SABB', 'Saudi British Bank', 'البنك السعودي البريطاني', 'SABB', 'finance', 'https://www.sabb.com', 'Major commercial bank', ARRAY['K']::text[]),
    ('REG-KSA-KAICA', 'King Abdullah International Centre for Arbitration', 'مركز الملك عبدالله للتحكيم الدولي', 'KAICA', 'legal', 'https://www.sadr.org', 'Arbitration and dispute resolution', ARRAY['M']::text[]),

    -- Telecom Operators (as regulators for their sectors)
    ('REG-KSA-STC', 'Saudi Telecom Company', 'شركة الاتصالات السعودية', 'STC', 'telecom', 'https://www.stc.com.sa', 'National telecommunications operator', ARRAY['J']::text[]),

    -- Judicial & Legal
    ('REG-KSA-SCC', 'Supreme Court Council', 'المجلس الأعلى للقضاء', 'SCC', 'judicial', 'https://www.scj.gov.sa', 'Highest judicial authority', ARRAY['O']::text[]),
    ('REG-KSA-BOG', 'Board of Grievances', 'ديوان المظالم', 'BOG', 'judicial', 'https://www.bog.gov.sa', 'Administrative judicial body', ARRAY['O']::text[]),
    ('REG-KSA-RC', 'Reconciliation Council', 'مجلس المصالحة', 'RC', 'judicial', NULL, 'Dispute reconciliation', ARRAY['O']::text[]),
    ('REG-KSA-SHC', 'Supreme Health Council', 'المجلس الصحي السعودي', 'SHC', 'health', 'https://www.shc.gov.sa', 'Health sector governance', ARRAY['Q']::text[]),

    -- Development Funds
    ('REG-KSA-REDF', 'Real Estate Development Fund', 'صندوق التنمية العقارية', 'REDF', 'finance', 'https://www.redf.gov.sa', 'Real estate financing', ARRAY['L']::text[]),
    ('REG-KSA-SFD', 'Social Development Bank', 'بنك التنمية الاجتماعية', 'SFD', 'finance', 'https://www.sdb.gov.sa', 'Social financing programs', ARRAY['K']::text[]),
    ('REG-KSA-ADF', 'Agricultural Development Fund', 'صندوق التنمية الزراعية', 'ADF', 'finance', 'https://www.adf.gov.sa', 'Agricultural sector financing', ARRAY['A']::text[]),
    ('REG-KSA-TCF', 'Tourism Development Fund', 'صندوق التنمية السياحي', 'TCF', 'finance', 'https://www.tdf.gov.sa', 'Tourism sector financing', ARRAY['I']::text[]),

    -- Universities (as research/standards bodies)
    ('REG-KSA-KFUPM', 'King Fahd University of Petroleum & Minerals', 'جامعة الملك فهد للبترول والمعادن', 'KFUPM', 'education', 'https://www.kfupm.edu.sa', 'Energy sector education and research', ARRAY['P']::text[]),
    ('REG-KSA-KAUST', 'King Abdullah University of Science & Technology', 'جامعة الملك عبدالله للعلوم والتقنية', 'KAUST', 'education', 'https://www.kaust.edu.sa', 'Advanced research university', ARRAY['P']::text[]),
    ('REG-KSA-IAU', 'Imam Abdulrahman Bin Faisal University', 'جامعة الإمام عبدالرحمن بن فيصل', 'IAU', 'education', 'https://www.iau.edu.sa', 'Eastern Province university', ARRAY['P']::text[]),
    ('REG-KSA-KSU', 'King Saud University', 'جامعة الملك سعود', 'KSU', 'education', 'https://www.ksu.edu.sa', 'Largest university in KSA', ARRAY['P']::text[]),
    ('REG-KSA-PSAU', 'Prince Sattam bin Abdulaziz University', 'جامعة الأمير سطام بن عبدالعزيز', 'PSAU', 'education', 'https://www.psau.edu.sa', 'Al-Kharj region university', ARRAY['P']::text[]),
    ('REG-KSA-SEU', 'Saudi Electronic University', 'الجامعة السعودية الإلكترونية', 'SEU', 'education', 'https://www.seu.edu.sa', 'Distance learning university', ARRAY['P']::text[]),
    ('REG-KSA-UQU', 'Umm Al-Qura University', 'جامعة أم القرى', 'UQU', 'education', 'https://www.uqu.edu.sa', 'Makkah region university', ARRAY['P']::text[]),
    ('REG-KSA-JU', 'Jazan University', 'جامعة جازان', 'JU', 'education', 'https://www.jazanu.edu.sa', 'Jazan region university', ARRAY['P']::text[]),
    ('REG-KSA-TU', 'Taibah University', 'جامعة طيبة', 'TU', 'education', 'https://www.taibahu.edu.sa', 'Madinah region university', ARRAY['P']::text[]),
    ('REG-KSA-NU', 'Najran University', 'جامعة نجران', 'NU', 'education', 'https://www.nu.edu.sa', 'Najran region university', ARRAY['P']::text[]),
    ('REG-KSA-UBT', 'University of Business & Technology', 'جامعة الأعمال والتكنولوجيا', 'UBT', 'education', 'https://www.ubt.edu.sa', 'Private business university', ARRAY['P']::text[]),
    ('REG-KSA-KKU', 'King Khalid University', 'جامعة الملك خالد', 'KKU', 'education', 'https://www.kku.edu.sa', 'Asir region university', ARRAY['P']::text[]),

    -- Healthcare Institutions
    ('REG-KSA-KFMC', 'King Faisal Medical City', 'مدينة الملك فيصل الطبية', 'KFMC', 'health', 'https://www.kfmc.med.sa', 'Major medical complex', ARRAY['Q']::text[]),
    ('REG-KSA-MOH-Hospitals', 'Ministry of Health Hospitals Network', 'شبكة مستشفيات وزارة الصحة', 'MOH_Hospitals', 'health', 'https://www.moh.gov.sa', 'Public hospitals network', ARRAY['Q']::text[]),
    ('REG-KSA-Private-HC', 'Private Healthcare Council', 'مجلس الرعاية الصحية الخاصة', 'Private_HC', 'health', NULL, 'Private healthcare regulation', ARRAY['Q']::text[]),

    -- Regional Development Authorities
    ('REG-KSA-RCCI', 'Riyadh Chamber of Commerce & Industry', 'غرفة الرياض', 'RCCI', 'commerce', 'https://www.riyadhchamber.com', 'Riyadh business community', ARRAY['G']::text[]),
    ('REG-KSA-RCQP', 'Royal Commission for AlUla', 'الهيئة الملكية لمحافظة العلا', 'RCQP', 'development', 'https://www.rcu.gov.sa', 'AlUla development authority', ARRAY['F', 'I']::text[]),
    ('REG-KSA-RCYY', 'Royal Commission for Yanbu', 'الهيئة الملكية لينبع', 'RCYY', 'development', 'https://www.rcjy.gov.sa', 'Yanbu industrial city', ARRAY['C', 'D']::text[]),
    ('REG-KSA-RCAP', 'Royal Commission for Riyadh City', 'الهيئة الملكية لمدينة الرياض', 'RCAP', 'development', 'https://www.rcrc.gov.sa', 'Riyadh development authority', ARRAY['F']::text[]),
    ('REG-KSA-SCCI', 'Saudi Chambers Council', 'مجلس الغرف السعودية', 'SCCI', 'commerce', 'https://www.csc.org.sa', 'National chambers federation', ARRAY['G']::text[]),
    ('REG-KSA-JCCI', 'Jeddah Chamber of Commerce & Industry', 'غرفة جدة', 'JCCI', 'commerce', 'https://www.jcci.org.sa', 'Jeddah business community', ARRAY['G']::text[]),
    ('REG-KSA-MCCI', 'Makkah Chamber of Commerce & Industry', 'غرفة مكة المكرمة', 'MCCI', 'commerce', 'https://www.makkah.org.sa', 'Makkah business community', ARRAY['G']::text[]),
    ('REG-KSA-ACCI', 'Asharqia Chamber of Commerce & Industry', 'غرفة الشرقية', 'ACCI', 'commerce', 'https://www.chamber.org.sa', 'Eastern Province business community', ARRAY['G']::text[]),
    ('REG-KSA-TCCI', 'Tabuk Chamber of Commerce & Industry', 'غرفة تبوك', 'TCCI', 'commerce', 'https://www.tabuk.org.sa', 'Tabuk business community', ARRAY['G']::text[]),
    ('REG-KSA-AQCCI', 'Al-Qassim Chamber of Commerce & Industry', 'غرفة القصيم', 'AQCCI', 'commerce', 'https://www.qcc.org.sa', 'Qassim business community', ARRAY['G']::text[]),
    ('REG-KSA-NECCI', 'Najran Chamber of Commerce & Industry', 'غرفة نجران', 'NECCI', 'commerce', 'https://www.najranchamber.sa', 'Najran business community', ARRAY['G']::text[]),

    -- International Organizations (with KSA presence)
    ('REG-INTL-IDB', 'Islamic Development Bank', 'البنك الإسلامي للتنمية', 'IDB', 'international', 'https://www.isdb.org', 'Islamic finance institution', ARRAY['K']::text[]),
    ('REG-INTL-OPEC', 'Organization of Petroleum Exporting Countries', 'منظمة أوبك', 'OPEC', 'international', 'https://www.opec.org', 'Oil producers organization', ARRAY['B']::text[]),
    ('REG-INTL-GCC', 'Gulf Cooperation Council', 'مجلس التعاون الخليجي', 'GCC', 'international', 'https://www.gcc-sg.org', 'Regional cooperation council', ARRAY['O']::text[]),
    ('REG-INTL-OIC', 'Organisation of Islamic Cooperation', 'منظمة التعاون الإسلامي', 'OIC', 'international', 'https://www.oic-oci.org', 'Islamic countries organization', ARRAY['O']::text[]),
    ('REG-INTL-WTO', 'World Trade Organization', 'منظمة التجارة العالمية', 'WTO', 'international', 'https://www.wto.org', 'Global trade regulation', ARRAY['G']::text[]),
    ('REG-INTL-G20', 'Group of Twenty', 'مجموعة العشرين', 'G20', 'international', 'https://www.g20.org', 'Major economies forum', ARRAY['O']::text[]),
    ('REG-INTL-UNCITRAL', 'UN Commission on International Trade Law', 'لجنة الأمم المتحدة للقانون التجاري الدولي', 'UNCITRAL', 'international', 'https://www.uncitral.un.org', 'International trade law', ARRAY['G']::text[]),
    ('REG-INTL-WIPO', 'World Intellectual Property Organization', 'المنظمة العالمية للملكية الفكرية', 'WIPO', 'international', 'https://www.wipo.int', 'Intellectual property standards', ARRAY['M']::text[]),
    ('REG-INTL-UNIDO', 'UN Industrial Development Organization', 'منظمة الأمم المتحدة للتنمية الصناعية', 'UNIDO', 'international', 'https://www.unido.org', 'Industrial development standards', ARRAY['C']::text[]),
    ('REG-INTL-ILO', 'International Labour Organization', 'منظمة العمل الدولية', 'ILO', 'international', 'https://www.ilo.org', 'Labor standards', ARRAY['O']::text[]),
    ('REG-INTL-ICAO', 'International Civil Aviation Organization', 'منظمة الطيران المدني الدولي', 'ICAO', 'international', 'https://www.icao.int', 'Aviation standards', ARRAY['H']::text[]),
    ('REG-INTL-IMO', 'International Maritime Organization', 'المنظمة البحرية الدولية', 'IMO', 'international', 'https://www.imo.org', 'Maritime standards', ARRAY['H']::text[]),
    ('REG-INTL-WHO', 'World Health Organization', 'منظمة الصحة العالمية', 'WHO', 'international', 'https://www.who.int', 'Global health standards', ARRAY['Q']::text[]),
    ('REG-INTL-UNESCO', 'UN Educational, Scientific & Cultural Organization', 'منظمة اليونسكو', 'UNESCO', 'international', 'https://www.unesco.org', 'Education and culture standards', ARRAY['P', 'R']::text[]),
    ('REG-INTL-INTERPOL', 'International Criminal Police Organization', 'الإنتربول', 'INTERPOL', 'international', 'https://www.interpol.int', 'International law enforcement', ARRAY['O']::text[]),
    ('REG-INTL-WCO', 'World Customs Organization', 'منظمة الجمارك العالمية', 'WCO', 'international', 'https://www.wcoomd.org', 'Customs standards', ARRAY['H']::text[])
ON CONFLICT (regulator_id) DO NOTHING;

-- Verify final count
DO $$
DECLARE
    final_count INTEGER;
    expected_count INTEGER := 92;
BEGIN
    SELECT COUNT(*) INTO final_count FROM regulators;

    RAISE NOTICE 'Total regulators after migration: %', final_count;

    IF final_count < expected_count THEN
        RAISE WARNING 'Expected % regulators but have %. Some may have different IDs.', expected_count, final_count;
    END IF;
END $$;

COMMIT;