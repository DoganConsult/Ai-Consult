import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pillars-shell.component').then((m) => m.PillarsShellComponent),
    children: [
      { path: '', redirectTo: 'dnoc', pathMatch: 'full' },
      {
        path: 'dnoc',
        loadComponent: () => import('./dnoc/dnoc.component').then((m) => m.DnocComponent),
      },
      {
        path: 'dsoc',
        loadComponent: () => import('./dsoc/dsoc.component').then((m) => m.DsocComponent),
      },
      {
        path: 'dauth',
        loadComponent: () => import('./dauth-ops/dauth-ops.component').then((m) => m.DauthOpsComponent),
      },
      {
        path: 'dos',
        loadComponent: () => import('./dos-ops/dos-ops.component').then((m) => m.DosOpsComponent),
      },
    ],
  },
];
