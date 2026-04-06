// @ts-nocheck
import { catchHandler, EC } from '../../../../../platform/dos/resilience/resilient-catch';
import { logger } from '../../../../../platform/dos/observability/logger.service';
/**
 * Governance domain job definitions.
 * Covers enforcement scanning, health scoring, auto-fire, review cycle engine,
 * policy review checks, and delegation management.
 */
import { JobDefinition } from '../job-types';
import { toErrorMessage } from '../../../../../errors/http-error.util';

export async function getGovernanceJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('../../../../../platform/dos/jobs/job-scheduler.service');

  return [
    // Governance enforcement scan — daily at 2:30 AM
    {
      name: 'governance-enforcement-scan',
      cron: '30 2 * * *',
      handler: async () => {
        try {
          const { runEnforcementScan } = await import("../../governance/services/governance/governance-enforcement.service");
          const { safeQuery } = await import('../../../../../config/database/database');
          const tenants = await safeQuery(`SELECT tenant_id FROM public.tenants WHERE status = 'active'`);
          for (const t of tenants.rows) {
            try { await runEnforcementScan(t.tenant_id); } catch { /* per-tenant non-fatal */ }
          }
          logger.info(`[Job] governance-enforcement-scan completed for ${tenants.rows.length} tenants`);
        } catch (err: unknown) {
          logger.error("[Job] governance-enforcement-scan error:", toErrorMessage(err));
        }
      },
    },

    // Governance health scoring — daily at 3 AM
    {
      name: 'governance-health-scoring',
      cron: '0 3 * * *',
      handler: async () => {
        try {
          const { computeGovernanceHealth } = await import("../../governance/services/governance/governance-health.service");
          const { safeQuery } = await import('../../../../../config/database/database');
          const tenants = await safeQuery(`SELECT tenant_id FROM public.tenants WHERE status = 'active'`);
          for (const t of tenants.rows) {
            try { await computeGovernanceHealth(t.tenant_id); } catch { /* per-tenant non-fatal */ }
          }
          logger.info(`[Job] governance-health-scoring completed for ${tenants.rows.length} tenants`);
        } catch (err: unknown) {
          logger.error("[Job] governance-health-scoring error:", toErrorMessage(err));
        }
      },
    },

    // Governance auto-fire — every 30 min
    {
      name: 'governance-auto-fire',
      cron: '*/30 * * * *',
      handler: async () => {
        logger.info("[Job] governance-auto-fire executed");
        try {
          const { runGovernanceAutoFire } = await import("../../governance/services/governance/governance-gap-scanner.service");
          const { query } = await import('../../../../../config/database/database');
          const tenants = await query("SELECT tenant_id FROM public.tenants WHERE status = 'active'");
          for (const t of tenants.rows) {
            try { await runGovernanceAutoFire(t.tenant_id, 'scheduler'); } catch { /* per-tenant non-fatal */ }
          }
          logger.info(`[Job] governance-auto-fire completed for ${tenants.rows.length} tenants`);
        } catch (err: unknown) {
          logger.error("[Job] governance-auto-fire error:", toErrorMessage(err));
        }
      },
    },

    // Review cycle engine — daily at 2 AM
    {
      name: 'review-cycle-engine',
      cron: '0 2 * * *',
      handler: async () => {
        logger.info("[Job] review-cycle-engine executed");
        try {
          const { checkReviewCycles } = await import("../../workflow/services/approvals/review-cycle-engine.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const due = await checkReviewCycles(t.tenant_id);
              if (due.length > 0) {
                logger.info(`[Job] review-cycle-engine: tenant ${t.tenant_id} — ${due.length} items due for review`);
              }
            } catch { /* tenant may not have governance tables */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] review-cycle-engine error:", toErrorMessage(err));
        }
      },
    },

    // Policy review date check — daily at 7 AM
    {
      name: 'policy-review-check',
      cron: '0 7 * * *',
      handler: async () => {
        logger.info("[Job] policy-review-check executed");
        try {
          const { createNotification } = await import('../../../../notification/services/notification.service');
          async function resolveAssigneeToUserId(tenantId: string, opts: { roleCode?: string } = {}): Promise<string | null> {
      const { safeQuery, tenantSchema } = await import('../../../../../config/database/database');
      const schema = tenantSchema(tenantId);
      if (!opts.roleCode) return null;
      const r = await safeQuery(`SELECT ura.user_id FROM "${schema}".user_role_assignments ura JOIN "${schema}".functional_roles fr ON fr.id=ura.functional_role_id WHERE fr.code=$1 AND ura.is_active=TRUE LIMIT 1`, [opts.roleCode]);
      return r.rows[0]?.user_id || null;
    }
          const { safeQuery } = await import('../../../../../config/database/database');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = `tenant_${t.tenant_id.replace(/-/g, '_')}`;
              const policies = await safeQuery(
                `SELECT policy_id, title, review_date, owner_id FROM "${schema}".policies
                 WHERE review_date IS NOT NULL
                   AND review_date <= CURRENT_DATE + INTERVAL '30 days'
                   AND review_date >= CURRENT_DATE
                   AND status = 'published'`,
              );
              for (const p of policies.rows) {
                let userId = p.owner_id;
                if (!userId) {
                  userId = (await resolveAssigneeToUserId(t.tenant_id, { roleCode: 'compliance_officer' })) ?? undefined;
                }
                if (userId) {
                  await createNotification(t.tenant_id, {
                    userId,
                    type: 'policy_review_due',
                    title: `Policy review approaching: ${p.title}`,
                    body: `Policy "${p.title}" is due for review on ${p.review_date}.`,
                    link: `/policies/${p.policy_id}`,
                  }).catch(catchHandler(EC.EVENT_BUS, {}));
                }
              }
            } catch { /* schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] policy-review-check error:", toErrorMessage(err));
        }
      },
    },

    // Delegation Expiry Warning — daily at 3 AM
    {
      name: 'delegation-expiry-warning',
      cron: '0 3 * * *',
      handler: async () => {
        logger.info("[Job] delegation-expiry-warning executed");
        try {
          const { getExpiringDelegations } = await import('../../../governance/services/governance/governance-delegations.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const expiring = await getExpiringDelegations(t.tenant_id, 7);
              if (expiring.length > 0) logger.info(`[Job] delegation-expiry-warning: ${expiring.length} expiring for tenant ${t.tenant_id}`);
            } catch { /* tenant may not have governance_delegations */ }
          }
        } catch (err: unknown) { logger.error("[Job] delegation-expiry-warning error:", toErrorMessage(err)); }
      },
    },

    // Delegation Auto-Expire — daily at 4 AM
    {
      name: 'delegation-auto-expire',
      cron: '0 4 * * *',
      handler: async () => {
        logger.info("[Job] delegation-auto-expire executed");
        try {
          const { expireOverdueDelegations } = await import('../../../governance/services/governance/governance-delegations.service');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const count = await expireOverdueDelegations(t.tenant_id);
              if (count > 0) logger.info(`[Job] delegation-auto-expire: expired ${count} delegations for tenant ${t.tenant_id}`);
            } catch { /* tenant may not have governance_delegations */ }
          }
        } catch (err: unknown) { logger.error("[Job] delegation-auto-expire error:", toErrorMessage(err)); }
      },
    },
  ];
}
