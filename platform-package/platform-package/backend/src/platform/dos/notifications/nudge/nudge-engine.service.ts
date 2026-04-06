/**
 * Nudge Engine Service
 *
 * Generates proactive notifications for overdue or incomplete GRC activities.
 * Integrates with the roadmap builder for overdue task detection and the
 * contextual AI service for first-visit tracking.
 *
 * Pure functions: generateNudges, prioritizeNudges
 * DB functions: saveNudges, getActiveNudges, dismissNudge
 *
 * Requirements: 3.1, 3.4, 3.5
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import { getOverdueTasks } from '../../../../modules/agrc-engine/services/engine/roadmap-builder.service';
import { buildContextFromRoute } from '../../../../ai/copilot/services/contextual-ai.service';
import type {
  Nudge,
  GRCRoadmap,
  MaturityScore,
  
  RoadmapPhase,
} from '../../../../types/journey.types';
import { randomUUID } from 'crypto';

// ===========================================================================
// Constants
// ===========================================================================

/** Priority ordering for nudge sorting (lower index = higher priority). */
const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Modules that should have active processes. Used to detect missing processes.
 * Maps module key to the expected targetAction that indicates the process is active.
 */
const REQUIRED_PROCESSES: Array<{
  targetModule: string;
  targetAction: string;
  nameEn: string;
  nameAr: string;
}> = [
  { targetModule: '/policies', targetAction: 'create_policy', nameEn: 'Policy Management', nameAr: 'إدارة السياسات' },
  { targetModule: '/risks', targetAction: 'create_risk_register', nameEn: 'Risk Management', nameAr: 'إدارة المخاطر' },
  { targetModule: '/controls', targetAction: 'deploy_controls', nameEn: 'Control Deployment', nameAr: 'نشر الضوابط' },
  { targetModule: '/incidents', targetAction: 'activate_incident_response', nameEn: 'Incident Response', nameAr: 'الاستجابة للحوادث' },
  { targetModule: '/evidence', targetAction: 'setup_evidence_collection', nameEn: 'Evidence Collection', nameAr: 'جمع الأدلة' },
];

// ===========================================================================
// Pure Functions
// ===========================================================================

/**
 * Generate nudges based on roadmap state and maturity score.
 *
 * Produces nudges for:
 * - Overdue tasks (tasks past their estimated timeline)
 * - Missing processes (required GRC processes not yet activated)
 * - Stale evidence (low evidence coverage in maturity score)
 * - Phase reminders (current phase progress below threshold)
 *
 * Requirement 3.4: Generate proactive nudges for overdue tasks with
 * importance explanation and module link.
 *
 * @param roadmap - The tenant's GRC roadmap
 * @param maturityScore - Current maturity score with component breakdown
 * @param now - Current timestamp for overdue calculation
 * @returns Array of generated nudges (unsorted)
 */
export function generateNudges(
  roadmap: GRCRoadmap,
  maturityScore: MaturityScore,
  now: Date,
): Nudge[] {
  const nudges: Nudge[] = [];
  const nowIso = now.toISOString();

  // 1. Overdue task nudges
  const overdueTasks = getOverdueTasks(roadmap, now);
  for (const task of overdueTasks) {
    nudges.push({
      nudgeId: randomUUID(),
      tenantId: roadmap.tenantId,
      userId: '',  // populated by caller or DB default
      type: 'overdue_task',
      titleEn: `Overdue: ${task.titleEn}`,
      titleAr: `متأخر: ${task.titleAr}`,
      bodyEn: `This task is past its estimated timeline. Completing it is important for your GRC compliance progress.`,
      bodyAr: `هذه المهمة تجاوزت الجدول الزمني المقدر. إكمالها مهم لتقدم امتثالك في الحوكمة والمخاطر والامتثال.`,
      targetModule: task.targetModule,
      targetAction: task.targetAction,
      priority: task.priority,
      dismissed: false,
      createdAt: nowIso,
    });
  }

  // 2. Missing process nudges
  const completedActions = new Set<string>();
  for (const phase of roadmap.phases) {
    for (const ms of phase.milestones) {
      for (const task of ms.tasks) {
        if (task.status === 'completed') {
          completedActions.add(task.targetAction);
        }
      }
    }
  }

  for (const proc of REQUIRED_PROCESSES) {
    if (!completedActions.has(proc.targetAction)) {
      // Only nudge for missing processes if we're past the foundation phase
      const foundationPhase = roadmap.phases.find((p: any) => p.type === 'foundation');
      const foundationComplete = foundationPhase
        ? foundationPhase.milestones.every((ms: any) => ms.completed)
        : false;

      if (foundationComplete) {
        nudges.push({
          nudgeId: randomUUID(),
          tenantId: roadmap.tenantId,
          userId: '',
          type: 'missing_process',
          titleEn: `Set up ${proc.nameEn}`,
          titleAr: `إعداد ${proc.nameAr}`,
          bodyEn: `The ${proc.nameEn} process has not been activated yet. This is a required GRC process for your organization.`,
          bodyAr: `لم يتم تفعيل عملية ${proc.nameAr} بعد. هذه عملية حوكمة ومخاطر وامتثال مطلوبة لمنظمتك.`,
          targetModule: proc.targetModule,
          targetAction: proc.targetAction,
          priority: 'high',
          dismissed: false,
          createdAt: nowIso,
        });
      }
    }
  }

  // 3. Stale evidence nudges
  const evidenceComponent = maturityScore.components.find(
    (c: any) => c.name.toLowerCase().includes('evidence'),
  );
  if (evidenceComponent && evidenceComponent.score < 40) {
    nudges.push({
      nudgeId: randomUUID(),
      tenantId: roadmap.tenantId,
      userId: '',
      type: 'stale_evidence',
      titleEn: 'Evidence collection needs attention',
      titleAr: 'جمع الأدلة يحتاج إلى اهتمام',
      bodyEn: `Your evidence coverage score is ${evidenceComponent.score}%. Upload and refresh evidence to strengthen your compliance posture.`,
      bodyAr: `نسبة تغطية الأدلة لديك هي ${evidenceComponent.score}%. قم برفع وتحديث الأدلة لتعزيز وضع الامتثال الخاص بك.`,
      targetModule: '/evidence',
      targetAction: 'upload_evidence',
      priority: evidenceComponent.score < 20 ? 'critical' : 'high',
      dismissed: false,
      createdAt: nowIso,
    });
  }

  // 4. Phase reminder nudges
  const currentPhase = getCurrentActivePhase(roadmap);
  if (currentPhase) {
    const totalTasks = currentPhase.milestones.reduce(
      (sum: any, ms: any) => sum + ms.tasks.length, 0,
    );
    const completedTasks = currentPhase.milestones.reduce(
      (sum: any, ms: any) => sum + ms.tasks.filter((t: any) => t.status === 'completed').length, 0,
    );
    const completionPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    if (completionPercent < 50 && totalTasks > 0) {
      nudges.push({
        nudgeId: randomUUID(),
        tenantId: roadmap.tenantId,
        userId: '',
        type: 'phase_reminder',
        titleEn: `${currentPhase.nameEn} phase is ${Math.round(completionPercent)}% complete`,
        titleAr: `مرحلة ${currentPhase.nameAr} مكتملة بنسبة ${Math.round(completionPercent)}%`,
        bodyEn: `You have completed ${completedTasks} of ${totalTasks} tasks in the ${currentPhase.nameEn} phase. Keep going to advance your GRC maturity.`,
        bodyAr: `لقد أكملت ${completedTasks} من ${totalTasks} مهمة في مرحلة ${currentPhase.nameAr}. استمر لتطوير نضج الحوكمة والمخاطر والامتثال.`,
        targetModule: '/journey/roadmap',
        targetAction: 'view_roadmap',
        priority: completionPercent < 25 ? 'high' : 'medium',
        dismissed: false,
        createdAt: nowIso,
      });
    }
  }

  return nudges;
}

/**
 * Sort nudges by priority (critical > high > medium > low), then by
 * recency (newest first).
 *
 * @param nudges - Array of nudges to sort
 * @returns New sorted array (does not mutate input)
 */
export function prioritizeNudges(nudges: Nudge[]): Nudge[] {
  return [...nudges].sort((a, b) => {
    const priorityDiff = (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
    if (priorityDiff !== 0) return priorityDiff;
    // Newest first (descending by createdAt)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// ===========================================================================
// Helpers
// ===========================================================================

/**
 * Find the current active phase — the first phase that has at least one
 * incomplete task.
 */
function getCurrentActivePhase(roadmap: GRCRoadmap): RoadmapPhase | null {
  const sorted = [...roadmap.phases].sort((a, b) => a.order - b.order);
  for (const phase of sorted) {
    const hasIncomplete = phase.milestones.some((ms: any) =>
      ms.tasks.some((t: any) => t.status !== 'completed' && t.status !== 'skipped'),
    );
    if (hasIncomplete) return phase;
  }
  return null;
}

// ===========================================================================
// DB Functions
// ===========================================================================

/**
 * Save an array of nudges to the database.
 * Inserts all nudges in a single batch for efficiency.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param nudges - Array of nudges to persist
 */
export async function saveNudges(
  tenantId: string,
  nudges: Nudge[],
): Promise<void> {
  if (nudges.length === 0) return;

  const schema = tenantSchema(tenantId);

  // Build batch insert values
  const values: unknown[] = [];
  const placeholders: string[] = [];
  let paramIndex = 1;

  for (const nudge of nudges) {
    placeholders.push(
      `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10})`,
    );
    values.push(
      nudge.tenantId,
      nudge.userId,
      nudge.type,
      nudge.titleEn,
      nudge.titleAr,
      nudge.bodyEn,
      nudge.bodyAr,
      nudge.targetModule,
      nudge.targetAction,
      nudge.priority,
      nudge.dismissed,
    );
    paramIndex += 11;
  }

  await safeQuery(
    `INSERT INTO "${schema}".nudges
       (tenant_id, user_id, type, title_en, title_ar, body_en, body_ar,
        target_module, target_action, priority, dismissed)
     VALUES ${placeholders.join(', ')}`,
    values,
  );
}

/**
 * Get all active (non-dismissed) nudges for a user.
 * Results are ordered by priority and recency.
 *
 * Requirement 3.5: Track current page context for relevant suggestions.
 * Integrates with contextual AI by accepting an optional route to filter
 * nudges relevant to the current module.
 *
 * @param tenantId - Tenant identifier
 * @param userId - User identifier
 * @param currentRoute - Optional current page route to filter by module
 * @returns Array of active nudges, prioritized
 */
export async function getActiveNudges(
  tenantId: string,
  userId: string,
  currentRoute?: string,
): Promise<Nudge[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT nudge_id, tenant_id, user_id, type, title_en, title_ar,
            body_en, body_ar, target_module, target_action, priority,
            dismissed, created_at
     FROM "${schema}".nudges
     WHERE tenant_id = $1 AND user_id = $2 AND dismissed = FALSE
     ORDER BY
       CASE priority
         WHEN 'critical' THEN 0
         WHEN 'high' THEN 1
         WHEN 'medium' THEN 2
         WHEN 'low' THEN 3
       END,
       created_at DESC`,
    [tenantId, userId],
  );

  let nudges: Nudge[] = result.rows.map(mapRowToNudge);

  // Requirement 3.5: If a current route is provided, boost nudges
  // relevant to the current module context
  if (currentRoute) {
    const context = await buildContextFromRoute(tenantId, currentRoute, userId);
    if (context.module) {
      nudges = boostModuleNudges(nudges, context.module);
    }
  }

  return nudges;
}

/**
 * Dismiss a nudge by setting its dismissed flag to true.
 *
 * @param tenantId - Tenant identifier
 * @param nudgeId - The nudge to dismiss
 */
export async function dismissNudge(
  tenantId: string,
  nudgeId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".nudges SET dismissed = TRUE WHERE nudge_id = $1 AND tenant_id = $2`,
    [nudgeId, tenantId],
  );
}

// ===========================================================================
// First-Visit Integration (Req 3.1)
// ===========================================================================

/**
 * Check if a user has visited a module before.
 * Uses the first_visits table from the journey schema.
 *
 * Requirement 3.1: First-visit module explanations.
 *
 * @param tenantId - Tenant identifier
 * @param userId - User identifier
 * @param module - Module name to check
 * @returns true if this is the first visit (no record exists)
 */
export async function isFirstVisit(
  tenantId: string,
  userId: string,
  module: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT 1 FROM "${schema}".first_visits
     WHERE tenant_id = $1 AND user_id = $2 AND module = $3`,
    [tenantId, userId, module],
  );
  return result.rows.length === 0;
}

/**
 * Record that a user has visited a module for the first time.
 *
 * @param tenantId - Tenant identifier
 * @param userId - User identifier
 * @param module - Module name visited
 */
export async function recordFirstVisit(
  tenantId: string,
  userId: string,
  module: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".first_visits (tenant_id, user_id, module)
     VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, user_id, module) DO UPDATE SET
       module = EXCLUDED.module
     WHERE first_visits.module IS DISTINCT FROM EXCLUDED.module`,
    [tenantId, userId, module],
  );
}

// ===========================================================================
// Internal Helpers
// ===========================================================================

/**
 * Map a database row to a Nudge object.
 */
function mapRowToNudge(row: any): Nudge {
  return {
    nudgeId: row.nudge_id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    type: row.type,
    titleEn: row.title_en,
    titleAr: row.title_ar,
    bodyEn: row.body_en,
    bodyAr: row.body_ar,
    targetModule: row.target_module,
    targetAction: row.target_action,
    priority: row.priority,
    dismissed: row.dismissed,
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : row.created_at,
  };
}

/**
 * Boost nudges that match the current module to the top of their
 * priority group. This keeps priority ordering intact but surfaces
 * contextually relevant nudges first within each priority level.
 *
 * Requirement 3.5: Track current page context for relevant suggestions.
 */
function boostModuleNudges(nudges: Nudge[], currentModule: string): Nudge[] {
  const moduleRoutePrefix = `/${currentModule}`;
  return [...nudges].sort((a, b) => {
    const priorityDiff = (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
    if (priorityDiff !== 0) return priorityDiff;

    // Within same priority, boost module-relevant nudges
    const aRelevant = a.targetModule.startsWith(moduleRoutePrefix) ? 0 : 1;
    const bRelevant = b.targetModule.startsWith(moduleRoutePrefix) ? 0 : 1;
    if (aRelevant !== bRelevant) return aRelevant - bRelevant;

    // Then by recency
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
