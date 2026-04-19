import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-pillars-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, PageHeaderComponent],
  template: `
    <dos-page-header title="Platform Operations — NOC + SOC"
                     subtitle="Live operator console across DNOC, DSOC, DAuth and DOS pillars" />
    <nav class="pillar-tabs">
      <a routerLink="overview" routerLinkActive="active"><i class="pi pi-th-large"></i> Overview</a>
      <a routerLink="dnoc" routerLinkActive="active"><i class="pi pi-wave-pulse"></i> DNOC</a>
      <a routerLink="dsoc" routerLinkActive="active"><i class="pi pi-shield"></i> DSOC</a>
      <a routerLink="dauth" routerLinkActive="active"><i class="pi pi-key"></i> DAuth</a>
      <a routerLink="dos" routerLinkActive="active"><i class="pi pi-server"></i> DOS</a>
    </nav>
    <div class="pillar-body">
      <router-outlet />
    </div>
  `,
  styles: [`
    .pillar-tabs { display: flex; gap: 4px; border-bottom: 1px solid #e2e8f0; margin: 12px 0 16px; }
    .pillar-tabs a {
      padding: 10px 18px; text-decoration: none; color: #475569; font-weight: 500;
      border-bottom: 2px solid transparent; display: inline-flex; align-items: center; gap: 6px;
    }
    .pillar-tabs a:hover { color: #0f172a; }
    .pillar-tabs a.active { color: #0ea5e9; border-bottom-color: #0ea5e9; }
    .pillar-body { padding-top: 4px; }
  `],
})
export class PillarsShellComponent {}
