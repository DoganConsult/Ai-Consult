/**
 * Unit tests for the vendor-agnostic OAuth token manager.
 * Verifies caching, per-binding/per-scope cache keys,
 * secret resolution, and strategy dispatch.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../observability/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  OAuthTokenManager,
  type TokenResult,
  type TokenStrategy,
  type TokenStrategyInput,
} from './oauth-token-manager.service';
import type {
  ConnectorBinding,
  OAuthAppRegistration,
} from '../../../../connectors/types';

function makeRegistration(
  overrides: Partial<OAuthAppRegistration> = {},
): OAuthAppRegistration {
  return {
    registrationId: 'reg-1',
    tenantId: 't1',
    vendor: 'microsoft',
    externalTenantId: 'azure-tid',
    appClientId: 'client-1',
    secretNameKv: 'secret-primary',
    extraSecretNames: {},
    redirectUris: [],
    consentedScopes: [],
    authMode: 'client_credentials',
    status: 'active',
    ...overrides,
  };
}

function makeBinding(): Pick<ConnectorBinding, 'bindingId' | 'tenantId'> {
  return { bindingId: 'bind-1', tenantId: 't1' };
}

describe('OAuthTokenManager', () => {
  let manager: OAuthTokenManager;
  let acquireSpy: ReturnType<typeof vi.fn<(input: TokenStrategyInput) => Promise<TokenResult>>>;
  let strategy: TokenStrategy;

  beforeEach(() => {
    manager = new OAuthTokenManager();
    acquireSpy = vi.fn(async (_input: TokenStrategyInput): Promise<TokenResult> => ({
      accessToken: 'token-abc',
      expiresAt: new Date(Date.now() + 3600_000),
      scope: 'https://graph.microsoft.com/.default',
    }));
    strategy = {
      vendor: 'microsoft',
      authMode: 'client_credentials',
      acquire: acquireSpy,
    };
    manager.registerStrategy(strategy);
  });

  it('acquires a token through the matching strategy', async () => {
    const result = await manager.getAccessToken(
      makeBinding(),
      makeRegistration(),
      async () => 'primary-secret-value',
    );
    expect(result.accessToken).toBe('token-abc');
    expect(acquireSpy).toHaveBeenCalledTimes(1);
    expect(acquireSpy.mock.calls[0]?.[0]?.primarySecret).toBe('primary-secret-value');
  });

  it('caches tokens per (binding, registration, scope) tuple', async () => {
    const resolver = async () => 'primary-secret-value';
    await manager.getAccessToken(makeBinding(), makeRegistration(), resolver);
    await manager.getAccessToken(makeBinding(), makeRegistration(), resolver);
    expect(acquireSpy).toHaveBeenCalledTimes(1);
  });

  it('does not reuse cache across different scope sets', async () => {
    const resolver = async () => 'primary-secret-value';
    await manager.getAccessToken(makeBinding(), makeRegistration(), resolver, ['A']);
    await manager.getAccessToken(makeBinding(), makeRegistration(), resolver, ['B']);
    expect(acquireSpy).toHaveBeenCalledTimes(2);
  });

  it('invalidate() forces the next call to re-acquire', async () => {
    const resolver = async () => 'primary-secret-value';
    const reg = makeRegistration();
    await manager.getAccessToken(makeBinding(), reg, resolver);
    manager.invalidate(makeBinding(), reg);
    await manager.getAccessToken(makeBinding(), reg, resolver);
    expect(acquireSpy).toHaveBeenCalledTimes(2);
  });

  it('throws a structured error when no strategy matches', async () => {
    const reg = makeRegistration({ authMode: 'auth_code' });
    await expect(
      manager.getAccessToken(makeBinding(), reg, async () => 'secret'),
    ).rejects.toThrow(/no strategy for microsoft\/auth_code/);
  });

  it('throws when the primary secret cannot be resolved', async () => {
    await expect(
      manager.getAccessToken(makeBinding(), makeRegistration(), async () => null),
    ).rejects.toThrow(/primary secret unavailable/);
  });

  it('resolves extra secrets by alias', async () => {
    const reg = makeRegistration({
      extraSecretNames: { webhook: 'secret-webhook' },
    });
    const resolver = vi.fn(async (name: string) =>
      name === 'secret-webhook' ? 'whv' : 'primary',
    );
    await manager.getAccessToken(makeBinding(), reg, resolver);
    expect(resolver).toHaveBeenCalledWith('secret-primary');
    expect(resolver).toHaveBeenCalledWith('secret-webhook');
    expect(acquireSpy.mock.calls[0]?.[0]?.extraSecrets).toEqual({ webhook: 'whv' });
  });

  it('rejects duplicate strategy registration', () => {
    expect(() => manager.registerStrategy(strategy)).toThrow(/duplicate strategy/);
  });
});
