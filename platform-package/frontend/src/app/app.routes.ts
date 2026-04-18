import { Routes } from '@angular/router';
import { authGuard } from './core/dauth/guards/auth.guard';

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
        loadComponent: () => import('./pages/tenants/tenant-management.component').then(m => m.TenantManagementComponent),
      },
      {
        path: 'identity',
        loadComponent: () => import('./pages/identity/identity-access.component').then(m => m.IdentityAccessComponent),
      },
      {
        path: 'modules',
        loadComponent: () => import('./pages/modules/module-registry.component').then(m => m.ModuleRegistryComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/platform-settings.component').then(m => m.PlatformSettingsComponent),
      },
      {
        path: 'workflows',
        loadComponent: () => import('./pages/workflows/workflow-lifecycle.component').then(m => m.WorkflowLifecycleComponent),
      },
      {
        path: 'audit',
        loadComponent: () => import('./pages/audit/audit-events.component').then(m => m.AuditEventsComponent),
      },
      {
        path: 'integrations',
        loadComponent: () => import('./pages/integrations/integrations-infra.component').then(m => m.IntegrationsInfraComponent),
      },
      {
        path: 'ai-governance',
        loadComponent: () => import('./pages/ai-governance/ai-governance.component').then(m => m.AiGovernanceComponent),
      },
      {
        path: 'diagnostics',
        loadComponent: () => import('./pages/diagnostics/support-diagnostics.component').then(m => m.SupportDiagnosticsComponent),
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
