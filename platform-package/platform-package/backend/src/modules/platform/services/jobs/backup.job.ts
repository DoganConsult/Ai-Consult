// @ts-nocheck
/**
 * Platform Backup Job
 *
 * Nightly application-level backup job for critical tenant data.
 * Exports audit_logs, governance_action_items, controls, and risks
 * per tenant to Azure Blob Storage with an ISO-date timestamp prefix.
 *
 * Registered in the Platform Job Registry (jobs/index.ts).
 */

import { logger } from '../../../../platform/dos/observability/logger.service';
import { getProvisionedTenants } from '../job-scheduler.service';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { toErrorMessage } from '../../../../utils/http-error.util';

const BACKUP_TABLES = ['audit_logs', 'governance_action_items', 'controls', 'risks', 'exceptions'] as const;

async function uploadToBlob(containerName: string, blobName: string, content: string): Promise<void> {
  // Attempt Azure Blob upload if Key Vault credentials are available
  try {
    const { getSecret } = await import('../../../../config/keyvault');
    const connectionString = await getSecret('azure-storage-connection-string').catch(() => null);
    if (!connectionString) {
      logger.debug('[BackupJob] Azure Storage connection string not configured — skipping upload');
      return;
    }

    const { BlobServiceClient } = await import('@azure/storage-blob');
    const client = BlobServiceClient.fromConnectionString(connectionString);
    const container = client.getContainerClient(containerName);
    await container.createIfNotExists();
    const blockBlob = container.getBlockBlobClient(blobName);
    await blockBlob.upload(content, Buffer.byteLength(content, 'utf-8'));
    logger.info(`[BackupJob] Uploaded ${blobName} (${content.length} chars)`);
  } catch (err: unknown) {
    logger.warn(`[BackupJob] Azure Blob upload failed for ${blobName}:`, toErrorMessage(err));
  }
}

export async function runTenantBackup(): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const tenants = await getProvisionedTenants();

  logger.info(`[BackupJob] Starting backup for ${tenants.length} tenants (timestamp: ${timestamp})`);

  for (const tenant of tenants) {
    const tenantId = tenant.tenantId;
    const schema = tenantSchema(tenantId);

    for (const table of BACKUP_TABLES) {
      try {
        const result = await safeQuery(
          `SELECT * FROM "${schema}".${table} ORDER BY 1 LIMIT 50000`
        );

        if (result.rows.length === 0) continue;

        const csv = [
          Object.keys(result.rows[0]).join(','),
          ...result.rows.map(row =>
            Object.values(row).map(v =>
              v === null ? '' : `"${String(v).replace(/"/g, '""')}"`
            ).join(',')
          ),
        ].join('\n');

        const blobName = `${timestamp}/${tenantId}/${table}.csv`;
        await uploadToBlob('agrc-os-backups', blobName, csv);
      } catch (err: unknown) {
        logger.warn(`[BackupJob] Failed to backup ${schema}.${table}:`, toErrorMessage(err));
      }
    }

    logger.info(`[BackupJob] Completed backup for tenant: ${tenantId}`);
  }

  logger.info(`[BackupJob] Backup cycle complete for ${tenants.length} tenants`);
}
