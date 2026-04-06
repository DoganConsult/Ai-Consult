/**
 * Route Standardization Kit
 *
 * Single import for any route file to adopt the standard API patterns:
 * - asyncHandler: auto-forward async errors to global error handler (no try/catch)
 * - validate: Zod schema validation middleware
 * - ok / paginated / action: standard response envelopes
 * - NotFoundError / ValidationError / ForbiddenError: typed error throwing
 * - parsePagination: extract page/pageSize/sort from query params
 * - parseFilters: extract common filter params (search, status, since)
 *
 * Usage:
 *   import { asyncHandler, validate, ok, paginated, action, NotFoundError, parsePagination } from './route-kit';
 *
 *   router.get('/', asyncHandler(async (req, res) => {
 *     const { page, pageSize, offset } = parsePagination(req);
 *     const items = await queryItems(schema, pageSize, offset);
 *     res.json(paginated(items.rows, items.total, page, pageSize, req));
 *   }));
 *
 *   router.get('/:id', asyncHandler(async (req, res) => {
 *     const item = await getItem(id);
 *     if (!item) throw new NotFoundError('item', id);
 *     res.json(ok(item, req));
 *   }));
 */

// ── Error handling ───────────────────────────────────────────────────────
export { asyncHandler } from '../http/error-handling/async-handler';

// ── Validation ───────────────────────────────────────────────────────────
export { validate } from '../http/validation/validate';

// ── Response envelopes ───────────────────────────────────────────────────
export { ok, paginated, action, buildMeta } from './api-response';

// ── Typed errors ─────────────────────────────────────────────────────────
export {
  AppError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from '../../../errors/index';

// ── Pagination helpers ───────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
  sortBy: string;
  sortDir: 'ASC' | 'DESC';
}

/**
 * Extract pagination params from req.query with safe defaults and bounds.
 * Max pageSize = 500 to prevent memory abuse.
 */
export function parsePagination(req: { query: Record<string, string | undefined> }, defaults?: { pageSize?: number; sortBy?: string; sortDir?: 'ASC' | 'DESC' }): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page || '') || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt(req.query.pageSize || req.query.limit || '') || defaults?.pageSize || 25));
  const offset = (page - 1) * pageSize;
  const sortBy = (req.query.sortBy || req.query.sort || defaults?.sortBy || 'created_at') as string;
  const sortDirRaw = ((req.query.sortDir || req.query.order || defaults?.sortDir || 'DESC') as string).toUpperCase();
  const sortDir = sortDirRaw === 'ASC' ? 'ASC' : 'DESC';
  return { page, pageSize, offset, sortBy, sortDir };
}

// ── Filter helpers ───────────────────────────────────────────────────────

export interface CommonFilters {
  search: string | null;
  status: string | null;
  priority: string | null;
  since: string | null;    // ISO date string
  module: string | null;
  assignee: string | null;
}

/**
 * Extract common filter params from req.query.
 * Returns null for any missing filter (not undefined).
 */
export function parseFilters(req: { query: Record<string, string | undefined> }): CommonFilters {
  return {
    search: req.query.search || req.query.q || null,
    status: req.query.status || null,
    priority: req.query.priority || null,
    since: req.query.since || null,
    module: req.query.module || null,
    assignee: req.query.assignee || req.query.assignedTo || null,
  };
}

// ── Rate limiter presets ──────────────────────────────────────────────────

import { rateLimiter } from '../http/rate-limiting/rate-limiter';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: { userId?: string; tenantId?: string };
}

const ipKey = (req: Request) => req.ip || req.socket.remoteAddress || 'any';
const userKey = (req: Request) => {
  const authReq = req as AuthenticatedRequest;
  return authReq.user?.userId || ipKey(req);
};

/** 10 req/min per user — for heavy operations (report generation, AI inference, bulk import) */
export const heavyRateLimit = rateLimiter({ namespace: 'heavy', maxRequests: 10, windowMs: 60_000, keyGenerator: userKey });

/** 30 req/min per user — for write operations (create, update, delete) */
export const writeRateLimit = rateLimiter({ namespace: 'write', maxRequests: 30, windowMs: 60_000, keyGenerator: userKey });

/** 5 req/min per user — for expensive operations (export, seed, trigger) */
export const expensiveRateLimit = rateLimiter({ namespace: 'expensive', maxRequests: 5, windowMs: 60_000, keyGenerator: userKey });

/**
 * Build a WHERE clause + params array from common filters.
 * Returns { where: string, params: unknown[], nextIdx: number }.
 * Pass startIdx to continue param numbering from a previous query.
 */
export function buildFilterClause(
  filters: CommonFilters,
  opts?: { searchColumns?: string[]; statusColumn?: string; dateColumn?: string; startIdx?: number },
): { where: string; params: unknown[]; nextIdx: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = opts?.startIdx || 1;
  const statusCol = opts?.statusColumn || 'status';
  const dateCol = opts?.dateColumn || 'created_at';
  const searchCols = opts?.searchColumns || ['title'];

  if (filters.status) {
    conditions.push(`${statusCol} = $${idx}`);
    params.push(filters.status);
    idx++;
  }
  if (filters.priority) {
    conditions.push(`priority = $${idx}`);
    params.push(filters.priority);
    idx++;
  }
  if (filters.since) {
    conditions.push(`${dateCol} >= $${idx}`);
    params.push(filters.since);
    idx++;
  }
  if (filters.assignee) {
    conditions.push(`(assigned_user_id = $${idx} OR owner_user_id = $${idx})`);
    params.push(filters.assignee);
    idx++;
  }
  if (filters.search && searchCols.length > 0) {
    const searchConditions = searchCols.map(col => `${col} ILIKE $${idx}`);
    conditions.push(`(${searchConditions.join(' OR ')})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params, nextIdx: idx };
}
