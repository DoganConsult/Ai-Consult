// @ts-nocheck
// ============================================
// Shahin — Risk-to-Action Autonomy Controller
// Threshold-based automatic actions
// ============================================

import { safeQuery, tenantSchema } from "../../../../config/database";
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

interface ThresholdAction {
  minScore: number;
  action: 'block' | 'restrict' | 'alert' | 'monitor';
  description: string;
}

const DEFAULT_THRESHOLDS: ThresholdAction[] = [
  { minScore: 20, action: 'block', description: 'Block operation — critical risk' },
  { minScore: 12, action: 'restrict', description: 'Restrict access — high risk' },
  { minScore: 6, action: 'alert', description: 'Alert stakeholders — medium risk' },
  { minScore: 1, action: 'monitor', description: 'Monitor — low risk' },
];

export function evaluateRiskAction(riskScore: number, thresholds?: ThresholdAction[]): ThresholdAction {
  const rules = (thresholds || DEFAULT_THRESHOLDS).sort((a, b) => b.minScore - a.minScore);
  for (const rule of rules) {
    if (riskScore >= rule.minScore) return rule;
  }
  return { minScore: 0, action: 'monitor', description: 'No action required' };
}

export async function getAutonomyConfig(tenantId: string): Promise<unknown> {
  const result = await safeQuery(
    `SELECT settings FROM tenants WHERE tenant_id = $1`, [tenantId]
  );
  if (result.rows.length === 0) throw new Error("Tenant not found");
  const settings = getFirstRow(result)?.settings || {};
  return {
    thresholds: settings.autonomy_thresholds || DEFAULT_THRESHOLDS,
    enabled: settings.autonomy_enabled !== false,
  };
}

export async function updateAutonomyConfig(tenantId: string, config: {
  thresholds?: ThresholdAction[];
  enabled?: boolean;
}): Promise<unknown> {
  const result = await safeQuery(
    `SELECT settings FROM tenants WHERE tenant_id = $1`, [tenantId]
  );
  if (result.rows.length === 0) throw new Error("Tenant not found");

  const settings = getFirstRow(result)?.settings || {};
  if (config.thresholds) settings.autonomy_thresholds = config.thresholds;
  if (config.enabled !== undefined) settings.autonomy_enabled = config.enabled;

  await safeQuery(
    `UPDATE tenants SET settings = $1 WHERE tenant_id = $2`,
    [JSON.stringify(settings), tenantId]
  );
  return { thresholds: settings.autonomy_thresholds || DEFAULT_THRESHOLDS, enabled: settings.autonomy_enabled };
}

export async function evaluateAllRisks(tenantId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const config = await getAutonomyConfig(tenantId);
  if (!config.enabled) return { enabled: false, message: 'Autonomy controller disabled' };

  const risks = await safeQuery(`SELECT * FROM "${schema}".risks ORDER BY risk_score DESC`);
  const actions = risks.rows.map((r: GenericRow) => ({
    riskId: r.risk_id,
    title: r.title,
    score: r.risk_score,
    ...evaluateRiskAction(r.risk_score, config.thresholds),
  }));

  return {
    enabled: true,
    totalRisks: risks.rows.length,
    actions,
    summary: {
      block: actions.filter((a: unknown) => a.action === 'block').length,
      restrict: actions.filter((a: unknown) => a.action === 'restrict').length,
      alert: actions.filter((a: unknown) => a.action === 'alert').length,
      monitor: actions.filter((a: unknown) => a.action === 'monitor').length,
    },
  };
}
