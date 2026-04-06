// ============================================
// DOS Navigation — Audit Service
// Domain-specific audit trail for navigation
// changes. Supplements generic audit_trail.
// Law 12: "Every sensitive action or decision
// must be reconstructable."
// ============================================

import { safeQuery, tenantSchema } from '../../../../config/database';
import { emitEvent } from '../../events/event-bus';
import type { NavigationAuditEntry } from './navigation.types';

export class NavigationAuditService {
  // ------------------------------------------------------------------
  // Public: log a navigation change
  // ------------------------------------------------------------------
  async log(entry: NavigationAuditEntry): Promise<void> {
    const schema = tenantSchema(entry.tenantId);

    // Write to domain-specific audit table
    await safeQuery(
      `INSERT INTO "${schema}".navigation_audit_log
        (tenant_id, actor_id, action, entity_type, entity_id, before_state, after_state)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.tenantId,
        entry.actorId,
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.beforeState ? JSON.stringify(entry.beforeState) : null,
        entry.afterState ? JSON.stringify(entry.afterState) : null,
      ],
    ).catch(() => {
      // Non-fatal: audit table may not exist yet during migration
    });

    // Also emit event for cross-module audit consumers
    await emitEvent({
      tenantId: entry.tenantId,
      userId: entry.actorId,
      module: 'navigation',
      event: `navigation.${entry.entityType}.${entry.action}`,
      entityType: entry.entityType,
      entityId: entry.entityId,
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        beforeState: entry.beforeState,
        afterState: entry.afterState,
      },
    }).catch(() => {
      // Non-fatal: event bus failure should not block mutation
    });
  }

  // ------------------------------------------------------------------
  // Public: snapshot a registry entry to version history (for rollback)
  // ------------------------------------------------------------------
  async snapshotVersion(
    tenantId: string,
    actorId: string,
    navKey: string,
    version: number,
    snapshot: Record<string, unknown>,
    action: string,
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    await safeQuery(
      `INSERT INTO "${schema}".navigation_version_history
        (nav_key, version, snapshot, action, actor_id, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (nav_key, version) DO NOTHING`,
      [navKey, version, JSON.stringify(snapshot), action, actorId, tenantId],
    ).catch(() => {
      // Non-fatal: version history table may not exist yet
    });
  }

  // ------------------------------------------------------------------
  // Public: get version history for a nav key
  // ------------------------------------------------------------------
  async getVersionHistory(
    tenantId: string,
    navKey: string,
  ): Promise<Array<{ version: number; action: string; actorId: string; createdAt: string }>> {
    const schema = tenantSchema(tenantId);

    const result = await safeQuery(
      `SELECT version, action, actor_id, created_at
       FROM "${schema}".navigation_version_history
       WHERE nav_key = $1
       ORDER BY version DESC`,
      [navKey],
    ).catch(() => ({ rows: [] }));

    return result.rows.map((r: any) => ({
      version: r.version,
      action: r.action,
      actorId: r.actor_id,
      createdAt: r.created_at,
    }));
  }

  // ------------------------------------------------------------------
  // Public: get a specific version snapshot
  // ------------------------------------------------------------------
  async getVersionSnapshot(
    tenantId: string,
    navKey: string,
    version: number,
  ): Promise<Record<string, unknown> | null> {
    const schema = tenantSchema(tenantId);

    const result = await safeQuery(
      `SELECT snapshot FROM "${schema}".navigation_version_history
       WHERE nav_key = $1 AND version = $2`,
      [navKey, version],
    ).catch(() => ({ rows: [] }));

    return result.rows[0]?.snapshot ?? null;
  }

  // ------------------------------------------------------------------
  // Public: get audit trail for a tenant
  // ------------------------------------------------------------------
  async getAuditTrail(
    tenantId: string,
    opts?: { entityType?: string; entityId?: string; limit?: number },
  ): Promise<any[]> {
    const schema = tenantSchema(tenantId);
    const limit = opts?.limit ?? 100;

    let sql = `SELECT * FROM "${schema}".navigation_audit_log WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    let idx = 2;

    if (opts?.entityType) {
      sql += ` AND entity_type = $${idx++}`;
      params.push(opts.entityType);
    }
    if (opts?.entityId) {
      sql += ` AND entity_id = $${idx++}`;
      params.push(opts.entityId);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${idx}`;
    params.push(limit);

    const result = await safeQuery(sql, params).catch(() => ({ rows: [] }));
    return result.rows;
  }
}
