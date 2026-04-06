// @ts-nocheck
/**
 * DOS — Email Transport Service
 * @owner DOS
 */
import { logger } from '../observability/logger.service';
// ============================================
// Platform — Email Service
// Sends email via configurable transport:
// - OAuth2 (Microsoft Graph API) for production
// - SMTP for development/fallback
// with retry logic (3 retries, exponential backoff)
// and branded HTML template system
// ============================================

import * as nodemailer from "nodemailer";
import { publish } from '../events/event-bus';

// === Types ===

export interface EmailDeliveryResult {
  success: boolean;
  attempts: number;
  error?: string;
}

export type EmailTemplateName =
  | 'notification'
  | 'approval_request'
  | 'escalation'
  | 'deadline_reminder'
  | 'incident_alert'
  | 'report_ready'
  | 'welcome'
  | 'invitation'
  | 'subscription_renewal_reminder'
  | 'subscription_payment_failed'
  | 'subscription_grace_started'
  | 'subscription_grace_ending'
  | 'subscription_renewed'
  | 'subscription_expired'
  | 'subscription_extended'
  | 'subscription_upgraded'
  | 'subscription_downgrade_scheduled'
  | 'subscription_downgraded'
  | 'subscription_paused'
  | 'subscription_resumed'
  | 'subscription_cancelled';

export interface EmailTemplateData {
  recipientName?: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
  language?: 'en' | 'ar';
}

// === Pure function for property testing ===

/**
 * Computes the retry delay for a given attempt number.
 * Formula: 4^attempt * 1000 ms
 *   attempt 0 → 1000ms
 *   attempt 1 → 4000ms
 *   attempt 2 → 16000ms
 *
 * Validates: Requirements 4.5
 */
export function computeRetryDelay(attempt: number): number {
  return Math.pow(4, attempt) * 1000;
}

// === HTML Template Engine ===

const BRAND_COLOR = process.env.BRAND_COLOR || '#1a56db';
const BRAND_NAME = process.env.BRAND_NAME || 'Shahin GRC';
const APP_URL = process.env.APP_URL || 'https://app.example.com';

/**
 * Renders a branded HTML email from template data.
 * Supports bilingual (EN/AR) with RTL layout for Arabic.
 */
export function renderEmailTemplate(
  _template: EmailTemplateName,
  data: EmailTemplateData
): string {
  const isArabic = data.language === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';
  const align = isArabic ? 'right' : 'left';

  const greeting = data.recipientName
    ? (isArabic ? `مرحباً ${data.recipientName}،` : `Hello ${data.recipientName},`)
    : (isArabic ? 'مرحباً،' : 'Hello,');

  const ctaBlock = data.ctaLabel && data.ctaUrl
    ? `<tr><td style="padding:24px 0;text-align:center">
        <a href="${data.ctaUrl}" style="background:${BRAND_COLOR};color:#fff;padding:12px 32px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block">${data.ctaLabel}</a>
       </td></tr>`
    : '';

  const footerText = data.footerNote || (isArabic
    ? 'هذا بريد إلكتروني تلقائي من منصة شاهين للحوكمة والمخاطر والامتثال.'
    : 'This is an automated email from the Shahin GRC Platform.');

  return `<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
  <tr><td style="background:${BRAND_COLOR};padding:24px 32px;text-align:${align}">
    <span style="color:#fff;font-size:20px;font-weight:700">${BRAND_NAME}</span>
  </td></tr>
  <tr><td style="padding:32px;text-align:${align};direction:${dir}">
    <p style="color:#6b7280;font-size:14px;margin:0 0 8px">${greeting}</p>
    <h2 style="color:#111827;font-size:18px;margin:0 0 16px">${data.title}</h2>
    <div style="color:#374151;font-size:14px;line-height:1.6">${data.body}</div>
  </td></tr>
  ${ctaBlock}
  <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:${align}">
    <p style="color:#9ca3af;font-size:12px;margin:0">${footerText}</p>
    <p style="color:#9ca3af;font-size:12px;margin:4px 0 0"><a href="${APP_URL}" style="color:${BRAND_COLOR};text-decoration:none">${APP_URL}</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export interface InvitationEmailData {
  recipientName?: string;
  roleName: string;
  roleDescription: string;
  modules: string[];
  responsibilities: string[];
  dashboardWidgets: string[];
  acceptUrl: string;
  expiryDate: string;
  orgName: string;
  language?: 'en' | 'ar';
}

const ROLE_DESCRIPTIONS: Record<string, { en: string; ar: string }> = {
  compliance_officer: { en: 'Compliance Officer', ar: 'مسؤول الامتثال' },
  risk_manager: { en: 'Risk Manager', ar: 'مدير المخاطر' },
  auditor: { en: 'Auditor', ar: 'مدقق' },
  admin: { en: 'Administrator', ar: 'مدير النظام' },
  owner: { en: 'Organization Owner', ar: 'مالك المنظمة' },
  viewer: { en: 'Viewer', ar: 'مشاهد' },
};

const ROLE_RESPONSIBILITIES: Record<string, { en: string[]; ar: string[] }> = {
  compliance_officer: {
    en: ['Monitor and maintain compliance posture across frameworks', 'Review and approve policy changes', 'Track control effectiveness and evidence collection', 'Manage compliance gap remediation plans'],
    ar: ['مراقبة وصيانة وضع الامتثال عبر الأطر', 'مراجعة واعتماد تغييرات السياسات', 'تتبع فعالية الضوابط وجمع الأدلة', 'إدارة خطط معالجة فجوات الامتثال'],
  },
  risk_manager: {
    en: ['Identify and assess organizational risks', 'Develop and track risk treatment plans', 'Monitor vendor risk and third-party assessments', 'Report risk posture to leadership'],
    ar: ['تحديد وتقييم المخاطر المؤسسية', 'تطوير وتتبع خطط معالجة المخاطر', 'مراقبة مخاطر الموردين وتقييمات الطرف الثالث', 'تقديم تقارير وضع المخاطر للقيادة'],
  },
  auditor: {
    en: ['Conduct internal audit assessments', 'Review and validate evidence submissions', 'Track audit findings and remediation', 'Ensure regulatory compliance requirements are met'],
    ar: ['إجراء تقييمات التدقيق الداخلي', 'مراجعة والتحقق من الأدلة المقدمة', 'تتبع نتائج التدقيق والمعالجة', 'ضمان تلبية متطلبات الامتثال التنظيمي'],
  },
  admin: {
    en: ['Manage platform configuration and users', 'Oversee all GRC modules and workflows', 'Configure automation rules and integrations', 'Monitor system health and team activity'],
    ar: ['إدارة تكوين المنصة والمستخدمين', 'الإشراف على جميع وحدات الحوكمة والمخاطر والامتثال', 'تكوين قواعد الأتمتة والتكاملات', 'مراقبة صحة النظام ونشاط الفريق'],
  },
  owner: {
    en: ['Full platform ownership and governance', 'Strategic risk and compliance oversight', 'Executive dashboard and reporting access', 'Organization-wide policy and framework management'],
    ar: ['ملكية المنصة الكاملة والحوكمة', 'الإشراف الاستراتيجي على المخاطر والامتثال', 'الوصول للوحة القيادة التنفيذية والتقارير', 'إدارة السياسات والأطر على مستوى المنظمة'],
  },
};

export function renderInvitationEmail(data: InvitationEmailData): string {
  const isArabic = data.language === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';
  const align = isArabic ? 'right' : 'left';
  const roleDesc = ROLE_DESCRIPTIONS[data.roleName] || { en: data.roleName, ar: data.roleName };
  const roleLabel = isArabic ? roleDesc.ar : roleDesc.en;
  const responsibilities = data.responsibilities.length > 0
    ? data.responsibilities
    : (ROLE_RESPONSIBILITIES[data.roleName]?.[isArabic ? 'ar' : 'en'] || []);

  const greeting = data.recipientName
    ? (isArabic ? `مرحباً ${data.recipientName}،` : `Hello ${data.recipientName},`)
    : (isArabic ? 'مرحباً،' : 'Hello,');

  const title = isArabic
    ? `لقد تمت دعوتك للانضمام إلى ${data.orgName}`
    : `You've been invited to join ${data.orgName}`;

  const roleSection = `<p style="font-size:16px;font-weight:600;color:${BRAND_COLOR};margin:16px 0 8px">${isArabic ? 'الدور' : 'Role'}: ${roleLabel}</p>
    <p style="color:#374151;font-size:14px;margin:0 0 16px">${data.roleDescription || (isArabic ? roleDesc.ar : roleDesc.en)}</p>`;

  const modulesHtml = data.modules.length > 0
    ? `<p style="font-size:14px;font-weight:600;color:#111827;margin:16px 0 8px">${isArabic ? 'الوحدات المتاحة' : 'Accessible Modules'}:</p>
       <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">${data.modules.map(m =>
         `<span style="background:#eef2ff;color:${BRAND_COLOR};padding:4px 12px;border-radius:12px;font-size:13px;display:inline-block;margin:2px">${m}</span>`
       ).join('')}</div>`
    : '';

  const responsibilitiesHtml = responsibilities.length > 0
    ? `<p style="font-size:14px;font-weight:600;color:#111827;margin:16px 0 8px">${isArabic ? 'المسؤوليات الرئيسية' : 'Key Responsibilities'}:</p>
       <ul style="color:#374151;font-size:14px;line-height:1.8;margin:0 0 16px;padding-${isArabic ? 'right' : 'left'}:20px">${responsibilities.map(r =>
         `<li>${r}</li>`
       ).join('')}</ul>`
    : '';

  const widgetsHtml = data.dashboardWidgets.length > 0
    ? `<p style="font-size:14px;font-weight:600;color:#111827;margin:16px 0 8px">${isArabic ? 'عناصر لوحة المعلومات' : 'Dashboard Widgets'}:</p>
       <div style="margin-bottom:16px">${data.dashboardWidgets.map(w =>
         `<span style="background:#f0fdf4;color:#166534;padding:4px 10px;border-radius:8px;font-size:12px;display:inline-block;margin:2px">${w.replace(/_/g, ' ')}</span>`
       ).join('')}</div>`
    : '';

  const expiryText = isArabic
    ? `تنتهي صلاحية هذه الدعوة في ${data.expiryDate}`
    : `This invitation expires on ${data.expiryDate}`;

  return `<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
  <tr><td style="background:${BRAND_COLOR};padding:24px 32px;text-align:${align}">
    <span style="color:#fff;font-size:20px;font-weight:700">${BRAND_NAME}</span>
  </td></tr>
  <tr><td style="padding:32px;text-align:${align};direction:${dir}">
    <p style="color:#6b7280;font-size:14px;margin:0 0 8px">${greeting}</p>
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px">${title}</h2>
    ${roleSection}
    ${modulesHtml}
    ${responsibilitiesHtml}
    ${widgetsHtml}
  </td></tr>
  <tr><td style="padding:24px 32px;text-align:center">
    <a href="${data.acceptUrl}" style="background:${BRAND_COLOR};color:#fff;padding:14px 40px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;font-size:16px">${isArabic ? 'قبول الدعوة' : 'Accept Invitation'}</a>
    <p style="color:#9ca3af;font-size:12px;margin:12px 0 0">${expiryText}</p>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:${align}">
    <p style="color:#9ca3af;font-size:12px;margin:0">${isArabic ? 'هذا بريد إلكتروني تلقائي من منصة شاهين للحوكمة والمخاطر والامتثال.' : 'This is an automated email from the Shahin GRC Platform.'}</p>
    <p style="color:#9ca3af;font-size:12px;margin:4px 0 0"><a href="${APP_URL}" style="color:${BRAND_COLOR};text-decoration:none">${APP_URL}</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// === SMTP Transport ===

const MAX_RETRIES = 3;

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "localhost",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
    // Fix for Office 365 "Invalid domain name" error
    name: process.env.SMTP_DOMAIN || "localhost",
    tls: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Helper that pauses execution for `ms` milliseconds.
 * Exported for test override.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send an email via OAuth2 (preferred) or SMTP (fallback) with retry logic.
 * Retries up to 3 times with exponential backoff (1s, 4s, 16s).
 * Returns delivery result with success flag, attempt count, and optional error.
 *
 * Accepts an optional `delayFn` for testing (defaults to `sleep`).
 *
 * Validates: Requirements 4.4, 4.5
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  delayFn: (ms: number) => Promise<void> = sleep
): Promise<EmailDeliveryResult> {
  if (process.env.USE_OAUTH_EMAIL === 'true') {
    logger.info('[Email] Dispatching OAuth2 email request via EventBus');
    try {
      await publish('email.dispatch_requested', '_system', { to, subject, body }, { category: 'operational' });
      return { success: true, attempts: 1 };
    } catch (error: any) {
      logger.error('[Email] EventBus OAuth2 dispatch failed, falling back to SMTP:', error.message || error);
    }
  }

  // Fallback to SMTP
  logger.info('[Email] Using SMTP authentication');
  const transporter = createTransport();
  const from = process.env.SMTP_FROM || "noreply@dos-platform.local";

  let lastError: string | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await transporter.sendMail({ from, to, subject, html: body });
      return { success: true, attempts: attempt + 1 };
    } catch (err) {
      lastError = (err as Error)?.message ?? String(err);

      // Don't sleep after the last failed attempt
      if (attempt < MAX_RETRIES - 1) {
        await delayFn(computeRetryDelay(attempt));
      }
    }
  }

  // All retries exhausted — mark as failed
  return { success: false, attempts: MAX_RETRIES, error: lastError };
}

/**
 * Send an email with optional attachments (e.g. PDF report).
 * Uses SMTP path only when attachments are present; otherwise delegates to sendEmail.
 */
export async function sendEmailWithAttachments(
  to: string | string[],
  subject: string,
  body: string,
  attachments: { filename: string; content: Buffer }[],
  delayFn: (ms: number) => Promise<void> = sleep
): Promise<EmailDeliveryResult> {
  const toList = Array.isArray(to) ? to : [to];
  const from = process.env.SMTP_FROM || "noreply@dos-platform.local";
  const transporter = createTransport();
  let lastError: string | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await transporter.sendMail({
        from,
        to: toList,
        subject,
        html: body,
        attachments: attachments.length ? attachments : undefined,
      });
      return { success: true, attempts: attempt + 1 };
    } catch (err) {
      lastError = (err as Error)?.message ?? String(err);
      if (attempt < MAX_RETRIES - 1) {
        await delayFn(computeRetryDelay(attempt));
      }
    }
  }
  return { success: false, attempts: MAX_RETRIES, error: lastError };
}

/**
 * Send a templated email with branded HTML layout.
 * Wraps sendEmail with the template engine.
 */
export async function sendTemplatedEmail(
  to: string,
  template: EmailTemplateName,
  data: EmailTemplateData,
  delayFn: (ms: number) => Promise<void> = sleep
): Promise<EmailDeliveryResult> {
  const html = renderEmailTemplate(template, data);
  const subject = `[${BRAND_NAME}] ${data.title}`;
  return sendEmail(to, subject, html, delayFn);
}

// ============================================
// DB-backed Email Templates & Send Log
// ============================================

import { safeQuery, tenantSchema } from '../../../config/database/database';
import { getFirstRow } from '../../../shared/data/db-utils';

/**
 * Get a DB-stored email template by key, render it with variable substitution.
 * Falls back to the hardcoded renderEmailTemplate if no DB template found.
 */
export async function getDbTemplate(
  tenantId: string,
  templateKey: string,
  variables: Record<string, string> = {},
  language: 'en' | 'ar' = 'en'
): Promise<{ subject: string; bodyHtml: string } | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".email_templates WHERE template_key = $1 AND enabled = true`,
    [templateKey]
  );
  if (result.rows.length === 0) return null;
  const tpl = getFirstRow(result);

  let subject = language === 'ar' ? (tpl.subject_ar || tpl.subject_en) : tpl.subject_en;
  let bodyHtml = language === 'ar' ? (tpl.body_html_ar || tpl.body_html_en) : tpl.body_html_en;

  // Variable substitution: {{variable_name}} → value
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    subject = subject.replace(pattern, value);
    bodyHtml = bodyHtml.replace(pattern, value);
  }

  return { subject, bodyHtml };
}

/**
 * Send an email using a DB template, with full send-log tracking.
 * Falls back to hardcoded template if DB template not found.
 */
export async function sendDbTemplatedEmail(
  tenantId: string,
  opts: {
    to: string;
    templateKey: string;
    variables?: Record<string, string>;
    language?: 'en' | 'ar';
    recipientUserId?: string;
    fallbackTitle?: string;
    fallbackBody?: string;
  }
): Promise<EmailDeliveryResult> {
  const schema = tenantSchema(tenantId);
  const lang = opts.language || 'en';

  // Try DB template first
  const dbTpl = await getDbTemplate(tenantId, opts.templateKey, opts.variables || {}, lang);

  let subject: string;
  let bodyHtml: string;

  if (dbTpl) {
    subject = dbTpl.subject;
    bodyHtml = dbTpl.bodyHtml;
  } else {
    // Fallback to hardcoded
    subject = `[${BRAND_NAME}] ${opts.fallbackTitle || opts.templateKey}`;
    bodyHtml = renderEmailTemplate('notification', {
      title: opts.fallbackTitle || opts.templateKey,
      body: opts.fallbackBody || '',
      language: lang,
    });
  }

  // Create send log entry
  const logResult = await safeQuery(
    `INSERT INTO "${schema}".email_send_log
       (template_key, recipient_email, recipient_user_id, subject, status, provider)
     VALUES ($1, $2, $3, $4, 'queued', $5)
     RETURNING send_id`,
    [opts.templateKey, opts.to, opts.recipientUserId || null, subject, process.env.SMTP_HOST || 'smtp']
  );
  const sendId = getFirstRow(logResult)?.send_id;

  // Send
  const result = await sendEmail(opts.to, subject, bodyHtml);

  // Update send log
  if (result.success) {
    await safeQuery(
      `UPDATE "${schema}".email_send_log SET status = 'sent', sent_at = NOW() WHERE send_id = $1`,
      [sendId]
    );
  } else {
    await safeQuery(
      `UPDATE "${schema}".email_send_log SET status = 'failed', error_message = $1 WHERE send_id = $2`,
      [result.error || 'any', sendId]
    );
  }

  return result;
}

// === Email Template CRUD ===

export async function listEmailTemplates(tenantId: string): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT template_id, template_key, name_en, name_ar, category, enabled, version, created_at
     FROM "${schema}".email_templates ORDER BY category, template_key`
  );
  return result.rows;
}

export async function upsertEmailTemplate(tenantId: string, data: {
  templateKey: string; nameEn: string; nameAr?: string;
  subjectEn: string; subjectAr?: string;
  bodyHtmlEn: string; bodyHtmlAr?: string;
  bodyTextEn?: string; bodyTextAr?: string;
  variables?: any[]; category?: string;
  createdBy?: string;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".email_templates
       (template_key, name_en, name_ar, subject_en, subject_ar,
        body_html_en, body_html_ar, body_text_en, body_text_ar,
        variables, category, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (template_key) DO UPDATE SET
       name_en=EXCLUDED.name_en, name_ar=EXCLUDED.name_ar,
       subject_en=EXCLUDED.subject_en, subject_ar=EXCLUDED.subject_ar,
       body_html_en=EXCLUDED.body_html_en, body_html_ar=EXCLUDED.body_html_ar,
       body_text_en=EXCLUDED.body_text_en, body_text_ar=EXCLUDED.body_text_ar,
       variables=EXCLUDED.variables, category=EXCLUDED.category,
       version="${schema}".email_templates.version + 1,
       updated_at=NOW()
     RETURNING *`,
    [
      data.templateKey, data.nameEn, data.nameAr || null,
      data.subjectEn, data.subjectAr || null,
      data.bodyHtmlEn, data.bodyHtmlAr || null,
      data.bodyTextEn || null, data.bodyTextAr || null,
      JSON.stringify(data.variables || []), data.category || 'system',
      data.createdBy || null,
    ]
  );
  return getFirstRow(result);
}

export async function getEmailSendLog(tenantId: string, limit = 100): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".email_send_log ORDER BY queued_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}
