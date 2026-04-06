-- ============================================
-- Migration 103 — Seed Agent A12: Security Awareness & Training Agent
-- ============================================
-- Context:
--   agents-index.json declares 12 agents (A01-A12).
--   A12 is defined in agrc-agents.ts and synced at runtime via syncProductToDb().
--   This migration ensures A12 is present in public.agent_registry for
--   environments that run schema migrations independently from server startup.
--
-- Schema: public (master DB, product-level registry)
-- Note: agent_registry schema defined in 040_agent_registry.sql
-- ============================================

INSERT INTO public.agent_registry (
  agent_id,
  product_key,
  name_en,
  name_ar,
  domain_en,
  domain_ar,
  icon,
  color,
  route_patterns,
  delegation_scope,
  quick_prompts,
  enabled,
  sort_order
)
VALUES (
  'A12',
  'agrc',
  'Security Awareness & Training Agent',
  'وكيل التوعية والتدريب الأمني',
  'Training & Awareness',
  'التدريب والتوعية',
  'pi-graduation-cap',
  '#d946ef',
  ARRAY['/training-awareness', '/training-awareness/programs', '/training-awareness/campaigns', '/training-awareness/completion', '/training-awareness/gaps'],
  'assessment',
  '[
    {"en": "Show overdue training assignments", "ar": "عرض تعيينات التدريب المتأخرة"},
    {"en": "Check training completion rate", "ar": "فحص معدل إتمام التدريب"},
    {"en": "Identify training gaps", "ar": "تحديد فجوات التدريب"},
    {"en": "Recommend training programs", "ar": "اقتراح برامج تدريبية"}
  ]'::jsonb,
  true,
  12
)
ON CONFLICT (agent_id) DO NOTHING;
