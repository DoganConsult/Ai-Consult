// @ts-nocheck
import { logger } from '../../platform/dos/observability/logger.service';
import { toErrorMessage } from '../../errors/http-error.util';

let secretClient: unknown = null;
let isConnected = false;

export async function connectKeyVault(): Promise<boolean> {
  if (process.env.AZURE_KEYVAULT_ENABLED !== 'true') {
    logger.info('[KeyVault] Disabled (AZURE_KEYVAULT_ENABLED != true)');
    return false;
  }

  const vaultUrl = process.env.AZURE_KEYVAULT_URL || process.env.AZURE_KEY_VAULT_URL;
  if (!vaultUrl) {
    logger.warn('[KeyVault] AZURE_KEYVAULT_URL / AZURE_KEY_VAULT_URL not set — skipping initialization');
    return false;
  }

  try {
    const { DefaultAzureCredential } = require('@azure/identity');
    const { SecretClient } = require('@azure/keyvault-secrets');

    const credential = new DefaultAzureCredential();
    secretClient = new SecretClient(vaultUrl, credential);

    await secretClient.getSecret('test-connectivity').catch(() => {});
    isConnected = true;
    logger.info(`[KeyVault] Connected → ${vaultUrl}`);
    return true;
  } catch (err: unknown) {
    logger.warn(`[KeyVault] Connection failed: ${toErrorMessage(err)}`);
    isConnected = false;
    return false;
  }
}

export function getKeyVaultClient(): unknown {
  return secretClient;
}

export function keyvaultConnected(): boolean {
  return isConnected;
}

export async function getSecret(name: string): Promise<string | null> {
  if (!secretClient || !isConnected) return null;
  try {
    const secret = await secretClient.getSecret(name);
    return secret.value || null;
  } catch (err: unknown) {
    logger.error(`[KeyVault] Get secret '${name}' failed: ${toErrorMessage(err)}`);
    return null;
  }
}

export async function setSecret(name: string, value: string): Promise<boolean> {
  if (!secretClient || !isConnected) return false;
  try {
    await secretClient.setSecret(name, value);
    return true;
  } catch (err: unknown) {
    logger.error(`[KeyVault] Set secret '${name}' failed: ${toErrorMessage(err)}`);
    return false;
  }
}

export async function listSecrets(): Promise<string[]> {
  if (!secretClient || !isConnected) return [];
  try {
    const names: string[] = [];
    for await (const prop of secretClient.listPropertiesOfSecrets()) {
      if (prop.name) names.push(prop.name);
    }
    return names;
  } catch (err: unknown) {
    logger.error(`[KeyVault] List secrets failed: ${toErrorMessage(err)}`);
    return [];
  }
}

export async function disconnectKeyVault(): Promise<void> {
  secretClient = null;
  isConnected = false;
  logger.info('[KeyVault] Disconnected');
}
