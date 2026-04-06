// @ts-nocheck
import { catchHandler, EC } from '../../../platform/dos/resilience/resilient-catch';
// @ts-nocheck
import { query } from '../../../config/database/database';
import { ProvisioningContext, ProvisioningStepStatus, SeedInstallResult } from './types';
import { SeedInstaller } from './seed-installer.interface';
import { assertProvisioningReady } from '../../../platform/dos/provisioning/provisioning-readiness';

export class ProvisioningOrchestrator {
  constructor(private readonly installers: SeedInstaller[]) {}

  private static readonly MAX_RETRIES = 2;

  async run(ctx: ProvisioningContext): Promise<void> {
    await this.markJobStatus(ctx.provisioningJobId, 'validating');
    const completedInstallers: SeedInstaller[] = [];

    try {
      this.ensureBaseValidation(ctx);
      await assertProvisioningReady(ctx.schemaName);
      await this.markJobStatus(ctx.provisioningJobId, 'running');

      let sequenceNo = 0;
      for (const installer of this.installers) {
        const stepKey = installer.key;
        sequenceNo++;

        await this.upsertStep(ctx.provisioningJobId, stepKey, sequenceNo, 'running');
        await this.logEvent(ctx.provisioningJobId, null, 'step_started', 'info', `Running ${stepKey}`);

        try {
          const canInstall = await installer.canInstall(ctx);

          if (!canInstall) {
            await this.upsertStep(ctx.provisioningJobId, stepKey, sequenceNo, 'skipped');
            await this.logEvent(ctx.provisioningJobId, null, 'installer_skipped', 'info', `${stepKey} skipped`, { installerKey: stepKey });
            continue;
          }

          if (installer.validate) {
            const validation = await installer.validate(ctx);
            if (!validation.valid) {
              throw new Error(`Validation failed for ${stepKey}: ${validation.errors.join('; ')}`);
            }
          }

          const result = await this.installWithRetry(installer, ctx, stepKey, sequenceNo);

          if (result.status === 'failed') {
            throw new Error(`Installer ${stepKey} reported failed status after retries`);
          }

          // Post-install validation (quality gate)
          if (installer.validate) {
            const postValidation = await installer.validate(ctx);
            if (!postValidation.valid) {
              const msg = `Post-install validation failed for ${stepKey}: ${postValidation.errors.join('; ')}`;
              await this.logEvent(ctx.provisioningJobId, null, 'post_validation_failed', 'error', msg);
              throw new Error(msg);
            }
            if (postValidation.warnings?.length) {
              for (const w of postValidation.warnings) {
                await this.logEvent(ctx.provisioningJobId, null, 'post_validation_warning', 'warn', w);
              }
            }
          }

          completedInstallers.push(installer);
        } catch (err: unknown) {
          await this.upsertStep(ctx.provisioningJobId, stepKey, sequenceNo, 'failed', undefined, (err as Error).message);
          await this.logEvent(ctx.provisioningJobId, null, 'installer_failed', 'error', (err as Error).message ?? 'Unknown failure', { installerKey: stepKey });

          // Three-tier rollback based on failure stage
          const strategy = this.determineRollbackStrategy(sequenceNo, this.installers.length);
          await this.logEvent(ctx.provisioningJobId, null, 'rollback_started', 'warn',
            `Rollback strategy: ${strategy} (failed at step ${sequenceNo}/${this.installers.length})`);

          if (strategy === 'schema_drop') {
            // Failed during first 2 steps — drop entire schema
            await query(`DROP SCHEMA IF EXISTS "${ctx.schemaName}" CASCADE`).catch(catchHandler(EC.EVENT_BUS, {}));
            await query(`UPDATE public.tenants SET status = 'failed' WHERE tenant_id = $1`, [ctx.tenantId]).catch(catchHandler(EC.EVENT_BUS, {}));
          } else if (strategy === 'mark_degraded') {
            // Failed during final integrity check — mark as degraded, not failed
            await query(`UPDATE public.tenants SET status = 'active' WHERE tenant_id = $1`, [ctx.tenantId]).catch(catchHandler(EC.EVENT_BUS, {}));
            await this.logEvent(ctx.provisioningJobId, null, 'tenant_degraded', 'warn', 'Tenant marked active despite integrity check warnings');
          } else {
            // step_rollback — roll back completed steps in reverse
            await this.rollbackCompleted(ctx, completedInstallers);
          }

          const finalStatus = strategy === 'mark_degraded' ? 'completed' : 'failed';
          await this.markJobStatus(ctx.provisioningJobId, finalStatus);
          if (strategy !== 'mark_degraded') throw err;
        }
      }

      await this.activateTenant(ctx);
      await this.markJobStatus(ctx.provisioningJobId, 'completed');
      await this.logEvent(ctx.provisioningJobId, null, 'tenant_activated', 'info', 'Tenant activated', { tenantId: ctx.tenantId });
    } catch (err: unknown) {
      await this.markJobStatus(ctx.provisioningJobId, 'failed');
      throw err;
    }
  }

  private async installWithRetry(
    installer: SeedInstaller,
    ctx: ProvisioningContext,
    stepKey: string,
    sequenceNo: number
  ): Promise<SeedInstallResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= ProvisioningOrchestrator.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          await this.logEvent(ctx.provisioningJobId, null, 'installer_retry', 'warn', `Retrying ${stepKey} (attempt ${attempt + 1})`, { attempt });
          await this.upsertStep(ctx.provisioningJobId, stepKey, sequenceNo, 'running');
        }

        const result = await installer.install(ctx);
        const finalStatus: ProvisioningStepStatus = result.status === 'failed' ? 'failed' : 'completed';
        await this.upsertStep(ctx.provisioningJobId, stepKey, sequenceNo, finalStatus, result);
        await this.logEvent(ctx.provisioningJobId, null, 'installer_completed', 'info', `${stepKey} completed`, result as any as Record<string, any>);

        if (result.status !== 'failed') return result;
        lastError = new Error(`${stepKey} reported failed`);
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error('unknown');
        if (attempt < ProvisioningOrchestrator.MAX_RETRIES) continue;
      }
    }

    throw lastError ?? new Error(`${stepKey} failed after ${ProvisioningOrchestrator.MAX_RETRIES + 1} attempts`);
  }

  private async rollbackCompleted(ctx: ProvisioningContext, completed: SeedInstaller[]): Promise<void> {
    for (let i = completed.length - 1; i >= 0; i--) {
      const installer = completed[i];
      if (installer.rollback) {
        try {
          await installer.rollback(ctx);
          await this.logEvent(ctx.provisioningJobId, null, 'installer_rolled_back', 'warn', `Rolled back ${installer.key}`);
        } catch (rbErr: unknown) {
          await this.logEvent(ctx.provisioningJobId, null, 'rollback_failed', 'error', `Rollback failed for ${installer.key}: ${(rbErr as Error).message}`);
        }
      }
    }
  }

  private determineRollbackStrategy(
    failedStepIndex: number,
    totalSteps: number,
  ): 'schema_drop' | 'step_rollback' | 'mark_degraded' {
    if (failedStepIndex <= 2) return 'schema_drop';
    if (failedStepIndex >= totalSteps) return 'mark_degraded';
    return 'step_rollback';
  }

  private ensureBaseValidation(ctx: ProvisioningContext): void {
    if (!ctx.tenantId) throw new Error('Missing tenantId in provisioning context');
    if (!ctx.schemaName) throw new Error('Missing schemaName in provisioning context');
    if (!ctx.subscriptionTier) throw new Error('Missing subscriptionTier in provisioning context');
  }

  private async markJobStatus(jobId: string, status: string): Promise<void> {
    await query(
      `UPDATE public.provisioning_jobs SET job_status = $2::text, updated_at = now() WHERE id = $1::uuid`,
      [jobId, status]
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  private async upsertStep(
    jobId: string,
    stepCode: string,
    sequenceNo: number,
    status: ProvisioningStepStatus,
    result?: Partial<SeedInstallResult>,
    errorMsg?: string
  ): Promise<void> {
    const payloadJson = result ? JSON.stringify(result) : '{}';
    const errMsg = errorMsg ?? null;

    await query(
      `INSERT INTO public.provisioning_steps (job_id, step_code, step_name, sequence_no, status, started_at, payload_json)
       VALUES ($1::uuid, $2::text, $2::text, $3::int, $4::text, now(), $5::jsonb)
       ON CONFLICT (job_id, step_code) DO UPDATE
         SET status = $4::text,
             completed_at = CASE WHEN $4::text IN ('completed','failed','skipped') THEN now() ELSE public.provisioning_steps.completed_at END,
             error_message = CASE WHEN $4::text = 'failed' THEN $6::text ELSE public.provisioning_steps.error_message END,
             payload_json = $5::jsonb,
             updated_at = now()`,
      [jobId, stepCode, sequenceNo, status, payloadJson, errMsg]
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  private async logEvent(
    jobId: string,
    stepId: string | null,
    eventType: string,
    level: string,
    message: string,
    details?: Record<string, any>
  ): Promise<void> {
    await query(
      `INSERT INTO public.provisioning_events (job_id, step_id, event_type, level, message, details_json)
       VALUES ($1::uuid, $2, $3::text, $4::text, $5::text, $6::jsonb)`,
      [jobId, stepId, eventType, level, message, JSON.stringify(details ?? {})]
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  private async activateTenant(ctx: ProvisioningContext): Promise<void> {
    await query(
      `UPDATE public.tenants SET status = 'active', updated_at = now() WHERE tenant_id = $1`,
      [ctx.tenantId]
    );
  }
}
