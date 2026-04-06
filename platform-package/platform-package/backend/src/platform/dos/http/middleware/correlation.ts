import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { requestContext } from '../../observability/logger.service';

const HEADER = 'x-correlation-id';

export function correlationMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req.headers[HEADER] as string) || randomUUID();
    const tenantId = req.tenantId;
    const userId = req.user?.userId || req.user?.id;

    res.setHeader(HEADER, correlationId);

    requestContext.run({ correlationId, tenantId, userId }, () => {
      next();
    });
  };
}
