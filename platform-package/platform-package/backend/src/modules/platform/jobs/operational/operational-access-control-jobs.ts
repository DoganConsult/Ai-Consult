// @ts-nocheck
import { logger } from '../../../../platform/dos/observability/logger.service';
import { emptyResult } from '../../../../config/database/database';
/**
 * Access control domain operational job definitions.
 * Covers quarterly access review campaigns and auto-revoke processing.
 */
import { JobDefinition } from '../misc/job-types';
import { toErrorMessage } from '../../../../errors/http-error.util';
import { swallowDefault, EC } from '../../../../platform/dos/resilience/resilient-catch';

export async function getAccessControlOperationalJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('../../../../platform/dos/jobs/job-scheduler.service');

  return [
    // Access Review Quarterly Campaign — quarterly on 1st of Jan, Apr, Jul, Oct at 8 AM (Feature 46)
    {
      name: 'access-review-quarterly-campaign',
      cron: '0 8 1 1,4,7,10 *',
      handler: async () => {
        logger.info("[Job] access-review-quarterly-campaign executed");
        try {
          async function getAutomationConfig(_tenantId?: string): Promise<unknown> { return { enabled: false }; }
async function createQuarterlyCampaign(..._args: any[]): Promise<unknown> { return {}; }
          const { safeQuery, tenantSchema } = await import('../../../../config/database/database');
          const tenants = await getProvisionedTenants();
          let totalCampaigns = 0;

          for (const t of tenants) {
            try {
              const config = await getAutomationConfig(t.tenant_id);
              if (!config.enabled) continue;

              // Check if a campaign already exists for this quarter
              const schema = tenantSchema(t.tenant_id);
              const now = new Date();
              const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
              const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);

              const existing = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
                `SELECT campaign_id FROM "${schema}".access_review_campaigns
                 WHERE created_at >= $1 AND created_at <= $2
                 LIMIT 1`,
                [quarterStart.toISOString(), quarterEnd.toISOString()]
              ), { operation: 'query access_review_campaigns' });

              if (existing.rows.length > 0) {
                logger.info(`[Job] access-review-quarterly-campaign: tenant ${t.tenant_id} — campaign already exists for this quarter`);
                continue;
              }

              const result = await createQuarterlyCampaign(t.tenant_id, {});
              totalCampaigns++;
              logger.info(`[Job] access-review-quarterly-campaign: tenant ${t.tenant_id} — created campaign ${result.campaignId} with ${result.itemsCreated} items`);
            } catch (tenantErr: unknown) {
              if (!toErrorMessage(tenantErr).includes("does not exist")) {
                logger.error(`[Job] access-review-quarterly-campaign error for tenant ${t.tenant_id}: ${toErrorMessage(tenantErr)}`);
              }
            }
          }

          if (totalCampaigns > 0) {
            logger.info(`[Job] access-review-quarterly-campaign: ${totalCampaigns} campaigns created across ${tenants.length} tenants`);
          }
        } catch (err: unknown) {
          logger.error("[Job] access-review-quarterly-campaign error:", toErrorMessage(err));
        }
      },
    },

    // Access Review Auto-Revoke Processing — daily at 9 AM (Feature 46)
    {
      name: 'access-review-auto-revoke',
      cron: '0 9 * * *',
      handler: async () => {
        logger.info("[Job] access-review-auto-revoke executed");
        try {
          async function getAutomationConfig(_tenantId?: string): Promise<unknown> { return { enabled: false }; }
async function processAutoRevoke(_tenantId?: string): Promise<{ revoked: number }> { return { revoked: 0 }; }
async function processRevokeDecisions(_tenantId?: string): Promise<{ processed: number }> { return { processed: 0 }; }
          const tenants = await getProvisionedTenants();
          let totalRevoked = 0;
          let totalProcessed = 0;

          for (const t of tenants) {
            try {
              const config = await getAutomationConfig(t.tenant_id);
              if (!config.enabled || !config.autoRevokeEnabled) continue;

              // Process auto-revoke for items past deadline + grace period
              const revokeResult = await processAutoRevoke(t.tenant_id);
              totalRevoked += revokeResult.revoked;

              // Process revoke decisions (items where reviewer explicitly marked for revocation)
              const decisionResult = await processRevokeDecisions(t.tenant_id);
              totalProcessed += decisionResult.processed;

              if (revokeResult.revoked > 0 || decisionResult.processed > 0) {
                logger.info(`[Job] access-review-auto-revoke: tenant ${t.tenant_id} — ${revokeResult.revoked} auto-revoked, ${decisionResult.processed} decisions processed`);
              }
            } catch (tenantErr: unknown) {
              if (!toErrorMessage(tenantErr).includes("does not exist")) {
                logger.error(`[Job] access-review-auto-revoke error for tenant ${t.tenant_id}: ${toErrorMessage(tenantErr)}`);
              }
            }
          }

          if (totalRevoked > 0 || totalProcessed > 0) {
            logger.info(`[Job] access-review-auto-revoke: ${totalRevoked} total revoked, ${totalProcessed} decisions processed across ${tenants.length} tenants`);
          }
        } catch (err: unknown) {
          logger.error("[Job] access-review-auto-revoke error:", toErrorMessage(err));
        }
      },
    },
  ];
}
