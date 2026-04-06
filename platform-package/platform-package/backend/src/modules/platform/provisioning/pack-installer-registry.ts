// @ts-nocheck
import { SeedInstaller } from './seed-installer.interface';
import { certificationBootstrapInstaller } from './installers/certification-bootstrap.installer';
import { ActorRegistrationInstaller } from './installers/actor-registration.installer';
import { OwnerAccessProfileInstaller } from './installers/owner-access-profile.installer';
import { OwnerRoleAssignmentInstaller } from './installers/owner-role-assignment.installer';
import { OwnerEntitlementInstaller } from './installers/owner-entitlement.installer';
import { AccessSnapshotInstaller } from './installers/access-snapshot.installer';
import { QualityGateSeedInstaller } from '../../../modules/quality-gate/provisioning/quality-gate-seed.installer';
import { RaciSeedInstaller } from './installers/security/raci-seed.installer';
import { SharedBaseInstaller } from './installers/bootstrap/shared-base.installer';
import { NavigationSeedInstaller } from './installers/content/navigation-seed.installer';
import { AgrcSeedInstaller } from './installers/bootstrap/agrc.installer';
import { RolePackInstaller } from './installers/security/role-pack.installer';
import { SectorFrameworkBindingInstaller } from './installers/content/sector-framework.installer';
import { OrgStructureSeedInstaller } from './installers/bootstrap/org-structure.installer';
import { TenantIntegrityCheckInstaller } from './installers/bootstrap/integrity-check.installer';
import { ChainDefinitionSeedInstaller } from './installers/bootstrap/chain-definition-seed.installer';
import { PermissionSeedInstaller } from './installers/security/permission-seed.installer';
import { AiGovernanceBootstrapInstaller } from './installers/security/ai-governance-bootstrap.installer';
import { QiyasSeedInstaller } from './installers/content/qiyas.installer';
import { WorkflowPackInstaller } from './installers/content/workflow-pack.installer';
import { DashboardPackInstaller } from './installers/content/dashboard-pack.installer';
import { ModuleRegistrySeedInstaller } from './installers/bootstrap/module-registry.installer';

export class PackInstallerRegistry {
  getInstallers(): SeedInstaller[] {
    return [
      // 1. Core infrastructure
      new SharedBaseInstaller(),
      // 2. Organization structure & ownership
      new OrgStructureSeedInstaller(),
      // 3. Actor registration (§15 Step 3: create actor record for tenant owner)
      new ActorRegistrationInstaller(),
      // 4. Sector → framework bindings
      new SectorFrameworkBindingInstaller(),
      // 5. Module registry (from master product_modules)
      new ModuleRegistrySeedInstaller(),
      // 6. Permissions (from product RBAC definition)
      new PermissionSeedInstaller(),
      // 7. Navigation items (from module_pages)
      new NavigationSeedInstaller(),
      // 8. Role packs (seeds role definitions)
      new RolePackInstaller(),
      // 9. Owner access profile assignment (§15 Step 7)
      new OwnerAccessProfileInstaller(),
      // 10. Owner functional role assignment (§15 Step 8)
      new OwnerRoleAssignmentInstaller(),
      // 11. Owner product entitlement (§15 Step 9)
      new OwnerEntitlementInstaller(),
      // 12. Dashboard layouts
      new DashboardPackInstaller(),
      // 13. Workflow templates
      new WorkflowPackInstaller(),
      // 14. AGRC product seed
      new AgrcSeedInstaller(),
      // 15. Qiyas product seed
      new QiyasSeedInstaller(),
      // 16. AI Governance bootstrap
      new AiGovernanceBootstrapInstaller(),
      new RaciSeedInstaller(),
      new ChainDefinitionSeedInstaller(),
      new TenantIntegrityCheckInstaller(),
      // 19. Quality Gate seed (gate definitions + default thresholds)
      new QualityGateSeedInstaller(),
      // 20. A++ Certification bootstrap & event wiring (must run after all seeds)
      certificationBootstrapInstaller,
      // 21. Access snapshot emission (§15 Step 10: emit initial access snapshot + tenant.bootstrapped event)
      new AccessSnapshotInstaller(),
    ];
  }
}
