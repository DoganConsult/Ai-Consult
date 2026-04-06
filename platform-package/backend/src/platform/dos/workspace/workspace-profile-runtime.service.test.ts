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
  resolveWorkspaceProfile,
  getEffectiveFeatures,
  getWorkspaceModules,
  invalidateProfileCache,
  getWorkspaceTheme,
} from './workspace-profile-runtime.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  // Clear the internal profile cache between tests
  invalidateProfileCache('t-1', 'ws-1');
  invalidateProfileCache('t-1', 'ws-2');
});

describe('WorkspaceProfileRuntime — resolveWorkspaceProfile', () => {
  it('returns null when workspace not found in either table', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [] });
    const result = await resolveWorkspaceProfile('t-1', 'ws-missing');
    expect(result).toBeNull();
  });

  it('resolves profile from workspace_profiles table', async () => {
    // workspace_profiles query
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        workspace_id: 'ws-1', tenant_id: 't-1', display_name: 'Main WS',
        description: 'Primary workspace', locale: 'en', timezone: 'UTC',
        metadata: {}, updated_at: '2026-04-04',
      }],
    });
    // getWorkspaceModules: workspace_modules
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ module_code: 'risk' }, { module_code: 'compliance' }] });
    // getEffectiveFeatures: tenant flags
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ feature_key: 'ai_assist', enabled: true }] });
    // getEffectiveFeatures: workspace overrides
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    // getWorkspaceTheme: workspace theme
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    // getWorkspaceTheme: tenant branding
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    // getWorkspaceCapabilities: product caps
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    // getWorkspaceCapabilities: module caps (needs workspace modules again)
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ module_code: 'risk' }, { module_code: 'compliance' }] });
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ capability_code: 'risk.assess' }] });
    // getWorkspaceCapabilities: workspace overrides
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });

    const profile = await resolveWorkspaceProfile('t-1', 'ws-1');
    expect(profile).not.toBeNull();
    expect(profile?.displayName).toBe('Main WS');
    expect(profile?.enabledModules).toContain('risk');
  });

  it('falls back to workspaces table when no profile record', async () => {
    // workspace_profiles: not found
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    // workspaces fallback
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ workspace_id: 'ws-2', tenant_id: 't-1', name: 'Fallback WS', settings: {}, created_at: '2026-01-01' }],
    });
    // All subsequent queries return empty
    mockSafeQuery.mockResolvedValue({ rows: [] });

    const profile = await resolveWorkspaceProfile('t-1', 'ws-2');
    expect(profile).not.toBeNull();
    expect(profile?.displayName).toBe('Fallback WS');
  });

  it('returns null on error', async () => {
    mockSafeQuery.mockRejectedValue(new Error('db down'));
    const result = await resolveWorkspaceProfile('t-1', 'ws-1');
    expect(result).toBeNull();
  });
});

describe('WorkspaceProfileRuntime — getEffectiveFeatures', () => {
  it('returns empty features when no flags exist', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [] });
    const features = await getEffectiveFeatures('t-1', 'ws-1');
    expect(features).toEqual({});
  });

  it('merges tenant flags with workspace overrides', async () => {
    // Tenant flags
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { feature_key: 'ai_assist', enabled: true },
        { feature_key: 'dark_mode', enabled: false },
      ],
    });
    // Workspace overrides
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ feature_key: 'dark_mode', enabled: true }],
    });
    const features = await getEffectiveFeatures('t-1', 'ws-1');
    expect(features.ai_assist).toBe(true);
    expect(features.dark_mode).toBe(true); // overridden
  });

  it('workspace override takes precedence over tenant flag', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ feature_key: 'beta', enabled: true }],
    });
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ feature_key: 'beta', enabled: false }],
    });
    const features = await getEffectiveFeatures('t-1', 'ws-1');
    expect(features.beta).toBe(false);
  });
});

describe('WorkspaceProfileRuntime — getWorkspaceModules', () => {
  it('returns workspace-specific modules when available', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ module_code: 'risk' }, { module_code: 'audit' }],
    });
    const modules = await getWorkspaceModules('t-1', 'ws-1');
    expect(modules).toEqual(['risk', 'audit']);
  });

  it('falls back to tenant-level modules when no workspace modules', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] }); // no workspace modules
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ module_code: 'compliance' }, { module_code: 'evidence' }],
    });
    const modules = await getWorkspaceModules('t-1', 'ws-1');
    expect(modules).toEqual(['compliance', 'evidence']);
  });

  it('returns empty array on error', async () => {
    mockSafeQuery.mockRejectedValue(new Error('db down'));
    const modules = await getWorkspaceModules('t-1', 'ws-1');
    expect(modules).toEqual([]);
  });
});

describe('WorkspaceProfileRuntime — getWorkspaceTheme', () => {
  it('returns default theme when no theme is configured', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [] });
    const theme = await getWorkspaceTheme('t-1', 'ws-1');
    expect(theme.primaryColor).toBeNull();
    expect(theme.logoUrl).toBeNull();
    expect(theme.brandName).toBeNull();
  });

  it('returns workspace-level theme when available', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ primary_color: '#007bff', logo_url: '/logo.png', favicon_url: null, brand_name: 'Acme', custom_css: null }],
    });
    const theme = await getWorkspaceTheme('t-1', 'ws-1');
    expect(theme.primaryColor).toBe('#007bff');
    expect(theme.brandName).toBe('Acme');
  });

  it('falls back to tenant branding when no workspace theme', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] }); // no workspace theme
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ primary_color: '#333', logo_url: '/tenant-logo.png', favicon_url: null, brand_name: 'TenantBrand', custom_css: null }],
    });
    const theme = await getWorkspaceTheme('t-1', 'ws-1');
    expect(theme.brandName).toBe('TenantBrand');
  });
});
