import { registerAgent, getAgentDefinition, validateAgentDefinition } from './agent-registry.service';
import type { AgentDefinition } from '../contracts/agent.types';

export interface ModuleAgentManifest {
  moduleCode: string;
  agents: AgentDefinition[];
}

const _moduleManifests = new Map<string, ModuleAgentManifest>();

export function registerModuleAgentManifest(manifest: ModuleAgentManifest): void {
  if (_moduleManifests.has(manifest.moduleCode)) {
    throw new Error(`Module '${manifest.moduleCode}' agent manifest already registered`);
  }

  for (const agentDef of manifest.agents) {
    const validationErrors = validateAgentDefinition(agentDef);
    if (validationErrors.length > 0) {
      throw new Error(`Agent '${agentDef.agentCode}' in module '${manifest.moduleCode}' failed validation: ${validationErrors.join('; ')}`);
    }
    if (agentDef.ownerLayer !== 'module') {
      throw new Error(`Agent '${agentDef.agentCode}' in module '${manifest.moduleCode}' must have ownerLayer='module'`);
    }
    if (agentDef.ownerCode !== manifest.moduleCode) {
      throw new Error(`Agent '${agentDef.agentCode}' ownerCode must match module '${manifest.moduleCode}'`);
    }
    if (!getAgentDefinition(agentDef.agentCode)) {
      registerAgent(agentDef);
    }
  }

  _moduleManifests.set(manifest.moduleCode, manifest);
}

export function getModuleManifest(moduleCode: string): ModuleAgentManifest | undefined {
  return _moduleManifests.get(moduleCode);
}

export function getAllModuleManifests(): ModuleAgentManifest[] {
  return Array.from(_moduleManifests.values());
}

export function resetModuleManifests(): void {
  _moduleManifests.clear();
}

export const moduleAgentManifestService = {
  registerModuleAgentManifest,
  getModuleManifest,
  getAllModuleManifests,
  resetModuleManifests,
};
