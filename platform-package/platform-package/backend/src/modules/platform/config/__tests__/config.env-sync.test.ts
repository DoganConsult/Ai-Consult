import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { syncEnvToConfigRegistry, getEnvSyncMap } from '../config.env-sync';
import type { ConfigRepository } from '../config.repository';
import type { ConfigDefinition, ConfigValueRecord } from '../config.types';

function makeDef(key: string, valueType = 'boolean'): ConfigDefinition {
  return {
    id: `id-${key}`,
    key,
    label: key,
    ownerDomain: 'platform',
    category: 'feature',
    valueType: valueType as ConfigDefinition['valueType'],
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
  };
}

const savedEnv: Record<string, string | undefined> = {};

function setEnv(key: string, value: string) {
  savedEnv[key] = process.env[key];
  process.env[key] = value;
}

function restoreEnv() {
  for (const [key, val] of Object.entries(savedEnv)) {
    if (val === undefined) delete process.env[key];
    else process.env[key] = val;
  }
}

describe('syncEnvToConfigRegistry', () => {
  afterEach(() => restoreEnv());

  it('syncs env boolean to DB when no existing value', async () => {
    setEnv('TEMPORAL_ENABLED', 'true');
    const upsertMock = vi.fn().mockResolvedValue(null);
    const repo = {
      findDefinitionByKey: vi.fn().mockResolvedValue(makeDef('feature.temporal.enabled')),
      getValue: vi.fn().mockResolvedValue(null),
      upsertValue: upsertMock,
    } as any as ConfigRepository;

    const result = await syncEnvToConfigRegistry(repo);

    expect(result.synced).toBeGreaterThanOrEqual(1);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        definitionId: 'id-feature.temporal.enabled',
        scopeType: 'platform',
        scopeId: 'global',
        value: true,
        source: 'bootstrap',
      })
    );
  });

  it('skips sync when DB already has a value (idempotent)', async () => {
    setEnv('TEMPORAL_ENABLED', 'true');
    const existingValue: ConfigValueRecord = {
      id: 'v1',
      definitionId: 'id-feature.temporal.enabled',
      scopeType: 'platform',
      scopeId: 'global',
      value: false,
      isEncrypted: false,
      source: 'manual',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const upsertMock = vi.fn();
    const repo = {
      findDefinitionByKey: vi.fn().mockResolvedValue(makeDef('feature.temporal.enabled')),
      getValue: vi.fn().mockResolvedValue(existingValue),
      upsertValue: upsertMock,
    } as any as ConfigRepository;

    const result = await syncEnvToConfigRegistry(repo);

    expect(upsertMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ definitionId: 'id-feature.temporal.enabled' })
    );
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });

  it('skips env vars with empty value', async () => {
    setEnv('TEMPORAL_ENABLED', '');
    const upsertMock = vi.fn();
    const repo = {
      findDefinitionByKey: vi.fn(),
      getValue: vi.fn(),
      upsertValue: upsertMock,
    } as any as ConfigRepository;

    const result = await syncEnvToConfigRegistry(repo);
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });

  it('skips when definition not found in DB', async () => {
    setEnv('TEMPORAL_ENABLED', 'true');
    const repo = {
      findDefinitionByKey: vi.fn().mockResolvedValue(null),
      getValue: vi.fn(),
      upsertValue: vi.fn(),
    } as any as ConfigRepository;

    const result = await syncEnvToConfigRegistry(repo);
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });

  it('parses number env vars correctly', async () => {
    setEnv('PG_POOL_MAX', '50');
    const upsertMock = vi.fn().mockResolvedValue(null);
    const repo = {
      findDefinitionByKey: vi.fn().mockImplementation((key: string) => {
        if (key === 'platform.performance.dbPoolMax') return Promise.resolve(makeDef('platform.performance.dbPoolMax', 'number'));
        return Promise.resolve(null);
      }),
      getValue: vi.fn().mockResolvedValue(null),
      upsertValue: upsertMock,
    } as any as ConfigRepository;

    await syncEnvToConfigRegistry(repo);

    const pgPoolCall = upsertMock.mock.calls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).definitionId === 'id-platform.performance.dbPoolMax'
    );
    expect(pgPoolCall).toBeDefined();
    expect((pgPoolCall![0] as Record<string, unknown>).value).toBe(50);
  });

  it('parses string env vars correctly', async () => {
    setEnv('LOG_LEVEL', 'debug');
    const upsertMock = vi.fn().mockResolvedValue(null);
    const repo = {
      findDefinitionByKey: vi.fn().mockImplementation((key: string) => {
        if (key === 'platform.logging.level') return Promise.resolve(makeDef('platform.logging.level', 'string'));
        return Promise.resolve(null);
      }),
      getValue: vi.fn().mockResolvedValue(null),
      upsertValue: upsertMock,
    } as any as ConfigRepository;

    await syncEnvToConfigRegistry(repo);

    const call = upsertMock.mock.calls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).definitionId === 'id-platform.logging.level'
    );
    expect(call).toBeDefined();
    expect((call![0] as Record<string, unknown>).value).toBe('debug');
  });

  it('captures errors without throwing', async () => {
    setEnv('TEMPORAL_ENABLED', 'true');
    const repo = {
      findDefinitionByKey: vi.fn().mockResolvedValue(makeDef('feature.temporal.enabled')),
      getValue: vi.fn().mockResolvedValue(null),
      upsertValue: vi.fn().mockRejectedValue(new Error('DB write failed')),
    } as any as ConfigRepository;

    const result = await syncEnvToConfigRegistry(repo);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors[0]).toContain('DB write failed');
  });
});

describe('getEnvSyncMap', () => {
  it('returns a non-empty mapping array', () => {
    const map = getEnvSyncMap();
    expect(map.length).toBeGreaterThan(20);
  });

  it('all entries have required fields', () => {
    const map = getEnvSyncMap();
    for (const entry of map) {
      expect(entry.envKey).toBeTruthy();
      expect(entry.configKey).toBeTruthy();
      expect(entry.scopeType).toBe('platform');
      expect(entry.scopeId).toBe('global');
      expect(['boolean', 'number', 'string', 'string_array', 'json']).toContain(entry.parseAs);
    }
  });

  it('returns a copy, not the original array', () => {
    const a = getEnvSyncMap();
    const b = getEnvSyncMap();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
