// ============================================
// Platform — OAuth Token Manager (vendor-agnostic)
// Single canonical token cache shared by all
// Integration-Hub connectors (Microsoft Graph,
// Google Workspace, Zoom, LinkedIn, ...).
//
// Strategies live in ./token-strategies/*. A strategy
// is a pure function that, given a binding's resolved
// secret, returns a fresh access token plus TTL.
//
// See: docs/PLATFORM-ENRICHMENT-PLAN.md (Pillar 2)
//      docs/PLATFORM-COLLAB-CONNECTORS.md §5
// ============================================

import { logger } from '../../observability/logger.service';
import type {
  ConnectorBinding,
  ConnectorVendor,
  OAuthAppRegistration,
} from '../../../../connectors/types';

/** Safety margin subtracted from vendor-reported TTL. */
const TOKEN_EXPIRY_SAFETY_MS = 5 * 60 * 1000;

export interface TokenResult {
  accessToken: string;
  /** Absolute expiry time (UTC). */
  expiresAt: Date;
  scope?: string;
}

/**
 * A strategy acquires a fresh access token from a vendor.
 * Implementations MUST NOT cache — caching is the manager's job.
 */
export interface TokenStrategy {
  readonly vendor: ConnectorVendor;
  readonly authMode: OAuthAppRegistration['authMode'];
  acquire(input: TokenStrategyInput): Promise<TokenResult>;
}

export interface TokenStrategyInput {
  registration: OAuthAppRegistration;
  /** Plaintext primary secret (client secret / API key / JWT key). */
  primarySecret: string;
  /** Plaintext extra secrets keyed by `registration.extraSecretNames`. */
  extraSecrets: Record<string, string>;
  /** Scopes requested for this specific binding, if any. */
  scopes?: readonly string[];
}

type CacheKey = string;

interface CacheEntry {
  token: string;
  expiresAt: Date;
  scope?: string;
}

export class OAuthTokenManager {
  private readonly strategies = new Map<string, TokenStrategy>();
  private readonly cache = new Map<CacheKey, CacheEntry>();

  registerStrategy(strategy: TokenStrategy): void {
    const key = strategyKey(strategy.vendor, strategy.authMode);
    if (this.strategies.has(key)) {
      throw new Error(`[OAuthTokenManager] duplicate strategy: ${key}`);
    }
    this.strategies.set(key, strategy);
  }

  /**
   * Return a valid access token for the given binding + registration.
   * Uses the in-memory cache when still within safety margin.
   */
  async getAccessToken(
    binding: Pick<ConnectorBinding, 'bindingId' | 'tenantId'>,
    registration: OAuthAppRegistration,
    resolveSecret: SecretResolver,
    scopes?: readonly string[],
  ): Promise<TokenResult> {
    const cacheKey = buildCacheKey(binding, registration, scopes);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt.getTime() > Date.now()) {
      return {
        accessToken: cached.token,
        expiresAt: cached.expiresAt,
        scope: cached.scope,
      };
    }

    const strategy = this.strategies.get(
      strategyKey(registration.vendor, registration.authMode),
    );
    if (!strategy) {
      throw new Error(
        `[OAuthTokenManager] no strategy for ${registration.vendor}/${registration.authMode}`,
      );
    }

    const primarySecret = await resolveSecret(registration.secretNameKv);
    if (!primarySecret) {
      throw new Error(
        `[OAuthTokenManager] primary secret unavailable: ${registration.secretNameKv}`,
      );
    }
    const extraSecrets: Record<string, string> = {};
    for (const [alias, name] of Object.entries(registration.extraSecretNames)) {
      const value = await resolveSecret(name);
      if (value) extraSecrets[alias] = value;
    }

    const result = await strategy.acquire({
      registration,
      primarySecret,
      extraSecrets,
      scopes,
    });

    const safeExpiry = new Date(
      result.expiresAt.getTime() - TOKEN_EXPIRY_SAFETY_MS,
    );
    this.cache.set(cacheKey, {
      token: result.accessToken,
      expiresAt: safeExpiry,
      scope: result.scope,
    });

    logger.info(
      `[OAuthTokenManager] token acquired vendor=${registration.vendor} ` +
      `mode=${registration.authMode} binding=${binding.bindingId} ` +
      `expiresAt=${safeExpiry.toISOString()}`,
    );

    return { ...result, expiresAt: safeExpiry };
  }

  invalidate(
    binding: Pick<ConnectorBinding, 'bindingId' | 'tenantId'>,
    registration: OAuthAppRegistration,
    scopes?: readonly string[],
  ): void {
    this.cache.delete(buildCacheKey(binding, registration, scopes));
  }

  clearCache(): void {
    this.cache.clear();
  }

  listStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
}

/**
 * Callback that resolves a named secret (Key Vault lookup or
 * encrypted-DB fallback). Returns `null` when the secret is
 * unavailable so the manager can surface a structured error.
 */
export type SecretResolver = (secretName: string) => Promise<string | null>;

function strategyKey(
  vendor: ConnectorVendor,
  authMode: OAuthAppRegistration['authMode'],
): string {
  return `${vendor}:${authMode}`;
}

function buildCacheKey(
  binding: Pick<ConnectorBinding, 'bindingId' | 'tenantId'>,
  registration: OAuthAppRegistration,
  scopes?: readonly string[],
): CacheKey {
  const scopeFragment = scopes && scopes.length > 0
    ? [...scopes].sort().join(',')
    : 'default';
  return `${binding.tenantId}|${binding.bindingId}|${registration.registrationId}|${scopeFragment}`;
}

/** Singleton used across the platform. */
export const oauthTokenManager = new OAuthTokenManager();
