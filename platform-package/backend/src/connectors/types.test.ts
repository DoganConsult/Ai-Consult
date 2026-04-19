/**
 * Unit tests for the connector registry.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  connectorRegistry,
  type PlatformConnector,
} from './types';

function stub(code: string, vendor: PlatformConnector['vendor'] = 'microsoft'): PlatformConnector {
  return {
    code,
    vendor,
    auth: 'client_credentials',
    requiredScopes: [],
    healthProbe: async () => ({ status: 'unknown', checkedAt: new Date() }),
    invoke: async () => ({}) as never,
  };
}

describe('connectorRegistry', () => {
  beforeEach(() => {
    // registry is a singleton — clear between tests via private access
    (connectorRegistry as unknown as { byCode: Map<string, unknown> }).byCode.clear();
  });

  it('registers and retrieves connectors by code', () => {
    const c = stub('graph_outlook');
    connectorRegistry.register(c);
    expect(connectorRegistry.get('graph_outlook')).toBe(c);
    expect(connectorRegistry.require('graph_outlook')).toBe(c);
  });

  it('rejects duplicate registration', () => {
    connectorRegistry.register(stub('graph_outlook'));
    expect(() => connectorRegistry.register(stub('graph_outlook'))).toThrow(
      /duplicate connector code/,
    );
  });

  it('require() throws on unknown code', () => {
    expect(() => connectorRegistry.require('nope')).toThrow(/unknown connector code/);
  });

  it('listByVendor filters', () => {
    connectorRegistry.register(stub('graph_outlook', 'microsoft'));
    connectorRegistry.register(stub('google_drive', 'google'));
    expect(connectorRegistry.listByVendor('microsoft').map(c => c.code)).toEqual([
      'graph_outlook',
    ]);
    expect(connectorRegistry.listByVendor('google').map(c => c.code)).toEqual([
      'google_drive',
    ]);
  });
});
