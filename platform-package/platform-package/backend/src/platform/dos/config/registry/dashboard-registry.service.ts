/**
 * Dashboard Registry Service
 * ────────────────────────────
 * DB-driven dashboard layout and widget configuration.
 * Replaces hardcoded dashboard baselines with configurable DB entries.
 *
 * Enterprise features:
 *   - Per-tenant dashboard layout customization
 *   - Role-based dashboard assignment
 *   - Widget registry with permission gating
 *   - System + custom dashboards
 *   - Admin API for runtime management
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';

// ── Types ───────────────────────────────────────────────────────────────

export interface DashboardLayout {
  layoutId: string;
  dashboardCode: string;
  nameEn: string;
  nameAr: string | null;
  descriptionEn: string | null;
  layoutDefinition: Record<string, any>;
  audience: 'all' | 'role_specific' | 'custom';
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface DashboardWidget {
  widgetId: string;
  widgetCode: string;
  widgetType: 'chart' | 'kpi' | 'table' | 'list' | 'map' | 'custom';
  nameEn: string;
  nameAr: string | null;
  descriptionEn: string | null;
  dataSource: string | null;
  refreshIntervalMs: number;
  defaultConfig: Record<string, any>;
  requiredPermission: string | null;
  moduleCode: string | null;
  isSystem: boolean;
  isActive: boolean;
  sortOrder?: number;
}

// ── Cache ───────────────────────────────────────────────────────────────

const _layoutCache = new Map<string, { layouts: DashboardLayout[]; ts: number }>();
const _widgetCache = new Map<string, { widgets: DashboardWidget[]; ts: number }>();
const CACHE_TTL_MS = 5 * 60_000; // 5 minutes

// ── Dashboard Layouts ───────────────────────────────────────────────────

export async function getDashboardLayouts(tenantId: string, roleCode?: string): Promise<DashboardLayout[]> {
  const cacheKey = `${tenantId}:${roleCode ?? 'all'}`;
  const cached = _layoutCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.layouts;

  try {
    const schema = tenantSchema(tenantId);
    let sql = `SELECT l.* FROM "${schema}".dashboard_layout_registry l WHERE l.tenant_id = $1 AND l.is_active = TRUE`;
    const params: any[] = [tenantId];

    if (roleCode) {
      sql += ` AND (l.audience = 'all' OR EXISTS (
        SELECT 1 FROM "${schema}".dashboard_role_bindings b
        WHERE b.layout_id = l.layout_id AND b.role_code = $2 AND b.is_allowed = TRUE
      ))`;
      params.push(roleCode);
    }

    sql += ` ORDER BY l.sort_order ASC, l.name_en ASC`;
    const result = await safeQuery(sql, params);
    const layouts = result.rows.map(mapRowToLayout);
    _layoutCache.set(cacheKey, { layouts, ts: Date.now() });
    return layouts;
  } catch (err) {
    logger.warn('[DashboardRegistry] Layout lookup failed', { error: toErrorMessage(err), tenantId });
    return [];
  }
}

export async function getDefaultDashboard(tenantId: string, roleCode: string): Promise<DashboardLayout | null> {
  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT l.* FROM "${schema}".dashboard_layout_registry l
       JOIN "${schema}".dashboard_role_bindings b ON b.layout_id = l.layout_id
       WHERE l.tenant_id = $1 AND b.role_code = $2 AND b.is_default = TRUE AND l.is_active = TRUE
       LIMIT 1`,
      [tenantId, roleCode],
    );
    return result.rows[0] ? mapRowToLayout(result.rows[0]) : null;
  } catch { return null; }
}

// ── Widget Registry ─────────────────────────────────────────────────────

export async function getWidgets(tenantId: string, moduleCode?: string): Promise<DashboardWidget[]> {
  const cacheKey = `${tenantId}:${moduleCode ?? 'all'}`;
  const cached = _widgetCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.widgets;

  try {
    const schema = tenantSchema(tenantId);
    let sql = `SELECT * FROM "${schema}".dashboard_widget_registry WHERE tenant_id = $1 AND is_active = TRUE`;
    const params: any[] = [tenantId];

    if (moduleCode) {
      sql += ` AND module_code = $2`;
      params.push(moduleCode);
    }
    sql += ` ORDER BY sort_order ASC`;

    const result = await safeQuery(sql, params);
    const widgets = result.rows.map(mapRowToWidget);
    _widgetCache.set(cacheKey, { widgets, ts: Date.now() });
    return widgets;
  } catch (err) {
    logger.warn('[DashboardRegistry] Widget lookup failed', { error: toErrorMessage(err), tenantId });
    return [];
  }
}

// ── Admin Operations ────────────────────────────────────────────────────

export async function upsertDashboardLayout(
  tenantId: string,
  dashboardCode: string,
  layout: Partial<DashboardLayout>,
  createdBy?: string,
): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `INSERT INTO "${schema}".dashboard_layout_registry
       (tenant_id, dashboard_code, name_en, name_ar, description_en, layout_definition, audience, is_system, is_active, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (tenant_id, dashboard_code) DO UPDATE SET
         name_en = COALESCE(EXCLUDED.name_en, dashboard_layout_registry.name_en),
         name_ar = COALESCE(EXCLUDED.name_ar, dashboard_layout_registry.name_ar),
         layout_definition = COALESCE(EXCLUDED.layout_definition, dashboard_layout_registry.layout_definition),
         audience = COALESCE(EXCLUDED.audience, dashboard_layout_registry.audience),
         is_active = COALESCE(EXCLUDED.is_active, dashboard_layout_registry.is_active),
         updated_at = NOW()
       RETURNING layout_id`,
      [tenantId, dashboardCode, layout.nameEn ?? dashboardCode, layout.nameAr, layout.descriptionEn,
       JSON.stringify(layout.layoutDefinition ?? {}), layout.audience ?? 'all',
       layout.isSystem ?? false, layout.isActive ?? true, layout.sortOrder ?? 100, createdBy],
    );
    invalidateDashboardCache(tenantId);
    return result.rows[0]?.layout_id ?? null;
  } catch (err) {
    logger.warn('[DashboardRegistry] Upsert layout failed', { error: toErrorMessage(err), tenantId });
    return null;
  }
}

export async function upsertWidget(
  tenantId: string,
  widgetCode: string,
  widget: Partial<DashboardWidget>,
  _createdBy?: string,
): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `INSERT INTO "${schema}".dashboard_widget_registry
       (tenant_id, widget_code, widget_type, name_en, name_ar, description_en, data_source,
        refresh_interval_ms, default_config, required_permission, module_code, is_system, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (tenant_id, widget_code) DO UPDATE SET
         name_en = COALESCE(EXCLUDED.name_en, dashboard_widget_registry.name_en),
         widget_type = COALESCE(EXCLUDED.widget_type, dashboard_widget_registry.widget_type),
         data_source = COALESCE(EXCLUDED.data_source, dashboard_widget_registry.data_source),
         default_config = COALESCE(EXCLUDED.default_config, dashboard_widget_registry.default_config),
         is_active = COALESCE(EXCLUDED.is_active, dashboard_widget_registry.is_active),
         updated_at = NOW()
       RETURNING widget_id`,
      [tenantId, widgetCode, widget.widgetType ?? 'chart', widget.nameEn ?? widgetCode,
       widget.nameAr, widget.descriptionEn, widget.dataSource,
       widget.refreshIntervalMs ?? 300000, JSON.stringify(widget.defaultConfig ?? {}),
       widget.requiredPermission, widget.moduleCode, widget.isSystem ?? false,
       widget.isActive ?? true, widget.sortOrder ?? 100],
    );
    invalidateDashboardCache(tenantId);
    return result.rows[0]?.widget_id ?? null;
  } catch (err) {
    logger.warn('[DashboardRegistry] Upsert widget failed', { error: toErrorMessage(err), tenantId });
    return null;
  }
}

export async function setDashboardRoleBinding(
  tenantId: string,
  layoutId: string,
  roleCode: string,
  isDefault: boolean,
  isAllowed: boolean,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `INSERT INTO "${schema}".dashboard_role_bindings (tenant_id, layout_id, role_code, is_default, is_allowed)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, layout_id, role_code) DO UPDATE SET
         is_default = EXCLUDED.is_default, is_allowed = EXCLUDED.is_allowed`,
      [tenantId, layoutId, roleCode, isDefault, isAllowed],
    );
    invalidateDashboardCache(tenantId);
    return true;
  } catch { return false; }
}

export function invalidateDashboardCache(tenantId?: string): void {
  if (tenantId) {
    for (const key of _layoutCache.keys()) {
      if (key.startsWith(`${tenantId}:`)) _layoutCache.delete(key);
    }
    for (const key of _widgetCache.keys()) {
      if (key.startsWith(`${tenantId}:`)) _widgetCache.delete(key);
    }
  } else {
    _layoutCache.clear();
    _widgetCache.clear();
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function mapRowToLayout(row: any): DashboardLayout {
  return {
    layoutId: row.layout_id,
    dashboardCode: row.dashboard_code,
    nameEn: row.name_en,
    nameAr: row.name_ar,
    descriptionEn: row.description_en,
    layoutDefinition: row.layout_definition ?? {},
    audience: row.audience,
    isSystem: row.is_system,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

function mapRowToWidget(row: any): DashboardWidget {
  return {
    widgetId: row.widget_id,
    widgetCode: row.widget_code,
    widgetType: row.widget_type,
    nameEn: row.name_en,
    nameAr: row.name_ar,
    descriptionEn: row.description_en,
    dataSource: row.data_source,
    refreshIntervalMs: row.refresh_interval_ms,
    defaultConfig: row.default_config ?? {},
    requiredPermission: row.required_permission,
    moduleCode: row.module_code,
    isSystem: row.is_system,
    isActive: row.is_active,
  };
}
