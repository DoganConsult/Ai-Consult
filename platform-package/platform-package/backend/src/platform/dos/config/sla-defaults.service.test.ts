import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/database/database', () => ({
  safeQuery: vi.fn(),
  tenantSchema: vi.fn((tid: string) => `tenant_${tid}`),
}));
vi.mock('../observability/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  getModuleSlaDefaults,
  getSlaHours,
  invalidateSlaCache,
} from './sla-defaults.service';
import { safeQuery } from '../../../config/database/database';

const TENANT = 't1';
const MODULE = 'risk';

const mockSlaRows = [
  {
    sla_id: 'sla-1',
    module_code: 'risk',
    entity_type: 'risk_finding',
    severity: 'critical',
    sla_hours: 4,
    warning_pct: 75,
    name_en: 'Critical Finding SLA',
    name_ar: null,
  },
  {
    sla_id: 'sla-2',
    module_code: 'risk',
    entity_type: 'risk_finding',
    severity: 'high',
    sla_hours: 24,
    warning_pct: 80,
    name_en: 'High Finding SLA',
    name_ar: null,
  },
  {
    sla_id: 'sla-3',
    module_code: 'risk',
    entity_type: 'risk_finding',
    severity: 'medium',
    sla_hours: 72,
    warning_pct: 80,
    name_en: 'Medium Finding SLA',
    name_ar: null,
  },
  {
    sla_id: 'sla-4',
    module_code: 'risk',
    entity_type: 'risk_register',
    severity: 'critical',
    sla_hours: 8,
    warning_pct: 75,
    name_en: 'Critical Register SLA',
    name_ar: null,
  },
];

describe('SlaDefaultsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateSlaCache(); // clear cache between tests
  });

  // ── getModuleSlaDefaults ────────────────────────────────────────────────

  describe('getModuleSlaDefaults', () => {
    it('should return SLA defaults for a module', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockSlaRows });

      const result = await getModuleSlaDefaults(TENANT, MODULE);

      expect(result).toHaveLength(4);
      expect(result[0].slaId).toBe('sla-1');
      expect(result[0].severity).toBe('critical');
      expect(result[0].slaHours).toBe(4);
      expect(result[1].severity).toBe('high');
      expect(result[1].warningPct).toBe(80);
    });

    it('should cache results — second call should not hit DB', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockSlaRows });

      await getModuleSlaDefaults(TENANT, MODULE);
      await getModuleSlaDefaults(TENANT, MODULE);

      expect(safeQuery).toHaveBeenCalledTimes(1);
    });

    it('should return empty array on DB error (graceful failure)', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('table not found'));

      const result = await getModuleSlaDefaults(TENANT, MODULE);
      expect(result).toEqual([]);
    });
  });

  // ── getSlaHours ─────────────────────────────────────────────────────────

  describe('getSlaHours', () => {
    it('should return hours for specific module/entity/severity', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockSlaRows });

      const result = await getSlaHours(TENANT, MODULE, 'risk_finding', 'critical');
      expect(result).toBe(4);
    });

    it('should return null for unknown entity/severity combo', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockSlaRows });

      const result = await getSlaHours(TENANT, MODULE, 'risk_finding', 'low');
      expect(result).toBeNull();
    });

    it('should match exact entity type', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockSlaRows });

      const result = await getSlaHours(TENANT, MODULE, 'risk_register', 'critical');
      expect(result).toBe(8);
    });
  });

  // ── invalidateSlaCache ──────────────────────────────────────────────────

  describe('invalidateSlaCache', () => {
    it('should clear cache so next call hits DB again', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: mockSlaRows });
      await getModuleSlaDefaults(TENANT, MODULE);
      expect(safeQuery).toHaveBeenCalledTimes(1);

      invalidateSlaCache(TENANT);

      (safeQuery as any).mockResolvedValueOnce({ rows: mockSlaRows });
      await getModuleSlaDefaults(TENANT, MODULE);
      expect(safeQuery).toHaveBeenCalledTimes(2);
    });
  });
});
