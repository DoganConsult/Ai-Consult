// @ts-nocheck
import { catchHandler, EC } from '../../../../../platform/dos/resilience/resilient-catch';
import { logger } from '../../../../../platform/dos/observability/logger';
/**
 * Compliance domain job definitions.
 * Covers evidence expiry, scoring, overdue checks, assessment SLA,
 * obligation deadlines, reassessment triggers, gap staleness, and attestation reminders.
 */
import { JobDefinition } from '../job-types';
import { toErrorMessage } from '../../../../../errors/http-error.util';
import { getFirstRow } from '../../../../../shared/data/db-utils';
import { lazyImport } from '../../../../../platform/dos/core/lazy-import';

// SLA days by test frequency (matching compliance-workspace.service.ts)
const SLA_DAYS: Record<string, number> = {
  daily: 2,
  weekly: 10,
  monthly: 35,
  quarterly: 100,
  annually: 380,
};

export async function getComplianceJobs(): Promise<JobDefinition[]> {
  // Lazy-imported at module level to keep reference to shared helper
  const { getProvisionedTenants } = await lazyImport('../../services/misc/job-scheduler.service');

  return [
    // Evidence expiry check — daily at midnight
    {
      name: 'evidence-expiry-check',
      cron: '0 0 * * *',
      handler: async () => {
        logger.info("[Job] evidence-expiry-check executed");
        try {
          const { getExpiringEvidence } = await lazyImport("../../../evidence/services/core/evidence.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            await getExpiringEvidence(t.tenant_id);
          }
        } catch (err: unknown) {
          logger.error("[Job] evidence-expiry-check error:", toErrorMessage(err));
        }
      },
    },

    // Evidence request generator — daily at 4 AM
    // Creates evidence requests from schedules and routes to teams via RACI.
    {
      name: 'evidence-request-generator',
      cron: '0 4 * * *',
      handler: async () => {
        logger.info("[Job] evidence-request-generator executed");
        try {
          const { generateEvidenceRequests } = await lazyImport("../../../evidence/services/workflow/evidence-request-generator.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const result = await generateEvidenceRequests(t.tenant_id);
              if (result.requestsCreated > 0) {
                logger.info(`[Job] evidence-request-generator: tenant ${t.tenant_id} — ${result.requestsCreated} requests, ${result.tasksCreated} tasks`);
              }
            } catch { /* tenant evidence gen failure — non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] evidence-request-generator error:", toErrorMessage(err));
        }
      },
    },

    // Compliance scoring recalculation — daily at 2 AM
    // Uses comprehensive 4-dimension weighted score (control effectiveness,
    // evidence freshness, policy coverage, audit findings closure).
    {
      name: 'compliance-scoring-recalc',
      cron: '0 2 * * *',
      handler: async () => {
        logger.info("[Job] compliance-scoring-recalc executed");
        try {
          const { emitEvent } = await lazyImport('../../../../platform/dos/events/event-bus');
          const { computeComplianceScore } = await lazyImport("../../../governance-ai/compliance-score.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const result = await computeComplianceScore(t.tenant_id);
              logger.info(`[Job] compliance-scoring-recalc: tenant ${t.tenant_id} — score ${result.overall_score.toFixed(1)} (delta ${result.delta >= 0 ? '+' : ''}${result.delta.toFixed(1)})`);
              emitEvent({
                tenantId: t.tenant_id, userId: 'system', module: 'compliance',
                event: 'score_recalculated', entityType: 'compliance_score', entityId: t.tenant_id,
              }).catch(catchHandler(EC.EVENT_BUS, {}));
            } catch { /* schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] compliance-scoring-recalc error:", toErrorMessage(err));
        }
      },
    },

    // Compliance score live refresh — every 30 minutes
    // Near-real-time compliance score update with AI explanation generation.
    {
      name: 'compliance-score-live-refresh',
      cron: '*/30 * * * *',
      handler: async () => {
        logger.info("[Job] compliance-score-live-refresh executed");
        try {
          const { computeComplianceScore } = await lazyImport("../../../governance-ai/compliance-score.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const result = await computeComplianceScore(t.tenant_id);
              // Generate AI explanation for significant score changes
              if (Math.abs(result.delta) >= 2) {
                try {
                  const { generateScoreExplanation } = await lazyImport("../../../governance-ai/health-intelligence.service");
                  await generateScoreExplanation(t.tenant_id);
                } catch {
                  // AI explanation is optional — non-fatal
                }
              }
            } catch { /* schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] compliance-score-live-refresh error:", toErrorMessage(err));
        }
      },
    },

    // Compliance overdue check — daily at 5 AM
    {
      name: 'compliance-overdue-check',
      cron: '0 5 * * *',
      handler: async () => {
        logger.info("[Job] compliance-overdue-check executed");
        try {
          const { createNotification } = await lazyImport("../../../notification/services/notification.service");
          async function resolveAssigneeToUserId(tenantId: string, opts: { roleCode?: string } = {}): Promise<string | null> {
      const { safeQuery, tenantSchema } = await lazyImport("../../../../config/database/database");
      const schema = tenantSchema(tenantId);
      if (!opts.roleCode) return null;
      const r = await safeQuery(`SELECT ura.user_id FROM "${schema}".user_role_assignments ura JOIN "${schema}".functional_roles fr ON fr.id=ura.functional_role_id WHERE fr.code=$1 AND ura.is_active=TRUE LIMIT 1`, [opts.roleCode]);
      return r.rows[0]?.user_id || null;
    }
          const { safeQuery } = await lazyImport("../../../../config/database/database");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = `tenant_${t.tenant_id.replace(/-/g, '_')}`;
              // Overdue obligations
              const obligations = await safeQuery(
                `SELECT o.obligation_id, o.title_en, o.compliance_deadline, o.owner_id
                 FROM "${schema}".governance_obligations o
                 WHERE o.compliance_deadline IS NOT NULL
                   AND o.compliance_deadline < CURRENT_DATE
                   AND o.status NOT IN ('completed','closed','expired')
                   AND o.deleted_at IS NULL`,
              );
              for (const o of obligations.rows) {
                let userId = o.owner_id;
                if (!userId) {
                  userId = (await resolveAssigneeToUserId(t.tenant_id, { roleCode: 'compliance_officer' })) ?? undefined;
                }
                if (userId) {
                  await createNotification(t.tenant_id, {
                    userId,
                    type: 'compliance_obligation_overdue',
                    title: `Overdue obligation: ${o.title_en}`,
                    body: `Obligation was due on ${o.compliance_deadline}. Please address immediately.`,
                    link: `/compliance/obligations`,
                  }).catch(catchHandler(EC.EVENT_BUS, {}));
                }
              }
              if (obligations.rows.length > 0) {
                const { eventBus } = await lazyImport("../../services/event/event-bus.service");
                eventBus.publish({ eventType: 'compliance.review_overdue', tenantId: t.tenant_id, sourceService: 'JobScheduler', severity: 'warning', payload: { overdueCount: obligations.rows.length } });
              }
              // Overdue attestation campaigns
              const campaigns = await safeQuery(
                `SELECT ac.campaign_id, ac.name, ac.due_date, ac.entity_type
                 FROM "${schema}".attestation_campaigns ac
                 WHERE ac.due_date < CURRENT_DATE
                   AND ac.status IN ('active','in_progress')
                   AND ac.entity_type IS NOT NULL AND ac.entity_type != 'policy'`,
              );
              for (const c of campaigns.rows) {
                await safeQuery(
                  `UPDATE "${schema}".attestation_campaigns SET status = 'expired' WHERE campaign_id = $1 AND status IN ('active','in_progress')`,
                  [c.campaign_id],
                );
              }
            } catch { /* schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] compliance-overdue-check error:", toErrorMessage(err));
        }
      },
    },

    // Compliance assessment SLA check — daily at 7 AM
    {
      name: 'compliance-assessment-sla-check',
      cron: '0 7 * * *',
      handler: async () => {
        logger.info("[Job] compliance-assessment-sla-check executed");
        try {
          const { createNotification } = await lazyImport("../../../notification/services/notification.service");
          const { emitEvent } = await lazyImport('../../../../platform/dos/events/event-bus');
          const { safeQuery } = await lazyImport("../../../../config/database/database");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = `tenant_${t.tenant_id.replace(/-/g, '_')}`;
              const overdue = await safeQuery(`
                SELECT assessment_id, title, due_date, created_by
                FROM "${schema}".assessments
                WHERE due_date IS NOT NULL
                  AND due_date < CURRENT_DATE
                  AND status IN ('in_progress', 'pending', 'draft')
              `);
              for (const a of overdue.rows) {
                emitEvent({
                  tenantId: t.tenant_id, userId: 'system', module: 'compliance',
                  event: 'assessment_completed', entityType: 'assessment', entityId: a.assessment_id,
                }).catch(catchHandler(EC.EVENT_BUS, {}));
                if (a.created_by) {
                  await createNotification(t.tenant_id, {
                    userId: a.created_by,
                    type: 'assessment_sla_breached',
                    title: `Assessment overdue: ${a.title}`,
                    body: `Assessment "${a.title}" was due on ${a.due_date} and is still incomplete.`,
                    link: `/compliance/assessments`,
                  }).catch(catchHandler(EC.EVENT_BUS, {}));
                }
              }
            } catch { /* schema may not have assessments table */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] compliance-assessment-sla-check error:", toErrorMessage(err));
        }
      },
    },

    // Compliance obligation deadline check — daily at 6 AM
    {
      name: 'compliance-obligation-deadline-check',
      cron: '0 6 * * *',
      handler: async () => {
        logger.info("[Job] compliance-obligation-deadline-check executed");
        try {
          const { createNotification } = await lazyImport("../../../notification/services/notification.service");
          const { emitEvent } = await lazyImport('../../../../platform/dos/events/event-bus');
          async function resolveAssigneeToUserId(tenantId: string, opts: { roleCode?: string } = {}): Promise<string | null> {
      const { safeQuery, tenantSchema } = await lazyImport("../../../../config/database/database");
      const schema = tenantSchema(tenantId);
      if (!opts.roleCode) return null;
      const r = await safeQuery(`SELECT ura.user_id FROM "${schema}".user_role_assignments ura JOIN "${schema}".functional_roles fr ON fr.id=ura.functional_role_id WHERE fr.code=$1 AND ura.is_active=TRUE LIMIT 1`, [opts.roleCode]);
      return r.rows[0]?.user_id || null;
    }
          const { safeQuery } = await lazyImport("../../../../config/database/database");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = `tenant_${t.tenant_id.replace(/-/g, '_')}`;
              const obligations = await safeQuery(`
                SELECT obligation_id, title, due_date, owner_id
                FROM "${schema}".obligations
                WHERE due_date IS NOT NULL
                  AND due_date <= CURRENT_DATE + INTERVAL '14 days'
                  AND due_date >= CURRENT_DATE
                  AND status NOT IN ('completed', 'closed', 'exempt')
              `);
              for (const o of obligations.rows) {
                let userId = o.owner_id;
                if (!userId) {
                  userId = (await resolveAssigneeToUserId(t.tenant_id, { roleCode: 'compliance_officer' })) ?? undefined;
                }
                if (userId) {
                  await createNotification(t.tenant_id, {
                    userId,
                    type: 'obligation_deadline_approaching',
                    title: `Obligation deadline approaching: ${o.title}`,
                    body: `Obligation "${o.title}" is due on ${o.due_date}.`,
                    link: `/compliance/obligations`,
                  }).catch(catchHandler(EC.EVENT_BUS, {}));
                }
              }
              const overdue = await safeQuery(`
                SELECT obligation_id, title, due_date, owner_id
                FROM "${schema}".obligations
                WHERE due_date IS NOT NULL
                  AND due_date < CURRENT_DATE
                  AND status NOT IN ('completed', 'closed', 'exempt')
              `);
              for (const o of overdue.rows) {
                emitEvent({
                  tenantId: t.tenant_id, userId: 'system', module: 'compliance',
                  event: 'review_overdue', entityType: 'obligation', entityId: o.obligation_id,
                }).catch(catchHandler(EC.EVENT_BUS, {}));
              }
            } catch { /* schema may not have obligations table */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] compliance-obligation-deadline-check error:", toErrorMessage(err));
        }
      },
    },

    // Compliance reassessment trigger — weekly Monday 9 AM
    {
      name: 'compliance-reassessment-trigger',
      cron: '0 9 * * 1',
      handler: async () => {
        logger.info("[Job] compliance-reassessment-trigger executed");
        try {
          const { createNotification } = await lazyImport("../../../notification/services/notification.service");
          const { safeQuery } = await lazyImport("../../../../config/database/database");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = `tenant_${t.tenant_id.replace(/-/g, '_')}`;
              // Frameworks not assessed in 180 days
              const stale = await safeQuery(
                `SELECT f.framework_id, f.name, MAX(a.created_at) AS last_assessed
                 FROM "${schema}".frameworks f
                 LEFT JOIN "${schema}".assessments a ON a.framework_id = f.framework_id
                 WHERE f.deleted_at IS NULL
                 GROUP BY f.framework_id, f.name
                 HAVING MAX(a.created_at) IS NULL OR MAX(a.created_at) < NOW() - INTERVAL '180 days'`,
              );
              for (const f of stale.rows) {
                if (f.owner_user_id) {
                  await createNotification(t.tenant_id, {
                    userId: f.owner_user_id,
                    type: 'compliance_reassessment_due',
                    title: `Reassessment due: ${f.name}`,
                    body: f.last_assessed
                      ? `Framework "${f.name}" was last assessed on ${f.last_assessed}. Due for reassessment.`
                      : `Framework "${f.name}" has never been assessed.`,
                    link: `/compliance/assessments`,
                  }).catch(catchHandler(EC.EVENT_BUS, {}));
                }
              }
            } catch { /* schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] compliance-reassessment-trigger error:", toErrorMessage(err));
        }
      },
    },

    // Compliance gap stale check — daily at 6 AM
    {
      name: 'compliance-gap-stale-check',
      cron: '0 6 * * *',
      handler: async () => {
        logger.info("[Job] compliance-gap-stale-check executed");
        try {
          const { createNotification } = await lazyImport("../../../notification/services/notification.service");
          const { safeQuery } = await lazyImport("../../../../config/database/database");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = `tenant_${t.tenant_id.replace(/-/g, '_')}`;
              const staleGaps = await safeQuery(
                `SELECT gap_id, title, updated_at, assigned_to
                 FROM "${schema}".compliance_gaps
                 WHERE updated_at < NOW() - INTERVAL '90 days'
                   AND status NOT IN ('closed','remediated','accepted')
                   AND deleted_at IS NULL`,
              );
              for (const g of staleGaps.rows) {
                if (g.assigned_to) {
                  await createNotification(t.tenant_id, {
                    userId: g.assigned_to,
                    type: 'compliance_gap_stale',
                    title: `Stale compliance gap: ${g.title || 'Untitled gap'}`,
                    body: `This gap has not been updated since ${g.updated_at}. Please review and update.`,
                    link: `/compliance/gaps`,
                  }).catch(catchHandler(EC.EVENT_BUS, {}));
                }
              }
            } catch { /* schema may not exist */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] compliance-gap-stale-check error:", toErrorMessage(err));
        }
      },
    },

    // Compliance attestation reminder — daily at 7 AM
    {
      name: 'compliance-attestation-reminder',
      cron: '0 7 * * *',
      handler: async () => {
        logger.info("[Job] compliance-attestation-reminder executed");
        try {
          const { sendComplianceAttestationReminders } = await lazyImport("../../../compliance/services/compliance/compliance-attestation.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const count = await sendComplianceAttestationReminders(t.tenant_id);
              if (count > 0) {
                logger.info(`[Job] compliance-attestation-reminder: sent ${count} reminders for tenant ${t.tenant_id}`);
              }
            } catch (tenantErr: unknown) {
              if (!toErrorMessage(tenantErr).includes("does not exist")) {
                logger.error(`[Job] compliance-attestation-reminder error for tenant ${t.tenant_id}: ${toErrorMessage(tenantErr)}`);
              }
            }
          }
        } catch (err: unknown) {
          logger.error("[Job] compliance-attestation-reminder error:", toErrorMessage(err));
        }
      },
    },

    // Compliance overview snapshot & drift detection — daily at 3 AM
    {
      name: 'compliance-overview-drift-check',
      cron: '0 3 * * *',
      handler: async () => {
        logger.info("[Job] compliance-overview-drift-check executed");
        try {
          const { detectComplianceDrift } = await lazyImport("../../../compliance/services/compliance/compliance-workspace.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const result = await detectComplianceDrift(t.tenant_id);
              if (result.hasDrift) {
                const highSeverityCount = result.deltas.filter(d => d.severity === 'high').length;
                logger.info(`[Job] compliance-overview-drift-check: tenant ${t.tenant_id} — drift detected (${result.deltas.length} deltas, ${highSeverityCount} high severity)`);
              } else {
                logger.info(`[Job] compliance-overview-drift-check: tenant ${t.tenant_id} — no drift detected, snapshot captured`);
              }
            } catch (tenantErr: unknown) {
              const errMsg = toErrorMessage(tenantErr);
              // Table may not exist yet — non-fatal
              if (!errMsg.includes("does not exist") && !errMsg.includes("relation") && !errMsg.includes("compliance_overview_snapshots")) {
                logger.error(`[Job] compliance-overview-drift-check error for tenant ${t.tenant_id}: ${errMsg}`);
              }
            }
          }
        } catch (err: unknown) {
          logger.error("[Job] compliance-overview-drift-check error:", toErrorMessage(err));
        }
      },
    },

    // P3.2: Control and Finding drift detection — daily at 3:30 AM
    {
      name: 'compliance-control-finding-drift-check',
      cron: '30 3 * * *',
      handler: async () => {
        logger.info("[Job] compliance-control-finding-drift-check executed");
        try {
          const { detectControlFindingDrift, captureDriftBaseline } = await lazyImport("../../../compliance/services/compliance/compliance-workspace.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              // First, ensure baseline exists (capture if missing)
              const driftResult = await detectControlFindingDrift(t.tenant_id, 'both');
              
              // If no baseline was found, capture one now
              if (driftResult.controlsChecked === 0 && driftResult.findingsChecked === 0) {
                const baselineResult = await captureDriftBaseline(t.tenant_id, 'both');
                logger.info(`[Job] compliance-control-finding-drift-check: tenant ${t.tenant_id} — baseline captured (${baselineResult.controlsCaptured} controls, ${baselineResult.findingsCaptured} findings)`);
              } else if (driftResult.hasDrift) {
                const highSeverityCount = driftResult.deltas.filter(d => d.severity === 'high').length;
                const controlDeltas = driftResult.deltas.filter(d => d.entityType === 'control').length;
                const findingDeltas = driftResult.deltas.filter(d => d.entityType === 'finding').length;
                logger.info(`[Job] compliance-control-finding-drift-check: tenant ${t.tenant_id} — drift detected (${driftResult.deltas.length} total: ${controlDeltas} controls, ${findingDeltas} findings, ${highSeverityCount} high severity)`);
              } else {
                logger.info(`[Job] compliance-control-finding-drift-check: tenant ${t.tenant_id} — no drift detected (checked ${driftResult.controlsChecked} controls, ${driftResult.findingsChecked} findings)`);
              }
            } catch (tenantErr: unknown) {
              const errMsg = toErrorMessage(tenantErr);
              // Table may not exist yet — non-fatal
              if (!errMsg.includes("does not exist") && !errMsg.includes("relation") && !errMsg.includes("compliance_drift_baselines")) {
                logger.error(`[Job] compliance-control-finding-drift-check error for tenant ${t.tenant_id}: ${errMsg}`);
              }
            }
          }
        } catch (err: unknown) {
          logger.error("[Job] compliance-control-finding-drift-check error:", toErrorMessage(err));
        }
      },
    },

    // P3.3: Control monitoring drift alerts — daily at 8 AM
    // Monitors controls for SLA violations and expiring evidence, sends alerts to owners
    {
      name: 'compliance-control-monitoring-drift-alerts',
      cron: '0 8 * * *',
      handler: async () => {
        logger.info("[Job] compliance-control-monitoring-drift-alerts executed");
        try {
          const { getControlMonitoring } = await lazyImport("../../../compliance/services/compliance/compliance-workspace.service");
          const { createNotification } = await lazyImport("../../../notification/services/notification.service");
          const { safeQuery } = await lazyImport("../../../../config/database/database");
          const tenants = await getProvisionedTenants();
          
          for (const t of tenants) {
            try {
              const monitoring = await getControlMonitoring(t.tenant_id);
              let notificationsCreated = 0;

              // Helper to resolve owner string (email or user_id) to user_id
              const resolveOwnerToUserId = async (owner: string | null): Promise<string | null> => {
                if (!owner) return null;
                try {
                  // Try as email first
                  const emailRes = await safeQuery(
                    `SELECT user_id FROM public.users WHERE tenant_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1`,
                    [t.tenant_id, owner]
                  );
                  if (emailRes.rows.length > 0) return getFirstRow(emailRes)?.user_id;
                  
                  // Try as user_id directly
                  const idRes = await safeQuery(
                    `SELECT user_id FROM public.users WHERE tenant_id = $1 AND user_id = $2 LIMIT 1`,
                    [t.tenant_id, owner]
                  );
                  if (idRes.rows.length > 0) return getFirstRow(idRes)?.user_id;
                  
                  return null;
                } catch {
                  return null;
                }
              };

              // Alert for controls past SLA
              for (const item of monitoring.pastSla) {
                const userId = await resolveOwnerToUserId(item.owner);
                if (userId) {
                  const daysOverdue = item.daysSinceTest !== null ? item.daysSinceTest : 0;
                  await createNotification(t.tenant_id, {
                    userId,
                    type: "control_sla_breach",
                    title: `Control SLA breached: ${item.title}`,
                    body: `Control "${item.title}" has not been tested in ${daysOverdue} days (SLA: ${item.testFrequency}). Immediate action required.`,
                    link: `/compliance-workspace/controls/${item.controlId}`,
                  });
                  notificationsCreated++;
                }
              }

              // Alert for controls approaching SLA
              for (const item of monitoring.approachingSla) {
                const userId = await resolveOwnerToUserId(item.owner);
                if (userId) {
                  const daysRemaining = item.daysSinceTest !== null 
                    ? (SLA_DAYS[item.testFrequency.toLowerCase()] || 90) - item.daysSinceTest
                    : 0;
                  await createNotification(t.tenant_id, {
                    userId,
                    type: "control_sla_warning",
                    title: `Control SLA approaching: ${item.title}`,
                    body: `Control "${item.title}" needs testing within ${daysRemaining} days to meet SLA (${item.testFrequency}).`,
                    link: `/compliance-workspace/controls/${item.controlId}`,
                  });
                  notificationsCreated++;
                }
              }

              // Alert for expiring evidence
              for (const item of monitoring.expiringEvidence) {
                const userId = await resolveOwnerToUserId(item.owner);
                if (userId && item.evidenceExpiryNext) {
                  const expDate = new Date(item.evidenceExpiryNext);
                  const daysUntilExpiry = Math.floor((expDate.getTime() - Date.now()) / 86400000);
                  await createNotification(t.tenant_id, {
                    userId,
                    type: "evidence_expiring",
                    title: `Evidence expiring soon: ${item.title}`,
                    body: `Evidence for control "${item.title}" expires in ${daysUntilExpiry} day(s) (${expDate.toLocaleDateString()}). Please refresh evidence.`,
                    link: `/compliance-workspace/controls/${item.controlId}`,
                  });
                  notificationsCreated++;
                }
              }

              if (notificationsCreated > 0) {
                logger.info(`[Job] compliance-control-monitoring-drift-alerts: tenant ${t.tenant_id} — ${notificationsCreated} notifications created (${monitoring.pastSla.length} past SLA, ${monitoring.approachingSla.length} approaching, ${monitoring.expiringEvidence.length} expiring evidence)`);
              }
            } catch (tenantErr: unknown) {
              const errMsg = toErrorMessage(tenantErr);
              logger.error(`[Job] compliance-control-monitoring-drift-alerts error for tenant ${t.tenant_id}: ${errMsg}`);
            }
          }
        } catch (err: unknown) {
          logger.error("[Job] compliance-control-monitoring-drift-alerts error:", toErrorMessage(err));
        }
      },
    },
  ];
}
