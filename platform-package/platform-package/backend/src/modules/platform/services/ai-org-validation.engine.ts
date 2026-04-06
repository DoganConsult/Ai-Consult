/**
 * AI Org-Structure Validation Engine
 *
 * Validates organizational hierarchy for structural gaps: orphan nodes,
 * empty departments, missing leadership positions, circular references,
 * and other integrity issues. Returns actionable suggestions.
 */
import { safeQuery, tenantSchema } from '../../../config/database';
import { logger } from '../../../platform/dos/observability/services/logger.service';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface OrgIssue {
  type: 'orphan' | 'empty_department' | 'missing_leader' | 'circular_ref' | 'depth_exceeded' | 'duplicate_name' | 'unassigned_position';
  entityType: string;
  entityId: string;
  description: string;
  suggestion: string;
}

export interface OrgValidationResult {
  valid: boolean;
  issues: OrgIssue[];
}

const MAX_HIERARCHY_DEPTH = 10;

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Run a comprehensive validation of the tenant's org structure.
 * Checks: orphan nodes, empty departments, missing leaders,
 * circular references, excessive depth, duplicate names, unassigned positions.
 */
export async function validateOrgStructureWithAI(
  tenantId: string,
): Promise<OrgValidationResult> {
  const schema = tenantSchema(tenantId);
  const issues: OrgIssue[] = [];

  // Run all checks in parallel
  const [
    orphanIssues,
    emptyDeptIssues,
    missingLeaderIssues,
    circularIssues,
    depthIssues,
    duplicateIssues,
    unassignedIssues,
  ] = await Promise.all([
    checkOrphanNodes(schema),
    checkEmptyDepartments(schema),
    checkMissingLeadership(schema),
    checkCircularReferences(schema),
    checkExcessiveDepth(schema),
    checkDuplicateNames(schema),
    checkUnassignedPositions(schema),
  ]);

  issues.push(
    ...orphanIssues,
    ...emptyDeptIssues,
    ...missingLeaderIssues,
    ...circularIssues,
    ...depthIssues,
    ...duplicateIssues,
    ...unassignedIssues,
  );

  const valid = issues.length === 0;

  logger.info('[OrgValidation] Validation completed', {
    tenantId,
    valid,
    issueCount: issues.length,
  });

  return { valid, issues };
}

/* ------------------------------------------------------------------ */
/*  Individual checks                                                 */
/* ------------------------------------------------------------------ */

/**
 * Find business units, departments, or teams with no parent
 * that are not the root organization.
 */
async function checkOrphanNodes(schema: string): Promise<OrgIssue[]> {
  const issues: OrgIssue[] = [];

  // Orphan business units (parent_org_id references non-existent org)
  try {
    const { rows } = await safeQuery(
      `SELECT bu.id, bu.name
       FROM "${schema}".business_units bu
       LEFT JOIN "${schema}".organizations o ON bu.organization_id = o.id
       WHERE o.id IS NULL`,
      [],
    );
    for (const row of rows) {
      issues.push({
        type: 'orphan',
        entityType: 'business_unit',
        entityId: String(row.id),
        description: `Business unit "${row.name}" references a non-existent organization.`,
        suggestion: 'Assign this business unit to a valid organization or remove it.',
      });
    }
  } catch { /* table may not exist */ }

  // Orphan departments (parent business unit missing)
  try {
    const { rows } = await safeQuery(
      `SELECT d.id, d.name
       FROM "${schema}".departments d
       LEFT JOIN "${schema}".business_units bu ON d.business_unit_id = bu.id
       WHERE d.business_unit_id IS NOT NULL AND bu.id IS NULL`,
      [],
    );
    for (const row of rows) {
      issues.push({
        type: 'orphan',
        entityType: 'department',
        entityId: String(row.id),
        description: `Department "${row.name}" references a non-existent business unit.`,
        suggestion: 'Re-assign this department to an existing business unit.',
      });
    }
  } catch { /* table may not exist */ }

  // Orphan teams (parent department missing)
  try {
    const { rows } = await safeQuery(
      `SELECT t.id, t.name
       FROM "${schema}".teams t
       LEFT JOIN "${schema}".departments d ON t.department_id = d.id
       WHERE t.department_id IS NOT NULL AND d.id IS NULL`,
      [],
    );
    for (const row of rows) {
      issues.push({
        type: 'orphan',
        entityType: 'team',
        entityId: String(row.id),
        description: `Team "${row.name}" references a non-existent department.`,
        suggestion: 'Re-assign this team to an existing department.',
      });
    }
  } catch { /* table may not exist */ }

  return issues;
}

/**
 * Find departments that have zero teams and zero positions.
 */
async function checkEmptyDepartments(schema: string): Promise<OrgIssue[]> {
  const issues: OrgIssue[] = [];

  try {
    const { rows } = await safeQuery(
      `SELECT d.id, d.name
       FROM "${schema}".departments d
       LEFT JOIN "${schema}".teams t ON t.department_id = d.id
       LEFT JOIN "${schema}".positions p ON p.department_id = d.id
       WHERE t.id IS NULL AND p.id IS NULL`,
      [],
    );
    for (const row of rows) {
      issues.push({
        type: 'empty_department',
        entityType: 'department',
        entityId: String(row.id),
        description: `Department "${row.name}" has no teams and no positions assigned.`,
        suggestion: 'Add teams or positions to this department, or remove it if inactive.',
      });
    }
  } catch { /* table may not exist */ }

  return issues;
}

/**
 * Find departments and business units without a designated leader/head position.
 */
async function checkMissingLeadership(schema: string): Promise<OrgIssue[]> {
  const issues: OrgIssue[] = [];

  // Departments without a head/manager position
  try {
    const { rows } = await safeQuery(
      `SELECT d.id, d.name
       FROM "${schema}".departments d
       WHERE NOT EXISTS (
         SELECT 1 FROM "${schema}".positions p
         WHERE p.department_id = d.id
           AND (p.title ILIKE '%head%' OR p.title ILIKE '%manager%'
                OR p.title ILIKE '%director%' OR p.title ILIKE '%lead%'
                OR p.is_leadership = true)
       )`,
      [],
    );
    for (const row of rows) {
      issues.push({
        type: 'missing_leader',
        entityType: 'department',
        entityId: String(row.id),
        description: `Department "${row.name}" has no leadership position defined.`,
        suggestion: 'Create a head/manager/director position for this department.',
      });
    }
  } catch { /* table or column may not exist */ }

  // Business units without a head
  try {
    const { rows } = await safeQuery(
      `SELECT bu.id, bu.name
       FROM "${schema}".business_units bu
       WHERE bu.head_user_id IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".positions p
           WHERE p.business_unit_id = bu.id
             AND (p.title ILIKE '%head%' OR p.title ILIKE '%director%'
                  OR p.title ILIKE '%vp%' OR p.is_leadership = true)
         )`,
      [],
    );
    for (const row of rows) {
      issues.push({
        type: 'missing_leader',
        entityType: 'business_unit',
        entityId: String(row.id),
        description: `Business unit "${row.name}" has no designated head or leadership position.`,
        suggestion: 'Assign a head_user_id or create a leadership position.',
      });
    }
  } catch { /* table or column may not exist */ }

  return issues;
}

/**
 * Detect circular parent references in departments (parent_id cycle).
 */
async function checkCircularReferences(schema: string): Promise<OrgIssue[]> {
  const issues: OrgIssue[] = [];

  try {
    // Use a recursive CTE to detect cycles in department hierarchy
    const { rows } = await safeQuery(
      `WITH RECURSIVE dept_tree AS (
         SELECT id, parent_department_id, name, ARRAY[id] AS path, false AS is_cycle
         FROM "${schema}".departments
         WHERE parent_department_id IS NOT NULL

         UNION ALL

         SELECT d.id, d.parent_department_id, d.name, dt.path || d.id,
                d.id = ANY(dt.path) AS is_cycle
         FROM "${schema}".departments d
         JOIN dept_tree dt ON d.parent_department_id = dt.id
         WHERE NOT d.id = ANY(dt.path)
           AND array_length(dt.path, 1) < ${MAX_HIERARCHY_DEPTH + 2}
       )
       SELECT DISTINCT id, name FROM dept_tree WHERE is_cycle = true`,
      [],
    );

    for (const row of rows) {
      issues.push({
        type: 'circular_ref',
        entityType: 'department',
        entityId: String(row.id),
        description: `Department "${row.name}" is part of a circular parent reference chain.`,
        suggestion: 'Break the cycle by setting one department\'s parent to NULL or a different parent.',
      });
    }
  } catch { /* table or column may not exist */ }

  return issues;
}

/**
 * Find hierarchy paths that exceed the maximum recommended depth.
 */
async function checkExcessiveDepth(schema: string): Promise<OrgIssue[]> {
  const issues: OrgIssue[] = [];

  try {
    const { rows } = await safeQuery(
      `WITH RECURSIVE dept_depth AS (
         SELECT id, name, parent_department_id, 1 AS depth
         FROM "${schema}".departments
         WHERE parent_department_id IS NULL

         UNION ALL

         SELECT d.id, d.name, d.parent_department_id, dd.depth + 1
         FROM "${schema}".departments d
         JOIN dept_depth dd ON d.parent_department_id = dd.id
         WHERE dd.depth < ${MAX_HIERARCHY_DEPTH + 5}
       )
       SELECT id, name, depth FROM dept_depth WHERE depth > ${MAX_HIERARCHY_DEPTH}`,
      [],
    );

    for (const row of rows) {
      issues.push({
        type: 'depth_exceeded',
        entityType: 'department',
        entityId: String(row.id),
        description: `Department "${row.name}" is at depth ${row.depth}, exceeding the maximum of ${MAX_HIERARCHY_DEPTH}.`,
        suggestion: 'Flatten the hierarchy by reducing nesting levels.',
      });
    }
  } catch { /* table or column may not exist */ }

  return issues;
}

/**
 * Find duplicate entity names within the same parent scope.
 */
async function checkDuplicateNames(schema: string): Promise<OrgIssue[]> {
  const issues: OrgIssue[] = [];

  try {
    const { rows } = await safeQuery(
      `SELECT name, business_unit_id, COUNT(*) AS cnt
       FROM "${schema}".departments
       GROUP BY name, business_unit_id
       HAVING COUNT(*) > 1`,
      [],
    );
    for (const row of rows) {
      issues.push({
        type: 'duplicate_name',
        entityType: 'department',
        entityId: String(row.business_unit_id ?? 'unknown'),
        description: `${row.cnt} departments share the name "${row.name}" within the same business unit.`,
        suggestion: 'Rename duplicates to avoid confusion in reporting and access rules.',
      });
    }
  } catch { /* table may not exist */ }

  return issues;
}

/**
 * Find positions not assigned to any user.
 */
async function checkUnassignedPositions(schema: string): Promise<OrgIssue[]> {
  const issues: OrgIssue[] = [];

  try {
    const { rows } = await safeQuery(
      `SELECT p.id, p.title, d.name AS department_name
       FROM "${schema}".positions p
       LEFT JOIN "${schema}".departments d ON p.department_id = d.id
       WHERE p.user_id IS NULL
         AND p.is_active = true`,
      [],
    );

    // Only flag if there are significant numbers of unassigned positions
    if (rows.length > 5) {
      issues.push({
        type: 'unassigned_position',
        entityType: 'position',
        entityId: 'multiple',
        description: `${rows.length} active positions have no assigned user.`,
        suggestion: 'Assign users to open positions or deactivate positions that are no longer needed.',
      });
    }
  } catch { /* table or column may not exist */ }

  return issues;
}

/* ------------------------------------------------------------------ */
/*  Convenience alias                                                 */
/* ------------------------------------------------------------------ */

/**
 * Validate org structure. Alias for validateOrgStructureWithAI.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @returns Validation result with issues and suggestions
 */
export async function validateOrgStructure(
  tenantId: string,
): Promise<OrgValidationResult> {
  return validateOrgStructureWithAI(tenantId);
}

/* ------------------------------------------------------------------ */
/*  Separation of Duties (SoD) violation detection                    */
/* ------------------------------------------------------------------ */

/** A detected SoD violation. */
export interface SoDViolation {
  userId: string;
  userName: string;
  conflictingRoles: string[];
  reason: string;
  severity: 'critical' | 'high' | 'medium';
}

/** SoD detection result. */
export interface SoDDetectionResult {
  violations: SoDViolation[];
  totalUsersChecked: number;
  violationCount: number;
}

/** Role combinations that constitute SoD violations. */
const SOD_CONFLICT_PAIRS: Array<{ role1: string; role2: string; reason: string; severity: 'critical' | 'high' | 'medium' }> = [
  { role1: 'risk_owner', role2: 'risk_auditor', reason: 'A risk owner cannot audit their own risks', severity: 'critical' },
  { role1: 'control_owner', role2: 'control_tester', reason: 'A control owner cannot test their own controls', severity: 'critical' },
  { role1: 'policy_author', role2: 'policy_approver', reason: 'A policy author cannot approve their own policies', severity: 'high' },
  { role1: 'vendor_manager', role2: 'vendor_auditor', reason: 'A vendor manager cannot audit their managed vendors', severity: 'high' },
  { role1: 'budget_requester', role2: 'budget_approver', reason: 'A budget requester cannot approve their own requests', severity: 'high' },
  { role1: 'incident_reporter', role2: 'incident_investigator', reason: 'An incident reporter should not investigate their own reports', severity: 'medium' },
  { role1: 'evidence_collector', role2: 'evidence_reviewer', reason: 'An evidence collector should not review their own evidence', severity: 'medium' },
];

/**
 * Detect Separation of Duties violations across the organization.
 *
 * Checks all users for conflicting role assignments that violate
 * SoD principles. Uses configurable conflict pairs.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @returns Detection result with all violations found
 */
export async function detectSoDViolations(
  tenantId: string,
): Promise<SoDDetectionResult> {
  const schema = tenantSchema(tenantId);
  const violations: SoDViolation[] = [];

  try {
    // Get all users with their active roles
    const { rows: userRoles } = await safeQuery(
      `SELECT u.id AS user_id, u.name AS user_name,
              ARRAY_AGG(DISTINCT r.code) AS role_codes
       FROM "${schema}".users u
       JOIN "${schema}".user_role_assignments ura ON ura.user_id = u.id
       JOIN "${schema}".roles r ON r.id = ura.role_id
       WHERE ura.is_active = true
         AND u.status = 'active'
         AND (ura.valid_until IS NULL OR ura.valid_until > NOW())
       GROUP BY u.id, u.name`,
      [],
    );

    for (const user of userRoles) {
      const roles: string[] = user.role_codes || [];

      for (const conflict of SOD_CONFLICT_PAIRS) {
        if (roles.includes(conflict.role1) && roles.includes(conflict.role2)) {
          violations.push({
            userId: String(user.user_id),
            userName: String(user.user_name || ''),
            conflictingRoles: [conflict.role1, conflict.role2],
            reason: conflict.reason,
            severity: conflict.severity,
          });
        }
      }
    }

    logger.info('[OrgValidation] SoD check completed', {
      tenantId,
      totalUsers: userRoles.length,
      violations: violations.length,
    });

    return {
      violations,
      totalUsersChecked: userRoles.length,
      violationCount: violations.length,
    };
  } catch (err) {
    logger.error('[OrgValidation] SoD detection failed', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { violations: [], totalUsersChecked: 0, violationCount: 0 };
  }
}

/* ------------------------------------------------------------------ */
/*  Org structure improvement suggestions                             */
/* ------------------------------------------------------------------ */

/** An improvement suggestion for the org structure. */
export interface OrgImprovement {
  area: string;
  suggestion: string;
  suggestionAr: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedEffort: string;
}

/**
 * Suggest improvements for the organization structure.
 *
 * Runs validation and SoD checks, then generates prioritized
 * improvement suggestions based on the findings.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @returns Array of improvement suggestions
 */
export async function suggestImprovements(
  tenantId: string,
): Promise<OrgImprovement[]> {
  const improvements: OrgImprovement[] = [];

  // Run validations in parallel
  const [validation, sod] = await Promise.all([
    validateOrgStructureWithAI(tenantId),
    detectSoDViolations(tenantId),
  ]);

  // Generate suggestions from validation issues
  const issuesByType = new Map<string, OrgIssue[]>();
  for (const issue of validation.issues) {
    const list = issuesByType.get(issue.type) || [];
    list.push(issue);
    issuesByType.set(issue.type, list);
  }

  if (issuesByType.has('orphan')) {
    const count = issuesByType.get('orphan')!.length;
    improvements.push({
      area: 'Hierarchy Integrity',
      suggestion: `${count} orphan node(s) detected. Assign them to valid parent entities or remove them.`,
      suggestionAr: `تم اكتشاف ${count} عقدة يتيمة. قم بتعيينها لكيانات أب صالحة أو إزالتها.`,
      priority: 'high',
      estimatedEffort: '1-2 hours',
    });
  }

  if (issuesByType.has('empty_department')) {
    const count = issuesByType.get('empty_department')!.length;
    improvements.push({
      area: 'Department Utilization',
      suggestion: `${count} empty department(s) found. Populate them with teams/positions or archive them.`,
      suggestionAr: `تم العثور على ${count} أقسام فارغة. قم بإضافة فرق/مناصب أو أرشفتها.`,
      priority: 'medium',
      estimatedEffort: '2-4 hours',
    });
  }

  if (issuesByType.has('missing_leader')) {
    const count = issuesByType.get('missing_leader')!.length;
    improvements.push({
      area: 'Leadership Coverage',
      suggestion: `${count} unit(s) lack designated leadership. Assign head positions for accountability.`,
      suggestionAr: `${count} وحدة تفتقر لقيادة معينة. قم بتعيين مناصب رئاسية للمساءلة.`,
      priority: 'high',
      estimatedEffort: '3-5 hours',
    });
  }

  if (issuesByType.has('circular_ref')) {
    improvements.push({
      area: 'Hierarchy Cycles',
      suggestion: 'Circular references detected in department hierarchy. Break cycles immediately.',
      suggestionAr: 'تم اكتشاف مراجع دائرية في التسلسل الهرمي. قم بكسر الدورات فوراً.',
      priority: 'critical',
      estimatedEffort: '1 hour',
    });
  }

  if (issuesByType.has('depth_exceeded')) {
    improvements.push({
      area: 'Hierarchy Depth',
      suggestion: `Hierarchy exceeds ${MAX_HIERARCHY_DEPTH} levels. Flatten the structure for clarity.`,
      suggestionAr: `التسلسل الهرمي يتجاوز ${MAX_HIERARCHY_DEPTH} مستويات. قم بتسطيح الهيكل من أجل الوضوح.`,
      priority: 'medium',
      estimatedEffort: '4-8 hours',
    });
  }

  // SoD-based suggestions
  if (sod.violationCount > 0) {
    const critical = sod.violations.filter(v => v.severity === 'critical').length;
    improvements.push({
      area: 'Separation of Duties',
      suggestion: `${sod.violationCount} SoD violation(s) detected (${critical} critical). Reassign conflicting roles.`,
      suggestionAr: `تم اكتشاف ${sod.violationCount} انتهاك لفصل المهام (${critical} حرج). أعد تعيين الأدوار المتعارضة.`,
      priority: critical > 0 ? 'critical' : 'high',
      estimatedEffort: '2-6 hours',
    });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  improvements.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return improvements;
}

/* ------------------------------------------------------------------ */
/*  Validation history                                                */
/* ------------------------------------------------------------------ */

/** A stored validation result. */
export interface ValidationHistoryEntry {
  id: string;
  validatedAt: string;
  issueCount: number;
  isValid: boolean;
  issues: OrgIssue[];
}

/**
 * Get past validation results for a tenant.
 *
 * Retrieves stored validation snapshots from the database,
 * ordered by most recent first.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @returns Array of past validation results
 */
export async function getValidationHistory(
  tenantId: string,
): Promise<ValidationHistoryEntry[]> {
  const schema = tenantSchema(tenantId);

  try {
    const { rows } = await safeQuery(
      `SELECT id, validated_at, issue_count, is_valid, issues
       FROM "${schema}".org_validation_history
       WHERE tenant_id = $1
       ORDER BY validated_at DESC
       LIMIT 30`,
      [tenantId],
    );

    return rows.map((row: any) => ({
      id: String(row.id),
      validatedAt: row.validated_at instanceof Date
        ? row.validated_at.toISOString()
        : String(row.validated_at),
      issueCount: Number(row.issue_count) || 0,
      isValid: row.is_valid === true,
      issues: Array.isArray(row.issues)
        ? row.issues
        : (typeof row.issues === 'string' ? JSON.parse(row.issues) : []),
    }));
  } catch (err) {
    // Table may not exist yet — return empty
    logger.debug('[OrgValidation] Validation history table not available', {
      tenantId, error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Save a validation result to history for future reference.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param result - The validation result to persist
 */
export async function saveValidationResult(
  tenantId: string,
  result: OrgValidationResult,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `INSERT INTO "${schema}".org_validation_history
         (tenant_id, validated_at, issue_count, is_valid, issues)
       VALUES ($1, NOW(), $2, $3, $4)`,
      [tenantId, result.issues.length, result.valid, JSON.stringify(result.issues)],
    );
  } catch (err) {
    logger.warn('[OrgValidation] Failed to save validation result', {
      tenantId, error: err instanceof Error ? err.message : String(err),
    });
  }
}
