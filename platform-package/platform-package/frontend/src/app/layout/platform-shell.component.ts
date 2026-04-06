import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { PlatformAuthService } from '../core/dauth/services/platform-auth.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-platform-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <nav class="sidebar" [class.collapsed]="sidebarCollapsed()">
        <div class="sidebar-header">
          <span class="logo">DOS</span>
          <button class="toggle-btn" (click)="toggleSidebar()" [attr.aria-label]="'Toggle sidebar'">
            <i class="pi" [ngClass]="sidebarCollapsed() ? 'pi-angle-right' : 'pi-angle-left'"></i>
          </button>
        </div>
        <ul class="nav-list">
          <li><a routerLink="/overview" routerLinkActive="active"><i class="pi pi-home"></i><span>Overview</span></a></li>
          <li><a routerLink="/tenants" routerLinkActive="active"><i class="pi pi-building"></i><span>Tenants & Workspaces</span></a></li>
          <li><a routerLink="/identity" routerLinkActive="active"><i class="pi pi-id-card"></i><span>Identity & Access</span></a></li>
          <li><a routerLink="/modules" routerLinkActive="active"><i class="pi pi-th-large"></i><span>Module Registry</span></a></li>
          <li><a routerLink="/settings" routerLinkActive="active"><i class="pi pi-cog"></i><span>Platform Settings</span></a></li>
          <li><a routerLink="/workflows" routerLinkActive="active"><i class="pi pi-sitemap"></i><span>Workflow & Lifecycle</span></a></li>
          <li><a routerLink="/audit" routerLinkActive="active"><i class="pi pi-list"></i><span>Audit & Events</span></a></li>
          <li><a routerLink="/integrations" routerLinkActive="active"><i class="pi pi-link"></i><span>Integrations</span></a></li>
          <li><a routerLink="/ai-governance" routerLinkActive="active"><i class="pi pi-microchip"></i><span>AI Governance</span></a></li>
          <li><a routerLink="/diagnostics" routerLinkActive="active"><i class="pi pi-wrench"></i><span>Diagnostics</span></a></li>
        </ul>
        <div class="sidebar-footer">
          <button class="logout-btn" (click)="auth.logout()"><i class="pi pi-sign-out"></i><span>Logout</span></button>
        </div>
      </nav>
      <main class="content" id="main-content" role="main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .shell { display: flex; height: 100vh; overflow: hidden; }
    .sidebar {
      width: var(--dos-sidebar-width, 260px);
      background: #1e293b;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      transition: width 0.2s ease;
      overflow: hidden;
    }
    .sidebar.collapsed { width: 56px; }
    .sidebar.collapsed span { display: none; }
    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .logo { font-size: 18px; font-weight: 800; letter-spacing: -0.02em; }
    .toggle-btn {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 16px;
      padding: 4px;
    }
    .nav-list {
      list-style: none;
      padding: 8px 0;
      flex: 1;
    }
    .nav-list a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      color: #cbd5e1;
      text-decoration: none;
      font-size: 14px;
      transition: background 0.15s;
    }
    .nav-list a:hover { background: rgba(255,255,255,0.06); }
    .nav-list a.active { background: rgba(59,130,246,0.15); color: #60a5fa; }
    .nav-list a i { font-size: 16px; width: 20px; text-align: center; }
    .sidebar-footer { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.08); }
    .logout-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 14px;
      padding: 8px 0;
      width: 100%;
    }
    .logout-btn:hover { color: #f87171; }
    .content { flex: 1; overflow-y: auto; padding: 24px 32px; }
    @media (max-width: 768px) {
      .sidebar { position: fixed; z-index: 100; height: 100vh; }
      .sidebar.collapsed { width: 0; }
      .content { padding: 16px; }
    }
  `],
})
export class PlatformShellComponent {
  auth = inject(PlatformAuthService);
  sidebarCollapsed = signal(false);

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }
}
