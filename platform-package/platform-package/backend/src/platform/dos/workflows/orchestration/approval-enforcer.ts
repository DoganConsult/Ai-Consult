/**
 * Approval Enforcer — loads module approval matrices.
 * Stub: actual enforcement logic will be wired in the approval engine.
 */
import { logger } from '../../observability/logger.service';

export async function loadAndRegisterAllApprovalMatrices(): Promise<void> {
  logger.info('[ApprovalEnforcer] Module approval matrices loaded (stub)');
}
