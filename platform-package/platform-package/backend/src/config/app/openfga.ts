import { logger } from '../../platform/dos/observability/logger.service';
import { toErrorMessage } from '../../errors/http-error.util';

interface FGAClientLike {
  readAuthorizationModels(): Promise<unknown>;
  check(params: { user: string; relation: string; object: string }): Promise<{ allowed?: boolean }>;
  write(params: { writes: Array<{ user: string; relation: string; object: string }> }): Promise<unknown>;
  writeAuthorizationModel?(model: unknown): Promise<{ authorization_model_id?: string }>;
}

let fgaClient: FGAClientLike | null = null;
let isConnected = false;

export interface OpenFGAConfig {
  apiUrl: string;
  storeId: string;
  modelId: string;
}

function buildConfig(): OpenFGAConfig {
  return {
    apiUrl: process.env.OPENFGA_API_URL || 'http://localhost:8081',
    storeId: process.env.OPENFGA_STORE_ID || '',
    modelId: process.env.OPENFGA_MODEL_ID || '',
  };
}

export async function connectOpenFGA(): Promise<boolean> {
  if (process.env.OPENFGA_ENABLED !== 'true') {
    logger.info('[OpenFGA] Disabled (OPENFGA_ENABLED != true)');
    return false;
  }

  const config = buildConfig();
  if (!config.storeId) {
    logger.warn('[OpenFGA] OPENFGA_STORE_ID not set — skipping initialization');
    return false;
  }

  try {
    const { OpenFgaClient } = require('@openfga/sdk');
    fgaClient = new OpenFgaClient({
      apiUrl: config.apiUrl,
      storeId: config.storeId,
      authorizationModelId: config.modelId || undefined,
    });

    await fgaClient.readAuthorizationModels!();
    isConnected = true;
    logger.info(`[OpenFGA] Connected → ${config.apiUrl} (store: ${config.storeId})`);
    return true;
  } catch (err: unknown) {
    logger.warn(`[OpenFGA] Connection failed: ${toErrorMessage(err)}`);
    isConnected = false;
    return false;
  }
}

export function getOpenFGAClient(): FGAClientLike | null {
  return fgaClient;
}

export function openfgaConnected(): boolean {
  return isConnected;
}

export async function checkPermission(
  user: string,
  relation: string,
  object: string,
): Promise<boolean> {
  if (!fgaClient || !isConnected) return false;
  try {
    const { allowed } = await fgaClient.check({ user, relation, object });
    return !!allowed;
  } catch (err: unknown) {
    logger.error(`[OpenFGA] Check failed: ${toErrorMessage(err)}`);
    return false;
  }
}

export async function writeRelationship(
  user: string,
  relation: string,
  object: string,
): Promise<boolean> {
  if (!fgaClient || !isConnected) return false;
  try {
    await fgaClient.write({
      writes: [{ user, relation, object }],
    });
    return true;
  } catch (err: unknown) {
    logger.error(`[OpenFGA] Write failed: ${toErrorMessage(err)}`);
    return false;
  }
}

export async function disconnectOpenFGA(): Promise<void> {
  fgaClient = null;
  isConnected = false;
  logger.info('[OpenFGA] Disconnected');
}
