// @ts-nocheck
import { catchHandler, EC } from '../../../../../platform/dos/resilience/resilient-catch';
import { logger } from '../../../../../platform/dos/observability/logger';
/**
 * AI Agent domain job definitions.
 * Covers agent inference, standup digest, smart triage, memory compaction/expiry,
 * eval pipeline, self-improvement, budget reset, cycle memory cleanup,
 * copilot auto-executor, and AI binding governance drift.
 */
import { JobDefinition } from '../job-types';
import { toErrorMessage } from '../../../../../errors/http-error.util';
import type { GenericRow } from '../../../../../types/db-rows.types';
import { lazyImport } from '../../../../../platform/dos/core/lazy-import';

export async function getAgentJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await lazyImport('../../services/misc/job-scheduler.service');

  return [
    // Autonomous Agent Inference Runner — every 60 minutes
    {
      name: 'agent-inference-runner',
      cron: '0 * * * *',
      handler: async () => {
        logger.info("[Job] agent-inference-runner executed");
        try {
          const { runAllAgents } = await lazyImport("../../../ai/services/agents/core/agent-runner.service");
          const { getTenantPlatformMode } = await lazyImport("../../services/platform/platform-mode-gate.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const mode = await getTenantPlatformMode(t.tenant_id);
              logger.info(`[Job] agent-inference-runner: tenant ${t.tenant_id} — mode: ${mode}`);
              const results = await runAllAgents(t.tenant_id);
              const totalActions = results.reduce((s, r) => s + r.actionsExecuted, 0);
              const totalProposed = results.reduce((s, r) => s + r.actionsProposed, 0);
              if (totalActions > 0 || totalProposed > 0) {
                logger.info(`[Job] agent-inference-runner: tenant ${t.tenant_id} [${mode}] — ${totalActions} executed, ${totalProposed} proposed`);
              }
            } catch { /* tenant agent run failure — non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] agent-inference-runner error:", toErrorMessage(err));
        }
      },
    },

    // Agent Standup Digest — daily at 6:30 AM
    {
      name: 'agent-standup-digest',
      cron: '30 6 * * *',
      handler: async () => {
        logger.info("[Job] agent-standup-digest executed");
        try {
          const { generateStandupDigest } = await lazyImport("../../../ai/services/agent-standup.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await generateStandupDigest(t.tenant_id);
            } catch { /* tenant digest failure — non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] agent-standup-digest error:", toErrorMessage(err));
        }
      },
    },

    // Smart Task Triage — every 2 hours
    {
      name: 'smart-task-triage',
      cron: '0 */2 * * *',
      handler: async () => {
        logger.info("[Job] smart-task-triage executed");
        try {
          const { generateTriageProposals } = await lazyImport("../../../workflow/services/tasks/task-triage.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              await generateTriageProposals(t.tenant_id);
            } catch { /* tenant triage failure — non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] smart-task-triage error:", toErrorMessage(err));
        }
      },
    },

    // Memory Expiry Cleanup — daily at 3 AM
    {
      name: 'memory-expiry-cleanup',
      cron: '0 3 * * *',
      handler: async () => {
        try {
          const { safeQuery, tenantSchema } = await lazyImport("../../../../config/database/database");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".agent_memories SET is_deleted = TRUE, updated_at = NOW()
                 WHERE is_deleted = FALSE AND expires_at IS NOT NULL AND expires_at < NOW()
                 RETURNING memory_id`,
                [],
              );
              if (result.rows.length > 0) {
                logger.info(`[Job] memory-expiry-cleanup: tenant ${t.tenant_id} — purged ${result.rows.length} expired memories`);
              }
            } catch { /* tenant cleanup failure — non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] memory-expiry-cleanup error:", toErrorMessage(err));
        }
      },
    },

    // Memory Compaction — daily at 3:30 AM
    {
      name: 'memory-compaction',
      cron: '30 3 * * *',
      handler: async () => {
        try {
          const { safeQuery, tenantSchema } = await lazyImport("../../../../config/database/database");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const nsResult = await safeQuery(
                `SELECT namespace, COUNT(*) as cnt FROM "${schema}".agent_memories
                 WHERE is_deleted = FALSE GROUP BY namespace HAVING COUNT(*) > 50 LIMIT 20`,
                [],
              );
              for (const ns of nsResult.rows) {
                const memResult = await safeQuery(
                  `SELECT content, importance_score FROM "${schema}".agent_memories
                   WHERE namespace = $1 AND is_deleted = FALSE
                   ORDER BY importance_score DESC, created_at DESC LIMIT 50`,
                  [ns.namespace],
                );
                const summaryText = memResult.rows
                  .map((r: GenericRow) => r.content)
                  .join(' | ')
                  .slice(0, 2000);

                await safeQuery(
                  `INSERT INTO "${schema}".memory_summaries (tenant_id, namespace, summary_text, memory_count, last_compacted_at)
                   VALUES ($1, $2, $3, $4, NOW())
                   ON CONFLICT ON CONSTRAINT uq_ms_tenant_ns
                   DO UPDATE SET summary_text = $3, memory_count = $4, last_compacted_at = NOW(), updated_at = NOW()`,
                  [t.tenant_id, ns.namespace, summaryText, Number(ns.cnt)],
                );

                await safeQuery(
                  `INSERT INTO "${schema}".memory_access_log (tenant_id, namespace, action, result_count)
                   VALUES ($1, $2, 'compact', $3)`,
                  [t.tenant_id, ns.namespace, Number(ns.cnt)],
                ).catch(catchHandler(EC.EVENT_BUS, {}));
              }
            } catch { /* tenant compaction failure — non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] memory-compaction error:", toErrorMessage(err));
        }
      },
    },

    // Enhanced Memory Compaction (E13) — daily at 4:00 AM
    {
      name: 'ai-memory-compaction',
      cron: '0 4 * * *',
      handler: async () => {
        try {
          const { runCompaction } = await lazyImport("../../../ai/services/memory-compaction.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const result = await runCompaction(t.tenant_id);
              if (result.memoriesProcessed > 0) {
                logger.info(`[Job] ai-memory-compaction: tenant ${t.tenant_id} — expired=${result.memoriesExpired}, merged=${result.memoriesMerged}, compacted=${result.memoriesCompacted}`);
              }
            } catch { /* non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] ai-memory-compaction error:", toErrorMessage(err));
        }
      },
    },

    // Agent Eval Pipeline (E11) — daily at 5:00 AM
    {
      name: 'ai-eval-pipeline',
      cron: '0 5 * * *',
      handler: async () => {
        try {
          const { batchEvaluate } = await lazyImport("../../../ai/services/agent-eval.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const result = await batchEvaluate(t.tenant_id, 5);
              if (result.evaluated > 0) {
                logger.info(`[Job] ai-eval-pipeline: tenant ${t.tenant_id} — evaluated=${result.evaluated}, scores=${JSON.stringify(result.avgScores)}`);
              }
            } catch { /* non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] ai-eval-pipeline error:", toErrorMessage(err));
        }
      },
    },

    // Agent Self-Improvement (E18) — weekly on Sundays at 6:00 AM
    {
      name: 'ai-self-improvement',
      cron: '0 6 * * 0',
      handler: async () => {
        try {
          const { runSelfImprovementCycle } = await lazyImport("../../../ai/services/agent-self-improve.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const result = await runSelfImprovementCycle(t.tenant_id);
              if (result.reflections > 0) {
                logger.info(`[Job] ai-self-improvement: tenant ${t.tenant_id} — agents=${result.agents.join(',')}, reflections=${result.reflections}`);
              }
            } catch { /* non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] ai-self-improvement error:", toErrorMessage(err));
        }
      },
    },

    // LLM Budget Reset (E14) — 1st of each month at midnight
    {
      name: 'ai-budget-reset',
      cron: '0 0 1 * *',
      handler: async () => {
        try {
          const { resetMonthlyBudgets } = await lazyImport("../../../ai/services/llm-usage-tracker.service");
          const count = await resetMonthlyBudgets();
          logger.info(`[Job] ai-budget-reset: reset ${count} tenant budgets`);
        } catch (err: unknown) {
          logger.error("[Job] ai-budget-reset error:", toErrorMessage(err));
        }
      },
    },

    // Cycle Memory Cleanup (E17) — weekly Mondays at 3:00 AM
    {
      name: 'ai-cycle-memory-cleanup',
      cron: '0 3 * * 1',
      handler: async () => {
        try {
          const { cleanupOldCycles } = await lazyImport("../../../ai/services/agent-cycle-memory.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const deleted = await cleanupOldCycles(t.tenant_id, 90);
              if (deleted > 0) logger.info(`[Job] ai-cycle-memory-cleanup: tenant ${t.tenant_id} — deleted ${deleted} old entries`);
            } catch { /* non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] ai-cycle-memory-cleanup error:", toErrorMessage(err));
        }
      },
    },

    // Copilot Auto-Executor — every 1 minute
    {
      name: 'copilot-auto-executor',
      cron: '*/1 * * * *',
      handler: async () => {
        try {
          const { autoExecutePendingActions, escalateStaleActions } = await lazyImport("../../../ai/services/proposed-action.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const r = await autoExecutePendingActions(t.tenant_id);
              if (r.executed > 0 || r.failed > 0) {
                logger.info(`[Job] copilot-auto-executor: ${t.tenant_id} — ${r.executed} exec, ${r.failed} fail, ${r.skipped} skip`);
              }
              await escalateStaleActions(t.tenant_id);
            } catch { /* tenant auto-exec failure — non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error("[Job] copilot-auto-executor error:", toErrorMessage(err));
        }
      },
    },

    // AI Binding Governance Drift Detection — every 6 hours
    {
      name: 'ai-binding-governance-drift',
      cron: '0 */6 * * *',
      handler: async () => {
        try {
          const tenants = await getProvisionedTenants();
          const { safeQuery, tenantSchema } = await lazyImport("../../../../config/database/database");
          const { createProcessTask } = await lazyImport("../../../workflow/services/tasks/process-orchestration.service");
          const { eventBus } = await lazyImport("../../services/event/event-bus.service");
          const {
            listAgentToolBindings,
            isAssetAllowlistedForTenant,
          } = await lazyImport("../../../ai-governance/services/ai/ai-binding-governance.service");

          let totalDrifts = 0;

          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              let tenantDriftCount = 0;

              // 1. Check enabled bindings against allowlist
              const { bindings } = await listAgentToolBindings(t.tenant_id, { is_enabled: true, limit: 500 });
              for (const binding of bindings) {
                try {
                  const agentOk = await isAssetAllowlistedForTenant(t.tenant_id, binding.agent_asset_id);
                  const toolOk = await isAssetAllowlistedForTenant(t.tenant_id, binding.tool_asset_id);

                  if (!agentOk || !toolOk) {
                    tenantDriftCount++;
                    const missing = !agentOk && !toolOk ? 'agent + tool' : !agentOk ? 'agent' : 'tool';
                    try {
                      await createProcessTask(t.tenant_id, {
                        title: `AI governance drift: binding ${binding.binding_id} — ${missing} not allowlisted`,
                        description: `Agent-tool binding ${binding.binding_id} is enabled but ${missing} asset(s) are not in the tenant allowlist. Agent: ${binding.agent_asset_id}, Tool: ${binding.tool_asset_id}`,
                        entityType: 'ai_governance',
                        entityId: binding.binding_id,
                        taskType: 'control_review',
                        priority: 'medium',
                      });
                    } catch { /* non-fatal */ }
                  }
                } catch { /* per-binding non-fatal */ }
              }

              // 2. Check for orphaned allowlist entries (asset deleted from inventory)
              try {
                const orphans = await safeQuery(
                  `SELECT al.allowlist_id, al.asset_id
                   FROM "${schema}".tenant_ai_allowlist al
                   LEFT JOIN "${schema}".ai_asset_inventory inv ON inv.asset_id = al.asset_id
                   WHERE al.is_enabled = true AND inv.asset_id IS NULL
                   LIMIT 50`
                );

                for (const orphan of orphans.rows) {
                  tenantDriftCount++;
                  try {
                    await createProcessTask(t.tenant_id, {
                      title: `AI governance drift: orphaned allowlist entry ${orphan.allowlist_id}`,
                      description: `Allowlist entry ${orphan.allowlist_id} references asset ${orphan.asset_id} which no longer exists in ai_asset_inventory`,
                      entityType: 'ai_governance',
                      entityId: orphan.allowlist_id,
                      taskType: 'control_review',
                      priority: 'low',
                    });
                  } catch { /* non-fatal */ }
                }
              } catch { /* tenant_ai_allowlist may not exist — non-fatal */ }

              totalDrifts += tenantDriftCount;

              if (tenantDriftCount > 0) {
                try {
                  await eventBus.publish({
                    eventType: 'ai.governance_drift_detected',
                    tenantId: t.tenant_id,
                    sourceService: 'ai-binding-governance-drift',
                    entityType: 'ai_governance',
                    entityId: t.tenant_id,
                    severity: tenantDriftCount > 10 ? 'critical' : 'warning',
                    payload: { driftCount: tenantDriftCount },
                  });
                } catch { /* event emission non-fatal */ }
              }
            } catch (e: unknown) {
              if (!toErrorMessage(e).includes("does not exist")) {
                logger.error(`[Job] ai-binding-governance-drift error for ${t.tenant_id}: ${toErrorMessage(e)}`);
              }
            }
          }

          if (totalDrifts > 0) {
            logger.info(`[Job] ai-binding-governance-drift: ${totalDrifts} drift issues across ${tenants.length} tenants`);
          }
        } catch (err: unknown) { logger.error("[Job] ai-binding-governance-drift error:", toErrorMessage(err)); }
      },
    },

    // Shadow Comparison (Feature 11) — daily at 2 AM
    {
      name: 'shadow-comparison',
      cron: '0 2 * * *',
      handler: async () => {
        try {
          const { computeComparisonMetrics } = await lazyImport('../../services/misc/shadow-validation.service');
          const tenants = await getProvisionedTenants();
          const periodEnd = new Date();
          const periodStart = new Date(periodEnd);
          periodStart.setDate(periodStart.getDate() - 1);
          const startStr = periodStart.toISOString();
          const endStr = periodEnd.toISOString();
          for (const t of tenants) {
            try {
              const metrics = await computeComparisonMetrics(t.tenant_id, startStr, endStr);
              if (metrics.length > 0) {
                logger.info(`[Job] Number(shadow) - Number(comparison): tenant ${t.tenant_id} — ${metrics.length} agent(s), accuracy=${metrics.map((m: GenericRow) => `${m.agentId}:${(m.accuracy * 100).toFixed(1)}%`).join(', ')}`);
              }
            } catch { /* tenant non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] shadow-comparison error:', toErrorMessage(err));
        }
      },
    },

    // Prompt Drift Detection (Feature 16) — weekly Sunday 3 AM
    {
      name: 'prompt-drift-detection',
      cron: '0 3 * * 0',
      handler: async () => {
        try {
          const { listActivePromptVersions, runDriftDetectionForPrompt } = await lazyImport('../../../ai/services/prompt-drift-detector.service');
          const tenants = await getProvisionedTenants();
          let totalFlagged = 0;
          for (const t of tenants) {
            try {
              const prompts = await listActivePromptVersions(t.tenant_id);
              for (const p of prompts) {
                const flagged = await runDriftDetectionForPrompt(t.tenant_id, p.prompt_version_id);
                if (flagged) totalFlagged++;
              }
            } catch { /* tenant non-fatal */ }
          }
          if (totalFlagged > 0) {
            logger.info(`[Job] prompt-drift-detection: ${totalFlagged} prompt(s) flagged across tenants`);
          }
        } catch (err: unknown) {
          logger.error('[Job] prompt-drift-detection error:', toErrorMessage(err));
        }
      },
    },

    // Fleet Health Snapshot — every 30 minutes
    {
      name: 'fleet-health-snapshot',
      cron: '*/30 * * * *',
      handler: async () => {
        try {
          const { saveFleetSnapshot } = await lazyImport("../../../ai/services/agent-metrics-aggregator.service");
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            await saveFleetSnapshot(t.tenant_id).catch(catchHandler(EC.EVENT_BUS, {}));
          }
        } catch (err: unknown) {
          logger.error("[Job] fleet-health-snapshot error:", toErrorMessage(err));
        }
      },
    },

    // Personal Agent SLA Check — every hour
    {
      name: 'personal-agent-sla-check',
      cron: '0 * * * *',
      handler: async () => {
        try {
          const { runPersonalAgentSlaCheckJob } = await import("./personal-agent-sla-check.job");
          await runPersonalAgentSlaCheckJob();
        } catch (err: unknown) {
          logger.error("[Job] personal-agent-sla-check error:", toErrorMessage(err));
        }
      },
      description: 'Check SLA breaches and activate personal agents',
    },
  ];
}
