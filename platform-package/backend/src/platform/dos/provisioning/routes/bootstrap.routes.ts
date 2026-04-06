import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import { requirePermission } from '../../../dauth';
import { BootstrapChecklistService } from '../../../../modules/platform/bootstrap/bootstrap-checklist.service';
import { toErrorMessage } from '../../../../errors/http-error.util';

const router = Router();
const checklistService = new BootstrapChecklistService();

// GET /api/bootstrap/status — live bootstrap checklist evaluation
router.get('/status', authenticate, requirePermission('admin.system.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Not authenticated' });
    const status = await checklistService.getStatus(tenantId);
    res.json(status);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/bootstrap/checklist — alias for /status
router.get('/checklist', authenticate, requirePermission('admin.system.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Not authenticated' });
    const status = await checklistService.getStatus(tenantId);
    res.json(status);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;
