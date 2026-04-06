// @ts-nocheck
import { logger } from '../../../../utils/logger';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { sendEmail } from '../../../../platform/dos/notifications/email.service';
import type { EmailDeliveryResult } from '../../../../platform/dos/notifications/email.service';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

export interface TenantEmailConfig {
  configId: string;
  provider: 'microsoft_graph' | 'smtp';
  enabled: boolean;
  msTenantId?: string;
  msClientId?: string;
  msClientSecret?: string;
  msFromEmail?: string;
  msFromName?: string;
  msFromNameAr?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  smtpSecure?: boolean;
  lastTestAt?: string;
  lastTestResult?: unknown;
  configuredBy?: string;
}

export interface PlatformEmailApproval {
  approvalId: string;
  tenantId: string;
  status: 'pending' | 'approved' | 'denied' | 'revoked';
  requestedBy?: string;
  requestedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

interface PlatformEmailConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  fromEmail: string;
  defaultSender?: { email: string; name: string; nameAr?: string };
}

function loadPlatformConfig(): PlatformEmailConfig | null {
  const configPath = resolve(__dirname, '../../../config/email-config.json');
  if (!existsSync(configPath)) return null;
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return null;
  }
}

async function ensureTable(schema: string): Promise<void> {
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".tenant_email_config (
      config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider VARCHAR(30) NOT NULL DEFAULT 'microsoft_graph'
        CHECK (provider IN ('microsoft_graph', 'smtp')),
      enabled BOOLEAN DEFAULT FALSE,
      ms_tenant_id VARCHAR(255),
      ms_client_id VARCHAR(255),
      ms_client_secret TEXT,
      ms_from_email VARCHAR(255),
      ms_from_name VARCHAR(255),
      ms_from_name_ar VARCHAR(255),
      smtp_host VARCHAR(255),
      smtp_port INT,
      smtp_user VARCHAR(255),
      smtp_pass TEXT,
      smtp_from VARCHAR(255),
      smtp_secure BOOLEAN DEFAULT FALSE,
      last_test_at TIMESTAMPTZ,
      last_test_result JSONB,
      configured_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

async function ensureApprovalTable(): Promise<void> {
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS public.platform_email_approvals (
      approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(16) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'denied', 'revoked')),
      requested_by VARCHAR(64),
      requested_at TIMESTAMPTZ DEFAULT NOW(),
      reviewed_by VARCHAR(64),
      reviewed_at TIMESTAMPTZ,
      review_note TEXT,
      UNIQUE(tenant_id)
    );
  `);
}

function rowToConfig(row: any): TenantEmailConfig {
  return {
    configId: row.config_id,
    provider: row.provider,
    enabled: row.enabled,
    msTenantId: row.ms_tenant_id,
    msClientId: row.ms_client_id,
    msClientSecret: row.ms_client_secret ? '****' : undefined,
    msFromEmail: row.ms_from_email,
    msFromName: row.ms_from_name,
    msFromNameAr: row.ms_from_name_ar,
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    smtpUser: row.smtp_user,
    smtpPass: row.smtp_pass ? '****' : undefined,
    smtpFrom: row.smtp_from,
    smtpSecure: row.smtp_secure,
    lastTestAt: row.last_test_at,
    lastTestResult: row.last_test_result,
    configuredBy: row.configured_by,
  };
}

// ── Tenant Email Config CRUD ──────────────────────────────────────────────

export async function getTenantEmailConfig(tenantId: string): Promise<TenantEmailConfig | null> {
  const schema = tenantSchema(tenantId);
  await ensureTable(schema);
  const result = await safeQuery(`SELECT * FROM "${schema}".tenant_email_config LIMIT 1`);
  if (result.rows.length === 0) return null;
  return rowToConfig(getFirstRow(result));
}

export async function upsertTenantEmailConfig(
  tenantId: string,
  input: Partial<TenantEmailConfig> & { configuredBy?: string },
): Promise<TenantEmailConfig> {
  const schema = tenantSchema(tenantId);
  await ensureTable(schema);

  const existing = await safeQuery(`SELECT config_id FROM "${schema}".tenant_email_config LIMIT 1`);

  if (existing.rows.length > 0) {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      provider: 'provider',
      enabled: 'enabled',
      msTenantId: 'ms_tenant_id',
      msClientId: 'ms_client_id',
      msClientSecret: 'ms_client_secret',
      msFromEmail: 'ms_from_email',
      msFromName: 'ms_from_name',
      msFromNameAr: 'ms_from_name_ar',
      smtpHost: 'smtp_host',
      smtpPort: 'smtp_port',
      smtpUser: 'smtp_user',
      smtpPass: 'smtp_pass',
      smtpFrom: 'smtp_from',
      smtpSecure: 'smtp_secure',
      configuredBy: 'configured_by',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      const val = (input as Record<string, unknown>)[key];
      if (val !== undefined && val !== '****') {
        sets.push(`${col} = $${idx++}`);
        params.push(val);
      }
    }

    sets.push('updated_at = NOW()');
    params.push(getFirstRow(existing)?.config_id);

    const result = await safeQuery(
      `UPDATE "${schema}".tenant_email_config SET ${sets.join(', ')} WHERE config_id = $${idx} RETURNING *`,
      params,
    );
    return rowToConfig(getFirstRow(result));
  }

  const result = await safeQuery(
    `INSERT INTO "${schema}".tenant_email_config
       (provider, enabled, ms_tenant_id, ms_client_id, ms_client_secret,
        ms_from_email, ms_from_name, ms_from_name_ar,
        smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure,
        configured_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      input.provider || 'microsoft_graph',
      input.enabled ?? false,
      input.msTenantId || null,
      input.msClientId || null,
      input.msClientSecret || null,
      input.msFromEmail || null,
      input.msFromName || null,
      input.msFromNameAr || null,
      input.smtpHost || null,
      input.smtpPort || null,
      input.smtpUser || null,
      input.smtpPass || null,
      input.smtpFrom || null,
      input.smtpSecure ?? false,
      input.configuredBy || null,
    ],
  );
  return rowToConfig(getFirstRow(result));
}

// ── Platform Email Approval (tenant side) ─────────────────────────────────

export async function getPlatformEmailApproval(tenantId: string): Promise<PlatformEmailApproval | null> {
  await ensureApprovalTable();
  const result = await safeQuery(
    `SELECT * FROM public.platform_email_approvals WHERE tenant_id = $1`,
    [tenantId],
  );
  if (result.rows.length === 0) return null;
  const r = getFirstRow(result);
  return {
    approvalId: r.approval_id,
    tenantId: r.tenant_id,
    status: r.status,
    requestedBy: r.requested_by,
    requestedAt: r.requested_at,
    reviewedBy: r.reviewed_by,
    reviewedAt: r.reviewed_at,
    reviewNote: r.review_note,
  };
}

export async function requestPlatformEmail(tenantId: string, requestedBy: string): Promise<PlatformEmailApproval> {
  await ensureApprovalTable();
  const result = await safeQuery(
    `INSERT INTO public.platform_email_approvals (tenant_id, status, requested_by)
     VALUES ($1, 'pending', $2)
     ON CONFLICT (tenant_id) DO UPDATE SET
       status = CASE WHEN public.platform_email_approvals.status IN ('denied', 'revoked')
                     THEN 'pending' ELSE public.platform_email_approvals.status END,
       requested_by = $2,
       requested_at = NOW()
     RETURNING *`,
    [tenantId, requestedBy],
  );
  const r = getFirstRow(result);
  return {
    approvalId: r.approval_id,
    tenantId: r.tenant_id,
    status: r.status,
    requestedBy: r.requested_by,
    requestedAt: r.requested_at,
    reviewedBy: r.reviewed_by,
    reviewedAt: r.reviewed_at,
    reviewNote: r.review_note,
  };
}

// ── Platform Email Approval (platform admin side) ─────────────────────────

export async function listPlatformEmailApprovals(statusFilter?: string): Promise<PlatformEmailApproval[]> {
  await ensureApprovalTable();
  let sql = `SELECT a.*, t.org_name FROM public.platform_email_approvals a
             LEFT JOIN public.tenants t ON t.tenant_id = a.tenant_id`;
  const params: unknown[] = [];
  if (statusFilter) {
    sql += ` WHERE a.status = $1`;
    params.push(statusFilter);
  }
  sql += ` ORDER BY a.requested_at DESC`;
  const result = await safeQuery(sql, params);
  return result.rows.map((r: GenericRow) => ({
    approvalId: r.approval_id,
    tenantId: r.tenant_id,
    orgName: r.org_name,
    status: r.status,
    requestedBy: r.requested_by,
    requestedAt: r.requested_at,
    reviewedBy: r.reviewed_by,
    reviewedAt: r.reviewed_at,
    reviewNote: r.review_note,
  }));
}

export async function reviewPlatformEmailApproval(
  tenantId: string,
  decision: 'approved' | 'denied' | 'revoked',
  reviewedBy: string,
  reviewNote?: string,
): Promise<PlatformEmailApproval> {
  await ensureApprovalTable();
  const result = await safeQuery(
    `UPDATE public.platform_email_approvals
     SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = $3
     WHERE tenant_id = $4
     RETURNING *`,
    [decision, reviewedBy, reviewNote || null, tenantId],
  );
  if (result.rows.length === 0) {
    throw new Error('No platform email request found for this tenant');
  }
  const r = getFirstRow(result);
  return {
    approvalId: r.approval_id,
    tenantId: r.tenant_id,
    status: r.status,
    requestedBy: r.requested_by,
    requestedAt: r.requested_at,
    reviewedBy: r.reviewed_by,
    reviewedAt: r.reviewed_at,
    reviewNote: r.review_note,
  };
}

// ── Graph Send ────────────────────────────────────────────────────────────

async function sendViaGraph(
  config: { tenantId: string; clientId: string; clientSecret: string; fromEmail: string },
  to: string,
  subject: string,
  htmlBody: string,
): Promise<EmailDeliveryResult> {
  const fetch = (await import('node-fetch')).default;
  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;

  const tokenParams = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    return { success: false, attempts: 1, error: `Token acquisition failed: ${errText}` };
  }

  const tokenData: unknown = await tokenRes.json();
  const accessToken = tokenData.access_token;

  const graphUrl = `https://graph.microsoft.com/v1.0/users/${config.fromEmail}/sendMail`;
  const mailRes = await fetch(graphUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: htmlBody },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
  });

  if (!mailRes.ok) {
    const errText = await mailRes.text();
    return { success: false, attempts: 1, error: `Graph send failed: ${errText}` };
  }

  return { success: true, attempts: 1 };
}

// ── Send Email (tenant → own config → approved platform → fail) ───────────

async function getRawConfig(tenantId: string): Promise<any | null> {
  const schema = tenantSchema(tenantId);
  await ensureTable(schema);
  const result = await safeQuery(`SELECT * FROM "${schema}".tenant_email_config WHERE enabled = true LIMIT 1`);
  return result.rows.length > 0 ? getFirstRow(result) : null;
}

async function isTenantApprovedForPlatformEmail(tenantId: string): Promise<boolean> {
  try {
    await ensureApprovalTable();
    const result = await safeQuery(
      `SELECT status FROM public.platform_email_approvals WHERE tenant_id = $1 AND status = 'approved'`,
      [tenantId],
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

export async function sendTenantEmail(
  tenantId: string,
  to: string,
  subject: string,
  htmlBody: string,
): Promise<EmailDeliveryResult> {
  // 1) Try tenant's own email config
  let tenantCfg: unknown = null;
  try {
    tenantCfg = await getRawConfig(tenantId);
  } catch (err: unknown) {
    logger.warn(`[TenantEmail] Could not read tenant config for ${tenantId}: ${toErrorMessage(err)}`);
  }

  if (tenantCfg && tenantCfg.provider === 'microsoft_graph' && tenantCfg.ms_tenant_id && tenantCfg.ms_client_id && tenantCfg.ms_client_secret) {
    logger.info(`[TenantEmail] Using tenant's own Microsoft Graph for ${tenantId}`);
    return sendViaGraph(
      {
        tenantId: tenantCfg.ms_tenant_id,
        clientId: tenantCfg.ms_client_id,
        clientSecret: tenantCfg.ms_client_secret,
        fromEmail: tenantCfg.ms_from_email,
      },
      to, subject, htmlBody,
    );
  }

  if (tenantCfg && tenantCfg.provider === 'smtp' && tenantCfg.smtp_host) {
    logger.info(`[TenantEmail] Using tenant's own SMTP for ${tenantId}`);
    return sendEmail(to, subject, htmlBody);
  }

  // 2) No own config — check if approved to use platform email
  const approved = await isTenantApprovedForPlatformEmail(tenantId);
  if (!approved) {
    logger.warn(`[TenantEmail] Tenant ${tenantId} has no email config and is NOT approved for platform email`);
    return {
      success: false,
      attempts: 0,
      error: 'No email configuration. Configure your own email service or request platform email access from the platform administrator.',
    };
  }

  // 3) Approved — use platform email (doganconsult)
  const platformCfg = loadPlatformConfig();
  if (platformCfg && platformCfg.clientId && platformCfg.clientSecret && platformCfg.tenantId) {
    logger.info(`[TenantEmail] Tenant ${tenantId} approved — using platform Microsoft Graph (doganconsult)`);
    return sendViaGraph(
      {
        tenantId: platformCfg.tenantId,
        clientId: platformCfg.clientId,
        clientSecret: platformCfg.clientSecret,
        fromEmail: platformCfg.fromEmail || platformCfg.defaultSender?.email || 'noreply@dogan-ai.com',
      },
      to, subject, htmlBody,
    );
  }

  return {
    success: false,
    attempts: 0,
    error: 'Platform email service is not configured.',
  };
}

// ── Test tenant email config ──────────────────────────────────────────────

export async function testTenantEmailConfig(
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  const schema = tenantSchema(tenantId);
  await ensureTable(schema);
  const tenantCfg = await getRawConfig(tenantId);

  let result: { success: boolean; error?: string };

  if (tenantCfg && tenantCfg.provider === 'microsoft_graph' && tenantCfg.ms_tenant_id) {
    const fetch = (await import('node-fetch')).default;
    const tokenUrl = `https://login.microsoftonline.com/${tenantCfg.ms_tenant_id}/oauth2/v2.0/token`;
    const tokenParams = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: tenantCfg.ms_client_id || '',
      client_secret: tenantCfg.ms_client_secret || '',
      scope: 'https://graph.microsoft.com/.default',
    });

    try {
      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        result = { success: false, error: `Token failed: ${errText}` };
      } else {
        const tokenData: unknown = await tokenRes.json();
        const userRes = await fetch(
          `https://graph.microsoft.com/v1.0/users/${tenantCfg.ms_from_email}`,
          { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
        );
        result = userRes.ok
          ? { success: true }
          : { success: false, error: `User lookup failed: ${await userRes.text()}` };
      }
    } catch (err: unknown) {
      result = { success: false, error: toErrorMessage(err) };
    }
  } else {
    result = { success: false, error: 'No enabled tenant email configuration found' };
  }

  await safeQuery(
    `UPDATE "${schema}".tenant_email_config SET last_test_at = NOW(), last_test_result = $1`,
    [JSON.stringify(result)],
  );

  return result;
}
