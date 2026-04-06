// @ts-nocheck
// ============================================
// Shahin — Contract Tests Service
// Model/prompt test definition and execution
// ============================================

import { query, tenantSchema } from "../../../../config/database";
import { getFirstRow } from '../../../../utils/db-utils';

export async function createContractTest(tenantId: string, data: {
  modelId: string;
  testName: string;
  inputConstraints: unknown;
  expectedOutput: unknown;
}): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await query(
    `INSERT INTO "${schema}".contract_tests
      (model_id, test_name, input_constraints, expected_output, status)
     VALUES ($1,$2,$3,$4,'pending')
     RETURNING *`,
    [data.modelId, data.testName, JSON.stringify(data.inputConstraints), JSON.stringify(data.expectedOutput)]
  );
  return getFirstRow(result);
}

export async function executeContractTest(tenantId: string, testId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  const test = await query(
    `SELECT * FROM "${schema}".contract_tests WHERE test_id = $1`, [testId]
  );
  if (test.rows.length === 0) throw new Error("Test not found");

  const t = getFirstRow(test);

  // Simulate test execution (rule-based comparison)
  const actualOutput = simulateModelOutput(t.input_constraints);
  const passed = compareOutputs(actualOutput, t.expected_output);

  const result = await query(
    `UPDATE "${schema}".contract_tests SET
      actual_output = $1, status = $2, executed_at = NOW()
     WHERE test_id = $3 RETURNING *`,
    [JSON.stringify(actualOutput), passed ? 'pass' : 'fail', testId]
  );
  return getFirstRow(result);
}

function simulateModelOutput(inputConstraints: any): unknown {
  // Simulated output based on input constraints
  return {
    generated: true,
    constraintsMet: true,
    outputType: inputConstraints.expectedType || 'text',
    confidence: 0.85,
    timestamp: new Date().toISOString(),
  };
}

function compareOutputs(actual: any, expected: any): boolean {
  // Simple comparison — check if expected keys exist in actual
  if (!expected || !actual) return false;
  for (const key of Object.keys(expected)) {
    if (expected[key] !== undefined && actual[key] === undefined) return false;
  }
  return true;
}

export async function getContractTests(tenantId: string, modelId?: string): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".contract_tests`;
  const params: unknown[] = [];
  if (modelId) { sql += ` WHERE model_id = $1`; params.push(modelId); }
  sql += ` ORDER BY executed_at DESC NULLS LAST`;
  return (await query(sql, params)).rows;
}
