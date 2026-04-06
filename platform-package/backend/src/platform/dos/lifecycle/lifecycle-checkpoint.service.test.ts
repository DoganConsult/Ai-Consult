/**
 * Tests for lifecycle checkpoint patterns using the lifecycle-registry.
 * Validates checkpoint creation/restoration via registry state and state machine.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../observability/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('./lifecycle-engine', () => ({
  registerLifecycleDefinition: vi.fn(),
  getLifecycleDefinition: vi.fn(),
  getAllDefinitions: vi.fn(() => []),
  InvalidTransitionError: class InvalidTransitionError extends Error {
    constructor(entity: string, from: string, to: string) {
      super(`Invalid transition for ${entity}: ${from} -> ${to}`);
    }
  },
}));

vi.mock('./entity-state-machine', () => ({
  EntityStateMachine: class MockESM {
    constructor(public config: any) {}
    async transition(_t: string, _e: string, from: string, to: string) {
      const allowed = this.config.transitions[from];
      if (!allowed?.includes(to)) throw new Error(`Invalid: ${from}->${to}`);
    }
    canTransition(from: string, to: string) {
      const allowed = this.config.transitions[from];
      return allowed?.includes(to) ?? false;
    }
  },
}));

import {
  registerLifecycleDefinition,
  getRegistryEntry,
  isTransitionValid,
  isTerminalState,
  getAllowedTransitions,
  createStateMachineFromRegistry,
  clearRegistry,
} from './lifecycle-registry';

beforeEach(() => {
  vi.clearAllMocks();
  clearRegistry();
});

describe('LifecycleCheckpoint — createCheckpoint via registry', () => {
  it('registers a lifecycle definition as a checkpoint', () => {
    registerLifecycleDefinition(
      'risk', 'assessment',
      ['draft', 'active', 'closed'],
      { draft: ['active'], active: ['closed'], closed: [] },
      { initialState: 'draft' },
    );

    const entry = getRegistryEntry('risk', 'assessment');
    expect(entry).not.toBeNull();
    expect(entry?.initialState).toBe('draft');
    expect(entry?.states).toContain('draft');
    expect(entry?.states).toContain('active');
    expect(entry?.states).toContain('closed');
  });

  it('auto-detects terminal states', () => {
    registerLifecycleDefinition(
      'compliance', 'control',
      ['draft', 'active', 'retired'],
      { draft: ['active'], active: ['retired'], retired: [] },
    );

    const entry = getRegistryEntry('compliance', 'control');
    expect(entry?.terminalStates).toContain('retired');
    expect(entry?.terminalStates).not.toContain('draft');
  });

  it('records transition permissions', () => {
    registerLifecycleDefinition(
      'evidence', 'evidence',
      ['pending', 'approved', 'expired'],
      { pending: ['approved', 'expired'], approved: ['expired'], expired: [] },
      { transitionPermissions: { 'pending->approved': 'evidence.approve' } },
    );

    const entry = getRegistryEntry('evidence', 'evidence');
    expect(entry?.transitionPermissions?.['pending->approved']).toBe('evidence.approve');
  });
});

describe('LifecycleCheckpoint — restoreCheckpoint via isTransitionValid', () => {
  it('validates forward transition', () => {
    registerLifecycleDefinition(
      'risk', 'register',
      ['draft', 'active', 'closed'],
      { draft: ['active'], active: ['closed'], closed: [] },
    );

    expect(isTransitionValid('risk', 'register', 'draft', 'active')).toBe(true);
    expect(isTransitionValid('risk', 'register', 'active', 'closed')).toBe(true);
  });

  it('rejects invalid backward transition', () => {
    registerLifecycleDefinition(
      'risk', 'register',
      ['draft', 'active', 'closed'],
      { draft: ['active'], active: ['closed'], closed: [] },
    );

    expect(isTransitionValid('risk', 'register', 'closed', 'draft')).toBe(false);
    expect(isTransitionValid('risk', 'register', 'active', 'draft')).toBe(false);
  });

  it('returns false for unregistered module', () => {
    expect(isTransitionValid('nonexistent', 'entity', 'a', 'b')).toBe(false);
  });
});

describe('LifecycleCheckpoint — pruneCheckpoints via clearRegistry', () => {
  it('clears all registered definitions', () => {
    registerLifecycleDefinition(
      'risk', 'r1', ['a', 'b'], { a: ['b'], b: [] },
    );
    registerLifecycleDefinition(
      'audit', 'a1', ['x', 'y'], { x: ['y'], y: [] },
    );

    clearRegistry();

    expect(getRegistryEntry('risk', 'r1')).toBeNull();
    expect(getRegistryEntry('audit', 'a1')).toBeNull();
  });
});

describe('LifecycleCheckpoint — isTerminalState', () => {
  it('identifies terminal states correctly', () => {
    registerLifecycleDefinition(
      'policy', 'policy',
      ['draft', 'published', 'archived'],
      { draft: ['published'], published: ['archived'], archived: [] },
    );

    expect(isTerminalState('policy', 'policy', 'archived')).toBe(true);
    expect(isTerminalState('policy', 'policy', 'draft')).toBe(false);
  });
});

describe('LifecycleCheckpoint — getAllowedTransitions', () => {
  it('returns allowed next states', () => {
    registerLifecycleDefinition(
      'vendor', 'vendor',
      ['pending', 'approved', 'blocked', 'archived'],
      { pending: ['approved', 'blocked'], approved: ['archived'], blocked: ['approved'], archived: [] },
    );

    expect(getAllowedTransitions('vendor', 'vendor', 'pending')).toEqual(['approved', 'blocked']);
    expect(getAllowedTransitions('vendor', 'vendor', 'archived')).toEqual([]);
  });

  it('returns empty array for unregistered module', () => {
    expect(getAllowedTransitions('nonexistent', 'entity', 'state')).toEqual([]);
  });
});

describe('LifecycleCheckpoint — createStateMachineFromRegistry', () => {
  it('creates FSM from registered definition', () => {
    registerLifecycleDefinition(
      'incident', 'incident',
      ['open', 'investigating', 'resolved', 'closed'],
      { open: ['investigating'], investigating: ['resolved'], resolved: ['closed'], closed: [] },
    );

    const fsm = createStateMachineFromRegistry('incident', 'incident');
    expect(fsm).not.toBeNull();
  });

  it('returns null for unregistered definition', () => {
    const fsm = createStateMachineFromRegistry('nonexistent', 'entity');
    expect(fsm).toBeNull();
  });
});
