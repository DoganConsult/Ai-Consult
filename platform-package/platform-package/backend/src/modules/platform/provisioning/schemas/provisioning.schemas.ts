/**
 * Platform Provisioning Validation Schemas — Zod v4 Enterprise Grade
 * Uses advanced features from common.schemas.
 *
 * @owner platform
 * @module platform/provisioning
 * @since 2026-03-31
 */

import { z } from 'zod';
import { grcSlug } from '../../../../schemas/common.schemas';

// ---------------------------------------------------------------------------
// Provisioning Job
// ---------------------------------------------------------------------------

/** Body for starting a new provisioning job. */
export const startProvisioningBody = z.object({
  tenant_id: z.string().uuid(),
  tenant_slug: grcSlug.min(2).max(50).optional(),
  actor_user_id: z.string().uuid(),
  session_id: z.string().uuid().optional(),
  locale: z.enum(['en', 'ar']).default('en'),
});

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

/** URL param for job-scoped endpoints. */
export const jobIdParam = z.object({
  jobId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Type Exports
// ---------------------------------------------------------------------------

export type StartProvisioningBody = z.infer<typeof startProvisioningBody>;
export type JobIdParam = z.infer<typeof jobIdParam>;
