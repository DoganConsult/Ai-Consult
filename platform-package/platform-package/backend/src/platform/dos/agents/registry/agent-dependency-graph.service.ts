import { getAllAgentDefinitions, getAgentDefinition } from './agent-registry.service';

export interface AgentDependencyNode {
  agentCode: string;
  name: string;
  predecessors: string[];
  successors: string[];
  depth: number;
}

export interface AgentDependencyGraph {
  nodes: AgentDependencyNode[];
  edges: Array<{ from: string; to: string }>;
  executionWaves: string[][];
}

export function buildDependencyGraph(): AgentDependencyGraph {
  const defs = getAllAgentDefinitions();
  const nodes: AgentDependencyNode[] = [];
  const edges: Array<{ from: string; to: string }> = [];
  const depthMap = new Map<string, number>();

  function resolveDepth(code: string, visited: Set<string>): number {
    if (depthMap.has(code)) return depthMap.get(code)!;
    if (visited.has(code)) return 0;
    visited.add(code);
    const def = getAgentDefinition(code);
    const preds = def?.dependencies?.predecessors ?? [];
    const depth = preds.length === 0
      ? 0
      : Math.max(...preds.map(p => resolveDepth(p, visited))) + 1;
    depthMap.set(code, depth);
    return depth;
  }

  for (const def of defs) {
    resolveDepth(def.agentCode, new Set());
  }

  for (const def of defs) {
    const preds = def.dependencies?.predecessors ?? [];
    const succs = def.dependencies?.successors ?? [];
    nodes.push({
      agentCode: def.agentCode,
      name: def.name,
      predecessors: preds,
      successors: succs,
      depth: depthMap.get(def.agentCode) ?? 0,
    });
    for (const s of succs) {
      edges.push({ from: def.agentCode, to: s });
    }
  }

  const maxDepth = Math.max(0, ...nodes.map(n => n.depth));
  const executionWaves: string[][] = [];
  for (let d = 0; d <= maxDepth; d++) {
    executionWaves.push(nodes.filter(n => n.depth === d).map(n => n.agentCode));
  }

  return { nodes, edges, executionWaves };
}

export function getAgentPredecessors(agentCode: string): string[] {
  const def = getAgentDefinition(agentCode);
  return def?.dependencies?.predecessors ?? [];
}

export function getAgentSuccessors(agentCode: string): string[] {
  const def = getAgentDefinition(agentCode);
  return def?.dependencies?.successors ?? [];
}

export function canExecuteAgent(agentCode: string, completedAgents: Set<string>): boolean {
  const preds = getAgentPredecessors(agentCode);
  return preds.every(p => completedAgents.has(p));
}
