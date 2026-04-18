import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Database } from '@dogan/db';

export interface AuditInput {
  tenantId: string | null;
  userId: string | null;
  action: string;
  target: string;
  requestId?: string | null;
  clientIp?: string | null;
  statusCode?: number | null;
  meta?: Record<string, unknown>;
}

/**
 * Inserts an audit row inside the active tenant transaction context.
 * Uses platform_admin override when tenantId is null (platform-level events).
 */
export class AuditSink {
  constructor(private readonly db: Kysely<Database>) {}

  async write(input: AuditInput): Promise<void> {
    await this.db.transaction().execute(async (tx) => {
      if (input.tenantId) {
        await sql`select set_config('app.tenant_id',${input.tenantId},true)`.execute(tx);
      } else {
        await sql`select set_config('app.is_platform_admin','true',true)`.execute(tx);
      }
      await sql`
        insert into platform.audit_log
          (tenant_id, user_id, action, target, request_id, client_ip, status_code, meta)
        values
          (${input.tenantId}::uuid, ${input.userId}::uuid,
           ${input.action}, ${input.target},
           ${input.requestId ?? null}, ${input.clientIp ?? null}::inet,
           ${input.statusCode ?? null},
           ${JSON.stringify(input.meta ?? {})}::jsonb)
      `.execute(tx);
    });
  }

  async sweepRetention(): Promise<number> {
    const r = await sql<{ n: number }>`select platform.audit_log_retention_sweep() as n`.execute(this.db);
    return Number(r.rows[0]?.n ?? 0);
  }

  async ensureMonthlyPartitions(): Promise<void> {
    await sql`select platform.audit_log_ensure_partition(now())`.execute(this.db);
    await sql`select platform.audit_log_ensure_partition(now() + interval '1 month')`.execute(this.db);
    await sql`select platform.audit_log_ensure_partition(now() + interval '2 month')`.execute(this.db);
  }
}
