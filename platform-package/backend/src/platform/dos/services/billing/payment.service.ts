// @ts-nocheck
// ============================================
// Shahin — Payment Service
// Dual-gateway: Stripe (international) + Moyasar (KSA local: mada, SADAD, Apple Pay)
// ============================================

import Stripe from 'stripe';
import { safeQuery } from '../../../../config/database';
import { TierLevel, TIER_DEFINITIONS } from '../../../../modules/admin/services/tier.service';
import { logger } from '../../observability/services/logger.service';
import { eventBus } from '../../../../modules/platform/services/event/event-bus.service';
import * as lifecycle from './subscription-lifecycle.service';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { getFirstRow } from '../../../../utils/db-utils';
import { SYSTEM_JOB_ACTOR } from '../../constants/system-actors';

// ── Stripe instance ──
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET, { apiVersion: '2025-05-28.basil' as any }) : null;

if (!stripe) {
  logger.warn('[Payment] STRIPE_SECRET_KEY not set — Stripe payments disabled');
}

// ── Moyasar config ──
const MOYASAR_API_KEY = process.env.MOYASAR_API_KEY || '';
const MOYASAR_BASE_URL = 'https://api.moyasar.com/v1';

if (!MOYASAR_API_KEY) {
  logger.warn('[Payment] MOYASAR_API_KEY not set — Moyasar payments disabled');
}

// ── Pricing ──
export interface PricingPlan {
  tier: TierLevel;
  nameEn: string;
  nameAr: string;
  monthlyPriceSAR: number;
  annualPriceSAR: number;        // total annual (discount applied)
  monthlyPriceUSD: number;
  annualPriceUSD: number;
  stripePriceIdMonthly: string;  // set from env
  stripePriceIdAnnual: string;
  features: string[];
  maxUsers: number;
  maxFrameworks: number;
  popular?: boolean;
}

export const PRICING_PLANS: Record<TierLevel, PricingPlan> = {
  starter: {
    tier: 'starter',
    nameEn: 'Starter',
    nameAr: 'أساسي',
    monthlyPriceSAR: 2499,
    annualPriceSAR: 24990,       // 2 months free
    monthlyPriceUSD: 667,
    annualPriceUSD: 6670,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    stripePriceIdAnnual: process.env.STRIPE_PRICE_STARTER_ANNUAL || '',
    features: TIER_DEFINITIONS.starter.features,
    maxUsers: TIER_DEFINITIONS.starter.maxUsers,
    maxFrameworks: TIER_DEFINITIONS.starter.maxFrameworks,
  },
  scale: {
    tier: 'scale',
    nameEn: 'Scale',
    nameAr: 'متقدّم',
    monthlyPriceSAR: 7499,
    annualPriceSAR: 74990,
    monthlyPriceUSD: 2000,
    annualPriceUSD: 20000,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_SCALE_MONTHLY || '',
    stripePriceIdAnnual: process.env.STRIPE_PRICE_SCALE_ANNUAL || '',
    features: TIER_DEFINITIONS.scale.features,
    maxUsers: TIER_DEFINITIONS.scale.maxUsers,
    maxFrameworks: TIER_DEFINITIONS.scale.maxFrameworks,
    popular: true,
  },
  continuous: {
    tier: 'continuous',
    nameEn: 'Continuous',
    nameAr: 'مستمر',
    monthlyPriceSAR: 14999,
    annualPriceSAR: 149990,
    monthlyPriceUSD: 4000,
    annualPriceUSD: 40000,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_CONTINUOUS_MONTHLY || '',
    stripePriceIdAnnual: process.env.STRIPE_PRICE_CONTINUOUS_ANNUAL || '',
    features: TIER_DEFINITIONS.continuous.features,
    maxUsers: TIER_DEFINITIONS.continuous.maxUsers,
    maxFrameworks: TIER_DEFINITIONS.continuous.maxFrameworks,
  },
};

export type BillingCycle = 'monthly' | 'annual';
export type PaymentGateway = 'stripe' | 'moyasar';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded' | 'cancelled';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';

// ── Public API ──

/** Get all pricing plans */
export function getPricingPlans(): PricingPlan[] {
  return Object.values(PRICING_PLANS);
}

/** Create Stripe Checkout Session (international cards, Apple Pay, Google Pay) */
export async function createStripeSession(opts: {
  tenantId: string;
  tier: TierLevel;
  cycle: BillingCycle;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; url: string }> {
  if (!stripe) throw new Error('Stripe not configured');

  const plan = PRICING_PLANS[opts.tier];
  const priceId = opts.cycle === 'monthly' ? plan.stripePriceIdMonthly : plan.stripePriceIdAnnual;

  // Find or create Stripe customer
  let customerId = await getStripeCustomerId(opts.tenantId);
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: opts.customerEmail,
      metadata: { tenantId: opts.tenantId, tier: opts.tier },
    });
    customerId = customer.id;
    await saveStripeCustomerId(opts.tenantId, customerId);
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: { tenantId: opts.tenantId, tier: opts.tier, cycle: opts.cycle },
    subscription_data: {
      metadata: { tenantId: opts.tenantId, tier: opts.tier, cycle: opts.cycle },
    },
    allow_promotion_codes: true,
  };

  // If no Stripe price IDs configured, use ad-hoc pricing
  if (!priceId) {
    const unitAmount = opts.cycle === 'monthly' ? plan.monthlyPriceUSD * 100 : plan.annualPriceUSD * 100;
    sessionParams.line_items = [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Shahin GRC — ${plan.nameEn} (${opts.cycle})` },
        unit_amount: unitAmount,
        recurring: { interval: opts.cycle === 'monthly' ? 'month' : 'year' },
      },
      quantity: 1,
    }];
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  logger.info(`Stripe session created: ${session.id} for tenant ${opts.tenantId}`);

  return { sessionId: session.id, url: session.url! };
}

/** Create Moyasar payment (KSA local: mada, SADAD, Apple Pay, STC Pay) */
export async function createMoyasarPayment(opts: {
  tenantId: string;
  tier: TierLevel;
  cycle: BillingCycle;
  paymentMethod: 'mada' | 'visa' | 'mastercard' | 'applepay' | 'stcpay';
  customerName: string;
  customerEmail: string;
  callbackUrl: string;
}): Promise<{ paymentId: string; transactionUrl: string }> {
  if (!MOYASAR_API_KEY) throw new Error('Moyasar not configured');

  const plan = PRICING_PLANS[opts.tier];
  const amountHalala = opts.cycle === 'monthly'
    ? plan.monthlyPriceSAR * 100
    : plan.annualPriceSAR * 100;

  const payload = {
    amount: amountHalala,
    currency: 'SAR',
    description: `Shahin GRC — ${plan.nameEn} (${opts.cycle})`,
    callback_url: opts.callbackUrl,
    source: {
      type: opts.paymentMethod === 'applepay' ? 'applepay' :
            opts.paymentMethod === 'stcpay' ? 'stcpay' : 'creditcard',
      ...(opts.paymentMethod === 'mada' && { gateway_id: 'mada' }),
    },
    metadata: {
      tenant_id: opts.tenantId,
      tier: opts.tier,
      cycle: opts.cycle,
    },
  };

  const resp = await fetch(`${MOYASAR_BASE_URL}/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(MOYASAR_API_KEY + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const err = await resp.text();
    logger.error(`Moyasar payment failed: ${err}`);
    throw new Error(`Moyasar payment creation failed: ${resp.status}`);
  }

  const data = await resp.json() as { id: string; source?: { transaction_url?: string; redirect_url?: string } };
  logger.info(`Moyasar payment created: ${data.id} for tenant ${opts.tenantId}`);

  return {
    paymentId: data.id,
    transactionUrl: data.source?.transaction_url || data.source?.redirect_url || '',
  };
}

/** Handle Stripe webhook event */
export async function handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
  if (!stripe) throw new Error('Stripe not configured');

  const event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  logger.info(`Stripe webhook: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata || {};
      if (meta.tenantId && meta.tier) {
        await lifecycle.activateSubscription({
          tenantId: meta.tenantId,
          tier: meta.tier as TierLevel,
          billingCycle: (meta.cycle || 'monthly') as BillingCycle,
          gateway: 'stripe',
          externalSubscriptionId: `stripe_checkout_${session.id}`,
          stripeCustomerId: session.customer as string || undefined,
        });
        // Store Stripe subscription ID for future lookups
        if (session.subscription) {
          await safeQuery(
            `UPDATE public.subscriptions SET external_subscription_id = $1, updated_at = NOW() WHERE tenant_id = $2`,
            [session.subscription as string, meta.tenantId]
          );
        }
      }
      break;
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const sub = invoice.subscription as string;
      if (sub) {
        const tid = await getTenantIdByStripeSubscription(sub);
        if (tid) {
          const paidAmount = (invoice.amount_paid || 0) / 100;
          await recordPayment({
            tenantId: tid,
            gateway: 'stripe',
            externalId: invoice.id,
            amount: paidAmount,
            currency: invoice.currency?.toUpperCase() || 'USD',
            status: 'succeeded',
          });
          try {
            await lifecycle.markRenewed(tid, {
              paymentId: invoice.id,
              amount: paidAmount,
              currency: invoice.currency?.toUpperCase() || 'USD',
              gateway: 'stripe',
            });
          } catch (err: unknown) {
            logger.warn(`lifecycle.markRenewed failed for tenant ${tid}: ${toErrorMessage(err)}`);
          }
          eventBus.publish({
            eventType: 'subscription.payment_succeeded' as any,
            tenantId: tid,
            sourceService: 'payment.service',
            severity: 'info',
            payload: { gateway: 'stripe', invoiceId: invoice.id, amount: paidAmount },
          });
        }
      }
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const sub = invoice.subscription as string;
      if (sub) {
        const tenantId = await getTenantIdByStripeSubscription(sub);
        if (tenantId) {
          await lifecycle.transitionStatus({
            tenantId,
            toStatus: 'past_due',
            performedBy: 'system',
            reason: 'stripe_payment_failed',
          });
          await recordPayment({
            tenantId,
            gateway: 'stripe',
            externalId: invoice.id,
            amount: (invoice.amount_due || 0) / 100,
            currency: invoice.currency?.toUpperCase() || 'USD',
            status: 'failed',
          });
          eventBus.publish({
            eventType: 'subscription.payment_failed' as any,
            tenantId,
            sourceService: 'payment.service',
            severity: 'warning',
            payload: { gateway: 'stripe', invoiceId: invoice.id },
          });
        }
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const tenantId = sub.metadata?.tenantId;
      if (tenantId) await lifecycle.cancelSubscription(tenantId, 'stripe_subscription_deleted', 'system');
      break;
    }
    default:
      logger.info(`Unhandled Stripe event: ${event.type}`);
  }
}

/** Handle Moyasar callback/webhook */
export async function handleMoyasarCallback(paymentData: any): Promise<{ success: boolean; tenantId?: string }> {
  const { id, status, metadata } = paymentData;
  if (!metadata?.tenant_id) return { success: false };
  const tenantId = metadata.tenant_id;

  if (status === 'paid') {
    await lifecycle.activateSubscription({
      tenantId,
      tier: metadata.tier as TierLevel,
      billingCycle: (metadata.cycle || 'monthly') as BillingCycle,
      gateway: 'moyasar',
      externalSubscriptionId: `moyasar_${id}`,
    });
    await recordPayment({
      tenantId,
      gateway: 'moyasar',
      externalId: id,
      amount: paymentData.amount / 100,
      currency: paymentData.currency || 'SAR',
      status: 'succeeded',
    });
    return { success: true, tenantId };
  }

  if (status === 'failed') {
    await recordPayment({
      tenantId,
      gateway: 'moyasar',
      externalId: id,
      amount: paymentData.amount / 100,
      currency: paymentData.currency || 'SAR',
      status: 'failed',
    });
  }

  return { success: false, tenantId };
}

/** Get subscription for a tenant */
export async function getSubscription(tenantId: string) {
  try {
    const res = await safeQuery(
      `SELECT * FROM subscriptions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [tenantId]
    );
    return getFirstRow(res) || null;
  } catch { return null; }
}

/** Get payment history for a tenant */
export async function getPaymentHistory(tenantId: string, limit = 20) {
  try {
    const res = await safeQuery(
      `SELECT * FROM payments WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [tenantId, limit]
    );
    return res.rows;
  } catch { return []; }
}

/** Create Stripe billing portal session for self-serve management */
export async function createBillingPortalSession(tenantId: string, returnUrl: string): Promise<string | null> {
  if (!stripe) return null;
  const customerId = await getStripeCustomerId(tenantId);
  if (!customerId) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

/** Cancel subscription — delegates state management to lifecycle service */
export async function cancelSubscription(tenantId: string, userId?: string): Promise<boolean> {
  const sub = await getSubscription(tenantId);
  if (!sub) return false;

  // Cancel in gateway first (at period end)
  if (sub.gateway === 'stripe' && stripe && sub.external_subscription_id) {
    try {
      await stripe.subscriptions.update(sub.external_subscription_id, {
        cancel_at_period_end: true,
      });
    } catch (err: unknown) {
      logger.error(`Stripe cancellation failed for tenant ${tenantId}: ${toErrorMessage(err)}`);
    }
  }

  // Delegate DB + audit + events to lifecycle service
  await lifecycle.cancelSubscription(tenantId, 'user_requested', userId || SYSTEM_JOB_ACTOR);
  return true;
}

// ── Internal helpers ──
// NOTE: activateSubscription and updateSubscriptionStatus are now delegated to
// the lifecycle service (subscription-lifecycle.service.ts) which provides:
//   - State machine validation
//   - Audit logging
//   - Event emission
//   - Grace period / trial management

async function recordPayment(opts: {
  tenantId: string;
  gateway: PaymentGateway;
  externalId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
}): Promise<void> {
  await safeQuery(`
    INSERT INTO payments (tenant_id, gateway, external_payment_id, amount, currency, status, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
  `, [opts.tenantId, opts.gateway, opts.externalId, opts.amount, opts.currency, opts.status]);

  // Emit payment event
  const eventType = opts.status === 'succeeded' ? 'subscription.payment_succeeded' : 'subscription.payment_failed';
  eventBus.publish({
    eventType: eventType as any,
    tenantId: opts.tenantId,
    sourceService: 'payment.service',
    severity: opts.status === 'succeeded' ? 'info' : 'warning',
    payload: { gateway: opts.gateway, externalId: opts.externalId, amount: opts.amount, currency: opts.currency },
  });
}

async function getStripeCustomerId(tenantId: string): Promise<string | null> {
  try {
    const res = await safeQuery(`SELECT stripe_customer_id FROM subscriptions WHERE tenant_id = $1 LIMIT 1`, [tenantId]);
    return getFirstRow(res)?.stripe_customer_id || null;
  } catch { return null; }
}

async function saveStripeCustomerId(tenantId: string, customerId: string): Promise<void> {
  await safeQuery(`
    INSERT INTO subscriptions (tenant_id, stripe_customer_id, status, created_at, updated_at)
    VALUES ($1, $2, 'pending', NOW(), NOW())
    ON CONFLICT (tenant_id) DO UPDATE SET stripe_customer_id = $2, updated_at = NOW()
  `, [tenantId, customerId]);
}

async function getTenantIdByStripeSubscription(subscriptionId: string): Promise<string | null> {
  try {
    const res = await safeQuery(
      `SELECT tenant_id FROM subscriptions WHERE external_subscription_id = $1 LIMIT 1`,
      [subscriptionId]
    );
    return getFirstRow(res)?.tenant_id || null;
  } catch { return null; }
}
