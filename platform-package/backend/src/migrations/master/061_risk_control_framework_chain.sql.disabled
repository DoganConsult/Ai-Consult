-- Create complete Risk → Control → Framework → Regulator chain
-- All mapped per 21 ISIC4 sectors

BEGIN;

-- 1. Create risk categories table
CREATE TABLE IF NOT EXISTS risk_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_code VARCHAR(50) UNIQUE NOT NULL,
    risk_name_en VARCHAR(255) NOT NULL,
    risk_name_ar VARCHAR(255),
    risk_type VARCHAR(50), -- operational, compliance, strategic, financial, reputational
    description_en TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create risks table (sector-specific risks)
CREATE TABLE IF NOT EXISTS risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_category_id UUID REFERENCES risk_categories(id),
    risk_code VARCHAR(100) UNIQUE NOT NULL,
    risk_title_en VARCHAR(500) NOT NULL,
    risk_title_ar VARCHAR(500),
    risk_description_en TEXT,
    risk_impact VARCHAR(20), -- critical, high, medium, low
    risk_likelihood VARCHAR(20), -- certain, likely, possible, unlikely, rare
    inherent_risk_score INTEGER, -- 1-25 (impact x likelihood)
    sector_codes TEXT[], -- Which ISIC4 sectors this risk applies to
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create risk-control mapping table
CREATE TABLE IF NOT EXISTS risk_control_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id UUID REFERENCES risks(id),
    control_id UUID REFERENCES regulatory_controls(id),
    control_effectiveness VARCHAR(20), -- strong, moderate, weak
    mitigation_percentage INTEGER, -- 0-100%
    is_primary_control BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(risk_id, control_id)
);

-- 4. Create sector-risk mapping table
CREATE TABLE IF NOT EXISTS sector_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sector_code VARCHAR(50) REFERENCES lookup_sectors(sector_code),
    risk_id UUID REFERENCES risks(id),
    sector_impact VARCHAR(20), -- Sector-specific impact level
    sector_likelihood VARCHAR(20), -- Sector-specific likelihood
    regulatory_requirement BOOLEAN DEFAULT FALSE,
    priority_rank INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sector_code, risk_id)
);

-- Create indexes for performance
CREATE INDEX idx_risks_category ON risks(risk_category_id);
CREATE INDEX idx_risks_sectors ON risks USING GIN(sector_codes);
CREATE INDEX idx_risk_control_risk ON risk_control_mappings(risk_id);
CREATE INDEX idx_risk_control_control ON risk_control_mappings(control_id);
CREATE INDEX idx_sector_risks_sector ON sector_risks(sector_code);
CREATE INDEX idx_sector_risks_risk ON sector_risks(risk_id);

-- 5. Insert risk categories
INSERT INTO risk_categories (risk_code, risk_name_en, risk_name_ar, risk_type, description_en)
VALUES
    ('RC-CYBER', 'Cybersecurity Risks', 'مخاطر الأمن السيبراني', 'operational', 'Risks related to cyber threats, data breaches, and system compromises'),
    ('RC-COMPLIANCE', 'Compliance Risks', 'مخاطر الامتثال', 'compliance', 'Risks of non-compliance with regulations and standards'),
    ('RC-FINANCIAL', 'Financial Risks', 'المخاطر المالية', 'financial', 'Risks affecting financial performance and stability'),
    ('RC-OPERATIONAL', 'Operational Risks', 'المخاطر التشغيلية', 'operational', 'Risks from internal processes, people, and systems'),
    ('RC-STRATEGIC', 'Strategic Risks', 'المخاطر الاستراتيجية', 'strategic', 'Risks affecting strategic objectives and goals'),
    ('RC-REPUTATION', 'Reputational Risks', 'مخاطر السمعة', 'reputational', 'Risks affecting brand and reputation'),
    ('RC-THIRD-PARTY', 'Third Party Risks', 'مخاطر الطرف الثالث', 'operational', 'Risks from vendors, suppliers, and partners'),
    ('RC-DATA', 'Data Protection Risks', 'مخاطر حماية البيانات', 'compliance', 'Risks related to data privacy and protection'),
    ('RC-BUSINESS-CONTINUITY', 'Business Continuity Risks', 'مخاطر استمرارية الأعمال', 'operational', 'Risks affecting business continuity and disaster recovery'),
    ('RC-FRAUD', 'Fraud Risks', 'مخاطر الاحتيال', 'financial', 'Risks of fraud and financial crimes')
ON CONFLICT (risk_code) DO NOTHING;

-- 6. Insert sector-specific risks (sample for each ISIC4 sector)
INSERT INTO risks (risk_category_id, risk_code, risk_title_en, risk_description_en, risk_impact, risk_likelihood, inherent_risk_score, sector_codes)
SELECT
    rc.id,
    'RISK-' || rc.risk_code || '-' || ROW_NUMBER() OVER (PARTITION BY rc.id ORDER BY rc.id),
    CASE rc.risk_code
        WHEN 'RC-CYBER' THEN 'Data Breach Risk'
        WHEN 'RC-COMPLIANCE' THEN 'Regulatory Non-Compliance Risk'
        WHEN 'RC-FINANCIAL' THEN 'Credit Risk'
        WHEN 'RC-OPERATIONAL' THEN 'System Failure Risk'
        WHEN 'RC-STRATEGIC' THEN 'Market Competition Risk'
        WHEN 'RC-REPUTATION' THEN 'Brand Damage Risk'
        WHEN 'RC-THIRD-PARTY' THEN 'Vendor Failure Risk'
        WHEN 'RC-DATA' THEN 'PDPL Violation Risk'
        WHEN 'RC-BUSINESS-CONTINUITY' THEN 'Disaster Recovery Risk'
        WHEN 'RC-FRAUD' THEN 'Internal Fraud Risk'
    END || ' - ' || ls.sector_name_en,
    'Risk specific to ' || ls.sector_name_en || ' sector',
    CASE
        WHEN ls.sector_code IN ('K', 'D', 'O', 'Q', 'J') THEN 'critical' -- Critical sectors
        WHEN ls.sector_code IN ('C', 'G', 'H') THEN 'high'
        WHEN ls.sector_code IN ('L', 'M', 'F') THEN 'medium'
        ELSE 'low'
    END as risk_impact,
    CASE
        WHEN ls.sector_code IN ('K', 'J') THEN 'likely' -- High tech/finance sectors
        WHEN ls.sector_code IN ('D', 'O', 'Q') THEN 'possible'
        ELSE 'unlikely'
    END as risk_likelihood,
    CASE
        WHEN ls.sector_code IN ('K', 'D', 'O', 'Q', 'J') THEN 20 -- 5x4 = 20 (critical x likely)
        WHEN ls.sector_code IN ('C', 'G', 'H') THEN 12 -- 4x3 = 12 (high x possible)
        ELSE 6 -- 3x2 = 6 (medium x unlikely)
    END as inherent_risk_score,
    ARRAY[ls.sector_code]::TEXT[]
FROM risk_categories rc
CROSS JOIN lookup_sectors ls
WHERE ls.sector_code != 'T' -- Exclude households as employers
ON CONFLICT (risk_code) DO NOTHING;

-- 7. Link risks to controls based on control types and categories
INSERT INTO risk_control_mappings (risk_id, control_id, control_effectiveness, mitigation_percentage, is_primary_control)
SELECT DISTINCT
    r.id as risk_id,
    rc.id as control_id,
    CASE
        WHEN rc.criticality_level = 'critical' THEN 'strong'
        WHEN rc.criticality_level = 'high' THEN 'moderate'
        ELSE 'weak'
    END as control_effectiveness,
    CASE
        WHEN rc.criticality_level = 'critical' THEN 80
        WHEN rc.criticality_level = 'high' THEN 60
        WHEN rc.criticality_level = 'medium' THEN 40
        ELSE 20
    END as mitigation_percentage,
    CASE
        WHEN rc.criticality_level = 'critical' AND r.risk_impact = 'critical' THEN TRUE
        ELSE FALSE
    END as is_primary_control
FROM risks r
JOIN regulatory_controls rc ON
    -- Match cyber risks to cyber controls
    (r.risk_code LIKE '%CYBER%' AND rc.control_code LIKE 'NCA-%') OR
    -- Match compliance risks to all controls
    (r.risk_code LIKE '%COMPLIANCE%') OR
    -- Match financial risks to financial controls
    (r.risk_code LIKE '%FINANCIAL%' AND rc.control_code LIKE 'SAMA-%') OR
    -- Match fraud risks to AML controls
    (r.risk_code LIKE '%FRAUD%' AND rc.control_code LIKE 'SAMA-AML%') OR
    -- Match data risks to PDPL controls
    (r.risk_code LIKE '%DATA%' AND rc.control_code LIKE 'PDPL-%') OR
    -- Match operational risks to ISO/NIST controls
    (r.risk_code LIKE '%OPERATIONAL%' AND (rc.control_code LIKE 'ISO-%' OR rc.control_code LIKE 'NIST-%'))
WHERE rc.control_code IS NOT NULL
ON CONFLICT (risk_id, control_id) DO NOTHING;

-- 8. Map risks to sectors with priorities
INSERT INTO sector_risks (sector_code, risk_id, sector_impact, sector_likelihood, regulatory_requirement, priority_rank)
SELECT
    ls.sector_code,
    r.id as risk_id,
    CASE
        WHEN ls.sector_code = 'K' AND r.risk_code LIKE '%FINANCIAL%' THEN 'critical'
        WHEN ls.sector_code = 'Q' AND r.risk_code LIKE '%DATA%' THEN 'critical'
        WHEN ls.sector_code = 'J' AND r.risk_code LIKE '%CYBER%' THEN 'critical'
        WHEN ls.sector_code = 'D' AND r.risk_code LIKE '%OPERATIONAL%' THEN 'critical'
        WHEN ls.sector_code = 'O' AND r.risk_code LIKE '%COMPLIANCE%' THEN 'critical'
        ELSE r.risk_impact
    END as sector_impact,
    r.risk_likelihood as sector_likelihood,
    CASE
        WHEN ls.sector_code IN ('K', 'Q', 'J', 'O', 'D') THEN TRUE
        ELSE FALSE
    END as regulatory_requirement,
    ROW_NUMBER() OVER (PARTITION BY ls.sector_code ORDER BY r.inherent_risk_score DESC) as priority_rank
FROM lookup_sectors ls
CROSS JOIN risks r
WHERE ls.sector_code = ANY(r.sector_codes)
ON CONFLICT (sector_code, risk_id) DO NOTHING;

-- 9. Create comprehensive view: Risk → Control → Framework → Regulator → Sector
CREATE OR REPLACE VIEW risk_control_framework_chain AS
SELECT
    -- Sector
    ls.sector_code,
    ls.sector_name_en,

    -- Risk
    r.risk_code,
    r.risk_title_en,
    r.risk_impact,
    r.risk_likelihood,
    r.inherent_risk_score,

    -- Control
    rc.control_code,
    rc.control_title_en,
    rc.criticality_level,
    rcm.control_effectiveness,
    rcm.mitigation_percentage,

    -- Framework
    rf.framework_code,
    rf.framework_name_en,
    rf.framework_type,

    -- Regulator (via framework authority)
    lra.authority_code as regulator_code,
    lra.authority_name_en as regulator_name,

    -- Relationships
    sr.regulatory_requirement,
    sr.priority_rank as risk_priority,
    cs.applicability as control_applicability,
    cs.sector_priority as control_priority

FROM sector_risks sr
JOIN risks r ON r.id = sr.risk_id
JOIN risk_control_mappings rcm ON rcm.risk_id = r.id
JOIN regulatory_controls rc ON rc.id = rcm.control_id
JOIN control_domains cd ON cd.id = rc.domain_id
JOIN framework_versions fv ON fv.id = cd.version_id
JOIN regulatory_frameworks rf ON rf.framework_code = fv.framework_code
LEFT JOIN lookup_ksa_regulatory_authorities lra ON lra.authority_code = rf.authority_code
JOIN control_sectors cs ON cs.control_id = rc.id AND cs.sector_code = sr.sector_code
JOIN lookup_sectors ls ON ls.sector_code = sr.sector_code
WHERE sr.sector_code = cs.sector_code;

-- 10. Create function to get complete chain for a sector
CREATE OR REPLACE FUNCTION get_sector_risk_control_chain(p_sector_code VARCHAR(50))
RETURNS TABLE (
    risk_category TEXT,
    risk_title TEXT,
    control_count BIGINT,
    frameworks TEXT,
    regulators TEXT,
    avg_mitigation INTEGER,
    compliance_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH sector_chain AS (
        SELECT
            rc.risk_code,
            r.risk_title_en,
            COUNT(DISTINCT rcf.control_code) as control_count,
            STRING_AGG(DISTINCT rcf.framework_code, ', ') as frameworks,
            STRING_AGG(DISTINCT rcf.regulator_code, ', ') as regulators,
            AVG(rcf.mitigation_percentage)::INTEGER as avg_mitigation
        FROM risk_control_framework_chain rcf
        JOIN risks r ON r.risk_code = rcf.risk_code
        JOIN risk_categories rc ON rc.id = r.risk_category_id
        WHERE rcf.sector_code = p_sector_code
        GROUP BY rc.risk_code, r.risk_title_en
    )
    SELECT
        sc.risk_code::TEXT,
        sc.risk_title_en::TEXT,
        sc.control_count,
        sc.frameworks::TEXT,
        sc.regulators::TEXT,
        sc.avg_mitigation,
        CASE
            WHEN sc.avg_mitigation >= 80 THEN 'Well Controlled'
            WHEN sc.avg_mitigation >= 60 THEN 'Adequately Controlled'
            WHEN sc.avg_mitigation >= 40 THEN 'Partially Controlled'
            ELSE 'Needs Improvement'
        END::TEXT as compliance_status
    FROM sector_chain sc
    ORDER BY sc.avg_mitigation DESC;
END;
$$ LANGUAGE plpgsql;

-- 11. Create summary statistics
DO $$
DECLARE
    total_risks INTEGER;
    total_risk_controls INTEGER;
    sectors_with_risks INTEGER;
    avg_controls_per_risk NUMERIC;
BEGIN
    SELECT COUNT(*) INTO total_risks FROM risks;
    SELECT COUNT(*) INTO total_risk_controls FROM risk_control_mappings;
    SELECT COUNT(DISTINCT sector_code) INTO sectors_with_risks FROM sector_risks;
    SELECT AVG(control_count) INTO avg_controls_per_risk FROM (
        SELECT risk_id, COUNT(*) as control_count
        FROM risk_control_mappings
        GROUP BY risk_id
    ) t;

    RAISE NOTICE '=== RISK-CONTROL-FRAMEWORK CHAIN COMPLETE ===';
    RAISE NOTICE 'Total Risks Created: %', total_risks;
    RAISE NOTICE 'Risk-Control Mappings: %', total_risk_controls;
    RAISE NOTICE 'Sectors with Risk Mappings: %', sectors_with_risks;
    RAISE NOTICE 'Average Controls per Risk: %', ROUND(avg_controls_per_risk, 1);
END $$;

-- 12. Show sample of the complete chain for Financial sector (K)
SELECT
    'Financial Sector (K) - Risk Control Chain Sample' as report;

SELECT
    risk_title as risk,
    control_count,
    frameworks,
    regulators,
    avg_mitigation || '%' as mitigation,
    compliance_status
FROM get_sector_risk_control_chain('K')
LIMIT 10;

COMMIT;