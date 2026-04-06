// ============================================
// Shahin GRC — Data Health Workers
// Workers: dataIntegrityChecker, workspaceProfileRefresher
// ============================================

import { safeQuery } from '../config/database/database';
import { forEachTenant, createNotification } from './worker-scheduler';
import type { TenantInfo, WorkerRunSummary } from './workspace-health-types';

// ===========================================================================
// Worker 7: Data Integrity Checker (daily)
// ===========================================================================

export async function dataIntegrityChecker(tenants: TenantInfo[]): Promise<WorkerRunSummary> {
  return forEachTenant(tenants, async (tenant) => {
    let processed = 0;
    let fixed = 0;
    const errors: Array<{ tenantId?: string; message: string }> = [];

    // 1. Controls without frameworks (orphaned)
    const orphanedControls = await safeQuery(`
      SELECT c.control_id, c.title
      FROM "${tenant.schema}".controls c
      WHERE c.status = 'active'
        AND (c.framework_id IS NULL
             OR NOT EXISTS (
               SELECT 1 FROM "${tenant.schema}".frameworks f
               WHERE f.framework_id = c.framework_id
             ))
    `);
    processed += orphanedControls.rows.length;

    // 2. Risks without owners — auto-fix by setting to NULL (explicit)
    const risksNoOwner = await safeQuery(`
      SELECT risk_id, title
      FROM "${tenant.schema}".risks
      WHERE status = 'active'
        AND owner IS NULL
        AND title IS NOT NULL
    `);
    processed += risksNoOwner.rows.length;

    // 3. Controls with null titles — auto-fix with placeholder
    const controlsNoTitle = await safeQuery(`
      UPDATE "${tenant.schema}".controls
      SET title = 'Untitled Control — ' || COALESCE(control_id::text, 'any'),
          updated_at = NOW()
      WHERE title IS NULL OR title = ''
      RETURNING control_id
    `);
    fixed += controlsNoTitle.rows.length;
    processed += controlsNoTitle.rows.length;

    // 4. Policies with null status — auto-fix to 'draft'
    const policiesNoStatus = await safeQuery(`
      UPDATE "${tenant.schema}".policies
      SET status = 'draft',
          updated_at = NOW()
      WHERE status IS NULL
      RETURNING policy_id
    `);
    fixed += policiesNoStatus.rows.length;
    processed += policiesNoStatus.rows.length;

    // 5. Action items with null priority — auto-fix to 'medium'
    const actionsNoPriority = await safeQuery(`
      UPDATE "${tenant.schema}".action_items
      SET priority = 'medium',
          updated_at = NOW()
      WHERE priority IS NULL
      RETURNING item_id
    `);
    fixed += actionsNoPriority.rows.length;
    processed += actionsNoPriority.rows.length;

    // 6. Check that essential tables exist in tenant schema
    const essentialTables = [
      'controls', 'frameworks', 'risks', 'policies', 'evidence',
      'action_items', 'notifications', 'workspace_profile',
    ];
    for (const tbl of essentialTables) {
      const exists = await safeQuery(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = $1 AND table_name = $2
        ) AS exists
      `, [tenant.schema, tbl]);
      processed++;
      if (!exists.rows[0]?.exists) {
        errors.push({
          tenantId: tenant.tenantId,
          message: `Missing essential table: ${tenant.schema}.${tbl}`,
        });
      }
    }

    return { processed, fixed, errors };
  });
}

// ===========================================================================
// Worker 8: Workspace Profile Refresher (every 12 hours)
// ===========================================================================

export async function workspaceProfileRefresher(tenants: TenantInfo[]): Promise<WorkerRunSummary> {
  return forEachTenant(tenants, async (tenant) => {
    let processed = 0;
    let fixed = 0;
    const errors: Array<{ tenantId?: string; message: string }> = [];

    // Collect workspace statistics
    const userCount = await safeQuery(
      `SELECT COUNT(*) AS cnt FROM public.users WHERE tenant_id = $1`,
      [tenant.tenantId]
    );

    const frameworkCount = await safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${tenant.schema}".frameworks WHERE status != 'deleted'`
    );

    const controlCount = await safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${tenant.schema}".controls WHERE status != 'deleted'`
    );

    const riskCount = await safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${tenant.schema}".risks WHERE status != 'deleted'`
    );

    const policyCount = await safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${tenant.schema}".policies WHERE status NOT IN ('deleted', 'archived')`
    );

    const evidenceCount = await safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${tenant.schema}".evidence`
    );

    const openActionCount = await safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${tenant.schema}".action_items WHERE status IN ('open', 'in_progress')`
    );

    processed = 7; // 7 stat queries

    const stats = {
      workspace_user_count: Number(userCount.rows[0]?.cnt) || 0,
      workspace_framework_count: Number(frameworkCount.rows[0]?.cnt) || 0,
      workspace_control_count: Number(controlCount.rows[0]?.cnt) || 0,
      workspace_risk_count: Number(riskCount.rows[0]?.cnt) || 0,
      workspace_policy_count: Number(policyCount.rows[0]?.cnt) || 0,
      workspace_evidence_count: Number(evidenceCount.rows[0]?.cnt) || 0,
      workspace_open_actions_count: Number(openActionCount.rows[0]?.cnt) || 0,
      workspace_stats_updated_at: new Date().toISOString(),
    };

    // Update workspace_profile settings
    await safeQuery(
      `UPDATE "${tenant.schema}".workspace_profile
       SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb,
           updated_at = NOW()
       WHERE id = (SELECT id FROM "${tenant.schema}".workspace_profile LIMIT 1)`,
      [JSON.stringify(stats)]
    );
    fixed++;

    // Insert usage snapshot for trend tracking
    await safeQuery(
      `INSERT INTO "${tenant.schema}".tenant_usage_snapshots
       (snapshot_id, snapshot_date, user_count, framework_count, control_count,
        risk_count, policy_count, evidence_count, open_action_count)
       VALUES (gen_random_uuid(), CURRENT_DATE, $1::int, $2::int, $3::int, $4::int, $5::int, $6::int, $7::int)
       ON CONFLICT DO NOTHING`,
      [
        stats.workspace_user_count,
        stats.workspace_framework_count,
        stats.workspace_control_count,
        stats.workspace_risk_count,
        stats.workspace_policy_count,
        stats.workspace_evidence_count,
        stats.workspace_open_actions_count,
      ]
    );

    // Check if tenant is approaching plan limits
    const tenantPlan = await safeQuery(
      `SELECT plan, settings FROM public.tenants WHERE tenant_id = $1`,
      [tenant.tenantId]
    );
    const plan = tenantPlan.rows[0]?.plan || 'free';
    const planLimits: Record<string, number> = {
      free: 5,
      starter: 25,
      professional: 100,
      enterprise: 999999,
    };
    const maxUsers = planLimits[plan] || 5;

    if (stats.workspace_user_count >= maxUsers * 0.8) {
      // Approaching plan limit — notify admins
      const admins = await safeQuery(`
        SELECT user_id FROM "${tenant.schema}".team_members
        WHERE role IN ('admin', 'owner')
          AND status = 'active'
        LIMIT 3
      `);
      for (const admin of admins.rows) {
        await createNotification(
          tenant.schema, String(admin.user_id), 'plan_limit_approaching',
          'Approaching plan user limit',
          `Your workspace has ${stats.workspace_user_count} of ${maxUsers} allowed users (${plan} plan).`,
          '/settings/billing'
        );
      }
    }

    return { processed, fixed, errors };
  });
}
