// @ts-nocheck
import { catchHandler, EC } from '../../../../utils/resilient-catch';
// ============================================
// Shahin — Task Board Service
// Kanban board logic with urgency, transitions, progress
// ============================================

import { safeQuery, tenantSchema } from "../../../../config/database";
import { getFirstRow } from '../../../../utils/db-utils';

// === Types ===

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type UrgencyColor = 'green' | 'yellow' | 'red' | 'overdue';

export interface TaskBoardItem {
  taskId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedTo: string;
  dueDate: string | null;
  entityType: string;
  entityId: string;
  urgency: UrgencyColor;
  createdAt: string;
}

export interface TaskBoardState {
  todo: TaskBoardItem[];
  in_progress: TaskBoardItem[];
  review: TaskBoardItem[];
  done: TaskBoardItem[];
}

// === Constants ===

export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ['in_progress'],
  in_progress: ['review', 'todo'],
  review: ['done', 'in_progress'],
  done: [],
};

// === Pure Functions ===

export function computeUrgency(dueDate: Date, now: Date): UrgencyColor {
  const diffMs = dueDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'overdue';
  if (diffDays < 3) return 'red';
  if (diffDays <= 7) return 'yellow';
  return 'green';
}

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function computeProgress(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

export function groupTasksByStatus(tasks: TaskBoardItem[]): TaskBoardState {
  const board: TaskBoardState = { todo: [], in_progress: [], review: [], done: [] };
  for (const task of tasks) {
    if (task.status in board) board[task.status].push(task);
  }
  return board;
}

export function serializeTaskBoard(board: TaskBoardState): string {
  return JSON.stringify(board);
}

export function deserializeTaskBoard(json: string): TaskBoardState {
  const parsed = JSON.parse(json);
  return {
    todo: Array.isArray(parsed.todo) ? parsed.todo : [],
    in_progress: Array.isArray(parsed.in_progress) ? parsed.in_progress : [],
    review: Array.isArray(parsed.review) ? parsed.review : [],
    done: Array.isArray(parsed.done) ? parsed.done : [],
  };
}

// === API Functions ===

function mapRow(r: any): TaskBoardItem {
  const now = new Date();
  const dueDate = r.due_date ? new Date(r.due_date) : null;
  return {
    taskId: r.task_id,
    title: r.title,
    description: r.description || '',
    status: r.status || 'todo',
    assignedTo: r.assigned_to || '',
    dueDate: r.due_date?.toISOString?.() || r.due_date || null,
    entityType: r.linked_entity_type || '',
    entityId: r.linked_entity_id || '',
    urgency: dueDate ? computeUrgency(dueDate, now) : 'green',
    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function getKanbanBoard(tenantId: string): Promise<TaskBoardState> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT task_id, title, description, status, assigned_to, due_date, linked_entity_type, linked_entity_id, created_at
     FROM "${schema}".remediation_tasks ORDER BY due_date ASC NULLS LAST`
  );
  const rows = [...result.rows];

  // Include RACI-routed process_tasks (map statuses to kanban columns)
  try {
    const ptResult = await safeQuery(
      `SELECT task_id, title, description,
              CASE status
                WHEN 'pending' THEN 'todo'
                WHEN 'assigned' THEN 'todo'
                WHEN 'in_progress' THEN 'in_progress'
                WHEN 'escalated' THEN 'in_progress'
                WHEN 'completed' THEN 'done'
                WHEN 'cancelled' THEN 'done'
                ELSE 'todo'
              END AS status,
              assigned_user_id AS assigned_to,
              due_date, task_type AS linked_entity_type, trigger_source AS linked_entity_id, created_at
       FROM "${schema}".process_tasks ORDER BY due_date ASC NULLS LAST`
    );
    rows.push(...ptResult.rows);
  } catch {
    // process_tasks table may not exist
  }

  const tasks = rows.map(mapRow);
  return groupTasksByStatus(tasks);
}

export async function createTask(tenantId: string, data: {
  title: string; description?: string; assignedTo?: string; dueDate?: string;
  entityType?: string; entityId?: string;
}): Promise<TaskBoardItem> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".remediation_tasks (title, description, assigned_to, due_date, linked_entity_type, linked_entity_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'todo') RETURNING *`,
    [data.title, data.description || '', data.assignedTo || null, data.dueDate || null, data.entityType || null, data.entityId || null]
  );
  return mapRow(getFirstRow(result));
}

export async function updateTaskStatus(tenantId: string, taskId: string, newStatus: TaskStatus): Promise<TaskBoardItem> {
  const schema = tenantSchema(tenantId);
  const existing = await safeQuery(`SELECT status FROM "${schema}".remediation_tasks WHERE task_id = $1`, [taskId]);
  if (existing.rows.length === 0) throw new Error('Task not found');

  // Map DB statuses to board statuses
  const currentStatus = getFirstRow(existing)?.status as TaskStatus;
  if (!isValidTransition(currentStatus, newStatus)) {
    throw new Error(`Invalid transition from ${currentStatus} to ${newStatus}`);
  }

  const completedAt = newStatus === 'done' ? 'NOW()' : 'NULL';
  const result = await safeQuery(
    `UPDATE "${schema}".remediation_tasks SET status = $1, completed_at = ${completedAt} WHERE task_id = $2 RETURNING *`,
    [newStatus, taskId]
  );
  const task = mapRow(getFirstRow(result));

  // Gap 6: Emit domain event for agent feedback loop
  if (newStatus === 'done') {
    import('../../../../platform/dos/events/domain-event-bridge.service').then(({ notifyDomainChange }) =>
      notifyDomainChange(tenantId, 'task', 'update', taskId)
    ).catch(catchHandler(EC.EVENT_BUS, {}));
    import('../../../platform/services/event/event-bus.service').then(({ eventBus }) =>
      eventBus.publish({
        eventType: 'task.completed',
        tenantId, sourceService: 'task-board',
        severity: 'info',
        entityType: 'task', entityId: taskId,
        payload: { taskId, title: task.title, status: newStatus, assignedTo: task.assignedTo },
      })
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  return task;
}

export async function getTaskProgress(tenantId: string, entityType: string, entityId: string): Promise<{ completed: number; total: number; percent: number }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'done' OR status = 'completed') as completed
     FROM "${schema}".remediation_tasks WHERE linked_entity_type = $1 AND linked_entity_id = $2`,
    [entityType, entityId]
  );
  const total = parseInt(getFirstRow(result)?.total, 10);
  const completed = parseInt(getFirstRow(result)?.completed, 10);
  return { completed, total, percent: computeProgress(completed, total) };
}
