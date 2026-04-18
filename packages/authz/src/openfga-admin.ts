import { ConfigError } from '@dogan/contracts';

export interface OpenFgaAdminOptions {
  apiUrl: string;
  fetch?: typeof fetch;
}

export interface FgaTuple {
  user: string;
  relation: string;
  object: string;
}

/**
 * OpenFGA admin client: create/lookup stores, write authorization models,
 * write/delete tuples. Used by the DAuth bootstrap script and by tenant
 * provisioning routes.
 */
export class OpenFgaAdmin {
  private readonly f: typeof fetch;

  constructor(private readonly opts: OpenFgaAdminOptions) {
    if (!opts.apiUrl) throw new ConfigError('OpenFgaAdmin: apiUrl required');
    this.f = opts.fetch ?? fetch;
  }

  private async req(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
    return this.f(`${this.opts.apiUrl}${path}`, { ...init, headers });
  }

  async ensureStore(name: string): Promise<string> {
    const list = await this.req(`/stores?page_size=100`);
    if (!list.ok) throw new Error(`list stores: ${list.status}`);
    const json = (await list.json()) as { stores: Array<{ id: string; name: string }> };
    const found = json.stores.find((s) => s.name === name);
    if (found) return found.id;
    const created = await this.req('/stores', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    if (!created.ok) {
      const t = await created.text();
      throw new Error(`create store ${name}: ${created.status} ${t}`);
    }
    const c = (await created.json()) as { id: string };
    return c.id;
  }

  async writeAuthorizationModel(
    storeId: string,
    model: { schema_version: string; type_definitions: unknown[] },
  ): Promise<string> {
    const r = await this.req(`/stores/${storeId}/authorization-models`, {
      method: 'POST',
      body: JSON.stringify(model),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`write model: ${r.status} ${t}`);
    }
    const j = (await r.json()) as { authorization_model_id: string };
    return j.authorization_model_id;
  }

  async write(storeId: string, modelId: string, tuples: FgaTuple[]): Promise<void> {
    if (tuples.length === 0) return;
    const r = await this.req(`/stores/${storeId}/write`, {
      method: 'POST',
      body: JSON.stringify({
        authorization_model_id: modelId,
        writes: { tuple_keys: tuples },
      }),
    });
    if (!r.ok && r.status !== 400) {
      const t = await r.text();
      throw new Error(`write tuples: ${r.status} ${t}`);
    }
  }

  async delete(storeId: string, modelId: string, tuples: FgaTuple[]): Promise<void> {
    if (tuples.length === 0) return;
    const r = await this.req(`/stores/${storeId}/write`, {
      method: 'POST',
      body: JSON.stringify({
        authorization_model_id: modelId,
        deletes: { tuple_keys: tuples },
      }),
    });
    if (!r.ok && r.status !== 400) {
      const t = await r.text();
      throw new Error(`delete tuples: ${r.status} ${t}`);
    }
  }
}
