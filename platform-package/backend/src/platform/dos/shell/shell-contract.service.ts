// Shell Contract Service
// Composes the full shell contract for a user: navigation, modules, branding, feature flags.
// This is the runtime shell composition layer consumed by the frontend shell.

import { safeQuery, tenantSchema } from '../../../config/database';
import { logger } from '../observability/logger.service';

export interface ShellContract {
  tenantId: string;
  userId: string;
  layout: ShellLayout;
  branding: ShellBranding;
  featureFlags: Record<string, boolean>;
  enabledModules: string[];
  extensions: ShellExtensionEntry[];
  resolvedAt: string;
}

export interface ShellLayout {
  productCode: string;
  sidebarPosition: 'left' | 'right';
  sidebarCollapsed: boolean;
  headerVisible: boolean;
  footerVisible: boolean;
  breadcrumbsEnabled: boolean;
  maxContentWidth: string;
  theme: string;
}

export interface ShellBranding {
  tenantId: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  companyName: string | null;
  supportEmail: string | null;
  customCss: string | null;
}

export interface ShellExtension {
  extensionId: string;
  moduleCode: string;
  slot: 'header' | 'sidebar' | 'footer' | 'toolbar' | 'status-bar';
  component: string;
  priority: number;
  config: Record<string, unknown>;
}

export interface ShellExtensionEntry extends ShellExtension {
  registeredAt: string;
}

/** In-memory cache for shell contracts keyed by tenantId:userId */
const shellCache = new Map<string, { contract: ShellContract; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

/** In-memory registry for shell extensions */
const extensionRegistry = new Map<string, ShellExtension>();

/**
 * Get the full shell composition contract for a user.
 * Combines layout, branding, feature flags, modules, and extensions.
 */
export async function getShellContract(
  tenantId: string,
  userId: string,
): Promise<ShellContract> {
  const cacheKey = `${tenantId}:${userId}`;
  const cached = shellCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.contract;
  }

  try {
    const [layout, branding, featureFlags, enabledModules, extensions] = await Promise.all([
      resolveShellLayout(tenantId, 'default'),
      getShellBranding(tenantId),
      getShellFeatureFlags(tenantId),
      resolveUserModules(tenantId, userId),
      getRegisteredExtensions(tenantId),
    ]);

    const contract: ShellContract = {
      tenantId,
      userId,
      layout,
      branding,
      featureFlags,
      enabledModules,
      extensions,
      resolvedAt: new Date().toISOString(),
    };

    shellCache.set(cacheKey, { contract, expiresAt: Date.now() + CACHE_TTL_MS });
    return contract;
  } catch (err) {
    logger.error(`[ShellContract] Failed to compose shell tenant="${tenantId}" user="${userId}": ${(err as Error).message}`);
    // Return a minimal safe contract so the shell can still render
    return {
      tenantId,
      userId,
      layout: getDefaultLayout('default'),
      branding: { tenantId, logoUrl: null, faviconUrl: null, primaryColor: null, companyName: null, supportEmail: null, customCss: null },
      featureFlags: {},
      enabledModules: [],
      extensions: [],
      resolvedAt: new Date().toISOString(),
    };
  }
}

/**
 * Resolve the shell layout for a given product code.
 * Falls back to platform defaults if no tenant-specific layout is configured.
 */
export async function resolveShellLayout(
  tenantId: string,
  productCode: string,
): Promise<ShellLayout> {
  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT product_code, sidebar_position, sidebar_collapsed, header_visible,
              footer_visible, breadcrumbs_enabled, max_content_width, theme
       FROM "${schema}".shell_layouts
       WHERE product_code = $1
       LIMIT 1`,
      [productCode],
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        productCode: row.product_code,
        sidebarPosition: row.sidebar_position ?? 'left',
        sidebarCollapsed: row.sidebar_collapsed ?? false,
        headerVisible: row.header_visible ?? true,
        footerVisible: row.footer_visible ?? true,
        breadcrumbsEnabled: row.breadcrumbs_enabled ?? true,
        maxContentWidth: row.max_content_width ?? '1440px',
        theme: row.theme ?? 'default',
      };
    }
  } catch (err) {
    logger.warn(`[ShellContract] Failed to resolve layout tenant="${tenantId}" product="${productCode}": ${(err as Error).message}`);
  }

  return getDefaultLayout(productCode);
}

/**
 * Get the branding configuration for a tenant's shell.
 */
export async function getShellBranding(tenantId: string): Promise<ShellBranding> {
  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT logo_url, favicon_url, primary_color, company_name, support_email, custom_css
       FROM "${schema}".shell_branding
       LIMIT 1`,
      [],
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        tenantId,
        logoUrl: row.logo_url ?? null,
        faviconUrl: row.favicon_url ?? null,
        primaryColor: row.primary_color ?? null,
        companyName: row.company_name ?? null,
        supportEmail: row.support_email ?? null,
        customCss: row.custom_css ?? null,
      };
    }
  } catch (err) {
    logger.warn(`[ShellContract] Failed to get branding tenant="${tenantId}": ${(err as Error).message}`);
  }

  return {
    tenantId,
    logoUrl: null,
    faviconUrl: null,
    primaryColor: null,
    companyName: null,
    supportEmail: null,
    customCss: null,
  };
}

/**
 * Get feature flags that affect shell composition for a tenant.
 * Returns a key-value map of flag code to enabled status.
 */
export async function getShellFeatureFlags(
  tenantId: string,
): Promise<Record<string, boolean>> {
  const flags: Record<string, boolean> = {};

  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT feature_key, enabled
       FROM "${schema}".feature_flags
       WHERE feature_key LIKE 'shell.%'
         AND (product_code IS NULL OR product_code = 'agrc')
       ORDER BY feature_key`,
      [],
    );

    for (const row of result.rows) {
      flags[row.feature_key] = row.enabled === true;
    }
  } catch (err) {
    logger.warn(`[ShellContract] Failed to get shell feature flags tenant="${tenantId}": ${(err as Error).message}`);
  }

  return flags;
}

/**
 * Invalidate all cached shell contracts for a tenant.
 * Call this when tenant settings, modules, or branding change.
 */
export function invalidateShellCache(tenantId: string): void {
  const keysToDelete: string[] = [];
  for (const key of shellCache.keys()) {
    if (key.startsWith(`${tenantId}:`)) {
      keysToDelete.push(key);
    }
  }
  for (const key of keysToDelete) {
    shellCache.delete(key);
  }
  logger.info(`[ShellContract] Cache invalidated tenant="${tenantId}" entries=${keysToDelete.length}`);
}

/**
 * Register a shell extension from a module.
 * Extensions appear in designated shell slots (header, sidebar, footer, toolbar, status-bar).
 */
export function registerShellExtension(extension: ShellExtension): void {
  if (!extension.extensionId || !extension.moduleCode || !extension.slot) {
    logger.warn(`[ShellContract] Invalid shell extension registration: missing required fields`);
    return;
  }

  extensionRegistry.set(extension.extensionId, extension);
  logger.info(`[ShellContract] Shell extension registered id="${extension.extensionId}" module="${extension.moduleCode}" slot="${extension.slot}"`);
}

/**
 * Get all registered shell extensions for a tenant.
 * Filters by modules enabled for the tenant.
 */
export async function getRegisteredExtensions(
  tenantId: string,
): Promise<ShellExtensionEntry[]> {
  const enabledModules = new Set<string>();

  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT module_code FROM "${schema}".tenant_module_entitlements
       WHERE is_active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())`,
      [],
    );
    for (const row of result.rows) {
      enabledModules.add(row.module_code);
    }
  } catch (err) {
    logger.warn(`[ShellContract] Failed to load enabled modules for extensions tenant="${tenantId}": ${(err as Error).message}`);
  }

  const entries: ShellExtensionEntry[] = [];
  for (const ext of extensionRegistry.values()) {
    if (enabledModules.has(ext.moduleCode)) {
      entries.push({
        ...ext,
        registeredAt: new Date().toISOString(),
      });
    }
  }

  // Sort by slot then priority (lower priority number = higher precedence)
  entries.sort((a, b) => {
    if (a.slot !== b.slot) return a.slot.localeCompare(b.slot);
    return a.priority - b.priority;
  });

  return entries;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getDefaultLayout(productCode: string): ShellLayout {
  return {
    productCode,
    sidebarPosition: 'left',
    sidebarCollapsed: false,
    headerVisible: true,
    footerVisible: true,
    breadcrumbsEnabled: true,
    maxContentWidth: '1440px',
    theme: 'default',
  };
}

async function resolveUserModules(tenantId: string, userId: string): Promise<string[]> {
  try {
    const schema = tenantSchema(tenantId);
    // Get modules that are both entitled for the tenant and accessible to the user
    const result = await safeQuery(
      `SELECT DISTINCT tme.module_code
       FROM "${schema}".tenant_module_entitlements tme
       WHERE tme.is_active = TRUE
         AND (tme.expires_at IS NULL OR tme.expires_at > NOW())
       ORDER BY tme.module_code`,
      [],
    );
    return result.rows.map((r: any) => r.module_code);
  } catch (err) {
    logger.warn(`[ShellContract] Failed to resolve user modules tenant="${tenantId}" user="${userId}": ${(err as Error).message}`);
    return [];
  }
}
