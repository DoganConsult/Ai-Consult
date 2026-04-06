/**
 * Job Definitions Registry — Central catalog of all scheduled background jobs.
 *
 * Each definition includes the job code, display name, cron schedule,
 * owning module, and enabled status. Used by the admin dashboard
 * to display and manage scheduled jobs.
 */

export interface JobDefinition {
  jobCode: string;
  name: string;
  schedule: string;
  module: string;
  enabled: boolean;
}

const JOB_REGISTRY: JobDefinition[] = [
  // --- Evidence & Compliance ---
  {
    jobCode: 'evidence_staleness_check',
    name: 'Evidence Staleness Check',
    schedule: '0 6 * * *',       // Daily 6am
    module: 'evidence',
    enabled: true,
  },
  {
    jobCode: 'compliance_posture_assessment',
    name: 'Compliance Posture Assessment',
    schedule: '0 2 * * 0',       // Weekly Sunday 2am
    module: 'compliance',
    enabled: true,
  },

  // --- Risk ---
  {
    jobCode: 'risk_score_recalculation',
    name: 'Risk Score Recalculation',
    schedule: '0 3 * * *',       // Daily 3am
    module: 'risk',
    enabled: true,
  },

  // --- Policy ---
  {
    jobCode: 'policy_expiry_check',
    name: 'Policy Expiry Check',
    schedule: '0 7 * * 1',       // Weekly Monday 7am
    module: 'policy',
    enabled: true,
  },

  // --- Audit ---
  {
    jobCode: 'audit_finding_followup',
    name: 'Audit Finding Follow-up',
    schedule: '0 8 * * *',       // Daily 8am
    module: 'audit',
    enabled: true,
  },
  {
    jobCode: 'merkle_witness',
    name: 'Daily Merkle Witness',
    schedule: '0 23 * * *',      // Daily 11pm
    module: 'audit',
    enabled: true,
  },

  // --- GRC Engine ---
  {
    jobCode: 'autonomous_grc_scan',
    name: 'Autonomous GRC Scan',
    schedule: '0 4 * * *',       // Daily 4am
    module: 'platform',
    enabled: true,
  },
  {
    jobCode: 'benchmark_aggregation',
    name: 'Benchmark Aggregation',
    schedule: '0 5 * * 0',       // Weekly Sunday 5am
    module: 'platform',
    enabled: true,
  },

  // --- AGRC / AI ---
  {
    jobCode: 'agrc_os_integration_sync',
    name: 'AGRC-OS Integration Sync',
    schedule: '*/15 * * * *',    // Every 15 minutes
    module: 'agrc',
    enabled: true,
  },
  {
    jobCode: 'personal_agent_sla_check',
    name: 'Personal Agent SLA Check',
    schedule: '*/10 * * * *',    // Every 10 minutes
    module: 'agrc',
    enabled: true,
  },

  // --- Email ---
  {
    jobCode: 'email_inbox_poll',
    name: 'Email Inbox Poll',
    schedule: '*/5 * * * *',     // Every 5 minutes
    module: 'email',
    enabled: true,
  },
  {
    jobCode: 'email_digest_send',
    name: 'Email Digest Send',
    schedule: '0 8 * * 1-5',    // Weekdays 8am
    module: 'email',
    enabled: true,
  },

  // --- Module Health ---
  {
    jobCode: 'module_health_check',
    name: 'Module Health Check',
    schedule: '0 */4 * * *',     // Every 4 hours
    module: 'platform',
    enabled: true,
  },
  {
    jobCode: 'module_certification',
    name: 'Module Certification',
    schedule: '0 1 * * 0',       // Weekly Sunday 1am
    module: 'platform',
    enabled: true,
  },

  // --- Tenant ---
  {
    jobCode: 'maturity_assessment',
    name: 'Maturity Assessment',
    schedule: '0 3 1 * *',       // Monthly 1st at 3am
    module: 'platform',
    enabled: true,
  },
  {
    jobCode: 'tenant_schema_sync',
    name: 'Tenant Schema Sync',
    schedule: '0 2 * * *',       // Daily 2am
    module: 'platform',
    enabled: true,
  },

  // --- Vendor ---
  {
    jobCode: 'vendor_risk_review',
    name: 'Vendor Risk Review',
    schedule: '0 6 1 */3 *',    // Quarterly 1st at 6am
    module: 'vendor',
    enabled: true,
  },

  // --- Escalation ---
  {
    jobCode: 'sla_escalation',
    name: 'SLA Escalation Check',
    schedule: '*/30 * * * *',    // Every 30 minutes
    module: 'platform',
    enabled: true,
  },

  // --- Subscription ---
  {
    jobCode: 'subscription_renewal_check',
    name: 'Subscription Renewal Check',
    schedule: '0 0 * * *',       // Daily midnight
    module: 'platform',
    enabled: true,
  },

  // --- AI / Copilot ---
  {
    jobCode: 'copilot-auto-executor',
    name: 'Copilot Auto Executor',
    schedule: '* * * * *',        // Every minute
    module: 'ai',
    enabled: true,
  },

  // --- Qiyas GRC ---
  {
    jobCode: 'qiyas-grc-automation',
    name: 'Qiyas GRC Automation',
    schedule: '*/5 * * * *',      // Every 5 minutes
    module: 'qiyas',
    enabled: true,
  },
];

/**
 * Returns the full registry of scheduled job definitions.
 */
export function getAllJobDefinitions(): JobDefinition[] {
  return [...JOB_REGISTRY];
}
