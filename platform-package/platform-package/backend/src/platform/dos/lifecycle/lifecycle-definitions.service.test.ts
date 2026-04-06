import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/database/database', () => ({
  safeQuery: vi.fn(),
  tenantSchema: vi.fn((tid: string) => `tenant_${tid}`),
}));
vi.mock('../observability/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  getLifecycleDefinitions,
  getValidStatusCodes,
  isValidStatus,
  getDefaultStatus,
  getTerminalStatuses,
  invalidateLifecycleCache,
} from './lifecycle-definitions.service';
import { safeQuery } from '../../../config/database/database';

const TENANT = 't1';
const MODULE = 'risk';
const ENTITY = 'risk_register';

const mockRows = [
  {
    definition_id: 'def-1',
    module_code: 'risk',
    entity_type: 'risk_register',
    status_code: 'draft',
    name_en: 'Draft',
    name_ar: null,
    status_category: 'initial',
    display_order: 1,
    color_token: '--color-draft',
    is_default: true,
    is_terminal: false,
    allows_edit: true,
  },
  {
    definition_id: 'def-2',
    module_code: 'risk',
    entity_type: 'risk_register',
    status_code: 'active',
    name_en: 'Active',
    name_ar: null,
    status_category: 'active',
    display_order: 2,
    color_token: '--color-active',
    is_default: false,
    is_terminal: false,
    allows_edit: true,
  },
  {
    definition_id: 'def-3',
    module_code: 'risk',
    entity_type: 'risk_register',
    status_code: 'closed',
    name_en: 'Closed',
    name_ar: null,
    status_category: 'terminal',
    display_order: 3,
    color_token: '--color-closed',
    is_default: false,
    is_terminal: true,
    allows_edit: false,
  },
  {
    definition_id: 'def-4',
    module_code: 'risk',
    entity_type: 'risk_register',
    status_code: 'archived',
    name_en: 'Archived',
    name_ar: null,
    status_category: 'archived',
    display_order: 4,
    color_token: null,
    is_default: false,
    is_terminal: true,
    allows_edit: false,
  },
];

describe('LifecycleDefinitionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateLifecycleCache(); // clear cache between tests
  });

  // ── getLifecycleDefinitions ─────────────────────────────────────────────

  describe('getLifecycleDefinitions', () => {
    it('should return lifecycle definitions from DB', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockRows });

      const result = await getLifecycleDefinitions(TENANT, MODULE, ENTITY);

      expect(result).toHaveLength(4);
      expect(result[0].statusCode).toBe('draft');
      expect(result[0].isDefault).toBe(true);
      expect(result[2].statusCode).toBe('closed');
      expect(result[2].isTerminal).toBe(true);
    });

    it('should cache results — second call should not query DB', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockRows });

      await getLifecycleDefinitions(TENANT, MODULE, ENTITY);
      await getLifecycleDefinitions(TENANT, MODULE, ENTITY);

      expect(safeQuery).toHaveBeenCalledTimes(1);
    });

    it('should return empty array on DB error (graceful failure)', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('timeout'));

      const result = await getLifecycleDefinitions(TENANT, MODULE, ENTITY);
      expect(result).toEqual([]);
    });
  });

  // ── getValidStatusCodes ─────────────────────────────────────────────────

  describe('getValidStatusCodes', () => {
    it('should return status code strings', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockRows });

      const result = await getValidStatusCodes(TENANT, MODULE, ENTITY);
      expect(result).toEqual(['draft', 'active', 'closed', 'archived']);
    });
  });

  // ── isValidStatus ───────────────────────────────────────────────────────

  describe('isValidStatus', () => {
    it('should return true for valid status', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockRows });

      const result = await isValidStatus(TENANT, MODULE, ENTITY, 'active');
      expect(result).toBe(true);
    });

    it('should return false for invalid status', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockRows });

      const result = await isValidStatus(TENANT, MODULE, ENTITY, 'nonexistent');
      expect(result).toBe(false);
    });
  });

  // ── getDefaultStatus ────────────────────────────────────────────────────

  describe('getDefaultStatus', () => {
    it('should return the default status code', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockRows });

      const result = await getDefaultStatus(TENANT, MODULE, ENTITY);
      expect(result).toBe('draft');
    });

    it('should return null when no default is defined', async () => {
      const noDefaultRows = mockRows.map(r => ({ ...r, is_default: false }));
      (safeQuery as any).mockResolvedValueOnce({ rows: noDefaultRows });

      const result = await getDefaultStatus(TENANT, MODULE, ENTITY);
      expect(result).toBeNull();
    });
  });

  // ── getTerminalStatuses ─────────────────────────────────────────────────

  describe('getTerminalStatuses', () => {
    it('should return only terminal statuses', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockRows });

      const result = await getTerminalStatuses(TENANT, MODULE, ENTITY);
      expect(result).toEqual(['closed', 'archived']);
    });
  });

  // ── invalidateLifecycleCache ────────────────────────────────────────────

  describe('invalidateLifecycleCache', () => {
    it('should clear cache so next call hits DB again', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockRows });
      await getLifecycleDefinitions(TENANT, MODULE, ENTITY);
      expect(safeQuery).toHaveBeenCalledTimes(1);

      invalidateLifecycleCache(TENANT);

      (safeQuery as any).mockResolvedValueOnce({ rows: mockRows });
      await getLifecycleDefinitions(TENANT, MODULE, ENTITY);
      expect(safeQuery).toHaveBeenCalledTimes(2);
    });
  });
});
