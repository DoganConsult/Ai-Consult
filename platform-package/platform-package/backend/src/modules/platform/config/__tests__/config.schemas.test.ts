import { describe, expect, it } from 'vitest';
import { ConfigDefinitionCreateSchema, ConfigValueUpsertSchema } from '../config.schemas';

describe('config schemas', () => {
  it('accepts valid definition payload', () => {
    const result = ConfigDefinitionCreateSchema.safeParse({
      key: 'deployment.mode',
      label: 'Deployment Mode',
      ownerDomain: 'platform',
      category: 'deployment',
      valueType: 'enum',
      allowedScopes: ['deployment', 'platform'],
      enumValues: ['saas', 'onprem', 'sovereign', 'sdk'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid key format', () => {
    const result = ConfigDefinitionCreateSchema.safeParse({
      key: 'Deployment Mode',
      label: 'Deployment Mode',
      ownerDomain: 'platform',
      category: 'deployment',
      valueType: 'enum',
      allowedScopes: ['deployment'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid config value payload', () => {
    const result = ConfigValueUpsertSchema.safeParse({
      key: 'platform.observability.telemetryEnabled',
      scopeType: 'platform',
      scopeId: 'global',
      value: true,
    });
    expect(result.success).toBe(true);
  });
});
