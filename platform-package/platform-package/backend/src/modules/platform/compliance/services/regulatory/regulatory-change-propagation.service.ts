import { v4 as uuid } from 'uuid';
import { safeQuery } from '../../../../../config/database';

import { logger } from '../../../../../platform/dos/observability/services/logger.service';

/**
 * Regulatory Change Propagation.
 * Processes unprocessed regulatory changes, finds controls mapped to the
 * affected framework, creates remediation tasks and notifications for
 * the control owners.
 */
export async function propagateRegulatoryChanges(
  tenantId: string,
): Promise<{ changesProcessed: number; controlsUpdated: number; notificationsSent: number }> {
  const schema = `tenant_${tenantId}`;
  let changesProcessed = 0;
  let controlsUpdated = 0;
  let notificationsSent = 0;

  try {
    // ── 1. Fetch unprocessed regulatory changes ─────────────────────
    const changesResult = await safeQuery(
      `SELECT id, framework_id, change_type, description, effective_date, severity
         FROM ${schema}.regulatory_changes
        WHERE status = 'pending'
        ORDER BY effective_date ASC`,
    );
    const changes: Array<{
      id: string;
      framework_id: string;
      change_type: string;
      description: string;
      effective_date: string;
      severity: string;
    }> = changesResult.rows ?? [];

    if (changes.length === 0) {
      return { changesProcessed: 0, controlsUpdated: 0, notificationsSent: 0 };
    }

    for (const change of changes) {
      // ── 2. Find mapped controls via framework_control_mappings ─────
      const mappingsResult = await safeQuery(
        `SELECT fcm.control_id, c.title AS control_title, c.owner_id
           FROM ${schema}.framework_control_mappings fcm
           JOIN ${schema}.controls c ON c.id = fcm.control_id
          WHERE fcm.framework_id = $1`,
        [change.framework_id],
      );
      const mappedControls: Array<{
        control_id: string;
        control_title: string;
        owner_id: string;
      }> = mappingsResult.rows ?? [];

      // ── 3. Create remediation tasks for each affected control ──────
      const notifiedOwners = new Set<string>();

      for (const mapping of mappedControls) {
        // Flag the control as needing review
        await safeQuery(
          `UPDATE ${schema}.controls
              SET review_required = true,
                  review_reason = $1,
                  updated_at = NOW()
            WHERE id = $2`,
          [
            `Regulatory change: ${change.change_type} — ${change.description?.slice(0, 200) ?? 'N/A'}`,
            mapping.control_id,
          ],
        );
        controlsUpdated++;

        // Create a remediation task
        await safeQuery(
          `INSERT INTO ${schema}.remediation_tasks
             (id, entity_type, entity_id, title, description, priority, status, assigned_to, due_date, created_at)
           VALUES ($1, 'control', $2, $3, $4, $5, 'open', $6, $7, NOW())`,
          [
            uuid(),
            mapping.control_id,
            `Review control "${mapping.control_title}" — regulatory change`,
            `Regulatory change (${change.change_type}): ${change.description ?? ''}. Review and update control alignment.`,
            change.severity === 'critical' ? 'critical' : change.severity === 'high' ? 'high' : 'medium',
            mapping.owner_id,
            change.effective_date,
          ],
        );

        // ── 4. Create notification for the control owner ─────────────
        if (mapping.owner_id && !notifiedOwners.has(mapping.owner_id)) {
          await safeQuery(
            `INSERT INTO ${schema}.notifications
               (id, user_id, type, title, message, entity_type, entity_id, read, created_at)
             VALUES ($1, $2, 'regulatory_change', $3, $4, 'regulatory_change', $5, false, NOW())`,
            [
              uuid(),
              mapping.owner_id,
              `Regulatory change affects your controls`,
              `A ${change.change_type} regulatory change impacts control(s) you own. Please review remediation tasks.`,
              change.id,
            ],
          );
          notifiedOwners.add(mapping.owner_id);
          notificationsSent++;
        }
      }

      // ── 5. Mark the change as processed ────────────────────────────
      await safeQuery(
        `UPDATE ${schema}.regulatory_changes
            SET status = 'processed', processed_at = NOW(), updated_at = NOW()
          WHERE id = $1`,
        [change.id],
      );
      changesProcessed++;
    }

    return { changesProcessed, controlsUpdated, notificationsSent };
  } catch (err) {
    logger.error(
      `[REGULATORY_CHANGE_PROPAGATION] failed for tenant ${tenantId}:`,
      err,
    );
    return { changesProcessed, controlsUpdated, notificationsSent };
  }
}
