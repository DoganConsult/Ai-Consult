export interface AuditWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export async function onWorkflowTriggered(_ctx: AuditWorkflowContext): Promise<void> {
}

export async function onTaskCreated(_ctx: AuditWorkflowContext, _taskId: string): Promise<void> {
}

export async function onApprovalRequired(_ctx: AuditWorkflowContext, _approverRole: string): Promise<void> {
}

export async function onEscalation(_ctx: AuditWorkflowContext, _reason: string, _escalateTo: string): Promise<void> {
}

export async function onClosure(_ctx: AuditWorkflowContext, _closureReason: string): Promise<void> {
}

export async function onFailure(_ctx: AuditWorkflowContext, _error: string): Promise<void> {
}
