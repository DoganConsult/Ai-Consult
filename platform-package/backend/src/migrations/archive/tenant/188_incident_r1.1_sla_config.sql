-- Migration 188 — Incident R1.1: Seed SLA defaults into platform_operation_config
-- Provides canonical DB-backed SLA configuration for incident module
-- ============================================

BEGIN;

INSERT INTO platform_operation_config (config_key, config_value, description_en, description_ar)
VALUES (
  'incident_sla_defaults',
  '{"critical": 4, "high": 24, "medium": 72, "low": 168}',
  'Incident SLA response-time defaults (hours) by severity level',
  'إعدادات اتفاقية مستوى الخدمة الافتراضية للحوادث (ساعات) حسب مستوى الخطورة'
)
ON CONFLICT (config_key) DO NOTHING;

COMMIT;
