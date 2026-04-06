export type AgentExecutionMode =
  | 'observe-only'
  | 'advisory'
  | 'drafting'
  | 'co-pilot'
  | 'delegated-executor'
  | 'bounded-autonomous';

export type AgentType =
  | 'platform'
  | 'product'
  | 'module'
  | 'personal'
  | 'service'
  | 'orchestration';

export type AgentState =
  | 'registered'
  | 'active'
  | 'paused'
  | 'disabled'
  | 'shadow'
  | 'canary'
  | 'retired';

export type ReplacementPosture =
  | 'preplacement'
  | 'assisted-execution'
  | 'delegated-execution'
  | 'replacement-candidate'
  | 'replacement-prohibited';

export type ToolRiskLevel = 'safe' | 'moderate' | 'high' | 'critical';
export type ToolReadWrite = 'read' | 'write' | 'read-write';

export type AgentRunStatus =
  | 'queued'
  | 'running'
  | 'awaiting-approval'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'escalated'
  | 'cancelled';

export type ApprovalDecision = 'pending' | 'approved' | 'denied' | 'expired' | 'auto-approved';

export type MemoryScope = 'ephemeral' | 'run' | 'session' | 'agent' | 'shared';

export type HealthPosture = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export type AgentEventType =
  | 'agent.registered'
  | 'agent.enabled'
  | 'agent.disabled'
  | 'agent.task.created'
  | 'agent.run.started'
  | 'agent.tool.called'
  | 'agent.tool.completed'
  | 'agent.approval.requested'
  | 'agent.approval.granted'
  | 'agent.approval.denied'
  | 'agent.run.failed'
  | 'agent.run.escalated'
  | 'agent.run.completed'
  | 'agent.policy.blocked'
  | 'agent.replacement.status.changed';

export interface AgentEscalationRule {
  condition: 'tool_failure' | 'low_confidence' | 'blocked_action' | 'timeout' | 'sod_violation' | 'custom';
  target: 'human' | 'workflow' | 'supervisor_agent' | 'admin';
  targetId?: string;
  description: string;
}

export interface AgentDefinition {
  agentCode: string;
  name: string;
  version: string;
  agentType: AgentType;
  ownerLayer: 'platform' | 'product' | 'module';
  ownerCode: string;
  executionMode: AgentExecutionMode;
  defaultState: AgentState;
  allowedTools: string[];
  allowedContexts: string[];
  allowedTaskTypes: string[];
  allowedTriggerSources: Array<'user' | 'event' | 'schedule' | 'agent' | 'workflow' | 'system'>;
  writeBoundaries: string[];
  completionSignals: string[];
  requiredCapabilities: string[];
  instructionSource: 'static' | 'registry' | 'prompt-template' | 'dynamic';
  escalationRules: AgentEscalationRule[];
  approvalPolicy: AgentApprovalPolicy;
  replacementPolicy: AgentReplacementPolicy;
  retryPolicy: AgentRetryPolicy;
  eventSubscriptions: string[];
  healthPolicy: AgentHealthPolicy;
  observabilityProfile: AgentObservabilityProfile;
  uiExposurePolicy: 'visible' | 'admin-only' | 'hidden';
  egressPolicy?: AgentEgressPolicy;
  specialty?: string;
  toolDescriptions?: Record<string, string>;
  ui?: AgentUIConfig;
  workflow?: AgentWorkflowConfig;
  auditConfig?: AgentAuditConfig;
  dependencies?: AgentDependencyGraph;
}

export interface AgentUIConfig {
  displayName?: string;
  avatarIcon?: string;
  themeColor?: string;
  dashboardWidgets?: string[];
}

export interface AgentWorkflowConfig {
  canStartWorkflows: boolean;
  canInterruptHuman: boolean;
  maxConcurrentWorkflows: number;
}

export interface AgentAuditConfig {
  logLevel: 'basic' | 'verbose' | 'debug';
  retentionDays: number;
}

export interface AgentDependencyGraph {
  predecessors: string[];
  successors: string[];
}

export interface AgentEgressPolicy {
  restrictDomains: string[];
  tlsRequired: boolean;
  maxPayloadBytes: number;
}

export interface AgentApprovalPolicy {
  requiresApprovalForWrite: boolean;
  highRiskThreshold: number;
  autoApproveBelow: number;
  humanReviewRequired: boolean;
  selfApprovalBlocked: boolean;
  blockedActionCategories: string[];
  fallbackResponse: 'deny' | 'escalate' | 'queue';
  safeRefusalBehavior: string;
}

export interface AgentReplacementPolicy {
  posture: ReplacementPosture;
  targetRoles: string[];
  allowedAutomationDepth: AgentExecutionMode;
  prohibitedZones: string[];
  requiresGovernanceApproval: boolean;
  measurementCriteria: string[];
  rollbackCriteria: string[];
  supervisionRequired: boolean;
  accountabilityOwner: string;
}

export interface AgentRetryPolicy {
  maxRetries: number;
  retryDelayMs: number;
  retryableErrors: string[];
}

export interface AgentHealthPolicy {
  maxConsecutiveFailures: number;
  healthCheckIntervalSeconds: number;
  circuitBreakerThreshold: number;
  cooldownSeconds: number;
  autoDisableOnFailure: boolean;
}

export interface AgentObservabilityProfile {
  logRunDetails: boolean;
  logToolCalls: boolean;
  logDecisions: boolean;
  logApprovals: boolean;
  trackCost: boolean;
  trackTokenUsage: boolean;
  trackLatency: boolean;
}

export interface AgentToolDefinition {
  toolCode: string;
  name: string;
  owner: string;
  allowedAgentTypes: AgentType[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  riskLevel: ToolRiskLevel;
  readWrite: ToolReadWrite;
  requiresApproval: boolean;
  dauthControlRequired: boolean;
  auditRequired: boolean;
}

export interface AgentToolCallRequest {
  runId: string;
  agentCode: string;
  toolCode: string;
  tenantId: string;
  actorId: string;
  input: Record<string, unknown>;
  correlationId: string;
}

export interface AgentToolCallResult {
  toolCode: string;
  success: boolean;
  output: Record<string, unknown>;
  durationMs: number;
  approvalRequired: boolean;
  approvalId?: string;
  error?: string;
}

export interface AgentRunRequest {
  agentCode: string;
  tenantId: string;
  actorId: string;
  triggerSource: 'user' | 'event' | 'schedule' | 'agent' | 'workflow' | 'system';
  taskId?: string;
  input: Record<string, unknown>;
  contextOverrides?: Record<string, unknown>;
  delegationGrantId?: string;
  correlationId: string;
}

export interface AgentRunResult {
  runId: string;
  agentCode: string;
  status: AgentRunStatus;
  output: Record<string, unknown>;
  toolCalls: AgentToolCallResult[];
  durationMs: number;
  tokensUsed: number;
  costUsd: number;
  approvalsRequired: boolean;
  escalated: boolean;
  correlationId: string;
  error?: string;
}

export interface AgentTaskDefinition {
  taskId: string;
  agentCode: string;
  tenantId: string;
  taskType: string;
  moduleCode: string;
  entityType?: string;
  entityId?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'escalated';
  assignedAt?: string;
  completedAt?: string;
  escalatedTo?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  createdBy: string;
  correlationId: string;
}

export interface AgentApprovalRequest {
  approvalId: string;
  runId: string;
  agentCode: string;
  tenantId: string;
  actionDescription: string;
  riskLevel: ToolRiskLevel;
  toolCode: string;
  requestedBy: string;
  requestedAt: string;
  decision: ApprovalDecision;
  decidedBy?: string;
  decidedAt?: string;
  reason?: string;
  expiresAt: string;
}

export interface AgentMemoryEntry {
  memoryId: string;
  agentCode: string;
  tenantId: string;
  scope: MemoryScope;
  runId?: string;
  key: string;
  value: Record<string, unknown>;
  importance: number;
  tokenCount: number;
  createdAt: string;
  expiresAt?: string;
}

export interface AgentContextPackage {
  tenantId: string;
  agentCode: string;
  runId: string;
  moduleCode: string;
  entityType?: string;
  entityId?: string;
  permissions: string[];
  scopes: string[];
  memories: AgentMemoryEntry[];
  contextData: Record<string, unknown>;
  restrictions: string[];
}

export interface AgentHealthSnapshot {
  agentCode: string;
  tenantId: string;
  posture: HealthPosture;
  consecutiveFailures: number;
  runs24h: number;
  failures24h: number;
  avgDurationMs: number;
  lastCheckedAt: string;
}

export interface AgentDiagnosticsSnapshot {
  agentCode: string;
  tenantId: string;
  state: AgentState;
  mode: AgentExecutionMode;
  health: AgentHealthSnapshot;
  totalRuns24h: number;
  completedRuns24h: number;
  failedRuns24h: number;
  totalTokens24h: number;
  totalCost24h: number;
  avgDurationMs: number;
  totalToolCalls24h: number;
  replacementPosture: ReplacementPosture;
  toolInventory: string[];
  policyInventory: {
    approvalForWrite: boolean;
    selfApprovalBlocked: boolean;
    blockedCategories: string[];
  };
  snapshotAt: string;
}

export interface AgentAdminAction {
  actionCode: 'enable' | 'disable' | 'pause' | 'retire' | 'cancel_run' | 'approve' | 'deny';
  agentCode: string;
  tenantId: string;
  performedBy: string;
  reason: string;
  targetRunId?: string;
  targetApprovalId?: string;
}
