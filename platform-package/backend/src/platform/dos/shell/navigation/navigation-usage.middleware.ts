// ============================================
// DOS Navigation — Usage Tracking Middleware
// Intercepts navigation API calls and records
// which nav items users access. Feeds analytics,
// frequency-based smart ordering, and admin
// usage dashboards.
// ============================================

import { Request, Response, NextFunction } from 'express';
import { publish } from '../../events/event-bus';
import { logger } from '../../observability/logger.service';

/**
 * Middleware: tracks navigation menu access.
 * Placed on the /api/navigation/menu endpoint.
 * Records the fact that a user loaded their navigation tree.
 */
export function trackMenuAccess() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Capture the original json method to intercept the response
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      // Fire-and-forget: don't block the response
      setImmediate(async () => {
        try {
          const tenantId = req.tenantId || req.user?.tenantId;
          const userId = req.user?.userId || req.headers['x-user-id'];
          if (!tenantId || !userId) return;

          // Emit analytics event. Subscribed by the tracking service asynchronously.
          await publish('analytics.navigation.menu_loaded', String(tenantId), {
            userId: String(userId),
            itemCount: body?.meta?.itemCount ?? 0,
            fromCache: body?.meta?.fromCache ?? false,
          }, {
            moduleCode: 'navigation',
            severity: 'info',
          });
        } catch (err) {
          logger.debug('[nav-usage] Failed to track menu access', { error: String(err) });
        }
      });

      return originalJson(body);
    };

    next();
  };
}

/**
 * Middleware: tracks individual navigation item clicks.
 * Called when frontend reports a nav item click via POST /api/navigation/track.
 */
export async function handleTrackNavClick(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId || req.user?.tenantId;
  const userId = req.user?.userId || req.headers['x-user-id'];

  if (!tenantId || !userId) {
    res.status(401).json({ error: 'Missing auth context' });
    return;
  }

  const { navKey, route, moduleCode } = req.body;
  if (!navKey || !route) {
    res.status(400).json({ error: 'navKey and route are required' });
    return;
  }

  // Emit click event for real-time analytics. Subscribed by the tracking integration.
  await publish('analytics.navigation.item_clicked', String(tenantId), {
    userId: String(userId), navKey, route, moduleCode: moduleCode ?? null,
  }, {
    moduleCode: 'navigation',
    entityType: 'nav_item',
    entityId: navKey,
    severity: 'info',
  }).catch(() => {});

  res.json({ success: true });
}
