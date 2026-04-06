import { logger } from '../../platform/dos/observability/logger.service';

export async function syncAllTenants(): Promise<{ totalTenants: number; totalDiscrepancies: number; synced: number; failed: number }> {
  logger.info('[schema-sync] Tenant schema sync — no tenants provisioned yet');
  return { totalTenants: 0, totalDiscrepancies: 0, synced: 0, failed: 0 };
}
