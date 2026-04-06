// ============================================
// Shahin GRC — Workspace Health Workers (barrel)
// Re-exports all types, scheduler, and workers.
// Provides createWorkspaceHealthScheduler() factory
// for backward-compatible initialization.
// ============================================

import { WorkerScheduler } from './worker-scheduler';
import {
  controlHealthMonitor,
  evidenceFreshnessMonitor,
  compliancePostureCalculator,
  ccmEngineCycle,
} from './health-compliance.workers';
import {
  riskScoreRecalculator,
  slaBreachDetector,
  auditScheduleMonitor,
  policyReviewDebtCalculator,
} from './health-risk-ops.workers';
import {
  dataIntegrityChecker,
  workspaceProfileRefresher,
} from './health-data.workers';

// ---------------------------------------------------------------------------
// Re-exports — ensures zero breaking changes for existing importers
// ---------------------------------------------------------------------------

export type {
  WorkerConfig,
  TenantInfo,
  WorkerRunSummary,
  WorkerStatus,
} from './workspace-health-types';

export { WorkerScheduler } from './worker-scheduler';
export { forEachTenant, createNotification } from './worker-scheduler';

export {
  controlHealthMonitor,
  evidenceFreshnessMonitor,
  compliancePostureCalculator,
  ccmEngineCycle,
} from './health-compliance.workers';

export {
  riskScoreRecalculator,
  slaBreachDetector,
  auditScheduleMonitor,
  policyReviewDebtCalculator,
} from './health-risk-ops.workers';

export {
  dataIntegrityChecker,
  workspaceProfileRefresher,
} from './health-data.workers';

// ===========================================================================
// Factory: create and configure the scheduler with all 10 workers
// ===========================================================================

export function createWorkspaceHealthScheduler(): WorkerScheduler {
  const scheduler = new WorkerScheduler();

  scheduler.register({
    name: 'control-health-monitor',
    description: 'Checks for overdue control tests, failed tests without remediation, and approaching SLA deadlines',
    intervalMs: 6 * 60 * 60 * 1000, // 6 hours
    enabled: true,
    handler: controlHealthMonitor,
  });

  scheduler.register({
    name: 'evidence-freshness-monitor',
    description: 'Checks for overdue evidence tasks and stale evidence that needs refreshing',
    intervalMs: 12 * 60 * 60 * 1000, // 12 hours
    enabled: true,
    handler: evidenceFreshnessMonitor,
  });

  scheduler.register({
    name: 'policy-review-debt-calculator',
    description: 'Calculates policy review debt score per tenant for the policy-review-debt widget',
    intervalMs: 24 * 60 * 60 * 1000, // daily
    enabled: true,
    handler: policyReviewDebtCalculator,
  });

  scheduler.register({
    name: 'risk-score-recalculator',
    description: 'Recalculates inherent and residual risk scores and detects anomalies',
    intervalMs: 4 * 60 * 60 * 1000, // 4 hours
    enabled: true,
    handler: riskScoreRecalculator,
  });

  scheduler.register({
    name: 'compliance-posture-calculator',
    description: 'Calculates overall compliance percentage per framework and detects drift',
    intervalMs: 6 * 60 * 60 * 1000, // 6 hours
    enabled: true,
    handler: compliancePostureCalculator,
  });

  scheduler.register({
    name: 'sla-breach-detector',
    description: 'Detects SLA breaches on action items, evidence tasks, and remediation tasks',
    intervalMs: 1 * 60 * 60 * 1000, // 1 hour
    enabled: true,
    handler: slaBreachDetector,
  });

  scheduler.register({
    name: 'data-integrity-checker',
    description: 'Checks for orphaned records, schema consistency, and auto-fixes simple data issues',
    intervalMs: 24 * 60 * 60 * 1000, // daily
    enabled: true,
    handler: dataIntegrityChecker,
  });

  scheduler.register({
    name: 'workspace-profile-refresher',
    description: 'Recalculates workspace statistics and checks plan limits',
    intervalMs: 12 * 60 * 60 * 1000, // 12 hours
    enabled: true,
    handler: workspaceProfileRefresher,
  });

  scheduler.register({
    name: 'audit-schedule-monitor',
    description: 'Sends reminders for upcoming audits and auto-creates preparation tasks',
    intervalMs: 24 * 60 * 60 * 1000, // daily
    enabled: true,
    handler: auditScheduleMonitor,
  });

  scheduler.register({
    name: 'ccm-engine-cycle',
    description: 'Continuous Compliance Monitoring — runs automated checks for active controls',
    intervalMs: 4 * 60 * 60 * 1000, // 4 hours
    enabled: true,
    handler: ccmEngineCycle,
  });

  return scheduler;
}