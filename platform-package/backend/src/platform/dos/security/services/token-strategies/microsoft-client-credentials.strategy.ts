// ============================================
// Platform — Microsoft client-credentials strategy
// Implements the Entra ID v2.0 token endpoint
//   POST https://login.microsoftonline.com/{tid}/oauth2/v2.0/token
// with grant_type=client_credentials. Scope defaults to
// https://graph.microsoft.com/.default but any scope the
// caller passes is honored.
// ============================================

import type {
  TokenResult,
  TokenStrategy,
  TokenStrategyInput,
} from '../oauth-token-manager.service';

const ENTRA_TOKEN_URL = 'https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token';
const DEFAULT_SCOPE = 'https://graph.microsoft.com/.default';

interface EntraTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

export const microsoftClientCredentialsStrategy: TokenStrategy = {
  vendor: 'microsoft',
  authMode: 'client_credentials',

  async acquire(input: TokenStrategyInput): Promise<TokenResult> {
    const { registration, primarySecret, scopes } = input;

    if (!registration.externalTenantId) {
      throw new Error(
        '[MicrosoftClientCredentials] registration.externalTenantId (Azure tenant id) is required',
      );
    }

    const url = ENTRA_TOKEN_URL.replace('{tenantId}', registration.externalTenantId);
    const requestedScope = scopes && scopes.length > 0 ? scopes.join(' ') : DEFAULT_SCOPE;

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: registration.appClientId,
      client_secret: primarySecret,
      scope: requestedScope,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const text = await response.text();
    let parsed: EntraTokenResponse;
    try {
      parsed = JSON.parse(text) as EntraTokenResponse;
    } catch {
      throw new Error(
        `[MicrosoftClientCredentials] non-JSON response (${response.status}): ${text.slice(0, 300)}`,
      );
    }

    if (!response.ok || !parsed.access_token || typeof parsed.expires_in !== 'number') {
      const detail = parsed.error_description || parsed.error || text.slice(0, 300);
      throw new Error(
        `[MicrosoftClientCredentials] token acquisition failed (${response.status}): ${detail}`,
      );
    }

    return {
      accessToken: parsed.access_token,
      expiresAt: new Date(Date.now() + parsed.expires_in * 1000),
      scope: parsed.scope ?? requestedScope,
    };
  },
};
