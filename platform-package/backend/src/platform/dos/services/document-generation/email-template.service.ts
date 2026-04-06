/**
 * Email Template Service — Renders email templates with variable substitution.
 */

import { safeQuery } from '../../../../config/database';
import { logger } from '../../observability/logger.service';

interface RenderedEmail {
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

/**
 * Render an email template with the given variables.
 * Looks up the template from public.email_templates, falls back to a plain text message.
 */
export async function renderEmailTemplate(
  templateCode: string,
  vars: Record<string, unknown> = {},
  tenantId?: string,
): Promise<RenderedEmail> {
  try {
    const { rows } = await safeQuery(
      `SELECT subject, body_html, body_text FROM public.email_templates
       WHERE template_code = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
       ORDER BY tenant_id DESC NULLS LAST LIMIT 1`,
      [templateCode, tenantId ?? null],
    );

    if (rows.length > 0) {
      const row = rows[0];
      return {
        subject: interpolate(row.subject as string || '', vars),
        bodyHtml: interpolate(row.body_html as string || '', vars),
        bodyText: interpolate(row.body_text as string || '', vars),
      };
    }
  } catch (err) {
    logger.warn('[EmailTemplate] Template lookup failed', {
      templateCode,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Fallback: return a basic template
  return {
    subject: `Notification: ${templateCode}`,
    bodyHtml: `<p>${JSON.stringify(vars)}</p>`,
    bodyText: JSON.stringify(vars),
  };
}

function interpolate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
}
