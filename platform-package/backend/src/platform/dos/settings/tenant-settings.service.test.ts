/**
 * Tests for tenant-level settings management via settings-resolver.
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
  detectScopeAmbiguities,
  type SettingsContext,
} from './settings-resolver.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('TenantSettings — getTenantSetting', () => {
  it('returns undefined when tenant setting not found', async () => {
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'tenant' };
    const result = await getSetting(ctx, 'security.mfa_required');
    expect(result).toBeUndefined();
  });

  it('returns boolean setting value', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ key: 'security.mfa_required', value: 'true' }],
    });
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'tenant' };
    const result = await getSetting(ctx, 'security.mfa_required');
    expect(result).toBe(true);
  });

  it('returns numeric setting value', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ key: 'session.timeout_minutes', value: '30' }],
    });
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'tenant' };
    const result = await getSetting(ctx, 'session.timeout_minutes');
    expect(result).toBe(30);
  });

  it('returns object setting value', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ key: 'branding', value: '{"primaryColor":"#007bff","logo":"/logo.png"}' }],
    });
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'tenant' };
    const result = await getSetting(ctx, 'branding');
    expect(result).toEqual({ primaryColor: '#007bff', logo: '/logo.png' });
  });
});

describe('TenantSettings — setTenantSetting', () => {
  it('inserts or updates a tenant setting', async () => {
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'tenant' };
    await upsertSetting(ctx, 'security.mfa_required', true);

    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain('INSERT INTO "tenant_t1".tenant_settings');
    expect(sql).toContain('ON CONFLICT (key) DO UPDATE');
    expect(params[0]).toBe('security.mfa_required');
    expect(params[1]).toBe('true'); // serialized
  });

  it('stores string values as-is', async () => {
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'tenant' };
    await upsertSetting(ctx, 'display.welcome_message', 'Hello!');

    const [, params] = mockSafeQuery.mock.calls[0];
    expect(params[1]).toBe('Hello!');
  });

  it('serializes array values as JSON', async () => {
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'tenant' };
    await upsertSetting(ctx, 'allowed_domains', ['acme.com', 'test.com']);

    const [, params] = mockSafeQuery.mock.calls[0];
    expect(params[1]).toBe('["acme.com","test.com"]');
  });
});

describe('TenantSettings — resetToDefault (by deleting override)', () => {
  it('removing a workspace override restores tenant default via inheritance', async () => {
    // Simulating: workspace override gone -> falls through to tenant
    // First query for workspace scope: not found
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    // Second query for tenant scope: found
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ key: 'theme.mode', value: '"light"' }],
    });

    const { resolveSettingWithInheritance } = await import('./settings-resolver.service');
    const result = await resolveSettingWithInheritance(
      'tenant_t1', 'theme.mode', { workspaceId: 'ws-1' },
    );

    expect(result?.value).toBe('light');
    expect(result?.resolvedScope).toBe('tenant');
  });
});

describe('TenantSettings — importSettings (batch upsert)', () => {
  it('upserts multiple settings in sequence', async () => {
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'tenant' };
    const settings = [
      { key: 'security.mfa_required', value: true },
      { key: 'session.timeout_minutes', value: 30 },
      { key: 'branding.primary_color', value: '#007bff' },
    ];

    for (const setting of settings) {
      await upsertSetting(ctx, setting.key, setting.value);
    }

    expect(mockSafeQuery).toHaveBeenCalledTimes(3);
    // Verify each call was an upsert
    for (const call of mockSafeQuery.mock.calls) {
      expect(call[0]).toContain('ON CONFLICT');
    }
  });
});

describe('TenantSettings — getSettingsForScope (list all)', () => {
  it('returns all tenant-scope settings', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [
        { key: 'security.mfa_required', value: 'true', scope: 'tenant', product_key: null, module_code: null, workspace_id: null, owner_user_id: null },
        { key: 'session.timeout_minutes', value: '30', scope: 'tenant', product_key: null, module_code: null, workspace_id: null, owner_user_id: null },
      ],
    });
    const ctx: SettingsContext = { schema: 'tenant_t1', scope: 'tenant' };
    const all = await getSettingsForScope(ctx);
    expect(all).toHaveLength(2);
    expect(all[0].key).toBe('security.mfa_required');
    expect(all[0].value).toBe(true); // parsed from 'true'
  });
});

describe('TenantSettings — detectScopeAmbiguities', () => {
  it('detects module-scoped setting without module_code', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [
        { key: 'bad_setting', scope: 'module', module_code: null, product_key: null, workspace_id: null, owner_user_id: null },
      ],
    });
    const errors = await detectScopeAmbiguities('tenant_t1');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("scope=module but no module_code");
  });

  it('detects workspace-scoped setting without workspace_id', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [
        { key: 'bad_ws', scope: 'workspace', module_code: null, product_key: null, workspace_id: null, owner_user_id: null },
      ],
    });
    const errors = await detectScopeAmbiguities('tenant_t1');
    expect(errors[0]).toContain("scope=workspace but no workspace_id");
  });

  it('returns empty when all settings are valid', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [
        { key: 'valid', scope: 'tenant', module_code: null, product_key: null, workspace_id: null, owner_user_id: null },
      ],
    });
    const errors = await detectScopeAmbiguities('tenant_t1');
    expect(errors).toEqual([]);
  });
});
