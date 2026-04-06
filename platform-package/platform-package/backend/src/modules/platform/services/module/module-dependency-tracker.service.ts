// @ts-nocheck
// ============================================
// Platform — Module Dependency Tracker
// Tracks and visualizes dependencies between modules for visibility and analysis
// ============================================

import {
  getAllModules,
  getAllContracts,
  _getModuleService,
} from './module-service-registry.service';

/**
 * Represents a dependency relationship between modules
 */
export interface ModuleDependency {
  fromModule: string;
  toModule: string;
  type: 'declared' | 'runtime' | 'both';
  source: string; // e.g., "metadata.dependencies" or "runtime call"
  firstSeen: Date;
  lastSeen: Date;
  callCount?: number; // For runtime dependencies
}

/**
 * Dependency graph node representing a module
 */
export interface DependencyGraphNode {
  moduleCode: string;
  dependencies: string[]; // Modules this module depends on
  dependents: string[]; // Modules that depend on this module
  declaredDependencies: string[];
  runtimeDependencies: string[];
}

/**
 * Complete dependency graph
 */
export interface DependencyGraph {
  nodes: Map<string, DependencyGraphNode>;
  edges: ModuleDependency[];
  circularDependencies: string[][]; // Array of circular dependency chains
  isolatedModules: string[]; // Modules with no dependencies or dependents
}

/**
 * Dependency analysis result
 */
export interface DependencyAnalysis {
  graph: DependencyGraph;
  totalModules: number;
  totalDependencies: number;
  circularCount: number;
  isolatedCount: number;
  timestamp: Date;
}

/**
 * Tracker for module dependencies
 */
class ModuleDependencyTracker {
  private declaredDependencies: Map<string, Set<string>> = new Map(); // module -> Set of dependent modules
  private runtimeDependencies: Map<string, Map<string, number>> = new Map(); // module -> Map<targetModule, callCount>
  private dependencyHistory: ModuleDependency[] = [];

  /**
   * Record a declared dependency (from service contract metadata)
   */
  recordDeclaredDependency(fromModule: string, toModule: string, source: string = 'metadata.dependencies'): void {
    if (fromModule === toModule) {
      return; // Skip self-dependencies
    }

    if (!this.declaredDependencies.has(fromModule)) {
      this.declaredDependencies.set(fromModule, new Set());
    }
    this.declaredDependencies.get(fromModule)!.add(toModule);

    // Record in history
    const existing = this.dependencyHistory.find(
      (d) => d.fromModule === fromModule && d.toModule === toModule && d.type === 'declared'
    );

    if (existing) {
      existing.lastSeen = new Date();
      existing.type = existing.type === 'runtime' ? 'both' : 'declared';
    } else {
      this.dependencyHistory.push({
        fromModule,
        toModule,
        type: 'declared',
        source,
        firstSeen: new Date(),
        lastSeen: new Date(),
      });
    }
  }

  /**
   * Record a runtime dependency (from actual service calls)
   */
  recordRuntimeDependency(fromModule: string, toModule: string, source: string = 'runtime call'): void {
    if (fromModule === toModule) {
      return; // Skip self-dependencies
    }

    if (!this.runtimeDependencies.has(fromModule)) {
      this.runtimeDependencies.set(fromModule, new Map());
    }
    const deps = this.runtimeDependencies.get(fromModule)!;
    deps.set(toModule, (deps.get(toModule) || 0) + 1);

    // Record in history
    const existing = this.dependencyHistory.find(
      (d) => d.fromModule === fromModule && d.toModule === toModule && d.type === 'runtime'
    );

    if (existing) {
      existing.lastSeen = new Date();
      existing.callCount = (existing.callCount || 0) + 1;
      existing.type = existing.type === 'declared' ? 'both' : 'runtime';
    } else {
      this.dependencyHistory.push({
        fromModule,
        toModule,
        type: 'runtime',
        source,
        firstSeen: new Date(),
        lastSeen: new Date(),
        callCount: 1,
      });
    }
  }

  /**
   * Build dependency graph from current state
   */
  buildDependencyGraph(): DependencyGraph {
    const nodes = new Map<string, DependencyGraphNode>();
    const edges: ModuleDependency[] = [];
    const allModules = getAllModules();

    // Initialize nodes for all modules
    for (const moduleCode of allModules) {
      nodes.set(moduleCode, {
        moduleCode,
        dependencies: [],
        dependents: [],
        declaredDependencies: [],
        runtimeDependencies: [],
      });
    }

    // Process declared dependencies
    for (const [fromModule, toModules] of this.declaredDependencies.entries()) {
      const node = nodes.get(fromModule);
      if (node) {
        for (const toModule of toModules) {
          node.declaredDependencies.push(toModule);
          node.dependencies.push(toModule);
          
          const toNode = nodes.get(toModule);
          if (toNode) {
            toNode.dependents.push(fromModule);
          }

          // Add edge
          const edge = this.dependencyHistory.find(
            (d) => d.fromModule === fromModule && d.toModule === toModule && (d.type === 'declared' || d.type === 'both')
          );
          if (edge) {
            edges.push(edge);
          }
        }
      }
    }

    // Process runtime dependencies
    for (const [fromModule, toModules] of this.runtimeDependencies.entries()) {
      const node = nodes.get(fromModule);
      if (node) {
        for (const [toModule, callCount] of toModules.entries()) {
          if (!node.runtimeDependencies.includes(toModule)) {
            node.runtimeDependencies.push(toModule);
          }
          if (!node.dependencies.includes(toModule)) {
            node.dependencies.push(toModule);
          }

          const toNode = nodes.get(toModule);
          if (toNode && !toNode.dependents.includes(fromModule)) {
            toNode.dependents.push(fromModule);
          }

          // Add or update edge
          const existingEdge = edges.find((e) => e.fromModule === fromModule && e.toModule === toModule);
          if (existingEdge) {
            existingEdge.type = 'both';
            existingEdge.callCount = callCount;
          } else {
            const edge = this.dependencyHistory.find(
              (d) => d.fromModule === fromModule && d.toModule === toModule && d.type === 'runtime'
            );
            if (edge) {
              edges.push(edge);
            }
          }
        }
      }
    }

    // Remove duplicates from dependencies/dependents arrays
    for (const node of nodes.values()) {
      node.dependencies = Array.from(new Set(node.dependencies));
      node.dependents = Array.from(new Set(node.dependents));
      node.declaredDependencies = Array.from(new Set(node.declaredDependencies));
      node.runtimeDependencies = Array.from(new Set(node.runtimeDependencies));
    }

    // Detect circular dependencies
    const circularDependencies = this.detectCircularDependencies(nodes);

    // Find isolated modules (no dependencies and no dependents)
    const isolatedModules = Array.from(nodes.values())
      .filter((node) => node.dependencies.length === 0 && node.dependents.length === 0)
      .map((node) => node.moduleCode);

    return {
      nodes,
      edges,
      circularDependencies,
      isolatedModules,
    };
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCircularDependencies(nodes: Map<string, DependencyGraphNode>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (moduleCode: string): void => {
      visited.add(moduleCode);
      recursionStack.add(moduleCode);
      path.push(moduleCode);

      const node = nodes.get(moduleCode);
      if (node) {
        for (const dep of node.dependencies) {
          if (!visited.has(dep)) {
            dfs(dep);
          } else if (recursionStack.has(dep)) {
            // Found a cycle
            const cycleStart = path.indexOf(dep);
            const cycle = path.slice(cycleStart).concat([dep]);
            cycles.push(cycle);
          }
        }
      }

      recursionStack.delete(moduleCode);
      path.pop();
    };

    for (const moduleCode of nodes.keys()) {
      if (!visited.has(moduleCode)) {
        dfs(moduleCode);
      }
    }

    return cycles;
  }

  /**
   * Get dependencies for a specific module
   */
  getModuleDependencies(moduleCode: string): DependencyGraphNode | null {
    const graph = this.buildDependencyGraph();
    return graph.nodes.get(moduleCode) || null;
  }

  /**
   * Get all modules that depend on a given module
   */
  getDependents(moduleCode: string): string[] {
    const graph = this.buildDependencyGraph();
    const node = graph.nodes.get(moduleCode);
    return node ? node.dependents : [];
  }

  /**
   * Get all modules that a given module depends on
   */
  getDependencies(moduleCode: string): string[] {
    const graph = this.buildDependencyGraph();
    const node = graph.nodes.get(moduleCode);
    return node ? node.dependencies : [];
  }

  /**
   * Perform full dependency analysis
   */
  analyzeDependencies(): DependencyAnalysis {
    const graph = this.buildDependencyGraph();
    
    return {
      graph,
      totalModules: graph.nodes.size,
      totalDependencies: graph.edges.length,
      circularCount: graph.circularDependencies.length,
      isolatedCount: graph.isolatedModules.length,
      timestamp: new Date(),
    };
  }

  /**
   * Load declared dependencies from service registry
   */
  loadDeclaredDependencies(): void {
    const contracts = getAllContracts();
    
    for (const contract of contracts) {
      const dependencies = contract.metadata?.dependencies || [];
      for (const dep of dependencies) {
        this.recordDeclaredDependency(contract.moduleCode, dep, 'service.contract.metadata');
      }
    }
  }

  /**
   * Clear all tracked dependencies (useful for testing)
   */
  clear(): void {
    this.declaredDependencies.clear();
    this.runtimeDependencies.clear();
    this.dependencyHistory = [];
  }

  /**
   * Get dependency history
   */
  getDependencyHistory(): ModuleDependency[] {
    return [...this.dependencyHistory];
  }
}

// Singleton instance
export const moduleDependencyTracker = new ModuleDependencyTracker();

/**
 * Initialize dependency tracker by loading declared dependencies from registry
 */
export function initializeDependencyTracker(): void {
  moduleDependencyTracker.loadDeclaredDependencies();
}

/**
 * Get dependency graph (convenience function)
 */
export function getDependencyGraph(): DependencyGraph {
  return moduleDependencyTracker.buildDependencyGraph();
}

/**
 * Get dependencies for a module (convenience function)
 */
export function getModuleDependencies(moduleCode: string): DependencyGraphNode | null {
  return moduleDependencyTracker.getModuleDependencies(moduleCode);
}

/**
 * Get dependents for a module (convenience function)
 */
export function getDependents(moduleCode: string): string[] {
  return moduleDependencyTracker.getDependents(moduleCode);
}

/**
 * Record runtime dependency (convenience function)
 * Call this from the service proxy when making cross-module calls
 */
export function recordRuntimeDependency(fromModule: string, toModule: string, source?: string): void {
  moduleDependencyTracker.recordRuntimeDependency(fromModule, toModule, source);
}

/**
 * Analyze dependencies (convenience function)
 */
export function analyzeDependencies(): DependencyAnalysis {
  return moduleDependencyTracker.analyzeDependencies();
}
