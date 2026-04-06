// @ts-nocheck
import { auditMiddleware } from '../middleware/audit';
import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import { unifiedSearch } from '../../search/services/unified-search.service';
import { logger } from '../../observability/logger.service';
import { toErrorMessage } from '../../../../errors/http-error.util';

const router: Router = Router();
router.use(auditMiddleware('unified-search'));

router.get(
  '/',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { q, modules, limit, threshold } = req.query;

      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return res.status(400).json({
          error: 'Search query required',
          error_ar: 'استعلام البحث مطلوب',
        });
      }

      const results = await unifiedSearch({
        query: q,
        tenantId: req.user.tenantId,
        modules: modules ? String(modules).split(',') : undefined,
        limit: limit ? parseInt(limit, 10) : 20,
        fuzzyThreshold: threshold ? parseFloat(threshold) : 0.3,
      });

      return res.json({
        query: q,
        total: results.length,
        results,
      });
    } catch (err: unknown) {
      logger.error('[UnifiedSearch] Search failed', { error: toErrorMessage(err) });
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;