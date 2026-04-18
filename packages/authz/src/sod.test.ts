import { describe, expect, it } from 'vitest';
import { SodEvaluator, type SodRule } from './sod.js';

const ev = new SodEvaluator();

describe('SodEvaluator', () => {
  const rule: SodRule = {
    id: 'r1', code: 'purchasing-vs-payment', kind: 'static',
    conflictSet: ['purchaser', 'payer'], enforce: 'block', enabled: true,
  };

  it('flags blocking violation when pending role conflicts', () => {
    const v = ev.evaluateGrant([rule], { currentRoles: ['purchaser'], pendingRole: 'payer' });
    expect(v).toHaveLength(1);
    expect(v[0]!.decision).toBe('blocked');
    expect(v[0]!.conflicting).toEqual(['purchaser']);
  });

  it('no violation when not in conflict set', () => {
    const v = ev.evaluateGrant([rule], { currentRoles: ['reader'], pendingRole: 'writer' });
    expect(v).toHaveLength(0);
  });

  it('assertNoBlocking throws on blocked', () => {
    const v = ev.evaluateGrant([rule], { currentRoles: ['purchaser'], pendingRole: 'payer' });
    expect(() => ev.assertNoBlocking(v)).toThrow();
  });

  it('warn mode records but does not change evaluation', () => {
    const warn: SodRule = { ...rule, enforce: 'warn', id: 'r2', code: 'warn-only' };
    const v = ev.evaluateGrant([warn], { currentRoles: ['purchaser'], pendingRole: 'payer' });
    expect(v[0]!.decision).toBe('warned');
    expect(() => ev.assertNoBlocking(v)).not.toThrow();
  });

  it('dynamic: flags when 2+ conflict roles held at runtime', () => {
    const dyn: SodRule = { ...rule, kind: 'dynamic' };
    const v = ev.evaluateRuntime([dyn], ['purchaser', 'payer', 'reader']);
    expect(v).toHaveLength(1);
  });
});
