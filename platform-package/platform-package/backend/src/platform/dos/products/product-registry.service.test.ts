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

import {
  registerProduct,
  getProduct,
  deprecateProduct,
  isProductAvailable,
  listProducts,
  getProductModules,
} from './product-registry.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('ProductRegistry — registerProduct', () => {
  it('inserts product and returns mapped definition', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        code: 'shahin-ai', name: 'Shahin AI', description: 'GRC platform',
        version: '1.0.0', default_tier: 'enterprise', is_active: true,
        metadata: {}, created_at: new Date(), updated_at: new Date(),
      }],
    });
    // DELETE old module links
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // INSERT module link
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await registerProduct({
      code: 'shahin-ai', name: 'Shahin AI', description: 'GRC platform',
      version: '1.0.0', defaultTier: 'enterprise', isActive: true,
      modules: ['risk'], metadata: {}, createdAt: null, updatedAt: null,
    });

    expect(result.code).toBe('shahin-ai');
    expect(result.name).toBe('Shahin AI');
    expect(result.isActive).toBe(true);
  });

  it('uses ON CONFLICT for upsert', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        code: 'test', name: 'Test', description: '', version: '1.0.0',
        default_tier: 'standard', is_active: true, metadata: {},
        created_at: null, updated_at: null,
      }],
    });

    await registerProduct({
      code: 'test', name: 'Test', description: '', version: '1.0.0',
      defaultTier: 'standard', isActive: true, modules: [], metadata: {},
      createdAt: null, updatedAt: null,
    });

    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain('ON CONFLICT (code) DO UPDATE');
  });

  it('throws on database error', async () => {
    mockQuery.mockRejectedValue(new Error('db down'));
    await expect(
      registerProduct({
        code: 'fail', name: 'Fail', description: '', version: '1.0.0',
        defaultTier: 'standard', isActive: true, modules: [], metadata: {},
        createdAt: null, updatedAt: null,
      }),
    ).rejects.toThrow('db down');
  });
});

describe('ProductRegistry — getProduct', () => {
  it('returns null when product not found', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await getProduct('nonexistent');
    expect(result).toBeNull();
  });

  it('returns mapped product with modules', async () => {
    mockQuery.mockResolvedValue({
      rows: [{
        code: 'shahin-ai', name: 'Shahin AI', description: 'GRC',
        version: '2.0.0', default_tier: 'enterprise', is_active: true,
        metadata: {}, created_at: new Date(), updated_at: new Date(),
        modules: ['risk', 'compliance', 'audit'],
      }],
    });

    const result = await getProduct('shahin-ai');
    expect(result).not.toBeNull();
    expect(result?.code).toBe('shahin-ai');
    expect(result?.modules).toContain('risk');
    expect(result?.modules).toHaveLength(3);
  });

  it('returns null on database error', async () => {
    mockQuery.mockRejectedValue(new Error('db down'));
    const result = await getProduct('shahin-ai');
    expect(result).toBeNull();
  });
});

describe('ProductRegistry — deprecateProduct', () => {
  it('sets is_active to false and records deprecation metadata', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // UPDATE
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // INSERT deprecation

    await deprecateProduct('old-product', 'u-admin', '2027-01-01', 'new-product');

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('is_active = FALSE');
    expect(sql).toContain('deprecated');
    expect(params[0]).toBe('old-product');
    expect(params[2]).toBe('2027-01-01');
    expect(params[3]).toBe('new-product');
  });

  it('records deprecation in audit trail', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await deprecateProduct('old-product', 'u-admin', '2027-01-01');

    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain('product_deprecations');
    expect(params[0]).toBe('old-product');
  });

  it('throws on database error', async () => {
    mockQuery.mockRejectedValue(new Error('db down'));
    await expect(
      deprecateProduct('fail', 'u-1', '2027-01-01'),
    ).rejects.toThrow('db down');
  });
});

describe('ProductRegistry — isProductAvailable', () => {
  it('returns false when product not found', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await isProductAvailable('nonexistent');
    expect(result).toBe(false);
  });

  it('returns true when product is active and not deprecated', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ is_active: true, deprecated: 'false', removal_date: null }],
    });
    const result = await isProductAvailable('shahin-ai');
    expect(result).toBe(true);
  });

  it('returns false when product is inactive', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ is_active: false, deprecated: 'false', removal_date: null }],
    });
    const result = await isProductAvailable('old-product');
    expect(result).toBe(false);
  });

  it('returns false when deprecated and past removal date', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ is_active: true, deprecated: 'true', removal_date: '2020-01-01' }],
    });
    const result = await isProductAvailable('expired-product');
    expect(result).toBe(false);
  });

  it('returns true when deprecated but before removal date', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ is_active: true, deprecated: 'true', removal_date: '2099-01-01' }],
    });
    const result = await isProductAvailable('soon-deprecated');
    expect(result).toBe(true);
  });

  it('returns false on database error', async () => {
    mockQuery.mockRejectedValue(new Error('db down'));
    const result = await isProductAvailable('shahin-ai');
    expect(result).toBe(false);
  });
});

describe('ProductRegistry — listProducts', () => {
  it('returns empty array when no products', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await listProducts();
    expect(result).toEqual([]);
  });

  it('applies isActive filter', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await listProducts({ isActive: true });
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('pp.is_active = $1');
    expect(params[0]).toBe(true);
  });

  it('returns empty on error', async () => {
    mockQuery.mockRejectedValue(new Error('db down'));
    const result = await listProducts();
    expect(result).toEqual([]);
  });
});

describe('ProductRegistry — getProductModules', () => {
  it('returns module codes for product', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ module_code: 'risk' }, { module_code: 'compliance' }],
    });
    const result = await getProductModules('shahin-ai');
    expect(result).toEqual(['risk', 'compliance']);
  });

  it('returns empty array on error', async () => {
    mockQuery.mockRejectedValue(new Error('db down'));
    const result = await getProductModules('shahin-ai');
    expect(result).toEqual([]);
  });
});
