// ============================================
// Shahin — Mapping Service
// Cross-object mapping with entity validation
// and bidirectional relationship queries
// ============================================

import { safeQuery, tenantSchema } from "../../../../config/database";
import { getFirstRow } from '../../../../utils/db-utils';

// Map object type to its database table and primary key
const TABLE_MAP: Record<string, { table: string; pk: string }> = {
  framework:        { table: "frameworks",        pk: "framework_id" },
  risk:             { table: "risks",             pk: "risk_id" },
  policy:           { table: "policies",          pk: "policy_id" },
  control:          { table: "controls",          pk: "control_id" },
  assessment:       { table: "assessments",       pk: "assessment_id" },
  evidence:         { table: "evidence",          pk: "evidence_id" },
  incident:         { table: "incidents",         pk: "incident_id" },
  vendor:           { table: "vendors",           pk: "vendor_id" },
  remediation_task: { table: "remediation_tasks", pk: "task_id" },
  finding:          { table: "findings",          pk: "finding_id" },
  exception:        { table: "exceptions",        pk: "exception_id" },
  asset:            { table: "assets",            pk: "asset_id" },
};

/**
 * Validate that an entity exists in its respective table.
 * Throws 404 if not found, 400 if any type.
 */
async function validateEntityExists(
  schema: string,
  entityType: string,
  entityId: string
): Promise<void> {
  const meta = TABLE_MAP[entityType];
  if (!meta) {
    const err: unknown = new Error(`Unknown entity type: ${entityType}`);
    ((err as Record<string,any>)['status'] as number | undefined) = 400;
    throw err;
  }

  const result = await safeQuery(
    `SELECT "${meta.pk}" FROM "${schema}"."${meta.table}" WHERE "${meta.pk}" = $1`,
    [entityId]
  );
  if (result.rows.length === 0) {
    const err: unknown = new Error(`${entityType} with id ${entityId} not found`);
    ((err as Record<string,any>)['status'] as number | undefined) = 404;
    throw err;
  }
}

// === createMapping ===

export async function createMapping(
  tenantId: string,
  mapping: { source_type: string; source_id: string; target_type: string; target_id: string }
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  // Validate both source and target entities exist
  await validateEntityExists(schema, mapping.source_type, mapping.source_id);
  await validateEntityExists(schema, mapping.target_type, mapping.target_id);

  const result = await safeQuery(
    `INSERT INTO "${schema}".object_mappings (source_type, source_id, target_type, target_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [mapping.source_type, mapping.source_id, mapping.target_type, mapping.target_id]
  );
  return getFirstRow(result);
}

// === deleteMapping ===

export async function deleteMapping(
  tenantId: string,
  mappingId: string
): Promise<boolean> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `DELETE FROM "${schema}".object_mappings WHERE mapping_id = $1 RETURNING mapping_id`,
    [mappingId]
  );
  return result.rows.length > 0;
}

// === deleteMappingsForObject (cascade) ===

export async function deleteMappingsForObject(
  tenantId: string,
  objectType: string,
  objectId: string
): Promise<number> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `DELETE FROM "${schema}".object_mappings
     WHERE (source_type = $1 AND source_id = $2)
        OR (target_type = $1 AND target_id = $2)
     RETURNING mapping_id`,
    [objectType, objectId]
  );
  return result.rowCount ?? result.rows.length;
}

// === getRelationships (bidirectional, grouped by type) ===

export async function getRelationships(
  tenantId: string,
  objectType: string,
  objectId: string
): Promise<Record<string, any[]>> {
  const schema = tenantSchema(tenantId);

  // Get all mappings where this object is source or target
  const result = await safeQuery(
    `SELECT * FROM "${schema}".object_mappings
     WHERE (source_type = $1 AND source_id = $2)
        OR (target_type = $1 AND target_id = $2)
     ORDER BY created_at ASC`,
    [objectType, objectId]
  );

  // Group by the "other" entity's type
  const grouped: Record<string, any[]> = {};

  for (const row of result.rows) {
    let relatedType: string;
    let relatedId: string;

    if (row.source_type === objectType && row.source_id === objectId) {
      // This object is the source — the "other" is the target
      relatedType = row.target_type;
      relatedId = row.target_id;
    } else {
      // This object is the target — the "other" is the source
      relatedType = row.source_type;
      relatedId = row.source_id;
    }

    if (!grouped[relatedType]) {
      grouped[relatedType] = [];
    }

    grouped[relatedType].push({
      mapping_id: row.mapping_id,
      type: relatedType,
      id: relatedId,
      created_at: row.created_at,
    });
  }

  return grouped;
}
