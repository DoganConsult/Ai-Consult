import { SeedInstaller } from '../../seed-installer.interface';
import { ProvisioningContext, SeedInstallResult } from '../../types';
import { toErrorMessage } from '../../../../../errors/http-error.util';

export class AiGovernanceBootstrapInstaller implements SeedInstaller {
  key = 'install_ai_governance_bootstrap';

  async canInstall(ctx: ProvisioningContext): Promise<boolean> {
    return ctx.enabledModules.includes('ai') || ctx.enabledModules.includes('ai-governance') || ctx.subscriptionTier === 'continuous';
  }

  async install(ctx: ProvisioningContext): Promise<SeedInstallResult> {
    try {
      const { bootstrapAiGovernance } = await import('../../../ai-governance/services/ai/ai-governance-bootstrap.service');
      const result = await bootstrapAiGovernance(ctx.tenantId);
      return {
        installerKey: this.key,
        status: 'completed',
        recordsCreated: result.modelVersions + result.promptVersions + result.agentVersions + result.toolBindings + result.allowlistEntries,
        recordsUpdated: 0,
        details: {
          modelVersions: result.modelVersions,
          promptVersions: result.promptVersions,
          agentVersions: result.agentVersions,
          toolBindings: result.toolBindings,
          allowlistEntries: result.allowlistEntries,
          configKeys: result.configKeys,
        },
      };
    } catch (err: unknown) {
      return {
        installerKey: this.key,
        status: 'completed',
        recordsCreated: 0,
        recordsUpdated: 0,
        warnings: [`AI Governance bootstrap skipped: ${toErrorMessage(err)}`],
      };
    }
  }
}
