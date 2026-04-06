-- Fix regulator-sector and control-regulator many-to-many relationships
-- Regulators can enforce all or specific sectors
-- Controls can be enforced by multiple regulators

BEGIN;

-- 1. Create regulator-sector enforcement table
CREATE TABLE IF NOT EXISTS regulator_sector_enforcement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regulator_id VARCHAR(50) REFERENCES regulators(regulator_id),
    sector_code VARCHAR(50) REFERENCES lookup_sectors(sector_code),
    enforcement_type VARCHAR(50), -- 'mandatory', 'advisory', 'voluntary'
    enforcement_level VARCHAR(50), -- 'full', 'partial', 'monitoring'
    is_primary_regulator BOOLEAN DEFAULT FALSE,
    effective_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(regulator_id, sector_code)
);

CREATE INDEX IF NOT EXISTS idx_reg_sector_regulator ON regulator_sector_enforcement(regulator_id);
CREATE INDEX IF NOT EXISTS idx_reg_sector_sector ON regulator_sector_enforcement(sector_code);

-- 2. Create control-regulator mapping table (many-to-many)
CREATE TABLE IF NOT EXISTS control_regulator_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_id UUID REFERENCES regulatory_controls(id),
    regulator_id VARCHAR(50) REFERENCES regulators(regulator_id),
    enforcement_type VARCHAR(50), -- 'mandatory', 'recommended', 'optional'
    enforcement_priority VARCHAR(20), -- 'critical', 'high', 'medium', 'low'
    is_primary_enforcer BOOLEAN DEFAULT FALSE,
    applicable_sectors TEXT[], -- NULL means all sectors
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(control_id, regulator_id)
);

CREATE INDEX IF NOT EXISTS idx_control_reg_control ON control_regulator_mapping(control_id);
CREATE INDEX IF NOT EXISTS idx_control_reg_regulator ON control_regulator_mapping(regulator_id);
CREATE INDEX IF NOT EXISTS idx_control_reg_sectors ON control_regulator_mapping USING GIN(applicable_sectors);

-- 3. Populate regulator-sector enforcement for Saudi regulators
INSERT INTO regulator_sector_enforcement (regulator_id, sector_code, enforcement_type, enforcement_level, is_primary_regulator)
VALUES
    -- SAMA enforces financial sector
    ('REG-KSA-SAMA', 'K', 'mandatory', 'full', TRUE),

    -- NCA enforces critical infrastructure (all critical sectors)
    ('REG-KSA-NCA', 'K', 'mandatory', 'full', FALSE), -- Financial
    ('REG-KSA-NCA', 'J', 'mandatory', 'full', TRUE),  -- ICT
    ('REG-KSA-NCA', 'D', 'mandatory', 'full', TRUE),  -- Energy
    ('REG-KSA-NCA', 'O', 'mandatory', 'full', TRUE),  -- Government
    ('REG-KSA-NCA', 'Q', 'mandatory', 'full', FALSE), -- Healthcare
    ('REG-KSA-NCA', 'H', 'advisory', 'partial', FALSE), -- Transport

    -- ZATCA enforces all sectors for tax/zakat
    ('REG-KSA-ZATCA', 'A', 'mandatory', 'full', FALSE), -- Agriculture
    ('REG-KSA-ZATCA', 'B', 'mandatory', 'full', FALSE), -- Mining
    ('REG-KSA-ZATCA', 'C', 'mandatory', 'full', FALSE), -- Manufacturing
    ('REG-KSA-ZATCA', 'D', 'mandatory', 'full', FALSE), -- Electricity
    ('REG-KSA-ZATCA', 'E', 'mandatory', 'full', FALSE), -- Water
    ('REG-KSA-ZATCA', 'F', 'mandatory', 'full', FALSE), -- Construction
    ('REG-KSA-ZATCA', 'G', 'mandatory', 'full', FALSE), -- Trade
    ('REG-KSA-ZATCA', 'H', 'mandatory', 'full', FALSE), -- Transport
    ('REG-KSA-ZATCA', 'I', 'mandatory', 'full', FALSE), -- Hospitality
    ('REG-KSA-ZATCA', 'J', 'mandatory', 'full', FALSE), -- ICT
    ('REG-KSA-ZATCA', 'K', 'mandatory', 'full', FALSE), -- Financial
    ('REG-KSA-ZATCA', 'L', 'mandatory', 'full', FALSE), -- Real Estate
    ('REG-KSA-ZATCA', 'M', 'mandatory', 'full', FALSE), -- Professional
    ('REG-KSA-ZATCA', 'N', 'mandatory', 'full', FALSE), -- Administrative
    ('REG-KSA-ZATCA', 'O', 'mandatory', 'full', FALSE), -- Government
    ('REG-KSA-ZATCA', 'P', 'mandatory', 'full', FALSE), -- Education
    ('REG-KSA-ZATCA', 'Q', 'mandatory', 'full', FALSE), -- Healthcare
    ('REG-KSA-ZATCA', 'R', 'mandatory', 'full', FALSE), -- Entertainment
    ('REG-KSA-ZATCA', 'S', 'mandatory', 'full', FALSE), -- Other services

    -- SDAIA (PDPL) enforces all sectors for data protection
    ('REG-KSA-SDAIA', 'A', 'mandatory', 'full', FALSE),
    ('REG-KSA-SDAIA', 'B', 'mandatory', 'full', FALSE),
    ('REG-KSA-SDAIA', 'C', 'mandatory', 'full', FALSE),
    ('REG-KSA-SDAIA', 'D', 'mandatory', 'full', FALSE),
    ('REG-KSA-SDAIA', 'E', 'mandatory', 'full', FALSE),
    ('REG-KSA-SDAIA', 'F', 'mandatory', 'full', FALSE),
    ('REG-KSA-SDAIA', 'G', 'mandatory', 'full', FALSE),
    ('REG-KSA-SDAIA', 'H', 'mandatory', 'full', FALSE),
    ('REG-KSA-SDAIA', 'I', 'mandatory', 'full', FALSE),
    ('REG-KSA-SDAIA', 'J', 'mandatory', 'full', FALSE),
    ('REG-KSA-SDAIA', 'K', 'mandatory', 'full', FALSE),
    ('REG-KSA-SDAIA', 'L', 'mandatory', 'full', FALSE),
    ('REG-KSA-SDAIA', 'M', 'mandatory', 'full', FALSE),
    ('REG-KSA-SDAIA', 'N', 'mandatory', 'full', FALSE),
    ('REG-KSA-SDAIA', 'O', 'mandatory', 'full', FALSE),
    ('REG-KSA-SDAIA', 'P', 'mandatory', 'full', FALSE),
    ('REG-KSA-SDAIA', 'Q', 'mandatory', 'full', FALSE),
    ('REG-KSA-SDAIA', 'R', 'mandatory', 'full', FALSE),
    ('REG-KSA-SDAIA', 'S', 'mandatory', 'full', FALSE),

    -- CMA enforces only financial markets
    ('REG-KSA-CMA', 'K', 'mandatory', 'full', FALSE),

    -- MOH enforces healthcare
    ('REG-KSA-MOH', 'Q', 'mandatory', 'full', TRUE),

    -- SFDA enforces healthcare and food manufacturing
    ('REG-KSA-SFDA', 'Q', 'mandatory', 'partial', FALSE),
    ('REG-KSA-SFDA', 'C', 'mandatory', 'partial', FALSE),

    -- CST enforces telecommunications
    ('REG-KSA-CST', 'J', 'mandatory', 'full', FALSE),

    -- ECRA enforces electricity
    ('REG-KSA-ECRA', 'D', 'mandatory', 'full', FALSE),

    -- GACA enforces aviation (transport)
    ('REG-KSA-GACA', 'H', 'mandatory', 'partial', FALSE),

    -- MHRSD enforces all sectors for labor law
    ('REG-KSA-MHRSD', 'A', 'mandatory', 'partial', FALSE),
    ('REG-KSA-MHRSD', 'B', 'mandatory', 'partial', FALSE),
    ('REG-KSA-MHRSD', 'C', 'mandatory', 'partial', FALSE),
    ('REG-KSA-MHRSD', 'D', 'mandatory', 'partial', FALSE),
    ('REG-KSA-MHRSD', 'E', 'mandatory', 'partial', FALSE),
    ('REG-KSA-MHRSD', 'F', 'mandatory', 'partial', FALSE),
    ('REG-KSA-MHRSD', 'G', 'mandatory', 'partial', FALSE),
    ('REG-KSA-MHRSD', 'H', 'mandatory', 'partial', FALSE),
    ('REG-KSA-MHRSD', 'I', 'mandatory', 'partial', FALSE),
    ('REG-KSA-MHRSD', 'J', 'mandatory', 'partial', FALSE),
    ('REG-KSA-MHRSD', 'K', 'mandatory', 'partial', FALSE),
    ('REG-KSA-MHRSD', 'L', 'mandatory', 'partial', FALSE),
    ('REG-KSA-MHRSD', 'M', 'mandatory', 'partial', FALSE),
    ('REG-KSA-MHRSD', 'N', 'mandatory', 'partial', FALSE),
    ('REG-KSA-MHRSD', 'O', 'mandatory', 'partial', FALSE),
    ('REG-KSA-MHRSD', 'P', 'mandatory', 'partial', FALSE),
    ('REG-KSA-MHRSD', 'Q', 'mandatory', 'partial', FALSE),
    ('REG-KSA-MHRSD', 'R', 'mandatory', 'partial', FALSE),
    ('REG-KSA-MHRSD', 'S', 'mandatory', 'partial', FALSE)
ON CONFLICT (regulator_id, sector_code) DO NOTHING;

-- 4. Map controls to multiple regulators
-- This handles cases where one control is enforced by multiple regulators
INSERT INTO control_regulator_mapping (control_id, regulator_id, enforcement_type, enforcement_priority, is_primary_enforcer, applicable_sectors)
SELECT DISTINCT
    rc.id as control_id,
    CASE
        -- NCA controls
        WHEN rc.control_code LIKE 'NCA-%' THEN 'REG-KSA-NCA'
        -- SAMA controls
        WHEN rc.control_code LIKE 'SAMA-%' THEN 'REG-KSA-SAMA'
        -- ZATCA controls
        WHEN rc.control_code LIKE 'ZATCA-%' THEN 'REG-KSA-ZATCA'
        -- CMA controls
        WHEN rc.control_code LIKE 'CMA-%' THEN 'REG-KSA-CMA'
        -- PDPL controls
        WHEN rc.control_code LIKE 'PDPL-%' THEN 'REG-KSA-SDAIA'
    END as regulator_id,
    'mandatory' as enforcement_type,
    CASE
        WHEN rc.criticality_level = 'critical' THEN 'critical'
        WHEN rc.criticality_level = 'high' THEN 'high'
        WHEN rc.criticality_level = 'medium' THEN 'medium'
        ELSE 'low'
    END as enforcement_priority,
    TRUE as is_primary_enforcer,
    NULL::TEXT[] as applicable_sectors -- NULL means all sectors
FROM regulatory_controls rc
WHERE rc.control_code LIKE 'NCA-%'
   OR rc.control_code LIKE 'SAMA-%'
   OR rc.control_code LIKE 'ZATCA-%'
   OR rc.control_code LIKE 'CMA-%'
   OR rc.control_code LIKE 'PDPL-%'
ON CONFLICT (control_id, regulator_id) DO NOTHING;

-- 5. Add secondary regulators for some controls (multi-regulator enforcement)
-- Example: Financial controls may be enforced by both SAMA and CMA
INSERT INTO control_regulator_mapping (control_id, regulator_id, enforcement_type, enforcement_priority, is_primary_enforcer, applicable_sectors)
SELECT
    rc.id as control_id,
    'REG-KSA-CMA' as regulator_id,
    'mandatory' as enforcement_type,
    'high' as enforcement_priority,
    FALSE as is_primary_enforcer,
    ARRAY['K']::TEXT[] as applicable_sectors
FROM regulatory_controls rc
WHERE rc.control_code LIKE 'SAMA-CSF-%'
  AND NOT EXISTS (
    SELECT 1 FROM control_regulator_mapping crm
    WHERE crm.control_id = rc.id AND crm.regulator_id = 'REG-KSA-CMA'
  )
ON CONFLICT (control_id, regulator_id) DO NOTHING;

-- NCA also enforces some SAMA controls for critical infrastructure
INSERT INTO control_regulator_mapping (control_id, regulator_id, enforcement_type, enforcement_priority, is_primary_enforcer, applicable_sectors)
SELECT
    rc.id as control_id,
    'REG-KSA-NCA' as regulator_id,
    'recommended' as enforcement_type,
    'medium' as enforcement_priority,
    FALSE as is_primary_enforcer,
    ARRAY['K', 'J', 'D', 'O']::TEXT[] as applicable_sectors
FROM regulatory_controls rc
WHERE rc.control_code LIKE 'SAMA-CSF-%'
  AND NOT EXISTS (
    SELECT 1 FROM control_regulator_mapping crm
    WHERE crm.control_id = rc.id AND crm.regulator_id = 'REG-KSA-NCA'
  )
ON CONFLICT (control_id, regulator_id) DO NOTHING;

-- 6. Create view showing multi-regulator enforcement
CREATE OR REPLACE VIEW control_multi_regulator_view AS
SELECT
    rc.control_code,
    rc.control_title_en,
    rc.criticality_level,
    COUNT(DISTINCT crm.regulator_id) as enforced_by_count,
    STRING_AGG(DISTINCT r.acronym, ', ' ORDER BY r.acronym) as enforcing_regulators,
    STRING_AGG(DISTINCT
        CASE
            WHEN crm.is_primary_enforcer THEN r.acronym || ' (Primary)'
            ELSE r.acronym
        END, ', '
    ) as regulator_roles,
    ARRAY_AGG(DISTINCT crm.enforcement_type) as enforcement_types
FROM regulatory_controls rc
JOIN control_regulator_mapping crm ON crm.control_id = rc.id
JOIN regulators r ON r.regulator_id = crm.regulator_id
GROUP BY rc.control_code, rc.control_title_en, rc.criticality_level
HAVING COUNT(DISTINCT crm.regulator_id) > 1
ORDER BY enforced_by_count DESC;

-- 7. Create view showing regulator sector coverage
CREATE OR REPLACE VIEW regulator_sector_coverage AS
SELECT
    r.regulator_id,
    r.acronym,
    r.name_en,
    COUNT(DISTINCT rse.sector_code) as sectors_covered,
    CASE
        WHEN COUNT(DISTINCT rse.sector_code) >= 19 THEN 'All Sectors'
        WHEN COUNT(DISTINCT rse.sector_code) >= 10 THEN 'Multi-Sector'
        WHEN COUNT(DISTINCT rse.sector_code) >= 5 THEN 'Several Sectors'
        WHEN COUNT(DISTINCT rse.sector_code) = 1 THEN 'Single Sector'
        ELSE 'Limited Sectors'
    END as coverage_type,
    STRING_AGG(ls.sector_code, ', ' ORDER BY ls.sector_code) as sector_codes,
    COUNT(DISTINCT rse.sector_code) FILTER (WHERE rse.is_primary_regulator = TRUE) as primary_sector_count
FROM regulators r
LEFT JOIN regulator_sector_enforcement rse ON rse.regulator_id = r.regulator_id
LEFT JOIN lookup_sectors ls ON ls.sector_code = rse.sector_code
WHERE r.regulator_id LIKE 'REG-KSA-%'
GROUP BY r.regulator_id, r.acronym, r.name_en
ORDER BY sectors_covered DESC;

-- 8. Show summary statistics
DO $$
DECLARE
    total_reg_sector_mappings INTEGER;
    regulators_all_sectors INTEGER;
    regulators_single_sector INTEGER;
    multi_regulator_controls INTEGER;
    avg_regulators_per_control NUMERIC;
BEGIN
    SELECT COUNT(*) INTO total_reg_sector_mappings FROM regulator_sector_enforcement;

    SELECT COUNT(*) INTO regulators_all_sectors
    FROM (
        SELECT regulator_id, COUNT(DISTINCT sector_code) as sector_count
        FROM regulator_sector_enforcement
        GROUP BY regulator_id
        HAVING COUNT(DISTINCT sector_code) >= 19
    ) t;

    SELECT COUNT(*) INTO regulators_single_sector
    FROM (
        SELECT regulator_id, COUNT(DISTINCT sector_code) as sector_count
        FROM regulator_sector_enforcement
        GROUP BY regulator_id
        HAVING COUNT(DISTINCT sector_code) = 1
    ) t;

    SELECT COUNT(DISTINCT control_id) INTO multi_regulator_controls
    FROM control_regulator_mapping
    GROUP BY control_id
    HAVING COUNT(DISTINCT regulator_id) > 1;

    SELECT AVG(regulator_count) INTO avg_regulators_per_control
    FROM (
        SELECT control_id, COUNT(DISTINCT regulator_id) as regulator_count
        FROM control_regulator_mapping
        GROUP BY control_id
    ) t;

    RAISE NOTICE '=== REGULATOR-SECTOR-CONTROL MAPPING COMPLETE ===';
    RAISE NOTICE 'Regulator-Sector Mappings: %', total_reg_sector_mappings;
    RAISE NOTICE 'Regulators covering ALL sectors: %', regulators_all_sectors;
    RAISE NOTICE 'Regulators covering single sector: %', regulators_single_sector;
    RAISE NOTICE 'Controls with multiple regulators: %', COALESCE(multi_regulator_controls, 0);
    RAISE NOTICE 'Average regulators per control: %', ROUND(COALESCE(avg_regulators_per_control, 1), 1);
END $$;

-- 9. Show examples of multi-regulator controls
SELECT
    'Multi-Regulator Control Examples' as report;

SELECT * FROM control_multi_regulator_view LIMIT 5;

-- 10. Show regulator sector coverage
SELECT
    'Regulator Sector Coverage' as report;

SELECT
    acronym as regulator,
    sectors_covered,
    coverage_type,
    primary_sector_count as primary_sectors
FROM regulator_sector_coverage
ORDER BY sectors_covered DESC
LIMIT 10;

COMMIT;