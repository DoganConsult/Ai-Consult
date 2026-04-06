/**
 * Product Bootstrap Hook Interface
 *
 * Products register their bootstrap hooks via registerProductBootstrapHook().
 * The provisioning pipeline calls runProductBootstrapHooks() during the
 * install_product_packs step instead of hardwiring product-specific logic.
 *
 * @owner DOS
 * Law 15 compliance: products must be removable without breaking DOS or DAuth.
 */

export interface ProductBootstrapHook {
  /** Unique product key (e.g. 'grc-platform', 'compliance-cloud') */
  productKey: string;
  /** Human-readable product name */
  productName: string;
  /** Called during provisioning to install product-specific packs, agents, seeds */
  onProvision(context: ProductProvisioningContext): Promise<void>;
  /** Called when product is being removed from a tenant */
  onDeprovision?(context: ProductProvisioningContext): Promise<void>;
}

export interface ProductProvisioningContext {
  tenantId: string;
  userId: string;
  schemaName: string;
  sessionId?: string;
  workspaceSeed?: Record<string, unknown>;
}

const hooks: ProductBootstrapHook[] = [];

/**
 * Register a product bootstrap hook. If a hook with the same productKey
 * already exists, it is replaced (idempotent re-registration).
 */
export function registerProductBootstrapHook(hook: ProductBootstrapHook): void {
  const existing = hooks.findIndex(h => h.productKey === hook.productKey);
  if (existing >= 0) hooks[existing] = hook;
  else hooks.push(hook);
}

/**
 * Run all registered product bootstrap hooks for a provisioning context.
 * Each hook is run independently; failures in one hook do not block others.
 * Returns per-product results for logging and diagnostics.
 */
export async function runProductBootstrapHooks(
  context: ProductProvisioningContext,
): Promise<{ productKey: string; success: boolean; error?: string }[]> {
  const results: { productKey: string; success: boolean; error?: string }[] = [];
  for (const hook of hooks) {
    try {
      await hook.onProvision(context);
      results.push({ productKey: hook.productKey, success: true });
    } catch (err) {
      results.push({
        productKey: hook.productKey,
        success: false,
        error: (err as Error).message,
      });
    }
  }
  return results;
}

/** Returns the list of registered product keys for diagnostics. */
export function getRegisteredProductKeys(): string[] {
  return hooks.map(h => h.productKey);
}
