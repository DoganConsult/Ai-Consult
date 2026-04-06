import { auditMiddleware } from '../middleware/audit';
// ============================================
// Natural Language GRC Query Engine Routes
// Provides API endpoints for natural language queries
// ============================================

import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import { requirePermission } from '../../../dauth';
import {
  executeGRCQuery,
  executeBatchGRCQueries,
} from '../../../../modules/platform/services/grc/grc-query-engine.service';
import { rateLimiter } from '../rate-limiting/rate-limiter';
import { validate } from '../validation/validate';
import { grcQueryBody, grcBatchQueryBody } from "../../../../modules/platform/schemas/platform.schemas";

const router = Router();

router.use(authenticate);
// Rate limiter for GRC queries (expensive LLM operations)
const grcQueryRateLimiter = rateLimiter({
  namespace: 'grc-query',
  maxRequests: 20, // 20 queries per minute per user
  windowMs: 60_000,
  keyGenerator: (req: Request) => req.userId || req.ip || 'anonymous',
});

/**
 * POST /api/grc-query
 * Execute a natural language GRC query.
 * Body: { query: string, context?: { entityType?, frameworkCode?, domain? } }
 */
router.post(
  '/', auditMiddleware('platform.grc_query_engine.create'), 
  authenticate,
  requirePermission('reporting.report.read'),
  grcQueryRateLimiter,
  validate({ body: grcQueryBody }),
  auditMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { query, context } = req.body;

      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'query is required and must be a string' });
        return;
      }

      const result = await executeGRCQuery(req.tenantId, { query, context });
      res.json(result);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

/**
 * POST /api/grc-query/batch
 * Execute multiple natural language GRC queries in batch.
 * Body: { queries: Array<{ query: string, context?: object }> }
 */
router.post(
  '/batch', auditMiddleware('platform.grc_query_engine.create'), 
  authenticate,
  requirePermission('reporting.report.read'),
  grcQueryRateLimiter,
  validate({ body: grcBatchQueryBody }),
  auditMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { queries } = req.body;

      if (!Array.isArray(queries) || queries.length === 0) {
        res.status(400).json({ error: 'queries must be a non-empty array' });
        return;
      }

      if (queries.length > 10) {
        res.status(400).json({ error: 'Maximum 10 queries per batch request' });
        return;
      }

      const results = await executeBatchGRCQueries(req.tenantId, queries);
      res.json({ results, count: results.length });
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

export default router;
