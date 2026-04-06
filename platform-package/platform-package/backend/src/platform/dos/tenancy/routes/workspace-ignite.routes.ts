// @ts-nocheck
import { auditMiddleware } from '../../http/middleware/audit';
import { validate } from '../../http/validation/validate';
import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import { requirePermission } from '../../../dauth';
import { igniteWorkspace } from '../../../../modules/platform/services/workspace/workspace-ignite.service';
import { emitEvent } from '../../events/event-bus';
import { toErrorMessage } from '../../../../errors/http-error.util';
import { auditMiddleware } from '../../http/middleware/audit';
import { swallow, EC } from '../../resilience/resilient-catch';
import { ignitePostBody } from '../../../../modules/platform/schemas/platform.schemas';

// ── Zod Schemas ──────────────────────────────────────────────────────────
const router: Router = Router();
router.use(auditMiddleware('onboarding'));

router.post('/ignite', auditMiddleware('platform.workspace_ignite.create'), authenticate, requirePermission('workspace.config.write'), validate({ body: ignitePostBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user!.userId;
    const dryRun = req.body.dryRun === true;
    const scope = req.body.scope === 'failed_only' ? 'failed_only' : 'all';

    const result = await igniteWorkspace(tenantId, userId, dryRun, scope as 'all' | 'failed_only') as string;
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'workspace_ignite', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.workspace_ignite.created' });
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;