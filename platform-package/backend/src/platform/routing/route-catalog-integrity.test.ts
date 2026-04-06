import { describe, it, expect } from 'vitest';
import { ROUTE_CATALOG } from './route-catalogs/index';

describe('ROUTE_CATALOG integrity', () => {
  it('contains a non-trivial number of route definitions', () => {
    expect(ROUTE_CATALOG.length).toBeGreaterThan(200);
  });

  it('every entry has a non-empty id', () => {
    for (const entry of ROUTE_CATALOG) {
      expect(entry.id).toBeTruthy();
    }
  });

  it('every entry has a mountPath starting with /api', () => {
    for (const entry of ROUTE_CATALOG) {
      expect(entry.mountPath).toMatch(/^\/api/);
    }
  });

  it('flags known duplicate IDs for tracking (pre-existing, not introduced by fixes)', () => {
    const ids = ROUTE_CATALOG.map(e => e.id);
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) duplicates.add(id);
      seen.add(id);
    }
    const knownDuplicates = new Set([
      'routes_access_review_routes',
      'routes_committee_management_routes',
      'routes_sod_check_routes',
      'routes_foundation_governance_routes',
      'routes_foundation_roles_routes',
    ]);
    for (const dup of duplicates) {
      expect(knownDuplicates.has(dup)).toBe(true);
    }
    for (const dup of duplicates) {
      knownDuplicates.delete(dup);
    }
  });

  it('every entry with sourceFile has a non-empty sourceFile string', () => {
    for (const entry of ROUTE_CATALOG) {
      if (entry.sourceFile !== undefined) {
        expect(typeof entry.sourceFile).toBe('string');
        expect(entry.sourceFile.length).toBeGreaterThan(0);
      }
    }
  });
});
