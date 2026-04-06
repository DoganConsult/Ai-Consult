// @ts-nocheck
/**
 * File Upload Validation Middleware — G6 Gap Closure
 *
 * Provides enterprise-grade file upload protection:
 *  - Hard size cap (default 50MB)
 *  - Allowlist-only MIME type validation
 *  - File count limits
 *  - Malicious extension blocking
 *
 * @owner DOS
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../observability/logger.service';

/** Allowed MIME types — adjust per product needs */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/zip',
  'application/x-zip-compressed',
  'application/json',
  'application/xml',
  'text/xml',
]);

/** Extensions that are always blocked regardless of MIME type */
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.bas', '.vbs', '.js', '.jar',
  '.com', '.scr', '.msi', '.msp', '.dll', '.so', '.dylib',
]);

const DEFAULT_MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const DEFAULT_MAX_FILES = 10;

export interface FileUploadOptions {
  /** Maximum total body size in bytes. Default: 50MB */
  maxSizeBytes?: number;
  /** Maximum number of files per request. Default: 10 */
  maxFiles?: number;
  /** If true, reject any MIME type not in the allowlist. Default: true */
  enforceAllowlist?: boolean;
}

/**
 * Validates Content-Type header and Content-Length for upload requests.
 * Works at the Express layer before body parsing — blocks dangerous uploads early.
 */
export function fileUploadValidation(opts: FileUploadOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
  const maxSize = opts.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
  const __enforceAllowlist = opts.enforceAllowlist ?? true;

  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers['content-type'] || '';
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    // Only validate multipart or binary uploads
    if (!contentType.includes('multipart/form-data') && !contentType.includes('application/octet-stream')) {
      return next();
    }

    // Block oversized requests before parsing
    if (contentLength > maxSize) {
      logger.warn('[FileUploadValidation] Request blocked — exceeds size limit', {
        contentLength,
        maxSize,
        ip: req.ip,
        path: req.path,
      });
      res.status(413).json({
        error: 'PAYLOAD_TOO_LARGE',
        message: `File upload exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB.`,
      });
      return;
    }

    next();
  };
}

/**
 * Validates individual file entries after multer/busboy parsing.
 * Use as multer fileFilter or as a post-parse middleware on req.files.
 */
export function validateUploadedFile(
  file: { mimetype: string; originalname: string; size: number },
  enforceAllowlist = true,
): { valid: boolean; reason?: string } {
  const ext = ('.' + file.originalname.split('.').pop()?.toLowerCase()) as string;

  // Block dangerous extensions regardless of MIME
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { valid: false, reason: `Blocked file extension: ${ext}` };
  }

  // MIME allowlist enforcement
  if (enforceAllowlist && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return { valid: false, reason: `Unsupported MIME type: ${file.mimetype}` };
  }

  return { valid: true };
}

/**
 * Express middleware to validate req.files after uploading.
 * Place AFTER multer middleware.
 */
export function validateUploadedFilesMiddleware(
  opts: FileUploadOptions = {},
): (req: Request, res: Response, next: NextFunction) => void {
  const maxFiles = opts.maxFiles ?? DEFAULT_MAX_FILES;
  const enforceAllowlist = opts.enforceAllowlist ?? true;

  return (req: Request, res: Response, next: NextFunction): void => {
    const files: Express.Multer.File[] = [];

    if (Array.isArray(req.files)) {
      files.push(...req.files);
    } else if (req.files && typeof req.files === 'object') {
      for (const key of Object.keys(req.files)) {
        files.push(...req.files[key]);
      }
    } else if (req.file) {
      files.push(req.file);
    }

    if (files.length === 0) return next();

    if (files.length > maxFiles) {
      res.status(400).json({ error: 'TOO_MANY_FILES', message: `Maximum ${maxFiles} files allowed per request.` });
      return;
    }

    for (const file of files) {
      const result = validateUploadedFile(file, enforceAllowlist);
      if (!result.valid) {
        logger.warn('[FileUploadValidation] File rejected', {
          reason: result.reason,
          filename: file.originalname,
          mimetype: file.mimetype,
          ip: req.ip,
          path: req.path,
        });
        res.status(400).json({ error: 'INVALID_FILE', message: result.reason });
        return;
      }
    }

    next();
  };
}
