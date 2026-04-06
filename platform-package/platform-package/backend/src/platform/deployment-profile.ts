/**
 * Deployment Profile — provides the default product key and
 * deployment environment metadata for the running instance.
 *
 * Delegates to platform-identity.ts for product-neutral defaults.
 * No hardcoded product names allowed here — Law 15 (product removable).
 *
 * @owner DOS
 */

import { getDefaultProductKey as _getIdentityProductKey } from './dos/config/platform-identity';

/**
 * Returns the default product key for this deployment.
 * Used by provisioning, scoring, and module entitlement resolution.
 */
export function getDefaultProductKey(): string {
  return _getIdentityProductKey();
}

/**
 * Returns the current deployment environment.
 */
export function getDeploymentEnvironment(): 'production' | 'staging' | 'development' {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
}
export function resolveDeploymentProfile(): { environment: string; productKey: string; mode: string } {
  return { environment: getDeploymentEnvironment(), productKey: getDefaultProductKey(), mode: process.env.DEPLOYMENT_MODE || 'standalone' };
}
export function isDedicatedDbMode(): boolean { return false; }
export function isOnPremMode(): boolean { return false; }
