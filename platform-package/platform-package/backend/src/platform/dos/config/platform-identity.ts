/**
 * DOS Platform Identity Configuration
 *
 * Centralizes ALL platform and deployment identity values that were
 * previously hardcoded across config files. Every value is resolved
 * from environment variables with product-neutral fallbacks.
 *
 * NO product names (shahin, agrc, grc) may appear as defaults here.
 * Products register their identity through product bootstrap hooks.
 *
 * Law 15: Product removable principle — removing any product must
 * not break these defaults.
 *
 * @owner DOS
 */

// ── Platform Identity ───────────────────────────────────────────

export const PLATFORM_KEY = process.env.PLATFORM_KEY || 'dos';
export const PLATFORM_NAME_EN = process.env.PLATFORM_NAME || 'Dogan-AI-OS';
export const PLATFORM_NAME_AR = process.env.PLATFORM_NAME_AR || 'نظام دوغان الذكي';
export const PLATFORM_VERSION = process.env.PLATFORM_VERSION || '1.0.0';

// ── Default Product Key ─────────────────────────────────────────
// Resolved from env. Products register at startup. If no product
// is registered, platform runs in product-less mode (admin only).

export const DEFAULT_PRODUCT_KEY = process.env.DEFAULT_PRODUCT_KEY || '';

export function getDefaultProductKey(): string {
  return _registeredDefaultProductKey || DEFAULT_PRODUCT_KEY;
}

let _registeredDefaultProductKey: string = '';

/**
 * Called by the first product bootstrap hook to set the default product.
 * Platform code should call getDefaultProductKey() not read DEFAULT_PRODUCT_KEY directly.
 */
export function registerDefaultProduct(productKey: string): void {
  if (!_registeredDefaultProductKey) {
    _registeredDefaultProductKey = productKey;
  }
}

// ── Database Identity ───────────────────────────────────────────
// Neutral defaults. Products/deployments override via env vars.

export const DB_NAME = process.env.DB_DATABASE || process.env.PG_DATABASE || 'dos_platform';
export const DB_USER = process.env.DB_USER || process.env.PG_USER || 'dogan';
export const DB_HOST = process.env.DB_HOST || process.env.PG_HOST || 'localhost';
export const DB_PORT = parseInt(process.env.DB_PORT || process.env.PG_PORT || '5432', 10);

// ── Redis Identity ──────────────────────────────────────────────

export const REDIS_PREFIX = process.env.DOS_REDIS_PREFIX || process.env.REDIS_PREFIX || 'dos:';

// ── Observability Identity ──────────────────────────────────────

export const OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'dos-backend';
export const METRICS_PREFIX = process.env.METRICS_PREFIX || 'dos_';
export const LANGFUSE_PROJECT = process.env.LANGFUSE_PROJECT || process.env.LANGCHAIN_PROJECT || 'dos';

// ── Analytics Identity ──────────────────────────────────────────

export const CLICKHOUSE_DATABASE = process.env.CLICKHOUSE_DATABASE || 'platform_analytics';
export const AGE_GRAPH_NAME = process.env.AGE_GRAPH_NAME || 'dos_graph';

// ── Queue Identity ──────────────────────────────────────────────

export const PGMQ_QUEUE_PREFIX = process.env.PGMQ_QUEUE_PREFIX || 'platform_';

// ── API Identity ────────────────────────────────────────────────

export const API_TITLE = process.env.API_TITLE || 'DOS Platform API';
export const API_DESCRIPTION = process.env.API_DESCRIPTION || 'Dogan-AI-OS — Multi-tenant Platform API';
export const API_CONTACT_NAME = process.env.API_CONTACT_NAME || 'Platform Support';
export const API_CONTACT_EMAIL = process.env.API_CONTACT_EMAIL || '';

// ── Deployment Identity ─────────────────────────────────────────

export const PM2_APP_NAME = process.env.PM2_APP_NAME || 'dos-backend';
export const LOG_DIR = process.env.LOG_DIR || '/var/log/dos';
export const APP_ROOT = process.env.APP_ROOT || '/opt/dos/backend';

// ── Product Registration ────────────────────────────────────────
// Products register their identity at startup. Platform code reads
// from here instead of hardcoding product names.

interface RegisteredProduct {
  productKey: string;
  nameEn: string;
  nameAr: string;
  brandUrl: string;
}

const _registeredProducts = new Map<string, RegisteredProduct>();

export function registerProductIdentity(product: RegisteredProduct): void {
  _registeredProducts.set(product.productKey, product);
}

export function getRegisteredProduct(productKey: string): RegisteredProduct | undefined {
  return _registeredProducts.get(productKey);
}

export function getAllRegisteredProducts(): RegisteredProduct[] {
  return Array.from(_registeredProducts.values());
}

export function hasRegisteredProducts(): boolean {
  return _registeredProducts.size > 0;
}
