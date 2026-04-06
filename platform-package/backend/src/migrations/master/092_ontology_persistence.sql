-- ============================================================================
-- Migration 034: Ontology Persistence Tables
-- Persists ontology catalog data that was previously in-memory only.
-- Tables: ontology_layers, ontology_evidence_categories,
--         ontology_scoring_policies, ontology_role_blueprints
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART A: Framework Layers
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ontology_layers (
  id           VARCHAR(50) PRIMARY KEY,
  name_en      VARCHAR(255) NOT NULL,
  name_ar      VARCHAR(255),
  sort_order   INT NOT NULL DEFAULT 0,
  status       VARCHAR(20) DEFAULT 'active',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.ontology_layers (id, name_en, name_ar, sort_order) VALUES
  ('layer-governance',  'Governance',           'الحوكمة',            1),
  ('layer-risk',        'Risk Management',      'إدارة المخاطر',      2),
  ('layer-compliance',  'Compliance',           'الامتثال',           3),
  ('layer-operations',  'Operations Security',  'أمن العمليات',       4),
  ('layer-technology',  'Technology Controls',  'الضوابط التقنية',    5),
  ('layer-resilience',  'Business Resilience',  'استمرارية الأعمال',  6)
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART B: Evidence Categories
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ontology_evidence_categories (
  id           VARCHAR(50) PRIMARY KEY,
  name_en      VARCHAR(255) NOT NULL,
  name_ar      VARCHAR(255),
  icon         VARCHAR(50),
  status       VARCHAR(20) DEFAULT 'active',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.ontology_evidence_categories (id, name_en, name_ar, icon) VALUES
  ('ecat-document',    'Document',              'مستند',           'pi-file'),
  ('ecat-screenshot',  'Screenshot',            'لقطة شاشة',       'pi-image'),
  ('ecat-config',      'Configuration Export',  'تصدير الإعدادات', 'pi-cog'),
  ('ecat-log',         'Log File',              'ملف سجل',         'pi-list'),
  ('ecat-scan',        'Scan Report',           'تقرير فحص',       'pi-shield'),
  ('ecat-attestation', 'Attestation',           'شهادة',           'pi-check-circle'),
  ('ecat-training',    'Training Record',       'سجل تدريب',       'pi-book'),
  ('ecat-meeting',     'Meeting Minutes',       'محضر اجتماع',     'pi-users')
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART C: Scoring Policies
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ontology_scoring_policies (
  id           VARCHAR(50) PRIMARY KEY,
  name_en      VARCHAR(255) NOT NULL,
  name_ar      VARCHAR(255),
  scale        VARCHAR(30),
  levels       INT,
  status       VARCHAR(20) DEFAULT 'active',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.ontology_scoring_policies (id, name_en, name_ar, scale, levels) VALUES
  ('sp-binary',      'Binary (Compliant/Non-Compliant)', 'ثنائي (ممتثل/غير ممتثل)', 'binary',     2),
  ('sp-maturity-5',  '5-Level Maturity',                 'نضج من 5 مستويات',         'maturity',   5),
  ('sp-percentage',  'Percentage Score',                  'نسبة مئوية',               'percentage', 100),
  ('sp-nca-3',       'NCA 3-Level',                      'NCA من 3 مستويات',          'nca',        3)
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART D: Role Blueprints
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ontology_role_blueprints (
  id           VARCHAR(50) PRIMARY KEY,
  name_en      VARCHAR(255) NOT NULL,
  name_ar      VARCHAR(255),
  abbreviation VARCHAR(20),
  permissions  TEXT[],
  status       VARCHAR(20) DEFAULT 'active',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.ontology_role_blueprints (id, name_en, name_ar, abbreviation, permissions) VALUES
  ('rb-ciso',        'Chief Information Security Officer',              'رئيس أمن المعلومات',                         'CISO',     ARRAY['admin','read','write','approve']),
  ('rb-grc-manager', 'GRC Manager',                                    'مدير الحوكمة والمخاطر والامتثال',            'GRC-MGR',  ARRAY['read','write','approve']),
  ('rb-auditor',     'Internal Auditor',                               'مدقق داخلي',                                 'AUDITOR',  ARRAY['read','audit']),
  ('rb-analyst',     'Compliance Analyst',                              'محلل امتثال',                                'ANALYST',  ARRAY['read','write']),
  ('rb-viewer',      'Executive Viewer',                               'مشاهد تنفيذي',                               'VIEWER',   ARRAY['read']),
  ('rb-dpo',         'Data Protection Officer',                        'مسؤول حماية البيانات',                       'DPO',      ARRAY['read','write','approve'])
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  'Migration 034 Complete' AS status,
  (SELECT COUNT(*) FROM public.ontology_layers) AS layers,
  (SELECT COUNT(*) FROM public.ontology_evidence_categories) AS evidence_categories,
  (SELECT COUNT(*) FROM public.ontology_scoring_policies) AS scoring_policies,
  (SELECT COUNT(*) FROM public.ontology_role_blueprints) AS role_blueprints;

COMMIT;
