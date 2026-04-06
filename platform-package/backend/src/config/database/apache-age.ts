// @ts-nocheck
import { Pool } from 'pg';
import { logger } from '../../platform/dos/observability/logger.service';
import { toErrorMessage } from '../../errors/http-error.util';
import { registerGraphBackend, type GraphBackendContract, type GraphNode, type GraphEdge, type GraphQueryResult } from '../../platform/contracts/graph-backend';
import { buildPgSslConfig } from './ssl-config';
import { getPlatformConnectionConfig } from './platform-db.config';

let pool: Pool | null = null;
let isConnected = false;
let graphName = process.env.AGE_GRAPH_NAME || 'dos_graph';

export async function connectApacheAGE(): Promise<boolean> {
  if (process.env.AGE_ENABLED !== 'true') {
    logger.info('[ApacheAGE] Disabled (AGE_ENABLED != true)');
    return false;
  }

  graphName = process.env.AGE_GRAPH_NAME || 'dos_graph';

  try {
    const dbConfig = getPlatformConnectionConfig();
    pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      ssl: buildPgSslConfig(),
      max: 5,
    });

    const client = await pool.connect();
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS age');
      await client.query('LOAD \'age\'');
      await client.query(`SET search_path = ag_catalog, "$user", public`);

      const exists = await client.query(
        `SELECT count(*) FROM ag_catalog.ag_graph WHERE name = $1`,
        [graphName],
      );
      if (parseInt(exists.rows[0].count, 10) === 0) {
        await client.query(`SELECT create_graph($1)`, [graphName]);
        logger.info(`[ApacheAGE] Graph created: ${graphName}`);
      }

      isConnected = true;
      logger.info(`[ApacheAGE] Connected (graph: ${graphName})`);
      registerGraphBackend(apacheAgeBackend);
      return true;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    logger.warn(`[ApacheAGE] Connection failed: ${toErrorMessage(err)}`);
    isConnected = false;
    return false;
  }
}

export function ageConnected(): boolean {
  return isConnected;
}

export async function cypherQuery(query: string, params?: Record<string, unknown>): Promise<any[]> {
  if (!pool || !isConnected) return [];
  const client = await pool.connect();
  try {
    await client.query('LOAD \'age\'');
    await client.query(`SET search_path = ag_catalog, "$user", public`);
    const paramStr = params ? `, ${JSON.stringify(params)}::agtype` : '';
    const result = await client.query(
      `SELECT * FROM cypher('${graphName}', $$ ${query} $$${paramStr}) as (result agtype)`,
    );
    return result.rows.map((r: unknown) => r.result);
  } catch (err: unknown) {
    logger.error(`[ApacheAGE] Cypher query failed: ${toErrorMessage(err)}`);
    return [];
  } finally {
    client.release();
  }
}

export async function createVertex(label: string, properties: Record<string, unknown>): Promise<unknown> {
  const props = JSON.stringify(properties).replace(/"/g, "'");
  return cypherQuery(`CREATE (n:${label} ${props}) RETURN n`);
}

export async function createEdge(
  fromLabel: string, fromProp: string, fromVal: string,
  toLabel: string, toProp: string, toVal: string,
  edgeLabel: string, properties: Record<string, unknown> = {},
): Promise<unknown> {
  const props = Object.keys(properties).length
    ? JSON.stringify(properties).replace(/"/g, "'")
    : '';
  return cypherQuery(
    `MATCH (a:${fromLabel} {${fromProp}: '${fromVal}'}), (b:${toLabel} {${toProp}: '${toVal}'}) ` +
    `CREATE (a)-[e:${edgeLabel} ${props}]->(b) RETURN e`,
  );
}

export async function disconnectApacheAGE(): Promise<void> {
  if (pool) {
    await pool.end();
  }
  pool = null;
  isConnected = false;
  logger.info('[ApacheAGE] Disconnected');
}

const apacheAgeBackend: GraphBackendContract = {
  type: 'apache-age',

  async createNode(tenantId: string, label: string, properties: Record<string, unknown>): Promise<GraphNode | null> {
    const props = { ...properties, tenantId };
    const results = await createVertex(label, props);
    if (!results || results.length === 0) return null;
    return { id: String(results[0]?.id ?? ''), label, properties: props };
  },

  async createEdge(tenantId: string, label: string, sourceId: string, targetId: string, properties?: Record<string, unknown>): Promise<GraphEdge | null> {
    const results = await cypherQuery(
      `MATCH (a {tenantId: '${tenantId}'}), (b {tenantId: '${tenantId}'}) WHERE id(a) = ${sourceId} AND id(b) = ${targetId} CREATE (a)-[e:${label} ${JSON.stringify(properties ?? {}).replace(/"/g, "'")}]->(b) RETURN e`,
    );
    if (!results || results.length === 0) return null;
    return { id: String(results[0]?.id ?? ''), label, sourceId, targetId, properties: properties ?? {} };
  },

  async queryNeighbors(tenantId: string, nodeId: string, depth: number = 1): Promise<GraphQueryResult> {
    const results = await cypherQuery(
      `MATCH (a)-[e*1..${depth}]-(b) WHERE id(a) = ${nodeId} AND a.tenantId = '${tenantId}' RETURN a, e, b`,
    );
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    for (const r of results) {
      if (r && typeof r === 'object') {
        nodes.push({ id: String(r.id ?? ''), label: r.label ?? '', properties: r.properties ?? {} });
      }
    }
    return { nodes, edges };
  },

  async queryPath(tenantId: string, sourceId: string, targetId: string): Promise<GraphNode[]> {
    const results = await cypherQuery(
      `MATCH p = shortestPath((a)-[*]-(b)) WHERE id(a) = ${sourceId} AND id(b) = ${targetId} AND a.tenantId = '${tenantId}' RETURN nodes(p)`,
    );
    return (results ?? []).map((r: unknown) => ({ id: String(r?.id ?? ''), label: r?.label ?? '', properties: r?.properties ?? {} }));
  },

  async deleteNode(tenantId: string, nodeId: string): Promise<boolean> {
    const results = await cypherQuery(
      `MATCH (a) WHERE id(a) = ${nodeId} AND a.tenantId = '${tenantId}' DETACH DELETE a RETURN true`,
    );
    return results.length > 0;
  },

  async deleteEdge(_tenantId: string, edgeId: string): Promise<boolean> {
    const results = await cypherQuery(
      `MATCH ()-[e]->() WHERE id(e) = ${edgeId} DELETE e RETURN true`,
    );
    return results.length > 0;
  },
};
