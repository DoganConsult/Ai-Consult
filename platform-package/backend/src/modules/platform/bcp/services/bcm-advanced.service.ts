/**
 * BCM Advanced Service — Single Points of Failure Detection
 * --------------------------------
 * Analyses organisational and BCP data to surface risks where
 * a single person, process, or system represents a point of failure
 * with no redundancy or backup.
 *
 * Checks performed:
 *   1. Positions / functional roles with only one active assignee
 *   2. Critical BCP processes that lack a documented backup owner
 *   3. Key-person dependencies — individuals who own multiple critical items
 */

import { safeQuery } from '../../../../config/database';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function schema(tenantId: string): string {
  return `tenant_${tenantId.replace(/-/g, '_')}`;
}

export interface SinglePointOfFailure {
  type: string;
  entityId: string;
  entityName: string;
  risk: string;
  description: string;
  recommendation: string;
}

/* ------------------------------------------------------------------ */
/*  Detection Logic                                                    */
/* ------------------------------------------------------------------ */

/**
 * Detect single points of failure across roles, critical processes,
 * and key-person dependencies for the given tenant.
 */
export async function detectSinglePointsOfFailure(
  tenantId: string,
): Promise<SinglePointOfFailure[]> {
  const s = schema(tenantId);
  const findings: SinglePointOfFailure[] = [];

  // ---- 1. Roles with a single active assignee ----
  const singleAssigneeResult = await safeQuery(
    `SELECT fr.id          AS role_id,
            fr.name        AS role_name,
            fr.is_critical,
            COUNT(ura.user_id)::int AS assignee_count
       FROM "${s}".functional_roles fr
       LEFT JOIN "${s}".user_role_assignments ura
         ON ura.functional_role_id = fr.id AND ura.is_active = TRUE
      GROUP BY fr.id, fr.name, fr.is_critical
     HAVING COUNT(ura.user_id) = 1`,
  );

  for (const row of singleAssigneeResult.rows) {
    findings.push({
      type: 'single_assignee_role',
      entityId: row.role_id,
      entityName: row.role_name,
      risk: row.is_critical ? 'critical' : 'high',
      description: `Role "${row.role_name}" has only 1 active assignee. If that person is unavailable, the function is unserviced.`,
      recommendation: `Assign at least one backup user to the "${row.role_name}" role or establish a documented delegation chain.`,
    });
  }

  // ---- 2. Critical BCP processes with no backup owner ----
  const criticalProcessResult = await safeQuery(
    `SELECT id, name, owner_id, backup_owner_id, criticality
       FROM "${s}".bcp_processes
      WHERE criticality IN ('critical', 'high')
        AND (backup_owner_id IS NULL OR backup_owner_id = '')
        AND status != 'retired'`,
  );

  for (const row of criticalProcessResult.rows) {
    const hasOwner = row.owner_id != null && row.owner_id !== '';
    findings.push({
      type: 'no_backup_process',
      entityId: row.id,
      entityName: row.name,
      risk: row.criticality === 'critical' ? 'critical' : 'high',
      description: hasOwner
        ? `Critical process "${row.name}" has a primary owner but no backup owner.`
        : `Critical process "${row.name}" has neither primary nor backup owner.`,
      recommendation: `Designate a backup owner for BCP process "${row.name}" and document recovery procedures.`,
    });
  }

  // ---- 3. Key-person dependencies — one user owning many critical items ----
  const keyPersonResult = await safeQuery(
    `SELECT owner_id, COUNT(*)::int AS owned_count
       FROM "${s}".bcp_processes
      WHERE criticality IN ('critical', 'high')
        AND owner_id IS NOT NULL
        AND status != 'retired'
      GROUP BY owner_id
     HAVING COUNT(*) >= 3
      ORDER BY COUNT(*) DESC`,
  );

  for (const row of keyPersonResult.rows) {
    // Attempt to fetch the user's display name
    const userResult = await safeQuery(
      `SELECT COALESCE(display_name, email, id::text) AS name
         FROM "${s}".users
        WHERE id = $1`,
      [row.owner_id],
    );
    const userName = userResult.rows[0]?.name ?? row.owner_id;

    findings.push({
      type: 'key_person_dependency',
      entityId: row.owner_id,
      entityName: userName,
      risk: row.owned_count >= 5 ? 'critical' : 'high',
      description: `User "${userName}" is the sole owner of ${row.owned_count} critical BCP processes. Their unavailability would impact multiple business functions.`,
      recommendation: `Distribute ownership of critical processes currently held by "${userName}" and assign backup owners for each.`,
    });
  }

  // ---- 4. Systems / assets with no documented recovery plan ----
  const noRecoveryResult = await safeQuery(
    `SELECT id, name, asset_type
       FROM "${s}".bcp_assets
      WHERE is_critical = TRUE
        AND (recovery_plan_id IS NULL)
        AND status != 'retired'`,
  );

  for (const row of noRecoveryResult.rows) {
    findings.push({
      type: 'no_recovery_plan',
      entityId: row.id,
      entityName: row.name,
      risk: 'high',
      description: `Critical asset "${row.name}" (${row.asset_type ?? 'unspecified type'}) has no linked recovery plan.`,
      recommendation: `Create or link a disaster-recovery plan for critical asset "${row.name}".`,
    });
  }

  return findings;
}
