import { Request, Response, NextFunction } from 'express';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const METHOD_TO_ACTION: Record<string, string> = {
  POST: 'created',
  PUT: 'updated',
  PATCH: 'updated',
  DELETE: 'deleted',
};

export function mutationEventHook(moduleCode: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!MUTATION_METHODS.has(req.method)) { next(); return; }

    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (res.statusCode < 400 && body?.success !== false) {
        const tenantId = req.tenantId;
        const user = req.user;
        if (tenantId) {
          const action = METHOD_TO_ACTION[req.method] || 'updated';
          const entityId = body?.data?.id || req.params?.id || req.params?.systemId || null;
          const pathParts = req.baseUrl?.split('/').filter(Boolean) || [];
          const entityType = pathParts[pathParts.length - 1] || moduleCode;

          import('../../events/event-bus').then(({ emitEvent }) => {
            emitEvent({
              event: action,
              tenantId,
              userId: user?.userId || user?.id || 'system',
              module: moduleCode,
              entityType,
              entityId,
              data: {
                method: req.method,
                path: req.originalUrl,
                action,
              },
            }).catch(() => {});
          }).catch(() => {});
        }
      }
      return originalJson(body);
    };
    next();
  };
}
