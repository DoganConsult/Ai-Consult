import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/database/database', () => ({
  safeQuery: vi.fn(),
  tenantSchema: vi.fn((tid: string) => `tenant_${tid}`),
}));
vi.mock('../observability/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  isFeatureEnabled,
  getAllFeatureFlags,
  getModuleFeatureFlags,
  invalidateFeatureFlagCache,
} from './feature-flag.service';
import { safeQuery } from '../../../config/database/database';

const TENANT = 't1';

/** Rows returned by the loadFlags internal query (used by isFeatureEnabled). */
const flagLoadRows = [
  { flag_code: 'ai.assistant', effective: true },
  { flag_code: 'risk.heatmap', effective: false },
  { flag_code: 'compliance.automap', effective: true },
];

/** Rows returned by getAllFeatureFlags (richer schema). */
const allFlagsRows = [
  {
    flag_code: 'ai.assistant',
    name_en: 'AI Assistant',
    module_code: 'ai',
    default_value: false,
    is_active: true,
    override_value: true,
    effective_value: true,
  },
  {
    flag_code: 'compliance.automap',
    name_en: 'Auto Mapping',
    module_code: 'compliance',
    default_value: true,
    is_active: true,
    override_value: null,
    effective_value: true,
  },
  {
    flag_code: 'risk.heatmap',
    name_en: 'Risk Heatmap',
    module_code: 'risk',
    default_value: true,
    is_active: true,
    override_value: false,
    effective_value: false,
  },
];

describe('FeatureFlagService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateFeatureFlagCache(); // clear cache between tests
  });

  // ── isFeatureEnabled ────────────────────────────────────────────────────

  describe('isFeatureEnabled', () => {
    it('should return true for enabled flag', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: flagLoadRows });

      const result = await isFeatureEnabled(TENANT, 'ai.assistant');
      expect(result).toBe(true);
    });

    it('should return false for disabled flag', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: flagLoadRows });

      const result = await isFeatureEnabled(TENANT, 'risk.heatmap');
      expect(result).toBe(false);
    });

    it('should return false for unknown flag (not in DB)', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: flagLoadRows });

      const result = await isFeatureEnabled(TENANT, 'nonexistent.flag');
      expect(result).toBe(false);
    });

    it('should use tenant override when present (override takes precedence over default)', async () => {
      // ai.assistant: default=false, override=true => effective=true
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ flag_code: 'ai.assistant', effective: true }],
      });

      const result = await isFeatureEnabled(TENANT, 'ai.assistant');
      expect(result).toBe(true);
    });

    it('should fall back to default when override is expired', async () => {
      // The SQL uses WHERE expires_at IS NULL OR expires_at > NOW(), so expired
      // overrides are excluded and COALESCE falls back to default_value.
      // Simulating: default_value=true, expired override excluded → effective=true
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ flag_code: 'risk.heatmap', effective: true }],
      });

      const result = await isFeatureEnabled(TENANT, 'risk.heatmap');
      expect(result).toBe(true);
    });
  });

  // ── getAllFeatureFlags ──────────────────────────────────────────────────

  describe('getAllFeatureFlags', () => {
    it('should return all flags with mapped properties', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: allFlagsRows });

      const result = await getAllFeatureFlags(TENANT);
      expect(result).toHaveLength(3);
      expect(result[0].flagCode).toBe('ai.assistant');
      expect(result[0].overrideValue).toBe(true);
      expect(result[1].moduleCode).toBe('compliance');
      expect(result[1].overrideValue).toBeNull();
    });

    it('should return empty array on DB error (graceful failure)', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('connection lost'));

      const result = await getAllFeatureFlags(TENANT);
      expect(result).toEqual([]);
    });
  });

  // ── getModuleFeatureFlags ──────────────────────────────────────────────

  describe('getModuleFeatureFlags', () => {
    it('should filter flags by module code', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: allFlagsRows });

      const result = await getModuleFeatureFlags(TENANT, 'risk');
      expect(result).toHaveLength(1);
      expect(result[0].flagCode).toBe('risk.heatmap');
    });
  });

  // ── caching ─────────────────────────────────────────────────────────────

  describe('caching', () => {
    it('should cache isFeatureEnabled results — second call should not hit DB', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: flagLoadRows });

      await isFeatureEnabled(TENANT, 'ai.assistant');
      await isFeatureEnabled(TENANT, 'risk.heatmap');

      // Both calls use the same loadFlags cache, so only 1 DB call
      expect(safeQuery).toHaveBeenCalledTimes(1);
    });
  });

  // ── invalidateFeatureFlagCache ─────────────────────────────────────────

  describe('invalidateFeatureFlagCache', () => {
    it('should clear cache so next call hits DB again', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: flagLoadRows });
      await isFeatureEnabled(TENANT, 'ai.assistant');
      expect(safeQuery).toHaveBeenCalledTimes(1);

      invalidateFeatureFlagCache(TENANT);

      (safeQuery as any).mockResolvedValueOnce({ rows: flagLoadRows });
      await isFeatureEnabled(TENANT, 'ai.assistant');
      expect(safeQuery).toHaveBeenCalledTimes(2);
    });
  });
});
