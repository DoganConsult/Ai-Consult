import { logger } from '../../../../platform/dos/observability/services/logger.service';
// ============================================
// Control-plane tenant_domains — sync helpers
// ============================================

import { safeQuery } from "../../../../config/database";

/**
 * When a tenant admin sets `tenants.custom_domain`, mirror it into `public.tenant_domains`
 * as a verified primary hostname so resolution uses the same path as multi-domain entries.
 */
export async function upsertVerifiedPrimaryDomainFromCustomDomain(
  tenantId: string,
  rawHost: string | null | undefined
): Promise<void> {
  if (!rawHost?.trim()) return;
  const host = rawHost.trim().toLowerCase();

  const existing = await safeQuery(
    `SELECT domain_id, tenant_id FROM public.tenant_domains
     WHERE deleted_at IS NULL AND LOWER(TRIM(hostname)) = $1`,
    [host]
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0] as { domain_id: string; tenant_id: string };
    if (row.tenant_id !== tenantId) {
      logger.warn(
        `[tenant-domains] hostname ${host} already mapped to tenant ${row.tenant_id}; skip sync for ${tenantId}`
      );
      return;
    }
    await safeQuery(
      `UPDATE public.tenant_domains
       SET verified_at = NOW(), updated_at = NOW(), is_primary = TRUE, deleted_at = NULL
       WHERE domain_id = $1`,
      [row.domain_id]
    );
    return;
  }

  await safeQuery(
    `INSERT INTO public.tenant_domains (tenant_id, hostname, is_primary, verified_at)
     VALUES ($1, $2, TRUE, NOW())`,
    [tenantId, host]
  );
}
