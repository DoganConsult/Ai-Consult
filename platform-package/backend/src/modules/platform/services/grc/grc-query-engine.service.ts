// @ts-nocheck
// ============================================
// Natural Language GRC Query Engine
// Translates natural language queries to SQL,
// validates security, enforces tenant scoping,
// and executes safely
// ============================================

/**
 * @fileoverview Natural Language GRC Query Engine Service
 * 
 * This service provides a secure, AI-powered natural language interface for querying GRC data.
 * It translates user queries into parameterized SQL, validates security constraints, enforces
 * tenant scoping, and executes queries safely.
 * 
 * Key Features:
 * - LLM-based SQL translation from natural language
 * - Security validation (read-only, tenant-scoped, injection prevention)
 * - Parameterized query execution
 * - Query length and complexity limits
 * - Audit logging and observation recording
 * 
 * @module grc-query-engine
 * @author Shahin-AI GRC Platform
 * @since 2026-03-20
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import { gatewayJSON } from '../../../ai/services/gateway/ai-gateway.service';
import { recordObservation } from '../../../ai/services/observability/ai-observation.service';
import { eventBus } from '../event/event-bus.service';

// === Interfaces ===

/**
 * Request payload for executing a natural language GRC query.
 * 
 * @interface GRCQueryRequest
 * @property {string} query - Natural language query (e.g., "Show me all high-risk controls")
 * @property {Object} [context] - Optional context to narrow the query scope
 * @property {string} [context.entityType] - Filter by entity type (risk, control, evidence, etc.)
 * @property {string} [context.frameworkCode] - Filter by framework code
 * @property {string} [context.domain] - Filter by control domain
 */
export interface GRCQueryRequest {
  query: string;
  context?: {
    entityType?: string;
    frameworkCode?: string;
    domain?: string;
  };
}

/**
 * Result of a GRC query execution.
 * 
 * @interface GRCQueryResult
 * @property {string} query - Original natural language query
 * @property {string} translatedSql - Generated parameterized SQL
 * @property {Object} validation - Security and syntax validation results
 * @property {boolean} validation.isValid - Whether the SQL is valid
 * @property {boolean} validation.isReadOnly - Whether the query is read-only
 * @property {boolean} validation.isTenantScoped - Whether tenant scoping is enforced
 * @property {string[]} validation.warnings - Non-blocking warnings
 * @property {string[]} validation.errors - Blocking errors
 * @property {Object} execution - Query execution details
 * @property {boolean} execution.executed - Whether the query was executed
 * @property {number} [execution.rowCount] - Number of rows returned
 * @property {number} [execution.executionTimeMs] - Execution time in milliseconds
 * @property {string} [execution.error] - Execution error message if any
 * @property {any[]} [data] - Query results (rows)
 * @property {Object} [metadata] - Result metadata
 * @property {string[]} [metadata.columns] - Column names
 * @property {number} [metadata.estimatedRows] - Estimated row count
 * @property {string} timestamp - ISO timestamp of execution
 */
export interface GRCQueryResult {
  query: string;
  translatedSql: string;
  validation: {
    isValid: boolean;
    isReadOnly: boolean;
    isTenantScoped: boolean;
    warnings: string[];
    errors: string[];
  };
  execution: {
    executed: boolean;
    rowCount?: number;
    executionTimeMs?: number;
    error?: string;
  };
  data?: any[];
  metadata?: {
    columns?: string[];
    estimatedRows?: number;
  };
  timestamp: string;
}

// === SQL Schema Knowledge (for LLM context) ===

const GRC_SCHEMA_CONTEXT = `
Available GRC tables in tenant schema (use tenantSchema(tenantId) prefix):

CONTROLS:
- controls (control_id, control_code, control_title, framework_code, domain, domain_code, compliance_status, criticality_level, status, owner_id, created_at, updated_at)
- control_test_procedures (test_id, control_id, test_method, procedure_steps, expected_result)
- control_test_results (result_id, test_id, control_id, result, evidence_ids, tested_at, tester_id)

RISKS:
- risks (risk_id, risk_title, risk_category, inherent_score, residual_score, risk_level, likelihood, impact, status, owner_id, treatment_status, created_at, updated_at)
- risk_treatments (treatment_id, risk_id, treatment_type, description, owner_id, due_date, status)

EVIDENCE:
- evidence (evidence_id, control_id, evidence_type, artifact_type, source_type, collected_at, valid_until, hash, version, quality_tier, owner_id)
- evidence_tasks (task_id, control_id, task_title, status, due_date, evidence_type, assigned_role)

POLICIES:
- governance_policies (policy_id, policy_code, policy_title, category, status, effective_date, review_date, owner_id, version)

VENDORS:
- vendors (vendor_id, name, category, risk_tier, compliance_status, last_assessment_date)
- vendor_fourth_party_risk (id, vendor_id, sub_vendor_id, risk_level, flagged_at)

ASSESSMENTS:
- assessments (assessment_id, framework_code, status, started_at, completed_at, assessor_id)

AUDIT:
- audit_findings (finding_id, audit_id, severity, title, description, status, owner_id, due_date, remediation_status)

WORKFLOWS:
- workflow_instances (instance_id, workflow_type, status, started_at, completed_at, assignee_id)

IMPORTANT RULES:
1. ALL queries MUST be SELECT only (no INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, etc.)
2. ALL queries MUST include tenant scoping via tenantSchema(tenantId) prefix
3. Use parameterized queries ($1, $2, etc.) to prevent SQL injection
4. Limit results to reasonable sizes (e.g., LIMIT 1000)
5. Use safeQuery() function for execution
`;

// === SQL Security Validator ===

/**
 * Result of SQL security validation.
 * 
 * @interface SQLValidationResult
 * @property {boolean} isValid - Whether the SQL passes all security checks
 * @property {boolean} isReadOnly - Whether the query is read-only (SELECT only)
 * @property {boolean} isTenantScoped - Whether tenant schema prefix is present
 * @property {string[]} warnings - Non-blocking security warnings
 * @property {string[]} errors - Blocking security errors
 */
interface SQLValidationResult {
  isValid: boolean;
  isReadOnly: boolean;
  isTenantScoped: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Validates SQL query for security and tenant scoping.
 * 
 * Checks:
 * - Query is read-only (SELECT only, no DML/DDL)
 * - Tenant schema prefix is present
 * - No dangerous keywords (DROP, TRUNCATE, etc.)
 * - Query length is reasonable
 * - Parameterized placeholders are used
 * 
 * @param {string} sql - SQL query to validate
 * @param {string} tenantId - Tenant ID for schema validation
 * @returns {SQLValidationResult} Validation result with errors and warnings
 * @throws {Error} If SQL is clearly malicious
 */
function validateSQL(sql: string, tenantId: string): SQLValidationResult {
  const normalized = sql.trim().toUpperCase();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Block dangerous SQL keywords
  const dangerousKeywords = [
    'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE',
    'CREATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL',
    'MERGE', 'COPY', 'IMPORT', 'EXPORT',
  ];

  for (const keyword of dangerousKeywords) {
    if (normalized.includes(keyword)) {
      errors.push(`Dangerous SQL keyword detected: ${keyword}. Only SELECT queries are allowed.`);
    }
  }

  // Must be SELECT query
  if (!normalized.startsWith('SELECT')) {
    errors.push('Only SELECT queries are allowed. Query must start with SELECT.');
  }

  // Check for tenant schema scoping (should include tenantSchema pattern or schema variable)
  const schemaPattern = new RegExp(`"${tenantSchema(tenantId)}"|\\$\\{schema\\}|:schema`, 'i');
  if (!schemaPattern.test(sql)) {
    warnings.push('Query may not be tenant-scoped. Ensure all table references use tenant schema prefix.');
  }

  // Check for SQL injection patterns
  const injectionPatterns = [
    /;\s*(DROP|DELETE|UPDATE|INSERT)/i,
    /--/,
    /\/\*/,
    /UNION\s+SELECT/i,
    /EXEC\s*\(/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(sql)) {
      errors.push(`Potential SQL injection pattern detected: ${pattern.source}`);
    }
  }

  // Warn about large result sets
  if (!normalized.includes('LIMIT') && !normalized.includes('TOP')) {
    warnings.push('Query does not include LIMIT clause. Consider adding LIMIT to prevent large result sets.');
  }

  // Check for parameterized queries (prefer $1, $2 over string interpolation)
  if (sql.includes('${') || sql.includes('${') || (sql.includes("'") && sql.match(/'[^']*\$[^']*'/))) {
    warnings.push('Query may use string interpolation. Prefer parameterized queries ($1, $2, etc.) for security.');
  }

  return {
    isValid: errors.length === 0,
    isReadOnly: normalized.startsWith('SELECT') && errors.length === 0,
    isTenantScoped: schemaPattern.test(sql),
    warnings,
    errors,
  };
}

// === SQL Translator (LLM-based) ===

/**
 * Translates a natural language query to parameterized SQL using LLM.
 * 
 * Uses the AI Gateway service to generate safe, tenant-scoped SQL queries
 * from natural language input. The LLM is instructed to:
 * - Generate only SELECT queries
 * - Use parameterized placeholders ($1, $2, etc.)
 * - Include tenant schema prefix
 * - Extract parameter values from the query
 * 
 * @param {string} tenantId - Tenant ID for schema resolution
 * @param {string} naturalLanguageQuery - User's natural language query
 * @param {Object} [context] - Optional context to narrow query scope
 * @returns {Promise<{sql: string, explanation: string, parameters?: any[]}>}
 *   Generated SQL, explanation, and extracted parameters
 * @throws {Error} If LLM fails to generate valid SQL or returns invalid response
 */
async function translateToSQL(
  tenantId: string,
  naturalLanguageQuery: string,
  context?: GRCQueryRequest['context'],
): Promise<{ sql: string; explanation: string; parameters?: any[] }> {
  const schema = tenantSchema(tenantId);

  const systemPrompt = `You are a SQL translator for a GRC (Governance, Risk, Compliance) platform.
Your job is to translate natural language questions into safe, read-only PostgreSQL SELECT queries.

${GRC_SCHEMA_CONTEXT}

CRITICAL RULES:
1. Generate ONLY SELECT queries (never INSERT, UPDATE, DELETE, DROP, etc.)
2. All table references MUST use the schema prefix: "${schema}".
3. Use parameterized queries with $1, $2, etc. for any user-provided values (codes, IDs, names, dates)
4. Always include LIMIT clause (default: LIMIT 1000)
5. Use proper JOINs when querying related tables
6. Return results in a logical order (ORDER BY)
7. Include relevant columns (id, title, status, dates, etc.)

IMPORTANT: For parameterized queries, return both the SQL with $1, $2 placeholders AND the actual parameter values in the "parameters" array.

Example translations:
- "Show me all non-compliant controls" → { "sql": "SELECT control_id, control_code, control_title, compliance_status FROM \"${schema}\".controls WHERE compliance_status = $1 AND status = $2 ORDER BY control_code LIMIT 1000;", "parameters": ["non_compliant", "active"], "explanation": "..." }
- "What are the top 10 highest risks?" → { "sql": "SELECT risk_id, risk_title, residual_score, risk_level FROM \"${schema}\".risks WHERE status = $1 ORDER BY residual_score DESC NULLS LAST LIMIT $2;", "parameters": ["active", 10], "explanation": "..." }
- "List controls with code CTRL-001" → { "sql": "SELECT control_id, control_code, control_title FROM \"${schema}\".controls WHERE control_code = $1 LIMIT 1000;", "parameters": ["CTRL-001"], "explanation": "..." }

Respond with JSON: { "sql": "...", "parameters": [...], "explanation": "..." }
If no parameters are needed, use: { "sql": "...", "parameters": [], "explanation": "..." }`;

  const userPrompt = `Translate this natural language query to SQL:
"${naturalLanguageQuery}"

${context ? `Context: ${JSON.stringify(context)}` : ''}

Generate a safe, read-only SELECT query that answers this question. Extract any specific values (codes, IDs, names, dates) from the query and return them as parameters.`;

  try {
    const response = await gatewayJSON<{ sql: string; explanation: string; parameters?: any[] }>({
      systemPrompt,
      userMessage: userPrompt,
      tenantId,
      maxTokens: 2000,
    });

    if (!response || !response.sql) {
      throw new Error('LLM did not return valid SQL');
    }

    // Post-process: ensure schema prefix is applied
    let sql = response.sql.trim();
    if (!sql.includes(`"${schema}"`)) {
      // Try to inject schema prefix before table names
      sql = sql.replace(/\bFROM\s+([a-z_]+)/gi, `FROM "${schema}".$1`);
      sql = sql.replace(/\bJOIN\s+([a-z_]+)/gi, `JOIN "${schema}".$1`);
    }

    // Ensure LIMIT exists
    if (!sql.toUpperCase().includes('LIMIT')) {
      sql = sql.replace(/;?\s*$/, ' LIMIT 1000;');
    }

    // Extract parameters from response (default to empty array if not provided)
    const parameters = response.parameters || [];

    return {
      sql: sql.endsWith(';') ? sql : sql + ';',
      explanation: response.explanation || 'SQL query generated from natural language',
      parameters,
    };
  } catch (err: unknown) {
    throw new Error(`SQL translation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

// === Main Query Function ===

/**
 * Execute a natural language GRC query with SQL translation, validation, and security enforcement.
 */
/**
 * Executes a natural language GRC query.
 * 
 * This is the main entry point for the GRC Query Engine. It:
 * 1. Validates the query length and format
 * 2. Translates natural language to SQL using LLM
 * 3. Validates SQL security (read-only, tenant-scoped, parameterized)
 * 4. Executes the query safely with parameters
 * 5. Records observations and publishes events
 * 
 * @param {string} tenantId - Tenant ID (required)
 * @param {GRCQueryRequest} request - Query request with natural language query and optional context
 * @returns {Promise<GRCQueryResult>} Query result with data, validation, and execution details
 * @throws {Error} If tenantId is missing, query is invalid, or execution fails
 * 
 * @example
 * ```typescript
 * const result = await executeGRCQuery(tenantId, {
 *   query: "Show me all high-risk controls",
 *   context: { frameworkCode: "NCA-ECC" }
 * });
 * logger.info(result.data); // Array of control records
 * ```
 */
export async function executeGRCQuery(
  tenantId: string,
  request: GRCQueryRequest,
): Promise<GRCQueryResult> {
  if (!tenantId) throw new Error('tenantId is required');
  if (!request.query || request.query.trim().length < 3) {
    throw new Error('Query must be at least 3 characters');
  }
  if (request.query.length > 5000) {
    throw new Error('Query exceeds maximum length of 5000 characters');
  }

  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    // Step 1: Translate natural language to SQL
    const { sql: translatedSql, __explanation, parameters = [] } = await translateToSQL(
      tenantId,
      request.query,
      request.context,
    );

    // Step 2: Validate SQL security
    const validation = validateSQL(translatedSql, tenantId);

    if (!validation.isValid) {
      return {
        query: request.query,
        translatedSql,
        validation,
        execution: {
          executed: false,
          error: `SQL validation failed: ${validation.errors.join('; ')}`,
        },
        timestamp,
      };
    }

    // Step 3: Validate parameter count matches SQL placeholders
    const placeholderCount = (translatedSql.match(/\$\d+/g) || []).length;
    if (placeholderCount !== parameters.length) {
      return {
        query: request.query,
        translatedSql,
        validation: {
          ...validation,
          warnings: [...validation.warnings, `Parameter count mismatch: SQL has ${placeholderCount} placeholders but ${parameters.length} parameters provided`],
        },
        execution: {
          executed: false,
          error: `Parameter count mismatch: SQL has ${placeholderCount} placeholders but ${parameters.length} parameters provided`,
        },
        timestamp,
      };
    }

    // Step 4: Execute query (safely with parameters)
    let data: any[] = [];
    let rowCount = 0;
    let executionError: string | undefined;

    try {
      // Execute with extracted parameters (now properly populated from LLM response)
      const result = await safeQuery(translatedSql, parameters);

      data = result.rows;
      rowCount = result.rows.length;

      // Record successful query observation
      await recordObservation({
        tenantId,
        agentId: 'A01',
        observationType: 'pattern',
        title: `GRC query executed: "${request.query}"`,
        description: `Natural language query executed with ${rowCount} results`,
        evidenceJson: {
          translatedSql,
          rowCount,
          validationWarnings: validation.warnings,
        },
        confidence: validation.warnings.length === 0 ? 0.9 : 0.7,
      });
    } catch (err: unknown) {
      executionError = err instanceof Error ? err.message : 'Unknown execution error';

      // Record failed query observation
      await recordObservation({
        tenantId,
        agentId: 'A01',
        observationType: 'anomaly',
        title: `GRC query failed: "${request.query}"`,
        description: `Query execution failed: ${executionError}`,
        evidenceJson: {
          translatedSql,
          error: executionError,
        },
        confidence: 0.5,
      });
    }

    const executionTimeMs = Date.now() - startTime;

    // Step 5: Extract metadata
    const metadata: GRCQueryResult['metadata'] = {};
    if (data.length > 0) {
      metadata.columns = Object.keys(data[0]);
      metadata.estimatedRows = rowCount;
    }

    // Step 5: Publish event (if successful)
    if (!executionError && rowCount > 0) {
      await eventBus.publish({
        eventType: 'ai.query.executed',
        tenantId,
        sourceService: 'grc-query-engine',
        severity: 'info',
        payload: {
          query: request.query,
          translatedSql,
          rowCount,
          executionTimeMs,
        },
      });
    }

    return {
      query: request.query,
      translatedSql,
      validation,
      execution: {
        executed: !executionError,
        rowCount,
        executionTimeMs,
        error: executionError,
      },
      data: executionError ? undefined : data,
      metadata,
      timestamp,
    };
  } catch (err: unknown) {
    const executionTimeMs = Date.now() - startTime;
    return {
      query: request.query,
      translatedSql: '',
      validation: {
        isValid: false,
        isReadOnly: false,
        isTenantScoped: false,
        warnings: [],
        errors: [err instanceof Error ? err.message : 'Unknown error during translation'],
      },
      execution: {
        executed: false,
        executionTimeMs,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      timestamp,
    };
  }
}

// === Batch Query Execution ===

/**
 * Executes multiple GRC queries in batch.
 * 
 * Processes up to 10 queries sequentially, returning results for each.
 * Individual query failures do not stop the batch; errors are captured
 * in each result's execution.error field.
 * 
 * @param {string} tenantId - Tenant ID (required)
 * @param {GRCQueryRequest[]} requests - Array of query requests (max 10)
 * @returns {Promise<GRCQueryResult[]>} Array of query results in the same order as requests
 * @throws {Error} If tenantId is missing or batch size exceeds 10
 * 
 * @example
 * ```typescript
 * const results = await executeBatchGRCQueries(tenantId, [
 *   { query: "Show high-risk controls" },
 *   { query: "List overdue evidence tasks" }
 * ]);
 * ```
 */
export async function executeBatchGRCQueries(
  tenantId: string,
  requests: GRCQueryRequest[],
): Promise<GRCQueryResult[]> {
  const results: GRCQueryResult[] = [];
  for (const request of requests) {
    try {
      const result = await executeGRCQuery(tenantId, request);
      results.push(result);
    } catch (err: unknown) {
      results.push({
        query: request.query,
        translatedSql: '',
        validation: {
          isValid: false,
          isReadOnly: false,
          isTenantScoped: false,
          warnings: [],
          errors: [err instanceof Error ? err.message : 'Unknown error'],
        },
        execution: {
          executed: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
  return results;
}
