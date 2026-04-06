import * as mammoth from 'mammoth';
import { logger } from '../../observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';

export async function docxToHtml(buffer: Buffer): Promise<{ html: string; messages: string[] }> {
  try {
    const result = await mammoth.convertToHtml({ buffer });
    return {
      html: result.value,
      messages: result.messages.map(m => m.message),
    };
  } catch (err: unknown) {
    logger.error('[DocxPreview] Conversion failed', { error: toErrorMessage(err) });
    return { html: '', messages: [toErrorMessage(err)] };
  }
}

export async function docxToText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (err: unknown) {
    logger.error('[DocxPreview] Text extraction failed', { error: toErrorMessage(err) });
    return '';
  }
}
