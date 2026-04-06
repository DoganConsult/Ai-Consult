/**
 * Role Profile Service
 *
 * Manages role profile data. PREDEFINED_PROFILES is the in-memory reference
 * for GRC role profiles used by the setup wizard, playbook engine, and provisioning.
 *
 * Each profile maps a GRC role (e.g. CISO, Compliance Manager) to default
 * widgets, report subscriptions, notification preferences, and nav items.
 *
 * DB queries target the functional_roles table in the tenant schema.
 */
import { safeQuery, tenantSchema } from '../../../config/database';
import { logger } from '../../dos/observability/logger.service';

// ── Profile Type ────────────────────────────────────────────────────────────

export interface RoleProfile {
  profileId: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  /** Default dashboard widget IDs for this profile */
  defaultWidgets: string[];
  /** Default report subscription IDs */
  defaultReportSubscriptions: string[];
  /** Default notification preference map (type -> enabled) */
  defaultNotificationPrefs: Record<string, boolean>;
  /** Default navigation item codes */
  defaultNavItems: string[];
}

// ── Predefined Profiles ─────────────────────────────────────────────────────

export const PREDEFINED_PROFILES: RoleProfile[] = [
  {
    profileId: 'ciso',
    name_en: 'Chief Information Security Officer',
    name_ar: 'رئيس أمن المعلومات',
    description_en: 'Senior executive responsible for cybersecurity strategy, risk oversight, and compliance governance.',
    description_ar: 'المسؤول التنفيذي عن استراتيجية الأمن السيبراني والرقابة على المخاطر وحوكمة الامتثال.',
    defaultWidgets: ['risk-heatmap', 'compliance-posture', 'incident-trend', 'maturity-radar', 'executive-summary'],
    defaultReportSubscriptions: ['executive-risk-summary', 'compliance-status', 'incident-overview', 'maturity-scorecard'],
    defaultNotificationPrefs: {
      critical_incident: true,
      compliance_breach: true,
      risk_threshold: true,
      audit_finding: true,
      policy_expiry: true,
      sla_breach: true,
    },
    defaultNavItems: ['dashboard', 'risk', 'compliance', 'incident', 'governance', 'reporting', 'analytics'],
  },
  {
    profileId: 'compliance_manager',
    name_en: 'Compliance Manager',
    name_ar: 'مدير الامتثال',
    description_en: 'Manages regulatory compliance programs, framework assessments, and evidence collection.',
    description_ar: 'يدير برامج الامتثال التنظيمي وتقييمات الأطر وجمع الأدلة.',
    defaultWidgets: ['compliance-posture', 'framework-progress', 'evidence-freshness', 'control-effectiveness', 'gap-analysis'],
    defaultReportSubscriptions: ['compliance-status', 'framework-assessment', 'evidence-collection', 'control-testing'],
    defaultNotificationPrefs: {
      compliance_breach: true,
      evidence_due: true,
      control_failure: true,
      framework_update: true,
      policy_expiry: true,
      audit_finding: true,
    },
    defaultNavItems: ['dashboard', 'compliance', 'evidence', 'policy', 'controls', 'audit', 'reporting'],
  },
  {
    profileId: 'risk_manager',
    name_en: 'Risk Manager',
    name_ar: 'مدير المخاطر',
    description_en: 'Manages risk assessments, risk register, and treatment plans.',
    description_ar: 'يدير تقييمات المخاطر وسجل المخاطر وخطط المعالجة.',
    defaultWidgets: ['risk-heatmap', 'risk-register', 'treatment-progress', 'risk-trend', 'residual-risk-map'],
    defaultReportSubscriptions: ['risk-register-summary', 'treatment-status', 'risk-assessment-results', 'vendor-risk-summary'],
    defaultNotificationPrefs: {
      risk_threshold: true,
      treatment_overdue: true,
      risk_assessment_due: true,
      vendor_risk_change: true,
      sla_breach: true,
    },
    defaultNavItems: ['dashboard', 'risk', 'remediation', 'vendor', 'bcp', 'reporting'],
  },
  {
    profileId: 'dpo',
    name_en: 'Data Protection Officer',
    name_ar: 'مسؤول حماية البيانات',
    description_en: 'Manages data protection and privacy operations for PDPL compliance.',
    description_ar: 'يدير حماية البيانات وعمليات الخصوصية للامتثال لنظام حماية البيانات الشخصية.',
    defaultWidgets: ['privacy-dashboard', 'dsr-tracker', 'data-inventory', 'compliance-posture', 'incident-trend'],
    defaultReportSubscriptions: ['privacy-status', 'dsr-summary', 'data-breach-report', 'compliance-status'],
    defaultNotificationPrefs: {
      data_breach: true,
      dsr_received: true,
      privacy_assessment_due: true,
      compliance_breach: true,
      policy_expiry: true,
    },
    defaultNavItems: ['dashboard', 'privacy', 'compliance', 'incident', 'policy', 'evidence', 'reporting'],
  },
  {
    profileId: 'it_security_officer',
    name_en: 'IT Security Officer',
    name_ar: 'مسؤول أمن تقنية المعلومات',
    description_en: 'Handles technical security operations, controls implementation, and incident response.',
    description_ar: 'يتولى العمليات الأمنية التقنية وتنفيذ الضوابط والاستجابة للحوادث.',
    defaultWidgets: ['incident-active', 'vulnerability-summary', 'control-effectiveness', 'asset-inventory', 'patch-status'],
    defaultReportSubscriptions: ['incident-overview', 'vulnerability-report', 'control-testing', 'asset-classification'],
    defaultNotificationPrefs: {
      critical_incident: true,
      vulnerability_detected: true,
      control_failure: true,
      sla_breach: true,
      patch_overdue: true,
    },
    defaultNavItems: ['dashboard', 'incident', 'controls', 'asset', 'vulnerability', 'remediation'],
  },
  {
    profileId: 'internal_auditor',
    name_en: 'Internal Auditor',
    name_ar: 'المدقق الداخلي',
    description_en: 'Performs independent audit of GRC program effectiveness and compliance verification.',
    description_ar: 'يقوم بتدقيق مستقل لفعالية برنامج الحوكمة والمخاطر والامتثال والتحقق من الامتثال.',
    defaultWidgets: ['audit-calendar', 'finding-tracker', 'compliance-posture', 'evidence-freshness', 'remediation-progress'],
    defaultReportSubscriptions: ['audit-findings', 'remediation-tracking', 'compliance-status', 'evidence-collection'],
    defaultNotificationPrefs: {
      audit_finding: true,
      remediation_overdue: true,
      evidence_due: true,
      audit_engagement_start: true,
    },
    defaultNavItems: ['dashboard', 'audit', 'evidence', 'compliance', 'remediation', 'reporting'],
  },
  {
    profileId: 'board_member',
    name_en: 'Board Member',
    name_ar: 'عضو مجلس الإدارة',
    description_en: 'Board-level oversight of cybersecurity strategy, risk appetite, and maturity progress.',
    description_ar: 'إشراف على مستوى مجلس الإدارة على استراتيجية الأمن السيبراني وتقبل المخاطر وتقدم النضج.',
    defaultWidgets: ['executive-summary', 'maturity-radar', 'risk-heatmap', 'compliance-posture', 'incident-trend'],
    defaultReportSubscriptions: ['executive-risk-summary', 'maturity-scorecard', 'compliance-status', 'incident-overview'],
    defaultNotificationPrefs: {
      critical_incident: true,
      compliance_breach: true,
      maturity_change: true,
    },
    defaultNavItems: ['dashboard', 'reporting', 'analytics', 'governance'],
  },
];

// ── DB-Backed Functions ─────────────────────────────────────────────────────

/**
 * Get a single role profile from the functional_roles table.
 * Falls back to PREDEFINED_PROFILES if no DB record found.
 */
export async function getRoleProfile(
  tenantId: string,
  roleCode: string,
): Promise<RoleProfile | null> {
  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT code, name, module_code, description
       FROM ${schema}.functional_roles
       WHERE code = $1`,
      [roleCode],
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      // Merge DB record with predefined profile defaults (if any)
      const predefined = PREDEFINED_PROFILES.find(p => p.profileId === roleCode);
      return {
        profileId: row.code,
        name_en: row.name,
        name_ar: predefined?.name_ar ?? row.name,
        description_en: row.description ?? '',
        description_ar: predefined?.description_ar ?? '',
        defaultWidgets: predefined?.defaultWidgets ?? [],
        defaultReportSubscriptions: predefined?.defaultReportSubscriptions ?? [],
        defaultNotificationPrefs: predefined?.defaultNotificationPrefs ?? {},
        defaultNavItems: predefined?.defaultNavItems ?? [],
      };
    }
  } catch (err) {
    logger.warn(`[role-profile] Failed to query role profile for ${roleCode}: ${(err as Error).message}`);
  }

  // Fallback to predefined
  return PREDEFINED_PROFILES.find(p => p.profileId === roleCode) ?? null;
}

/**
 * List all role profiles from the functional_roles table.
 * Returns DB records enriched with predefined profile defaults where available.
 */
export async function listRoleProfiles(tenantId: string): Promise<RoleProfile[]> {
  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT code, name, module_code, description
       FROM ${schema}.functional_roles
       ORDER BY code`,
    );

    const predefinedMap = new Map(PREDEFINED_PROFILES.map(p => [p.profileId, p]));

    return result.rows.map((row: any) => {
      const predefined = predefinedMap.get(row.code);
      return {
        profileId: row.code,
        name_en: row.name,
        name_ar: predefined?.name_ar ?? row.name,
        description_en: row.description ?? '',
        description_ar: predefined?.description_ar ?? '',
        defaultWidgets: predefined?.defaultWidgets ?? [],
        defaultReportSubscriptions: predefined?.defaultReportSubscriptions ?? [],
        defaultNotificationPrefs: predefined?.defaultNotificationPrefs ?? {},
        defaultNavItems: predefined?.defaultNavItems ?? [],
      };
    });
  } catch (err) {
    logger.warn(`[role-profile] Failed to list role profiles: ${(err as Error).message}`);
    return PREDEFINED_PROFILES;
  }
}
