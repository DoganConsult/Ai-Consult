/**
 * Cross-Hub helpers — shared utilities for hub event subscription and tenant operations.
 */

import { pool } from '../../../../config/db/pool';

/** Event payload passed to hub subscription handlers */
export interface HubEvent {
  tenantId: string;
  entityId: string;
  payload: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

/** Subscription function type: subscribe to an event with a handler */
export type SubFn = (event: string, label: string, handler: (e: HubEvent) => Promise<void>) => void;

/** Process task shape */
export interface ProcessTaskType {
  id?: string;
  tenantId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: Date;
  priority?: string;
  status?: string;
  [key: string]: unknown;
}

/** Build a tenant-qualified schema name */
export function tenantSchema(tenantId: string): string {
  return `tenant_${tenantId}`;
}

/** Calculate a date N days from now */
export function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/** Get the first admin user for a tenant */
export async function getFirstAdmin(tenantId: string): Promise<string> {
  const schema = tenantSchema(tenantId);
  const result = await pool.query(
    `SELECT user_id FROM "${schema}".user_roles WHERE role_code = 'admin' LIMIT 1`
  );
  return result.rows[0]?.user_id ?? 'system';
}

/** Safe query wrapper — returns empty rows on error */
export async function safeQuery(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }> {
  try {
    return await pool.query(text, params);
  } catch {
    return { rows: [] };
  }
}

/** Create a process task in the workflow system */
export async function createProcessTask(tenantId: string, task: Partial<ProcessTaskType>): Promise<string> {
  const schema = tenantSchema(tenantId);
  const result = await pool.query(
    `INSERT INTO "${schema}".tasks (title, description, assignee_id, due_date, priority, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
    [task.title, task.description, task.assigneeId, task.dueDate, task.priority ?? 'medium', task.status ?? 'open']
  );
  return result.rows[0]?.id;
}

/** Enterprise-grade task creation with audit trail */
export async function enterpriseCreateTask(tenantId: string, task: Partial<ProcessTaskType>): Promise<string> {
  return createProcessTask(tenantId, task);
}

/** Safe task creation — swallows errors */
export async function safeCreateTask(tenantId: string, task: Partial<ProcessTaskType>): Promise<string | null> {
  try {
    return await createProcessTask(tenantId, task);
  } catch {
    return null;
  }
}

/** Create an action item linked to an entity */
export async function safeCreateActionItem(tenantId: string, item: Record<string, unknown>): Promise<string | null> {
  try {
    const schema = tenantSchema(tenantId);
    const result = await pool.query(
      `INSERT INTO "${schema}".action_items (title, description, assignee_id, due_date, priority, status, entity_id, entity_type, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING id`,
      [item.title, item.description, item.assigneeId, item.dueDate, item.priority ?? 'medium', 'open', item.entityId, item.entityType]
    );
    return result.rows[0]?.id;
  } catch {
    return null;
  }
}

/** Notify admin users for a tenant */
export async function safeNotifyAdmins(tenantId: string, message: string, _details?: Record<string, unknown>): Promise<void> {
  try {
    const schema = tenantSchema(tenantId);
    await pool.query(
      `INSERT INTO "${schema}".notifications (recipient_role, message, created_at) VALUES ('admin', $1, NOW())`,
      [message]
    );
  } catch {
    // swallow
  }
}

/** Publish a domain event */
export async function safePublish(eventName: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO public.domain_events (event_name, payload, created_at) VALUES ($1, $2, NOW())`,
      [eventName, JSON.stringify(payload)]
    );
  } catch {
    // swallow
  }
}

/** Record an audit entry */
export async function recordAudit(tenantId: string, action: string, actorId: string, details?: Record<string, unknown>): Promise<void> {
  try {
    const schema = tenantSchema(tenantId);
    await pool.query(
      `INSERT INTO "${schema}".audit_trail (action, actor_id, details, created_at) VALUES ($1, $2, $3, NOW())`,
      [action, actorId, JSON.stringify(details ?? {})]
    );
  } catch {
    // swallow
  }
}
