import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { workspaceStyles } from './workspace.styles';

@Component({
  selector: 'dgn-workspace',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  styles: [workspaceStyles],
  template: `
    <div class="ws-shell">
      <aside class="ws-side">
        <div class="brand">Dogan <small>AI OS</small></div>
        <div class="pillar-label">Overview</div>
        <a routerLink="/workspace/overview" routerLinkActive="active">Operator overview</a>
        <a routerLink="/workspace/readiness" routerLinkActive="active">Readiness &amp; metrics</a>
        <a routerLink="/workspace/capabilities" routerLinkActive="active">Kernel capabilities</a>
        <div class="pillar-label">DAuth · Identity</div>
        <a routerLink="/workspace/tenants" routerLinkActive="active">Tenants</a>
        <a routerLink="/workspace/users" routerLinkActive="active">Users</a>
        <a routerLink="/workspace/roles" routerLinkActive="active">Roles &amp; SoD preflight</a>
        <a routerLink="/workspace/sessions" routerLinkActive="active">Sessions</a>
        <a routerLink="/workspace/api-keys" routerLinkActive="active">API keys</a>
        <a routerLink="/workspace/abac" routerLinkActive="active">ABAC policies</a>
        <a routerLink="/workspace/sod" routerLinkActive="active">SoD rules</a>
        <div class="pillar-label">DOS · Config Center</div>
        <a routerLink="/workspace/tier-limits" routerLinkActive="active">Tier limits</a>
        <a routerLink="/workspace/config-kv" routerLinkActive="active">Config KV</a>
        <a routerLink="/workspace/feature-flags" routerLinkActive="active">Feature flags</a>
        <a routerLink="/workspace/inventory" routerLinkActive="active">Inventory</a>
        <div class="pillar-label">DSOC · Security</div>
        <a routerLink="/workspace/alerts" routerLinkActive="active">Security alerts</a>
        <a routerLink="/workspace/audit" routerLinkActive="active">Audit log</a>
        <a routerLink="/workspace/retention" routerLinkActive="active">Retention sweep</a>
        <div class="footer">
          DAuth-issued session<br/>
          Pillars: DAuth · DOS · DSOC · DNOC
        </div>
      </aside>
      <main class="ws-main">
        <div class="ws-topbar">
          <div class="who">
            <strong>{{ session()?.email ?? '(unknown)' }}</strong>
            <span> · tid </span>
            <code>{{ session()?.tenantId ?? '(none)' }}</code>
            <span> · roles </span>
            <code>{{ (session()?.roles ?? []).join(',') || '(none)' }}</code>
          </div>
          <button type="button" (click)="logout()">Sign out</button>
        </div>
        <div class="ws-content">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class WorkspaceComponent {
  private readonly auth = inject(AuthService);
  readonly session = this.auth.session;
  logout(): void { void this.auth.logout(); }
}
