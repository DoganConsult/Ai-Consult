-- Import control-sector mappings
-- Maps which controls apply to which sectors with specific guidance

BEGIN;

-- Create control_sectors table if it doesn't exist
CREATE TABLE IF NOT EXISTS control_sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_id UUID REFERENCES regulatory_controls(id),
    framework_code VARCHAR(50),
    control_number VARCHAR(20),
    sector_code VARCHAR(50) REFERENCES lookup_sectors(sector_code),
    applicability VARCHAR(50), -- mandatory, recommended, optional
    sector_priority VARCHAR(20), -- critical, high, medium, low
    sector_maturity_level INTEGER,
    sector_specific_guidance_en TEXT,
    sector_specific_guidance_ar TEXT,
    additional_evidence_types TEXT,
    exemption_allowed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(control_id, sector_code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_control_sectors_control ON control_sectors(control_id);
CREATE INDEX IF NOT EXISTS idx_control_sectors_sector ON control_sectors(sector_code);
CREATE INDEX IF NOT EXISTS idx_control_sectors_applicability ON control_sectors(applicability);

-- Create temp table for import
DROP TABLE IF EXISTS temp_control_sectors_import;
CREATE TEMP TABLE temp_control_sectors_import (
    id INTEGER,
    control_id INTEGER,
    framework_code VARCHAR(50),
    control_number VARCHAR(20),
    sector_code VARCHAR(50),
    applicability VARCHAR(50),
    sector_priority VARCHAR(20),
    sector_maturity_level INTEGER,
    sector_specific_guidance_en TEXT,
    additional_evidence_types TEXT,
    exemption_allowed BOOLEAN
);

-- Import CSV data
\COPY temp_control_sectors_import FROM '/home/user/Dr-Dogan-AGRC-OS/files (9)/control_sectors.csv' WITH CSV HEADER;

-- First, let's map the old sector codes to ISIC4
-- Create a mapping for common sector names to ISIC4 codes
CREATE TEMP TABLE sector_mapping AS
SELECT * FROM (VALUES
    ('BANKING', 'K'),           -- Financial services
    ('INSURANCE', 'K'),          -- Financial services
    ('CAPITAL_MARKETS', 'K'),    -- Financial services
    ('FINTECH', 'K'),           -- Financial services
    ('HEALTHCARE', 'Q'),        -- Health
    ('PHARMA', 'C'),           -- Manufacturing (pharma)
    ('TELECOM', 'J'),          -- Information and communication
    ('ICT', 'J'),              -- Information and communication
    ('CLOUD', 'J'),            -- Information and communication
    ('GOVERNMENT', 'O'),       -- Public administration
    ('ENERGY', 'D'),           -- Electricity, gas
    ('OIL_GAS', 'B'),         -- Mining and quarrying
    ('RETAIL', 'G'),          -- Wholesale and retail
    ('REAL_ESTATE', 'L'),     -- Real estate
    ('CONSTRUCTION', 'F'),     -- Construction
    ('MANUFACTURING', 'C'),    -- Manufacturing
    ('TRANSPORT', 'H'),        -- Transportation
    ('EDUCATION', 'P'),        -- Education
    ('HOSPITALITY', 'I'),      -- Accommodation and food service
    ('AGRICULTURE', 'A'),      -- Agriculture
    ('UTILITIES', 'E'),        -- Water supply
    ('PROFESSIONAL', 'M'),     -- Professional activities
    ('ENTERTAINMENT', 'R'),    -- Arts, entertainment
    ('OTHER', 'S')            -- Other service activities
) AS t(old_code, new_code);

-- First map and deduplicate the import data
CREATE TEMP TABLE mapped_control_sectors AS
SELECT DISTINCT ON (rc.id, COALESCE(sm.new_code, 'S'))
    rc.id as control_id,
    t.framework_code,
    t.control_number,
    COALESCE(sm.new_code, 'S') as sector_code,
    t.applicability,
    t.sector_priority,
    t.sector_maturity_level,
    t.sector_specific_guidance_en,
    t.additional_evidence_types,
    COALESCE(t.exemption_allowed, FALSE) as exemption_allowed
FROM temp_control_sectors_import t
LEFT JOIN sector_mapping sm ON sm.old_code = t.sector_code
JOIN regulatory_controls rc ON rc.control_code = t.framework_code || '-' || t.control_number
WHERE EXISTS (SELECT 1 FROM lookup_sectors ls WHERE ls.sector_code = COALESCE(sm.new_code, 'S'))
ORDER BY rc.id, COALESCE(sm.new_code, 'S'), t.id DESC;

-- Insert control-sector mappings (already deduplicated)
INSERT INTO control_sectors (
    control_id,
    framework_code,
    control_number,
    sector_code,
    applicability,
    sector_priority,
    sector_maturity_level,
    sector_specific_guidance_en,
    additional_evidence_types,
    exemption_allowed
)
SELECT
    control_id,
    framework_code,
    control_number,
    sector_code,
    applicability,
    sector_priority,
    sector_maturity_level,
    sector_specific_guidance_en,
    additional_evidence_types,
    exemption_allowed
FROM mapped_control_sectors
ON CONFLICT (control_id, sector_code) DO UPDATE
SET
    applicability = EXCLUDED.applicability,
    sector_priority = EXCLUDED.sector_priority,
    sector_maturity_level = EXCLUDED.sector_maturity_level,
    sector_specific_guidance_en = EXCLUDED.sector_specific_guidance_en,
    additional_evidence_types = EXCLUDED.additional_evidence_types,
    exemption_allowed = EXCLUDED.exemption_allowed;

-- Show import results
DO $$
DECLARE
    total_imported INTEGER;
    unique_controls INTEGER;
    unique_sectors INTEGER;
    mandatory_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_imported FROM control_sectors;
    SELECT COUNT(DISTINCT control_id) INTO unique_controls FROM control_sectors;
    SELECT COUNT(DISTINCT sector_code) INTO unique_sectors FROM control_sectors;
    SELECT COUNT(*) INTO mandatory_count FROM control_sectors WHERE applicability = 'mandatory';

    RAISE NOTICE '=== CONTROL-SECTOR MAPPINGS IMPORT COMPLETE ===';
    RAISE NOTICE 'Total mappings imported: %', total_imported;
    RAISE NOTICE 'Unique controls with sector mappings: %', unique_controls;
    RAISE NOTICE 'Unique sectors mapped: %', unique_sectors;
    RAISE NOTICE 'Mandatory applicability count: %', mandatory_count;
END $$;

-- Show breakdown by framework
SELECT
    cs.framework_code,
    COUNT(*) as sector_mappings,
    COUNT(DISTINCT cs.control_id) as controls_mapped,
    COUNT(DISTINCT cs.sector_code) as sectors_covered,
    SUM(CASE WHEN cs.applicability = 'mandatory' THEN 1 ELSE 0 END) as mandatory_count
FROM control_sectors cs
GROUP BY cs.framework_code
ORDER BY sector_mappings DESC;

COMMIT;