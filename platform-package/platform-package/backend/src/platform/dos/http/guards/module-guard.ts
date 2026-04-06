// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { safeQuery, query, tenantSchema } from '../../../../config/database/database';

import {  logger } from '../../observability/logger.service';
import { ALWAYS_ON_MODULES, GRC_CORE_MODULES } from '../../modules/registry/module-classification';


export { GRC_CORE_MODULES };

// ── Types ──

export interface PlatformSnapshot {
  enabledProductKeys: Set<string>;
  modulesByProduct: Map<string, ProductModulesSnapshot>;
  fetchedAt: number;
}

export interface ProductModulesSnapshot {
  enabled: Set<string>;
  required: Set<string>;
}

export interface TenantEntitlements {
  grc_enabled: boolean;
  qiyas_enabled: boolean;
  licensed_modules: string[];
}

export interface ProductsModulesConfigResponse {
  platform: { key: string; labelEn: string; labelAr: string };
  products: Array<{ productKey: string; businessLabel: string; enabled: boolean }>;
  modulesByProduct: Record<string, string[]>;
  visibleModules: string[];
  sharedServices: string[];
  internalKeyToBusinessLabel: Record<string, string>;
}

// ── Product Token Map (dynamic, populated by product bootstrap hooks) ──
// Products register at startup via registerProductToken(). No hardcoded product names.
const PRODUCT_TOKEN_MAP = new Map<string, string>();
const PRODUCT_LABELS = new Map<string, string>();

/** Called by product bootstrap hooks to register token aliases */
export function registerProductToken(alias: string, productKey: string, label?: string): void {
  PRODUCT_TOKEN_MAP.set(alias, productKey);
  if (label) PRODUCT_LABELS.set(productKey, label);
}

// Backward compat: product hooks call this at startup
// e.g. registerProductToken('grc', 'agrc', 'Shahin-AI');
// e.g. registerProductToken('qiyas', 'qiyas');

const _registeredProductKeys = new Set<string>();

/** Register a product key for entitlement checking */
export function registerProductKey(productKey: string): void {
  _registeredProductKeys.add(productKey);
}

// ── Caches ──

interface AllowlistCacheEntry {
  modules: Set<string>;
  ts: number;
}

const allowlistCache = new Map<string, AllowlistCacheEntry>();
const CACHE_TTL = 60_000;

let platformSnapshotCache: PlatformSnapshot | null = null;
let platformSnapshotTs = 0;
const PLATFORM_CACHE_TTL = 120_000;

// ── Cache invalidation ──

export function invalidateTenantAllowlist(tenantId: string): void {
  allowlistCache.delete(tenantId);
}

export function invalidateAllAllowlistCaches(): void {
  allowlistCache.clear();
  platformSnapshotCache = null;
  platformSnapshotTs = 0;
}

export function invalidateModuleCache(tenantId: string): void {
  invalidateTenantAllowlist(tenantId);
}

// ── Core allowlist logic ──

export function computeAllowedModules(
  platform: PlatformSnapshot,
  entitlements: TenantEntitlements,
): Set<string> {
  const allowed = new Set<string>();

  const normalizedLicensed = (entitlements.licensed_modules || [])
    .map(m => m.trim().toLowerCase())
    .filter(Boolean);

  const expandedModules = new Set<string>();
  for (const token of normalizedLicensed) {
    const productKey = PRODUCT_TOKEN_MAP.get(token);
    if (productKey && platform.modulesByProduct.has(productKey)) {
      const productEnabled =
        (token === 'grc' && entitlements.grc_enabled) ||
        (token === 'qiyas' && entitlements.qiyas_enabled);
      if (productEnabled && platform.enabledProductKeys.has(productKey)) {
        const productModules = platform.modulesByProduct.get(productKey)!;
        for (const mod of productModules.enabled) {
          expandedModules.add(mod);
        }
      }
    } else {
      expandedModules.add(token);
    }
  }

  for (const [productKey, productModules] of platform.modulesByProduct) {
    if (!platform.enabledProductKeys.has(productKey)) continue;

    // Dynamic product entitlement check — no hardcoded product names
    const entitlementKey = `${productKey}_enabled`;
    const productEnabled =
      (entitlementKey in entitlements && (entitlements as any)[entitlementKey]) ||
      (entitlements.licensed_modules?.includes(productKey)) ||
      (!_registeredProductKeys.has(productKey));

    if (!productEnabled) continue;

    for (const mod of productModules.required) {
      allowed.add(mod);
    }

    for (const mod of expandedModules) {
      if (productModules.enabled.has(mod)) {
        allowed.add(mod);
      }
    }
  }

  return allowed;
}

// ── Platform snapshot from DB ──

async function fetchPlatformSnapshot(): Promise<PlatformSnapshot> {
  const now = Date.now();
  if (platformSnapshotCache && (now - platformSnapshotTs) < PLATFORM_CACHE_TTL) {
    return platformSnapshotCache;
  }

  const enabledProductKeys = new Set<string>();
  const modulesByProduct = new Map<string, ProductModulesSnapshot>();

  try {
    const { rows: productRows } = await query(
      `SELECT product_key FROM public.platform_products WHERE enabled = TRUE`,
    );
    for (const r of productRows) {
      if (r.product_key) enabledProductKeys.add(r.product_key);
    }
  } catch { /* table may not exist */ }

  try {
    const { rows: modRows } = await query(
      `SELECT product_key, module_code, enabled, is_required
       FROM public.product_modules WHERE enabled = TRUE`,
    );
    for (const r of modRows) {
      if (!modulesByProduct.has(r.product_key)) {
        modulesByProduct.set(r.product_key, { enabled: new Set(), required: new Set() });
      }
      const entry = modulesByProduct.get(r.product_key)!;
      entry.enabled.add(r.module_code);
      if (r.is_required) entry.required.add(r.module_code);
    }
  } catch { /* table may not exist */ }

  const snapshot: PlatformSnapshot = { enabledProductKeys, modulesByProduct, fetchedAt: now };
  platformSnapshotCache = snapshot;
  platformSnapshotTs = now;
  return snapshot;
}

async function fetchTenantEntitlements(tenantId: string): Promise<TenantEntitlements> {
  try {
    const { rows } = await query(
      `SELECT grc_enabled, qiyas_enabled, licensed_modules
       FROM public.tenant_module_entitlements WHERE tenant_id = $1 LIMIT 1`,
      [tenantId],
    );
    if (rows[0]) {
      return {
        grc_enabled: rows[0].grc_enabled ?? true,
        qiyas_enabled: rows[0].qiyas_enabled ?? false,
        licensed_modules: rows[0].licensed_modules ?? [],
      };
    }
  } catch { /* table may not exist */ }
  return { grc_enabled: true, qiyas_enabled: false, licensed_modules: [] };
}

// ── Public API: getTenantAllowedModules ──

export async function getTenantAllowedModules(tenantId: string): Promise<Set<string>> {
  const cached = allowlistCache.get(tenantId);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL) return cached.modules;

  const platform = await fetchPlatformSnapshot();
  const entitlements = await fetchTenantEntitlements(tenantId);
  const allowed = computeAllowedModules(platform, entitlements);

  for (const m of ALWAYS_ON_MODULES) allowed.add(m);

  allowlistCache.set(tenantId, { modules: allowed, ts: Date.now() });
  return allowed;
}

// ── Products-Modules config builder ──

export function buildProductsModulesConfigFromSnapshot(
  platform: PlatformSnapshot,
  entitlements: TenantEntitlements,
): ProductsModulesConfigResponse {
  const allowed = computeAllowedModules(platform, entitlements);

  const products: ProductsModulesConfigResponse['products'] = [];
  const modulesByProduct: Record<string, string[]> = {};
  const internalKeyToBusinessLabel: Record<string, string> = {};

  for (const productKey of platform.enabledProductKeys) {
    // Dynamic product entitlement check — no hardcoded product names
    const entitlementKey = `${productKey}_enabled`;
    const productEnabled =
      (entitlementKey in entitlements && (entitlements as any)[entitlementKey]) ||
      (entitlements.licensed_modules?.includes(productKey)) ||
      (!_registeredProductKeys.has(productKey));

    if (!productEnabled) continue;

    const label = PRODUCT_LABELS.get(productKey) || productKey;
    products.push({ productKey, businessLabel: label, enabled: true });
    internalKeyToBusinessLabel[productKey] = label;

    const productMods = platform.modulesByProduct.get(productKey);
    if (productMods) {
      modulesByProduct[productKey] = [...productMods.enabled].filter(m => allowed.has(m));
    }
  }

  const visibleModules = [...allowed].sort();
  const sharedServices = [...ALWAYS_ON_MODULES].filter(m => !GRC_CORE_MODULES.has(m));

  return {
    platform: {
      key: process.env.PLATFORM_KEY || 'dos',
      labelEn: process.env.PLATFORM_NAME || 'Dogan-AI-OS',
      labelAr: process.env.PLATFORM_NAME_AR || 'نظام دوغان الذكي',
    },
    products,
    modulesByProduct,
    visibleModules,
    sharedServices,
    internalKeyToBusinessLabel,
  };
}

export async function getProductsModulesConfigForTenant(
  tenantId: string,
): Promise<ProductsModulesConfigResponse> {
  const platform = await fetchPlatformSnapshot();
  const entitlements = await fetchTenantEntitlements(tenantId);
  return buildProductsModulesConfigFromSnapshot(platform, entitlements);
}

// ── Module operating states ──

export async function getTenantModuleOperatingStates(
  tenantId: string,
): Promise<Map<string, { state: string; activation_source: string; trial_expiry_at: string | null }>> {
  const map = new Map<string, { state: string; activation_source: string; trial_expiry_at: string | null }>();

  try {
    const { rows } = await safeQuery(
      `SELECT module_code, state, activation_source, trial_expiry_at
       FROM public.module_operating_states
       WHERE tenant_id = $1 AND is_active = TRUE`,
      [tenantId],
    );
    for (const r of rows) {
      map.set(r.module_code, {
        state: r.state ?? 'on',
        activation_source: r.activation_source ?? 'auto_inferred',
        trial_expiry_at: r.trial_expiry_at ?? null,
      });
    }
  } catch { /* table may not exist */ }

  return map;
}

// ── Middleware: moduleGuard ──

export function moduleGuard(moduleCode: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (ALWAYS_ON_MODULES.has(moduleCode)) { next(); return; }
    const tenantId = req.tenantId;
    if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
    try {
      const allowedModules = await getTenantAllowedModules(tenantId);
      if (allowedModules.has(moduleCode)) { next(); return; }
      res.status(403).json({ error: `Module ${moduleCode} not licensed`, code: 'MODULE_NOT_LICENSED' });
    } catch (err) {
      logger.error(`[DOS] module-guard DB error for ${moduleCode}:`, err);
      res.status(500).json({ error: 'Module licensing check unavailable', code: 'MODULE_CHECK_ERROR' });
    }
  };
}

export const moduleAccessGuard = moduleGuard;

// ── Middleware: subscriptionStatusGuard ──

export function subscriptionStatusGuard() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) { next(); return; }

    const url = req.originalUrl || '';
    const isExempt =
      url.includes('/auth/') ||
      url.includes('/health') ||
      url.includes('/config/') ||
      url.includes('/onboarding/') ||
      url.includes('/bootstrap');
    if (isExempt) { next(); return; }

    try {
      const { rows } = await query(
        `SELECT status FROM public.subscriptions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [tenantId],
      );
      const status = rows[0]?.status;
      if (status === 'suspended' || status === 'cancelled') {
        res.status(402).json({
          error: 'Subscription is not active',
          code: 'SUBSCRIPTION_INACTIVE',
          status,
        });
        return;
      }
      next();
    } catch {
      next();
    }
  };
}

// ── Middleware: tierGuard ──

/** @deprecated Fallback only — runtime loads from subscription_tiers table. */
const TIER_LEVELS_FALLBACK: Record<string, number> = {
  free: 0, starter: 1, professional: 2, enterprise: 3, unlimited: 4,
};

const tierCache = new Map<string, { map: Record<string, number>; ts: number }>();
const TIER_CACHE_TTL = 120_000;

async function __getTierLevels(schema: string): Promise<Record<string, number>> {
  const cached = tierCache.get(schema);
  if (cached && Date.now() - cached.ts < TIER_CACHE_TTL) return cached.map;
  try {
    const { safeQuery } = await import('../../../../config/database/database');
    const { rows } = await safeQuery(`SELECT tier_code, priority FROM "${schema}".subscription_tiers WHERE is_active = TRUE`);
    const map: Record<string, number> = {};
    for (const r of rows) map[r.tier_code] = r.priority;
    tierCache.set(schema, { map, ts: Date.now() });
    return map;
  } catch { return TIER_LEVELS_FALLBACK; }
}

export function tierGuard(requiredTier: string) {
  const requiredLevel = TIER_LEVELS_FALLBACK[requiredTier] ?? 0;
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (requiredLevel === 0) { next(); return; }
    const tenantId = req.tenantId;
    if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
    try {
      const { rows } = await query(
        `SELECT tier FROM public.subscriptions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [tenantId],
      );
      const tenantTier = rows[0]?.tier || 'free';
      const tenantLevel = TIER_LEVELS[tenantTier] ?? 0;
      if (tenantLevel >= requiredLevel) { next(); return; }
      res.status(403).json({
        error: `Tier ${requiredTier} required, current: ${tenantTier}`,
        code: 'TIER_INSUFFICIENT',
        requiredTier,
        currentTier: tenantTier,
      });
    } catch (err) {
      logger.error('[DOS] tier-guard error:', err);
      res.status(500).json({ error: 'Tier check unavailable', code: 'TIER_CHECK_ERROR' });
    }
  };
}

// ── Middleware: aiGuardrailsMiddleware ──

export const aiGuardrailsMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const tenantId = req.tenantId;
  if (!tenantId) { next(); return; }
  try {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT default_operation_mode FROM "${schema}".tenant_settings LIMIT 1`,
    );
    const mode = rows[0]?.default_operation_mode ?? 'human_only';
    req.aiOperationMode = mode;

    if (mode === 'disabled') {
      res.status(403).json({ error: 'AI features are disabled for this tenant', code: 'AI_DISABLED' });
      return;
    }
    next();
  } catch {
    req.aiOperationMode = 'human_only';
    next();
  }
};

function productGuard(productKey: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
    try {
      const platform = await fetchPlatformSnapshot();
      if (platform.enabledProductKeys.has(productKey)) { next(); return; }
      res.status(403).json({ error: `Product ${productKey} not enabled`, code: 'PRODUCT_NOT_ENABLED' });
    } catch (err) {
      logger.error(`[DOS] product-guard error for ${productKey}:`, err);
      res.status(500).json({ error: 'Product check unavailable', code: 'PRODUCT_CHECK_ERROR' });
    }
  };
}

export { productGuard };
