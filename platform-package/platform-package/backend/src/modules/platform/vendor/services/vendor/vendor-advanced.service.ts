/**
 * Vendor Advanced Service
 * --------------------------------
 * Provides advanced vendor analytics including SLA breach detection
 * across all active contracts for a given tenant.
 */

import { safeQuery } from '../../../../../config/database';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function schema(tenantId: string): string {
  return `tenant_${tenantId.replace(/-/g, '_')}`;
}

/* ------------------------------------------------------------------ */
/*  SLA Breach Detection                                               */
/* ------------------------------------------------------------------ */

export interface SLABreachResult {
  vendorId: string;
  vendorName: string;
  contractId: string;
  slaMetric: string;
  threshold: number;
  actual: number;
  breached: boolean;
}

/**
 * Scans all active vendor contracts and their associated SLA metrics,
 * comparing actual performance values against contractual thresholds.
 *
 * Returns every SLA metric row (breached or not) so callers can display
 * a full SLA dashboard. The `breached` flag highlights violations.
 */
export async function checkVendorSLABreaches(
  tenantId: string,
): Promise<SLABreachResult[]> {
  const s = schema(tenantId);

  const result = await safeQuery(
    `SELECT
        v.id            AS vendor_id,
        v.name          AS vendor_name,
        vc.id           AS contract_id,
        vsm.metric_name AS sla_metric,
        vsm.threshold,
        vsm.actual_value
     FROM "${s}".vendor_contracts vc
     JOIN "${s}".vendors v
       ON v.id = vc.vendor_id
     JOIN "${s}".vendor_sla_metrics vsm
       ON vsm.contract_id = vc.id
    WHERE vc.status = 'active'
      AND vsm.threshold   IS NOT NULL
      AND vsm.actual_value IS NOT NULL
    ORDER BY v.name, vsm.metric_name`,
  );

  if (!result.rows || result.rows.length === 0) {
    return [];
  }

  return result.rows.map((row: any) => {
    const threshold = parseFloat(row.threshold);
    const actual = parseFloat(row.actual_value);

    return {
      vendorId: row.vendor_id,
      vendorName: row.vendor_name,
      contractId: row.contract_id,
      slaMetric: row.sla_metric,
      threshold,
      actual,
      breached: actual < threshold,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Vendor Risk Summary                                                */
/* ------------------------------------------------------------------ */

export interface VendorRiskSummary {
  vendorId: string;
  vendorName: string;
  riskRating: string;
  activeContracts: number;
  expiredCerts: number;
  overdueAssessments: number;
  slaBreachCount: number;
}

/**
 * Returns a consolidated risk summary per vendor so the dashboard
 * can render a risk heat-map in a single call.
 */
export async function getVendorRiskSummary(
  tenantId: string,
): Promise<VendorRiskSummary[]> {
  const s = schema(tenantId);

  const result = await safeQuery(
    `SELECT
        v.id   AS vendor_id,
        v.name AS vendor_name,
        COALESCE(v.risk_rating, 'unknown') AS risk_rating,
        (SELECT COUNT(*) FROM "${s}".vendor_contracts vc
          WHERE vc.vendor_id = v.id AND vc.status = 'active')::int AS active_contracts,
        (SELECT COUNT(*) FROM "${s}".vendor_certifications cert
          WHERE cert.vendor_id = v.id
            AND cert.expiry_date IS NOT NULL
            AND cert.expiry_date < CURRENT_DATE)::int AS expired_certs,
        (SELECT COUNT(*) FROM "${s}".vendor_assessments va
          WHERE va.vendor_id = v.id
            AND va.due_date < CURRENT_DATE
            AND va.status IN ('pending', 'in_progress', 'scheduled'))::int AS overdue_assessments,
        (SELECT COUNT(*) FROM "${s}".vendor_contracts vc2
          JOIN "${s}".vendor_sla_metrics vsm ON vsm.contract_id = vc2.id
          WHERE vc2.vendor_id = v.id
            AND vc2.status = 'active'
            AND vsm.actual_value IS NOT NULL
            AND vsm.threshold IS NOT NULL
            AND vsm.actual_value < vsm.threshold)::int AS sla_breach_count
     FROM "${s}".vendors v
    WHERE v.status = 'active'
    ORDER BY v.name`,
  );

  if (!result.rows || result.rows.length === 0) {
    return [];
  }

  return result.rows.map((row: any) => ({
    vendorId: row.vendor_id,
    vendorName: row.vendor_name,
    riskRating: row.risk_rating,
    activeContracts: row.active_contracts,
    expiredCerts: row.expired_certs,
    overdueAssessments: row.overdue_assessments,
    slaBreachCount: row.sla_breach_count,
  }));
}
