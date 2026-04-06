import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: any[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('../observability/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../utils/http-error.util', () => ({
  toErrorMessage: (e: any) => e?.message ?? 'unknown',
}));

vi.mock('crypto', () => ({
  randomUUID: () => 'uuid-trans-001',
}));

import {
  getTenantStatus,
  activateTenant,
  suspendTenant,
  reactivateTenant,
  decommissionTenant,
  canTransitionTo,
  getTenantStatusHistory,
} from './tenant-status.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('DOS TenantStatusService — getTenantStatus', () => {
  it('returns null when tenant not found', async () => {
    const result = await getTenantStatus('t-missing');
    expect(result).toBeNull();
  });

  it('returns status record when tenant exists', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [{
        tenant_id: 't-1', status: 'active',
        last_transition_at: '2026-01-01', last_transition_by: 'u-1',
        last_transition_reason: 'activated',
      }],
    });
    const result = await getTenantStatus('t-1');
    expect(result).not.toBeNull();
    expect(result?.status).toBe('active');
  });
});

describe('DOS TenantStatusService — activateTenant', () => {
  it('transitions from provisioning to active', async () => {
    // getTenantStatus for validation
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ tenant_id: 't-1', status: 'provisioning', last_transition_at: '', last_transition_by: null, last_transition_reason: null }],
    });
    // UPDATE tenant status
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // INSERT transition audit record
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // getTenantStatus after transition
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ tenant_id: 't-1', status: 'active', last_transition_at: '2026-04-04', last_transition_by: 'u-admin', last_transition_reason: 'Tenant activated' }],
    });

    const result = await activateTenant('t-1', 'u-admin');
    expect(result.status).toBe('active');
  });

  it('throws when tenant not found', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [] });
    await expect(activateTenant('t-missing', 'u-1')).rejects.toThrow("Tenant 't-missing' not found");
  });
});

describe('DOS TenantStatusService — suspendTenant', () => {
  it('requires a reason for suspension', async () => {
    await expect(suspendTenant('t-1', '', 'u-1')).rejects.toThrow('Suspension reason is required');
  });

  it('transitions active tenant to suspended', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ tenant_id: 't-1', status: 'active', last_transition_at: '', last_transition_by: null, last_transition_reason: null }],
    });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ tenant_id: 't-1', status: 'suspended', last_transition_at: '', last_transition_by: 'u-admin', last_transition_reason: 'Non-payment' }],
    });

    const result = await suspendTenant('t-1', 'Non-payment', 'u-admin');
    expect(result.status).toBe('suspended');
  });
});

describe('DOS TenantStatusService — reactivateTenant', () => {
  it('transitions from suspended to active', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ tenant_id: 't-1', status: 'suspended', last_transition_at: '', last_transition_by: null, last_transition_reason: null }],
    });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ tenant_id: 't-1', status: 'active', last_transition_at: '', last_transition_by: 'u-admin', last_transition_reason: 'Reactivated' }],
    });

    const result = await reactivateTenant('t-1', 'u-admin');
    expect(result.status).toBe('active');
  });
});

describe('DOS TenantStatusService — invalid transitions', () => {
  it('rejects transition from decommissioned (terminal state)', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ tenant_id: 't-1', status: 'decommissioned', last_transition_at: '', last_transition_by: null, last_transition_reason: null }],
    });
    await expect(reactivateTenant('t-1', 'u-1')).rejects.toThrow('Invalid status transition');
  });

  it('rejects provisioning to suspended (not allowed)', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ tenant_id: 't-1', status: 'provisioning', last_transition_at: '', last_transition_by: null, last_transition_reason: null }],
    });
    await expect(suspendTenant('t-1', 'test reason', 'u-1')).rejects.toThrow('Invalid status transition');
  });
});

describe('DOS TenantStatusService — canTransitionTo', () => {
  it('returns true for valid transition (provisioning -> active)', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [{ tenant_id: 't-1', status: 'provisioning', last_transition_at: '', last_transition_by: null, last_transition_reason: null }],
    });
    const result = await canTransitionTo('t-1', 'active');
    expect(result).toBe(true);
  });

  it('returns false for invalid transition (provisioning -> suspended)', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [{ tenant_id: 't-1', status: 'provisioning', last_transition_at: '', last_transition_by: null, last_transition_reason: null }],
    });
    const result = await canTransitionTo('t-1', 'suspended');
    expect(result).toBe(false);
  });

  it('returns false when tenant not found', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [] });
    const result = await canTransitionTo('t-missing', 'active');
    expect(result).toBe(false);
  });

  it('returns false on error (Law 11: deny by default)', async () => {
    mockSafeQuery.mockRejectedValue(new Error('db down'));
    const result = await canTransitionTo('t-1', 'active');
    expect(result).toBe(false);
  });
});

describe('DOS TenantStatusService — getTenantStatusHistory', () => {
  it('returns empty array when no history', async () => {
    const result = await getTenantStatusHistory('t-1');
    expect(result).toEqual([]);
  });

  it('returns ordered transition records', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [
        { transition_id: 'tr-1', tenant_id: 't-1', from_status: 'provisioning', to_status: 'active', transitioned_by: 'u-1', reason: 'activated', transitioned_at: '2026-01-01' },
        { transition_id: 'tr-2', tenant_id: 't-1', from_status: 'active', to_status: 'suspended', transitioned_by: 'u-2', reason: 'non-payment', transitioned_at: '2026-02-01' },
      ],
    });
    const result = await getTenantStatusHistory('t-1');
    expect(result).toHaveLength(2);
    expect(result[0].from_status).toBe('provisioning');
  });
});
