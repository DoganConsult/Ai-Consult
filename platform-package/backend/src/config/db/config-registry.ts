import { safeQuery } from '../database/database';
import { logger } from '../../platform/dos/observability/logger.service';

export const configRepository = {
  async get(key: string): Promise<string | null> {
    const result = await safeQuery(`SELECT config_value FROM platform_operation_config WHERE config_key = $1`, [key]).catch(() => ({ rows: [] }));
    return result.rows[0]?.config_value ?? null;
  },
  async set(key: string, value: string): Promise<void> {
    await safeQuery(
      `INSERT INTO platform_operation_config (config_key, config_value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (config_key) DO UPDATE SET config_value = $2, updated_at = NOW()`,
      [key, value]
    ).catch(() => {});
  },
};

export const configBridge = {
  async initialize(): Promise<{ loaded: number; synced: number }> {
    let loaded = 0;
    try {
      const result = await safeQuery(`SELECT count(*)::int AS c FROM platform_operation_config`);
      loaded = result.rows[0]?.c ?? 0;
    } catch { /* table may not exist yet */ }
    return { loaded, synced: 0 };
  },
};
