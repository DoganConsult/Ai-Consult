import { safeQuery, tenantSchema } from '../../../../config/database';

export type EnforcementMode = 'audit' | 'warn' | 'enforce';

const VALID_MODES: EnforcementMode[] = ['audit', 'warn', 'enforce'];
const CONFIG_KEY = 'ai_governance_enforcement_mode';
const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  mode: EnforcementMode;
  expiresAt: number;
}

const _cache = new Map<string, CacheEntry>();

let _globalFallback: EnforcementMode = 'audit';

export function getGlobalFallbackMode(): EnforcementMode {
  return _globalFallback;
}

export function setGlobalFallbackMode(mode: EnforcementMode): void {
  if (!VALID_MODES.includes(mode)) {
    throw new Error(`Invalid enforcement mode: '${mode}'. Allowed: audit, warn, enforce`);
  }
  _globalFallback = mode;
}

export async function getTenantEnforcementMode(tenantId: string): Promise<EnforcementMode> {
  const cached = _cache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.mode;
  }

  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT config_value FROM "${schema}".platform_operation_config WHERE config_key = $1 AND owner_module = 'ai_governance' LIMIT 1`,
      [CONFIG_KEY],
    );
    if (result.rows.length > 0) {
      let raw = result.rows[0].config_value;
      if (typeof raw === 'string') {
        raw = raw.replace(/^"|"$/g, '');
      }
      if (VALID_MODES.includes(raw as EnforcementMode)) {
        const mode = raw as EnforcementMode;
        _cache.set(tenantId, { mode, expiresAt: Date.now() + CACHE_TTL_MS });
        return mode;
      }
    }
  } catch {
  }

  return _globalFallback;
}

export async function setTenantEnforcementMode(tenantId: string, mode: EnforcementMode): Promise<void> {
  if (!VALID_MODES.includes(mode)) {
    throw new Error(`Invalid enforcement mode: '${mode}'. Allowed: audit, warn, enforce`);
  }

  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".platform_operation_config (config_key, config_value, description_en, owner_module, owner_type, updated_at)
     VALUES ($1, $2, $3, 'ai_governance', 'module', NOW())
     ON CONFLICT (config_key, owner_module) DO UPDATE SET config_value = $2, updated_at = NOW()`,
    [CONFIG_KEY, JSON.stringify(mode), 'AI governance enforcement mode for model/agent registries'],
  );

  _cache.set(tenantId, { mode, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearEnforcementCache(tenantId?: string): void {
  if (tenantId) {
    _cache.delete(tenantId);
  } else {
    _cache.clear();
  }
}
