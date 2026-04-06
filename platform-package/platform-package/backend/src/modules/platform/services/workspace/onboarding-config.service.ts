import { safeQuery } from '../../../../config/database';

export interface WorkspaceSeedProfile {
  profile_code: string;
  sector: string | null;
  company_size: string | null;
  regulator_codes: string[] | null;
  framework_codes: string[] | null;
  dashboard_template_codes: string[];
  workflow_template_codes: string[];
  assessment_template_codes: string[];
  plan90d_template_code: string;
  module_codes: string[];
}

export async function getWorkspaceSeedProfile(
  sector: string | null,
  companySize: string | null,
  _regulatorCodes: string[] | null,
): Promise<WorkspaceSeedProfile | null> {
  const result = await safeQuery(
    `SELECT profile_code, sector, company_size, regulator_codes, framework_codes,
            dashboard_template_codes, workflow_template_codes, assessment_template_codes,
            plan90d_template_code, module_codes
     FROM public.workspace_seed_profiles
     WHERE is_active = TRUE
       AND (sector IS NULL OR sector = $1)
       AND (company_size IS NULL OR company_size = $2)
     ORDER BY
       CASE WHEN sector = $1 THEN 0 ELSE 1 END,
       CASE WHEN company_size = $2 THEN 0 ELSE 1 END
     LIMIT 1`,
    [sector, companySize],
  ).catch(() => ({ rows: [] }));

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    profile_code: row.profile_code,
    sector: row.sector,
    company_size: row.company_size,
    regulator_codes: row.regulator_codes,
    framework_codes: row.framework_codes,
    dashboard_template_codes: row.dashboard_template_codes || [],
    workflow_template_codes: row.workflow_template_codes || [],
    assessment_template_codes: row.assessment_template_codes || [],
    plan90d_template_code: row.plan90d_template_code || 'DEFAULT_90D',
    module_codes: row.module_codes || [],
  };
}
