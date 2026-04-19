import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Structural probes for the low-code migrations. These run without a database
 * and guard the invariants that the runtime code relies on:
 *
 *  1. Every low-code table is **platform-level** (no tenant_id column,
 *     no ENABLE ROW LEVEL SECURITY) — leaking tenant isolation here would
 *     mean one tenant could author pages/endpoints for another.
 *  2. The tables the TypeScript code queries actually exist in the SQL.
 *  3. Additive-only: no DROP / TRUNCATE / DELETE FROM statements.
 */
const MIGRATIONS_DIR = join(__dirname, '..', '..', '..', '..', 'migrations', 'master');

function read(name: string): string {
  return readFileSync(join(MIGRATIONS_DIR, name), 'utf8');
}

const LOWCODE_TABLES = [
  'page_catalog',
  'page_catalog_versions',
  'dynamic_endpoints',
  'ai_agent_graphs',
  'plugin_registry',
  'admin_action_approvals',
  'schema_changes',
];

describe('low-code migration 116', () => {
  const sql = read('116_lowcode_core.sql');

  it.each(LOWCODE_TABLES)('declares CREATE TABLE IF NOT EXISTS for %s', (table) => {
    expect(sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${table}\\b`, 'i'));
  });

  it('does not use tenant_id / ENABLE ROW LEVEL SECURITY — tables are platform-level', () => {
    expect(/tenant_id/i.test(sql)).toBe(false);
    expect(/ENABLE ROW LEVEL SECURITY/i.test(sql)).toBe(false);
  });

  it('is additive-only (no DROP / TRUNCATE / DELETE FROM)', () => {
    expect(/\bDROP\s+TABLE\b/i.test(sql)).toBe(false);
    expect(/\bTRUNCATE\b/i.test(sql)).toBe(false);
    expect(/\bDELETE\s+FROM\b/i.test(sql)).toBe(false);
  });
});

describe('low-code migration 117 (workflow_specs)', () => {
  const sql = read('117_lowcode_workflows.sql');

  it('creates workflow_specs at platform level', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS\s+workflow_specs\b/);
    expect(/tenant_id/i.test(sql)).toBe(false);
    expect(/ENABLE ROW LEVEL SECURITY/i.test(sql)).toBe(false);
  });

  it('constrains trigger_type to the known set', () => {
    expect(sql).toMatch(/trigger_type IN \('manual', 'event', 'cron', 'endpoint'\)/);
  });
});
