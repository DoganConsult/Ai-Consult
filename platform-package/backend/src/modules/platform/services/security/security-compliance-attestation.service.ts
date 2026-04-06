// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../../config/database';
import type { GenericRow } from '../../../../types/db-rows.types';

export interface ComplianceAttestation {
  id: string;
  frameworkCode: string;
  controlCode: string;
  attestationType: string;
  status: string;
  evidence: Record<string, unknown>;
  findings: Array<Record<string, unknown>>;
  attestedBy: string | null;
  attestedAt: string | null;
  nextAttestationDue: string | null;
  createdAt: string;
}

export async function createAttestation(
  tenantId: string,
  input: {
    frameworkCode: string;
    controlCode: string;
    attestationType: string;
    evidence?: Record<string, unknown>;
  },
): Promise<ComplianceAttestation> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".security_compliance_attestations
     (framework_code, control_code, attestation_type, evidence)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [input.frameworkCode, input.controlCode, input.attestationType, JSON.stringify(input.evidence || {})],
  );
  return mapAttestation(rows[0]);
}

export async function runAccessReviewAttestation(tenantId: string, frameworkCode: string): Promise<ComplianceAttestation[]> {
  const schema = tenantSchema(tenantId);
  const attestations: ComplianceAttestation[] = [];

  const { rows: users } = await safeQuery(
    `SELECT ura.user_id, COUNT(DISTINCT r.role_code) AS role_count,
            ARRAY_AGG(DISTINCT r.role_code) AS roles
     FROM "${schema}".user_role_assignments ura
     JOIN "${schema}".roles r ON r.role_id = ura.role_id
     WHERE ura.active = true GROUP BY ura.user_id`,
  );

  const findings: Array<Record<string, unknown>> = [];
  for (const u of users) {
    if (u.role_count > 5) {
      findings.push({
        type: 'over_provisioned',
        userId: u.user_id,
        roleCount: u.role_count,
        roles: u.roles,
      });
    }
  }

  const { rows: sodViolations } = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".module_sod_rules WHERE is_active = true AND enforcement_mode = 'block'`,
  );

  const status = findings.length === 0 ? 'compliant' : 'remediation_required';

  const att = await createAttestation(tenantId, {
    frameworkCode,
    controlCode: 'AC-2',
    attestationType: 'access_review',
    evidence: {
      totalUsers: users.length,
      overProvisionedUsers: findings.length,
      activeSoDRules: sodViolations[0]?.cnt || 0,
      reviewDate: new Date().toISOString(),
    },
  });

  await safeQuery(
    `UPDATE "${schema}".security_compliance_attestations
     SET status = $1, findings = $2, attested_at = NOW(),
         next_attestation_due = NOW() + INTERVAL '90 days'
     WHERE id = $3`,
    [status, JSON.stringify(findings), att.id],
  );
  att.status = status;
  att.findings = findings;
  attestations.push(att);

  return attestations;
}

export async function getAttestations(
  tenantId: string,
  filters?: { frameworkCode?: string; status?: string; attestationType?: string },
): Promise<ComplianceAttestation[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.frameworkCode) { conditions.push(`framework_code = $${idx++}`); params.push(filters.frameworkCode); }
  if (filters?.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
  if (filters?.attestationType) { conditions.push(`attestation_type = $${idx++}`); params.push(filters.attestationType); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".security_compliance_attestations ${where} ORDER BY created_at DESC LIMIT 100`,
    params,
  );
  return rows.map(mapAttestation);
}

export async function getDueAttestations(tenantId: string): Promise<ComplianceAttestation[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".security_compliance_attestations
     WHERE next_attestation_due IS NOT NULL AND next_attestation_due <= NOW() + INTERVAL '30 days'
     ORDER BY next_attestation_due ASC`,
  );
  return rows.map(mapAttestation);
}

function mapAttestation(r: GenericRow): ComplianceAttestation {
  return {
    id: r.id,
    frameworkCode: r.framework_code,
    controlCode: r.control_code,
    attestationType: r.attestation_type,
    status: r.status,
    evidence: r.evidence || {},
    findings: r.findings || [],
    attestedBy: r.attested_by,
    attestedAt: r.attested_at,
    nextAttestationDue: r.next_attestation_due,
    createdAt: r.created_at,
  };
}
