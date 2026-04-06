export interface ComplianceWorkflowContext {
  tenantId: string;
  entityId: string;
  entityType: string;
  triggeredBy: string;
  correlationId?: string;
}

export async function onWorkflowTriggered(_ctx: ComplianceWorkflowContext): Promise<void> {
}

export async function onTaskCreated(_ctx: ComplianceWorkflowContext, _taskId: string): Promise<void> {
}

export async function onApprovalRequired(_ctx: ComplianceWorkflowContext, _approverRole: string): Promise<void> {
}

export async function onEscalation(_ctx: ComplianceWorkflowContext, _reason: string, _escalateTo: string): Promise<void> {
}

export async function onClosure(_ctx: ComplianceWorkflowContext, _closureReason: string): Promise<void> {
}

export async function onFailure(_ctx: ComplianceWorkflowContext, _error: string): Promise<void> {
}
