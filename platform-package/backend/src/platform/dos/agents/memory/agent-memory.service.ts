import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { v4 as uuid } from 'uuid';
import { getAgentDefinition } from '../registry/agent-registry.service';
import type { AgentMemoryEntry, MemoryScope } from '../contracts/agent.types';

export async function storeMemory(
  tenantId: string,
  entry: Omit<AgentMemoryEntry, 'memoryId' | 'createdAt'>,
): Promise<AgentMemoryEntry> {
  const memoryId = uuid();
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".dos_agent_memories
       (memory_id, agent_code, tenant_id, scope, run_id, key, value, importance, token_count, expires_at, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
    [
      memoryId, entry.agentCode, tenantId, entry.scope, entry.runId || null,
      entry.key, JSON.stringify(entry.value), entry.importance,
      entry.tokenCount, entry.expiresAt || null,
    ],
  );
  return { ...entry, memoryId, tenantId, createdAt: new Date().toISOString() };
}

export async function retrieveMemories(
  tenantId: string,
  agentCode: string,
  scope?: MemoryScope,
  limit = 100,
): Promise<AgentMemoryEntry[]> {
  const schema = tenantSchema(tenantId);
  const params: unknown[] = [agentCode, limit];
  let scopeClause = '';
  if (scope) {
    params.push(scope);
    scopeClause = ` AND scope = $${params.length}`;
  }
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".dos_agent_memories
     WHERE agent_code = $1 AND (expires_at IS NULL OR expires_at > NOW())${scopeClause}
     ORDER BY importance DESC, created_at DESC LIMIT $2`,
    params,
  );
  return rows.map(mapMemoryRow);
}

export async function retrieveByKey(
  tenantId: string,
  agentCode: string,
  key: string,
): Promise<AgentMemoryEntry | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".dos_agent_memories
     WHERE agent_code = $1 AND key = $2 AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at DESC LIMIT 1`,
    [agentCode, key],
  );
  return rows[0] ? mapMemoryRow(rows[0]) : null;
}

export async function retrieveSharedMemories(
  tenantId: string,
  requestingAgentCode?: string,
  limit = 50,
): Promise<AgentMemoryEntry[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".dos_agent_memories
     WHERE scope = 'shared' AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY importance DESC, created_at DESC LIMIT $1`,
    [limit],
  );
  const memories = rows.map(mapMemoryRow);
  if (!requestingAgentCode) return memories;
  const def = getAgentDefinition(requestingAgentCode);
  if (!def) return [];
  const allowedContexts = def.allowedContexts;
  if (allowedContexts.length === 0 || allowedContexts.includes('*')) return memories;
  return memories.filter(m => allowedContexts.includes(m.key) || allowedContexts.includes('shared'));
}

export async function deleteMemory(tenantId: string, memoryId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(`DELETE FROM "${schema}".dos_agent_memories WHERE memory_id = $1`, [memoryId]);
}

export async function deleteExpiredMemories(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".dos_agent_memories WHERE expires_at IS NOT NULL AND expires_at <= NOW()`,
    [],
  );
  return result.rowCount ?? 0;
}

export async function deleteAgentMemories(tenantId: string, agentCode: string, scope?: MemoryScope): Promise<number> {
  const schema = tenantSchema(tenantId);
  const params: unknown[] = [agentCode];
  let scopeClause = '';
  if (scope) {
    params.push(scope);
    scopeClause = ` AND scope = $${params.length}`;
  }
  const result = await safeQuery(
    `DELETE FROM "${schema}".dos_agent_memories WHERE agent_code = $1${scopeClause}`,
    params,
  );
  return result.rowCount ?? 0;
}

export async function getMemoryStats(
  tenantId: string,
  agentCode: string,
): Promise<{ totalCount: number; totalTokens: number; byScope: Record<string, number> }> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT scope, COUNT(*)::int AS cnt, COALESCE(SUM(token_count),0)::int AS tokens
     FROM "${schema}".dos_agent_memories WHERE agent_code = $1 GROUP BY scope`,
    [agentCode],
  );
  const byScope: Record<string, number> = {};
  let totalCount = 0;
  let totalTokens = 0;
  for (const r of rows) {
    byScope[r.scope] = r.cnt;
    totalCount += r.cnt;
    totalTokens += r.tokens;
  }
  return { totalCount, totalTokens, byScope };
}

function mapMemoryRow(r: Record<string, unknown>): AgentMemoryEntry {
  return {
    memoryId: r.memory_id as string,
    agentCode: r.agent_code as string,
    tenantId: r.tenant_id as string,
    scope: r.scope as MemoryScope,
    runId: (r.run_id as string) || undefined,
    key: r.key as string,
    value: typeof r.value === 'string' ? JSON.parse(r.value as string) : ((r.value as Record<string, unknown>) || {}),
    importance: r.importance as number,
    tokenCount: r.token_count as number,
    createdAt: (r.created_at as Date)?.toISOString?.() || '',
    expiresAt: (r.expires_at as Date)?.toISOString?.() || undefined,
  };
}

export const agentMemoryService = {
  storeMemory,
  retrieveMemories,
  retrieveByKey,
  retrieveSharedMemories,
  deleteMemory,
  deleteExpiredMemories,
  deleteAgentMemories,
  getMemoryStats,
};
