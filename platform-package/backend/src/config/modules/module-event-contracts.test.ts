import { describe, it, expect } from 'vitest';
import { MODULE_EVENT_CONTRACTS } from './module-event-contracts';

/**
 * Contract R1: chainTriggerEvents must be subsets of events (no orphan triggers).
 */
describe('MODULE_EVENT_CONTRACTS', () => {
  it('chainTriggerEvents ⊆ events for every canonical module', () => {
    for (const [code, contract] of Object.entries(MODULE_EVENT_CONTRACTS)) {
      for (const evt of contract.chainTriggerEvents) {
        expect(
          contract.events,
          `${code}: chain trigger "${evt}" must appear in events[]`,
        ).toContain(evt);
      }
    }
  });

  it('chain trigger event names are unique per module (no duplicate registrations)', () => {
    for (const [code, contract] of Object.entries(MODULE_EVENT_CONTRACTS)) {
      const set = new Set(contract.chainTriggerEvents);
      expect(set.size, `${code}: duplicate chainTriggerEvents`).toBe(contract.chainTriggerEvents.length);
    }
  });
});
