// @ts-nocheck
import { toErrorMessage } from '../errors/http-error.util';
import { logger } from '../platform/dos/observability/logger.service';

export async function runStartupValidations(): Promise<void> {
  try {
    const { validateContractRegistry } = await import('../platform/contracts/contract-registry');
    const contractErrors = validateContractRegistry();
    if (contractErrors.length > 0) {
      logger.warn(`[StartupValidation] Contract registry has ${contractErrors.length} issue(s)`, { errors: contractErrors });
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`[StartupValidation] Contract registry validation failed: ${contractErrors.join('; ')}`);
      }
    } else {
      logger.info('[StartupValidation] Contract registry validation passed');
    }
  } catch (err: unknown) {
    if (process.env.NODE_ENV === 'production') throw err;
    logger.warn('[StartupValidation] Contract registry validation skipped (non-fatal in dev/staging):', { error: toErrorMessage(err) });
  }

  try {
    const { validateHierarchy } = await import('../platform/contracts/hierarchy-validator');
    const hierarchyReport = validateHierarchy();
    if (!hierarchyReport.passed) {
      const failedChecks = hierarchyReport.checks.filter((c: { passed: boolean; errors: string[] }) => !c.passed).map((c: { check: string; errors: string[] }) => `${c.check}: ${c.errors.join('; ')}`);
      logger.warn(`[StartupValidation] Hierarchy validation found ${hierarchyReport.violations.length} violation(s)`, { failedChecks });
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`[StartupValidation] Hierarchy validation failed: ${failedChecks.join(' | ')}`);
      }
    } else {
      logger.info(`[StartupValidation] Hierarchy validation passed — ${hierarchyReport.checks.length} checks OK`);
    }
  } catch (err: unknown) {
    if (process.env.NODE_ENV === 'production') throw err;
    logger.warn('[StartupValidation] Hierarchy validation skipped (non-fatal in dev/staging):', { error: toErrorMessage(err) });
  }

  logger.info('[Platform] Startup validations complete — platform-only mode');
}
