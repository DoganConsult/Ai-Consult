import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { probeTwoTenantIsolation } from './index.js';

const DB = process.env.TEST_APP_DATABASE_URL;

describe.runIf(!!DB)('two-tenant RLS isolation', () => {
  it('never leaks rows across tenants', async () => {
    const result = await probeTwoTenantIsolation({
      appConnectionString: DB!,
      tenantA: randomUUID(),
      tenantB: randomUUID(),
    });
    expect(result.crossVisible).toBe(false);
    expect(result.tenantASees).toBe(1);
    expect(result.tenantBSees).toBe(1);
  });
});
