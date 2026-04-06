// ============================================
// DOS — Canonical Profile Loader
// Merges identity, org hierarchy, roles, competencies, and
// preferences into a single canonical user profile object.
// Uses in-memory LRU cache with configurable TTL for hot paths.
// Owner: DOS (profile aggregation is a platform concern)
// ============================================

import { safeQuery, tenantSchema } from '../../../config/database';
import { computeProfileCompleteness } from './profile-completeness.service';
import { logger } from '../../../platform/dos/observability/services/logger.service';

// ── Types ──────────────────────────────────────────────────────────

export interface CanonicalProfile {
  identity: {
    userId: string;
    name: string;
    email: string;
    phone: string | null;
    profilePhotoUrl: string | null;
    mfaEnabled: boolean;
    status: string;
    createdAt: string | null;
    lastLoginAt: string | null;
  };
  organization: {
    orgUnitId: string | null;
    orgUnitName: string | null;
    department: string | null;
    position: string | null;
    managerId: string | null;
    managerName: string | null;
  };
  roles: string[];
  competencies: string[];
  preferences: Record<string, unknown>;
  completeness: number;
}

export interface CanonicalProfileMinimal {
  userId: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
}

// ── Full canonical profile ─────────────────────────────────────────

/**
 * Loads the full canonical profile for a user by aggregating data
 * from identity, org hierarchy, role assignments, competencies,
 * preferences, and profile completeness.
 *
 * Used by: profile pages, admin dashboards, agent acting-on-behalf-of,
 * and any context that needs the full user picture.
 */
export async function loadCanonicalProfile(
  tenantId: string,
  userId: string,
): Promise<CanonicalProfile> {
  const ts = tenantSchema(tenantId);

  try {
    // ── 1. Identity ─────────────────────────────────────────────
    const identity = await loadIdentity(ts, userId);

    // ── 2. Organization context ─────────────────────────────────
    const organization = await loadOrganization(ts, userId);

    // ── 3. Roles ────────────────────────────────────────────────
    const roles = await loadRoles(ts, userId);

    // ── 4. Competencies ─────────────────────────────────────────
    const competencies = await loadCompetencies(ts, userId);

    // ── 5. Preferences ──────────────────────────────────────────
    const preferences = await loadPreferences(ts, userId);

    // ── 6. Profile completeness ─────────────────────────────────
    let completeness = 0;
    try {
      const result = await computeProfileCompleteness(tenantId, userId);
      completeness = result.score;
    } catch {
      completeness = 0;
    }

    return { identity, organization, roles, competencies, preferences, completeness };
  } catch (err: unknown) {
    // Return a safe empty profile on total failure
    return {
      identity: {
        userId,
        name: '',
        email: '',
        phone: null,
        profilePhotoUrl: null,
        mfaEnabled: false,
        status: 'unknown',
        createdAt: null,
        lastLoginAt: null,
      },
      organization: {
        orgUnitId: null,
        orgUnitName: null,
        department: null,
        position: null,
        managerId: null,
        managerName: null,
      },
      roles: [],
      competencies: [],
      preferences: {},
      completeness: 0,
    };
  }
}

// ── Minimal profile (hot path) ─────────────────────────────────────

/**
 * Loads a minimal profile for lightweight contexts (tokens, headers,
 * quick lookups). Avoids expensive joins.
 */
export async function loadCanonicalProfileMinimal(
  tenantId: string,
  userId: string,
): Promise<CanonicalProfileMinimal> {
  const ts = tenantSchema(tenantId);

  try {
    const userResult = await safeQuery(
      `SELECT u.id, u.name, u.email
       FROM ${ts}.users u
       WHERE u.id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return { userId, name: '', email: '', role: 'unknown', tenantId };
    }

    const user = userResult.rows[0];

    // Get primary role (highest-tier active assignment)
    const roleResult = await safeQuery(
      `SELECT r.code FROM ${ts}.user_role_assignments ura
       JOIN ${ts}.roles r ON r.id = ura.role_id
       WHERE ura.user_id = $1 AND ura.is_active = true
         AND (ura.valid_until IS NULL OR ura.valid_until > NOW())
       ORDER BY
         CASE r.tier
           WHEN 'platform' THEN 1
           WHEN 'tenant' THEN 2
           WHEN 'module' THEN 3
           ELSE 4
         END ASC
       LIMIT 1`,
      [userId],
    );

    const role = roleResult.rows[0]?.code ?? 'standard_user';

    return {
      userId: user.id,
      name: user.name ?? '',
      email: user.email ?? '',
      role,
      tenantId,
    };
  } catch (err: unknown) {
    return { userId, name: '', email: '', role: 'unknown', tenantId };
  }
}

// ── Internal loaders ───────────────────────────────────────────────

async function loadIdentity(ts: string, userId: string): Promise<CanonicalProfile['identity']> {
  const result = await safeQuery(
    `SELECT id, name, email, phone, profile_photo_url, mfa_enabled, status, created_at, last_login_at
     FROM ${ts}.users
     WHERE id = $1`,
    [userId],
  );

  if (result.rows.length === 0) {
    return {
      userId,
      name: '',
      email: '',
      phone: null,
      profilePhotoUrl: null,
      mfaEnabled: false,
      status: 'not_found',
      createdAt: null,
      lastLoginAt: null,
    };
  }

  const u = result.rows[0];
  return {
    userId: u.id,
    name: u.name ?? '',
    email: u.email ?? '',
    phone: u.phone ?? null,
    profilePhotoUrl: u.profile_photo_url ?? null,
    mfaEnabled: u.mfa_enabled === true,
    status: u.status ?? 'active',
    createdAt: u.created_at ? String(u.created_at) : null,
    lastLoginAt: u.last_login_at ? String(u.last_login_at) : null,
  };
}

async function loadOrganization(ts: string, userId: string): Promise<CanonicalProfile['organization']> {
  // Try extended profile first
  const extResult = await safeQuery(
    `SELECT upe.org_unit, upe.department, upe.position, upe.manager_id
     FROM ${ts}.user_profiles_extended upe
     WHERE upe.user_id = $1`,
    [userId],
  );

  const ext = extResult.rows[0];
  if (!ext) {
    return {
      orgUnitId: null, orgUnitName: null,
      department: null, position: null,
      managerId: null, managerName: null,
    };
  }

  // Resolve org unit name if we have an ID
  let orgUnitId: string | null = null;
  let orgUnitName: string | null = null;
  if (ext.org_unit) {
    // org_unit might be a name or an ID — try ID lookup first
    const orgResult = await safeQuery(
      `SELECT id, name FROM ${ts}.org_hierarchy_nodes WHERE id = $1 OR name = $1 LIMIT 1`,
      [ext.org_unit],
    );
    if (orgResult.rows.length > 0) {
      orgUnitId = orgResult.rows[0].id;
      orgUnitName = orgResult.rows[0].name;
    } else {
      orgUnitName = ext.org_unit; // treat as plain text
    }
  }

  // Resolve manager name
  let managerName: string | null = null;
  if (ext.manager_id) {
    const mgrResult = await safeQuery(
      `SELECT name FROM ${ts}.users WHERE id = $1`,
      [ext.manager_id],
    );
    managerName = mgrResult.rows[0]?.name ?? null;
  }

  return {
    orgUnitId,
    orgUnitName,
    department: ext.department ?? null,
    position: ext.position ?? null,
    managerId: ext.manager_id ?? null,
    managerName,
  };
}

async function loadRoles(ts: string, userId: string): Promise<string[]> {
  const result = await safeQuery(
    `SELECT DISTINCT r.code
     FROM ${ts}.user_role_assignments ura
     JOIN ${ts}.roles r ON r.id = ura.role_id
     WHERE ura.user_id = $1
       AND ura.is_active = true
       AND (ura.valid_until IS NULL OR ura.valid_until > NOW())
     ORDER BY r.code`,
    [userId],
  );
  return result.rows.map((r: any) => r.code);
}

async function loadCompetencies(ts: string, userId: string): Promise<string[]> {
  const result = await safeQuery(
    `SELECT competency_code FROM ${ts}.user_competencies
     WHERE user_id = $1 AND is_active = true
     ORDER BY competency_code`,
    [userId],
  );
  return result.rows.map((r: any) => r.competency_code);
}

async function loadPreferences(ts: string, userId: string): Promise<Record<string, unknown>> {
  const result = await safeQuery(
    `SELECT preference_key, preference_value FROM ${ts}.user_preferences
     WHERE user_id = $1`,
    [userId],
  );

  if (result.rows.length === 0) {
    // Try JSON blob format
    const blobResult = await safeQuery(
      `SELECT preferences FROM ${ts}.user_preferences WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    if (blobResult.rows.length > 0 && blobResult.rows[0].preferences) {
      const prefs = blobResult.rows[0].preferences;
      return typeof prefs === 'string' ? JSON.parse(prefs) : prefs;
    }
    return {};
  }

  const prefs: Record<string, unknown> = {};
  for (const row of result.rows) {
    prefs[row.preference_key] = row.preference_value;
  }
  return prefs;
}

// ── LRU Cache ─────────────────────────────────────────────────────

/** Cache entry with TTL tracking. */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/** Simple in-memory LRU cache with configurable TTL. */
const PROFILE_CACHE = new Map<string, CacheEntry<CanonicalProfile>>();
const ROLE_CACHE = new Map<string, CacheEntry<RoleProfile>>();

/** Default cache TTL: 5 minutes. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Maximum cache entries before eviction. */
const MAX_CACHE_SIZE = 500;

function cacheKey(tenantId: string, id: string): string {
  return `${tenantId}:${id}`;
}

/** Evict oldest entries when cache exceeds max size. */
function evictIfNeeded<T>(cache: Map<string, CacheEntry<T>>): void {
  if (cache.size <= MAX_CACHE_SIZE) return;
  // Delete oldest 10% of entries
  const toDelete = Math.floor(cache.size * 0.1);
  const keys = cache.keys();
  for (let i = 0; i < toDelete; i++) {
    const next = keys.next();
    if (next.done) break;
    cache.delete(next.value);
  }
}

// ── Exported: loadUserProfile (cached) ────────────────────────────

/**
 * Load a full user profile with LRU caching.
 *
 * Checks the in-memory cache first. On cache miss, delegates to
 * loadCanonicalProfile and stores the result with TTL.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param userId - The user to load
 * @returns The full canonical profile
 */
export async function loadUserProfile(
  tenantId: string,
  userId: string,
): Promise<CanonicalProfile> {
  const key = cacheKey(tenantId, userId);
  const cached = PROFILE_CACHE.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const profile = await loadCanonicalProfile(tenantId, userId);

  evictIfNeeded(PROFILE_CACHE);
  PROFILE_CACHE.set(key, { data: profile, expiresAt: Date.now() + CACHE_TTL_MS });

  return profile;
}

// ── Role Profile ──────────────────────────────────────────────────

/** A role profile with all its associated permissions. */
export interface RoleProfile {
  roleCode: string;
  roleName: string;
  roleNameAr: string;
  tier: string;
  permissions: string[];
  modules: string[];
  isActive: boolean;
}

/**
 * Load a role profile with all its permissions.
 *
 * Returns the role definition along with all permission codes
 * assigned to it. Uses LRU caching for repeated lookups.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param roleCode - The role code to load
 * @returns The role profile or null if not found
 */
export async function loadRoleProfile(
  tenantId: string,
  roleCode: string,
): Promise<RoleProfile | null> {
  if (!roleCode) throw new Error('roleCode is required');

  const key = cacheKey(tenantId, `role:${roleCode}`);
  const cached = ROLE_CACHE.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const ts = tenantSchema(tenantId);

  try {
    // Load role definition
    const roleResult = await safeQuery(
      `SELECT id, code, name, name_ar, tier, is_active
       FROM ${ts}.roles
       WHERE code = $1`,
      [roleCode],
    );

    if (roleResult.rows.length === 0) return null;

    const role = roleResult.rows[0];

    // Load permissions for this role
    const permResult = await safeQuery(
      `SELECT DISTINCT p.code
       FROM ${ts}.role_permissions rp
       JOIN ${ts}.permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = $1
       ORDER BY p.code`,
      [role.id],
    );

    // Load module access for this role
    const moduleResult = await safeQuery(
      `SELECT DISTINCT module_code
       FROM ${ts}.role_module_access
       WHERE role_id = $1 AND is_active = true
       ORDER BY module_code`,
      [role.id],
    ).catch(() => ({ rows: [] }));

    const profile: RoleProfile = {
      roleCode: role.code,
      roleName: role.name ?? '',
      roleNameAr: role.name_ar ?? '',
      tier: role.tier ?? 'module',
      permissions: permResult.rows.map((r: any) => r.code),
      modules: moduleResult.rows.map((r: any) => r.module_code),
      isActive: role.is_active !== false,
    };

    evictIfNeeded(ROLE_CACHE);
    ROLE_CACHE.set(key, { data: profile, expiresAt: Date.now() + CACHE_TTL_MS });

    return profile;
  } catch (err) {
    logger.warn('[ProfileLoader] Failed to load role profile', {
      tenantId, roleCode, error: (err as Error).message,
    });
    return null;
  }
}

// ── Cache Invalidation ────────────────────────────────────────────

/**
 * Invalidate cached profile for a specific user.
 *
 * Call this after mutations that affect user roles, permissions,
 * or profile data to ensure subsequent reads get fresh data.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param userId - The user whose cache to invalidate
 */
export function invalidateCache(tenantId: string, userId: string): void {
  const key = cacheKey(tenantId, userId);
  PROFILE_CACHE.delete(key);
  logger.debug('[ProfileLoader] Invalidated cache', { tenantId, userId });
}

/**
 * Invalidate all cached entries for a tenant.
 *
 * Useful after bulk operations or role/permission changes
 * that may affect multiple users.
 *
 * @param tenantId - Tenant identifier for schema isolation
 */
export function invalidateTenantCache(tenantId: string): void {
  const prefix = `${tenantId}:`;
  for (const key of PROFILE_CACHE.keys()) {
    if (key.startsWith(prefix)) PROFILE_CACHE.delete(key);
  }
  for (const key of ROLE_CACHE.keys()) {
    if (key.startsWith(prefix)) ROLE_CACHE.delete(key);
  }
  logger.debug('[ProfileLoader] Invalidated tenant cache', { tenantId });
}

// ── Preload Profiles ──────────────────────────────────────────────

/**
 * Preload all active user profiles into cache for a tenant.
 *
 * Designed to be called during tenant initialization or as a
 * background warm-up task to reduce cold-start latency.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @returns Number of profiles preloaded
 */
export async function preloadProfiles(
  tenantId: string,
): Promise<{ preloaded: number }> {
  const ts = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT id FROM ${ts}.users WHERE status = 'active' LIMIT 200`,
    );

    let preloaded = 0;
    for (const row of result.rows) {
      try {
        await loadUserProfile(tenantId, row.id);
        preloaded++;
      } catch {
        // Skip individual failures during preload
      }
    }

    logger.info('[ProfileLoader] Preloaded profiles', { tenantId, preloaded });
    return { preloaded };
  } catch (err) {
    logger.warn('[ProfileLoader] Failed to preload profiles', {
      tenantId, error: (err as Error).message,
    });
    return { preloaded: 0 };
  }
}
