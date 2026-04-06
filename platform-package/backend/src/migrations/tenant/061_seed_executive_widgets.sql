BEGIN;

INSERT INTO dashboard_widget_registry
(widget_key, label_en, label_ar, module_code, component_key, default_width, default_height, default_config, is_system, is_active, sort_order, created_at, updated_at)
VALUES
('executive-summary', 'Executive Summary', 'الملخص التنفيذي', 'dashboard', 'executive-summary-widget', 12, 3, '{}'::jsonb, true, true, 10, now(), now()),
('top-breached-kris', 'Top Breached KRIs', 'أعلى مؤشرات المخاطر المتجاوزة', 'risk', 'top-breached-kris-widget', 6, 4, '{}'::jsonb, true, true, 20, now(), now()),
('policy-review-debt', 'Policy Review Debt', 'ديون مراجعة السياسات', 'governance', 'policy-review-debt-widget', 6, 4, '{}'::jsonb, true, true, 30, now(), now()),
('engine-trend', 'Engine Trend', 'اتجاه المحرك', 'dashboard', 'engine-trend-widget', 12, 5, '{}'::jsonb, true, true, 40, now(), now())
ON CONFLICT (widget_key) DO UPDATE SET
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  component_key = EXCLUDED.component_key,
  updated_at = now();

COMMIT;
