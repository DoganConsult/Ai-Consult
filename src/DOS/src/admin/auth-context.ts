import type { FastifyRequest } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '@dogan/contracts';

export interface AuthContext {
  userId: string;
  tenantId: string | null;
  email: string | null;
  roles: ReadonlyArray<string>;
  products: ReadonlyArray<string>;
  acr: string | null;
  acrAgeS: number;
  requestId: string;
  isPlatformAdmin: boolean;
}

export function authContextOf(req: FastifyRequest): AuthContext {
  const claims = req.claims;
  if (!claims) throw new UnauthorizedError('claims missing');
  const roles = Object.freeze([...(claims.roles ?? [])]);
  const acrRaw = (claims as { acr?: unknown }).acr;
  const iatRaw = (claims as { iat?: unknown }).iat;
  const acr = typeof acrRaw === 'string' ? acrRaw : null;
  const nowS = Math.floor(Date.now() / 1000);
  const iat = typeof iatRaw === 'number' ? iatRaw : nowS;
  return {
    userId: claims.sub,
    tenantId: claims.tid && claims.tid.length > 0 ? claims.tid : null,
    email: claims.email ?? null,
    roles,
    products: Object.freeze([...(claims.products ?? [])]),
    acr,
    acrAgeS: Math.max(0, nowS - iat),
    requestId: req.id,
    isPlatformAdmin: roles.includes('platform_admin'),
  };
}

export function requirePlatformAdmin(req: FastifyRequest): AuthContext {
  const ctx = authContextOf(req);
  if (!ctx.isPlatformAdmin) throw new ForbiddenError('platform_admin required');
  return ctx;
}

/** Step-up: caller must have re-authenticated within `maxAgeSec`. Token must carry an `acr`
 *  not equal to the default. Default acr means a normal silent SSO refresh and is rejected. */
export function requireStepUp(ctx: AuthContext, maxAgeSec = 600): void {
  if (!ctx.acr || ctx.acr === '0') throw new ForbiddenError('step-up required');
  if (ctx.acrAgeS > maxAgeSec) throw new ForbiddenError(`step-up expired (${ctx.acrAgeS}s > ${maxAgeSec}s)`);
}
