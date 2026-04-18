import { Type } from '@sinclair/typebox';
import { sql } from 'kysely';
import type { ModulePlugin } from '@dogan/kernel';
import { TenantContextMissingError } from '@dogan/contracts';

const NoteCreate = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 256 }),
  body: Type.String({ default: '', maxLength: 16_384 }),
});

const Note = Type.Object({
  id: Type.String({ format: 'uuid' }),
  tenant_id: Type.String({ format: 'uuid' }),
  user_id: Type.Union([Type.String(), Type.Null()]),
  title: Type.String(),
  body: Type.String(),
  created_at: Type.String(),
});

const notesModule: ModulePlugin = async (app, ctx) => {
  const { services } = ctx;

  app.addHook('preHandler', app.authenticate);

  app.get(
    '/',
    { schema: { response: { 200: Type.Array(Note) } } },
    async (req) => {
      if (!req.tenantCtx) throw new TenantContextMissingError();
      return await services.withTenant(req.tenantCtx, async (tx) => {
        const result = await sql<{
          id: string;
          tenant_id: string;
          user_id: string | null;
          title: string;
          body: string;
          created_at: string;
        }>`select id, tenant_id, user_id, title, body, created_at::text as created_at
             from product_consult.notes
             order by created_at desc
             limit 100`.execute(tx as never);
        return result.rows;
      });
    },
  );

  app.post(
    '/',
    {
      schema: {
        body: NoteCreate,
        response: { 201: Note },
      },
    },
    async (req, reply) => {
      if (!req.tenantCtx) throw new TenantContextMissingError();
      const { title, body } = req.body as { title: string; body: string };
      const row = await services.withTenant(req.tenantCtx, async (tx) => {
        const res = await sql<{
          id: string;
          tenant_id: string;
          user_id: string | null;
          title: string;
          body: string;
          created_at: string;
        }>`insert into product_consult.notes (tenant_id, user_id, title, body)
             values (
               nullif(current_setting('app.tenant_id', true), '')::uuid,
               nullif(current_setting('app.user_id', true), '')::uuid,
               ${title},
               ${body}
             )
             returning id, tenant_id, user_id, title, body, created_at::text as created_at`.execute(
          tx as never,
        );
        return res.rows[0]!;
      });
      reply.code(201);
      return row;
    },
  );
};

export default notesModule;
