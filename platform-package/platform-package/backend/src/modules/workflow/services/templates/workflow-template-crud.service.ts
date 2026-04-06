// @ts-nocheck
// ============================================
// AGRC-OS — Workflow Template CRUD (Re-export Barrel)
//
// The canonical implementation lives in:
//   services/core/workflow-template-crud.service.ts
//
// This barrel re-exports everything from the canonical location
// so that existing imports from this path continue to work.
// It also provides the legacy-shaped CRUD functions
// (saveWorkflowTemplate, getWorkflowTemplates, getWorkflowTemplateById,
//  instantiateCustomTemplate) that are consumed by workflow.service.ts
// and workflows.routes.ts.
//
// Law 1: One canonical engine per concern — no duplicate logic.
// ============================================

// Re-export all canonical template CRUD exports
export {
  createTemplate,
  getTemplate,
  getTemplateById,
  listTemplates,
  updateTemplate,
  deleteTemplate,
  cloneTemplate,
  getTemplateVersions,
  getTemplateVersion,
} from '../core/workflow-template-crud.service';

export type {
  TemplateNode,
  TemplateEdge,
  TemplateDefinition,
  WorkflowTemplate,
  TemplateVersion,
  TemplateListFilters,
} from '../core/workflow-template-crud.service';

// ── Legacy-shaped CRUD functions ────────────────────────────────
// These functions provide backward compatibility with the older API
// shape used by workflows.routes.ts and workflow.service.ts.

import { safeQuery, tenantSchema } from '../../../../config/database';

/**
 * Save a workflow template using the legacy parameter shape.
 * Used by workflows.routes.ts for backward compatibility.
 */
export async function saveWorkflowTemplate(
  tenantId: string,
  template: {
    name: string;
    description?: string;
    definition: unknown;
    parametersSchema?: unknown;
    createdBy: string;
    departmentId?: string | null;
  },
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_templates
      (name, description, definition, parameters_schema, created_by, department_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      template.name,
      template.description || null,
      JSON.stringify(template.definition),
      JSON.stringify(template.parametersSchema || {}),
      template.createdBy,
      template.departmentId ?? null,
    ],
  );
  return result.rows[0];
}

/**
 * List workflow templates with optional department filtering (legacy shape).
 */
export async function getWorkflowTemplates(
  tenantId: string,
  options?: { departmentId?: string | null },
): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".workflow_templates`;
  const params: unknown[] = [];
  if (options?.departmentId !== undefined) {
    if (options.departmentId == null || options.departmentId === '') {
      sql += ` WHERE department_id IS NULL`;
    } else {
      sql += ` WHERE (department_id IS NULL OR department_id = $1)`;
      params.push(options.departmentId);
    }
  }
  sql += ` ORDER BY created_at DESC`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

/**
 * Get a single workflow template by ID (legacy shape).
 */
export async function getWorkflowTemplateById(
  tenantId: string,
  templateId: string,
): Promise<any | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_templates WHERE template_id = $1`,
    [templateId],
  );
  return result.rows[0] || null;
}

/**
 * Instantiate a workflow from a template with parameter substitution (legacy shape).
 */
export async function instantiateCustomTemplate(
  tenantId: string,
  templateId: string,
  params: Record<string, any>,
  createdBy: string,
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  const templateResult = await safeQuery(
    `SELECT * FROM "${schema}".workflow_templates WHERE template_id = $1`,
    [templateId],
  );
  if (templateResult.rows.length === 0) throw new Error('Template not found');

  const template = templateResult.rows[0];
  let definitionStr = JSON.stringify(template.definition);

  // Parameter substitution: replace {{paramName}} with actual values
  for (const [key, value] of Object.entries(params)) {
    definitionStr = definitionStr.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
      String(value),
    );
  }

  const definition = JSON.parse(definitionStr);
  const templateDepartmentId = template.department_id ?? null;

  // Create a new workflow from the template (copy department scope)
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflows
      (name, definition, created_by, department_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      `${template.name} (from template)`,
      JSON.stringify(definition),
      createdBy,
      templateDepartmentId,
    ],
  );

  return result.rows[0];
}
