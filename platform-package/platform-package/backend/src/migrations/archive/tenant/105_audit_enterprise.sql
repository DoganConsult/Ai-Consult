-- ============================================
-- Migration 105: Audit Enterprise Features
-- Adds 13 new tables for audit module expansion
-- ============================================

-- 1. Audit Universe / Registry
CREATE TABLE IF NOT EXISTS audit_universe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  risk_rating TEXT DEFAULT 'medium',
  last_audited_at TIMESTAMPTZ,
  next_audit_due TIMESTAMPTZ,
  audit_frequency_months INTEGER DEFAULT 12,
  owner_id UUID,
  framework_ids TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 2. Risk-Based Audit Planning
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'audit_risk_scores') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'audit_universe' AND column_name = 'id') THEN
      CREATE TABLE audit_risk_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        universe_id UUID REFERENCES audit_universe(id) ON DELETE CASCADE,
        risk_factor TEXT NOT NULL,
        score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
        weight NUMERIC(3,2) DEFAULT 1.0,
        assessed_by UUID,
        assessed_at TIMESTAMPTZ DEFAULT now()
      );
    ELSE
      CREATE TABLE audit_risk_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        universe_id UUID,
        risk_factor TEXT NOT NULL,
        score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
        weight NUMERIC(3,2) DEFAULT 1.0,
        assessed_by UUID,
        assessed_at TIMESTAMPTZ DEFAULT now()
      );
    END IF;
  END IF;
END $$;

-- 3. Recurring Audit Schedules
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'audit_schedules') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'audit_universe' AND column_name = 'id') THEN
      CREATE TABLE audit_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        universe_id UUID REFERENCES audit_universe(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        audit_type TEXT NOT NULL,
        cron_expression TEXT NOT NULL,
        next_run_at TIMESTAMPTZ,
        last_run_at TIMESTAMPTZ,
        auto_create BOOLEAN DEFAULT true,
        template_id UUID,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    ELSE
      CREATE TABLE audit_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        universe_id UUID,
        title TEXT NOT NULL,
        audit_type TEXT NOT NULL,
        cron_expression TEXT NOT NULL,
        next_run_at TIMESTAMPTZ,
        last_run_at TIMESTAMPTZ,
        auto_create BOOLEAN DEFAULT true,
        template_id UUID,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    END IF;
  END IF;
END $$;

-- 4. Fieldwork / Working Papers
CREATE TABLE IF NOT EXISTS audit_working_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  audit_id UUID NOT NULL,
  title TEXT NOT NULL,
  paper_type TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'draft',
  prepared_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  control_id VARCHAR(100),
  reference_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Audit Team Assignment
CREATE TABLE IF NOT EXISTS audit_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  audit_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  hours_budgeted NUMERIC(6,1),
  hours_actual NUMERIC(6,1) DEFAULT 0,
  UNIQUE(audit_id, user_id)
);

-- 8. QA / Peer Review
CREATE TABLE IF NOT EXISTS audit_qa_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  audit_id UUID NOT NULL,
  finding_id UUID,
  reviewer_id UUID NOT NULL,
  review_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  comments TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Audit Scoring / Ratings
CREATE TABLE IF NOT EXISTS audit_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  audit_id UUID NOT NULL UNIQUE,
  overall_rating TEXT NOT NULL,
  control_design_rating TEXT,
  control_operating_rating TEXT,
  summary TEXT,
  rated_by UUID,
  rated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. CAPA Effectiveness Re-testing
CREATE TABLE IF NOT EXISTS capa_effectiveness_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  capa_id UUID NOT NULL,
  finding_id UUID,
  test_date TIMESTAMPTZ DEFAULT now(),
  tester_id UUID,
  result TEXT NOT NULL,
  evidence_notes TEXT,
  reopen_finding BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. External Auditor Coordination
CREATE TABLE IF NOT EXISTS external_audit_coordination (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  audit_id UUID NOT NULL,
  auditor_firm TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  engagement_letter_ref TEXT,
  status TEXT DEFAULT 'planned',
  start_date DATE,
  end_date DATE,
  document_requests TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Regulatory Audit Tracking
CREATE TABLE IF NOT EXISTS regulatory_audit_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  framework_code TEXT NOT NULL,
  requirement_ref TEXT NOT NULL,
  description TEXT,
  frequency TEXT,
  last_completed_at TIMESTAMPTZ,
  next_due_at TIMESTAMPTZ,
  responsible_team_id UUID,
  status TEXT DEFAULT 'pending',
  audit_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Control Testing & Test Plans
CREATE TABLE IF NOT EXISTS audit_test_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  audit_id UUID NOT NULL,
  control_id VARCHAR(100) NOT NULL,
  test_type TEXT NOT NULL,
  procedure_description TEXT,
  sample_size INTEGER,
  status TEXT DEFAULT 'planned',
  tested_by UUID,
  tested_at TIMESTAMPTZ,
  result_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 16. Finding Resolution SLAs
CREATE TABLE IF NOT EXISTS audit_finding_slas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  severity TEXT NOT NULL,
  resolution_days INTEGER NOT NULL,
  warning_threshold_pct INTEGER DEFAULT 75,
  escalation_to UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, severity)
);

-- 17. Audit Time Tracking
CREATE TABLE IF NOT EXISTS audit_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  audit_id UUID NOT NULL,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  hours NUMERIC(5,1) NOT NULL,
  description TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. Audit Program Templates
CREATE TABLE IF NOT EXISTS audit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  description TEXT,
  default_scope TEXT,
  default_methodology TEXT,
  checklist JSONB DEFAULT '[]',
  test_plan_template JSONB DEFAULT '[]',
  estimated_hours INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Seed default SLA config
INSERT INTO audit_finding_slas (tenant_id, severity, resolution_days, warning_threshold_pct)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'critical', 15, 75),
  ('00000000-0000-0000-0000-000000000000', 'high', 30, 75),
  ('00000000-0000-0000-0000-000000000000', 'medium', 60, 75),
  ('00000000-0000-0000-0000-000000000000', 'low', 90, 75)
ON CONFLICT (tenant_id, severity) DO NOTHING;
