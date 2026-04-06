// @ts-nocheck
/**
 * seed-module-security.ts
 *
 * Loads all module security registrations into the DAuth security registry
 * at startup. Each module's security/<module>.security.ts and
 * security/<module>.approval-matrix.ts are dynamically imported.
 *
 * Law 2: DAuth owns ingestion of all security metadata.
 * Law 3: Data-driven — all from typed module registrations.
 */

import { registerModuleSecurity, getRegistryStats } from '../platform/dauth/registry/module-security-seeder.registry';
import { logger } from '../platform/dos/observability/logger.service';
import * as fs from 'node:fs';
import * as path from 'node:path';
// __dirname is available natively in CommonJS (tsconfig target)

const MODULES_DIR = path.resolve(__dirname, '../modules');

export async function seedModuleSecurity(): Promise<void> {
  const dirs = fs.readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
    .map(e => e.name);

  let loaded = 0;
  let failed = 0;

  for (const moduleDir of dirs) {
    const securityDir = path.join(MODULES_DIR, moduleDir, 'security');
    if (!fs.existsSync(securityDir)) continue;

    const securityFile = path.join(securityDir, `${moduleDir}.security.ts`);
    const approvalFile = path.join(securityDir, `${moduleDir}.approval-matrix.ts`);

    // Check for compiled .js versions (production) or .ts (dev with ts-node)
    const securityExists = fs.existsSync(securityFile) ||
      fs.existsSync(securityFile.replace('.ts', '.js'));
    const approvalExists = fs.existsSync(approvalFile) ||
      fs.existsSync(approvalFile.replace('.ts', '.js'));

    if (!securityExists) continue;

    try {
      const mc = moduleDir.replace(/-/g, '_').toUpperCase();

      // Dynamic import of security file
      const securityModule = await import(
        `../modules/${moduleDir}/security/${moduleDir}.security.ts`
      ).catch(() =>
        import(`../modules/${moduleDir}/security/${moduleDir}.security.js`)
      );

      const permissions = securityModule[`${mc}_PERMISSIONS`] ?? [];
      const roles = securityModule[`${mc}_ROLES`] ?? [];
      const actions = securityModule[`${mc}_ACTIONS`] ?? [];

      // Dynamic import of approval matrix
      let approvalRules: any[] = [];
      if (approvalExists) {
        const approvalModule = await import(
          `../modules/${moduleDir}/security/${moduleDir}.approval-matrix.ts`
        ).catch(() =>
          import(`../modules/${moduleDir}/security/${moduleDir}.approval-matrix.js`)
        );
        approvalRules = approvalModule[`${mc}_APPROVAL_MATRIX`] ?? [];
      }

      registerModuleSecurity(moduleDir, {
        permissions,
        roles,
        actions,
        approvalRules,
        ownershipRules: [],
        sodRules: [],
      });

      loaded++;
    } catch (err) {
      failed++;
      logger.warn(`[ModuleSecurity] Failed to load security for ${moduleDir}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const stats = getRegistryStats();
  logger.info(
    `[ModuleSecurity] Loaded ${loaded} modules (${failed} failed). ` +
    `Registry: ${stats.totalPermissions} perms, ${stats.totalRoles} roles, ` +
    `${stats.totalActions} actions, ${stats.totalApprovalRules} approval rules`,
  );
}
