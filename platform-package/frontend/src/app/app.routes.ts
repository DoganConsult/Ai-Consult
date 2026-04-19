import { Routes } from '@angular/router';
import { authGuard } from './core/dauth/guards/auth.guard';
import { requirePermission } from './core/dauth/guards/require-permission.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/platform-shell.component').then(m => m.PlatformShellComponent),
    children: [
      {
        path: 'overview',
        loadComponent: () => import('./pages/overview/platform-overview.component').then(m => m.PlatformOverviewComponent),
      },
      {
        path: 'tenants',
        canActivate: [requirePermission],
        data: { requires: ['platform.tenant.create', 'platform.tenant.suspend', 'platform.workspace.create'] },
        loadComponent: () => import('./pages/tenants/tenant-management.component').then(m => m.TenantManagementComponent),
      },
      {
        path: 'identity',
        canActivate: [requirePermission],
        data: { requires: ['platform.user.invite', 'platform.role.assign', 'platform.permission.assign'] },
        loadComponent: () => import('./pages/identity/identity-access.component').then(m => m.IdentityAccessComponent),
      },
      {
        path: 'modules',
        canActivate: [requirePermission],
        data: { requires: ['platform.module.enable', 'platform.module.disable'] },
        loadComponent: () => import('./pages/modules/module-registry.component').then(m => m.ModuleRegistryComponent),
      },
      {
        path: 'settings',
        canActivate: [requirePermission],
        data: { requires: ['platform.config.write'] },
        loadComponent: () => import('./pages/settings/platform-settings.component').then(m => m.PlatformSettingsComponent),
      },
      {
        path: 'workflows',
        loadComponent: () => import('./pages/workflows/workflow-lifecycle.component').then(m => m.WorkflowLifecycleComponent),
      },
      {
        path: 'audit',
        canActivate: [requirePermission],
        data: { requires: ['platform.audit.read'] },
        loadComponent: () => import('./pages/audit/audit-events.component').then(m => m.AuditEventsComponent),
      },
      {
        path: 'integrations',
        loadComponent: () => import('./pages/integrations/integrations-infra.component').then(m => m.IntegrationsInfraComponent),
      },
      {
        path: 'ai-governance',
        canActivate: [requirePermission],
        data: { requires: ['platform.ai.govern'] },
        loadComponent: () => import('./pages/ai-governance/ai-governance.component').then(m => m.AiGovernanceComponent),
      },
      {
        path: 'diagnostics',
        canActivate: [requirePermission],
        data: { requires: ['platform.observability.read'] },
        loadComponent: () => import('./pages/diagnostics/support-diagnostics.component').then(m => m.SupportDiagnosticsComponent),
      },
      {
        path: 'pillars',
        canActivate: [requirePermission],
        data: { requires: ['platform.observability.read'] },
        loadChildren: () => import('./pages/pillars/pillars.routes').then(m => m.routes),
      },
      {
        path: 'products',
        canActivate: [requirePermission],
        data: { requires: ['platform.product.enable', 'platform.product.disable'] },
        loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsComponent),
      },
      {
        path: 'feature-flags',
        canActivate: [requirePermission],
        data: { requires: ['platform.feature.toggle'] },
        loadComponent: () => import('./pages/feature-flags/feature-flags.component').then(m => m.FeatureFlagsComponent),
      },
      {
        path: 'sod',
        canActivate: [requirePermission],
        data: { requires: ['platform.sod.manage'] },
        loadComponent: () => import('./pages/sod/sod-rules.component').then(m => m.SodRulesComponent),
      },
      {
        path: 'delegations',
        canActivate: [requirePermission],
        data: { requires: ['platform.delegation.create'] },
        loadComponent: () => import('./pages/delegations/delegations.component').then(m => m.DelegationsComponent),
      },
      {
        path: 'governance',
        canActivate: [requirePermission],
        data: { requires: ['platform.config.read', 'platform.permission.assign'] },
        loadComponent: () => import('./pages/governance/governance-matrix.component').then(m => m.GovernanceMatrixComponent),
      },
      {
        path: 'activations',
        canActivate: [requirePermission],
        data: { requires: ['platform.tenant.create', 'platform.product.enable'] },
        loadComponent: () => import('./pages/activations/tenant-activations.component').then(m => m.TenantActivationsComponent),
      },
      {
        path: 'config-center',
        canActivate: [requirePermission],
        data: { requires: ['platform.config.read', 'platform.config.write'] },
        loadComponent: () => import('./pages/config-center/config-center.component').then(m => m.ConfigCenterComponent),
      },
      {
        path: 'ai-registries',
        canActivate: [requirePermission],
        data: { requires: ['platform.ai.govern'] },
        loadComponent: () => import('./pages/ai-registries/ai-registries.component').then(m => m.AiRegistriesComponent),
      },
      {
        path: 'p/:code',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/_dynamic/dynamic-page.component').then(m => m.DynamicPageComponent),
      },
      {
        path: 'page-catalog',
        canActivate: [requirePermission],
        data: { requires: ['platform.config.write', 'platform.schema.manage'] },
        loadComponent: () => import('./pages/page-catalog/page-catalog.component').then(m => m.PageCatalogComponent),
      },
      {
        path: 'api-builder',
        canActivate: [requirePermission],
        data: { requires: ['platform.config.write', 'platform.schema.manage'] },
        loadComponent: () => import('./pages/api-builder/api-builder.component').then(m => m.ApiBuilderComponent),
      },
      {
        path: 'module-builder',
        canActivate: [requirePermission],
        data: { requires: ['platform.config.write', 'platform.schema.manage'] },
        loadComponent: () => import('./pages/module-builder/module-builder.component').then(m => m.ModuleBuilderComponent),
      },
      {
        path: 'schema-designer',
        canActivate: [requirePermission],
        data: { requires: ['platform.schema.manage'] },
        loadComponent: () => import('./pages/schema-designer/schema-designer.component').then(m => m.SchemaDesignerComponent),
      },
      {
        path: 'ai-graphs',
        canActivate: [requirePermission],
        data: { requires: ['platform.ai.govern'] },
        loadComponent: () => import('./pages/ai-graphs/ai-graphs.component').then(m => m.AiGraphsComponent),
      },
      {
        path: 'plugins',
        canActivate: [requirePermission],
        data: { requires: ['platform.schema.manage'] },
        loadComponent: () => import('./pages/plugins/plugins.component').then(m => m.PluginsComponent),
      },
      {
        path: 'approvals',
        canActivate: [requirePermission],
        data: { requires: ['platform.audit.read', 'platform.permission.assign'] },
        loadComponent: () => import('./pages/approvals/approvals.component').then(m => m.ApprovalsComponent),
      },
      {
        path: 'workflow-designer',
        canActivate: [requirePermission],
        data: { requires: ['platform.config.write', 'platform.schema.manage'] },
        loadComponent: () => import('./pages/workflow-designer/workflow-designer.component').then(m => m.WorkflowDesignerComponent),
      },
      {
        path: 'erp',
        loadComponent: () => import('./pages/erp/erp-shell.component').then(m => m.ErpShellComponent),
        children: [
          {
            path: 'sales',
            loadComponent: () => import('./pages/erp/sales/sales-pipeline.component').then(m => m.SalesPipelineComponent),
          },
          {
            path: 'finance',
            loadComponent: () => import('./pages/erp/finance/finance-dashboard.component').then(m => m.FinanceDashboardComponent),
          },
          {
            path: 'hr',
            loadComponent: () => import('./pages/erp/hr/hr-dashboard.component').then(m => m.HrDashboardComponent),
          },
          {
            path: 'marketing',
            loadComponent: () => import('./pages/erp/marketing/marketing-dashboard.component').then(m => m.MarketingDashboardComponent),
          },
          {
            path: 'procurement',
            loadComponent: () => import('./pages/erp/procurement/procurement-dashboard.component').then(m => m.ProcurementDashboardComponent),
          },
          { path: '', redirectTo: 'sales', pathMatch: 'full' }
        ]
      },
      { path: 'dashboard', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'health', redirectTo: 'diagnostics', pathMatch: 'full' },
      { path: 'users', redirectTo: 'identity', pathMatch: 'full' },
    ],
  },
  {
    path: '404',
    loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent),
  },
];
