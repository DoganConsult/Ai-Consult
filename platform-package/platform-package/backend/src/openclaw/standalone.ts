// ============================================
// OpenClaw Standalone Server Entry Point
// Run as: node dist/openclaw/standalone.js
// ============================================

import { startOpenClawServer } from './server';
import { logger } from '../platform/dos/observability/logger.service';
import { registerGracefulShutdown } from '../platform/dos/resilience/graceful-shutdown';

let serverInstance: Awaited<ReturnType<typeof startOpenClawServer>> | null = null;

/**
 * Start OpenClaw standalone server
 */
async function main(): Promise<void> {
  try {
    logger.info('[OpenClaw] Starting standalone server...');
    
    serverInstance = await startOpenClawServer();
    
    logger.info('[OpenClaw] Server started successfully', {
      port: serverInstance.port,
      host: serverInstance.host,
    });

    // Register graceful shutdown
    registerGracefulShutdown({
      httpServer: serverInstance.httpServer,
      closeWebSocket: async () => {
        if (serverInstance?.wsServer) {
          return new Promise<void>((resolve) => {
            serverInstance!.wsServer!.close(() => {
              logger.info('[OpenClaw] WebSocket server closed');
              resolve();
            });
          });
        }
      },
      logger: (msg: string) => logger.info(msg),
    });
  } catch (err: unknown) {
    logger.error('[OpenClaw] Failed to start server', { error: String(err) });
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((err) => {
    logger.error('[OpenClaw] Fatal error', { error: String(err) });
    process.exit(1);
  });
}

export { main as startOpenClawStandalone };
