import type { SeedInstaller } from '../../platform/provisioning/seed-installer.interface';
import type { ProvisioningContext, SeedInstallResult } from '../../platform/provisioning/types';

export class QualityGateSeedInstaller implements SeedInstaller {
  key = 'quality-gate-seed';
  async canInstall(_ctx: ProvisioningContext): Promise<boolean> { return true; }
  async install(_ctx: ProvisioningContext): Promise<SeedInstallResult> {
    return { installerKey: this.key, status: 'skipped', recordsCreated: 0, recordsUpdated: 0, notes: 'Quality gate seeds deferred — no product layer active' };
  }
}
