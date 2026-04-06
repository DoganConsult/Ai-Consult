// ============================================
// Shahin — Notification Template Service
// Template CRUD, variable substitution,
// template preview, versioning,
// EN/AR bilingual templates
// ============================================

import { safeQuery, tenantSchema } from '../../../config/database/database';
import { getFirstRow } from '../../../shared/data/db-utils';
import { v4 as uuid } from 'uuid';

// === Types ===

export type TemplateLang = 'en' | 'ar';

export interface NotificationTemplate {
  templateId: string;
  name: string;
  eventType: string;
  channel: string;
  lang: TemplateLang;
  subjectTemplate: string;
  bodyTemplate: string;
  variables: string[];
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RenderedTemplate {
  subject: string;
  body: string;
  lang: TemplateLang;
  variables: Record<string, string>;
}

// === Pure Functions ===

/**
 * Substitutes {{variable}} placeholders with values from the context map.
 * Unknown variables are left as-is.
 */
export function interpolateTemplate(
  template: string,
  context: Record<string, string | number | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = context[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}

export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
}

export function mergeVariables(subject: string, body: string): string[] {
  return [...new Set([...extractVariables(subject), ...extractVariables(body)])];
}

export function renderTemplate(
  template: NotificationTemplate,
  context: Record<string, string | number | undefined>
): RenderedTemplate {
  return {
    subject: interpolateTemplate(template.subjectTemplate, context),
    body: interpolateTemplate(template.bodyTemplate, context),
    lang: template.lang,
    variables: Object.fromEntries(
      template.variables.map(v => [v, context[v] !== undefined ? String(context[v]) : ''])
    ),
  };
}

// === Mapper ===

function mapTemplate(r: any): NotificationTemplate {
  return {
    templateId: r.template_id,
    name: r.name,
    eventType: r.event_type,
    channel: r.channel,
    lang: r.lang || 'en',
    subjectTemplate: r.subject_template || '',
    bodyTemplate: r.body_template || '',
    variables: r.variables || [],
    version: r.version || 1,
    isActive: r.is_active !== false,
    createdAt: r.created_at?.toISOString?.() || r.created_at,
    updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
  };
}

// === CRUD ===

export async function createTemplate(
  tenantId: string,
  data: {
    name: string;
    eventType: string;
    channel: string;
    lang?: TemplateLang;
    subjectTemplate: string;
    bodyTemplate: string;
  }
): Promise<NotificationTemplate> {
  const schema = tenantSchema(tenantId);
  const variables = mergeVariables(data.subjectTemplate, data.bodyTemplate);
  const result = await safeQuery(
    `INSERT INTO "${schema}".notification_templates
       (template_id, name, event_type, channel, lang,
        subject_template, body_template, variables, version, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,1,true) RETURNING *`,
    [
      uuid(), data.name, data.eventType, data.channel,
      data.lang || 'en', data.subjectTemplate, data.bodyTemplate,
      JSON.stringify(variables),
    ]
  );
  return mapTemplate(getFirstRow(result));
}

export async function getTemplates(
  tenantId: string,
  filters?: { eventType?: string; channel?: string; lang?: TemplateLang; activeOnly?: boolean }
): Promise<NotificationTemplate[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.eventType) { conditions.push(`event_type = $${idx++}`); params.push(filters.eventType); }
  if (filters?.channel) { conditions.push(`channel = $${idx++}`); params.push(filters.channel); }
  if (filters?.lang) { conditions.push(`lang = $${idx++}`); params.push(filters.lang); }
  if (filters?.activeOnly) { conditions.push(`is_active = true`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".notification_templates ${where} ORDER BY name ASC, lang ASC`,
      params
    );
    return result.rows.map(mapTemplate);
  } catch { return []; }
}

export async function getTemplateById(
  tenantId: string,
  templateId: string
): Promise<NotificationTemplate | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".notification_templates WHERE template_id = $1`,
      [templateId]
    );
    const row = getFirstRow(result);
    return row ? mapTemplate(row) : null;
  } catch { return null; }
}

export async function getActiveTemplate(
  tenantId: string,
  eventType: string,
  channel: string,
  lang: TemplateLang = 'en'
): Promise<NotificationTemplate | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".notification_templates
       WHERE event_type = $1 AND channel = $2 AND lang = $3 AND is_active = true
       ORDER BY version DESC LIMIT 1`,
      [eventType, channel, lang]
    );
    const row = getFirstRow(result);
    return row ? mapTemplate(row) : null;
  } catch { return null; }
}

export async function updateTemplate(
  tenantId: string,
  templateId: string,
  updates: Partial<{
    name: string;
    subjectTemplate: string;
    bodyTemplate: string;
    isActive: boolean;
  }>
): Promise<NotificationTemplate> {
  const schema = tenantSchema(tenantId);
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (updates.name) { sets.push(`name = $${idx++}`); params.push(updates.name); }
  if (updates.subjectTemplate !== undefined) {
    sets.push(`subject_template = $${idx++}`); params.push(updates.subjectTemplate);
  }
  if (updates.bodyTemplate !== undefined) {
    sets.push(`body_template = $${idx++}`); params.push(updates.bodyTemplate);
  }
  if (updates.isActive !== undefined) { sets.push(`is_active = $${idx++}`); params.push(updates.isActive); }
  if (updates.subjectTemplate !== undefined || updates.bodyTemplate !== undefined) {
    const tmpl = await getTemplateById(tenantId, templateId);
    const sub = updates.subjectTemplate ?? tmpl?.subjectTemplate ?? '';
    const body = updates.bodyTemplate ?? tmpl?.bodyTemplate ?? '';
    const vars = mergeVariables(sub, body);
    sets.push(`variables = $${idx++}`); params.push(JSON.stringify(vars));
  }
  sets.push(`updated_at = NOW()`);
  params.push(templateId);
  const result = await safeQuery(
    `UPDATE "${schema}".notification_templates SET ${sets.join(', ')} WHERE template_id = $${idx} RETURNING *`,
    params
  );
  if (result.rows.length === 0) throw new Error('Template not found');
  return mapTemplate(getFirstRow(result));
}

export async function versionTemplate(
  tenantId: string,
  templateId: string,
  data: { subjectTemplate: string; bodyTemplate: string }
): Promise<NotificationTemplate> {
  const schema = tenantSchema(tenantId);
  const current = await getTemplateById(tenantId, templateId);
  if (!current) throw new Error('Template not found');

  await safeQuery(
    `UPDATE "${schema}".notification_templates SET is_active = false, updated_at = NOW() WHERE template_id = $1`,
    [templateId]
  );

  return createTemplate(tenantId, {
    name: current.name,
    eventType: current.eventType,
    channel: current.channel,
    lang: current.lang,
    subjectTemplate: data.subjectTemplate,
    bodyTemplate: data.bodyTemplate,
  });
}

export async function previewTemplate(
  tenantId: string,
  templateId: string,
  context: Record<string, string | number | undefined>
): Promise<RenderedTemplate> {
  const tmpl = await getTemplateById(tenantId, templateId);
  if (!tmpl) throw new Error('Template not found');
  return renderTemplate(tmpl, context);
}

export async function renderByEventType(
  tenantId: string,
  eventType: string,
  channel: string,
  context: Record<string, string | number | undefined>,
  lang: TemplateLang = 'en'
): Promise<RenderedTemplate | null> {
  const tmpl = await getActiveTemplate(tenantId, eventType, channel, lang);
  if (!tmpl) return null;
  return renderTemplate(tmpl, context);
}
