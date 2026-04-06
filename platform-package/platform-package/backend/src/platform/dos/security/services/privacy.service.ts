// @ts-nocheck
import { logger } from '../../../../utils/logger';
// ============================================
// Shahin — Privacy Operations Service (PDPL)
// RoPA CRUD, data subject request workflows,
// breach handling, consent tracking, retention
// expiry, and processor governance
// ============================================

import { safeQuery, tenantSchema } from "../../../../config/database";
import { saveWorkflow } from '../../../../modules/workflow/services/core/workflow.service';
import { registerJob } from "../../jobs/job-scheduler.service";
import type { RoPAEntry, ConsentRecord } from "../../../../types/grc-os.types";
import { toErrorMessage } from '../../../../utils/http-error.util';
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

// === PDPL SLA Constants ===

/** PDPL response deadlines in days by DSR type */
const DSR_SLA_DAYS: Record<string, number> = {
  access: 30,
  rectification: 30,
  erasure: 30,
  portability: 30,
};

/** Breach notification deadline in hours by severity */
const BREACH_NOTIFICATION_HOURS: Record<string, number> = {
  critical: 24,
  high: 48,
  medium: 72,
  low: 168, // 7 days
};

// === Row Mappers ===

function rowToRoPAEntry(row: unknown): RoPAEntry {
  return {
    entryId: row.entry_id,
    processingPurpose: row.processing_purpose || "",
    legalBasis: row.legal_basis || "",
    dataCategories: row.data_categories || [],
    dataSubjects: row.data_subjects || [],
    recipients: row.recipients || [],
    retentionPeriod: row.retention_days ?? 0,
    transferDetails: row.transfer_details || "",
    technicalMeasures: row.technical_measures || "",
    organizationalMeasures: row.organizational_measures || "",
  };
}

function rowToConsentRecord(row: unknown): ConsentRecord {
  return {
    consentId: row.consent_id,
    subjectId: row.subject_id || "",
    processingPurpose: row.processing_purpose || "",
    consentVersion: row.consent_version || "",
    grantedAt: row.granted_at ? new Date(row.granted_at).toISOString() : new Date().toISOString(),
    withdrawnAt: row.withdrawn_at ? new Date(row.withdrawn_at).toISOString() : null,
  };
}

// === RoPA CRUD ===

/**
 * List all RoPA entries for a tenant.
 * Requirement 15.1
 */
export async function getRoPAEntries(tenantId: string): Promise<RoPAEntry[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".ropa_entries ORDER BY created_at DESC`
  );
  return result.rows.map(rowToRoPAEntry);
}

/**
 * Create a new RoPA entry.
 * Requirement 15.1
 */
export async function createRoPAEntry(
  tenantId: string,
  entry: Omit<RoPAEntry, "entryId">
): Promise<RoPAEntry> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".ropa_entries
      (processing_purpose, legal_basis, data_categories, data_subjects,
       recipients, retention_days, transfer_details, technical_measures,
       organizational_measures)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      entry.processingPurpose,
      entry.legalBasis,
      entry.dataCategories || [],
      entry.dataSubjects || [],
      entry.recipients || [],
      entry.retentionPeriod ?? null,
      entry.transferDetails || null,
      entry.technicalMeasures || null,
      entry.organizationalMeasures || null,
    ]
  );
  return rowToRoPAEntry(getFirstRow(result));
}

/**
 * Update an existing RoPA entry.
 * Requirement 15.1
 */
export async function updateRoPAEntry(
  tenantId: string,
  entryId: string,
  patch: Partial<Omit<RoPAEntry, "entryId">>
): Promise<RoPAEntry> {
  const schema = tenantSchema(tenantId);

  // Fetch current entry
  const current = await safeQuery(
    `SELECT * FROM "${schema}".ropa_entries WHERE entry_id = $1`,
    [entryId]
  );
  if (current.rows.length === 0) throw new Error("RoPA entry not found");

  const row = getFirstRow(current);

  const updated = await safeQuery(
    `UPDATE "${schema}".ropa_entries SET
      processing_purpose = $1,
      legal_basis = $2,
      data_categories = $3,
      data_subjects = $4,
      recipients = $5,
      retention_days = $6,
      transfer_details = $7,
      technical_measures = $8,
      organizational_measures = $9,
      updated_at = NOW()
     WHERE entry_id = $10
     RETURNING *`,
    [
      patch.processingPurpose ?? row.processing_purpose,
      patch.legalBasis ?? row.legal_basis,
      patch.dataCategories ?? row.data_categories,
      patch.dataSubjects ?? row.data_subjects,
      patch.recipients ?? row.recipients,
      patch.retentionPeriod ?? row.retention_days,
      patch.transferDetails ?? row.transfer_details,
      patch.technicalMeasures ?? row.technical_measures,
      patch.organizationalMeasures ?? row.organizational_measures,
      entryId,
    ]
  );

  return rowToRoPAEntry(getFirstRow(updated));
}

// === Data Subject Request (DSR) Workflow ===

/**
 * List all DSR workflows for a tenant.
 * DSRs are stored as workflows with name starting with 'DSR-'.
 */
export async function getDSRList(tenantId: string): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflows
     WHERE name LIKE 'DSR-%'
     ORDER BY created_at DESC`
  );
  return result.rows.map((r: GenericRow) => ({
    workflowId: r.workflow_id,
    name: r.name,
    status: r.status,
    definition: r.definition,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

/**
 * Create a data subject request and launch a tracked workflow with SLA timers.
 * Requirement 15.2
 */
export async function createDSR(
  tenantId: string,
  data: {
    requestType: "access" | "rectification" | "erasure" | "portability";
    subjectId: string;
    details?: string;
    requestedBy: string;
  }
): Promise<{ workflowId: string; executionId: string; slaDeadline: string }> {
  const slaDays = DSR_SLA_DAYS[data.requestType] ?? 30;
  const slaDeadline = new Date(Date.now() + slaDays * 24 * 60 * 60 * 1000);

  const pos = { x: 0, y: 0 };

  // Create a DSR workflow definition
  const workflow = await saveWorkflow(tenantId, {
    name: `DSR-${data.requestType}-${data.subjectId}`,
    definition: {
      nodes: [
        { id: "trigger", type: "trigger", subType: "dsr_request", config: {}, position: pos },
        {
          id: "review",
          type: "action",
          subType: "manual_review",
          position: pos,
          config: {
            requestType: data.requestType,
            subjectId: data.subjectId,
            details: data.details || "",
            slaDeadline: slaDeadline.toISOString(),
          },
        },
        {
          id: "approval",
          type: "governance",
          subType: "dsr_approval",
          position: pos,
          config: {
            approverRole: "dpo",
            slaDeadline: slaDeadline.toISOString(),
          },
        },
        {
          id: "execute",
          type: "action",
          subType: "dsr_execute",
          position: pos,
          config: { requestType: data.requestType, subjectId: data.subjectId },
        },
        { id: "end", type: "end", subType: "complete", config: {}, position: pos },
      ],
      edges: [
        { id: "e1", source: "trigger", target: "review" },
        { id: "e2", source: "review", target: "approval" },
        { id: "e3", source: "approval", target: "execute" },
        { id: "e4", source: "execute", target: "end" },
      ],
      swimlanes: [],
      triggers: [],
    },
    createdBy: data.requestedBy,
  });

  // Execute the workflow
  const execution = await executeWorkflow(tenantId, workflow.workflow_id, {
    type: "dsr_request",
    data: {
      requestType: data.requestType,
      subjectId: data.subjectId,
      details: data.details,
      slaDeadline: slaDeadline.toISOString(),
    },
  });

  return {
    workflowId: workflow.workflow_id,
    executionId: execution.execution_id,
    slaDeadline: slaDeadline.toISOString(),
  };
}

// === Breach Handling Workflow ===

/**
 * List all breach handling workflows for a tenant.
 * Breaches are stored as workflows with name starting with 'Breach-'.
 */
export async function getBreachList(tenantId: string): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflows
     WHERE name LIKE 'Breach-%'
     ORDER BY created_at DESC`
  );
  return result.rows.map((r: GenericRow) => ({
    workflowId: r.workflow_id,
    name: r.name,
    status: r.status,
    definition: r.definition,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

/**
 * Create a breach handling workflow with severity classification and notification timelines.
 * Requirement 15.3
 */
export async function createBreachReport(
  tenantId: string,
  data: {
    severity: "critical" | "high" | "medium" | "low";
    description: string;
    affectedSubjects?: string[];
    reportedBy: string;
  }
): Promise<{ workflowId: string; executionId: string; notificationDeadline: string }> {
  const notificationHours = BREACH_NOTIFICATION_HOURS[data.severity] ?? 72;
  const notificationDeadline = new Date(Date.now() + notificationHours * 60 * 60 * 1000);

  const pos = { x: 0, y: 0 };

  // Create a breach handling workflow
  const workflow = await saveWorkflow(tenantId, {
    name: `Breach-${data.severity}-${new Date().toISOString().slice(0, 10)}`,
    definition: {
      nodes: [
        { id: "trigger", type: "trigger", subType: "breach_detected", config: {}, position: pos },
        {
          id: "classify",
          type: "action",
          subType: "breach_classify",
          position: pos,
          config: {
            severity: data.severity,
            description: data.description,
            affectedSubjects: data.affectedSubjects || [],
            notificationDeadline: notificationDeadline.toISOString(),
          },
        },
        {
          id: "notify_authority",
          type: "action",
          subType: "breach_notify",
          position: pos,
          config: {
            target: "regulatory_authority",
            deadlineHours: notificationHours,
          },
        },
        {
          id: "notify_subjects",
          type: "action",
          subType: "breach_notify_subjects",
          position: pos,
          config: {
            affectedSubjects: data.affectedSubjects || [],
          },
        },
        {
          id: "remediate",
          type: "action",
          subType: "breach_remediate",
          position: pos,
          config: { severity: data.severity },
        },
        { id: "end", type: "end", subType: "complete", config: {}, position: pos },
      ],
      edges: [
        { id: "e1", source: "trigger", target: "classify" },
        { id: "e2", source: "classify", target: "notify_authority" },
        { id: "e3", source: "notify_authority", target: "notify_subjects" },
        { id: "e4", source: "notify_subjects", target: "remediate" },
        { id: "e5", source: "remediate", target: "end" },
      ],
      swimlanes: [],
      triggers: [],
    },
    createdBy: data.reportedBy,
  });

  // Execute the workflow
  const execution = await executeWorkflow(tenantId, workflow.workflow_id, {
    type: "breach_detected",
    data: {
      severity: data.severity,
      description: data.description,
      affectedSubjects: data.affectedSubjects,
      notificationDeadline: notificationDeadline.toISOString(),
    },
  });

  return {
    workflowId: workflow.workflow_id,
    executionId: execution.execution_id,
    notificationDeadline: notificationDeadline.toISOString(),
  };
}

// === Consent Record Tracking ===

/**
 * Record a consent action (grant or withdrawal).
 * Requirement 15.4
 */
export async function recordConsent(
  tenantId: string,
  consent: {
    subjectId: string;
    processingPurpose: string;
    consentVersion?: string;
    withdrawn?: boolean;
  }
): Promise<ConsentRecord> {
  const schema = tenantSchema(tenantId);

  if (consent.withdrawn) {
    // Withdraw existing consent — set withdrawn_at on the latest active consent
    const updated = await safeQuery(
      `UPDATE "${schema}".consent_records
       SET withdrawn_at = NOW()
       WHERE subject_id = $1
         AND processing_purpose = $2
         AND withdrawn_at IS NULL
       RETURNING *`,
      [consent.subjectId, consent.processingPurpose]
    );
    if (updated.rows.length === 0) {
      throw new Error("No active consent found to withdraw");
    }
    return rowToConsentRecord(getFirstRow(updated));
  }

  // Grant new consent
  const result = await safeQuery(
    `INSERT INTO "${schema}".consent_records
      (subject_id, processing_purpose, consent_version)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [consent.subjectId, consent.processingPurpose, consent.consentVersion || "1.0"]
  );
  return rowToConsentRecord(getFirstRow(result));
}

/**
 * List all consent records for the tenant.
 * Requirement 15.4
 */
export async function getAllConsentRecords(tenantId: string): Promise<ConsentRecord[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".consent_records ORDER BY granted_at DESC`
  );
  return result.rows.map(rowToConsentRecord);
}

/**
 * Get all consent records for a data subject.
 * Requirement 15.4
 */
export async function getConsentBySubject(
  tenantId: string,
  subjectId: string
): Promise<ConsentRecord[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".consent_records
     WHERE subject_id = $1
     ORDER BY granted_at DESC`,
    [subjectId]
  );
  return result.rows.map(rowToConsentRecord);
}

// === Retention Expiry ===

/**
 * Get RoPA entries with retention expiring within the given threshold (days).
 * Requirement 15.5
 */
export async function getExpiringRetention(
  tenantId: string,
  thresholdDays: number = 30
): Promise<RoPAEntry[]> {
  const schema = tenantSchema(tenantId);

  // Find entries where created_at + retention_days is within the threshold
  const result = await safeQuery(
    `SELECT * FROM "${schema}".ropa_entries
     WHERE retention_days IS NOT NULL
       AND retention_days > 0
       AND (created_at + (retention_days || ' days')::INTERVAL) <= (NOW() + ($1 || ' days')::INTERVAL)
     ORDER BY (created_at + (retention_days || ' days')::INTERVAL) ASC`,
    [thresholdDays]
  );

  return result.rows.map(rowToRoPAEntry);
}

/**
 * Trigger retention expiry workflows for all RoPA entries past their retention period.
 * Creates a deletion/anonymization workflow for each expired entry.
 * Requirement 15.5
 */
export async function triggerRetentionExpiry(
  tenantId: string
): Promise<{ entryId: string; workflowId: string }[]> {
  const schema = tenantSchema(tenantId);

  // Find entries past retention
  const expired = await safeQuery(
    `SELECT * FROM "${schema}".ropa_entries
     WHERE retention_days IS NOT NULL
       AND retention_days > 0
       AND (created_at + (retention_days || ' days')::INTERVAL) <= NOW()`
  );

  const results: { entryId: string; workflowId: string }[] = [];

  for (const row of expired.rows) {
    const pos = { x: 0, y: 0 };

    // Create a retention expiry workflow for each expired entry
    const workflow = await saveWorkflow(tenantId, {
      name: `Retention-Expiry-${row.entry_id}`,
      definition: {
        nodes: [
          { id: "trigger", type: "trigger", subType: "retention_expired", config: {}, position: pos },
          {
            id: "review",
            type: "action",
            subType: "retention_review",
            position: pos,
            config: {
              entryId: row.entry_id,
              processingPurpose: row.processing_purpose,
              retentionDays: row.retention_days,
            },
          },
          {
            id: "delete_or_anonymize",
            type: "action",
            subType: "data_deletion",
            position: pos,
            config: { entryId: row.entry_id },
          },
          { id: "end", type: "end", subType: "complete", config: {}, position: pos },
        ],
        edges: [
          { id: "e1", source: "trigger", target: "review" },
          { id: "e2", source: "review", target: "delete_or_anonymize" },
          { id: "e3", source: "delete_or_anonymize", target: "end" },
        ],
        swimlanes: [],
        triggers: [],
      },
      createdBy: "system",
    });

    results.push({
      entryId: row.entry_id,
      workflowId: workflow.workflow_id,
    });
  }

  return results;
}

// === Processor Governance ===

/**
 * Get processor governance summary — RoPA entries that involve third-party recipients.
 * Requirement 15.6
 */
export async function getProcessorGovernance(
  tenantId: string
): Promise<RoPAEntry[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".ropa_entries
     WHERE array_length(recipients, 1) > 0
     ORDER BY created_at DESC`
  );
  return result.rows.map(rowToRoPAEntry);
}

// === Job Registration ===

/**
 * Register the retention expiry check job with the job scheduler.
 * Runs daily at 3 AM — checks all active tenants for expired retention periods.
 */
export async function registerRetentionExpiryJob(): Promise<void> {
  await registerJob("retention-expiry-check", "0 3 * * *", async () => {
    logger.info("[Job] retention-expiry-check executed");
    try {
      const tenants = await safeQuery(
        `SELECT tenant_id FROM tenants WHERE status = 'active' OR status = 'onboarding'`
      );
      for (const t of tenants.rows) {
        const triggered = await triggerRetentionExpiry(t.tenant_id);
        if (triggered.length > 0) {
          logger.info(
            `[Job] Triggered ${triggered.length} retention expiry workflow(s) for tenant ${t.tenant_id}`
          );
        }
      }
    } catch (err: unknown) {
      logger.error("[Job] retention-expiry-check error:", toErrorMessage(err));
    }
  });
}
