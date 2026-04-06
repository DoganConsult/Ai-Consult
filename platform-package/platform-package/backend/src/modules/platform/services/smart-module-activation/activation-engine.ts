// @ts-nocheck
/**
 * Smart Module Activation — Activation Engine
 *
 * Core orchestration logic: evaluates organizational context against
 * activation rules, resolves dependencies, and enforces GRC process
 * requirements for every activated module.
 */

import { tenantSchema } from '../../../../config/database/database';
import { recordAudit } from '../../../audit/services/audit/audit-trail.service';
import type { ModuleActivationRule } from './types';
import { MODULE_ACTIVATION_RULES } from './activation-rules';
import { activateModule, deactivateModule, getModuleActivationStatus } from './module-db-operations';
import { ensureWorkflowExists, ensureRoleExists, ensureDashboardExists } from './grc-process-enforcement';
/** Stub: org hierarchy tree for activation analysis */
interface OrgHierarchyNode { type: string; children?: OrgHierarchyNode[]; [key: string]: unknown; }
async function getOrgHierarchyTree(_tenantId: string, _flat?: boolean): Promise<OrgHierarchyNode[]> { return []; }

async function resolveActivationRules(_tenantId: string): Promise<ModuleActivationRule[]> {
  // Static rules are the canonical source for module activation conditions.
  // DB-backed rules may be added in the future with a dedicated table.
  return MODULE_ACTIVATION_RULES;
}

/**
 * Smart module activation based on organizational structure and GRC requirements
 */
export async function activateModulesSmartly(
  tenantId: string,
  userId: string,
  options?: {
    regulatoryProfile?: Array<{ code: string; confidence: number }>;
    organizationSize?: 'small' | 'medium' | 'enterprise';
    dataTypes?: string[];
  }
): Promise<{
  activated: string[];
  deactivated: string[];
  dependenciesResolved: string[];
  grcProcessesEnforced: Array<{
    module: string;
    workflows: string[];
    roles: string[];
    dashboards: string[];
  }>;
}> {
  const __schema = tenantSchema(tenantId);

  // Step 1: Analyze organizational structure
  const hierarchy = await getOrgHierarchyTree(tenantId, false);
  const activeDepartments = hierarchy
    .flatMap(org => org.children || [])
    .flatMap(div => div.children || [])
    .filter(dept => dept.type === 'department' && (dept as any).status === 'active')
    .map(dept => (dept as any).code?.toUpperCase() || '');

  const activeTeams = hierarchy
    .flatMap(org => org.children || [])
    .flatMap(div => div.children || [])
    .flatMap(dept => dept.children || [])
    .filter(team => team.type === 'team' && (team as any).active === true)
    .map(team => (team as any).team_code?.toUpperCase() || '');

  // Step 2: Get regulatory profile if available
  const regulatoryCodes = options?.regulatoryProfile?.map(r => r.code) || [];
  const orgSize = options?.organizationSize || inferOrganizationSize(hierarchy);
  const dataTypes = options?.dataTypes || [];

  // Step 3: Evaluate each module's activation conditions
  const modulesToActivate: string[] = [];
  const modulesToDeactivate: string[] = [];
  const dependencyGraph = new Map<string, string[]>();

  const activationRules = await resolveActivationRules(tenantId);

  for (const rule of activationRules.sort((a, b) => a.priority - b.priority)) {
    const shouldActivate = evaluateActivationConditions(rule, {
      activeDepartments,
      activeTeams,
      regulatoryCodes,
      orgSize,
      dataTypes,
      alreadyActivated: modulesToActivate,
    });

    if (shouldActivate && rule.autoEnable) {
      // Check dependencies first
      if (rule.activationConditions.dependencies) {
        const allDepsMet = rule.activationConditions.dependencies.every(
          dep => modulesToActivate.includes(dep) || dep === 'foundation'
        );
        if (!allDepsMet) {
          // Activate dependencies first
          for (const dep of rule.activationConditions.dependencies) {
            if (!modulesToActivate.includes(dep) && dep !== 'foundation') {
              const depRule = activationRules.find(r => r.moduleCode === dep);
              if (depRule && depRule.autoEnable) {
                modulesToActivate.push(dep);
              }
            }
          }
        }
      }

      modulesToActivate.push(rule.moduleCode);
      dependencyGraph.set(rule.moduleCode, rule.activationConditions.dependencies || []);
    } else if (!shouldActivate) {
      // Check if module should be deactivated (no longer meets conditions)
      const currentStatus = await getModuleActivationStatus(tenantId, rule.moduleCode);
      if (currentStatus && rule.autoEnable) {
        modulesToDeactivate.push(rule.moduleCode);
      }
    }
  }

  // Step 4: Activate modules in dependency order
  const activatedModules: string[] = [];
  const dependenciesResolved: string[] = [];

  // Foundation always first
  if (modulesToActivate.includes('foundation')) {
    await activateModule(tenantId, userId, 'foundation');
    activatedModules.push('foundation');
  }

  // Then activate others in priority order
  for (const moduleCode of modulesToActivate) {
    if (moduleCode === 'foundation') continue;

    const rule = activationRules.find(r => r.moduleCode === moduleCode);
    if (!rule) continue;

    // Ensure dependencies are activated first
    if (rule.activationConditions.dependencies) {
      for (const dep of rule.activationConditions.dependencies) {
        if (!activatedModules.includes(dep) && modulesToActivate.includes(dep)) {
          await activateModule(tenantId, userId, dep);
          activatedModules.push(dep);
          dependenciesResolved.push(`${moduleCode} → ${dep}`);
        }
      }
    }

    await activateModule(tenantId, userId, moduleCode);
    activatedModules.push(moduleCode);
  }

  // Step 5: Deactivate modules that no longer meet conditions
  for (const moduleCode of modulesToDeactivate) {
    await deactivateModule(tenantId, userId, moduleCode);
  }

  // Step 6: Enforce GRC process requirements for all active modules
  const grcProcessesEnforced: Array<{
    module: string;
    workflows: string[];
    roles: string[];
    dashboards: string[];
  }> = [];

  for (const moduleCode of activatedModules) {
    const rule = activationRules.find(r => r.moduleCode === moduleCode);
    if (!rule) continue;

    // Ensure mandatory workflows exist
    for (const workflowCode of rule.grcProcessRequirements.mandatoryWorkflows) {
      await ensureWorkflowExists(tenantId, userId, workflowCode);
    }

    // Ensure mandatory roles exist
    for (const roleCode of rule.grcProcessRequirements.mandatoryRoles) {
      await ensureRoleExists(tenantId, userId, roleCode);
    }

    // Ensure mandatory dashboards exist
    for (const dashboardCode of rule.grcProcessRequirements.mandatoryDashboards) {
      await ensureDashboardExists(tenantId, userId, dashboardCode, moduleCode);
    }

    grcProcessesEnforced.push({
      module: moduleCode,
      workflows: rule.grcProcessRequirements.mandatoryWorkflows,
      roles: rule.grcProcessRequirements.mandatoryRoles,
      dashboards: rule.grcProcessRequirements.mandatoryDashboards,
    });
  }

  // Log audit
  await recordAudit({
    tenantId,
    userId,
    module: 'foundation',
    action: 'smart_module_activation',
    entityType: 'module',
    entityId: tenantId,
    afterState: {
      activated: activatedModules,
      deactivated: modulesToDeactivate,
      dependenciesResolved,
      grcProcessesEnforced: grcProcessesEnforced.length,
    },
  });

  return {
    activated: activatedModules,
    deactivated: modulesToDeactivate,
    dependenciesResolved,
    grcProcessesEnforced,
  };
}

/**
 * Evaluates if a module's activation conditions are met
 */
export function evaluateActivationConditions(
  rule: ModuleActivationRule,
  context: {
    activeDepartments: string[];
    activeTeams: string[];
    regulatoryCodes: string[];
    orgSize?: 'small' | 'medium' | 'enterprise';
    dataTypes: string[];
    alreadyActivated: string[];
  }
): boolean {
  const conditions = rule.activationConditions;

  // Check department requirements
  if (conditions.requiredDepartments && conditions.requiredDepartments.length > 0) {
    const hasRequiredDept = conditions.requiredDepartments.some(dept =>
      context.activeDepartments.some(active => active.includes(dept))
    );
    if (!hasRequiredDept) return false;
  }

  // Check team requirements
  if (conditions.requiredTeams && conditions.requiredTeams.length > 0) {
    const hasRequiredTeam = conditions.requiredTeams.some(team =>
      context.activeTeams.some(active => active.includes(team))
    );
    if (!hasRequiredTeam) return false;
  }

  // Check organization size
  if (conditions.organizationSize && context.orgSize !== conditions.organizationSize) {
    return false;
  }

  // Check regulatory requirements
  if (conditions.regulatoryRequirements && conditions.regulatoryRequirements.length > 0) {
    const hasRegulatory = conditions.regulatoryRequirements.some(reg =>
      context.regulatoryCodes.includes(reg)
    );
    if (!hasRegulatory) return false;
  }

  // Check data types
  if (conditions.dataTypes && conditions.dataTypes.length > 0) {
    const hasDataType = conditions.dataTypes.some(dt => context.dataTypes.includes(dt));
    if (!hasDataType) return false;
  }

  // Check dependencies
  if (conditions.dependencies && conditions.dependencies.length > 0) {
    const allDepsMet = conditions.dependencies.every(dep =>
      context.alreadyActivated.includes(dep) || dep === 'foundation'
    );
    if (!allDepsMet) return false;
  }

  // Check minimum counts
  if (conditions.minDepartmentCount && context.activeDepartments.length < conditions.minDepartmentCount) {
    return false;
  }

  if (conditions.minTeamCount && context.activeTeams.length < conditions.minTeamCount) {
    return false;
  }

  return true;
}

/**
 * Infers organization size from hierarchy structure
 */
export function inferOrganizationSize(hierarchy: OrgHierarchyNode[]): 'small' | 'medium' | 'enterprise' {
  if (hierarchy.length === 0) return 'small';

  const totalDepartments = hierarchy
    .flatMap(org => org.children || [])
    .flatMap(div => div.children || [])
    .filter(n => n.type === 'department').length;

  const totalTeams = hierarchy
    .flatMap(org => org.children || [])
    .flatMap(div => div.children || [])
    .flatMap(dept => dept.children || [])
    .filter(n => n.type === 'team').length;

  if (totalDepartments <= 3 && totalTeams <= 5) return 'small';
  if (totalDepartments <= 10 && totalTeams <= 20) return 'medium';
  return 'enterprise';
}
