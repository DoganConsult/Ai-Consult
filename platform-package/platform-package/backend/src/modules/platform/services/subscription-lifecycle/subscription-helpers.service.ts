// @ts-nocheck
/**
 * Subscription Helpers
 *
 * Shared constants, lookup helpers, and internal utilities used across
 * all subscription-lifecycle sub-modules.
 */

import { safeQuery } from '../../../../config/database/database';
import { logger } from '../../../../platform/dos/observability/logger.service';
import { eventBus } from '../../../../platform/dos/events/event-bus';
import {
  SubscriptionStatus,
  AuditAction,
  VALID_TRANSITIONS,
  Subscription,
} from '../subscription-lifecycle.types';
import { getFirstRow } from '../../../../shared/data/db-utils';

// ─── Constants ───────────────────────────────────────────────

export const GRACE_PERIOD_DAYS = parseInt(process.env.GRACE_PERIOD_DAYS || '7', 10);
export const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS || '14', 10);

export const TIER_LIMITS: Record<string, Record<string, number>> = {
  starter: { maxUsers: 10, maxFrameworks: 5 },
  scale: { maxUsers: 50, maxFrameworks: 20 },
  continuous: { maxUsers: -1, maxFrameworks: -1 },
};

// ─── Transition Validation ───────────────────────────────────

export function validateTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

// ─── Subscription Lookup ─────────────────────────────────────

export async function getSubscription(tenantId: string): Promise<Subscription | null> {
  const result = await safeQuery(
    'SELECT * FROM public.subscriptions WHERE tenant_id = $1',
    [tenantId]
  );
  return getFirstRow(result) || null;
}

// ─── Event Emission ──────────────────────────────────────────

export function emitSubscriptionEvent(
  eventType: string,
  tenantId: string,
  entityId: string | undefined,
  severity: 'info' | 'warning' | 'critical',
  payload: Record<string, any>
): void {
  eventBus.publish({
    eventType: eventType as any,
    tenantId,
    sourceService: 'subscription-lifecycle',
    entityType: 'subscription',
    entityId: entityId || tenantId,
    severity,
    payload,
  }).catch((err: unknown) => {
    logger.error('Failed to emit subscription event', { eventType, tenantId, err });
  });
}

// ─── Status-to-Audit Mapping ─────────────────────────────────

export function mapStatusToAuditAction(_from: SubscriptionStatus, to: SubscriptionStatus): AuditAction {
  const mapping: Record<string, AuditAction> = {
    'active': 'activated',
    'past_due': 'payment_failed',
    'grace_period': 'grace_period_entered',
    'expired': 'grace_period_expired',
    'cancelled': 'cancelled',
    'paused': 'paused',
    'suspended': 'suspended',
    'trial_expired': 'grace_period_expired',
    'renewal_due': 'renewal_due',
  };
  return mapping[to] || 'metadata_updated';
}
