-- Migration 763: Exception, Remediation, Action cross-module config tables

-- ═══ EXCEPTION MODULE CONFIG ═══

CREATE TABLE IF NOT EXISTS exception_approval_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_type VARCHAR(50) NOT NULL UNIQUE,
  type_label VARCHAR(100) NOT NULL,
  max_duration_days INT DEFAULT 90,
  requires_ciso_approval BOOLEAN DEFAULT FALSE,
  requires_committee_approval BOOLEAN DEFAULT FALSE,
  auto_expire BOOLEAN DEFAULT TRUE,
  renewal_allowed BOOLEAN DEFAULT TRUE,
  max_renewals INT DEFAULT 2,
  risk_acceptance_required BOOLEAN DEFAULT TRUE,
  compensating_controls_required BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exception_risk_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id UUID,
  risk_id UUID,
  accepted_risk_level VARCHAR(20) DEFAULT 'medium',
  accepted_by VARCHAR(64),
  accepted_at TIMESTAMPTZ,
  justification TEXT,
  compensating_controls JSONB DEFAULT '[]',
  review_date DATE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ REMEDIATION MODULE CONFIG ═══

CREATE TABLE IF NOT EXISTS remediation_sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity VARCHAR(20) NOT NULL UNIQUE,
  severity_label VARCHAR(50) NOT NULL,
  sla_hours INT NOT NULL DEFAULT 168,
  escalation_hours INT NOT NULL DEFAULT 72,
  auto_escalate BOOLEAN DEFAULT TRUE,
  escalation_role VARCHAR(50) DEFAULT 'admin',
  notification_template VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS remediation_plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(50) NOT NULL UNIQUE,
  template_name VARCHAR(200) NOT NULL,
  description TEXT,
  finding_types TEXT[] DEFAULT '{}',
  default_steps JSONB DEFAULT '[]',
  estimated_hours INT DEFAULT 40,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(64) DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ ACTION MODULE CONFIG ═══

CREATE TABLE IF NOT EXISTS action_escalation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority VARCHAR(20) NOT NULL UNIQUE,
  priority_label VARCHAR(50) NOT NULL,
  escalate_after_days INT NOT NULL DEFAULT 7,
  notify_before_days INT[] DEFAULT '{1,3}',
  auto_escalate_to_role VARCHAR(50) DEFAULT 'admin',
  auto_reassign BOOLEAN DEFAULT FALSE,
  max_extensions INT DEFAULT 2,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_item_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(50) NOT NULL UNIQUE,
  template_name VARCHAR(200) NOT NULL,
  description TEXT,
  source_types TEXT[] DEFAULT '{}',
  default_priority VARCHAR(20) DEFAULT 'medium',
  default_due_days INT DEFAULT 14,
  checklist JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(64) DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ REPORTING MODULE CONFIG ═══

CREATE TABLE IF NOT EXISTS report_schedule_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(50) NOT NULL UNIQUE,
  type_label VARCHAR(100) NOT NULL,
  frequency VARCHAR(20) DEFAULT 'monthly' CHECK (frequency IN ('daily','weekly','biweekly','monthly','quarterly','annually','on_demand')),
  default_recipients TEXT[] DEFAULT '{}',
  default_format VARCHAR(10) DEFAULT 'pdf' CHECK (default_format IN ('pdf','xlsx','csv','html')),
  auto_generate BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ MODULE METRICS SNAPSHOTS ═══

CREATE TABLE IF NOT EXISTS module_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code VARCHAR(50) NOT NULL,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_records INT DEFAULT 0,
  active_records INT DEFAULT 0,
  overdue_count INT DEFAULT 0,
  pending_approval INT DEFAULT 0,
  sla_breaches INT DEFAULT 0,
  avg_resolution_hours NUMERIC(10,2),
  completion_rate NUMERIC(5,2),
  custom_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_code, metric_date)
);
CREATE INDEX IF NOT EXISTS idx_mms_module_date ON module_metrics_snapshots(module_code, metric_date DESC);
