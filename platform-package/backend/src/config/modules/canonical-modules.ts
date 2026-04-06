/**
 * Canonical AGRC module codes. Must match docs/MODULE-INVENTORY-AND-RELATIONS.md.
 * Used for product_modules sync, drift tests, and GRC_CORE_MODULES compatibility set.
 * Do not add or remove codes without updating the doc and DB seeds (module_workflow_registry).
 *
 * CONFIG BOUNDARY: owner = platform.
 * This file provides the canonical module code registry for platform-only deployments.
 * Platform-neutral code MUST NOT import this directly — use platform module registry:
 *   import { ... } from '../platform/dos/modules/registry/platform-module-registry';
 *
 * HIERARCHY: Platform → Product → Module → Tenant → User
 * Subscription is a side-layer on Tenant/Product/Module entitlement.
 * See platform/hierarchy-contracts.ts for full contract.
 */
import { registerModuleCodes, type ModuleHierarchyTier } from '../../platform/dos/modules/registry/platform-module-registry';

export const CANONICAL_AGRC_MODULE_CODES = [
  'risk',
  'compliance',
  'policy',
  'evidence',
  'audit',
  'incident',
  'exception',
  'governance',
  'vendor',
  'bcp',
  'asset',
  'remediation',
  'action',
  'training',
  'qiyas',
  'ai-governance',
  'foundation',
  'reporting',
  'ai',
  'integrations',
  'admin',
  'workflow',
  'notification',
  'analytics',
  'team',
  'issues',
  'inbox',
  'portals',
  'records',
  'privacy',
  'controls',
  'onboarding',
  'dora',
  'journey',
  'ksa-regulatory',
  'local-knowledge',
  'packs',
  'proactive-leadership',
  'agrc-engine',
  'dashboard',
  'provisioning',
  'navigation',
  'bootstrap',
  'governance-ai',
  'governance-os',
  'widgets',
  'quality-gate',
] as const;

/** Compile-time union of all 32 canonical module codes. Use to type any field that must reference a canonical module. */
export type CanonicalModuleCode = typeof CANONICAL_AGRC_MODULE_CODES[number];

const _CANONICAL_SET: ReadonlySet<string> = new Set<string>(CANONICAL_AGRC_MODULE_CODES);

/** Runtime type guard — returns true if the value is one of the 32 canonical module codes. */
export function isCanonicalModuleCode(value: unknown): value is CanonicalModuleCode {
  return typeof value === 'string' && _CANONICAL_SET.has(value);
}

export const CANONICAL_MODULE_COUNT = CANONICAL_AGRC_MODULE_CODES.length; // 36

export const PLATFORM_CORE_CODES: readonly CanonicalModuleCode[] = [
  'foundation', 'admin', 'workflow', 'notification', 'team', 'inbox', 'onboarding', 'quality-gate',
] as const;

export const PLATFORM_AI_CODES: readonly CanonicalModuleCode[] = [
  'ai', 'ai-governance',
] as const;

export const PRODUCT_AGRC_CODES: readonly CanonicalModuleCode[] = [
  'risk', 'compliance', 'policy', 'evidence', 'audit', 'incident',
  'exception', 'governance', 'vendor', 'bcp', 'asset', 'remediation',
  'action', 'training', 'qiyas', 'reporting', 'analytics',
  'issues', 'records', 'privacy', 'controls', 'dora', 'journey',
  'ksa-regulatory', 'local-knowledge', 'packs', 'proactive-leadership',
] as const;

export const EDGE_EXTERNAL_CODES: readonly CanonicalModuleCode[] = [
  'integrations', 'portals',
] as const;

const _PLATFORM_CORE_SET: ReadonlySet<string> = new Set<string>(PLATFORM_CORE_CODES);
const _PLATFORM_AI_SET: ReadonlySet<string> = new Set<string>(PLATFORM_AI_CODES);
const _PRODUCT_AGRC_SET: ReadonlySet<string> = new Set<string>(PRODUCT_AGRC_CODES);

export function isPlatformCoreModule(code: string): boolean {
  return _PLATFORM_CORE_SET.has(code);
}

export function isPlatformAiModule(code: string): boolean {
  return _PLATFORM_AI_SET.has(code);
}

export function isProductAgrcModule(code: string): boolean {
  return _PRODUCT_AGRC_SET.has(code);
}

export function getModuleHierarchyTier(code: string): ModuleHierarchyTier | undefined {
  if (_PLATFORM_CORE_SET.has(code)) return 'platform-core';
  if (_PLATFORM_AI_SET.has(code)) return 'platform-ai';
  if (_PRODUCT_AGRC_SET.has(code)) return 'product-agrc';
  if (new Set<string>(EDGE_EXTERNAL_CODES).has(code)) return 'edge-external';
  return undefined;
}
export function resolveMinMwrRowsRequired(..._args: any[]): unknown { return undefined; }
export const MWR_BASELINE_FLOOR: number = 0;
export const CANONICAL_MODULES: Set<string> = new Set<string>();

// ── Self-registration into platform module registry ────────────────────
// This runs on first import, populating the platform-owned registry so that
// platform code can query module codes without importing this product file.

const _TIER_MAP: Record<string, ModuleHierarchyTier> = {};
for (const c of PLATFORM_CORE_CODES) _TIER_MAP[c] = 'platform-core';
for (const c of PLATFORM_AI_CODES) _TIER_MAP[c] = 'platform-ai';
for (const c of PRODUCT_AGRC_CODES) _TIER_MAP[c] = 'product';
for (const c of EDGE_EXTERNAL_CODES) _TIER_MAP[c] = 'edge-external';

import { getDefaultProductKey } from '../../platform/dos/config/platform-identity';

registerModuleCodes(
  CANONICAL_AGRC_MODULE_CODES.map(code => ({
    code,
    tier: _TIER_MAP[code] ?? 'product',
  })),
  getDefaultProductKey() || process.env.DEFAULT_PRODUCT_KEY || '',
);
