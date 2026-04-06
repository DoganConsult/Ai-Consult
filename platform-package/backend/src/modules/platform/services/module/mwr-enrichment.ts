/**
 * Module Workflow Registry (MWR) Enrichment — Adds computed fields
 * to MWR rows for display and decision-making.
 *
 * Enrichment includes:
 *   - Resolved module display name and icon
 *   - Workflow state label and color
 *   - SLA status (on-track, at-risk, breached)
 *   - Owner display name
 *   - Approval chain summary
 */

import { safeQuery } from '../../../../config/database';
import { logger } from '../../../../platform/dos/observability/services/logger.service';

export interface MwrRow {
  id: string;
  moduleCode: string;
  workflowCode: string;
  entityId: string;
  currentState: string;
  ownerId?: string;
  slaDeadline?: string;
  approvalChain?: Array<{ stepId: string; actorId: string; status: string }>;
  [key: string]: unknown;
}

export interface EnrichedMwrRow extends MwrRow {
  moduleDisplayName: string;
  moduleIcon: string;
  stateLabel: string;
  stateColor: string;
  slaStatus: 'on_track' | 'at_risk' | 'breached' | 'no_sla';
  ownerDisplayName: string;
  approvalSummary: string;
  enrichedAt: string;
}

/**
 * Enrich a batch of MWR rows with computed display fields.
 * Resolves module names, user names, and SLA status in bulk.
 */
export async function enrichMwrRowFromCanonicalMaps(
  rows: MwrRow[],
): Promise<EnrichedMwrRow[]> {
  if (!rows || rows.length === 0) return [];

  try {
    // Collect unique module codes and owner IDs for bulk resolution
    const moduleCodes = Array.from(new Set(rows.map(r => r.moduleCode).filter(Boolean)));
    const ownerIds = Array.from(new Set(rows.map(r => r.ownerId).filter(Boolean))) as string[];

    // Bulk-resolve module metadata
    const moduleMap = await resolveModuleMetadata(moduleCodes);

    // Bulk-resolve owner display names
    const ownerMap = await resolveOwnerNames(ownerIds);

    // Resolve workflow state labels
    const workflowCodes = Array.from(new Set(rows.map(r => r.workflowCode).filter(Boolean)));
    const stateMap = await resolveStateLabels(workflowCodes);

    const now = Date.now();
    const enrichedAt = new Date().toISOString();

    return rows.map(row => {
      const moduleMeta = moduleMap.get(row.moduleCode) || { displayName: row.moduleCode, icon: 'pi-box' };
      const stateKey = `${row.workflowCode}:${row.currentState}`;
      const stateMeta = stateMap.get(stateKey) || { label: row.currentState, color: 'var(--grc-text-secondary)' };

      // SLA computation
      let slaStatus: EnrichedMwrRow['slaStatus'] = 'no_sla';
      if (row.slaDeadline) {
        const deadline = new Date(row.slaDeadline).getTime();
        const hoursRemaining = (deadline - now) / (1000 * 60 * 60);
        if (hoursRemaining < 0) {
          slaStatus = 'breached';
        } else if (hoursRemaining < 24) {
          slaStatus = 'at_risk';
        } else {
          slaStatus = 'on_track';
        }
      }

      // Approval summary
      let approvalSummary = 'N/A';
      if (row.approvalChain && row.approvalChain.length > 0) {
        const approved = row.approvalChain.filter(s => s.status === 'approved').length;
        const total = row.approvalChain.length;
        approvalSummary = `${approved}/${total} approved`;
      }

      return {
        ...row,
        moduleDisplayName: moduleMeta.displayName,
        moduleIcon: moduleMeta.icon,
        stateLabel: stateMeta.label,
        stateColor: stateMeta.color,
        slaStatus,
        ownerDisplayName: row.ownerId ? (ownerMap.get(row.ownerId) || 'Unknown') : 'Unassigned',
        approvalSummary,
        enrichedAt,
      };
    });
  } catch (err) {
    logger.error('[MwrEnrichment] Failed to enrich MWR rows', {
      rowCount: rows.length,
      error: err instanceof Error ? err.message : String(err),
    });
    // Return rows with fallback enrichment
    return rows.map(row => ({
      ...row,
      moduleDisplayName: row.moduleCode,
      moduleIcon: 'pi-box',
      stateLabel: row.currentState,
      stateColor: 'var(--grc-text-secondary)',
      slaStatus: 'no_sla' as const,
      ownerDisplayName: 'Unknown',
      approvalSummary: 'N/A',
      enrichedAt: new Date().toISOString(),
    }));
  }
}

async function resolveModuleMetadata(
  moduleCodes: string[],
): Promise<Map<string, { displayName: string; icon: string }>> {
  const map = new Map<string, { displayName: string; icon: string }>();
  if (moduleCodes.length === 0) return map;

  const { rows } = await safeQuery(
    `SELECT module_code, display_name, icon
     FROM public.module_registry
     WHERE module_code = ANY($1)`,
    [moduleCodes],
  ).catch(() => ({ rows: [] }));

  for (const row of rows) {
    map.set(row.module_code as string, {
      displayName: (row.display_name as string) || (row.module_code as string),
      icon: (row.icon as string) || 'pi-box',
    });
  }

  return map;
}

async function resolveOwnerNames(
  ownerIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ownerIds.length === 0) return map;

  const { rows } = await safeQuery(
    `SELECT id, COALESCE(display_name, first_name || ' ' || last_name, email) AS name
     FROM public.users
     WHERE id = ANY($1)`,
    [ownerIds],
  ).catch(() => ({ rows: [] }));

  for (const row of rows) {
    map.set(row.id as string, row.name as string);
  }

  return map;
}

async function resolveStateLabels(
  workflowCodes: string[],
): Promise<Map<string, { label: string; color: string }>> {
  const map = new Map<string, { label: string; color: string }>();
  if (workflowCodes.length === 0) return map;

  const { rows } = await safeQuery(
    `SELECT workflow_code, state_code, display_label, color
     FROM public.workflow_state_definitions
     WHERE workflow_code = ANY($1)`,
    [workflowCodes],
  ).catch(() => ({ rows: [] }));

  for (const row of rows) {
    const key = `${row.workflow_code}:${row.state_code}`;
    map.set(key, {
      label: (row.display_label as string) || (row.state_code as string),
      color: (row.color as string) || 'var(--grc-text-secondary)',
    });
  }

  return map;
}
