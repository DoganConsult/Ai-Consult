// @ts-nocheck
import { logger } from '../../platform/dos/observability/logger.service';
import { toErrorMessage } from '../../errors/http-error.util';
import { buildPgSslConfig } from './ssl-config';
import { getPlatformConnectionConfig } from './platform-db.config';

let pgmqClient: unknown = null;
let isConnected = false;

export async function connectPGMQ(): Promise<boolean> {
  if (process.env.PGMQ_ENABLED !== 'true') {
    logger.info('[PGMQ] Disabled (PGMQ_ENABLED != true)');
    return false;
  }

  try {
    const { Pgmq } = require('pgmq-js');
    const prefix = process.env.PGMQ_QUEUE_PREFIX || 'platform_';

    const dbConfig = getPlatformConnectionConfig();
    pgmqClient = await Pgmq.new({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      ssl: buildPgSslConfig(),
    });

    isConnected = true;
    logger.info(`[PGMQ] Connected (prefix: ${prefix})`);
    return true;
  } catch (err: unknown) {
    logger.warn(`[PGMQ] Connection failed: ${toErrorMessage(err)}`);
    isConnected = false;
    return false;
  }
}

export function getPGMQ(): unknown {
  return pgmqClient;
}

export function pgmqConnected(): boolean {
  return isConnected;
}

export async function createQueue(name: string): Promise<boolean> {
  if (!pgmqClient || !isConnected) return false;
  const prefix = process.env.PGMQ_QUEUE_PREFIX || 'platform_';
  try {
    await pgmqClient.queue.create(`${prefix}${name}`);
    logger.info(`[PGMQ] Queue created: ${prefix}${name}`);
    return true;
  } catch (err: unknown) {
    logger.error(`[PGMQ] Create queue failed: ${toErrorMessage(err)}`);
    return false;
  }
}

export async function sendMessage(queue: string, payload: Record<string, unknown>, delay = 0): Promise<string | null> {
  if (!pgmqClient || !isConnected) return null;
  const prefix = process.env.PGMQ_QUEUE_PREFIX || 'platform_';
  try {
    const msgId = await pgmqClient.msg.send(`${prefix}${queue}`, payload, delay);
    return String(msgId);
  } catch (err: unknown) {
    logger.error(`[PGMQ] Send failed: ${toErrorMessage(err)}`);
    return null;
  }
}

export async function readMessage(queue: string, visibilityTimeout = 30): Promise<any | null> {
  if (!pgmqClient || !isConnected) return null;
  const prefix = process.env.PGMQ_QUEUE_PREFIX || 'platform_';
  try {
    return await pgmqClient.msg.read(`${prefix}${queue}`, visibilityTimeout);
  } catch (err: unknown) {
    logger.error(`[PGMQ] Read failed: ${toErrorMessage(err)}`);
    return null;
  }
}

export async function disconnectPGMQ(): Promise<void> {
  if (pgmqClient) {
    try {
      await pgmqClient.close();
    } catch { /* ignore */ }
  }
  pgmqClient = null;
  isConnected = false;
  logger.info('[PGMQ] Disconnected');
}
