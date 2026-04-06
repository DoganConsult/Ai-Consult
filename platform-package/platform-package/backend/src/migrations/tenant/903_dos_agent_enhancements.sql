-- DOS Agent Stack Enhancements — watchdog, audit log, lifecycle
-- Supports: kernel watchdog sweep log, structured kernel audit log

CREATE TABLE IF NOT EXISTS dos_agent_watchdog_log (
  id             BIGSERIAL PRIMARY KEY,
  tenant_id      TEXT NOT NULL,
  swept_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stuck_recovered INTEGER NOT NULL DEFAULT 0,
  circuits_tripped INTEGER NOT NULL DEFAULT 0,
  memories_purged INTEGER NOT NULL DEFAULT 0,
  alert_count    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dos_agent_watchdog_tenant
  ON dos_agent_watchdog_log (tenant_id, swept_at DESC);

CREATE TABLE IF NOT EXISTS dos_agent_kernel_audit (
  id             BIGSERIAL PRIMARY KEY,
  tenant_id      TEXT NOT NULL,
  category       TEXT NOT NULL,
  agent_code     TEXT NOT NULL,
  actor_id       TEXT,
  action         TEXT NOT NULL,
  detail         JSONB NOT NULL DEFAULT '{}',
  severity       TEXT NOT NULL DEFAULT 'info',
  correlation_id TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dos_agent_kernel_audit_tenant
  ON dos_agent_kernel_audit (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dos_agent_kernel_audit_category
  ON dos_agent_kernel_audit (category, severity);
CREATE INDEX IF NOT EXISTS idx_dos_agent_kernel_audit_agent
  ON dos_agent_kernel_audit (agent_code, created_at DESC);
