import { describe, it, expect } from 'vitest';
import { JwtVerifier, mintDevToken, OpenFgaClient } from '@dogan/authz';

const SECRET = 'dauth-test-secret';
const ISSUER = 'http://test.local/realms/dogan';
const AUDIENCE = 'dogan-kernel';

const verifier = new JwtVerifier({
  issuer: ISSUER,
  audience: AUDIENCE,
  devSecret: SECRET,
});

describe('DAuth JWT contract', () => {
  it('rejects a tampered token', async () => {
    const t = await mintDevToken(SECRET, {
      sub: 'u-1', tid: 't-1', products: ['consult'], roles: [],
      iss: ISSUER, aud: AUDIENCE,
    });
    const tampered = t.slice(0, -2) + (t.endsWith('A') ? 'B' : 'A');
    await expect(verifier.verify(tampered)).rejects.toThrow();
  });

  it('rejects a token without tid', async () => {
    const t = await mintDevToken(SECRET, {
      sub: 'u-1', tid: '' as unknown as string, products: [], roles: [],
      iss: ISSUER, aud: AUDIENCE,
    });
    await expect(verifier.verify(t)).rejects.toThrow();
  });

  it('accepts a well-formed token', async () => {
    const t = await mintDevToken(SECRET, {
      sub: 'u-1', tid: 't-abc', products: ['consult'], roles: ['member'],
      iss: ISSUER, aud: AUDIENCE,
    });
    const c = await verifier.verify(t);
    expect(c.sub).toBe('u-1');
    expect(c.tid).toBe('t-abc');
    expect(c.products).toEqual(['consult']);
  });
});

const FGA_URL = process.env.OPENFGA_URL;
const FGA_STORE = process.env.OPENFGA_STORE_ID;
const FGA_MODEL = process.env.OPENFGA_MODEL_ID;
const FGA_USER_ALLOW = process.env.OPENFGA_TEST_USER_ALLOW;
const FGA_USER_DENY = process.env.OPENFGA_TEST_USER_DENY;
const FGA_OBJECT = process.env.OPENFGA_TEST_OBJECT ?? 'product:consult';
const FGA_RELATION = process.env.OPENFGA_TEST_RELATION ?? 'reader';

describe.runIf(!!(FGA_URL && FGA_STORE && FGA_MODEL && FGA_USER_ALLOW && FGA_USER_DENY))(
  'DAuth OpenFGA contract',
  () => {
    const fga = new OpenFgaClient({ apiUrl: FGA_URL!, storeId: FGA_STORE, modelId: FGA_MODEL });
    it('allows the granted user', async () => {
      const ok = await fga.check({
        user: `user:${FGA_USER_ALLOW!}`, relation: FGA_RELATION, object: FGA_OBJECT,
      });
      expect(ok).toBe(true);
    });
    it('denies the ungranted user', async () => {
      const ok = await fga.check({
        user: `user:${FGA_USER_DENY!}`, relation: FGA_RELATION, object: FGA_OBJECT,
      });
      expect(ok).toBe(false);
    });
  },
);
