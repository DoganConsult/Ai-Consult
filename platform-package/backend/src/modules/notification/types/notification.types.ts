export interface Notification {
  notification_id: string;
  tenant_id: string;
  recipient_id: string;
  channel: string;
  subject: string;
  body: string;
  status: string;
  read_at?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface NotificationCreateInput {
  tenant_id: string;
  recipient_id: string;
  channel: string;
  subject: string;
  body: string;
  status: string;
  read_at?: string;
  sent_at?: string;
  created_by: string;
}

export interface NotificationUpdateInput {
  
  recipient_id: string;
  channel: string;
  subject: string;
  body: string;
  status: string;
  read_at?: string;
  sent_at?: string;
  updated_by: string;
}

export interface NotificationListFilter {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface NotificationListResult {
  rows: Notification[];
  total: number;
}

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'archived';

export const NOTIFICATION_STATUSES: readonly NotificationStatus[] = ['pending', 'sent', 'delivered', 'read', 'failed', 'archived'] as const;



export type NotificationSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const NOTIFICATION_SOURCES: readonly NotificationSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type NotificationStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface NotificationEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'notification';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: NotificationStatus;
  newState?: NotificationStatus;
  data: Record<string, unknown>;
}
