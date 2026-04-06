// @ts-nocheck
import express from 'express';
import { registerGracefulShutdown } from '../platform/dos/resilience/graceful-shutdown';
import { startMemoryMonitor } from '../platform/dos/observability/services/memory-monitor.service';
import { disconnectRedis } from '../config/database/redis';
import { toErrorMessage } from '../errors/http-error.util';
import { logger } from '../platform/dos/observability/logger.service';
import { mountFinalHandlers } from '../server-routes';

export async function runServerListenPhase(app: express.Express, PORT: string | number): Promise<void> {
  startMemoryMonitor();

  logger.info('[Platform] Startup status', {
    mode: 'platform-only',
    productRoutes: 'none',
    legacyProvisioning: process.env.ALLOW_LEGACY_PROVISIONING === 'true' ? 'ENABLED' : 'BLOCKED',
  });

  mountFinalHandlers(app);

  const httpServer = app.listen(PORT, () => {
    logger.info('Platform server started', { port: PORT, nodeEnv: process.env.NODE_ENV || 'development', pid: process.pid });
    if (process.send) {
      process.send('ready');
    }
  });

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.fatal(`Port ${PORT} is in use — exiting`, { code: err.code });
      process.exit(1);
    } else {
      logger.fatal('Server error', { error: toErrorMessage(err), code: err.code });
      process.exit(1);
    }
  });

  try {
    const { tenantConnectionResolver } = await import('../config/app/tenant-connection-resolver');
    tenantConnectionResolver.startIdleCleanup();

    registerGracefulShutdown({
      httpServer,
      closeDatabase: async () => {
        await tenantConnectionResolver.shutdown();
        await disconnectRedis();
        try { const { disconnectOpenFGA } = await import('../config/app/openfga'); await disconnectOpenFGA(); } catch {}
        try { const { disconnectPGMQ } = await import('../config/database/pgmq'); await disconnectPGMQ(); } catch {}
        try { const { disconnectApacheAGE } = await import('../config/database/apache-age'); await disconnectApacheAGE(); } catch {}
        try { const { disconnectKeyVault } = await import('../config/auth/keyvault'); await disconnectKeyVault(); } catch {}
      },
      logger: (msg: string) => logger.info(msg),
    });
  } catch (e: unknown) {
    logger.warn('[GracefulShutdown] Registration skipped', { error: toErrorMessage(e) });
  }
}
