// @ts-nocheck
// ============================================================
// Personal Agent SLA Check Job
// Periodically checks for SLA breaches and activates agents
// ============================================================

import { checkSlaAndActivateAgent } from '../../../ai/services/personal/personal-agent.service';
import { safeQuery, tenantSchema } from '../../../../config/database/database';
import { logger } from '../../services/misc/logger.service';

/**
 * Background job: Check SLA breaches and activate personal agents
 * Runs every hour for all active tenants
 */
export async function runPersonalAgentSlaCheckJob(): Promise<void> {
  try {
    // Get all active tenants
    const tenants = await safeQuery(
      `SELECT tenant_id, schema_name FROM public.tenants WHERE is_active = true`,
      []
    );
    
    let totalActivated = 0;
    
    for (const tenant of tenants.rows) {
      try {
        const schema = tenantSchema(tenant.tenant_id);
        
        // Get all users with active and enabled personal agents with SLA-based activation
        const users = await safeQuery(
          `SELECT DISTINCT user_id
           FROM "${schema}".personal_agent_assignments
           WHERE is_active = true AND is_enabled = true AND sla_based_activation = true`,
          []
        );
        
        for (const user of users.rows) {
          try {
            const activities = await checkSlaAndActivateAgent(
              tenant.tenant_id,
              user.user_id
            );
            
            totalActivated += activities.length;
            
            if (activities.length > 0) {
              logger.info(`[PersonalAgentSLA] Activated ${activities.length} activities for user ${user.user_id} in tenant ${tenant.tenant_id}`);
            }
          } catch (error: unknown) {
            logger.error(`[PersonalAgentSLA] Error checking SLA for user ${user.user_id} in tenant ${tenant.tenant_id}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      } catch (error: unknown) {
        logger.error(`[PersonalAgentSLA] Error processing tenant ${tenant.tenant_id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    logger.info(`[PersonalAgentSLA] Job completed. Total activities activated: ${totalActivated}`);
  } catch (error: unknown) {
    logger.error(`[PersonalAgentSLA] Job failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
