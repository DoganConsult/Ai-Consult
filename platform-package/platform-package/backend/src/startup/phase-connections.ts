// @ts-nocheck
import { waitForDatabase } from '../config/database/database';
import { connectRedis } from '../config/database/redis';
import { toErrorMessage } from '../errors/http-error.util';
import { logger } from '../platform/dos/observability/logger.service';

export async function runConnectionsPhase(): Promise<void> {
  await waitForDatabase();

  const redisOk = await connectRedis();
  if (redisOk) {
    logger.info('Redis cache connected');
  } else {
    logger.warn('Redis unavailable — using in-memory cache fallback');
  }

  try {
    const { connectOpenFGA } = await import('../config/app/openfga');
    const connected = await connectOpenFGA();
    if (connected) {
      logger.info('[OpenFGA] Connected');
    }
  } catch (e: unknown) { logger.warn('[OpenFGA] Init skipped', { error: toErrorMessage(e) }); }

  try {
    const { connectPGMQ } = await import('../config/database/pgmq');
    await connectPGMQ();
  } catch (e: unknown) { logger.warn('[PGMQ] Init skipped', { error: toErrorMessage(e) }); }

  try {
    const { connectApacheAGE } = await import('../config/database/apache-age');
    await connectApacheAGE();
  } catch (e: unknown) { logger.warn('[ApacheAGE] Init skipped', { error: toErrorMessage(e) }); }

  try {
    const { isClickHouseEnabled, ensureClickHouseTables } = await import('../config/database/clickhouse-client');
    if (isClickHouseEnabled()) {
      await ensureClickHouseTables();
      logger.info('[ClickHouse] Analytics database initialized');
    }
  } catch (e: unknown) { logger.warn('[ClickHouse] Init skipped', { error: toErrorMessage(e) }); }

  try {
    const { connectKeyVault } = await import('../config/auth/keyvault');
    const kvConnected = await connectKeyVault();
    if (!kvConnected && process.env.DEPLOYMENT_MODE === 'saas') {
      logger.error('[KeyVault] CRITICAL: KeyVault is disabled in SaaS mode.');
      if (process.env.NODE_ENV === 'production') {
        throw new Error('[KeyVault] KeyVault must be enabled for SaaS production deployments');
      }
    }
  } catch (e: unknown) {
    if (process.env.DEPLOYMENT_MODE === 'saas' && process.env.NODE_ENV === 'production') throw e;
    logger.warn('[KeyVault] Init skipped', { error: toErrorMessage(e) });
  }

  try {
    const path = await import('path');
    const { initVectorStore } = await import('../platform/dos/search/services/vector-search.service');
    const indexPath = process.env.VECTOR_INDEX_PATH || path.resolve(process.cwd(), 'data/vector-index');
    await initVectorStore(indexPath);
  } catch (e: unknown) { logger.warn('[VectorSearch] Init skipped', { error: toErrorMessage(e) }); }
}
