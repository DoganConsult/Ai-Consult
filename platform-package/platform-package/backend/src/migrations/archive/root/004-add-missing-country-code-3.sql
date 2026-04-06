-- =====================================================
-- Migration 004: Add missing country_code_3 column
-- Fixes: "column country_code_3 does not exist" error
-- =====================================================

-- Add country_code_3 column if it doesn't exist
ALTER TABLE lookup_countries ADD COLUMN IF NOT EXISTS country_code_3 VARCHAR(3);

-- Populate with ISO 3166-1 alpha-3 codes
UPDATE lookup_countries SET country_code_3 =
  CASE country_code
    -- GCC Countries
    WHEN 'SA' THEN 'SAU'
    WHEN 'AE' THEN 'ARE'
    WHEN 'KW' THEN 'KWT'
    WHEN 'QA' THEN 'QAT'
    WHEN 'BH' THEN 'BHR'
    WHEN 'OM' THEN 'OMN'
    -- MENA Countries
    WHEN 'EG' THEN 'EGY'
    WHEN 'JO' THEN 'JOR'
    WHEN 'LB' THEN 'LBN'
    WHEN 'IQ' THEN 'IRQ'
    WHEN 'SY' THEN 'SYR'
    WHEN 'YE' THEN 'YEM'
    WHEN 'PS' THEN 'PSE'
    WHEN 'MA' THEN 'MAR'
    WHEN 'TN' THEN 'TUN'
    WHEN 'DZ' THEN 'DZA'
    WHEN 'LY' THEN 'LBY'
    -- Major Economies
    WHEN 'US' THEN 'USA'
    WHEN 'GB' THEN 'GBR'
    WHEN 'FR' THEN 'FRA'
    WHEN 'DE' THEN 'DEU'
    WHEN 'CN' THEN 'CHN'
    WHEN 'JP' THEN 'JPN'
    WHEN 'IN' THEN 'IND'
    WHEN 'BR' THEN 'BRA'
    WHEN 'CA' THEN 'CAN'
    WHEN 'AU' THEN 'AUS'
    WHEN 'RU' THEN 'RUS'
    WHEN 'IT' THEN 'ITA'
    WHEN 'ES' THEN 'ESP'
    WHEN 'NL' THEN 'NLD'
    WHEN 'CH' THEN 'CHE'
    WHEN 'SE' THEN 'SWE'
    WHEN 'NO' THEN 'NOR'
    WHEN 'DK' THEN 'DNK'
    WHEN 'FI' THEN 'FIN'
    WHEN 'PL' THEN 'POL'
    WHEN 'TR' THEN 'TUR'
    -- Africa
    WHEN 'ZA' THEN 'ZAF'
    WHEN 'NG' THEN 'NGA'
    WHEN 'KE' THEN 'KEN'
    WHEN 'GH' THEN 'GHA'
    WHEN 'ET' THEN 'ETH'
    -- Asia-Pacific
    WHEN 'SG' THEN 'SGP'
    WHEN 'MY' THEN 'MYS'
    WHEN 'TH' THEN 'THA'
    WHEN 'ID' THEN 'IDN'
    WHEN 'PH' THEN 'PHL'
    WHEN 'VN' THEN 'VNM'
    WHEN 'KR' THEN 'KOR'
    WHEN 'PK' THEN 'PAK'
    WHEN 'BD' THEN 'BGD'
    WHEN 'NZ' THEN 'NZL'
    -- Latin America
    WHEN 'MX' THEN 'MEX'
    WHEN 'AR' THEN 'ARG'
    WHEN 'CL' THEN 'CHL'
    WHEN 'CO' THEN 'COL'
    WHEN 'PE' THEN 'PER'
    WHEN 'VE' THEN 'VEN'
    -- Fallback for any unmapped codes
    ELSE UPPER(country_code) || 'X'
  END
WHERE country_code_3 IS NULL;

-- Make it NOT NULL after populating
ALTER TABLE lookup_countries ALTER COLUMN country_code_3 SET NOT NULL;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lookup_countries_country_code_3_unique'
  ) THEN
    ALTER TABLE lookup_countries
      ADD CONSTRAINT lookup_countries_country_code_3_unique UNIQUE (country_code_3);
  END IF;
END $$;

-- Verification
SELECT
  'Migration 004 complete: country_code_3 column added and populated' AS status,
  COUNT(*) AS total_countries,
  COUNT(country_code_3) AS with_code_3
FROM lookup_countries;
