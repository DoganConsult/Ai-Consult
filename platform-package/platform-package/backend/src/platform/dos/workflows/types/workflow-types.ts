// ============================================
// DOS Platform — Workflow Types
// Shared interfaces for workflow engine
// ============================================

export interface WorkflowNode {
  id: string;
  type: string;
  label?: string;
  config?: Record<string, any>;
  [key: string]: unknown;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
  [key: string]: unknown;
}

export interface WorkflowTrigger {
  type: string;
  config?: Record<string, any>;
  [key: string]: unknown;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  swimlanes: string[];
  triggers: WorkflowTrigger[];
}

/**
 * Workflow row as returned from database.
 */
export interface WorkflowRow {
  workflow_id: string;
  name: string;
  definition: WorkflowDefinition;
  version?: number;
  created_by: string;
  department_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Workflow execution step log entry.
 */
export interface WorkflowStep {
  nodeId: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  result?: Record<string, any>;
  error?: string;
  [key: string]: unknown;
}

/**
 * Workflow execution instance.
 */
export interface WorkflowExecution {
  execution_id: string;
  workflow_id: string;
  workflow_name?: string;
  trigger_type: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  step_log: WorkflowStep[];
  is_simulation?: boolean;
}

/** Execution context for department-scoped workflow guard: user's department and whether they have tenant-wide execution role */
export type WorkflowExecutionContext = {
  userId?: string;
  departmentId?: string | null;
  isTenantWideRole?: boolean;
};

/**
 * Approval record as stored in the approvals table.
 */
export interface ApprovalRecord {
  approval_id: string;
  execution_id: string;
  step_id: string;
  approver_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  sla_deadline: string | null;
  escalation_chain: string[];
  decision_comment: string | null;
  decided_at: string | null;
  created_at: string;
}
