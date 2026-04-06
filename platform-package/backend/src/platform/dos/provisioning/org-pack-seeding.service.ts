import { safeQuery, tenantSchema, withTransaction } from '../../../config/database/database';

import {  logger } from '../observability/logger.service';
import { SYSTEM_JOB_ACTOR } from '../../../platform/dos/constants/system-actors';

type GenericRow = Record<string, any>;

// ── Interfaces ──

export interface OrgPackTemplate {
  packCode: string;
  nameEn: string;
  nameAr: string | null;
  size: string;
  orgType: string;
  hierarchyDepth: number;
  config: Record<string, unknown>;
}

export interface OrgPackTemplateDept {
  deptCode: string;
  nameEn: string;
  nameAr: string | null;
  divisionCode: string | null;
  sortOrder: number;
  isCritical: boolean;
}

export interface OrgPackTemplateSection {
  sectionCode: string;
  nameEn: string;
  nameAr: string | null;
  deptCode: string;
  sortOrder: number;
  isCritical: boolean;
}

export interface OrgPackTemplateTeam {
  teamCode: string;
  nameEn: string;
  nameAr: string | null;
  deptCode: string | null;
  sectionCode: string | null;
  sortOrder: number;
  isCritical: boolean;
}

export interface DivisionDef {
  code: string;
  name_en: string;
  name_ar?: string;
}

export interface SeedResult {
  packCode: string;
  tenantId: string;
  created: {
    organizations: number;
    divisions: number;
    departments: number;
    sections: number;
    teams: number;
    accessProfiles: number;
    functionalRoles: number;
    permissions: number;
    rolePermissions: number;
    sodRules: number;
    workflows: number;
  };
  skipped: string[];
}

// ── Query functions (read from public template tables) ──

export async function getAvailablePacks(): Promise<OrgPackTemplate[]> {
  const res = await safeQuery(
    `SELECT pack_code, name_en, name_ar, size, org_type, hierarchy_depth, config
     FROM public.org_pack_templates
     WHERE is_active = TRUE
     ORDER BY size, org_type`,
  );
  return res.rows.map((r: GenericRow) => ({
    packCode: r.pack_code,
    nameEn: r.name_en,
    nameAr: r.name_ar ?? null,
    size: r.size,
    orgType: r.org_type,
    hierarchyDepth: r.hierarchy_depth,
    config: r.config || {},
  }));
}

export async function getPackTemplate(packCode: string): Promise<OrgPackTemplate | null> {
  const res = await safeQuery(
    `SELECT pack_code, name_en, name_ar, size, org_type, hierarchy_depth, config
     FROM public.org_pack_templates
     WHERE pack_code = $1 AND is_active = TRUE`,
    [packCode],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    packCode: row.pack_code,
    nameEn: row.name_en,
    nameAr: row.name_ar ?? null,
    size: row.size,
    orgType: row.org_type,
    hierarchyDepth: row.hierarchy_depth,
    config: row.config || {},
  };
}

export async function getPackDepartments(packCode: string): Promise<OrgPackTemplateDept[]> {
  const res = await safeQuery(
    `SELECT dept_code, name_en, name_ar, division_code, sort_order, is_critical
     FROM public.org_pack_template_departments
     WHERE pack_code = $1
     ORDER BY sort_order, dept_code`,
    [packCode],
  );
  return res.rows.map((r: GenericRow) => ({
    deptCode: r.dept_code,
    nameEn: r.name_en,
    nameAr: r.name_ar ?? null,
    divisionCode: r.division_code ?? null,
    sortOrder: r.sort_order,
    isCritical: r.is_critical,
  }));
}

export async function getPackSections(packCode: string): Promise<OrgPackTemplateSection[]> {
  const res = await safeQuery(
    `SELECT section_code, name_en, name_ar, dept_code, sort_order, is_critical
     FROM public.org_pack_template_sections
     WHERE pack_code = $1
     ORDER BY sort_order, section_code`,
    [packCode],
  );
  return res.rows.map((r: GenericRow) => ({
    sectionCode: r.section_code,
    nameEn: r.name_en,
    nameAr: r.name_ar ?? null,
    deptCode: r.dept_code,
    sortOrder: r.sort_order,
    isCritical: r.is_critical,
  }));
}

export async function getPackTeams(packCode: string): Promise<OrgPackTemplateTeam[]> {
  const res = await safeQuery(
    `SELECT team_code, name_en, name_ar, dept_code, section_code, sort_order, is_critical
     FROM public.org_pack_template_teams
     WHERE pack_code = $1
     ORDER BY sort_order, team_code`,
    [packCode],
  );
  return res.rows.map((r: GenericRow) => ({
    teamCode: r.team_code,
    nameEn: r.name_en,
    nameAr: r.name_ar ?? null,
    deptCode: r.dept_code ?? null,
    sectionCode: r.section_code ?? null,
    sortOrder: r.sort_order,
    isCritical: r.is_critical,
  }));
}

// ── Main seeding function ──

export async function seedTenantFromPack(
  tenantId: string,
  packCode: string,
  orgNameEn: string,
  orgNameAr?: string,
  createdBy?: string,
): Promise<SeedResult> {
  const pack = await getPackTemplate(packCode);
  if (!pack) throw new Error(`Pack not found: ${packCode}`);

  const [templateDepts, templateSections, templateTeams] = await Promise.all([
    getPackDepartments(packCode),
    getPackSections(packCode),
    getPackTeams(packCode),
  ]);

  if (templateDepts.length === 0 && templateTeams.length === 0) {
    throw new Error(`Pack has no structural templates: ${packCode}`);
  }

  const schema = tenantSchema(tenantId);
  const divisions: DivisionDef[] = Array.isArray((pack.config).divisions)
    ? (pack.config).divisions
    : [];

  return withTransaction(tenantId, async (client) => {
    const q = (text: string, params?: unknown[]) => client.query(text, params);

    const result: SeedResult = {
      packCode,
      tenantId,
      created: {
        organizations: 0, divisions: 0, departments: 0, sections: 0, teams: 0,
        accessProfiles: 0, functionalRoles: 0, permissions: 0, rolePermissions: 0, sodRules: 0, workflows: 0,
      },
      skipped: [],
    };

    const idMap = new Map<string, string>();
    const actor = createdBy ||  SYSTEM_JOB_ACTOR;
    const skipped: string[] = [];

    // ── 1. Organization (implicit — one per pack) ──
    const orgRes = await q(
      `INSERT INTO "${schema}".organizations (tenant_id, name_en, name_ar, org_type, status, metadata, created_by)
       VALUES ($1, $2, $3, 'holding', 'active', $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING org_id`,
      [tenantId, orgNameEn, orgNameAr || orgNameEn,
       JSON.stringify({ pack_code: packCode }), actor],
    );
    const orgRow = orgRes.rows[0];
    if (orgRow) {
      idMap.set('ORG-ROOT', orgRow.org_id);
      result.created.organizations = 1;
    }

    // ── 2. Divisions (from pack.config.divisions[]) ──
    const orgId = idMap.get('ORG-ROOT');
    for (const div of divisions) {
      if (!orgId) { skipped.push(`division:${div.code} (org unresolved)`); continue; }
      const res = await q(
        `INSERT INTO "${schema}".business_units (org_id, name_en, name_ar, code, status, metadata, created_by)
         VALUES ($1, $2, $3, $4, 'active', $5, $6)
         ON CONFLICT (org_id, code) DO NOTHING
         RETURNING bu_id`,
        [orgId, div.name_en, div.name_ar || div.name_en, div.code,
         JSON.stringify({ pack_code: packCode }), actor],
      );
      const row = res.rows[0];
      if (row) {
        idMap.set(div.code, row.bu_id);
        result.created.divisions++;
      }
    }

    // ── 3. Departments (from org_pack_template_departments) ──
    for (const dept of templateDepts) {
      let parentId: string | undefined;
      let buId: string | null = null;
      let deptOrgId: string | null = null;

      if (dept.divisionCode) {
        parentId = idMap.get(dept.divisionCode);
        if (!parentId) { skipped.push(`department:${dept.deptCode} (division ${dept.divisionCode} unresolved)`); continue; }
        buId = parentId;
      } else {
        parentId = orgId;
        if (!parentId) { skipped.push(`department:${dept.deptCode} (org unresolved)`); continue; }
        deptOrgId = parentId;
      }

      const res = await q(
        `INSERT INTO "${schema}".departments (bu_id, org_id, name_en, name_ar, code, status, metadata, created_by)
         VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
         ON CONFLICT (code) DO NOTHING
         RETURNING dept_id`,
        [buId, deptOrgId, dept.nameEn, dept.nameAr || dept.nameEn, dept.deptCode,
         JSON.stringify({ pack_code: packCode, is_critical: dept.isCritical }), actor],
      );
      const row = res.rows[0];
      if (row) {
        idMap.set(dept.deptCode, row.dept_id);
        result.created.departments++;
      }
    }

    // ── 4. Sections (from org_pack_template_sections) ──
    for (const sec of templateSections) {
      const parentId = idMap.get(sec.deptCode);
      if (!parentId) { skipped.push(`section:${sec.sectionCode} (dept ${sec.deptCode} unresolved)`); continue; }
      const res = await q(
        `INSERT INTO "${schema}".sections (dept_id, name_en, name_ar, code, status, metadata, created_by)
         VALUES ($1, $2, $3, $4, 'active', $5, $6)
         ON CONFLICT (dept_id, code) DO NOTHING
         RETURNING section_id`,
        [parentId, sec.nameEn, sec.nameAr || sec.nameEn, sec.sectionCode,
         JSON.stringify({ pack_code: packCode }), actor],
      );
      const row = res.rows[0];
      if (row) {
        idMap.set(sec.sectionCode, row.section_id);
        result.created.sections++;
      }
    }

    // ── 5. Teams (from org_pack_template_teams) ──
    for (const team of templateTeams) {
      let deptId: string | null = null;
      let sectionId: string | null = null;

      if (team.sectionCode) {
        const parentId = idMap.get(team.sectionCode);
        if (!parentId) { skipped.push(`team:${team.teamCode} (section ${team.sectionCode} unresolved)`); continue; }
        sectionId = parentId;
      } else if (team.deptCode) {
        const parentId = idMap.get(team.deptCode);
        if (!parentId) { skipped.push(`team:${team.teamCode} (dept ${team.deptCode} unresolved)`); continue; }
        deptId = parentId;
      } else {
        skipped.push(`team:${team.teamCode} (no parent defined)`);
        continue;
      }

      const res = await q(
        `INSERT INTO "${schema}".teams (team_code, name_en, name_ar, department_id, section_id, team_type, active, metadata)
         VALUES ($1, $2, $3, $4, $5, 'operational', TRUE, $6)
         ON CONFLICT (team_code) DO NOTHING
         RETURNING team_id`,
        [team.teamCode, team.nameEn, team.nameAr || team.nameEn, deptId, sectionId,
         JSON.stringify({ pack_code: packCode })],
      );
      const row = res.rows[0];
      if (row) {
        idMap.set(team.teamCode, row.team_id);
        result.created.teams++;
      }
    }

    // ── 6. Coupled seed layers ──
    result.created.accessProfiles = await seedAccessProfiles(schema, packCode, q);
    result.created.functionalRoles = await seedFunctionalRoles(schema, packCode, q);
    result.created.permissions = await seedPermissions(schema, packCode, q);
    result.created.rolePermissions = await seedRolePermissions(schema, packCode, q);
    result.created.sodRules = await seedSodRules(schema, packCode, q);
    result.created.workflows = await seedWorkflows(schema, packCode, q);

    result.skipped = skipped;
    if (skipped.length > 0) {
      logger.warn(`[OrgPackSeeding] ${skipped.length} unit(s) skipped for tenant ${tenantId}:`, skipped);
    }

    return result;
  });
}

// ── Internal seed functions ──

type QueryFn = (text: string, params?: unknown[]) => Promise<{ rows: GenericRow[] }>;

async function seedAccessProfiles(schema: string, packCode: string, q: QueryFn): Promise<number> {
  const res = await safeQuery(
    `SELECT profile_code, name_en, name_ar, description_en
     FROM public.org_pack_template_profiles WHERE pack_code = $1`, [packCode]);
  let count = 0;
  for (const row of res.rows) {
    const ins = await q(
      `INSERT INTO "${schema}".access_profiles (code, name, description)
       VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING RETURNING id`,
      [row.profile_code, row.name_en, row.description_en || '']);
    if (ins.rows.length > 0) count++;
  }
  return count;
}

async function seedFunctionalRoles(schema: string, packCode: string, q: QueryFn): Promise<number> {
  const res = await safeQuery(
    `SELECT role_code, module_code, name_en, description_en
     FROM public.org_pack_template_roles WHERE pack_code = $1`, [packCode]);
  let count = 0;
  for (const row of res.rows) {
    const ins = await q(
      `INSERT INTO "${schema}".functional_roles (code, module_code, name, description)
       VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO NOTHING RETURNING id`,
      [row.role_code, row.module_code, row.name_en, row.description_en || '']);
    if (ins.rows.length > 0) count++;
  }
  return count;
}

async function seedPermissions(schema: string, packCode: string, q: QueryFn): Promise<number> {
  const res = await safeQuery(
    `SELECT permission_code, module_code, resource_code, action_code, description_en
     FROM public.org_pack_template_permissions WHERE pack_code = $1`, [packCode]);
  let count = 0;
  for (const row of res.rows) {
    const ins = await q(
      `INSERT INTO "${schema}".permissions (code, module_code, resource_code, action_code, description)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO NOTHING RETURNING id`,
      [row.permission_code, row.module_code, row.resource_code, row.action_code, row.description_en || '']);
    if (ins.rows.length > 0) count++;
  }
  return count;
}

async function seedRolePermissions(schema: string, packCode: string, q: QueryFn): Promise<number> {
  const res = await safeQuery(
    `SELECT role_code, permission_code
     FROM public.org_pack_template_role_permissions WHERE pack_code = $1`, [packCode]);
  let count = 0;
  for (const row of res.rows) {
    const ins = await q(
      `INSERT INTO "${schema}".role_permissions (functional_role_id, permission_id)
       SELECT fr.id, p.id FROM "${schema}".functional_roles fr, "${schema}".permissions p
       WHERE fr.code = $1 AND p.code = $2
       ON CONFLICT DO NOTHING RETURNING id`,
      [row.role_code, row.permission_code]);
    if (ins.rows.length > 0) count++;
  }
  return count;
}

async function seedSodRules(schema: string, packCode: string, q: QueryFn): Promise<number> {
  const res = await safeQuery(
    `SELECT role_code_a, role_code_b, module_code, conflict_level, scope_rule, description_en
     FROM public.org_pack_template_sod_rules WHERE pack_code = $1`, [packCode]);
  let count = 0;
  for (const row of res.rows) {
    const ins = await q(
      `INSERT INTO "${schema}".sod_rules
       (role_code_a, role_code_b, module_code, conflict_level, scope_rule, is_active, description)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6) ON CONFLICT DO NOTHING RETURNING id`,
      [row.role_code_a, row.role_code_b, row.module_code,
       row.conflict_level, row.scope_rule, row.description_en || '']);
    if (ins.rows.length > 0) count++;
  }
  return count;
}

async function seedWorkflows(schema: string, packCode: string, q: QueryFn): Promise<number> {
  const res = await safeQuery(
    `SELECT workflow_code, module_code, from_status, to_status,
            required_role_code, min_approvers, require_different_user
     FROM public.org_pack_template_workflows WHERE pack_code = $1`, [packCode]);
  let count = 0;
  for (const row of res.rows) {
    const ins = await q(
      `INSERT INTO "${schema}".workflow_profile_transitions
       (archetype_code, module_code, from_state, to_state, transition_key, required_authority, min_approvers, require_different_user)
       VALUES ('pack_seeded', $1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (archetype_code, module_code, from_state, to_state) DO NOTHING RETURNING id`,
      [row.module_code, row.from_status, row.to_status, row.workflow_code,
       row.required_role_code || 'submit', row.min_approvers ?? 0, row.require_different_user ?? false]);
    if (ins.rows.length > 0) count++;
  }
  return count;
}

export function recommendPack(employeeCount: number): string {
  if (employeeCount < 50) return 'small_standard';
  if (employeeCount < 200) return 'standard_standard';
  return 'enterprise_standard';
}
