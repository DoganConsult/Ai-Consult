import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PlatformAdminService, ProductRow, ModuleRow, FeatureFlagRow } from '../../core/dos/services/platform-admin.service';
import { SettingsService } from '../../core/dos/services/settings.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-module-registry',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, ButtonModule, TabsModule, ToastModule, PageHeaderComponent],
  providers: [MessageService],
  template: `
    <dos-page-header title="Module Registry" subtitle="Product registry, module enablement, feature flags, and entitlements — governance per ownership layer" />
    <p-toast />

    <div class="toolbar">
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="load()" [outlined]="true" size="small" />
    </div>

    <p-tabs>
      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-box"></i> Products</span></ng-template>
        <div class="sub-info-bar">Product-level controls — what products are registered and enabled in the platform</div>
        <p-table [value]="products()" [rows]="20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template #header><tr><th>Code</th><th>Name</th><th style="width:120px">Status</th><th style="width:160px">Actions</th></tr></ng-template>
          <ng-template #body let-p>
            <tr>
              <td class="mono fw-600">{{ p.code }}</td>
              <td>{{ p.name || p.code }}</td>
              <td><p-tag [value]="p.status || 'unknown'" [severity]="p.status === 'enabled' ? 'success' : 'secondary'" /></td>
              <td>
                @if (p.status !== 'enabled') {
                  <p-button label="Enable" icon="pi pi-check" (onClick)="enableProduct(p.code)" [text]="true" size="small" severity="success" />
                } @else {
                  <p-button label="Disable" icon="pi pi-times" (onClick)="disableProduct(p.code)" [text]="true" size="small" severity="danger" />
                }
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="4" class="empty-msg">No products in registry</td></tr></ng-template>
        </p-table>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-th-large"></i> Modules</span></ng-template>
        <div class="sub-info-bar">Module-level controls — individual domain modules within products</div>
        <p-table [value]="modules()" [rows]="30" [paginator]="modules().length > 30" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template #header><tr><th>Code</th><th>Name</th><th style="width:120px">Status</th><th style="width:160px">Actions</th></tr></ng-template>
          <ng-template #body let-m>
            <tr>
              <td class="mono fw-600">{{ m.code }}</td>
              <td>{{ m.name || m.code }}</td>
              <td><p-tag [value]="m.status || 'unknown'" [severity]="m.status === 'enabled' ? 'success' : 'secondary'" /></td>
              <td>
                @if (m.status !== 'enabled') {
                  <p-button label="Enable" icon="pi pi-check" (onClick)="enableModule(m.code)" [text]="true" size="small" severity="success" />
                } @else {
                  <p-button label="Disable" icon="pi pi-times" (onClick)="disableModule(m.code)" [text]="true" size="small" severity="danger" />
                }
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="4" class="empty-msg">No modules in registry</td></tr></ng-template>
        </p-table>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-flag"></i> Feature Flags</span></ng-template>
        <div class="sub-info-bar">Feature-level controls — flags must sit in their correct ownership layer (platform/product/tenant)</div>
        <p-table [value]="flags()" [rows]="30" [paginator]="flags().length > 30" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template #header><tr><th>Flag Code</th><th style="width:120px">Owner Layer</th><th style="width:100px">Enabled</th><th style="width:120px">Actions</th></tr></ng-template>
          <ng-template #body let-f>
            <tr>
              <td class="mono fw-600">{{ f.flag_code }}</td>
              <td><p-tag [value]="f.owner_layer || 'platform'" severity="info" /></td>
              <td><p-tag [value]="f.enabled ? 'ON' : 'OFF'" [severity]="f.enabled ? 'success' : 'secondary'" /></td>
              <td>
                <p-button [label]="f.enabled ? 'Disable' : 'Enable'" [icon]="f.enabled ? 'pi pi-times' : 'pi pi-check'" (onClick)="toggleFlag(f)" [text]="true" size="small" />
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="4" class="empty-msg">No feature flags defined</td></tr></ng-template>
        </p-table>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-lock"></i> Permissions</span></ng-template>
        @if (contract()) {
          <div class="perm-count">{{ contract()!.permissions.length }} permissions registered in access contract</div>
          <div class="perm-grid">
            @for (p of contract()!.permissions; track p) {
              <span class="perm-code">{{ p }}</span>
            }
          </div>
        } @else {
          <div class="empty-msg">Loading...</div>
        }
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-directions"></i> Nav Contract</span></ng-template>
        @if (navContract()) {
          <pre class="json-block">{{ navContract() | json }}</pre>
        } @else {
          <div class="empty-msg">Loading nav contract...</div>
        }
      </p-tabpanel>
    </p-tabs>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin: 20px 0 0; }
    .sub-info-bar { font-size: 12px; color: var(--dos-text-muted); font-style: italic; margin-bottom: 12px; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid var(--dos-border); }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
    .perm-count { font-size: 13px; font-weight: 600; margin-bottom: 12px; }
    .perm-grid { display: flex; flex-wrap: wrap; gap: 4px; max-height: 400px; overflow-y: auto; }
    .perm-code { font-family: monospace; font-size: 11px; background: var(--dos-bg); padding: 2px 6px; border-radius: 3px; }
    .json-block { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; font-size: 12px; max-height: 400px; overflow: auto; white-space: pre-wrap; }
  `],
})
export class ModuleRegistryComponent implements OnInit {
  private adminSvc = inject(PlatformAdminService);
  private settingsSvc = inject(SettingsService);
  private msgSvc = inject(MessageService);

  products = signal<ProductRow[]>([]);
  modules = signal<ModuleRow[]>([]);
  flags = signal<FeatureFlagRow[]>([]);
  contract = signal<any>(null);
  navContract = signal<any>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.adminSvc.getProducts().subscribe({ next: d => this.products.set(d), error: () => this.products.set([]) });
    this.adminSvc.getModules().subscribe({ next: d => this.modules.set(d), error: () => this.modules.set([]) });
    this.adminSvc.getFeatureFlags().subscribe({ next: d => this.flags.set(d), error: () => this.flags.set([]) });
    this.settingsSvc.getAccessContract().subscribe({ next: d => this.contract.set(d), error: () => {} });
    this.settingsSvc.getNavContract().subscribe({ next: d => this.navContract.set(d), error: () => {} });
  }

  enableProduct(code: string): void { this.adminSvc.enableProduct(code).subscribe({ next: () => { this.msgSvc.add({ severity: 'success', summary: `${code} enabled` }); this.load(); }, error: () => this.msgSvc.add({ severity: 'error', summary: 'Failed' }) }); }
  disableProduct(code: string): void { this.adminSvc.disableProduct(code).subscribe({ next: () => { this.msgSvc.add({ severity: 'warn', summary: `${code} disabled` }); this.load(); }, error: () => this.msgSvc.add({ severity: 'error', summary: 'Failed' }) }); }
  enableModule(code: string): void { this.adminSvc.enableModule(code).subscribe({ next: () => { this.msgSvc.add({ severity: 'success', summary: `${code} enabled` }); this.load(); }, error: () => this.msgSvc.add({ severity: 'error', summary: 'Failed' }) }); }
  disableModule(code: string): void { this.adminSvc.disableModule(code).subscribe({ next: () => { this.msgSvc.add({ severity: 'warn', summary: `${code} disabled` }); this.load(); }, error: () => this.msgSvc.add({ severity: 'error', summary: 'Failed' }) }); }
  toggleFlag(f: FeatureFlagRow): void { this.adminSvc.updateFeatureFlag(f.flag_code, { enabled: !f.enabled }).subscribe({ next: () => { this.msgSvc.add({ severity: 'success', summary: `${f.flag_code} ${!f.enabled ? 'enabled' : 'disabled'}` }); this.load(); }, error: () => this.msgSvc.add({ severity: 'error', summary: 'Failed' }) }); }
}
