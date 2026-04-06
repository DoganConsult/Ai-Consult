import { getAllRegisteredModuleCodes, getRegisteredModuleCount } from '../modules/registry/platform-module-registry';
/**
 * Shared provisioning readiness thresholds.
 *
 * Uses the platform module registry for module code queries.
 * Product-specific values (MWR_BASELINE_FLOOR, resolveMinMwrRowsRequired)
 * are still re-exported from canonical-modules.ts for backward compat.
 *
 * See docs/COMPILER-100-SPEC.md §2 (Readiness Gates).
 */

export { MWR_BASELINE_FLOOR, resolveMinMwrRowsRequired } from '../../../config/modules/canonical-modules';
export { CANONICAL_AGRC_MODULE_CODES, CANONICAL_MODULE_COUNT } from '../../../config/modules/canonical-modules';

/** Alias for backward compatibility */
export { MWR_BASELINE_FLOOR as MWR_FLOOR } from '../../../config/modules/canonical-modules';

/**
 * Simple synchronous floor for static checks (no DB).
 * For runtime with product_modules count, use resolveMinMwrRowsRequired().
 */
export function getMinimumMwrCount(): number {
  return 13; // MWR_BASELINE_FLOOR — flagship modules seeded by migration 179
}

/** Platform-clean way to get all registered module codes. */
export function getProvisioningModuleCodes(): readonly string[] {
  return getAllRegisteredModuleCodes();
}

/** Platform-clean way to get the registered module count. */
export function getProvisioningModuleCount(): number {
  return getRegisteredModuleCount();
}
