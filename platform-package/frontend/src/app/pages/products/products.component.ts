import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { HasPermissionDirective } from '../../core/dauth/directives/has-permission.directive';
import { PlatformAdminService, ProductRow } from '../../core/dos/services/platform-admin.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-products',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, ButtonModule, ToastModule, PageHeaderComponent, HasPermissionDirective],
  providers: [MessageService],
  template: `
    <dos-page-header title="Products" subtitle="Enable or disable products in the platform registry" />
    <p-toast />
    <div class="toolbar">
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="load()" [outlined]="true" size="small" />
    </div>
    <p-table [value]="products()" [rows]="30" [paginator]="products().length > 30" styleClass="p-datatable-sm p-datatable-striped">
      <ng-template #header>
        <tr><th>Code</th><th>Name</th><th style="width:120px">Status</th><th style="width:200px">Actions</th></tr>
      </ng-template>
      <ng-template #body let-p>
        <tr>
          <td class="mono fw-600">{{ p.code }}</td>
          <td>{{ p.name || p.code }}</td>
          <td><p-tag [value]="p.status || 'unknown'" [severity]="p.status === 'enabled' ? 'success' : 'secondary'" /></td>
          <td>
            @if (p.status !== 'enabled') {
              <p-button *dosHasPermission="'platform.product.enable'" label="Enable" icon="pi pi-check" (onClick)="enable(p.code)" [text]="true" size="small" severity="success" />
            } @else {
              <p-button *dosHasPermission="'platform.product.disable'" label="Disable" icon="pi pi-times" (onClick)="disable(p.code)" [text]="true" size="small" severity="danger" />
            }
          </td>
        </tr>
      </ng-template>
      <ng-template #emptymessage><tr><td colspan="4" class="empty-msg">No products registered</td></tr></ng-template>
    </p-table>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin: 20px 0 12px; }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
    .muted { color: var(--dos-text-muted); font-size: 12px; font-style: italic; }
  `],
})
export class ProductsComponent implements OnInit {
  private svc = inject(PlatformAdminService);
  private msg = inject(MessageService);
  products = signal<ProductRow[]>([]);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.svc.getProducts().subscribe({ next: d => this.products.set(d), error: () => this.products.set([]) });
  }
  enable(code: string): void {
    this.svc.enableProduct(code).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: `${code} enabled` }); this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed' }),
    });
  }
  disable(code: string): void {
    this.svc.disableProduct(code).subscribe({
      next: () => { this.msg.add({ severity: 'warn', summary: `${code} disabled` }); this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed' }),
    });
  }
}
