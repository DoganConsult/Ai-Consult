/**
 * Tests for product composition scenarios.
 * Since no dedicated product-composition.service.ts exists, these tests
 * exercise product registry composition patterns via product-registry.service.ts
 * and product-entitlement.service.ts integration scenarios.
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

import {
  getProduct,
  getProductModules,
  getProductDependencies,
  isProductAvailable,
} from './product-registry.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('ProductComposition — product bundle resolution', () => {
  it('resolves product with all its module codes', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ module_code: 'risk' }, { module_code: 'compliance' }, { module_code: 'audit' }],
    });
    const modules = await getProductModules('shahin-ai');
    expect(modules).toEqual(['risk', 'compliance', 'audit']);
    expect(modules).toHaveLength(3);
  });

  it('returns empty module list for product with no modules', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const modules = await getProductModules('minimal-product');
    expect(modules).toEqual([]);
  });
});

describe('ProductComposition — product compatibility', () => {
  it('validates product availability before composition', async () => {
    // Product exists and is active
    mockQuery.mockResolvedValue({
      rows: [{ is_active: true, deprecated: 'false', removal_date: null }],
    });
    const available = await isProductAvailable('shahin-ai');
    expect(available).toBe(true);
  });

  it('rejects unavailable product in composition', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const available = await isProductAvailable('nonexistent');
    expect(available).toBe(false);
  });

  it('rejects deprecated product past removal date', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ is_active: true, deprecated: 'true', removal_date: '2020-01-01' }],
    });
    const available = await isProductAvailable('old-product');
    expect(available).toBe(false);
  });
});

describe('ProductComposition — resolving product features', () => {
  it('loads product definition with full metadata', async () => {
    mockQuery.mockResolvedValue({
      rows: [{
        code: 'shahin-ai', name: 'Shahin AI', description: 'Full GRC suite',
        version: '3.0.0', default_tier: 'enterprise', is_active: true,
        metadata: { features: ['ai_assist', 'automation'] },
        created_at: new Date(), updated_at: new Date(),
        modules: ['risk', 'compliance'],
      }],
    });
    const product = await getProduct('shahin-ai');
    expect(product).not.toBeNull();
    expect(product?.metadata).toHaveProperty('features');
  });

  it('handles product with empty metadata gracefully', async () => {
    mockQuery.mockResolvedValue({
      rows: [{
        code: 'basic', name: 'Basic', description: '',
        version: '1.0.0', default_tier: 'standard', is_active: true,
        metadata: {}, created_at: null, updated_at: null, modules: [],
      }],
    });
    const product = await getProduct('basic');
    expect(product).not.toBeNull();
    expect(product?.metadata).toEqual({});
  });
});

describe('ProductComposition — dependency graph', () => {
  it('resolves product dependencies', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { product_code: 'shahin-ai', depends_on: 'base-platform', type: 'required' },
        { product_code: 'shahin-ai', depends_on: 'ai-engine', type: 'optional' },
      ],
    });
    const deps = await getProductDependencies('shahin-ai');
    expect(deps).toHaveLength(2);
    expect(deps[0].type).toBe('required');
    expect(deps[1].type).toBe('optional');
  });

  it('returns empty dependency list for standalone product', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const deps = await getProductDependencies('standalone');
    expect(deps).toEqual([]);
  });

  it('returns empty on error', async () => {
    mockQuery.mockRejectedValue(new Error('db down'));
    const deps = await getProductDependencies('shahin-ai');
    expect(deps).toEqual([]);
  });
});
