// @ts-nocheck
import { logger } from '../../platform/dos/observability/services/logger.service';
// ============================================
// Shahin — Operating Cadence Engine
// Task generation from RACI matrix, completion
// rate calculation, overdue escalation, cadence
// frequency overrides, and compliance reporting
// ============================================

import { safeQuery, tenantSchema } from "../../config/database";
import { registerJob } from "../../platform/dos/jobs/job-scheduler.service";
import { createNotification } from '../../modules/notification/services/notification.service';
import { toErrorMessage } from '../../utils/http-error.util';
import type {
  CadencePeriodType,
  GeneratedTask,
} from "../../types/grc-os.types";
import { getFirstRow } from '../../utils/db-utils';
import type { GenericRow } from '../../types/db-rows.types';

// === Types ===

export interface CompletionResult {
  total: number;
  completed: number;
  rate: number;
  overdue: { status: string; dueDate: string }[];
}

export interface CadenceReportEntry {
  controlId: string;
  controlCode: string;
  total: number;
  completed: number;
  rate: number;
  overdue: number;
}

export interface CadenceReport {
  periodType: CadencePeriodType;
  dateRange: { start: string; end: string };
  entries: CadenceReportEntry[];
  overallRate: number;
}

export interface EscalationResult {
  taskId: string;
  controlId: string;
  assignedTo: string;
  escalatedTo: string;
  dueDate: string;
}

// === Pure Functions ===

/**
 * Pure function: given an array of tasks with status and dueDate,
 * calculate completion metrics. Tasks with status !== 'completed'
 * and dueDate in the past are flagged as overdue.
 */
export function calculateCompletionRate(
  tasks: { status: string; dueDate: string }[]
): CompletionResult {
  const total = tasks.length;
  if (total === 0) {
    return { total: 0, completed: 0, rate: 0, overdue: [] };
  }

  const completed = tasks.filter((t) => t.status === "completed").length;
  const now = new Date().toISOString().slice(0, 10);
  const overdue = tasks.filter(
    (t) => t.status !== "completed" && t.dueDate <= now
  );
  const rate = Math.round((completed / total) * 10000) / 100;

  return { total, completed, rate, overdue };
}

// === Period Helpers ===

function computePeriodEnd(periodType: CadencePeriodType, periodStart: string): string {
  const start = new Date(periodStart);
  switch (periodType) {
    case "monthly": {
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
      return end.toISOString().slice(0, 10);
    }
    case "quarterly": {
      const end = new Date(start);
      end.setMonth(end.getMonth() + 3);
      end.setDate(end.getDate() - 1);
      return end.toISOString().slice(0, 10);
    }
    case "annually": {
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      return end.toISOString().slice(0, 10);
    }
  }
}

function _computeDueDate(periodStart: string, periodEnd: string, dueDayOfPeriod: number): string {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const due = new Date(start);
  due.setDate(due.getDate() + dueDayOfPeriod - 1);
  // Clamp to period end
  if (due > end) {
    return end.toISOString().slice(0, 10);
  }
  return due.toISOString().slice(0, 10);
}

// === Core Functions ===

/**
 * Generate cadence tasks for a period. Queries controls with their frequency,
 * checks for cadence overrides, creates tasks in cadence_tasks table assigned
 * to RACI-responsible owner. Returns generated tasks.
 */
export async function generatePeriodTasks(
  tenantId: string,
  periodType: CadencePeriodType,
  periodStart: string
): Promise<GeneratedTask[]> {
  const schema = tenantSchema(tenantId);
  const periodEnd = computePeriodEnd(periodType, periodStart);

  // Get controls matching this cadence frequency, considering overrides
  // First get cadence overrides from tenant_config_versions
  const overrides = new Map<string, string>();
  try {
    const configResult = await safeQuery(
      `SELECT config FROM "${schema}".tenant_config_versions
       ORDER BY version_number DESC LIMIT 1`
    );
    if (configResult.rows.length > 0) {
      const config = getFirstRow(configResult)?.config;
      if (config?.cadenceOverrides) {
        for (const ov of config.cadenceOverrides) {
          overrides.set(ov.controlId, ov.frequency);
        }
      }
    }
  } catch {
    // tenant_config_versions may not exist yet
  }

  // Get all active controls
  const controlsResult = await safeQuery(
    `SELECT control_id, code, owner, frequency FROM "${schema}".ucf_controls`
  );

  // Get RACI matrix for responsible owner lookup
  const raciMap = new Map<string, string>();
  try {
    const configResult = await safeQuery(
      `SELECT config FROM "${schema}".tenant_config_versions
       ORDER BY version_number DESC LIMIT 1`
    );
    if (configResult.rows.length > 0) {
      const config = getFirstRow(configResult)?.config;
      if (config?.raciMatrix) {
        for (const entry of config.raciMatrix) {
          raciMap.set(entry.controlId, entry.responsible);
        }
      }
    }
  } catch {
    // tenant_config_versions may not exist yet
  }

  const generated: GeneratedTask[] = [];

  for (const control of controlsResult.rows) {
    // Determine effective frequency (override takes precedence)
    const effectiveFrequency = overrides.get(control.control_id) || control.frequency;

    // Skip controls that don't match this period type
    if (!frequencyMatchesPeriod(effectiveFrequency, periodType)) {
      continue;
    }

    // Check if tasks already exist for this control + period
    const existing = await safeQuery(
      `SELECT task_id FROM "${schema}".cadence_tasks
       WHERE control_id = $1 AND period_type = $2 AND period_start = $3`,
      [control.control_id, periodType, periodStart]
    );
    if (existing.rows.length > 0) {
      continue; // Already generated
    }

    // Determine assigned owner: RACI responsible > control owner > tenant admin fallback
    const assignedTo = raciMap.get(control.control_id) || control.owner || "admin";

    // Determine task type based on period
    const taskType = getDefaultTaskType(periodType);

    // Compute due date (default: end of period)
    const dueDate = periodEnd;

    const result = await safeQuery(
      `INSERT INTO "${schema}".cadence_tasks
       (control_id, period_type, period_start, period_end, task_type, assigned_to, status, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
       RETURNING *`,
      [control.control_id, periodType, periodStart, periodEnd, taskType, assignedTo, dueDate]
    );

    const row = getFirstRow(result);
    generated.push(rowToGeneratedTask(row));
  }

  return generated;
}

/**
 * Get completion rates from DB for a given period type and optional date range.
 */
export async function getCompletionRates(
  tenantId: string,
  periodType: CadencePeriodType,
  periodStart?: string,
  periodEnd?: string
): Promise<CompletionResult> {
  const schema = tenantSchema(tenantId);

  let sql = `SELECT status, due_date FROM "${schema}".cadence_tasks WHERE period_type = $1`;
  const params: unknown[] = [periodType];

  if (periodStart) {
    params.push(periodStart);
    sql += ` AND period_start >= $${params.length}`;
  }
  if (periodEnd) {
    params.push(periodEnd);
    sql += ` AND period_end <= $${params.length}`;
  }

  const result = await safeQuery(sql, params);
  const tasks = result.rows.map((r: GenericRow) => ({
    status: r.status,
    dueDate: typeof r.due_date === "string" ? r.due_date : r.due_date?.toISOString?.()?.slice(0, 10) || String(r.due_date),
  }));

  return calculateCompletionRate(tasks);
}

/**
 * Find overdue tasks (past due_date, not completed), escalate via notification.
 * Follows RACI hierarchy: responsible → accountable → consulted.
 */
export async function escalateOverdue(
  tenantId: string
): Promise<EscalationResult[]> {
  const schema = tenantSchema(tenantId);

  // Find overdue tasks
  const overdueResult = await safeQuery(
    `SELECT * FROM "${schema}".cadence_tasks
     WHERE status != 'completed' AND due_date < CURRENT_DATE`,
  );

  if (overdueResult.rows.length === 0) {
    return [];
  }

  // Load RACI matrix for escalation chain
  const raciMap = new Map<string, { accountable: string; consulted: string[] }>();
  try {
    const configResult = await safeQuery(
      `SELECT config FROM "${schema}".tenant_config_versions
       ORDER BY version_number DESC LIMIT 1`
    );
    if (configResult.rows.length > 0) {
      const config = getFirstRow(configResult)?.config;
      if (config?.raciMatrix) {
        for (const entry of config.raciMatrix) {
          raciMap.set(entry.controlId, {
            accountable: entry.accountable,
            consulted: entry.consulted || [],
          });
        }
      }
    }
  } catch {
    // tenant_config_versions may not exist yet
  }

  const results: EscalationResult[] = [];

  for (const row of overdueResult.rows) {
    // Mark as overdue
    await safeQuery(
      `UPDATE "${schema}".cadence_tasks SET status = 'overdue' WHERE task_id = $1`,
      [row.task_id]
    );

    // Determine escalation target from RACI hierarchy
    const raci = raciMap.get(row.control_id);
    const escalatedTo = raci?.accountable || "admin";

    // Send notification to the escalation target
    try {
      await createNotification(tenantId, {
        userId: escalatedTo,
        type: "cadence_overdue",
        title: `Overdue cadence task: ${row.task_type}`,
        body: `Task for control ${row.control_id} (${row.task_type}) was due on ${row.due_date} and is overdue. Assigned to: ${row.assigned_to}.`,
        link: `/cadence/tasks/${row.task_id}`,
      });
    } catch {
      // Notification is best-effort
    }

    // Also notify the original assignee
    try {
      await createNotification(tenantId, {
        userId: row.assigned_to,
        type: "cadence_overdue",
        title: `Your cadence task is overdue: ${row.task_type}`,
        body: `Task for control ${row.control_id} (${row.task_type}) was due on ${row.due_date}. Please complete it as soon as possible.`,
        link: `/cadence/tasks/${row.task_id}`,
      });
    } catch {
      // Notification is best-effort
    }

    results.push({
      taskId: row.task_id,
      controlId: row.control_id,
      assignedTo: row.assigned_to,
      escalatedTo,
      dueDate: typeof row.due_date === "string"
        ? row.due_date
        : row.due_date?.toISOString?.()?.slice(0, 10) || String(row.due_date),
    });
  }

  return results;
}

/**
 * Generate compliance report with completion rates per control.
 */
export async function getCadenceReport(
  tenantId: string,
  periodType: CadencePeriodType,
  dateRange: { start: string; end: string }
): Promise<CadenceReport> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT ct.control_id, uc.code AS control_code, ct.status, ct.due_date
     FROM "${schema}".cadence_tasks ct
     LEFT JOIN "${schema}".ucf_controls uc ON ct.control_id = uc.control_id
     WHERE ct.period_type = $1
       AND ct.period_start >= $2
       AND ct.period_end <= $3
     ORDER BY ct.control_id`,
    [periodType, dateRange.start, dateRange.end]
  );

  // Group by control
  const controlMap = new Map<string, { code: string; tasks: { status: string; dueDate: string }[] }>();

  for (const row of result.rows) {
    const controlId = row.control_id;
    if (!controlMap.has(controlId)) {
      controlMap.set(controlId, { code: row.control_code || controlId, tasks: [] });
    }
    controlMap.get(controlId)!.tasks.push({
      status: row.status,
      dueDate: typeof row.due_date === "string"
        ? row.due_date
        : row.due_date?.toISOString?.()?.slice(0, 10) || String(row.due_date),
    });
  }

  const entries: CadenceReportEntry[] = [];
  let totalAll = 0;
  let completedAll = 0;

  for (const [controlId, data] of controlMap) {
    const cr = calculateCompletionRate(data.tasks);
    entries.push({
      controlId,
      controlCode: data.code,
      total: cr.total,
      completed: cr.completed,
      rate: cr.rate,
      overdue: cr.overdue.length,
    });
    totalAll += cr.total;
    completedAll += cr.completed;
  }

  const overallRate = totalAll > 0 ? Math.round((completedAll / totalAll) * 10000) / 100 : 0;

  return {
    periodType,
    dateRange,
    entries,
    overallRate,
  };
}

/**
 * List tasks for a period.
 */
export async function getTasksForPeriod(
  tenantId: string,
  periodType: CadencePeriodType,
  periodStart: string,
  periodEnd: string
): Promise<GeneratedTask[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".cadence_tasks
     WHERE period_type = $1
       AND period_start >= $2
       AND period_end <= $3
     ORDER BY due_date, control_id`,
    [periodType, periodStart, periodEnd]
  );

  return result.rows.map(rowToGeneratedTask);
}

// === Job Registration ===

/**
 * Register cadence jobs with the job scheduler:
 * - Monthly task generation: 1st of each month
 * - Quarterly task generation: 1st of Jan, Apr, Jul, Oct
 * - Annual task generation: 1st of January
 * - Overdue escalation: daily at 7 AM
 */
export async function registerCadenceJobs(): Promise<void> {
  // Monthly cadence — 1st of each month at midnight
  await registerJob("cadence-monthly-generation", "0 0 1 * *", async () => {
    logger.info("[Job] cadence-monthly-generation executed");
    try {
      const tenants = await safeQuery(
        `SELECT tenant_id FROM tenants WHERE status = 'active' OR status = 'onboarding'`
      );
      const now = new Date();
      const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      for (const t of tenants.rows) {
        await generatePeriodTasks(t.tenant_id, "monthly", periodStart);
      }
    } catch (err: unknown) {
      logger.error("[Job] cadence-monthly-generation error:", toErrorMessage(err));
    }
  });

  // Quarterly cadence — 1st of Jan, Apr, Jul, Oct at midnight
  await registerJob("cadence-quarterly-generation", "0 0 1 1,4,7,10 *", async () => {
    logger.info("[Job] cadence-quarterly-generation executed");
    try {
      const tenants = await safeQuery(
        `SELECT tenant_id FROM tenants WHERE status = 'active' OR status = 'onboarding'`
      );
      const now = new Date();
      const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      for (const t of tenants.rows) {
        await generatePeriodTasks(t.tenant_id, "quarterly", periodStart);
      }
    } catch (err: unknown) {
      logger.error("[Job] cadence-quarterly-generation error:", toErrorMessage(err));
    }
  });

  // Annual cadence — 1st of January at midnight
  await registerJob("cadence-annual-generation", "0 0 1 1 *", async () => {
    logger.info("[Job] cadence-annual-generation executed");
    try {
      const tenants = await safeQuery(
        `SELECT tenant_id FROM tenants WHERE status = 'active' OR status = 'onboarding'`
      );
      const now = new Date();
      const periodStart = `${now.getFullYear()}-01-01`;
      for (const t of tenants.rows) {
        await generatePeriodTasks(t.tenant_id, "annually", periodStart);
      }
    } catch (err: unknown) {
      logger.error("[Job] cadence-annual-generation error:", toErrorMessage(err));
    }
  });

  // Overdue escalation — daily at 7 AM
  await registerJob("cadence-overdue-escalation", "0 7 * * *", async () => {
    logger.info("[Job] cadence-overdue-escalation executed");
    try {
      const tenants = await safeQuery(
        `SELECT tenant_id FROM tenants WHERE status = 'active' OR status = 'onboarding'`
      );
      for (const t of tenants.rows) {
        await escalateOverdue(t.tenant_id);
      }
    } catch (err: unknown) {
      logger.error("[Job] cadence-overdue-escalation error:", toErrorMessage(err));
    }
  });

  logger.info("[CadenceEngine] Cadence jobs registered");
}

// === Helpers ===

function frequencyMatchesPeriod(frequency: string, periodType: CadencePeriodType): boolean {
  switch (periodType) {
    case "monthly":
      return frequency === "monthly" || frequency === "continuous";
    case "quarterly":
      return frequency === "quarterly";
    case "annually":
      return frequency === "annually";
    default:
      return false;
  }
}

function getDefaultTaskType(periodType: CadencePeriodType): string {
  switch (periodType) {
    case "monthly":
      return "attestation";
    case "quarterly":
      return "deep_testing";
    case "annually":
      return "design_review";
  }
}

function rowToGeneratedTask(row: any): GeneratedTask {
  return {
    taskId: row.task_id,
    controlId: row.control_id,
    periodType: row.period_type,
    periodStart: typeof row.period_start === "string"
      ? row.period_start
      : row.period_start?.toISOString?.()?.slice(0, 10) || String(row.period_start),
    periodEnd: typeof row.period_end === "string"
      ? row.period_end
      : row.period_end?.toISOString?.()?.slice(0, 10) || String(row.period_end),
    taskType: row.task_type,
    assignedTo: row.assigned_to,
    status: row.status,
    dueDate: typeof row.due_date === "string"
      ? row.due_date
      : row.due_date?.toISOString?.()?.slice(0, 10) || String(row.due_date),
    completedAt: row.completed_at?.toISOString?.() || row.completed_at || null,
  };
}
