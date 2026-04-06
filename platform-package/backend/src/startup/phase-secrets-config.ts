import express from 'express';
import fs from 'fs';
import path from 'path';
import { validateRequiredEnv } from '../config/auth/env-check';
import { initTracing } from '../config/app/tracing';
import { toErrorMessage } from '../errors/http-error.util';
import { logger } from '../platform/dos/observability/logger.service';

export async function runSecretsAndConfigPhase(_app: express.Express): Promise<void> {
  // Ensure logs directory exists for PM2 and logger
  const logsDir = path.resolve(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  try {
    const { bootstrapSecrets } = await import('../config/auth/secrets-bootstrap');
    await bootstrapSecrets();
  } catch (err: unknown) {
    logger.error('[SecretsBootstrap] Fatal error during secrets bootstrap', { error: toErrorMessage(err) });
    if (process.env.NODE_ENV === 'production') throw err;
  }

  await initTracing();

  validateRequiredEnv();

  // Production secret sanity — catch CHANGE_ME placeholders before serving traffic
  if (process.env.NODE_ENV === 'production') {
    const dangerousPlaceholders = ['CHANGE_ME', 'CHANGE_ME_TO_A_LONG_RANDOM_STRING', 'CHANGE_ME_TO_ANOTHER_LONG_RANDOM_STRING'];
    for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DAUTH_JWT_SECRET', 'DAUTH_JWT_REFRESH_SECRET']) {
      const val = process.env[key] || '';
      if (!val || dangerousPlaceholders.some(p => val.startsWith(p))) {
        throw new Error(`[SecretsBootstrap] FATAL: ${key} is not set or is a placeholder — refusing to start in production`);
      }
    }
  }

  try {
    const profile = {
      mode:            process.env.DEPLOYMENT_MODE || 'standalone',
      tenantIsolation: process.env.TENANT_ISOLATION_MODE || 'schema',
      storage:         process.env.STORAGE_PROVIDER || 'local',
      secrets:         process.env.SECRETS_MODE || 'env',
      airGapped:       process.env.AIR_GAPPED === 'true',
    };
    logger.info(`[DeploymentProfile] mode=${profile.mode} isolation=${profile.tenantIsolation} storage=${profile.storage} secrets=${profile.secrets} airGapped=${profile.airGapped}`);
  } catch (e: unknown) {
    if (process.env.NODE_ENV === 'production') throw e;
    logger.warn('[DeploymentProfile] Validation skipped', { error: toErrorMessage(e) });
  }
}
