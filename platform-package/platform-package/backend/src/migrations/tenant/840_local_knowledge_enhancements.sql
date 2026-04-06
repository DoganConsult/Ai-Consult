-- ============================================================
-- Migration 375: Local Knowledge Hub Enhancements
-- R3.3B Phase G+: Enhanced access control, legal hold, health monitoring
-- ============================================================

-- 1. Add confidentiality_level to documents
ALTER TABLE local_knowledge_documents
  ADD COLUMN IF NOT EXISTS confidentiality_level VARCHAR(20) DEFAULT 'internal'
    CHECK (confidentiality_level IN ('public', 'internal', 'confidential', 'restricted', 'top_secret'));

CREATE INDEX IF NOT EXISTS idx_documents_confidentiality ON local_knowledge_documents(tenant_id, confidentiality_level);

-- 2. Add access_control_list to documents (fine-grained permissions)
ALTER TABLE local_knowledge_documents
  ADD COLUMN IF NOT EXISTS access_control_list JSONB DEFAULT '{"roles": [], "users": [], "org_units": []}';

CREATE INDEX IF NOT EXISTS idx_documents_acl ON local_knowledge_documents USING GIN(access_control_list);

-- 3. Add legal_hold fields to documents
ALTER TABLE local_knowledge_documents
  ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS legal_hold_reason TEXT,
  ADD COLUMN IF NOT EXISTS legal_hold_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legal_hold_placed_by VARCHAR(64),
  ADD COLUMN IF NOT EXISTS legal_hold_placed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_documents_legal_hold ON local_knowledge_documents(tenant_id, legal_hold) WHERE legal_hold = TRUE;

-- 4. Add retention_rule JSONB to documents (compliance-driven retention)
ALTER TABLE local_knowledge_documents
  ADD COLUMN IF NOT EXISTS retention_rule JSONB;

CREATE INDEX IF NOT EXISTS idx_documents_retention_rule ON local_knowledge_documents USING GIN(retention_rule);

-- 5. Add soft delete fields to documents
ALTER TABLE local_knowledge_documents
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(64),
  ADD COLUMN IF NOT EXISTS recovery_period_days INT DEFAULT 30;

CREATE INDEX IF NOT EXISTS idx_documents_deleted ON local_knowledge_documents(tenant_id, deleted_at) WHERE deleted_at IS NOT NULL;

-- 6. Add health_status to sources
ALTER TABLE local_knowledge_sources
  ADD COLUMN IF NOT EXISTS health_status VARCHAR(20) DEFAULT 'unknown'
    CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS health_check_error TEXT,
  ADD COLUMN IF NOT EXISTS consecutive_failures INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sources_health ON local_knowledge_sources(tenant_id, health_status);

-- 7. Add encryption_status to ingestion log
ALTER TABLE local_knowledge_ingestion_log
  ADD COLUMN IF NOT EXISTS encryption_status VARCHAR(20) DEFAULT 'not_encrypted'
    CHECK (encryption_status IN ('encrypted', 'not_encrypted', 'encryption_failed'));

-- 8. Create access log table
CREATE TABLE IF NOT EXISTS local_knowledge_access_log (
  access_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  document_id UUID REFERENCES local_knowledge_documents(document_id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL,
  user_role VARCHAR(50),
  access_type VARCHAR(20) NOT NULL CHECK (access_type IN ('read', 'download', 'export', 'publish', 'delete', 'archive')),
  granted BOOLEAN NOT NULL,
  reason TEXT, -- why access was granted/denied
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_log_tenant ON local_knowledge_access_log(tenant_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_log_document ON local_knowledge_access_log(document_id);
CREATE INDEX IF NOT EXISTS idx_access_log_user ON local_knowledge_access_log(user_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_log_granted ON local_knowledge_access_log(tenant_id, granted, accessed_at DESC) WHERE granted = FALSE;

-- 9. Create chain of custody table
CREATE TABLE IF NOT EXISTS local_knowledge_custody_chain (
  custody_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  document_id UUID REFERENCES local_knowledge_documents(document_id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('ingested', 'extracted', 'published', 'archived', 'deleted', 'restored', 'accessed', 'legal_hold_placed', 'legal_hold_removed', 'retention_extended')),
  actor_user_id VARCHAR(64),
  actor_role VARCHAR(50),
  event_timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB, -- additional event context
  previous_custody_id UUID REFERENCES local_knowledge_custody_chain(custody_id),
  checksum VARCHAR(128) -- hash of document state at this event
);

CREATE INDEX IF NOT EXISTS idx_custody_tenant ON local_knowledge_custody_chain(tenant_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_custody_document ON local_knowledge_custody_chain(document_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_custody_actor ON local_knowledge_custody_chain(actor_user_id, event_timestamp DESC);

-- 10. Create storage quota table
CREATE TABLE IF NOT EXISTS local_knowledge_storage_quota (
  quota_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL UNIQUE,
  storage_quota_bytes BIGINT DEFAULT 10737418240, -- 10GB default
  storage_used_bytes BIGINT DEFAULT 0,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  alert_threshold_80 BOOLEAN DEFAULT FALSE,
  alert_threshold_90 BOOLEAN DEFAULT FALSE,
  alert_threshold_100 BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quota_tenant ON local_knowledge_storage_quota(tenant_id);

-- 11. Create legal hold audit log
CREATE TABLE IF NOT EXISTS local_knowledge_legal_hold_audit (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  document_id UUID REFERENCES local_knowledge_documents(document_id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('placed', 'extended', 'removed')),
  placed_by VARCHAR(64) NOT NULL,
  reason TEXT,
  hold_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_hold_audit_tenant ON local_knowledge_legal_hold_audit(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_hold_audit_document ON local_knowledge_legal_hold_audit(document_id);

-- 12. Add workspace_id and module_scope to documents for scoped access
ALTER TABLE local_knowledge_documents
  ADD COLUMN IF NOT EXISTS workspace_id UUID,
  ADD COLUMN IF NOT EXISTS module_scope TEXT[];

CREATE INDEX IF NOT EXISTS idx_documents_workspace ON local_knowledge_documents(tenant_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_module_scope ON local_knowledge_documents USING GIN(module_scope);
