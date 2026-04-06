import { v4 as uuid } from 'uuid';
import { logger } from '../../logger';
import { safeQuery } from '../../../../config/database/database';
import { integrationRegistryService } from '../registry/integration-registry.service';
import { integrationSyncService } from '../sync/integration-sync.service';
import { integrationHealthService } from '../health/integration-health.service';
import type {
  AdminConnectorAction,
  AdminActionResult,
  ConnectorState,
} from '../contracts/integration.types';

const MAX_ACTION_HISTORY = 500;
const actionHistory: AdminActionResult[] = [];

const ACTION_STATE_MAP: Partial<Record<AdminConnectorAction['actionCode'], ConnectorState>> = {
  enable: 'active',
  disable: 'disabled',
  pause: 'paused',
  quarantine: 'quarantined',
  'release-quarantine': 'active',
};

export async function executeAdminAction(action: AdminConnectorAction): Promise<AdminActionResult> {
  const connector = integrationRegistryService.getConnector(action.connectorCode);
  const previousState = connector?.state;

  const result: AdminActionResult = {
    actionCode: action.actionCode,
    connectorCode: action.connectorCode,
    success: false,
    previousState,
    executedAt: new Date().toISOString(),
  };

  try {
    if (action.actionCode === 'replay') {
      if (!action.targetQuarantineId) {
        result.detail = 'targetQuarantineId required for replay action';
        return finalize(result);
      }
      const replayResult = await integrationSyncService.replayQuarantineEntry(
        action.targetQuarantineId,
        action.performedBy,
      );
      result.success = replayResult.status === 'completed';
      result.detail = replayResult.reason ?? replayResult.status;
      return finalize(result);
    }

    if (action.actionCode === 'rotate-credential') {
      const tenantId = action.tenantId;
      if (!tenantId) {
        result.detail = 'tenantId required for rotate-credential action';
        return finalize(result);
      }
      const binding = integrationRegistryService.getCredentialBinding(action.connectorCode, tenantId);
      if (binding) {
        integrationRegistryService.bindCredential({
          connectorCode: binding.connectorCode,
          tenantId: binding.tenantId,
          credentialType: binding.credentialType,
          referenceKey: binding.referenceKey,
          status: 'rotation-pending',
          rotationPolicy: binding.rotationPolicy,
        });
      }
      result.success = true;
      result.detail = 'Credential rotation initiated';
      return finalize(result);
    }

    const newState = ACTION_STATE_MAP[action.actionCode];
    if (!newState) {
      result.detail = `Unhandled action code: ${action.actionCode}`;
      return finalize(result);
    }

    if (!connector) {
      result.detail = `Connector not found: ${action.connectorCode}`;
      return finalize(result);
    }

    await integrationRegistryService.updateConnectorState(action.connectorCode, newState);

    if (action.actionCode === 'release-quarantine') {
      integrationHealthService.resetCircuitBreaker(action.connectorCode);
    }

    result.success = true;
    result.newState = newState;
    result.detail = `State changed from ${previousState} to ${newState}`;
    return finalize(result);
  } catch (err) {
    result.detail = (err as Error).message;
    logger.warn('[IntegrationAdmin] Admin action failed', {
      actionCode: action.actionCode,
      connectorCode: action.connectorCode,
      error: (err as Error).message,
    });
    return finalize(result);
  }
}

function finalize(result: AdminActionResult): AdminActionResult {
  actionHistory.push(result);
  if (actionHistory.length > MAX_ACTION_HISTORY) {
    actionHistory.splice(0, actionHistory.length - MAX_ACTION_HISTORY);
  }

  logger.info('[IntegrationAdmin] Action recorded', {
    actionCode: result.actionCode,
    connectorCode: result.connectorCode,
    success: result.success,
    detail: result.detail,
  });

  persistActionAudit(result).catch(() => {});
  return result;
}

async function persistActionAudit(result: AdminActionResult): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO dos_integration_admin_audit (audit_id, action_code, connector_code, success, previous_state, new_state, detail, executed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        uuid(),
        result.actionCode,
        result.connectorCode,
        result.success,
        result.previousState ?? null,
        result.newState ?? null,
        result.detail ?? null,
        result.executedAt,
      ],
    );
  } catch {
  }
}

export function getAdminActionHistory(connectorCode?: string, limit = 50): AdminActionResult[] {
  const filtered = connectorCode
    ? actionHistory.filter((a) => a.connectorCode === connectorCode)
    : actionHistory;
  return filtered.slice(-limit).reverse();
}

export async function pauseConnector(connectorCode: string, performedBy: string, reason: string): Promise<AdminActionResult> {
  return executeAdminAction({ actionCode: 'pause', connectorCode, performedBy, reason });
}

export async function enableConnector(connectorCode: string, performedBy: string, reason: string): Promise<AdminActionResult> {
  return executeAdminAction({ actionCode: 'enable', connectorCode, performedBy, reason });
}

export async function disableConnector(connectorCode: string, performedBy: string, reason: string): Promise<AdminActionResult> {
  return executeAdminAction({ actionCode: 'disable', connectorCode, performedBy, reason });
}

export async function quarantineConnector(connectorCode: string, performedBy: string, reason: string): Promise<AdminActionResult> {
  return executeAdminAction({ actionCode: 'quarantine', connectorCode, performedBy, reason });
}

export async function releaseQuarantine(connectorCode: string, performedBy: string, reason: string): Promise<AdminActionResult> {
  return executeAdminAction({ actionCode: 'release-quarantine', connectorCode, performedBy, reason });
}

export async function triggerReplay(
  connectorCode: string,
  quarantineId: string,
  performedBy: string,
  reason: string,
): Promise<AdminActionResult> {
  return executeAdminAction({
    actionCode: 'replay',
    connectorCode,
    performedBy,
    reason,
    targetQuarantineId: quarantineId,
  });
}

export const integrationAdminService = {
  executeAdminAction,
  getAdminActionHistory,
  pauseConnector,
  enableConnector,
  disableConnector,
  quarantineConnector,
  releaseQuarantine,
  triggerReplay,
};
