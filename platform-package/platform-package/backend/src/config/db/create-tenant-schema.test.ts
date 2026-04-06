import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./query', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
}));

vi.mock('./pool', () => ({
  pool: { connect: vi.fn() },
}));

vi.mock('../../utils/http-error.util', () => ({
  toErrorMessage: vi.fn((e: any) => e?.message ?? String(e)),
}));

vi.mock('../../platform/dos/observability/logger.service', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
  },
}));

vi.mock('./schemas/foundation', () => ({
  createFoundationTables: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./schemas/teams-governance', () => ({
  createTeamsGovernanceTables: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./schemas/ai-agents', () => ({
  createAiAgentsTables: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./schemas/provisioning-onboarding', () => ({
  createProvisioningTables: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./schemas/evidence-connectors', () => ({
  createEvidenceConnectorTables: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./schemas/platform-dashboard', () => ({
  createPlatformTables: vi.fn().mockResolvedValue(undefined),
  seedPlatformData: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../platform/dauth/access/rbac/seed-rbac-data', () => ({
  seedDynamicRbacData: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../modules/platform/provisioning/product-bootstrap-hooks', () => ({
  runProductBootstrapHooks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../migrations/runner', () => ({
  readMigrationFiles: vi.fn().mockReturnValue([]),
  runMigrations: vi.fn().mockResolvedValue({ applied: [], skipped: [], failed: null }),
}));

import { createTenantSchema } from './create-tenant-schema';
import { query } from './query';

const mockQuery = vi.mocked(query);

describe('create-tenant-schema', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.PROVISIONING_LOCKED;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('PROVISIONING_LOCKED feature flag', () => {
    it('throws when PROVISIONING_LOCKED=true', async () => {
      process.env.PROVISIONING_LOCKED = 'true';
      await expect(createTenantSchema('test-id')).rejects.toThrow(
        'provisioning temporarily locked'
      );
    });

    it('does not throw when PROVISIONING_LOCKED is unset', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
      };
      const { pool } = await import('./pool');
      vi.mocked(pool.connect).mockResolvedValue(mockClient as any);

      mockQuery.mockImplementation(async (sql: string, params?: any[]) => {
        if (typeof sql === 'string' && sql.includes('count(*)')) {
          return { rows: [{ tc: 600 }] } as any;
        }
        if (typeof sql === 'string' && sql.includes('information_schema.tables') && sql.includes('table_name')) {
          return { rows: [{ '?column?': 1 }] } as any;
        }
        return { rows: [] } as any;
      });

      await expect(createTenantSchema('test-id')).resolves.not.toThrow();
    });
  });

  describe('post-provisioning health gate', () => {
    it('throws when table count is below minimum', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
      };
      const { pool } = await import('./pool');
      vi.mocked(pool.connect).mockResolvedValue(mockClient as any);

      let callCount = 0;
      mockQuery.mockImplementation(async (sql: string) => {
        if (typeof sql === 'string' && sql.includes('count(*)::int AS tc')) {
          return { rows: [{ tc: 10 }] } as any;
        }
        return { rows: [] } as any;
      });

      await expect(createTenantSchema('failing-tenant')).rejects.toThrow(
        'Health gate failed'
      );
    });
  });
});
