/**
 * Vendor Compliance Sync Service
 * --------------------------------
 * Scans all active vendors for a tenant and checks:
 *   1. Expired or soon-to-expire certifications
 *   2. Overdue risk assessments
 *   3. SLA / contract breaches
 * Then recalculates each vendor's composite risk rating and persists updates.
 */

import { v4 as uuid } from 'uuid';
import { safeQuery } from '../../../../../config/database';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function schema(tenantId: string): string {
  return `tenant_${tenantId.replace(/-/g, '_')}`;
}

interface ComplianceIssue {
  vendorId: string;
  issueType: 'expired_cert' | 'overdue_assessment' | 'sla_breach';
  detail: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Map a count of open issues to a risk label.
 * 0 issues → low, 1 → medium, 2 → high, 3+ → critical
 */
function deriveRiskRating(issueCount: number): string {
  if (issueCount === 0) return 'low';
  if (issueCount === 1) return 'medium';
  if (issueCount === 2) return 'high';
  return 'critical';
}

/* ------------------------------------------------------------------ */
/*  Core sync                                                          */
/* ------------------------------------------------------------------ */

export async function runComplianceSync(
  tenantId: string,
): Promise<{ vendorsChecked: number; issuesFound: number; updated: number }> {
  const s = schema(tenantId);

  // 1. Fetch all active vendors
  const vendorResult = await safeQuery(
    `SELECT id, name, risk_rating
       FROM "${s}".vendors
      WHERE status = 'active'
      ORDER BY name`,
  );

  const vendors: Array<{ id: string; name: string; risk_rating: string | null }> = vendorResult.rows;

  if (vendors.length === 0) {
    return { vendorsChecked: 0, issuesFound: 0, updated: 0 };
  }

  const vendorIds = vendors.map((v) => v.id);
  const issues: ComplianceIssue[] = [];

  // 2. Expired certifications
  const certResult = await safeQuery(
    `SELECT vc.vendor_id, vc.certification_name, vc.expiry_date
       FROM "${s}".vendor_certifications vc
      WHERE vc.vendor_id = ANY($1)
        AND vc.expiry_date IS NOT NULL
        AND vc.expiry_date < CURRENT_DATE
        AND (vc.status IS NULL OR vc.status != 'revoked')`,
    [vendorIds],
  );

  for (const row of certResult.rows) {
    issues.push({
      vendorId: row.vendor_id,
      issueType: 'expired_cert',
      detail: `Certification "${row.certification_name}" expired on ${row.expiry_date}`,
      severity: 'high',
    });
  }

  // 3. Overdue assessments
  const assessmentResult = await safeQuery(
    `SELECT va.vendor_id, va.assessment_type, va.due_date
       FROM "${s}".vendor_assessments va
      WHERE va.vendor_id = ANY($1)
        AND va.due_date IS NOT NULL
        AND va.due_date < CURRENT_DATE
        AND va.status IN ('pending', 'in_progress', 'scheduled')`,
    [vendorIds],
  );

  for (const row of assessmentResult.rows) {
    const daysOverdue = Math.floor(
      (Date.now() - new Date(row.due_date).getTime()) / (1000 * 60 * 60 * 24),
    );
    const severity = daysOverdue > 60 ? 'critical' : daysOverdue > 30 ? 'high' : 'medium';
    issues.push({
      vendorId: row.vendor_id,
      issueType: 'overdue_assessment',
      detail: `Assessment "${row.assessment_type}" overdue by ${daysOverdue} days (due ${row.due_date})`,
      severity,
    });
  }

  // 4. SLA breaches — contracts with SLA metrics that are breached
  const slaResult = await safeQuery(
    `SELECT vc.vendor_id, vc.id AS contract_id, vsm.metric_name, vsm.threshold, vsm.actual_value
       FROM "${s}".vendor_contracts vc
       JOIN "${s}".vendor_sla_metrics vsm ON vsm.contract_id = vc.id
      WHERE vc.vendor_id = ANY($1)
        AND vc.status = 'active'
        AND vsm.actual_value IS NOT NULL
        AND vsm.threshold IS NOT NULL
        AND vsm.actual_value < vsm.threshold`,
    [vendorIds],
  );

  for (const row of slaResult.rows) {
    issues.push({
      vendorId: row.vendor_id,
      issueType: 'sla_breach',
      detail: `SLA metric "${row.metric_name}" breached: actual ${row.actual_value} < threshold ${row.threshold}`,
      severity: row.actual_value < row.threshold * 0.8 ? 'critical' : 'high',
    });
  }

  // 5. Group issues per vendor and recalculate risk ratings
  const issuesByVendor = new Map<string, ComplianceIssue[]>();
  for (const issue of issues) {
    const arr = issuesByVendor.get(issue.vendorId) || [];
    arr.push(issue);
    issuesByVendor.set(issue.vendorId, arr);
  }

  let updated = 0;

  for (const vendor of vendors) {
    const vendorIssues = issuesByVendor.get(vendor.id) || [];
    const hasCritical = vendorIssues.some((i) => i.severity === 'critical');
    const newRating = hasCritical ? 'critical' : deriveRiskRating(vendorIssues.length);

    if (newRating !== vendor.risk_rating) {
      await safeQuery(
        `UPDATE "${s}".vendors
            SET risk_rating  = $1,
                updated_at   = NOW()
          WHERE id = $2`,
        [newRating, vendor.id],
      );
      updated++;
    }

    // Persist an audit trail entry for every sync pass
    if (vendorIssues.length > 0) {
      await safeQuery(
        `INSERT INTO "${s}".vendor_compliance_issues
           (id, vendor_id, issue_type, detail, severity, detected_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT DO NOTHING`,
        [
          uuid(),
          vendor.id,
          vendorIssues.map((i) => i.issueType).join(','),
          JSON.stringify(vendorIssues.map((i) => ({ type: i.issueType, detail: i.detail }))),
          vendorIssues.reduce(
            (worst: string, i) =>
              ['critical', 'high', 'medium', 'low'].indexOf(i.severity) <
              ['critical', 'high', 'medium', 'low'].indexOf(worst)
                ? i.severity
                : worst,
            'low',
          ),
        ],
      );
    }
  }

  return {
    vendorsChecked: vendors.length,
    issuesFound: issues.length,
    updated,
  };
}
