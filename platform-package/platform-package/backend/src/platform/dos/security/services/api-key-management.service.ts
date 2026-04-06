// @ts-nocheck
// ============================================
// Shahin GRC — API Key Management Service
// Manages API keys for programmatic access to
// the platform (developer portal, integrations,
// third-party applications)
// ============================================

import * as crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { safeQuery } from '../../../../config/database';
import type { GenericRow } from '../../../../types/db-rows.types';

// ── Types ──────────────────────────────────────────────

/** Allowed scope values for API key access control. */
export type ApiKeyScope =
  | 'compliance.program.read'
  | 'compliance.program.write'
  | 'risk.record.read'
  | 'risk.record.write'
  | 'evidence.item.read'
  | 'evidence.item.write'
  | 'audit.record.read'
  | 'audit.record.write'
  | 'governance.record.read'
  | 'admin.system.packs'
  | 'admin.system.users'
  | '*';

/** Stored API key record (never includes the raw key or hash in list responses). */
export interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;       // first 8 chars for display: "agrc_xxxx"
  keyHash: string;         // SHA-256 hash of the full key
  scopes: ApiKeyScope[];
  status: 'active' | 'revoked' | 'expired';
  rateLimit: number;       // max requests per minute
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdBy: string;
  metadata: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

/** Input for creating a new API key. */
export interface ApiKeyCreateInput {
  name: string;
  scopes: ApiKeyScope[];
  expiresInDays?: number;
  rateLimit?: number;
  metadata?: Record<string, any>;
}

/** Result returned once upon key creation (full key shown only here). */
export interface ApiKeyCreateResult {
  key: string;             // full raw key — shown ONCE
  keyPrefix: string;
  id: string;
  expiresAt: string | null;
}

/** Result of validating an incoming API key. */
export interface ApiKeyValidationResult {
  valid: boolean;
  tenantId?: string;
  keyId?: string;
  scopes?: ApiKeyScope[];
  rateLimit?: number;
  reason?: string;
}

/** Single usage log entry. */
export interface ApiKeyUsageRecord {
  keyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  timestamp: string;
  ipAddress: string;
}

/** Aggregated usage summary for a key. */
export interface ApiKeyUsageSummary {
  keyId: string;
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  topEndpoints: { endpoint: string; count: number }[];
  lastUsed: string | null;
}

// ── Key Generation ─────────────────────────────────────

/** Hash a raw API key with SHA-256. */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/** Extract a safe display prefix from the raw key: "agrc_xxxx...xxxx". */
export function generateKeyPrefix(rawKey: string): string {
  // Show the prefix portion (agrc_live_) plus first 4 hex chars and last 4 hex chars
  const hexPart = rawKey.replace('agrc_live_', '');
  return `agrc_${hexPart.slice(0, 4)}...${hexPart.slice(-4)}`;
}

/**
 * Generate a new API key with cryptographically random bytes.
 * The full key is returned exactly once; only the hash is stored.
 */
export async function generateApiKey(
  tenantId: string,
  userId: string,
  input: ApiKeyCreateInput
): Promise<ApiKeyCreateResult> {
  // Generate cryptographically random key: agrc_live_ + 40 hex chars
  const randomHex = crypto.randomBytes(20).toString('hex'); // 20 bytes = 40 hex chars
  const rawKey = `agrc_live_${randomHex}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = generateKeyPrefix(rawKey);

  const rateLimit = input.rateLimit ?? 60; // default 60 req/min
  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 86400000).toISOString()
    : null;
  const metadata = input.metadata ?? {};

  const result = await safeQuery(
    `INSERT INTO public.api_keys
       (tenant_id, name, key_prefix, key_hash, scopes, status, rate_limit,
        expires_at, created_by, metadata)
     VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9)
     RETURNING id, expires_at`,
    [
      tenantId,
      input.name,
      keyPrefix,
      keyHash,
      JSON.stringify(input.scopes),
      rateLimit,
      expiresAt,
      userId,
      JSON.stringify(metadata),
    ]
  );

  const row = result.rows[0];
  return {
    key: rawKey,
    keyPrefix,
    id: row.id,
    expiresAt: row.expires_at,
  };
}

// ── Key CRUD ───────────────────────────────────────────

/** List all API keys for a tenant (never returns hash or full key). */
export async function listApiKeys(tenantId: string): Promise<Omit<ApiKey, 'keyHash'>[]> {
  const result = await safeQuery(
    `SELECT id, tenant_id, name, key_prefix, scopes, status, rate_limit,
            expires_at, last_used_at, created_by, metadata, created_at, updated_at
       FROM public.api_keys
      WHERE tenant_id = $1
      ORDER BY created_at DESC`,
    [tenantId]
  );
  return result.rows.map(mapKeyRow);
}

/** Get a single API key's metadata by ID. */
export async function getApiKey(tenantId: string, keyId: string): Promise<Omit<ApiKey, 'keyHash'> | null> {
  const result = await safeQuery(
    `SELECT id, tenant_id, name, key_prefix, scopes, status, rate_limit,
            expires_at, last_used_at, created_by, metadata, created_at, updated_at
       FROM public.api_keys
      WHERE tenant_id = $1 AND id = $2`,
    [tenantId, keyId]
  );
  if (result.rows.length === 0) return null;
  return mapKeyRow(result.rows[0]);
}

/** Update mutable fields of an API key (name, scopes, rateLimit, metadata). */
export async function updateApiKey(
  tenantId: string,
  keyId: string,
  updates: Partial<Pick<ApiKey, 'name' | 'scopes' | 'rateLimit' | 'metadata'>>
): Promise<Omit<ApiKey, 'keyHash'> | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (updates.name !== undefined) {
    sets.push(`name = $${idx++}`);
    params.push(updates.name);
  }
  if (updates.scopes !== undefined) {
    sets.push(`scopes = $${idx++}`);
    params.push(JSON.stringify(updates.scopes));
  }
  if (updates.rateLimit !== undefined) {
    sets.push(`rate_limit = $${idx++}`);
    params.push(updates.rateLimit);
  }
  if (updates.metadata !== undefined) {
    sets.push(`metadata = $${idx++}`);
    params.push(JSON.stringify(updates.metadata));
  }

  if (sets.length === 0) return getApiKey(tenantId, keyId);

  sets.push(`updated_at = NOW()`);
  params.push(tenantId, keyId);

  const result = await safeQuery(
    `UPDATE public.api_keys
        SET ${sets.join(', ')}
      WHERE tenant_id = $${idx++} AND id = $${idx}
      RETURNING id, tenant_id, name, key_prefix, scopes, status, rate_limit,
                expires_at, last_used_at, created_by, metadata, created_at, updated_at`,
    params
  );
  if (result.rows.length === 0) return null;
  return mapKeyRow(result.rows[0]);
}

/** Revoke an API key — marks it as revoked so it can no longer authenticate. */
export async function revokeApiKey(tenantId: string, keyId: string, userId: string): Promise<boolean> {
  const result = await safeQuery(
    `UPDATE public.api_keys
        SET status = 'revoked', updated_at = NOW(), metadata = metadata || $1
      WHERE tenant_id = $2 AND id = $3 AND status = 'active'
      RETURNING id`,
    [JSON.stringify({ revokedBy: userId, revokedAt: new Date().toISOString() }), tenantId, keyId]
  );
  return (result.rowCount ?? 0) > 0;
}

/** Rotate an API key — revoke the old key and create a new one with the same config. */
export async function rotateApiKey(
  tenantId: string,
  keyId: string,
  userId: string
): Promise<ApiKeyCreateResult | null> {
  // Fetch current key config before revoking
  const existing = await safeQuery(
    `SELECT name, scopes, rate_limit, metadata, expires_at
       FROM public.api_keys
      WHERE tenant_id = $1 AND id = $2 AND status = 'active'`,
    [tenantId, keyId]
  );
  if (existing.rows.length === 0) return null;

  const row = existing.rows[0];

  // Revoke the old key
  await revokeApiKey(tenantId, keyId, userId);

  // Compute remaining days if the old key had an expiration
  let expiresInDays: number | undefined;
  if (row.expires_at) {
    const remainingMs = new Date(row.expires_at).getTime() - Date.now();
    expiresInDays = Math.max(1, Math.ceil(remainingMs / 86400000));
  }

  // Create a new key with the same configuration
  const scopes = typeof row.scopes === 'string' ? JSON.parse(row.scopes) : row.scopes;
  const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata ?? {});
  return generateApiKey(tenantId, userId, {
    name: row.name,
    scopes,
    expiresInDays,
    rateLimit: row.rate_limit,
    metadata: { ...metadata, rotatedFrom: keyId },
  });
}

/** Delete expired keys that have been expired for more than 30 days. */
export async function deleteExpiredKeys(): Promise<number> {
  const result = await safeQuery(
    `DELETE FROM public.api_keys
      WHERE status = 'expired'
        AND expires_at < NOW() - INTERVAL '30 days'`
  );
  return result.rowCount ?? 0;
}

// ── Validation & Authentication ────────────────────────

/**
 * Validate an incoming raw API key.
 * Hashes it, looks up the record, checks status/expiry, and updates lastUsedAt.
 */
export async function validateApiKey(rawKey: string): Promise<ApiKeyValidationResult> {
  if (!rawKey || !rawKey.startsWith('agrc_live_')) {
    return { valid: false, reason: 'Invalid key format' };
  }

  const keyHash = hashApiKey(rawKey);

  const result = await safeQuery(
    `SELECT id, tenant_id, scopes, status, rate_limit, expires_at
       FROM public.api_keys
      WHERE key_hash = $1`,
    [keyHash]
  );

  if (result.rows.length === 0) {
    return { valid: false, reason: 'Key not found' };
  }

  const row = result.rows[0];

  if (row.status === 'revoked') {
    return { valid: false, reason: 'Key has been revoked' };
  }

  if (row.status === 'expired' || (row.expires_at && new Date(row.expires_at) < new Date())) {
    // Mark as expired if not already
    if (row.status !== 'expired') {
      await safeQuery(
        `UPDATE public.api_keys SET status = 'expired', updated_at = NOW() WHERE id = $1`,
        [row.id]
      );
    }
    return { valid: false, reason: 'Key has expired' };
  }

  // Update lastUsedAt timestamp
  await safeQuery(
    `UPDATE public.api_keys SET last_used_at = NOW() WHERE id = $1`,
    [row.id]
  );

  const scopes = typeof row.scopes === 'string' ? JSON.parse(row.scopes) : row.scopes;

  return {
    valid: true,
    tenantId: row.tenant_id,
    keyId: row.id,
    scopes,
    rateLimit: row.rate_limit,
  };
}

/** Check whether a key's scopes satisfy a required scope (wildcard '*' grants all). */
export function checkScope(keyScopes: ApiKeyScope[], requiredScope: ApiKeyScope): boolean {
  if (keyScopes.includes('*')) return true;
  if (keyScopes.includes(requiredScope)) return true;

  // Check read access when write is granted (write implies read)
  const readPrefix = requiredScope.replace(/^read:/, '');
  if (requiredScope.startsWith('read:') && keyScopes.includes(`write:${readPrefix}` as ApiKeyScope)) {
    return true;
  }

  return false;
}

/**
 * Check if a key has exceeded its rate limit using a sliding window counter.
 * Returns true if the request is allowed, false if rate-limited.
 */
export async function checkRateLimit(
  keyId: string,
  windowMs: number = 60000,
  maxRequests: number = 60
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMs).toISOString();

  const result = await safeQuery(
    `SELECT COUNT(*) AS cnt
       FROM public.api_key_usage
      WHERE key_id = $1 AND timestamp >= $2`,
    [keyId, windowStart]
  );

  const count = parseInt(result.rows[0]?.cnt || '0', 10);
  return count < maxRequests;
}

// ── Usage Tracking ─────────────────────────────────────

/** Record a single API key usage event. */
export async function recordUsage(
  keyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  ipAddress: string
): Promise<void> {
  await safeQuery(
    `INSERT INTO public.api_key_usage
       (key_id, endpoint, method, status_code, response_time_ms, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [keyId, endpoint, method, statusCode, responseTimeMs, ipAddress]
  );
}

/** Get aggregated usage summary for an API key over the specified number of days. */
export async function getUsageSummary(
  tenantId: string,
  keyId: string,
  days: number = 30
): Promise<ApiKeyUsageSummary> {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // Verify the key belongs to this tenant
  const keyCheck = await safeQuery(
    `SELECT 1 FROM public.api_keys WHERE id = $1 AND tenant_id = $2`,
    [keyId, tenantId]
  );
  if (keyCheck.rows.length === 0) {
    return { keyId, totalRequests: 0, successRate: 0, avgResponseTime: 0, topEndpoints: [], lastUsed: null };
  }

  // Aggregate stats
  const stats = await safeQuery(
    `SELECT COUNT(*) AS total,
            AVG(CASE WHEN status_code < 400 THEN 1.0 ELSE 0.0 END) AS success_rate,
            AVG(response_time_ms) AS avg_response_time,
            MAX(timestamp) AS last_used
       FROM public.api_key_usage
      WHERE key_id = $1 AND timestamp >= $2`,
    [keyId, since]
  );

  // Top endpoints by request count
  const endpoints = await safeQuery(
    `SELECT endpoint, COUNT(*) AS cnt
       FROM public.api_key_usage
      WHERE key_id = $1 AND timestamp >= $2
      GROUP BY endpoint
      ORDER BY cnt DESC
      LIMIT 10`,
    [keyId, since]
  );

  const row = stats.rows[0] || {};
  return {
    keyId,
    totalRequests: parseInt(row.total || '0', 10),
    successRate: parseFloat(row.success_rate || '0'),
    avgResponseTime: parseFloat(row.avg_response_time || '0'),
    topEndpoints: endpoints.rows.map((r: GenericRow) => ({ endpoint: r.endpoint, count: parseInt(r.cnt, 10) })),
    lastUsed: row.last_used || null,
  };
}

/** Get time-bucketed usage data for charts. */
export async function getUsageTimeline(
  tenantId: string,
  keyId: string,
  days: number = 7,
  granularity: 'hourly' | 'daily' = 'daily'
): Promise<{ bucket: string; requests: number; errors: number }[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const truncUnit = granularity === 'hourly' ? 'hour' : 'day';

  // Verify the key belongs to this tenant
  const keyCheck = await safeQuery(
    `SELECT 1 FROM public.api_keys WHERE id = $1 AND tenant_id = $2`,
    [keyId, tenantId]
  );
  if (keyCheck.rows.length === 0) return [];

  const result = await safeQuery(
    `SELECT date_trunc('${truncUnit}', timestamp) AS bucket,
            COUNT(*) AS requests,
            SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS errors
       FROM public.api_key_usage
      WHERE key_id = $1 AND timestamp >= $2
      GROUP BY bucket
      ORDER BY bucket ASC`,
    [keyId, since]
  );

  return result.rows.map((r: GenericRow) => ({
    bucket: r.bucket,
    requests: parseInt(r.requests, 10),
    errors: parseInt(r.errors || '0', 10),
  }));
}

/** Get top API key consumers by request count for a tenant. */
export async function getTopConsumers(
  tenantId: string,
  days: number = 30
): Promise<{ keyId: string; keyName: string; totalRequests: number }[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const result = await safeQuery(
    `SELECT k.id AS key_id, k.name AS key_name, COUNT(u.*) AS total
       FROM public.api_keys k
       LEFT JOIN public.api_key_usage u ON u.key_id = k.id AND u.timestamp >= $2
      WHERE k.tenant_id = $1
      GROUP BY k.id, k.name
      ORDER BY total DESC
      LIMIT 20`,
    [tenantId, since]
  );

  return result.rows.map((r: GenericRow) => ({
    keyId: r.key_id,
    keyName: r.key_name,
    totalRequests: parseInt(r.total, 10),
  }));
}

// ── Express Middleware ──────────────────────────────────

/**
 * Express middleware that authenticates requests via API key.
 * Looks for the key in `Authorization: Bearer agrc_...` or `X-API-Key` header.
 * On success, attaches tenantId, keyId, and scopes to req.
 */
export function apiKeyAuthMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let rawKey: string | undefined;

    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer agrc_')) {
      rawKey = authHeader.slice(7); // strip "Bearer "
    }

    // Fall back to X-API-Key header
    if (!rawKey) {
      rawKey = req.headers['x-api-key'] as string | undefined;
    }

    if (!rawKey) {
      res.status(401).json({ error: 'API key required', code: 'MISSING_API_KEY' });
      return;
    }

    const validation = await validateApiKey(rawKey);

    if (!validation.valid) {
      res.status(401).json({ error: validation.reason, code: 'INVALID_API_KEY' });
      return;
    }

    // Check rate limit
    const allowed = await checkRateLimit(
      validation.keyId!,
      60000,
      validation.rateLimit ?? 60
    );
    if (!allowed) {
      res.status(429).json({ error: 'Rate limit exceeded', code: 'RATE_LIMITED' });
      return;
    }

    // Attach API key context to the request
    req.apiKey = {
      tenantId: validation.tenantId,
      keyId: validation.keyId,
      scopes: validation.scopes,
    };

    next();
  };
}

/**
 * Middleware factory that checks if the authenticated API key has a required scope.
 * Must be used after apiKeyAuthMiddleware.
 */
export function requireScope(scope: ApiKeyScope) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKeyCtx = req.apiKey;

    if (!apiKeyCtx || !apiKeyCtx.scopes) {
      res.status(401).json({ error: 'API key context missing', code: 'NO_API_KEY_CONTEXT' });
      return;
    }

    if (!checkScope(apiKeyCtx.scopes as ApiKeyScope[], scope)) {
      res.status(403).json({
        error: `Insufficient scope. Required: ${scope}`,
        code: 'INSUFFICIENT_SCOPE',
      });
      return;
    }

    next();
  };
}

// ── Internal Helpers ───────────────────────────────────

/** Map a raw DB row to the public ApiKey shape (excluding keyHash). */
function mapKeyRow(row: unknown): Omit<ApiKey, 'keyHash'> {
  const scopes = typeof row.scopes === 'string' ? JSON.parse(row.scopes) : (row.scopes ?? []);
  const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata ?? {});
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    keyPrefix: row.key_prefix,
    scopes,
    status: row.status,
    rateLimit: row.rate_limit,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    createdBy: row.created_by,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
