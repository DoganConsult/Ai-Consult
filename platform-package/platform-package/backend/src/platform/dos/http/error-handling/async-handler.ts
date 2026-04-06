/**
 * DOS async-handler -- wraps async Express handlers to forward errors to
 * the global error handler. Eliminates try/catch boilerplate in routes.
 */
import { Request, Response, NextFunction } from 'express';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const isProduction = process.env.NODE_ENV === 'production';

const SAFE_ERROR_PATTERNS = [
  /^Missing required/i,
  /^Invalid .+ format$/i,
  /^not found$/i,
  /^unauthorized$/i,
  /^forbidden$/i,
  /^already exists$/i,
  /^validation failed/i,
];

function isSafeMessage(msg: string): boolean {
  return SAFE_ERROR_PATTERNS.some((p) => p.test(msg));
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  const status = err?.status || err?.statusCode || 500;
  const rawMessage = err?.message || 'Internal server error';

  let clientMessage: string;
  if (status < 500) {
    clientMessage = rawMessage;
  } else if (isProduction && !isSafeMessage(rawMessage)) {
    clientMessage = 'Internal server error';
  } else {
    clientMessage = rawMessage;
  }

  if (status >= 500 && isProduction) {
    console.error('[ErrorHandler]', { status, error: rawMessage, stack: err?.stack });
  }

  res.status(status).json({ error: clientMessage, code: err?.code || 'INTERNAL_ERROR' });
}
