// @ts-nocheck
// Stub — service not yet implemented
import type { SeedInstaller } from '../../seed-installer.interface';

export class RolePackInstaller implements SeedInstaller {
  key = 'role-pack';
  async canInstall(): Promise<boolean> { return true; }
  async install(): Promise<unknown> {
    return { installerKey: this.key, status: 'completed', recordsCreated: 0, recordsUpdated: 0, warnings: [] };
  }
}
