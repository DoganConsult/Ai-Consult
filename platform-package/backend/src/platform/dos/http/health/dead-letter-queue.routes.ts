// @ts-nocheck
import { auditMiddleware } from '../middleware/audit';
// ============================================
// Dead-Letter Queue Routes
// Endpoints for managing permanently failed agent runs
// ============================================

import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import { requirePermission } from '../../../dauth';
import { tenantGuard } from '../guards/tenant-guard';
import {
  getUnresolvedEntries,
  resolveDLQEntry,
  getFailureStats,
  type _DeadLetterEntry,
  type _FailureStats,
} from '../../../../langgraph/observability/dead-letter-queue.service';
import { toErrorMessage } from '../../../../errors/http-error.util';

const router = Router();
router.use(auditMiddleware('ai'));
router.use(tenantGuard);
router.use(authenticate);
router.use(requirePermission('ai.agent.view'));

// GET /api/dead-letter-queue — Get unresolved entries
router.get('/', async (req: Request, res: Response) => {
  try {
    const agentId = req.query.agentId as string | undefined;
    const failureCategory = req.query.failureCategory as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;
    const tenantId = req.tenantId!;

    const entries = await getUnresolvedEntries(
      tenantId,
      agentId,
      failureCategory as any,
      limit,
    );
    res.json({ entries });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/dead-letter-queue/stats — Get failure statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const agentId = req.query.agentId as string | undefined;
    const days = parseInt(req.query.days as string) || 30;
    const tenantId = req.tenantId!;

    const stats = await getFailureStats(tenantId, agentId, days);
    res.json({ stats });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/dead-letter-queue/:dlqId/resolve — Resolve a dead-letter entry
router.post(
  '/:dlqId/resolve',
  requirePermission('ai.agent.manage'),
  async (req: Request, res: Response) => {
    try {
      const { dlqId } = req.params;
      const { resolutionAction, resolutionNotes } = req.body;
      const tenantId = req.tenantId!;
      const resolvedBy = req.user!.userId;

      if (!resolutionAction || !['manual_recovery', 'auto_recovered', 'ignored', 'deleted'].includes(resolutionAction)) {
        return res.status(400).json({ error: 'Invalid resolutionAction' });
      }

      await resolveDLQEntry(tenantId, dlqId, resolutionAction, resolvedBy, resolutionNotes);
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

export default router;
