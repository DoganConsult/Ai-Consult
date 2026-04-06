/**
 * Subscription Degradation Service
 *
 * Computes the degradation profile (read/write permissions, warnings)
 * for a given subscription status. Used by the entitlements resolver
 * and lifecycle-gate middleware.
 */

import { SubscriptionDegradation } from '../subscription-lifecycle.types';

// ─── Degradation Logic ───────────────────────────────────────

/**
 * Computed degradation profile. Includes all required fields from
 * SubscriptionDegradation; id/tenant_id/tier/timestamps are set to
 * placeholder values (callers enrich with real data when persisting).
 */
export function computeDegradation(status: string): SubscriptionDegradation {
  const base = {
    id: '',
    tenant_id: '',
    tier: 'starter' as const,
    started_at: new Date().toISOString(),
    resolved_at: null,
  };

  switch (status) {
    case 'active':
    case 'trial_active':
    case 'trialing':
    case 'preview':
      return { ...base, active: false, degradation_type: 'grace_period', reason: '', mode: 'read_only', allowedRead: true, allowedWrite: true, allowedAdminBillingOnly: false, warnings: [] };
    case 'renewal_due':
      return { ...base, active: false, degradation_type: 'grace_period', reason: 'Renewal due soon', mode: 'read_only', allowedRead: true, allowedWrite: true, allowedAdminBillingOnly: false, warnings: ['Subscription renewal is due soon'] };
    case 'past_due':
      return { ...base, active: true, degradation_type: 'past_due', reason: 'Payment past due', mode: 'billing_only', allowedRead: true, allowedWrite: true, allowedAdminBillingOnly: false, warnings: ['Payment is past due — please update billing'] };
    case 'grace_period':
      return { ...base, active: true, degradation_type: 'grace_period', reason: 'Grace period active', mode: 'admin_only', allowedRead: true, allowedWrite: false, allowedAdminBillingOnly: false, warnings: ['Grace period active — restricted writes', 'User/framework creation blocked'] };
    case 'paused':
      return { ...base, active: true, degradation_type: 'grace_period', reason: 'Subscription paused', mode: 'read_only', allowedRead: true, allowedWrite: false, allowedAdminBillingOnly: false, warnings: ['Subscription is paused — read-only mode'] };
    case 'expired':
    case 'trial_expired':
      return { ...base, active: true, degradation_type: 'expired', reason: 'Subscription expired', mode: 'billing_only', allowedRead: true, allowedWrite: false, allowedAdminBillingOnly: true, warnings: ['Subscription expired — renew to restore access'] };
    case 'cancelled':
      return { ...base, active: true, degradation_type: 'expired', reason: 'Subscription cancelled', mode: 'billing_only', allowedRead: true, allowedWrite: false, allowedAdminBillingOnly: true, warnings: ['Subscription cancelled — resubscribe to continue'] };
    case 'suspended':
      return { ...base, active: true, degradation_type: 'suspended', reason: 'Account suspended', mode: 'full_lockout', allowedRead: false, allowedWrite: false, allowedAdminBillingOnly: true, warnings: ['Account suspended — contact support'] };
    default:
      return { ...base, active: false, degradation_type: 'grace_period', reason: '', mode: 'read_only', allowedRead: true, allowedWrite: true, allowedAdminBillingOnly: false, warnings: [] };
  }
}
