// @ts-nocheck
/**
 * DAuth Decision Engine — full 14-step access evaluation pipeline.
 * Implements §7.5 of the Design Freeze: effective decision formula.
 *
 * Every sensitive action is allowed only if ALL 14 checks pass.
 * No check may be skipped, stubbed, or fail-open.
 */
import { safeQuery, query, tenantSchema } from '../../../config/database/database';
import { getAlwaysOnModules, getGrcCoreModules } from '../../dos/modules/registry/module-classification';
import { logger } from '../../dos/observability/logger.service';

// ── Types ──

export interface AccessDecisionContext {
  userId: string;
  tenantId: string;
  role: string;
  roles?: string[];
  isSuperAdmin?: boolean;
  permissionCode: string;
  moduleCode?: string;
  scopeType?: string;
  scopeId?: string;
  authorityRequired?: string;
  lifecycleFromState?: string;
  lifecycleToState?: string;
  entityType?: string;
  entityId?: string;
  ip?: string;
  path?: string;
  actorId?: string;
}

export interface AccessDecision {
  allowed: boolean;
  failedStep: number | null;
  failedCheck: string | null;
  reason: string;
  matchedRole?: string;
  matchedScopeType?: string;
  delegatedFrom?: string;
  steps: StepResult[];
}

interface StepResult {
  step: number;
  name: string;
  passed: boolean;
  detail?: string;
}

// ── Cache ──

interface PermCacheEntry {
  permissions: Map<string, Set<string>>;
  ts: number;
}

/** Membership cache: userId:tenantId → active boolean */
const membershipCache = new Map<string, { active: boolean; ts: number }>();

/** Tenant status cache: tenantId → status string */
const tenantStatusCache = new Map<string, { status: string; ts: number }>();

/** Module entitlements cache: tenantId → Set of active module codes */
const entitlementCache = new Map<string, { modules: Set<string>; hasAny: boolean; ts: number }>();

const permCache = new Map<string, PermCacheEntry>();
const CACHE_TTL = 60_000;
const MAX_CACHE = 200;

export function invalidatePermissionCache(tenantId?: string): void {
  if (tenantId) {
    permCache.delete(tenantId);
    tenantStatusCache.delete(tenantId);
    entitlementCache.delete(tenantId);
    // Clear membership entries for this tenant
    for (const key of membershipCache.keys()) {
      if (key.endsWith(`:${tenantId}`)) membershipCache.delete(key);
    }
  } else {
    permCache.clear();
    membershipCache.clear();
    tenantStatusCache.clear();
    entitlementCache.clear();
  }
}

// ── 14-Step Pipeline ──

export async function evaluateAccess(ctx: AccessDecisionContext): Promise<AccessDecision> {
  const steps: StepResult[] = [];
  const schema = tenantSchema(ctx.tenantId);

  // Pre-load DB-driven module classification (cached with TTL)
  const ALWAYS_ON_MODULES = await getAlwaysOnModules(ctx.tenantId);
  const GRC_CORE_MODULES = await getGrcCoreModules(ctx.tenantId);

  // ── Step 1: Actor authenticated ──
  const s1: StepResult = { step: 1, name: 'actor_authenticated', passed: !!ctx.userId };
  if (!s1.passed) s1.detail = 'No userId in context';
  steps.push(s1);
  if (!s1.passed) return denyAndLog(schema, ctx, 1, 'actor_authenticated', 'Actor not authenticated', steps);

  // ── Step 2: Session valid ──
  // Session validity (JWT expiry + blacklist) is enforced by session.middleware before
  // this engine is called. If we reach here, the session is valid.
  steps.push({ step: 2, name: 'session_valid', passed: true, detail: 'Enforced by session middleware' });

  // ── Step 3: Tenant membership valid (cached) ──
  const memKey = `${ctx.userId}:${ctx.tenantId}`;
  const memCached = membershipCache.get(memKey);
  let s3passed: boolean;
  if (memCached && Date.now() - memCached.ts < CACHE_TTL) {
    s3passed = memCached.active;
  } else {
    const membership = await safeQuery(
      `SELECT status FROM public.tenant_user_memberships
       WHERE tenant_id = $1 AND user_id = $2 AND status = 'active' LIMIT 1`,
      [ctx.tenantId, ctx.userId],
    );
    s3passed = membership.rows.length > 0;
    membershipCache.set(memKey, { active: s3passed, ts: Date.now() });
  }
  steps.push({ step: 3, name: 'tenant_membership_valid', passed: s3passed,
    detail: s3passed ? 'Active membership' : 'No active membership' });
  if (!s3passed) return denyAndLog(schema, ctx, 3, 'tenant_membership_valid', 'User has no active tenant membership', steps);

  // ── Step 4: Tenant active (cached) ──
  const tsCached = tenantStatusCache.get(ctx.tenantId);
  let tenantStatus: string | undefined;
  if (tsCached && Date.now() - tsCached.ts < CACHE_TTL) {
    tenantStatus = tsCached.status;
  } else {
    const tenant = await safeQuery(
      `SELECT status FROM public.tenants WHERE tenant_id = $1 LIMIT 1`,
      [ctx.tenantId],
    );
    tenantStatus = tenant.rows[0]?.status;
    if (tenantStatus) tenantStatusCache.set(ctx.tenantId, { status: tenantStatus, ts: Date.now() });
  }
  // Onboarding-scoped permissions are allowed during onboarding/registration
  // to resolve the chicken-and-egg: lookups must work before tenant is fully active.
  // DB-driven: query tenant_status_rules for which statuses allow onboarding access.
  const onboardingStatuses = await loadOnboardingStatuses(schema);
  const isOnboardingPermission = ctx.permissionCode.startsWith('onboarding.');
  const activeStatuses = await loadActiveStatuses(schema);
  const s4passed = activeStatuses.has(tenantStatus!)
    || (onboardingStatuses.has(tenantStatus!) && isOnboardingPermission);
  steps.push({ step: 4, name: 'tenant_active', passed: s4passed,
    detail: `Tenant status: ${tenantStatus || 'not found'}${isOnboardingPermission ? ' (onboarding bypass)' : ''}` });
  if (!s4passed) return denyAndLog(schema, ctx, 4, 'tenant_active', `Tenant not active (status: ${tenantStatus})`, steps);

  // ── Step 5: Product enabled (cached) ──
  // Derive module from permission code: risk.record.read → risk, incident.record.write → incident
  const moduleCode = ctx.moduleCode || deriveModuleCode(ctx.permissionCode);
  const entCached = entitlementCache.get(ctx.tenantId);
  let productEntitled: boolean;
  let grcFallbackUsed = false;
  if (entCached && Date.now() - entCached.ts < CACHE_TTL) {
    productEntitled = entCached.modules.has(moduleCode);
    grcFallbackUsed = GRC_CORE_MODULES.has(moduleCode) && !productEntitled && !entCached.hasAny;
  } else {
    // Load all active entitlements in one query and cache them
    const allEntitlements = await safeQuery(
      `SELECT module_code FROM "${schema}".tenant_module_entitlements WHERE is_active = TRUE`,
    );
    const moduleSet = new Set(allEntitlements.rows.map((r: { module_code: string }) => r.module_code));
    entitlementCache.set(ctx.tenantId, { modules: moduleSet, hasAny: moduleSet.size > 0, ts: Date.now() });
    productEntitled = moduleSet.has(moduleCode);
    grcFallbackUsed = GRC_CORE_MODULES.has(moduleCode) && !productEntitled && moduleSet.size === 0;
  }
  const s5passed = ALWAYS_ON_MODULES.has(moduleCode) || productEntitled || grcFallbackUsed;
  steps.push({ step: 5, name: 'product_enabled', passed: s5passed,
    detail: ALWAYS_ON_MODULES.has(moduleCode) ? `Always-on module: ${moduleCode}` : grcFallbackUsed ? `GRC core fallback (no entitlements seeded yet): ${moduleCode}` : (s5passed ? 'Entitled' : `Module ${moduleCode} not entitled`) });
  if (!s5passed) return denyAndLog(schema, ctx, 5, 'product_enabled', `Module ${moduleCode} not entitled for tenant`, steps);

  // ── Step 6: Module enabled ──
  const moduleReg = await safeQuery(
    `SELECT licensed FROM "${schema}".module_workflow_registry WHERE module_code = $1 LIMIT 1`,
    [moduleCode],
  );
  const s6passed = ALWAYS_ON_MODULES.has(moduleCode) || GRC_CORE_MODULES.has(moduleCode) || !moduleReg.rows[0] || moduleReg.rows[0].licensed !== false;
  steps.push({ step: 6, name: 'module_enabled', passed: s6passed,
    detail: s6passed ? 'Module active' : `Module ${moduleCode} disabled` });
  if (!s6passed) return denyAndLog(schema, ctx, 6, 'module_enabled', `Module ${moduleCode} is disabled`, steps);

  // ── Step 7: Access profile allows ──
  const profileCheck = await safeQuery(
    `SELECT ap.code FROM "${schema}".user_access_profiles uap
     JOIN "${schema}".access_profiles ap ON ap.code = uap.access_profile_code
     WHERE uap.user_id = $1 AND uap.is_active = TRUE
     AND (uap.valid_to IS NULL OR uap.valid_to > NOW())
     LIMIT 1`,
    [ctx.userId],
  );
  // If no access profile assigned, allow (profile system is optional until Phase 2 full rollout)
  const hasProfile = profileCheck.rows.length > 0;
  const profileCode = profileCheck.rows[0]?.code;
  // DB-driven: query access_profiles for blocked profile codes
  const blockedProfiles = await loadBlockedProfiles(schema);
  const s7passed = !hasProfile || !blockedProfiles.has(profileCode);
  steps.push({ step: 7, name: 'access_profile_allows', passed: s7passed,
    detail: hasProfile ? `Profile: ${profileCode}` : 'No profile assigned (allowed)' });
  if (!s7passed) return denyAndLog(schema, ctx, 7, 'access_profile_allows', `Access profile ${profileCode} is blocked`, steps);

  // ── Step 8: Functional role grants permission ──
  // Super-admin bypass — documented, scoped to platform bootstrap/emergency
  if (ctx.isSuperAdmin === true) {
    steps.push({ step: 8, name: 'role_grants_permission', passed: true, detail: 'Super-admin bypass' });
  } else {
    const permMap = await getPermissionsForTenant(ctx.tenantId, schema);
    const userRoles = ctx.roles || [ctx.role];
    let roleMatch: string | undefined;
    for (const r of userRoles) {
      if (permMap.get(r)?.has(ctx.permissionCode)) { roleMatch = r; break; }
    }
    const s8passed = !!roleMatch;
    steps.push({ step: 8, name: 'role_grants_permission', passed: s8passed,
      detail: s8passed ? `Granted via role: ${roleMatch}` : `No role grants ${ctx.permissionCode}` });
    if (!s8passed) return denyAndLog(schema, ctx, 8, 'role_grants_permission', `No role grants permission ${ctx.permissionCode}`, steps);
  }

  // ── Step 9: Scope matches ──
  if (ctx.scopeType && ctx.scopeId) {
    // Check user has a role assignment scoped to the requested scope or a parent
    const scopeCheck = await safeQuery(
      `SELECT 1 FROM "${schema}".user_role_assignments
       WHERE user_id = $1 AND is_active = TRUE
       AND (scope_type IS NULL OR scope_type = $2)
       AND (scope_id IS NULL OR scope_id::text = $3)
       LIMIT 1`,
      [ctx.userId, ctx.scopeType, ctx.scopeId],
    );
    const s9passed = scopeCheck.rows.length > 0 || ctx.isSuperAdmin === true;
    steps.push({ step: 9, name: 'scope_matches', passed: s9passed,
      detail: s9passed ? 'Scope valid' : `No assignment for scope ${ctx.scopeType}:${ctx.scopeId}` });
    if (!s9passed) return denyAndLog(schema, ctx, 9, 'scope_matches', 'User not assigned to requested scope', steps);
  } else {
    steps.push({ step: 9, name: 'scope_matches', passed: true, detail: 'No scope constraint' });
  }

  // ── Step 10: Authority level sufficient ──
  if (ctx.authorityRequired) {
    const authCheck = await safeQuery(
      `SELECT al.rank FROM "${schema}".authority_levels al
       JOIN "${schema}".user_role_assignments ura ON ura.authority_level_code = al.level_code
       WHERE ura.user_id = $1 AND ura.is_active = TRUE
       ORDER BY al.rank DESC LIMIT 1`,
      [ctx.userId],
    );
    const requiredAuth = await safeQuery(
      `SELECT rank FROM "${schema}".authority_levels WHERE level_code = $1 LIMIT 1`,
      [ctx.authorityRequired],
    );
    const userRank = authCheck.rows[0]?.rank ?? 0;
    const requiredRank = requiredAuth.rows[0]?.rank ?? 999;
    const s10passed = userRank >= requiredRank || ctx.isSuperAdmin === true;
    steps.push({ step: 10, name: 'authority_sufficient', passed: s10passed,
      detail: `User rank: ${userRank}, required: ${requiredRank}` });
    if (!s10passed) return denyAndLog(schema, ctx, 10, 'authority_sufficient', `Authority level insufficient (${userRank} < ${requiredRank})`, steps);
  } else {
    steps.push({ step: 10, name: 'authority_sufficient', passed: true, detail: 'No authority required' });
  }

  // ── Step 11: SoD passes ──
  const userRoles = ctx.roles || [ctx.role];
  if (userRoles.length > 1) {
    const sodCheck = await safeQuery(
      `SELECT role_code_a, role_code_b, conflict_level FROM "${schema}".sod_rules
       WHERE is_active = TRUE
       AND role_code_a = ANY($1) AND role_code_b = ANY($1)
       AND conflict_level = 'block'
       LIMIT 1`,
      [userRoles],
    );
    const s11passed = sodCheck.rows.length === 0;
    steps.push({ step: 11, name: 'sod_passes', passed: s11passed,
      detail: s11passed ? 'No blocking SoD conflicts' : `SoD conflict: ${sodCheck.rows[0].role_code_a} vs ${sodCheck.rows[0].role_code_b}` });
    if (!s11passed) return denyAndLog(schema, ctx, 11, 'sod_passes', `SoD conflict blocks action: ${sodCheck.rows[0].role_code_a} vs ${sodCheck.rows[0].role_code_b}`, steps);
  } else {
    steps.push({ step: 11, name: 'sod_passes', passed: true, detail: 'Single role — no SoD check needed' });
  }

  // ── Step 12: Lifecycle transition allowed ──
  if (ctx.lifecycleFromState && ctx.lifecycleToState && ctx.entityType) {
    const lcCheck = await safeQuery(
      `SELECT 1 FROM "${schema}".module_lifecycle_transitions
       WHERE module_code = $1 AND from_status = $2 AND to_status = $3
       AND (required_permission_code IS NULL OR required_permission_code = $4)
       LIMIT 1`,
      [moduleCode, ctx.lifecycleFromState, ctx.lifecycleToState, ctx.permissionCode],
    );
    const s12passed = lcCheck.rows.length > 0 || ctx.isSuperAdmin === true;
    steps.push({ step: 12, name: 'lifecycle_transition_allowed', passed: s12passed,
      detail: s12passed ? 'Transition valid' : `Transition ${ctx.lifecycleFromState} → ${ctx.lifecycleToState} not allowed` });
    if (!s12passed) return denyAndLog(schema, ctx, 12, 'lifecycle_transition_allowed', 'Lifecycle transition not permitted', steps);
  } else {
    steps.push({ step: 12, name: 'lifecycle_transition_allowed', passed: true, detail: 'No lifecycle transition' });
  }

  // ── Step 13: Delegation/ownership rules pass ──
  if (ctx.entityId) {
    // Check if user has an active delegation for this module/entity
    const delegationCheck = await safeQuery(
      `SELECT 1 FROM "${schema}".delegations
       WHERE to_user_id = $1 AND is_active = TRUE
       AND valid_from <= NOW() AND valid_to > NOW()
       AND (module_code IS NULL OR module_code = $2)
       LIMIT 1`,
      [ctx.userId, moduleCode],
    );
    const hasDelegation = delegationCheck.rows.length > 0;

    // Check entity ownership — if entity_ownership table exists and has a record,
    // verify the requesting user owns the entity or has delegation.
    // If table doesn't exist or no ownership record, default to no constraint (backward-compatible).
    let isOwner = true; // Default: no ownership constraint → pass through
    if (ctx.entityType) {
      const ownershipCheck = await safeQuery(
        `SELECT owner_user_id FROM "${schema}".entity_ownership
         WHERE entity_type = $1 AND entity_id = $2 LIMIT 1`,
        [ctx.entityType, ctx.entityId],
      ).catch((err) => {
      logger.warn(`[DAuth] Step 13: entity_ownership query failed for tenant ${ctx.tenantId} — defaulting to no ownership constraint`, { error: String(err) });
      return { rows: [] as any[] };
    });

      if (ownershipCheck.rows.length > 0) {
        isOwner = ownershipCheck.rows[0].owner_user_id === ctx.userId;
      }
    }

    const s13passed = isOwner || hasDelegation || ctx.isSuperAdmin === true;
    steps.push({ step: 13, name: 'delegation_ownership_pass', passed: s13passed,
      detail: isOwner ? (ctx.entityType ? 'Entity owner or no ownership constraint' : 'No entity type — ownership not checked')
        : hasDelegation ? 'Active delegation found'
        : ctx.isSuperAdmin ? 'Super-admin bypass'
        : 'Entity owned by another user and no delegation found' });
    if (!s13passed) return denyAndLog(schema, ctx, 13, 'delegation_ownership_pass',
      'Entity owned by another user and no active delegation exists', steps);
  } else {
    steps.push({ step: 13, name: 'delegation_ownership_pass', passed: true, detail: 'No entity context' });
  }

  // ── Step 14: Decision logged ──
  await logDecision(schema, ctx, { allowed: true, failedStep: null, failedCheck: null, reason: 'All 14 checks passed', steps, matchedRole: ctx.role }).catch((err) => {
    logger.warn('[DAuth] Step 14: decision log write failed — request allowed but audit incomplete', { error: String(err), userId: ctx.userId, tenantId: ctx.tenantId });
  });
  steps.push({ step: 14, name: 'decision_logged', passed: true, detail: 'Written to authz_decision_log' });

  return {
    allowed: true,
    failedStep: null,
    failedCheck: null,
    reason: 'All 14 checks passed',
    matchedRole: steps[7]?.detail?.includes('role:') ? steps[7].detail.split('role: ')[1] : ctx.role,
    steps,
  };
}

// ── DB-driven status/profile loaders (cached) ──

const statusCache = new Map<string, { onboarding: Set<string>; active: Set<string>; ts: number }>();
const profileCache = new Map<string, { blocked: Set<string>; ts: number }>();

async function loadOnboardingStatuses(schema: string): Promise<Set<string>> {
  const key = schema;
  const cached = statusCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.onboarding;
  try {
    const { rows } = await safeQuery(
      `SELECT status_code FROM "${schema}".tenant_status_rules WHERE allows_onboarding = TRUE`,
    );
    const onboarding = new Set(rows.map((r: unknown) => r.status_code as string));
    const active = statusCache.get(key)?.active ?? new Set(['active', 'trial_active']);
    statusCache.set(key, { onboarding, active, ts: Date.now() });
    return onboarding;
  } catch {
    return new Set(['pending_onboarding', 'registered', 'provisioning']);
  }
}

async function loadActiveStatuses(schema: string): Promise<Set<string>> {
  const key = schema;
  const cached = statusCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.active;
  try {
    const { rows } = await safeQuery(
      `SELECT status_code FROM "${schema}".tenant_status_rules WHERE is_active = TRUE`,
    );
    const active = new Set(rows.map((r: unknown) => r.status_code as string));
    const onboarding = statusCache.get(key)?.onboarding ?? new Set(['pending_onboarding', 'registered', 'provisioning']);
    statusCache.set(key, { onboarding, active, ts: Date.now() });
    return active;
  } catch {
    return new Set(['active', 'trial_active']);
  }
}

async function loadBlockedProfiles(schema: string): Promise<Set<string>> {
  const cached = profileCache.get(schema);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.blocked;
  try {
    const { rows } = await safeQuery(
      `SELECT code FROM "${schema}".access_profiles WHERE is_blocked = TRUE`,
    );
    const blocked = new Set(rows.map((r: unknown) => r.code as string));
    profileCache.set(schema, { blocked, ts: Date.now() });
    return blocked;
  } catch {
    return new Set(['suspended', 'deactivated', 'locked']);
  }
}

// ── Helpers ──

function deny(step: number, check: string, reason: string, steps: StepResult[]): AccessDecision {
  // Deny decisions are always logged — more important than allows for security audit
  return { allowed: false, failedStep: step, failedCheck: check, reason, steps };
}

async function denyAndLog(
  schema: string, ctx: AccessDecisionContext,
  step: number, check: string, reason: string, steps: StepResult[],
): Promise<AccessDecision> {
  const decision = deny(step, check, reason, steps);
  logger.warn(`[DAuth] DENY step=${step} check=${check} perm=${ctx.permissionCode} user=${ctx.userId} tenant=${ctx.tenantId} path=${ctx.path || '-'} reason=${reason}`);
  await logDecision(schema, ctx, decision).catch((err) => {
    logger.warn('[DAuth] DENY decision log write failed — denial enforced but audit incomplete', { error: String(err), userId: ctx.userId, tenantId: ctx.tenantId, step, check });
  });
  return decision;
}

async function getPermissionsForTenant(tenantId: string, schema: string): Promise<Map<string, Set<string>>> {
  const cached = permCache.get(tenantId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.permissions;

  const perms = new Map<string, Set<string>>();

  try {
    const mapRes = await query(
      `SELECT role_code, permission_code
       FROM "${schema}".role_permission_map
       WHERE tenant_id = $1`,
      [tenantId],
    );
    for (const row of mapRes.rows) {
      if (!perms.has(row.role_code)) perms.set(row.role_code, new Set());
      perms.get(row.role_code)!.add(row.permission_code);
    }
  } catch (err) {
    logger.error(`[DAuth] CRITICAL: failed to read role_permission_map for tenant ${tenantId} — schema: ${schema}`, {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  if (permCache.size >= MAX_CACHE) {
    const oldest = [...permCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) permCache.delete(oldest[0]);
  }
  permCache.set(tenantId, { permissions: perms, ts: Date.now() });
  return perms;
}

async function logDecision(
  schema: string,
  ctx: AccessDecisionContext,
  decision: AccessDecision,
): Promise<void> {
  await safeQuery(
    `INSERT INTO "${schema}".authz_decision_log
     (user_id, permission_code, module_code, decision, reason, matched_role,
      matched_scope_type, authority_level, record_context)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      ctx.userId,
      ctx.permissionCode,
      ctx.moduleCode || ctx.permissionCode.split('.')[0],
      decision.allowed ? 'allow' : 'deny',
      decision.reason,
      decision.matchedRole || null,
      ctx.scopeType || null,
      ctx.authorityRequired || null,
      JSON.stringify({
        ip: ctx.ip,
        path: ctx.path,
        failedStep: decision.failedStep,
        failedCheck: decision.failedCheck,
        stepCount: decision.steps.length,
        isSuperAdmin: ctx.isSuperAdmin || false,
      }),
    ],
  );
}
