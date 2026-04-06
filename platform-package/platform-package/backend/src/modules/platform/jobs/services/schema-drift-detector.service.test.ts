import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../../config/database', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn((id: string) => `tenant_${id}`),
}));

vi.mock('../../../../migrations/runner', () => ({
  runMigrations: vi.fn().mockResolvedValue({ applied: [], skipped: [], failed: null }),
  readMigrationFiles: vi.fn().mockReturnValue([]),
}));

vi.mock('../../../../platform/dos/observability/services/logger.service', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
  },
}));

import {
  startSchemaDriftDetector,
  stopSchemaDriftDetector,
  getLastDriftReport,
  runDriftCheck,
  assertProvisioningReady,
  getTenantSchemaHealth,
} from './schema-drift-detector.service';

import { query } from '../../../../config/database';

const mockQuery = vi.mocked(query);

describe('schema-drift-detector.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopSchemaDriftDetector();
    process.env.SCHEMA_DRIFT_DETECTOR_DISABLED = '';
  });

  afterEach(() => {
    stopSchemaDriftDetector();
  });

  describe('startSchemaDriftDetector', () => {
    it('does not start when SCHEMA_DRIFT_DETECTOR_DISABLED=true', () => {
      process.env.SCHEMA_DRIFT_DETECTOR_DISABLED = 'true';
      startSchemaDriftDetector();
      expect(getLastDriftReport()).toBeNull();
    });

    it('does not start a duplicate timer', () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);
      startSchemaDriftDetector();
      startSchemaDriftDetector();
      stopSchemaDriftDetector();
    });
  });

  describe('runDriftCheck', () => {
    it('returns a report with zero tenants when public.tenants is empty', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);
      const report = await runDriftCheck();

      expect(report.totalTenants).toBe(0);
      expect(report.healthyTenants).toBe(0);
      expect(report.driftedTenants).toBe(0);
      expect(report.entries).toEqual([]);
      expect(report.checkedAt).toBeDefined();
      expect(report.durationMs).toBeGreaterThanOrEqual(0);
      expect(report.canonicalVersion).toBeGreaterThanOrEqual(0);
    });

    it('caches the last report in getLastDriftReport()', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);
      const report = await runDriftCheck();
      expect(getLastDriftReport()).toBe(report);
    });

    it('detects drift when tenant has fewer tables than canonical', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ tenant_id: 'abc', status: 'active' }] } as any)
        .mockResolvedValueOnce({ rows: [{ tc: '100' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const report = await runDriftCheck();
      expect(report.driftedTenants).toBe(1);
      expect(report.entries[0].tenantId).toBe('abc');
      expect(report.entries[0].gap).toBeGreaterThan(0);
      expect(report.entries[0].pendingMigrations).toBeGreaterThanOrEqual(0);
    });
  });

  describe('assertProvisioningReady', () => {
    it('does not throw when migration file count exceeds minimum', async () => {
      await expect(assertProvisioningReady(0)).resolves.not.toThrow();
    });

    it('throws when migration file count is below minimum', async () => {
      await expect(assertProvisioningReady(999999)).rejects.toThrow('Provisioning blocked');
    });
  });

  describe('getTenantSchemaHealth', () => {
    it('returns health object with all expected fields', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ tc: '500' }] } as any)
        .mockResolvedValueOnce({ rows: [{ cnt: '100' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const health = await getTenantSchemaHealth('test-tenant');

      expect(health.tenantId).toBe('test-tenant');
      expect(health.schema).toBe('tenant_test-tenant');
      expect(health.actualTables).toBe(500);
      expect(health.appliedMigrations).toBe(100);
      expect(health).toHaveProperty('pendingMigrations');
      expect(health).toHaveProperty('latestApplied');
      expect(health).toHaveProperty('canonicalVersion');
      expect(['healthy', 'minor-drift', 'drifted', 'critical']).toContain(health.status);
    });
  });

  describe('stopSchemaDriftDetector', () => {
    it('clears the timer without error', () => {
      expect(() => stopSchemaDriftDetector()).not.toThrow();
    });
  });
});
