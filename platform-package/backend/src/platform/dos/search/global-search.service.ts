// @ts-nocheck
/**
 * Platform — Global Search Service (Standardized)
 * - Unified result format: { entityType, entityId, title, snippet, score, url }
 * - Results ranked by relevance score descending
 * - Supports `types` filter to restrict entity types
 * - RBAC permission filtering based on user role
 * - Empty/whitespace queries return empty result set
 * - Standard pagination envelope
 * - Additional filters: status, owner, dateFrom, dateTo
 *
 * Requirements: 3.1, 3.6, 3.10, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

import { safeQuery, tenantSchema } from '../../../config/database/database';
import { paginatedResponse, PaginatedResult } from '../../../shared/data/pagination';
import { getFirstRow } from '../../../shared/data/db-utils';

// ─── Types ──────────────────────────────────────────

export interface QuickAction {
  action: 'view' | 'edit' | 'assign' | 'delete';
  label: string;
  labelAr: string;
  url: string;
  enabled: boolean;
}

export interface SearchResultItem {
  entityType: string;
  entityId: string;
  title: string;
  snippet: string;
  score: number;
  url: string;
  status?: string;
  owner?: string;
  updatedAt?: string;
  actions: QuickAction[];
}

export interface SearchOptions {
  types?: string[];
  status?: string[];
  owners?: string[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  userRole?: string;
}

export interface SavedSearch {
  searchId: string;
  userId: string;
  name: string;
  query: string;
  filters: SearchOptions;
  createdAt: string;
}

export interface RecentSearch {
  searchId: string;
  userId: string;
  query: string;
  searchedAt: string;
}

// ─── Search table config ────────────────────────────

export interface SearchTableConfig {
  table: string;
  type: string;
  titleCol: string;
  descCol: string;
  idCol: string;
  urlPrefix: string;
  requiredPermission: string;
  statusCol?: string;
  ownerCol?: string;
  dateCol?: string;
}

const SEARCH_TABLES: SearchTableConfig[] = [
  { table: 'risks', type: 'risk', titleCol: 'title', descCol: 'description', idCol: 'risk_id', urlPrefix: '/risks', requiredPermission: 'risk.record.read', statusCol: 'status', ownerCol: 'owner_id', dateCol: 'updated_at' },
  { table: 'policies', type: 'policy', titleCol: 'title', descCol: 'content', idCol: 'policy_id', urlPrefix: '/governance/policies', requiredPermission: 'policy.document.read', statusCol: 'status', ownerCol: 'owner_id', dateCol: 'updated_at' },
  { table: 'controls', type: 'control', titleCol: 'title', descCol: 'description', idCol: 'control_id', urlPrefix: '/compliance/controls', requiredPermission: 'control.record.read', statusCol: 'status', ownerCol: 'owner_id', dateCol: 'updated_at' },
  { table: 'incidents', type: 'incident', titleCol: 'title', descCol: 'description', idCol: 'incident_id', urlPrefix: '/incidents', requiredPermission: 'incident.record.read', statusCol: 'status', ownerCol: 'reported_by', dateCol: 'updated_at' },
  { table: 'vendors', type: 'vendor', titleCol: 'name', descCol: 'category', idCol: 'vendor_id', urlPrefix: '/vendors', requiredPermission: 'vendor.record.read', statusCol: 'status', ownerCol: 'owner_id', dateCol: 'updated_at' },
  { table: 'evidence', type: 'evidence', titleCol: 'title', descCol: 'description', idCol: 'evidence_id', urlPrefix: '/evidence', requiredPermission: 'evidence.item.read', statusCol: 'status', ownerCol: 'uploaded_by', dateCol: 'updated_at' },
];

// ─── Pure functions (exported for PBT testing) ──────

/** RBAC role-to-permission mapping */
const ALL_SEARCH_READ_PERMS = ['policy.document.read', 'risk.record.read', 'control.record.read', 'assessment.record.read', 'evidence.item.read', 'incident.record.read', 'vendor.record.read'];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ALL_SEARCH_READ_PERMS,
  admin: ALL_SEARCH_READ_PERMS,
  compliance_officer: ['policy.document.read', 'risk.record.read', 'control.record.read', 'assessment.record.read', 'evidence.item.read'],
  risk_manager: ['policy.document.read', 'risk.record.read', 'control.record.read', 'assessment.record.read', 'evidence.item.read'],
  auditor: ['policy.document.read', 'risk.record.read', 'control.record.read', 'assessment.record.read', 'evidence.item.read', 'incident.record.read', 'vendor.record.read'],
  viewer: ['policy.document.read', 'risk.record.read', 'control.record.read', 'assessment.record.read', 'evidence.item.read'],
};

/**
 * Entity types that support assignment.
 * These entities have an owner/assignee field that can be changed.
 */
const ASSIGNABLE_ENTITY_TYPES = new Set(['risk', 'control', 'incident', 'evidence']);

/**
 * Role-to-edit-permission mapping.
 * Defines which roles can edit which entity types.
 */
const ALL_SEARCH_WRITE_PERMS = ['policy.document.write', 'risk.record.write', 'control.record.write', 'assessment.record.write', 'evidence.item.write', 'incident.record.write', 'vendor.record.write'];

const ROLE_EDIT_PERMISSIONS: Record<string, string[]> = {
  owner: ALL_SEARCH_WRITE_PERMS,
  admin: ALL_SEARCH_WRITE_PERMS,
  compliance_officer: ['policy.document.write', 'risk.record.write', 'control.record.write', 'evidence.item.write'],
  risk_manager: ['risk.record.write', 'control.record.write', 'evidence.item.write'],
  auditor: [],
  viewer: [],
};

/**
 * Role-to-assign-permission mapping.
 * Defines which roles can assign entities to users.
 */
const ALL_SEARCH_ASSIGN_PERMS = ['risk.record.assign', 'control.record.assign', 'incident.record.assign', 'evidence.item.assign'];

const ROLE_ASSIGN_PERMISSIONS: Record<string, string[]> = {
  owner: ALL_SEARCH_ASSIGN_PERMS,
  admin: ALL_SEARCH_ASSIGN_PERMS,
  compliance_officer: ['risk.record.assign', 'control.record.assign', 'evidence.item.assign'],
  risk_manager: ['risk.record.assign', 'control.record.assign', 'evidence.item.assign'],
  auditor: [],
  viewer: [],
};

/**
 * Check if a user role has edit permission for an entity type.
 */
export function hasEditPermission(role: string | undefined, entityType: string): boolean {
  if (!role) return false;
  const perms = ROLE_EDIT_PERMISSIONS[role] || [];
  return perms.some(p => p.startsWith(`${entityType}.`) && p.endsWith('.write'));
}

/**
 * Check if a user role has assign permission for an entity type.
 */
export function hasAssignPermission(role: string | undefined, entityType: string): boolean {
  if (!role) return false;
  if (!ASSIGNABLE_ENTITY_TYPES.has(entityType)) return false;
  const perms = ROLE_ASSIGN_PERMISSIONS[role] || [];
  return perms.some(p => p.startsWith(`${entityType}.`) && p.endsWith('.assign'));
}

/**
 * Get quick actions available for an entity based on entity type and user permissions.
 * 
 * Actions:
 * - view: Always available (user already has read permission to see the result)
 * - edit: Available if user has write permission for the entity type
 * - assign: Available if entity type supports assignment and user has assign permission
 * 
 * Requirements: 3.4
 */
export function getQuickActionsForEntity(
  entityType: string,
  entityId: string,
  urlPrefix: string,
  userRole?: string,
): QuickAction[] {
  const actions: QuickAction[] = [];
  
  // View action - always available (user has read permission to see the result)
  actions.push({
    action: 'view',
    label: 'View',
    labelAr: 'عرض',
    url: `${urlPrefix}/${entityId}`,
    enabled: true,
  });
  
  // Edit action - available if user has edit permission
  const canEdit = hasEditPermission(userRole, entityType);
  actions.push({
    action: 'edit',
    label: 'Edit',
    labelAr: 'تعديل',
    url: `${urlPrefix}/${entityId}/edit`,
    enabled: canEdit,
  });
  
  // Assign action - available if entity supports assignment and user has permission
  const canAssign = hasAssignPermission(userRole, entityType);
  if (ASSIGNABLE_ENTITY_TYPES.has(entityType)) {
    actions.push({
      action: 'assign',
      label: 'Assign',
      labelAr: 'تعيين',
      url: `${urlPrefix}/${entityId}/assign`,
      enabled: canAssign,
    });
  }
  
  return actions;
}

/**
 * Check if a query is empty or whitespace-only.
 */
export function isEmptyQuery(q: string): boolean {
  return !q || q.trim().length === 0;
}

/**
 * Filter search tables by entity types.
 */
export function filterTablesByTypes(tables: SearchTableConfig[], types?: string[]): SearchTableConfig[] {
  if (!types || types.length === 0) return tables;
  return tables.filter(t => types.includes(t.type));
}

/**
 * Filter search tables by RBAC permissions.
 */
export function filterTablesByRole(tables: SearchTableConfig[], role?: string): SearchTableConfig[] {
  if (!role) return tables;
  const perms = ROLE_PERMISSIONS[role] || [];
  if (perms.includes('*')) return tables;
  return tables.filter(t => perms.includes(t.requiredPermission));
}

/**
 * Entity type priority weights for relevance scoring.
 * Higher priority types appear first when scores are equal.
 */
const ENTITY_TYPE_PRIORITY: Record<string, number> = {
  risk: 6,       // Risks are often the primary concern
  control: 5,    // Controls mitigate risks
  policy: 4,     // Policies govern controls
  incident: 3,   // Incidents are time-sensitive
  evidence: 2,   // Evidence supports compliance
  vendor: 1,     // Vendors are external entities
};

/**
 * Calculate recency bonus based on updatedAt timestamp.
 * More recent items get a higher bonus (0-2 points).
 */
export function calculateRecencyBonus(updatedAt?: string): number {
  if (!updatedAt) return 0;
  
  const updated = new Date(updatedAt);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
  
  // Items updated within 7 days get +2, within 30 days get +1, older get 0
  if (daysDiff <= 7) return 2;
  if (daysDiff <= 30) return 1;
  return 0;
}

/**
 * Calculate text match score between search term and text.
 * Returns a score based on match quality.
 */
export function calculateTextMatchScore(searchTerm: string, text: string): number {
  if (!text || !searchTerm) return 0;
  
  const lowerTerm = searchTerm.toLowerCase().trim();
  const lowerText = text.toLowerCase();
  
  // Exact match (highest score)
  if (lowerText === lowerTerm) return 10;
  
  // Starts with search term (very high score)
  if (lowerText.startsWith(lowerTerm)) return 8;
  
  // Word boundary match (high score) - term appears as a complete word
  const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(lowerTerm)}\\b`, 'i');
  if (wordBoundaryRegex.test(lowerText)) return 6;
  
  // Contains search term (medium score)
  if (lowerText.includes(lowerTerm)) return 4;
  
  // Partial word match - any word starts with the term
  const words = lowerText.split(/\s+/);
  if (words.some(word => word.startsWith(lowerTerm))) return 2;
  
  return 0;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sort search results by score descending.
 * When scores are equal, sorts by entity type priority, then by recency.
 */
export function sortByScore(results: SearchResultItem[]): SearchResultItem[] {
  return [...results].sort((a, b) => {
    // Primary sort: by score descending
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    
    // Secondary sort: by entity type priority descending
    const priorityA = ENTITY_TYPE_PRIORITY[a.entityType] || 0;
    const priorityB = ENTITY_TYPE_PRIORITY[b.entityType] || 0;
    if (priorityB !== priorityA) {
      return priorityB - priorityA;
    }
    
    // Tertiary sort: by recency (more recent first)
    const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Build a search result item from raw DB row with enhanced relevance scoring.
 * 
 * Scoring algorithm:
 * - Title exact match: +10 points
 * - Title starts with term: +8 points
 * - Title word boundary match: +6 points
 * - Title contains term: +4 points
 * - Title partial word match: +2 points
 * - Description match: +1-5 points (scaled from title scoring)
 * - Entity type priority: +1-6 points
 * - Recency bonus: +0-2 points
 * 
 * Minimum score is always 1.
 * 
 * Requirements: 3.4 (quick actions)
 */
export function buildResultItem(
  type: string,
  entityId: string,
  title: string,
  description: string,
  urlPrefix: string,
  searchTerm: string,
  status?: string,
  owner?: string,
  updatedAt?: string,
  userRole?: string,
): SearchResultItem {
  let score = 0;
  
  // Title match scoring (highest weight)
  const titleScore = calculateTextMatchScore(searchTerm, title);
  score += titleScore;
  
  // Description match scoring (lower weight - half of title scoring)
  const descScore = calculateTextMatchScore(searchTerm, description);
  score += Math.floor(descScore / 2);
  
  // Entity type priority bonus
  const typePriority = ENTITY_TYPE_PRIORITY[type] || 0;
  score += typePriority;
  
  // Recency bonus
  score += calculateRecencyBonus(updatedAt);

  // Build snippet (first 150 chars of description)
  const snippet = description ? description.substring(0, 150) : '';

  // Get quick actions based on entity type and user permissions
  const actions = getQuickActionsForEntity(type, entityId, urlPrefix, userRole);

  return {
    entityType: type,
    entityId,
    title,
    snippet,
    score: Math.max(score, 1),
    url: `${urlPrefix}/${entityId}`,
    status,
    owner,
    updatedAt,
    actions,
  };
}

/**
 * Build WHERE clause conditions for additional filters.
 * Returns { conditions: string[], params: unknown[], paramIndex: number }
 */
export function buildFilterConditions(
  tableConfig: SearchTableConfig,
  options: SearchOptions,
  startParamIndex: number,
): { conditions: string[]; params: unknown[]; paramIndex: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = startParamIndex;

  // Status filter
  if (options.status && options.status.length > 0 && tableConfig.statusCol) {
    conditions.push('"' + tableConfig.statusCol + '" = ANY($' + paramIndex + ')');
    params.push(options.status);
    paramIndex++;
  }

  // Owner filter
  if (options.owners && options.owners.length > 0 && tableConfig.ownerCol) {
    conditions.push('"' + tableConfig.ownerCol + '"::text = ANY($' + paramIndex + ')');
    params.push(options.owners);
    paramIndex++;
  }

  // Date range filters
  if (options.dateFrom && tableConfig.dateCol) {
    conditions.push('"' + tableConfig.dateCol + '" >= $' + paramIndex);
    params.push(options.dateFrom);
    paramIndex++;
  }

  if (options.dateTo && tableConfig.dateCol) {
    conditions.push('"' + tableConfig.dateCol + '" <= $' + paramIndex);
    params.push(options.dateTo);
    paramIndex++;
  }

  return { conditions, params, paramIndex };
}

// ─── Main search function ───────────────────────────

export async function search(
  tenantId: string,
  searchQuery: string,
  options: SearchOptions = {},
): Promise<PaginatedResult<SearchResultItem>> {
  if (isEmptyQuery(searchQuery)) {
    return paginatedResponse<SearchResultItem>([], 0, options.page ?? 1, options.pageSize ?? 25);
  }

  const schema = tenantSchema(tenantId);
  let tables = filterTablesByTypes(SEARCH_TABLES, options.types);
  tables = filterTablesByRole(tables, options.userRole);

  const results: SearchResultItem[] = [];
  const term = '%' + searchQuery + '%';

  for (const t of tables) {
    try {
      // Build base query conditions
      const baseConditions = ['("' + t.titleCol + '" ILIKE $1 OR COALESCE("' + t.descCol + '", \'\') ILIKE $1)'];
      const baseParams: any[] = [term];

      // Build additional filter conditions
      const { conditions: filterConditions, params: filterParams } = buildFilterConditions(t, options, 2);
      const allConditions = [...baseConditions, ...filterConditions];
      const allParams = [...baseParams, ...filterParams];

      // Build select columns
      const selectCols = [
        '"' + t.idCol + '" as entity_id',
        '"' + t.titleCol + '" as title',
        'COALESCE("' + t.descCol + '", \'\') as description',
      ];
      if (t.statusCol) selectCols.push('"' + t.statusCol + '" as status');
      if (t.ownerCol) selectCols.push('"' + t.ownerCol + '"::text as owner');
      if (t.dateCol) selectCols.push('"' + t.dateCol + '"::text as updated_at');

      const sql = 'SELECT ' + selectCols.join(', ') +
         ' FROM "' + schema + '"."' + t.table + '"' +
         ' WHERE ' + allConditions.join(' AND ') +
         ' LIMIT 50';

      const res = await safeQuery(sql, allParams);
      for (const row of res.rows) {
        results.push(buildResultItem(
          t.type,
          row.entity_id,
          row.title,
          row.description,
          t.urlPrefix,
          searchQuery,
          row.status,
          row.owner,
          row.updated_at,
          options.userRole,
        ));
      }
    } catch { /* table may not exist */ }
  }

  const sorted = sortByScore(results);
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 25;
  const start = (page - 1) * pageSize;
  const pageData = sorted.slice(start, start + pageSize);

  return paginatedResponse<SearchResultItem>(pageData, sorted.length, page, pageSize);
}

// ─── Recent Searches Functions ──────────────────────

/**
 * Record a search query in the user's recent searches.
 * Stores the query with timestamp for retrieval later.
 * Limits to 50 recent searches per user (oldest are auto-pruned).
 * 
 * Requirements: 3.5
 */
export async function recordSearch(
  tenantId: string,
  userId: string,
  searchQuery: string,
  _filters?: SearchOptions,
): Promise<void> {
  if (isEmptyQuery(searchQuery)) return;

  const schema = tenantSchema(tenantId);
  
  // Insert the new search
  const insertSql = `
    INSERT INTO "${schema}".recent_searches (user_id, query, searched_at)
    VALUES ($1, $2, NOW())
  `;
  await safeQuery(insertSql, [userId, searchQuery.trim()]);

  // Prune old searches to keep only the most recent 50
  const pruneSql = `
    DELETE FROM "${schema}".recent_searches
    WHERE user_id = $1
    AND search_id NOT IN (
      SELECT search_id FROM "${schema}".recent_searches
      WHERE user_id = $1
      ORDER BY searched_at DESC
      LIMIT 50
    )
  `;
  await safeQuery(pruneSql, [userId]);
}

/**
 * Get recent searches for a user.
 * Returns unique queries ordered by most recent first.
 * 
 * Requirements: 3.5
 */
export async function getRecentSearches(
  tenantId: string,
  userId: string,
  limit: number = 10,
): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  
  // Get distinct recent queries ordered by most recent
  const sql = `
    SELECT DISTINCT ON (query) query, searched_at
    FROM "${schema}".recent_searches
    WHERE user_id = $1
    ORDER BY query, searched_at DESC
  `;
  const result = await safeQuery(sql, [userId]);
  
  // Sort by searched_at descending and limit
  const sorted = result.rows
    .sort((a, b) => new Date(b.searched_at).getTime() - new Date(a.searched_at).getTime())
    .slice(0, limit);
  
  return sorted.map(row => row.query);
}

// ─── Saved Searches Functions ───────────────────────

/**
 * Save a search with name and optional filters.
 * Allows users to save frequently used searches for quick access.
 * 
 * Requirements: 3.5
 */
export async function saveSearch(
  tenantId: string,
  userId: string,
  name: string,
  searchQuery: string,
  filters?: SearchOptions,
): Promise<SavedSearch> {
  const schema = tenantSchema(tenantId);
  
  const sql = `
    INSERT INTO "${schema}".saved_searches (user_id, name, query, filters, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING search_id, user_id, name, query, filters, created_at
  `;
  
  const result = await safeQuery(sql, [
    userId,
    name.trim(),
    searchQuery.trim(),
    JSON.stringify(filters || {}),
  ]);
  
  const row = getFirstRow(result);
  return {
    searchId: row.search_id,
    userId: row.user_id,
    name: row.name,
    query: row.query,
    filters: row.filters || {},
    createdAt: row.created_at,
  };
}

/**
 * Get all saved searches for a user.
 * Returns saved searches ordered by creation date descending.
 * 
 * Requirements: 3.5
 */
export async function getSavedSearches(
  tenantId: string,
  userId: string,
): Promise<SavedSearch[]> {
  const schema = tenantSchema(tenantId);
  
  const sql = `
    SELECT search_id, user_id, name, query, filters, created_at
    FROM "${schema}".saved_searches
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;
  
  const result = await safeQuery(sql, [userId]);
  
  return result.rows.map(row => ({
    searchId: row.search_id,
    userId: row.user_id,
    name: row.name,
    query: row.query,
    filters: row.filters || {},
    createdAt: row.created_at,
  }));
}

/**
 * Delete a saved search by ID.
 * Returns true if the search was deleted, false if not found.
 * 
 * Requirements: 3.5
 */
export async function deleteSavedSearch(
  tenantId: string,
  searchId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  
  const sql = `
    DELETE FROM "${schema}".saved_searches
    WHERE search_id = $1
    RETURNING search_id
  `;
  
  const result = await safeQuery(sql, [searchId]);
  return (result.rowCount ?? 0) > 0;
}
