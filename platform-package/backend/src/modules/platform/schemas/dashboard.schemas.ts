// @ts-nocheck
/**
 * Platform Dashboard Validation Schemas — Zod v4 Enterprise Grade
 * Uses advanced features from common.schemas.
 *
 * @owner platform
 * @module platform
 * @since 2026-03-31
 */

import { z } from 'zod';
import {
  grcPositiveInt,
  grcNonNegativeInt,
  grcSanitizedText,
  queryBoolean,
} from '../../../schemas/common.schemas';

// -- Framework Remove/Restore ------------------------------------------------

export const frameworkRemoveBody = z.object({
  reason: z.string().optional(),
});

// -- Dashboard Layout --------------------------------------------------------

/** Individual widget position within the layout grid. */
const widgetPosition = z.object({
  widget_id: z.string().min(1),
  x: z.coerce.number().int().min(0).optional(),
  y: z.coerce.number().int().min(0).optional(),
  w: z.coerce.number().int().min(1).optional(),
  h: z.coerce.number().int().min(1).optional(),
  visible: z.boolean().default(true),
});

/** PUT /api/dashboard/layout -- body contains columns and widget positions. */
export const dashboardLayoutBody = z.object({
  columns: z.coerce.number().int().min(1).max(12).default(3),
  widgets: z.array(widgetPosition).optional(),
});

// -- Dashboard Preferences ---------------------------------------------------

export const dashboardPreferencesBody = z.object({
  widgets: z.array(z.string().min(1)).min(1),
  layout: z.string().optional(),
  theme: z.string().max(50).optional(),
  refresh_interval_seconds: z.coerce.number().int().min(10).max(3600).optional(),
});
