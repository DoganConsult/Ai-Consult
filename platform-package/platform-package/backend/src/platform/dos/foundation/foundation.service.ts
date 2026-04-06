/**
 * DOS Foundation Service — Canonical CRUD for org hierarchy entities.
 *
 * This service provides the single entry point for positions CRUD (with reports-to)
 * and re-exports the existing org hierarchy services for organizations, business_units,
 * departments, and teams.
 *
 * Existing coverage (no duplication needed):
 *   - organizations CRUD + hierarchy  → org-hierarchy.service.ts  (upsertOrgHierarchyNode, getOrgHierarchyTree)
 *   - business_units CRUD             → org-hierarchy.service.ts  (upsertOrgHierarchyNode type='division')
 *   - departments CRUD                → org-hierarchy.service.ts  (upsertOrgHierarchyNode type='department')
 *   - teams CRUD + members            → org-hierarchy.service.ts  (upsertOrgHierarchyNode type='team')
 *                                       org-hierarchy-ops.service.ts (assignMember, bulkAssignMembers, searchOrgStructure)
 *   - bulk ops                        → org-hierarchy-ops.service.ts (bulkCreate, bulkDelete, bulkMove, bulkUpdateStatus)
 *   - admin features                  → org-hierarchy-admin.service.ts (activation, templates, visualization, analytics)
 *   - team recommendations            → team-builder.service.ts
 *   - responsibility suggestions      → responsibility-suggest.service.ts
 *   - org pack seeding (provisioning) → ../provisioning/org-pack-seeding.service.ts
 *
 * This file adds: positions CRUD with reports-to hierarchy.
 */

import { safeQuery, tenantSchema } from '../../../config/database/database';
import { logger } from '../logger';
import { randomUUID } from 'crypto';

// ── Re-exports for unified import ──

export {
  getOrgHierarchyTree,
  upsertOrgHierarchyNode,
  validateOrgStructure,
  getOrgHierarchyAccessRules,
  getUserAccessibleDepartments,
  getUserAccessibleTeams,
} from './org-hierarchy.service';
export type { OrgNodeType, OrgHierarchyNode } from './org-hierarchy.service';

export {
  bulkCreateNodes,
  bulkUpdateStatus,
  bulkDeleteNodes,
  bulkMoveNodes,
  searchOrgStructure,
  assignMember,
  bulkAssignMembers,
} from './org-hierarchy-ops.service';

// ── Position Types ──

export interface PositionRow {
  position_id: string;
  dept_id: string | null;
  title_en: string;
  title_ar: string | null;
  grade: string | null;
  reports_to_position_id: string | null;
  status: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreatePositionInput {
  titleEn: string;
  titleAr?: string;
  deptId?: string;
  grade?: string;
  reportsToPositionId?: string;
  status?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePositionInput {
  titleEn?: string;
  titleAr?: string;
  deptId?: string;
  grade?: string;
  reportsToPositionId?: string | null;
  status?: string;
  metadata?: Record<string, any>;
}

export interface PositionListOptions {
  deptId?: string;
  status?: string;
  searchTerm?: string;
  reportsToPositionId?: string;
  limit?: number;
  offset?: number;
}

// ── Position CRUD ──

/**
 * Create a new position in the tenant schema.
 */
export async function createPosition(
  tenantId: string,
  userId: string,
  input: CreatePositionInput,
): Promise<PositionRow> {
  const schema = tenantSchema(tenantId);
  const positionId = randomUUID();

  const cols = [
    'position_id', 'title_en', 'status', 'created_by',
  ];
  const vals: any[] = [
    positionId, input.titleEn, input.status || 'active', userId,
  ];
  let idx = vals.length + 1;

  if (input.titleAr !== undefined) {
    cols.push('title_ar');
    vals.push(input.titleAr);
    idx++;
  }
  if (input.deptId !== undefined) {
    cols.push('dept_id');
    vals.push(input.deptId);
    idx++;
  }
  if (input.grade !== undefined) {
    cols.push('grade');
    vals.push(input.grade);
    idx++;
  }
  if (input.reportsToPositionId !== undefined) {
    cols.push('reports_to_position_id');
    vals.push(input.reportsToPositionId);
    idx++;
  }
  if (input.metadata !== undefined) {
    cols.push('metadata');
    vals.push(JSON.stringify(input.metadata));
    idx++;
  }

  const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');

  await safeQuery(
    `INSERT INTO "${schema}".positions (${cols.join(', ')}) VALUES (${placeholders})`,
    vals,
  );

  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".positions WHERE position_id = $1`,
    [positionId],
  );

  logger.info(`[DOS Foundation] Position created: ${positionId} in tenant ${tenantId}`);
  return rows[0];
}

/**
 * Retrieve a single position by ID.
 */
export async function getPosition(
  tenantId: string,
  positionId: string,
): Promise<PositionRow | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".positions WHERE position_id = $1 AND deleted_at IS NULL`,
    [positionId],
  );
  return rows[0] || null;
}

/**
 * List positions with optional filters and pagination.
 */
export async function listPositions(
  tenantId: string,
  options: PositionListOptions = {},
): Promise<{ data: PositionRow[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: any[] = [];
  let idx = 1;

  if (options.deptId) {
    conditions.push(`dept_id = $${idx}`);
    params.push(options.deptId);
    idx++;
  }
  if (options.status) {
    conditions.push(`status = $${idx}`);
    params.push(options.status);
    idx++;
  }
  if (options.searchTerm) {
    conditions.push(`(title_en ILIKE $${idx} OR title_ar ILIKE $${idx})`);
    params.push(`%${options.searchTerm}%`);
    idx++;
  }
  if (options.reportsToPositionId) {
    conditions.push(`reports_to_position_id = $${idx}`);
    params.push(options.reportsToPositionId);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.min(options.limit || 100, 500);
  const offset = options.offset || 0;

  const countRes = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".positions ${where}`,
    params,
  );
  const total = countRes.rows[0]?.total || 0;

  const dataRes = await safeQuery(
    `SELECT * FROM "${schema}".positions ${where} ORDER BY title_en LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return { data: dataRes.rows, total };
}

/**
 * Update an existing position. Supports partial updates.
 */
export async function updatePosition(
  tenantId: string,
  userId: string,
  positionId: string,
  input: UpdatePositionInput,
): Promise<PositionRow | null> {
  const schema = tenantSchema(tenantId);

  const setClauses: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (input.titleEn !== undefined) {
    setClauses.push(`title_en = $${idx}`);
    params.push(input.titleEn);
    idx++;
  }
  if (input.titleAr !== undefined) {
    setClauses.push(`title_ar = $${idx}`);
    params.push(input.titleAr);
    idx++;
  }
  if (input.deptId !== undefined) {
    setClauses.push(`dept_id = $${idx}`);
    params.push(input.deptId);
    idx++;
  }
  if (input.grade !== undefined) {
    setClauses.push(`grade = $${idx}`);
    params.push(input.grade);
    idx++;
  }
  if (input.reportsToPositionId !== undefined) {
    setClauses.push(`reports_to_position_id = $${idx}`);
    params.push(input.reportsToPositionId);
    idx++;
  }
  if (input.status !== undefined) {
    setClauses.push(`status = $${idx}`);
    params.push(input.status);
    idx++;
  }
  if (input.metadata !== undefined) {
    setClauses.push(`metadata = $${idx}`);
    params.push(JSON.stringify(input.metadata));
    idx++;
  }

  if (setClauses.length === 0) {
    return getPosition(tenantId, positionId);
  }

  setClauses.push('updated_at = NOW()');
  setClauses.push(`updated_by = $${idx}`);
  params.push(userId);
  idx++;

  params.push(positionId);

  await safeQuery(
    `UPDATE "${schema}".positions SET ${setClauses.join(', ')} WHERE position_id = $${idx} AND deleted_at IS NULL`,
    params,
  );

  logger.info(`[DOS Foundation] Position updated: ${positionId} in tenant ${tenantId}`);
  return getPosition(tenantId, positionId);
}

/**
 * Soft-delete a position.
 */
export async function deletePosition(
  tenantId: string,
  userId: string,
  positionId: string,
): Promise<{ deleted: boolean }> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `UPDATE "${schema}".positions SET deleted_at = NOW(), updated_by = $1 WHERE position_id = $2 AND deleted_at IS NULL`,
    [userId, positionId],
  );

  const deleted = (res.rowCount || 0) > 0;
  if (deleted) {
    logger.info(`[DOS Foundation] Position soft-deleted: ${positionId} in tenant ${tenantId}`);
  }
  return { deleted };
}

/**
 * Get the reporting chain (ancestors) for a position, walking up reports_to_position_id.
 * Returns an ordered array from the immediate supervisor to the top of the chain.
 * Stops at maxDepth (default 20) to prevent infinite loops from circular references.
 */
export async function getPositionReportingChain(
  tenantId: string,
  positionId: string,
  maxDepth: number = 20,
): Promise<PositionRow[]> {
  const schema = tenantSchema(tenantId);
  const chain: PositionRow[] = [];
  const visited = new Set<string>();
  let currentId: string | null = positionId;

  // First, get the starting position to find its reports_to
  const start = await getPosition(tenantId, positionId);
  if (!start) return chain;
  currentId = start.reports_to_position_id;

  while (currentId && chain.length < maxDepth) {
    if (visited.has(currentId)) {
      logger.warn(`[DOS Foundation] Circular reporting chain detected at position ${currentId}`);
      break;
    }
    visited.add(currentId);

    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".positions WHERE position_id = $1 AND deleted_at IS NULL`,
      [currentId],
    );
    if (rows.length === 0) break;

    chain.push(rows[0]);
    currentId = rows[0].reports_to_position_id;
  }

  return chain;
}

/**
 * Get direct reports for a position — all positions whose reports_to_position_id matches.
 */
export async function getPositionDirectReports(
  tenantId: string,
  positionId: string,
): Promise<PositionRow[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".positions
     WHERE reports_to_position_id = $1 AND deleted_at IS NULL
     ORDER BY title_en`,
    [positionId],
  );
  return rows;
}
