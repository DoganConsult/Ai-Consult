import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../dauth', () => ({
  evaluateLifecycleTransition: vi.fn(),
}));
vi.mock('../../../../config/database', () => ({
  safeQuery: vi.fn(),
  tenantSchema: (t: string) => `tenant_${t}`,
}));
vi.mock('../../observability/logger.service', () => ({
  logger: { warn: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { lifecycleGate } from '../lifecycle-gate.middleware';
import { evaluateLifecycleTransition } from '../../../dauth';
import { safeQuery } from '../../../../config/database';

function mockReq(overrides: Record<string, unknown> = {}): unknown {
  return {
    method: 'PATCH',
    body: { status: 'active' },
    params: { id: 'entity-1' },
    tenantId: 'tenant-1',
    user: { userId: 'user-1' },
    ...overrides,
  };
}

function mockRes(): unknown {
  const res: unknown = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('lifecycleGate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips GET requests', async () => {
    const mw = lifecycleGate('compliance', 'controls');
    const next = vi.fn();
    await mw(mockReq({ method: 'GET' }), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('skips requests without status field', async () => {
    const mw = lifecycleGate('compliance', 'controls');
    const next = vi.fn();
    await mw(mockReq({ body: { name: 'test' } }), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when evaluateLifecycleTransition throws (deny-by-default Law 11)', async () => {
    (safeQuery as any).mockResolvedValue({ rows: [{ current_status: 'draft' }] });
    (evaluateLifecycleTransition as any).mockRejectedValue(new Error('DAuth service unavailable'));

    const mw = lifecycleGate('compliance', 'controls');
    const res = mockRes();
    const next = vi.fn();
    await mw(mockReq(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Lifecycle gate check failed — access denied' }),
    );
  });

  it('returns 403 when transition is denied', async () => {
    (safeQuery as any).mockResolvedValue({ rows: [{ current_status: 'draft' }] });
    (evaluateLifecycleTransition as any).mockResolvedValue({
      allowed: false,
      reason: 'Insufficient authority',
      checks: [],
    });

    const mw = lifecycleGate('compliance', 'controls');
    const res = mockRes();
    const next = vi.fn();
    await mw(mockReq(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Lifecycle transition denied',
        reason: 'Insufficient authority',
      }),
    );
  });

  it('calls next() and sets lifecycleAuth when transition is allowed', async () => {
    (safeQuery as any).mockResolvedValue({ rows: [{ current_status: 'draft' }] });
    (evaluateLifecycleTransition as any).mockResolvedValue({ allowed: true });

    const mw = lifecycleGate('compliance', 'controls');
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    await mw(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.lifecycleAuth).toEqual(
      expect.objectContaining({
        allowed: true,
        fromStatus: 'draft',
        toStatus: 'active',
        moduleCode: 'compliance',
        entityType: 'controls',
        entityId: 'entity-1',
      }),
    );
  });
});
