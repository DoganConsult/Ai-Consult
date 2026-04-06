// @ts-nocheck
import { catchHandler, EC } from '../../../../utils/resilient-catch';
import { logger } from '../../../../utils/logger';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { getFirstRow } from '../../../../utils/db-utils';

export interface ConsentStatus {
  granted: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
  purpose: string;
  piiRedactionEnabled: boolean;
}

export async function getConsentStatus(
  tenantId: string,
  userId: string,
): Promise<ConsentStatus> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT consent_granted, consent_granted_at, consent_revoked_at,
              consent_purpose, pii_redaction_enabled
       FROM "${schema}".shadow_agent_config
       WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId],
    );
    if (result.rows.length === 0) {
      return { granted: false, grantedAt: null, revokedAt: null, purpose: '', piiRedactionEnabled: true };
    }
    const r = getFirstRow(result);
    return {
      granted: r.consent_granted,
      grantedAt: r.consent_granted_at,
      revokedAt: r.consent_revoked_at,
      purpose: r.consent_purpose || 'GRC agent assistance and memory-based learning',
      piiRedactionEnabled: r.pii_redaction_enabled ?? true,
    };
  } catch {
    return { granted: false, grantedAt: null, revokedAt: null, purpose: '', piiRedactionEnabled: true };
  }
}

export async function grantConsent(
  tenantId: string,
  userId: string,
  purpose: string,
  performedBy: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `UPDATE "${schema}".shadow_agent_config
       SET consent_granted = TRUE, consent_granted_at = NOW(),
           consent_revoked_at = NULL, consent_purpose = $3, updated_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId, purpose],
    );

    await safeQuery(
      `INSERT INTO "${schema}".memory_consent_log
         (tenant_id, user_id, action, purpose, performed_by, metadata)
       VALUES ($1, $2, 'grant', $3, $4, $5)`,
      [tenantId, userId, purpose, performedBy, JSON.stringify({ timestamp: new Date().toISOString() })],
    ).catch(catchHandler(EC.EVENT_BUS, {}));

    return true;
  } catch (err: unknown) {
    logger.warn(`[PDPLConsent] grantConsent failed: ${toErrorMessage(err)}`);
    return false;
  }
}

export async function revokeConsent(
  tenantId: string,
  userId: string,
  performedBy: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `UPDATE "${schema}".shadow_agent_config
       SET consent_granted = FALSE, consent_revoked_at = NOW(), updated_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId],
    );

    await safeQuery(
      `INSERT INTO "${schema}".memory_consent_log
         (tenant_id, user_id, action, purpose, performed_by, metadata)
       VALUES ($1, $2, 'revoke', 'Consent revoked by user/admin', $3, $4)`,
      [tenantId, userId, performedBy, JSON.stringify({ timestamp: new Date().toISOString() })],
    ).catch(catchHandler(EC.EVENT_BUS, {}));

    return true;
  } catch (err: unknown) {
    logger.warn(`[PDPLConsent] revokeConsent failed: ${toErrorMessage(err)}`);
    return false;
  }
}

export async function rightToForget(
  tenantId: string,
  userId: string,
  performedBy: string,
): Promise<{ memoriesDeleted: number; consentRevoked: boolean }> {
  const schema = tenantSchema(tenantId);
  let memoriesDeleted = 0;

  try {
    const memResult = await safeQuery(
      `UPDATE "${schema}".agent_memories
       SET is_deleted = TRUE, updated_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND is_deleted = FALSE
       RETURNING memory_id`,
      [tenantId, userId],
    );
    memoriesDeleted = memResult.rows.length;

    await safeQuery(
      `DELETE FROM "${schema}".memory_summaries
       WHERE tenant_id = $1 AND namespace LIKE $2`,
      [tenantId, `%:user:${userId}:%`],
    ).catch(catchHandler(EC.EVENT_BUS, {}));

    await safeQuery(
      `UPDATE "${schema}".shadow_agent_config
       SET consent_granted = FALSE, consent_revoked_at = NOW(),
           enabled = FALSE, actions_today = 0, updated_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId],
    );

    await safeQuery(
      `INSERT INTO "${schema}".memory_consent_log
         (tenant_id, user_id, action, purpose, performed_by, metadata)
       VALUES ($1, $2, 'forget', 'Right to forget exercised (PDPL Art. 22)', $3, $4)`,
      [tenantId, userId, performedBy, JSON.stringify({ memoriesDeleted, timestamp: new Date().toISOString() })],
    ).catch(catchHandler(EC.EVENT_BUS, {}));

    return { memoriesDeleted, consentRevoked: true };
  } catch (err: unknown) {
    logger.warn(`[PDPLConsent] rightToForget failed: ${toErrorMessage(err)}`);
    return { memoriesDeleted, consentRevoked: false };
  }
}

export async function getConsentLog(
  tenantId: string,
  userId: string,
  limit = 50,
): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".memory_consent_log
       WHERE tenant_id = $1 AND user_id = $2
       ORDER BY created_at DESC LIMIT ${limit}`,
      [tenantId, userId],
    );
    return result.rows;
  } catch { return []; }
}
