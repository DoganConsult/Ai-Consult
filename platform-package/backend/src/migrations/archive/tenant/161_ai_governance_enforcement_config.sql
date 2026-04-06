-- Tenant Migration 161: AI Governance Enforcement Configuration
-- Persists enforcement mode per tenant in platform_operation_config
-- Replaces in-memory-only enforcement mode for agent/model governance bridges

INSERT INTO platform_operation_config (config_key, config_value, description_en, description_ar) VALUES
  ('ai_governance_enforcement_mode',
   '"audit"',
   'AI governance enforcement mode for model/agent registries: audit | warn | enforce',
   'وضع تطبيق حوكمة الذكاء الاصطناعي لسجلات النماذج والوكلاء: تدقيق | تحذير | تطبيق')
ON CONFLICT (config_key) DO NOTHING;
