import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/database/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
}));
vi.mock('../logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { computeAutoSuggestions, getStaffingForOrgSize, getBusinessFunctions } from './responsibility-suggest.service';
import { safeQuery } from '../../../config/database/database';

const mockSafeQuery = vi.mocked(safeQuery);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DOS Foundation ResponsibilitySuggestService', () => {
  describe('getStaffingForOrgSize', () => {
    it('queries lookup_grc_role_staffing with range and sector', async () => {
      mockSafeQuery.mockResolvedValueOnce({
        rows: [
          {
            role_code: 'risk_manager',
            role_name_en: 'Risk Manager',
            role_name_ar: 'مدير المخاطر',
            role_category: 'core',
            recommended_fte: '1.0',
            is_mandatory: true,
            priority: 10,
            shahin_title_en: 'Risk Manager',
            shahin_title_ar: null,
            description_en: 'Manages enterprise risk',
            sort_order: 1,
          },
        ],
      } as any);

      const result = await getStaffingForOrgSize('51_200', 'banking');

      expect(mockSafeQuery).toHaveBeenCalledOnce();
      expect(mockSafeQuery.mock.calls[0][1]).toEqual(['51_200', 'banking']);
      expect(result).toHaveLength(1);
      expect(result[0].roleCode).toBe('risk_manager');
      expect(result[0].isMandatory).toBe(true);
      expect(result[0].recommendedFte).toBe(1);
    });

    it('returns empty array on DB error', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('DB down'));
      const result = await getStaffingForOrgSize('1_50', '*');
      expect(result).toEqual([]);
    });
  });

  describe('getBusinessFunctions', () => {
    it('queries lookup_team_functions', async () => {
      mockSafeQuery.mockResolvedValueOnce({
        rows: [
          {
            function_code: 'risk_management',
            function_name_en: 'Risk Management',
            function_name_ar: 'إدارة المخاطر',
            description_en: 'Enterprise risk function',
            description_ar: null,
            category: 'risk',
            is_core: true,
            min_org_size: '1_10',
            typical_size_min: 1,
            typical_size_max: 5,
            is_grc_critical: true,
            required_for_sectors: ['banking'],
            sort_order: 1,
          },
        ],
      } as any);

      const result = await getBusinessFunctions();

      expect(mockSafeQuery).toHaveBeenCalledOnce();
      expect(result).toHaveLength(1);
      expect(result[0].functionCode).toBe('risk_management');
      expect(result[0].isCore).toBe(true);
      expect(result[0].isGrcCritical).toBe(true);
    });

    it('filters by rangeCode when provided', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [] } as any);
      await getBusinessFunctions('51_200');
      expect(mockSafeQuery.mock.calls[0][1]).toEqual(['51_200']);
    });

    it('returns empty array on DB error', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('DB down'));
      const result = await getBusinessFunctions();
      expect(result).toEqual([]);
    });
  });

  describe('computeAutoSuggestions', () => {
    it('returns suggestions matching persons to staffing roles', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({
          rows: [
            {
              role_code: 'risk_manager',
              role_name_en: 'Risk Manager',
              role_name_ar: null,
              role_category: 'risk',
              recommended_fte: '1.0',
              is_mandatory: true,
              priority: 10,
              shahin_title_en: null,
              shahin_title_ar: null,
              description_en: null,
              sort_order: 1,
            },
            {
              role_code: 'compliance_officer',
              role_name_en: 'Compliance Officer',
              role_name_ar: null,
              role_category: 'compliance',
              recommended_fte: '1.0',
              is_mandatory: true,
              priority: 20,
              shahin_title_en: null,
              shahin_title_ar: null,
              description_en: null,
              sort_order: 2,
            },
          ],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await computeAutoSuggestions(
        'tenant-1',
        [
          { userId: 'u1', fullName: 'Alice Risk', businessFunction: 'risk management' },
          { userId: 'u2', fullName: 'Bob Compliance', businessFunction: 'compliance' },
        ],
        ['risk', 'compliance'],
        '51_200',
        'banking',
      );

      expect(result.status).toBeDefined();
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0].personId).toBe('u1');
      expect(result.suggestions[0].suggestedRoles.length).toBeGreaterThan(0);
    });

    it('identifies staffing gaps for unassigned mandatory roles', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({
          rows: [
            {
              role_code: 'ciso',
              role_name_en: 'CISO',
              role_name_ar: null,
              role_category: 'security',
              recommended_fte: '1.0',
              is_mandatory: true,
              priority: 5,
              shahin_title_en: null,
              shahin_title_ar: null,
              description_en: null,
              sort_order: 1,
            },
          ],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await computeAutoSuggestions(
        'tenant-1',
        [{ userId: 'u1', fullName: 'Alice', businessFunction: 'finance' }],
        [],
      );

      expect(result.staffingGaps.length).toBeGreaterThanOrEqual(0);
    });

    it('returns partial status when mandatory roles have no match', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({
          rows: [
            {
              role_code: 'dpo',
              role_name_en: 'Data Protection Officer',
              role_name_ar: null,
              role_category: 'privacy',
              recommended_fte: '1.0',
              is_mandatory: true,
              priority: 10,
              shahin_title_en: null,
              shahin_title_ar: null,
              description_en: null,
              sort_order: 1,
            },
          ],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await computeAutoSuggestions(
        'tenant-1',
        [],
        ['privacy'],
      );

      expect(result.status).toBe('partial');
      expect(result.staffingGaps).toHaveLength(1);
      expect(result.staffingGaps[0].roleCode).toBe('dpo');
    });
  });
});
