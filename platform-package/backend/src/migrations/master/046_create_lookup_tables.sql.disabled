-- =====================================================
-- DEPRECATED — Legacy lookup tables for onboarding
-- =====================================================
-- Superseded by master/003_onboarding_v2_tables.sql
-- Kept for reference; do NOT run on new environments.
-- =====================================================
--
-- ORIGINAL DESCRIPTION:
-- This migration creates lookup tables for countries, cities,
-- sectors, timezones, languages and other reference data
-- =====================================================

-- 1. COUNTRIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS lookup_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) UNIQUE NOT NULL,
  country_code_3 VARCHAR(3) UNIQUE NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  dial_code VARCHAR(10),
  flag_emoji VARCHAR(10),
  continent VARCHAR(50),
  currency_code VARCHAR(3),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_countries_code ON lookup_countries(country_code);
CREATE INDEX idx_countries_active ON lookup_countries(is_active) WHERE is_active = true;
CREATE INDEX idx_countries_name_en ON lookup_countries(name_en);

-- 2. CITIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS lookup_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_code VARCHAR(50) UNIQUE NOT NULL,
  city_name_en VARCHAR(255) NOT NULL,
  city_name_ar VARCHAR(255) NOT NULL,
  country_code VARCHAR(2) NOT NULL REFERENCES lookup_countries(country_code),
  state_province VARCHAR(255),
  region VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  population INTEGER,
  is_capital BOOLEAN DEFAULT false,
  is_major_city BOOLEAN DEFAULT false,
  timezone VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cities_code ON lookup_cities(city_code);
CREATE INDEX idx_cities_country ON lookup_cities(country_code);
CREATE INDEX idx_cities_active ON lookup_cities(is_active) WHERE is_active = true;
CREATE INDEX idx_cities_name_en ON lookup_cities(city_name_en);
CREATE INDEX idx_cities_major ON lookup_cities(is_major_city) WHERE is_major_city = true;

-- Full text search index for city names
CREATE INDEX idx_cities_search_en ON lookup_cities USING gin(to_tsvector('english', city_name_en));
CREATE INDEX idx_cities_search_ar ON lookup_cities USING gin(to_tsvector('arabic', city_name_ar));

-- 3. INDUSTRY SECTORS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS lookup_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_code VARCHAR(50) UNIQUE NOT NULL,
  parent_sector_code VARCHAR(50),
  sector_name_en VARCHAR(255) NOT NULL,
  sector_name_ar VARCHAR(255) NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  icon_class VARCHAR(100),
  color_code VARCHAR(7),
  level INTEGER DEFAULT 1, -- 1=primary, 2=sub-sector, 3=specific
  naics_code VARCHAR(10), -- North American Industry Classification
  isic_code VARCHAR(10), -- International Standard Industrial Classification
  regulatory_requirements JSONB DEFAULT '[]',
  typical_frameworks JSONB DEFAULT '[]', -- Common frameworks for this sector
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sectors_code ON lookup_sectors(sector_code);
CREATE INDEX idx_sectors_parent ON lookup_sectors(parent_sector_code);
CREATE INDEX idx_sectors_level ON lookup_sectors(level);
CREATE INDEX idx_sectors_active ON lookup_sectors(is_active) WHERE is_active = true;
CREATE INDEX idx_sectors_name_en ON lookup_sectors(sector_name_en);

-- Full text search for sectors
CREATE INDEX idx_sectors_search_en ON lookup_sectors USING gin(to_tsvector('english', sector_name_en || ' ' || COALESCE(description_en, '')));
CREATE INDEX idx_sectors_search_ar ON lookup_sectors USING gin(to_tsvector('arabic', sector_name_ar || ' ' || COALESCE(description_ar, '')));

-- 4. TIMEZONES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS lookup_timezones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timezone_code VARCHAR(100) UNIQUE NOT NULL,
  timezone_name VARCHAR(255) NOT NULL,
  utc_offset VARCHAR(10) NOT NULL,
  utc_offset_minutes INTEGER NOT NULL,
  dst_offset VARCHAR(10),
  countries TEXT[],
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timezones_code ON lookup_timezones(timezone_code);
CREATE INDEX idx_timezones_active ON lookup_timezones(is_active) WHERE is_active = true;
CREATE INDEX idx_timezones_offset ON lookup_timezones(utc_offset_minutes);

-- 5. LANGUAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS lookup_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code VARCHAR(10) UNIQUE NOT NULL, -- ISO 639-1 or 639-3
  language_name_en VARCHAR(255) NOT NULL,
  language_name_native VARCHAR(255) NOT NULL,
  language_family VARCHAR(100),
  script VARCHAR(50),
  rtl BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false, -- Primary languages for the platform
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_languages_code ON lookup_languages(language_code);
CREATE INDEX idx_languages_primary ON lookup_languages(is_primary) WHERE is_primary = true;
CREATE INDEX idx_languages_active ON lookup_languages(is_active) WHERE is_active = true;

-- 6. EMPLOYEE SIZE RANGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS lookup_employee_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  range_code VARCHAR(50) UNIQUE NOT NULL,
  range_label_en VARCHAR(100) NOT NULL,
  range_label_ar VARCHAR(100) NOT NULL,
  min_employees INTEGER,
  max_employees INTEGER,
  enterprise_type VARCHAR(50), -- micro, small, medium, large, enterprise
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emp_ranges_code ON lookup_employee_ranges(range_code);
CREATE INDEX idx_emp_ranges_active ON lookup_employee_ranges(is_active) WHERE is_active = true;

-- 7. REGULATORY FRAMEWORKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS lookup_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_code VARCHAR(50) UNIQUE NOT NULL,
  framework_name VARCHAR(255) NOT NULL,
  framework_acronym VARCHAR(50),
  description_en TEXT,
  description_ar TEXT,
  regulatory_body VARCHAR(255),
  jurisdiction VARCHAR(100),
  applicable_sectors JSONB DEFAULT '[]',
  compliance_level VARCHAR(50), -- mandatory, recommended, optional
  version VARCHAR(50),
  effective_date DATE,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_frameworks_code ON lookup_frameworks(framework_code);
CREATE INDEX idx_frameworks_active ON lookup_frameworks(is_active) WHERE is_active = true;
CREATE INDEX idx_frameworks_compliance ON lookup_frameworks(compliance_level);

-- =====================================================
-- SEED DATA - COUNTRIES (Sample - Add more as needed)
-- =====================================================
INSERT INTO lookup_countries (country_code, country_code_3, name_en, name_ar, dial_code, flag_emoji, continent, currency_code, sort_order) VALUES
  ('SA', 'SAU', 'Saudi Arabia', 'المملكة العربية السعودية', '+966', '🇸🇦', 'Asia', 'SAR', 1),
  ('AE', 'ARE', 'United Arab Emirates', 'الإمارات العربية المتحدة', '+971', '🇦🇪', 'Asia', 'AED', 2),
  ('KW', 'KWT', 'Kuwait', 'الكويت', '+965', '🇰🇼', 'Asia', 'KWD', 3),
  ('QA', 'QAT', 'Qatar', 'قطر', '+974', '🇶🇦', 'Asia', 'QAR', 4),
  ('BH', 'BHR', 'Bahrain', 'البحرين', '+973', '🇧🇭', 'Asia', 'BHD', 5),
  ('OM', 'OMN', 'Oman', 'عُمان', '+968', '🇴🇲', 'Asia', 'OMR', 6),
  ('JO', 'JOR', 'Jordan', 'الأردن', '+962', '🇯🇴', 'Asia', 'JOD', 7),
  ('EG', 'EGY', 'Egypt', 'مصر', '+20', '🇪🇬', 'Africa', 'EGP', 8),
  ('US', 'USA', 'United States', 'الولايات المتحدة', '+1', '🇺🇸', 'North America', 'USD', 9),
  ('GB', 'GBR', 'United Kingdom', 'المملكة المتحدة', '+44', '🇬🇧', 'Europe', 'GBP', 10),
  ('FR', 'FRA', 'France', 'فرنسا', '+33', '🇫🇷', 'Europe', 'EUR', 11),
  ('DE', 'DEU', 'Germany', 'ألمانيا', '+49', '🇩🇪', 'Europe', 'EUR', 12),
  ('CA', 'CAN', 'Canada', 'كندا', '+1', '🇨🇦', 'North America', 'CAD', 13),
  ('AU', 'AUS', 'Australia', 'أستراليا', '+61', '🇦🇺', 'Oceania', 'AUD', 14),
  ('IN', 'IND', 'India', 'الهند', '+91', '🇮🇳', 'Asia', 'INR', 15),
  ('CN', 'CHN', 'China', 'الصين', '+86', '🇨🇳', 'Asia', 'CNY', 16),
  ('JP', 'JPN', 'Japan', 'اليابان', '+81', '🇯🇵', 'Asia', 'JPY', 17),
  ('SG', 'SGP', 'Singapore', 'سنغافورة', '+65', '🇸🇬', 'Asia', 'SGD', 18),
  ('MY', 'MYS', 'Malaysia', 'ماليزيا', '+60', '🇲🇾', 'Asia', 'MYR', 19),
  ('TR', 'TUR', 'Turkey', 'تركيا', '+90', '🇹🇷', 'Asia', 'TRY', 20)
ON CONFLICT (country_code) DO NOTHING;

-- =====================================================
-- SEED DATA - MAJOR CITIES (Comprehensive list)
-- =====================================================
INSERT INTO lookup_cities (city_code, city_name_en, city_name_ar, country_code, state_province, is_capital, is_major_city, timezone, sort_order) VALUES
  -- Saudi Arabia Cities
  ('SA_RUH', 'Riyadh', 'الرياض', 'SA', 'Riyadh Province', true, true, 'Asia/Riyadh', 1),
  ('SA_JED', 'Jeddah', 'جدة', 'SA', 'Makkah Province', false, true, 'Asia/Riyadh', 2),
  ('SA_MED', 'Medina', 'المدينة المنورة', 'SA', 'Medina Province', false, true, 'Asia/Riyadh', 3),
  ('SA_DAM', 'Dammam', 'الدمام', 'SA', 'Eastern Province', false, true, 'Asia/Riyadh', 4),
  ('SA_KHO', 'Khobar', 'الخبر', 'SA', 'Eastern Province', false, true, 'Asia/Riyadh', 5),
  ('SA_MEC', 'Mecca', 'مكة المكرمة', 'SA', 'Makkah Province', false, true, 'Asia/Riyadh', 6),
  ('SA_TAI', 'Taif', 'الطائف', 'SA', 'Makkah Province', false, false, 'Asia/Riyadh', 7),
  ('SA_BUR', 'Buraidah', 'بريدة', 'SA', 'Qassim Province', false, false, 'Asia/Riyadh', 8),
  ('SA_TAB', 'Tabuk', 'تبوك', 'SA', 'Tabuk Province', false, false, 'Asia/Riyadh', 9),
  ('SA_ABH', 'Abha', 'أبها', 'SA', 'Asir Province', false, false, 'Asia/Riyadh', 10),
  ('SA_KHM', 'Khamis Mushait', 'خميس مشيط', 'SA', 'Asir Province', false, false, 'Asia/Riyadh', 11),
  ('SA_HAI', 'Hail', 'حائل', 'SA', 'Hail Province', false, false, 'Asia/Riyadh', 12),
  ('SA_NAJ', 'Najran', 'نجران', 'SA', 'Najran Province', false, false, 'Asia/Riyadh', 13),
  ('SA_JIZ', 'Jizan', 'جازان', 'SA', 'Jizan Province', false, false, 'Asia/Riyadh', 14),
  ('SA_YAN', 'Yanbu', 'ينبع', 'SA', 'Medina Province', false, false, 'Asia/Riyadh', 15),
  ('SA_JUB', 'Jubail', 'الجبيل', 'SA', 'Eastern Province', false, false, 'Asia/Riyadh', 16),
  ('SA_HOF', 'Hofuf', 'الهفوف', 'SA', 'Eastern Province', false, false, 'Asia/Riyadh', 17),
  ('SA_UNA', 'Unaizah', 'عنيزة', 'SA', 'Qassim Province', false, false, 'Asia/Riyadh', 18),
  ('SA_ARA', 'Arar', 'عرعر', 'SA', 'Northern Borders', false, false, 'Asia/Riyadh', 19),
  ('SA_SAK', 'Sakaka', 'سكاكا', 'SA', 'Al-Jouf Province', false, false, 'Asia/Riyadh', 20),

  -- UAE Cities
  ('AE_DXB', 'Dubai', 'دبي', 'AE', 'Dubai', false, true, 'Asia/Dubai', 21),
  ('AE_AUH', 'Abu Dhabi', 'أبو ظبي', 'AE', 'Abu Dhabi', true, true, 'Asia/Dubai', 22),
  ('AE_SHJ', 'Sharjah', 'الشارقة', 'AE', 'Sharjah', false, true, 'Asia/Dubai', 23),
  ('AE_AJM', 'Ajman', 'عجمان', 'AE', 'Ajman', false, false, 'Asia/Dubai', 24),
  ('AE_RAK', 'Ras Al Khaimah', 'رأس الخيمة', 'AE', 'Ras Al Khaimah', false, false, 'Asia/Dubai', 25),
  ('AE_FUJ', 'Fujairah', 'الفجيرة', 'AE', 'Fujairah', false, false, 'Asia/Dubai', 26),
  ('AE_UAQ', 'Umm Al Quwain', 'أم القيوين', 'AE', 'Umm Al Quwain', false, false, 'Asia/Dubai', 27),
  ('AE_AIN', 'Al Ain', 'العين', 'AE', 'Abu Dhabi', false, true, 'Asia/Dubai', 28),

  -- Kuwait Cities
  ('KW_KWI', 'Kuwait City', 'مدينة الكويت', 'KW', 'Al Asimah', true, true, 'Asia/Kuwait', 29),
  ('KW_HAW', 'Hawalli', 'حولي', 'KW', 'Hawalli', false, true, 'Asia/Kuwait', 30),
  ('KW_FAR', 'Farwaniya', 'الفروانية', 'KW', 'Farwaniya', false, true, 'Asia/Kuwait', 31),
  ('KW_AHM', 'Ahmadi', 'الأحمدي', 'KW', 'Ahmadi', false, true, 'Asia/Kuwait', 32),
  ('KW_JAH', 'Jahra', 'الجهراء', 'KW', 'Jahra', false, false, 'Asia/Kuwait', 33),
  ('KW_MUB', 'Mubarak Al-Kabeer', 'مبارك الكبير', 'KW', 'Mubarak Al-Kabeer', false, false, 'Asia/Kuwait', 34),

  -- Qatar Cities
  ('QA_DOH', 'Doha', 'الدوحة', 'QA', 'Doha', true, true, 'Asia/Qatar', 35),
  ('QA_RAY', 'Al Rayyan', 'الريان', 'QA', 'Al Rayyan', false, true, 'Asia/Qatar', 36),
  ('QA_WAK', 'Al Wakrah', 'الوكرة', 'QA', 'Al Wakrah', false, false, 'Asia/Qatar', 37),
  ('QA_KHO', 'Al Khor', 'الخور', 'QA', 'Al Khor', false, false, 'Asia/Qatar', 38),
  ('QA_DAY', 'Al Daayen', 'الضعاين', 'QA', 'Al Daayen', false, false, 'Asia/Qatar', 39),
  ('QA_SHA', 'Al Shamal', 'الشمال', 'QA', 'Al Shamal', false, false, 'Asia/Qatar', 40),

  -- Bahrain Cities
  ('BH_MAN', 'Manama', 'المنامة', 'BH', 'Capital', true, true, 'Asia/Bahrain', 41),
  ('BH_MUH', 'Muharraq', 'المحرق', 'BH', 'Muharraq', false, true, 'Asia/Bahrain', 42),
  ('BH_RIF', 'Riffa', 'الرفاع', 'BH', 'Southern', false, true, 'Asia/Bahrain', 43),
  ('BH_HAM', 'Hamad Town', 'مدينة حمد', 'BH', 'Northern', false, false, 'Asia/Bahrain', 44),
  ('BH_ISA', 'Isa Town', 'مدينة عيسى', 'BH', 'Southern', false, false, 'Asia/Bahrain', 45),

  -- Oman Cities
  ('OM_MUS', 'Muscat', 'مسقط', 'OM', 'Muscat', true, true, 'Asia/Muscat', 46),
  ('OM_SAL', 'Salalah', 'صلالة', 'OM', 'Dhofar', false, true, 'Asia/Muscat', 47),
  ('OM_SOH', 'Sohar', 'صحار', 'OM', 'Al Batinah North', false, true, 'Asia/Muscat', 48),
  ('OM_NIZ', 'Nizwa', 'نزوى', 'OM', 'Ad Dakhiliyah', false, false, 'Asia/Muscat', 49),
  ('OM_SUR', 'Sur', 'صور', 'OM', 'Ash Sharqiyah South', false, false, 'Asia/Muscat', 50),

  -- Jordan Cities
  ('JO_AMM', 'Amman', 'عمّان', 'JO', 'Amman', true, true, 'Asia/Amman', 51),
  ('JO_ZAR', 'Zarqa', 'الزرقاء', 'JO', 'Zarqa', false, true, 'Asia/Amman', 52),
  ('JO_IRB', 'Irbid', 'إربد', 'JO', 'Irbid', false, true, 'Asia/Amman', 53),
  ('JO_AQA', 'Aqaba', 'العقبة', 'JO', 'Aqaba', false, false, 'Asia/Amman', 54),

  -- Egypt Cities
  ('EG_CAI', 'Cairo', 'القاهرة', 'EG', 'Cairo', true, true, 'Africa/Cairo', 55),
  ('EG_ALX', 'Alexandria', 'الإسكندرية', 'EG', 'Alexandria', false, true, 'Africa/Cairo', 56),
  ('EG_GIZ', 'Giza', 'الجيزة', 'EG', 'Giza', false, true, 'Africa/Cairo', 57),
  ('EG_SHA', 'Sharm El Sheikh', 'شرم الشيخ', 'EG', 'South Sinai', false, false, 'Africa/Cairo', 58),
  ('EG_HUR', 'Hurghada', 'الغردقة', 'EG', 'Red Sea', false, false, 'Africa/Cairo', 59),

  -- Other Major International Cities
  ('US_NYC', 'New York', 'نيويورك', 'US', 'New York', false, true, 'America/New_York', 60),
  ('US_LAX', 'Los Angeles', 'لوس أنجلوس', 'US', 'California', false, true, 'America/Los_Angeles', 61),
  ('US_CHI', 'Chicago', 'شيكاغو', 'US', 'Illinois', false, true, 'America/Chicago', 62),
  ('US_HOU', 'Houston', 'هيوستن', 'US', 'Texas', false, true, 'America/Chicago', 63),
  ('US_WDC', 'Washington DC', 'واشنطن', 'US', 'DC', true, true, 'America/New_York', 64),

  ('GB_LON', 'London', 'لندن', 'GB', 'England', true, true, 'Europe/London', 65),
  ('GB_MAN', 'Manchester', 'مانشستر', 'GB', 'England', false, true, 'Europe/London', 66),
  ('GB_BIR', 'Birmingham', 'برمنغهام', 'GB', 'England', false, true, 'Europe/London', 67),

  ('FR_PAR', 'Paris', 'باريس', 'FR', 'Ile-de-France', true, true, 'Europe/Paris', 68),
  ('FR_MAR', 'Marseille', 'مرسيليا', 'FR', 'Provence', false, true, 'Europe/Paris', 69),

  ('DE_BER', 'Berlin', 'برلين', 'DE', 'Berlin', true, true, 'Europe/Berlin', 70),
  ('DE_MUN', 'Munich', 'ميونيخ', 'DE', 'Bavaria', false, true, 'Europe/Berlin', 71),
  ('DE_FRA', 'Frankfurt', 'فرانكفورت', 'DE', 'Hesse', false, true, 'Europe/Berlin', 72),

  ('CA_TOR', 'Toronto', 'تورونتو', 'CA', 'Ontario', false, true, 'America/Toronto', 73),
  ('CA_VAN', 'Vancouver', 'فانكوفر', 'CA', 'British Columbia', false, true, 'America/Vancouver', 74),
  ('CA_OTT', 'Ottawa', 'أوتاوا', 'CA', 'Ontario', true, true, 'America/Toronto', 75),

  ('IN_DEL', 'New Delhi', 'نيودلهي', 'IN', 'Delhi', true, true, 'Asia/Kolkata', 76),
  ('IN_MUM', 'Mumbai', 'مومباي', 'IN', 'Maharashtra', false, true, 'Asia/Kolkata', 77),
  ('IN_BLR', 'Bangalore', 'بنغالور', 'IN', 'Karnataka', false, true, 'Asia/Kolkata', 78),

  ('SG_SIN', 'Singapore', 'سنغافورة', 'SG', 'Singapore', true, true, 'Asia/Singapore', 79),

  ('AU_SYD', 'Sydney', 'سيدني', 'AU', 'New South Wales', false, true, 'Australia/Sydney', 80),
  ('AU_MEL', 'Melbourne', 'ملبورن', 'AU', 'Victoria', false, true, 'Australia/Melbourne', 81),
  ('AU_CAN', 'Canberra', 'كانبيرا', 'AU', 'ACT', true, true, 'Australia/Sydney', 82)
ON CONFLICT (city_code) DO NOTHING;

-- =====================================================
-- SEED DATA - INDUSTRY SECTORS (Comprehensive)
-- =====================================================
INSERT INTO lookup_sectors (sector_code, parent_sector_code, sector_name_en, sector_name_ar, level, icon_class, regulatory_requirements, typical_frameworks, sort_order) VALUES
  -- Primary Sectors
  ('FINANCE', NULL, 'Financial Services', 'الخدمات المالية', 1, 'pi-dollar', '["SAMA", "CMA", "Basel III"]', '["ISO 27001", "PCI DSS", "SOC 2"]', 1),
  ('HEALTHCARE', NULL, 'Healthcare', 'الرعاية الصحية', 1, 'pi-heart', '["MOH", "SFDA", "HIPAA"]', '["ISO 27799", "HIPAA", "HITRUST"]', 2),
  ('ENERGY', NULL, 'Energy & Utilities', 'الطاقة والمرافق', 1, 'pi-bolt', '["NERC", "FERC"]', '["ISO 50001", "NERC CIP"]', 3),
  ('GOVERNMENT', NULL, 'Government', 'الحكومة', 1, 'pi-building', '["NCA", "NDMO"]', '["ISO 27001", "NIST"]', 4),
  ('TELECOM', NULL, 'Telecommunications', 'الاتصالات', 1, 'pi-wifi', '["CITC", "FCC"]', '["ISO 27001", "TL 9000"]', 5),
  ('RETAIL', NULL, 'Retail & E-commerce', 'التجزئة والتجارة الإلكترونية', 1, 'pi-shopping-cart', '["MOC", "Consumer Protection"]', '["PCI DSS", "ISO 27001"]', 6),
  ('MANUFACTURING', NULL, 'Manufacturing', 'التصنيع', 1, 'pi-cog', '["SASO", "SIDF"]', '["ISO 9001", "ISO 14001"]', 7),
  ('EDUCATION', NULL, 'Education', 'التعليم', 1, 'pi-book', '["MOE", "ETEC"]', '["ISO 21001", "FERPA"]', 8),
  ('REALESTATE', NULL, 'Real Estate', 'العقارات', 1, 'pi-home', '["REGA", "MOH"]', '["ISO 41001"]', 9),
  ('TRANSPORT', NULL, 'Transportation & Logistics', 'النقل واللوجستيات', 1, 'pi-truck', '["MOT", "GACA"]', '["ISO 39001", "TAPA"]', 10),
  ('TECHNOLOGY', NULL, 'Technology', 'التقنية', 1, 'pi-desktop', '["MCIT", "CITC"]', '["ISO 27001", "SOC 2", "ISO 20000"]', 11),
  ('HOSPITALITY', NULL, 'Hospitality & Tourism', 'الضيافة والسياحة', 1, 'pi-globe', '["MOT", "STA"]', '["ISO 22000", "HACCP"]', 12),
  ('AGRICULTURE', NULL, 'Agriculture & Food', 'الزراعة والغذاء', 1, 'pi-apple', '["MEWA", "SFDA"]', '["ISO 22000", "HACCP", "GlobalGAP"]', 13),
  ('MEDIA', NULL, 'Media & Entertainment', 'الإعلام والترفيه', 1, 'pi-video', '["MOI", "GCAM"]', '["ISO 27001"]', 14),
  ('AEROSPACE', NULL, 'Aerospace & Defense', 'الفضاء والدفاع', 1, 'pi-send', '["GACA", "MOD"]', '["AS9100", "CMMC"]', 15),
  ('AUTOMOTIVE', NULL, 'Automotive', 'السيارات', 1, 'pi-car', '["SASO", "MOT"]', '["IATF 16949", "ISO 26262"]', 16),
  ('CONSTRUCTION', NULL, 'Construction', 'البناء والتشييد', 1, 'pi-hammer', '["MOH", "MOMRA"]', '["ISO 45001", "ISO 14001"]', 17),
  ('INSURANCE', NULL, 'Insurance', 'التأمين', 1, 'pi-shield', '["SAMA", "CHI"]', '["ISO 27001", "Solvency II"]', 18),
  ('LEGAL', NULL, 'Legal Services', 'الخدمات القانونية', 1, 'pi-briefcase', '["MOJ", "SBA"]', '["ISO 27001"]', 19),
  ('PHARMACEUTICAL', NULL, 'Pharmaceutical', 'الأدوية', 1, 'pi-box', '["SFDA", "MOH"]', '["GMP", "ISO 13485"]', 20),
  ('CONSULTING', NULL, 'Consulting Services', 'الخدمات الاستشارية', 1, 'pi-users', '[]', '["ISO 9001", "ISO 27001"]', 21),
  ('NONPROFIT', NULL, 'Non-Profit', 'غير الربحية', 1, 'pi-heart-fill', '["MHRSD", "NCNP"]', '["ISO 9001"]', 22),
  ('SPORTS', NULL, 'Sports & Recreation', 'الرياضة والترفيه', 1, 'pi-star', '["MOS", "GSA"]', '["ISO 20121"]', 23),
  ('MINING', NULL, 'Mining & Metals', 'التعدين والمعادن', 1, 'pi-database', '["MIM", "DMMR"]', '["ISO 14001", "ISO 45001"]', 24),
  ('CHEMICAL', NULL, 'Chemical', 'الكيماويات', 1, 'pi-box', '["SIDF", "GPCA"]', '["ISO 14001", "Responsible Care"]', 25),

  -- Finance Sub-sectors
  ('BANKING', 'FINANCE', 'Banking', 'البنوك', 2, 'pi-building', '["SAMA", "Basel III"]', '["ISO 27001", "PCI DSS"]', 26),
  ('INVESTMENT', 'FINANCE', 'Investment & Asset Management', 'إدارة الاستثمار والأصول', 2, 'pi-chart-line', '["CMA"]', '["ISO 27001", "SOC 2"]', 27),
  ('ISLAMIC_FINANCE', 'FINANCE', 'Islamic Finance', 'التمويل الإسلامي', 2, 'pi-star', '["AAOIFI", "IFSB"]', '["ISO 27001"]', 28),
  ('FINTECH', 'FINANCE', 'Financial Technology', 'التقنية المالية', 2, 'pi-credit-card', '["SAMA", "PCI DSS"]', '["ISO 27001", "PCI DSS"]', 29),
  ('PAYMENT', 'FINANCE', 'Payment Services', 'خدمات الدفع', 2, 'pi-wallet', '["SAMA", "PCI DSS"]', '["PCI DSS", "ISO 27001"]', 30),

  -- Healthcare Sub-sectors
  ('HOSPITAL', 'HEALTHCARE', 'Hospitals', 'المستشفيات', 2, 'pi-building', '["MOH", "CBAHI"]', '["JCI", "ISO 15189"]', 31),
  ('CLINIC', 'HEALTHCARE', 'Clinics & Medical Centers', 'العيادات والمراكز الطبية', 2, 'pi-plus', '["MOH"]', '["ISO 9001", "ISO 15189"]', 32),
  ('PHARMA_DIST', 'HEALTHCARE', 'Pharmaceutical Distribution', 'توزيع الأدوية', 2, 'pi-truck', '["SFDA"]', '["GDP", "ISO 9001"]', 33),
  ('MEDICAL_DEVICE', 'HEALTHCARE', 'Medical Devices', 'الأجهزة الطبية', 2, 'pi-box', '["SFDA", "FDA"]', '["ISO 13485", "ISO 14971"]', 34),
  ('HEALTH_INSURANCE', 'HEALTHCARE', 'Health Insurance', 'التأمين الصحي', 2, 'pi-shield', '["CHI", "CCHI"]', '["ISO 27001"]', 35),

  -- Energy Sub-sectors
  ('OIL_GAS', 'ENERGY', 'Oil & Gas', 'النفط والغاز', 2, 'pi-filter', '["MEIM", "EPA"]', '["ISO 14001", "API"]', 36),
  ('RENEWABLE', 'ENERGY', 'Renewable Energy', 'الطاقة المتجددة', 2, 'pi-sun', '["REPDO", "SEC"]', '["ISO 50001", "ISO 14001"]', 37),
  ('ELECTRICITY', 'ENERGY', 'Electricity', 'الكهرباء', 2, 'pi-bolt', '["SEC", "ECRA"]', '["ISO 50001", "NERC CIP"]', 38),
  ('WATER', 'ENERGY', 'Water & Wastewater', 'المياه والصرف الصحي', 2, 'pi-filter', '["NWC", "MEWA"]', '["ISO 14001", "ISO 46001"]', 39),

  -- Technology Sub-sectors
  ('SOFTWARE', 'TECHNOLOGY', 'Software Development', 'تطوير البرمجيات', 2, 'pi-code', '[]', '["ISO 27001", "ISO 25010"]', 40),
  ('CLOUD', 'TECHNOLOGY', 'Cloud Services', 'الخدمات السحابية', 2, 'pi-cloud', '["NCA"]', '["ISO 27017", "SOC 2"]', 41),
  ('CYBERSECURITY', 'TECHNOLOGY', 'Cybersecurity', 'الأمن السيبراني', 2, 'pi-shield', '["NCA"]', '["ISO 27001", "SOC 2"]', 42),
  ('AI_ML', 'TECHNOLOGY', 'AI & Machine Learning', 'الذكاء الاصطناعي', 2, 'pi-cpu', '["SDAIA"]', '["ISO 23053"]', 43),
  ('IOT', 'TECHNOLOGY', 'Internet of Things', 'إنترنت الأشياء', 2, 'pi-wifi', '["CITC"]', '["ISO 27001"]', 44),
  ('DATA_CENTER', 'TECHNOLOGY', 'Data Centers', 'مراكز البيانات', 2, 'pi-server', '["NCA"]', '["ISO 27001", "TIA-942"]', 45),

  -- Retail Sub-sectors
  ('ECOMMERCE', 'RETAIL', 'E-commerce', 'التجارة الإلكترونية', 2, 'pi-shopping-cart', '["MOC", "Maroof"]', '["PCI DSS"]', 46),
  ('GROCERY', 'RETAIL', 'Grocery & Supermarkets', 'البقالة والسوبرماركت', 2, 'pi-shopping-bag', '["MOC", "SFDA"]', '["ISO 22000"]', 47),
  ('FASHION', 'RETAIL', 'Fashion & Apparel', 'الأزياء والملابس', 2, 'pi-tag', '["MOC", "SASO"]', '["ISO 9001"]', 48),
  ('ELECTRONICS_RETAIL', 'RETAIL', 'Electronics Retail', 'تجارة الإلكترونيات', 2, 'pi-mobile', '["MOC", "CITC"]', '["ISO 9001"]', 49),
  ('AUTOMOTIVE_RETAIL', 'RETAIL', 'Automotive Retail', 'تجارة السيارات', 2, 'pi-car', '["MOC", "MOT"]', '["ISO 9001"]', 50)
ON CONFLICT (sector_code) DO NOTHING;

-- =====================================================
-- SEED DATA - EMPLOYEE RANGES
-- =====================================================
INSERT INTO lookup_employee_ranges (range_code, range_label_en, range_label_ar, min_employees, max_employees, enterprise_type, sort_order) VALUES
  ('MICRO_1_10', '1-10 employees', '1-10 موظفين', 1, 10, 'micro', 1),
  ('MICRO_11_25', '11-25 employees', '11-25 موظف', 11, 25, 'micro', 2),
  ('SMALL_26_50', '26-50 employees', '26-50 موظف', 26, 50, 'small', 3),
  ('SMALL_51_100', '51-100 employees', '51-100 موظف', 51, 100, 'small', 4),
  ('MEDIUM_101_250', '101-250 employees', '101-250 موظف', 101, 250, 'medium', 5),
  ('MEDIUM_251_500', '251-500 employees', '251-500 موظف', 251, 500, 'medium', 6),
  ('LARGE_501_1000', '501-1,000 employees', '501-1,000 موظف', 501, 1000, 'large', 7),
  ('LARGE_1001_5000', '1,001-5,000 employees', '1,001-5,000 موظف', 1001, 5000, 'large', 8),
  ('ENTERPRISE_5001_10000', '5,001-10,000 employees', '5,001-10,000 موظف', 5001, 10000, 'enterprise', 9),
  ('ENTERPRISE_10000_PLUS', 'More than 10,000 employees', 'أكثر من 10,000 موظف', 10001, NULL, 'enterprise', 10)
ON CONFLICT (range_code) DO NOTHING;

-- =====================================================
-- SEED DATA - TIMEZONES
-- =====================================================
INSERT INTO lookup_timezones (timezone_code, timezone_name, utc_offset, utc_offset_minutes, countries, sort_order) VALUES
  ('Asia/Riyadh', 'Arabian Standard Time', 'UTC+03:00', 180, '{"SA", "KW", "YE"}', 1),
  ('Asia/Dubai', 'Gulf Standard Time', 'UTC+04:00', 240, '{"AE", "OM"}', 2),
  ('Asia/Qatar', 'Arabia Standard Time', 'UTC+03:00', 180, '{"QA"}', 3),
  ('Asia/Bahrain', 'Arabia Standard Time', 'UTC+03:00', 180, '{"BH"}', 4),
  ('Asia/Muscat', 'Gulf Standard Time', 'UTC+04:00', 240, '{"OM"}', 5),
  ('Asia/Amman', 'Eastern European Time', 'UTC+02:00', 120, '{"JO"}', 6),
  ('Africa/Cairo', 'Eastern European Time', 'UTC+02:00', 120, '{"EG"}', 7),
  ('Europe/London', 'Greenwich Mean Time', 'UTC+00:00', 0, '{"GB"}', 8),
  ('Europe/Paris', 'Central European Time', 'UTC+01:00', 60, '{"FR"}', 9),
  ('Europe/Berlin', 'Central European Time', 'UTC+01:00', 60, '{"DE"}', 10),
  ('America/New_York', 'Eastern Standard Time', 'UTC-05:00', -300, '{"US"}', 11),
  ('America/Chicago', 'Central Standard Time', 'UTC-06:00', -360, '{"US"}', 12),
  ('America/Los_Angeles', 'Pacific Standard Time', 'UTC-08:00', -480, '{"US"}', 13),
  ('Asia/Singapore', 'Singapore Standard Time', 'UTC+08:00', 480, '{"SG"}', 14),
  ('Asia/Tokyo', 'Japan Standard Time', 'UTC+09:00', 540, '{"JP"}', 15),
  ('Asia/Shanghai', 'China Standard Time', 'UTC+08:00', 480, '{"CN"}', 16),
  ('Asia/Kolkata', 'India Standard Time', 'UTC+05:30', 330, '{"IN"}', 17),
  ('Australia/Sydney', 'Australian Eastern Time', 'UTC+10:00', 600, '{"AU"}', 18)
ON CONFLICT (timezone_code) DO NOTHING;

-- =====================================================
-- SEED DATA - LANGUAGES
-- =====================================================
INSERT INTO lookup_languages (language_code, language_name_en, language_name_native, rtl, is_primary, sort_order) VALUES
  ('ar', 'Arabic', 'العربية', true, true, 1),
  ('en', 'English', 'English', false, true, 2),
  ('fr', 'French', 'Français', false, false, 3),
  ('es', 'Spanish', 'Español', false, false, 4),
  ('de', 'German', 'Deutsch', false, false, 5),
  ('zh', 'Chinese', '中文', false, false, 6),
  ('ja', 'Japanese', '日本語', false, false, 7),
  ('ru', 'Russian', 'Русский', false, false, 8),
  ('pt', 'Portuguese', 'Português', false, false, 9),
  ('it', 'Italian', 'Italiano', false, false, 10),
  ('hi', 'Hindi', 'हिन्दी', false, false, 11),
  ('ur', 'Urdu', 'اردو', true, false, 12),
  ('tr', 'Turkish', 'Türkçe', false, false, 13),
  ('ko', 'Korean', '한국어', false, false, 14),
  ('nl', 'Dutch', 'Nederlands', false, false, 15)
ON CONFLICT (language_code) DO NOTHING;

-- =====================================================
-- SEED DATA - REGULATORY FRAMEWORKS
-- =====================================================
INSERT INTO lookup_frameworks (framework_code, framework_name, framework_acronym, description_en, regulatory_body, jurisdiction, compliance_level, sort_order) VALUES
  ('NCA_ECC', 'Essential Cybersecurity Controls', 'NCA ECC', 'Saudi National Cybersecurity Authority controls', 'NCA', 'Saudi Arabia', 'mandatory', 1),
  ('SAMA_CSF', 'SAMA Cybersecurity Framework', 'SAMA CSF', 'Saudi Arabian Monetary Authority framework', 'SAMA', 'Saudi Arabia', 'mandatory', 2),
  ('PDPL', 'Personal Data Protection Law', 'PDPL', 'Saudi Personal Data Protection Law', 'SDAIA', 'Saudi Arabia', 'mandatory', 3),
  ('ISO_27001', 'Information Security Management', 'ISO 27001', 'International standard for information security', 'ISO', 'International', 'recommended', 4),
  ('SOC_2', 'Service Organization Control 2', 'SOC 2', 'Trust service criteria for service organizations', 'AICPA', 'International', 'recommended', 5),
  ('PCI_DSS', 'Payment Card Industry Data Security Standard', 'PCI DSS', 'Security standard for payment card data', 'PCI SSC', 'International', 'mandatory', 6),
  ('GDPR', 'General Data Protection Regulation', 'GDPR', 'EU data protection and privacy regulation', 'EU', 'European Union', 'mandatory', 7),
  ('HIPAA', 'Health Insurance Portability and Accountability Act', 'HIPAA', 'US healthcare data protection', 'HHS', 'United States', 'mandatory', 8),
  ('NIST_CSF', 'NIST Cybersecurity Framework', 'NIST CSF', 'US cybersecurity framework', 'NIST', 'United States', 'recommended', 9),
  ('BASEL_III', 'Basel III Framework', 'Basel III', 'International banking regulations', 'BCBS', 'International', 'mandatory', 10)
ON CONFLICT (framework_code) DO NOTHING;

-- =====================================================
-- CREATE FUNCTION FOR SMART SEARCH
-- =====================================================
CREATE OR REPLACE FUNCTION search_sectors(search_term TEXT, limit_results INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  sector_code VARCHAR(50),
  sector_name_en VARCHAR(255),
  sector_name_ar VARCHAR(255),
  parent_sector_code VARCHAR(50),
  level INTEGER,
  icon_class VARCHAR(100),
  relevance_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.sector_code,
    s.sector_name_en,
    s.sector_name_ar,
    s.parent_sector_code,
    s.level,
    s.icon_class,
    ts_rank(
      to_tsvector('english', s.sector_name_en || ' ' || COALESCE(s.description_en, '')),
      plainto_tsquery('english', search_term)
    ) AS relevance_score
  FROM lookup_sectors s
  WHERE s.is_active = true
    AND (
      to_tsvector('english', s.sector_name_en || ' ' || COALESCE(s.description_en, '')) @@ plainto_tsquery('english', search_term)
      OR s.sector_name_en ILIKE '%' || search_term || '%'
      OR s.sector_name_ar ILIKE '%' || search_term || '%'
    )
  ORDER BY relevance_score DESC, s.level ASC, s.sort_order ASC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

-- Similar function for cities
CREATE OR REPLACE FUNCTION search_cities(search_term TEXT, country_filter VARCHAR(2) DEFAULT NULL, limit_results INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  city_code VARCHAR(50),
  city_name_en VARCHAR(255),
  city_name_ar VARCHAR(255),
  country_code VARCHAR(2),
  is_major_city BOOLEAN,
  relevance_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.city_code,
    c.city_name_en,
    c.city_name_ar,
    c.country_code,
    c.is_major_city,
    CASE
      WHEN c.city_name_en ILIKE search_term || '%' THEN 100
      WHEN c.is_major_city THEN 50
      ELSE ts_rank(
        to_tsvector('english', c.city_name_en),
        plainto_tsquery('english', search_term)
      ) * 10
    END AS relevance_score
  FROM lookup_cities c
  WHERE c.is_active = true
    AND (country_filter IS NULL OR c.country_code = country_filter)
    AND (
      to_tsvector('english', c.city_name_en) @@ plainto_tsquery('english', search_term)
      OR c.city_name_en ILIKE '%' || search_term || '%'
      OR c.city_name_ar ILIKE '%' || search_term || '%'
    )
  ORDER BY relevance_score DESC, c.is_capital DESC, c.is_major_city DESC, c.sort_order ASC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ADD TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE TRIGGER update_lookup_countries_updated_at
  BEFORE UPDATE ON lookup_countries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lookup_cities_updated_at
  BEFORE UPDATE ON lookup_cities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lookup_sectors_updated_at
  BEFORE UPDATE ON lookup_sectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lookup_timezones_updated_at
  BEFORE UPDATE ON lookup_timezones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lookup_languages_updated_at
  BEFORE UPDATE ON lookup_languages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lookup_employee_ranges_updated_at
  BEFORE UPDATE ON lookup_employee_ranges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lookup_frameworks_updated_at
  BEFORE UPDATE ON lookup_frameworks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF MIGRATION
-- =====================================================