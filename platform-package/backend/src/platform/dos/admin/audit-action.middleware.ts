import { Request, Response, NextFunction } from 'express';
import { safeQuery } from '../../../config/database/database';
import { logger } from '../observability/logger.service';

/**
 * Append-only audit of admin mutations. Captures actor, entity, action, and
 * a JSON snapshot of the request body. Fire-and-forget — never blocks the
 * response.
 */
export function auditAdminAction(action: string, entityType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      const userId = (req as any).user?.userId ?? null;
      const tenantId = (req as any).user?.tenantId ?? null;
      const correlationId = (req.headers['x-correlation-id'] as string) || null;
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null;
      const userAgent = (req.headers['user-agent'] as string) || null;
      const entityId =
        (req.params?.['id'] as string) ||
        (req.params?.['userId'] as string) ||
        (req.params?.['flagCode'] as string) ||
        (req.params?.['moduleCode'] as string) ||
        (req.params?.['productCode'] as string) ||
        null;

      safeQuery(
        `INSERT INTO platform_audit_logs
          (actor_id, actor_type, tenant_id, module_code, entity_type, entity_id, action, after_state, metadata, correlation_id, source, ip_address, user_agent)
         VALUES ($1, 'user', $2, 'platform', $3, $4, $5, $6, $7, $8, 'platform-admin-api', $9, $10)`,
        [
          userId,
          tenantId,
          entityType,
          entityId,
          action,
          JSON.stringify(req.body ?? {}),
          JSON.stringify({ method: req.method, path: req.originalUrl, status: res.statusCode }),
          correlationId,
          ip,
          userAgent,
        ],
      ).catch((err: Error) => {
        logger.warn(`[AuditAdminAction] failed to persist audit for ${action}: ${err.message}`);
      });
    });
    next();
  };
}
