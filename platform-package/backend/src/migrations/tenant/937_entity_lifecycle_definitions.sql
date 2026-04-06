-- Migration 928: Entity Lifecycle Definitions — DB-driven status registry
-- Law 3: Data-driven security — statuses from registry, not hardcoded
-- Replaces hardcoded status arrays in *-constants.ts files across all modules

CREATE TABLE __TENANT_SCHEMA__.entity_lifecycle_definitions (
    definition_id     uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    module_code       text NOT NULL,
    entity_type       text NOT NULL,
    status_code       text NOT NULL,
    name_en           text NOT NULL,
    name_ar           text,
    status_category   text NOT NULL CHECK (status_category IN ('initial', 'active', 'review', 'terminal', 'archived')),
    display_order     integer NOT NULL DEFAULT 0,
    color_token       text,
    is_default        boolean NOT NULL DEFAULT false,
    is_terminal       boolean NOT NULL DEFAULT false,
    allows_edit       boolean NOT NULL DEFAULT true,
    created_at        timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (module_code, entity_type, status_code)
);

CREATE INDEX idx_lifecycle_def_module ON __TENANT_SCHEMA__.entity_lifecycle_definitions (module_code);
CREATE INDEX idx_lifecycle_def_entity ON __TENANT_SCHEMA__.entity_lifecycle_definitions (module_code, entity_type);

COMMENT ON TABLE __TENANT_SCHEMA__.entity_lifecycle_definitions IS
    'DB-driven status/lifecycle registry. Replaces hardcoded status arrays in module constants files.';

-- ── Risk module statuses ────────────────────────────────────────────────────
INSERT INTO __TENANT_SCHEMA__.entity_lifecycle_definitions (module_code, entity_type, status_code, name_en, name_ar, status_category, display_order, is_default, is_terminal) VALUES
    ('risk', 'risk_record', 'draft', 'Draft', 'مسودة', 'initial', 1, true, false),
    ('risk', 'risk_record', 'submitted', 'Submitted', 'مقدم', 'active', 2, false, false),
    ('risk', 'risk_record', 'under_review', 'Under Review', 'قيد المراجعة', 'review', 3, false, false),
    ('risk', 'risk_record', 'assessed', 'Assessed', 'تم التقييم', 'active', 4, false, false),
    ('risk', 'risk_record', 'treatment_planned', 'Treatment Planned', 'خطة المعالجة', 'active', 5, false, false),
    ('risk', 'risk_record', 'approved', 'Approved', 'معتمد', 'active', 6, false, false),
    ('risk', 'risk_record', 'active', 'Active', 'نشط', 'active', 7, false, false),
    ('risk', 'risk_record', 'monitoring', 'Monitoring', 'مراقبة', 'active', 8, false, false),
    ('risk', 'risk_record', 'closed', 'Closed', 'مغلق', 'terminal', 9, false, true),
    ('risk', 'risk_record', 'retired', 'Retired', 'متقاعد', 'archived', 10, false, true),
    ('risk', 'risk_record', 'returned', 'Returned', 'مرتجع', 'active', 11, false, false);

-- ── Compliance module statuses ──────────────────────────────────────────────
INSERT INTO __TENANT_SCHEMA__.entity_lifecycle_definitions (module_code, entity_type, status_code, name_en, name_ar, status_category, display_order, is_default, is_terminal) VALUES
    ('compliance', 'compliance_status', 'compliant', 'Compliant', 'متوافق', 'active', 1, false, false),
    ('compliance', 'compliance_status', 'substantially_compliant', 'Substantially Compliant', 'متوافق جوهرياً', 'active', 2, false, false),
    ('compliance', 'compliance_status', 'partially_compliant', 'Partially Compliant', 'متوافق جزئياً', 'review', 3, false, false),
    ('compliance', 'compliance_status', 'non_compliant', 'Non-Compliant', 'غير متوافق', 'review', 4, false, false);

-- ── Policy module statuses ──────────────────────────────────────────────────
INSERT INTO __TENANT_SCHEMA__.entity_lifecycle_definitions (module_code, entity_type, status_code, name_en, name_ar, status_category, display_order, is_default, is_terminal) VALUES
    ('policy', 'policy_document', 'draft', 'Draft', 'مسودة', 'initial', 1, true, false),
    ('policy', 'policy_document', 'under_review', 'Under Review', 'قيد المراجعة', 'review', 2, false, false),
    ('policy', 'policy_document', 'approved', 'Approved', 'معتمد', 'active', 3, false, false),
    ('policy', 'policy_document', 'published', 'Published', 'منشور', 'active', 4, false, false),
    ('policy', 'policy_document', 'superseded', 'Superseded', 'مُستبدَل', 'archived', 5, false, true),
    ('policy', 'policy_document', 'retired', 'Retired', 'متقاعد', 'archived', 6, false, true);

-- ── Audit module statuses ───────────────────────────────────────────────────
INSERT INTO __TENANT_SCHEMA__.entity_lifecycle_definitions (module_code, entity_type, status_code, name_en, name_ar, status_category, display_order, is_default, is_terminal) VALUES
    ('audit', 'audit_engagement', 'planned', 'Planned', 'مخطط', 'initial', 1, true, false),
    ('audit', 'audit_engagement', 'in_progress', 'In Progress', 'قيد التنفيذ', 'active', 2, false, false),
    ('audit', 'audit_engagement', 'fieldwork', 'Fieldwork', 'العمل الميداني', 'active', 3, false, false),
    ('audit', 'audit_engagement', 'draft_report', 'Draft Report', 'مسودة التقرير', 'review', 4, false, false),
    ('audit', 'audit_engagement', 'final_report', 'Final Report', 'التقرير النهائي', 'active', 5, false, false),
    ('audit', 'audit_engagement', 'closed', 'Closed', 'مغلق', 'terminal', 6, false, true);

-- ── Incident module statuses ────────────────────────────────────────────────
INSERT INTO __TENANT_SCHEMA__.entity_lifecycle_definitions (module_code, entity_type, status_code, name_en, name_ar, status_category, display_order, is_default, is_terminal) VALUES
    ('incident', 'incident_record', 'reported', 'Reported', 'مبلغ', 'initial', 1, true, false),
    ('incident', 'incident_record', 'triaged', 'Triaged', 'مُصنف', 'active', 2, false, false),
    ('incident', 'incident_record', 'under_investigation', 'Under Investigation', 'قيد التحقيق', 'active', 3, false, false),
    ('incident', 'incident_record', 'containment', 'Containment', 'الاحتواء', 'active', 4, false, false),
    ('incident', 'incident_record', 'resolved', 'Resolved', 'تم الحل', 'active', 5, false, false),
    ('incident', 'incident_record', 'closed', 'Closed', 'مغلق', 'terminal', 6, false, true);

-- ── Evidence module statuses ────────────────────────────────────────────────
INSERT INTO __TENANT_SCHEMA__.entity_lifecycle_definitions (module_code, entity_type, status_code, name_en, name_ar, status_category, display_order, is_default, is_terminal) VALUES
    ('evidence', 'evidence_item', 'pending', 'Pending', 'في الانتظار', 'initial', 1, true, false),
    ('evidence', 'evidence_item', 'collected', 'Collected', 'تم الجمع', 'active', 2, false, false),
    ('evidence', 'evidence_item', 'under_review', 'Under Review', 'قيد المراجعة', 'review', 3, false, false),
    ('evidence', 'evidence_item', 'approved', 'Approved', 'معتمد', 'active', 4, false, false),
    ('evidence', 'evidence_item', 'rejected', 'Rejected', 'مرفوض', 'active', 5, false, false),
    ('evidence', 'evidence_item', 'archived', 'Archived', 'مؤرشف', 'archived', 6, false, true);

-- ── Vendor module statuses ──────────────────────────────────────────────────
INSERT INTO __TENANT_SCHEMA__.entity_lifecycle_definitions (module_code, entity_type, status_code, name_en, name_ar, status_category, display_order, is_default, is_terminal) VALUES
    ('vendor', 'vendor_record', 'prospective', 'Prospective', 'محتمل', 'initial', 1, true, false),
    ('vendor', 'vendor_record', 'under_assessment', 'Under Assessment', 'قيد التقييم', 'review', 2, false, false),
    ('vendor', 'vendor_record', 'approved', 'Approved', 'معتمد', 'active', 3, false, false),
    ('vendor', 'vendor_record', 'active', 'Active', 'نشط', 'active', 4, false, false),
    ('vendor', 'vendor_record', 'under_review', 'Under Review', 'قيد المراجعة', 'review', 5, false, false),
    ('vendor', 'vendor_record', 'suspended', 'Suspended', 'معلق', 'active', 6, false, false),
    ('vendor', 'vendor_record', 'offboarded', 'Offboarded', 'تم إنهاء العقد', 'terminal', 7, false, true);

-- ── Exception module statuses ───────────────────────────────────────────────
INSERT INTO __TENANT_SCHEMA__.entity_lifecycle_definitions (module_code, entity_type, status_code, name_en, name_ar, status_category, display_order, is_default, is_terminal) VALUES
    ('exception', 'exception_record', 'draft', 'Draft', 'مسودة', 'initial', 1, true, false),
    ('exception', 'exception_record', 'submitted', 'Submitted', 'مقدم', 'active', 2, false, false),
    ('exception', 'exception_record', 'under_review', 'Under Review', 'قيد المراجعة', 'review', 3, false, false),
    ('exception', 'exception_record', 'approved', 'Approved', 'معتمد', 'active', 4, false, false),
    ('exception', 'exception_record', 'rejected', 'Rejected', 'مرفوض', 'terminal', 5, false, true),
    ('exception', 'exception_record', 'expired', 'Expired', 'منتهي الصلاحية', 'terminal', 6, false, true);

-- ── Remediation module statuses ─────────────────────────────────────────────
INSERT INTO __TENANT_SCHEMA__.entity_lifecycle_definitions (module_code, entity_type, status_code, name_en, name_ar, status_category, display_order, is_default, is_terminal) VALUES
    ('remediation', 'remediation_plan', 'draft', 'Draft', 'مسودة', 'initial', 1, true, false),
    ('remediation', 'remediation_plan', 'in_progress', 'In Progress', 'قيد التنفيذ', 'active', 2, false, false),
    ('remediation', 'remediation_plan', 'validation', 'Validation', 'التحقق', 'review', 3, false, false),
    ('remediation', 'remediation_plan', 'completed', 'Completed', 'مكتمل', 'terminal', 4, false, true),
    ('remediation', 'remediation_plan', 'cancelled', 'Cancelled', 'ملغي', 'terminal', 5, false, true);

-- ── Workflow module statuses ────────────────────────────────────────────────
INSERT INTO __TENANT_SCHEMA__.entity_lifecycle_definitions (module_code, entity_type, status_code, name_en, name_ar, status_category, display_order, is_default, is_terminal) VALUES
    ('workflow', 'workflow_definition', 'draft', 'Draft', 'مسودة', 'initial', 1, true, false),
    ('workflow', 'workflow_definition', 'active', 'Active', 'نشط', 'active', 2, false, false),
    ('workflow', 'workflow_definition', 'deprecated', 'Deprecated', 'مُهمل', 'archived', 3, false, false),
    ('workflow', 'workflow_definition', 'archived', 'Archived', 'مؤرشف', 'archived', 4, false, true),
    ('workflow', 'workflow_instance', 'running', 'Running', 'قيد التشغيل', 'active', 1, false, false),
    ('workflow', 'workflow_instance', 'completed', 'Completed', 'مكتمل', 'terminal', 2, false, true),
    ('workflow', 'workflow_instance', 'failed', 'Failed', 'فشل', 'terminal', 3, false, true),
    ('workflow', 'workflow_instance', 'cancelled', 'Cancelled', 'ملغي', 'terminal', 4, false, true),
    ('workflow', 'workflow_instance', 'suspended', 'Suspended', 'معلق', 'active', 5, false, false);

-- ── Controls module statuses ────────────────────────────────────────────────
INSERT INTO __TENANT_SCHEMA__.entity_lifecycle_definitions (module_code, entity_type, status_code, name_en, name_ar, status_category, display_order, is_default, is_terminal) VALUES
    ('controls', 'control_record', 'draft', 'Draft', 'مسودة', 'initial', 1, true, false),
    ('controls', 'control_record', 'designed', 'Designed', 'مصمم', 'active', 2, false, false),
    ('controls', 'control_record', 'implemented', 'Implemented', 'مُنفذ', 'active', 3, false, false),
    ('controls', 'control_record', 'tested', 'Tested', 'مُختبر', 'review', 4, false, false),
    ('controls', 'control_record', 'effective', 'Effective', 'فعال', 'active', 5, false, false),
    ('controls', 'control_record', 'ineffective', 'Ineffective', 'غير فعال', 'review', 6, false, false),
    ('controls', 'control_record', 'retired', 'Retired', 'متقاعد', 'archived', 7, false, true);
