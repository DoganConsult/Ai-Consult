-- P5.4: DevOps/pipeline evidence — add source_type and metadata_kv to evidence table
-- Evidence type/source "pipeline"; connector for CI/CD artifact or webhook; store with source_type and reference

-- Add source_type column if it doesn't exist (enum: manual-upload, system-generated, connector, pipeline)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = CURRENT_SCHEMA() 
    AND table_name = 'evidence' 
    AND column_name = 'source_type'
  ) THEN
    ALTER TABLE evidence ADD COLUMN source_type VARCHAR(30) DEFAULT 'manual-upload';
    ALTER TABLE evidence ADD CONSTRAINT evidence_source_type_check 
      CHECK (source_type IN ('manual-upload', 'system-generated', 'connector', 'pipeline'));
    CREATE INDEX IF NOT EXISTS idx_evidence_source_type ON evidence(source_type);
  END IF;
END $$;

-- Add metadata_kv JSONB column for storing pipeline metadata (build ID, commit hash, job URL, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = CURRENT_SCHEMA() 
    AND table_name = 'evidence' 
    AND column_name = 'metadata_kv'
  ) THEN
    ALTER TABLE evidence ADD COLUMN metadata_kv JSONB DEFAULT '{}';
    CREATE INDEX IF NOT EXISTS idx_evidence_metadata_kv ON evidence USING GIN(metadata_kv);
  END IF;
END $$;

-- Add source_reference column for storing external reference (e.g., build URL, artifact URL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = CURRENT_SCHEMA() 
    AND table_name = 'evidence' 
    AND column_name = 'source_reference'
  ) THEN
    ALTER TABLE evidence ADD COLUMN source_reference VARCHAR(1000);
    CREATE INDEX IF NOT EXISTS idx_evidence_source_reference ON evidence(source_reference) WHERE source_reference IS NOT NULL;
  END IF;
END $$;

-- Create pipeline_webhook_configs table for storing CI/CD webhook configurations
CREATE TABLE IF NOT EXISTS pipeline_webhook_configs (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  pipeline_type VARCHAR(50) NOT NULL, -- github-actions, gitlab-ci, jenkins, azure-devops, circleci, etc.
  webhook_secret VARCHAR(255), -- HMAC secret for signature verification
  api_key_id UUID, -- Reference to webhook_api_keys if using API key auth
  control_id_pattern VARCHAR(200), -- Pattern to match controls (e.g., "NCA-ECC-*", "SAMA-CSF-*")
  evidence_type_code VARCHAR(50), -- Default evidence type for pipeline artifacts
  enabled BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}', -- Additional config (branch filters, artifact patterns, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(64),
  CONSTRAINT uq_pipeline_webhook_tenant_name UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_webhook_tenant ON pipeline_webhook_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_webhook_type ON pipeline_webhook_configs(pipeline_type);
CREATE INDEX IF NOT EXISTS idx_pipeline_webhook_enabled ON pipeline_webhook_configs(tenant_id, enabled) WHERE enabled = TRUE;

-- Create pipeline_webhook_logs table for logging webhook deliveries
CREATE TABLE IF NOT EXISTS pipeline_webhook_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES pipeline_webhook_configs(config_id) ON DELETE CASCADE,
  tenant_id VARCHAR(64) NOT NULL,
  pipeline_type VARCHAR(50) NOT NULL,
  event_type VARCHAR(100), -- build.completed, deployment.succeeded, test.passed, etc.
  build_id VARCHAR(255),
  commit_hash VARCHAR(64),
  branch VARCHAR(255),
  job_url VARCHAR(1000),
  artifact_urls TEXT[],
  status VARCHAR(20) DEFAULT 'received', -- received, processed, failed, ignored
  evidence_ids UUID[] DEFAULT '{}', -- Evidence records created from this webhook
  error_message TEXT,
  raw_payload JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_webhook_logs_config ON pipeline_webhook_logs(config_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_webhook_logs_tenant ON pipeline_webhook_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_webhook_logs_build ON pipeline_webhook_logs(build_id) WHERE build_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pipeline_webhook_logs_commit ON pipeline_webhook_logs(commit_hash) WHERE commit_hash IS NOT NULL;

COMMENT ON TABLE pipeline_webhook_configs IS 'P5.4: CI/CD pipeline webhook configurations for automatic evidence collection';
COMMENT ON TABLE pipeline_webhook_logs IS 'P5.4: Log of pipeline webhook deliveries and evidence creation';
