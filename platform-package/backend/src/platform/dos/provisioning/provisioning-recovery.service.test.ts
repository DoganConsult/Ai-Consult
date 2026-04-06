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

vi.mock('../../../utils/http-error.util', () => ({
  toErrorMessage: (e: any) => e?.message ?? 'unknown',
}));

vi.mock('../../../utils/db-utils', () => ({
  getFirstRow: (result: any) => result?.rows?.[0] ?? null,
}));

vi.mock('uuid', () => ({
  v4: () => 'uuid-recovery-001',
}));

import {
  detectFailedProvisioningRuns,
  recoverProvisioningRun,
  retryFailedStep,
  rollbackProvisioningRun,
  getRecoveryOptions,
} from './provisioning-recovery.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('ProvisioningRecovery — detectFailedProvisioningRuns', () => {
  it('returns empty array when no failed runs', async () => {
    const result = await detectFailedProvisioningRuns('t-1');
    expect(result).toEqual([]);
  });

  it('returns mapped failed run records', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        job_id: 'run-1', tenant_id: 't-1', status: 'FAILED',
        error_message: 'Schema creation failed', created_at: '2026-04-01',
        updated_at: '2026-04-01', failed_step_code: 'create_schema',
        failed_step_index: 2, stuck_duration_ms: 120000,
      }],
    });
    const runs = await detectFailedProvisioningRuns('t-1');
    expect(runs).toHaveLength(1);
    expect(runs[0].runId).toBe('run-1');
    expect(runs[0].failedStepCode).toBe('create_schema');
    expect(runs[0].stuckDurationMs).toBe(120000);
  });

  it('queries the correct tenant schema', async () => {
    await detectFailedProvisioningRuns('t-1');
    const [sql] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain('"tenant_t-1".provisioning_jobs');
  });

  it('returns empty on error', async () => {
    mockSafeQuery.mockRejectedValue(new Error('db down'));
    const result = await detectFailedProvisioningRuns('t-1');
    expect(result).toEqual([]);
  });
});

describe('ProvisioningRecovery — recoverProvisioningRun (retry)', () => {
  it('retries from the failed step', async () => {
    // Find failed step
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ name: 'seed_data', stage_index: 3 }],
    });
    // Reset step to PENDING
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // Update job to RUNNING
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // logRecoveryAction
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await recoverProvisioningRun('t-1', 'run-1', 'retry');
    expect(result.success).toBe(true);
    expect(result.strategy).toBe('retry');
    expect(result.message).toContain('seed_data');
  });

  it('returns failure when no failed step found for retry', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] }); // no failed step
    const result = await recoverProvisioningRun('t-1', 'run-1', 'retry');
    expect(result.success).toBe(false);
    expect(result.message).toContain('No failed step found');
  });
});

describe('ProvisioningRecovery — recoverProvisioningRun (skip)', () => {
  it('skips the failed step and marks as DONE', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ name: 'optional_step', stage_index: 2 }],
    });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // mark DONE
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // update job
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

    const result = await recoverProvisioningRun('t-1', 'run-1', 'skip');
    expect(result.success).toBe(true);
    expect(result.strategy).toBe('skip');
    expect(result.message).toContain('optional_step');
  });
});

describe('ProvisioningRecovery — retryFailedStep', () => {
  it('resets a specific failed step to PENDING', async () => {
    // Find the step
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ stage_index: 2, status: 'FAILED' }],
    });
    // Reset step
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // Update job
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // Audit log
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await retryFailedStep('t-1', 'run-1', 'seed_data');
    expect(result.success).toBe(true);
    expect(result.message).toContain('seed_data');
  });

  it('returns failure when step not found', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    const result = await retryFailedStep('t-1', 'run-1', 'nonexistent');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Step not found');
  });

  it('returns failure when step is not in failed state', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ stage_index: 2, status: 'DONE' }],
    });
    const result = await retryFailedStep('t-1', 'run-1', 'completed_step');
    expect(result.success).toBe(false);
    expect(result.message).toContain('not in a failed state');
  });
});

describe('ProvisioningRecovery — rollbackProvisioningRun', () => {
  it('rolls back completed steps in reverse order', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { name: 'step_2', stage_index: 2, status: 'DONE' },
        { name: 'step_1', stage_index: 1, status: 'DONE' },
      ],
    });
    // Reset step_2
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // Reset step_1
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // Reset FAILED/RUNNING steps
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // Update job
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // Audit
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await rollbackProvisioningRun('t-1', 'run-1');
    expect(result.success).toBe(true);
    expect(result.strategy).toBe('rollback');
    expect(result.message).toContain('2 completed steps');
  });

  it('handles rollback with no completed steps', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] }); // no completed steps
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // reset failed
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // update job
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

    const result = await rollbackProvisioningRun('t-1', 'run-1');
    expect(result.success).toBe(true);
    expect(result.message).toContain('No completed steps');
  });
});

describe('ProvisioningRecovery — getRecoveryOptions', () => {
  it('returns empty when job not found', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] }); // no job
    const options = await getRecoveryOptions('t-1', 'nonexistent');
    expect(options).toEqual([]);
  });

  it('returns all three strategies for a FAILED run with a failed step', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ status: 'FAILED' }] }); // job
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { name: 'step_1', stage_index: 1, status: 'DONE' },
        { name: 'step_2', stage_index: 2, status: 'FAILED' },
      ],
    }); // steps

    const options = await getRecoveryOptions('t-1', 'run-1');
    expect(options).toHaveLength(3);
    expect(options[0].strategy).toBe('retry');
    expect(options[0].available).toBe(true);
    expect(options[1].strategy).toBe('skip');
    expect(options[1].available).toBe(true);
    expect(options[2].strategy).toBe('rollback');
    expect(options[2].available).toBe(true);
  });
});
