-- Migration 760: Module Contract Enforcement Framework (MCEF)
-- Tracks 7-stage firing model (S0-S6), readiness thresholds, maturity, and cross-module linkage

CREATE TABLE IF NOT EXISTS module_maturity_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code VARCHAR(50) NOT NULL,
  stage_code VARCHAR(20) NOT NULL CHECK (stage_code IN ('S0_entitlement','S1_provisioning','S2_kickstart','S3_lifecycle','S4_events','S5_ui_shell','S6_operational')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','failed','skipped')),
  completed_at TIMESTAMPTZ,
  completed_by VARCHAR(64),
  evidence JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_code, stage_code)
);

CREATE TABLE IF NOT EXISTS module_readiness_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code VARCHAR(50) NOT NULL,
  check_code VARCHAR(50) NOT NULL,
  check_label VARCHAR(200) NOT NULL,
  check_query TEXT NOT NULL,
  min_count INT DEFAULT 1,
  severity VARCHAR(20) DEFAULT 'required' CHECK (severity IN ('required','recommended','optional')),
  category VARCHAR(50) DEFAULT 'data',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_code, check_code)
);

CREATE TABLE IF NOT EXISTS module_readiness_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code VARCHAR(50) NOT NULL,
  check_code VARCHAR(50) NOT NULL,
  passed BOOLEAN NOT NULL,
  actual_count INT DEFAULT 0,
  min_required INT DEFAULT 1,
  detail TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_code, check_code)
);

CREATE TABLE IF NOT EXISTS module_entity_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_module VARCHAR(50) NOT NULL,
  source_entity_type VARCHAR(50) NOT NULL,
  source_entity_id VARCHAR(100) NOT NULL,
  target_module VARCHAR(50) NOT NULL,
  target_entity_type VARCHAR(50) NOT NULL,
  target_entity_id VARCHAR(100) NOT NULL,
  link_type VARCHAR(30) DEFAULT 'related' CHECK (link_type IN ('related','depends_on','mitigates','evidences','remediates','audits','escalates')),
  created_by VARCHAR(64) DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_module, source_entity_id, target_module, target_entity_id, link_type)
);
CREATE INDEX IF NOT EXISTS idx_mel_source ON module_entity_links(source_module, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_mel_target ON module_entity_links(target_module, target_entity_id);

CREATE TABLE IF NOT EXISTS module_sla_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  sla_type VARCHAR(50) NOT NULL,
  sla_hours INT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  breached BOOLEAN DEFAULT FALSE,
  breached_at TIMESTAMPTZ,
  escalated BOOLEAN DEFAULT FALSE,
  escalated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mst_due ON module_sla_tracking(due_at) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mst_module ON module_sla_tracking(module_code, entity_type);

CREATE TABLE IF NOT EXISTS module_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  payload JSONB DEFAULT '{}',
  emitted_by VARCHAR(64) DEFAULT 'system',
  emitted_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mel_module_time ON module_event_log(module_code, emitted_at DESC);

CREATE TABLE IF NOT EXISTS module_stale_record_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  stale_threshold_days INT DEFAULT 30,
  stale_count INT DEFAULT 0,
  total_count INT DEFAULT 0,
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_code, entity_type)
);
