import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { PlatformAuthService } from '../core/dauth/services/platform-auth.service';
import { PermissionService } from '../core/dauth/services/permission.service';
import { DynamicMenuService, MenuItem } from '../core/dos/services/dynamic-menu.service';

interface MenuGroup { key: string; label: string; items: MenuItem[]; }

const SECTION_LABELS: Record<string, string> = {
  _primary: '',
  catalog: 'Catalog',
  governance: 'Governance',
  ai: 'AI',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-platform-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TagModule],
  template: `
    <div class="shell">
      <nav class="sidebar" [class.collapsed]="sidebarCollapsed()">
        <div class="sidebar-header">
          <span class="logo">DOS</span>
          <button class="toggle-btn" (click)="toggleSidebar()" [attr.aria-label]="'Toggle sidebar'">
            <i class="pi" [ngClass]="sidebarCollapsed() ? 'pi-angle-right' : 'pi-angle-left'"></i>
          </button>
        </div>

        @if (!sidebarCollapsed() && perm.isSuperAdmin()) {
          <div class="super-badge"><i class="pi pi-shield"></i> Super Admin</div>
        }

        <div class="nav-scroll">
          @for (group of grouped(); track group.key) {
            @if (!sidebarCollapsed() && group.key !== '_primary') {
              <div class="section-label">{{ group.label }}</div>
            }
            <ul class="nav-list">
              @for (item of group.items; track item.route) {
                <li>
                  <a [routerLink]="item.route" routerLinkActive="active" [attr.title]="item.label">
                    <i class="pi" [ngClass]="item.icon"></i><span>{{ item.label }}</span>
                  </a>
                </li>
              }
            </ul>
          }
          @if (grouped().length === 0) {
            <div class="empty-nav">No accessible surfaces</div>
          }
        </div>

        <div class="sidebar-footer">
          <button class="footer-btn" (click)="refresh()" [disabled]="refreshing()" title="Reload permissions">
            <i class="pi" [ngClass]="refreshing() ? 'pi-spin pi-spinner' : 'pi-refresh'"></i><span>Refresh</span>
          </button>
          <button class="footer-btn danger" (click)="auth.logout()"><i class="pi pi-sign-out"></i><span>Logout</span></button>
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
    .sidebar.collapsed .section-label, .sidebar.collapsed .super-badge { display: none; }
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
    .super-badge {
      margin: 10px 16px 0;
      padding: 4px 10px;
      background: linear-gradient(90deg, #7c3aed, #3b82f6);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      width: fit-content;
    }
    .nav-scroll { flex: 1; overflow-y: auto; padding: 8px 0; }
    .section-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748b;
      padding: 14px 16px 4px;
    }
    .nav-list { list-style: none; padding: 0; margin: 0; }
    .nav-list a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 16px;
      color: #cbd5e1;
      text-decoration: none;
      font-size: 13.5px;
      transition: background 0.15s;
    }
    .nav-list a:hover { background: rgba(255,255,255,0.06); }
    .nav-list a.active { background: rgba(59,130,246,0.15); color: #60a5fa; box-shadow: inset 3px 0 0 #60a5fa; }
    .nav-list a i { font-size: 15px; width: 20px; text-align: center; }
    .empty-nav { color: #64748b; padding: 24px 16px; font-size: 12px; font-style: italic; }
    .sidebar-footer { padding: 10px 12px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 4px; }
    .footer-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 13px;
      padding: 8px 6px;
      width: 100%;
      cursor: pointer;
      border-radius: 6px;
    }
    .footer-btn:hover { background: rgba(255,255,255,0.06); color: #f8fafc; }
    .footer-btn.danger:hover { color: #f87171; }
    .footer-btn:disabled { opacity: 0.5; cursor: not-allowed; }
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
  perm = inject(PermissionService);
  menu = inject(DynamicMenuService);
  sidebarCollapsed = signal(false);
  refreshing = signal(false);

  grouped = computed<MenuGroup[]>(() => {
    const items = this.menu.visible();
    const order = ['_primary', 'catalog', 'governance', 'ai', 'lowcode'];
    const buckets = new Map<string, MenuItem[]>();
    for (const it of items) {
      const k = it.section ?? '_primary';
      const arr = buckets.get(k) ?? [];
      arr.push(it);
      buckets.set(k, arr);
    }
    const groups: MenuGroup[] = [];
    for (const k of order) {
      const arr = buckets.get(k);
      if (arr?.length) groups.push({ key: k, label: SECTION_LABELS[k] ?? k, items: arr });
    }
    for (const [k, arr] of buckets) {
      if (!order.includes(k)) groups.push({ key: k, label: SECTION_LABELS[k] ?? k, items: arr });
    }
    return groups;
  });

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  async refresh(): Promise<void> {
    this.refreshing.set(true);
    try { await this.perm.refresh(); } finally { this.refreshing.set(false); }
  }
}
