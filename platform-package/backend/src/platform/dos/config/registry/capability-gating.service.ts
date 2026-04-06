// @ts-nocheck
import { logger } from '../../observability/services/logger.service';
// ============================================
// Shahin — Governance-Driven Capability Gating Service
// Determines which agent tools are available based on:
// - Module enablement (product_modules)
// - Governance policies
// - Risk appetite
// - Authority matrix
// - Tenant configuration
// - Agent-specific restrictions
// ============================================

import { safeQuery, tenantSchema } from '../../../../config/database';
import { getToolsForAgent, type  } from '../../../../ai/tools/tool-registry';
import type { AgrcTool } from '../../../../ai/tools/tool-base';
import { getConstitution, checkRiskAgainstAppetite } from '../../../../modules/governance/services/governance/governance-constitution.service';
import { getFirstRow } from '../../../../utils/db-utils';
import { enforceGovernanceBeforeAction, type AgentActionContext } from '../../../../modules/governance/services/misc/realtime-governance-enforcement.service';
import { recordAudit } from '../../../../modules/audit/services/audit/core/audit-trail.service';
import { SYSTEM_JOB_ACTOR } from '../../constants/system-actors';

export interface CapabilityGateResult {
  allowed: boolean;
  reason?: string;
  gatedBy: Array<'module' | 'policy' | 'risk' | 'authority' | 'tenant_config' | 'agent_restriction'>;
  metadata?: Record<string, any>;
}

export interface CapabilityGateContext {
  tenantId: string;
  userId?: string;
  agentId: string;
  toolName: string;
  toolArgs?: Record<string, any>;
}

/**
 * Check if a module is enabled for the tenant.
 * Checks tenant-scoped module_operating_states first (on/off/trial),
 * falls back to global product_modules if no operating state row exists.
 */
async function isModuleEnabled(tenantId: string, module: string): Promise<boolean> {
  try {
    const osResult = await safeQuery(
      `SELECT state, trial_expiry_at FROM public.module_operating_states
       WHERE tenant_id = $1 AND module_code = $2 AND is_active = true LIMIT 1`,
      [tenantId, module]
    );
    if (osResult.rows.length > 0) {
      const row = getFirstRow(osResult);
      if (row.state === 'off') return false;
      if (row.state === 'trial' && row.trial_expiry_at) {
        return new Date(row.trial_expiry_at) >= new Date();
      }
      return row.state === 'on' || row.state === 'trial';
    }
  } catch {
    // table may not exist yet — fall through to product_modules
  }

  try {
    const result = await safeQuery(
      `SELECT enabled FROM public.product_modules 
       WHERE module_code = $1 AND enabled = true`,
      [module]
    );
    return result.rows.length > 0;
  } catch (err) {
    logger.warn(`[capability-gating] Failed to check module ${module}:`, (err as Error).message);
    return false;
  }
}

/**
 * Check tenant-specific agent capability restrictions.
 * These can be stored in tenant_config or a dedicated agent_capabilities table.
 */
async function checkTenantAgentRestrictions(
  tenantId: string,
  agentId: string,
  toolName: string
): Promise<{ allowed: boolean; reason?: string }> {
  const schema = tenantSchema(tenantId);
  
  try {
    // Check if there's a tenant-specific agent capability configuration
    const result = await safeQuery(
      `SELECT agent_capabilities FROM "${schema}".tenant_config 
       WHERE config_key = 'agent_capabilities'`,
      []
    );
    
    if (result.rows.length > 0) {
      const capabilities = getFirstRow(result)?.agent_capabilities;
      if (capabilities && typeof capabilities === 'object') {
        // Check agent-level restrictions
        if (capabilities[agentId] === false) {
          return { allowed: false, reason: `Agent ${agentId} is disabled for this tenant` };
        }
        
        // Check tool-level restrictions
        if (capabilities[agentId] && typeof capabilities[agentId] === 'object') {
          const agentConfig = capabilities[agentId];
          if (agentConfig.tools && Array.isArray(agentConfig.tools)) {
            if (agentConfig.tools.includes(`!${toolName}`) || 
                (agentConfig.tools.length > 0 && !agentConfig.tools.includes(toolName))) {
              return { allowed: false, reason: `Tool ${toolName} is restricted for agent ${agentId}` };
            }
          }
        }
      }
    }
    
    return { allowed: true };
  } catch (err) {
    // If table doesn't exist or column missing, assume no restrictions
    return { allowed: true };
  }
}

/**
 * Check if the tool's required module is enabled.
 */
async function checkModuleGate(
  tenantId: string,
  tool: AgrcTool
): Promise<{ allowed: boolean; reason?: string }> {
  const module = tool.governance.module;
  if (!module) {
    return { allowed: true }; // No module requirement
  }
  
  const enabled = await isModuleEnabled(tenantId, module);
  if (!enabled) {
    return {
      allowed: false,
      reason: `Module "${module}" is not enabled for this tenant`,
    };
  }
  
  return { allowed: true };
}

/**
 * Check governance policies, risk appetite, and authority matrix.
 * Reuses the real-time governance enforcement service.
 */
async function checkGovernanceGate(
  context: CapabilityGateContext,
  tool: AgrcTool
): Promise<{ allowed: boolean; reason?: string; gatedBy?: string[] }> {
  const actionType: AgentActionContext['actionType'] =
    tool.governance.sideEffectLevel === 'destructive' ? 'delete' :
    tool.governance.sideEffectLevel === 'write' ? 'write' : 'read';

  const actionContext: AgentActionContext = {
    tenantId: context.tenantId,
    userId: context.userId,
    agentId: context.agentId,
    toolName: context.toolName,
    toolArgs: context.toolArgs || {},
    governance: tool.governance,
    actionType,
    criticality: actionType === 'delete' ? 'high' :
                 actionType === 'write' ? 'medium' : 'low',
  };
  
  const governanceResult = await enforceGovernanceBeforeAction(actionContext);
  
  if (!governanceResult.allowed) {
    const gatedBy: string[] = [];
    if (governanceResult.triggeredPolicies.length > 0) {
      gatedBy.push('policy');
    }
    if (governanceResult.riskCheck && !governanceResult.riskCheck.withinAppetite) {
      gatedBy.push('risk');
    }
    if (governanceResult.authorityCheck) {
      gatedBy.push('authority');
    }
    
    return {
      allowed: false,
      reason: governanceResult.reason || 'Governance policy blocked capability',
      gatedBy,
    };
  }
  
  return { allowed: true };
}

/**
 * Main entry point: Check if an agent tool capability is gated.
 * Returns detailed result with reasons and gating sources.
 */
export async function checkCapabilityGate(
  context: CapabilityGateContext
): Promise<CapabilityGateResult> {
  const { tenantId, agentId, toolName } = context;
  
  // 1. Get the tool definition
  const tools = getToolsForAgent(agentId, tenantId);
  const tool = tools.find(t => t.name === toolName);
  
  if (!tool) {
    return {
      allowed: false,
      reason: `Tool "${toolName}" not found for agent ${agentId}`,
      gatedBy: ['agent_restriction'],
    };
  }
  
  const gatedBy: Array<'module' | 'policy' | 'risk' | 'authority' | 'tenant_config' | 'agent_restriction'> = [];
  
  // 2. Check module enablement
  const moduleCheck = await checkModuleGate(tenantId, tool);
  if (!moduleCheck.allowed) {
    gatedBy.push('module');
    return {
      allowed: false,
      reason: moduleCheck.reason,
      gatedBy,
      metadata: { module: tool.governance.module },
    };
  }
  
  // 3. Check tenant-specific agent restrictions
  const tenantRestrictionCheck = await checkTenantAgentRestrictions(tenantId, agentId, toolName);
  if (!tenantRestrictionCheck.allowed) {
    gatedBy.push('tenant_config');
    return {
      allowed: false,
      reason: tenantRestrictionCheck.reason,
      gatedBy,
    };
  }
  
  // 4. Check governance policies, risk appetite, and authority matrix
  const governanceCheck = await checkGovernanceGate(context, tool);
  if (!governanceCheck.allowed) {
    if (governanceCheck.gatedBy) {
      gatedBy.push(...(governanceCheck.gatedBy as any));
    }
    return {
      allowed: false,
      reason: governanceCheck.reason,
      gatedBy,
    };
  }
  
  // All checks passed
  return {
    allowed: true,
    gatedBy: [],
  };
}

/**
 * Get all available tools for an agent after applying capability gates.
 * This is the filtered version of getToolsForAgent that respects governance.
 */
export async function getGatedToolsForAgent(
  agentId: string,
  tenantId: string,
  userId?: string
): Promise<AgrcTool[]> {
  const allTools = getToolsForAgent(agentId, tenantId);
  const availableTools: AgrcTool[] = [];
  
  for (const tool of allTools) {
    const gateResult = await checkCapabilityGate({
      tenantId,
      userId,
      agentId,
      toolName: tool.name,
    });
    
    if (gateResult.allowed) {
      availableTools.push(tool);
    } else {
      // Log capability gate decision for audit
      try {
        await recordAudit({
          tenantId,
          userId: userId || SYSTEM_JOB_ACTOR,
          module: 'capability-gating',
          action: 'capability_gated',
          entityType: 'agent_tool',
          entityId: tool.name,
          afterState: {
            summary: `Tool ${tool.name} gated for agent ${agentId}`,
            agentId,
            toolName: tool.name,
            reason: gateResult.reason,
            gatedBy: gateResult.gatedBy,
          },
        });
      } catch (err) {
        logger.warn('[capability-gating] Failed to record audit:', (err as Error).message);
      }
    }
  }
  
  return availableTools;
}

/**
 * Check if a specific capability (tool) is available for an agent.
 * Quick check without full governance evaluation (for UI/API responses).
 */
export async function isCapabilityAvailable(
  tenantId: string,
  agentId: string,
  toolName: string,
  userId?: string
): Promise<boolean> {
  const result = await checkCapabilityGate({
    tenantId,
    userId,
    agentId,
    toolName,
  });
  return result.allowed;
}

/**
 * Get capability gate status for all tools of an agent.
 * Useful for admin dashboards showing which tools are gated and why.
 */
export async function getCapabilityGateStatus(
  agentId: string,
  tenantId: string,
  userId?: string
): Promise<Array<{ toolName: string; available: boolean; reason?: string; gatedBy: string[] }>> {
  const allTools = getToolsForAgent(agentId, tenantId);
  const statuses: Array<{ toolName: string; available: boolean; reason?: string; gatedBy: string[] }> = [];
  
  for (const tool of allTools) {
    const gateResult = await checkCapabilityGate({
      tenantId,
      userId,
      agentId,
      toolName: tool.name,
    });
    
    statuses.push({
      toolName: tool.name,
      available: gateResult.allowed,
      reason: gateResult.reason,
      gatedBy: gateResult.gatedBy,
    });
  }
  
  return statuses;
}
