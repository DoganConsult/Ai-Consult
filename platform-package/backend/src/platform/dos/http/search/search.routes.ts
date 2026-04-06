// @ts-nocheck
import { auditMiddleware } from '../middleware/audit';
// ============================================================================
// Hybrid Search API Routes (F41-43)
// Keyword + vector search with GRC-aware ranking and tenant/framework filters
// ============================================================================

import { Router, Request, Response } from "express";
import { authenticate } from '../../../dauth';
import { requirePermission } from '../../../dauth';
import { AuthenticatedRequest } from "../../../../types/express.types";

const router = Router();
router.use(authenticate);
router.use(auditMiddleware("knowledge"));

/** Hybrid semantic search */
router.get("/", requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  try {
    const { search } = await import('../../../local-knowledge/services/misc/hybrid-search.service');
    const tenantId = (req as AuthenticatedRequest).tenantId || "default";
    const query = req.query.q as string;

    if (!query) {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }

    const options = {
      frameworks: req.query.frameworks ? (req.query.frameworks as string).split(",") : undefined,
      regulators: req.query.regulators ? (req.query.regulators as string).split(",") : undefined,
      entityTypes: req.query.entityTypes ? (req.query.entityTypes as string).split(",") as Array<"policy" | "evidence" | "control" | "regulation"> : undefined,
      domains: req.query.domains ? (req.query.domains as string).split(",") : undefined,
      sensitivity: req.query.sensitivity as string,
      limit: parseInt(req.query.limit as string) || 20,
      offset: parseInt(req.query.offset as string) || 0,
    };

    const result = await search(tenantId, query, options);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/** Search suggestions / autocomplete */
router.get("/suggest", requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  try {
    const { getSearchSuggestions } = await import('../../../local-knowledge/services/misc/hybrid-search.service');
    const tenantId = (req as AuthenticatedRequest).tenantId || "default";
    const partial = req.query.q as string;

    if (!partial) {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }

    const suggestions = await getSearchSuggestions(tenantId, partial);
    res.json({ suggestions });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/** Index a specific entity */
router.post("/index/:entityType/:entityId", auditMiddleware('platform.search.create'), requirePermission("framework.record.manage"), async (req: Request, res: Response) => {
  try {
    const indexing = await import('../../../local-knowledge/services/misc/search-indexing.service');
    const tenantId = (req as AuthenticatedRequest).tenantId || "default";
    const { entityType, entityId } = req.params;

    switch (entityType) {
      case "regulation":
        await indexing.indexRegulation(tenantId, entityId);
        break;
      case "evidence":
        await indexing.indexEvidence(tenantId, entityId);
        break;
      case "control":
        await indexing.indexControl(tenantId, entityId);
        break;
      case "policy":
        await indexing.indexPolicy(tenantId, entityId);
        break;
      default:
        res.status(400).json({ error: `Unknown entity type: ${entityType}` });
        return;
    }

    res.json({ message: `Indexed ${entityType} ${entityId}` });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/** Trigger full tenant reindex */
router.post("/reindex", auditMiddleware('platform.search.create'), requirePermission("framework.record.manage"), async (req: Request, res: Response) => {
  try {
    const { reindexAll } = await import('../../../local-knowledge/services/misc/search-indexing.service');
    const tenantId = (req as AuthenticatedRequest).tenantId || "default";
    await reindexAll(tenantId);
    res.json({ message: "Reindex initiated" });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
