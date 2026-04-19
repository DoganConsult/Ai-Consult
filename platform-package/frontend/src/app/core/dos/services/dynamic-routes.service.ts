import { Injectable, inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { requirePermission } from '../../dauth/guards/require-permission.guard';
import { LowcodeService, PageSpec } from './lowcode.service';
import { DynamicMenuService } from './dynamic-menu.service';

/**
 * Loads published page specs from the backend and registers them as
 * Angular routes + menu items at runtime. Called once after login so that
 * admin-authored pages appear without any rebuild.
 */
@Injectable({ providedIn: 'root' })
export class DynamicRoutesService {
  private router = inject(Router);
  private svc = inject(LowcodeService);
  private menu = inject(DynamicMenuService);

  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const pages = await firstValueFrom(this.svc.listPublishedPages());
      if (!Array.isArray(pages) || pages.length === 0) { this.loaded = true; return; }

      const dynamicRoutes: Routes = pages.map((p: PageSpec) => ({
        path: this.normalizePath(p.route),
        canActivate: [requirePermission],
        data: { requires: p.requires ?? [], pageSpec: p },
        loadComponent: () =>
          import('../../../pages/_dynamic/dynamic-page.component').then((m) => m.DynamicPageComponent),
      }));

      // Inject the dynamic routes as children of the authenticated shell route ('')
      // which is the second top-level entry (index 1) in app.routes.
      const cfg = this.router.config.slice();
      const shellIdx = cfg.findIndex((r) => r.path === '' && Array.isArray(r.children));
      if (shellIdx >= 0) {
        const shell = { ...cfg[shellIdx], children: [...(cfg[shellIdx].children ?? [])] };
        // Remove any previously injected dynamic routes to allow hot-reload.
        shell.children = shell.children.filter((r) => !(r.data as any)?.__dynamic);
        for (const r of dynamicRoutes) {
          shell.children.unshift({ ...r, data: { ...(r.data ?? {}), __dynamic: true } });
        }
        cfg[shellIdx] = shell;
        this.router.resetConfig(cfg);
      }

      // Register menu items.
      for (const p of pages) {
        this.menu.register({
          route: '/' + this.normalizePath(p.route),
          icon: p.icon || 'pi pi-file',
          label: p.title,
          requires: p.requires ?? [],
          section: p.section || undefined,
        });
      }
      this.loaded = true;
    } catch {
      this.loaded = true; // fail open — don't block the shell
    }
  }

  private normalizePath(route: string): string {
    return route.startsWith('/') ? route.slice(1) : route;
  }
}
