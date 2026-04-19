import { describe, it, expect } from 'vitest';
import {
  assertIdent, assertDataType, sanitizeDefault, buildDdl,
  isUnsafeSql, isValidEndpointPath, isValidMethod, isValidHandler,
  checkRateLimit, type RateCounterStore,
} from './lowcode.helpers';

// ──────────────────────────────────────────────────────────────────────────
// Identifier + type validation (schema designer).
// ──────────────────────────────────────────────────────────────────────────
describe('assertIdent', () => {
  it('accepts snake_case and CamelCase up to 63 chars', () => {
    expect(assertIdent('tenants')).toBe('tenants');
    expect(assertIdent('page_catalog_versions')).toBe('page_catalog_versions');
    expect(assertIdent('MyTable9')).toBe('MyTable9');
    expect(assertIdent('_private')).toBe('_private');
  });

  it('rejects injection attempts and out-of-band characters', () => {
    const bad = [
      'drop table users; --',
      'tenants; DROP TABLE users',
      'tenants)',
      'tenants"',
      "tenants'",
      'tenants SELECT',
      'tenants/*',
      '',
      ' ',
      '1tenants',
      'a'.repeat(64),
    ];
    for (const b of bad) expect(() => assertIdent(b)).toThrow(/invalid identifier/);
  });

  it('rejects non-string input', () => {
    expect(() => assertIdent(undefined as any)).toThrow();
    expect(() => assertIdent(null as any)).toThrow();
    expect(() => assertIdent(42 as any)).toThrow();
    expect(() => assertIdent({} as any)).toThrow();
  });
});

describe('assertDataType', () => {
  it('accepts canonical pg types (case-insensitive)', () => {
    expect(assertDataType('text')).toBe('text');
    expect(assertDataType('JSONB')).toBe('jsonb');
    expect(assertDataType('TimestampTZ')).toBe('timestamptz');
  });

  it('rejects unknown types and SQL fragments', () => {
    for (const b of ['custom_t', 'text)', 'bigint CHECK (x > 0)', 'text; DROP TABLE x']) {
      expect(() => assertDataType(b)).toThrow(/disallowed type/);
    }
  });
});

describe('sanitizeDefault', () => {
  it('strips semicolons so DEFAULT cannot terminate the statement', () => {
    expect(sanitizeDefault("'draft'; DROP TABLE x")).toBe("'draft' DROP TABLE x");
    expect(sanitizeDefault('NOW()')).toBe('NOW()');
    expect(sanitizeDefault(42)).toBe('42');
    expect(sanitizeDefault(null)).toBe('');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// DDL builder — must produce additive-only statements.
// ──────────────────────────────────────────────────────────────────────────
describe('buildDdl', () => {
  it('add_column emits ALTER TABLE … ADD COLUMN IF NOT EXISTS', () => {
    const plan = buildDdl({
      type: 'add_column', schema: 'public', table: 'tenants',
      column: 'archived_at', data_type: 'timestamptz', nullable: true,
    });
    expect(plan.ddl).toBe('ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS archived_at timestamptz');
    expect(plan.targetSchema).toBe('public');
    expect(plan.targetTable).toBe('tenants');
    expect(plan.changeType).toBe('add_column');
  });

  it('add_column DEFAULT cannot terminate the statement (semicolons stripped)', () => {
    const plan = buildDdl({
      type: 'add_column', schema: 'public', table: 'tenants',
      column: 'status', data_type: 'text', default: "'draft'; DROP TABLE users",
    });
    // The literal DEFAULT value may still contain the tokens, but it must not
    // be able to close the ALTER TABLE statement and start a new one.
    expect(plan.ddl).not.toContain(';');
    expect((plan.ddl.match(/;/g) || []).length).toBe(0);
  });

  it('create_table requires columns', () => {
    expect(() => buildDdl({ type: 'create_table', schema: 'public', table: 't', columns: [] })).toThrow('no_columns');
  });

  it('create_table emits CREATE TABLE IF NOT EXISTS with validated columns', () => {
    const plan = buildDdl({
      type: 'create_table', schema: 'public', table: 'crm_contacts',
      columns: [
        { name: 'id', data_type: 'uuid', primary_key: true, nullable: false },
        { name: 'email', data_type: 'text', nullable: false },
      ],
    });
    expect(plan.ddl).toContain('CREATE TABLE IF NOT EXISTS public.crm_contacts');
    expect(plan.ddl).toContain('id uuid NOT NULL PRIMARY KEY');
    expect(plan.ddl).toContain('email text NOT NULL');
  });

  it('create_index emits UNIQUE when requested', () => {
    const plan = buildDdl({
      type: 'create_index', schema: 'public', table: 'tenants',
      index_name: 'idx_tenants_slug', unique: true, columns: ['slug'],
    });
    expect(plan.ddl).toBe('CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants (slug)');
  });

  it('rejects unsupported change types', () => {
    expect(() => buildDdl({ type: 'drop_table', schema: 'public', table: 't' })).toThrow(/unsupported change type/);
    expect(() => buildDdl({ type: 'alter_column', schema: 'public', table: 't' })).toThrow(/unsupported change type/);
  });

  it('rejects SQL injection in schema / table / column names', () => {
    expect(() => buildDdl({ type: 'add_column', schema: 'public; DROP TABLE users', table: 't', column: 'c', data_type: 'text' })).toThrow();
    expect(() => buildDdl({ type: 'add_column', schema: 'public', table: 't)', column: 'c', data_type: 'text' })).toThrow();
    expect(() => buildDdl({ type: 'create_index', schema: 'public', table: 't', index_name: 'x', columns: ['col;DROP'] })).toThrow();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Dispatcher safety.
// ──────────────────────────────────────────────────────────────────────────
describe('isUnsafeSql', () => {
  it('blocks piggy-backed DDL', () => {
    expect(isUnsafeSql('SELECT 1; DROP TABLE users')).toBe(true);
    expect(isUnsafeSql('SELECT 1;\nALTER TABLE x ADD COLUMN y text')).toBe(true);
    expect(isUnsafeSql('SELECT 1; TRUNCATE users')).toBe(true);
    expect(isUnsafeSql('SELECT 1; GRANT ALL ON users TO attacker')).toBe(true);
    expect(isUnsafeSql('SELECT 1; CREATE TABLE x (a text)')).toBe(true);
  });

  it('allows single-statement queries', () => {
    expect(isUnsafeSql('SELECT * FROM tenants WHERE id = $1')).toBe(false);
    expect(isUnsafeSql('INSERT INTO tenants (name) VALUES ($1) RETURNING id')).toBe(false);
    expect(isUnsafeSql('UPDATE tenants SET name = $1 WHERE id = $2')).toBe(false);
  });
});

describe('isValidEndpointPath', () => {
  it('accepts well-formed paths with params', () => {
    expect(isValidEndpointPath('/tenants/list')).toBe(true);
    expect(isValidEndpointPath('/tenants/:id/activate')).toBe(true);
    expect(isValidEndpointPath('/crm/contacts')).toBe(true);
  });

  it('rejects paths missing leading slash or containing unsafe chars', () => {
    expect(isValidEndpointPath('tenants')).toBe(false);
    expect(isValidEndpointPath('/tenants?admin=1')).toBe(false);
    expect(isValidEndpointPath('/tenants; DROP')).toBe(false);
    expect(isValidEndpointPath('/tenants<script>')).toBe(false);
    expect(isValidEndpointPath('')).toBe(false);
  });
});

describe('isValidMethod / isValidHandler', () => {
  it('accepts HTTP methods in the allow-list', () => {
    for (const m of ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']) expect(isValidMethod(m)).toBe(true);
    expect(isValidMethod('HEAD')).toBe(false);
    expect(isValidMethod('TRACE')).toBe(false);
    expect(isValidMethod('get')).toBe(false); // case-sensitive
  });

  it('accepts handler types in the allow-list', () => {
    for (const h of ['sql', 'query_table', 'insert_table', 'update_table', 'delete_table', 'static_json']) {
      expect(isValidHandler(h)).toBe(true);
    }
    expect(isValidHandler('exec_shell')).toBe(false);
    expect(isValidHandler('eval_js')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Rate limiter — clock is injected so we can simulate window transitions.
// ──────────────────────────────────────────────────────────────────────────
function makeStore(): RateCounterStore {
  const m = new Map<string, { count: number; windowStart: number }>();
  return { get: (k) => m.get(k), set: (k, v) => { m.set(k, v); } };
}

describe('checkRateLimit', () => {
  it('allows up to `limit` calls per minute, then rejects', () => {
    const store = makeStore();
    const t0 = 1_000_000;
    for (let i = 1; i <= 5; i++) {
      expect(checkRateLimit(store, 'user:1', 5, t0 + i)).toBe(false);
    }
    // 6th call in the same window → limited.
    expect(checkRateLimit(store, 'user:1', 5, t0 + 10)).toBe(true);
  });

  it('resets the window after 60 seconds', () => {
    const store = makeStore();
    const t0 = 0;
    for (let i = 0; i < 5; i++) checkRateLimit(store, 'k', 5, t0);
    expect(checkRateLimit(store, 'k', 5, t0)).toBe(true);       // limited
    expect(checkRateLimit(store, 'k', 5, t0 + 60_001)).toBe(false); // new window
  });

  it('isolates counters per key (user-scoped limiting)', () => {
    const store = makeStore();
    for (let i = 0; i < 5; i++) checkRateLimit(store, 'a', 5, 0);
    expect(checkRateLimit(store, 'a', 5, 0)).toBe(true);
    expect(checkRateLimit(store, 'b', 5, 0)).toBe(false);
  });
});
