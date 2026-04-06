// @ts-nocheck
/**
 * Lifecycle Gate Middleware — Automatically enforces lifecycle authorization
 * on POST/PUT/PATCH requests that change entity status.
 *
 * §11 Lifecycle Authorization Model: Every status-change mutation must pass
 * through DAuth evaluateLifecycleTransition before the update is applied.
 *
 * Usage:
 *   router.use(lifecycleGate('compliance', 'controls', 'control_id'));
 *
 * The middleware inspects req.body for { status } or { toStatus } fields.
 * If present on a mutation request, it calls evaluateLifecycleTransition.
 * If the transition is denied, returns 403. Otherwise, sets req.lifecycleAuth
 * on the request for downstream handlers to use.
 */

import type { Request, Response, NextFunction } from 'express';
import { evaluateLifecycleTransition } from '../../dauth';
import { safeQuery, tenantSchema } from '../../../config/database';
import { logger } from '../observability/logger.service';

export interface LifecycleGateOptions {
  moduleCode: string;
  entityType: string;
  idParam?: string;
  statusField?: string;
  permissionCode?: string;
}

/**
 * Creates middleware that enforces lifecycle authorization on status-change mutations.
 */
export function lifecycleGate(
  moduleCode: string,
  entityType: string,
  idParam = 'id',
  statusField = 'status',
): (req: Request, res: Response, next: NextFunction) => void {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only gate mutations
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();

    // Check if the request body contains a status change
    const toStatus = req.body?.toStatus || req.body?.status || req.body?.toState;
    if (!toStatus) return next();

    const entityId = req.params?.[idParam];
    if (!entityId) return next();

    const tenantId = req.tenantId;
    const userId = req.user?.userId || req.user?.id;
    if (!tenantId || !userId) return next();

    try {
      // Get current status
      const schema = tenantSchema(tenantId);
      const { rows } = await safeQuery(
        `SELECT "${statusField}" AS current_status FROM "${schema}"."${entityType}" WHERE id = $1 LIMIT 1`,
        [entityId],
      ).catch(() => ({ rows: [] }));

      if (rows.length === 0) return next(); // Entity not found — let the handler deal with it

      const fromStatus = rows[0].current_status;
      if (fromStatus === toStatus) return next(); // No change

      const authResult = await evaluateLifecycleTransition(tenantId, userId, {
        moduleCode,
        entityType,
        entityId,
        fromState: fromStatus,
        toState: toStatus,
        permissionCode: `${moduleCode}.${entityType}.approve`,
        userRoles: [],
      });

      if (!authResult.allowed) {
        logger.warn('[LifecycleGate] Transition denied', {
          tenantId, userId, moduleCode, entityType, entityId,
          from: fromStatus, to: toStatus,
          reason: authResult.reason,
        });

        res.status(403).json({
          error: 'Lifecycle transition denied',
          reason: authResult.reason,
          checks: authResult.checks,
          from: fromStatus,
          to: toStatus,
        });
        return;
      }

      // Attach auth result for downstream handlers
      req.lifecycleAuth = {
        allowed: true,
        fromStatus,
        toStatus,
        moduleCode,
        entityType,
        entityId,
      };

      next();
    } catch (err) {
      logger.warn('[LifecycleGate] Auth check failed — deny by default (Law 11)', {
        moduleCode, entityType,
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(403).json({ error: 'Lifecycle gate check failed — access denied' });
    }
  };
}
