import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./landing/landing.component').then((m) => m.LandingComponent) },
  { path: 'auth/callback', loadComponent: () => import('./auth/callback.component').then((m) => m.CallbackComponent) },
  {
    path: 'workspace',
    canActivate: [authGuard],
    loadComponent: () => import('./workspace/workspace.component').then((m) => m.WorkspaceComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      { path: 'overview', loadComponent: () => import('./workspace/pages/overview.page').then((m) => m.OverviewPage) },

      { path: 'dauth', loadComponent: () => import('./workspace/pages/dauth-dashboard.page').then((m) => m.DauthDashboardPage) },
      { path: 'dauth/tenants', loadComponent: () => import('./workspace/pages/tenants.page').then((m) => m.TenantsPage) },
      { path: 'dauth/users', loadComponent: () => import('./workspace/pages/users.page').then((m) => m.UsersPage) },
      { path: 'dauth/roles', loadComponent: () => import('./workspace/pages/roles.page').then((m) => m.RolesPage) },
      { path: 'dauth/sessions', loadComponent: () => import('./workspace/pages/sessions.page').then((m) => m.SessionsPage) },
      { path: 'dauth/api-keys', loadComponent: () => import('./workspace/pages/api-keys.page').then((m) => m.ApiKeysPage) },
      { path: 'dauth/abac', loadComponent: () => import('./workspace/pages/abac.page').then((m) => m.AbacPage) },
      { path: 'dauth/sod', loadComponent: () => import('./workspace/pages/sod.page').then((m) => m.SodPage) },
      { path: 'dauth/tier-limits', loadComponent: () => import('./workspace/pages/tier-limits.page').then((m) => m.TierLimitsPage) },

      { path: 'dos', loadComponent: () => import('./workspace/pages/dos-dashboard.page').then((m) => m.DosDashboardPage) },
      { path: 'dos/config-kv', loadComponent: () => import('./workspace/pages/config-kv.page').then((m) => m.ConfigKvPage) },
      { path: 'dos/feature-flags', loadComponent: () => import('./workspace/pages/feature-flags.page').then((m) => m.FeatureFlagsPage) },
      { path: 'dos/inventory', loadComponent: () => import('./workspace/pages/inventory.page').then((m) => m.InventoryPage) },
      { path: 'dos/capabilities', loadComponent: () => import('./workspace/pages/capabilities.page').then((m) => m.CapabilitiesPage) },

      { path: 'dsoc', loadComponent: () => import('./workspace/pages/dsoc-dashboard.page').then((m) => m.DsocDashboardPage) },
      { path: 'dsoc/alerts', loadComponent: () => import('./workspace/pages/alerts.page').then((m) => m.AlertsPage) },
      { path: 'dsoc/audit', loadComponent: () => import('./workspace/pages/audit.page').then((m) => m.AuditPage) },
      { path: 'dsoc/retention', loadComponent: () => import('./workspace/pages/retention.page').then((m) => m.RetentionPage) },

      { path: 'dnoc', loadComponent: () => import('./workspace/pages/dnoc-dashboard.page').then((m) => m.DnocDashboardPage) },
      { path: 'dnoc/readiness', loadComponent: () => import('./workspace/pages/readiness.page').then((m) => m.ReadinessPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
