import { createHash } from 'node:crypto';
import { sql } from 'kysely';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { UnauthorizedError, ForbiddenError } from '@dogan/contracts';

export interface ApiKeyRow {
  id: string;
  tenant_id: string;
  user_id: string | null;
  scopes: string[];
  expires_at: string | null;
  revoked_at: string | null;
  ip_allowlist: string[] | null;
}

/**
 * Resolves a `dga_*` bearer token into a tenant context by hashing the token,
 * looking it up under platform_admin override, and validating expiry + IP.
 */
export function registerApiKeyAuth(app: FastifyInstance): void {
  app.decorate('authenticateApiKey', async function authenticateApiKey(req: FastifyRequest) {
    const header = req.headers.authorization ?? '';
    const m = /^Bearer\s+(dga_[A-Za-z0-9_-]+)$/.exec(header);
    if (!m) throw new UnauthorizedError('missing api key bearer');
    const token = m[1]!;
    const hash = createHash('sha256').update(token).digest('hex');

    const row = await app.kernel.db.transaction().execute(async (tx) => {
      await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
      const r = await sql<ApiKeyRow>`
        select id::text, tenant_id::text, user_id::text, scopes,
               expires_at::text, revoked_at::text,
               case when ip_allowlist is null then null
                    else array(select host(x) from unnest(ip_allowlist) x)
               end as ip_allowlist
          from platform.api_keys
         where key_hash = ${hash}
         limit 1
      `.execute(tx);
      return r.rows[0] ?? null;
    });

    if (!row) throw new UnauthorizedError('api key not found');
    if (row.revoked_at) throw new UnauthorizedError('api key revoked');
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      throw new UnauthorizedError('api key expired');
    }
    if (row.ip_allowlist && row.ip_allowlist.length > 0) {
      const ip = req.ip;
      if (!row.ip_allowlist.includes(ip)) {
        throw new ForbiddenError('api key ip not allowed');
      }
    }

    await app.kernel.db.transaction().execute(async (tx) => {
      await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
      await sql`update platform.api_keys set last_used_at = now() where id = ${row.id}::uuid`.execute(tx);
    });

    req.tenantCtx = {
      tenantId: row.tenant_id,
      userId: row.user_id ?? 'api-key',
      roles: row.scopes,
    };
    req.apiKey = { id: row.id, scopes: row.scopes };
  });
}

export function requireScope(scope: string): (req: FastifyRequest) => Promise<void> {
  return async (req) => {
    const k = req.apiKey;
    if (!k) throw new UnauthorizedError('api key required');
    if (!k.scopes.includes(scope) && !k.scopes.includes('*')) {
      throw new ForbiddenError(`api key missing scope: ${scope}`);
    }
  };
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticateApiKey: (req: FastifyRequest) => Promise<void>;
  }
  interface FastifyRequest {
    apiKey?: { id: string; scopes: string[] };
  }
}
