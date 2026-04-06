/**
 * Tenant Email Configuration Service
 *
 * Sends emails using tenant-specific SMTP/email configuration.
 * Falls back to platform-level defaults when tenant config is absent.
 */

import * as nodemailer from 'nodemailer';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../observability/services/logger.service';

// ─── Types ───────────────────────────────────────────────────

interface TenantEmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: boolean;
  smtp_domain?: string;
  from_address: string;
  from_name?: string;
  reply_to?: string;
}

// ─── Config Resolution ───────────────────────────────────────

/**
 * Load tenant-specific email configuration from the database.
 * Returns null if no tenant config exists (use platform defaults).
 */
async function getTenantEmailConfig(tenantId: string): Promise<TenantEmailConfig | null> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure,
              smtp_domain, from_address, from_name, reply_to
       FROM "${schema}".email_config
       WHERE enabled = true
       ORDER BY created_at DESC
       LIMIT 1`,
      []
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as TenantEmailConfig;
  } catch {
    // Table may not exist yet for this tenant — fall back to platform defaults
    return null;
  }
}

/**
 * Build platform-level default config from environment variables.
 */
function getPlatformEmailConfig(): TenantEmailConfig {
  const port = Number(process.env.SMTP_PORT) || 587;
  return {
    smtp_host: process.env.SMTP_HOST || 'localhost',
    smtp_port: port,
    smtp_user: process.env.SMTP_USER || '',
    smtp_pass: process.env.SMTP_PASS || '',
    smtp_secure: port === 465,
    smtp_domain: process.env.SMTP_DOMAIN || 'localhost',
    from_address: process.env.SMTP_FROM || 'noreply@dos-platform.local',
    from_name: process.env.BRAND_NAME || 'DOS Platform',
  };
}

// ─── Transport Factory ───────────────────────────────────────

function createTransportFromConfig(config: TenantEmailConfig): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    secure: config.smtp_secure,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass,
    },
    name: config.smtp_domain || 'localhost',
    tls: {
      rejectUnauthorized: false,
    },
  });
}

// ─── Send ────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

/**
 * Send an email using tenant-specific SMTP configuration.
 * Falls back to platform-level defaults if no tenant config exists.
 * Retries up to 3 times with exponential backoff.
 */
export async function sendTenantEmail(
  tenantId: string,
  to: string,
  subject: string,
  htmlBody: string,
  opts?: { from?: string; replyTo?: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  let config: TenantEmailConfig;

  try {
    const tenantConfig = await getTenantEmailConfig(tenantId);
    config = tenantConfig ?? getPlatformEmailConfig();
  } catch (err) {
    logger.error(`[TenantEmail] Failed to resolve email config for tenant=${tenantId}: ${(err as Error).message}`);
    config = getPlatformEmailConfig();
  }

  const transporter = createTransportFromConfig(config);
  const fromName = config.from_name || 'Shahin GRC';
  const fromAddress = opts?.from || config.from_address;
  const from = `"${fromName}" <${fromAddress}>`;
  const replyTo = opts?.replyTo || config.reply_to || undefined;

  let lastError: string | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html: htmlBody,
        replyTo,
      });

      logger.info(`[TenantEmail] Email sent to=${to}, tenant=${tenantId}, messageId=${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err) {
      lastError = (err as Error).message ?? String(err);
      logger.warn(
        `[TenantEmail] Send attempt ${attempt + 1}/${MAX_RETRIES} failed for tenant=${tenantId}, to=${to}: ${lastError}`
      );

      if (attempt < MAX_RETRIES - 1) {
        const delay = Math.pow(4, attempt) * RETRY_BASE_MS;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(`[TenantEmail] All ${MAX_RETRIES} send attempts failed for tenant=${tenantId}, to=${to}`);
  return {
    success: false,
    error: lastError,
  };
}
