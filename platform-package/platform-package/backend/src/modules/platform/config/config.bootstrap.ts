import type { ConfigScopeType } from './config.types';
import { ConfigService } from './config.service';

export const deploymentProfileSeeds = {
  'saas-enterprise': {
    values: [
      { key: 'deployment.mode', scopeType: 'deployment', scopeId: 'default', value: 'saas' },
      { key: 'platform.observability.telemetryEnabled', scopeType: 'platform', scopeId: 'global', value: true },
      { key: 'deployment.secrets.provider', scopeType: 'deployment', scopeId: 'default', value: 'cloud_kms' },
    ],
  },
  'onprem-singletenant': {
    values: [
      { key: 'deployment.mode', scopeType: 'deployment', scopeId: 'default', value: 'onprem' },
      { key: 'platform.observability.telemetryEnabled', scopeType: 'platform', scopeId: 'global', value: false },
      { key: 'deployment.secrets.provider', scopeType: 'deployment', scopeId: 'default', value: 'local_vault' },
    ],
  },
  'sovereign-airgapped': {
    values: [
      { key: 'deployment.mode', scopeType: 'deployment', scopeId: 'default', value: 'sovereign' },
      { key: 'deployment.airgapped.enabled', scopeType: 'deployment', scopeId: 'default', value: true },
      { key: 'ai.llm.localOnly', scopeType: 'platform', scopeId: 'global', value: true },
      { key: 'deployment.secrets.provider', scopeType: 'deployment', scopeId: 'default', value: 'hsm' },
    ],
  },
  'sdk-headless': {
    values: [
      { key: 'deployment.mode', scopeType: 'deployment', scopeId: 'default', value: 'sdk' },
      { key: 'platform.ui.enabled', scopeType: 'platform', scopeId: 'global', value: false },
      { key: 'platform.api.publicMode', scopeType: 'platform', scopeId: 'global', value: true },
    ],
  },
} as const;

export type DeploymentProfileCode = keyof typeof deploymentProfileSeeds;

export async function bootstrapDeploymentProfile(
  service: ConfigService,
  actor: { userId?: string; roleCodes?: string[]; permissions?: string[] },
  profileCode: DeploymentProfileCode,
): Promise<void> {
  const profile = deploymentProfileSeeds[profileCode];
  for (const entry of profile.values) {
    await service.upsertValue(actor, {
      key: entry.key,
      scopeType: entry.scopeType as ConfigScopeType,
      scopeId: entry.scopeId,
      value: entry.value,
      source: 'bootstrap',
    });
  }
}
