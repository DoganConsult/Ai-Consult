// @ts-nocheck
import { safeQuery } from '../../../config/database';

export interface TenantAdaptation {
  orgType: string;
  sector: string | null;
  sectorLabel: string | null;
  country: string | null;
  companySize: string | null;
  regulatoryProfile: string[];
  recommendedModules: string[];
  dashboardProfile: string;
  languageDefault: string;
}

export interface OrgProfile {
  orgType: string;
  isPublicSector: boolean;
  isRegulated: boolean;
  isSme: boolean;
  isMultinational: boolean;
  hasSubsidiaries: boolean;
  regulatoryBodies: string[];
}

export async function getTenantAdaptation(tenantId: string): Promise<TenantAdaptation> {
  const sessionResult = await safeQuery(
    `SELECT answers FROM public.onboarding_sessions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [tenantId],
  ).catch(() => ({ rows: [] }));
  const answers = sessionResult.rows[0]?.answers || {};
  const sector = answers.industry || answers.sector || null;
  const country = answers.country || answers.headquarters_country || null;
  const companySize = answers.company_size || answers.employee_count || null;

  const orgType = detectOrgType(sector, companySize, country);
  const regulatoryProfile = inferRegulatoryProfile(sector, country);
  const recommendedModules = await inferModules(orgType, sector);
  const dashboardProfile = orgType === 'public_sector' ? 'governance-heavy' : orgType === 'sme' ? 'simplified' : 'standard';

  return {
    orgType,
    sector,
    sectorLabel: sector ? sector.replace(/_/g, ' ') : null,
    country,
    companySize,
    regulatoryProfile,
    recommendedModules,
    dashboardProfile,
    languageDefault: country === 'SA' || country === 'AE' || country === 'KW' ? 'ar' : 'en',
  };
}

export function detectOrgProfile(sector: string | null, companySize: string | null, country: string | null): OrgProfile {
  const orgType = detectOrgType(sector, companySize, country);
  const publicSectors = new Set(['government', 'public_administration', 'defense', 'education_public']);
  const regulatedSectors = new Set(['banking', 'insurance', 'financial_services', 'healthcare', 'telecommunications', 'energy']);
  return {
    orgType,
    isPublicSector: publicSectors.has(sector || ''),
    isRegulated: regulatedSectors.has(sector || ''),
    isSme: companySize === 'small' || companySize === 'micro' || companySize === '1-50' || companySize === '51-200',
    isMultinational: false,
    hasSubsidiaries: false,
    regulatoryBodies: inferRegulatoryProfile(sector, country),
  };
}

/**
 * Detect org profile for a tenant by looking up onboarding answers.
 * Convenience wrapper around detectOrgProfile that accepts a tenantId.
 */
export async function detectOrgProfileForTenant(tenantId: string): Promise<OrgProfile> {
  const sessionResult = await safeQuery(
    `SELECT answers FROM public.onboarding_sessions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [tenantId],
  ).catch(() => ({ rows: [] }));
  const answers = sessionResult.rows[0]?.answers || {};
  const sector = answers.industry || answers.sector || null;
  const country = answers.country || answers.headquarters_country || null;
  const companySize = answers.company_size || answers.employee_count || null;
  return detectOrgProfile(sector, companySize, country);
}

function detectOrgType(sector: string | null, companySize: string | null, _country: string | null): string {
  if (!sector) return 'generic';
  const publicSectors = new Set(['government', 'public_administration', 'defense']);
  if (publicSectors.has(sector)) return 'public_sector';
  if (companySize === 'small' || companySize === 'micro' || companySize === '1-50') return 'sme';
  if (companySize === 'enterprise' || companySize === '5001+' || companySize === '1001-5000') return 'enterprise';
  return 'mid_market';
}

function inferRegulatoryProfile(sector: string | null, country: string | null): string[] {
  const regulators: string[] = [];
  if (country === 'SA') {
    regulators.push('NCA', 'SAMA');
    if (sector === 'banking' || sector === 'financial_services') regulators.push('CMA');
    if (sector === 'healthcare') regulators.push('MOH');
    if (sector === 'telecommunications') regulators.push('CST');
  }
  if (country === 'AE') regulators.push('ADHICS', 'NESA');
  return regulators;
}

async function inferModules(orgType: string, sector: string | null): Promise<string[]> {
  // Load module inference rules from DB — no hardcoded module lists
  try {
    const { safeQuery } = await import('../../../../config/database');
    const { rows } = await safeQuery(
      `SELECT module_code FROM public.module_enablement_rules
       WHERE is_active = TRUE AND (
         condition_type = 'always'
         OR (condition_type = 'org_type' AND condition_value = $1)
         OR (condition_type = 'sector' AND condition_value = $2)
       )
       ORDER BY module_code`,
      [orgType, sector ?? ''],
    );
    if (rows.length > 0) return rows.map((r: any) => r.module_code);
  } catch { /* table may not exist */ }
  return []; // No hardcoded fallback (Law 3)
}
