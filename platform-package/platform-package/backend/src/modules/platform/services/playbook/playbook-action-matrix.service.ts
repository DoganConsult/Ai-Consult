/**
 * Playbook Action Matrix — resource permissions matrix for each RBAC role.
 *
 * Requirements: 1.2, 3.1, 3.3
 */

type UserRole = string;
import { ActionMatrixEntry } from '../../../agrc-engine/services/engine/playbook.types';
import { ROLE_PERMISSIONS } from './playbook-data';


// ─── Bilingual resource name lookup for action matrix ───

export const RESOURCE_I18N: Record<string, { resource_en: string; resource_ar: string }> = {
  policy:       { resource_en: 'Policies',              resource_ar: 'السياسات' },
  risk:         { resource_en: 'Risks',                 resource_ar: 'المخاطر' },
  framework:    { resource_en: 'Frameworks',             resource_ar: 'الأطر التنظيمية' },
  control:      { resource_en: 'Controls',               resource_ar: 'الضوابط' },
  assessment:   { resource_en: 'Assessments',            resource_ar: 'التقييمات' },
  audit:        { resource_en: 'Audit',                  resource_ar: 'التدقيق' },
  tenant:       { resource_en: 'Tenant Management',      resource_ar: 'إدارة المستأجرين' },
  users:        { resource_en: 'User Management',        resource_ar: 'إدارة المستخدمين' },
  analytics:    { resource_en: 'Analytics',              resource_ar: 'التحليلات' },
  copilot:      { resource_en: 'AI Copilot',             resource_ar: 'المساعد الذكي' },
  integrations: { resource_en: 'Integrations',           resource_ar: 'التكاملات' },
  admin:        { resource_en: 'Administration',         resource_ar: 'الإدارة' },
  profile:      { resource_en: 'Profiles',               resource_ar: 'الملفات الشخصية' },
  workflow:     { resource_en: 'Workflows',              resource_ar: 'سير العمل' },
  report:       { resource_en: 'Reports',                resource_ar: 'التقارير' },
  timeline:     { resource_en: 'Activity Timeline',      resource_ar: 'الجدول الزمني للنشاط' },
  task:         { resource_en: 'Task Board',             resource_ar: 'لوحة المهام' },
  messaging:    { resource_en: 'Messaging',              resource_ar: 'المراسلات' },
  action:       { resource_en: 'Action Items',           resource_ar: 'بنود العمل' },
  quote:        { resource_en: 'Quotes',                 resource_ar: 'الاقتباسات' },
  training:     { resource_en: 'Training Data',          resource_ar: 'بيانات التدريب' },
  ai:           { resource_en: 'AI Services',            resource_ar: 'خدمات الذكاء الاصطناعي' },
  workspace:    { resource_en: 'Workspace',              resource_ar: 'مساحة العمل' },
  compliance:   { resource_en: 'Compliance',             resource_ar: 'الامتثال' },
};

// ─── computeActionMatrix ───

export const ACTION_TYPES = ['read', 'write', 'delete', 'manage'] as const;

/**
 * Compute the Action_Matrix for a given RBAC role.
 * Parses ROLE_PERMISSIONS keys to extract unique resources, then checks which
 * of the four standard actions (read, write, delete, manage) the role has for
 * each resource. Resources with zero permitted actions are excluded.
 *
 * Requirements: 1.2, 3.1, 3.3
 */
export function computeActionMatrix(role: UserRole): ActionMatrixEntry[] {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return [];

  const isWildcard = perms.includes('*');

  // Collect all unique resources from every role's permission strings
  const resourceSet = new Set<string>();
  for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
    for (const perm of ROLE_PERMISSIONS[roleName]) {
      if (perm === '*') continue;
      const colonIdx = perm.indexOf(':');
      if (colonIdx > 0) resourceSet.add(perm.substring(0, colonIdx));
    }
  }

  const result: ActionMatrixEntry[] = [];

  for (const resource of Array.from(resourceSet).sort()) {
    const permissions = {
      read:   isWildcard || perms.includes(`${resource}:read`),
      write:  isWildcard || perms.includes(`${resource}:write`),
      delete: isWildcard || perms.includes(`${resource}:delete`),
      manage: isWildcard || perms.includes(`${resource}:manage`),
    };

    // Exclude resources with zero permissions (Requirement 3.3)
    if (!permissions.read && !permissions.write && !permissions.delete && !permissions.manage) {
      continue;
    }

    const i18n = RESOURCE_I18N[resource];
    result.push({
      resource,
      resource_en: i18n?.resource_en ?? resource,
      resource_ar: i18n?.resource_ar ?? resource,
      permissions,
    });
  }

  return result;
}
