/**
 * Subscription Lifecycle — Barrel Re-export
 *
 * Preserves the original public API surface so that all existing
 * consumers (`import * as lifecycle from './index'`)
 * continue to work without changes.
 */

// Helpers (shared constants + lookup)
export { getSubscription } from './subscription-helpers.service';

// Audit
export { writeAuditLog, getAuditLog } from './subscription-audit.service';

// Degradation
export { computeDegradation } from './subscription-degradation.service';

// Core lifecycle operations
export {
  activateSubscription,
  transitionStatus,
  pauseSubscription,
  resumeSubscription,
  extendTrial,
  scheduleDowngrade,
  cancelScheduledDowngrade,
  executeScheduledDowngrades,
  cancelSubscription,
  renewSubscription,
  setRenewalMode,
} from './subscription-core.service';

// Renewal failure + reminders
export {
  handleRenewalFailure,
  markRenewed,
  checkAndSendRenewalReminders,
} from './subscription-renewal.service';

// Extension workflow + change requests
export {
  requestExtension,
  approveExtension,
  rejectExtension,
  applyExtension,
  getExtensions,
  createChangeRequest,
} from './subscription-extensions.service';

// Admin: usage limits, overview, overrides
export {
  checkUsageLimits,
  getAdminSubscriptionOverview,
  overrideStatus,
  overrideTier,
} from './subscription-admin.service';

// Batch processing (cron jobs)
export {
  processExpiredTrials,
  processExpiredPeriods,
  processGracePeriodEntries,
  processGracePeriodExpirations,
  processExpiredPauses,
  captureUsageSnapshot,
  runAllSubscriptionJobs,
} from './subscription-batch.service';

// Summary / lifecycle state
export {
  getSubscriptionWithComputed,
  getLifecycleState,
} from './subscription-summary.service';
