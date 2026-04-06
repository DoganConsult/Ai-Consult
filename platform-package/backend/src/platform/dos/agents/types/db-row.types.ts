export interface AgentRunRow {
  run_id: string;
  agent_code: string;
  tenant_id: string;
  actor_id: string;
  trigger_source: string;
  task_id: string | null;
  status: string;
  input: string | Record<string, unknown>;
  output: string | Record<string, unknown> | null;
  duration_ms: number | null;
  tokens_used: number | null;
  cost_usd: string | number | null;
  error: string | null;
  correlation_id: string;
  cancelled_by: string | null;
  created_at: Date;
  completed_at: Date | null;
}

export interface AgentTaskRow {
  task_id: string;
  agent_code: string;
  tenant_id: string;
  task_type: string;
  module_code: string;
  entity_type: string | null;
  entity_id: string | null;
  priority: string;
  status: string;
  assigned_at: Date | null;
  completed_at: Date | null;
  escalated_to: string | null;
  input: string | Record<string, unknown>;
  output: string | Record<string, unknown> | null;
  created_by: string;
  correlation_id: string;
}

export interface AgentMemoryRow {
  memory_id: string;
  agent_code: string;
  tenant_id: string;
  scope: string;
  run_id: string | null;
  key: string;
  value: string | Record<string, unknown>;
  importance: number;
  token_count: number;
  created_at: Date;
  expires_at: Date | null;
}

export interface AgentApprovalRow {
  approval_id: string;
  run_id: string;
  agent_code: string;
  tenant_id: string;
  action_description: string;
  risk_level: string;
  tool_code: string;
  requested_by: string;
  requested_at: Date | string;
  decision: string;
  decided_by: string | null;
  decided_at: Date | string | null;
  reason: string | null;
  expires_at: Date | string;
}
