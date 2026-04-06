// @ts-nocheck
import { Router, Response } from 'express';
import { authenticate } from '../../../platform/dauth';
import { ProvisioningService } from '../../../platform/dos/provisioning/provisioning.service';
import { AuthenticatedRequest } from '../../../types/express.types';
import { validate } from '../../../platform/dos/core/route-kit';
import { provisioningStartBody } from '../schemas/platform.schemas';

const router: Router = Router();
const provisioningService = new ProvisioningService();

// POST /api/provisioning/start — kick off pack-based provisioning
router.post('/start', authenticate, validate({ body: provisioningStartBody }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = String(req.body.tenantId || req.tenantId || '');
    const tenantSlug = String(req.body.tenantSlug || tenantId);
    const actorUserId = String(req.user?.userId || req.body.actorUserId || '');
    const sessionId = req.body.sessionId || undefined;
    const locale = (req.body.locale || 'en') as 'en' | 'ar';

    if (!tenantId || !actorUserId) {
      return res.status(400).json({ error: 'tenantId and actorUserId are required' });
    }

    const result = await provisioningService.startProvisioning({
      tenantId,
      tenantSlug,
      actorUserId,
      sessionId,
      locale,
    });

    return res.status(202).json(result);
  } catch (err: unknown) {
    return res.status(500).json({ error: (err as Error).message ?? 'Failed to start provisioning' });
  }
});

// GET /api/provisioning/:jobId — full job status with steps + events
router.get('/:jobId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await provisioningService.getProvisioningStatus(req.params.jobId);
    return res.json(result);
  } catch (err: unknown) {
    return res.status(404).json({ error: (err as Error).message ?? 'Provisioning job not found' });
  }
});

// GET /api/provisioning/:jobId/steps
router.get('/:jobId/steps', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const steps = await provisioningService.getProvisioningSteps(req.params.jobId);
    return res.json(steps);
  } catch (err: unknown) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/provisioning/:jobId/events
router.get('/:jobId/events', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const events = await provisioningService.getProvisioningEvents(req.params.jobId);
    return res.json(events);
  } catch (err: unknown) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default router;