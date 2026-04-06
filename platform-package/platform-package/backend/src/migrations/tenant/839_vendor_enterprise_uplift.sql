-- Migration 723: Vendor Module Enterprise Uplift
-- Creates engagement tracking, issues/exceptions, formal assessments,
-- admin config, and extends the vendors table with aggregate counters.

-- ═══════════════════════════════════════════════════════════════════
-- 1. VENDOR ENGAGEMENTS — contract/engagement lifecycle tracking
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_engagements (
  engagement_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID NOT NULL,
  engagement_type     VARCHAR(40) NOT NULL DEFAULT 'contract',
  title               VARCHAR(500) NOT NULL,
  contract_ref        VARCHAR(100),
  start_date          DATE,
  end_date            DATE,
  auto_renewal        BOOLEAN DEFAULT FALSE,
  renewal_notice_days INT DEFAULT 90,
  total_value         NUMERIC(15,2),
  currency            VARCHAR(3) DEFAULT 'SAR',
  status              VARCHAR(30) NOT NULL DEFAULT 'draft',
  owner_user_id       VARCHAR(64),
  description         TEXT,
  metadata            JSONB DEFAULT '{}',
  created_by          VARCHAR(64),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vendor_engagements_vendor ON vendor_engagements(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_engagements_status ON vendor_engagements(status);
CREATE INDEX IF NOT EXISTS idx_vendor_engagements_end ON vendor_engagements(end_date) WHERE deleted_at IS NULL;

-- 2. VENDOR ENGAGEMENT MILESTONES — contract milestones and touchpoints

CREATE TABLE IF NOT EXISTS vendor_engagement_milestones (
  milestone_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id       UUID NOT NULL REFERENCES vendor_engagements(engagement_id) ON DELETE CASCADE,
  milestone_type      VARCHAR(40) NOT NULL DEFAULT 'review',
  title               VARCHAR(500) NOT NULL,
  due_date            DATE,
  completed_at        TIMESTAMPTZ,
  completed_by        VARCHAR(64),
  status              VARCHAR(30) NOT NULL DEFAULT 'pending',
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_eng_milestones_eng ON vendor_engagement_milestones(engagement_id);
CREATE INDEX IF NOT EXISTS idx_vendor_eng_milestones_due ON vendor_engagement_milestones(due_date) WHERE status = 'pending';

-- ═══════════════════════════════════════════════════════════════════
-- 3. VENDOR ISSUES — aggregated from assessments, SLA, monitoring, manual
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_issues (
  issue_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID NOT NULL,
  source_type         VARCHAR(40) NOT NULL DEFAULT 'manual',
  source_id           UUID,
  title               VARCHAR(500) NOT NULL,
  description         TEXT,
  severity            VARCHAR(20) NOT NULL DEFAULT 'medium',
  status              VARCHAR(30) NOT NULL DEFAULT 'open',
  assigned_to         VARCHAR(64),
  due_date            DATE,
  resolved_at         TIMESTAMPTZ,
  resolution_notes    TEXT,
  risk_impact         VARCHAR(20),
  escalated_to        VARCHAR(64),
  escalated_at        TIMESTAMPTZ,
  created_by          VARCHAR(64),
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vendor_issues_vendor ON vendor_issues(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_issues_status ON vendor_issues(status);
CREATE INDEX IF NOT EXISTS idx_vendor_issues_severity ON vendor_issues(severity);
CREATE INDEX IF NOT EXISTS idx_vendor_issues_source ON vendor_issues(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_vendor_issues_due ON vendor_issues(due_date) WHERE status NOT IN ('resolved', 'closed');

-- ═══════════════════════════════════════════════════════════════════
-- 4. VENDOR EXCEPTIONS — exception request/approval workflow
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_exceptions (
  exception_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id             UUID NOT NULL,
  issue_id              UUID,
  exception_type        VARCHAR(40) NOT NULL DEFAULT 'risk_acceptance',
  title                 VARCHAR(500) NOT NULL,
  justification         TEXT NOT NULL,
  risk_assessment       TEXT,
  compensating_controls TEXT,
  valid_from            DATE,
  valid_until           DATE,
  status                VARCHAR(30) NOT NULL DEFAULT 'draft',
  requested_by          VARCHAR(64) NOT NULL,
  approved_by           VARCHAR(64),
  approved_at           TIMESTAMPTZ,
  approval_notes        TEXT,
  review_frequency      VARCHAR(20) DEFAULT 'quarterly',
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_exceptions_vendor ON vendor_exceptions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_exceptions_status ON vendor_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_vendor_exceptions_valid ON vendor_exceptions(valid_until) WHERE status = 'approved';

-- ═══════════════════════════════════════════════════════════════════
-- 5. VENDOR RISK ASSESSMENTS — formal risk assessment records
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_risk_assessments (
  assessment_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id           UUID NOT NULL,
  assessment_type     VARCHAR(40) NOT NULL DEFAULT 'periodic',
  template_id         VARCHAR(100),
  status              VARCHAR(30) NOT NULL DEFAULT 'draft',
  assessor_id         VARCHAR(64),
  reviewer_id         VARCHAR(64),
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  overall_score       NUMERIC(5,2),
  risk_rating         VARCHAR(20),
  criteria            JSONB DEFAULT '[]',
  findings            JSONB DEFAULT '[]',
  recommendations     JSONB DEFAULT '[]',
  next_review_date    DATE,
  metadata            JSONB DEFAULT '{}',
  created_by          VARCHAR(64),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vendor_risk_assess_vendor ON vendor_risk_assessments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_risk_assess_status ON vendor_risk_assessments(status);
CREATE INDEX IF NOT EXISTS idx_vendor_risk_assess_type ON vendor_risk_assessments(assessment_type);
CREATE INDEX IF NOT EXISTS idx_vendor_risk_assess_review ON vendor_risk_assessments(next_review_date) WHERE status = 'completed';

-- ═══════════════════════════════════════════════════════════════════
-- 6. VENDOR ADMIN CONFIG — module configuration per tenant
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_admin_config (
  config_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key          VARCHAR(100) NOT NULL UNIQUE,
  config_value        JSONB NOT NULL DEFAULT '{}',
  description_en      TEXT,
  description_ar      TEXT,
  updated_by          VARCHAR(64),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default config
INSERT INTO vendor_admin_config (config_key, config_value, description_en, description_ar) VALUES
  ('risk_tier_thresholds', '{"critical": {"min_score": 0, "max_score": 25}, "high": {"min_score": 26, "max_score": 50}, "medium": {"min_score": 51, "max_score": 75}, "low": {"min_score": 76, "max_score": 100}}', 'Risk tier score boundaries', 'حدود درجات مستوى المخاطر'),
  ('scoring_weights', '{"assessment": 0.30, "compliance": 0.25, "cyber": 0.20, "sla": 0.10, "findings": 0.10, "incidents": 0.05}', 'Scorecard component weights', 'أوزان مكونات بطاقة الأداء'),
  ('dd_workflow_default', '{"steps": ["document_collection", "background_check", "financial_review", "security_assessment", "compliance_verification", "legal_review", "risk_rating", "approval"]}', 'Default due diligence workflow steps', 'خطوات العناية الواجبة الافتراضية'),
  ('monitoring_signal_types', '["financial_alert", "cyber_rating_change", "news_negative", "regulatory_action", "data_breach", "litigation", "sanctions_hit", "credit_downgrade", "key_person_departure", "service_disruption"]', 'Monitoring signal type taxonomy', 'تصنيف أنواع إشارات المراقبة'),
  ('sla_metric_types', '["uptime", "response_time", "resolution_time", "throughput", "quality", "availability", "error_rate", "compliance_adherence"]', 'SLA metric type taxonomy', 'تصنيف أنواع مقاييس SLA'),
  ('notification_rules', '{"dd_expiry_days": 30, "contract_expiry_days": 60, "sla_breach_notify": true, "monitoring_alert_notify": true, "assessment_overdue_days": 14}', 'Notification trigger rules', 'قواعد إطلاق الإشعارات'),
  ('assessment_templates', '[]', 'Risk assessment templates', 'قوالب تقييم المخاطر')
ON CONFLICT (config_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- 7. EXTEND VENDORS TABLE — aggregate counters
-- ═══════════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS engagement_count INT DEFAULT 0;
  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS active_issues_count INT DEFAULT 0;
  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS exception_count INT DEFAULT 0;
  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS last_assessment_id UUID;
  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS last_assessment_date TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
