// @cross-layer-bridge: DOS agents barrel re-exports SoD/delegation from DAuth (consumption, not ownership)
export type {
  AgentExecutionMode,
  AgentType,
  AgentState,
  ReplacementPosture,
  ToolRiskLevel,
  ToolReadWrite,
  AgentRunStatus,
  ApprovalDecision,
  MemoryScope,
  HealthPosture,
  AgentEventType,
  AgentEscalationRule,
  AgentDefinition,
  AgentApprovalPolicy,
  AgentReplacementPolicy,
  AgentRetryPolicy,
  AgentHealthPolicy,
  AgentObservabilityProfile,
  AgentToolDefinition,
  AgentToolCallRequest,
  AgentToolCallResult,
  AgentRunRequest,
  AgentRunResult,
  AgentTaskDefinition,
  AgentApprovalRequest,
  AgentMemoryEntry,
  AgentContextPackage,
  AgentHealthSnapshot,
  AgentDiagnosticsSnapshot,
  AgentAdminAction,
} from './contracts/agent.types';

export {
  agentRegistryService,
  registerAgent,
  registerAgentBatch,
  getAgentDefinition,
  getAllAgentDefinitions,
  getAgentsByType,
  getAgentsByOwner,
  getAgentsByMode,
  validateAgentDefinition,
  getAgentState,
  setAgentState,
  isAgentActive,
  persistAgentRegistration,
  resetRegistry,
} from './registry/agent-registry.service';

export {
  executeAgentRun,
  cancelAgentRun,
  getRunHistory,
  getRunById,
} from './runtime/agent-runtime.service';

export {
  agentTaskService,
  createTask,
  assignTask,
  completeTask,
  failTask,
  escalateTask,
  getTasksByAgent,
  getTaskById,
} from './tasks/agent-task.service';

export {
  agentToolRegistryService,
  registerTool,
  registerToolBatch,
  getToolDefinition,
  getAllToolDefinitions,
  getToolsByRisk,
  getToolsForAgent,
  isToolAllowedForAgent,
  validateToolDefinition,
  executeToolCall,
  resetToolRegistry,
} from './tools/agent-tool-registry.service';

export {
  agentMemoryService,
  storeMemory,
  retrieveMemories,
  retrieveByKey,
  retrieveSharedMemories,
  deleteMemory,
  deleteExpiredMemories,
  deleteAgentMemories,
  getMemoryStats,
} from './memory/agent-memory.service';

export {
  agentContextService,
  buildAgentContext,
  type ContextBuildRequest,
} from './context/agent-context.service';

export {
  agentPolicyService,
  evaluateAgentPolicy,
  type PolicyEvaluationResult,
} from './policies/agent-policy.service';

export {
  agentApprovalService,
  requestApproval,
  resolveApproval,
  getApprovalById,
  getPendingApprovals,
  getApprovalsByRun,
  expireStaleApprovals,
} from './approvals/agent-approval.service';

export {
  agentOutputValidatorService,
  validateAgentOutput,
  type OutputValidationResult,
} from './validation/agent-output-validator.service';

export {
  agentHealthService,
  checkAgentHealth,
  recordRunOutcome,
  evaluateCircuitBreaker,
  getAllAgentHealth,
  resetHealthCounters,
} from './health/agent-health.service';

export {
  agentEventsService,
  registerAgentEventTypes,
  publishAgentEvent,
  subscribeToAgentEvent,
  subscribeToAllAgentEvents,
} from './events/agent-events.service';

export {
  agentDiagnosticsService,
  recordRunMetrics,
  getAgentDiagnostics,
  getPlatformDiagnostics,
} from './diagnostics/agent-diagnostics.service';

export {
  agentAdminService,
  enableAgent,
  disableAgent,
  pauseAgent,
  retireAgent,
  getAgentAdminView,
  getPlatformAdminOverview,
  executeAdminAction,
  updateReplacementPosture,
  getAgentIncidents,
  getAgentRollbackHistory,
} from './admin/agent-admin.service';

export { agentRouter } from './admin/agent.controller';

export {
  agentWorkflowBridgeService,
  findAgentsForWorkflow,
  triggerAgentsForWorkflowTransition,
  triggerAgentForScheduledJob,
  type WorkflowTriggerRequest,
  type WorkflowAgentResult,
} from './workflow/agent-workflow-bridge.service';

export {
  moduleAgentManifestService,
  registerModuleAgentManifest,
  getModuleManifest,
  getAllModuleManifests,
  resetModuleManifests,
  type ModuleAgentManifest,
} from './registry/module-agent-manifest.service';

export {
  adaptAgrcToolToDefinition,
  syncAgentTools,
  syncAllAgentTools,
} from './tools/tool-sync-adapter.service';

export {
  mcpGovernanceBridgeService,
  executeMcpToolGoverned,
  type McpToolRequest,
  type McpGovernedResult,
} from './tools/mcp-governance-bridge.service';

export {
  capabilityGatingBridgeService,
  evaluateCapabilityGate,
  getGatedToolsForDosAgent,
  type CapabilityGateOutcome,
} from './tools/capability-gating-bridge.service';

export {
  agentInstructionService,
  registerStaticInstruction,
  resolveInstruction,
  saveInstruction,
  listInstructions,
  resetStaticInstructions,
  type AgentInstruction,
} from './instructions/agent-instruction.service';

export {
  agentSchedulerService,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getSchedulesForAgent,
  getAllSchedules,
  recordScheduleRun,
  type AgentScheduleDefinition,
} from './scheduling/agent-scheduler.service';

export {
  agentOrchestratorService,
  buildOrchestrationPlan,
  executeOrchestration,
  runFullCycleOrchestration,
  type OrchestrationPlan,
  type OrchestrationWave,
  type OrchestrationResult,
  type WaveResult,
} from './orchestration/agent-orchestrator.service';

export {
  agentBudgetGuardService,
  evaluateBudgetGuard,
  getBudgetSnapshot,
  type BudgetCheckResult,
} from './policies/agent-budget-guard.service';

export {
  agentMiddlewareBridgeService,
  runInjectionGuard,
  runOutputRedaction,
  runPreExecutionMiddleware,
  runPostExecutionMiddleware,
  type MiddlewareCheckResult,
} from './policies/agent-middleware-bridge.service';

export {
  observabilityBridgeService,
  bridgeTraceCallback,
  bridgeLangGraphObservability,
  bridgeTemporalObservability,
  bridgeAnomalyDetection,
  bridgeDeadLetterEvent,
  type ObservabilityEvent,
} from './diagnostics/observability-bridge.service';

export {
  streamingBridgeService,
  activateStreamingBridge,
  deactivateStreamingBridge,
  isStreamingBridgeActive,
} from './events/streaming-bridge.service';

export {
  kernelWatchdogService,
  runWatchdogSweep,
  getWatchdogHistory,
  type WatchdogSweepResult,
  type WatchdogAlert,
} from './health/kernel-watchdog.service';

export {
  agentLifecycleService,
  isValidTransition,
  getValidTransitions,
  transitionAgentState,
  bulkTransition,
  type TransitionResult,
} from './lifecycle/agent-lifecycle.service';

export {
  agentSodDelegationService,
  validateSodAndDelegation,
  type SodDelegationCheckResult,
} from '../../dauth/agents/policies/agent-sod-delegation.service';

export {
  agentMemoryGcService,
  runMemoryGc,
  type MemoryGcResult,
} from './memory/agent-memory-gc.service';

export {
  writeKernelAuditLog,
  queryKernelAuditLog,
  getKernelAuditSummary,
  type KernelAuditCategory,
  type KernelAuditEntry,
} from './diagnostics/kernel-audit-log.service';

export {
  agentEventTriggerService,
  activateAgentEventTriggers,
  deactivateAgentEventTriggers,
} from './events/agent-event-trigger.service';

export {
  agentCronRunnerService,
  startAgentCronRunner,
  stopAgentCronRunner,
} from './scheduling/agent-cron-runner.service';
