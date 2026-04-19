/**
 * Pure helpers extracted from the low-code route handlers so they can be
 * unit-tested without a DB. Keep this file side-effect free.
 */

// ──────────────────────────────────────────────────────────────────────────
// Identifier + type safety for the Schema Designer.
// ──────────────────────────────────────────────────────────────────────────
export const IDENT_REGEX = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;

export const ALLOWED_SQL_TYPES: ReadonlySet<string> = new Set([
  'text', 'varchar', 'integer', 'bigint', 'smallint', 'numeric', 'boolean',
  'timestamptz', 'timestamp', 'date', 'uuid', 'jsonb', 'json', 'bytea',
  'serial', 'bigserial',
]);

export function assertIdent(name: unknown): string {
  if (typeof name !== 'string' || !IDENT_REGEX.test(name)) {
    throw new Error(`invalid identifier: ${String(name)}`);
  }
  return name;
}

export function assertDataType(type: unknown): string {
  if (typeof type !== 'string') throw new Error(`disallowed type: ${String(type)}`);
  const t = type.toLowerCase();
  if (!ALLOWED_SQL_TYPES.has(t)) throw new Error(`disallowed type: ${type}`);
  return t;
}

/** Strip semicolons from DEFAULT clauses so they cannot terminate the statement. */
export function sanitizeDefault(val: unknown): string {
  return String(val ?? '').replace(/;/g, '');
}

export interface DdlPlan {
  ddl: string;
  targetSchema: string;
  targetTable: string;
  changeType: string;
}

export function buildDdl(change: any): DdlPlan {
  const type = String(change?.type ?? '');
  const schema = assertIdent(change?.schema ?? 'public');
  const table = assertIdent(change?.table ?? '');

  switch (type) {
    case 'add_column': {
      const col = assertIdent(change?.column);
      const dtype = assertDataType(change?.data_type);
      const nullable = change?.nullable === false ? 'NOT NULL' : '';
      const def = change?.default ? `DEFAULT ${sanitizeDefault(change.default)}` : '';
      return {
        ddl: `ALTER TABLE ${schema}.${table} ADD COLUMN IF NOT EXISTS ${col} ${dtype} ${def} ${nullable}`.replace(/\s+/g, ' ').trim(),
        targetSchema: schema,
        targetTable: table,
        changeType: type,
      };
    }
    case 'create_table': {
      const columns = Array.isArray(change?.columns) ? change.columns : [];
      if (columns.length === 0) throw new Error('no_columns');
      const parts = columns.map((c: any) => {
        const name = assertIdent(c?.name);
        const dtype = assertDataType(c?.data_type);
        const nullable = c?.nullable === false ? 'NOT NULL' : '';
        const pk = c?.primary_key ? 'PRIMARY KEY' : '';
        const def = c?.default ? `DEFAULT ${sanitizeDefault(c.default)}` : '';
        return `${name} ${dtype} ${def} ${nullable} ${pk}`.replace(/\s+/g, ' ').trim();
      });
      return {
        ddl: `CREATE TABLE IF NOT EXISTS ${schema}.${table} (\n  ${parts.join(',\n  ')}\n)`,
        targetSchema: schema,
        targetTable: table,
        changeType: type,
      };
    }
    case 'create_index': {
      const idxName = assertIdent(change?.index_name);
      const cols: unknown[] = Array.isArray(change?.columns) ? change.columns : [];
      if (cols.length === 0) throw new Error('no_columns');
      const safeCols = cols.map(assertIdent);
      const unique = change?.unique ? 'UNIQUE' : '';
      return {
        ddl: `CREATE ${unique} INDEX IF NOT EXISTS ${idxName} ON ${schema}.${table} (${safeCols.join(', ')})`.replace(/\s+/g, ' ').trim(),
        targetSchema: schema,
        targetTable: table,
        changeType: type,
      };
    }
    default:
      throw new Error(`unsupported change type: ${type}`);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Dynamic Endpoint dispatcher safety.
// ──────────────────────────────────────────────────────────────────────────

/** Reject SQL that contains additional destructive statements. */
export function isUnsafeSql(sql: string): boolean {
  return /;\s*(DROP|ALTER|TRUNCATE|GRANT|REVOKE|CREATE)\b/i.test(sql);
}

export function isValidEndpointPath(path: string): boolean {
  return typeof path === 'string' && /^\/[A-Za-z0-9/_\-:.]+$/.test(path);
}

export const VALID_METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] as const;
export const VALID_HANDLERS = ['sql', 'query_table', 'insert_table', 'update_table', 'delete_table', 'static_json'] as const;

export type EndpointMethod = typeof VALID_METHODS[number];
export type HandlerType = typeof VALID_HANDLERS[number];

export function isValidMethod(m: unknown): m is EndpointMethod {
  return typeof m === 'string' && (VALID_METHODS as readonly string[]).includes(m);
}
export function isValidHandler(h: unknown): h is HandlerType {
  return typeof h === 'string' && (VALID_HANDLERS as readonly string[]).includes(h);
}

// ──────────────────────────────────────────────────────────────────────────
// In-memory sliding-minute rate limiter (pure — clock injected for testing).
// ──────────────────────────────────────────────────────────────────────────
export interface RateCounterStore {
  get(key: string): { count: number; windowStart: number } | undefined;
  set(key: string, value: { count: number; windowStart: number }): void;
}

export function checkRateLimit(
  store: RateCounterStore,
  key: string,
  limitPerMin: number,
  now: number,
): boolean {
  const rec = store.get(key);
  if (!rec || now - rec.windowStart > 60_000) {
    store.set(key, { count: 1, windowStart: now });
    return false;
  }
  rec.count += 1;
  store.set(key, rec);
  return rec.count > limitPerMin;
}
