-- ============================================================================
-- Migration: Replace simplified sectors with official ISIC4 sectors
-- Purpose: Use only the 21 official UN ISIC4 classification sectors
-- Date: 2024-03-02
-- ============================================================================

BEGIN;

-- Step 1: Backup current lookup_sectors data
CREATE TABLE IF NOT EXISTS _backup_lookup_sectors_old AS
SELECT * FROM lookup_sectors;

-- Step 2: Clear current lookup_sectors
TRUNCATE TABLE lookup_sectors CASCADE;

-- Step 3: Insert 21 ISIC4 sectors into lookup_sectors
INSERT INTO lookup_sectors (
    id,
    sector_code,
    sector_name_en,
    sector_name_ar,
    description_en,
    description_ar,
    icon_class,
    level,
    typical_frameworks,
    regulatory_requirements,
    is_active,
    sort_order,
    created_at
) VALUES
    -- Section A
    (gen_random_uuid(), 'A', 'Agriculture, forestry and fishing',
     'الزراعة والحراجة وصيد الأسماك',
     'Crop and animal production, hunting, forestry, fishing and aquaculture',
     'الإنتاج النباتي والحيواني والصيد والحراجة وصيد الأسماك وتربية المائيات',
     'pi pi-tree', 1,
     '["nca_ecc"]'::JSONB, '["NCA ECC"]'::JSONB, true, 1, NOW()),

    -- Section B
    (gen_random_uuid(), 'B', 'Mining and quarrying',
     'التعدين واستغلال المحاجر',
     'Extraction of minerals occurring naturally as solids, liquids or gases',
     'استخراج المعادن التي تحدث بشكل طبيعي كمواد صلبة أو سوائل أو غازات',
     'pi pi-compass', 1,
     '["nca_ecc", "iso14001"]'::JSONB, '["NCA ECC", "ISO 14001"]'::JSONB, true, 2, NOW()),

    -- Section C
    (gen_random_uuid(), 'C', 'Manufacturing',
     'الصناعة التحويلية',
     'Physical or chemical transformation of materials into new products',
     'التحويل الفيزيائي أو الكيميائي للمواد إلى منتجات جديدة',
     'pi pi-cog', 1,
     '["nca_ecc", "iso9001"]'::JSONB, '["NCA ECC", "ISO 9001"]'::JSONB, true, 3, NOW()),

    -- Section D
    (gen_random_uuid(), 'D', 'Electricity, gas, steam and air conditioning supply',
     'إمدادات الكهرباء والغاز والبخار وتكييف الهواء',
     'Electric power generation, transmission and distribution',
     'توليد ونقل وتوزيع الطاقة الكهربائية',
     'pi pi-bolt', 1,
     '["nca_ecc", "nca_cscc", "nca_otcc"]'::JSONB, '["NCA ECC", "NCA CSCC", "NCA OTCC"]'::JSONB, true, 4, NOW()),

    -- Section E
    (gen_random_uuid(), 'E', 'Water supply; sewerage, waste management and remediation',
     'إمدادات المياه وأنشطة الصرف وإدارة النفايات ومعالجتها',
     'Water collection, treatment and supply, sewerage, waste management',
     'جمع ومعالجة وإمداد المياه، الصرف الصحي، إدارة النفايات',
     'pi pi-filter', 1,
     '["nca_ecc", "nca_cscc"]'::JSONB, '["NCA ECC", "NCA CSCC"]'::JSONB, true, 5, NOW()),

    -- Section F
    (gen_random_uuid(), 'F', 'Construction',
     'التشييد',
     'General and specialized construction of buildings and civil engineering',
     'التشييد العام والمتخصص للمباني والهندسة المدنية',
     'pi pi-building', 1,
     '["nca_ecc"]'::JSONB, '["NCA ECC"]'::JSONB, true, 6, NOW()),

    -- Section G
    (gen_random_uuid(), 'G', 'Wholesale and retail trade; repair of motor vehicles',
     'تجارة الجملة والتجزئة؛ إصلاح المركبات ذات المحركات',
     'Wholesale and retail sale of goods, repair of motor vehicles',
     'بيع البضائع بالجملة والتجزئة، إصلاح المركبات',
     'pi pi-shopping-cart', 1,
     '["nca_ecc", "pci_dss"]'::JSONB, '["NCA ECC", "PCI DSS"]'::JSONB, true, 7, NOW()),

    -- Section H
    (gen_random_uuid(), 'H', 'Transportation and storage',
     'النقل والتخزين',
     'Land, water and air transport, warehousing and support activities',
     'النقل البري والمائي والجوي، التخزين والأنشطة الداعمة',
     'pi pi-truck', 1,
     '["nca_ecc"]'::JSONB, '["NCA ECC"]'::JSONB, true, 8, NOW()),

    -- Section I
    (gen_random_uuid(), 'I', 'Accommodation and food service activities',
     'أنشطة خدمات الإقامة والطعام',
     'Hotels, restaurants, catering and beverage serving activities',
     'الفنادق والمطاعم وخدمات تقديم الطعام والمشروبات',
     'pi pi-home', 1,
     '["nca_ecc"]'::JSONB, '["NCA ECC"]'::JSONB, true, 9, NOW()),

    -- Section J
    (gen_random_uuid(), 'J', 'Information and communication',
     'المعلومات والاتصالات',
     'Publishing, broadcasting, telecommunications, IT and information services',
     'النشر والبث والاتصالات وتقنية المعلومات وخدمات المعلومات',
     'pi pi-globe', 1,
     '["nca_ecc", "nca_tcc", "iso27001"]'::JSONB, '["NCA ECC", "NCA TCC", "ISO 27001"]'::JSONB, true, 10, NOW()),

    -- Section K
    (gen_random_uuid(), 'K', 'Financial and insurance activities',
     'الأنشطة المالية وأنشطة التأمين',
     'Financial service activities, insurance, pension funding',
     'أنشطة الخدمات المالية والتأمين وصناديق المعاشات',
     'pi pi-dollar', 1,
     '["sama_csf", "nca_ecc", "pci_dss"]'::JSONB, '["SAMA CSF", "NCA ECC", "PCI DSS"]'::JSONB, true, 11, NOW()),

    -- Section L
    (gen_random_uuid(), 'L', 'Real estate activities',
     'الأنشطة العقارية',
     'Buying, selling, renting and operating of real estate',
     'شراء وبيع وتأجير وتشغيل العقارات',
     'pi pi-map', 1,
     '["nca_ecc"]'::JSONB, '["NCA ECC"]'::JSONB, true, 12, NOW()),

    -- Section M
    (gen_random_uuid(), 'M', 'Professional, scientific and technical activities',
     'الأنشطة المهنية والعلمية والتقنية',
     'Legal, accounting, architecture, engineering, R&D, advertising',
     'الأنشطة القانونية والمحاسبية والهندسة المعمارية والبحث والتطوير والإعلان',
     'pi pi-briefcase', 1,
     '["nca_ecc", "iso27001"]'::JSONB, '["NCA ECC", "ISO 27001"]'::JSONB, true, 13, NOW()),

    -- Section N
    (gen_random_uuid(), 'N', 'Administrative and support service activities',
     'الأنشطة الإدارية وخدمات الدعم',
     'Rental, employment, travel, security, cleaning, office support',
     'التأجير والتوظيف والسفر والأمن والتنظيف ودعم المكاتب',
     'pi pi-users', 1,
     '["nca_ecc"]'::JSONB, '["NCA ECC"]'::JSONB, true, 14, NOW()),

    -- Section O
    (gen_random_uuid(), 'O', 'Public administration and defence; compulsory social security',
     'الإدارة العامة والدفاع؛ الضمان الاجتماعي الإلزامي',
     'Government administration, defence, public order and safety',
     'الإدارة الحكومية والدفاع والنظام العام والسلامة',
     'pi pi-shield', 1,
     '["nca_ecc", "nca_cscc"]'::JSONB, '["NCA ECC", "NCA CSCC"]'::JSONB, true, 15, NOW()),

    -- Section P
    (gen_random_uuid(), 'P', 'Education',
     'التعليم',
     'Pre-primary, primary, secondary and higher education, other education',
     'التعليم قبل الابتدائي والابتدائي والثانوي والعالي والتعليم الآخر',
     'pi pi-book', 1,
     '["nca_ecc"]'::JSONB, '["NCA ECC"]'::JSONB, true, 16, NOW()),

    -- Section Q
    (gen_random_uuid(), 'Q', 'Human health and social work activities',
     'الأنشطة في مجال صحة الإنسان والعمل الاجتماعي',
     'Human health activities, residential care, social work',
     'أنشطة صحة الإنسان والرعاية السكنية والعمل الاجتماعي',
     'pi pi-heart', 1,
     '["nca_ecc", "hipaa"]'::JSONB, '["NCA ECC", "HIPAA"]'::JSONB, true, 17, NOW()),

    -- Section R
    (gen_random_uuid(), 'R', 'Arts, entertainment and recreation',
     'الفنون والترفيه والتسلية',
     'Creative arts, libraries, museums, gambling, sports, recreation',
     'الفنون الإبداعية والمكتبات والمتاحف والقمار والرياضة والترفيه',
     'pi pi-palette', 1,
     '["nca_ecc"]'::JSONB, '["NCA ECC"]'::JSONB, true, 18, NOW()),

    -- Section S
    (gen_random_uuid(), 'S', 'Other service activities',
     'أنشطة الخدمات الأخرى',
     'Membership organizations, repair services, personal services',
     'منظمات العضوية وخدمات الإصلاح والخدمات الشخصية',
     'pi pi-wrench', 1,
     '["nca_ecc"]'::JSONB, '["NCA ECC"]'::JSONB, true, 19, NOW()),

    -- Section T
    (gen_random_uuid(), 'T', 'Activities of households as employers',
     'أنشطة الأُسَر المعيشية التي تستخدم أفراداً',
     'Households employing domestic personnel',
     'الأسر التي توظف عاملين منزليين',
     'pi pi-home', 1,
     '[]'::JSONB, '[]'::JSONB, true, 20, NOW()),

    -- Section U
    (gen_random_uuid(), 'U', 'Activities of extraterritorial organizations',
     'أنشطة المنظمات والهيئات غير الخاضعة للولاية القضائية الوطنية',
     'International organizations, embassies, consulates',
     'المنظمات الدولية والسفارات والقنصليات',
     'pi pi-flag', 1,
     '[]'::JSONB, '[]'::JSONB, true, 21, NOW());

-- Step 4: Update any references in other tables
-- Update company_profiles to use ISIC4 codes (skip if not exists)
/*
UPDATE company_profiles
SET industry_sector =
    CASE
        WHEN industry_sector IN ('banking', 'finance') THEN 'K'
        WHEN industry_sector IN ('healthcare', 'health') THEN 'Q'
        WHEN industry_sector IN ('technology', 'it', 'software') THEN 'J'
        WHEN industry_sector IN ('government', 'public') THEN 'O'
        WHEN industry_sector IN ('education') THEN 'P'
        WHEN industry_sector IN ('manufacturing') THEN 'C'
        WHEN industry_sector IN ('retail', 'e-commerce') THEN 'G'
        WHEN industry_sector IN ('real_estate', 'realestate') THEN 'L'
        WHEN industry_sector IN ('energy', 'utilities') THEN 'D'
        WHEN industry_sector IN ('telecom', 'telecommunications') THEN 'J'
        WHEN industry_sector IN ('logistics', 'transport', 'transportation') THEN 'H'
        WHEN industry_sector IN ('defense', 'security') THEN 'O'
        WHEN industry_sector IN ('media', 'entertainment') THEN 'R'
        WHEN industry_sector IN ('nonprofit', 'ngo') THEN 'S'
        ELSE 'S' -- Default to 'Other service activities'
    END
WHERE industry_sector IS NOT NULL;
*/

-- Update tenants industry column
UPDATE tenants
SET industry =
    CASE
        WHEN industry ILIKE '%bank%' OR industry ILIKE '%financ%' THEN 'K'
        WHEN industry ILIKE '%health%' OR industry ILIKE '%medic%' OR industry ILIKE '%pharma%' THEN 'Q'
        WHEN industry ILIKE '%tech%' OR industry ILIKE '%software%' OR industry ILIKE '%IT%' THEN 'J'
        WHEN industry ILIKE '%govern%' OR industry ILIKE '%public%' THEN 'O'
        WHEN industry ILIKE '%educat%' OR industry ILIKE '%school%' OR industry ILIKE '%universit%' THEN 'P'
        WHEN industry ILIKE '%manufactur%' OR industry ILIKE '%industr%' THEN 'C'
        WHEN industry ILIKE '%retail%' OR industry ILIKE '%commerce%' OR industry ILIKE '%shop%' THEN 'G'
        WHEN industry ILIKE '%real%estate%' OR industry ILIKE '%propert%' THEN 'L'
        WHEN industry ILIKE '%energy%' OR industry ILIKE '%oil%' OR industry ILIKE '%gas%' OR industry ILIKE '%electric%' THEN 'D'
        WHEN industry ILIKE '%telecom%' OR industry ILIKE '%commun%' THEN 'J'
        WHEN industry ILIKE '%transport%' OR industry ILIKE '%logistic%' OR industry ILIKE '%shipping%' THEN 'H'
        WHEN industry ILIKE '%construct%' OR industry ILIKE '%build%' THEN 'F'
        WHEN industry ILIKE '%agri%' OR industry ILIKE '%farm%' THEN 'A'
        WHEN industry ILIKE '%mining%' OR industry ILIKE '%quarr%' THEN 'B'
        WHEN industry ILIKE '%water%' OR industry ILIKE '%waste%' THEN 'E'
        WHEN industry ILIKE '%hotel%' OR industry ILIKE '%restaurant%' OR industry ILIKE '%food%' THEN 'I'
        WHEN industry ILIKE '%professional%' OR industry ILIKE '%consult%' OR industry ILIKE '%legal%' THEN 'M'
        WHEN industry ILIKE '%admin%' OR industry ILIKE '%support%' THEN 'N'
        WHEN industry ILIKE '%art%' OR industry ILIKE '%entertain%' OR industry ILIKE '%recreat%' THEN 'R'
        WHEN industry = 'other' THEN 'S'
        ELSE COALESCE(industry, 'S') -- Keep current if already single letter, else default to S
    END
WHERE LENGTH(industry) > 1; -- Only update if not already single letter code

-- Step 5: Create mapping table for reference
CREATE TABLE IF NOT EXISTS sector_code_mapping (
    old_code VARCHAR(50),
    new_isic4_code VARCHAR(1),
    description TEXT
);

INSERT INTO sector_code_mapping VALUES
    ('banking', 'K', 'Financial and insurance activities'),
    ('healthcare', 'Q', 'Human health and social work activities'),
    ('technology', 'J', 'Information and communication'),
    ('government', 'O', 'Public administration and defence'),
    ('education', 'P', 'Education'),
    ('manufacturing', 'C', 'Manufacturing'),
    ('retail', 'G', 'Wholesale and retail trade'),
    ('real_estate', 'L', 'Real estate activities'),
    ('energy', 'D', 'Electricity, gas, steam supply'),
    ('telecom', 'J', 'Information and communication'),
    ('logistics', 'H', 'Transportation and storage'),
    ('defense', 'O', 'Public administration and defence'),
    ('media', 'R', 'Arts, entertainment and recreation'),
    ('nonprofit', 'S', 'Other service activities'),
    ('other', 'S', 'Other service activities');

-- Log the change
DO $$
DECLARE
    old_count INT;
    new_count INT;
BEGIN
    SELECT COUNT(*) INTO old_count FROM _backup_lookup_sectors_old;
    SELECT COUNT(*) INTO new_count FROM lookup_sectors;

    RAISE NOTICE 'Sector Migration Complete';
    RAISE NOTICE '========================';
    RAISE NOTICE 'Previous sectors: %', old_count;
    RAISE NOTICE 'New ISIC4 sectors: %', new_count;
    RAISE NOTICE 'Backup table: _backup_lookup_sectors_old';
END $$;

COMMIT;