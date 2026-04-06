import { logger } from '../../../platform/dos/observability/services/logger.service';
import type { PackManifest } from './types';

type BootstrapHook = (tenantId: string) => Promise<unknown>;

const _hooks: BootstrapHook[] = [];
const _defaultModules: string[] = [];
const _productManifests: PackManifest[] = [];

export function registerProductBootstrapHook(hook: BootstrapHook): void {
  _hooks.push(hook);
}

export async function runProductBootstrapHooks(tenantId: string): Promise<void> {
  for (const hook of _hooks) {
    try {
      await hook(tenantId);
    } catch (err: unknown) {
      logger.warn(`[ProductBootstrap] Hook failed for tenant ${tenantId}:`, (err as Error).message);
    }
  }
}

export function registerDefaultProductModule(moduleCode: string): void {
  if (!_defaultModules.includes(moduleCode)) {
    _defaultModules.push(moduleCode);
  }
}

export function getDefaultProductModules(): string[] {
  return [..._defaultModules];
}

export function registerProductManifest(manifest: PackManifest): void {
  if (!_productManifests.find(m => m.pack_key === manifest.pack_key)) {
    _productManifests.push(manifest);
  }
}

export function getProductManifests(): PackManifest[] {
  return [..._productManifests];
}
