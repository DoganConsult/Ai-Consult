-- ════════════════════════════════════════════════════════════════════════════
-- Migration 207: Vendor Cross-Agent Enhancements
-- Adds PDPL/privacy fields, portal messaging, benchmarking, training link
-- ════════════════════════════════════════════════════════════════════════════

-- ── PDPL/Privacy Compliance Fields on vendors table ──
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS dpia_required BOOLEAN DEFAULT FALSE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS dpia_completed_at TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS dpa_signed_at TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS sub_processor_registered BOOLEAN DEFAULT FALSE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS data_residency_country VARCHAR(10);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS data_classification_level VARCHAR(30) DEFAULT 'internal';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS privacy_impact_score INT DEFAULT 0;

-- ── Vendor Portal Messages ──
CREATE TABLE IF NOT EXISTS vendor_portal_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(vendor_id),
  thread_id UUID,
  sender_type VARCHAR(20) NOT NULL DEFAULT 'internal', -- 'internal' | 'vendor'
  sender_id VARCHAR(100),
  sender_name VARCHAR(200),
  subject VARCHAR(500),
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vpm_vendor ON vendor_portal_messages (vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vpm_thread ON vendor_portal_messages (thread_id, created_at ASC);

-- ── Vendor Benchmark Cohorts ──
CREATE TABLE IF NOT EXISTS vendor_benchmark_cohorts (
  cohort_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_name VARCHAR(200) NOT NULL,
  dimension VARCHAR(60) NOT NULL, -- 'category', 'risk_tier', 'geography', 'size'
  dimension_value VARCHAR(100),
  vendor_count INT DEFAULT 0,
  avg_score NUMERIC(5,2) DEFAULT 0,
  p25_score NUMERIC(5,2) DEFAULT 0,
  median_score NUMERIC(5,2) DEFAULT 0,
  p75_score NUMERIC(5,2) DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vbc_dim ON vendor_benchmark_cohorts (dimension, dimension_value);

-- ── Vendor Training Requirements ──
CREATE TABLE IF NOT EXISTS vendor_training_requirements (
  requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(vendor_id),
  training_type VARCHAR(60) NOT NULL, -- 'security_awareness', 'data_handling', 'compliance', 'custom'
  required_by TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'overdue', 'waived'
  certificate_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vtr_vendor ON vendor_training_requirements (vendor_id, status);

-- ── Vendor BCP Requirements ──
CREATE TABLE IF NOT EXISTS vendor_bcp_requirements (
  requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(vendor_id),
  bcp_plan_id UUID,
  test_type VARCHAR(60) DEFAULT 'tabletop', -- 'tabletop', 'simulation', 'full_failover'
  required_frequency VARCHAR(30) DEFAULT 'annual',
  last_tested_at TIMESTAMPTZ,
  next_test_due TIMESTAMPTZ,
  test_result VARCHAR(20), -- 'passed', 'failed', 'partial'
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vbcp_vendor ON vendor_bcp_requirements (vendor_id, status);

-- ── Vendor Concentration Mitigations (linked to process_tasks) ──
DO $$ BEGIN
  ALTER TABLE vendor_concentration_analysis ADD COLUMN IF NOT EXISTS mitigation_task_id UUID;
  ALTER TABLE vendor_concentration_analysis ADD COLUMN IF NOT EXISTS mitigation_due_date TIMESTAMPTZ;
  ALTER TABLE vendor_concentration_analysis ADD COLUMN IF NOT EXISTS mitigation_assigned_to UUID;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Version tracking handled by schema_migrations (migration runner)
