-- Create country-framework cascade system for onboarding
-- When a user selects their country, they only see relevant frameworks

BEGIN;

-- 1. Create country-regulator mapping table
CREATE TABLE IF NOT EXISTS country_regulators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code VARCHAR(3) NOT NULL REFERENCES lookup_countries(country_code_3),
    regulator_id VARCHAR(50) NOT NULL REFERENCES regulators(regulator_id),
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(country_code, regulator_id)
);

CREATE INDEX idx_country_regulators_country ON country_regulators(country_code);
CREATE INDEX idx_country_regulators_regulator ON country_regulators(regulator_id);

-- 2. Populate country-regulator mappings based on regulator_id patterns
INSERT INTO country_regulators (country_code, regulator_id, is_primary)
SELECT DISTINCT
    CASE
        -- Saudi Arabia
        WHEN r.regulator_id LIKE 'REG-KSA-%' THEN 'SAU'
        -- UAE
        WHEN r.regulator_id LIKE 'REG-UAE-%' THEN 'ARE'
        -- USA
        WHEN r.regulator_id LIKE 'REG-USA-%' THEN 'USA'
        -- UK
        WHEN r.regulator_id LIKE 'REG-UK-%' OR r.regulator_id LIKE 'REG-GBR-%' THEN 'GBR'
        -- Egypt
        WHEN r.regulator_id LIKE 'REG-EGY-%' THEN 'EGY'
        -- China
        WHEN r.regulator_id LIKE 'REG-CHN-%' THEN 'CHN'
        -- Japan
        WHEN r.regulator_id LIKE 'REG-JPN-%' THEN 'JPN'
        -- India
        WHEN r.regulator_id LIKE 'REG-IND-%' THEN 'IND'
        -- Canada
        WHEN r.regulator_id LIKE 'REG-CAN-%' THEN 'CAN'
        -- Australia
        WHEN r.regulator_id LIKE 'REG-AUS-%' THEN 'AUS'
        -- Singapore
        WHEN r.regulator_id LIKE 'REG-SGP-%' THEN 'SGP'
        -- Hong Kong
        WHEN r.regulator_id LIKE 'REG-HKG-%' THEN 'HKX'
        -- Switzerland
        WHEN r.regulator_id LIKE 'REG-CHE-%' THEN 'CHE'
        -- Germany
        WHEN r.regulator_id LIKE 'REG-DEU-%' THEN 'DEU'
        -- France
        WHEN r.regulator_id LIKE 'REG-FRA-%' THEN 'FRA'
        -- Bahrain
        WHEN r.regulator_id LIKE 'REG-BH-%' OR r.regulator_id LIKE 'REG-BHR-%' THEN 'BHR'
        -- Kuwait
        WHEN r.regulator_id LIKE 'REG-KW-%' OR r.regulator_id LIKE 'REG-KWT-%' THEN 'KWT'
        -- Qatar
        WHEN r.regulator_id LIKE 'REG-QA-%' OR r.regulator_id LIKE 'REG-QAT-%' THEN 'QAT'
        -- Oman
        WHEN r.regulator_id LIKE 'REG-OM-%' OR r.regulator_id LIKE 'REG-OMN-%' THEN 'OMN'
        -- Jordan
        WHEN r.regulator_id LIKE 'REG-JO-%' OR r.regulator_id LIKE 'REG-JOR-%' THEN 'JOR'
        -- Turkey
        WHEN r.regulator_id LIKE 'REG-TR-%' OR r.regulator_id LIKE 'REG-TUR-%' THEN 'TUR'
        ELSE NULL
    END as country_code,
    r.regulator_id,
    CASE
        -- Mark primary regulators for each country
        WHEN r.regulator_id IN ('REG-KSA-NCA', 'REG-KSA-SAMA', 'REG-KSA-CMA', 'REG-KSA-ZATCA') THEN TRUE
        WHEN r.regulator_id IN ('REG-UAE-CBUAE', 'REG-UAE-SCA') THEN TRUE
        WHEN r.regulator_id IN ('REG-USA-SEC', 'REG-USA-CISA') THEN TRUE
        ELSE FALSE
    END as is_primary
FROM regulators r
WHERE r.regulator_id LIKE 'REG-%--%'
  AND EXISTS (
    SELECT 1 FROM lookup_countries c
    WHERE c.country_code_3 = CASE
        WHEN r.regulator_id LIKE 'REG-KSA-%' THEN 'SAU'
        WHEN r.regulator_id LIKE 'REG-UAE-%' THEN 'ARE'
        WHEN r.regulator_id LIKE 'REG-USA-%' THEN 'USA'
        WHEN r.regulator_id LIKE 'REG-UK-%' OR r.regulator_id LIKE 'REG-GBR-%' THEN 'GBR'
        WHEN r.regulator_id LIKE 'REG-EGY-%' THEN 'EGY'
        WHEN r.regulator_id LIKE 'REG-CHN-%' THEN 'CHN'
        WHEN r.regulator_id LIKE 'REG-JPN-%' THEN 'JPN'
        WHEN r.regulator_id LIKE 'REG-IND-%' THEN 'IND'
        WHEN r.regulator_id LIKE 'REG-CAN-%' THEN 'CAN'
        WHEN r.regulator_id LIKE 'REG-AUS-%' THEN 'AUS'
        WHEN r.regulator_id LIKE 'REG-SGP-%' THEN 'SGP'
        WHEN r.regulator_id LIKE 'REG-HKG-%' THEN 'HKX'
        WHEN r.regulator_id LIKE 'REG-CHE-%' THEN 'CHE'
        WHEN r.regulator_id LIKE 'REG-DEU-%' THEN 'DEU'
        WHEN r.regulator_id LIKE 'REG-FRA-%' THEN 'FRA'
        WHEN r.regulator_id LIKE 'REG-BH-%' OR r.regulator_id LIKE 'REG-BHR-%' THEN 'BHR'
        WHEN r.regulator_id LIKE 'REG-KW-%' OR r.regulator_id LIKE 'REG-KWT-%' THEN 'KWT'
        WHEN r.regulator_id LIKE 'REG-QA-%' OR r.regulator_id LIKE 'REG-QAT-%' THEN 'QAT'
        WHEN r.regulator_id LIKE 'REG-OM-%' OR r.regulator_id LIKE 'REG-OMN-%' THEN 'OMN'
        WHEN r.regulator_id LIKE 'REG-JO-%' OR r.regulator_id LIKE 'REG-JOR-%' THEN 'JOR'
        WHEN r.regulator_id LIKE 'REG-TR-%' OR r.regulator_id LIKE 'REG-TUR-%' THEN 'TUR'
        ELSE NULL
    END
  )
ON CONFLICT (country_code, regulator_id) DO NOTHING;

-- 3. Add international/global regulators to all countries
INSERT INTO country_regulators (country_code, regulator_id, is_primary)
SELECT
    c.country_code_3,
    r.regulator_id,
    FALSE
FROM lookup_countries c
CROSS JOIN regulators r
WHERE r.regulator_id LIKE 'REG-INTL-%'
   OR r.regulator_id IN ('REG-GLB-ISO', 'REG-GLB-NIST', 'REG-GLB-PCI')
ON CONFLICT (country_code, regulator_id) DO NOTHING;

-- 4. Create view for country-specific frameworks
CREATE OR REPLACE VIEW country_frameworks AS
SELECT DISTINCT
    c.country_code_3 as country_code,
    c.name_en as country_name,
    c.flag_emoji,
    rf.framework_code,
    rf.framework_name_en,
    rf.framework_name_ar,
    rf.framework_type,
    lra.authority_code,
    lra.authority_name_en as regulator_name,
    cr.is_primary as is_primary_regulator,
    -- Determine if framework is mandatory in this country
    CASE
        WHEN c.country_code_3 = 'SAU' AND rf.framework_code IN ('NCA-ECC', 'SAMA-CSF', 'PDPL') THEN TRUE
        WHEN c.country_code_3 = 'ARE' AND rf.framework_code IN ('UAE-IA', 'NESA') THEN TRUE
        WHEN c.country_code_3 = 'USA' AND rf.framework_code IN ('SOX', 'HIPAA', 'PCI-DSS') THEN TRUE
        ELSE FALSE
    END as is_mandatory
FROM lookup_countries c
JOIN country_regulators cr ON cr.country_code = c.country_code_3
JOIN regulators r ON r.regulator_id = cr.regulator_id
JOIN lookup_ksa_regulatory_authorities lra ON lra.authority_code =
    CASE
        WHEN r.acronym IS NOT NULL THEN r.acronym
        ELSE SUBSTRING(r.regulator_id FROM 'REG-[^-]+-(.*)$')
    END
LEFT JOIN regulatory_frameworks rf ON rf.authority_code = lra.authority_code
WHERE rf.framework_code IS NOT NULL
  AND c.is_active = TRUE
  AND cr.is_active = TRUE;

-- 5. Create function to get frameworks for a country
CREATE OR REPLACE FUNCTION get_country_frameworks(p_country_code VARCHAR(3))
RETURNS TABLE (
    framework_code VARCHAR(50),
    framework_name_en VARCHAR(255),
    framework_name_ar VARCHAR(255),
    framework_type VARCHAR(50),
    regulator_name VARCHAR(255),
    is_mandatory BOOLEAN,
    total_controls BIGINT,
    applicability_note TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        cf.framework_code,
        cf.framework_name_en,
        cf.framework_name_ar,
        cf.framework_type,
        cf.regulator_name,
        cf.is_mandatory,
        COUNT(DISTINCT rc.id) as total_controls,
        CASE
            WHEN cf.is_mandatory THEN 'Mandatory compliance required'
            WHEN cf.framework_code LIKE 'ISO%' THEN 'International standard - recommended'
            WHEN cf.framework_code LIKE 'NIST%' THEN 'Best practice framework'
            ELSE 'Industry-specific compliance'
        END as applicability_note
    FROM country_frameworks cf
    LEFT JOIN framework_versions fv ON fv.framework_code = cf.framework_code
    LEFT JOIN control_domains cd ON cd.version_id = fv.id
    LEFT JOIN regulatory_controls rc ON rc.domain_id = cd.id
    WHERE cf.country_code = p_country_code
    GROUP BY cf.framework_code, cf.framework_name_en, cf.framework_name_ar,
             cf.framework_type, cf.regulator_name, cf.is_mandatory
    ORDER BY cf.is_mandatory DESC, cf.framework_name_en;
END;
$$ LANGUAGE plpgsql;

-- 6. Create cascade table for onboarding
CREATE TABLE IF NOT EXISTS onboarding_country_framework_cascade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code VARCHAR(3) NOT NULL REFERENCES lookup_countries(country_code_3),
    framework_code VARCHAR(50) NOT NULL REFERENCES regulatory_frameworks(framework_code),
    is_mandatory BOOLEAN DEFAULT FALSE,
    is_recommended BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 999,
    applicability_sectors TEXT[], -- Which sectors this applies to
    min_employee_count INTEGER, -- Minimum company size
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(country_code, framework_code)
);

-- 7. Populate cascade table with existing frameworks only
INSERT INTO onboarding_country_framework_cascade
    (country_code, framework_code, is_mandatory, is_recommended, display_order, applicability_sectors, notes)
SELECT * FROM (VALUES
    -- Saudi Arabia mandatory frameworks
    ('SAU', 'NCA-ECC', TRUE, TRUE, 1, ARRAY['K', 'J', 'O', 'Q', 'D']::TEXT[], 'Mandatory for critical infrastructure'),
    ('SAU', 'SAMA-CSF', TRUE, TRUE, 2, ARRAY['K']::TEXT[], 'Mandatory for financial institutions'),
    ('SAU', 'SAMA-AML', TRUE, TRUE, 3, ARRAY['K']::TEXT[], 'Mandatory for banks and financial services'),
    ('SAU', 'PDPL', TRUE, TRUE, 4, NULL, 'Mandatory for all organizations processing personal data'),
    ('SAU', 'ZATCA-EINV', TRUE, TRUE, 5, ARRAY['G', 'C']::TEXT[], 'Mandatory for B2B transactions'),
    ('SAU', 'CMA-CG', TRUE, TRUE, 6, ARRAY['K']::TEXT[], 'Mandatory for listed companies'),
    ('SAU', 'NCA-CCC', FALSE, TRUE, 7, ARRAY['J']::TEXT[], 'Mandatory for cloud service providers'),
    ('SAU', 'NCA-OTCC', FALSE, TRUE, 8, ARRAY['C', 'D']::TEXT[], 'For operational technology'),
    ('SAU', 'SAMA-PSR', TRUE, TRUE, 9, ARRAY['K']::TEXT[], 'For payment service providers'),

    -- Saudi Arabia recommended frameworks
    ('SAU', 'ISO-27001', FALSE, TRUE, 10, NULL, 'Recommended for all organizations'),
    ('SAU', 'ISO-22301', FALSE, TRUE, 11, ARRAY['K', 'D', 'O']::TEXT[], 'Recommended for business continuity'),
    ('SAU', 'PCI-DSS', FALSE, TRUE, 12, ARRAY['K', 'G']::TEXT[], 'Required if processing payment cards'),
    ('SAU', 'NIST-CSF', FALSE, TRUE, 13, NULL, 'Best practice cybersecurity framework'),

    -- UAE frameworks (if they exist)
    ('ARE', 'ISO-27001', FALSE, TRUE, 1, NULL, 'International standard'),
    ('ARE', 'PCI-DSS', TRUE, TRUE, 2, ARRAY['K', 'G']::TEXT[], 'Payment card processing'),

    -- USA frameworks (if they exist)
    ('USA', 'NIST-CSF', TRUE, TRUE, 1, NULL, 'National cybersecurity framework'),
    ('USA', 'PCI-DSS', TRUE, TRUE, 2, ARRAY['K', 'G']::TEXT[], 'Payment card processing'),

    -- Egypt frameworks
    ('EGY', 'ISO-27001', FALSE, TRUE, 1, NULL, 'International standard'),
    ('EGY', 'PCI-DSS', FALSE, TRUE, 2, ARRAY['K']::TEXT[], 'For payment processors'),

    -- All countries get international standards
    ('SAU', 'ISO-27001', FALSE, TRUE, 20, NULL, 'International standard'),
    ('ARE', 'ISO-27001', FALSE, TRUE, 20, NULL, 'International standard'),
    ('USA', 'ISO-27001', FALSE, TRUE, 20, NULL, 'International standard'),
    ('EGY', 'ISO-27001', FALSE, TRUE, 20, NULL, 'International standard'),
    ('GBR', 'ISO-27001', FALSE, TRUE, 20, NULL, 'International standard')
) AS v(country_code, framework_code, is_mandatory, is_recommended, display_order, applicability_sectors, notes)
WHERE EXISTS (SELECT 1 FROM regulatory_frameworks rf WHERE rf.framework_code = v.framework_code)
  AND EXISTS (SELECT 1 FROM lookup_countries c WHERE c.country_code_3 = v.country_code)
ON CONFLICT (country_code, framework_code) DO NOTHING;

-- 8. Show results
DO $$
DECLARE
    total_mappings INTEGER;
    countries_with_regs INTEGER;
    frameworks_mapped INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_mappings FROM country_regulators;
    SELECT COUNT(DISTINCT country_code) INTO countries_with_regs FROM country_regulators;
    SELECT COUNT(DISTINCT framework_code) INTO frameworks_mapped FROM onboarding_country_framework_cascade;

    RAISE NOTICE '=== COUNTRY-FRAMEWORK CASCADE SETUP COMPLETE ===';
    RAISE NOTICE 'Country-Regulator Mappings: %', total_mappings;
    RAISE NOTICE 'Countries with Regulators: %', countries_with_regs;
    RAISE NOTICE 'Frameworks in Cascade: %', frameworks_mapped;
END $$;

-- Test the cascade for Saudi Arabia
SELECT
    'Saudi Arabia Frameworks' as country,
    framework_code,
    framework_name_en,
    is_mandatory,
    total_controls,
    applicability_note
FROM get_country_frameworks('SAU')
ORDER BY is_mandatory DESC, framework_name_en
LIMIT 10;

COMMIT;