-- Migration 929: Feature Flags — DB-driven feature toggles
-- Law 3: Data-driven — feature availability from registry, not hardcoded booleans
-- Supports per-tenant, per-module feature flag overrides

CREATE TABLE __TENANT_SCHEMA__.feature_flags (
    flag_id           uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    flag_code         text NOT NULL UNIQUE,
    name_en           text NOT NULL,
    name_ar           text,
    module_code       text,
    description       text,
    default_value     boolean NOT NULL DEFAULT false,
    flag_type         text NOT NULL DEFAULT 'boolean' CHECK (flag_type IN ('boolean', 'percentage', 'allowlist')),
    owner_scope       text NOT NULL DEFAULT 'platform' CHECK (owner_scope IN ('platform', 'product', 'module')),
    is_active         boolean NOT NULL DEFAULT true,
    created_at        timestamp with time zone DEFAULT now() NOT NULL,
    updated_at        timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE __TENANT_SCHEMA__.tenant_feature_flag_overrides (
    override_id       uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    flag_code         text NOT NULL REFERENCES __TENANT_SCHEMA__.feature_flags(flag_code),
    override_value    boolean NOT NULL,
    reason            text,
    set_by            character varying(64) NOT NULL,
    expires_at        timestamp with time zone,
    created_at        timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (flag_code)
);

CREATE INDEX idx_feature_flags_module ON __TENANT_SCHEMA__.feature_flags (module_code);
CREATE INDEX idx_feature_flags_active ON __TENANT_SCHEMA__.feature_flags (is_active) WHERE is_active = true;

COMMENT ON TABLE __TENANT_SCHEMA__.feature_flags IS
    'DB-driven feature flag definitions. Replaces hardcoded boolean flags in product config.';
COMMENT ON TABLE __TENANT_SCHEMA__.tenant_feature_flag_overrides IS
    'Per-tenant overrides for feature flags. Falls back to feature_flags.default_value if no override.';

-- ── Seed: Product feature flags (from agrc-product.definition.ts) ───────────
INSERT INTO __TENANT_SCHEMA__.feature_flags (flag_code, name_en, name_ar, module_code, description, default_value, owner_scope) VALUES
    ('agrc_engine_enabled', 'AGRC Engine', 'محرك AGRC', 'agrc-engine', 'Enable AGRC compliance engine', true, 'product'),
    ('agrc_control_monitor_enabled', 'Control Monitoring', 'مراقبة الضوابط', 'controls', 'Enable continuous control monitoring', true, 'product'),
    ('agrc_remediation_monitor_enabled', 'Remediation Monitor', 'مراقبة المعالجة', 'remediation', 'Enable remediation tracking monitor', true, 'product'),
    ('agrc_ai_copilot_enabled', 'AI Copilot', 'المساعد الذكي', 'ai', 'Enable AI copilot features', true, 'product'),
    ('agrc_advanced_analytics_enabled', 'Advanced Analytics', 'التحليلات المتقدمة', 'analytics', 'Enable advanced analytics dashboards', false, 'product'),
    ('agrc_vendor_portal_enabled', 'Vendor Portal', 'بوابة الموردين', 'vendor', 'Enable external vendor self-service portal', false, 'product'),
    ('agrc_audit_room_enabled', 'Audit Room', 'غرفة التدقيق', 'audit', 'Enable audit room portal', false, 'product'),
    ('agrc_bcp_enabled', 'Business Continuity', 'استمرارية الأعمال', 'bcp', 'Enable BCP module', true, 'product'),
    ('agrc_privacy_enabled', 'Privacy Module', 'وحدة الخصوصية', 'privacy', 'Enable privacy assessment module', false, 'product'),
    ('agrc_ksa_regulatory_enabled', 'KSA Regulatory', 'التنظيمات السعودية', 'ksa-regulatory', 'Enable KSA-specific regulatory compliance', false, 'product'),
    ('agrc_dora_enabled', 'DORA Compliance', 'امتثال DORA', 'dora', 'Enable DORA digital resilience module', false, 'product'),
    ('agrc_ai_governance_enabled', 'AI Governance', 'حوكمة الذكاء الاصطناعي', 'ai-governance', 'Enable AI governance module', true, 'product'),
    ('autonomous_workflow_enabled', 'Autonomous Workflows', 'سير العمل المستقل', 'workflow', 'Enable AI-driven autonomous workflow execution', false, 'product'),
    ('cooperative_workflow_enabled', 'Cooperative Workflows', 'سير العمل التعاوني', 'workflow', 'Enable multi-agent cooperative workflows', false, 'product');
