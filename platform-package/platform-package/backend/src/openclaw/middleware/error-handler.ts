// ============================================
// OpenClaw Error Handler Middleware
// Standardizes error responses for MCP protocol
// ============================================

import { Request, Response, NextFunction } from 'express';
import { toErrorMessage } from '../../errors/http-error.util';
import { logger } from '../../platform/dos/observability/logger.service';

/**
 * Error handler for OpenClaw requests
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const errorMsg = toErrorMessage(err);
  logger.error('[OpenClaw] Unhandled error', { error: errorMsg, path: req.path });

  // If response already sent, delegate to default handler
  if (res.headersSent) {
    return next(err);
  }

  // Return MCP-formatted error
  res.status(500).json({
    jsonrpc: '2.0',
    error: {
      code: -32603,
      message: 'Internal error',
      data: errorMsg,
    },
    id: req.body?.id || null,
  });
}
export function asyncHandler(..._args: any[]): unknown { return undefined; }
