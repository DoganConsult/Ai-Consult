import { RegisteredModuleCode } from '../dos/modules/registry/platform-module-registry';

export type OwnerKind = 'platform' | 'product' | 'module';

export type SourceKind = 'defaultExport' | 'namedExport' | 'factory' | 'controller' | 'route';

export interface RouteGuards {
  module?: RegisteredModuleCode;
  tier?: string;
  product?: string;
  /** When set, requireAuth(permissions) middleware is applied before the handler. */
  permissions?: string[];
  /** When set, requireOwnership(entityType) middleware is applied on write methods. */
  ownership?: string;
}

/**
 * Explicit classification for routes that intentionally have no frontend page.
 * - 'service-api': Backend computation/data service consumed by other pages (e.g., monte-carlo sim).
 * - 'webhook': Inbound webhook handler.
 * - 'portal': External-facing portal (vendor, regulator, consultant).
 * - 'internal': Admin/operational endpoint not user-facing.
 * - undefined: Standard route expected to have a frontend counterpart.
 */
export type ApiOnlyClassification = 'service-api' | 'webhook' | 'portal' | 'internal';

export interface RouteDefinition {
  id: string;
  productKey: string;
  ownerKind: OwnerKind;
  sourceKind: SourceKind;
  sourceFile?: string;
  exportName: string;
  factoryName?: string;
  mountPath: string;
  aliases?: string[];
  rootMount?: boolean;
  guards: RouteGuards;
  order: number;
  intentionalDuplicateGroup?: string;
  notes?: string;
  /** When set, this route is intentionally API-only — no frontend page expected. */
  apiOnly?: ApiOnlyClassification;
  /** Optional module key for module-owned routes (e.g., "ai" for personal-agent). */
  moduleKey?: string;
  /** Optional human-readable description of the route's purpose. */
  description?: string;
}

export interface ResolvedRouteSignature {
  id: string;
  resolvedFile: string;
  resolvedExport: string;
  finalMountPath: string;
  aliases: string[];
  guardSummary: string;
  order: number;
}

export function buildGuardSummary(guards: RouteGuards): string {
  const parts: string[] = [];
  if (guards.product) parts.push(`product:${guards.product}`);
  if (guards.module) parts.push(`module:${guards.module}`);
  if (guards.tier) parts.push(`tier:${guards.tier}`);
  if (guards.permissions?.length) parts.push(`perms:${guards.permissions.join(',')}`);
  if (guards.ownership) parts.push(`ownership:${guards.ownership}`);
  return parts.length > 0 ? parts.join('|') : 'none';
}

export function toResolvedSignature(def: RouteDefinition): ResolvedRouteSignature {
  return {
    id: def.id,
    resolvedFile: def.sourceFile!,
    resolvedExport: def.exportName,
    finalMountPath: def.mountPath,
    aliases: def.aliases ?? [],
    guardSummary: buildGuardSummary(def.guards),
    order: def.order,
  };
}
