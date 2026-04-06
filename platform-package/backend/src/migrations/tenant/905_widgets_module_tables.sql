-- Migration 905: Create widgets module tables
-- Owner: widgets
-- Tables: widgets_registry, widgets_bundles, widgets_render_log
-- These tables support the full widget lifecycle (registry, bundle composition, render observability).

BEGIN;

-- ── Widget Registry ─────────────────────────────────────────────────────────
-- Stores widget definitions with lifecycle state, DAuth permissions, and scope rules.
CREATE TABLE IF NOT EXISTS widgets_registry (
  widget_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_key        VARCHAR(100) NOT NULL,
  name_en           VARCHAR(200) NOT NULL,
  name_ar           VARCHAR(200),
  description_en    TEXT,
  description_ar    TEXT,
  category          VARCHAR(50) NOT NULL DEFAULT 'general',
  size              VARCHAR(20) NOT NULL DEFAULT 'medium',
  icon              VARCHAR(100),
  status            VARCHAR(30) NOT NULL DEFAULT 'draft',
  version           VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  data_sources      JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  scope_rule        VARCHAR(100),
  config            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by        VARCHAR(100),
  updated_by        VARCHAR(100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT uq_widgets_registry_key UNIQUE (widget_key) WHERE deleted_at IS NULL
);

CREATE INDEX IF NOT EXISTS idx_widgets_registry_status ON widgets_registry (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_widgets_registry_category ON widgets_registry (category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_widgets_registry_created ON widgets_registry (created_at DESC) WHERE deleted_at IS NULL;

-- ── Widget Bundles ──────────────────────────────────────────────────────────
-- Stores composed widget bundles (groups of widgets with layout configuration).
CREATE TABLE IF NOT EXISTS widgets_bundles (
  bundle_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en           VARCHAR(200) NOT NULL,
  name_ar           VARCHAR(200),
  description_en    TEXT,
  description_ar    TEXT,
  widget_ids        JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout            JSONB NOT NULL DEFAULT '[]'::jsonb,
  status            VARCHAR(30) NOT NULL DEFAULT 'draft',
  target_audience   VARCHAR(100),
  created_by        VARCHAR(100),
  updated_by        VARCHAR(100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_widgets_bundles_status ON widgets_bundles (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_widgets_bundles_audience ON widgets_bundles (target_audience) WHERE deleted_at IS NULL;

-- ── Widget Render Log ───────────────────────────────────────────────────────
-- Observability table for widget render performance (used by diagnostics service).
CREATE TABLE IF NOT EXISTS widgets_render_log (
  id                BIGSERIAL PRIMARY KEY,
  widget_key        VARCHAR(100) NOT NULL,
  user_id           VARCHAR(100),
  duration_ms       INTEGER,
  success           BOOLEAN NOT NULL DEFAULT TRUE,
  error_message     TEXT,
  rendered_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_widgets_render_log_key ON widgets_render_log (widget_key, rendered_at DESC);
CREATE INDEX IF NOT EXISTS idx_widgets_render_log_time ON widgets_render_log (rendered_at DESC);

-- ── Seed system insight widgets ─────────────────────────────────────────────
-- Register the 29 insight widgets + 10 structural widgets as system definitions.
INSERT INTO widgets_registry (widget_key, name_en, name_ar, category, size, status, version, created_by)
VALUES
  -- Insight widgets (29)
  ('zombie-controls',        'Zombie Controls',          'ضوابط ميتة',             'insight', 'medium', 'published', '1.0.0', 'system'),
  ('year-in-grc',            'Year in GRC',              'السنة في الحوكمة',        'insight', 'large',  'published', '1.0.0', 'system'),
  ('untested-assumptions',   'Untested Assumptions',     'افتراضات غير مختبرة',     'insight', 'medium', 'published', '1.0.0', 'system'),
  ('silent-controls',        'Silent Controls',          'ضوابط صامتة',             'insight', 'medium', 'published', '1.0.0', 'system'),
  ('root-cause-vs-patch',    'Root Cause vs Patch',      'السبب الجذري مقابل الترقيع', 'insight', 'medium', 'published', '1.0.0', 'system'),
  ('risk-gravity',           'Risk Gravity',             'جاذبية المخاطر',          'insight', 'medium', 'published', '1.0.0', 'system'),
  ('risk-denial',            'Risk Denial',              'إنكار المخاطر',           'insight', 'medium', 'published', '1.0.0', 'system'),
  ('reputation-impact',      'Reputation Impact',        'تأثير السمعة',            'insight', 'medium', 'published', '1.0.0', 'system'),
  ('regulator-lens',         'Regulator Lens',           'عدسة الجهة الرقابية',     'insight', 'medium', 'published', '1.0.0', 'system'),
  ('org-amnesia',            'Org Amnesia',              'نسيان المنظمة',           'insight', 'medium', 'published', '1.0.0', 'system'),
  ('one-sentence-truth',     'One Sentence Truth',       'حقيقة بجملة واحدة',       'insight', 'small',  'published', '1.0.0', 'system'),
  ('momentum-indicator',     'Momentum Indicator',       'مؤشر الزخم',              'insight', 'medium', 'published', '1.0.0', 'system'),
  ('lifecycle-bottleneck',   'Lifecycle Bottleneck',     'عنق زجاجة دورة الحياة',   'insight', 'medium', 'published', '1.0.0', 'system'),
  ('knowledge-in-people',    'Knowledge in People',      'المعرفة في الأشخاص',      'insight', 'medium', 'published', '1.0.0', 'system'),
  ('improvement-illusion',   'Improvement Illusion',     'وهم التحسين',             'insight', 'medium', 'published', '1.0.0', 'system'),
  ('if-nothing-changes',     'If Nothing Changes',       'إذا لم يتغير شيء',        'insight', 'medium', 'published', '1.0.0', 'system'),
  ('maturity-gap',           'Maturity Gap',             'فجوة النضج',              'insight', 'medium', 'published', '1.0.0', 'system'),
  ('future-you',             'Future You',               'أنت في المستقبل',         'insight', 'medium', 'published', '1.0.0', 'system'),
  ('grc-time-loop',          'GRC Time Loop',            'حلقة زمن الحوكمة',        'insight', 'medium', 'published', '1.0.0', 'system'),
  ('false-comfort',          'False Comfort',            'راحة زائفة',              'insight', 'medium', 'published', '1.0.0', 'system'),
  ('evidence-rot',           'Evidence Rot',             'تعفن الأدلة',             'insight', 'medium', 'published', '1.0.0', 'system'),
  ('decision-trace',         'Decision Trace',           'تتبع القرارات',           'insight', 'medium', 'published', '1.0.0', 'system'),
  ('cultural-drift',         'Cultural Drift',           'الانجراف الثقافي',        'insight', 'medium', 'published', '1.0.0', 'system'),
  ('control-aging',          'Control Aging',            'شيخوخة الضوابط',          'insight', 'medium', 'published', '1.0.0', 'system'),
  ('change-leverage',        'Change Leverage',          'رافعة التغيير',           'insight', 'medium', 'published', '1.0.0', 'system'),
  ('breaking-the-cycle',     'Breaking the Cycle',       'كسر الحلقة',              'insight', 'medium', 'published', '1.0.0', 'system'),
  ('board-reality',          'Board Reality',            'واقع مجلس الإدارة',       'insight', 'medium', 'published', '1.0.0', 'system'),
  ('audit-dejavu',           'Audit Deja Vu',            'ديجا فو التدقيق',         'insight', 'medium', 'published', '1.0.0', 'system'),
  ('assessment-honesty',     'Assessment Honesty',       'صدق التقييم',             'insight', 'medium', 'published', '1.0.0', 'system'),
  -- Structural widgets (10)
  ('executive-summary',      'Executive Summary',        'الملخص التنفيذي',         'executive',   'full',   'published', '1.0.0', 'system'),
  ('risk-heatmap',           'Risk Heatmap',             'خريطة حرارة المخاطر',     'risk',        'large',  'published', '1.0.0', 'system'),
  ('overdue-actions',        'Overdue Actions',          'الإجراءات المتأخرة',      'executive',   'medium', 'published', '1.0.0', 'system'),
  ('audit-exposure',         'Audit Exposure',           'التعرض للتدقيق',          'audit',       'medium', 'published', '1.0.0', 'system'),
  ('privacy-incidents',      'Privacy Incidents',        'حوادث الخصوصية',          'compliance',  'medium', 'published', '1.0.0', 'system'),
  ('maturity-score',         'Maturity Score',           'درجة النضج',              'executive',   'small',  'published', '1.0.0', 'system'),
  ('assessment-progress',    'Assessment Progress',      'تقدم التقييم',            'compliance',  'medium', 'published', '1.0.0', 'system'),
  ('recommendations',        'Recommendations',          'التوصيات',                'general',     'medium', 'published', '1.0.0', 'system'),
  ('evidence-coverage',      'Evidence Coverage',        'تغطية الأدلة',            'evidence',    'medium', 'published', '1.0.0', 'system'),
  ('kri-status',             'KRI Status',               'حالة مؤشرات المخاطر',     'kri',         'medium', 'published', '1.0.0', 'system')
ON CONFLICT (widget_key) WHERE deleted_at IS NULL DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  category = EXCLUDED.category,
  updated_at = NOW();

-- ── Seed default executive bundle ───────────────────────────────────────────
INSERT INTO widgets_bundles (name_en, name_ar, widget_ids, layout, status, target_audience, created_by)
VALUES (
  'Executive Dashboard', 'لوحة المعلومات التنفيذية',
  '["executive-summary", "risk-heatmap", "overdue-actions", "audit-exposure", "maturity-score", "kri-status"]'::jsonb,
  '[{"widgetId":"executive-summary","position":0,"colSpan":12,"rowSpan":2},{"widgetId":"risk-heatmap","position":1,"colSpan":6,"rowSpan":3},{"widgetId":"overdue-actions","position":2,"colSpan":6,"rowSpan":3},{"widgetId":"audit-exposure","position":3,"colSpan":4,"rowSpan":2},{"widgetId":"maturity-score","position":4,"colSpan":4,"rowSpan":2},{"widgetId":"kri-status","position":5,"colSpan":4,"rowSpan":2}]'::jsonb,
  'published', 'executive', 'system'
)
ON CONFLICT DO NOTHING;

COMMIT;
