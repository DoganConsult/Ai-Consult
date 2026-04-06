// ============================================
// AGRC-OS — Generalized Circuit Breaker Utility
// 3-state pattern: CLOSED (healthy) → OPEN (failing) → HALF_OPEN (probing)
// Extracted from ai-circuit-breaker.service.ts for reuse across any external service.
// ============================================

/**
 * Generic Circuit Breaker
 *
 * Three-state: CLOSED (healthy) → OPEN (failed) → HALF_OPEN (probing)
 * Wraps any async function with failure detection and recovery.
 *
 * Usage:
 *   const cb = new CircuitBreaker({ name: 'redis', failureThreshold: 5 });
 *   const result = await cb.execute(() => redis.get('key'));
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Name for logging/metrics */
  name: string;
  /** Consecutive failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Time in ms before attempting recovery (default: 60000) */
  recoveryTimeMs?: number;
  /** Max concurrent probes in HALF_OPEN state (default: 2) */
  halfOpenMaxProbes?: number;
  /** Optional callback when state changes */
  onStateChange?: (from: CircuitState, to: CircuitState, name: string) => void;
}

/**
 * Error thrown when a circuit breaker is OPEN and rejecting calls.
 */
export class CircuitBreakerOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker '${name}' is OPEN — request rejected`);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * @deprecated
 * @removal-date 2026-06-30
 * @removal-version 2.0.0
 * @owner DOS
 * @replacement CircuitBreakerOpenError in this same file (backend/src/platform/dos/resilience/circuit-breaker.ts)
 */
export class CircuitOpenError extends CircuitBreakerOpenError {
  public readonly retryAfterMs: number;
  constructor(circuitName: string, retryAfterMs = 0) {
    super(circuitName);
    this.retryAfterMs = retryAfterMs;
    this.name = 'CircuitOpenError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenProbes = 0;
  private readonly opts: Required<Omit<CircuitBreakerOptions, 'onStateChange'>> & {
    onStateChange?: CircuitBreakerOptions['onStateChange'];
  };

  // Metrics counters
  private totalRequests = 0;
  private totalFailures = 0;
  private totalRejected = 0;
  private totalSuccesses = 0;

  constructor(options: CircuitBreakerOptions) {
    this.opts = {
      name: options.name,
      failureThreshold: options.failureThreshold ?? 5,
      recoveryTimeMs: options.recoveryTimeMs ?? 60_000,
      halfOpenMaxProbes: options.halfOpenMaxProbes ?? 2,
      onStateChange: options.onStateChange,
    };
  }

  /**
   * Execute a function with circuit breaker protection.
   * Throws CircuitBreakerOpenError if the circuit is OPEN and recovery time has not elapsed.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.opts.recoveryTimeMs) {
        this.transition('HALF_OPEN');
      } else {
        this.totalRejected++;
        throw new CircuitBreakerOpenError(this.opts.name);
      }
    }

    if (this.state === 'HALF_OPEN' && this.halfOpenProbes >= this.opts.halfOpenMaxProbes) {
      this.totalRejected++;
      throw new CircuitBreakerOpenError(this.opts.name);
    }

    if (this.state === 'HALF_OPEN') this.halfOpenProbes++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  /** Record a successful call — resets failure count and closes the circuit if in HALF_OPEN */
  private onSuccess(): void {
    this.totalSuccesses++;
    if (this.state === 'HALF_OPEN') {
      this.halfOpenProbes = Math.max(0, this.halfOpenProbes - 1);
      this.transition('CLOSED');
    }
    this.failureCount = 0;
  }

  /** Record a failed call — increments failure count and may trip the breaker to OPEN */
  private onFailure(): void {
    this.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.halfOpenProbes = Math.max(0, this.halfOpenProbes - 1);
      this.transition('OPEN');
    } else if (this.failureCount >= this.opts.failureThreshold) {
      this.transition('OPEN');
    }
  }

  /** Transition to a new state with cleanup and callback */
  private transition(to: CircuitState): void {
    if (this.state === to) return;
    const from = this.state;
    this.state = to;
    if (to === 'CLOSED') {
      this.failureCount = 0;
      this.halfOpenProbes = 0;
    }
    this.opts.onStateChange?.(from, to, this.opts.name);
  }

  /** Return the current circuit state */
  getState(): CircuitState {
    return this.state;
  }

  /** Return the current consecutive failure count */
  getFailureCount(): number {
    return this.failureCount;
  }

  /** Return all metrics for monitoring/dashboards */
  getMetrics(): {
    name: string;
    state: CircuitState;
    totalRequests: number;
    totalSuccesses: number;
    totalFailures: number;
    totalRejected: number;
    failureCount: number;
    lastFailureTime: number;
  } {
    return {
      name: this.opts.name,
      state: this.state,
      totalRequests: this.totalRequests,
      totalSuccesses: this.totalSuccesses,
      totalFailures: this.totalFailures,
      totalRejected: this.totalRejected,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /** Force-reset the circuit to CLOSED (admin/recovery action) */
  reset(): void {
    this.transition('CLOSED');
  }
}

// ============================================
// Global Registry — named circuit breakers for cross-service visibility
// ============================================

const registry = new Map<string, CircuitBreaker>();

/** Get an existing circuit breaker by name, or create a new one with the given options */
export function getOrCreateBreaker(options: CircuitBreakerOptions): CircuitBreaker {
  let breaker = registry.get(options.name);
  if (!breaker) {
    breaker = new CircuitBreaker(options);
    registry.set(options.name, breaker);
  }
  return breaker;
}

/** Return metrics for all registered circuit breakers (useful for /health or /metrics endpoints) */
export function getAllBreakerMetrics(): Array<ReturnType<CircuitBreaker['getMetrics']>> {
  return Array.from(registry.values()).map((b) => b.getMetrics());
}
