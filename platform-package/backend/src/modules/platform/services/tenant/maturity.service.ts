/**
 * Maturity Service — Computes GRC maturity level for a tenant.
 *
 * Levels:
 *   1 — Initial: ad-hoc, minimal processes
 *   2 — Developing: basic policies, partial controls
 *   3 — Defined: documented processes, consistent controls
 *   4 — Managed: measured and monitored
 *   5 — Optimized: continuous improvement, automated
 *
 * Dimensions scored 0-100:
 *   - Process maturity: workflow adoption, lifecycle coverage
 *   - Technology adoption: module activation, integration usage
 *   - People & culture: training completion, role assignments
 *   - Governance depth: policy coverage, committee oversight
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

export interface MaturityResult {
  level: number;
  label: string;
  score: number;
  dimensions: Record<string, number>;
}

const MATURITY_LABELS: Record<number, string> = {
  1: 'Initial',
  2: 'Developing',
  3: 'Defined',
  4: 'Managed',
  5: 'Optimized',
};

export async function computeMaturityLevel(
  tenantId: string,
): Promise<MaturityResult> {
  const schema = tenantSchema(tenantId);
  const dimensions: Record<string, number> = {};

  try {
    // --- Process Maturity ---
    dimensions.processMaturity = await assessProcessMaturity(schema);

    // --- Technology Adoption ---
    dimensions.technologyAdoption = await assessTechnologyAdoption(schema, tenantId);

    // --- People & Culture ---
    dimensions.peopleCulture = await assessPeopleCulture(schema, tenantId);

    // --- Governance Depth ---
    dimensions.governanceDepth = await assessGovernanceDepth(schema);

    // Composite score (equal weighting)
    const dimValues = Object.values(dimensions);
    const score = dimValues.length > 0
      ? Math.round(dimValues.reduce((a, b) => a + b, 0) / dimValues.length)
      : 0;

    // Map score to maturity level
    const level = scoreToLevel(score);
    const label = MATURITY_LABELS[level] || 'Unknown';

    // Persist
    await safeQuery(
      `INSERT INTO "${schema}".maturity_assessments
         (tenant_id, level, label, score, dimensions, assessed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [tenantId, level, label, score, JSON.stringify(dimensions)],
    ).catch((err) => {
      logger.warn('[Maturity] Failed to persist assessment', {
        tenantId,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    logger.info('[Maturity] Assessment complete', { tenantId, level, label, score });
    return { level, label, score, dimensions };
  } catch (err) {
    logger.error('[Maturity] Assessment failed', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { level: 1, label: 'Initial', score: 0, dimensions };
  }
}

function scoreToLevel(score: number): number {
  if (score >= 90) return 5;
  if (score >= 70) return 4;
  if (score >= 50) return 3;
  if (score >= 30) return 2;
  return 1;
}

async function assessProcessMaturity(schema: string): Promise<number> {
  // Check workflow definitions and completion rates
  const { rows } = await safeQuery(
    `SELECT
       COUNT(*)::int AS total_workflows,
       COUNT(*) FILTER (WHERE status IN ('completed', 'closed'))::int AS completed
     FROM "${schema}".workflow_instances
     WHERE created_at > NOW() - INTERVAL '180 days'`,
  ).catch(() => ({ rows: [{ total_workflows: 0, completed: 0 }] }));

  const { total_workflows, completed } = rows[0];
  if (total_workflows === 0) return 10; // Minimal score if no workflows exist

  return Math.round((completed / total_workflows) * 100);
}

async function assessTechnologyAdoption(_schema: string, tenantId: string): Promise<number> {
  // Active modules count / available modules count
  const { rows: moduleRows } = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active
     FROM public.module_registry`,
  ).catch(() => ({ rows: [{ total: 0, active: 0 }] }));

  const { rows: tenantModules } = await safeQuery(
    `SELECT COUNT(*)::int AS enabled
     FROM public.tenant_modules
     WHERE tenant_id = $1 AND is_enabled = TRUE`,
    [tenantId],
  ).catch(() => ({ rows: [{ enabled: 0 }] }));

  const available = moduleRows[0].active || 1;
  const enabled = tenantModules[0].enabled || 0;

  return Math.min(100, Math.round((enabled / available) * 100));
}

async function assessPeopleCulture(_schema: string, tenantId: string): Promise<number> {
  // Users with assigned roles vs total users
  const { rows } = await safeQuery(
    `SELECT
       COUNT(DISTINCT u.id)::int AS total_users,
       COUNT(DISTINCT m.user_id)::int AS assigned_users
     FROM public.users u
     LEFT JOIN public.memberships m ON m.user_id = u.id AND m.tenant_id = $1
     WHERE u.tenant_id = $1 OR m.tenant_id = $1`,
    [tenantId],
  ).catch(() => ({ rows: [{ total_users: 0, assigned_users: 0 }] }));

  const { total_users, assigned_users } = rows[0];
  if (total_users === 0) return 0;

  return Math.round((assigned_users / total_users) * 100);
}

async function assessGovernanceDepth(schema: string): Promise<number> {
  // Policy coverage + review cadence
  const { rows } = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'active')::int AS active,
       COUNT(*) FILTER (WHERE reviewed_at > NOW() - INTERVAL '365 days')::int AS reviewed
     FROM "${schema}".policies`,
  ).catch(() => ({ rows: [{ total: 0, active: 0, reviewed: 0 }] }));

  const { total, active, reviewed } = rows[0];
  if (total === 0) return 5; // Minimal score if no policies

  const activeRatio = active / total;
  const reviewRatio = reviewed / total;

  return Math.round(((activeRatio * 0.6) + (reviewRatio * 0.4)) * 100);
}
