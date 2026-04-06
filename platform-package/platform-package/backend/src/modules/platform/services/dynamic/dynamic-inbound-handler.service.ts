// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

export interface DbInboundHandler {
  handler_code: string;
  handler_type: string;
  sql_template: string | null;
  target_table: string | null;
  target_action: string;
  field_mapping: Record<string, string>;
  enabled: boolean;
}

let _handlerCache: DbInboundHandler[] = [];
let _cacheLoadedAt = 0;
const CACHE_TTL_MS = 60_000;

export async function loadDbHandlers(tenantId: string): Promise<DbInboundHandler[]> {
  const now = Date.now();
  if (_handlerCache.length > 0 && now - _cacheLoadedAt < CACHE_TTL_MS) return _handlerCache;

  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT handler_code, handler_type, sql_template, target_table, target_action, field_mapping, enabled
       FROM "${schema}".inbound_handler_registry WHERE enabled = TRUE ORDER BY handler_code`,
    );
    _handlerCache = result.rows as DbInboundHandler[];
    _cacheLoadedAt = now;
  } catch {
    _handlerCache = [];
  }
  return _handlerCache;
}

export function invalidateHandlerCache(): void {
  _cacheLoadedAt = 0;
}

function interpolateFields(mapping: Record<string, string>, payload: Record<string, any>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, template] of Object.entries(mapping)) {
    result[key] = String(template).replace(/\{(\w+)\}/g, (_, field) => {
      return payload[field] !== undefined ? String(payload[field]) : '';
    });
  }
  return result;
}

export async function executeDbHandler(
  tenantId: string,
  handlerCode: string,
  payload: Record<string, any>,
): Promise<{ executed: boolean; error?: string }> {
  const schema = tenantSchema(tenantId);
  const handlers = await loadDbHandlers(tenantId);
  const handler = handlers.find(h => h.handler_code === handlerCode);

  if (!handler) {
    return { executed: false, error: `Handler ${handlerCode} not found` };
  }

  try {
    const fields = interpolateFields(handler.field_mapping, payload);

    if (handler.handler_type === 'sql' && handler.sql_template) {
      const values = Object.values(fields);
      const sql = handler.sql_template.replace(/\$(\d+)/g, (_, num) => `$${num}`);
      await safeQuery(`${sql.split('$').length > 1 ? sql : sql}`, values.length > 0 ? values : undefined);
    } else if (handler.handler_type === 'sql' && handler.target_table) {
      const columns = Object.keys(fields);
      const values = Object.values(fields);
      const placeholders = values.map((_, i) => `$${i + 1}`);

      if (handler.target_action === 'insert') {
        await safeQuery(
          `INSERT INTO "${schema}"."${handler.target_table}" (${columns.join(', ')})
           VALUES (${placeholders.join(', ')})
           ON CONFLICT DO NOTHING`,
          values,
        );
      } else if (handler.target_action === 'update') {
        const idCol = columns[0];
        const __idVal = values[0];
        const setClauses = columns.slice(1).map((col, i) => `"${col}" = $${i + 2}`);
        if (setClauses.length > 0) {
          await safeQuery(
            `UPDATE "${schema}"."${handler.target_table}"
             SET ${setClauses.join(', ')}, updated_at = NOW()
             WHERE "${idCol}" = $1`,
            values,
          );
        }
      }
    }

    return { executed: true };
  } catch (err) {
    const error = (err as Error).message;
    logger.warn(`[DynamicInbound] Handler ${handlerCode} failed: ${error}`);
    return { executed: false, error };
  }
}

export async function listHandlers(tenantId: string): Promise<DbInboundHandler[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".inbound_handler_registry ORDER BY handler_code`,
    );
    return result.rows as DbInboundHandler[];
  } catch {
    return [];
  }
}

export async function upsertHandler(
  tenantId: string,
  handler: Partial<DbInboundHandler> & { handler_code: string },
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `INSERT INTO "${schema}".inbound_handler_registry
       (handler_code, handler_type, description, sql_template, target_table, target_action, field_mapping, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (handler_code) DO UPDATE SET
         handler_type = COALESCE(EXCLUDED.handler_type, inbound_handler_registry.handler_type),
         sql_template = COALESCE(EXCLUDED.sql_template, inbound_handler_registry.sql_template),
         target_table = COALESCE(EXCLUDED.target_table, inbound_handler_registry.target_table),
         target_action = COALESCE(EXCLUDED.target_action, inbound_handler_registry.target_action),
         field_mapping = COALESCE(EXCLUDED.field_mapping, inbound_handler_registry.field_mapping),
         enabled = COALESCE(EXCLUDED.enabled, inbound_handler_registry.enabled),
         updated_at = NOW()`,
      [
        handler.handler_code,
        handler.handler_type || 'sql',
        null,
        handler.sql_template || null,
        handler.target_table || null,
        handler.target_action || 'insert',
        JSON.stringify(handler.field_mapping || {}),
        handler.enabled !== false,
      ],
    );
    invalidateHandlerCache();
    return true;
  } catch {
    return false;
  }
}
