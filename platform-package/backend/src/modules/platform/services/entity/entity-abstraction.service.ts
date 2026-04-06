// Platform - Entity Abstraction Service (Law 2: multi-product base entity layer)
// Provides CRUD for the generic entity tables introduced in migration 435.
// GRC domain tables remain as-is; new features should create entity_instances
// records alongside domain records for cross-product interoperability.

import { query, safeQuery, tenantSchema } from '../../../../config/database';
import { getFirstRow } from '../../../../utils/db-utils';
import { getDefaultProductKey } from '../../../../platform/deployment-profile';

// ============================================================================
// Types
// ============================================================================

export interface EntityType {
  type_code: string;
  product_code: string;
  display_name_en: string;
  display_name_ar: string | null;
  parent_type: string | null;
  icon: string | null;
  color: string | null;
  schema_json: Record<string, any> | null;
  created_at: string;
}

export interface EntityInstance {
  entity_id: string;
  type_code: string;
  tenant_id: string;
  product_code: string;
  display_title: string | null;
  status: string;
  owner_user_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntityRelationship {
  relationship_id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface Requirement {
  requirement_id: string;
  entity_id: string | null;
  source_type: string;
  source_ref: string | null;
  title_en: string;
  title_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Obligation {
  obligation_id: string;
  entity_id: string | null;
  authority_code: string | null;
  obligation_type: string;
  title_en: string;
  title_ar: string | null;
  description_en: string | null;
  frequency: string | null;
  due_date: string | null;
  status: string;
  evidence_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  assessment_id: string;
  entity_id: string | null;
  assessment_type: string;
  assessor_id: string | null;
  score: number | null;
  max_score: number | null;
  rating: string | null;
  findings_count: number;
  assessed_at: string;
  next_review_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface Artifact {
  artifact_id: string;
  entity_id: string | null;
  artifact_type: string;
  title: string | null;
  storage_ref: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  hash_sha256: string | null;
  uploaded_by: string | null;
  expires_at: string | null;
  status: string;
  created_at: string;
}

// ============================================================================
// Entity Type Registry
// ============================================================================

/**
 * Register (upsert) an entity type in the tenant schema.
 * Used when a product declares a new domain entity kind.
 */
export async function registerEntityType(
  tenantId: string,
  typeCode: string,
  productCode: string,
  displayNameEn: string,
  displayNameAr?: string
): Promise<EntityType> {
  const s = tenantSchema(tenantId);
  const result = await query(
    `INSERT INTO "${s}".entity_types (type_code, product_code, display_name_en, display_name_ar)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (type_code) DO UPDATE
       SET product_code = EXCLUDED.product_code,
           display_name_en = EXCLUDED.display_name_en,
           display_name_ar = COALESCE(EXCLUDED.display_name_ar, entity_types.display_name_ar)
     RETURNING *`,
    [typeCode, productCode, displayNameEn, displayNameAr ?? null]
  );
  return result.rows[0] as EntityType;
}

// ============================================================================
// Entity Instances
// ============================================================================

/**
 * Create a new entity instance in the base entity table.
 * Returns the generated entity_id (UUID).
 */
export async function createEntityInstance(
  tenantId: string,
  typeCode: string,
  opts: {
    title?: string;
    status?: string;
    ownerId?: string;
    createdBy?: string;
    productCode?: string;
  } = {}
): Promise<string> {
  const s = tenantSchema(tenantId);
  const result = await query(
    `INSERT INTO "${s}".entity_instances
       (type_code, tenant_id, product_code, display_title, status, owner_user_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING entity_id`,
    [
      typeCode,
      tenantId,
      opts.productCode ?? getDefaultProductKey(),
      opts.title ?? null,
      opts.status ?? 'active',
      opts.ownerId ?? null,
      opts.createdBy ?? null,
    ]
  );
  return result.rows[0].entity_id as string;
}

/**
 * Retrieve a single entity instance by ID.
 */
export async function getEntityInstance(
  tenantId: string,
  entityId: string
): Promise<EntityInstance | null> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".entity_instances WHERE entity_id = $1`,
    [entityId]
  );
  return getFirstRow<EntityInstance>(result);
}

/**
 * List entity instances filtered by type and optional criteria.
 */
export async function getEntitiesByType(
  tenantId: string,
  typeCode: string,
  opts: { status?: string; limit?: number; offset?: number } = {}
): Promise<EntityInstance[]> {
  const s = tenantSchema(tenantId);
  const conditions = ['type_code = $1'];
  const params: unknown[] = [typeCode];
  let paramIdx = 2;

  if (opts.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(opts.status);
  }

  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;

  const result = await safeQuery(
    `SELECT * FROM "${s}".entity_instances
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, limit, offset]
  );
  return result.rows as EntityInstance[];
}

// ============================================================================
// Entity Relationships
// ============================================================================

/**
 * Create a directional relationship between two entity instances.
 * Uses ON CONFLICT to avoid duplicate links.
 */
export async function linkEntities(
  tenantId: string,
  sourceId: string,
  targetId: string,
  relationshipType: string,
  metadata?: Record<string, any>
): Promise<EntityRelationship> {
  const s = tenantSchema(tenantId);
  const result = await query(
    `INSERT INTO "${s}".entity_relationships
       (source_entity_id, target_entity_id, relationship_type, metadata)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (source_entity_id, target_entity_id, relationship_type) DO UPDATE
       SET metadata = COALESCE(EXCLUDED.metadata, entity_relationships.metadata)
     RETURNING *`,
    [sourceId, targetId, relationshipType, metadata ? JSON.stringify(metadata) : null]
  );
  return result.rows[0] as EntityRelationship;
}

/**
 * Get relationships for an entity, optionally filtered by direction.
 * - 'source': entity is the source (outgoing)
 * - 'target': entity is the target (incoming)
 * - 'both': all relationships involving the entity (default)
 */
export async function getEntityRelationships(
  tenantId: string,
  entityId: string,
  direction: 'source' | 'target' | 'both' = 'both'
): Promise<EntityRelationship[]> {
  const s = tenantSchema(tenantId);

  let whereClause: string;
  if (direction === 'source') {
    whereClause = 'source_entity_id = $1';
  } else if (direction === 'target') {
    whereClause = 'target_entity_id = $1';
  } else {
    whereClause = 'source_entity_id = $1 OR target_entity_id = $1';
  }

  const result = await safeQuery(
    `SELECT * FROM "${s}".entity_relationships
     WHERE ${whereClause}
     ORDER BY created_at DESC`,
    [entityId]
  );
  return result.rows as EntityRelationship[];
}

// ============================================================================
// Requirements
// ============================================================================

/**
 * Create a requirement (generic compliance/obligation item) linked to an entity.
 */
export async function createRequirement(
  tenantId: string,
  entityId: string,
  opts: {
    sourceType: string;
    sourceRef?: string;
    titleEn: string;
    titleAr?: string;
    descriptionEn?: string;
    priority?: string;
    dueDate?: string;
  }
): Promise<Requirement> {
  const s = tenantSchema(tenantId);
  const result = await query(
    `INSERT INTO "${s}".requirements
       (entity_id, source_type, source_ref, title_en, title_ar, description_en, priority, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      entityId,
      opts.sourceType,
      opts.sourceRef ?? null,
      opts.titleEn,
      opts.titleAr ?? null,
      opts.descriptionEn ?? null,
      opts.priority ?? 'medium',
      opts.dueDate ?? null,
    ]
  );
  return result.rows[0] as Requirement;
}

// ============================================================================
// Obligations
// ============================================================================

/**
 * Create an obligation (regulatory/contractual duty) linked to an entity.
 */
export async function createObligation(
  tenantId: string,
  entityId: string,
  opts: {
    authorityCode?: string;
    obligationType: string;
    titleEn: string;
    titleAr?: string;
    descriptionEn?: string;
    frequency?: string;
    dueDate?: string;
  }
): Promise<Obligation> {
  const s = tenantSchema(tenantId);
  const result = await query(
    `INSERT INTO "${s}".obligations
       (entity_id, authority_code, obligation_type, title_en, title_ar, description_en, frequency, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      entityId,
      opts.authorityCode ?? null,
      opts.obligationType,
      opts.titleEn,
      opts.titleAr ?? null,
      opts.descriptionEn ?? null,
      opts.frequency ?? null,
      opts.dueDate ?? null,
    ]
  );
  return result.rows[0] as Obligation;
}

// ============================================================================
// Assessments
// ============================================================================

/**
 * Create an assessment (evaluation record) linked to an entity.
 */
export async function createEntityAssessment(
  tenantId: string,
  entityId: string,
  opts: {
    assessmentType: string;
    assessorId?: string;
    score?: number;
    maxScore?: number;
    rating?: string;
    notes?: string;
    nextReviewAt?: string;
  }
): Promise<Assessment> {
  const s = tenantSchema(tenantId);
  const result = await query(
    `INSERT INTO "${s}".assessments
       (entity_id, assessment_type, assessor_id, score, max_score, rating, notes, next_review_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      entityId,
      opts.assessmentType,
      opts.assessorId ?? null,
      opts.score ?? null,
      opts.maxScore ?? null,
      opts.rating ?? null,
      opts.notes ?? null,
      opts.nextReviewAt ?? null,
    ]
  );
  return result.rows[0] as Assessment;
}

// ============================================================================
// Artifacts
// ============================================================================

/**
 * Create an artifact (evidence, document, attachment) linked to an entity.
 */
export async function createArtifact(
  tenantId: string,
  entityId: string,
  opts: {
    artifactType: string;
    title?: string;
    storageRef?: string;
    mimeType?: string;
    fileSizeBytes?: number;
    hashSha256?: string;
    uploadedBy?: string;
    expiresAt?: string;
  }
): Promise<Artifact> {
  const s = tenantSchema(tenantId);
  const result = await query(
    `INSERT INTO "${s}".artifacts
       (entity_id, artifact_type, title, storage_ref, mime_type, file_size_bytes, hash_sha256, uploaded_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      entityId,
      opts.artifactType,
      opts.title ?? null,
      opts.storageRef ?? null,
      opts.mimeType ?? null,
      opts.fileSizeBytes ?? null,
      opts.hashSha256 ?? null,
      opts.uploadedBy ?? null,
      opts.expiresAt ?? null,
    ]
  );
  return result.rows[0] as Artifact;
}
