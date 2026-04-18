import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

export interface AuthSession {
  readonly accessToken: string;
  readonly idToken: string;
  readonly expiresAt: number;
  readonly subject: string;
  readonly email?: string;
  readonly tenantId?: string;
  readonly roles: readonly string[];
  readonly products: readonly string[];
}

interface DiscoveryDoc {
  readonly authorization_endpoint: string;
  readonly token_endpoint: string;
  readonly end_session_endpoint?: string;
  readonly jwks_uri: string;
  readonly issuer: string;
}

interface TokenResponse {
  readonly access_token: string;
  readonly id_token: string;
  readonly token_type: string;
  readonly expires_in: number;
  readonly refresh_token?: string;
}

const STORAGE_KEY = 'dgn.dauth.session.v1';
const PKCE_KEY = 'dgn.dauth.pkce.v1';

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function rand(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return b64url(arr);
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return b64url(digest);
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('malformed token');
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
  return JSON.parse(atob(padded)) as Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private discovery: DiscoveryDoc | null = null;
  readonly session = signal<AuthSession | null>(this.loadSession());

  isAuthenticated(): boolean {
    const s = this.session();
    return !!s && s.expiresAt > Date.now() + 5_000;
  }

  async login(returnUrl: string = '/workspace'): Promise<void> {
    const disco = await this.getDiscovery();
    const verifier = rand(48);
    const challenge = await sha256(verifier);
    const state = rand(16);
    const nonce = rand(16);
    sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state, nonce, returnUrl }));

    const url = new URL(disco.authorization_endpoint);
    url.searchParams.set('client_id', environment.authClientId);
    url.searchParams.set('redirect_uri', environment.authRedirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid profile email');
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    window.location.assign(url.toString());
  }

  async handleCallback(query: URLSearchParams): Promise<string> {
    const code = query.get('code');
    const state = query.get('state');
    const err = query.get('error');
    if (err) throw new Error('keycloak error: ' + err + ' ' + (query.get('error_description') ?? ''));
    if (!code || !state) throw new Error('missing code/state');

    const raw = sessionStorage.getItem(PKCE_KEY);
    if (!raw) throw new Error('missing PKCE state (callback without login)');
    const { verifier, state: stored, returnUrl } = JSON.parse(raw) as {
      verifier: string; state: string; returnUrl: string;
    };
    if (state !== stored) throw new Error('state mismatch');
    sessionStorage.removeItem(PKCE_KEY);

    const disco = await this.getDiscovery();
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: environment.authClientId,
      code,
      redirect_uri: environment.authRedirectUri,
      code_verifier: verifier,
    });
    const res = await fetch(disco.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error('token exchange failed (' + res.status + '): ' + txt);
    }
    const tok = (await res.json()) as TokenResponse;
    const session = this.buildSession(tok);
    this.persistSession(session);
    return returnUrl ?? '/workspace';
  }

  async logout(): Promise<void> {
    const s = this.session();
    sessionStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
    const disco = await this.getDiscovery().catch(() => null);
    if (disco?.end_session_endpoint) {
      const url = new URL(disco.end_session_endpoint);
      url.searchParams.set('post_logout_redirect_uri', environment.authPostLogoutRedirectUri);
      url.searchParams.set('client_id', environment.authClientId);
      if (s?.idToken) url.searchParams.set('id_token_hint', s.idToken);
      window.location.assign(url.toString());
      return;
    }
    window.location.assign(environment.authPostLogoutRedirectUri);
  }

  async authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const s = this.session();
    if (!s) throw new Error('not authenticated');
    const url = path.startsWith('http') ? path : environment.apiBaseUrl + path;
    const headers = new Headers(init.headers ?? {});
    headers.set('Authorization', 'Bearer ' + s.accessToken);
    headers.set('Accept', 'application/json');
    return fetch(url, { ...init, headers });
  }

  private async getDiscovery(): Promise<DiscoveryDoc> {
    if (this.discovery) return this.discovery;
    const res = await fetch(environment.authIssuer + '/.well-known/openid-configuration');
    if (!res.ok) throw new Error('discovery failed: ' + res.status);
    this.discovery = (await res.json()) as DiscoveryDoc;
    return this.discovery;
  }

  private buildSession(tok: TokenResponse): AuthSession {
    const claims = decodeJwtPayload(tok.access_token);
    const rolesClaim = (claims['roles'] as unknown) ?? [];
    const productsClaim = (claims['products'] as unknown) ?? [];
    const roles = Array.isArray(rolesClaim) ? (rolesClaim as string[]) : [];
    const products = Array.isArray(productsClaim) ? (productsClaim as string[]) : [];
    return {
      accessToken: tok.access_token,
      idToken: tok.id_token,
      expiresAt: Date.now() + tok.expires_in * 1000,
      subject: String(claims['sub'] ?? ''),
      email: claims['email'] as string | undefined,
      tenantId: claims['tid'] as string | undefined,
      roles,
      products,
    };
  }

  private persistSession(s: AuthSession): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    this.session.set(s);
  }

  private loadSession(): AuthSession | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as AuthSession;
      if (s.expiresAt < Date.now()) {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return s;
    } catch {
      return null;
    }
  }
}
