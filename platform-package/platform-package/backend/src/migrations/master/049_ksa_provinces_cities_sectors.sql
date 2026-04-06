-- =====================================================
-- Migration 005: KSA Provinces, Cities, and ISIC4 Sectors
-- Source: Official Saudi Government Data
-- References:
--   - Royal Order A/92 (March 2, 1992) - Law of the Provinces
--   - ISIC4 Classification (UN Economic and Social Council)
--   - GASTAT (General Authority for Statistics)
-- Last Updated: 2026-03-02
-- =====================================================

-- =====================================================
-- 1. DATA SOURCE REFERENCE TABLE
-- Track all official sources for regulatory compliance
-- =====================================================
CREATE TABLE IF NOT EXISTS lookup_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  source_name VARCHAR(255) NOT NULL,
  source_url TEXT,
  source_document VARCHAR(255),
  source_date DATE,
  last_verified DATE,
  verification_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2. KSA PROVINCES TABLE (13 Official Provinces)
-- Source: Royal Order A/92, Law of the Provinces
-- =====================================================
CREATE TABLE IF NOT EXISTS lookup_ksa_provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_code VARCHAR(10) UNIQUE NOT NULL,
  province_name_en VARCHAR(100) NOT NULL,
  province_name_ar VARCHAR(100) NOT NULL,
  capital_city_en VARCHAR(100) NOT NULL,
  capital_city_ar VARCHAR(100),
  region_type VARCHAR(50), -- Historical region classification
  governorates_count INT,
  established_date DATE DEFAULT '1992-03-02', -- Royal Order A/92
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert KSA 13 Provinces with Official Data
-- Source: Ministry of Interior, Royal Order A/92
INSERT INTO lookup_ksa_provinces (province_code, province_name_en, province_name_ar, capital_city_en, capital_city_ar, region_type, governorates_count, sort_order)
VALUES
  ('RY', 'Riyadh', 'الرياض', 'Riyadh', 'الرياض', 'Najd', 20, 1),
  ('MK', 'Makkah', 'مكة المكرمة', 'Makkah', 'مكة المكرمة', 'Hejaz', 16, 2),
  ('MD', 'Al Madinah', 'المدينة المنورة', 'Medina', 'المدينة المنورة', 'Hejaz', 8, 3),
  ('EP', 'Eastern Province', 'الشرقية', 'Dammam', 'الدمام', 'Eastern', 12, 4),
  ('AS', 'Asir', 'عسير', 'Abha', 'أبها', 'Asir', 15, 5),
  ('TB', 'Tabuk', 'تبوك', 'Tabuk', 'تبوك', 'North', 6, 6),
  ('QS', 'Al Qassim', 'القصيم', 'Buraydah', 'بريدة', 'Najd', 12, 7),
  ('HL', 'Hail', 'حائل', 'Hail', 'حائل', 'North', 8, 8),
  ('NB', 'Northern Borders', 'الحدود الشمالية', 'Arar', 'عرعر', 'North', 3, 9),
  ('JZ', 'Jazan', 'جازان', 'Jazan', 'جازان', 'South', 16, 10),
  ('NJ', 'Najran', 'نجران', 'Najran', 'نجران', 'South', 8, 11),
  ('BH', 'Al Bahah', 'الباحة', 'Al Bahah', 'الباحة', 'Hejaz', 9, 12),
  ('JF', 'Al Jawf', 'الجوف', 'Sakakah', 'سكاكا', 'North', 3, 13)
ON CONFLICT (province_code) DO UPDATE SET
  province_name_en = EXCLUDED.province_name_en,
  province_name_ar = EXCLUDED.province_name_ar,
  capital_city_en = EXCLUDED.capital_city_en,
  capital_city_ar = EXCLUDED.capital_city_ar,
  governorates_count = EXCLUDED.governorates_count,
  updated_at = NOW()
WHERE (lookup_ksa_provinces.province_name_en, lookup_ksa_provinces.governorates_count)
  IS DISTINCT FROM (EXCLUDED.province_name_en, EXCLUDED.governorates_count);

-- =====================================================
-- 3. KSA CITIES TABLE (Major Cities)
-- Source: GASTAT, Ministry of Municipal and Rural Affairs
-- =====================================================
CREATE TABLE IF NOT EXISTS lookup_ksa_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_code VARCHAR(20) UNIQUE NOT NULL,
  city_name_en VARCHAR(100) NOT NULL,
  city_name_ar VARCHAR(100) NOT NULL,
  province_code VARCHAR(10) NOT NULL REFERENCES lookup_ksa_provinces(province_code),
  city_type VARCHAR(50), -- Capital, Major City, Governorate Seat
  population_estimate INT, -- From latest GASTAT data
  is_provincial_capital BOOLEAN DEFAULT FALSE,
  is_major_urban_center BOOLEAN DEFAULT FALSE, -- 10 major urban centers
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert Major KSA Cities (Top 20+)
-- Source: GASTAT Census Data, Official Municipal Records
INSERT INTO lookup_ksa_cities (city_code, city_name_en, city_name_ar, province_code, city_type, is_provincial_capital, is_major_urban_center, sort_order)
VALUES
  -- Provincial Capitals
  ('RYD', 'Riyadh', 'الرياض', 'RY', 'National Capital', TRUE, TRUE, 1),
  ('MKH', 'Makkah', 'مكة المكرمة', 'MK', 'Holy City', TRUE, TRUE, 2),
  ('MDN', 'Medina', 'المدينة المنورة', 'MD', 'Holy City', TRUE, TRUE, 3),
  ('DMM', 'Dammam', 'الدمام', 'EP', 'Provincial Capital', TRUE, TRUE, 4),
  ('ABH', 'Abha', 'أبها', 'AS', 'Provincial Capital', TRUE, FALSE, 5),
  ('TBK', 'Tabuk', 'تبوك', 'TB', 'Provincial Capital', TRUE, FALSE, 6),
  ('BRD', 'Buraydah', 'بريدة', 'QS', 'Provincial Capital', TRUE, TRUE, 7),
  ('HLL', 'Hail', 'حائل', 'HL', 'Provincial Capital', TRUE, FALSE, 8),
  ('ARR', 'Arar', 'عرعر', 'NB', 'Provincial Capital', TRUE, FALSE, 9),
  ('JZN', 'Jazan', 'جازان', 'JZ', 'Provincial Capital', TRUE, FALSE, 10),
  ('NJR', 'Najran', 'نجران', 'NJ', 'Provincial Capital', TRUE, FALSE, 11),
  ('BAH', 'Al Bahah', 'الباحة', 'BH', 'Provincial Capital', TRUE, FALSE, 12),
  ('SKK', 'Sakakah', 'سكاكا', 'JF', 'Provincial Capital', TRUE, FALSE, 13),

  -- Other Major Cities
  ('JED', 'Jeddah', 'جدة', 'MK', 'Major City', FALSE, TRUE, 14),
  ('TIF', 'Taif', 'الطائف', 'MK', 'Major City', FALSE, TRUE, 15),
  ('KBR', 'Khobar', 'الخبر', 'EP', 'Major City', FALSE, TRUE, 16),
  ('DHR', 'Dhahran', 'الظهران', 'EP', 'Major City', FALSE, TRUE, 17),
  ('HFS', 'Hofuf', 'الهفوف', 'EP', 'Major City', FALSE, TRUE, 18),
  ('JBL', 'Jubail', 'الجبيل', 'EP', 'Industrial City', FALSE, FALSE, 19),
  ('YNB', 'Yanbu', 'ينبع', 'MD', 'Industrial City', FALSE, TRUE, 20),
  ('UNZ', 'Unaizah', 'عنيزة', 'QS', 'Major City', FALSE, FALSE, 21),
  ('KMI', 'Khamis Mushait', 'خميس مشيط', 'AS', 'Major City', FALSE, FALSE, 22),
  ('QTF', 'Qatif', 'القطيف', 'EP', 'Major City', FALSE, FALSE, 23),
  ('RAS', 'Ras Tanura', 'رأس تنورة', 'EP', 'Industrial City', FALSE, FALSE, 24),
  ('KHJ', 'Al Kharj', 'الخرج', 'RY', 'Major City', FALSE, FALSE, 25)
ON CONFLICT (city_code) DO UPDATE SET
  city_name_en = EXCLUDED.city_name_en,
  city_name_ar = EXCLUDED.city_name_ar,
  province_code = EXCLUDED.province_code,
  city_type = EXCLUDED.city_type,
  updated_at = NOW()
WHERE (lookup_ksa_cities.city_name_en, lookup_ksa_cities.province_code)
  IS DISTINCT FROM (EXCLUDED.city_name_en, EXCLUDED.province_code);

-- =====================================================
-- 4. OFFICIAL ISIC4 SECTORS (21 Sections)
-- Source: UN ISIC Rev.4, adopted by Saudi Arabia Jan 1, 2018
-- =====================================================
CREATE TABLE IF NOT EXISTS lookup_isic4_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_code CHAR(1) UNIQUE NOT NULL,
  sector_name_en VARCHAR(255) NOT NULL,
  sector_name_ar VARCHAR(255),
  description_en TEXT,
  division_range VARCHAR(20), -- e.g., "01-03" for section A
  total_divisions INT,
  applicable_regulators TEXT[], -- SAMA, NCA, CMA, etc.
  applicable_frameworks TEXT[], -- NCA ECC, SAMA CSF, etc.
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert ISIC4 21 Sections
-- Source: UN Statistics Division ISIC Rev.4
INSERT INTO lookup_isic4_sectors (section_code, sector_name_en, division_range, total_divisions, sort_order)
VALUES
  ('A', 'Agriculture, forestry and fishing', '01-03', 3, 1),
  ('B', 'Mining and quarrying', '05-09', 5, 2),
  ('C', 'Manufacturing', '10-33', 24, 3),
  ('D', 'Electricity, gas, steam and air conditioning supply', '35', 1, 4),
  ('E', 'Water supply; sewerage, waste management and remediation activities', '36-39', 4, 5),
  ('F', 'Construction', '41-43', 3, 6),
  ('G', 'Wholesale and retail trade; repair of motor vehicles and motorcycles', '45-47', 3, 7),
  ('H', 'Transportation and storage', '49-53', 5, 8),
  ('I', 'Accommodation and food service activities', '55-56', 2, 9),
  ('J', 'Information and communication', '58-63', 6, 10),
  ('K', 'Financial and insurance activities', '64-66', 3, 11),
  ('L', 'Real estate activities', '68', 1, 12),
  ('M', 'Professional, scientific and technical activities', '69-75', 7, 13),
  ('N', 'Administrative and support service activities', '77-82', 6, 14),
  ('O', 'Public administration and defence; compulsory social security', '84', 1, 15),
  ('P', 'Education', '85', 1, 16),
  ('Q', 'Human health and social work activities', '86-88', 3, 17),
  ('R', 'Arts, entertainment and recreation', '90-93', 4, 18),
  ('S', 'Other service activities', '94-96', 3, 19),
  ('T', 'Activities of households as employers', '97-98', 2, 20),
  ('U', 'Activities of extraterritorial organizations and bodies', '99', 1, 21)
ON CONFLICT (section_code) DO UPDATE SET
  sector_name_en = EXCLUDED.sector_name_en,
  division_range = EXCLUDED.division_range,
  total_divisions = EXCLUDED.total_divisions,
  updated_at = NOW()
WHERE lookup_isic4_sectors.sector_name_en IS DISTINCT FROM EXCLUDED.sector_name_en;

-- =====================================================
-- 5. DATA SOURCE REFERENCES
-- Document all sources for audit trail
-- =====================================================
INSERT INTO lookup_data_sources (table_name, source_name, source_document, source_date, last_verified)
VALUES
  ('lookup_ksa_provinces', 'Royal Order A/92 - Law of the Provinces', 'Royal Order A/92', '1992-03-02', CURRENT_DATE),
  ('lookup_ksa_provinces', 'Ministry of Interior - Region Affairs', 'moi.gov.sa/regions', '2024-01-01', CURRENT_DATE),
  ('lookup_ksa_cities', 'General Authority for Statistics (GASTAT)', 'stats.gov.sa', '2024-01-01', CURRENT_DATE),
  ('lookup_isic4_sectors', 'UN Statistics Division ISIC Rev.4', 'unstats.un.org/unsd/publication/seriesm/seriesm_4rev4e.pdf', '2008-08-01', CURRENT_DATE),
  ('lookup_isic4_sectors', 'Saudi Arabia ISIC4 Adoption', 'Ministry of Commerce Circular', '2018-01-01', CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_provinces_code ON lookup_ksa_provinces(province_code);
CREATE INDEX IF NOT EXISTS idx_cities_province ON lookup_ksa_cities(province_code);
CREATE INDEX IF NOT EXISTS idx_cities_type ON lookup_ksa_cities(city_type);
CREATE INDEX IF NOT EXISTS idx_isic4_code ON lookup_isic4_sectors(section_code);
CREATE INDEX IF NOT EXISTS idx_data_sources_table ON lookup_data_sources(table_name);

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================
SELECT 'Migration 005 Complete' AS status,
  (SELECT COUNT(*) FROM lookup_ksa_provinces) AS provinces_count,
  (SELECT COUNT(*) FROM lookup_ksa_cities) AS cities_count,
  (SELECT COUNT(*) FROM lookup_isic4_sectors) AS isic4_sectors_count,
  (SELECT COUNT(*) FROM lookup_data_sources) AS data_sources_count;