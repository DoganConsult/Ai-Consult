import { auditMiddleware } from '../middleware/audit';
/**
 * Frontend Error Ingest — receives client-side error reports.
 *
 * B-08 FIX: Frontend observability must be active in production.
 * This endpoint receives errors from GlobalErrorHandler.reportToObservability()
 * and logs them through the platform's structured logging pipeline (Pino → OTel).
 *
 * POST /api/platform/client-errors
 *   Body: { message, name, stack, timestamp, url, userAgent }
 *   Returns: 204 No Content
 *
 * Rate limited to prevent abuse. No auth required (errors may occur before login).
 */
import { Router, Request, Response } from 'express';
import { logger } from '../../observability/logger.service';
import { rateLimiter } from '../rate-limiting/rate-limiter';
import { authenticate } from '../../../dauth';



const router = Router();
router.use(authenticate);
router.use(auditMiddleware('platform'));

// Strict rate limit: 20 error reports per minute per IP
const errorIngestLimiter = rateLimiter({
  namespace: 'client-errors',
  maxRequests: 20,
  windowMs: 60_000,
});

interface ClientErrorPayload {
  message?: string;
  name?: string;
  stack?: string;
  timestamp?: string;
  url?: string;
  userAgent?: string;
}

router.post('/', errorIngestLimiter, (req: Request, res: Response) => {
  try {
    const payload = req.body as ClientErrorPayload;

    // Validate: must have at least a message
    if (!payload || !payload.message || typeof payload.message !== 'string') {
      res.status(400).json({ error: 'Missing required field: message' });
      return;
    }

    // Sanitize: truncate to prevent log injection / storage abuse
    const sanitized = {
      message: String(payload.message).slice(0, 2000),
      name: String(payload.name || 'Error').slice(0, 200),
      stack: String(payload.stack || '').slice(0, 5000),
      timestamp: String(payload.timestamp || new Date().toISOString()).slice(0, 30),
      url: String(payload.url || '').slice(0, 500),
      userAgent: String(payload.userAgent || '').slice(0, 500),
      ip: req.ip || req.socket.remoteAddress || 'unknown',
    };

    // Log as structured error through the platform's Pino pipeline
    // This feeds into OTel → Langfuse / ClickHouse → dashboards
    logger.error('[ClientError]', {
      source: 'frontend',
      clientError: sanitized,
    });

    res.status(204).end();
  } catch {
    // Never fail the error reporting endpoint
    res.status(204).end();
  }
});

export default router;
