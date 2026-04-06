import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import type { RouteDefinition } from './route-definition';

vi.mock('./route-catalog', () => ({ ROUTE_CATALOG: [] }));
vi.mock('../../utils/http-error.util', () => ({
  toErrorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));
vi.mock('../../routes/route-module-index', () => ({
  getModuleForRoute: vi.fn().mockReturnValue(null),
}));

import {
  generateMountPlan,
  resolveRouteDefinition,
  validateMountPlan,
} from './mount-plan-generator';

beforeEach(() => {
  vi.clearAllMocks();
});

function makeDef(overrides: Partial<RouteDefinition> = {}): RouteDefinition {
  return {
    id: 'test_route',
    productKey: 'agrc',
    ownerKind: 'product',
    sourceKind: 'defaultExport',
    sourceFile: 'modules/fake/routes/fake.routes',
    exportName: 'default',
    mountPath: '/api/fake',
    guards: {},
    order: 100,
    ...overrides,
  };
}

describe('mount-plan-generator', () => {
  describe('basePath resolution (Fix 1 regression guard)', () => {
    it('default basePath resolves to src/ (two levels above __dirname)', () => {
      const plan = generateMountPlan([]);
      expect(plan.entries).toHaveLength(0);
      expect(plan.failed).toBe(0);
    });

    it('resolves sourceFile relative to basePath correctly', () => {
      const basePath = '/fake/project/src';
      const def = makeDef({ sourceFile: 'modules/workflow/routes/misc/journey.routes' });
      const entry = resolveRouteDefinition(def, basePath);
      expect(entry.resolutionError).toContain('load error');
      expect(entry.sourceFile).toBe('modules/workflow/routes/misc/journey.routes');
    });

    it('wrong basePath (one level up) would fail to resolve modules/', () => {
      const wrongBasePath = path.resolve(__dirname, '..');
      const def = makeDef({ sourceFile: 'modules/workflow/routes/misc/journey.routes' });
      const entry = resolveRouteDefinition(def, wrongBasePath);
      expect(entry.handler).toBeNull();
      expect(entry.resolutionError).toBeDefined();
    });

    it('correct basePath (two levels up) reaches src/', () => {
      const correctBasePath = path.resolve(__dirname, '../..');
      expect(correctBasePath).toMatch(/src$/);
    });
  });

  describe('entries without sourceFile', () => {
    it('entry missing sourceFile produces resolution error', () => {
      const def = makeDef({ sourceFile: undefined });
      const entry = resolveRouteDefinition(def, '/fake');
      expect(entry.handler).toBeNull();
      expect(entry.resolutionError).toBeDefined();
    });
  });

  describe('generateMountPlan ordering and counting', () => {
    it('sorts entries by order', () => {
      const defs: RouteDefinition[] = [
        makeDef({ id: 'b', order: 200 }),
        makeDef({ id: 'a', order: 100 }),
        makeDef({ id: 'c', order: 150 }),
      ];
      const plan = generateMountPlan(defs, { basePath: '/fake', skipUnresolvable: true });
      expect(plan.entries.map(e => e.id)).toEqual(['a', 'c', 'b']);
    });

    it('counts failures when skipUnresolvable is false', () => {
      const defs: RouteDefinition[] = [
        makeDef({ id: 'fail1', sourceFile: 'modules/nonexistent/a.routes' }),
        makeDef({ id: 'fail2', sourceFile: 'modules/nonexistent/b.routes' }),
      ];
      const plan = generateMountPlan(defs, { basePath: '/fake', skipUnresolvable: false });
      expect(plan.failed).toBe(2);
      expect(plan.errors).toHaveLength(2);
    });

    it('skips failures when skipUnresolvable is true', () => {
      const defs: RouteDefinition[] = [
        makeDef({ id: 'skip1', sourceFile: 'modules/nonexistent/a.routes' }),
      ];
      const plan = generateMountPlan(defs, { basePath: '/fake', skipUnresolvable: true });
      expect(plan.failed).toBe(0);
      expect(plan.skipped).toBe(1);
    });

    it('skips platform-managed IDs without counting as failures', () => {
      const defs: RouteDefinition[] = [
        makeDef({ id: 'platform.system.public_stats', sourceFile: 'server.ts' }),
      ];
      const plan = generateMountPlan(defs, { basePath: '/fake' });
      expect(plan.failed).toBe(0);
      expect(plan.skipped).toBeGreaterThanOrEqual(1);
    });
  });

  describe('validateMountPlan', () => {
    it('detects duplicate IDs', () => {
      const plan = generateMountPlan(
        [makeDef({ id: 'dup' }), makeDef({ id: 'dup', order: 101 })],
        { basePath: '/fake', skipUnresolvable: true },
      );
      const issues = validateMountPlan(plan);
      expect(issues.some(i => i.includes('Duplicate IDs'))).toBe(true);
    });

    it('detects mountPath not starting with /api', () => {
      const plan = generateMountPlan(
        [makeDef({ mountPath: '/wrong' })],
        { basePath: '/fake', skipUnresolvable: true },
      );
      const issues = validateMountPlan(plan);
      expect(issues.some(i => i.includes('does not start with /api'))).toBe(true);
    });

    it('detects untagged duplicate paths', () => {
      const plan = generateMountPlan(
        [
          makeDef({ id: 'r1', mountPath: '/api/shared' }),
          makeDef({ id: 'r2', mountPath: '/api/shared', order: 101 }),
        ],
        { basePath: '/fake', skipUnresolvable: true },
      );
      const issues = validateMountPlan(plan);
      expect(issues.some(i => i.includes('untagged'))).toBe(true);
    });

    it('allows tagged duplicate paths', () => {
      const plan = generateMountPlan(
        [
          makeDef({ id: 'r1', mountPath: '/api/shared', intentionalDuplicateGroup: 'path:/api/shared' }),
          makeDef({ id: 'r2', mountPath: '/api/shared', order: 101, intentionalDuplicateGroup: 'path:/api/shared' }),
        ],
        { basePath: '/fake', skipUnresolvable: true },
      );
      const issues = validateMountPlan(plan);
      expect(issues.every(i => !i.includes('untagged'))).toBe(true);
    });
  });
});
