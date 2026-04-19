import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { HasPermissionDirective } from '../../core/dauth/directives/has-permission.directive';
import { PlatformAdminService, FeatureFlagRow } from '../../core/dos/services/platform-admin.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-feature-flags',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, TagModule, ButtonModule, ToastModule, SelectModule, PageHeaderComponent, HasPermissionDirective],
  providers: [MessageService],
  template: `
    <dos-page-header title="Feature Flags" subtitle="Toggle platform-, product-, and tenant-layer feature flags" />
    <p-toast />
    <div class="toolbar">
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="load()" [outlined]="true" size="small" />
    </div>
    <p-table [value]="flags()" [rows]="30" [paginator]="flags().length > 30" styleClass="p-datatable-sm p-datatable-striped">
      <ng-template #header>
        <tr><th>Flag Code</th><th style="width:160px">Owner Layer</th><th style="width:100px">Enabled</th><th style="width:140px">Actions</th></tr>
      </ng-template>
      <ng-template #body let-f>
        <tr>
          <td class="mono fw-600">{{ f.flag_code }}</td>
          <td><p-tag [value]="f.owner_layer || 'platform'" severity="info" /></td>
          <td><p-tag [value]="f.enabled ? 'ON' : 'OFF'" [severity]="f.enabled ? 'success' : 'secondary'" /></td>
          <td>
            <p-button *dosHasPermission="'platform.feature.toggle'" [label]="f.enabled ? 'Disable' : 'Enable'" [icon]="f.enabled ? 'pi pi-times' : 'pi pi-check'" (onClick)="toggle(f)" [text]="true" size="small" />
          </td>
        </tr>
      </ng-template>
      <ng-template #emptymessage><tr><td colspan="4" class="empty-msg">No feature flags defined</td></tr></ng-template>
    </p-table>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin: 20px 0 12px; }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
    .muted { color: var(--dos-text-muted); font-size: 12px; font-style: italic; }
  `],
})
export class FeatureFlagsComponent implements OnInit {
  private svc = inject(PlatformAdminService);
  private msg = inject(MessageService);
  flags = signal<FeatureFlagRow[]>([]);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.svc.getFeatureFlags().subscribe({ next: d => this.flags.set(d), error: () => this.flags.set([]) });
  }
  toggle(f: FeatureFlagRow): void {
    this.svc.updateFeatureFlag(f.flag_code, { enabled: !f.enabled }).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: `${f.flag_code} ${!f.enabled ? 'enabled' : 'disabled'}` }); this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed' }),
    });
  }
}
