// @ts-nocheck
import { auditMiddleware } from '../../http/middleware/audit';
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../http/error-handling/async-handler';
import { authenticate } from '../../../dauth';
import { requirePermission } from '../../../dauth';


const router = Router();
router.use(authenticate);
router.use(auditMiddleware('platform'));

router.get(
  '/workspace-audit/latest',
  authenticate,
  requirePermission('admin.system.read'),
  asyncHandler(async (_req: Request, res: Response) => {
    const { getLatestReport } = await import('../../services/workspace/workspace-audit.service');
    const report = getLatestReport();
    if (!report) {
      return res.status(404).json({ error: 'No audit report available yet. Wait for next scheduled run.' });
    }
    res.json(report);
  }),
);

router.get(
  '/workspace-audit/history',
  authenticate,
  requirePermission('admin.system.read'),
  asyncHandler(async (_req: Request, res: Response) => {
    const { getAuditHistory } = await import('../../services/workspace/workspace-audit.service');
    const history = getAuditHistory();
    res.json(history);
  }),
);

router.post(
  '/workspace-audit/run', auditMiddleware('platform.workspace_audit.create'), 
  authenticate,
  requirePermission('platform.system.admin'),
  asyncHandler(async (_req: Request, res: Response) => {
    const { runWorkspaceAudit } = await import('../../services/workspace/workspace-audit.service');
    const report = await runWorkspaceAudit();
    res.json(report);
  }),
);

export default router;
