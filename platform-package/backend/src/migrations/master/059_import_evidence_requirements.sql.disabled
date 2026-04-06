-- Import control evidence requirements
-- Defines what evidence is required for each control

BEGIN;

-- Create control_evidence_requirements table if it doesn't exist
CREATE TABLE IF NOT EXISTS control_evidence_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_id UUID REFERENCES regulatory_controls(id),
    framework_code VARCHAR(50),
    control_number VARCHAR(20),
    evidence_type_code VARCHAR(50),
    is_mandatory BOOLEAN DEFAULT TRUE,
    requirement_description_en TEXT,
    requirement_description_ar TEXT,
    expected_content_en TEXT,
    expected_content_ar TEXT,
    collection_frequency VARCHAR(50),
    retention_period_months INTEGER,
    maximum_age_days INTEGER,
    requires_attestation BOOLEAN DEFAULT FALSE,
    attestation_role VARCHAR(100),
    display_order INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(control_id, evidence_type_code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_evidence_req_control ON control_evidence_requirements(control_id);
CREATE INDEX IF NOT EXISTS idx_evidence_req_type ON control_evidence_requirements(evidence_type_code);
CREATE INDEX IF NOT EXISTS idx_evidence_req_mandatory ON control_evidence_requirements(is_mandatory);

-- Create evidence types lookup if not exists
CREATE TABLE IF NOT EXISTS evidence_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_code VARCHAR(50) UNIQUE NOT NULL,
    evidence_name_en VARCHAR(255) NOT NULL,
    evidence_name_ar VARCHAR(255),
    evidence_category VARCHAR(50),
    description_en TEXT,
    file_extensions TEXT[],
    max_size_mb INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert standard evidence types if they don't exist
INSERT INTO evidence_types (evidence_code, evidence_name_en, evidence_category, file_extensions)
VALUES
    ('POLICY', 'Policy Document', 'documentation', ARRAY['pdf', 'docx']),
    ('PROCEDURE', 'Procedure Document', 'documentation', ARRAY['pdf', 'docx']),
    ('STANDARD', 'Standard Document', 'documentation', ARRAY['pdf', 'docx']),
    ('CONFIG', 'Configuration File', 'technical', ARRAY['json', 'xml', 'yaml', 'conf']),
    ('SCREENSHOT', 'Screenshot Evidence', 'technical', ARRAY['png', 'jpg', 'jpeg']),
    ('LOG', 'System Log', 'technical', ARRAY['log', 'txt', 'csv']),
    ('REPORT', 'Assessment Report', 'assessment', ARRAY['pdf', 'docx']),
    ('AUDIT_REPORT', 'Audit Report', 'assessment', ARRAY['pdf']),
    ('RISK_ASSESSMENT', 'Risk Assessment', 'assessment', ARRAY['pdf', 'xlsx']),
    ('PENTEST', 'Penetration Test Report', 'assessment', ARRAY['pdf']),
    ('SCAN_REPORT', 'Vulnerability Scan Report', 'technical', ARRAY['pdf', 'xml', 'json']),
    ('CERTIFICATE', 'Certificate', 'compliance', ARRAY['pdf', 'crt', 'pem']),
    ('ATTESTATION', 'Management Attestation', 'compliance', ARRAY['pdf']),
    ('MINUTES', 'Meeting Minutes', 'documentation', ARRAY['pdf', 'docx']),
    ('TRAINING', 'Training Records', 'documentation', ARRAY['pdf', 'xlsx']),
    ('CONTRACT', 'Contract/Agreement', 'legal', ARRAY['pdf']),
    ('INVOICE', 'Invoice/Financial Record', 'financial', ARRAY['pdf', 'xlsx'])
ON CONFLICT (evidence_code) DO NOTHING;

-- Create temp table for import
DROP TABLE IF EXISTS temp_evidence_req_import;
CREATE TEMP TABLE temp_evidence_req_import (
    id INTEGER,
    control_id INTEGER,
    framework_code VARCHAR(50),
    control_number VARCHAR(20),
    evidence_type_code VARCHAR(50),
    is_mandatory BOOLEAN,
    requirement_description_en TEXT,
    expected_content_en TEXT,
    collection_frequency VARCHAR(50),
    retention_period_months INTEGER,
    maximum_age_days INTEGER,
    requires_attestation BOOLEAN,
    attestation_role VARCHAR(100),
    display_order INTEGER
);

-- Import CSV data
\COPY temp_evidence_req_import FROM '/home/user/Dr-Dogan-AGRC-OS/files (9)/control_evidence_requirements.csv' WITH CSV HEADER;

-- Deduplicate and map to actual control IDs
CREATE TEMP TABLE mapped_evidence_reqs AS
SELECT DISTINCT ON (rc.id, t.evidence_type_code)
    rc.id as control_id,
    t.framework_code,
    t.control_number,
    t.evidence_type_code,
    COALESCE(t.is_mandatory, TRUE) as is_mandatory,
    t.requirement_description_en,
    t.expected_content_en,
    t.collection_frequency,
    t.retention_period_months,
    t.maximum_age_days,
    COALESCE(t.requires_attestation, FALSE) as requires_attestation,
    t.attestation_role,
    t.display_order
FROM temp_evidence_req_import t
JOIN regulatory_controls rc ON rc.control_code = t.framework_code || '-' || t.control_number
ORDER BY rc.id, t.evidence_type_code, t.id DESC;

-- Insert evidence requirements
INSERT INTO control_evidence_requirements (
    control_id,
    framework_code,
    control_number,
    evidence_type_code,
    is_mandatory,
    requirement_description_en,
    expected_content_en,
    collection_frequency,
    retention_period_months,
    maximum_age_days,
    requires_attestation,
    attestation_role,
    display_order
)
SELECT
    control_id,
    framework_code,
    control_number,
    evidence_type_code,
    is_mandatory,
    requirement_description_en,
    expected_content_en,
    collection_frequency,
    retention_period_months,
    maximum_age_days,
    requires_attestation,
    attestation_role,
    display_order
FROM mapped_evidence_reqs
ON CONFLICT (control_id, evidence_type_code) DO UPDATE
SET
    is_mandatory = EXCLUDED.is_mandatory,
    requirement_description_en = EXCLUDED.requirement_description_en,
    expected_content_en = EXCLUDED.expected_content_en,
    collection_frequency = EXCLUDED.collection_frequency,
    retention_period_months = EXCLUDED.retention_period_months,
    maximum_age_days = EXCLUDED.maximum_age_days,
    requires_attestation = EXCLUDED.requires_attestation,
    attestation_role = EXCLUDED.attestation_role,
    display_order = EXCLUDED.display_order;

-- Show import results
DO $$
DECLARE
    total_imported INTEGER;
    unique_controls INTEGER;
    unique_evidence_types INTEGER;
    mandatory_count INTEGER;
    requires_attestation_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_imported FROM control_evidence_requirements;
    SELECT COUNT(DISTINCT control_id) INTO unique_controls FROM control_evidence_requirements;
    SELECT COUNT(DISTINCT evidence_type_code) INTO unique_evidence_types FROM control_evidence_requirements;
    SELECT COUNT(*) INTO mandatory_count FROM control_evidence_requirements WHERE is_mandatory = TRUE;
    SELECT COUNT(*) INTO requires_attestation_count FROM control_evidence_requirements WHERE requires_attestation = TRUE;

    RAISE NOTICE '=== EVIDENCE REQUIREMENTS IMPORT COMPLETE ===';
    RAISE NOTICE 'Total evidence requirements imported: %', total_imported;
    RAISE NOTICE 'Unique controls with evidence requirements: %', unique_controls;
    RAISE NOTICE 'Unique evidence types used: %', unique_evidence_types;
    RAISE NOTICE 'Mandatory evidence requirements: %', mandatory_count;
    RAISE NOTICE 'Requirements needing attestation: %', requires_attestation_count;
END $$;

-- Show breakdown by framework
SELECT
    cer.framework_code,
    COUNT(*) as evidence_requirements,
    COUNT(DISTINCT cer.control_id) as controls_with_evidence,
    COUNT(DISTINCT cer.evidence_type_code) as evidence_types_used,
    SUM(CASE WHEN cer.is_mandatory THEN 1 ELSE 0 END) as mandatory_count,
    ROUND(AVG(cer.retention_period_months)) as avg_retention_months
FROM control_evidence_requirements cer
GROUP BY cer.framework_code
ORDER BY evidence_requirements DESC;

-- Show most common evidence types
SELECT
    evidence_type_code,
    COUNT(*) as usage_count,
    COUNT(DISTINCT framework_code) as frameworks_using,
    SUM(CASE WHEN is_mandatory THEN 1 ELSE 0 END) as mandatory_count
FROM control_evidence_requirements
GROUP BY evidence_type_code
ORDER BY usage_count DESC
LIMIT 10;

COMMIT;