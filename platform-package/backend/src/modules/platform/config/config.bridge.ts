// @ts-nocheck
import type { ConfigDefinition, ConfigScopeType } from './config.types';
import type { ConfigRepository } from './config.repository';
import { SEED_CONFIG_DEFINITIONS } from './config.seed-definitions';

const ENV_TO_CONFIG_KEY: Record<string, string> = {
  TEMPORAL_ENABLED: 'feature.temporal.enabled',
  TEMPORAL_PROVISIONING_ENABLED: 'feature.temporal.provisioning.enabled',
  OPENFGA_ENABLED: 'feature.openfga.enabled',
  BULLMQ_ENABLED: 'feature.bullmq.enabled',
  PGMQ_ENABLED: 'feature.pgmq.enabled',
  AGE_ENABLED: 'feature.age.enabled',
  AZURE_KEYVAULT_ENABLED: 'feature.keyvault.enabled',
  ASYNCAPI_VALIDATION_ENABLED: 'feature.asyncapi.validation.enabled',
  METRICS_ENABLED: 'feature.metrics.enabled',
  LANGFUSE_ENABLED: 'feature.langfuse.enabled',
  LANGGRAPH_AGENTS_ENABLED: 'feature.langgraph.enabled',
  LANGGRAPH_METRICS_ENABLED: 'feature.langgraph.metrics.enabled',
  CLICKHOUSE_ENABLED: 'feature.clickhouse.enabled',
  MCP_ENABLED: 'feature.mcp.enabled',
  RLS_ENABLED: 'feature.rls.enabled',
  OTEL_ENABLED: 'feature.otel.enabled',
  PGVECTOR_ENABLED: 'feature.pgvector.enabled',
  UNSTRUCTURED_ENABLED: 'feature.unstructured.enabled',
  OPENCLAW_ENABLED: 'feature.openclaw.enabled',
  OPENCLAW_RATE_LIMIT_ENABLED: 'feature.openclaw.rateLimit.enabled',
  DOGAN_AI_OS_ENABLED: 'feature.doganAiOs.enabled',
  PLAYWRIGHT_MCP_ENABLED: 'feature.playwright.mcp.enabled',
  CISO_ASSISTANT_ENABLED: 'feature.cisoAssistant.enabled',
  OPENPROJECT_ENABLED: 'feature.openproject.enabled',
  GOVREADY_ENABLED: 'feature.govready.enabled',
  AGRC_AI_ENABLED: 'ai.agrc.enabled',
  LOG_LEVEL: 'platform.logging.level',
};

interface CacheEntry {
  value: unknown;
  loadedAt: number;
}

export class ConfigBridge {
  private cache = new Map<string, CacheEntry>();
  private definitions = new Map<string, ConfigDefinition>();
  private initialized = false;
  private readonly __cacheTtlMs: number;

  constructor(
    private readonly repository: ConfigRepository,
    cacheTtlMs = 60_000,
  ) {
    this.cacheTtlMs = cacheTtlMs;
  }

  async initialize(): Promise<{ loaded: number; synced: number }> {
    const allDefs = await this.repository.listDefinitions();
    for (const def of allDefs) {
      this.definitions.set(def.key, def);
    }

    let synced = 0;
    for (const [envKey, configKey] of Object.entries(ENV_TO_CONFIG_KEY)) {
      const envVal = process.env[envKey];
      if (envVal === undefined || envVal === '') continue;

      const def = this.definitions.get(configKey);
      if (!def) continue;

      const existing = await this.repository.getValue(def.id, 'platform', 'global');
      if (existing) continue;

      let parsed: unknown;
      if (def.valueType === 'boolean') {
        parsed = envVal === 'true';
      } else if (def.valueType === 'number') {
        parsed = Number(envVal);
      } else if (def.valueType === 'string_array') {
        parsed = envVal.split(',').map(s => s.trim());
      } else {
        parsed = envVal;
      }

      try {
        await this.repository.upsertValue({
          definitionId: def.id,
          scopeType: 'platform',
          scopeId: 'global',
          value: parsed,
          source: 'bootstrap',
          notes: `Synced from env var ${envKey}`,
          isEncrypted: false,
          valueHash: null,
          actorUserId: undefined,
        });
        synced++;
      } catch {
        // non-fatal
      }
    }

    await this.refreshCache();
    this.initialized = true;
    return { loaded: this.cache.size, synced };
  }

  async refreshCache(): Promise<void> {
    const allDefs = await this.repository.listDefinitions();
    this.definitions.clear();
    for (const def of allDefs) {
      this.definitions.set(def.key, def);
    }

    for (const def of allDefs) {
      const record = await this.repository.getValue(def.id, 'platform', 'global');
      const value = record ? record.value : def.defaultValue;
      this.cache.set(def.key, { value, loadedAt: Date.now() });
    }
  }

  get<T = unknown>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (entry) return entry.value as T;

    const def = this.definitions.get(key);
    if (def) return def.defaultValue as T;

    const seedDef = SEED_CONFIG_DEFINITIONS.find(d => d.key === key);
    if (seedDef) return seedDef.defaultValue as T;

    return undefined;
  }

  getBoolean(key: string, fallback = false): boolean {
    const val = this.get<boolean>(key);
    return typeof val === 'boolean' ? val : fallback;
  }

  getNumber(key: string, fallback = 0): number {
    const val = this.get<number>(key);
    return typeof val === 'number' ? val : fallback;
  }

  getString(key: string, fallback = ''): string {
    const val = this.get<string>(key);
    return typeof val === 'string' ? val : fallback;
  }

  getStringArray(key: string, fallback: string[] = []): string[] {
    const val = this.get<string[]>(key);
    return Array.isArray(val) ? val : fallback;
  }

  getJson<T = Record<string, unknown>>(key: string, fallback?: T): T {
    const val = this.get<T>(key);
    return val !== undefined ? val : (fallback as T);
  }

  isFeatureEnabled(featureKey: string): boolean {
    return this.getBoolean(featureKey, false);
  }

  resolveEnvFlag(envKey: string): boolean {
    const configKey = ENV_TO_CONFIG_KEY[envKey];
    if (configKey) {
      const dbVal = this.get<boolean>(configKey);
      if (typeof dbVal === 'boolean') return dbVal;
    }
    return process.env[envKey] === 'true';
  }

  getAllByCategory(category: string): Array<{ key: string; value: unknown; label: string }> {
    const results: Array<{ key: string; value: unknown; label: string }> = [];
    for (const [key, def] of this.definitions) {
      if (def.category !== category) continue;
      const entry = this.cache.get(key);
      results.push({
        key,
        value: entry ? entry.value : def.defaultValue,
        label: def.label,
      });
    }
    return results;
  }

  getAllFeatureFlags(): Array<{ key: string; enabled: boolean; label: string; requiresRestart: boolean }> {
    const results: Array<{ key: string; enabled: boolean; label: string; requiresRestart: boolean }> = [];
    for (const [key, def] of this.definitions) {
      if (def.category !== 'feature' && def.category !== 'external_service') continue;
      if (def.valueType !== 'boolean') continue;
      const entry = this.cache.get(key);
      results.push({
        key,
        enabled: (entry ? entry.value : def.defaultValue) === true,
        label: def.label,
        requiresRestart: def.requiresRestart,
      });
    }
    return results;
  }

  getDefinition(key: string): ConfigDefinition | undefined {
    return this.definitions.get(key);
  }

  listDefinitions(): ConfigDefinition[] {
    return [...this.definitions.values()];
  }

  listDefinitionsByDomain(domain: string): ConfigDefinition[] {
    return [...this.definitions.values()].filter(d => d.ownerDomain === domain);
  }

  async setValueDirect(
    key: string,
    value: unknown,
    scopeType: ConfigScopeType = 'platform',
    scopeId: string = 'global',
    actorUserId?: string,
  ): Promise<void> {
    const def = this.definitions.get(key);
    if (!def) throw new Error(`Unknown config key: ${key}`);

    await this.repository.upsertValue({
      definitionId: def.id,
      scopeType,
      scopeId,
      value,
      source: 'system',
      isEncrypted: false,
      valueHash: null,
      actorUserId,
    });

    this.cache.set(key, { value, loadedAt: Date.now() });
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getEnvKeyMapping(): Record<string, string> {
    return { ...ENV_TO_CONFIG_KEY };
  }

  toSnapshot(): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {};
    for (const [key, entry] of this.cache) {
      snapshot[key] = entry.value;
    }
    return snapshot;
  }
}

let _instance: ConfigBridge | null = null;

export function getConfigBridge(): ConfigBridge {
  if (!_instance) throw new Error('ConfigBridge not initialized. Call initConfigBridge() first.');
  return _instance;
}

export function initConfigBridge(repository: ConfigRepository): ConfigBridge {
  _instance = new ConfigBridge(repository);
  return _instance;
}

export function hasConfigBridge(): boolean {
  return _instance !== null;
}
