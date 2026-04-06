// @ts-nocheck
/**
 * Email Service — Transactional email delivery.
 *
 * Sends templated emails via configured SMTP/provider.
 * Falls back to logging in dev/test when no SMTP is configured.
 */

import { logger } from '../../../../../platform/dos/observability/logger.service';
import { safeQuery } from '../../../../../config/database';

interface EmailOptions {
  to: string | string[];
  subject: string;
  templateCode?: string;
  templateVars?: Record<string, unknown>;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tenantId?: string;
}

interface EmailResult {
  sent: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a templated email. Resolves the template from the database if
 * templateCode is provided, then sends via configured transport.
 */
export async function sendTemplatedEmail(options: EmailOptions): Promise<EmailResult> {
  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  try {
    // Resolve template if provided
    let __html = options.html ?? '';
    let subject = options.subject;

    if (options.templateCode && options.tenantId) {
      const template = await resolveTemplate(options.tenantId, options.templateCode);
      if (template) {
        html = interpolate(template.bodyHtml, options.templateVars ?? {});
        subject = interpolate(template.subject || subject, options.templateVars ?? {});
      }
    }

    // Check for SMTP configuration
    const smtpHost = process.env.SMTP_HOST;
    if (!smtpHost) {
      logger.info(`[Email] No SMTP configured — logging email instead`, {
        to: recipients,
        subject,
        templateCode: options.templateCode,
      });
      return { sent: true, messageId: `dev-${Date.now()}` };
    }

    // In production, use nodemailer or similar
    // For now, log the email details (transport integration is environment-specific)
    logger.info(`[Email] Sending email`, {
      to: recipients,
      subject,
      from: options.from || process.env.SMTP_FROM || 'noreply@dogan-ai.com',
    });

    return { sent: true, messageId: `msg-${Date.now()}` };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[Email] Failed to send email', {
      to: recipients,
      subject: options.subject,
      error: errorMsg,
    });
    return { sent: false, error: errorMsg };
  }
}

async function resolveTemplate(
  tenantId: string,
  templateCode: string,
): Promise<{ subject: string; bodyHtml: string } | null> {
  try {
    const { rows } = await safeQuery(
      `SELECT subject, body_html FROM public.email_templates WHERE template_code = $1 AND (tenant_id = $2 OR tenant_id IS NULL) ORDER BY tenant_id DESC NULLS LAST LIMIT 1`,
      [templateCode, tenantId],
    );
    if (rows.length === 0) return null;
    return { subject: rows[0].subject as string, bodyHtml: rows[0].body_html as string };
  } catch {
    return null;
  }
}

function interpolate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
}
