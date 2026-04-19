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
      { path: 'readiness', loadComponent: () => import('./workspace/pages/readiness.page').then((m) => m.ReadinessPage) },
      { path: 'capabilities', loadComponent: () => import('./workspace/pages/capabilities.page').then((m) => m.CapabilitiesPage) },
      { path: 'tenants', loadComponent: () => import('./workspace/pages/tenants.page').then((m) => m.TenantsPage) },
      { path: 'users', loadComponent: () => import('./workspace/pages/users.page').then((m) => m.UsersPage) },
      { path: 'roles', loadComponent: () => import('./workspace/pages/roles.page').then((m) => m.RolesPage) },
      { path: 'sessions', loadComponent: () => import('./workspace/pages/sessions.page').then((m) => m.SessionsPage) },
      { path: 'api-keys', loadComponent: () => import('./workspace/pages/api-keys.page').then((m) => m.ApiKeysPage) },
      { path: 'abac', loadComponent: () => import('./workspace/pages/abac.page').then((m) => m.AbacPage) },
      { path: 'sod', loadComponent: () => import('./workspace/pages/sod.page').then((m) => m.SodPage) },
      { path: 'tier-limits', loadComponent: () => import('./workspace/pages/tier-limits.page').then((m) => m.TierLimitsPage) },
      { path: 'config-kv', loadComponent: () => import('./workspace/pages/config-kv.page').then((m) => m.ConfigKvPage) },
      { path: 'feature-flags', loadComponent: () => import('./workspace/pages/feature-flags.page').then((m) => m.FeatureFlagsPage) },
      { path: 'inventory', loadComponent: () => import('./workspace/pages/inventory.page').then((m) => m.InventoryPage) },
      { path: 'alerts', loadComponent: () => import('./workspace/pages/alerts.page').then((m) => m.AlertsPage) },
      { path: 'audit', loadComponent: () => import('./workspace/pages/audit.page').then((m) => m.AuditPage) },
      { path: 'retention', loadComponent: () => import('./workspace/pages/retention.page').then((m) => m.RetentionPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
