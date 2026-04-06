// @ts-nocheck
/**
 * Setup Wizard Service — AI-Guided Company Setup
 *
 * Pure functions for framework detection, role recommendation,
 * company profile validation, and serialization.
 * DB functions for company profile persistence.
 *
 * Requirements: 1.1, 1.2, 1.4, 1.5, 1.6
 *
 * @cross-layer-bridge modules/platform → platform/dos (approved migration path, Phase 3)
 */

import { safeQuery, tenantSchema } from '../../../config/database/database';
import { KSA_SECTORS } from '../../../data/ksa-sectors';
import { KSA_FRAMEWORKS } from '../../../data/ksa-frameworks';
import { PREDEFINED_PROFILES } from '../../dauth/identity/role-profile.service';
import { getFrameworkRegistry } from './onboarding-config.service';
import type {
  JourneyCompanyProfile,
  FrameworkRecommendation,
  RoleRecommendation,
  CompanySize,
} from '../../../types/journey.types';
import { getFirstRow } from '../../../shared/data/db-utils';

// ===========================================================================
// Framework Registry — DB-driven via onboarding-config.service
// Falls back to KSA_FRAMEWORKS for startup before DB is ready
// ===========================================================================

interface FrameworkMeta {
  nameEn: string;
  nameAr: string;
  reasonEn: string;
  reasonAr: string;
}

/** DB-driven framework registry. Cached via onboarding-config.service. */
async function loadFrameworkRegistry(): Promise<Record<string, FrameworkMeta>> {
  const registry: Record<string, FrameworkMeta> = {};
  try {
    const entries = await getFrameworkRegistry();
    for (const e of entries) {
      registry[e.framework_code] = {
        nameEn: e.name_en,
        nameAr: e.name_ar || e.name_en,
        reasonEn: e.summary_en || `Required for compliance.`,
        reasonAr: e.summary_ar || e.summary_en || `مطلوب للامتثال.`,
      };
    }
  } catch {
    // Fallback to KSA_FRAMEWORKS if DB not ready (startup race)
    for (const fw of KSA_FRAMEWORKS) {
      registry[fw.instrumentId] = {
        nameEn: fw.nameEn,
        nameAr: fw.nameAr,
        reasonEn: fw.summaryEn,
        reasonAr: fw.summaryAr,
      };
    }
  }
  return registry;
}


// ===========================================================================
// Required fields for company profile validation
// ===========================================================================

const REQUIRED_PROFILE_FIELDS: (keyof JourneyCompanyProfile)[] = [
  'companyName',
  'industrySector',
  'employeeCount',
  'ksaRegion',
];

// ===========================================================================
// Pure Functions
// ===========================================================================

/**
 * Detect applicable regulatory frameworks for a given sector.
 * Looks up the sector in KSA_SECTORS and returns FrameworkRecommendation[]
 * with bilingual names and reasons from the framework registry.
 *
 * Requirement 1.2: Auto-detect applicable KSA regulatory frameworks.
 */
export async function detectApplicableFrameworks(sectorId: string): Promise<FrameworkRecommendation[]> {
  const sector = KSA_SECTORS.find(s => s.sectorId === sectorId);
  if (!sector) return [];

  const FRAMEWORK_REGISTRY = await loadFrameworkRegistry();
  return sector.applicableFrameworks.map((fwId, index) => {
    const meta = FRAMEWORK_REGISTRY[fwId];
    const nameEn = meta?.nameEn ?? fwId;
    const nameAr = meta?.nameAr ?? fwId;
    const reason = meta?.reasonEn ?? `Required for ${sector.nameEn} sector compliance.`;
    const reasonAr = meta?.reasonAr ?? `مطلوب لامتثال قطاع ${sector.nameAr}.`;

    // First framework is essential, next ones are recommended, rest optional
    let priority: FrameworkRecommendation['priority'];
    if (index === 0) {
      priority = 'essential';
    } else if (index <= 2) {
      priority = 'recommended';
    } else {
      priority = 'optional';
    }

    return {
      frameworkId: fwId,
      nameEn,
      nameAr,
      reason,
      reasonAr: reasonAr,
      priority,
    };
  });
}

/**
 * Classify company size based on employee count string.
 *
 * Requirement 5.1: small (1-50), medium (51-1000), large (1001+).
 */
export function classifyCompanySize(employeeCount: string): CompanySize {
  switch (employeeCount) {
    case '1-50':
      return 'small';
    case '51-200':
    case '201-1000':
      return 'medium';
    case '1001-5000':
    case '5000+':
      return 'large';
    default:
      return 'medium';
  }
}

/**
 * Recommend GRC roles based on company size and applicable frameworks.
 * Uses PREDEFINED_PROFILES to map roles to default widgets, nav items, etc.
 *
 * Requirement 1.4: Generate recommended organizational structure.
 * Requirement 1.5: Use PREDEFINED_PROFILES for role mapping.
 */
export function recommendRolesForSize(
  employeeCount: string,
  frameworks: FrameworkRecommendation[],
): RoleRecommendation[] {
  const size = classifyCompanySize(employeeCount);
  const hasPrivacy = frameworks.some(f => f.frameworkId.includes('PDPL'));
  const hasFinancial = frameworks.some(f =>
    f.frameworkId.includes('SAMA') || f.frameworkId.includes('CMA'),
  );

  if (size === 'small') {
    return buildSmallCompanyRoles(hasPrivacy, hasFinancial);
  }
  if (size === 'medium') {
    return buildMediumCompanyRoles(hasPrivacy, hasFinancial);
  }
  return buildLargeCompanyRoles(hasPrivacy, hasFinancial);
}

function buildSmallCompanyRoles(
  hasPrivacy: boolean,
  _hasFinancial: boolean,
): RoleRecommendation[] {
  const roles: RoleRecommendation[] = [];

  // CISO covers security + compliance + risk for small companies
  const cisoProfile = PREDEFINED_PROFILES.find(p => p.profileId === 'ciso')!;
  const consolidatedWith = ['compliance_manager', 'risk_manager'];
  if (hasPrivacy) consolidatedWith.push('dpo');

  roles.push({
    profileId: 'ciso',
    nameEn: cisoProfile.name_en,
    nameAr: cisoProfile.name_ar,
    justification: 'In a small company, the CISO covers security, compliance, and risk management responsibilities.',
    justificationAr: 'في الشركات الصغيرة، يتولى رئيس أمن المعلومات مسؤوليات الأمن والامتثال وإدارة المخاطر.',
    isConsolidated: true,
    consolidatedWith,
  });

  // IT Security Officer handles day-to-day operations
  const itSecProfile = PREDEFINED_PROFILES.find(p => p.profileId === 'it_security_officer')!;
  roles.push({
    profileId: 'it_security_officer',
    nameEn: itSecProfile.name_en,
    nameAr: itSecProfile.name_ar,
    justification: 'Handles day-to-day security operations, incident response, and technical controls.',
    justificationAr: 'يتولى العمليات الأمنية اليومية والاستجابة للحوادث والضوابط التقنية.',
    isConsolidated: false,
  });

  return roles;
}

function buildMediumCompanyRoles(
  hasPrivacy: boolean,
  _hasFinancial: boolean,
): RoleRecommendation[] {
  const roles: RoleRecommendation[] = [];

  // Dedicated CISO
  const cisoProfile = PREDEFINED_PROFILES.find(p => p.profileId === 'ciso')!;
  roles.push({
    profileId: 'ciso',
    nameEn: cisoProfile.name_en,
    nameAr: cisoProfile.name_ar,
    justification: 'Leads the cybersecurity program and reports to executive management.',
    justificationAr: 'يقود برنامج الأمن السيبراني ويقدم تقاريره للإدارة التنفيذية.',
    isConsolidated: false,
  });

  // Compliance Manager
  const compProfile = PREDEFINED_PROFILES.find(p => p.profileId === 'compliance_manager')!;
  roles.push({
    profileId: 'compliance_manager',
    nameEn: compProfile.name_en,
    nameAr: compProfile.name_ar,
    justification: 'Manages regulatory compliance, framework assessments, and evidence collection.',
    justificationAr: 'يدير الامتثال التنظيمي وتقييمات الأطر والأدلة.',
    isConsolidated: false,
  });

  // Risk Manager
  const riskProfile = PREDEFINED_PROFILES.find(p => p.profileId === 'risk_manager')!;
  roles.push({
    profileId: 'risk_manager',
    nameEn: riskProfile.name_en,
    nameAr: riskProfile.name_ar,
    justification: 'Manages risk assessments, risk register, and treatment plans.',
    justificationAr: 'يدير تقييمات المخاطر وسجل المخاطر وخطط المعالجة.',
    isConsolidated: false,
  });

  // DPO if privacy frameworks apply
  if (hasPrivacy) {
    const dpoProfile = PREDEFINED_PROFILES.find(p => p.profileId === 'dpo')!;
    roles.push({
      profileId: 'dpo',
      nameEn: dpoProfile.name_en,
      nameAr: dpoProfile.name_ar,
      justification: 'Required for PDPL compliance — manages data protection and privacy operations.',
      justificationAr: 'مطلوب للامتثال لنظام حماية البيانات الشخصية — يدير حماية البيانات وعمليات الخصوصية.',
      isConsolidated: false,
    });
  }

  // IT Security Officer
  const itSecProfile = PREDEFINED_PROFILES.find(p => p.profileId === 'it_security_officer')!;
  roles.push({
    profileId: 'it_security_officer',
    nameEn: itSecProfile.name_en,
    nameAr: itSecProfile.name_ar,
    justification: 'Handles technical security operations, controls implementation, and incident response.',
    justificationAr: 'يتولى العمليات الأمنية التقنية وتنفيذ الضوابط والاستجابة للحوادث.',
    isConsolidated: false,
  });

  return roles;
}

function buildLargeCompanyRoles(
  hasPrivacy: boolean,
  _hasFinancial: boolean,
): RoleRecommendation[] {
  const roles: RoleRecommendation[] = [];

  // Full GRC department
  const profileIds = ['ciso', 'compliance_manager', 'risk_manager', 'it_security_officer', 'internal_auditor', 'board_member'];
  if (hasPrivacy) profileIds.splice(3, 0, 'dpo'); // Insert DPO after risk_manager

  const justifications: Record<string, { en: string; ar: string }> = {
    ciso: {
      en: 'Leads the enterprise cybersecurity program with dedicated team and board reporting.',
      ar: 'يقود برنامج الأمن السيبراني المؤسسي مع فريق مخصص وتقارير لمجلس الإدارة.',
    },
    compliance_manager: {
      en: 'Dedicated compliance function managing multiple framework assessments and audits.',
      ar: 'وظيفة امتثال مخصصة تدير تقييمات ومراجعات أطر متعددة.',
    },
    risk_manager: {
      en: 'Enterprise risk management covering cyber, operational, and third-party risks.',
      ar: 'إدارة المخاطر المؤسسية تشمل المخاطر السيبرانية والتشغيلية ومخاطر الأطراف الخارجية.',
    },
    dpo: {
      en: 'Dedicated data protection officer for PDPL compliance and privacy program management.',
      ar: 'مسؤول حماية بيانات مخصص للامتثال لنظام حماية البيانات الشخصية وإدارة برنامج الخصوصية.',
    },
    it_security_officer: {
      en: 'Manages security operations center, technical controls, and incident response team.',
      ar: 'يدير مركز عمليات الأمن والضوابط التقنية وفريق الاستجابة للحوادث.',
    },
    internal_auditor: {
      en: 'Independent audit function for GRC program effectiveness and compliance verification.',
      ar: 'وظيفة تدقيق مستقلة لفعالية برنامج الحوكمة والمخاطر والامتثال والتحقق من الامتثال.',
    },
    board_member: {
      en: 'Board-level oversight of cybersecurity strategy, risk appetite, and maturity progress.',
      ar: 'إشراف على مستوى مجلس الإدارة على استراتيجية الأمن السيبراني وتقبل المخاطر وتقدم النضج.',
    },
  };

  for (const pid of profileIds) {
    const profile = PREDEFINED_PROFILES.find(p => p.profileId === pid);
    if (!profile) continue;
    const j = justifications[pid] ?? { en: 'Recommended for large enterprise GRC.', ar: 'موصى به لحوكمة المؤسسات الكبيرة.' };
    roles.push({
      profileId: pid,
      nameEn: profile.name_en,
      nameAr: profile.name_ar,
      justification: j.en,
      justificationAr: j.ar,
      isConsolidated: false,
    });
  }

  return roles;
}


/**
 * Validate a partial company profile, returning missing required fields.
 *
 * Requirement 1.6: Prompt for missing fields with helpful explanations.
 */
export function validateCompanyProfile(
  profile: Partial<JourneyCompanyProfile>,
): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  for (const field of REQUIRED_PROFILE_FIELDS) {
    const key = field as string;
    const value = (profile as Record<string, unknown>)[key];
    if (value === undefined || value === null || value === '') {
      missingFields.push(key);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Serialize a JourneyCompanyProfile to JSON string.
 * Round-trip safe with deserializeCompanyProfile.
 */
export function serializeCompanyProfile(profile: JourneyCompanyProfile): string {
  return JSON.stringify(profile);
}

/**
 * Deserialize a JSON string back to JourneyCompanyProfile.
 * Validates required structure and provides safe defaults for arrays.
 */
export function deserializeCompanyProfile(json: string): JourneyCompanyProfile {
  const parsed = JSON.parse(json);
  return {
    profileId: parsed.profileId,
    tenantId: parsed.tenantId,
    companyName: parsed.companyName,
    industrySector: parsed.industrySector,
    employeeCount: parsed.employeeCount,
    ksaRegion: parsed.ksaRegion,
    subsidiaries: Array.isArray(parsed.subsidiaries) ? parsed.subsidiaries : [],
    applicableFrameworks: Array.isArray(parsed.applicableFrameworks) ? parsed.applicableFrameworks : [],
    recommendedRoles: Array.isArray(parsed.recommendedRoles) ? parsed.recommendedRoles : [],
    maturityLevel: parsed.maturityLevel ?? 'none',
    createdAt: parsed.createdAt,
  };
}

// ===========================================================================
// DB Functions
// ===========================================================================

/**
 * Create a new company profile in the tenant schema.
 */
export async function createCompanyProfile(
  tenantId: string,
  profile: JourneyCompanyProfile,
): Promise<JourneyCompanyProfile> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".company_profiles
       (tenant_id, company_name, industry_sector, employee_count, ksa_region,
        subsidiaries, applicable_frameworks, recommended_roles, maturity_level)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (tenant_id) DO UPDATE SET
       company_name = EXCLUDED.company_name,
       industry_sector = EXCLUDED.industry_sector,
       employee_count = EXCLUDED.employee_count,
       ksa_region = EXCLUDED.ksa_region,
       subsidiaries = EXCLUDED.subsidiaries,
       applicable_frameworks = EXCLUDED.applicable_frameworks,
       recommended_roles = EXCLUDED.recommended_roles,
       maturity_level = EXCLUDED.maturity_level
     RETURNING profile_id, created_at`,
    [
      tenantId,
      profile.companyName,
      profile.industrySector,
      profile.employeeCount,
      profile.ksaRegion,
      JSON.stringify(profile.subsidiaries),
      JSON.stringify(profile.applicableFrameworks),
      JSON.stringify(profile.recommendedRoles),
      profile.maturityLevel || 'none',
    ],
  );

  const row = getFirstRow(result);
  return {
    ...profile,
    profileId: row.profile_id,
    tenantId,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * Retrieve the company profile for a tenant.
 * Returns null if no profile exists.
 */
export async function getCompanyProfile(
  tenantId: string,
): Promise<JourneyCompanyProfile | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT profile_id, tenant_id, company_name, industry_sector, employee_count,
            ksa_region, subsidiaries, applicable_frameworks, recommended_roles,
            maturity_level, created_at
     FROM "${schema}".company_profiles
     WHERE tenant_id = $1`,
    [tenantId],
  );

  if (result.rows.length === 0) return null;

  const row = getFirstRow(result);
  return {
    profileId: row.profile_id,
    tenantId: row.tenant_id,
    companyName: row.company_name,
    industrySector: row.industry_sector,
    employeeCount: row.employee_count,
    ksaRegion: row.ksa_region,
    subsidiaries: row.subsidiaries ?? [],
    applicableFrameworks: row.applicable_frameworks ?? [],
    recommendedRoles: row.recommended_roles ?? [],
    maturityLevel: row.maturity_level,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}
