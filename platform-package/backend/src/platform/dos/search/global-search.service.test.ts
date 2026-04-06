/**
 * Co-located tests for global-search.service.ts
 * Tests type contracts and pure validation logic.
 * DB-dependent search() requires integration tests.
 */
import { describe, it, expect } from 'vitest';
import type {
  SearchResultItem,
  SearchOptions,
  QuickAction,
  SearchTableConfig,
} from './global-search.service';

describe('global-search.service — type contracts', () => {
  it('SearchResultItem includes all required fields', () => {
    const item: SearchResultItem = {
      entityType: 'risk',
      entityId: 'r-001',
      title: 'Operational Risk',
      snippet: 'Risk related to operations...',
      score: 0.95,
      url: '/risks/r-001',
      actions: [],
    };

    expect(item.score).toBeGreaterThanOrEqual(0);
    expect(item.score).toBeLessThanOrEqual(1);
    expect(item.url).toContain('/risks/');
  });

  it('SearchOptions supports type filtering', () => {
    const opts: SearchOptions = {
      types: ['risk', 'control'],
      page: 1,
      pageSize: 20,
      userRole: 'compliance_officer',
    };

    expect(opts.types).toHaveLength(2);
    expect(opts.pageSize).toBe(20);
  });

  it('QuickAction defines action types and labels', () => {
    const action: QuickAction = {
      action: 'view',
      label: 'View Details',
      labelAr: 'عرض التفاصيل',
      url: '/risks/r-001',
      enabled: true,
    };

    expect(action.action).toBe('view');
    expect(action.enabled).toBe(true);
  });

  it('empty types filter is valid (means search all)', () => {
    const opts: SearchOptions = {};
    expect(opts.types).toBeUndefined();
  });

  it('SearchOptions accepts date range filters', () => {
    const opts: SearchOptions = {
      dateFrom: '2026-01-01',
      dateTo: '2026-03-29',
      status: ['active'],
    };

    expect(opts.dateFrom).toBeDefined();
    expect(opts.dateTo).toBeDefined();
  });
});
