// @ts-nocheck
import { auditMiddleware } from '../middleware/audit';
import { saveSearchBody } from '../../../../modules/platform/schemas/platform.schemas';
/**
 * Global Search Routes
 * 
 * Provides unified search across all GRC entity types with:
 * - Extended filter params (types, status, owners, dateFrom, dateTo)
 * - Recent searches tracking
 * - Saved searches management
 * - RBAC-based result filtering
 * 
 * Requirements: 3.1, 3.5, 3.6
 */
import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import { requirePermission } from '../../../dauth';
import { 
  search, 
  recordSearch,
  getRecentSearches, 
  saveSearch, 
  getSavedSearches, 
  deleteSavedSearch 
} from '../../search/global-search.service';
import { emitEvent } from '../../events/event-bus';
import { toErrorMessage } from '../../../../errors/http-error.util';
import { validate } from '../validation/validate';
import { swallow, EC } from '../../resilience/resilient-catch';


const router = Router();
router.use(auditMiddleware('platform'));

/**
 * GET /api/search - Global search with extended filter params
 * 
 * Query Parameters:
 * - q: Search query string (required for results)
 * - types: Comma-separated entity types (risk,control,policy,incident,vendor,evidence)
 * - status: Comma-separated status values to filter by
 * - owners: Comma-separated owner IDs to filter by
 * - dateFrom: ISO date string for minimum date filter
 * - dateTo: ISO date string for maximum date filter
 * - page: Page number (default: 1)
 * - pageSize: Results per page (default: 25)
 * 
 * Requirements: 3.1, 3.5, 3.6
 */
router.get('/', authenticate, requirePermission("platform.search.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const q = (req.query.q as string) || '';
    
    // Parse filter parameters
    const types = req.query.types ? (req.query.types as string).split(',').filter(Boolean) : undefined;
    const status = req.query.status ? (req.query.status as string).split(',').filter(Boolean) : undefined;
    const owners = req.query.owners ? (req.query.owners as string).split(',').filter(Boolean) : undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    
    // Parse pagination parameters
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined;
    
    // Get user context
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    // Build search options with all filters
    const searchOptions = {
      types,
      status,
      owners,
      dateFrom,
      dateTo,
      page,
      pageSize,
      userRole,
    };

    const results = await search(tenantId, q, searchOptions);
    
    // Record the search in recent searches if user is authenticated and query is not empty
    if (userId && q && q.trim()) {
      await recordSearch(tenantId, userId, q, searchOptions).catch(() => {
        // Silently fail - recording search is not critical
      });
    }
    
    res.json(results);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/search/recent - Get recent searches for the current user
router.get('/recent', authenticate, requirePermission("platform.search.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const recentSearches = await getRecentSearches(tenantId, userId, limit);
    
    res.json({ searches: recentSearches });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/search/saved - Get saved searches for the current user
router.get('/saved', authenticate, requirePermission("platform.search.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const savedSearches = await getSavedSearches(tenantId, userId);
    
    res.json({ searches: savedSearches });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/search/saved - Save a search
router.post('/saved', auditMiddleware('platform.global_search.create'), authenticate, requirePermission("platform.search.read"), validate({ body: saveSearchBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { name, query, filters } = req.body;
    
    if (!name || !query) {
      return res.status(400).json({ error: 'Name and query are required' });
    }
    
    const savedSearch = await saveSearch(tenantId, userId, name, query, filters);
    
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'global_search', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.global_search.created' });
    res.status(201).json(savedSearch);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// DELETE /api/search/saved/:searchId - Delete a saved search
router.delete('/saved/:searchId', auditMiddleware('platform.global_search.delete'), authenticate, requirePermission("platform.search.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { searchId } = req.params;
    const deleted = await deleteSavedSearch(tenantId, searchId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Saved search not found' });
    }
    
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'deleted', entityType: 'global_search', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.global_search.deleted' });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;
