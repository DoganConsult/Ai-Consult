import { describe, expect, it } from 'vitest';
import { AbacEvaluator, type AbacPolicy } from './abac.js';

const ev = new AbacEvaluator();

const baseCtx = {
  user: { id: 'u1', roles: ['reader'], country: 'SA' },
  resource: { owner: 'u1', classification: 'internal' },
  env: { mfa: true, hour: 10 },
};

describe('AbacEvaluator', () => {
  it('permits when expression matches', () => {
    const policies: AbacPolicy[] = [{
      id: '1', code: 'own-read', effect: 'permit',
      resource: 'consult.notes', action: 'read',
      expression: 'user.id == resource.owner && env.mfa == true',
      priority: 10, enabled: true,
    }];
    const d = ev.evaluate(policies, baseCtx, 'consult.notes', 'read');
    expect(d.allow).toBe(true);
    expect(d.reason).toContain('permit-by');
  });

  it('denies when deny policy matches (short-circuit)', () => {
    const policies: AbacPolicy[] = [
      { id: '1', code: 'permit-all', effect: 'permit', resource: '*', action: '*',
        expression: 'true', priority: 100, enabled: true },
      { id: '2', code: 'deny-hr', effect: 'deny', resource: '*', action: '*',
        expression: '"hr" in user.roles', priority: 1, enabled: true },
    ];
    const ctx = { ...baseCtx, user: { ...baseCtx.user, roles: ['reader', 'hr'] } };
    const d = ev.evaluate(policies, ctx, 'consult.notes', 'read');
    expect(d.allow).toBe(false);
    expect(d.reason).toContain('deny-by');
  });

  it('rejects disallowed identifier', () => {
    expect(() => ev.evalExpr('process.env.FOO == "x"', baseCtx)).toThrow();
  });

  it('rejects function calls', () => {
    expect(() => ev.evalExpr('atob("x")', baseCtx)).toThrow();
  });

  it('no matching policy = deny', () => {
    const d = ev.evaluate([], baseCtx, 'x', 'y');
    expect(d.allow).toBe(false);
  });
});
