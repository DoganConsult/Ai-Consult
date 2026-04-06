/**
 * Operational job definitions barrel.
 * Aggregates all category-specific operational job files into a single array.
 *
 * Categories:
 *   - analytics:       KPI aggregation, materialized view refresh, metric anomaly detection
 *   - compliance:      CCM worker, regulatory delta/change, qiyas, evidence quality, regulatory deadlines
 *   - security:        Break-glass expiry, retired write guard, SoD detection, insider threat
 *   - subscriptions:   Trial lifecycle, subscription reminders/grace/usage/scheduled changes
 *   - provisioning:    Autonomous step processor, provisioning health, post-provisioning warmup
 *   - training:        Overdue checks, expiring certs, deadline reminders
 *   - workflow:        Auto-task, auto-eval, stall recovery, stale task detection
 *   - governance:      Autonomy review, maturity auto-assessment
 *   - access-control:  Quarterly campaign, auto-revoke
 *   - other:           Connector health, engagement OS, email inbox, report scheduling,
 *                      personal agent SLA, module lifecycle monitor
 */
import { JobDefinition } from '../misc/job-types';
import { getAnalyticsOperationalJobs } from './operational-analytics-jobs';
import { getComplianceOperationalJobs } from './operational-compliance-jobs';
import { getSecurityOperationalJobs } from './operational-security-jobs';
import { getSubscriptionOperationalJobs } from './operational-subscription-jobs';
import { getProvisioningOperationalJobs } from './operational-provisioning-jobs';
import { getTrainingOperationalJobs } from './operational-training-jobs';
import { getWorkflowOperationalJobs } from './operational-workflow-jobs';
import { getGovernanceOperationalJobs } from './operational-governance-jobs';
import { getAccessControlOperationalJobs } from './operational-access-control-jobs';
import { getOtherOperationalJobs } from './operational-other-jobs';

/**
 * Returns all operational job definitions by aggregating every category.
 * Preserves the same export signature as the original monolithic file.
 */
export async function getOperationalJobs(): Promise<JobDefinition[]> {
  const [
    analytics,
    compliance,
    security,
    subscriptions,
    provisioning,
    training,
    workflow,
    governance,
    accessControl,
    other,
  ] = await Promise.all([
    getAnalyticsOperationalJobs(),
    getComplianceOperationalJobs(),
    getSecurityOperationalJobs(),
    getSubscriptionOperationalJobs(),
    getProvisioningOperationalJobs(),
    getTrainingOperationalJobs(),
    getWorkflowOperationalJobs(),
    getGovernanceOperationalJobs(),
    getAccessControlOperationalJobs(),
    getOtherOperationalJobs(),
  ]);

  return [
    ...analytics,
    ...compliance,
    ...security,
    ...subscriptions,
    ...provisioning,
    ...training,
    ...workflow,
    ...governance,
    ...accessControl,
    ...other,
  ];
}
