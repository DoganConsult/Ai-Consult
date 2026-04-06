/**
 * Platform Module Registry — product-agnostic runtime registry for module codes.
 *
 * OWNERSHIP: DOS (platform-core)
 *
 * This is the SINGLE platform-level authority for module code registration.
 * Products register their module codes at startup via `registerModuleCodes()`.
 * Platform code MUST use this registry — never import product-owned module lists directly.
 *
 * SEPARATION RULE:
 *   - Platform defines the registry contract and query API
 *   - Products populate the registry at startup
 *   - Platform code reads from registry, never from product files
 */

// ── Types ────────────────────────────────────────────────────────────

/** Hierarchy tier for registered modules. Superset including product shorthand. */
export type ModuleHierarchyTier =
  | 'platform-core'
  | 'platform-ai'
  | 'product-agrc'
  | 'product'
  | 'edge-external';

/** A module code string that has been registered in this registry. */
export type RegisteredModuleCode = string;

export interface RegisteredModuleEntry {
  code: string;
  tier: ModuleHierarchyTier;
  productKey?: string;
}

// ── Module-scoped state ──────────────────────────────────────────────

const _codes = new Set<string>();
const _entries = new Map<string, RegisteredModuleEntry>();
const _tierIndex = new Map<ModuleHierarchyTier, string[]>();
const _productIndex = new Map<string, string[]>();
let _sealed = false;

// ── Registration API ─────────────────────────────────────────────────

/**
 * Register module codes into the platform registry.
 * Called by product definitions at startup.
 */
export function registerModuleCodes(
  modules: { code: string; tier: ModuleHierarchyTier }[],
  productKey: string,
): void {
  if (_sealed) {
    throw new Error(`[platform-module-registry] Registry is sealed — cannot register more modules (productKey=${productKey})`);
  }
  for (const m of modules) {
    _codes.add(m.code);
    _entries.set(m.code, { code: m.code, tier: m.tier, productKey });

    // tier index
    if (!_tierIndex.has(m.tier)) _tierIndex.set(m.tier, []);
    _tierIndex.get(m.tier)!.push(m.code);

    // product index
    if (!_productIndex.has(productKey)) _productIndex.set(productKey, []);
    _productIndex.get(productKey)!.push(m.code);
  }
}

/** Seal the registry — no further registrations allowed. */
export function sealModuleRegistry(): void {
  _sealed = true;
}

// ── Query API ────────────────────────────────────────────────────────

/** Get all registered module codes as an array. */
export function getAllRegisteredModuleCodes(): string[] {
  return [..._codes];
}

/** Get the count of registered modules. */
export function getRegisteredModuleCount(): number {
  return _codes.size;
}

/** Get module codes belonging to a specific hierarchy tier. */
export function getModuleCodesByTier(tier: ModuleHierarchyTier): string[] {
  return _tierIndex.get(tier) ?? [];
}

/** Get module codes belonging to a specific product. */
export function getModuleCodesByProduct(productKey: string): string[] {
  return _productIndex.get(productKey) ?? [];
}

/** Check if a string is a registered module code. */
export function isRegisteredModuleCode(code: string): boolean {
  return _codes.has(code);
}

/** Get the registry entry for a module code. */
export function getRegisteredModuleEntry(code: string): RegisteredModuleEntry | undefined {
  return _entries.get(code);
}

// ── Test/Reset (test-only) ───────────────────────────────────────────

/** @internal Reset registry — test use only. */
export function _resetModuleRegistry(): void {
  _codes.clear();
  _entries.clear();
  _tierIndex.clear();
  _productIndex.clear();
  _sealed = false;
}
