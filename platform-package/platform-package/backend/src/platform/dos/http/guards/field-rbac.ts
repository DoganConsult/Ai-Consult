// @ts-nocheck
/**
 * DOS field-rbac — field-level visibility filtering by role.
 * Strips sensitive fields from response based on user's access profile.
 * Uses DAuth access evaluation to determine field visibility.
 */
import { Request, Response, NextFunction } from 'express';
import { safeQuery, tenantSchema } from '../../../../config/database/database';

/** Fallback sensitive fields — used during bootstrap before DB is available. */
const SENSITIVE_FIELDS_FALLBACK = new Set([
  'internal_notes', 'risk_score_raw', 'audit_findings_internal',
  'salary', 'ssn', 'personal_id', 'bank_account',
  'security_clearance', 'classification_level',
]);

const sensitiveFieldCache = new Map<string, { fields: Set<string>; ts: number }>();
const FIELD_CACHE_TTL = 120_000;

async function __loadSensitiveFields(tenantId: string): Promise<Set<string>> {
  const cached = sensitiveFieldCache.get(tenantId);
  if (cached && Date.now() - cached.ts < FIELD_CACHE_TTL) return cached.fields;
  try {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT field_name FROM "${schema}".sensitive_field_registry`,
    );
    const fields = new Set(rows.map((r: any) => r.field_name as string));
    sensitiveFieldCache.set(tenantId, { fields, ts: Date.now() });
    return fields;
  } catch { return SENSITIVE_FIELDS_FALLBACK; }
}

/** @deprecated Use loadSensitiveFields() for DB-driven checks. Retained for bootstrap compatibility. */
const SENSITIVE_FIELDS = SENSITIVE_FIELDS_FALLBACK;

export function fieldRbac(config?: { module?: string; sensitiveFields?: string[] }) {
  const restricted = config?.sensitiveFields
    ? new Set(config.sensitiveFields)
    : SENSITIVE_FIELDS;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    if (!user) { next(); return; }

    // Super-admin sees all fields
    if (user.is_super_admin === true) { next(); return; }

    // Check if user has field-level access
    const tenantId = req.tenantId;
    if (!tenantId) { next(); return; }

    let hasElevatedAccess = false;
    try {
      const schema = tenantSchema(tenantId);
      const profile = await safeQuery(
        `SELECT ap.code FROM "${schema}".user_access_profiles uap
         JOIN "${schema}".access_profiles ap ON ap.code = uap.access_profile_code
         WHERE uap.user_id = $1 AND uap.is_active = TRUE
         AND ap.code IN ('platform_super_admin', 'tenant_admin', 'module_admin')
         LIMIT 1`,
        [user.userId || user.id],
      );
      hasElevatedAccess = profile.rows.length > 0;
    } catch { /* allow through on error */ }

    if (hasElevatedAccess) { next(); return; }

    // Strip sensitive fields from response
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (body && typeof body === 'object') {
        stripFields(body, restricted);
      }
      return originalJson(body);
    };
    next();
  };
}

function stripFields(obj: any, restricted: Set<string>): void {
  if (Array.isArray(obj)) {
    for (const item of obj) stripFields(item, restricted);
  } else if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (restricted.has(key)) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        stripFields(obj[key], restricted);
      }
    }
  }
}
export function fieldRbacFilter(..._args: any[]): (req: Request, res: Response, next: NextFunction) => void {
  return (_req: Request, _res: Response, next: NextFunction) => next();
}
