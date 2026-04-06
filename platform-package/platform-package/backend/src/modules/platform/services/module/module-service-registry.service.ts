import { logger } from '../../../../utils/logger';
// ============================================
// Platform — Module Service Registry
// Service discovery and health checks for cross-module integration
// ============================================

import { resolveByCode } from '../../../../platform/dos/modules/lifecycle/module-workflow-registry.service';

/**
 * Contract defining a module service's capabilities
 */
export interface ModuleServiceContract {
  moduleCode: string;
  serviceName: string; // e.g., "risk", "compliance"
  availableFunctions: string[]; // e.g., ["getRisks", "createRisk", "updateRisk"]
  healthCheck: () => Promise<boolean>;
  serviceInstance: unknown; // Optional, for direct access
  metadata?: {
    version?: string;
    description?: string;
    dependencies?: string[]; // Other module codes this service depends on
  };
}

/**
 * Registry of all module services
 */
class ModuleServiceRegistry {
  private contracts: Map<string, ModuleServiceContract> = new Map();
  private healthCache: Map<string, { isHealthy: boolean; lastChecked: Date }> = new Map();
  private healthCacheTTL = 60000; // 1 minute cache

  /**
   * Register a module service
   */
  register(contract: ModuleServiceContract): void {
    if (!contract.moduleCode || !contract.serviceName) {
      throw new Error('ModuleServiceContract must have moduleCode and serviceName');
    }

    const key = this.getKey(contract.moduleCode, contract.serviceName);
    this.contracts.set(key, contract);
    
    // Clear health cache when service is registered
    this.healthCache.delete(key);
  }

  /**
   * Get a service contract by module code and service name
   */
  get(moduleCode: string, serviceName?: string): ModuleServiceContract | null {
    const key = this.getKey(moduleCode, serviceName || moduleCode);
    return this.contracts.get(key) || null;
  }

  /**
   * Get all available functions for a module
   */
  getAvailableFunctions(moduleCode: string, serviceName?: string): string[] {
    const contract = this.get(moduleCode, serviceName);
    return contract?.availableFunctions || [];
  }

  /**
   * Check if a module service is available
   */
  async isModuleServiceAvailable(moduleCode: string, serviceName?: string): Promise<boolean> {
    const key = this.getKey(moduleCode, serviceName || moduleCode);
    const contract = this.contracts.get(key);
    
    if (!contract) {
      return false;
    }

    // Check cache first
    const cached = this.healthCache.get(key);
    if (cached && (Date.now() - cached.lastChecked.getTime()) < this.healthCacheTTL) {
      return cached.isHealthy;
    }

    // Perform health check
    try {
      const isHealthy = await contract.healthCheck();
      this.healthCache.set(key, { isHealthy, lastChecked: new Date() });
      return isHealthy;
    } catch (error) {
      this.healthCache.set(key, { isHealthy: false, lastChecked: new Date() });
      return false;
    }
  }

  /**
   * Get all registered services for a module
   */
  getModuleServices(moduleCode: string): ModuleServiceContract[] {
    const services: ModuleServiceContract[] = [];
    for (const contract of this.contracts.values()) {
      if (contract.moduleCode === moduleCode) {
        services.push(contract);
      }
    }
    return services;
  }

  /**
   * Get all registered modules
   */
  getAllModules(): string[] {
    const modules = new Set<string>();
    for (const contract of this.contracts.values()) {
      modules.add(contract.moduleCode);
    }
    return Array.from(modules);
  }

  /**
   * Get all registered contracts
   */
  getAllContracts(): ModuleServiceContract[] {
    return Array.from(this.contracts.values());
  }

  /**
   * Clear health cache (useful for testing or forced refresh)
   */
  clearHealthCache(moduleCode?: string): void {
    if (moduleCode) {
      const key = this.getKey(moduleCode, moduleCode);
      this.healthCache.delete(key);
    } else {
      this.healthCache.clear();
    }
  }

  /**
   * Generate registry key
   */
  private getKey(moduleCode: string, serviceName: string): string {
    return `${moduleCode}:${serviceName}`;
  }
}

// Singleton instance
export const moduleServiceRegistry = new ModuleServiceRegistry();

/**
 * Auto-register services by scanning service files
 * This is called at startup to discover available services
 */
export async function autoRegisterModuleServices(): Promise<void> {
  // Module service paths — resolved dynamically at runtime.
  // Some modules may not exist yet; try/catch below handles missing modules gracefully.
  const serviceModulePaths: Record<string, string> = {
    risk:            '../../risk/services/risk.service',
    compliance:      '../../compliance/services/compliance/compliance.service',
    evidence:        '../../evidence/services/core/evidence.service',
    assessment:      './assessment.service',
    governance:      '../../governance/services/governance/governance.service',
    incident:        '../../incident/services/incident/incident.service',
    vendor:          '../../vendor/services/vendor/vendor.service',
    audit:           '../../audit/services/audit/core/audit-trail.service',
    reporting:       '../../reporting/services/report/report.service',
    workflow:        '../../workflow/services/core/workflow.service',
    foundation:      './mapping.service',
    policy:          '../../policy/services/policy-lifecycle.service',
    bcp:             '../../bcp/services/bcp.service',
    training:        '../../training/services/training-advanced.service',
    exception:       '../../exception/services/exception.service',
    asset:           '../../asset/services/asset-registry.service',
    remediation:     '../../remediation/services/remediation.service',
    action:          '../../action/services/action-item.service',
    notification:    '../../notification/services/notification.service',
    analytics:       '../../analytics/services/analytics/analytics.service',
    admin:           '../../admin/services/admin.service',
    team:            '../../team/services/team.service',
    qiyas:           '../../qiyas/services/qiyas-benchmark.service',
    'ai-governance': '../../ai-governance/ai-governance.service',
    ai:              '../../ai/services/ai-agent.service',
    integrations:    '../../integrations/services/connector.service',
    issues:          '../../issues/services/issues.service',
    inbox:           '../../inbox/services/inbox.service',
    portals:         '../../portals/services/portals.service',
    records:         '../../records/services/records.service',
    privacy:         '../../privacy/services/misc/privacy.service',
  };
  const serviceModules: Record<string, () => Promise<unknown>> = {};
  for (const [code, path] of Object.entries(serviceModulePaths)) {
    serviceModules[code] = () => import(path);
  }

  const resolved: Record<string, any> = {};
  for (const [moduleCode, importFn] of Object.entries(serviceModules)) {
    try {
      resolved[moduleCode] = await importFn();
    } catch (err: unknown) {
      logger.warn(`Failed to import service for module ${moduleCode}:`, err);
    }
  }

  for (const [moduleCode, serviceModule] of Object.entries(resolved)) {
    try {
      const functionNames = Object.keys(serviceModule).filter(
        (key) => typeof serviceModule[key] === 'function' && key !== 'default'
      );

      const healthCheck = async (): Promise<boolean> => {
        try {
          const descriptor = resolveByCode(moduleCode);
          return descriptor !== null;
        } catch {
          return true;
        }
      };

      moduleServiceRegistry.register({
        moduleCode,
        serviceName: moduleCode,
        availableFunctions: functionNames,
        healthCheck,
        serviceInstance: serviceModule,
        metadata: {
          description: `Service functions for ${moduleCode} module`,
        },
      });
    } catch (error) {
      logger.warn(`Failed to auto-register service for module ${moduleCode}:`, error);
    }
  }
}

/**
 * Manual registration helper for services that need custom health checks
 */
export function registerModuleService(contract: ModuleServiceContract): void {
  moduleServiceRegistry.register(contract);
}

/**
 * Get module service (convenience function)
 */
export function getModuleService(moduleCode: string, serviceName?: string): ModuleServiceContract | null {
  return moduleServiceRegistry.get(moduleCode, serviceName);
}

/**
 * Check if module service is available (convenience function)
 */
export async function isModuleServiceAvailable(moduleCode: string, serviceName?: string): Promise<boolean> {
  return moduleServiceRegistry.isModuleServiceAvailable(moduleCode, serviceName);
}

/**
 * Get available functions for a module (convenience function)
 */
export function getAvailableFunctions(moduleCode: string, serviceName?: string): string[] {
  return moduleServiceRegistry.getAvailableFunctions(moduleCode, serviceName);
}

export function getAllModules(): string[] {
  return moduleServiceRegistry.getAllModules();
}

export function getAllContracts(): ModuleServiceContract[] {
  return moduleServiceRegistry.getAllContracts();
}

export function getModuleServices(moduleCode: string): ModuleServiceContract[] {
  return moduleServiceRegistry.getModuleServices(moduleCode);
}
