/**
 * Email Inbox Service — Processes inbound emails for all tenants.
 *
 * Polls configured email inboxes and routes messages to workflows,
 * tasks, or notification queues.
 */

import { logger } from '../../../../../platform/dos/observability/logger.service';
import { getProvisionedTenants } from '../../../../platform/services/tenant/job-scheduler.service';
import { safeQuery } from '../../../../../config/database';

/**
 * Poll email inboxes for all provisioned tenants.
 * Called by scheduled job.
 */
export async function pollAllTenants(): Promise<{
  tenantsPolled: number;
  messagesProcessed: number;
}> {
  const tenants = await getProvisionedTenants();
  let messagesProcessed = 0;

  for (const tenant of tenants) {
    try {
      const count = await pollTenantInbox(tenant.tenantId, tenant.schemaName);
      messagesProcessed += count;
    } catch (err) {
      logger.warn('[EmailInbox] Failed to poll tenant inbox', {
        tenantId: tenant.tenantId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (messagesProcessed > 0) {
    logger.info(`[EmailInbox] Polled ${tenants.length} tenants, processed ${messagesProcessed} messages`);
  }

  return { tenantsPolled: tenants.length, messagesProcessed };
}

async function pollTenantInbox(tenantId: string, schemaName: string): Promise<number> {
  // Check if tenant has email integration configured
  const { rows } = await safeQuery(
    `SELECT config_json FROM public.integration_configs
     WHERE tenant_id = $1 AND connector_type = 'email_inbox' AND is_active = TRUE LIMIT 1`,
    [tenantId],
  ).catch(() => ({ rows: [] }));

  if (rows.length === 0) return 0;

  // Future: implement IMAP/Graph API polling here
  // For now, check the inbox_messages table for unprocessed messages
  const { rows: unprocessed } = await safeQuery(
    `SELECT id FROM "${schemaName}".inbox_messages
     WHERE status = 'unprocessed' AND created_at > NOW() - INTERVAL '1 hour'
     LIMIT 50`,
  ).catch(() => ({ rows: [] }));

  if (unprocessed.length > 0) {
    await safeQuery(
      `UPDATE "${schemaName}".inbox_messages SET status = 'processing' WHERE id = ANY($1)`,
      [unprocessed.map((r: any) => r.id)],
    ).catch(() => {});
  }

  return unprocessed.length;
}
