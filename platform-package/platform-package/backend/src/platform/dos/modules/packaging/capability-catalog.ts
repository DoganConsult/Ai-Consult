export type CapabilityStatus = 'available' | 'partial' | 'planned' | 'not_started';
export type CapabilityOwner = 'platform' | 'product' | 'shared';

export interface CapabilityEntry {
  id: string;
  name: string;
  description: string;
  owner: CapabilityOwner;
  status: CapabilityStatus;
  modules: string[];
  contracts: string[];
  dependencies: string[];
}

export const PLATFORM_CAPABILITY_CATALOG: CapabilityEntry[] = [
  { id: 'cap.identity', name: 'Identity & Authentication', description: 'JWT-based authentication, MFA, SSO integration', owner: 'platform', status: 'available', modules: ['foundation'], contracts: ['platform.auth'], dependencies: [] },
  { id: 'cap.rbac', name: 'Role-Based Access Control', description: 'Permission families, role assignments, dynamic RBAC', owner: 'platform', status: 'available', modules: ['foundation', 'admin'], contracts: ['platform.rbac'], dependencies: ['cap.identity'] },
  { id: 'cap.fga', name: 'Fine-Grained Authorization', description: 'OpenFGA-based relationship authorization', owner: 'platform', status: 'available', modules: ['foundation'], contracts: ['platform.openfga'], dependencies: ['cap.identity'] },
  { id: 'cap.tenant', name: 'Multi-Tenant Isolation', description: 'Schema-per-tenant isolation with tenant guard', owner: 'platform', status: 'available', modules: ['foundation', 'admin'], contracts: [], dependencies: ['cap.identity'] },
  { id: 'cap.workflow', name: 'Workflow Engine', description: 'Step-based state machine with SLA, approvals, conditions', owner: 'platform', status: 'available', modules: ['workflow'], contracts: ['platform.workflow-engine'], dependencies: [] },
  { id: 'cap.event-bus', name: 'Event Bus', description: 'In-process pub/sub event bus with typed events', owner: 'platform', status: 'available', modules: ['platform'], contracts: ['platform.event-bus'], dependencies: [] },
  { id: 'cap.notification', name: 'Notification Service', description: 'Multi-channel notifications (email, in-app, push)', owner: 'platform', status: 'available', modules: ['notification'], contracts: ['platform.notification'], dependencies: ['cap.event-bus'] },
  { id: 'cap.audit-trail', name: 'Audit Trail', description: 'Immutable action logging for compliance', owner: 'platform', status: 'available', modules: ['foundation'], contracts: ['platform.audit-trail'], dependencies: [] },
  { id: 'cap.file-storage', name: 'File Storage', description: 'Azure Blob / local file storage abstraction', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
  { id: 'cap.rule-engine', name: 'Rule Engine', description: 'Generic condition-action rule evaluation', owner: 'platform', status: 'available', modules: ['platform'], contracts: ['platform.rule-engine'], dependencies: ['cap.event-bus'] },
  { id: 'cap.task-inbox', name: 'Unified Task/Inbox', description: 'Cross-module task resolution API', owner: 'platform', status: 'planned', modules: ['inbox', 'workflow'], contracts: [], dependencies: ['cap.workflow'] },
  { id: 'cap.graph', name: 'Graph Relationships', description: 'Apache AGE entity relationship graph', owner: 'platform', status: 'available', modules: ['platform'], contracts: ['platform.graph-backend'], dependencies: [] },
  { id: 'cap.search', name: 'Search & Knowledge', description: 'Vector search and knowledge indexing', owner: 'platform', status: 'partial', modules: ['platform'], contracts: [], dependencies: [] },
  { id: 'cap.ai-gateway', name: 'AI Gateway', description: 'Multi-provider LLM routing with agent profiles', owner: 'platform', status: 'available', modules: ['ai'], contracts: [], dependencies: [] },
  { id: 'cap.queue', name: 'Message Queue', description: 'PGMQ-based durable message queue', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
  { id: 'cap.scheduler', name: 'Job Scheduler', description: 'Cron-based job scheduling with Temporal fallback', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
  { id: 'cap.contract-registry', name: 'Contract Registry', description: 'Versioned contract definitions between modules', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
  { id: 'cap.feature-flags', name: 'Feature Flags', description: 'Product and tenant-level feature toggles', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
  { id: 'cap.secrets', name: 'Secrets Management', description: 'Azure KeyVault integration for secret storage', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
  { id: 'cap.openapi', name: 'OpenAPI Documentation', description: 'Auto-generated OpenAPI 3.0 spec from JSDoc', owner: 'platform', status: 'available', modules: ['platform'], contracts: [], dependencies: [] },
  { id: 'cap.visual-workflow', name: 'Visual Workflow Builder', description: 'Drag-and-drop workflow/form designer', owner: 'platform', status: 'planned', modules: ['workflow'], contracts: [], dependencies: ['cap.workflow'] },
  { id: 'cap.billing', name: 'Subscription & Billing', description: 'Subscription lifecycle, entitlements, usage metering', owner: 'platform', status: 'partial', modules: ['admin'], contracts: [], dependencies: ['cap.tenant'] },
];

export function getCapability(id: string): CapabilityEntry | undefined {
  return PLATFORM_CAPABILITY_CATALOG.find(c => c.id === id);
}

export function getCapabilitiesByStatus(status: CapabilityStatus): CapabilityEntry[] {
  return PLATFORM_CAPABILITY_CATALOG.filter(c => c.status === status);
}

export function getCapabilitiesByOwner(owner: CapabilityOwner): CapabilityEntry[] {
  return PLATFORM_CAPABILITY_CATALOG.filter(c => c.owner === owner);
}

export function validateCapabilityCatalog(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const cap of PLATFORM_CAPABILITY_CATALOG) {
    if (ids.has(cap.id)) errors.push(`Duplicate capability ID: ${cap.id}`);
    ids.add(cap.id);
    for (const dep of cap.dependencies) {
      if (!PLATFORM_CAPABILITY_CATALOG.find(c => c.id === dep)) {
        errors.push(`Capability '${cap.id}' depends on unknown capability '${dep}'`);
      }
    }
  }
  return errors;
}

/**
 * Resolve the full transitive dependency graph for a list of capability IDs.
 * Returns capabilities in topological order (dependencies before dependents).
 */
export function resolveCapabilityDAG(capabilityIds: string[]): CapabilityEntry[] {
  const resolved = new Map<string, CapabilityEntry>();
  const visiting = new Set<string>();

  function visit(id: string): void {
    if (resolved.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(`[CapabilityDAG] Circular dependency detected at capability: ${id}`);
    }
    visiting.add(id);
    const cap = PLATFORM_CAPABILITY_CATALOG.find(c => c.id === id);
    if (!cap) {
      throw new Error(`[CapabilityDAG] Unknown capability: ${id}`);
    }
    for (const dep of cap.dependencies) {
      visit(dep);
    }
    visiting.delete(id);
    resolved.set(id, cap);
  }

  for (const id of capabilityIds) {
    visit(id);
  }

  return Array.from(resolved.values());
}

/**
 * Validate that all required capabilities for a set of module codes are
 * in 'available' or 'partial' status. Throws with details if any are missing.
 */
export function validateCapabilityReadiness(moduleCodes: string[]): void {
  const required = PLATFORM_CAPABILITY_CATALOG.filter(c =>
    c.modules.some(m => moduleCodes.includes(m))
  );

  const notReady = required.filter(c => c.status === 'not_started');
  if (notReady.length > 0) {
    const list = notReady.map(c => `${c.id} (${c.name})`).join(', ');
    throw new Error(`[CapabilityReadiness] The following required capabilities are not started: ${list}`);
  }

  const broken = required.filter(c => c.dependencies.some(dep => {
    const depCap = PLATFORM_CAPABILITY_CATALOG.find(x => x.id === dep);
    return depCap?.status === 'not_started';
  }));
  if (broken.length > 0) {
    const list = broken.map(c => `${c.id} depends on unready: ${c.dependencies.join(', ')}`).join('; ');
    throw new Error(`[CapabilityReadiness] Capability dependency gap: ${list}`);
  }
}

