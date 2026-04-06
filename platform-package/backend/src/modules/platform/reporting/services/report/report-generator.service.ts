// @ts-nocheck
/**
 * Report Generator Service
 * --------------------------------
 * Loads a report template, executes the SQL / aggregation queries defined
 * in each template section, and assembles a structured report document.
 *
 * Template sections are stored as JSONB arrays in `report_templates.sections`:
 *   [{ "title": "...", "query": "SELECT ...", "type": "table"|"summary"|"chart" }, ...]
 *
 * Parameterised placeholders in section queries:
 *   {{startDate}}, {{endDate}}, {{modules}} — replaced at runtime from params.
 */

import { v4 as uuid } from 'uuid';
import { safeQuery } from '../../../../../config/database';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function schema(tenantId: string): string {
  return `tenant_${tenantId.replace(/-/g, '_')}`;
}

interface TemplateSection {
  title: string;
  query?: string;
  type?: 'table' | 'summary' | 'chart' | 'text';
  staticContent?: string;
}

interface ReportSection {
  title: string;
  data: unknown;
}

/**
 * Replace template placeholders with actual parameter values.
 * Only known tokens are substituted; anything else is left as-is.
 */
function interpolateQuery(
  query: string,
  s: string,
  params: { startDate?: string; endDate?: string; modules?: string[] },
): string {
  let q = query;
  // Inject the tenant schema so template authors write {{schema}} instead of hard-coding
  q = q.replace(/\{\{schema\}\}/g, `"${s}"`);
  if (params.startDate) {
    q = q.replace(/\{\{startDate\}\}/g, params.startDate);
  }
  if (params.endDate) {
    q = q.replace(/\{\{endDate\}\}/g, params.endDate);
  }
  if (params.modules && params.modules.length > 0) {
    const quoted = params.modules.map((m) => `'${m.replace(/'/g, "''")}'`).join(',');
    q = q.replace(/\{\{modules\}\}/g, quoted);
  }
  return q;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface GeneratedReport {
  reportId: string;
  title: string;
  generatedAt: string;
  sections: ReportSection[];
}

/**
 * Generate a report from a persisted template.
 *
 * @param tenantId    Target tenant schema.
 * @param templateId  UUID of the report_templates row.
 * @param params      Runtime parameters (date range, module filter, output format).
 */
export async function generateReport(
  tenantId: string,
  templateId: string,
  params: {
    startDate?: string;
    endDate?: string;
    modules?: string[];
    format?: 'json' | 'html';
  } = {},
): Promise<GeneratedReport> {
  const s = schema(tenantId);
  const reportId = uuid();
  const generatedAt = new Date().toISOString();

  // 1. Load the template
  const templateResult = await safeQuery(
    `SELECT id, name, description, sections, is_active
       FROM "${s}".report_templates
      WHERE id = $1`,
    [templateId],
  );

  if (!templateResult.rows || templateResult.rows.length === 0) {
    return {
      reportId,
      title: 'Error — Template Not Found',
      generatedAt,
      sections: [
        { title: 'Error', data: { error: `Report template "${templateId}" not found` } },
      ],
    };
  }

  const template = templateResult.rows[0];

  if (!template.is_active) {
    return {
      reportId,
      title: `${template.name} (inactive)`,
      generatedAt,
      sections: [
        { title: 'Warning', data: { warning: 'This template is marked inactive.' } },
      ],
    };
  }

  // 2. Parse template sections
  let templateSections: TemplateSection[];
  try {
    templateSections =
      typeof template.sections === 'string'
        ? JSON.parse(template.sections)
        : template.sections;
  } catch {
    return {
      reportId,
      title: template.name,
      generatedAt,
      sections: [
        { title: 'Error', data: { error: 'Template sections are malformed JSON.' } },
      ],
    };
  }

  if (!Array.isArray(templateSections) || templateSections.length === 0) {
    return {
      reportId,
      title: template.name,
      generatedAt,
      sections: [
        { title: 'Info', data: { message: 'Template has no sections defined.' } },
      ],
    };
  }

  // 3. Execute each section's query and collect results
  const sections: ReportSection[] = [];

  for (const section of templateSections) {
    if (section.type === 'text' || (!section.query && section.staticContent)) {
      sections.push({ title: section.title, data: { content: section.staticContent ?? '' } });
      continue;
    }

    if (!section.query) {
      sections.push({ title: section.title, data: { rows: [], note: 'No query defined' } });
      continue;
    }

    const interpolated = interpolateQuery(section.query, s, params);

    try {
      const result = await safeQuery(interpolated);
      sections.push({
        title: section.title,
        data: {
          rows: result.rows,
          rowCount: result.rowCount ?? result.rows.length,
          type: section.type ?? 'table',
        },
      });
    } catch (err: any) {
      sections.push({
        title: section.title,
        data: {
          error: `Query execution failed: ${err.message ?? 'unknown error'}`,
          query: interpolated.slice(0, 300),
        },
      });
    }
  }

  // 4. Persist the generated report
  await safeQuery(
    `INSERT INTO "${s}".generated_reports
       (id, template_id, title, generated_at, parameters, sections, format, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'system')`,
    [
      reportId,
      templateId,
      template.name,
      generatedAt,
      JSON.stringify(params),
      JSON.stringify(sections),
      params.format ?? 'json',
    ],
  );

  // 5. Optionally wrap in HTML
  if (params.format === 'html') {
    return {
      reportId,
      title: template.name,
      generatedAt,
      sections: [
        {
          title: 'Full Report',
          data: {
            html: renderHtml(template.name, generatedAt, sections),
          },
        },
      ],
    };
  }

  return {
    reportId,
    title: template.name,
    generatedAt,
    sections,
  };
}

/* ------------------------------------------------------------------ */
/*  HTML renderer (minimal, server-side)                               */
/* ------------------------------------------------------------------ */

function renderHtml(title: string, generatedAt: string, sections: ReportSection[]): string {
  const sectionHtml = sections
    .map((sec) => {
      const rows = sec.data?.rows;
      if (Array.isArray(rows) && rows.length > 0) {
        const headers = Object.keys(rows[0]);
        const headerRow = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
        const bodyRows = rows
          .map(
            (r: any) =>
              '<tr>' +
              headers.map((h) => `<td>${escapeHtml(String(r[h] ?? ''))}</td>`).join('') +
              '</tr>',
          )
          .join('');
        return `<h2>${escapeHtml(sec.title)}</h2>
<table border="1" cellpadding="4" cellspacing="0">
  <thead><tr>${headerRow}</tr></thead>
  <tbody>${bodyRows}</tbody>
</table>`;
      }
      return `<h2>${escapeHtml(sec.title)}</h2><pre>${escapeHtml(JSON.stringify(sec.data, null, 2))}</pre>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body>
<h1>${escapeHtml(title)}</h1>
<p>Generated: ${escapeHtml(generatedAt)}</p>
${sectionHtml}
</body></html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
