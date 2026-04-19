import { Type } from '@sinclair/typebox';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import '@dogan/kernel';
import { requirePlatformAdmin, requireStepUp } from './auth-context.js';
import { grantJit, revokeJit, listJit } from './jit-elevation.js';

const Grant = Type.Object({
  user_id:     Type.String({ format: 'uuid' }),
  role:        Type.String({ minLength: 2, maxLength: 64 }),
  ticket_ref:  Type.String({ minLength: 2, maxLength: 128 }),
  ttl_minutes: Type.Integer({ minimum: 1, maximum: 480 }),
});

const Revoke = Type.Object({
  id: Type.String({ format: 'uuid' }),
  reason: Type.String({ minLength: 6, maxLength: 1024 }),
});

export const jitRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get(
    '/pillars/dos/admin/jit',
    { preHandler: [app.authenticate] },
    async (req) => {
      requirePlatformAdmin(req);
      const grants = await listJit(app.kernel.db);
      return { grants };
    },
  );

  app.post(
    '/pillars/dos/admin/jit/grant',
    { preHandler: [app.authenticate], schema: { body: Grant } },
    async (req, reply) => {
      const ctx = requirePlatformAdmin(req);
      requireStepUp(ctx, 600);
      const body = req.body as typeof Grant.static;
      const id = await grantJit(app.kernel.db, ctx, {
        userId: body.user_id, role: body.role,
        ticketRef: body.ticket_ref, ttlMinutes: body.ttl_minutes,
      });
      reply.code(201);
      return { id };
    },
  );

  app.post(
    '/pillars/dos/admin/jit/revoke',
    { preHandler: [app.authenticate], schema: { body: Revoke } },
    async (req) => {
      const ctx = requirePlatformAdmin(req);
      requireStepUp(ctx, 600);
      const body = req.body as typeof Revoke.static;
      await revokeJit(app.kernel.db, ctx, body.id, body.reason);
      return { ok: true };
    },
  );
};
