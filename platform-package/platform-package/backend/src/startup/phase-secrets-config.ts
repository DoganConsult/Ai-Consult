// @ts-nocheck
import express from 'express';
import { validateRequiredEnv } from '../config/auth/env-check';
import { initTracing } from '../config/app/tracing';
import { toErrorMessage } from '../errors/http-error.util';
import { logger } from '../platform/dos/observability/logger.service';

export async function runSecretsAndConfigPhase(_app: express.Express): Promise<void> {
  try {
    const { bootstrapSecrets } = await import('../config/auth/secrets-bootstrap');
    await bootstrapSecrets();
  } catch (err: unknown) {
    logger.error('[SecretsBootstrap] Fatal error during secrets bootstrap', { error: toErrorMessage(err) });
    if (process.env.NODE_ENV === 'production') throw err;
  }

  await initTracing();

  validateRequiredEnv();

  try {
    const profile = { mode: process.env.DEPLOYMENT_MODE || 'standalone', tenantIsolation: 'schema', storage: 'local', secrets: 'env', airGapped: false };
    logger.info(`[DeploymentProfile] mode=${profile.mode} isolation=${profile.tenantIsolation} storage=${profile.storage} secrets=${profile.secrets} airGapped=${profile.airGapped}`);
  } catch (e: unknown) {
    if (process.env.NODE_ENV === 'production') throw e;
    logger.warn('[DeploymentProfile] Validation skipped', { error: toErrorMessage(e) });
  }
}
