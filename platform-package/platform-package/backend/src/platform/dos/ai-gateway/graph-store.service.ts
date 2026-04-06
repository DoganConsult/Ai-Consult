import { toErrorMessage } from '../../../errors/http-error.util';
import { logger } from '../logger';
import { getPool } from '../../../config/database/database';

const GRAPH_NAME = process.env.AGE_GRAPH_NAME || 'dos_platform_graph';

const LABEL_RE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const PROP_KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;
const MAX_DEPTH = 10;

function assertLabel(value: string, field: string): void {
  if (!LABEL_RE.test(value)) {
    throw new Error(`Invalid Cypher label for ${field}: ${value}`);
  }
}

function assertPropKey(key: string): void {
  if (!PROP_KEY_RE.test(key)) {
    throw new Error(`Invalid Cypher property key: ${key}`);
  }
}

function escapeCypherString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function serializeProps(properties: Record<string, unknown>): string {
  const pairs = Object.entries(properties).map(([k, v]) => {
    assertPropKey(k);
    if (typeof v === 'number') return `${k}: ${v}`;
    if (typeof v === 'boolean') return `${k}: ${v}`;
    return `${k}: '${escapeCypherString(String(v))}'`;
  });
  return `{${pairs.join(', ')}}`;
}

async function ageQuery(cypher: string): Promise<any[]> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("LOAD 'age';");
    await client.query("SET search_path = ag_catalog, public;");
    const result = await client.query(
      `SELECT * FROM ag_catalog.cypher('${GRAPH_NAME}', $$ ${cypher} $$) AS (result agtype)`,
    );
    return result.rows.map((r: any) => r.result);
  } catch (err: unknown) {
    logger.error(`[GraphStore] ageQuery failed: ${toErrorMessage(err)}`);
    return [];
  } finally {
    client.release();
  }
}

export async function ensureGraph(): Promise<boolean> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("LOAD 'age';");
    await client.query("SET search_path = ag_catalog, public;");
    const exists = await client.query(
      "SELECT count(*) AS c FROM ag_catalog.ag_graph WHERE name = $1",
      [GRAPH_NAME],
    );
    if (parseInt(exists.rows[0]?.c || '0', 10) === 0) {
      await client.query(`SELECT ag_catalog.create_graph('${GRAPH_NAME}')`);
    }
    return true;
  } catch (err: unknown) {
    logger.warn(`[GraphStore] ensureGraph failed: ${toErrorMessage(err)}`);
    return false;
  } finally {
    client.release();
  }
}

export async function createNode(
  tenantId: string,
  label: string,
  properties: Record<string, unknown>,
): Promise<unknown> {
  assertLabel(label, 'label');
  const props = serializeProps({ ...properties, _tenantId: tenantId });
  return ageQuery(`CREATE (n:${label} ${props}) RETURN n`);
}

export async function createEdge(
  tenantId: string,
  fromLabel: string,
  fromProp: string,
  fromValue: string,
  toLabel: string,
  toProp: string,
  toValue: string,
  edgeLabel: string,
  edgeProps: Record<string, unknown> = {},
): Promise<unknown> {
  assertLabel(fromLabel, 'fromLabel');
  assertLabel(toLabel, 'toLabel');
  assertLabel(edgeLabel, 'edgeLabel');
  assertPropKey(fromProp);
  assertPropKey(toProp);
  const safeFV = escapeCypherString(fromValue);
  const safeTV = escapeCypherString(toValue);
  const safeTenant = escapeCypherString(tenantId);
  const props = Object.keys(edgeProps).length > 0
    ? serializeProps({ ...edgeProps, _tenantId: tenantId })
    : `{_tenantId: '${safeTenant}'}`;
  return ageQuery(
    `MATCH (a:${fromLabel} {${fromProp}: '${safeFV}', _tenantId: '${safeTenant}'}), (b:${toLabel} {${toProp}: '${safeTV}', _tenantId: '${safeTenant}'})
     CREATE (a)-[r:${edgeLabel} ${props}]->(b) RETURN r`,
  );
}

export async function queryNodes(
  tenantId: string,
  label: string,
  filter?: Record<string, string>,
): Promise<any[]> {
  assertLabel(label, 'label');
  const safeTenant = escapeCypherString(tenantId);
  const filterParts = [`_tenantId: '${safeTenant}'`];
  if (filter) {
    Object.entries(filter).forEach(([k, v]) => {
      assertPropKey(k);
      filterParts.push(`${k}: '${escapeCypherString(v)}'`);
    });
  }
  return ageQuery(`MATCH (n:${label} {${filterParts.join(', ')}}) RETURN n`);
}

export async function queryRelationships(
  tenantId: string,
  fromLabel: string,
  edgeLabel: string,
  toLabel: string,
  depth: number = 1,
): Promise<any[]> {
  assertLabel(fromLabel, 'fromLabel');
  assertLabel(edgeLabel, 'edgeLabel');
  assertLabel(toLabel, 'toLabel');
  const safeDepth = Math.max(1, Math.min(Math.floor(depth), MAX_DEPTH));
  const safeTenant = escapeCypherString(tenantId);
  return ageQuery(
    `MATCH (a:${fromLabel} {_tenantId: '${safeTenant}'})-[r:${edgeLabel}*1..${safeDepth}]->(b:${toLabel}) RETURN a, r, b`,
  );
}
