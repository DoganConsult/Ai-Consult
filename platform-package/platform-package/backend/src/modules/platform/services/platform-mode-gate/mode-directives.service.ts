/**
 * Mode Directives: system prompt templates per platform mode,
 * and Appendix A.12 structured WorkflowModeDeclaration defaults.
 */
import type { PlatformMode } from './platform-mode.types';

// -- Per-mode system prompt directives for AI agents --

const MODE_DIRECTIVES: Record<PlatformMode, string> = {
  human: `
=== ADVISORY MODE (Human-in-the-Loop) ===
You are running in ADVISORY mode. A human must approve every action.
Scan the tenant context and PROPOSE actions only. Do NOT indicate urgency
requiring immediate execution. Every action you propose will be queued
for human review before execution.

Return JSON ONLY:
{
  "actions": [{ "type": "...", "title": "...", "description": "...", "priority": "...", "entityType": "...", "entityId": "...", "assignToRole": "...", "dueInDays": 7 }],
  "summary": "one-sentence summary"
}
Rules: Maximum 5 actions. Be specific. If nothing needed, return empty actions.`,

  hybrid: `
=== HYBRID MODE (Auto-execute low risk, queue high risk) ===
You are running in HYBRID mode. Low-risk and medium-priority actions
execute automatically. High-risk and critical actions are queued for
human approval. Mark each action's priority accurately — it determines
whether it auto-executes or waits for approval.

Return JSON ONLY:
{
  "actions": [{ "type": "...", "title": "...", "description": "...", "priority": "...", "entityType": "...", "entityId": "...", "assignToRole": "...", "dueInDays": 7 }],
  "summary": "one-sentence summary"
}
Rules: Maximum 5 actions. Be conservative with priority. If nothing needed, return empty actions.`,

  shadow_agent: `
=== SHADOW MODE (Execute + Log, human can override) ===
You are running in SHADOW mode. All actions execute immediately but are
logged with full reasoning for post-hoc human review. Humans can override
within a review window. Provide clear reasoning in each description.

Return JSON ONLY:
{
  "actions": [{ "type": "...", "title": "...", "description": "...", "priority": "...", "entityType": "...", "entityId": "...", "assignToRole": "...", "dueInDays": 7 }],
  "summary": "one-sentence summary"
}
Rules: Maximum 5 actions. Include reasoning in description. If nothing needed, return empty actions.`,

  full_autonomous: `
=== AUTONOMOUS MODE ===
You are running in fully autonomous mode — no human has triggered this.
Scan the provided tenant context and identify the most important actions needed right now.

Return JSON ONLY:
{
  "actions": [{ "type": "...", "title": "...", "description": "...", "priority": "...", "entityType": "...", "entityId": "...", "assignToRole": "...", "dueInDays": 7 }],
  "summary": "one-sentence summary"
}
Rules: Maximum 5 actions. Only actions with clear evidence of being needed. If nothing needed, return empty actions.`,
};

export function getModeDirective(mode: PlatformMode): string {
  return MODE_DIRECTIVES[mode] || MODE_DIRECTIVES.human;
}

// -- Appendix A.12: Structured Mode Declaration --
// Every AI-enabled workflow should declare its operating policy using this format.

export interface WorkflowModeDeclaration {
  /** Active operating mode */
  operatingMode: PlatformMode;
  /** Sub-modes or postures allowed (e.g., hyper-orchestrated under hybrid) */
  allowedSubmodes: string[];
  /** Who approves and at what threshold */
  approvalPolicy: { requiredForPriority: 'critical' | 'high' | 'medium' | 'low' | 'all'; approverType: string };
  /** Which tools the workflow may invoke */
  toolPolicy: { allowedToolScopes: string[]; blockedTools: string[] };
  /** Memory scopes the workflow may read/write */
  memoryPolicy: { readScopes: string[]; writeScopes: string[] };
  /** Escalation rules when workflow cannot proceed */
  escalationPolicy: { escalateTo: string; afterMinutes: number; maxEscalations: number };
  /** Conditions that trigger automatic downgrade to safer mode */
  downgradePolicy: { triggerOnErrorCount: number; triggerOnConfidenceBelow: number; downgradeTo: PlatformMode };
  /** Audit verbosity for this workflow */
  auditPolicy: { level: 'minimal' | 'standard' | 'full'; logToolCalls: boolean; logMemoryAccess: boolean };
}

/** Default mode declarations per platform mode (Appendix A.12). */
export const DEFAULT_MODE_DECLARATIONS: Record<PlatformMode, WorkflowModeDeclaration> = {
  human: {
    operatingMode: 'human',
    allowedSubmodes: [],
    approvalPolicy: { requiredForPriority: 'all', approverType: 'human' },
    toolPolicy: { allowedToolScopes: ['read'], blockedTools: [] },
    memoryPolicy: { readScopes: ['task', 'working'], writeScopes: [] },
    escalationPolicy: { escalateTo: 'human', afterMinutes: 0, maxEscalations: 0 },
    downgradePolicy: { triggerOnErrorCount: 1, triggerOnConfidenceBelow: 1.0, downgradeTo: 'human' },
    auditPolicy: { level: 'full', logToolCalls: true, logMemoryAccess: true },
  },
  hybrid: {
    operatingMode: 'hybrid',
    allowedSubmodes: ['hyper_orchestrated'],
    approvalPolicy: { requiredForPriority: 'high', approverType: 'human' },
    toolPolicy: { allowedToolScopes: ['read', 'write'], blockedTools: [] },
    memoryPolicy: { readScopes: ['task', 'working', 'personal'], writeScopes: ['task', 'working'] },
    escalationPolicy: { escalateTo: 'human', afterMinutes: 30, maxEscalations: 3 },
    downgradePolicy: { triggerOnErrorCount: 3, triggerOnConfidenceBelow: 0.4, downgradeTo: 'human' },
    auditPolicy: { level: 'standard', logToolCalls: true, logMemoryAccess: false },
  },
  shadow_agent: {
    operatingMode: 'shadow_agent',
    allowedSubmodes: ['hyper_orchestrated'],
    approvalPolicy: { requiredForPriority: 'critical', approverType: 'human' },
    toolPolicy: { allowedToolScopes: ['read', 'write'], blockedTools: ['destructive'] },
    memoryPolicy: { readScopes: ['task', 'working', 'personal', 'tool'], writeScopes: ['task', 'working', 'tool'] },
    escalationPolicy: { escalateTo: 'human', afterMinutes: 60, maxEscalations: 2 },
    downgradePolicy: { triggerOnErrorCount: 5, triggerOnConfidenceBelow: 0.3, downgradeTo: 'hybrid' },
    auditPolicy: { level: 'full', logToolCalls: true, logMemoryAccess: true },
  },
  full_autonomous: {
    operatingMode: 'full_autonomous',
    allowedSubmodes: ['hyper_orchestrated'],
    approvalPolicy: { requiredForPriority: 'critical', approverType: 'team_lead' },
    toolPolicy: { allowedToolScopes: ['read', 'write', 'destructive'], blockedTools: [] },
    memoryPolicy: { readScopes: ['task', 'working', 'personal', 'tool'], writeScopes: ['task', 'working', 'tool'] },
    escalationPolicy: { escalateTo: 'shadow_agent', afterMinutes: 120, maxEscalations: 1 },
    downgradePolicy: { triggerOnErrorCount: 3, triggerOnConfidenceBelow: 0.5, downgradeTo: 'shadow_agent' },
    auditPolicy: { level: 'full', logToolCalls: true, logMemoryAccess: true },
  },
};

/** Get the structured mode declaration for a platform mode. */
export function getModeDeclaration(mode: PlatformMode): WorkflowModeDeclaration {
  return DEFAULT_MODE_DECLARATIONS[mode] ?? DEFAULT_MODE_DECLARATIONS.human;
}
