import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../config/database/database', () => ({
  safeQuery: vi.fn(),
  tenantSchema: vi.fn((tid: string) => `tenant_${tid}`),
}));
vi.mock('../../observability/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  getNavigationItems,
  getNavigationForPermissions,
  getNavigationBySection,
  invalidateNavigationCache,
} from './navigation-registry.service';
import { safeQuery } from '../../../../config/database/database';

const TENANT = 't1';

const mockNavRows = [
  {
    nav_id: 'nav-1',
    nav_code: 'risk_hub',
    label_key: 'nav.risk',
    label_en: 'Risk Management',
    label_ar: null,
    icon: 'pi-shield',
    route: '/risk',
    required_permission: 'risk.dashboard.view',
    section: 'modules',
    lifecycle_phase: null,
    module_code: 'risk',
    module_group: 'governance',
    parent_nav_code: null,
    display_order: 1,
    is_active: true,
    owner_scope: 'dos',
    product_code: 'shahin-ai',
  },
  {
    nav_id: 'nav-2',
    nav_code: 'compliance_hub',
    label_key: 'nav.compliance',
    label_en: 'Compliance',
    label_ar: null,
    icon: 'pi-check-circle',
    route: '/compliance',
    required_permission: 'compliance.dashboard.view',
    section: 'modules',
    lifecycle_phase: null,
    module_code: 'compliance',
    module_group: 'governance',
    parent_nav_code: null,
    display_order: 2,
    is_active: true,
    owner_scope: 'dos',
    product_code: 'shahin-ai',
  },
  {
    nav_id: 'nav-3',
    nav_code: 'settings_hub',
    label_key: 'nav.settings',
    label_en: 'Settings',
    label_ar: null,
    icon: 'pi-cog',
    route: '/settings',
    required_permission: 'platform.settings.view',
    section: 'admin',
    lifecycle_phase: null,
    module_code: null,
    module_group: null,
    parent_nav_code: null,
    display_order: 1,
    is_active: true,
    owner_scope: 'dos',
    product_code: null,
  },
];

describe('NavigationRegistryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateNavigationCache(); // clear cache between tests
  });

  // ── getNavigationItems ──────────────────────────────────────────────────

  describe('getNavigationItems', () => {
    it('should return all active navigation items', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockNavRows });

      const result = await getNavigationItems(TENANT);

      expect(result).toHaveLength(3);
      expect(result[0].navCode).toBe('risk_hub');
      expect(result[0].requiredPermission).toBe('risk.dashboard.view');
      expect(result[1].navCode).toBe('compliance_hub');
      expect(result[2].section).toBe('admin');
    });

    it('should cache results — second call should not hit DB', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockNavRows });

      await getNavigationItems(TENANT);
      await getNavigationItems(TENANT);

      expect(safeQuery).toHaveBeenCalledTimes(1);
    });

    it('should return empty array on DB error (graceful failure)', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('connection reset'));

      const result = await getNavigationItems(TENANT);
      expect(result).toEqual([]);
    });
  });

  // ── getNavigationForPermissions ─────────────────────────────────────────

  describe('getNavigationForPermissions', () => {
    it('should filter items by user permission set', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockNavRows });

      const result = await getNavigationForPermissions(TENANT, [
        'risk.dashboard.view',
        'platform.settings.view',
      ]);

      expect(result).toHaveLength(2);
      expect(result.map(i => i.navCode)).toEqual(['risk_hub', 'settings_hub']);
    });

    it('should return empty array when user has no matching permissions', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockNavRows });

      const result = await getNavigationForPermissions(TENANT, ['unrelated.perm']);
      expect(result).toEqual([]);
    });
  });

  // ── getNavigationBySection ──────────────────────────────────────────────

  describe('getNavigationBySection', () => {
    it('should filter items by section', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockNavRows });

      const result = await getNavigationBySection(TENANT, 'admin');
      expect(result).toHaveLength(1);
      expect(result[0].navCode).toBe('settings_hub');
    });

    it('should return empty array for section with no items', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockNavRows });

      const result = await getNavigationBySection(TENANT, 'nonexistent');
      expect(result).toEqual([]);
    });
  });

  // ── invalidateNavigationCache ───────────────────────────────────────────

  describe('invalidateNavigationCache', () => {
    it('should clear cache so next call hits DB again', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockNavRows });
      await getNavigationItems(TENANT);
      expect(safeQuery).toHaveBeenCalledTimes(1);

      invalidateNavigationCache(TENANT);

      (safeQuery as any).mockResolvedValueOnce({ rows: mockNavRows });
      await getNavigationItems(TENANT);
      expect(safeQuery).toHaveBeenCalledTimes(2);
    });
  });
});
