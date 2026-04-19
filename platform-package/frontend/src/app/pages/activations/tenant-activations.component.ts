import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PlatformAdminService } from '../../core/dos/services/platform-admin.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-tenant-activations',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, ButtonModule, PageHeaderComponent],
  template: `
    <dos-page-header title="Tenant Activations" subtitle="Per-tenant product activation status" />
    <div class="toolbar">
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="load()" [outlined]="true" size="small" />
    </div>
    <p-table [value]="rows()" [rows]="50" [paginator]="rows().length > 50" styleClass="p-datatable-sm p-datatable-striped">
      <ng-template #header>
        <tr><th>Tenant</th><th>Product</th><th style="width:120px">Status</th><th style="width:160px">Activated</th><th>Release Channel</th></tr>
      </ng-template>
      <ng-template #body let-r>
        <tr>
          <td class="mono">{{ r.tenant_id }}</td>
          <td class="mono fw-600">{{ r.product_code }}</td>
          <td><p-tag [value]="r.status || 'unknown'" [severity]="r.status === 'active' ? 'success' : 'secondary'" /></td>
          <td class="mono small">{{ r.activated_at ? (r.activated_at | date:'short') : '--' }}</td>
          <td class="mono">{{ r.release_channel || 'stable' }}</td>
        </tr>
      </ng-template>
      <ng-template #emptymessage><tr><td colspan="5" class="empty-msg">No tenant activations</td></tr></ng-template>
    </p-table>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin: 20px 0 12px; }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; } .small { font-size: 12px; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
  `],
})
export class TenantActivationsComponent implements OnInit {
  private svc = inject(PlatformAdminService);
  rows = signal<any[]>([]);
  ngOnInit(): void { this.load(); }
  load(): void { this.svc.getTenantActivations().subscribe({ next: d => this.rows.set(d), error: () => this.rows.set([]) }); }
}
