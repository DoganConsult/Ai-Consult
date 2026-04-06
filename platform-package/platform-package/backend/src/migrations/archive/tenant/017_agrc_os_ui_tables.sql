-- ============================================
-- AGRC-OS UI Tables — Executive Falcon Suite
-- 7 tables: workspace_profiles, role_profiles,
--   widget_registry, dashboard_layouts,
--   drawer_templates, action_items, onboarding_answers
-- ============================================

-- 1. Workspace Profile (per-tenant workspace context)
CREATE TABLE IF NOT EXISTS workspace_profiles (
    profile_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id     UUID NOT NULL,
    lifecycle        VARCHAR(30) NOT NULL DEFAULT 'governance',
    current_stage    VARCHAR(30) NOT NULL DEFAULT 'discovery',
    maturity_level   VARCHAR(20) NOT NULL DEFAULT 'initial',
    active_frameworks TEXT[] DEFAULT '{}',
    preferences      JSONB DEFAULT '{}',
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_wp_lifecycle CHECK (lifecycle IN ('governance','risk','compliance','audit','privacy','vendor','incident')),
    CONSTRAINT chk_wp_stage CHECK (current_stage IN ('discovery','design','implement','operate','monitor','optimize')),
    CONSTRAINT chk_wp_maturity CHECK (maturity_level IN ('initial','developing','defined','managed','optimized'))
);

CREATE INDEX IF NOT EXISTS idx_workspace_profiles_ws ON workspace_profiles(workspace_id);

-- 2. Role Profiles (defines persona → features/widgets/actions)
-- NOTE: PK is 'role' (VARCHAR 50) — aligned with database.ts and migration 019 seeds
CREATE TABLE IF NOT EXISTS role_profiles (
    role             VARCHAR(50) PRIMARY KEY,
    modules          JSONB NOT NULL DEFAULT '[]',
    dashboard_widgets JSONB NOT NULL DEFAULT '[]',
    default_landing_page VARCHAR(100) NOT NULL DEFAULT '/dashboard',
    custom           BOOLEAN NOT NULL DEFAULT false,
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Widget Registry (all 20+ widgets with metadata)
CREATE TABLE IF NOT EXISTS widget_registry (
    widget_id        VARCHAR(60) PRIMARY KEY,
    label            VARCHAR(120) NOT NULL,
    label_ar         VARCHAR(120),
    description      TEXT,
    chart_type       VARCHAR(30) NOT NULL DEFAULT 'gauge',
    icon             VARCHAR(80) DEFAULT 'pi pi-chart-bar',
    data_source      VARCHAR(120),
    default_size     VARCHAR(10) DEFAULT '1x1',
    min_role         VARCHAR(40),
    tags             TEXT[] DEFAULT '{}',
    config_schema    JSONB DEFAULT '{}',
    active           BOOLEAN DEFAULT TRUE,
    sort_order       INT DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_wr_chart_type CHECK (chart_type IN (
        'gauge','bar','donut','sparkline','trend','heatmap','radar',
        'pie','area','bullet','kpi','list','grid','card'
    ))
);

-- 4. Dashboard Layouts (5 core + big picture)
CREATE TABLE IF NOT EXISTS dashboard_layouts (
    layout_id        VARCHAR(60) PRIMARY KEY,
    label            VARCHAR(120) NOT NULL,
    label_ar         VARCHAR(120),
    description      TEXT,
    icon             VARCHAR(80) DEFAULT 'pi pi-th-large',
    grid_cols        INT DEFAULT 12,
    widget_slots     JSONB NOT NULL DEFAULT '[]',
    allowed_roles    TEXT[] DEFAULT '{}',
    is_default       BOOLEAN DEFAULT FALSE,
    sort_order       INT DEFAULT 0,
    active           BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Drawer Templates (context-type based, aligned with database.ts)
CREATE TABLE IF NOT EXISTS drawer_templates (
    template_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key     VARCHAR(80) NOT NULL UNIQUE,
    name_en          VARCHAR(200) NOT NULL,
    name_ar          VARCHAR(200),
    zones            JSONB NOT NULL DEFAULT '[]',
    context_type     VARCHAR(80) NOT NULL DEFAULT 'entity',
    sort_order       INT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drawer_templates_context ON drawer_templates(context_type);

-- 6. Action Items (aligned with database.ts — uses action_items not ui_action_items)
CREATE TABLE IF NOT EXISTS action_items (
    item_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    source_type      VARCHAR(50) NOT NULL,
    source_id        VARCHAR(100) NOT NULL,
    assigned_to      VARCHAR(64) NOT NULL,
    deadline         DATE,
    reminder_schedule JSONB DEFAULT '[1, 3, 7]',
    status           VARCHAR(30) DEFAULT 'pending',
    escalated_to     VARCHAR(64),
    priority         INT NOT NULL DEFAULT 5,
    type             VARCHAR(50) DEFAULT 'task',
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_items_user     ON action_items(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_action_items_deadline ON action_items(deadline);

-- 7. Onboarding Answers (wizard step → answer store)
CREATE TABLE IF NOT EXISTS onboarding_answers (
    answer_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          VARCHAR(64) NOT NULL,
    wizard_step      VARCHAR(60) NOT NULL,
    field_id         VARCHAR(100) NOT NULL,
    answer_value     JSONB NOT NULL DEFAULT '{}',
    version          INT DEFAULT 1,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_onboarding_answer UNIQUE (user_id, wizard_step, field_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_answers_user ON onboarding_answers(user_id);
