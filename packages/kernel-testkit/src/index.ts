import { sql } from 'kysely';
import { createDb, withTenant, type Database } from '@dogan/db';
import type { Kysely } from 'kysely';

export { createDb, withTenant };

export interface RlsProbeOptions {
  appConnectionString: string;
  tenantA: string;
  tenantB: string;
}

export interface RlsProbeResult {
  tenantASees: number;
  tenantBSees: number;
  crossVisible: boolean;
}

/**
 * Inserts one note for each tenant using platform-admin context (bypasses policies
 * via GUC `app.is_platform_admin`), then reads as each tenant and asserts no cross-visibility.
 */
export async function probeTwoTenantIsolation(
  opts: RlsProbeOptions,
): Promise<RlsProbeResult> {
  const db: Kysely<Database> = createDb({
    connectionString: opts.appConnectionString,
    appName: 'rls-probe',
  });
  try {
    const userA = '00000000-0000-0000-0000-00000000000a';
    const userB = '00000000-0000-0000-0000-00000000000b';
    await db.transaction().execute(async (tx) => {
      await sql`select set_config('app.is_platform_admin', 'true', true)`.execute(tx);
      await sql`insert into product_consult.notes (tenant_id, user_id, title, body)
                values (${opts.tenantA}::uuid, ${userA}::uuid, 'A-note', 'owned by A')`.execute(tx);
      await sql`insert into product_consult.notes (tenant_id, user_id, title, body)
                values (${opts.tenantB}::uuid, ${userB}::uuid, 'B-note', 'owned by B')`.execute(tx);
    });

    const readAs = async (tid: string, uid: string): Promise<number> =>
      withTenant(db, { tenantId: tid, userId: uid }, async (tx) => {
        const r = await sql<{ count: string }>`select count(*)::text as count
                                                  from product_consult.notes`.execute(tx as never);
        return Number(r.rows[0]?.count ?? 0);
      });

    const tenantASees = await readAs(opts.tenantA, userA);
    const tenantBSees = await readAs(opts.tenantB, userB);

    return {
      tenantASees,
      tenantBSees,
      crossVisible: tenantASees !== 1 || tenantBSees !== 1,
    };
  } finally {
    await db.destroy();
  }
}
