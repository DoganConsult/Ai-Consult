import { logger } from '../../observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';

export async function generateQRCodeDataURL(
  data: string,
  options?: { width?: number; margin?: number; color?: { dark?: string; light?: string } },
): Promise<string | null> {
  try {
    const QRCode = await import('qrcode');
    const dataUrl = await QRCode.toDataURL(data, {
      width: options?.width || 256,
      margin: options?.margin || 2,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF',
      },
    });
    return dataUrl;
  } catch (err: unknown) {
    logger.error(`[QRCode] Generation failed: ${toErrorMessage(err)}`);
    return null;
  }
}

export async function generateQRCodeBuffer(
  data: string,
  options?: { width?: number; type?: 'png' | 'svg' },
): Promise<Buffer | null> {
  try {
    const QRCode = await import('qrcode');
    if (options?.type === 'svg') {
      const svg = await QRCode.toString(data, { type: 'svg', width: options?.width || 256 });
      return Buffer.from(svg, 'utf-8');
    }
    return await QRCode.toBuffer(data, { width: options?.width || 256 });
  } catch (err: unknown) {
    logger.error(`[QRCode] Buffer generation failed: ${toErrorMessage(err)}`);
    return null;
  }
}

export async function generateMfaEnrollmentQR(
  secret: string,
  userEmail: string,
  issuer = 'Shahin-GRC',
): Promise<string | null> {
  const otpauthUrl = `otpauth://totp/${issuer}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
  return generateQRCodeDataURL(otpauthUrl, { width: 300 });
}

export async function generateReportVerificationQR(
  reportId: string,
  verificationUrl: string,
): Promise<string | null> {
  const url = `${verificationUrl}?reportId=${reportId}`;
  return generateQRCodeDataURL(url, { width: 200 });
}

export async function generateEvidenceSubmissionQR(
  tenantId: string,
  controlId: string,
  baseUrl: string,
): Promise<string | null> {
  const url = `${baseUrl}/evidence/submit?tenant=${tenantId}&control=${controlId}`;
  return generateQRCodeDataURL(url, { width: 200 });
}
