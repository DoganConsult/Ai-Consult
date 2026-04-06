// ============================================
// DOS — Profile Completeness Service
// Computes weighted completeness score for user profiles.
// Drives onboarding progress, profile nudges, and admin dashboards.
// Owner: DOS (profile/org is DOS concern; auth bits delegate to DAuth)
// ============================================

import { safeQuery, tenantSchema } from '../../../config/database';

// ── Types ──────────────────────────────────────────────────────────

export interface CompletenessResult {
  score: number;
  total: number;
  completed: number;
  missing: string[];
}

export interface SectionedCompletenessResult {
  score: number;
  sections: Record<string, { complete: boolean; weight: number }>;
}

export interface CompletenessRule {
  field: string;
  weight: number;
  required: boolean;
}

// ── Default Rules ──────────────────────────────────────────────────

const DEFAULT_RULES: CompletenessRule[] = [
  { field: 'name',          weight: 10, required: true },
  { field: 'email',         weight: 10, required: true },
  { field: 'role_assigned', weight: 15, required: true },
  { field: 'org_unit',      weight: 10, required: false },
  { field: 'department',    weight: 10, required: false },
  { field: 'position',      weight: 10, required: false },
  { field: 'competencies',  weight: 10, required: false },
  { field: 'mfa_enabled',   weight: 15, required: true },
  { field: 'profile_photo', weight: 5,  required: false },
  { field: 'preferences',   weight: 5,  required: false },
];

// ── Public API ─────────────────────────────────────────────────────

/** Rules specialized for agent actors (fewer profile fields required). */
const AGENT_RULES: CompletenessRule[] = [
  { field: 'name',          weight: 20, required: true },
  { field: 'email',         weight: 10, required: false },
  { field: 'role_assigned', weight: 20, required: true },
  { field: 'competencies',  weight: 20, required: false },
  { field: 'preferences',   weight: 10, required: false },
];

/** Rules for external/service actors. */
const EXTERNAL_RULES: CompletenessRule[] = [
  { field: 'name',          weight: 15, required: true },
  { field: 'email',         weight: 15, required: true },
  { field: 'role_assigned', weight: 20, required: true },
  { field: 'org_unit',      weight: 15, required: false },
  { field: 'position',      weight: 10, required: false },
  { field: 'mfa_enabled',   weight: 15, required: true },
  { field: 'preferences',   weight: 10, required: false },
];

/**
 * Returns the default completeness rules for the given actor type.
 * Different actor types have different expected profile fields.
 * Falls back to the default human rules if actorType is not provided.
 *
 * @param actorType - Optional actor type to tailor the rules
 */
export function getDefaultRules(actorType?: string): CompletenessRule[] {
  switch (actorType) {
    case 'agent':
    case 'service':
      return [...AGENT_RULES];
    case 'external':
      return [...EXTERNAL_RULES];
    default:
      return [...DEFAULT_RULES];
  }
}

/**
 * Computes a flat completeness score for a user's profile.
 * Returns total weight, completed weight, percentage score, and
 * a list of missing field names.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param userId - The user/actor to evaluate
 * @param actorType - Optional actor type for rule selection (human, agent, service, external)
 * @param profileData - Optional pre-loaded profile data (bypasses DB lookup)
 */
export async function computeProfileCompleteness(
  tenantId: string,
  userId: string,
  actorType?: string,
  _profileData?: Record<string, unknown>,
): Promise<CompletenessResult> {
  const ts = tenantSchema(tenantId);

  try {
    // ── Load tenant-specific rules (fall back to actor-type defaults) ──
    const rulesResult = await safeQuery(
      `SELECT field, weight, required FROM ${ts}.profile_completeness_rules WHERE is_active = true ORDER BY weight DESC`,
    );
    const rules: CompletenessRule[] = rulesResult.rows.length > 0
      ? rulesResult.rows.map((r: any) => ({ field: r.field, weight: Number(r.weight), required: !!r.required }))
      : getDefaultRules(actorType);

    // ── Load user data ──────────────────────────────────────────
    const profileData = await loadProfileData(ts, userId);

    // ── Evaluate each rule ──────────────────────────────────────
    const total = rules.reduce((sum, r) => sum + r.weight, 0);
    let completed = 0;
    const missing: string[] = [];

    for (const rule of rules) {
      const fulfilled = evaluateField(rule.field, profileData);
      if (fulfilled) {
        completed += rule.weight;
      } else {
        missing.push(rule.field);
      }
    }

    const score = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { score, total, completed, missing };
  } catch (err: unknown) {
    // On error, return zero-score with all fields missing
    return {
      score: 0,
      total: DEFAULT_RULES.reduce((s, r) => s + r.weight, 0),
      completed: 0,
      missing: DEFAULT_RULES.map(r => r.field),
    };
  }
}

/**
 * Returns a section-by-section completeness breakdown with per-field
 * completion status and weight.
 */
export async function getProfileCompleteness(
  tenantId: string,
  userId: string,
): Promise<SectionedCompletenessResult> {
  const ts = tenantSchema(tenantId);

  try {
    const rulesResult = await safeQuery(
      `SELECT field, weight, required FROM ${ts}.profile_completeness_rules WHERE is_active = true ORDER BY weight DESC`,
    );
    const rules: CompletenessRule[] = rulesResult.rows.length > 0
      ? rulesResult.rows.map((r: any) => ({ field: r.field, weight: Number(r.weight), required: !!r.required }))
      : DEFAULT_RULES;

    const profileData = await loadProfileData(ts, userId);

    const sections: Record<string, { complete: boolean; weight: number }> = {};
    let totalWeight = 0;
    let completedWeight = 0;

    for (const rule of rules) {
      const complete = evaluateField(rule.field, profileData);
      sections[rule.field] = { complete, weight: rule.weight };
      totalWeight += rule.weight;
      if (complete) completedWeight += rule.weight;
    }

    const score = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

    return { score, sections };
  } catch (err: unknown) {
    const sections: Record<string, { complete: boolean; weight: number }> = {};
    for (const rule of DEFAULT_RULES) {
      sections[rule.field] = { complete: false, weight: rule.weight };
    }
    return { score: 0, sections };
  }
}

// ── Internal helpers ───────────────────────────────────────────────

interface ProfileData {
  name: string | null;
  email: string | null;
  hasRoleAssignment: boolean;
  orgUnit: string | null;
  department: string | null;
  position: string | null;
  competencyCount: number;
  mfaEnabled: boolean;
  profilePhoto: string | null;
  hasPreferences: boolean;
}

async function loadProfileData(ts: string, userId: string): Promise<ProfileData> {
  // Base user data
  const userResult = await safeQuery(
    `SELECT u.id, u.name, u.email, u.mfa_enabled, u.profile_photo_url
     FROM ${ts}.users u
     WHERE u.id = $1`,
    [userId],
  );
  const user = userResult.rows[0] ?? {};

  // Extended profile (org context)
  const extResult = await safeQuery(
    `SELECT org_unit, department, position
     FROM ${ts}.user_profiles_extended
     WHERE user_id = $1`,
    [userId],
  );
  const ext = extResult.rows[0] ?? {};

  // Role assignment check
  const roleResult = await safeQuery(
    `SELECT 1 FROM ${ts}.user_role_assignments WHERE user_id = $1 AND is_active = true LIMIT 1`,
    [userId],
  );

  // Competency count
  const compResult = await safeQuery(
    `SELECT COUNT(*)::int AS cnt FROM ${ts}.user_competencies WHERE user_id = $1 AND is_active = true`,
    [userId],
  );

  // Preferences check
  const prefResult = await safeQuery(
    `SELECT 1 FROM ${ts}.user_preferences WHERE user_id = $1 LIMIT 1`,
    [userId],
  );

  return {
    name: user.name ?? null,
    email: user.email ?? null,
    hasRoleAssignment: (roleResult.rows.length ?? 0) > 0,
    orgUnit: ext.org_unit ?? null,
    department: ext.department ?? null,
    position: ext.position ?? null,
    competencyCount: compResult.rows[0]?.cnt ?? 0,
    mfaEnabled: user.mfa_enabled === true,
    profilePhoto: user.profile_photo_url ?? null,
    hasPreferences: (prefResult.rows.length ?? 0) > 0,
  };
}

function evaluateField(field: string, data: ProfileData): boolean {
  switch (field) {
    case 'name':
      return !!data.name && data.name.trim().length > 0;
    case 'email':
      return !!data.email && data.email.includes('@');
    case 'role_assigned':
      return data.hasRoleAssignment;
    case 'org_unit':
      return !!data.orgUnit && data.orgUnit.trim().length > 0;
    case 'department':
      return !!data.department && data.department.trim().length > 0;
    case 'position':
      return !!data.position && data.position.trim().length > 0;
    case 'competencies':
      return data.competencyCount > 0;
    case 'mfa_enabled':
      return data.mfaEnabled;
    case 'profile_photo':
      return !!data.profilePhoto && data.profilePhoto.trim().length > 0;
    case 'preferences':
      return data.hasPreferences;
    default:
      return false;
  }
}
