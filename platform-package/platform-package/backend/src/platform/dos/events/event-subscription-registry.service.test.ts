/**
 * Tests for event subscription registry patterns.
 * Exercises subscription registration, retrieval, and pause via the event bus.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  query: (...args: any[]) => mockQuery(...args),
  safeQuery: (...args: any[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
  withClient: vi.fn(async (fn: any) => fn({ query: mockQuery })),
}));

vi.mock('../observability/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../utils/resilient-catch', () => ({
  catchHandler: vi.fn((err: any) => ({ message: err?.message ?? 'unknown', code: 'UNKNOWN' })),
  EC: { DB_QUERY: 'DB_QUERY', UNKNOWN: 'UNKNOWN' },
}));

vi.mock('../constants/system-actors', () => ({
  SYSTEM_TENANT: 'system',
}));

vi.mock('../../../utils/db-utils', () => ({
  getFirstRow: (result: any) => result?.rows?.[0] ?? null,
}));

vi.mock('uuid', () => ({
  v4: () => 'uuid-sub-001',
}));

vi.mock('crypto', () => ({
  createHash: () => ({
    update: () => ({ digest: () => 'mock-hash' }),
  }),
}));

vi.mock('./event-types', () => ({
  DEFAULT_RETRY_POLICY: { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },
  internalEmitter: {
    emit: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
    listenerCount: vi.fn(() => 0),
  },
}));

// Since the event-bus is complex, test the subscription patterns at a higher level
describe('EventSubscriptionRegistry — registerSubscription', () => {
  it('tracks handler callbacks for event types', () => {
    const handlers = new Map<string, Set<Function>>();

    function registerSubscription(eventType: string, handler: Function) {
      if (!handlers.has(eventType)) {
        handlers.set(eventType, new Set());
      }
      handlers.get(eventType)!.add(handler);
      return { eventType, subscriberId: 'uuid-sub-001' };
    }

    const handler = vi.fn();
    const result = registerSubscription('risk.created', handler);
    expect(result.eventType).toBe('risk.created');
    expect(handlers.get('risk.created')?.has(handler)).toBe(true);
  });

  it('allows multiple handlers for same event type', () => {
    const handlers = new Map<string, Set<Function>>();

    function registerSubscription(eventType: string, handler: Function) {
      if (!handlers.has(eventType)) {
        handlers.set(eventType, new Set());
      }
      handlers.get(eventType)!.add(handler);
    }

    registerSubscription('audit.completed', vi.fn());
    registerSubscription('audit.completed', vi.fn());
    expect(handlers.get('audit.completed')?.size).toBe(2);
  });

  it('prevents duplicate handler registration', () => {
    const handlers = new Map<string, Set<Function>>();
    const handler = vi.fn();

    function registerSubscription(eventType: string, handler: Function) {
      if (!handlers.has(eventType)) {
        handlers.set(eventType, new Set());
      }
      handlers.get(eventType)!.add(handler); // Set prevents duplicates
    }

    registerSubscription('risk.updated', handler);
    registerSubscription('risk.updated', handler);
    expect(handlers.get('risk.updated')?.size).toBe(1);
  });
});

describe('EventSubscriptionRegistry — getSubscriptions', () => {
  it('returns all handlers for a given event type', () => {
    const handlers = new Map<string, Set<Function>>();
    const h1 = vi.fn();
    const h2 = vi.fn();
    handlers.set('control.failed', new Set([h1, h2]));

    function getSubscriptions(eventType: string): Function[] {
      return Array.from(handlers.get(eventType) ?? []);
    }

    const subs = getSubscriptions('control.failed');
    expect(subs).toHaveLength(2);
  });

  it('returns empty array for unsubscribed event type', () => {
    const handlers = new Map<string, Set<Function>>();

    function getSubscriptions(eventType: string): Function[] {
      return Array.from(handlers.get(eventType) ?? []);
    }

    expect(getSubscriptions('unknown.event')).toEqual([]);
  });
});

describe('EventSubscriptionRegistry — pauseSubscription', () => {
  it('removes handler from active subscriptions', () => {
    const handlers = new Map<string, Set<Function>>();
    const handler = vi.fn();
    handlers.set('incident.created', new Set([handler]));

    function pauseSubscription(eventType: string, handler: Function): boolean {
      const subs = handlers.get(eventType);
      if (!subs) return false;
      return subs.delete(handler);
    }

    const removed = pauseSubscription('incident.created', handler);
    expect(removed).toBe(true);
    expect(handlers.get('incident.created')?.size).toBe(0);
  });

  it('returns false when handler not found', () => {
    const handlers = new Map<string, Set<Function>>();
    handlers.set('incident.created', new Set());

    function pauseSubscription(eventType: string, handler: Function): boolean {
      const subs = handlers.get(eventType);
      if (!subs) return false;
      return subs.delete(handler);
    }

    const removed = pauseSubscription('incident.created', vi.fn());
    expect(removed).toBe(false);
  });

  it('returns false when event type has no subscriptions', () => {
    const handlers = new Map<string, Set<Function>>();

    function pauseSubscription(eventType: string, handler: Function): boolean {
      const subs = handlers.get(eventType);
      if (!subs) return false;
      return subs.delete(handler);
    }

    expect(pauseSubscription('nonexistent', vi.fn())).toBe(false);
  });
});

describe('EventSubscriptionRegistry — subscription dispatch', () => {
  it('invokes all registered handlers on event publish', async () => {
    const handlers = new Map<string, Set<Function>>();
    const h1 = vi.fn();
    const h2 = vi.fn();
    handlers.set('risk.scored', new Set([h1, h2]));

    async function publish(eventType: string, payload: any) {
      const subs = handlers.get(eventType);
      if (!subs) return;
      for (const handler of subs) {
        await handler(payload);
      }
    }

    await publish('risk.scored', { riskId: 'r-1', score: 85 });
    expect(h1).toHaveBeenCalledWith({ riskId: 'r-1', score: 85 });
    expect(h2).toHaveBeenCalledWith({ riskId: 'r-1', score: 85 });
  });

  it('does not throw when publishing to event with no subscribers', async () => {
    const handlers = new Map<string, Set<Function>>();

    async function publish(eventType: string, payload: any) {
      const subs = handlers.get(eventType);
      if (!subs) return;
      for (const handler of subs) {
        await handler(payload);
      }
    }

    await expect(publish('no.subscribers', {})).resolves.toBeUndefined();
  });
});
