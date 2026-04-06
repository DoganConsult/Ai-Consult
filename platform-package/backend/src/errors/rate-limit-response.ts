import type { Response } from 'express';

/**
 * Standard 429 response helper.
 * Sets the RFC 7231 `Retry-After` header (seconds) and returns a JSON body
 * with the canonical `retryAfterSeconds` field.
 */
export function sendRateLimitResponse(
  res: Response,
  retryAfterSeconds: number,
  error: string,
  extra: Record<string, unknown> = {},
): void {
  const seconds = Math.max(1, Math.ceil(Number(retryAfterSeconds) || 30));
  res.setHeader('Retry-After', String(seconds));
  res.status(429).json({
    error,
    retryAfterSeconds: seconds,
    ...extra,
  });
}
