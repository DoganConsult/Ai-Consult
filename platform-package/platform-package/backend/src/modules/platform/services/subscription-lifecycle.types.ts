// ============================================
// Platform — Subscription Lifecycle Types
// Canonical type definitions for subscription management,
// billing cycles, tier configuration, and lifecycle transitions.
// Owner: DOS — platform module (Law 2)
// ============================================

// ── Enums & Literal Types ──────────────────────────────────────────

/**
 * Audit action codes for subscription lifecycle events.
 */
export type AuditAction =
  | 'subscription.created'
  | 'subscription.activated'
  | 'subscription.paused'
  | 'subscription.resumed'
  | 'subscription.cancelled'
  | 'subscription.expired'
  | 'subscription.renewed'
  | 'subscription.upgraded'
  | 'subscription.downgraded'
  | 'subscription.trial_extended'
  | 'subscription.grace_extended'
  | 'subscription.degraded'
  | 'subscription.restored'
  | string;

/**
 * Subscription status — tracks the current state of a tenant subscription.
 */
export type SubscriptionStatus =
  | 'trial_active'
  | 'trialing'
  | 'active'
  | 'paused'
  | 'cancelled'
  | 'expired'
  | 'grace_period'
  | 'pending'
  | 'suspended'
  | 'past_due';

/**
 * Tier levels — product tiers controlling feature gates and limits.
 */
export type TierLevel = 'starter' | 'scale' | 'continuous' | 'custom';

/**
 * Lifecycle state — broader lifecycle including provisioning states.
 */
export type LifecycleState =
  | 'provisioning'
  | 'trial'
  | 'active'
  | 'grace'
  | 'suspended'
  | 'offboarding'
  | 'terminated';

/**
 * Extension type — what kind of extension is being applied.
 */
export type ExtensionType = 'trial' | 'grace';

/**
 * Billing cycle — recurring payment interval.
 */
export type BillingCycle = 'monthly' | 'quarterly' | 'annual' | 'custom';

/**
 * Renewal mode — how the subscription renews.
 */
export type RenewalMode = 'auto_renew' | 'manual' | 'none';

// ── Core Interfaces ────────────────────────────────────────────────

/**
 * Full subscription record as stored in the database.
 */
export interface Subscription {
  id: string;
  tenant_id: string;
  status: SubscriptionStatus;
  tier: TierLevel;
  billing_cycle: BillingCycle;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  downgrade_scheduled_tier: TierLevel | null;
  downgrade_effective_date: string | null;
  renewal_mode: RenewalMode;
  paused_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  grace_period_end: string | null;
  seats_purchased: number;
  seats_used: number;
  gateway: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Subscription plan — defines what a tier includes.
 */
export interface SubscriptionPlan {
  tier: TierLevel;
  displayName: string;
  description: string;
  billingCycle: BillingCycle;
  priceMonthly: number;
  priceAnnual: number;
  currency: string;
  maxSeats: number;
  maxModules: number;
  features: string[];
  storageGb: number;
  apiRateLimit: number;
  supportLevel: 'community' | 'standard' | 'priority' | 'dedicated';
}

/**
 * Audit trail entry for subscription lifecycle events.
 */
export interface SubscriptionAuditEntry {
  id: string;
  tenant_id: string;
  action: AuditAction;
  actor_id: string;
  previous_status: SubscriptionStatus | null;
  new_status: SubscriptionStatus | null;
  previous_tier: TierLevel | null;
  new_tier: TierLevel | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

/**
 * Degradation state — describes restricted access during grace/suspension.
 */
export interface SubscriptionDegradation {
  id: string;
  tenant_id: string;
  tier: TierLevel;
  degradation_type: 'grace_period' | 'past_due' | 'suspended' | 'expired';
  active: boolean;
  reason: string;
  mode: 'read_only' | 'admin_only' | 'billing_only' | 'full_lockout';
  allowedRead: boolean;
  allowedWrite: boolean;
  allowedAdminBillingOnly: boolean;
  warnings: string[];
  started_at: string;
  resolved_at: string | null;
}

// ── Request / Response Types ───────────────────────────────────────

/**
 * Request to activate a new subscription.
 */
export interface ActivateSubscriptionRequest {
  tenantId: string;
  tier: TierLevel;
  billingCycle?: BillingCycle;
  seats?: number;
  performedBy?: string;
  paymentMethodId?: string;
  gateway?: string;
  externalSubscriptionId?: string;
  stripeCustomerId?: string;
}

/**
 * Request to transition subscription status.
 */
export interface TransitionRequest {
  tenantId: string;
  fromStatus?: SubscriptionStatus;
  toStatus: SubscriptionStatus;
  reason?: string;
  performedBy: string;
}

/**
 * Request to pause a subscription.
 */
export interface PauseSubscriptionRequest {
  tenantId: string;
  reason: string;
  resumeDate?: string;
  performedBy: string;
}

/**
 * Request to extend a trial or grace period.
 */
export interface ExtendTrialRequest {
  tenantId: string;
  extensionType: ExtensionType;
  extensionDays: number;
  reason: string;
  performedBy: string;
}

/**
 * Request to schedule a tier downgrade.
 */
export interface ScheduleDowngradeRequest {
  tenantId: string;
  targetTier: TierLevel;
  effectiveDate: string;
  reason?: string;
  performedBy: string;
}

/**
 * Record of a subscription extension.
 */
export interface SubscriptionExtension {
  id: string;
  tenant_id: string;
  extension_type: ExtensionType;
  extension_days: number;
  original_end_date: string;
  new_end_date: string;
  reason: string;
  approved_by: string;
  created_at: string;
}

/**
 * Generic subscription change request (upgrades, downgrades, add-ons).
 */
export interface SubscriptionChangeRequest {
  tenantId: string;
  changeType: 'upgrade' | 'downgrade' | 'add_seats' | 'remove_seats' | 'add_module';
  targetTier?: TierLevel;
  seatsDelta?: number;
  moduleCode?: string;
  effectiveDate?: string;
  prorated: boolean;
  performedBy: string;
}

/**
 * Usage limit check result — returned by limit enforcement.
 */
export interface UsageLimitCheckResult {
  allowed: boolean;
  resource: string;
  currentUsage: number;
  limit: number;
  remaining: number;
  tier: TierLevel;
  upgradeRequired: boolean;
  message?: string;
}

/**
 * Admin overview of all subscriptions.
 */
export interface AdminSubscriptionOverview {
  totalTenants: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  pausedSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  revenueByTier: Record<TierLevel, number>;
  tierDistribution: Record<TierLevel, number>;
  churnRate: number;
  trialConversionRate: number;
}

/**
 * Subscription summary for tenant dashboard.
 */
export interface SubscriptionSummaryResponse {
  subscription: Subscription;
  plan: SubscriptionPlan;
  degradation: SubscriptionDegradation | null;
  usageSummary: {
    seatsUsed: number;
    seatsPurchased: number;
    modulesActive: number;
    modulesAllowed: number;
    storageUsedGb: number;
    storageAllowedGb: number;
  };
  upcomingChanges: Array<{
    changeType: string;
    effectiveDate: string;
    description: string;
  }>;
  daysRemaining: number | null;
}

// ── Transition Map ─────────────────────────────────────────────────

/**
 * Valid subscription status transitions.
 * Key = current status, value = allowed next statuses.
 */
export const VALID_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  pending:       ['trial_active', 'trialing', 'active', 'cancelled'],
  trial_active:  ['active', 'expired', 'cancelled'],
  trialing:      ['active', 'expired', 'cancelled'],
  active:        ['paused', 'cancelled', 'past_due', 'grace_period', 'suspended'],
  paused:        ['active', 'cancelled', 'expired'],
  cancelled:     ['active'],          // reactivation
  expired:       ['active', 'pending'], // re-subscribe
  grace_period:  ['active', 'suspended', 'expired', 'cancelled'],
  suspended:     ['active', 'cancelled', 'expired'],
  past_due:      ['active', 'grace_period', 'suspended', 'cancelled'],
};
