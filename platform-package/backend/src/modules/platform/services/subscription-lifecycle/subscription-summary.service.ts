// @ts-nocheck
/**
 * Subscription Summary Service
 *
 * Computes enriched subscription summaries with days remaining,
 * degradation state, warnings, and full lifecycle state including
 * usage data.
 */

import {
  TierLevel,
  Subscription,
  SubscriptionDegradation,
  LifecycleState,
} from '../subscription-lifecycle.types';
import { getSubscription } from './subscription-helpers.service';
import { computeDegradation } from './subscription-degradation.service';

// ─── Computed summary (richer than the canonical SubscriptionSummaryResponse) ─

export interface ComputedSubscriptionSummary {
  subscription: Subscription;
  daysRemaining: number;
  isInGracePeriod: boolean;
  isTrialActive: boolean;
  canUpgrade: boolean;
  canDowngrade: boolean;
  pendingDowngrade: { tier: TierLevel; effectiveAt: string } | null;
  isPaused: boolean;
  renewalMode: 'auto' | 'manual';
  degradation: SubscriptionDegradation;
  warnings: string[];
}

// ─── Summary / Lifecycle State ───────────────────────────────

export async function getSubscriptionWithComputed(tenantId: string): Promise<ComputedSubscriptionSummary | null> {
  const sub = await getSubscription(tenantId);
  if (!sub) return null;

  const now = new Date();
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
  const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null;
  const graceEnd = (sub as Record<string, unknown>).grace_ends_at ? new Date((sub as Record<string, unknown>).grace_ends_at) : null;
  const status = sub.status as string;

  let daysRemaining = 0;
  if (status === 'trial_active' || status === 'trialing') {
    daysRemaining = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000)) : 0;
  } else if (status === 'grace_period') {
    daysRemaining = graceEnd ? Math.max(0, Math.ceil((graceEnd.getTime() - now.getTime()) / 86400000)) : 0;
  } else if (periodEnd) {
    daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / 86400000));
  }

  const tierOrder: Record<string, number> = { starter: 1, scale: 2, continuous: 3 };
  const currentTierRank = tierOrder[sub.tier] || 0;

  const degradation = computeDegradation(status);

  const warnings: string[] = [...degradation.warnings];
  if (daysRemaining <= 7 && daysRemaining > 0 && (status === 'active' || status === 'renewal_due')) {
    warnings.push(`Subscription expires in ${daysRemaining} day(s)`);
  }
  if (sub.downgrade_scheduled_tier) {
    warnings.push(`Downgrade to ${sub.downgrade_scheduled_tier} scheduled`);
  }

  return {
    subscription: sub as Subscription,
    daysRemaining,
    isInGracePeriod: status === 'grace_period',
    isTrialActive: status === 'trial_active' || status === 'trialing',
    canUpgrade: currentTierRank < 3,
    canDowngrade: currentTierRank > 1 && status === 'active',
    pendingDowngrade: sub.downgrade_scheduled_tier
      ? { tier: sub.downgrade_scheduled_tier as TierLevel, effectiveAt: (sub as Record<string, unknown>).downgrade_scheduled_at || '' }
      : null,
    isPaused: status === 'paused',
    renewalMode: (sub.renewal_mode || 'auto') as 'auto' | 'manual',
    degradation,
    warnings,
  };
}

/**
 * Returns a string lifecycle state label derived from subscription status.
 */
export async function getLifecycleState(tenantId: string): Promise<LifecycleState | null> {
  const summary = await getSubscriptionWithComputed(tenantId);
  if (!summary) return null;

  const status = summary.subscription.status as string;

  // Map subscription status to lifecycle state
  if (status === 'trial_active' || status === 'trialing') return 'trial';
  if (status === 'active') return 'active';
  if (status === 'grace_period') return 'grace';
  if (status === 'suspended') return 'suspended';
  if (status === 'cancelled' || status === 'expired') return 'terminated';
  if (status === 'pending') return 'provisioning';

  return 'active';
}
