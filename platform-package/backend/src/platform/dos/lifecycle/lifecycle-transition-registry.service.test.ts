/**
 * Tests for lifecycle transition registry validation patterns.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../observability/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('./lifecycle-engine', () => ({
  registerLifecycleDefinition: vi.fn(),
  getLifecycleDefinition: vi.fn(),
  getAllDefinitions: vi.fn(() => []),
  InvalidTransitionError: class extends Error {
    constructor(entity: string, from: string, to: string) {
      super(`Invalid transition for ${entity}: ${from} -> ${to}`);
    }
  },
}));

vi.mock('./entity-state-machine', () => ({
  EntityStateMachine: class MockESM {
    constructor(public config: any) {}
  },
}));

import {
  registerLifecycleDefinition,
  getRegistryEntry,
  isTransitionValid,
  getAllowedTransitions,
  getTransitionPermission,
  getAllRegisteredDefinitions,
  getRegistrySummary,
  clearRegistry,
} from './lifecycle-registry';

beforeEach(() => {
  vi.clearAllMocks();
  clearRegistry();
});

describe('LifecycleTransitionRegistry — registerTransition', () => {
  it('registers and retrieves a definition', () => {
    registerLifecycleDefinition(
      'risk', 'risk_register',
      ['draft', 'active', 'closed'],
      { draft: ['active'], active: ['closed'], closed: [] },
    );

    const entry = getRegistryEntry('risk', 'risk_register');
    expect(entry).not.toBeNull();
    expect(entry?.moduleCode).toBe('risk');
    expect(entry?.entityType).toBe('risk_register');
  });

  it('overwrites existing definition on re-register (idempotent)', () => {
    registerLifecycleDefinition(
      'risk', 'risk_register',
      ['draft', 'active'],
      { draft: ['active'], active: [] },
    );
    registerLifecycleDefinition(
      'risk', 'risk_register',
      ['draft', 'active', 'closed'],
      { draft: ['active'], active: ['closed'], closed: [] },
    );

    const entry = getRegistryEntry('risk', 'risk_register');
    expect(entry?.states).toHaveLength(3);
  });

  it('registers multiple entity types for same module', () => {
    registerLifecycleDefinition('audit', 'finding', ['open', 'resolved'], { open: ['resolved'], resolved: [] });
    registerLifecycleDefinition('audit', 'plan', ['draft', 'active'], { draft: ['active'], active: [] });

    expect(getRegistryEntry('audit', 'finding')).not.toBeNull();
    expect(getRegistryEntry('audit', 'plan')).not.toBeNull();
  });
});

describe('LifecycleTransitionRegistry — getTransitionsFrom', () => {
  it('returns allowed transitions from a given state', () => {
    registerLifecycleDefinition(
      'compliance', 'framework',
      ['draft', 'active', 'deprecated', 'archived'],
      { draft: ['active'], active: ['deprecated', 'archived'], deprecated: ['archived'], archived: [] },
    );

    expect(getAllowedTransitions('compliance', 'framework', 'active')).toEqual(['deprecated', 'archived']);
    expect(getAllowedTransitions('compliance', 'framework', 'draft')).toEqual(['active']);
    expect(getAllowedTransitions('compliance', 'framework', 'archived')).toEqual([]);
  });

  it('returns empty for unknown state', () => {
    registerLifecycleDefinition('test', 'entity', ['a'], { a: [] });
    expect(getAllowedTransitions('test', 'entity', 'nonexistent')).toEqual([]);
  });
});

describe('LifecycleTransitionRegistry — validateTransitionChain', () => {
  it('validates a valid chain of transitions', () => {
    registerLifecycleDefinition(
      'evidence', 'evidence',
      ['pending', 'submitted', 'approved', 'expired'],
      { pending: ['submitted'], submitted: ['approved'], approved: ['expired'], expired: [] },
    );

    // Chain: pending -> submitted -> approved -> expired
    expect(isTransitionValid('evidence', 'evidence', 'pending', 'submitted')).toBe(true);
    expect(isTransitionValid('evidence', 'evidence', 'submitted', 'approved')).toBe(true);
    expect(isTransitionValid('evidence', 'evidence', 'approved', 'expired')).toBe(true);
  });

  it('rejects a broken chain', () => {
    registerLifecycleDefinition(
      'evidence', 'evidence',
      ['pending', 'submitted', 'approved', 'expired'],
      { pending: ['submitted'], submitted: ['approved'], approved: ['expired'], expired: [] },
    );

    // Skip: pending -> approved (not allowed directly)
    expect(isTransitionValid('evidence', 'evidence', 'pending', 'approved')).toBe(false);
  });
});

describe('LifecycleTransitionRegistry — getTransitionPermission', () => {
  it('returns permission for a defined transition', () => {
    registerLifecycleDefinition(
      'policy', 'policy',
      ['draft', 'published'],
      { draft: ['published'], published: [] },
      { transitionPermissions: { 'draft->published': 'policy.publish' } },
    );

    expect(getTransitionPermission('policy', 'policy', 'draft', 'published')).toBe('policy.publish');
  });

  it('returns null for transitions without explicit permission', () => {
    registerLifecycleDefinition(
      'policy', 'policy',
      ['draft', 'published'],
      { draft: ['published'], published: [] },
    );

    expect(getTransitionPermission('policy', 'policy', 'draft', 'published')).toBeNull();
  });
});

describe('LifecycleTransitionRegistry — getAllRegisteredDefinitions', () => {
  it('returns all registered definitions', () => {
    registerLifecycleDefinition('mod_a', 'e1', ['a', 'b'], { a: ['b'], b: [] });
    registerLifecycleDefinition('mod_b', 'e2', ['x', 'y'], { x: ['y'], y: [] });

    const all = getAllRegisteredDefinitions();
    expect(all).toHaveLength(2);
  });

  it('returns empty when registry is cleared', () => {
    registerLifecycleDefinition('mod_a', 'e1', ['a', 'b'], { a: ['b'], b: [] });
    clearRegistry();
    expect(getAllRegisteredDefinitions()).toHaveLength(0);
  });
});

describe('LifecycleTransitionRegistry — getRegistrySummary', () => {
  it('returns summary with state and transition counts', () => {
    registerLifecycleDefinition(
      'risk', 'risk',
      ['draft', 'active', 'closed'],
      { draft: ['active'], active: ['closed'], closed: [] },
      { initialState: 'draft' },
    );

    const summary = getRegistrySummary();
    expect(summary).toHaveLength(1);
    expect(summary[0].stateCount).toBe(3);
    expect(summary[0].transitionCount).toBe(2);
    expect(summary[0].initialState).toBe('draft');
  });
});
