// @ts-nocheck
/**
 * DOS upload-validation — validates file uploads by size and MIME type.
 * Rejects oversized or disallowed file types before they reach route handlers.
 *
 * Law 9: Lives under dos/http/middleware/, grouped by concern.
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../observability/logger.service';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv', 'text/plain', 'application/json', 'application/xml',
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

/**
 * Express middleware that validates uploaded files against size and MIME type constraints.
 * Works with both single-file (`req.file`) and multi-file (`req.files`) uploads from multer.
 *
 * @param opts.maxSize  Maximum allowed file size in bytes (default: 25 MB)
 * @param opts.allowedTypes  Set of permitted MIME types (default: ALLOWED_MIME_TYPES)
 */
export function validateUpload(opts?: { maxSize?: number; allowedTypes?: Set<string> }) {
  const maxSize = opts?.maxSize ?? MAX_FILE_SIZE;
  const allowed = opts?.allowedTypes ?? ALLOWED_MIME_TYPES;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.file && !req.files) { next(); return; }

    const files = req.file
      ? [req.file]
      : Array.isArray(req.files)
        ? req.files
        : Object.values(req.files).flat();

    for (const file of files) {
      if (file.size > maxSize) {
        logger.warn({ fileName: file.originalname, size: file.size, maxSize }, 'Upload rejected: file too large');
        res.status(413).json({ error: `File ${file.originalname} exceeds maximum size of ${maxSize} bytes` });
        return;
      }
      if (!allowed.has(file.mimetype)) {
        logger.warn({ fileName: file.originalname, mime: file.mimetype }, 'Upload rejected: invalid type');
        res.status(415).json({ error: `File type ${file.mimetype} is not allowed` });
        return;
      }
    }
    next();
  };
}
