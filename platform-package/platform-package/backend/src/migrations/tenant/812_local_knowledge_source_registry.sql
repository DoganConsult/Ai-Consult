-- ============================================================
-- Migration 371: Local Knowledge Source Registry
-- R3.3B Phase A: Source registry and adapter layer
-- Tracks local sources (folders, SFTP, DB views, APIs) for knowledge ingestion
-- ============================================================

-- Source registry: tracks local sources (folders, SFTP, DB views, APIs)
CREATE TABLE IF NOT EXISTS local_knowledge_sources (
  source_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  workspace_id UUID,
  source_name VARCHAR(255) NOT NULL,
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('local_folder', 'sftp', 'local_db', 'local_api', 'sharepoint_local', 'onedrive_local')),
  source_config JSONB NOT NULL, -- adapter-specific config (path, connection, auth)
  scope_type VARCHAR(50) DEFAULT 'tenant' CHECK (scope_type IN ('tenant', 'workspace', 'module')),
  scope_value TEXT, -- workspace_id, module_code, or null for tenant
  trust_level VARCHAR(20) DEFAULT 'standard' CHECK (trust_level IN ('high', 'standard', 'low', 'unverified')),
  schedule_config JSONB, -- cron expression, polling interval, etc.
  adapter_class VARCHAR(100), -- adapter implementation class name
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error', 'disabled')),
  last_sync_at TIMESTAMPTZ,
  last_sync_status VARCHAR(20),
  last_sync_error TEXT,
  health_status JSONB, -- connectivity, auth, permissions
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_source_name_tenant UNIQUE (tenant_id, source_name)
);

CREATE INDEX IF NOT EXISTS idx_sources_tenant_status ON local_knowledge_sources(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_sources_type ON local_knowledge_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_sources_workspace ON local_knowledge_sources(workspace_id) WHERE workspace_id IS NOT NULL;
