import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the DB layer *before* importing the middleware so its module-scoped cache is clean.
vi.mock('../../../config/database/database', () => ({
  safeQuery: vi.fn(),
}));
vi.mock('../observability/logger.service', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { safeQuery } from '../../../config/database/database';
import { requirePermission, invalidatePermissionCache } from './require-permission.middleware';

type MockRes = {
  statusCode: number;
  body: any;
  status: (n: number) => MockRes;
  json: (b: any) => MockRes;
};

function makeRes(): MockRes {
  const res: any = {};
  res.statusCode = 200;
  res.body = null;
  res.status = (n: number) => { res.statusCode = n; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  return res;
}

function makeReq(userId?: string): any {
  return { user: userId ? { userId } : undefined };
}

function stubSnapshot(opts: { permissions: string[]; isSuperAdmin?: boolean }): void {
  const q = safeQuery as unknown as ReturnType<typeof vi.fn>;
  q.mockReset();
  // Call 1 → access profiles, Call 2 → permissions (see loadSnapshot).
  q.mockResolvedValueOnce({ rows: opts.isSuperAdmin ? [{ code: 'platform_super_admin' }] : [] });
  q.mockResolvedValueOnce({ rows: opts.permissions.map((c) => ({ code: c })) });
}

describe('requirePermission middleware', () => {
  beforeEach(() => {
    invalidatePermissionCache();
  });

  it('returns 401 when the request is unauthenticated', async () => {
    const mw = requirePermission('platform.config.write');
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();
    await mw(req, res as any, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('passes through when no codes are supplied (guard bypass)', async () => {
    const mw = requirePermission();
    const req = makeReq('u-1');
    const res = makeRes();
    const next = vi.fn();
    await mw(req, res as any, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('denies 403 when the user lacks every required code', async () => {
    stubSnapshot({ permissions: ['platform.config.read'] });
    const mw = requirePermission('platform.config.write', 'platform.schema.manage');
    const req = makeReq('u-2');
    const res = makeRes();
    const next = vi.fn();
    await mw(req, res as any, next);
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ code: 'PERMISSION_DENIED', required: ['platform.config.write', 'platform.schema.manage'] });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows access with OR-semantics when any required code is present', async () => {
    stubSnapshot({ permissions: ['platform.schema.manage'] });
    const mw = requirePermission('platform.config.write', 'platform.schema.manage');
    const req = makeReq('u-3');
    const res = makeRes();
    const next = vi.fn();
    await mw(req, res as any, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it('super-admin access profile bypasses permission checks', async () => {
    stubSnapshot({ permissions: [], isSuperAdmin: true });
    const mw = requirePermission('platform.schema.manage', 'platform.ai.govern');
    const req = makeReq('u-super');
    const res = makeRes();
    const next = vi.fn();
    await mw(req, res as any, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('caches snapshot so repeated calls do not hit the DB', async () => {
    stubSnapshot({ permissions: ['platform.config.read'] });
    const mw = requirePermission('platform.config.read');

    const next1 = vi.fn(); await mw(makeReq('u-4'), makeRes() as any, next1);
    const next2 = vi.fn(); await mw(makeReq('u-4'), makeRes() as any, next2);

    expect(next1).toHaveBeenCalledOnce();
    expect(next2).toHaveBeenCalledOnce();
    // Only the first invocation triggered the 2 DB queries.
    expect((safeQuery as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });

  it('invalidatePermissionCache forces a reload on the next call', async () => {
    stubSnapshot({ permissions: ['platform.config.read'] });
    const mw = requirePermission('platform.config.read');
    await mw(makeReq('u-5'), makeRes() as any, vi.fn());

    // Invalidate → next call should reload → so re-stub with no permissions.
    invalidatePermissionCache('u-5');
    const q = safeQuery as unknown as ReturnType<typeof vi.fn>;
    q.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });

    const res = makeRes();
    const next = vi.fn();
    await mw(makeReq('u-5'), res as any, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});
