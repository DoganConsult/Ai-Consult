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

vi.mock('crypto', () => ({
  randomUUID: () => 'uuid-fixed-001',
}));

import {
  getTenant,
  createTenant,
  listTenants,
  validateTenantAccess,
  getTenantBySlug,
  deleteTenant,
} from './tenant.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('DOS TenantService — getTenant', () => {
  it('returns null when tenant not found', async () => {
    const result = await getTenant('t-missing');
    expect(result).toBeNull();
  });

  it('returns tenant record when found', async () => {
    const row = {
      tenant_id: 't-1', name: 'Acme', slug: 'acme', status: 'active',
      plan: 'enterprise', domain: 'acme.com', logo_url: null,
      config: {}, owner_user_id: 'u-1', created_at: '2026-01-01',
      updated_at: '2026-01-02', deleted_at: null, activated_at: '2026-01-01',
      metadata: {},
    };
    mockSafeQuery.mockResolvedValue({ rows: [row] });
    const result = await getTenant('t-1');
    expect(result).toEqual(row);
  });

  it('queries dos.tenants with tenant_id parameter', async () => {
    await getTenant('t-999');
    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain('dos.tenants');
    expect(sql).toContain('tenant_id = $1');
    expect(params).toEqual(['t-999']);
  });

  it('returns null on database error (deny by default)', async () => {
    mockSafeQuery.mockRejectedValue(new Error('db down'));
    const result = await getTenant('t-1');
    expect(result).toBeNull();
  });
});

describe('DOS TenantService — createTenant', () => {
  it('throws when slug is already in use', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ tenant_id: 'existing' }] });
    await expect(
      createTenant({ name: 'Test', slug: 'taken-slug', ownerUserId: 'u-1' }),
    ).rejects.toThrow("Tenant slug 'taken-slug' is already in use");
  });

  it('creates tenant with provisioning status and returns record', async () => {
    // Slug uniqueness check: no existing
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    // INSERT
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // getTenant after create
    const tenantRow = {
      tenant_id: 'uuid-fixed-001', name: 'NewCo', slug: 'newco',
      status: 'provisioning', plan: 'starter', domain: null, logo_url: null,
      config: {}, owner_user_id: 'u-1', created_at: '2026-04-04',
      updated_at: '2026-04-04', deleted_at: null, activated_at: null, metadata: {},
    };
    mockSafeQuery.mockResolvedValueOnce({ rows: [tenantRow] });

    const result = await createTenant({ name: 'NewCo', slug: 'newco', ownerUserId: 'u-1' });
    expect(result.status).toBe('provisioning');
    expect(result.plan).toBe('starter');
    expect(result.name).toBe('NewCo');
  });

  it('inserts with default plan when not specified', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ tenant_id: 'uuid-fixed-001', status: 'provisioning', plan: 'starter' }] });

    await createTenant({ name: 'X', slug: 'x', ownerUserId: 'u-1' });
    const insertCall = mockSafeQuery.mock.calls[1];
    const params = insertCall[1];
    expect(params[3]).toBe('starter'); // plan param
  });
});

describe('DOS TenantService — listTenants', () => {
  it('returns empty data and zero total when no tenants', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: 0 }] });
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    const result = await listTenants();
    expect(result).toEqual({ data: [], total: 0 });
  });

  it('applies status filter', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: 1 }] });
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ tenant_id: 't-1' }] });
    await listTenants({ status: 'active' });
    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain('status = $1');
    expect(params).toEqual(['active']);
  });

  it('applies search term with ILIKE', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: 1 }] });
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    await listTenants({ searchTerm: 'acme' });
    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain('ILIKE');
    expect(params).toContain('%acme%');
  });

  it('excludes deleted tenants', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: 0 }] });
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    await listTenants();
    const [sql] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain("status != 'deleted'");
  });

  it('caps limit at 500', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: 0 }] });
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    await listTenants({ limit: 9999 });
    const [sql] = mockSafeQuery.mock.calls[1];
    expect(sql).toContain('LIMIT 500');
  });

  it('returns empty on database error', async () => {
    mockSafeQuery.mockRejectedValue(new Error('db down'));
    const result = await listTenants();
    expect(result).toEqual({ data: [], total: 0 });
  });
});

describe('DOS TenantService — validateTenantAccess', () => {
  it('returns false when tenant not found', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [] });
    const result = await validateTenantAccess('t-missing', 'u-1');
    expect(result).toBe(false);
  });

  it('returns true when user is the tenant owner', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ tenant_id: 't-1', status: 'active', owner_user_id: 'u-owner' }],
    });
    const result = await validateTenantAccess('t-1', 'u-owner');
    expect(result).toBe(true);
  });

  it('returns true when user has active membership', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ tenant_id: 't-1', status: 'active', owner_user_id: 'u-other' }],
    });
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ membership_id: 'm-1' }],
    });
    const result = await validateTenantAccess('t-1', 'u-member');
    expect(result).toBe(true);
  });

  it('returns false when user has no membership (Law 11)', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ tenant_id: 't-1', status: 'active', owner_user_id: 'u-other' }],
    });
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    const result = await validateTenantAccess('t-1', 'u-stranger');
    expect(result).toBe(false);
  });

  it('returns false on error (Law 11: deny by default)', async () => {
    mockSafeQuery.mockRejectedValue(new Error('db down'));
    const result = await validateTenantAccess('t-1', 'u-1');
    expect(result).toBe(false);
  });
});

describe('DOS TenantService — getTenantBySlug', () => {
  it('returns null when slug not found', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [] });
    const result = await getTenantBySlug('nonexistent');
    expect(result).toBeNull();
  });

  it('returns tenant record when slug matches', async () => {
    const row = { tenant_id: 't-1', slug: 'acme', status: 'active' };
    mockSafeQuery.mockResolvedValue({ rows: [row] });
    const result = await getTenantBySlug('acme');
    expect(result).not.toBeNull();
    expect(result?.slug).toBe('acme');
  });
});

describe('DOS TenantService — deleteTenant', () => {
  it('soft-deletes tenant and returns deleted: true', async () => {
    mockSafeQuery.mockResolvedValue({ rowCount: 1 });
    const result = await deleteTenant('t-1');
    expect(result.deleted).toBe(true);
  });

  it('returns deleted: false when tenant not found', async () => {
    mockSafeQuery.mockResolvedValue({ rowCount: 0 });
    const result = await deleteTenant('t-missing');
    expect(result.deleted).toBe(false);
  });
});
