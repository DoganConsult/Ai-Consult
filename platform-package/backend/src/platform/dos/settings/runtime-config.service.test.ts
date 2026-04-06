/**
 * Tests for runtime configuration resolution using the settings-resolver service.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: any[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('../observability/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../utils/http-error.util', () => ({
  toErrorMessage: (e: any) => e?.message ?? 'unknown',
}));

vi.mock('../../../utils/db-utils', () => ({
  getFirstRow: (result: any) => result?.rows?.[0] ?? null,
}));

import {
  getSetting,
  upsertSetting,
  getSettingsForScope,
  resolveSettingWithInheritance,
  validateScopeContext,
  type SettingsContext,
} from './settings-resolver.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('RuntimeConfig — getSetting', () => {
  it('returns undefined when setting not found', async () => {
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'tenant' };
    const result = await getSetting(ctx, 'nonexistent.key');
    expect(result).toBeUndefined();
  });

  it('returns the value when setting exists', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ key: 'theme.mode', value: '"dark"' }],
    });
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'tenant' };
    const result = await getSetting(ctx, 'theme.mode');
    expect(result).toBe('dark');
  });

  it('parses JSON values correctly', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ key: 'features.list', value: '["ai","automation"]' }],
    });
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'tenant' };
    const result = await getSetting(ctx, 'features.list');
    expect(result).toEqual(['ai', 'automation']);
  });

  it('returns plain string when not valid JSON', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ key: 'app.name', value: 'Shahin-AI' }],
    });
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'tenant' };
    const result = await getSetting(ctx, 'app.name');
    expect(result).toBe('Shahin-AI');
  });
});

describe('RuntimeConfig — upsertSetting (setRuntimeConfig)', () => {
  it('upserts a setting value', async () => {
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'tenant' };
    await upsertSetting(ctx, 'theme.mode', 'dark');

    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain('INSERT INTO');
    expect(sql).toContain('ON CONFLICT');
    expect(params[0]).toBe('theme.mode');
    expect(params[1]).toBe('dark');
  });

  it('serializes object values as JSON', async () => {
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'tenant' };
    await upsertSetting(ctx, 'limits', { maxUsers: 100 });

    const [, params] = mockSafeQuery.mock.calls[0];
    expect(params[1]).toBe('{"maxUsers":100}');
  });

  it('throws when module scope lacks moduleCode', () => {
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'module' };
    expect(() => validateScopeContext(ctx)).toThrow('module-scoped setting requires moduleCode');
  });

  it('throws when product scope lacks productKey', () => {
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'product' };
    expect(() => validateScopeContext(ctx)).toThrow('product-scoped setting requires productKey');
  });

  it('throws when workspace scope lacks workspaceId', () => {
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'workspace' };
    expect(() => validateScopeContext(ctx)).toThrow('workspace-scoped setting requires workspaceId');
  });

  it('throws when user scope lacks ownerUserId', () => {
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'user' };
    expect(() => validateScopeContext(ctx)).toThrow('user-scoped setting requires ownerUserId');
  });
});

describe('RuntimeConfig — getSettingsForScope', () => {
  it('returns all settings for a given scope', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [
        { key: 'theme.mode', value: '"dark"', scope: 'tenant', product_key: null, module_code: null, workspace_id: null, owner_user_id: null },
        { key: 'locale', value: '"en"', scope: 'tenant', product_key: null, module_code: null, workspace_id: null, owner_user_id: null },
      ],
    });
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'tenant' };
    const results = await getSettingsForScope(ctx);
    expect(results).toHaveLength(2);
    expect(results[0].key).toBe('theme.mode');
  });

  it('returns empty array when no settings exist', async () => {
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'tenant' };
    const results = await getSettingsForScope(ctx);
    expect(results).toEqual([]);
  });
});

describe('RuntimeConfig — resolveSettingWithInheritance', () => {
  it('resolves setting from the most specific scope', async () => {
    // User-scoped match
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ key: 'theme.mode', value: '"dark"' }],
    });
    const result = await resolveSettingWithInheritance(
      'tenant_t1', 'theme.mode', { ownerUserId: 'u-1' },
    );
    expect(result).not.toBeUndefined();
    expect(result?.value).toBe('dark');
    expect(result?.resolvedScope).toBe('user');
  });

  it('falls back to tenant scope when user scope has no value', async () => {
    // User scope: not found
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    // Tenant scope: found
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ key: 'theme.mode', value: '"light"' }],
    });
    const result = await resolveSettingWithInheritance(
      'tenant_t1', 'theme.mode', { ownerUserId: 'u-1' },
    );
    expect(result?.value).toBe('light');
    expect(result?.resolvedScope).toBe('tenant');
  });

  it('returns undefined when setting not found at any scope', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [] });
    const result = await resolveSettingWithInheritance(
      'tenant_t1', 'nonexistent', {},
    );
    expect(result).toBeUndefined();
  });
});

describe('RuntimeConfig — validateConfigValue', () => {
  it('validates scope context for module setting', () => {
    expect(() =>
      validateScopeContext({ schema: 's', scope: 'module', moduleCode: 'risk' }),
    ).not.toThrow();
  });

  it('validates scope context for product setting', () => {
    expect(() =>
      validateScopeContext({ schema: 's', scope: 'product', productKey: 'shahin-ai' }),
    ).not.toThrow();
  });
});
