/**
 * DOS async-handler — wraps async Express handlers to forward errors to
 * the global error handler. Eliminates try/catch boilerplate in routes.
 *
 * Law 9: Lives under dos/http/, not a flat middleware/ junk drawer.
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../observability/logger.service';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const status = err?.status || err?.statusCode || 500;
  const is5xx = status >= 500;

  // Law: In production, return generic message for 5xx errors to prevent leakage
  const message = (isProduction && is5xx) 
    ? 'Internal server error' 
    : (err?.message || 'Internal server error');

  if (is5xx) {
    logger.error(`[errorHandler] ${err?.message || 'Unknown error'}`, { 
      status, 
      code: err?.code,
      stack: err?.stack,
      path: _req.path,
      method: _req.method
    });
  }

  res.status(status).json({ 
    error: message, 
    code: err?.code || 'INTERNAL_ERROR',
    ...(isProduction ? {} : { stack: err?.stack })
  });
}
