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

import {
  enforceTenantBoundary,
  validateCrossTenantAccess,
  getTenantBoundaryConfig,
  validateTenantQuota,
  isTenantIsolationEnforced,
  updateTenantBoundaryConfig,
} from './tenant-boundary.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('DOS TenantBoundaryService — enforceTenantBoundary', () => {
  it('does not throw when tenant IDs match', () => {
    expect(() => enforceTenantBoundary('t-1', 't-1')).not.toThrow();
  });

  it('throws on tenant boundary violation', () => {
    expect(() => enforceTenantBoundary('t-1', 't-2')).toThrow('Tenant boundary violation');
  });

  it('includes both tenant IDs in the error message', () => {
    expect(() => enforceTenantBoundary('t-source', 't-target')).toThrow(
      "tenant 't-source' cannot access resources owned by tenant 't-target'",
    );
  });
});

describe('DOS TenantBoundaryService — validateCrossTenantAccess', () => {
  it('returns true for same-tenant access', async () => {
    const result = await validateCrossTenantAccess('t-1', 't-1');
    expect(result).toBe(true);
  });

  it('returns false when no custom config exists (strict defaults)', async () => {
    // Both configs return empty (defaults: strict, no cross-tenant read)
    mockSafeQuery.mockResolvedValue({ rows: [] });
    const result = await validateCrossTenantAccess('t-1', 't-2');
    expect(result).toBe(false);
  });

  it('returns true when both tenants allow cross-read and are mutual partners', async () => {
    const sourceConfig = {
      config: {
        isolation_mode: 'permissive',
        allow_cross_tenant_read: true,
        allow_cross_tenant_write: false,
        allowed_partner_tenant_ids: ['t-2'],
        max_resources_per_type: {},
      },
    };
    const targetConfig = {
      config: {
        isolation_mode: 'permissive',
        allow_cross_tenant_read: true,
        allow_cross_tenant_write: false,
        allowed_partner_tenant_ids: ['t-1'],
        max_resources_per_type: {},
      },
    };
    mockSafeQuery.mockResolvedValueOnce({ rows: [sourceConfig] });
    mockSafeQuery.mockResolvedValueOnce({ rows: [targetConfig] });
    const result = await validateCrossTenantAccess('t-1', 't-2');
    expect(result).toBe(true);
  });

  it('returns false when partnership is not mutual', async () => {
    const sourceConfig = {
      config: {
        isolation_mode: 'permissive',
        allow_cross_tenant_read: true,
        allow_cross_tenant_write: false,
        allowed_partner_tenant_ids: ['t-2'],
        max_resources_per_type: {},
      },
    };
    const targetConfig = {
      config: {
        isolation_mode: 'permissive',
        allow_cross_tenant_read: true,
        allow_cross_tenant_write: false,
        allowed_partner_tenant_ids: [], // does not list t-1
        max_resources_per_type: {},
      },
    };
    mockSafeQuery.mockResolvedValueOnce({ rows: [sourceConfig] });
    mockSafeQuery.mockResolvedValueOnce({ rows: [targetConfig] });
    const result = await validateCrossTenantAccess('t-1', 't-2');
    expect(result).toBe(false);
  });

  it('returns false on error (Law 11: deny by default)', async () => {
    mockSafeQuery.mockRejectedValue(new Error('db down'));
    const result = await validateCrossTenantAccess('t-1', 't-2');
    expect(result).toBe(false);
  });
});

describe('DOS TenantBoundaryService — getTenantBoundaryConfig', () => {
  it('returns strict defaults when no custom config stored', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [] });
    const config = await getTenantBoundaryConfig('t-1');
    expect(config.isolation_mode).toBe('strict');
    expect(config.allow_cross_tenant_read).toBe(false);
    expect(config.allow_cross_tenant_write).toBe(false);
    expect(config.allowed_partner_tenant_ids).toEqual([]);
  });

  it('merges stored config with defaults', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [{
        config: {
          isolation_mode: 'permissive',
          allow_cross_tenant_read: true,
          max_resources_per_type: { users: 1000 },
        },
      }],
    });
    const config = await getTenantBoundaryConfig('t-1');
    expect(config.isolation_mode).toBe('permissive');
    expect(config.allow_cross_tenant_read).toBe(true);
    expect(config.max_resources_per_type.users).toBe(1000);
    // Defaults should fill in missing resource types
    expect(config.max_resources_per_type.policies).toBe(1000);
  });

  it('returns strict defaults on error', async () => {
    mockSafeQuery.mockRejectedValue(new Error('db down'));
    const config = await getTenantBoundaryConfig('t-1');
    expect(config.isolation_mode).toBe('strict');
  });
});

describe('DOS TenantBoundaryService — validateTenantQuota', () => {
  it('allows when no quota defined for resource type', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] }); // no boundary config
    const result = await validateTenantQuota('t-1', 'unknown_resource');
    expect(result.allowed).toBe(true);
    expect(result.max_allowed).toBe(-1);
  });

  it('allows when resource count is below max', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] }); // default config (users: 500)
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ cnt: 100 }] }); // current count
    const result = await validateTenantQuota('t-1', 'users');
    expect(result.allowed).toBe(true);
    expect(result.current_count).toBe(100);
    expect(result.remaining).toBe(400);
  });

  it('denies when resource count equals or exceeds max', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] }); // default config (users: 500)
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ cnt: 500 }] }); // at limit
    const result = await validateTenantQuota('t-1', 'users');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('denies on error (Law 11: deny by default)', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] }); // default config
    mockSafeQuery.mockRejectedValueOnce(new Error('db down')); // count fails
    const result = await validateTenantQuota('t-1', 'users');
    expect(result.allowed).toBe(false);
  });
});

describe('DOS TenantBoundaryService — isTenantIsolationEnforced', () => {
  it('returns true when using strict default', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [] });
    const result = await isTenantIsolationEnforced('t-1');
    expect(result).toBe(true);
  });

  it('returns false when permissive mode is configured', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [{ config: { isolation_mode: 'permissive' } }],
    });
    const result = await isTenantIsolationEnforced('t-1');
    expect(result).toBe(false);
  });
});

describe('DOS TenantBoundaryService — updateTenantBoundaryConfig', () => {
  it('rejects invalid isolation mode', async () => {
    await expect(
      updateTenantBoundaryConfig('t-1', {
        isolation_mode: 'invalid' as any,
        allow_cross_tenant_read: false,
        allow_cross_tenant_write: false,
        allowed_partner_tenant_ids: [],
        max_resources_per_type: {},
      }),
    ).rejects.toThrow('Invalid isolation mode');
  });

  it('rejects cross-tenant access in strict mode', async () => {
    await expect(
      updateTenantBoundaryConfig('t-1', {
        isolation_mode: 'strict',
        allow_cross_tenant_read: true,
        allow_cross_tenant_write: false,
        allowed_partner_tenant_ids: [],
        max_resources_per_type: {},
      }),
    ).rejects.toThrow('Cross-tenant access cannot be enabled in strict isolation mode');
  });

  it('rejects write without read access', async () => {
    await expect(
      updateTenantBoundaryConfig('t-1', {
        isolation_mode: 'permissive',
        allow_cross_tenant_read: false,
        allow_cross_tenant_write: true,
        allowed_partner_tenant_ids: [],
        max_resources_per_type: {},
      }),
    ).rejects.toThrow('Cross-tenant write access requires cross-tenant read access');
  });
});
