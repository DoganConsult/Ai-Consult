// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../../config/database';
import { getFirstRow } from '../../../../shared/data/db-utils';

interface DiagramNode {
  id: string;
  type: string;
  subType?: string;
  label_en?: string;
  label?: string;
  swimlane?: string;
  slaHours?: number;
}

interface DiagramEdge {
  from?: string;
  to?: string;
  source?: string;
  target?: string;
  condition?: string;
  label?: string;
}

interface DiagramDefinition {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  swimlanes?: string[];
  triggers?: Array<{ type: string; config?: Record<string, any> }>;
}

interface StepLogEntry {
  nodeId: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  [key: string]: unknown;
}

function nodeShape(node: DiagramNode): string {
  const label = escapeLabel(node.label_en || node.label || node.id);
  switch (node.type) {
    case 'start':
      return `${node.id}(["${label}"])`;
    case 'end':
      return `${node.id}(["${label}"])`;
    case 'decision':
    case 'condition':
      return `${node.id}{"${label}"}`;
    case 'approval':
      return `${node.id}[/"${label}"\\]`;
    case 'parallel_gateway':
      return `${node.id}{{"{${label}}"}}`;
    case 'notification':
      return `${node.id}>"${label}"]`;
    default:
      return `${node.id}["${label}"]`;
  }
}

function escapeLabel(text: string): string {
  return text
    .replace(/"/g, "'")
    .replace(/\n/g, ' ')
    .replace(/[#;]/g, '_');
}

function statusClass(status: string): string {
  switch (status) {
    case 'completed':
    case 'success':
      return 'completed';
    case 'running':
    case 'in_progress':
    case 'active':
      return 'active';
    case 'failed':
    case 'error':
      return 'failed';
    case 'skipped':
      return 'skipped';
    case 'paused':
    case 'pending':
      return 'pending';
    default:
      return 'default';
  }
}

export function buildExecutionMermaid(
  definition: DiagramDefinition,
  stepLog: StepLogEntry[],
): string {
  if (!definition || !Array.isArray(definition.nodes) || definition.nodes.length === 0) {
    return 'graph TD\n  empty["No workflow definition"]';
  }

  const lines: string[] = ['graph TD'];
  const stepStatusMap = new Map<string, string>();

  for (const step of stepLog || []) {
    if (step.nodeId) {
      stepStatusMap.set(step.nodeId, step.status);
    }
  }

  const swimlanes = definition.swimlanes || [];
  const nodesBySwimlane = new Map<string, DiagramNode[]>();
  const noSwimlane: DiagramNode[] = [];

  for (const node of definition.nodes) {
    const lane = node.swimlane;
    if (lane && swimlanes.includes(lane)) {
      if (!nodesBySwimlane.has(lane)) {
        nodesBySwimlane.set(lane, []);
      }
      nodesBySwimlane.get(lane)!.push(node);
    } else {
      noSwimlane.push(node);
    }
  }

  for (const node of noSwimlane) {
    lines.push(`  ${nodeShape(node)}`);
  }

  for (const [lane, nodes] of nodesBySwimlane) {
    lines.push(`  subgraph ${escapeLabel(lane)}`);
    for (const node of nodes) {
      lines.push(`    ${nodeShape(node)}`);
    }
    lines.push('  end');
  }

  for (const edge of definition.edges || []) {
    const from = edge.from || edge.source || '';
    const to = edge.to || edge.target || '';
    if (!from || !to) continue;

    const label = edge.condition || edge.label;
    if (label) {
      lines.push(`  ${from} -->|"${escapeLabel(label)}"| ${to}`);
    } else {
      lines.push(`  ${from} --> ${to}`);
    }
  }

  lines.push('');
  lines.push('  classDef completed fill:#d4edda,stroke:#28a745,color:#155724');
  lines.push('  classDef active fill:#fff3cd,stroke:#ffc107,color:#856404,stroke-width:3px');
  lines.push('  classDef failed fill:#f8d7da,stroke:#dc3545,color:#721c24');
  lines.push('  classDef skipped fill:#e2e3e5,stroke:#6c757d,color:#383d41');
  lines.push('  classDef pending fill:#cce5ff,stroke:#007bff,color:#004085');

  const classAssignments: Record<string, string[]> = {};
  for (const [nodeId, status] of stepStatusMap) {
    const cls = statusClass(status);
    if (cls !== 'default') {
      if (!classAssignments[cls]) classAssignments[cls] = [];
      classAssignments[cls].push(nodeId);
    }
  }

  for (const [cls, nodeIds] of Object.entries(classAssignments)) {
    lines.push(`  class ${nodeIds.join(',')} ${cls}`);
  }

  return lines.join('\n');
}

export async function generateWorkflowDiagram(
  tenantId: string,
  workflowInstanceId: string,
): Promise<string | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT wi.step_log, w.definition
     FROM "${schema}".workflow_instances wi
     LEFT JOIN "${schema}".workflows w ON w.workflow_id = wi.workflow_id
     WHERE wi.execution_id = $1`,
    [workflowInstanceId],
  );

  const row = getFirstRow(result);
  if (!row) return null;

  const definition: DiagramDefinition = typeof row.definition === 'string'
    ? JSON.parse(row.definition)
    : (row.definition || { nodes: [], edges: [] });

  const stepLog: StepLogEntry[] = Array.isArray(row.step_log)
    ? row.step_log
    : (row.step_log ? JSON.parse(JSON.stringify(row.step_log)) : []);

  return buildExecutionMermaid(definition, stepLog);
}

export function generateTemplateDiagram(definition: DiagramDefinition): string {
  if (!definition || !Array.isArray(definition.nodes) || definition.nodes.length === 0) {
    return 'graph TD\n  empty["No template definition"]';
  }

  const lines: string[] = ['graph TD'];

  const swimlanes = definition.swimlanes || [];
  const nodesBySwimlane = new Map<string, DiagramNode[]>();
  const noSwimlane: DiagramNode[] = [];

  for (const node of definition.nodes) {
    const lane = node.swimlane;
    if (lane && swimlanes.includes(lane)) {
      if (!nodesBySwimlane.has(lane)) nodesBySwimlane.set(lane, []);
      nodesBySwimlane.get(lane)!.push(node);
    } else {
      noSwimlane.push(node);
    }
  }

  for (const node of noSwimlane) {
    lines.push(`  ${nodeShape(node)}`);
  }

  for (const [lane, nodes] of nodesBySwimlane) {
    lines.push(`  subgraph ${escapeLabel(lane)}`);
    for (const node of nodes) {
      lines.push(`    ${nodeShape(node)}`);
    }
    lines.push('  end');
  }

  for (const edge of definition.edges || []) {
    const from = edge.from || edge.source || '';
    const to = edge.to || edge.target || '';
    if (!from || !to) continue;

    const label = edge.condition || edge.label;
    if (label) {
      lines.push(`  ${from} -->|"${escapeLabel(label)}"| ${to}`);
    } else {
      lines.push(`  ${from} --> ${to}`);
    }
  }

  const slaNodes = definition.nodes.filter(n => n.slaHours);
  if (slaNodes.length > 0) {
    lines.push('');
    lines.push('  %% SLA annotations');
    for (const node of slaNodes) {
      lines.push(`  %% ${node.id}: SLA ${node.slaHours}h`);
    }
  }

  return lines.join('\n');
}

export async function generateStateTransitionDiagram(
  tenantId: string,
  moduleCode: string,
  entityType: string,
): Promise<string> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT definition FROM "${schema}".lifecycle_definitions
     WHERE module_code = $1 AND entity_type = $2
     ORDER BY version DESC LIMIT 1`,
    [moduleCode, entityType],
  );

  const row = getFirstRow(result);
  if (!row || !row.definition) {
    return `stateDiagram-v2\n  [*] --> no_definition : No lifecycle defined for ${moduleCode}.${entityType}`;
  }

  const def = typeof row.definition === 'string'
    ? JSON.parse(row.definition)
    : row.definition;

  const states: Array<{ code: string; label?: string }> = def.states || [];
  const transitions: Array<{ from: string; to: string; label?: string; action?: string }> = def.transitions || [];

  const lines: string[] = ['stateDiagram-v2'];

  const initialState = def.initialState || (states.length > 0 ? states[0].code : 'draft');
  lines.push(`  [*] --> ${initialState}`);

  for (const state of states) {
    if (state.label) {
      lines.push(`  ${state.code} : ${escapeLabel(state.label)}`);
    }
  }

  for (const t of transitions) {
    const label = t.label || t.action;
    if (label) {
      lines.push(`  ${t.from} --> ${t.to} : ${escapeLabel(label)}`);
    } else {
      lines.push(`  ${t.from} --> ${t.to}`);
    }
  }

  const terminalStates = def.terminalStates || [];
  for (const ts of terminalStates) {
    lines.push(`  ${ts} --> [*]`);
  }

  return lines.join('\n');
}

export function formatAsFlowchart(
  steps: Array<{ id: string; label: string; type?: string }>,
  transitions: Array<{ from: string; to: string; label?: string }>,
): string {
  const lines: string[] = ['graph TD'];

  for (const step of steps) {
    const node: DiagramNode = {
      id: step.id,
      type: step.type || 'task',
      label_en: step.label,
    };
    lines.push(`  ${nodeShape(node)}`);
  }

  for (const t of transitions) {
    if (t.label) {
      lines.push(`  ${t.from} -->|"${escapeLabel(t.label)}"| ${t.to}`);
    } else {
      lines.push(`  ${t.from} --> ${t.to}`);
    }
  }

  return lines.join('\n');
}

export function formatAsSequenceDiagram(
  approvals: Array<{
    approver_id: string;
    status: string;
    decision_comment?: string | null;
    escalation_chain?: string[];
    created_at: string;
    decided_at?: string | null;
  }>,
): string {
  if (!approvals || approvals.length === 0) {
    return 'sequenceDiagram\n  Note over System: No approvals recorded';
  }

  const lines: string[] = ['sequenceDiagram'];
  const participants = new Set<string>();
  participants.add('System');

  for (const a of approvals) {
    participants.add(a.approver_id);
    if (a.escalation_chain) {
      for (const e of a.escalation_chain) {
        participants.add(e);
      }
    }
  }

  for (const p of participants) {
    lines.push(`  participant ${escapeLabel(p)}`);
  }

  for (const a of approvals) {
    lines.push(`  System->>+${escapeLabel(a.approver_id)}: Request Approval`);

    if (a.status === 'escalated' && a.escalation_chain && a.escalation_chain.length > 0) {
      const target = a.escalation_chain[0];
      lines.push(`  ${escapeLabel(a.approver_id)}-->>System: Escalated`);
      lines.push(`  System->>+${escapeLabel(target)}: Escalated Approval`);
      lines.push(`  ${escapeLabel(target)}->>-System: Decision`);
    } else if (a.status === 'approved') {
      const comment = a.decision_comment ? ` (${escapeLabel(a.decision_comment.slice(0, 40))})` : '';
      lines.push(`  ${escapeLabel(a.approver_id)}->>-System: Approved${comment}`);
    } else if (a.status === 'rejected') {
      const comment = a.decision_comment ? ` (${escapeLabel(a.decision_comment.slice(0, 40))})` : '';
      lines.push(`  ${escapeLabel(a.approver_id)}->>-System: Rejected${comment}`);
    } else {
      lines.push(`  Note over ${escapeLabel(a.approver_id)}: Pending`);
    }
  }

  return lines.join('\n');
}
