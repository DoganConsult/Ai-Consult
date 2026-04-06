// @ts-nocheck
import path from 'path';
import fs from 'fs';
import { Router } from 'express';
import { RouteDefinition, RouteGuards, buildGuardSummary } from './route-definition';
import { ROUTE_CATALOG } from './route-catalog';
import type { MountableRoute } from './route-registrar';
import { toErrorMessage } from '../../errors/http-error.util';
import { getModuleForRoute } from '../../routes/route-module-index';

export interface ResolvedMountEntry {
  id: string;
  sourceFile: string;
  exportName: string;
  sourceKind: RouteDefinition['sourceKind'];
  mountPath: string;
  rootMount: boolean;
  guards: RouteGuards;
  guardSummary: string;
  order: number;
  intentionalDuplicateGroup?: string;
  notes?: string;
  handler: Router | null;
  resolutionError?: string;
}

export interface MountPlanResult {
  entries: ResolvedMountEntry[];
  resolved: number;
  failed: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
}

export interface PlanComparisonResult {
  match: boolean;
  catalogCount: number;
  planCount: number;
  missingFromPlan: string[];
  extraInPlan: string[];
  guardMismatches: Array<{ id: string; catalog: string; plan: string }>;
  pathMismatches: Array<{ id: string; catalog: string; plan: string }>;
  orderMismatches: Array<{ id: string; catalog: number; plan: number }>;
}

type FactoryResolver = (def: RouteDefinition) => Router | null;

export interface GeneratorOptions {
  basePath?: string;
  factoryResolvers?: Map<string, FactoryResolver>;
  skipUnresolvable?: boolean;
}

const PLATFORM_SKIP_IDS = new Set([
  'platform.system.public_stats',
]);

function resolveSourcePath(sourceFile: string, basePath: string): string {
  if (sourceFile.startsWith('modules/')) {
    return path.resolve(basePath, sourceFile);
  }
  if (sourceFile.startsWith('routes/')) {
    // Resolve catalog "routes/X.routes" → "modules/{mod}/routes/X.routes"
    const fileName = path.basename(sourceFile);
    const mod = getModuleForRoute(fileName + '.ts');
    if (mod) {
      const modulePath = path.resolve(basePath, `modules/${mod}/routes/${fileName}`);
      if (fs.existsSync(modulePath + '.ts') || fs.existsSync(modulePath + '.js')) {
        return modulePath;
      }
    }
    return path.resolve(basePath, sourceFile);
  }
  return path.resolve(basePath, sourceFile);
}

function loadModule(resolvedPath: string): unknown {
  return require(resolvedPath);
}

function isRouter(handler: any): boolean {
  return handler && typeof handler === 'function' && handler.stack !== undefined;
}

export function resolveRouteDefinition(
  def: RouteDefinition,
  basePath: string,
  factoryResolvers?: Map<string, FactoryResolver>,
): ResolvedMountEntry {
  const base: Omit<ResolvedMountEntry, 'handler' | 'resolutionError'> = {
    id: def.id,
    sourceFile: def.sourceFile,
    exportName: def.exportName,
    sourceKind: def.sourceKind,
    mountPath: def.mountPath,
    rootMount: def.rootMount ?? false,
    guards: { ...def.guards },
    guardSummary: buildGuardSummary(def.guards),
    order: def.order,
    intentionalDuplicateGroup: def.intentionalDuplicateGroup,
    notes: def.notes,
  };

  if (PLATFORM_SKIP_IDS.has(def.id)) {
    return { ...base, handler: null, resolutionError: 'platform-managed: inline handler in server.ts' };
  }

  if (def.sourceFile === 'server.ts') {
    return { ...base, handler: null, resolutionError: 'platform-managed: defined in server.ts' };
  }

  try {
    const resolvedPath = resolveSourcePath(def.sourceFile, basePath);

    switch (def.sourceKind) {
      case 'defaultExport': {
        const mod = loadModule(resolvedPath);
        const handler = mod.default ?? mod;
        if (!isRouter(handler)) {
          return { ...base, handler: null, resolutionError: `default export is not a Router (type: ${typeof handler})` };
        }
        return { ...base, handler };
      }

      case 'namedExport': {
        const mod = loadModule(resolvedPath);
        const handler = mod[def.exportName];
        if (!handler) {
          return { ...base, handler: null, resolutionError: `named export '${def.exportName}' not found in module` };
        }
        if (!isRouter(handler)) {
          return { ...base, handler: null, resolutionError: `named export '${def.exportName}' is not a Router (type: ${typeof handler})` };
        }
        return { ...base, handler };
      }

      case 'factory': {
        if (factoryResolvers && def.factoryName && factoryResolvers.has(def.factoryName)) {
          const resolver = factoryResolvers.get(def.factoryName)!;
          const handler = resolver(def);
          if (handler && isRouter(handler)) {
            return { ...base, handler };
          }
          return { ...base, handler: null, resolutionError: `factory resolver '${def.factoryName}' returned non-Router` };
        }
        return { ...base, handler: null, resolutionError: `factory '${def.factoryName ?? def.exportName}' requires runtime resolver (not auto-resolvable)` };
      }

      case 'controller': {
        const mod = loadModule(resolvedPath);
        const handler = mod.default ?? mod;
        if (!isRouter(handler)) {
          return { ...base, handler: null, resolutionError: `controller default export is not a Router (type: ${typeof handler})` };
        }
        return { ...base, handler };
      }

      default:
        return { ...base, handler: null, resolutionError: `any sourceKind: ${def.sourceKind}` };
    }
  } catch (err: unknown) {
    return { ...base, handler: null, resolutionError: `load error: ${toErrorMessage(err)}` };
  }
}

export function generateMountPlan(
  catalog?: RouteDefinition[],
  options?: GeneratorOptions,
): MountPlanResult {
  const entries: RouteDefinition[] = (catalog ?? ROUTE_CATALOG) as RouteDefinition[];
  const basePath = options?.basePath ?? path.resolve(__dirname, '../..');
  const sorted = [...entries].sort((a, b) => a.order - b.order);

  const resolved: ResolvedMountEntry[] = [];
  let failed = 0;
  let skipped = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const def of sorted) {
    const entry = resolveRouteDefinition(def, basePath, options?.factoryResolvers);
    resolved.push(entry);

    if (entry.resolutionError) {
      if (PLATFORM_SKIP_IDS.has(def.id) || def.sourceFile === 'server.ts') {
        skipped++;
      } else if (options?.skipUnresolvable) {
        skipped++;
      } else {
        failed++;
        errors.push({ id: def.id, error: entry.resolutionError });
      }
    }
  }

  return {
    entries: resolved,
    resolved: resolved.filter(e => e.handler !== null).length,
    failed,
    skipped,
    errors,
  };
}

export function toMountableRoutes(plan: MountPlanResult): MountableRoute[] {
  return plan.entries
    .filter(e => e.handler !== null)
    .map(e => ({
      path: e.mountPath,
      handler: e.handler!,
      module: e.guards.module,
      tier: e.guards.tier,
      product: e.guards.product,
      permissions: e.guards.permissions,
      ownership: e.guards.ownership,
    }));
}

export function comparePlanToCatalog(
  plan: MountPlanResult,
  catalog?: RouteDefinition[],
): PlanComparisonResult {
  const defs = (catalog ?? ROUTE_CATALOG) as RouteDefinition[];
  const catalogIds = new Set(defs.map((d: any) => d.id as string));
  const planIds = new Set(plan.entries.map(e => e.id));

  const missingFromPlan: string[] = [...catalogIds].filter(id => !planIds.has(id));
  const extraInPlan: string[] = [...planIds].filter(id => !catalogIds.has(id));

  const guardMismatches: PlanComparisonResult['guardMismatches'] = [];
  const pathMismatches: PlanComparisonResult['pathMismatches'] = [];
  const orderMismatches: PlanComparisonResult['orderMismatches'] = [];

  for (const entry of plan.entries) {
    const def = defs.find(d => d.id === entry.id);
    if (!def) continue;

    const defGuardSummary = buildGuardSummary(def.guards);
    if (entry.guardSummary !== defGuardSummary) {
      guardMismatches.push({ id: entry.id, catalog: defGuardSummary, plan: entry.guardSummary });
    }
    if (entry.mountPath !== def.mountPath) {
      pathMismatches.push({ id: entry.id, catalog: def.mountPath, plan: entry.mountPath });
    }
    if (entry.order !== def.order) {
      orderMismatches.push({ id: entry.id, catalog: def.order, plan: entry.order });
    }
  }

  return {
    match: missingFromPlan.length === 0
      && extraInPlan.length === 0
      && guardMismatches.length === 0
      && pathMismatches.length === 0
      && orderMismatches.length === 0,
    catalogCount: defs.length,
    planCount: plan.entries.length,
    missingFromPlan,
    extraInPlan,
    guardMismatches,
    pathMismatches,
    orderMismatches,
  };
}

export function validateMountPlan(plan: MountPlanResult): string[] {
  const issues: string[] = [];

  const ids = plan.entries.map(e => e.id);
  const dupeIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupeIds.length > 0) {
    issues.push(`Duplicate IDs: ${dupeIds.join(', ')}`);
  }

  const orders = plan.entries.map(e => e.order);
  const dupeOrders = orders.filter((o, i) => orders.indexOf(o) !== i);
  if (dupeOrders.length > 0) {
    issues.push(`Duplicate orders: ${dupeOrders.join(', ')}`);
  }

  for (const entry of plan.entries) {
    if (!entry.mountPath.startsWith('/api')) {
      issues.push(`${entry.id}: mountPath '${entry.mountPath}' does not start with /api`);
    }
  }

  const pathGroups = new Map<string, ResolvedMountEntry[]>();
  for (const entry of plan.entries) {
    if (!pathGroups.has(entry.mountPath)) pathGroups.set(entry.mountPath, []);
    pathGroups.get(entry.mountPath)!.push(entry);
  }
  for (const [p, entries] of pathGroups) {
    if (entries.length > 1) {
      const allTagged = entries.every(e => e.intentionalDuplicateGroup);
      if (!allTagged) {
        const untagged = entries.filter(e => !e.intentionalDuplicateGroup).map(e => e.id);
        issues.push(`Path '${p}' has ${entries.length} handlers but untagged: ${untagged.join(', ')}`);
      }
    }
  }

  for (const entry of plan.entries) {
    if (entry.rootMount && entry.mountPath !== '/api') {
      issues.push(`${entry.id}: rootMount=true but mountPath is '${entry.mountPath}' (expected '/api')`);
    }
  }

  return issues;
}
