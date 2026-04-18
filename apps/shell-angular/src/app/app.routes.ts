import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./landing/landing.component').then((m) => m.LandingComponent) },
  { path: 'auth/callback', loadComponent: () => import('./auth/callback.component').then((m) => m.CallbackComponent) },
  {
    path: 'workspace',
    canActivate: [authGuard],
    loadComponent: () => import('./workspace/workspace.component').then((m) => m.WorkspaceComponent),
  },
  { path: '**', redirectTo: '' },
];
