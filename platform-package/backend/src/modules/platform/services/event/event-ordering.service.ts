import { safeQuery, tenantSchema } from '../../../../config/database';

const _entityLocks = new Map<string, Promise<void>>();

export function getEntityKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

export async function acquireEntitySequence(
  tenantId: string,
  entityType: string,
  entityId: string,
  eventId: string,
): Promise<number> {
  const schema = tenantSchema(tenantId);
  const entityKey = getEntityKey(entityType, entityId);

  try {
    const result = await safeQuery(
      `INSERT INTO "${schema}".event_entity_sequences (entity_key, sequence_num, last_event_id, updated_at)
       VALUES ($1, 1, $2, NOW())
       ON CONFLICT (entity_key) DO UPDATE SET
         sequence_num = event_entity_sequences.sequence_num + 1,
         last_event_id = $2,
         updated_at = NOW()
       RETURNING sequence_num`,
      [entityKey, eventId],
    );
    return result.rows[0]?.sequence_num ?? 0;
  } catch {
    return 0;
  }
}

export async function executeInEntityOrder<T>(
  entityType: string,
  entityId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = getEntityKey(entityType, entityId);
  const prev = _entityLocks.get(key) ?? Promise.resolve();

  const execution = prev.then(fn, fn);
  _entityLocks.set(key, execution.then(() => {}, () => {}));

  try {
    return await execution;
  } finally {
    if (_entityLocks.get(key) === execution.then(() => {}, () => {})) {
      _entityLocks.delete(key);
    }
  }
}

export function getActiveOrderingKeys(): number {
  return _entityLocks.size;
}
