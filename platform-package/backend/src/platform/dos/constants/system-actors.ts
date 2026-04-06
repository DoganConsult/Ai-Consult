/**
 * Explicit system actor identities for background/infrastructure contexts.
 *
 * These are NEVER used in request-path code.
 * Request-path code uses req.user! always (enforced by getActor() helper).
 *
 * Law 6: Real Scope Only — these are real infrastructure identities,
 * not fake fallbacks. They identify the automated system context
 * that performed an action, making audit trails distinguishable
 * from human-initiated actions.
 *
 * @owner DOS
 * @since 2026-04-03
 */

/** Background job execution (cron, scheduled tasks, auto-eval, auto-task) */
export const SYSTEM_JOB_ACTOR = 'SYSTEM_JOB';

/** Seed/provisioning operations (onboarding, bootstrap, pack installation) */
export const SYSTEM_SEEDER_ACTOR = 'SYSTEM_SEEDER';

/** Inbound webhook processing (external system callbacks) */
export const SYSTEM_WEBHOOK_ACTOR = 'SYSTEM_WEBHOOK';

/** Cross-module event propagation (state propagation, dynamic chain) */
export const SYSTEM_EVENT_PROPAGATOR_ACTOR = 'SYSTEM_EVENT_PROPAGATION';

/** Invitation flow (user does not exist yet at invitation send time) */
export const SYSTEM_INVITATION_ACTOR = 'SYSTEM_INVITATION';

/**
 * System pseudo-tenant for cross-tenant or platform-level infrastructure events.
 * This replaces the legacy `'system'` string literal, ensuring that any cross-tenant
 * operation explicitly declares itself as a system-level event.
 */
export const SYSTEM_TENANT = '00000000-0000-4000-8000-000000000000';

/**
 * Nil UUID sentinel — used as a default/fallback when no real instance ID or
 * user ID is available (e.g., system-initiated operations, cross-tenant queries,
 * workflow events without a specific instance).
 *
 * This is the standard nil UUID (RFC 4122 §4.1.7).
 */
export const NIL_UUID = '00000000-0000-0000-0000-000000000000';
