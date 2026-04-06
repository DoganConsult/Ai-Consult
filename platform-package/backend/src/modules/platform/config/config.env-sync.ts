import type { ConfigRepository } from './config.repository';
import type { ConfigDefinition, ConfigScopeType } from './config.types';

interface EnvSyncMapping {
  envKey: string;
  configKey: string;
  scopeType: ConfigScopeType;
  scopeId: string;
  parseAs: 'boolean' | 'number' | 'string' | 'string_array' | 'json';
}

const ENV_SYNC_MAP: EnvSyncMapping[] = [
  { envKey: 'TEMPORAL_ENABLED', configKey: 'feature.temporal.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'TEMPORAL_PROVISIONING_ENABLED', configKey: 'feature.temporal.provisioning.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'OPENFGA_ENABLED', configKey: 'feature.openfga.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'BULLMQ_ENABLED', configKey: 'feature.bullmq.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'PGMQ_ENABLED', configKey: 'feature.pgmq.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'AGE_ENABLED', configKey: 'feature.age.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'AZURE_KEYVAULT_ENABLED', configKey: 'feature.keyvault.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'ASYNCAPI_VALIDATION_ENABLED', configKey: 'feature.asyncapi.validation.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'METRICS_ENABLED', configKey: 'feature.metrics.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'LANGFUSE_ENABLED', configKey: 'feature.langfuse.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'LANGGRAPH_AGENTS_ENABLED', configKey: 'feature.langgraph.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'LANGGRAPH_METRICS_ENABLED', configKey: 'feature.langgraph.metrics.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'CLICKHOUSE_ENABLED', configKey: 'feature.clickhouse.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'MCP_ENABLED', configKey: 'feature.mcp.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'RLS_ENABLED', configKey: 'feature.rls.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'OTEL_ENABLED', configKey: 'feature.otel.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'PGVECTOR_ENABLED', configKey: 'feature.pgvector.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'UNSTRUCTURED_ENABLED', configKey: 'feature.unstructured.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'OPENCLAW_ENABLED', configKey: 'feature.openclaw.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'OPENCLAW_RATE_LIMIT_ENABLED', configKey: 'feature.openclaw.rateLimit.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'DOGAN_AI_OS_ENABLED', configKey: 'feature.doganAiOs.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'PLAYWRIGHT_MCP_ENABLED', configKey: 'feature.playwright.mcp.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'CISO_ASSISTANT_ENABLED', configKey: 'feature.cisoAssistant.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'OPENPROJECT_ENABLED', configKey: 'feature.openproject.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'GOVREADY_ENABLED', configKey: 'feature.govready.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'AGRC_AI_ENABLED', configKey: 'ai.agrc.enabled', scopeType: 'platform', scopeId: 'global', parseAs: 'boolean' },
  { envKey: 'LOG_LEVEL', configKey: 'platform.logging.level', scopeType: 'platform', scopeId: 'global', parseAs: 'string' },
  { envKey: 'PG_POOL_MAX', configKey: 'platform.performance.dbPoolMax', scopeType: 'platform', scopeId: 'global', parseAs: 'number' },
];

function parseValue(raw: string, parseAs: EnvSyncMapping['parseAs']): unknown {
  switch (parseAs) {
    case 'boolean':
      return raw === 'true';
    case 'number':
      return Number(raw);
    case 'string':
      return raw;
    case 'string_array':
      return raw.split(',').map(s => s.trim()).filter(Boolean);
    case 'json':
      return JSON.parse(raw);
    default:
      return raw;
  }
}

export async function syncEnvToConfigRegistry(
  repository: ConfigRepository,
): Promise<{ synced: number; skipped: number; errors: string[] }> {
  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];

  const defsCache = new Map<string, ConfigDefinition>();

  for (const mapping of ENV_SYNC_MAP) {
    const envVal = process.env[mapping.envKey];
    if (envVal === undefined || envVal === '') {
      skipped++;
      continue;
    }

    try {
      let def = defsCache.get(mapping.configKey);
      if (!def) {
        const found = await repository.findDefinitionByKey(mapping.configKey);
        if (!found) {
          skipped++;
          continue;
        }
        def = found;
        defsCache.set(mapping.configKey, def);
      }

      const existing = await repository.getValue(def.id, mapping.scopeType, mapping.scopeId);
      if (existing) {
        skipped++;
        continue;
      }

      const parsed = parseValue(envVal, mapping.parseAs);

      await repository.upsertValue({
        definitionId: def.id,
        scopeType: mapping.scopeType,
        scopeId: mapping.scopeId,
        value: parsed,
        source: 'bootstrap',
        notes: `Initial sync from env var ${mapping.envKey}`,
        isEncrypted: false,
        valueHash: null,
        actorUserId: undefined,
      });

      synced++;
    } catch (err) {
      errors.push(`${mapping.envKey} → ${mapping.configKey}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { synced, skipped, errors };
}

export function getEnvSyncMap(): EnvSyncMapping[] {
  return [...ENV_SYNC_MAP];
}
