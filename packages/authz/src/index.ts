import {
  createRemoteJWKSet,
  jwtVerify,
  SignJWT,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';
import { UnauthorizedError, ForbiddenError, type Platform } from '@dogan/contracts';

export interface JwtVerifierOptions {
  issuer: string;
  audience: string;
  jwksUrl?: string;
  devSecret?: string;
}

export interface VerifiedClaims {
  sub: string;
  tid: string;
  email?: string;
  products: string[];
  roles: string[];
  [k: string]: unknown;
}

export class JwtVerifier {
  private readonly getKey?: JWTVerifyGetKey;
  private readonly devSecret?: Uint8Array;

  constructor(private readonly opts: JwtVerifierOptions) {
    if (opts.jwksUrl) {
      this.getKey = createRemoteJWKSet(new URL(opts.jwksUrl));
    } else if (opts.devSecret) {
      this.devSecret = new TextEncoder().encode(opts.devSecret);
    } else {
      // Will throw on verify if no key source configured
    }
  }

  async verify(token: string): Promise<VerifiedClaims> {
    if (!token) throw new UnauthorizedError('missing token');
    try {
      if (this.getKey) {
        const { payload } = await jwtVerify(token, this.getKey, {
          issuer: this.opts.issuer,
          audience: this.opts.audience,
        });
        return this.coerce(payload);
      }
      if (this.devSecret) {
        const { payload } = await jwtVerify(token, this.devSecret, {
          issuer: this.opts.issuer,
          audience: this.opts.audience,
        });
        return this.coerce(payload);
      }
      throw new UnauthorizedError('no jwt key source configured');
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('invalid token');
    }
  }

  private coerce(payload: JWTPayload): VerifiedClaims {
    if (!payload.sub) throw new UnauthorizedError('sub missing');
    const tid = (payload as Record<string, unknown>).tid;
    if (typeof tid !== 'string') throw new UnauthorizedError('tid missing');
    const products = ((payload as Record<string, unknown>).products ?? []) as string[];
    const roles = ((payload as Record<string, unknown>).roles ?? []) as string[];
    return {
      sub: String(payload.sub),
      tid,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      products: Array.isArray(products) ? products : [],
      roles: Array.isArray(roles) ? roles : [],
    };
  }
}

/** Dev helper — ONLY for local testing. Mint a JWT with a shared secret. */
export async function mintDevToken(
  secret: string,
  claims: VerifiedClaims & { iss: string; aud: string; ttlSeconds?: number },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (claims.ttlSeconds ?? 3600);
  return await new SignJWT({
    tid: claims.tid,
    email: claims.email,
    products: claims.products,
    roles: claims.roles,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(claims.iss)
    .setAudience(claims.aud)
    .setSubject(claims.sub)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(new TextEncoder().encode(secret));
}

export interface AuthzCheck {
  user: string;
  relation: string;
  object: string;
}

export interface AuthzClient {
  check(input: AuthzCheck): Promise<boolean>;
  assert(input: AuthzCheck): Promise<void>;
}

export interface OpenFgaOptions {
  apiUrl: string;
  storeId?: string;
  modelId?: string;
  fetch?: typeof fetch;
}

/**
 * Minimal OpenFGA client (HTTP). Replace with @openfga/sdk later without
 * changing callers.
 */
export class OpenFgaClient implements AuthzClient {
  constructor(private readonly opts: OpenFgaOptions) {}

  async check(input: AuthzCheck): Promise<boolean> {
    if (!this.opts.storeId) {
      // If store not configured, fail closed in production, open in dev via env
      return process.env.AUTHZ_ALLOW_ALL === 'true';
    }
    const f = this.opts.fetch ?? fetch;
    const url = `${this.opts.apiUrl}/stores/${this.opts.storeId}/check`;
    const body = {
      authorization_model_id: this.opts.modelId,
      tuple_key: {
        user: input.user,
        relation: input.relation,
        object: input.object,
      },
    };
    const res = await f(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`openfga check failed: ${res.status}`);
    }
    const json = (await res.json()) as { allowed?: boolean };
    return Boolean(json.allowed);
  }

  async assert(input: AuthzCheck): Promise<void> {
    const ok = await this.check(input);
    if (!ok) throw new ForbiddenError(`denied: ${input.user} ${input.relation} ${input.object}`);
  }
}

export type { Platform };
