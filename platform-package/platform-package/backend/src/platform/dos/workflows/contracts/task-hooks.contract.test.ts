import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerTaskHook,
  runActionSLA,
  runSquadAssign,
  runNotify,
  runAudit,
  runAuthzCheck,
  runAuthzLog,
  registerFindEligibleHook,
  runFindEligibleAssignees,
  type ActionSLAInput,
} from './task-hooks.contract';

function resetHooks() {
  registerTaskHook('actionSLA', (async () => {}) as any);
  registerTaskHook('squadAssign', (async () => ({ assigned: false })) as any);
  registerTaskHook('notify', (async () => {}) as any);
  registerTaskHook('audit', (async () => {}) as any);
  registerTaskHook('authzCheck', (async () => true) as any);
  registerTaskHook('authzLog', (async () => {}) as any);
}

describe('task-hooks.contract', () => {
  describe('runSquadAssign — unregistered hook', () => {
    it('returns { assigned: false } when no hook registered', async () => {
      registerTaskHook('squadAssign', null as any);
      const result = await runSquadAssign('t1', 'task-1', 'AGENT-A01');
      expect(result).toEqual({ assigned: false });
    });
  });

  describe('runAuthzCheck — unregistered hook', () => {
    it('returns true (allow) when no hook registered', async () => {
      registerTaskHook('authzCheck', null as any);
      const result = await runAuthzCheck('t1', 'user-1', 'risk.write');
      expect(result).toBe(true);
    });
  });

  describe('runFindEligibleAssignees — unregistered hook', () => {
    it('returns empty array when no hook registered', async () => {
      registerFindEligibleHook(null as any);
      const result = await runFindEligibleAssignees('t1', 'risk', 'risk.write', {});
      expect(result).toEqual([]);
    });
  });

  describe('registered hooks are invoked', () => {
    beforeEach(() => resetHooks());

    it('runActionSLA delegates to registered hook', async () => {
      const spy = vi.fn(async () => {});
      registerTaskHook('actionSLA', spy);

      const input: ActionSLAInput = {
        actionId: 'a1',
        tenantId: 't1',
        actionType: 'review',
        priority: 'high',
        dueInHours: 24,
      };
      await runActionSLA(input);
      expect(spy).toHaveBeenCalledWith(input);
    });

    it('runSquadAssign delegates to registered hook', async () => {
      const spy = vi.fn(async () => ({ assigned: true, agentCode: 'A01' }));
      registerTaskHook('squadAssign', spy);
      const result = await runSquadAssign('t1', 'task-1', 'AGENT-A01');
      expect(result).toEqual({ assigned: true, agentCode: 'A01' });
      expect(spy).toHaveBeenCalledWith('t1', 'task-1', 'AGENT-A01');
    });

    it('runNotify delegates to registered hook', async () => {
      const spy = vi.fn(async () => {});
      registerTaskHook('notify', spy);
      const opts = { userId: 'u1', type: 'task_assigned', title: 'T', body: 'B', link: '/x' };
      await runNotify('t1', opts);
      expect(spy).toHaveBeenCalledWith('t1', opts);
    });

    it('runAudit delegates to registered hook', async () => {
      const spy = vi.fn(async () => {});
      registerTaskHook('audit', spy);
      const opts = { userId: 'u1', action: 'approve' };
      await runAudit('t1', opts);
      expect(spy).toHaveBeenCalledWith('t1', opts);
    });

    it('runAuthzCheck delegates to registered hook', async () => {
      const spy = vi.fn(async () => false);
      registerTaskHook('authzCheck', spy);
      const result = await runAuthzCheck('t1', 'user-1', 'risk.write');
      expect(result).toBe(false);
      expect(spy).toHaveBeenCalledWith('t1', 'user-1', 'risk.write');
    });

    it('runAuthzLog delegates to registered hook', async () => {
      const spy = vi.fn(async () => {});
      registerTaskHook('authzLog', spy);
      const opts = { userId: 'u1', permissionCode: 'risk.write' };
      await runAuthzLog('t1', opts);
      expect(spy).toHaveBeenCalledWith('t1', opts);
    });

    it('runFindEligibleAssignees delegates to registered hook', async () => {
      const spy = vi.fn(async () => [
        { userId: 'u1', teamId: 'team-1', functionalRoleCode: 'risk_officer' },
      ]);
      registerFindEligibleHook(spy);
      const result = await runFindEligibleAssignees('t1', 'risk', 'risk.write', { limit: 3 });
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('u1');
      expect(spy).toHaveBeenCalledWith('t1', 'risk', 'risk.write', { limit: 3 });
    });
  });
});
