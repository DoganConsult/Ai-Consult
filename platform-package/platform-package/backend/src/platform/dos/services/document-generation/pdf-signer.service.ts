import { logger } from '../../observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { readFileSync } from 'fs';

export interface SignPdfOptions {
  certificate: Buffer;
  passphrase?: string;
  reason?: string;
  location?: string;
  contactInfo?: string;
}

export async function signPdf(
  pdfBuffer: Buffer,
  options: SignPdfOptions,
): Promise<Buffer> {
  try {
    const signpdfModule = await import('node-signpdf');
    const { plainAddPlaceholder } = await import('node-signpdf/dist/helpers');

    const signer = new signpdfModule.SignPdf();

    const pdfWithPlaceholder = plainAddPlaceholder({
      pdfBuffer,
      reason: options.reason || 'Digital Signature',
      contactInfo: options.contactInfo || '',
      name: 'Shahin-AI GRC',
      location: options.location || '',
    });

    const signedPdf = signer.sign(pdfWithPlaceholder, options.certificate);
    logger.info('[PdfSigner] PDF signed successfully');
    return signedPdf;
  } catch (err: unknown) {
    logger.error('[PdfSigner] Signing failed', { error: toErrorMessage(err) });
    throw err;
  }
}

export function loadCertificate(certPath: string): Buffer {
  return readFileSync(certPath);
}

export async function signPdfWithFile(
  pdfBuffer: Buffer,
  certPath: string,
  passphrase?: string,
  metadata?: { reason?: string; location?: string },
): Promise<Buffer> {
  const certificate = loadCertificate(certPath);
  return signPdf(pdfBuffer, {
    certificate,
    passphrase,
    reason: metadata?.reason,
    location: metadata?.location,
  });
}
