-- ============================================
-- Tenant Migration 282
-- Seed missing authority levels required by transitions
-- before FK enforcement in 283.
-- ============================================

INSERT INTO authority_level_catalog (level_code, name_en, name_ar, rank, can_approve, can_override, description_en)
VALUES
  ('approve', 'Approve (General)', 'موافقة (عام)', 7, TRUE, FALSE, 'General approval authority'),
  ('committee', 'Committee', 'لجنة', 8, TRUE, FALSE, 'Committee approval authority'),
  ('multi_level', 'Multi-Level', 'مستويات متعددة', 9, TRUE, FALSE, 'Multi-level approval sequence')
ON CONFLICT (level_code) DO NOTHING;
