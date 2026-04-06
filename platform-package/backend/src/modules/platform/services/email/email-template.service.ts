// @ts-nocheck
import mjml2html from 'mjml';
import { logger } from '../../../../platform/dos/observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { getProductUrl } from '../../../../platform/dos/branding/product-identity';

export interface EmailTemplateData {
  title: string;
  preheader?: string;
  greeting?: string;
  body: string[];
  ctaText?: string;
  ctaUrl?: string;
  footer?: string;
}

export function renderEmailTemplate(data: EmailTemplateData): string {
  const brandColor = process.env.BRAND_COLOR || '#1a56db';
  const brandName = process.env.BRAND_NAME || 'DOS Platform';
  const appUrl = getProductUrl();
  const __direction = 'ltr';

  const bodyParagraphs = data.body.map(p =>
    `<mj-text font-size="15px" color="#374151" line-height="1.6" padding="0 0 12px 0">${p}</mj-text>`
  ).join('\n');

  const ctaButton = data.ctaText && data.ctaUrl ? `
    <mj-button background-color="${brandColor}" color="#ffffff" border-radius="6px" font-size="15px" font-weight="600" inner-padding="12px 32px" href="${data.ctaUrl}">
      ${data.ctaText}
    </mj-button>
  ` : '';

  const mjmlContent = `
    <mjml>
      <mj-head>
        <mj-attributes>
          <mj-all font-family="'IBM Plex Sans', 'Segoe UI', Arial, sans-serif" />
          <mj-text padding="0" />
        </mj-attributes>
        <mj-preview>${data.preheader || data.title}</mj-preview>
      </mj-head>
      <mj-body background-color="#f3f4f6">
        <mj-section background-color="${brandColor}" padding="20px 24px">
          <mj-column>
            <mj-text color="#ffffff" font-size="20px" font-weight="700">${brandName}</mj-text>
          </mj-column>
        </mj-section>
        <mj-section background-color="#ffffff" padding="32px 24px" border-radius="0 0 8px 8px">
          <mj-column>
            <mj-text font-size="22px" font-weight="700" color="#111827" padding="0 0 16px 0">${data.title}</mj-text>
            ${data.greeting ? `<mj-text font-size="15px" color="#374151" padding="0 0 16px 0">${data.greeting}</mj-text>` : ''}
            ${bodyParagraphs}
            ${ctaButton}
          </mj-column>
        </mj-section>
        <mj-section padding="16px 24px">
          <mj-column>
            <mj-text font-size="12px" color="#9ca3af" align="center">
              ${data.footer || `${brandName} — Governance, Risk & Compliance Platform`}
            </mj-text>
            <mj-text font-size="11px" color="#9ca3af" align="center">
              <a href="${appUrl}" style="color:#6b7280;text-decoration:none;">${appUrl}</a>
            </mj-text>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>
  `;

  try {
    const { html, errors } = mjml2html(mjmlContent, { minify: false });
    if (errors.length > 0) {
      logger.warn('[EmailTemplate] MJML warnings', { errors: errors.map((e: any) => e.message) });
    }
    return html;
  } catch (err: unknown) {
    logger.error('[EmailTemplate] Render failed', { error: toErrorMessage(err) });
    return `<html><body><h1>${data.title}</h1>${data.body.map(p => `<p>${p}</p>`).join('')}</body></html>`;
  }
}
