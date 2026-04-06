-- SLA per role: optional override by assignee_role.
-- lookupSLA(tenantId, processType, priority, assigneeRole?) checks this table first when assigneeRole is set,
-- then falls back to sla_config (process_type + priority_level), then SLA_DEFAULTS.

CREATE TABLE IF NOT EXISTS role_sla_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_type varchar(50) NOT NULL,
  priority_level varchar(20) NOT NULL,
  assignee_role varchar(64) NOT NULL,
  initial_sla_hours integer NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (process_type, priority_level, assignee_role)
);

CREATE INDEX IF NOT EXISTS idx_role_sla_defaults_lookup
  ON role_sla_defaults (process_type, priority_level, assignee_role)
  WHERE active = true;

COMMENT ON TABLE role_sla_defaults IS 'SLA hours by process type, priority, and assignee role; used by lookupSLA when assigneeRole is provided';
