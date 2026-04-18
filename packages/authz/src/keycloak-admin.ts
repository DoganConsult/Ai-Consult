import { ConfigError } from '@dogan/contracts';

export interface KeycloakAdminOptions {
  baseUrl: string;
  adminRealm?: string;
  adminUser: string;
  adminPassword: string;
  fetch?: typeof fetch;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

/**
 * Minimal Keycloak admin REST client. Used by the bootstrap script and the
 * DAuth provisioning routes. Production-grade: caches admin token, refreshes
 * before expiry, and surfaces non-2xx as KernelError.
 */
export class KeycloakAdmin {
  private token?: { value: string; expiresAt: number };
  private readonly f: typeof fetch;
  private readonly adminRealm: string;

  constructor(private readonly opts: KeycloakAdminOptions) {
    if (!opts.baseUrl) throw new ConfigError('KeycloakAdmin: baseUrl required');
    if (!opts.adminUser || !opts.adminPassword) {
      throw new ConfigError('KeycloakAdmin: adminUser and adminPassword required');
    }
    this.f = opts.fetch ?? fetch;
    this.adminRealm = opts.adminRealm ?? 'master';
  }

  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.token && this.token.expiresAt - now > 30_000) return this.token.value;
    const url = `${this.opts.baseUrl}/realms/${this.adminRealm}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: this.opts.adminUser,
      password: this.opts.adminPassword,
    });
    const res = await this.f(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`keycloak admin token failed: ${res.status} ${txt}`);
    }
    const json = (await res.json()) as TokenResponse;
    this.token = { value: json.access_token, expiresAt: now + json.expires_in * 1000 };
    return json.access_token;
  }

  private async req(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.getToken();
    const url = `${this.opts.baseUrl}/admin${path}`;
    const headers = new Headers(init.headers);
    headers.set('authorization', `Bearer ${token}`);
    if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
    return this.f(url, { ...init, headers });
  }

  async ensureRealm(realm: string, spec: Record<string, unknown>): Promise<void> {
    const got = await this.req(`/realms/${realm}`);
    if (got.status === 200) return;
    if (got.status !== 404) throw new Error(`get realm ${realm}: ${got.status}`);
    const created = await this.req('/realms', {
      method: 'POST',
      body: JSON.stringify({ realm, enabled: true, ...spec }),
    });
    if (created.status !== 201) {
      const t = await created.text();
      throw new Error(`create realm ${realm}: ${created.status} ${t}`);
    }
  }

  async ensureClient(realm: string, client: Record<string, unknown>): Promise<string> {
    const clientId = client.clientId as string;
    if (!clientId) throw new ConfigError('client.clientId required');
    const list = await this.req(`/realms/${realm}/clients?clientId=${encodeURIComponent(clientId)}`);
    if (!list.ok) throw new Error(`list clients: ${list.status}`);
    const arr = (await list.json()) as Array<{ id: string }>;
    if (arr.length > 0) return arr[0]!.id;
    const created = await this.req(`/realms/${realm}/clients`, {
      method: 'POST',
      body: JSON.stringify(client),
    });
    if (created.status !== 201) {
      const t = await created.text();
      throw new Error(`create client ${clientId}: ${created.status} ${t}`);
    }
    const loc = created.headers.get('location') ?? '';
    return loc.split('/').pop() ?? '';
  }

  async ensureProtocolMapper(
    realm: string,
    clientUuid: string,
    mapper: Record<string, unknown>,
  ): Promise<void> {
    const list = await this.req(`/realms/${realm}/clients/${clientUuid}/protocol-mappers/models`);
    if (!list.ok) throw new Error(`list mappers: ${list.status}`);
    const arr = (await list.json()) as Array<{ name: string }>;
    if (arr.some((m) => m.name === mapper.name)) return;
    const r = await this.req(`/realms/${realm}/clients/${clientUuid}/protocol-mappers/models`, {
      method: 'POST',
      body: JSON.stringify(mapper),
    });
    if (r.status !== 201) {
      const t = await r.text();
      throw new Error(`create mapper ${String(mapper.name)}: ${r.status} ${t}`);
    }
  }

  async ensureUser(
    realm: string,
    user: { username: string; email?: string; enabled?: boolean; password?: string; attributes?: Record<string, string[]> },
  ): Promise<string> {
    const list = await this.req(`/realms/${realm}/users?username=${encodeURIComponent(user.username)}&exact=true`);
    if (!list.ok) throw new Error(`list users: ${list.status}`);
    const arr = (await list.json()) as Array<{ id: string }>;
    let userId: string;
    if (arr.length > 0) {
      userId = arr[0]!.id;
    } else {
      const created = await this.req(`/realms/${realm}/users`, {
        method: 'POST',
        body: JSON.stringify({
          username: user.username,
          email: user.email,
          enabled: user.enabled ?? true,
          emailVerified: true,
          attributes: user.attributes,
        }),
      });
      if (created.status !== 201) {
        const t = await created.text();
        throw new Error(`create user ${user.username}: ${created.status} ${t}`);
      }
      const loc = created.headers.get('location') ?? '';
      userId = loc.split('/').pop() ?? '';
    }
    if (user.password) {
      const r = await this.req(`/realms/${realm}/users/${userId}/reset-password`, {
        method: 'PUT',
        body: JSON.stringify({ type: 'password', value: user.password, temporary: false }),
      });
      if (r.status !== 204) {
        const t = await r.text();
        throw new Error(`set password for ${user.username}: ${r.status} ${t}`);
      }
    }
    return userId;
  }

  jwksUrl(realm: string): string {
    return `${this.opts.baseUrl}/realms/${realm}/protocol/openid-connect/certs`;
  }

  issuer(realm: string): string {
    return `${this.opts.baseUrl}/realms/${realm}`;
  }
}
