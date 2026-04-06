import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { publish } from '../../events/event-bus';

export interface MemoryGcResult {
  tenantId: string;
  expiredPurged: number;
  lowImportanceCompacted: number;
  tokensBefore: number;
  tokensAfter: number;
  gcDurationMs: number;
}

const MAX_MEMORIES_PER_AGENT = 500;
const LOW_IMPORTANCE_THRESHOLD = 2;
const COMPACTION_AGE_HOURS = 72;

export async function runMemoryGc(tenantId: string): Promise<MemoryGcResult> {
  const schema = tenantSchema(tenantId);
  const start = Date.now();

  const { rows: beforeRows } = await safeQuery(
    `SELECT COALESCE(SUM(token_count), 0)::int AS total_tokens FROM "${schema}".dos_agent_memories`,
    [],
  );
  const tokensBefore = beforeRows[0]?.total_tokens ?? 0;

  const expired = await safeQuery(
    `DELETE FROM "${schema}".dos_agent_memories
     WHERE expires_at IS NOT NULL AND expires_at <= NOW()`,
    [],
  );
  const expiredPurged = expired.rowCount ?? 0;

  const compacted = await safeQuery(
    `DELETE FROM "${schema}".dos_agent_memories
     WHERE importance <= $1
       AND created_at < NOW() - INTERVAL '${COMPACTION_AGE_HOURS} hours'
       AND scope NOT IN ('shared', 'agent')`,
    [LOW_IMPORTANCE_THRESHOLD],
  );
  const lowImportanceCompacted = compacted.rowCount ?? 0;

  await enforcePerAgentCap(schema);

  const { rows: afterRows } = await safeQuery(
    `SELECT COALESCE(SUM(token_count), 0)::int AS total_tokens FROM "${schema}".dos_agent_memories`,
    [],
  );
  const tokensAfter = afterRows[0]?.total_tokens ?? 0;

  const gcDurationMs = Date.now() - start;

  if (expiredPurged > 0 || lowImportanceCompacted > 0) {
    await publish('agent.memory.gc.completed', tenantId, {
      expiredPurged,
      lowImportanceCompacted,
      tokensReclaimed: tokensBefore - tokensAfter,
      gcDurationMs,
    });
  }

  return { tenantId, expiredPurged, lowImportanceCompacted, tokensBefore, tokensAfter, gcDurationMs };
}

async function enforcePerAgentCap(schema: string): Promise<void> {
  const { rows: agents } = await safeQuery(
    `SELECT agent_code, COUNT(*)::int AS cnt
     FROM "${schema}".dos_agent_memories
     GROUP BY agent_code
     HAVING COUNT(*) > $1`,
    [MAX_MEMORIES_PER_AGENT],
  );

  for (const a of agents) {
    const excess = a.cnt - MAX_MEMORIES_PER_AGENT;
    if (excess > 0) {
      await safeQuery(
        `DELETE FROM "${schema}".dos_agent_memories
         WHERE memory_id IN (
           SELECT memory_id FROM "${schema}".dos_agent_memories
           WHERE agent_code = $1
           ORDER BY importance ASC, created_at ASC
           LIMIT $2
         )`,
        [a.agent_code, excess],
      );
    }
  }
}

export const agentMemoryGcService = {
  runMemoryGc,
};
