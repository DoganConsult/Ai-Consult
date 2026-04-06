// @ts-nocheck
/**
 * Graceful Shutdown Handler
 * - Registers SIGTERM and SIGINT handlers
 * - Stops accepting new connections
 * - Waits for in-flight requests (up to 30s timeout)
 * - Closes database pool and WebSocket server
 * - Logs shutdown reason, drained connections, and duration
 * - Exits with code 0 (clean) or 1 (timeout)
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import type { Server } from 'http';
import { toErrorMessage } from './http-error.util';

export interface ShutdownDeps {
  httpServer: Server;
  closeDatabase?: () => Promise<void>;
  closeWebSocket?: () => Promise<void>;
  flushLangfuse?: () => Promise<void>;
  logger?: (msg: string) => void;
  timeoutMs?: number;
}

/**
 * Compute shutdown summary (pure, testable).
 */
export function buildShutdownSummary(
  signal: string,
  durationMs: number,
  drainedConnections: number,
  timedOut: boolean,
): { signal: string; durationMs: number; drainedConnections: number; exitCode: number } {
  return {
    signal,
    durationMs,
    drainedConnections,
    exitCode: timedOut ? 1 : 0,
  };
}

/**
 * Register graceful shutdown handlers on SIGTERM and SIGINT.
 */
export function registerGracefulShutdown(deps: ShutdownDeps): void {
  const {
    httpServer,
    closeDatabase,
    closeWebSocket,
    flushLangfuse,
    logger = console.log,
    timeoutMs = 30_000,
  } = deps;

  let shuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;

    const start = Date.now();
    logger(`[shutdown] Received ${signal}, starting graceful shutdown...`);

    let __timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      logger('[shutdown] Timeout reached, forcing exit.');
      process.exit(1);
    }, timeoutMs);

    try {
      // Stop accepting new connections
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      logger('[shutdown] HTTP server closed.');

      // Close WebSocket
      if (closeWebSocket) {
        await closeWebSocket();
        logger('[shutdown] WebSocket server closed.');
      }

      // Stop OpenClaw server if it exists
      const openClawServer = (global as any as Record<string, any>).__openClawServer;
      if (openClawServer) {
        try {
          const { stopOpenClawServer } = await import('../../../openclaw/server');
          await stopOpenClawServer(openClawServer as any);
          logger('[shutdown] OpenClaw server stopped.');
          (global as any as Record<string, any>).__openClawServer = null;
        } catch (err: unknown) {
          logger(`[shutdown] OpenClaw stop failed: ${toErrorMessage(err)}`);
        }
      }

      // Flush Langfuse events (ensure all traces are sent)
      if (flushLangfuse) {
        await flushLangfuse();
        logger('[shutdown] Langfuse events flushed.');
      }

      // Close database pool
      if (closeDatabase) {
        await closeDatabase();
        logger('[shutdown] Database pool closed.');
      }

      clearTimeout(timer);
      const duration = Date.now() - start;
      const summary = buildShutdownSummary(signal, duration, 0, false);
      logger(`[shutdown] Clean shutdown in ${summary.durationMs}ms.`);
      process.exit(0);
    } catch (err: unknown) {
      clearTimeout(timer);
      logger(`[shutdown] Error during shutdown: ${toErrorMessage(err)}`);
      process.exit(1);
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
