import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { HealthService } from '../../core/dos/services/health.service';
import { TenantService } from '../../core/dos/services/tenant.service';

interface ProbeRow { name: string; status: string; latency?: number; message?: string; }

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-support-diagnostics',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, ButtonModule, TabsModule, PageHeaderComponent],
  template: `
    <dos-page-header title="Support & Diagnostics" subtitle="Health probes, readiness checks, schema health gate, and system diagnostics" />

    <div class="summary-bar">
      <div class="sb-card" [class]="overallClass()">
        <i class="pi" [ngClass]="overallStatus() === 'healthy' ? 'pi-check-circle' : 'pi-times-circle'"></i>
        <div class="sb-text"><span class="sb-label">Overall</span><span class="sb-val">{{ overallStatus() | uppercase }}</span></div>
      </div>
      <div class="sb-stat"><span class="sb-num ok">{{ healthyCount() }}</span><span class="sb-label">Healthy</span></div>
      <div class="sb-stat"><span class="sb-num warn">{{ degradedCount() }}</span><span class="sb-label">Degraded</span></div>
      <div class="sb-stat"><span class="sb-num fail">{{ unhealthyCount() }}</span><span class="sb-label">Unhealthy</span></div>
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="refresh()" [outlined]="true" size="small" [loading]="loading()" class="ml-auto" />
    </div>

    <p-tabs>
      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-heart"></i> Health Probes</span></ng-template>
        <p-table [value]="probes()" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template #header><tr><th style="width:40px"></th><th>Probe</th><th style="width:120px">Status</th><th style="width:100px">Latency</th><th>Details</th></tr></ng-template>
          <ng-template #body let-p>
            <tr>
              <td><span class="dot" [class]="dotClass(p.status)"></span></td>
              <td class="fw-600">{{ p.name }}</td>
              <td><p-tag [value]="p.status" [severity]="tagSev(p.status)" /></td>
              <td class="mono">{{ p.latency !== undefined ? p.latency + 'ms' : '--' }}</td>
              <td class="mono muted">{{ p.message || '--' }}</td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="5" class="empty-msg">{{ loading() ? 'Loading...' : 'No probes' }}</td></tr></ng-template>
        </p-table>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-check-square"></i> Readiness & Liveness</span></ng-template>
        <div class="kv-sections">
          <div class="kv-block"><h4>Readiness</h4>
            @for (kv of readiness(); track kv.key) { <div class="kv-row"><span class="kv-key">{{ kv.key }}</span><span class="kv-val">{{ kv.value }}</span></div> }
            @if (readiness().length === 0) { <span class="muted">No data</span> }
          </div>
          <div class="kv-block"><h4>Liveness</h4>
            @for (kv of liveness(); track kv.key) { <div class="kv-row"><span class="kv-key">{{ kv.key }}</span><span class="kv-val">{{ kv.value }}</span></div> }
            @if (liveness().length === 0) { <span class="muted">No data</span> }
          </div>
          <div class="kv-block"><h4>Cache</h4>
            @for (kv of cacheKv(); track kv.key) { <div class="kv-row"><span class="kv-key">{{ kv.key }}</span><span class="kv-val">{{ kv.value }}</span></div> }
            @if (cacheKv().length === 0) { <span class="muted">No data</span> }
          </div>
        </div>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-shield"></i> Schema Health Gate</span></ng-template>
        <div class="tab-body">
          @if (schemaGate()) {
            <div class="gate-status">
              <p-tag [value]="schemaGate()!.passed ? 'PASSED' : 'FAILED'" [severity]="schemaGate()!.passed ? 'success' : 'danger'" />
            </div>
            <pre class="json-block">{{ schemaGate() | json }}</pre>
          } @else {
            <div class="empty-msg">Loading schema health gate...</div>
          }
        </div>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-chart-line"></i> Memory Trend</span></ng-template>
        <div class="tab-body">
          @if (memTrend()) {
            <pre class="json-block">{{ memTrend() | json }}</pre>
          } @else {
            <div class="empty-msg">No memory trend data</div>
          }
        </div>
      </p-tabpanel>
    </p-tabs>
  `,
  styles: [`
    .summary-bar { display: flex; align-items: center; gap: 20px; margin-top: 20px; background: var(--dos-surface); border: 1px solid var(--dos-border); border-radius: var(--dos-radius); padding: 16px 20px; flex-wrap: wrap; }
    .sb-card { display: flex; align-items: center; gap: 12px; padding-right: 20px; border-right: 1px solid var(--dos-border); }
    .sb-card i { font-size: 28px; } .sb-card.healthy i { color: #16a34a; } .sb-card.unhealthy i { color: #dc2626; }
    .sb-text { display: flex; flex-direction: column; } .sb-label { font-size: 11px; font-weight: 600; color: var(--dos-text-muted); text-transform: uppercase; }
    .sb-val { font-size: 18px; font-weight: 800; }
    .sb-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 0 16px; }
    .sb-num { font-size: 22px; font-weight: 800; } .sb-num.ok { color: #16a34a; } .sb-num.warn { color: #ca8a04; } .sb-num.fail { color: #dc2626; }
    .ml-auto { margin-left: auto; }
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; } .dot.ok { background: #16a34a; } .dot.warn { background: #ca8a04; } .dot.fail { background: #dc2626; }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; } .muted { color: var(--dos-text-muted); }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
    .tab-body { padding: 16px 0; }
    .kv-sections { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 16px 0; }
    .kv-block { background: var(--dos-surface); border: 1px solid var(--dos-border); border-radius: var(--dos-radius); padding: 16px; }
    .kv-block h4 { font-size: 13px; font-weight: 700; margin: 0 0 10px; }
    .kv-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
    .kv-key { font-weight: 600; } .kv-val { font-family: monospace; color: var(--dos-text-muted); }
    .gate-status { margin-bottom: 12px; }
    .json-block { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; font-size: 12px; max-height: 400px; overflow: auto; white-space: pre-wrap; }
    @media (max-width: 900px) { .summary-bar { flex-wrap: wrap; } .kv-sections { grid-template-columns: 1fr; } }
  `],
})
export class SupportDiagnosticsComponent implements OnInit, OnDestroy {
  private healthSvc = inject(HealthService);
  private tenantSvc = inject(TenantService);
  private timer: any;

  probes = signal<ProbeRow[]>([]); loading = signal(false);
  readiness = signal<Array<{ key: string; value: string }>>([]);
  liveness = signal<Array<{ key: string; value: string }>>([]);
  cacheKv = signal<Array<{ key: string; value: string }>>([]);
  schemaGate = signal<any>(null); memTrend = signal<any>(null);
  overallStatus = signal('loading'); healthyCount = signal(0); degradedCount = signal(0); unhealthyCount = signal(0);

  ngOnInit(): void { this.refresh(); this.timer = setInterval(() => this.refresh(), 30_000); }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }

  overallClass(): string { const s = this.overallStatus(); return (s === 'healthy' || s === 'ok') ? 'healthy' : 'unhealthy'; }
  dotClass(s: string): string { return (s === 'healthy' || s === 'ok') ? 'ok' : s === 'degraded' ? 'warn' : 'fail'; }
  tagSev(s: string): 'success' | 'warn' | 'danger' | 'info' { return (s === 'healthy' || s === 'ok') ? 'success' : s === 'degraded' ? 'warn' : (s === 'unhealthy' || s === 'error') ? 'danger' : 'info'; }

  refresh(): void {
    this.loading.set(true);
    this.healthSvc.getDeepHealth().subscribe({
      next: d => {
        const items = Object.entries(d.checks || {}).map(([n, c]) => ({ name: n.replace(/[_-]/g, ' ').replace(/\b\w/g, x => x.toUpperCase()), status: c.status, latency: c.latency_ms, message: c.message }));
        this.probes.set(items); this.overallStatus.set(d.status || 'unknown');
        this.healthyCount.set(items.filter(p => p.status === 'healthy' || p.status === 'ok').length);
        this.degradedCount.set(items.filter(p => p.status === 'degraded').length);
        this.unhealthyCount.set(items.filter(p => p.status !== 'healthy' && p.status !== 'ok' && p.status !== 'degraded').length);
        this.loading.set(false);
      }, error: () => { this.probes.set([]); this.overallStatus.set('unreachable'); this.loading.set(false); }
    });
    this.healthSvc.getReadiness().subscribe({ next: d => this.readiness.set(this.flat(d)), error: () => this.readiness.set([]) });
    this.healthSvc.getLiveness().subscribe({ next: d => this.liveness.set(this.flat(d)), error: () => this.liveness.set([]) });
    this.healthSvc.getCacheHealth().subscribe({ next: d => this.cacheKv.set(this.flat(d)), error: () => this.cacheKv.set([]) });
    this.tenantSvc.getSchemaHealthGate().subscribe({ next: d => this.schemaGate.set(d), error: () => {} });
    this.healthSvc.getMemoryTrend().subscribe({ next: d => this.memTrend.set(d), error: () => {} });
  }

  private flat(obj: any): Array<{ key: string; value: string }> {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj).slice(0, 10).map(([k, v]) => ({ key: k.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), value: typeof v === 'object' ? JSON.stringify(v) : String(v) }));
  }
}
