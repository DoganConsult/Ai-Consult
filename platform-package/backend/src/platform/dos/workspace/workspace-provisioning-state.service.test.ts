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
  randomUUID: () => 'uuid-prov-001',
}));

import {
  startProvisioning,
  completeStep,
  failStep,
  retryStep,
  isProvisioningComplete,
  getProvisioningState,
  cancelProvisioning,
} from './workspace-provisioning-state.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('WorkspaceProvisioningState — startProvisioning', () => {
  it('throws when workspace already has an active run (409)', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ run_id: 'existing-run' }] });
    await expect(
      startProvisioning('t-1', 'ws-1', [{ stepCode: 'init', label: 'Init', ordinal: 1, isRequired: true }]),
    ).rejects.toThrow('already has an active provisioning run');
  });

  it('throws when steps array is empty (422)', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] }); // no active run
    await expect(startProvisioning('t-1', 'ws-1', [])).rejects.toThrow('Cannot start provisioning with zero steps');
  });

  it('creates a run with in_progress status and pending steps', async () => {
    // getActiveRunId
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    // INSERT run
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // INSERT step 1
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // INSERT step 2
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // getRunSteps
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { step_id: 's1', run_id: 'uuid-prov-001', step_code: 'init', label: 'Init', ordinal: 1, is_required: true, status: 'pending', error_message: null, output_data: {}, started_at: null, completed_at: null, retry_count: 0 },
        { step_id: 's2', run_id: 'uuid-prov-001', step_code: 'seed', label: 'Seed', ordinal: 2, is_required: true, status: 'pending', error_message: null, output_data: {}, started_at: null, completed_at: null, retry_count: 0 },
      ],
    });

    const result = await startProvisioning('t-1', 'ws-1', [
      { stepCode: 'init', label: 'Init', ordinal: 1, isRequired: true },
      { stepCode: 'seed', label: 'Seed', ordinal: 2, isRequired: true },
    ]);

    expect(result.status).toBe('in_progress');
    expect(result.steps).toHaveLength(2);
    expect(result.runId).toBe('uuid-prov-001');
  });
});

describe('WorkspaceProvisioningState — completeStep', () => {
  it('returns null when no active run found', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [] }); // getActiveRunId
    const result = await completeStep('t-1', 'ws-1', 'init', {});
    expect(result).toBeNull();
  });

  it('marks step as completed and returns updated record', async () => {
    // getActiveRunId
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ run_id: 'run-1' }] });
    // UPDATE step
    mockQuery.mockResolvedValueOnce({
      rows: [{
        step_id: 's1', run_id: 'run-1', step_code: 'init', label: 'Init',
        ordinal: 1, is_required: true, status: 'completed', error_message: null,
        output_data: {}, started_at: '2026-04-04', completed_at: '2026-04-04',
        retry_count: 0,
      }],
    });
    // getRunSteps for recalculateRunStatus
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ step_id: 's1', run_id: 'run-1', step_code: 'init', label: 'Init', ordinal: 1, is_required: true, status: 'completed', error_message: null, output_data: {}, started_at: '2026-04-04', completed_at: '2026-04-04', retry_count: 0 }],
    });
    // UPDATE run status
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await completeStep('t-1', 'ws-1', 'init', { outputData: { ok: true } });
    expect(result).not.toBeNull();
    expect(result?.status).toBe('completed');
  });

  it('returns null when step code not found in run', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ run_id: 'run-1' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // no step found
    const result = await completeStep('t-1', 'ws-1', 'nonexistent', {});
    expect(result).toBeNull();
  });
});

describe('WorkspaceProvisioningState — failStep', () => {
  it('returns null when no active run', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [] });
    const result = await failStep('t-1', 'ws-1', 'init', 'Connection timeout');
    expect(result).toBeNull();
  });

  it('marks step as failed with error message', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ run_id: 'run-1' }] });
    mockQuery.mockResolvedValueOnce({
      rows: [{
        step_id: 's1', run_id: 'run-1', step_code: 'init', label: 'Init',
        ordinal: 1, is_required: true, status: 'failed',
        error_message: 'Connection timeout', output_data: {},
        started_at: '2026-04-04', completed_at: '2026-04-04', retry_count: 0,
      }],
    });
    // recalculateRunStatus
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ step_id: 's1', run_id: 'run-1', step_code: 'init', label: 'Init', ordinal: 1, is_required: true, status: 'failed', error_message: 'err', output_data: {}, started_at: null, completed_at: null, retry_count: 0 }],
    });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await failStep('t-1', 'ws-1', 'init', 'Connection timeout');
    expect(result).not.toBeNull();
    expect(result?.status).toBe('failed');
    expect(result?.errorMessage).toBe('Connection timeout');
  });
});

describe('WorkspaceProvisioningState — retryStep', () => {
  it('returns null when no active run', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [] });
    const result = await retryStep('t-1', 'ws-1', 'init');
    expect(result).toBeNull();
  });

  it('throws when step is not in failed state (422)', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ run_id: 'run-1' }] }); // getActiveRunId
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ status: 'completed' }] }); // check status
    await expect(retryStep('t-1', 'ws-1', 'init')).rejects.toThrow("not in 'failed' state");
  });

  it('resets failed step to pending and increments retry count', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ run_id: 'run-1' }] });
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ status: 'failed' }] });
    mockQuery.mockResolvedValueOnce({
      rows: [{
        step_id: 's1', run_id: 'run-1', step_code: 'init', label: 'Init',
        ordinal: 1, is_required: true, status: 'pending', error_message: null,
        output_data: {}, started_at: null, completed_at: null, retry_count: 1,
      }],
    });
    // Update run status back to in_progress
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await retryStep('t-1', 'ws-1', 'init');
    expect(result).not.toBeNull();
    expect(result?.status).toBe('pending');
    expect(result?.retryCount).toBe(1);
  });
});

describe('WorkspaceProvisioningState — isProvisioningComplete', () => {
  it('returns false when no provisioning run exists', async () => {
    const result = await isProvisioningComplete('t-1', 'ws-1');
    expect(result).toBe(false);
  });

  it('returns true when latest run status is completed', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [{ status: 'completed' }] });
    const result = await isProvisioningComplete('t-1', 'ws-1');
    expect(result).toBe(true);
  });

  it('returns false when latest run status is failed', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [{ status: 'failed' }] });
    const result = await isProvisioningComplete('t-1', 'ws-1');
    expect(result).toBe(false);
  });

  it('returns false on error', async () => {
    mockSafeQuery.mockRejectedValue(new Error('db down'));
    const result = await isProvisioningComplete('t-1', 'ws-1');
    expect(result).toBe(false);
  });
});
