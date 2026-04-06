import { describe, expect, it } from 'vitest';
import { resolveFromRecords } from '../config.resolver';

describe('config resolver', () => {
  it('prefers more specific scope value', () => {
    const result = resolveFromRecords({
      definition: {
        id: 'd1',
        key: 'platform.observability.telemetryEnabled',
        label: 'Telemetry Enabled',
        ownerDomain: 'platform',
        category: 'observability',
        valueType: 'boolean',
        allowedScopes: ['platform', 'tenant', 'organization', 'user'],
        defaultValue: false,
        isSecret: false,
        isRequired: false,
        isOverridable: true,
        isLockable: true,
        requiresRestart: false,
        deploymentOnly: false,
        sdkExposable: false,
        uiExposable: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      target: { scopeType: 'user', scopeId: 'u_1' },
      resolutionPath: [
        { scopeType: 'user', scopeId: 'u_1' },
        { scopeType: 'tenant', scopeId: 't_1' },
        { scopeType: 'platform', scopeId: 'global' },
      ],
      values: [
        {
          id: 'v1',
          definitionId: 'd1',
          scopeType: 'platform',
          scopeId: 'global',
          value: false,
          isEncrypted: false,
          source: 'seed',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'v2',
          definitionId: 'd1',
          scopeType: 'tenant',
          scopeId: 't_1',
          value: true,
          isEncrypted: false,
          source: 'manual',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      locks: [],
    });

    expect(result.effectiveValue).toBe(true);
    expect(result.resolvedFromScopeType).toBe('tenant');
    expect(result.resolvedFromScopeId).toBe('t_1');
  });
});
