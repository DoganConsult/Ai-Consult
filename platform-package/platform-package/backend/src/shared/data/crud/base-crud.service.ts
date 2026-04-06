// @ts-nocheck
/**
 * Base CRUD Service — Generic reusable service class for tenant-scoped CRUD operations.
 * Provides create, getById, update, delete, list, restore, hardDelete with:
 *   - Tenant schema isolation (tenant_${tenantId})
 *   - Parameterized queries (SQL injection prevention)
 *   - Pagination via pagination helper
 *   - Sort/filter column whitelisting
 *   - Soft-delete support (deleted_at / deleted_by)
 *   - Protected hooks for subclass customization
 *
 * Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.12, 6.2, 6.3, 6.4, 6.5
 */

import { query, tenantSchema } from '../../../config/database';
import { NotFoundError, ValidationError } from '../../../errors/index';
import {
  parsePaginationParams,
  paginatedResponse,
  PaginatedResult,
} from '../../../utils/pagination';
import { getFirstRow } from '../../../utils/db-utils';

export interface CrudConfig {
  tableName: string;
  primaryKey: string;
  softDelete: boolean;
  sortableColumns: string[];
  filterableColumns: string[];
  defaultSort: string;
  defaultSortDir: 'ASC' | 'DESC';
  maxPageSize: number;
}

export interface ListOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
  includeDeleted?: boolean;
}

export class BaseCrudService<T extends Record<string, any>> {
  protected config: CrudConfig;

  constructor(config: Partial<CrudConfig> & Pick<CrudConfig, 'tableName' | 'primaryKey'>) {
    this.config = {
      softDelete: true,
      sortableColumns: ['created_at'],
      filterableColumns: [],
      defaultSort: 'created_at',
      defaultSortDir: 'DESC',
      maxPageSize: 100,
      ...config,
    };
  }

  // ─── Helpers ──────────────────────────────────────

  /** Fully-qualified table reference for a tenant. */
  private fqTable(tenantId: string): string {
    const schema = tenantSchema(tenantId);
    return `"${schema}"."${this.config.tableName}"`;
  }

  /** Validate that a column name is in the given whitelist. */
  private assertColumn(col: string, whitelist: string[], label: string): void {
    if (!whitelist.includes(col)) {
      throw new ValidationError([
        { path: label, message: `Column '${col}' is not allowed for ${label}`, expected: whitelist.join(', ') },
      ]);
    }
  }

  // ─── Protected hooks (override in subclasses) ────

  /** Called before INSERT. Return the (possibly modified) data. */
  protected async beforeCreate(_tenantId: string, data: Partial<T>): Promise<Partial<T>> {
    return data;
  }

  /** Called after INSERT with the full created entity. */
  protected async afterCreate(_tenantId: string, _entity: T): Promise<void> {}

  /** Called before UPDATE. Return the (possibly modified) data. */
  protected async beforeUpdate(_tenantId: string, _id: string, data: Partial<T>): Promise<Partial<T>> {
    return data;
  }

  /** Called after UPDATE with the new and previous entity. */
  protected async afterUpdate(_tenantId: string, _entity: T, _previous: T): Promise<void> {}

  /** Called before DELETE (soft or hard). */
  protected async beforeDelete(_tenantId: string, _id: string): Promise<void> {}

  /**
   * Build additional WHERE clause fragments from filters.
   * Override for custom filter logic (e.g. JSONB, array contains).
   * Returns { sql, params } where sql uses $N placeholders starting at paramOffset.
   */
  protected buildWhereClause(
    filters: Record<string, any>,
    paramOffset: number,
  ): { sql: string; params: unknown[] } {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let idx = paramOffset;

    for (const [col, value] of Object.entries(filters)) {
      this.assertColumn(col, this.config.filterableColumns, 'filter');
      clauses.push(`"${col}" = $${idx}`);
      params.push(value);
      idx++;
    }

    return {
      sql: clauses.length > 0 ? clauses.join(' AND ') : '',
      params,
    };
  }

  // ─── CRUD Methods ────────────────────────────────

  /**
   * INSERT a new row. Returns the full created entity including generated fields.
   * Requirement 1.1, 1.9
   */
  async create(tenantId: string, data: Partial<T>): Promise<T> {
    const prepared = await this.beforeCreate(tenantId, data);
    const keys = Object.keys(prepared);
    const values = Object.values(prepared);
    const placeholders = keys.map((_, i) => `$${i + 1}`);

    const sql = `INSERT INTO ${this.fqTable(tenantId)} (${keys.map(k => `"${k}"`).join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *`;

    const result = await query(sql, values);
    const entity = getFirstRow(result) as T;
    await this.afterCreate(tenantId, entity);
    return entity;
  }

  /**
   * SELECT a single row by primary key.
   * Excludes soft-deleted records by default (Requirement 1.7).
   */
  async getById(tenantId: string, id: string, includeDeleted = false): Promise<T> {
    const pk = this.config.primaryKey;
    let sql = `SELECT * FROM ${this.fqTable(tenantId)} WHERE "${pk}" = $1`;

    if (this.config.softDelete && !includeDeleted) {
      sql += ' AND deleted_at IS NULL';
    }

    const result = await query(sql, [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError(this.config.tableName, id);
    }
    return getFirstRow(result) as T;
  }

  /**
   * UPDATE a row by primary key. Throws NotFoundError if the row doesn't exist.
   * Requirement 1.10
   */
  async update(tenantId: string, id: string, data: Partial<T>): Promise<T> {
    // Fetch previous state (also validates existence)
    const previous = await this.getById(tenantId, id);

    const prepared = await this.beforeUpdate(tenantId, id, data);
    const keys = Object.keys(prepared);
    if (keys.length === 0) {
      return previous;
    }

    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
    const values = [...Object.values(prepared), id];

    const sql = `UPDATE ${this.fqTable(tenantId)}
      SET ${setClauses.join(', ')}
      WHERE "${this.config.primaryKey}" = $${keys.length + 1}
      ${this.config.softDelete ? 'AND deleted_at IS NULL' : ''}
      RETURNING *`;

    const result = await query(sql, values);
    if (result.rows.length === 0) {
      throw new NotFoundError(this.config.tableName, id);
    }

    const entity = getFirstRow(result) as T;
    await this.afterUpdate(tenantId, entity, previous);
    return entity;
  }

  /**
   * DELETE a row — soft-delete (set deleted_at) when softDelete is enabled,
   * otherwise hard-delete.
   * Requirements 1.6, 6.2
   */
  async delete(tenantId: string, id: string, deletedBy?: string): Promise<void> {
    await this.beforeDelete(tenantId, id);

    if (this.config.softDelete) {
      const sql = `UPDATE ${this.fqTable(tenantId)}
        SET deleted_at = NOW(), deleted_by = $2
        WHERE "${this.config.primaryKey}" = $1 AND deleted_at IS NULL`;
      const result = await query(sql, [id, deletedBy ?? null]);
      if (result.rowCount === 0) {
        throw new NotFoundError(this.config.tableName, id);
      }
    } else {
      const sql = `DELETE FROM ${this.fqTable(tenantId)} WHERE "${this.config.primaryKey}" = $1`;
      const result = await query(sql, [id]);
      if (result.rowCount === 0) {
        throw new NotFoundError(this.config.tableName, id);
      }
    }
  }

  /**
   * Paginated list with sorting, filtering, and soft-delete awareness.
   * Requirements 1.2, 1.4, 1.5, 1.7, 1.8, 1.12
   */
  async list(tenantId: string, options: ListOptions = {}): Promise<PaginatedResult<T>> {
    // Parse pagination with defaults
    const pagination = parsePaginationParams({
      page: options.page,
      pageSize: options.pageSize,
      sortBy: options.sortBy ?? this.config.defaultSort,
      sortDir: options.sortDir ?? this.config.defaultSortDir,
    });

    // Cap pageSize at config max
    if (pagination.pageSize > this.config.maxPageSize) {
      pagination.pageSize = this.config.maxPageSize;
    }

    // Validate sort column against whitelist (Requirement 1.12)
    this.assertColumn(pagination.sortBy, this.config.sortableColumns, 'sortBy');

    // Build WHERE clauses
    const whereParts: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    // Soft-delete filter (Requirement 1.7, 1.8)
    if (this.config.softDelete && !options.includeDeleted) {
      whereParts.push('deleted_at IS NULL');
    }

    // User-supplied filters (Requirement 1.5)
    if (options.filters && Object.keys(options.filters).length > 0) {
      const filterResult = this.buildWhereClause(options.filters, paramIdx);
      if (filterResult.sql) {
        whereParts.push(filterResult.sql);
        params.push(...filterResult.params);
        paramIdx += filterResult.params.length;
      }
    }

    const whereSQL = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
    const table = this.fqTable(tenantId);

    // Count total matching rows
    const countSQL = `SELECT COUNT(*)::int AS total FROM ${table} ${whereSQL}`;
    const countResult = await query(countSQL, params);
    const total: number = getFirstRow(countResult)?.total ?? 0;

    // Fetch page of data
    const offset = (pagination.page - 1) * pagination.pageSize;
    const dataSQL = `SELECT * FROM ${table} ${whereSQL}
      ORDER BY "${pagination.sortBy}" ${pagination.sortDir}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;

    const dataResult = await query(dataSQL, [...params, pagination.pageSize, offset]);

    return paginatedResponse<T>(dataResult.rows as T[], total, pagination.page, pagination.pageSize);
  }

  /**
   * Restore a soft-deleted record by setting deleted_at back to NULL.
   * Requirement 6.4
   */
  async restore(tenantId: string, id: string): Promise<T> {
    if (!this.config.softDelete) {
      throw new ValidationError([
        { path: 'softDelete', message: 'Restore is not supported on tables without soft-delete' },
      ]);
    }

    const sql = `UPDATE ${this.fqTable(tenantId)}
      SET deleted_at = NULL, deleted_by = NULL
      WHERE "${this.config.primaryKey}" = $1 AND deleted_at IS NOT NULL
      RETURNING *`;

    const result = await query(sql, [id]);
    if (result.rows.length === 0) {
      throw new NotFoundError(this.config.tableName, id);
    }
    return getFirstRow(result) as T;
  }

  /**
   * Permanently remove a row from the database.
   * Requirement 6.5
   */
  async hardDelete(tenantId: string, id: string): Promise<void> {
    const sql = `DELETE FROM ${this.fqTable(tenantId)} WHERE "${this.config.primaryKey}" = $1`;
    const result = await query(sql, [id]);
    if (result.rowCount === 0) {
      throw new NotFoundError(this.config.tableName, id);
    }
  }
}
