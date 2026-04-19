import { sql } from 'kysely';
import { Type } from '@sinclair/typebox';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ForbiddenError } from '@dogan/contracts';
import '@dogan/kernel';
import { requirePlatformAdmin, requireStepUp } from './auth-context.js';

const CAPABILITIES = new Set<string>([
  'http.fetch', 'db.read.tenant', 'db.write.tenant',
  'events.publish', 'workflow.start', 'ai.invoke',
]);

const Submit = Type.Object({
  code:           Type.String({ minLength: 3, maxLength: 64, pattern: '^[a-z][a-z0-9-]{2,63}$' }),
  version:        Type.String({ minLength: 1, maxLength: 32, pattern: '^\\d+\\.\\d+\\.\\d+(?:-[A-Za-z0-9.-]+)?$' }),
  bundle_sha256:  Type.String({ minLength: 64, maxLength: 64, pattern: '^[a-f0-9]{64}$' }),
  cosign_signer:  Type.String({ minLength: 3, maxLength: 256 }),
  cosign_payload: Type.Object({
    bundle_sha256: Type.String(),
    signer:        Type.String(),
    signature:     Type.String({ minLength: 16 }),
    cert:          Type.Optional(Type.String()),
  }),
  sbom:           Type.Object({
    format:    Type.String({ minLength: 3, maxLength: 32 }),
    packages:  Type.Array(Type.Object({
      name: Type.String(), version: Type.String(), license: Type.Optional(Type.String()),
    }), { minItems: 0, maxItems: 5000 }),
  }),
  vulnerabilities: Type.Optional(Type.Array(Type.Object({
    id: Type.String(), severity: Type.String(), package: Type.Optional(Type.String()),
  }))),
  capabilities:   Type.Array(Type.String({ minLength: 2, maxLength: 64 }), { maxItems: 32 }),
  manifest:       Type.Record(Type.String(), Type.Unknown()),
});

const Decision = Type.Object({ id: Type.String({ format: 'uuid' }) });

function verifyCosign(payload: { bundle_sha256: string; signer: string; signature: string },
                      bundleSha: string, signer: string): boolean {
  // Trust-bundle verification is performed by the operator's cosign sidecar before submission.
  // The route validates that the payload binds to the same artifact and signer values being recorded.
  if (payload.bundle_sha256 !== bundleSha) return false;
  if (payload.signer !== signer) return false;
  if (payload.signature.length < 16) return false;
  return true;
}

function blockingVulns(vulns: { severity: string }[] | undefined): number {
  if (!vulns) return 0;
  return vulns.filter((v) => ['critical', 'high'].includes(v.severity.toLowerCase())).length;
}

export const pluginRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post(
    '/pillars/dos/admin/plugins/submit',
    { preHandler: [app.authenticate], schema: { body: Submit } },
    async (req, reply) => {
      const ctx = requirePlatformAdmin(req);
      requireStepUp(ctx, 600);
      const body = req.body as typeof Submit.static;
      for (const c of body.capabilities) {
        if (!CAPABILITIES.has(c)) throw new ForbiddenError(`capability ${c} not in allowlist`);
      }
      const verified = verifyCosign(body.cosign_payload, body.bundle_sha256, body.cosign_signer);
      const blockers = blockingVulns(body.vulnerabilities);
      const id = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        const state = verified && blockers === 0 ? 'verified' : 'submitted';
        const r = await sql<{ id: string }>`
          insert into platform.plugin_registry
            (code, version, bundle_sha256, cosign_signer, cosign_verified,
             sbom, vulnerabilities, capabilities, manifest, state)
          values
            (${body.code}, ${body.version}, ${body.bundle_sha256}, ${body.cosign_signer},
             ${verified}, ${JSON.stringify(body.sbom)}::jsonb,
             ${JSON.stringify(body.vulnerabilities ?? [])}::jsonb,
             ${body.capabilities}::text[], ${JSON.stringify(body.manifest)}::jsonb,
             ${state})
          on conflict (code) do update set
            version = excluded.version, bundle_sha256 = excluded.bundle_sha256,
            cosign_signer = excluded.cosign_signer, cosign_verified = excluded.cosign_verified,
            sbom = excluded.sbom, vulnerabilities = excluded.vulnerabilities,
            capabilities = excluded.capabilities, manifest = excluded.manifest,
            state = excluded.state, updated_at = now()
          returning id::text
        `.execute(tx);
        return r.rows[0]!.id;
      });
      reply.code(201);
      return { id, cosign_verified: verified, blocking_vulnerabilities: blockers };
    },
  );

  app.post(
    '/pillars/dos/admin/plugins/install',
    { preHandler: [app.authenticate], schema: { body: Decision } },
    async (req) => {
      const ctx = requirePlatformAdmin(req);
      requireStepUp(ctx, 600);
      const { id } = req.body as typeof Decision.static;
      await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        const r = await sql<{ state: string; cosign_verified: boolean }>`
          select state, cosign_verified from platform.plugin_registry where id = ${id}::uuid for update
        `.execute(tx);
        const row = r.rows[0];
        if (!row) throw new ForbiddenError('plugin not found');
        if (row.state !== 'verified') throw new ForbiddenError(`state ${row.state} not installable`);
        if (!row.cosign_verified) throw new ForbiddenError('cosign not verified');
        await sql`
          update platform.plugin_registry
             set state = 'installed', installed_at = now(), updated_at = now()
           where id = ${id}::uuid
        `.execute(tx);
      });
      void ctx;
      return { ok: true, id };
    },
  );

  app.post(
    '/pillars/dos/admin/plugins/disable',
    { preHandler: [app.authenticate], schema: { body: Decision } },
    async (req) => {
      const ctx = requirePlatformAdmin(req);
      requireStepUp(ctx, 600);
      const { id } = req.body as typeof Decision.static;
      await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        await sql`
          update platform.plugin_registry
             set state = 'disabled', disabled_at = now(), updated_at = now()
           where id = ${id}::uuid
        `.execute(tx);
      });
      void ctx;
      return { ok: true, id };
    },
  );

  app.get(
    '/pillars/dos/admin/plugins',
    { preHandler: [app.authenticate] },
    async (req) => {
      requirePlatformAdmin(req);
      const rows = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        const r = await sql`
          select id::text, code, version, bundle_sha256, cosign_signer, cosign_verified,
                 capabilities, vulnerabilities, manifest, state,
                 installed_at::text, disabled_at::text, created_at::text
            from platform.plugin_registry order by code limit 200
        `.execute(tx);
        return r.rows;
      });
      return { plugins: rows, capabilities: Array.from(CAPABILITIES.values()) };
    },
  );
};
