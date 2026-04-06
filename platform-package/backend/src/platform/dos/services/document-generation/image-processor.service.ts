// @ts-nocheck
import sharp from 'sharp';
import { logger } from '../../observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';

export interface ImageProcessResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
}

export async function generateThumbnail(
  input: Buffer,
  maxWidth = 300,
  maxHeight = 300,
): Promise<ImageProcessResult> {
  try {
    const image = sharp(input);
    const _metadata = await image.metadata();

    const result = await image
      .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: result.data,
      width: result.info.width,
      height: result.info.height,
      format: result.info.format,
      size: result.info.size,
    };
  } catch (err: unknown) {
    logger.error('[ImageProcessor] Thumbnail failed', { error: toErrorMessage(err) });
    throw err;
  }
}

export async function compressImage(
  input: Buffer,
  quality = 80,
  maxWidth = 1920,
): Promise<Buffer> {
  try {
    return await sharp(input)
      .resize(maxWidth, undefined, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  } catch (err: unknown) {
    logger.error('[ImageProcessor] Compress failed', { error: toErrorMessage(err) });
    throw err;
  }
}

export async function getImageMetadata(input: Buffer): Promise<{
  width: number; height: number; format: string; size: number;
}> {
  const metadata = await sharp(input).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    size: input.length,
  };
}

export async function convertToWebP(input: Buffer, quality = 80): Promise<Buffer> {
  return sharp(input).webp({ quality }).toBuffer();
}
