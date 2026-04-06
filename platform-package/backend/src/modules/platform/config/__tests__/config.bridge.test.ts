import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConfigBridge } from '../config.bridge';
import type { ConfigRepository } from '../config.repository';
import type { ConfigDefinition, ConfigValueRecord } from '../config.types';

function makeDef(overrides: Partial<ConfigDefinition> & { key: string }): ConfigDefinition {
  return {
    id: `id-${overrides.key}`,
    label: overrides.label ?? overrides.key,
    ownerDomain: 'platform',
    category: 'feature',
    valueType: 'boolean',
    allowedScopes: ['platform'],
    defaultValue: false,
    isSecret: false,
    isRequired: false,
    isOverridable: false,
    isLockable: true,
    requiresRestart: false,
    deploymentOnly: false,
    sdkExposable: false,
    uiExposable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeValue(defId: string, value: unknown): ConfigValueRecord {
  return {
    id: `v-${defId}`,
    definitionId: defId,
    scopeType: 'platform',
    scopeId: 'global',
    value,
    isEncrypted: false,
    source: 'seed',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createMockRepo(defs: ConfigDefinition[], values: Map<string, ConfigValueRecord>): ConfigRepository {
  return {
    listDefinitions: vi.fn().mockResolvedValue(defs),
    findDefinitionByKey: vi.fn().mockImplementation((key: string) =>
      Promise.resolve(defs.find(d => d.key === key) ?? null)
    ),
    getValue: vi.fn().mockImplementation((defId: string) =>
      Promise.resolve(values.get(defId) ?? null)
    ),
    upsertValue: vi.fn().mockResolvedValue(null),
  } as any as ConfigRepository;
}

describe('ConfigBridge', () => {
  const defs = [
    makeDef({ key: 'feature.temporal.enabled', defaultValue: true }),
    makeDef({ key: 'feature.langfuse.enabled', defaultValue: false }),
    makeDef({ key: 'platform.logging.level', valueType: 'string', category: 'observability', defaultValue: 'info' }),
    makeDef({ key: 'platform.performance.dbPoolMax', valueType: 'number', category: 'performance', defaultValue: 20 }),
    makeDef({ key: 'ai.providers.allowed', valueType: 'string_array', category: 'ai', defaultValue: ['ollama'] }),
    makeDef({ key: 'feature.mcp.enabled', defaultValue: true, requiresRestart: true, category: 'feature' }),
    makeDef({ key: 'feature.cisoAssistant.enabled', defaultValue: true, category: 'external_service' }),
  ];

  describe('initialization with no DB values', () => {
    it('loads definitions and sets defaults in cache', async () => {
      const repo = createMockRepo(defs, new Map());
      const bridge = new ConfigBridge(repo);
      const result = await bridge.initialize();

      expect(result.loaded).toBe(defs.length);
      expect(bridge.isInitialized()).toBe(true);
      expect(bridge.getBoolean('feature.temporal.enabled')).toBe(true);
      expect(bridge.getBoolean('feature.langfuse.enabled')).toBe(false);
    });
  });

  describe('initialization with existing DB values', () => {
    it('DB value overrides definition default', async () => {
      const vals = new Map<string, ConfigValueRecord>();
      vals.set('id-feature.langfuse.enabled', makeValue('id-feature.langfuse.enabled', true));
      const repo = createMockRepo(defs, vals);
      const bridge = new ConfigBridge(repo);
      await bridge.initialize();

      expect(bridge.getBoolean('feature.langfuse.enabled')).toBe(true);
    });
  });

  describe('typed getters', () => {
    let bridge: ConfigBridge;
    beforeEach(async () => {
      const vals = new Map<string, ConfigValueRecord>();
      vals.set('id-platform.logging.level', makeValue('id-platform.logging.level', 'debug'));
      vals.set('id-platform.performance.dbPoolMax', makeValue('id-platform.performance.dbPoolMax', 30));
      vals.set('id-ai.providers.allowed', makeValue('id-ai.providers.allowed', ['azure', 'ollama']));
      const repo = createMockRepo(defs, vals);
      bridge = new ConfigBridge(repo);
      await bridge.initialize();
    });

    it('getString returns DB value', () => {
      expect(bridge.getString('platform.logging.level')).toBe('debug');
    });

    it('getString returns fallback for unknown key', () => {
      expect(bridge.getString('unknown.key', 'fallback')).toBe('fallback');
    });

    it('getNumber returns DB value', () => {
      expect(bridge.getNumber('platform.performance.dbPoolMax')).toBe(30);
    });

    it('getNumber returns fallback for missing key', () => {
      expect(bridge.getNumber('unknown.number', 42)).toBe(42);
    });

    it('getStringArray returns DB value', () => {
      expect(bridge.getStringArray('ai.providers.allowed')).toEqual(['azure', 'ollama']);
    });

    it('getStringArray returns fallback for missing key', () => {
      expect(bridge.getStringArray('unknown.arr', ['x'])).toEqual(['x']);
    });

    it('getBoolean returns fallback for wrong type', () => {
      expect(bridge.getBoolean('platform.logging.level', true)).toBe(true);
    });
  });

  describe('isFeatureEnabled', () => {
    it('returns true for enabled feature', async () => {
      const repo = createMockRepo(defs, new Map());
      const bridge = new ConfigBridge(repo);
      await bridge.initialize();
      expect(bridge.isFeatureEnabled('feature.temporal.enabled')).toBe(true);
    });

    it('returns false for disabled feature', async () => {
      const repo = createMockRepo(defs, new Map());
      const bridge = new ConfigBridge(repo);
      await bridge.initialize();
      expect(bridge.isFeatureEnabled('feature.langfuse.enabled')).toBe(false);
    });

    it('returns false for unknown feature', async () => {
      const repo = createMockRepo(defs, new Map());
      const bridge = new ConfigBridge(repo);
      await bridge.initialize();
      expect(bridge.isFeatureEnabled('feature.nonexistent')).toBe(false);
    });
  });

  describe('resolveEnvFlag', () => {
    it('prefers DB value over env var', async () => {
      process.env.TEMPORAL_ENABLED = 'false';
      const vals = new Map<string, ConfigValueRecord>();
      vals.set('id-feature.temporal.enabled', makeValue('id-feature.temporal.enabled', true));
      const repo = createMockRepo(defs, vals);
      const bridge = new ConfigBridge(repo);
      await bridge.initialize();

      expect(bridge.resolveEnvFlag('TEMPORAL_ENABLED')).toBe(true);
      delete process.env.TEMPORAL_ENABLED;
    });

    it('falls back to env var for unknown mapping', async () => {
      process.env.SOME_CUSTOM_FLAG = 'true';
      const repo = createMockRepo(defs, new Map());
      const bridge = new ConfigBridge(repo);
      await bridge.initialize();

      expect(bridge.resolveEnvFlag('SOME_CUSTOM_FLAG')).toBe(true);
      delete process.env.SOME_CUSTOM_FLAG;
    });

    it('returns false when neither DB nor env has value', async () => {
      const repo = createMockRepo([], new Map());
      const bridge = new ConfigBridge(repo);
      await bridge.initialize();

      expect(bridge.resolveEnvFlag('NONEXISTENT_FLAG')).toBe(false);
    });
  });

  describe('getAllFeatureFlags', () => {
    it('returns only boolean feature/external_service definitions', async () => {
      const repo = createMockRepo(defs, new Map());
      const bridge = new ConfigBridge(repo);
      await bridge.initialize();

      const flags = bridge.getAllFeatureFlags();
      expect(flags.length).toBe(4);
      expect(flags.every(f => typeof f.enabled === 'boolean')).toBe(true);
      expect(flags.find(f => f.key === 'feature.mcp.enabled')?.requiresRestart).toBe(true);
    });
  });

  describe('getAllByCategory', () => {
    it('returns entries for matching category', async () => {
      const repo = createMockRepo(defs, new Map());
      const bridge = new ConfigBridge(repo);
      await bridge.initialize();

      const perf = bridge.getAllByCategory('performance');
      expect(perf.length).toBe(1);
      expect(perf[0].key).toBe('platform.performance.dbPoolMax');
    });

    it('returns empty for unknown category', async () => {
      const repo = createMockRepo(defs, new Map());
      const bridge = new ConfigBridge(repo);
      await bridge.initialize();
      expect(bridge.getAllByCategory('nonexistent')).toEqual([]);
    });
  });

  describe('listDefinitionsByDomain', () => {
    it('filters by owner domain', async () => {
      const mixedDefs = [
        makeDef({ key: 'a.key', ownerDomain: 'platform' }),
        makeDef({ key: 'b.key', ownerDomain: 'auth' }),
        makeDef({ key: 'c.key', ownerDomain: 'platform' }),
      ];
      const repo = createMockRepo(mixedDefs, new Map());
      const bridge = new ConfigBridge(repo);
      await bridge.initialize();

      expect(bridge.listDefinitionsByDomain('platform').length).toBe(2);
      expect(bridge.listDefinitionsByDomain('auth').length).toBe(1);
      expect(bridge.listDefinitionsByDomain('unknown').length).toBe(0);
    });
  });

  describe('toSnapshot', () => {
    it('returns all cached key-value pairs', async () => {
      const repo = createMockRepo(defs, new Map());
      const bridge = new ConfigBridge(repo);
      await bridge.initialize();

      const snap = bridge.toSnapshot();
      expect(Object.keys(snap).length).toBe(defs.length);
      expect(snap['feature.temporal.enabled']).toBe(true);
      expect(snap['feature.langfuse.enabled']).toBe(false);
    });
  });

  describe('refreshCache', () => {
    it('reloads definitions and values from repository', async () => {
      const repo = createMockRepo(defs, new Map());
      const bridge = new ConfigBridge(repo);
      await bridge.initialize();

      expect(bridge.getBoolean('feature.temporal.enabled')).toBe(true);

      const vals = new Map<string, ConfigValueRecord>();
      vals.set('id-feature.temporal.enabled', makeValue('id-feature.temporal.enabled', false));
      (repo.getValue as ReturnType<typeof vi.fn>).mockImplementation((defId: string) =>
        Promise.resolve(vals.get(defId) ?? null)
      );

      await bridge.refreshCache();
      expect(bridge.getBoolean('feature.temporal.enabled')).toBe(false);
    });
  });

  describe('getEnvKeyMapping', () => {
    it('returns a copy of the env-to-config mapping', async () => {
      const repo = createMockRepo([], new Map());
      const bridge = new ConfigBridge(repo);
      const mapping = bridge.getEnvKeyMapping();
      expect(mapping.TEMPORAL_ENABLED).toBe('feature.temporal.enabled');
      expect(mapping.MCP_ENABLED).toBe('feature.mcp.enabled');
    });
  });

  describe('get fallback chain', () => {
    it('returns seed default for key not in DB definitions', async () => {
      const repo = createMockRepo([], new Map());
      const bridge = new ConfigBridge(repo);
      await bridge.initialize();

      expect(bridge.get('deployment.mode')).toBe('saas');
    });

    it('returns undefined for fully unknown key', async () => {
      const repo = createMockRepo([], new Map());
      const bridge = new ConfigBridge(repo);
      await bridge.initialize();
      expect(bridge.get('totally.unknown.key')).toBeUndefined();
    });
  });
});
