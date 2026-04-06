// @ts-nocheck
import { auditMiddleware } from '../middleware/audit';
import { logger } from '../../observability/logger.service';
// ============================================
// Platform — Background Jobs Routes (standardized)
// Super-admin endpoints for monitoring
// registered jobs and execution history
// ============================================

import { Router, Request, Response } from "express";
import { authenticate, requireSuperAdmin } from '../../../dauth';
import { getJobs, getJobHistory, executeJobByName, isJobRunning } from '../../jobs/job-scheduler.service';
import { asyncHandler, validate, ok, action, ConflictError } from "../../core/route-kit";
import { auditMiddleware } from '../middleware/audit';
import { jobNameParam, historyQuery } from '../../../../modules/platform/schemas/platform.schemas';
import { auditMiddleware } from '../middleware/audit';
import { jobNameParam, historyQuery } from '../../../../modules/platform/schemas/platform.schemas';

const router: Router = Router();
router.use(auditMiddleware('platform'));
// Apply auth + super-admin guard to all job routes
router.use(authenticate, requireSuperAdmin);

// GET / — List all registered jobs
router.get("/", asyncHandler(async (req: Request, res: Response) => {
  const jobs = await getJobs();
  res.json(ok(jobs, req));
}));

// GET /:name/history — Get execution history for a job
router.get("/:name/history",
  validate({ params: jobNameParam, query: historyQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await getJobHistory(req.params.name, limit);
    res.json(ok(history, req));
  }),
);

// POST /:name/trigger — Manually trigger a job (super-admin only)
router.post("/:name/trigger",authenticate, 
  validate({ params: jobNameParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.params;
    if (isJobRunning(name)) {
      throw new ConflictError(`Job "${name}" is already running`);
    }
    // Fire-and-forget; don't block the response
    executeJobByName(name).catch(err => {
      logger.error(`[Jobs] Manual trigger failed for ${name}:`, (err as Error).message);
    });
    res.json(action(`Job "${name}" triggered`, req));
  }),
);

export default router;