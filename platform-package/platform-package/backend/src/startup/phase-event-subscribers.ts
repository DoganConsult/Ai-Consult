// @ts-nocheck
import express from 'express';
import { toErrorMessage } from '../errors/http-error.util';
import { logger } from '../platform/dos/observability/logger.service';

export async function runEventSubscribersPhase(_app: express.Express): Promise<void> {
  logger.info('[Platform] Event subscriber phase — platform-only mode (no product routes mounted)');
}
