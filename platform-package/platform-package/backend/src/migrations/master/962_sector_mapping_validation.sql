-- ============================================================================
-- Migration 035: ISIC→KSA Sector Mapping Validation & Refinement (Issue 9)
-- Problem: Multiple KSA sectors map to same ISIC letter, losing specificity.
-- Fix: Add sector_isic_map entries with weights and sub-classifications.
-- Also adds authority_sector_mapping entries for Tier-2 authorities.
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART A: Ensure sector_isic_map has specific KSA sector entries
-- Weighted mapping: primary sector gets weight 1.0, secondary gets 0.5
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.sector_isic_map (sector_id, isic_code, weight)
VALUES
  -- Financial (K) — need sub-sector specificity
  ('SEC-KSA-FIN-BANK',     'K', 1.0),
  ('SEC-KSA-FIN-INS',      'K', 1.0),
  ('SEC-KSA-FIN-FINTECH',  'K', 1.0),
  ('SEC-KSA-FIN-CAPITAL',  'K', 1.0),

  -- Healthcare (Q)
  ('SEC-KSA-HEALTH-HOSPITAL', 'Q', 1.0),
  ('SEC-KSA-HEALTH-PHARMA',   'C', 0.7),  -- Pharma is manufacturing + health
  ('SEC-KSA-HEALTH-PHARMA',   'Q', 0.3),
  ('SEC-KSA-HEALTH-MEDICAL-DEVICE', 'C', 0.7),
  ('SEC-KSA-HEALTH-MEDICAL-DEVICE', 'Q', 0.3),

  -- Energy (B/D) — need Oil/Gas vs Electricity specificity
  ('SEC-KSA-ENERGY-OIL-GAS',  'B', 1.0),
  ('SEC-KSA-ENERGY-POWER',    'D', 1.0),
  ('SEC-KSA-ENERGY-RENEWABLE','D', 1.0),

  -- Tech (J) — Telecom vs Software vs ICT specificity
  ('SEC-KSA-TECH-TELECOM',  'J', 1.0),
  ('SEC-KSA-TECH-ICT',      'J', 1.0),
  ('SEC-KSA-TECH-SOFTWARE', 'J', 1.0),

  -- Government (O)
  ('SEC-KSA-GOV-MIN',          'O', 1.0),
  ('SEC-KSA-GOV-AGENCY',       'O', 1.0),
  ('SEC-KSA-GOV-MUNICIPALITY', 'O', 1.0),

  -- Manufacturing (C) — need food vs chemicals specificity
  ('SEC-KSA-MANUFACTURING-GENERAL',   'C', 1.0),
  ('SEC-KSA-MANUFACTURING-FOOD',      'C', 0.7),
  ('SEC-KSA-MANUFACTURING-FOOD',      'I', 0.3),  -- food service overlap
  ('SEC-KSA-MANUFACTURING-CHEMICALS', 'C', 1.0),

  -- Commerce (G)
  ('SEC-KSA-COMMERCE-WHOLESALE',  'G', 1.0),
  ('SEC-KSA-COMMERCE-RETAIL',     'G', 1.0),
  ('SEC-KSA-COMMERCE-ECOMMERCE',  'G', 0.7),
  ('SEC-KSA-COMMERCE-ECOMMERCE',  'J', 0.3),  -- e-commerce is also ICT

  -- Construction (F)
  ('SEC-KSA-CONSTRUCTION', 'F', 1.0),

  -- Real Estate (L)
  ('SEC-KSA-REAL-ESTATE', 'L', 1.0),

  -- Tourism (I)
  ('SEC-KSA-TOURISM-HOSPITALITY', 'I', 1.0),

  -- Education (P)
  ('SEC-KSA-EDUCATION-PRIVATE', 'P', 1.0),
  ('SEC-KSA-EDUCATION-HIGHER',  'P', 1.0),

  -- Transport (H)
  ('SEC-KSA-TRANSPORT-LOGISTICS', 'H', 1.0),
  ('SEC-KSA-TRANSPORT-AVIATION',  'H', 1.0),

  -- Agriculture (A)
  ('SEC-KSA-AGRICULTURE', 'A', 1.0),

  -- Media (J/R)
  ('SEC-KSA-MEDIA-BROADCAST', 'J', 0.7),
  ('SEC-KSA-MEDIA-BROADCAST', 'R', 0.3),

  -- Hajj (I/N)
  ('SEC-KSA-HAJJ-UMRAH', 'I', 0.6),
  ('SEC-KSA-HAJJ-UMRAH', 'N', 0.4),

  -- Sports (R)
  ('SEC-KSA-SPORTS', 'R', 1.0),

  -- Culture (R)
  ('SEC-KSA-CULTURE', 'R', 1.0),

  -- Professional Services (M)
  ('SEC-KSA-PROFESSIONAL-SERVICES', 'M', 1.0),

  -- Utilities (E)
  ('SEC-KSA-UTILITIES-WATER', 'E', 1.0),
  ('SEC-KSA-UTILITIES-WASTE', 'E', 1.0),

  -- Mining (B)
  ('SEC-KSA-MINING', 'B', 1.0),

  -- Special Zones
  ('SEC-KSA-SPECIAL-ZONES', 'F', 0.3),
  ('SEC-KSA-SPECIAL-ZONES', 'J', 0.3),
  ('SEC-KSA-SPECIAL-ZONES', 'L', 0.4)
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART B: Wire Tier-2 authorities into authority_sector_mapping
-- (Currently many sectors reference authorities that lack mapping entries)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.lookup_authority_sector_mapping
  (authority_code, sector_code, enforcement, priority, regulation_type, is_active, reason_en, reason_ar)
VALUES
  -- GACA for transport sectors
  ('GACA', 'H', 'mandatory', 2, 'sector_specific', true,
   'Civil aviation safety regulations', 'أنظمة سلامة الطيران المدني'),

  -- PPA for transport
  ('PPA', 'H', 'mandatory', 3, 'sector_specific', true,
   'Public transport safety', 'سلامة النقل العام'),

  -- SPA for transport
  ('SPA', 'H', 'mandatory', 3, 'sector_specific', true,
   'Maritime and port regulations', 'أنظمة الموانئ والبحرية'),

  -- SRA for transport
  ('SRA', 'H', 'mandatory', 4, 'sector_specific', true,
   'Railway operations safety', 'سلامة عمليات السكك الحديدية'),

  -- ETEC for education
  ('ETEC', 'P', 'mandatory', 2, 'sector_specific', true,
   'Education accreditation', 'اعتماد التعليم'),

  -- TVTC for education
  ('TVTC', 'P', 'voluntary', 4, 'sector_specific', true,
   'Vocational training standards', 'معايير التدريب المهني'),

  -- GMA for media
  ('GMA', 'J', 'mandatory', 3, 'sector_specific', true,
   'Media content regulation', 'تنظيم المحتوى الإعلامي'),
  ('GMA', 'R', 'mandatory', 3, 'sector_specific', true,
   'Entertainment media regulation', 'تنظيم الإعلام الترفيهي'),

  -- GCAM for media
  ('GCAM', 'J', 'mandatory', 4, 'sector_specific', true,
   'Audiovisual content standards', 'معايير المحتوى المرئي والمسموع'),

  -- HCA for culture
  ('HCA', 'R', 'mandatory', 3, 'sector_specific', true,
   'Cultural heritage protection', 'حماية التراث الثقافي'),

  -- MOS for sports
  ('MOS', 'R', 'mandatory', 3, 'sector_specific', true,
   'Sports governance and safety', 'حوكمة وسلامة الرياضة'),

  -- KACARE for energy
  ('KACARE', 'D', 'mandatory', 3, 'sector_specific', true,
   'Nuclear and renewable energy', 'الطاقة النووية والمتجددة'),

  -- MINING for mining
  ('MINING', 'B', 'mandatory', 3, 'sector_specific', true,
   'Mining licensing and safety', 'تراخيص وسلامة التعدين'),

  -- MOHU for tourism/hajj
  ('MOHU', 'I', 'mandatory', 2, 'sector_specific', true,
   'Hajj and Umrah services', 'خدمات الحج والعمرة'),
  ('MOHU', 'N', 'mandatory', 2, 'sector_specific', true,
   'Pilgrimage administrative services', 'الخدمات الإدارية للحج'),

  -- NAZAHA for government and finance
  ('NAZAHA', 'O', 'mandatory', 4, 'cross_sector', true,
   'Anti-corruption compliance', 'الامتثال لمكافحة الفساد'),
  ('NAZAHA', 'K', 'advisory', 5, 'cross_sector', true,
   'Anti-corruption in financial sector', 'مكافحة الفساد في القطاع المالي'),

  -- SIDF for manufacturing
  ('SIDF', 'C', 'voluntary', 5, 'sector_specific', true,
   'Industrial development compliance', 'امتثال التنمية الصناعية'),

  -- LCGPA for manufacturing, construction, transport, tech
  ('LCGPA', 'C', 'mandatory', 4, 'cross_sector', true,
   'Local content requirements', 'متطلبات المحتوى المحلي'),
  ('LCGPA', 'F', 'mandatory', 4, 'cross_sector', true,
   'Local content in construction', 'المحتوى المحلي في البناء'),
  ('LCGPA', 'J', 'mandatory', 4, 'cross_sector', true,
   'Local content in ICT', 'المحتوى المحلي في تقنية المعلومات'),

  -- SAIP for manufacturing, tech, creative
  ('SAIP', 'C', 'mandatory', 4, 'cross_sector', true,
   'IP protection in manufacturing', 'حماية الملكية الفكرية في التصنيع'),
  ('SAIP', 'J', 'mandatory', 4, 'cross_sector', true,
   'IP protection in technology', 'حماية الملكية الفكرية في التقنية'),
  ('SAIP', 'R', 'mandatory', 4, 'cross_sector', true,
   'IP protection in creative industries', 'حماية الملكية الفكرية في الصناعات الإبداعية'),

  -- NEOM for special zones
  ('NEOM', 'F', 'mandatory', 3, 'sector_specific', true,
   'NEOM development standards', 'معايير تطوير نيوم'),
  ('NEOM', 'J', 'mandatory', 3, 'sector_specific', true,
   'NEOM technology standards', 'معايير تقنية نيوم'),
  ('NEOM', 'L', 'mandatory', 3, 'sector_specific', true,
   'NEOM real estate standards', 'معايير عقارات نيوم'),

  -- RCJY for industrial cities
  ('RCJY', 'C', 'mandatory', 3, 'sector_specific', true,
   'Industrial city regulations', 'أنظمة المدن الصناعية'),
  ('RCJY', 'D', 'mandatory', 4, 'sector_specific', true,
   'Utility regulations in industrial cities', 'أنظمة المرافق في المدن الصناعية')

ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  'Migration 035 Complete' AS status,
  (SELECT COUNT(*) FROM public.sector_isic_map) AS sector_mappings,
  (SELECT COUNT(DISTINCT sector_id) FROM public.sector_isic_map) AS unique_sectors,
  (SELECT COUNT(*) FROM public.lookup_authority_sector_mapping WHERE is_active) AS authority_sector_mappings,
  (SELECT COUNT(DISTINCT authority_code) FROM public.lookup_authority_sector_mapping WHERE is_active) AS wired_authorities;

COMMIT;
