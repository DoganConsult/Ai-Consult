import { safeQuery, tenantSchema } from '../../../../config/database';
import type { UserCompetency, CompetencyType, ProficiencyLevel } from '../../../../types/actor-identity.types';

export async function addCompetency(
  tenantId: string,
  input: {
    userId: string;
    competencyCode: string;
    competencyNameEn: string;
    competencyNameAr?: string;
    competencyType: CompetencyType;
    proficiencyLevel: ProficiencyLevel;
    certifiedAt?: string;
    expiresAt?: string;
    issuingAuthority?: string;
    credentialId?: string;
    sourceModule?: string;
  },
): Promise<UserCompetency> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".user_competencies
       (user_id, competency_code, competency_name_en, competency_name_ar,
        competency_type, proficiency_level, certified_at, expires_at,
        issuing_authority, credential_id, source_module)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (user_id, competency_code) DO UPDATE SET
       proficiency_level = EXCLUDED.proficiency_level,
       certified_at = COALESCE(EXCLUDED.certified_at, user_competencies.certified_at),
       expires_at = COALESCE(EXCLUDED.expires_at, user_competencies.expires_at),
       verification_status = CASE
         WHEN EXCLUDED.certified_at IS NOT NULL THEN 'verified'
         ELSE user_competencies.verification_status
       END,
       updated_at = NOW()
     RETURNING *`,
    [
      input.userId, input.competencyCode, input.competencyNameEn,
      input.competencyNameAr || null, input.competencyType, input.proficiencyLevel,
      input.certifiedAt || null, input.expiresAt || null,
      input.issuingAuthority || null, input.credentialId || null,
      input.sourceModule || null,
    ],
  );
  return mapCompetencyRow(rows[0]);
}

export async function getUserCompetencies(
  tenantId: string,
  userId: string,
  type?: CompetencyType,
): Promise<UserCompetency[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".user_competencies WHERE user_id = $1`;
  const params: unknown[] = [userId];
  if (type) {
    params.push(type);
    sql += ` AND competency_type = $${params.length}`;
  }
  sql += ` ORDER BY competency_type, competency_code`;
  const { rows } = await safeQuery(sql, params);
  return rows.map(mapCompetencyRow);
}

export async function checkCompetency(
  tenantId: string,
  userId: string,
  requiredCompetencies: string[],
): Promise<{ qualified: boolean; missing: string[] }> {
  if (requiredCompetencies.length === 0) return { qualified: true, missing: [] };

  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT competency_code FROM "${schema}".user_competencies
     WHERE user_id = $1 AND competency_code = ANY($2)
       AND verification_status IN ('verified','self_reported')
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [userId, requiredCompetencies],
  );

  const held = new Set(rows.map((r: any) => r.competency_code as string));
  const missing = requiredCompetencies.filter(c => !held.has(c));
  return { qualified: missing.length === 0, missing };
}

export async function revokeExpiredCompetencies(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const { rowCount } = await safeQuery(
    `UPDATE "${schema}".user_competencies
     SET verification_status = 'expired', updated_at = NOW()
     WHERE expires_at < NOW() AND verification_status = 'verified'`,
  );
  return rowCount ?? 0;
}

function mapCompetencyRow(row: any): UserCompetency {
  return {
    id: row.id,
    userId: row.user_id,
    competencyCode: row.competency_code,
    competencyNameEn: row.competency_name_en,
    competencyNameAr: row.competency_name_ar || undefined,
    competencyType: row.competency_type,
    proficiencyLevel: row.proficiency_level,
    certifiedAt: row.certified_at || undefined,
    expiresAt: row.expires_at || undefined,
    issuingAuthority: row.issuing_authority || undefined,
    credentialId: row.credential_id || undefined,
    verificationStatus: row.verification_status,
    sourceModule: row.source_module || undefined,
  };
}
