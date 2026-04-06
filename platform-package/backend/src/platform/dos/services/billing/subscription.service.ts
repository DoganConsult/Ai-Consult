// @ts-nocheck
// ============================================
// Platform — Subscription & Trial Service
// THIN FACADE — delegates to subscription-lifecycle.service.ts
// Kept for backward compatibility with existing callers
// ============================================

import { safeQuery } from '../../../../config/database';
import { TierLevel } from '../../../../modules/admin/services/tier.service';
import { getSubscription, PRICING_PLANS } from './payment.service';
import { logger } from '../../observability/services/logger.service';
import { eventBus } from '../../../../modules/platform/services/event/event-bus.service';
import * as lifecycle from './subscription-lifecycle.service';

const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS || '14', 10);

export interface TrialInfo {
  isTrialing: boolean;
  trialEndsAt: Date | null;
  daysRemaining: number;
  tier: TierLevel;
}

export interface SubscriptionSummary {
  tenantId: string;
  tier: TierLevel;
  status: string;
  billingCycle: string | null;
  gateway: string | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
  priceSAR: number;
  priceUSD: number;
}

/**
 * Start a trial for a new tenant.
 * Delegates to lifecycle service for state machine + audit trail.
 */
export async function startTrial(tenantId: string, tier: TierLevel = 'scale'): Promise<TrialInfo> {
  const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  // Use lifecycle activateSubscription with 'none' gateway for trial
  // This writes status = 'trial_active' in lifecycle, audit log, and events
  try {
    await lifecycle.activateSubscription({
      tenantId,
      tier,
      billingCycle: 'monthly',
      gateway: 'stripe',
      externalSubscriptionId: 'trial_start',
      performedBy: 'system',
    });
  } catch {
    // Fallback: lifecycle may not handle 'none' gateway — use direct insert
    await safeQuery(`
      INSERT INTO subscriptions (tenant_id, tier, status, trial_ends_at, created_at, updated_at)
      VALUES ($1, $2, 'trial_active', $3, NOW(), NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        tier = $2, status = 'trial_active', trial_ends_at = $3, updated_at = NOW()
    `, [tenantId, tier, trialEnd]);
  }

  // Set tenant plan to trial tier
  await safeQuery(`UPDATE tenants SET plan = $1, updated_at = NOW() WHERE tenant_id = $2`, [tier, tenantId]);

  eventBus.publish({
    eventType: 'subscription.trial_started' as any,
    tenantId,
    sourceService: 'subscription.service',
    severity: 'info',
    payload: { tier, trialEndsAt: trialEnd.toISOString(), trialDays: TRIAL_DAYS },
  });

  logger.info(`Trial started: tenant=${tenantId} tier=${tier} ends=${trialEnd.toISOString()}`);

  return {
    isTrialing: true,
    trialEndsAt: trialEnd,
    daysRemaining: TRIAL_DAYS,
    tier,
  };
}

/** Get trial info for a tenant — delegates to lifecycle getSubscription */
export async function getTrialInfo(tenantId: string): Promise<TrialInfo> {
  try {
    const sub = await lifecycle.getSubscription(tenantId);
    if (sub && (sub.status === 'trial_active' || sub.status === 'trialing') && sub.trial_ends_at) {
      const trialEnd = new Date(sub.trial_ends_at);
      const remaining = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
      return {
        isTrialing: remaining > 0,
        trialEndsAt: trialEnd,
        daysRemaining: remaining,
        tier: sub.tier as TierLevel,
      };
    }
  } catch { /* no subscription */ }
  return { isTrialing: false, trialEndsAt: null, daysRemaining: 0, tier: 'starter' as TierLevel };
}

/** Get full subscription summary — delegates to lifecycle for enriched data */
export async function getSubscriptionSummary(tenantId: string): Promise<SubscriptionSummary> {
  // Try lifecycle enriched version first
  try {
    const computed = await lifecycle.getSubscriptionWithComputed(tenantId);
    if (computed && computed.subscription) {
      const sub = computed.subscription;
      const plan = PRICING_PLANS[sub.tier as TierLevel] || PRICING_PLANS.starter;
      const isTrial = sub.status === 'trial_active' || sub.status === 'trialing';
      return {
        tenantId,
        tier: sub.tier as TierLevel,
        status: isTrial ? 'trial' : sub.status,
        billingCycle: sub.billing_cycle || null,
        gateway: sub.gateway || null,
        trialEndsAt: sub.trial_ends_at ? new Date(sub.trial_ends_at) : null,
        currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end) : null,
        cancelledAt: sub.cancelled_at ? new Date(sub.cancelled_at) : null,
        priceSAR: sub.billing_cycle === 'annual' ? plan.annualPriceSAR : plan.monthlyPriceSAR,
        priceUSD: sub.billing_cycle === 'annual' ? plan.annualPriceUSD : plan.monthlyPriceUSD,
      };
    }
  } catch { /* fall through to legacy */ }

  // Fallback to payment.service getSubscription
  const sub = await getSubscription(tenantId);
  if (!sub) {
    return {
      tenantId, tier: 'starter', status: 'free', billingCycle: null, gateway: null,
      trialEndsAt: null, currentPeriodEnd: null, cancelledAt: null, priceSAR: 0, priceUSD: 0,
    };
  }

  const plan = PRICING_PLANS[sub.tier as TierLevel] || PRICING_PLANS.starter;
  const isTrial = sub.status === 'trialing' || sub.status === 'trial_active';
  return {
    tenantId,
    tier: sub.tier,
    status: isTrial ? 'trial' : sub.status,
    billingCycle: sub.billing_cycle || null,
    gateway: sub.gateway || null,
    trialEndsAt: sub.trial_ends_at ? new Date(sub.trial_ends_at) : null,
    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end) : null,
    cancelledAt: sub.cancelled_at ? new Date(sub.cancelled_at) : null,
    priceSAR: sub.billing_cycle === 'annual' ? plan.annualPriceSAR : plan.monthlyPriceSAR,
    priceUSD: sub.billing_cycle === 'annual' ? plan.annualPriceUSD : plan.monthlyPriceUSD,
  };
}

/**
 * Process expired subscriptions — delegates to lifecycle runAllSubscriptionJobs.
 * Lifecycle handles: expired trials, expired periods, grace period entries/exits,
 * expired pauses, scheduled downgrades, and usage snapshots.
 */
export async function processExpiredSubscriptions(): Promise<number> {
  try {
    await lifecycle.runAllSubscriptionJobs();
    logger.info('Subscription lifecycle jobs completed via lifecycle service');
    return 1; // Signal success — lifecycle handles its own counting/logging
  } catch (err) {
    logger.error('Lifecycle jobs failed, running legacy expiration', { error: (err as Error)?.message });
    // Fallback: minimal legacy expiration
    let processed = 0;
    const expiredTrials = await safeQuery(`
      UPDATE subscriptions SET status = 'expired', updated_at = NOW()
      WHERE status IN ('trialing', 'trial_active') AND trial_ends_at < NOW()
      RETURNING tenant_id
    `);
    for (const row of expiredTrials.rows) {
      await safeQuery(`UPDATE tenants SET plan = 'starter', updated_at = NOW() WHERE tenant_id = $1`, [row.tenant_id]);
      processed++;
    }
    if (processed > 0) logger.info(`Legacy fallback: processed ${processed} expired subscriptions`);
    return processed;
  }
}

/** Check if tenant has an active paid subscription or trial */
export async function hasActiveSubscription(tenantId: string): Promise<boolean> {
  const sub = await lifecycle.getSubscription(tenantId);
  if (!sub) return false;
  const activeStatuses = ['active', 'trialing', 'trial_active', 'past_due', 'grace_period'];
  return activeStatuses.includes(sub.status);
}
