import express from 'express';
import { toErrorMessage } from './errors/http-error.util';
import { logger } from './platform/dos/observability/logger.service';
import { runSecretsAndConfigPhase } from './startup/phase-secrets-config';
import { runConnectionsPhase } from './startup/phase-connections';
import { runMigrationsAndSeedsPhase } from './startup/phase-migrations-seeds';
import { runStartupValidations } from './startup/phase-validations';
import { runEventSubscribersPhase } from './startup/phase-event-subscribers';
import { runCronJobsPhase } from './startup/phase-cron-jobs';
import { runServerListenPhase } from './startup/phase-server-listen';

async function start(app: express.Express, PORT: string | number) {
  await runSecretsAndConfigPhase(app);
  await runConnectionsPhase();
  await runMigrationsAndSeedsPhase();
  await runStartupValidations();
  await runEventSubscribersPhase(app);
  await runCronJobsPhase();
  await runServerListenPhase(app, PORT);
}

export function startServer(app: express.Express, PORT: string | number): void {
  process.on('unhandledRejection', (reason: unknown) => {
    const r = reason as Record<string, unknown> | null;
    logger.error('Unhandled Promise rejection', { error: (r as Record<string, unknown>)?.message || String(reason), stack: (r as Record<string, unknown>)?.stack });
  });

  process.on('uncaughtException', (err: Error) => {
    logger.fatal('Uncaught exception — shutting down', { error: toErrorMessage(err), stack: (err instanceof Error ? err.stack : undefined) });
    process.exit(1);
  });

  start(app, PORT).catch(err => { logger.fatal("Failed to start", { error: toErrorMessage(err), stack: (err instanceof Error ? err.stack : undefined) }); process.exit(1); });
}
