-- Shell Configuration Overrides
-- Stores layout/slot/panel/widget zone overrides per module at product/tenant/role/user scope.
-- Priority cascade: platform-default(10) → product-default(15) → tenant-override(20) → role-override(30) → user-preference(50)

CREATE TABLE IF NOT EXISTS shell_config_overrides (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    module_code     varchar(50)   NOT NULL,
    source          varchar(30)   NOT NULL CHECK (source IN ('product-default','tenant-override','role-override','user-preference')),
    scope_key       varchar(150)  NOT NULL,
    priority        integer       NOT NULL DEFAULT 10,
    config_json     jsonb         NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz   NOT NULL DEFAULT now(),
    updated_at      timestamptz   NOT NULL DEFAULT now(),
    UNIQUE (module_code, scope_key)
);

CREATE INDEX IF NOT EXISTS idx_shell_config_module
    ON shell_config_overrides (module_code);
CREATE INDEX IF NOT EXISTS idx_shell_config_scope
    ON shell_config_overrides (scope_key);
CREATE INDEX IF NOT EXISTS idx_shell_config_source
    ON shell_config_overrides (source);

-- Add shell_layout_overrides column to user_preferences for quick per-user lookups
ALTER TABLE user_preferences
    ADD COLUMN IF NOT EXISTS shell_layout_overrides jsonb DEFAULT '{}'::jsonb;

COMMENT ON TABLE shell_config_overrides IS
    'Stores shell layout/slot/panel overrides per module. Resolved by ShellResolverService with priority cascade.';
