import { describe, expect, it } from 'vitest';
import { assertScopeAccess, CONFIG_PERMISSIONS } from '../config.permissions';

describe('config.permissions', () => {
  it('allows access if actor has universal permission wildcard', () => {
    expect(() => assertScopeAccess(
      { userId: 'u1', permissions: ['*'] },
      { scopeType: 'tenant', scopeId: 't1' }
    )).not.toThrow();
  });

  it('rejects cross-tenant access for tenant bounds', () => {
    expect(() => assertScopeAccess(
      { userId: 'u1', tenantId: 't1', permissions: [] },
      { scopeType: 'tenant', scopeId: 't2' }
    )).toThrow('Cross-tenant config access denied');
  });

  it('allows access to correct tenant bounds', () => {
    expect(() => assertScopeAccess(
      { userId: 'u1', tenantId: 't1', permissions: [] },
      { scopeType: 'tenant', scopeId: 't1' }
    )).not.toThrow();
  });

  it('rejects cross-organization access if lacking definition update permission', () => {
    expect(() => assertScopeAccess(
      { userId: 'u1', organizationId: 'o1', permissions: [] },
      { scopeType: 'organization', scopeId: 'o2' }
    )).toThrow('Cross-organization config access denied');
  });

  it('allows cross-organization access if actor has update permission', () => {
    expect(() => assertScopeAccess(
      { userId: 'u1', organizationId: 'o1', permissions: [CONFIG_PERMISSIONS.definitionUpdate] },
      { scopeType: 'organization', scopeId: 'o2' }
    )).not.toThrow();
  });
});
