import { safeQuery, tenantSchema } from '../../../../config/database';
import { createActor } from '../../../../platform/dos/profile/actor-identity.service';
import type { ExternalStakeholderProfile, StakeholderType } from '../../../../types/actor-identity.types';

export async function createExternalStakeholder(
  tenantId: string,
  input: {
    stakeholderType: StakeholderType;
    organizationName: string;
    organizationNameAr?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    portalType?: string;
    allowedModules?: string[];
    allowedActions?: string[];
    ndaStatus?: string;
    maxDataClassification?: string;
    validTo?: string;
  },
): Promise<ExternalStakeholderProfile> {
  const schema = tenantSchema(tenantId);

  const actor = await createActor(tenantId, {
    actorType: 'external',
    displayName: input.contactName || input.organizationName,
    email: input.contactEmail,
    metadata: { stakeholderType: input.stakeholderType, org: input.organizationName },
  });

  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".external_stakeholder_profiles
       (actor_id, stakeholder_type, organization_name, organization_name_ar,
        contact_name, contact_email, contact_phone, portal_type,
        allowed_modules, allowed_actions, nda_status,
        max_data_classification, valid_to)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      actor.actorId, input.stakeholderType,
      input.organizationName, input.organizationNameAr || null,
      input.contactName || null, input.contactEmail || null,
      input.contactPhone || null, input.portalType || null,
      input.allowedModules || [], input.allowedActions || ['read'],
      input.ndaStatus || 'none',
      input.maxDataClassification || 'internal',
      input.validTo || null,
    ],
  );

  return mapStakeholderRow(rows[0]);
}

export async function getExternalStakeholder(tenantId: string, id: string): Promise<ExternalStakeholderProfile | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".external_stakeholder_profiles WHERE id = $1`,
    [id],
  );
  return rows.length > 0 ? mapStakeholderRow(rows[0]) : null;
}

export async function listExternalStakeholders(
  tenantId: string,
  type?: StakeholderType,
): Promise<ExternalStakeholderProfile[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".external_stakeholder_profiles WHERE is_active = TRUE`;
  const params: unknown[] = [];
  if (type) {
    params.push(type);
    sql += ` AND stakeholder_type = $${params.length}`;
  }
  sql += ' ORDER BY organization_name';
  const { rows } = await safeQuery(sql, params);
  return rows.map(mapStakeholderRow);
}

export async function updateStakeholderAccess(
  tenantId: string,
  id: string,
  update: { allowedModules?: string[]; allowedActions?: string[]; ndaStatus?: string },
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (update.allowedModules) {
    params.push(update.allowedModules);
    sets.push(`allowed_modules = $${params.length}`);
  }
  if (update.allowedActions) {
    params.push(update.allowedActions);
    sets.push(`allowed_actions = $${params.length}`);
  }
  if (update.ndaStatus) {
    params.push(update.ndaStatus);
    sets.push(`nda_status = $${params.length}`);
  }

  params.push(id);
  await safeQuery(
    `UPDATE "${schema}".external_stakeholder_profiles SET ${sets.join(', ')} WHERE id = $${params.length}`,
    params,
  );
}

export async function deactivateStakeholder(tenantId: string, id: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".external_stakeholder_profiles SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
    [id],
  );
}

function normalizeDataAccessBoundary(raw: any): { modules: string[]; readOnly: boolean } {
  if (!raw) return { modules: [], readOnly: true };
  return {
    modules: raw.modules || [],
    readOnly: raw.readOnly ?? raw.read_only ?? true,
  };
}

function mapStakeholderRow(row: any): ExternalStakeholderProfile {
  return {
    id: row.id,
    actorId: row.actor_id,
    stakeholderType: row.stakeholder_type,
    organizationName: row.organization_name,
    organizationNameAr: row.organization_name_ar || undefined,
    contactName: row.contact_name || undefined,
    contactEmail: row.contact_email || undefined,
    contactPhone: row.contact_phone || undefined,
    engagementScope: row.engagement_scope || {},
    dataAccessBoundary: normalizeDataAccessBoundary(row.data_access_boundary),
    ndaStatus: row.nda_status,
    portalType: row.portal_type || undefined,
    allowedModules: row.allowed_modules || [],
    allowedActions: row.allowed_actions || [],
    validFrom: row.valid_from,
    validTo: row.valid_to || undefined,
    isActive: row.is_active,
  };
}
