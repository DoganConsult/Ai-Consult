import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { PillarsService } from '../../../core/pillars/pillars.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-pillars-dos',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, ButtonModule, TabsModule],
  template: `
    <div class="top-row">
      <div class="stat"><span class="lbl">Tenants</span><strong>{{ overview()?.tenants?.total ?? 0 }}</strong></div>
      <div class="stat"><span class="lbl">Active</span><strong class="ok">{{ overview()?.tenants?.active ?? 0 }}</strong></div>
      <div class="stat"><span class="lbl">Suspended</span><strong class="warn">{{ overview()?.tenants?.suspended ?? 0 }}</strong></div>
      <div class="stat"><span class="lbl">Audit partitions</span><strong>{{ overview()?.auditPartitions ?? 0 }}</strong></div>
      <div class="stat"><span class="lbl">RLS policies</span><strong>{{ overview()?.rlsPolicies ?? 0 }}</strong></div>
      <div class="stat"><span class="lbl">DB connections</span><strong>{{ runtime()?.db?.connections ?? 0 }}</strong></div>
      <div class="stat"><span class="lbl">Node heap</span><strong>{{ runtime()?.node?.memoryMb?.heap ?? 0 }}MB</strong></div>
      <p-button label="Refresh" icon="pi pi-refresh" size="small" [outlined]="true" (onClick)="refresh()" class="ml-auto" />
    </div>

    <p-tabs value="tenants">
      <p-tablist>
        <p-tab value="tenants"><i class="pi pi-building"></i> Tenants</p-tab>
        <p-tab value="products"><i class="pi pi-box"></i> Products</p-tab>
        <p-tab value="modules"><i class="pi pi-th-large"></i> Modules</p-tab>
        <p-tab value="runtime"><i class="pi pi-cog"></i> Runtime</p-tab>
      </p-tablist>
      <p-tabpanels>
        <p-tabpanel value="tenants">
          <p-table [value]="tenants()" styleClass="p-datatable-sm" [scrollable]="true">
            <ng-template #header>
              <tr><th>Slug</th><th>Name</th><th style="width:120px">Status</th><th style="width:160px">Created</th></tr>
            </ng-template>
            <ng-template #body let-t>
              <tr>
                <td class="mono">{{ t.slug }}</td>
                <td class="fw-600">{{ t.name }}</td>
                <td><p-tag [value]="t.status" [severity]="statusTag(t.status)" /></td>
                <td class="mono">{{ t.created_at | date:'short' }}</td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr><td colspan="4" class="muted">No tenants</td></tr>
            </ng-template>
          </p-table>
        </p-tabpanel>

        <p-tabpanel value="products">
          <p-table [value]="products()" styleClass="p-datatable-sm">
            <ng-template #header><tr><th>Code</th><th>Name</th><th style="width:120px">Status</th></tr></ng-template>
            <ng-template #body let-p>
              <tr>
                <td class="mono">{{ p.code }}</td>
                <td class="fw-600">{{ p.name }}</td>
                <td><p-tag [value]="p.status" [severity]="statusTag(p.status)" /></td>
              </tr>
            </ng-template>
            <ng-template #emptymessage><tr><td colspan="3" class="muted">No products</td></tr></ng-template>
          </p-table>
        </p-tabpanel>

        <p-tabpanel value="modules">
          <p-table [value]="modules()" styleClass="p-datatable-sm">
            <ng-template #header><tr><th>Code</th><th>Name</th><th style="width:120px">Status</th></tr></ng-template>
            <ng-template #body let-m>
              <tr>
                <td class="mono">{{ m.code }}</td>
                <td class="fw-600">{{ m.name }}</td>
                <td><p-tag [value]="m.status" [severity]="statusTag(m.status)" /></td>
              </tr>
            </ng-template>
            <ng-template #emptymessage><tr><td colspan="3" class="muted">No modules</td></tr></ng-template>
          </p-table>
        </p-tabpanel>

        <p-tabpanel value="runtime">
          <div class="kv">
            <div class="kv-row"><span>Node version</span><span class="mono">{{ runtime()?.node?.version }}</span></div>
            <div class="kv-row"><span>PID</span><span class="mono">{{ runtime()?.node?.pid }}</span></div>
            <div class="kv-row"><span>Uptime</span><span class="mono">{{ runtime()?.node?.uptimeSec }}s</span></div>
            <div class="kv-row"><span>RSS</span><span class="mono">{{ runtime()?.node?.memoryMb?.rss }}MB</span></div>
            <div class="kv-row"><span>Heap used</span><span class="mono">{{ runtime()?.node?.memoryMb?.heap }}MB</span></div>
            <div class="kv-row"><span>DB connections</span><span class="mono">{{ runtime()?.db?.connections }}</span></div>
          </div>
        </p-tabpanel>
      </p-tabpanels>
    </p-tabs>
  `,
  styles: [`
    .top-row { display: flex; gap: 24px; align-items: center; padding: 12px 16px;
               background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .stat { display: flex; flex-direction: column; gap: 4px; min-width: 90px; }
    .stat .lbl { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
    .stat strong { font-size: 20px; font-weight: 700; color: #0f172a; }
    .stat strong.ok { color: #16a34a; }
    .stat strong.warn { color: #ea580c; }
    .ml-auto { margin-left: auto; }
    .fw-600 { font-weight: 600; }
    .mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
    .muted { color: #64748b; }
    .kv { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; max-width: 600px; }
    .kv-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; }
    .kv-row:last-child { border-bottom: none; }
  `],
})
export class DosOpsComponent implements OnInit, OnDestroy {
  private api = inject(PillarsService);
  overview = signal<any>(null);
  runtime = signal<any>(null);
  tenants = signal<any[]>([]);
  products = signal<any[]>([]);
  modules = signal<any[]>([]);
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.refresh();
    this.timer = setInterval(() => this.refresh(), 30000);
  }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }

  refresh(): void {
    this.api.dosOverview().subscribe({ next: (r) => this.overview.set(r) });
    this.api.dosRuntime().subscribe({ next: (r) => this.runtime.set(r) });
    this.api.dosTenants().subscribe({ next: (r) => this.tenants.set(r.tenants) });
    this.api.dosProducts().subscribe({ next: (r) => this.products.set(r.products) });
    this.api.dosModules().subscribe({ next: (r) => this.modules.set(r.modules) });
  }

  statusTag(s: string): 'success' | 'info' | 'warn' | 'danger' {
    if (s === 'active' || s === 'enabled') return 'success';
    if (s === 'suspended' || s === 'disabled') return 'warn';
    if (s === 'deleted' || s === 'error') return 'danger';
    return 'info';
  }
}
