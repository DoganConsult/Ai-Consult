/**
 * Common Zod schemas shared across all modules.
 * Provides standard pagination, filtering, param validation,
 * branded ID types, and GRC domain-specific field schemas.
 *
 * AGRC-OS Enterprise Grade — every field typed, no z.any().
 */

import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════
// Branded ID Types — prevent TenantId / UserId / EntityId mix-ups
// Usage: tenantId.parse(req.tenantId)
// ══════════════════════════════════════════════════════════════════════

export const tenantId = z.string().uuid().brand('TenantId');
export const userId = z.string().uuid().brand('UserId');
export const entityId = z.string().uuid().brand('EntityId');
export const moduleCode = z.string().min(1).max(50).regex(/^[a-z][a-z0-9-]*$/, 'Invalid module code format').brand('ModuleCode');

export type TenantId = z.infer<typeof tenantId>;
export type UserId = z.infer<typeof userId>;
export type EntityId = z.infer<typeof entityId>;
export type ModuleCode = z.infer<typeof moduleCode>;

// ══════════════════════════════════════════════════════════════════════
// GRC Field Primitives — reusable across all modules
// ══════════════════════════════════════════════════════════════════════

/** Email field — trimmed, lowercased, format-validated. */
export const grcEmail = z.string().email('Invalid email address').trim().toLowerCase().max(320);

/** URL field — trimmed, format-validated. */
export const grcUrl = z.string().url('Invalid URL').trim().max(2048);

/** ISO datetime — coerced from string to Date. */
export const grcDatetime = z.coerce.date();

/** ISO date string — YYYY-MM-DD format only. */
export const grcISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD format');

/** ISO datetime string — full ISO 8601. */
export const grcISODatetime = z.string().datetime({ message: 'Expected ISO 8601 datetime' });

/** URL slug — lowercase alphanumeric with hyphens. */
export const grcSlug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'Invalid slug format').min(1).max(100);

/** JSON metadata field — typed record instead of z.any(). */
export const grcJsonMetadata = z.record(z.string(), z.unknown()).default({});

/** Hex color code — #RRGGBB format. */
export const grcHexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected hex color #RRGGBB');

/** Sanitized text — trimmed, null bytes stripped. */
export const grcSanitizedText = (maxLength = 1000) =>
  z.string().max(maxLength).trim().transform(s => s.replace(/\0/g, ''));

/** Percentage — 0 to 100 inclusive. */
export const grcPercentage = z.coerce.number().min(0).max(100);

/** Confidence score — 0.0 to 1.0 inclusive. */
export const grcConfidence = z.coerce.number().min(0).max(1);

/** Positive integer — for counts, IDs, sequence numbers. */
export const grcPositiveInt = z.coerce.number().int().positive();

/** Non-negative integer — for counts that can be zero. */
export const grcNonNegativeInt = z.coerce.number().int().min(0);

// ══════════════════════════════════════════════════════════════════════
// GRC Domain Enums — standard status/priority/severity values
// ══════════════════════════════════════════════════════════════════════

/** Standard GRC lifecycle statuses. */
export const grcStatus = z.enum([
  'draft', 'active', 'pending', 'in_progress', 'completed',
  'closed', 'archived', 'suspended', 'cancelled',
]);

/** Standard priority levels. */
export const grcPriority = z.enum(['critical', 'high', 'medium', 'low']);

/** Standard severity levels. */
export const grcSeverity = z.enum(['critical', 'high', 'medium', 'low', 'info']);

/** Standard approval decisions. */
export const grcApprovalDecision = z.enum(['approve', 'reject', 'needs_revision', 'escalate']);

/** Standard review decisions. */
export const grcReviewDecision = z.enum(['approved', 'rejected', 'needs_revision']);

/** Standard sort direction. */
export const grcSortDir = z.enum(['ASC', 'DESC', 'asc', 'desc']).transform(v => v.toUpperCase() as 'ASC' | 'DESC');

// ══════════════════════════════════════════════════════════════════════
// Bilingual Text — English + Arabic (GRC i18n standard)
// ══════════════════════════════════════════════════════════════════════

/** Bilingual name field (required English, optional Arabic). */
export const bilingualName = (max = 255) => z.object({
  name_en: z.string().min(1).max(max).trim(),
  name_ar: z.string().max(max).trim().optional(),
});

/** Bilingual text fields (name + description). */
export const bilingualText = (nameMax = 255, descMax = 5000) => z.object({
  name_en: z.string().min(1).max(nameMax).trim(),
  name_ar: z.string().max(nameMax).trim().optional(),
  description_en: z.string().max(descMax).trim().optional(),
  description_ar: z.string().max(descMax).trim().optional(),
});

// ══════════════════════════════════════════════════════════════════════
// Pagination + Query Helpers
// ══════════════════════════════════════════════════════════════════════

/** Standard pagination + sort + search query params. */
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.string().optional(),
  sortDir: grcSortDir.default('DESC'),
  search: z.string().max(200).optional(),
});

/** Limit + offset pagination (alternative to page-based). */
export const limitOffsetQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

/** Standard :id URL param (string, non-empty). */
export const idParam = z.object({
  id: z.string().min(1),
});

/** UUID :id param. */
export const uuidParam = z.object({
  id: z.string().uuid(),
});

/** Bulk action body (array of IDs). */
export const bulkIdsBody = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});

/** Bulk UUID action body. */
export const bulkUuidsBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

/** Standard status filter. */
export const statusFilter = z.object({
  status: z.string().optional(),
  category: z.string().optional(),
});

// ══════════════════════════════════════════════════════════════════════
// Cross-Field Validation (Refinements)
// ══════════════════════════════════════════════════════════════════════

/** Date range with cross-field validation: startDate ≤ endDate. */
export const dateRange = z.object({
  startDate: grcISODate.optional(),
  endDate: grcISODate.optional(),
}).refine(
  d => !d.startDate || !d.endDate || d.startDate <= d.endDate,
  { message: 'startDate must be on or before endDate', path: ['endDate'] },
);

/** Numeric range with cross-field validation: min ≤ max. */
export const numericRange = z.object({
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
}).refine(
  d => d.min === undefined || d.max === undefined || d.min <= d.max,
  { message: 'min must be ≤ max', path: ['max'] },
);

// ══════════════════════════════════════════════════════════════════════
// Query Param Coercion Helpers
// ══════════════════════════════════════════════════════════════════════

/** Coerce query string 'true'/'1' → boolean. */
export const queryBoolean = z.preprocess(
  v => v === 'true' || v === '1' || v === true,
  z.boolean(),
);

/** Coerce query string → number. */
export const queryNumber = z.coerce.number();

/** Coerce query string → Date. */
export const queryDate = z.preprocess(
  v => typeof v === 'string' ? new Date(v) : v,
  z.date(),
);

/** Coerce comma-separated query string → array. */
export const queryStringArray = z.preprocess(
  v => typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : v,
  z.array(z.string()),
);

// ══════════════════════════════════════════════════════════════════════
// Discriminated Union Helpers
// ══════════════════════════════════════════════════════════════════════

/** Standard GRC entity action (approve/reject/escalate). */
export const entityActionBody = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), comments: z.string().max(5000).optional() }),
  z.object({ action: z.literal('reject'), reason: z.string().min(1).max(5000) }),
  z.object({ action: z.literal('escalate'), escalateTo: z.string().uuid(), reason: z.string().min(1).max(5000) }),
  z.object({ action: z.literal('needs_revision'), comments: z.string().min(1).max(5000) }),
]);

/** Standard status transition body. */
export const statusTransitionBody = z.object({
  toStatus: z.string().min(1).max(50),
  reason: z.string().max(5000).optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string().uuid()).optional(),
});

// ══════════════════════════════════════════════════════════════════════
// Type Exports
// ══════════════════════════════════════════════════════════════════════

export type PaginationQuery = z.infer<typeof paginationQuery>;
export type LimitOffsetQuery = z.infer<typeof limitOffsetQuery>;
export type BulkIdsBody = z.infer<typeof bulkIdsBody>;
export type DateRange = z.infer<typeof dateRange>;
export type EntityAction = z.infer<typeof entityActionBody>;
export type StatusTransition = z.infer<typeof statusTransitionBody>;
