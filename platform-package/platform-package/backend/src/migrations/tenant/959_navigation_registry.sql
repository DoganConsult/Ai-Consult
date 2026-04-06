-- Migration 931: Navigation Registry — DB-driven navigation items
-- Law 3: Data-driven — navigation from registry, not hardcoded arrays
-- Replaces hardcoded AGRC_NAV_ITEMS and ALL_NAV_ITEMS arrays

CREATE TABLE __TENANT_SCHEMA__.navigation_items (
    nav_id            uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    nav_code          text NOT NULL UNIQUE,
    label_key         text NOT NULL,
    label_en          text NOT NULL,
    label_ar          text,
    icon              text NOT NULL,
    route             text NOT NULL,
    required_permission text NOT NULL,
    section           text NOT NULL CHECK (section IN ('main', 'account', 'grc', 'operations', 'ai', 'admin', 'settings')),
    lifecycle_phase   text CHECK (lifecycle_phase IN ('plan', 'assess', 'implement', 'operate', 'assure', 'improve')),
    module_code       text,
    module_group      text,
    parent_nav_code   text REFERENCES __TENANT_SCHEMA__.navigation_items(nav_code),
    display_order     integer NOT NULL DEFAULT 0,
    is_active         boolean NOT NULL DEFAULT true,
    owner_scope       text NOT NULL DEFAULT 'product' CHECK (owner_scope IN ('platform', 'product', 'module')),
    product_code      text DEFAULT NULL,
    created_at        timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX idx_nav_items_section ON __TENANT_SCHEMA__.navigation_items (section, display_order);
CREATE INDEX idx_nav_items_module ON __TENANT_SCHEMA__.navigation_items (module_code);
CREATE INDEX idx_nav_items_active ON __TENANT_SCHEMA__.navigation_items (is_active) WHERE is_active = true;

COMMENT ON TABLE __TENANT_SCHEMA__.navigation_items IS
    'DB-driven navigation registry. Replaces hardcoded nav arrays in agrc-nav.ts and playbook-data.ts.';

-- ── Seed: Core navigation items (from AGRC_NAV_ITEMS) ───────────────────────
INSERT INTO __TENANT_SCHEMA__.navigation_items (nav_code, label_key, label_en, label_ar, icon, route, required_permission, section, lifecycle_phase, module_group, display_order) VALUES
    ('dashboard', 'nav.dashboard', 'Dashboard', 'لوحة المعلومات', 'dashboard', '/workspace-home', 'workspace.config.read', 'main', 'plan', NULL, 1),
    ('foundation_overview', 'sidebar.foundationOverview', 'Foundation', 'الأساس', 'home', '/foundation', 'workspace.config.read', 'account', 'plan', 'foundation', 10),
    ('foundation_org', 'sidebar.foundationOrg', 'Organization', 'المنظمة', 'building', '/foundation/organization', 'workspace.config.read', 'account', 'plan', 'foundation', 11),
    ('foundation_users', 'sidebar.foundationUsers', 'Users', 'المستخدمون', 'users', '/foundation/users', 'workspace.config.read', 'account', 'plan', 'foundation', 12),
    ('foundation_roles', 'sidebar.foundationRoles', 'Roles', 'الأدوار', 'sliders-h', '/foundation/roles', 'workspace.config.read', 'account', 'plan', 'foundation', 13),
    ('foundation_bu', 'sidebar.foundationBU', 'Business Units', 'وحدات الأعمال', 'briefcase', '/foundation/business-units', 'workspace.config.read', 'account', 'plan', 'foundation', 14),
    ('foundation_depts', 'sidebar.foundationDepts', 'Departments', 'الأقسام', 'sitemap', '/foundation/departments', 'workspace.config.read', 'account', 'plan', 'foundation', 15),
    ('foundation_locs', 'sidebar.foundationLocs', 'Locations', 'المواقع', 'map-marker', '/foundation/locations', 'workspace.config.read', 'account', 'plan', 'foundation', 16),
    ('foundation_refdata', 'sidebar.foundationRefData', 'Reference Data', 'البيانات المرجعية', 'database', '/foundation/reference-data', 'workspace.config.read', 'account', 'plan', 'foundation', 17),
    ('governance_overview', 'sidebar.governanceOverview', 'Governance', 'الحوكمة', 'home', '/governance/overview', 'governance.record.read', 'grc', 'plan', 'governance', 20),
    ('governance_policies', 'sidebar.governancePolicies', 'Policies', 'السياسات', 'file', '/governance/policies', 'policy.document.read', 'grc', 'plan', 'governance', 21),
    ('governance_procedures', 'sidebar.governanceProcedures', 'Procedures', 'الإجراءات', 'list', '/governance/procedures', 'policy.document.read', 'grc', 'plan', 'governance', 22),
    ('governance_committees', 'sidebar.governanceCommittees', 'Committees', 'اللجان', 'users', '/governance/committees', 'governance.record.read', 'grc', 'plan', 'governance', 23),
    ('risk_hub', 'sidebar.riskHub', 'Risk Hub', 'مركز المخاطر', 'exclamation-triangle', '/risk-hub', 'risk.record.read', 'grc', 'assess', NULL, 30),
    ('compliance_overview', 'sidebar.complianceOverview', 'Compliance', 'الامتثال', 'chart-bar', '/compliance/overview', 'control.record.read', 'grc', 'implement', 'compliance', 40),
    ('compliance_frameworks', 'sidebar.complianceFrameworks', 'Frameworks', 'الأطر', 'sitemap', '/compliance/frameworks', 'framework.record.read', 'grc', 'implement', 'compliance', 41),
    ('compliance_controls', 'sidebar.complianceControls', 'Controls', 'الضوابط', 'sliders-h', '/compliance/controls', 'control.record.read', 'grc', 'implement', 'compliance', 42),
    ('evidence_overview', 'sidebar.evidenceOverview', 'Evidence', 'الأدلة', 'folder-open', '/evidence/overview', 'evidence.item.read', 'grc', 'implement', NULL, 50),
    ('audit_overview', 'sidebar.auditOverview', 'Audit', 'التدقيق', 'search', '/audit/overview', 'audit.record.read', 'grc', 'assure', NULL, 60),
    ('vendor_hub', 'sidebar.vendorHub', 'Vendor Hub', 'مركز الموردين', 'truck', '/vendor-hub', 'vendor.record.read', 'operations', 'assess', NULL, 70),
    ('bcp_overview', 'sidebar.bcpOverview', 'Business Continuity', 'استمرارية الأعمال', 'shield', '/bcp/overview', 'bcp.plan.read', 'operations', 'operate', NULL, 80),
    ('ai_governance', 'sidebar.aiGovernance', 'AI Governance', 'حوكمة الذكاء الاصطناعي', 'microchip', '/ai-governance', 'ai.agent.read', 'ai', 'operate', 'ai-governance', 90);
