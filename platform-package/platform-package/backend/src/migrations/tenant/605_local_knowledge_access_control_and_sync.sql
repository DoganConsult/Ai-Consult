-- ============================================================
-- Migration 605: Local Knowledge Access Control & Sync History
-- Adds document-level ACL table and source sync history table
-- ============================================================

-- 1. Document-level Access Control List
CREATE TABLE IF NOT EXISTS local_knowledge_document_acl (
  acl_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  document_id UUID NOT NULL REFERENCES local_knowledge_documents(document_id) ON DELETE CASCADE,
  user_id VARCHAR(64),
  role_code VARCHAR(100),
  team_id UUID,
  access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('read', 'write', 'admin')),
  granted_by VARCHAR(64) NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by VARCHAR(64),
  CONSTRAINT chk_acl_grantee CHECK (
    user_id IS NOT NULL OR role_code IS NOT NULL OR team_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_acl_tenant_document ON local_knowledge_document_acl(tenant_id, document_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_acl_user ON local_knowledge_document_acl(tenant_id, user_id) WHERE revoked_at IS NULL AND user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_acl_role ON local_knowledge_document_acl(tenant_id, role_code) WHERE revoked_at IS NULL AND role_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_acl_team ON local_knowledge_document_acl(tenant_id, team_id) WHERE revoked_at IS NULL AND team_id IS NOT NULL;

-- 2. Source sync history for tracking sync runs
CREATE TABLE IF NOT EXISTS local_knowledge_source_sync_history (
  sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  source_id UUID NOT NULL REFERENCES local_knowledge_sources(source_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  documents_added INT DEFAULT 0,
  documents_updated INT DEFAULT 0,
  documents_failed INT DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  triggered_by VARCHAR(64),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_sync_history_source ON local_knowledge_source_sync_history(tenant_id, source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON local_knowledge_source_sync_history(tenant_id, status);

-- 3. Extend access_log table to support additional action types needed by the service
-- The existing CHECK constraint allows: 'read', 'download', 'export', 'publish', 'delete', 'archive'
-- We need to add: 'search', 'view', 'query', 'grant', 'revoke'
ALTER TABLE local_knowledge_access_log
  DROP CONSTRAINT IF EXISTS local_knowledge_access_log_access_type_check;
ALTER TABLE local_knowledge_access_log
  ADD CONSTRAINT local_knowledge_access_log_access_type_check
  CHECK (access_type IN ('read', 'download', 'export', 'publish', 'delete', 'archive', 'search', 'view', 'query', 'grant', 'revoke'));

-- 4. Add optional columns to access_log for richer logging
ALTER TABLE local_knowledge_access_log
  ADD COLUMN IF NOT EXISTS chunk_ids UUID[],
  ADD COLUMN IF NOT EXISTS query_text TEXT,
  ADD COLUMN IF NOT EXISTS result_count INT,
  ADD COLUMN IF NOT EXISTS response_time_ms INT,
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) CHECK (source IN ('api', 'copilot', 'widget')),
  ADD COLUMN IF NOT EXISTS session_id VARCHAR(128);
