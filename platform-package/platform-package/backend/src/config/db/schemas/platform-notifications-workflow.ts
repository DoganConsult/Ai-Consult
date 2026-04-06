// ============================================
// Platform Schema — Notifications, Workflow & Analytics
// Notifications, invitations, external user scopes,
// evidence enhancements, approvals, workflow templates,
// automation rules/log, DLQ, evidence schedules,
// KPI snapshots, dashboard configs, copilot sessions.
// ============================================

import { query } from '../query';

export async function createNotificationWorkflowTables(schema: string): Promise<void> {
  // === Notification system tables ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".notifications (
      notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(64) NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT,
      link VARCHAR(500),
      read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // === Invitation & external stakeholder tables ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".invitations (
      invitation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      entity_scope JSONB NOT NULL DEFAULT '{}',
      token_hash VARCHAR(128) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_by VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      accepted_at TIMESTAMPTZ
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token_hash ON "${schema}".invitations(token_hash);
    CREATE INDEX IF NOT EXISTS idx_invitations_email ON "${schema}".invitations(email);
    CREATE INDEX IF NOT EXISTS idx_invitations_status ON "${schema}".invitations(status);

    CREATE TABLE IF NOT EXISTS "${schema}".external_user_scopes (
      scope_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(64) NOT NULL,
      role VARCHAR(50) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(100) NOT NULL,
      permissions JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ext_user_scopes_user ON "${schema}".external_user_scopes(user_id);
  `);

  // === Evidence management enhancements ===
  await query(`
    ALTER TABLE "${schema}".evidence ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;
    ALTER TABLE "${schema}".evidence ADD COLUMN IF NOT EXISTS previous_version_id UUID;
    ALTER TABLE "${schema}".evidence ADD COLUMN IF NOT EXISTS expiry_date DATE;
    ALTER TABLE "${schema}".evidence ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
  `);

  // === Workflow engine enhancements (approvals + templates) ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".approvals (
      approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      execution_id UUID,
      step_id VARCHAR(100) NOT NULL,
      approver_id VARCHAR(64) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      sla_deadline TIMESTAMPTZ,
      escalation_chain JSONB DEFAULT '[]',
      decision_comment TEXT,
      decided_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".workflow_templates (
      template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      definition JSONB NOT NULL,
      parameters_schema JSONB DEFAULT '{}',
      created_by VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // === Automation rules engine ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".automation_rules (
      rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      module VARCHAR(50) NOT NULL,
      event VARCHAR(50) NOT NULL,
      conditions JSONB DEFAULT '{}',
      actions JSONB NOT NULL DEFAULT '[]',
      enabled BOOLEAN DEFAULT TRUE,
      lifecycle_phase VARCHAR(20),
      priority INT DEFAULT 0,
      created_by VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".automation_log (
      log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rule_id UUID REFERENCES "${schema}".automation_rules(rule_id),
      event VARCHAR(100) NOT NULL,
      module VARCHAR(50) NOT NULL,
      entity_type VARCHAR(50),
      entity_id VARCHAR(100),
      actions_executed JSONB DEFAULT '[]',
      status VARCHAR(20) DEFAULT 'success',
      error TEXT,
      triggered_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".agrc_event_dlq (
      dlq_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID,
      event_type VARCHAR(60) NOT NULL,
      handler_name VARCHAR(100) NOT NULL,
      error_message TEXT,
      payload JSONB DEFAULT '{}',
      retry_count INT DEFAULT 0,
      max_retries INT DEFAULT 3,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_retry_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_dlq_status ON "${schema}".agrc_event_dlq (status, created_at);
    CREATE INDEX IF NOT EXISTS idx_dlq_event_type ON "${schema}".agrc_event_dlq (event_type, created_at DESC);
  `);

  // === Evidence schedule tables ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".evidence_schedules (
      schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      control_id VARCHAR(100) NOT NULL,
      cron_expression VARCHAR(100) NOT NULL,
      reminder_text VARCHAR(500),
      assigned_to VARCHAR(64),
      enabled BOOLEAN DEFAULT TRUE,
      last_reminded_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT ux_evidence_schedules_control UNIQUE (control_id)
    );
  `);

  // === Analytics and dashboard tables ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".kpi_snapshots (
      snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_date DATE NOT NULL,
      compliance_score DECIMAL(5,2),
      risk_score DECIMAL(5,2),
      evidence_coverage DECIMAL(5,2),
      remediation_closure_rate DECIMAL(5,2),
      raw_data JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".dashboard_configs (
      config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(64) NOT NULL,
      config JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // === Copilot session tables ===
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".copilot_sessions (
      session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(64) NOT NULL,
      messages JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}
