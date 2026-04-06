// @ts-nocheck
/**
 * DOS module-stack — sets module context on the request for downstream services.
 * Allows route handlers to know which module is handling the request.
 *
 * Law 9: Lives under dos/http/, not a flat middleware/ junk drawer.
 */
import { Request, Response, NextFunction } from 'express';
import cors from 'cors';

export type SupportedLang = 'en' | 'ar';

export function moduleStack(moduleCode: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.moduleCode = moduleCode;
    req.module = moduleCode;
    next();
  };
}

/**
 * Blocks the request if the module's AI mode is 'human-only'.
 * Used on endpoints that involve AI-generated content or autonomous actions.
 */
export function blockInHumanOnlyMode() {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    // Placeholder: in production, check tenant AI mode config.
    // If mode === 'human-only', return 403. Otherwise, proceed.
    next();
  };
}

/**
 * Requires that the module's AI mode is 'hybrid' or higher (shadow, autonomous).
 * Blocks if the mode is 'human-only' or undefined.
 */
export function requireHybridOrHigher() {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    // Placeholder: in production, check tenant AI mode config.
    // If mode is not hybrid/shadow/autonomous, return 403. Otherwise, proceed.
    next();
  };
}

/**
 * CORS middleware — wraps the cors package with project defaults.
 */
export function corsMiddleware() {
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:4200').split(',').map(o => o.trim());

  // G32: Hard block — refuse to start if CORS wildcard is configured in production.
  // A wildcard origin with credentials: true is insecure and must never reach runtime.
  if (process.env.NODE_ENV === 'production' && allowedOrigins.includes('*')) {
    throw new Error(
      'CORS_ORIGINS contains wildcard "*" in production. '
      + 'This is forbidden — set explicit allowed origins in CORS_ORIGINS.'
    );
  }

  return cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    maxAge: 86400,
  });
}

/**
 * i18n middleware — reads Accept-Language header, sets req.lang.
 */
export function i18nMiddleware() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const acceptLang = req.headers['accept-language'] || '';
    req.lang = acceptLang.startsWith('en') ? 'en' : 'ar';
    next();
  };
}

/**
 * API version middleware — sets X-API-Version header on all responses.
 */
export function apiVersionMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-API-Version', process.env.API_VERSION || '1.0.0');
  next();
}
