-- Create framework_version_diffs table and import version change data

BEGIN;

-- Create framework_version_diffs table if it doesn't exist
CREATE TABLE IF NOT EXISTS framework_version_diffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    framework_code VARCHAR(50) NOT NULL REFERENCES regulatory_frameworks(framework_code),
    from_version VARCHAR(20),
    to_version VARCHAR(20),
    change_type VARCHAR(50) NOT NULL,
    change_category VARCHAR(50),
    severity VARCHAR(20),
    entity_type VARCHAR(50),
    field_changed VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    change_description_en TEXT,
    change_description_ar TEXT,
    impact_description_en TEXT,
    requires_reassessment BOOLEAN DEFAULT FALSE,
    transition_months INTEGER DEFAULT 0,
    controls_added INTEGER DEFAULT 0,
    controls_removed INTEGER DEFAULT 0,
    controls_modified INTEGER DEFAULT 0,
    is_major_update BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_framework_version_diffs_framework ON framework_version_diffs(framework_code);
CREATE INDEX IF NOT EXISTS idx_framework_version_diffs_versions ON framework_version_diffs(framework_code, from_version, to_version);
CREATE INDEX IF NOT EXISTS idx_framework_version_diffs_type ON framework_version_diffs(change_type);

-- Create temporary table for CSV import
DROP TABLE IF EXISTS temp_version_diffs_import;
CREATE TEMP TABLE temp_version_diffs_import (
    id INTEGER,
    framework_code VARCHAR(50),
    from_version VARCHAR(20),
    to_version VARCHAR(20),
    change_type VARCHAR(50),
    change_category VARCHAR(50),
    severity VARCHAR(20),
    entity_type VARCHAR(50),
    field_changed VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    change_description_en TEXT,
    change_description_ar TEXT,
    impact_description_en TEXT,
    requires_reassessment BOOLEAN,
    transition_months INTEGER,
    controls_added INTEGER,
    controls_removed INTEGER,
    controls_modified INTEGER,
    is_major_update BOOLEAN
);

-- Import CSV data
\COPY temp_version_diffs_import FROM '/home/user/Dr-Dogan-AGRC-OS/files (9)/framework_version_diffs.csv' WITH CSV HEADER;

-- Insert data into framework_version_diffs
INSERT INTO framework_version_diffs (
    framework_code,
    from_version,
    to_version,
    change_type,
    change_category,
    severity,
    entity_type,
    field_changed,
    old_value,
    new_value,
    change_description_en,
    change_description_ar,
    impact_description_en,
    requires_reassessment,
    transition_months,
    controls_added,
    controls_removed,
    controls_modified,
    is_major_update
)
SELECT
    framework_code,
    from_version,
    to_version,
    change_type,
    change_category,
    severity,
    entity_type,
    field_changed,
    old_value,
    new_value,
    change_description_en,
    change_description_ar,
    impact_description_en,
    COALESCE(requires_reassessment, FALSE),
    COALESCE(transition_months, 0),
    COALESCE(controls_added, 0),
    COALESCE(controls_removed, 0),
    COALESCE(controls_modified, 0),
    COALESCE(is_major_update, FALSE)
FROM temp_version_diffs_import
WHERE framework_code IN (SELECT framework_code FROM regulatory_frameworks);

-- Create a view for easier querying of major updates
CREATE OR REPLACE VIEW major_framework_updates AS
SELECT
    fvd.framework_code,
    rf.framework_name_en,
    fvd.from_version,
    fvd.to_version,
    fvd.change_description_en,
    fvd.impact_description_en,
    fvd.transition_months,
    fvd.controls_added,
    fvd.controls_removed,
    fvd.controls_modified,
    (fvd.controls_added + fvd.controls_modified) as total_changes
FROM framework_version_diffs fvd
JOIN regulatory_frameworks rf ON rf.framework_code = fvd.framework_code
WHERE fvd.is_major_update = TRUE
  AND fvd.change_type = 'control_count_change'
ORDER BY fvd.framework_code, fvd.from_version;

-- Show summary
DO $$
DECLARE
    total_diffs INTEGER;
    frameworks_with_diffs INTEGER;
    major_updates INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_diffs FROM framework_version_diffs;
    SELECT COUNT(DISTINCT framework_code) INTO frameworks_with_diffs FROM framework_version_diffs;
    SELECT COUNT(*) INTO major_updates FROM framework_version_diffs WHERE is_major_update = TRUE;

    RAISE NOTICE 'Framework version diffs imported successfully!';
    RAISE NOTICE 'Total diff records: %', total_diffs;
    RAISE NOTICE 'Frameworks with version history: %', frameworks_with_diffs;
    RAISE NOTICE 'Major updates: %', major_updates;
END $$;

-- Show version changes by framework
SELECT
    framework_code,
    COUNT(DISTINCT to_version) as versions_tracked,
    SUM(CASE WHEN change_type = 'control_count_change' THEN 1 ELSE 0 END) as version_changes,
    SUM(controls_added) as total_controls_added,
    SUM(controls_removed) as total_controls_removed,
    SUM(controls_modified) as total_controls_modified,
    MAX(transition_months) as max_transition_period
FROM framework_version_diffs
GROUP BY framework_code
ORDER BY framework_code;

COMMIT;