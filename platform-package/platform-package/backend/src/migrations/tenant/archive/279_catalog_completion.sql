-- ============================================
-- Tenant Migration 279
-- Step 0.1 Completion: authority_level_catalog
-- and action_class_catalog tables with seeds.
-- ============================================

-- 1. Authority Level Catalog — L1-L5+ authority enumeration
CREATE TABLE IF NOT EXISTS authority_level_catalog (
  level_code       TEXT PRIMARY KEY,
  name_en          TEXT NOT NULL,
  name_ar          TEXT,
  rank             INT NOT NULL UNIQUE,
  can_approve      BOOLEAN NOT NULL DEFAULT FALSE,
  can_override     BOOLEAN NOT NULL DEFAULT FALSE,
  description_en   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Action Class Catalog — action types with sensitivity classification
CREATE TABLE IF NOT EXISTS action_class_catalog (
  action_code      TEXT PRIMARY KEY,
  name_en          TEXT NOT NULL,
  name_ar          TEXT,
  category         TEXT NOT NULL CHECK (category IN ('read', 'write', 'admin', 'ai')),
  sensitivity      TEXT NOT NULL DEFAULT 'normal' CHECK (sensitivity IN ('low', 'normal', 'high', 'critical')),
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  requires_audit   BOOLEAN NOT NULL DEFAULT TRUE,
  description_en   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Seed: Authority Level Catalog (L1-L6)
-- ============================================
INSERT INTO authority_level_catalog (level_code, name_en, name_ar, rank, can_approve, can_override, description_en)
VALUES
  ('submit',        'Submit',         'تقديم',           1, FALSE, FALSE, 'Can create and submit items for review'),
  ('review',        'Review',         'مراجعة',          2, FALSE, FALSE, 'Can review items and provide feedback'),
  ('approve_low',   'Approve (Low)',  'موافقة (منخفض)',   3, TRUE,  FALSE, 'Can approve low-risk items'),
  ('approve_medium','Approve (Medium)','موافقة (متوسط)',  4, TRUE,  FALSE, 'Can approve medium-risk items'),
  ('approve_high',  'Approve (High)', 'موافقة (عالي)',    5, TRUE,  FALSE, 'Can approve high-risk and critical items'),
  ('override',      'Override',       'تجاوز',           6, TRUE,  TRUE,  'Full override authority for emergency actions')
ON CONFLICT (level_code) DO NOTHING;

-- ============================================
-- Seed: Action Class Catalog
-- ============================================
INSERT INTO action_class_catalog (action_code, name_en, name_ar, category, sensitivity, requires_approval, requires_audit, description_en)
VALUES
  ('create',    'Create',    'إنشاء',    'write', 'normal',   FALSE, TRUE,  'Create a new entity'),
  ('read',      'Read',      'قراءة',    'read',  'low',      FALSE, FALSE, 'Read/view an entity'),
  ('update',    'Update',    'تحديث',    'write', 'normal',   FALSE, TRUE,  'Modify an existing entity'),
  ('delete',    'Delete',    'حذف',      'write', 'high',     TRUE,  TRUE,  'Delete an entity'),
  ('approve',   'Approve',   'موافقة',   'admin', 'high',     FALSE, TRUE,  'Approve a pending item'),
  ('reject',    'Reject',    'رفض',      'admin', 'normal',   FALSE, TRUE,  'Reject a pending item'),
  ('escalate',  'Escalate',  'تصعيد',    'admin', 'high',     FALSE, TRUE,  'Escalate to higher authority'),
  ('override',  'Override',  'تجاوز',    'admin', 'critical', TRUE,  TRUE,  'Override a policy or decision'),
  ('ai_suggest','AI Suggest','اقتراح ذكي','ai',   'normal',   FALSE, TRUE,  'AI-generated suggestion'),
  ('ai_execute','AI Execute','تنفيذ ذكي', 'ai',   'high',     TRUE,  TRUE,  'AI autonomous execution')
ON CONFLICT (action_code) DO NOTHING;
