/**
 * Tests for provisioning audit logging patterns.
 * Exercises the audit trail capabilities integrated into the provisioning recovery service.
 */
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
  v4: () => 'uuid-audit-001',
}));

import {
  recoverProvisioningRun,
  retryFailedStep,
  markRunAbandoned,
  rollbackProvisioningRun,
} from './provisioning-recovery.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('ProvisioningAudit — recovery actions create audit trail', () => {
  it('logs retry action in provisioning_audit_log', async () => {
    // Find failed step
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ name: 'step_1', stage_index: 1 }] });
    // Reset step
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // Update job
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // Audit log INSERT
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await recoverProvisioningRun('t-1', 'run-1', 'retry');

    // The 4th safeQuery call should be the audit log insert
    const auditCall = mockSafeQuery.mock.calls[3];
    expect(auditCall[0]).toContain('provisioning_audit_log');
    expect(auditCall[1]).toContain('retry'); // action
  });

  it('logs skip action in provisioning_audit_log', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ name: 'optional', stage_index: 2 }] });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

    await recoverProvisioningRun('t-1', 'run-1', 'skip');

    const auditCall = mockSafeQuery.mock.calls[3];
    expect(auditCall[0]).toContain('provisioning_audit_log');
    expect(auditCall[1]).toContain('skip');
  });

  it('logs rollback action with step count', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ name: 's1', stage_index: 1, status: 'DONE' }],
    });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // reset step
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // reset failed
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // update job
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

    await rollbackProvisioningRun('t-1', 'run-1');

    const auditCall = mockSafeQuery.mock.calls[4];
    expect(auditCall[0]).toContain('provisioning_audit_log');
    expect(auditCall[1]).toContain('rollback');
  });
});

describe('ProvisioningAudit — markRunAbandoned', () => {
  it('marks run as FAILED with abandon message', async () => {
    // Update job
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // Mark pending steps
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 2 });
    // Audit log
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await markRunAbandoned('t-1', 'run-1', 'u-admin', 'No longer needed');
    expect(result.success).toBe(true);
    expect(result.strategy).toBe('abandon');
    expect(result.message).toContain('No longer needed');
  });

  it('records abandoner and reason in audit', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

    await markRunAbandoned('t-1', 'run-1', 'u-admin', 'Cancelled by admin');

    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(params[0]).toContain('ABANDONED by u-admin');
  });

  it('marks pending steps as FAILED/ABANDONED', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 3 });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await markRunAbandoned('t-1', 'run-1', 'u-admin', 'test');

    const [stepSql] = mockSafeQuery.mock.calls[1];
    expect(stepSql).toContain("status = 'FAILED'");
    expect(stepSql).toContain('ABANDONED');
  });

  it('returns failure on database error', async () => {
    mockSafeQuery.mockRejectedValue(new Error('db down'));
    const result = await markRunAbandoned('t-1', 'run-1', 'u-1', 'reason');
    expect(result.success).toBe(false);
  });
});

describe('ProvisioningAudit — retryFailedStep audit trail', () => {
  it('logs retry action for specific step', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ stage_index: 2, status: 'FAILED' }] });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // reset
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // update job
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // audit

    await retryFailedStep('t-1', 'run-1', 'create_schema');

    const auditCall = mockSafeQuery.mock.calls[3];
    expect(auditCall[0]).toContain('provisioning_audit_log');
    expect(auditCall[1]).toContain('create_schema'); // step_code
  });
});
