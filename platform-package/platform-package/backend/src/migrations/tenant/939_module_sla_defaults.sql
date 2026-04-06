-- Migration 930: Module SLA Defaults — DB-driven SLA thresholds
-- Law 3: Data-driven — SLA thresholds from registry, not hardcoded constants
-- Replaces hardcoded SLA values in *-constants.ts files across modules

CREATE TABLE __TENANT_SCHEMA__.module_sla_defaults (
    sla_id            uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    module_code       text NOT NULL,
    entity_type       text NOT NULL,
    severity          text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    sla_hours         integer NOT NULL,
    warning_pct       integer NOT NULL DEFAULT 80,
    name_en           text NOT NULL,
    name_ar           text,
    is_active         boolean NOT NULL DEFAULT true,
    created_at        timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (module_code, entity_type, severity)
);

CREATE INDEX idx_module_sla_module ON __TENANT_SCHEMA__.module_sla_defaults (module_code);

COMMENT ON TABLE __TENANT_SCHEMA__.module_sla_defaults IS
    'DB-driven SLA thresholds per module/severity. Replaces hardcoded SLA constants.';

-- ── Risk SLA defaults ───────────────────────────────────────────────────────
INSERT INTO __TENANT_SCHEMA__.module_sla_defaults (module_code, entity_type, severity, sla_hours, name_en, name_ar) VALUES
    ('risk', 'risk_record', 'critical', 24, 'Critical Risk SLA', 'اتفاقية مستوى الخدمة للمخاطر الحرجة'),
    ('risk', 'risk_record', 'high', 72, 'High Risk SLA', 'اتفاقية مستوى الخدمة للمخاطر العالية'),
    ('risk', 'risk_record', 'medium', 168, 'Medium Risk SLA', 'اتفاقية مستوى الخدمة للمخاطر المتوسطة'),
    ('risk', 'risk_record', 'low', 720, 'Low Risk SLA', 'اتفاقية مستوى الخدمة للمخاطر المنخفضة');

-- ── Policy SLA defaults ─────────────────────────────────────────────────────
INSERT INTO __TENANT_SCHEMA__.module_sla_defaults (module_code, entity_type, severity, sla_hours, name_en, name_ar) VALUES
    ('policy', 'policy_document', 'critical', 24, 'Critical Policy SLA', 'اتفاقية مستوى الخدمة للسياسات الحرجة'),
    ('policy', 'policy_document', 'high', 72, 'High Policy SLA', 'اتفاقية مستوى الخدمة للسياسات العالية'),
    ('policy', 'policy_document', 'medium', 168, 'Medium Policy SLA', 'اتفاقية مستوى الخدمة للسياسات المتوسطة'),
    ('policy', 'policy_document', 'low', 720, 'Low Policy SLA', 'اتفاقية مستوى الخدمة للسياسات المنخفضة');

-- ── Remediation SLA defaults ────────────────────────────────────────────────
INSERT INTO __TENANT_SCHEMA__.module_sla_defaults (module_code, entity_type, severity, sla_hours, name_en, name_ar) VALUES
    ('remediation', 'remediation_plan', 'critical', 24, 'Critical Remediation SLA', 'اتفاقية مستوى الخدمة للمعالجة الحرجة'),
    ('remediation', 'remediation_plan', 'high', 72, 'High Remediation SLA', 'اتفاقية مستوى الخدمة للمعالجة العالية'),
    ('remediation', 'remediation_plan', 'medium', 168, 'Medium Remediation SLA', 'اتفاقية مستوى الخدمة للمعالجة المتوسطة'),
    ('remediation', 'remediation_plan', 'low', 720, 'Low Remediation SLA', 'اتفاقية مستوى الخدمة للمعالجة المنخفضة');

-- ── Exception SLA defaults ──────────────────────────────────────────────────
INSERT INTO __TENANT_SCHEMA__.module_sla_defaults (module_code, entity_type, severity, sla_hours, name_en, name_ar) VALUES
    ('exception', 'exception_record', 'critical', 4, 'Critical Exception SLA', 'اتفاقية مستوى الخدمة للاستثناءات الحرجة'),
    ('exception', 'exception_record', 'high', 24, 'High Exception SLA', 'اتفاقية مستوى الخدمة للاستثناءات العالية'),
    ('exception', 'exception_record', 'medium', 72, 'Medium Exception SLA', 'اتفاقية مستوى الخدمة للاستثناءات المتوسطة'),
    ('exception', 'exception_record', 'low', 168, 'Low Exception SLA', 'اتفاقية مستوى الخدمة للاستثناءات المنخفضة');

-- ── Workflow SLA defaults ───────────────────────────────────────────────────
INSERT INTO __TENANT_SCHEMA__.module_sla_defaults (module_code, entity_type, severity, sla_hours, name_en, name_ar) VALUES
    ('workflow', 'workflow_instance', 'critical', 4, 'Critical Workflow SLA', 'اتفاقية مستوى الخدمة لسير العمل الحرج'),
    ('workflow', 'workflow_instance', 'high', 24, 'High Workflow SLA', 'اتفاقية مستوى الخدمة لسير العمل العالي'),
    ('workflow', 'workflow_instance', 'medium', 48, 'Medium Workflow SLA', 'اتفاقية مستوى الخدمة لسير العمل المتوسط'),
    ('workflow', 'workflow_instance', 'low', 168, 'Low Workflow SLA', 'اتفاقية مستوى الخدمة لسير العمل المنخفض');

-- ── Incident SLA defaults ───────────────────────────────────────────────────
INSERT INTO __TENANT_SCHEMA__.module_sla_defaults (module_code, entity_type, severity, sla_hours, name_en, name_ar) VALUES
    ('incident', 'incident_record', 'critical', 1, 'Critical Incident SLA', 'اتفاقية مستوى الخدمة للحوادث الحرجة'),
    ('incident', 'incident_record', 'high', 4, 'High Incident SLA', 'اتفاقية مستوى الخدمة للحوادث العالية'),
    ('incident', 'incident_record', 'medium', 24, 'Medium Incident SLA', 'اتفاقية مستوى الخدمة للحوادث المتوسطة'),
    ('incident', 'incident_record', 'low', 72, 'Low Incident SLA', 'اتفاقية مستوى الخدمة للحوادث المنخفضة');
