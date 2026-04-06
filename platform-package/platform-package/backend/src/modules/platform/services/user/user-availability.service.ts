import { safeQuery, tenantSchema } from '../../../../config/database';
import type { UserAvailability, AvailabilityStatus } from '../../../../types/actor-identity.types';

export async function getUserAvailability(tenantId: string, userId: string): Promise<UserAvailability | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".user_availability WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  if (rows.length === 0) return null;
  return mapAvailabilityRow(rows[0]);
}

export async function setUserAvailability(
  tenantId: string,
  userId: string,
  input: {
    status: AvailabilityStatus;
    oooStart?: string;
    oooEnd?: string;
    delegateUserId?: string;
    workingHours?: { start: string; end: string; days: number[] };
    timezone?: string;
    autoDelegate?: boolean;
  },
): Promise<UserAvailability> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".user_availability
       (user_id, status, ooo_start, ooo_end, delegate_user_id,
        working_hours, timezone, auto_delegate)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id) DO UPDATE SET
       status = EXCLUDED.status,
       ooo_start = EXCLUDED.ooo_start,
       ooo_end = EXCLUDED.ooo_end,
       delegate_user_id = EXCLUDED.delegate_user_id,
       working_hours = COALESCE(EXCLUDED.working_hours, user_availability.working_hours),
       timezone = COALESCE(EXCLUDED.timezone, user_availability.timezone),
       auto_delegate = COALESCE(EXCLUDED.auto_delegate, user_availability.auto_delegate),
       updated_at = NOW()
     RETURNING *`,
    [
      userId,
      input.status,
      input.oooStart || null,
      input.oooEnd || null,
      input.delegateUserId || null,
      JSON.stringify(input.workingHours || { start: '08:00', end: '17:00', days: [0, 1, 2, 3, 4] }),
      input.timezone || 'Asia/Riyadh',
      input.autoDelegate ?? false,
    ],
  );
  return mapAvailabilityRow(rows[0]);
}

function mapAvailabilityRow(row: any): UserAvailability {
  return {
    userId: row.user_id,
    status: row.status,
    oooStart: row.ooo_start || undefined,
    oooEnd: row.ooo_end || undefined,
    delegateUserId: row.delegate_user_id || undefined,
    workingHours: row.working_hours || { start: '08:00', end: '17:00', days: [0, 1, 2, 3, 4] },
    timezone: row.timezone || 'Asia/Riyadh',
    autoDelegate: row.auto_delegate ?? false,
  };
}
