// @ts-nocheck
/**
 * Policy Rule Execution Engine
 * --------------------------------
 * Loads policy rules from the DB, parses their JSON condition tree,
 * and evaluates them against a caller-supplied context object.
 *
 * Condition format (stored in `policy_rules.conditions` JSONB):
 *   { "operator": "AND"|"OR", "clauses": [ <clause>, ... ] }
 *
 * Each clause:
 *   { "field": "context.key", "op": "eq"|"neq"|"gt"|"gte"|"lt"|"lte"|"in"|"nin"|"contains"|"exists", "value": <unknown> }
 *
 * Nested groups are supported by embedding an operator+clauses node inside clauses.
 */

import { safeQuery } from '../../../../../config/database';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function schema(tenantId: string): string {
  return `tenant_${tenantId.replace(/-/g, '_')}`;
}

/** Resolve a dotted path (e.g. "risk.score") from a nested object. */
function resolvePath(obj: Record<string, any>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

/* ------------------------------------------------------------------ */
/*  Clause evaluator                                                   */
/* ------------------------------------------------------------------ */

interface Clause {
  field?: string;
  op?: string;
  value?: unknown;
  operator?: 'AND' | 'OR';
  clauses?: Clause[];
}

function evaluateClause(clause: Clause, context: Record<string, any>): boolean {
  // Nested group — recurse
  if (clause.operator && Array.isArray(clause.clauses)) {
    return evaluateGroup(clause as { operator: 'AND' | 'OR'; clauses: Clause[] }, context);
  }

  if (!clause.field || !clause.op) {
    // Malformed clause — fail safe (Law 11: deny by default)
    return false;
  }

  const actual = resolvePath(context, clause.field);
  const expected = clause.value;

  switch (clause.op) {
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    case 'gt':
      return typeof actual === 'number' && actual > expected;
    case 'gte':
      return typeof actual === 'number' && actual >= expected;
    case 'lt':
      return typeof actual === 'number' && actual < expected;
    case 'lte':
      return typeof actual === 'number' && actual <= expected;
    case 'in':
      return Array.isArray(expected) && expected.includes(actual);
    case 'nin':
      return Array.isArray(expected) && !expected.includes(actual);
    case 'contains':
      if (typeof actual === 'string') return actual.includes(String(expected));
      if (Array.isArray(actual)) return actual.includes(expected);
      return false;
    case 'exists':
      return expected ? actual !== undefined && actual !== null : actual === undefined || actual === null;
    case 'regex': {
      if (typeof actual !== 'string' || typeof expected !== 'string') return false;
      try {
        return new RegExp(expected).test(actual);
      } catch {
        return false;
      }
    }
    default:
      // Unknown operator — deny by default
      return false;
  }
}

function evaluateGroup(
  group: { operator: 'AND' | 'OR'; clauses: Clause[] },
  context: Record<string, any>,
): boolean {
  if (!Array.isArray(group.clauses) || group.clauses.length === 0) {
    // Empty clause list — deny by default (Law 14)
    return false;
  }
  if (group.operator === 'OR') {
    return group.clauses.some((c) => evaluateClause(c, context));
  }
  // Default AND
  return group.clauses.every((c) => evaluateClause(c, context));
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface RuleExecutionResult {
  passed: boolean;
  ruleCode: string;
  message: string;
  details?: unknown;
}

/**
 * Execute a single policy rule against a provided context.
 *
 * @param tenantId  Tenant whose schema contains the rule.
 * @param ruleId    UUID of the rule row in `policy_rules`.
 * @param context   Key-value bag the rule conditions are evaluated against.
 */
export async function executeRule(
  tenantId: string,
  ruleId: string,
  context: Record<string, any>,
): Promise<RuleExecutionResult> {
  const s = schema(tenantId);

  // Load rule definition
  const ruleResult = await safeQuery(
    `SELECT id, code, name, description, conditions, severity, is_active
       FROM "${s}".policy_rules
      WHERE id = $1`,
    [ruleId],
  );

  if (!ruleResult.rows || ruleResult.rows.length === 0) {
    return {
      passed: false,
      ruleCode: 'UNKNOWN',
      message: `Policy rule not found: ${ruleId}`,
      details: { error: 'rule_not_found', ruleId },
    };
  }

  const rule = ruleResult.rows[0];

  if (!rule.is_active) {
    return {
      passed: true,
      ruleCode: rule.code ?? rule.id,
      message: `Rule "${rule.name}" is inactive — skipped`,
      details: { skipped: true, reason: 'inactive' },
    };
  }

  // Parse conditions
  let conditions: Clause;
  try {
    conditions =
      typeof rule.conditions === 'string'
        ? JSON.parse(rule.conditions)
        : rule.conditions;
  } catch (err) {
    return {
      passed: false,
      ruleCode: rule.code ?? rule.id,
      message: `Rule "${rule.name}" has malformed conditions`,
      details: { error: 'invalid_conditions', raw: rule.conditions },
    };
  }

  if (!conditions || (!conditions.operator && !conditions.op)) {
    return {
      passed: false,
      ruleCode: rule.code ?? rule.id,
      message: `Rule "${rule.name}" has empty or unparseable conditions`,
      details: { error: 'empty_conditions' },
    };
  }

  // Evaluate
  const passed = conditions.operator
    ? evaluateGroup(conditions as { operator: 'AND' | 'OR'; clauses: Clause[] }, context)
    : evaluateClause(conditions, context);

  const message = passed
    ? `Rule "${rule.name}" passed`
    : `Rule "${rule.name}" violated — severity: ${rule.severity ?? 'unspecified'}`;

  return {
    passed,
    ruleCode: rule.code ?? rule.id,
    message,
    details: {
      ruleName: rule.name,
      severity: rule.severity,
      conditionsSummary: conditions.operator
        ? `${conditions.operator} group with ${(conditions.clauses ?? []).length} clause(s)`
        : `single clause: ${conditions.field} ${conditions.op} ${JSON.stringify(conditions.value)}`,
    },
  };
}

/**
 * Evaluate multiple rules in batch.  Useful for validating an entity
 * against all applicable policy rules in one call.
 */
export async function evaluateRulesForEntity(
  tenantId: string,
  entityType: string,
  context: Record<string, any>,
): Promise<{ total: number; passed: number; failed: number; results: RuleExecutionResult[] }> {
  const s = schema(tenantId);

  const rulesResult = await safeQuery(
    `SELECT id FROM "${s}".policy_rules
      WHERE entity_type = $1
        AND is_active = TRUE
      ORDER BY sort_order, created_at`,
    [entityType],
  );

  const results: RuleExecutionResult[] = [];
  for (const row of rulesResult.rows) {
    results.push(await executeRule(tenantId, row.id, context));
  }

  return {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    results,
  };
}
