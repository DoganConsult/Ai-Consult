import { sql } from 'kysely';
import { Type } from '@sinclair/typebox';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ForbiddenError } from '@dogan/contracts';
import '@dogan/kernel';
import { authContextOf, requirePlatformAdmin, requireStepUp } from './auth-context.js';
import { appendAdminAction, verifyChain } from './audit-chain.js';

const ActionRequest = Type.Object({
  category:    Type.String({ minLength: 2, maxLength: 64 }),
  action:      Type.String({ minLength: 2, maxLength: 64 }),
  target_type: Type.String({ minLength: 2, maxLength: 64 }),
  target_id:   Type.Optional(Type.String({ maxLength: 128 })),
  reason:      Type.String({ minLength: 6, maxLength: 1024 }),
  diff:        Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

const ActionDecision = Type.Object({
  id:     Type.String({ format: 'uuid' }),
  reason: Type.String({ minLength: 6, maxLength: 1024 }),
});

export const adminActionRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Request a destructive action — actor opens a 4-eyes ticket.
  app.post(
    '/pillars/dos/admin/actions',
    { preHandler: [app.authenticate], schema: { body: ActionRequest } },
    async (req, reply) => {
      const ctx = requirePlatformAdmin(req);
      requireStepUp(ctx, 600);
      const body = req.body as typeof ActionRequest.static;
      const row = await appendAdminAction(app.kernel.db, ctx, 'requested', {
        category: body.category, action: body.action,
        targetType: body.target_type, targetId: body.target_id ?? null,
        reason: body.reason, diff: body.diff ?? {},
      }, null);
      reply.code(201);
      return row;
    },
  );

  // Approve — must be a different platform_admin than the requester.
  app.post(
    '/pillars/dos/admin/actions/approve',
    { preHandler: [app.authenticate], schema: { body: ActionDecision } },
    async (req) => {
      const ctx = requirePlatformAdmin(req);
      requireStepUp(ctx, 600);
      const { id, reason } = req.body as typeof ActionDecision.static;
      const open = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        const r = await sql<{ actor_id: string; state: string; category: string;
          action: string; target_type: string; target_id: string | null;
          reason: string; diff: unknown; expires_at: string }>`
          select actor_id::text, state, category, action, target_type, target_id,
                 reason, diff, expires_at::text
            from platform.admin_action_log where id = ${id}::uuid
            order by id desc limit 1
        `.execute(tx);
        return r.rows[0];
      });
      if (!open) throw new ForbiddenError('action not found');
      if (open.state !== 'requested') throw new ForbiddenError(`action not in requested state (state=${open.state})`);
      if (open.actor_id === ctx.userId) throw new ForbiddenError('approver must differ from requester');
      if (new Date(open.expires_at).getTime() < Date.now()) throw new ForbiddenError('action expired');
      const row = await appendAdminAction(app.kernel.db, ctx, 'approved', {
        category: open.category, action: open.action,
        targetType: open.target_type, targetId: open.target_id,
        reason, diff: { approves: id, original_reason: open.reason, original_diff: open.diff },
      }, ctx.userId);
      return row;
    },
  );

  // Reject.
  app.post(
    '/pillars/dos/admin/actions/reject',
    { preHandler: [app.authenticate], schema: { body: ActionDecision } },
    async (req) => {
      const ctx = requirePlatformAdmin(req);
      requireStepUp(ctx, 600);
      const { id, reason } = req.body as typeof ActionDecision.static;
      const row = await appendAdminAction(app.kernel.db, ctx, 'rejected', {
        category: 'admin', action: 'reject', targetType: 'admin_action_log', targetId: id,
        reason, diff: { rejected: id },
      }, ctx.userId);
      return row;
    },
  );

  // List.
  app.get(
    '/pillars/dos/admin/actions',
    { preHandler: [app.authenticate] },
    async (req) => {
      requirePlatformAdmin(req);
      const rows = await app.kernel.db.transaction().execute(async (tx) => {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
        const r = await sql`
          select id::text, ts::text, state, actor_id::text, approver_id::text,
                 category, action, target_type, target_id, reason, diff,
                 expires_at::text
            from platform.admin_action_log order by id desc limit 200
        `.execute(tx);
        return r.rows;
      });
      return { actions: rows };
    },
  );

  // Verify hash chain integrity.
  app.get(
    '/pillars/dos/admin/audit/verify',
    { preHandler: [app.authenticate] },
    async (req) => {
      requirePlatformAdmin(req);
      const r = await verifyChain(app.kernel.db);
      void authContextOf(req);
      return r;
    },
  );
};
