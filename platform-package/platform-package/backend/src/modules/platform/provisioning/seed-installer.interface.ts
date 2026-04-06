import { ProvisioningContext, SeedInstallResult, ValidationResult } from './types';

export interface SeedInstaller {
  key: string;
  canInstall(ctx: ProvisioningContext): Promise<boolean>;
  install(ctx: ProvisioningContext): Promise<SeedInstallResult>;
  validate?(ctx: ProvisioningContext): Promise<ValidationResult>;
  rollback?(ctx: ProvisioningContext): Promise<void>;
}
