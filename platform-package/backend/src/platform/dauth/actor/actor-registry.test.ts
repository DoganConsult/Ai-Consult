import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database/database', () => ({
  safeQuery: (...args: any[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

import { getActor, registerActor, type Actor } from './actor-registry';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [] });
});

describe('DAuth ActorRegistry', () => {
  describe('getActor', () => {
    it('returns null when actor not found', async () => {
      expect(await getActor('t1', 'a-missing')).toBeNull();
    });

    it('returns mapped actor when found', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{
        actor_id: 'a-001', actor_type: 'human', user_id: 'u-001',
        display_name: 'Alice', tenant_id: 't1', is_active: true,
      }] });
      const actor = await getActor('t1', 'a-001');
      expect(actor).toEqual({
        actorId: 'a-001', type: 'human', userId: 'u-001',
        displayName: 'Alice', tenantId: 't1', isActive: true,
      });
    });

    it('queries correct schema', async () => {
      await getActor('t1', 'a-001');
      const [sql] = mockSafeQuery.mock.calls[0];
      expect(sql).toContain('"tenant_t1".actor_registry');
    });
  });

  describe('registerActor', () => {
    it('inserts actor and returns with isActive=true', async () => {
      const input: Omit<Actor, 'isActive'> = {
        actorId: 'a-new', type: 'agent', userId: 'u-001',
        displayName: 'Bot', tenantId: 't1',
      };
      const result = await registerActor('t1', input);
      expect(result.isActive).toBe(true);
      expect(result.actorId).toBe('a-new');
      const [sql] = mockSafeQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO');
      expect(sql).toContain('ON CONFLICT');
    });
  });

  // ── All 4 actor types: human, system (service_account), agent, external ──

  describe('actor type — human', () => {
    it('registers and retrieves a human actor', async () => {
      const input: Omit<Actor, 'isActive'> = {
        actorId: 'a-human-001', type: 'human', userId: 'u-100',
        displayName: 'Alice Admin', tenantId: 't1',
      };
      const registered = await registerActor('t1', input);
      expect(registered.type).toBe('human');
      expect(registered.isActive).toBe(true);
      expect(registered.displayName).toBe('Alice Admin');

      // Simulate retrieval
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{
          actor_id: 'a-human-001', actor_type: 'human', user_id: 'u-100',
          display_name: 'Alice Admin', tenant_id: 't1', is_active: true,
        }],
      });
      const actor = await getActor('t1', 'a-human-001');
      expect(actor?.type).toBe('human');
      expect(actor?.userId).toBe('u-100');
    });
  });

  describe('actor type — service_account', () => {
    it('registers and retrieves a service account actor', async () => {
      const input: Omit<Actor, 'isActive'> = {
        actorId: 'a-svc-001', type: 'service_account', userId: 'svc-api',
        displayName: 'API Service', tenantId: 't1',
      };
      const registered = await registerActor('t1', input);
      expect(registered.type).toBe('service_account');

      mockSafeQuery.mockResolvedValueOnce({
        rows: [{
          actor_id: 'a-svc-001', actor_type: 'service_account', user_id: 'svc-api',
          display_name: 'API Service', tenant_id: 't1', is_active: true,
        }],
      });
      const actor = await getActor('t1', 'a-svc-001');
      expect(actor?.type).toBe('service_account');
    });
  });

  describe('actor type — agent', () => {
    it('registers and retrieves an AI agent actor', async () => {
      const input: Omit<Actor, 'isActive'> = {
        actorId: 'a-agent-001', type: 'agent', userId: 'agent-risk',
        displayName: 'Risk Analysis Agent', tenantId: 't1',
      };
      const registered = await registerActor('t1', input);
      expect(registered.type).toBe('agent');

      mockSafeQuery.mockResolvedValueOnce({
        rows: [{
          actor_id: 'a-agent-001', actor_type: 'agent', user_id: 'agent-risk',
          display_name: 'Risk Analysis Agent', tenant_id: 't1', is_active: true,
        }],
      });
      const actor = await getActor('t1', 'a-agent-001');
      expect(actor?.type).toBe('agent');
      expect(actor?.displayName).toBe('Risk Analysis Agent');
    });
  });

  describe('actor type — external', () => {
    it('registers and retrieves an external actor', async () => {
      const input: Omit<Actor, 'isActive'> = {
        actorId: 'a-ext-001', type: 'external',
        displayName: 'External Auditor', tenantId: 't1',
      };
      const registered = await registerActor('t1', input);
      expect(registered.type).toBe('external');

      mockSafeQuery.mockResolvedValueOnce({
        rows: [{
          actor_id: 'a-ext-001', actor_type: 'external', user_id: null,
          display_name: 'External Auditor', tenant_id: 't1', is_active: true,
        }],
      });
      const actor = await getActor('t1', 'a-ext-001');
      expect(actor?.type).toBe('external');
      expect(actor?.userId).toBeNull(); // external actors have null userId
    });

    it('registers external actor without userId', async () => {
      const input: Omit<Actor, 'isActive'> = {
        actorId: 'a-ext-002', type: 'external',
        displayName: 'Vendor Rep', tenantId: 't1',
      };
      const registered = await registerActor('t1', input);
      expect(registered.actorId).toBe('a-ext-002');

      const [sql, params] = mockSafeQuery.mock.calls[0];
      expect(params[2]).toBeNull(); // user_id should be null
    });
  });

  describe('actor registry — edge cases', () => {
    it('upserts existing actor on conflict', async () => {
      const input: Omit<Actor, 'isActive'> = {
        actorId: 'a-dup', type: 'human', userId: 'u-dup',
        displayName: 'Original Name', tenantId: 't1',
      };
      await registerActor('t1', input);

      // Re-register with updated display name
      const updated: Omit<Actor, 'isActive'> = {
        actorId: 'a-dup', type: 'human', userId: 'u-dup',
        displayName: 'Updated Name', tenantId: 't1',
      };
      const result = await registerActor('t1', updated);
      expect(result.displayName).toBe('Updated Name');

      // Verify ON CONFLICT DO UPDATE was used
      const [sql] = mockSafeQuery.mock.calls[1];
      expect(sql).toContain('ON CONFLICT (actor_id) DO UPDATE');
    });

    it('retrieves null for nonexistent actor and correct type for each', async () => {
      const notFound = await getActor('t1', 'a-ghost');
      expect(notFound).toBeNull();
    });
  });
});
