import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  query: (...args: any[]) => mockQuery(...args),
  safeQuery: (...args: any[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('../observability/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('crypto', () => ({
  randomUUID: () => 'uuid-ws-001',
}));

import {
  getWorkspaceState,
  transitionWorkspaceState,
  canTransitionTo,
  getWorkspaceStateHistory,
  isWorkspaceOperational,
} from './workspace-state.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('WorkspaceStateService — getWorkspaceState', () => {
  it('returns null when no state record exists', async () => {
    const result = await getWorkspaceState('t-1', 'ws-missing');
    expect(result).toBeNull();
  });

  it('maps database row to WorkspaceStateRecord', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [{
        workspace_id: 'ws-1', tenant_id: 't-1', current_state: 'active',
        previous_state: 'provisioning', state_changed_at: '2026-04-01',
        state_changed_by: 'u-1', state_metadata: {},
      }],
    });
    const result = await getWorkspaceState('t-1', 'ws-1');
    expect(result).not.toBeNull();
    expect(result?.currentState).toBe('active');
    expect(result?.previousState).toBe('provisioning');
  });

  it('returns null on error', async () => {
    mockSafeQuery.mockRejectedValue(new Error('db down'));
    const result = await getWorkspaceState('t-1', 'ws-1');
    expect(result).toBeNull();
  });
});

describe('WorkspaceStateService — transitionWorkspaceState', () => {
  it('transitions from initializing to provisioning', async () => {
    // getWorkspaceState returns null (defaults to initializing)
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    // INSERT upsert
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // INSERT history
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await transitionWorkspaceState('t-1', 'ws-1', 'provisioning', 'u-admin');
    expect(result.currentState).toBe('provisioning');
    expect(result.previousState).toBe('initializing');
  });

  it('throws on invalid transition (active -> initializing)', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [{
        workspace_id: 'ws-1', tenant_id: 't-1', current_state: 'active',
        previous_state: null, state_changed_at: '', state_changed_by: null,
        state_metadata: {},
      }],
    });
    await expect(
      transitionWorkspaceState('t-1', 'ws-1', 'initializing', 'u-1'),
    ).rejects.toThrow('Invalid workspace state transition');
  });

  it('throws on invalid transition from deleted (terminal)', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [{
        workspace_id: 'ws-1', tenant_id: 't-1', current_state: 'deleted',
        previous_state: null, state_changed_at: '', state_changed_by: null,
        state_metadata: {},
      }],
    });
    await expect(
      transitionWorkspaceState('t-1', 'ws-1', 'active', 'u-1'),
    ).rejects.toThrow('Invalid workspace state transition');
  });

  it('records triggeredBy in the state record', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] }); // no existing state
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // upsert
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // history

    const result = await transitionWorkspaceState('t-1', 'ws-1', 'provisioning', 'u-admin');
    expect(result.stateChangedBy).toBe('u-admin');
  });

  it('allows valid transition from active to maintenance', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [{
        workspace_id: 'ws-1', tenant_id: 't-1', current_state: 'active',
        previous_state: null, state_changed_at: '', state_changed_by: null,
        state_metadata: {},
      }],
    });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await transitionWorkspaceState('t-1', 'ws-1', 'maintenance', 'u-admin');
    expect(result.currentState).toBe('maintenance');
  });
});

describe('WorkspaceStateService — canTransitionTo', () => {
  it('returns true for valid transition', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [{
        workspace_id: 'ws-1', tenant_id: 't-1', current_state: 'active',
        previous_state: null, state_changed_at: '', state_changed_by: null,
        state_metadata: {},
      }],
    });
    const result = await canTransitionTo('t-1', 'ws-1', 'suspended');
    expect(result).toBe(true);
  });

  it('returns false for invalid transition', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [{
        workspace_id: 'ws-1', tenant_id: 't-1', current_state: 'active',
        previous_state: null, state_changed_at: '', state_changed_by: null,
        state_metadata: {},
      }],
    });
    const result = await canTransitionTo('t-1', 'ws-1', 'deleted');
    expect(result).toBe(false);
  });

  it('treats no state as initializing', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [] });
    const result = await canTransitionTo('t-1', 'ws-1', 'provisioning');
    expect(result).toBe(true);
  });
});

describe('WorkspaceStateService — getWorkspaceStateHistory', () => {
  it('returns empty array when no history', async () => {
    const result = await getWorkspaceStateHistory('t-1', 'ws-1');
    expect(result).toEqual([]);
  });

  it('returns mapped history entries', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [{
        history_id: 'h-1', workspace_id: 'ws-1', from_state: 'initializing',
        to_state: 'provisioning', triggered_by: 'u-1', reason: 'setup',
        metadata: {}, transitioned_at: '2026-01-01',
      }],
    });
    const result = await getWorkspaceStateHistory('t-1', 'ws-1');
    expect(result).toHaveLength(1);
    expect(result[0].toState).toBe('provisioning');
  });
});

describe('WorkspaceStateService — isWorkspaceOperational', () => {
  it('returns true when workspace is active', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [{
        workspace_id: 'ws-1', tenant_id: 't-1', current_state: 'active',
        previous_state: null, state_changed_at: '', state_changed_by: null,
        state_metadata: {},
      }],
    });
    const result = await isWorkspaceOperational('t-1', 'ws-1');
    expect(result).toBe(true);
  });

  it('returns false when workspace is suspended', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [{
        workspace_id: 'ws-1', tenant_id: 't-1', current_state: 'suspended',
        previous_state: null, state_changed_at: '', state_changed_by: null,
        state_metadata: {},
      }],
    });
    const result = await isWorkspaceOperational('t-1', 'ws-1');
    expect(result).toBe(false);
  });

  it('returns false when workspace not found', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [] });
    const result = await isWorkspaceOperational('t-1', 'ws-missing');
    expect(result).toBe(false);
  });
});
