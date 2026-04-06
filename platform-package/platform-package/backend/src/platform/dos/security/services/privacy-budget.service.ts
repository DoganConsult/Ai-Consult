// @ts-nocheck
// ============================================
// Shahin — Privacy Budget Ledger
// Differential privacy epsilon tracking
// ============================================

import { safeQuery, tenantSchema } from "../../../../config/database";
import { getFirstRow } from '../../../../utils/db-utils';

export async function createBudget(tenantId: string, data: {
  datasetId: string;
  totalEpsilon: number;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".privacy_budget (dataset_id, total_epsilon)
     VALUES ($1, $2) RETURNING *`,
    [data.datasetId, data.totalEpsilon]
  );
  return getFirstRow(result);
}

export async function consumeEpsilon(tenantId: string, budgetId: string, data: {
  queryDescription: string;
  epsilonCost: number;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  const budget = await safeQuery(
    `SELECT * FROM "${schema}".privacy_budget WHERE budget_id = $1`, [budgetId]
  );
  if (budget.rows.length === 0) throw new Error("Budget not found");

  const b = getFirstRow(budget);
  const newConsumed = parseFloat(b.consumed_epsilon) + data.epsilonCost;

  if (newConsumed > parseFloat(b.total_epsilon)) {
    throw new Error("Privacy budget exceeded — query blocked");
  }

  const queryLog = b.query_log || [];
  queryLog.push({
    description: data.queryDescription,
    epsilonCost: data.epsilonCost,
    timestamp: new Date().toISOString(),
    cumulativeEpsilon: newConsumed,
  });

  const result = await safeQuery(
    `UPDATE "${schema}".privacy_budget SET
      consumed_epsilon = $1, query_log = $2, updated_at = NOW()
     WHERE budget_id = $3 RETURNING *`,
    [newConsumed, JSON.stringify(queryLog), budgetId]
  );
  return getFirstRow(result);
}

export async function getBudgets(tenantId: string): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(`SELECT * FROM "${schema}".privacy_budget ORDER BY created_at DESC`)).rows;
}

export async function getBudgetById(tenantId: string, budgetId: string): Promise<any | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".privacy_budget WHERE budget_id = $1`, [budgetId]
  );
  return getFirstRow(result) || null;
}
