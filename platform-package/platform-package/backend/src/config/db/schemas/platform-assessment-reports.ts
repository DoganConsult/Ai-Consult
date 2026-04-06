// ============================================
// Platform Schema — Assessment & Reporting
// Assessments, assessment items, reports,
// report templates, report schedules, report shares.
// ============================================

import { query } from '../query';

export async function createAssessmentReportTables(schema: string): Promise<void> {
  // === Assessment module tables ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".assessments (
      assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      framework_id VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'draft',
      score DECIMAL(5,2) DEFAULT 0,
      created_by VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".assessment_items (
      item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      assessment_id UUID REFERENCES "${schema}".assessments(assessment_id) ON DELETE CASCADE,
      control_node_id VARCHAR(100) NOT NULL,
      status VARCHAR(30) DEFAULT 'not_assessed',
      notes TEXT,
      remediation_ids TEXT[] DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // === Report module tables ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".reports (
      report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      parameters JSONB DEFAULT '{}',
      content JSONB DEFAULT '{}',
      format VARCHAR(20) DEFAULT 'json',
      language VARCHAR(5) DEFAULT 'en',
      status VARCHAR(30) DEFAULT 'completed',
      file_path VARCHAR(500),
      generated_by VARCHAR(64) NOT NULL,
      generated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".report_templates (
      template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      key VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      category VARCHAR(50) DEFAULT 'general',
      parameters_schema JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    INSERT INTO "${schema}".report_templates (name, key, description, category, parameters_schema) VALUES
      ('Risk Posture Report', 'risk_posture', 'Distribution, trends, and owner analysis of organizational risks', 'risk', '{"dateRange":"date_range","language":"language"}'),
      ('Audit Readiness Report', 'audit_readiness', 'Control, evidence, and finding analysis with readiness score', 'audit', '{"frameworkId":"framework_filter","language":"language"}'),
      ('Vendor Risk Summary', 'vendor_risk_summary', 'Vendor tier distribution, expiring contracts, overdue assessments', 'vendor', '{"language":"language"}'),
      ('Incident Trend Report', 'incident_trend', 'Severity and category breakdown with monthly trends', 'incident', '{"dateRange":"date_range","language":"language"}'),
      ('Evidence Coverage Report', 'evidence_coverage', 'Coverage matrix, verification status, and gap analysis', 'evidence', '{"frameworkId":"framework_filter","language":"language"}'),
      ('Maturity Assessment Report', 'maturity_assessment', 'Domain-specific maturity scores with recommendations', 'maturity', '{"language":"language"}'),
      ('Executive Summary', 'executive_summary', 'Cross-domain KPI aggregation with health score (bilingual)', 'executive', '{"dateRange":"date_range"}'),
      ('Regulatory Change Impact', 'regulatory_change_impact', 'Framework-specific gap analysis for regulatory changes', 'regulatory', '{"frameworkId":"framework_filter","language":"language"}'),
      ('KPI Trend Report', 'kpi_trend', 'Time-series trend analysis with period comparison', 'analytics', '{"dateRange":"date_range","language":"language"}'),
      ('Remediation Progress Report', 'remediation_progress', 'Task completion tracking with assignee breakdown', 'remediation', '{"dateRange":"date_range","language":"language"}')
    ON CONFLICT (key) DO UPDATE SET
      name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category, parameters_schema = EXCLUDED.parameters_schema
    WHERE (report_templates.name, report_templates.description) IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.description);

    CREATE TABLE IF NOT EXISTS "${schema}".report_schedules (
      schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_type VARCHAR(50) NOT NULL,
      parameters JSONB DEFAULT '{}',
      cron_expression VARCHAR(100) NOT NULL,
      enabled BOOLEAN DEFAULT TRUE,
      subscribers JSONB DEFAULT '[]',
      last_run_at TIMESTAMPTZ,
      created_by VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".report_shares (
      share_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_id UUID NOT NULL,
      shared_by VARCHAR(64) NOT NULL,
      recipient_id VARCHAR(64) NOT NULL,
      recipient_type VARCHAR(20) NOT NULL DEFAULT 'user',
      shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(report_id, recipient_id)
    );

    CREATE INDEX IF NOT EXISTS idx_report_shares_report_id ON "${schema}".report_shares(report_id);
    CREATE INDEX IF NOT EXISTS idx_report_shares_recipient ON "${schema}".report_shares(recipient_id, recipient_type);
  `);
}
