BEGIN;

INSERT INTO pack_selection_policies
(policy_code, name_en, name_ar, target_pack_code, priority, enabled, stop_on_match, conditions, outcome, notes, is_system)
VALUES
(
  'always_agrc_core',
  'Always install AGRC Core',
  'تثبيت حزمة الحوكمة والمخاطر والامتثال الأساسية دائمًا',
  'agrc-core',
  10,
  true,
  false,
  '[{ "type": "always" }]'::jsonb,
  '{ "action": "select", "reason": "Base AGRC operating model is mandatory" }'::jsonb,
  'Foundation pack for all governed tenants',
  true
),
(
  'government_org_model',
  'Government operating model',
  'نموذج التشغيل الحكومي',
  'nic-government-core',
  20,
  true,
  false,
  '[
    { "type": "answer_includes_any", "field": "organization_type", "values": ["government", "ministry", "authority", "public"] },
    { "type": "answer_includes_any", "field": "industry_sector", "values": ["government", "public sector"] },
    { "type": "recommendation_modules_include_any", "values": ["government"] }
  ]'::jsonb,
  '{ "action": "select", "reason": "Government/public-sector profile inferred" }'::jsonb,
  'Installs government reference operating model',
  true
),
(
  'qiyas_required',
  'Qiyas required',
  'حزمة قياس مطلوبة',
  'qiyas-core',
  30,
  true,
  false,
  '[
    { "type": "answer_truthy", "field": "enable_qiyas" },
    { "type": "answer_truthy", "field": "needs_maturity_assessment" },
    { "type": "answer_truthy", "field": "needs_benchmarking" },
    { "type": "recommendation_modules_include_any", "values": ["qiyas", "assessment", "benchmarking", "maturity"] }
  ]'::jsonb,
  '{ "action": "select", "reason": "Maturity/assessment capability required" }'::jsonb,
  'Installs Qiyas assessment domain',
  true
)
ON CONFLICT (policy_code) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  target_pack_code = EXCLUDED.target_pack_code,
  priority = EXCLUDED.priority,
  enabled = EXCLUDED.enabled,
  stop_on_match = EXCLUDED.stop_on_match,
  conditions = EXCLUDED.conditions,
  outcome = EXCLUDED.outcome,
  notes = EXCLUDED.notes,
  updated_at = now();

COMMIT;
