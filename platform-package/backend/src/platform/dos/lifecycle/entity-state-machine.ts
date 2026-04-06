/**
 * Platform Generic Entity State Machine
 *
 * Provides a reusable FSM for any domain entity. Validates state transitions
 * against a defined transition map and emits 'entity.state_changed' events
 * on every successful transition.
 *
 * Usage:
 *   const fsm = new EntityStateMachine<'draft' | 'active' | 'closed'>({
 *     entityType: 'risk',
 *     transitions: {
 *       draft: ['active'],
 *       active: ['closed', 'draft'],
 *       closed: [],
 *     },
 *   });
 *   await fsm.transition(tenantId, entityId, 'draft', 'active', { actor: userId });
 */

import { logger } from '../observability/logger.service';
import { InvalidTransitionError } from './lifecycle-engine';

export { InvalidTransitionError };

export interface StateMachineConfig<S extends string> {
  entityType: string;
  /** Map of state → allowed next states */
  transitions: Record<S, S[]>;
}

export interface TransitionContext {
  actor?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export class EntityStateMachine<S extends string> {
  constructor(private readonly config: StateMachineConfig<S>) {}

  /**
   * Validate and perform a state transition, then emit 'entity.state_changed'.
   * @throws InvalidTransitionError if the transition is not permitted by the config.
   */
  async transition(
    tenantId: string,
    entityId: string,
    from: S,
    to: S,
    context?: TransitionContext,
  ): Promise<void> {
    const allowed = this.config.transitions[from];
    if (!allowed || !allowed.includes(to)) {
      throw new InvalidTransitionError(this.config.entityType, from, to);
    }

    logger.info(`[StateMachine] ${this.config.entityType}:${entityId} ${from} → ${to}`, {
      tenantId,
      actor: context?.actor,
      reason: context?.reason,
    });

    try {
      const { publishValidatedEvent } = await import('../events/event-bus-publisher');
      const eventPayload = {
        tenantId,
        entityId,
        userId: context?.actor,
        payload: {
          entityType: this.config.entityType,
          entityId,
          fromState: from,
          toState: to,
          actor: context?.actor,
          ...(context?.metadata || {}),
        },
      };
      await publishValidatedEvent({ eventType: 'lifecycle.state_changed', ...eventPayload });
    } catch (err: unknown) {
      logger.warn(`[StateMachine] Failed to emit state_changed event for ${this.config.entityType}:${entityId}`, {
        error: String(err),
      });
    }
  }

  /**
   * Check if a transition is valid without performing it.
   */
  canTransition(from: S, to: S): boolean {
    const allowed = this.config.transitions[from];
    return Array.isArray(allowed) && allowed.includes(to);
  }

  /**
   * Get all reachable states from a given state.
   */
  getAllowedTransitions(from: S): S[] {
    return this.config.transitions[from] || [];
  }
}

// ── Pre-built platform FSMs ─────────────────────────────────────────────────
// Only generic platform entity FSMs belong here (Law 5, Law 15).
// Product/module-specific FSMs (risk, control, etc.) MUST be defined
// in their respective module lifecycle-registration files.

/** Generic Workflow Step FSM — platform-owned (Patch 7 §2.3) */
export const WORKFLOW_STEP_MACHINE = new EntityStateMachine<'pending' | 'in_progress' | 'completed' | 'rejected' | 'skipped'>({
  entityType: 'workflow_step',
  transitions: {
    pending: ['in_progress', 'skipped'],
    in_progress: ['completed', 'rejected'],
    completed: [],
    rejected: ['in_progress'],
    skipped: [],
  },
});
