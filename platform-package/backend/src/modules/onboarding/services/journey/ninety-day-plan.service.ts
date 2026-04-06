// @ts-nocheck
import { logger } from '../../../../utils/logger';
/**
 * 90-day plan and evidence task generation (pipeline stages 6 & 8).
 * Creates ninety_day_plans, plan_item_instances, evidence_tasks from WorkspaceSeed.
 */

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from "../../../../config/database";
import type { WorkspaceSeed } from "../../../platform/services/workspace/workspace-seed.service";
import { DEFAULT_90D_ITEMS } from "../../../../data/seed/workspace-templates";

export interface Create90dPlanResult {
  plan90Id: string;
  planItemCount: number;
  evidenceTaskCount: number;
}

/**
 * Create ninety_day_plans, plan_item_instances, and evidence_tasks from seed.
 * Call after workspace/controls exist (e.g. after provisioning step 5 or 6).
 * @param plan90dTemplateCode Optional template code from seed profile (e.g., "DEFAULT_90D", "BANKING_ENTERPRISE_90D").
 *                            If not provided, defaults to "DEFAULT_90D".
 */
export async function createNinetyDayPlanAndEvidenceTasks(
  tenantId: string,
  workspaceId: string,
  seed: WorkspaceSeed,
  plan90dTemplateCode?: string
): Promise<Create90dPlanResult> {
  const schema = tenantSchema(tenantId);
  const startAt = new Date();
  const plan90Id = uuid();
  
  // Use provided template code or fall back to default
  const templateCode = plan90dTemplateCode || "DEFAULT_90D";
  if (plan90dTemplateCode) {
    logger.info(`[Provisioning] Using 90-day plan template code from seed profile: ${plan90dTemplateCode}`);
  }

  await safeQuery(
    `INSERT INTO "${schema}".ninety_day_plans (plan90_id, tenant_id, workspace_id, template_code, start_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (plan90_id) DO UPDATE SET
       template_code = EXCLUDED.template_code, start_at = EXCLUDED.start_at
     WHERE (ninety_day_plans.template_code, ninety_day_plans.start_at) IS DISTINCT FROM (EXCLUDED.template_code, EXCLUDED.start_at)`,
    [plan90Id, tenantId, workspaceId, templateCode, startAt.toISOString().slice(0, 10)]
  );

  let planItemCount = 0;
  for (const item of DEFAULT_90D_ITEMS) {
    const dueAt = new Date(startAt.getTime() + item.due_in_days * 24 * 60 * 60 * 1000);
    await safeQuery(
      `INSERT INTO "${schema}".plan_item_instances (item_id, plan90_id, tenant_id, week, type, title_en, title_ar, owner_role, due_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Open')`,
      [
        uuid(),
        plan90Id,
        tenantId,
        item.week,
        item.type,
        item.title_en,
        item.title_ar,
        item.owner_role,
        dueAt.toISOString(),
      ]
    );
    planItemCount++;
  }

  let evidenceTaskCount = 0;
  for (const t of seed.evidencePlan.tasks) {
    const dueAt = new Date(Date.now() + t.dueOffset * 24 * 60 * 60 * 1000);
    await safeQuery(
      `INSERT INTO "${schema}".evidence_tasks (task_id, tenant_id, workspace_id, control_id, due_at, status, assigned_role, cadence)
       VALUES ($1, $2, $3, $4, $5, 'Open', $6, $7)`,
      [uuid(), tenantId, workspaceId, t.controlId, dueAt.toISOString(), "compliance_officer", t.frequency]
    );
    evidenceTaskCount++;
  }

  return { plan90Id, planItemCount, evidenceTaskCount };
}
