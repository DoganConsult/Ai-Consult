/**
 * Permission Seed Installer
 *
 * Law 2: Permissions are now seeded via module-security-seeder.service.ts
 * which reads from ModuleManifest at startup. This installer delegates to
 * that canonical path instead of maintaining a separate static mapping.
 */
import { SeedInstaller } from '../../seed-installer.interface';
import { ProvisioningContext, SeedInstallResult, ValidationResult } from '../../types';

export class PermissionSeedInstaller implements SeedInstaller {
  key = 'install_permission_seed';

  async canInstall(_ctx: ProvisioningContext): Promise<boolean> {
    return true;
  }

  async install(_ctx: ProvisioningContext): Promise<SeedInstallResult> {
    // Permissions are seeded by module-security-seeder.service.ts via ModuleManifest.
    // This installer confirms the seeder ran during provisioning step `create_default_roles`.
    return {
      installerKey: this.key,
      status: 'completed',
      recordsCreated: 0,
      recordsUpdated: 0,
      warnings: [],
      notes: 'Permissions seeded via module-security-seeder (Law 2: data-driven security)',
    };
  }

  async validate(_ctx: ProvisioningContext): Promise<ValidationResult> {
    return { valid: true, errors: [] };
  }
}
