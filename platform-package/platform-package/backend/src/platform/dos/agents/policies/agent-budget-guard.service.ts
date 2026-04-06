// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { getAgentDefinition } from '../registry/agent-registry.service';

export interface BudgetCheckResult {
  allowed: boolean;
  reason: string;
  currentSpend?: number;
  budgetLimit?: number;
  dailyRunCount?: number;
}

const DEFAULT_AGENT_COST_LIMIT_24H = 100;
const DEFAULT_AGENT_RUN_LIMIT_24H = 500;
const DEFAULT_TENANT_COST_LIMIT_24H = 1000;

export async function evaluateBudgetGuard(
  tenantId: string,
  agentCode: string,
): Promise<BudgetCheckResult> {
  try {
    const { checkBudgetAllowance } = await import('../../../../modules/ai/services/gateway/llm-usage-tracker.service');
    const { allowed } = await checkBudgetAllowance(tenantId);
    if (!allowed) {
      return { allowed: false, reason: 'tenant_ai_budget_exceeded' };
    }
  } catch {
    // LLM budget tracker unavailable — fall through to DB check
  }

  const schema = tenantSchema(tenantId);

  try {
    const { rows: tenantRows } = await safeQuery(
      `SELECT COALESCE(SUM(cost_usd), 0)::numeric AS total_cost,
              COUNT(*)::int AS total_runs
       FROM "${schema}".dos_agent_metrics
       WHERE created_at > NOW() - INTERVAL '24 hours'`,
      [],
    );
    const tenantCost = parseFloat(tenantRows[0]?.total_cost) || 0;
    if (tenantCost > DEFAULT_TENANT_COST_LIMIT_24H) {
      return {
        allowed: false,
        reason: `tenant_cost_limit_exceeded:${tenantCost.toFixed(2)}>${DEFAULT_TENANT_COST_LIMIT_24H}`,
        currentSpend: tenantCost,
        budgetLimit: DEFAULT_TENANT_COST_LIMIT_24H,
      };
    }
  } catch {
    // metrics table unavailable
  }

  const def = getAgentDefinition(agentCode);
  if (def?.observabilityProfile.trackCost) {
    try {
      const { rows } = await safeQuery(
        `SELECT COALESCE(SUM(cost_usd), 0)::numeric AS agent_cost,
                COUNT(*)::int AS agent_runs
         FROM "${schema}".dos_agent_metrics
         WHERE agent_code = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
        [agentCode],
      );
      const agentCost = parseFloat(rows[0]?.agent_cost) || 0;
      const agentRuns = rows[0]?.agent_runs ?? 0;

      if (agentCost > DEFAULT_AGENT_COST_LIMIT_24H) {
        return {
          allowed: false,
          reason: `agent_cost_limit_exceeded:${agentCost.toFixed(2)}>${DEFAULT_AGENT_COST_LIMIT_24H}`,
          currentSpend: agentCost,
          budgetLimit: DEFAULT_AGENT_COST_LIMIT_24H,
        };
      }

      if (agentRuns > DEFAULT_AGENT_RUN_LIMIT_24H) {
        return {
          allowed: false,
          reason: `agent_run_limit_exceeded:${agentRuns}>${DEFAULT_AGENT_RUN_LIMIT_24H}`,
          dailyRunCount: agentRuns,
        };
      }
    } catch {
      // metrics unavailable
    }
  }

  return { allowed: true, reason: 'budget_ok' };
}

export async function getBudgetSnapshot(
  tenantId: string,
  agentCode?: string,
): Promise<{
  tenantCost24h: number;
  tenantRuns24h: number;
  agentCost24h?: number;
  agentRuns24h?: number;
  limits: { tenantCost: number; agentCost: number; agentRuns: number };
}> {
  const schema = tenantSchema(tenantId);
  const { rows: tRows } = await safeQuery(
    `SELECT COALESCE(SUM(cost_usd), 0)::numeric AS cost, COUNT(*)::int AS runs
     FROM "${schema}".dos_agent_metrics WHERE created_at > NOW() - INTERVAL '24 hours'`,
    [],
  );
  const result: unknown = {
    tenantCost24h: parseFloat(tRows[0]?.cost) || 0,
    tenantRuns24h: tRows[0]?.runs ?? 0,
    limits: {
      tenantCost: DEFAULT_TENANT_COST_LIMIT_24H,
      agentCost: DEFAULT_AGENT_COST_LIMIT_24H,
      agentRuns: DEFAULT_AGENT_RUN_LIMIT_24H,
    },
  };
  if (agentCode) {
    const { rows: aRows } = await safeQuery(
      `SELECT COALESCE(SUM(cost_usd), 0)::numeric AS cost, COUNT(*)::int AS runs
       FROM "${schema}".dos_agent_metrics WHERE agent_code = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
      [agentCode],
    );
    result.agentCost24h = parseFloat(aRows[0]?.cost) || 0;
    result.agentRuns24h = aRows[0]?.runs ?? 0;
  }
  return result;
}

export const agentBudgetGuardService = {
  evaluateBudgetGuard,
  getBudgetSnapshot,
};
