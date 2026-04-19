import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { pool } from '../../config/db/pool';

/**
 * Gate 4 — Webhook security + mutation audit.
 *
 * Two primitives used by the pillar BFF:
 *   - hmacGuard(envName): Express middleware that enforces
 *     x-dogan-signature = hmac-sha256(raw-body) using the configured secret.
 *     If the env var is unset, the guard is a no-op (backwards compatible).
 *   - writeAudit(req, action, target, meta): inserts a row into
 *     platform.audit_log against the system tenant so every pillar mutation
 *     is tracked even when the caller has no tenant GUC bound.
 */

function getRawBody(req: Request): string {
  const raw = (req as Request & { rawBody?: string | Buffer }).rawBody;
  if (typeof raw === 'string') return raw;
  if (raw instanceof Buffer) return raw.toString('utf8');
  try {
    return JSON.stringify(req.body ?? {});
  } catch {
    return '';
  }
}

export function hmacGuard(envName: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const secret = process.env[envName];
    if (!secret) return next();
    const sig = String(req.headers['x-dogan-signature'] ?? '');
    if (!sig) {
      res.status(401).json({ error: 'missing x-dogan-signature' });
      return;
    }
    const body = getRawBody(req);
    const mac = createHmac('sha256', secret).update(body).digest('hex');
    try {
      const a = Buffer.from(sig, 'hex');
      const b = Buffer.from(mac, 'hex');
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        res.status(401).json({ error: 'bad signature' });
        return;
      }
    } catch {
      res.status(401).json({ error: 'bad signature' });
      return;
    }
    next();
  };
}

export async function writeAudit(
  req: Request,
  action: string,
  target: string,
  meta: Record<string, unknown> = {},
  statusCode = 200,
): Promise<void> {
  try {
    const user = (req as Request & { user?: { id?: string; tenant_id?: string } }).user;
    const clientIp =
      (req.headers['cf-connecting-ip'] as string | undefined) ||
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? (req.headers['x-forwarded-for'] as string).split(',')[0]?.trim()
        : undefined) ||
      req.ip ||
      null;
    await pool.query(
      `insert into platform.audit_log
         (tenant_id, user_id, action, target, status_code, client_ip, request_id, meta)
       values
         (coalesce($1::uuid, platform.system_tenant_id()),
          $2::uuid, $3, $4, $5, $6::inet, $7, $8::jsonb)`,
      [
        user?.tenant_id ?? null,
        user?.id ?? null,
        action,
        target,
        statusCode,
        clientIp,
        (req.headers['x-request-id'] as string | undefined) ?? null,
        JSON.stringify(meta ?? {}),
      ],
    );
  } catch {
    /* audit is best-effort; never block the primary mutation */
  }
}
