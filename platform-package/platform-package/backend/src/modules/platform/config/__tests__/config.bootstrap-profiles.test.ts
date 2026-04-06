import { describe, expect, it, vi } from 'vitest';
import { bootstrapDeploymentProfile, deploymentProfileSeeds } from '../config.bootstrap';
import type { ConfigService } from '../config.service';

describe('config.bootstrap-profiles', () => {
  it('seeds saas-enterprise profile correctly', async () => {
    const mockUpsert = vi.fn();
    const mockService = { upsertValue: mockUpsert } as any as ConfigService;
    
    await bootstrapDeploymentProfile(mockService, { userId: 'system' }, 'saas-enterprise');

    expect(mockUpsert).toHaveBeenCalledTimes(deploymentProfileSeeds['saas-enterprise'].values.length);
    expect(mockUpsert).toHaveBeenCalledWith(
      { userId: 'system' },
      expect.objectContaining({ key: 'deployment.mode', value: 'saas' })
    );
  });

  it('seeds sovereign-airgapped profile correctly', async () => {
    const mockUpsert = vi.fn();
    const mockService = { upsertValue: mockUpsert } as any as ConfigService;
    
    await bootstrapDeploymentProfile(mockService, { userId: 'system' }, 'sovereign-airgapped');

    expect(mockUpsert).toHaveBeenCalledWith(
      { userId: 'system' },
      expect.objectContaining({ key: 'deployment.mode', value: 'sovereign' })
    );
    expect(mockUpsert).toHaveBeenCalledWith(
      { userId: 'system' },
      expect.objectContaining({ key: 'deployment.airgapped.enabled', value: true })
    );
  });
});
