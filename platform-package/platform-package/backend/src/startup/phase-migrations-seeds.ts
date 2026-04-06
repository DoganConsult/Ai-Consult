// @ts-nocheck
import { initMasterDB, migrateAllTenants, query as dbQuery } from '../config/database/database';
import { seedRegistry } from '../data/seed/seed-registry';
import { seedPlatformAdmin } from '../data/seed/seed-platform-admin';
import { toErrorMessage } from '../errors/http-error.util';
import type { GenericRow } from '../types/db-rows.types';
import { logger } from '../platform/dos/observability/logger.service';

export async function runMigrationsAndSeedsPhase(): Promise<void> {
  await initMasterDB();

  const instanceId = parseInt(process.env.NODE_APP_INSTANCE || '0', 10);
  if (instanceId !== 0) {
    await new Promise(resolve => setTimeout(resolve, 15000));
    return;
  }

  try {
    const { runMasterMigrations } = await import('../config/db/migration-runner');
    const migrationsApplied = await runMasterMigrations();
    if (migrationsApplied > 0) logger.info(`Applied ${migrationsApplied} master migrations successfully`);
  } catch (e: unknown) { logger.error('Master migrations failed', { error: toErrorMessage(e) }); }

  await migrateAllTenants();

  try {
    const { syncAllTenants } = await import('../config/db/tenant-schema-sync');
    const syncSummary = await syncAllTenants();
    if (syncSummary.totalDiscrepancies > 0) {
      logger.warn(`[schema-sync] ${syncSummary.totalDiscrepancies} discrepancy(ies) across ${syncSummary.totalTenants} tenant(s)`, { synced: syncSummary.synced, failed: syncSummary.failed });
    } else {
      logger.info(`[schema-sync] All ${syncSummary.totalTenants} tenant schema(s) verified`);
    }
  } catch (e: unknown) { logger.warn('[schema-sync] Tenant schema sync skipped', { error: toErrorMessage(e) }); }

  try { await seedRegistry(); } catch (err: unknown) { logger.error('[Seed] Registry seed failed (non-fatal):', { error: toErrorMessage(err) }); }

  try {
    const { configRepository, configBridge } = await import('../config/db/config-registry');
    const bridgeResult = await configBridge.initialize();
    logger.info(`[ConfigBridge] Loaded ${bridgeResult.loaded} keys, synced ${bridgeResult.synced} from env`);
  } catch (e: unknown) { logger.warn('[ConfigRegistry] Config initialization skipped', { error: toErrorMessage(e) }); }

  await seedPlatformAdmin().catch((e: GenericRow) => logger.warn('Platform admin seed skipped', { error: toErrorMessage(e) }));
}
