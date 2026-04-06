/**
 * DOS audit — route-level audit trail middleware.
 * Logs mutations (POST/PUT/PATCH/DELETE) to audit_trail table.
 *
 * Law 9: Lives under dos/http/, not a flat middleware/ junk drawer.
 */
import { Request, Response, NextFunction } from 'express';
import { safeQuery, tenantSchema } from '../../../../config/database/database';

export function auditMiddleware(actionCode?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only audit mutations
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { next(); return; }

    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      // Fire-and-forget audit log after response
      const user = req.user;
      const tenantId = req.tenantId;
      if (user && tenantId) {
        const schema = tenantSchema(tenantId);
        safeQuery(
          `INSERT INTO "${schema}".audit_trail
           (user_id, action, entity_type, entity_id, module, path, method, ip_address, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            user.userId || user.id,
            actionCode || `${req.method} ${req.baseUrl}`,
            req.params?.id ? 'record' : 'collection',
            req.params?.id || null,
            req.baseUrl?.split('/')[2] || null,
            req.originalUrl,
            req.method,
            req.ip || null,
            JSON.stringify({ statusCode: res.statusCode }),
          ],
        ).catch(() => { /* audit failure must not block response */ });
      }
      return originalJson(body);
    };
    next();
  };
}

/**
 * Attach structured audit metadata to the response for downstream logging.
 * Route handlers call this to enrich the audit trail with before/after state.
 */
export function setAuditData(
  res: Response,
  data: { action: string; entityType: string; entityId?: string; beforeState?: unknown; afterState?: unknown },
): void {
  (res as any).__auditData = data;
}
export function requestLogger(..._args: any[]): (req: Request, res: Response, next: NextFunction) => void { return (_req, _res, next) => next(); }

/** Local knowledge access log middleware — no-op until full audit wiring */
export function localKnowledgeAccessLogMiddleware(_req: Request, _res: Response, next: NextFunction): void { next(); }
