-- Migration: Add missing regulatory frameworks from CSV
-- Adds 9 missing frameworks to bring total to 13

BEGIN;

-- Add missing frameworks
INSERT INTO regulatory_frameworks (
    framework_code,
    framework_name_en,
    framework_name_ar,
    framework_acronym,
    authority_code,
    framework_type,
    description_en
) VALUES
    -- CMA Framework
    ('CMA-CG', 'Corporate Governance Regulations', 'لائحة حوكمة الشركات', 'CG', 'CMA', 'governance',
     'Capital Market Authority corporate governance framework for listed companies'),

    -- ISO Standards (international - no KSA authority)
    ('ISO-27001', 'ISO/IEC 27001:2022', 'آيزو 27001:2022', 'ISO27001', NULL, 'standard',
     'International standard for information security management systems'),

    ('ISO-22301', 'ISO 22301:2019', 'آيزو 22301:2019', 'ISO22301', NULL, 'standard',
     'International standard for business continuity management systems'),

    -- NCA Frameworks (additional)
    ('NCA-CCC', 'Cloud Computing Controls', 'ضوابط الحوسبة السحابية', 'CCC', 'NCA', 'cybersecurity',
     'National Cybersecurity Authority cloud computing regulatory controls'),

    ('NCA-OTCC', 'Operational Technology Cybersecurity Controls', 'ضوابط الأمن السيبراني للتقنيات التشغيلية', 'OTCC', 'NCA', 'cybersecurity',
     'Controls for operational technology and industrial control systems'),

    -- NIST Framework (international - no KSA authority)
    ('NIST-CSF', 'NIST Cybersecurity Framework', 'إطار عمل NIST للأمن السيبراني', 'CSF', NULL, 'framework',
     'NIST Cybersecurity Framework v1.1 - Identify, Protect, Detect, Respond, Recover'),

    -- PCI Standard (international - no KSA authority)
    ('PCI-DSS', 'Payment Card Industry Data Security Standard', 'معيار أمن بيانات صناعة البطاقات', 'PCI-DSS', NULL, 'standard',
     'PCI DSS v4.0 - Security standard for organizations handling payment cards'),

    -- Data Protection
    ('PDPL', 'Personal Data Protection Law', 'نظام حماية البيانات الشخصية', 'PDPL', 'SDAIA', 'regulation',
     'Saudi Personal Data Protection Law and implementing regulations'),

    -- SAMA Frameworks (additional)
    ('SAMA-AML', 'SAMA Anti-Money Laundering Rules', 'قواعد مكافحة غسل الأموال', 'AML', 'SAMA', 'regulation',
     'Saudi Central Bank anti-money laundering and counter-terrorism financing rules'),

    ('SAMA-PSR', 'Payment Services Regulations', 'لوائح خدمات المدفوعات', 'PSR', 'SAMA', 'regulation',
     'Regulations for payment service providers and fintech companies'),

    -- ZATCA Framework
    ('ZATCA-EINV', 'E-Invoicing Regulations', 'لوائح الفوترة الإلكترونية', 'EINV', 'ZATCA', 'regulation',
     'Zakat, Tax and Customs Authority e-invoicing (FATOORAH) requirements')

ON CONFLICT (framework_code) DO UPDATE SET
    framework_name_en = EXCLUDED.framework_name_en,
    framework_name_ar = EXCLUDED.framework_name_ar,
    framework_acronym = EXCLUDED.framework_acronym,
    authority_code = EXCLUDED.authority_code,
    framework_type = EXCLUDED.framework_type,
    description_en = EXCLUDED.description_en,
    updated_at = NOW();

-- Update the existing NCA and SAMA frameworks to match CSV naming convention
-- Need to temporarily disable foreign key checks for all related tables
ALTER TABLE framework_versions DROP CONSTRAINT IF EXISTS framework_versions_framework_code_fkey;
ALTER TABLE control_domains DROP CONSTRAINT IF EXISTS control_domains_framework_code_fkey;

-- Update all dependent tables first
UPDATE control_domains
SET framework_code = REPLACE(framework_code, '_', '-')
WHERE framework_code LIKE 'NCA_%' OR framework_code LIKE 'SAMA_%';

UPDATE framework_versions
SET framework_code = REPLACE(framework_code, '_', '-')
WHERE framework_code LIKE 'NCA_%' OR framework_code LIKE 'SAMA_%';

-- Finally update the frameworks themselves
UPDATE regulatory_frameworks
SET framework_code = REPLACE(framework_code, '_', '-')
WHERE framework_code LIKE 'NCA_%' OR framework_code LIKE 'SAMA_%';

-- Re-add the foreign key constraints
ALTER TABLE framework_versions
ADD CONSTRAINT framework_versions_framework_code_fkey
FOREIGN KEY (framework_code) REFERENCES regulatory_frameworks(framework_code);

ALTER TABLE control_domains
ADD CONSTRAINT control_domains_framework_code_fkey
FOREIGN KEY (framework_code) REFERENCES regulatory_frameworks(framework_code);

-- Verify count
DO $$
DECLARE
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM regulatory_frameworks;
    RAISE NOTICE 'Total frameworks after migration: %', total_count;
END $$;

COMMIT;