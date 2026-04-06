/**
 * DOS SLA Contract Types — shared vocabulary for all SLA/escalation services.
 *
 * These types define the canonical shape for SLA definitions, statuses, and
 * escalation levels across the platform. Domain-specific SLA services remain
 * in their own modules but should adopt these shared types in S5+.
 *
 * Services that should adopt these types:
 *   1. workflow/services/process-orchestration/sla-enforcement.ts    — lookupSLA()
 *   2. incident/services/incident/incident-sla-config.service.ts     — getIncidentSlaConfig()
 *   3. audit/services/audit/audit-finding-slas.service.ts            — getSlaConfig(), upsertSla()
 *   4. platform/services/misc/escalation.service.ts                  — checkEscalations()
 *   5. governance/services/governance/governance-auto-escalation.service.ts
 *   6. modules/issues/services/issues-escalation.service.ts
 *   7. modules/ai/services/personal/personal-agent-sla.service.ts
 *   8. platform/services/misc/sla-performance-report.service.ts
 *   9. temporal/activities/sla.activities.ts
 *  10. vendor/services/vendor/vendor-cross-module-escalation.service.ts
 *
 * Pattern compatibility verified for top 3 services (sla-enforcement,
 * incident-sla-config, audit-finding-slas):
 *   - All use numeric hours or days as target duration
 *   - All define a warning threshold (percentage or absolute)
 *   - All support severity/priority-level keying
 *   - All have breach action semantics (escalate, notify, flag)
 */

// ── SLA Definition ─────────────────────────────────────────────────────────

/** Canonical SLA target for a given process/priority/severity combination. */
export interface SlaDefinition {
  /** Unique identifier for this SLA rule (optional; DB-generated when persisted). */
  slaId?: string;

  /** Target resolution time in hours. Services using days can convert (days * 24). */
  targetHours: number;

  /**
   * Percentage of targetHours elapsed before a warning is emitted.
   * Example: 75 means "warn at 75% of SLA elapsed".
   * Range: 0-100.
   */
  warningThresholdPct: number;

  /**
   * Action to take when the SLA is breached.
   * - 'escalate': Route to next escalation level (most common).
   * - 'notify': Send notification only, no re-assignment.
   * - 'flag': Mark the entity as breached for reporting (e.g., board attention).
   * - 'auto_close': Auto-close with breach status (rare, audit findings).
   */
  breachAction: SlaBreachAction;

  /** Optional process type qualifier (e.g., 'evidence_request', 'approval'). */
  processType?: string;

  /** Optional priority or severity qualifier (e.g., 'critical', 'high'). */
  priorityLevel?: string;

  /** Whether this SLA definition is currently active. */
  active?: boolean;
}

export type SlaBreachAction = 'escalate' | 'notify' | 'flag' | 'auto_close';

// ── SLA Status ─────────────────────────────────────────────────────────────

/**
 * Runtime status of an entity relative to its SLA target.
 * Used in dashboards, reports, and real-time monitoring.
 */
export type SlaStatus = 'on_track' | 'at_risk' | 'breached' | 'paused';

/** Runtime SLA tracking state for a single entity. */
export interface SlaTracking {
  /** Current SLA status. */
  status: SlaStatus;

  /** When the SLA clock started (entity creation or assignment). */
  startedAt: string;

  /** Absolute deadline derived from startedAt + targetHours. */
  deadlineAt: string;

  /** When the SLA was breached, if applicable. */
  breachedAt?: string;

  /** When the SLA clock was paused, if applicable. */
  pausedAt?: string;

  /** Total hours the SLA was paused (accumulated across pause/resume cycles). */
  pausedHours?: number;

  /** Percentage of SLA time elapsed (0-100+). Values over 100 indicate breach. */
  elapsedPct: number;
}

// ── Escalation Levels ──────────────────────────────────────────────────────

/** A single step in an escalation chain. */
export interface EscalationLevel {
  /** Escalation level number (1 = first escalation, 2 = second, etc.). */
  level: number;

  /**
   * Role code to notify at this escalation level.
   * Examples: 'team_lead', 'department_head', 'ciso', 'board_member'.
   */
  notifyRole: string;

  /**
   * Hours to wait at this level before escalating to the next level.
   * If this is the final level, no further escalation occurs.
   */
  timeoutHours: number;

  /** Optional: specific user ID to notify (overrides role-based routing). */
  notifyUserId?: string;

  /** Optional: notification channel override ('email' | 'in_app' | 'sms' | 'all'). */
  notificationChannel?: string;
}

/** Complete escalation chain for a process type or entity. */
export interface EscalationChain {
  /** Process type this chain applies to. */
  processType: string;

  /** Priority level this chain applies to (or '*' for all priorities). */
  priorityLevel: string;

  /** Ordered list of escalation levels. */
  levels: EscalationLevel[];
}

// ── Utility: Default SLA hours by priority ─────────────────────────────────

/**
 * Platform-wide default SLA hours keyed by priority level.
 * Domain services may override these via DB configuration.
 * Matches the existing SLA_DEFAULTS in process-orchestration/types.ts.
 */
export const DEFAULT_SLA_HOURS_BY_PRIORITY: Readonly<Record<string, number>> = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
};

/**
 * Default warning threshold percentage.
 * Most services warn at 75% of SLA elapsed.
 */
export const DEFAULT_WARNING_THRESHOLD_PCT = 75;
