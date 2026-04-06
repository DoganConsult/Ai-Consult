import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { HealthService } from '../../core/dos/services/health.service';

interface ProbeRow {
  name: string;
  status: string;
  latency?: number;
  message?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-health-dashboard',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, ButtonModule, TabsModule, PageHeaderComponent],
  template: `
    <dos-page-header title="Health Dashboard" subtitle="Platform health probes and infrastructure status" />

    <div class="health-summary">
      <div class="summary-card" [class]="overallClass()">
        <i class="pi" [ngClass]="overallStatus() === 'healthy' ? 'pi-check-circle' : overallStatus() === 'degraded' ? 'pi-exclamation-triangle' : 'pi-times-circle'"></i>
        <div class="summary-text">
          <span class="summary-label">Overall Health</span>
          <span class="summary-value">{{ overallStatus() | uppercase }}</span>
        </div>
      </div>
      <div class="summary-stat">
        <span class="stat-val">{{ healthyCount() }}</span>
        <span class="stat-label">Healthy</span>
      </div>
      <div class="summary-stat warn">
        <span class="stat-val">{{ degradedCount() }}</span>
        <span class="stat-label">Degraded</span>
      </div>
      <div class="summary-stat danger">
        <span class="stat-val">{{ unhealthyCount() }}</span>
        <span class="stat-label">Unhealthy</span>
      </div>
      <div class="summary-action">
        <p-button label="Refresh" icon="pi pi-refresh" [loading]="loading()" (onClick)="refresh()" [outlined]="true" size="small" />
      </div>
    </div>

    <div class="health-table">
      <p-table [value]="probes()" [rows]="50" [paginator]="false" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
        <ng-template #header>
          <tr>
            <th style="width: 40px"></th>
            <th>Probe</th>
            <th style="width: 120px">Status</th>
            <th style="width: 100px">Latency</th>
            <th>Details</th>
          </tr>
        </ng-template>
        <ng-template #body let-probe>
          <tr>
            <td>
              <span class="dot" [class]="dotClass(probe.status)"></span>
            </td>
            <td class="probe-name-cell">{{ probe.name }}</td>
            <td>
              <p-tag [value]="probe.status" [severity]="tagSeverity(probe.status)" />
            </td>
            <td class="latency-cell">
              @if (probe.latency !== undefined) {
                {{ probe.latency }}ms
              } @else {
                --
              }
            </td>
            <td class="detail-cell">{{ probe.message || '--' }}</td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr>
            <td colspan="5" class="empty-msg">
              @if (loading()) {
                Loading health probes...
              } @else {
                No health probes available
              }
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>

    <div class="extra-sections">
      <div class="extra-block">
        <h3>Readiness</h3>
        <div class="kv-list">
          @for (kv of readiness(); track kv.key) {
            <div class="kv-row">
              <span class="kv-key">{{ kv.key }}</span>
              <span class="kv-val">{{ kv.value }}</span>
            </div>
          }
          @if (readiness().length === 0) {
            <span class="muted">No readiness data</span>
          }
        </div>
      </div>
      <div class="extra-block">
        <h3>Liveness</h3>
        <div class="kv-list">
          @for (kv of liveness(); track kv.key) {
            <div class="kv-row">
              <span class="kv-key">{{ kv.key }}</span>
              <span class="kv-val">{{ kv.value }}</span>
            </div>
          }
          @if (liveness().length === 0) {
            <span class="muted">No liveness data</span>
          }
        </div>
      </div>
      <div class="extra-block">
        <h3>Cache Health</h3>
        <div class="kv-list">
          @for (kv of cacheHealth(); track kv.key) {
            <div class="kv-row">
              <span class="kv-key">{{ kv.key }}</span>
              <span class="kv-val">{{ kv.value }}</span>
            </div>
          }
          @if (cacheHealth().length === 0) {
            <span class="muted">No cache data</span>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .health-summary {
      display: flex; align-items: center; gap: 20px; margin-top: 20px;
      background: var(--dos-surface); border: 1px solid var(--dos-border);
      border-radius: var(--dos-radius); padding: 16px 20px;
    }
    .summary-card {
      display: flex; align-items: center; gap: 12px; padding-right: 20px;
      border-right: 1px solid var(--dos-border);
    }
    .summary-card i { font-size: 28px; }
    .summary-card.healthy i { color: #16a34a; }
    .summary-card.degraded i { color: #ca8a04; }
    .summary-card.unhealthy i { color: #dc2626; }
    .summary-text { display: flex; flex-direction: column; }
    .summary-label { font-size: 11px; font-weight: 600; color: var(--dos-text-muted); text-transform: uppercase; }
    .summary-value { font-size: 18px; font-weight: 800; }
    .summary-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 0 16px; }
    .stat-val { font-size: 22px; font-weight: 800; color: #16a34a; }
    .summary-stat.warn .stat-val { color: #ca8a04; }
    .summary-stat.danger .stat-val { color: #dc2626; }
    .stat-label { font-size: 11px; font-weight: 600; color: var(--dos-text-muted); text-transform: uppercase; }
    .summary-action { margin-left: auto; }

    .health-table { margin-top: 20px; }
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
    .dot.ok { background: #16a34a; }
    .dot.warn { background: #ca8a04; }
    .dot.fail { background: #dc2626; }
    .probe-name-cell { font-weight: 600; }
    .latency-cell { font-family: monospace; font-size: 13px; color: var(--dos-text-muted); }
    .detail-cell { font-size: 13px; color: var(--dos-text-muted); }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }

    .extra-sections { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 24px; }
    .extra-block {
      background: var(--dos-surface); border: 1px solid var(--dos-border);
      border-radius: var(--dos-radius); padding: 20px;
    }
    .extra-block h3 { font-size: 14px; font-weight: 700; margin: 0 0 12px; }
    .kv-list { display: flex; flex-direction: column; gap: 8px; }
    .kv-row { display: flex; justify-content: space-between; font-size: 13px; }
    .kv-key { font-weight: 600; color: var(--dos-text); }
    .kv-val { color: var(--dos-text-muted); font-family: monospace; }
    .muted { font-size: 13px; color: var(--dos-text-muted); }

    @media (max-width: 900px) {
      .health-summary { flex-wrap: wrap; }
      .extra-sections { grid-template-columns: 1fr; }
    }
  `],
})
export class HealthDashboardComponent implements OnInit, OnDestroy {
  private healthSvc = inject(HealthService);
  private refreshTimer: any;

  probes = signal<ProbeRow[]>([]);
  loading = signal(false);
  readiness = signal<Array<{ key: string; value: string }>>([]);
  liveness = signal<Array<{ key: string; value: string }>>([]);
  cacheHealth = signal<Array<{ key: string; value: string }>>([]);

  overallStatus = signal('loading');
  healthyCount = signal(0);
  degradedCount = signal(0);
  unhealthyCount = signal(0);

  ngOnInit(): void {
    this.refresh();
    this.refreshTimer = setInterval(() => this.refresh(), 30_000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  overallClass(): string {
    const s = this.overallStatus();
    if (s === 'healthy' || s === 'ok') return 'healthy';
    if (s === 'degraded') return 'degraded';
    return 'unhealthy';
  }

  dotClass(status: string): string {
    if (status === 'healthy' || status === 'ok') return 'ok';
    if (status === 'degraded') return 'warn';
    return 'fail';
  }

  tagSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' {
    if (status === 'healthy' || status === 'ok') return 'success';
    if (status === 'degraded') return 'warn';
    if (status === 'unhealthy' || status === 'error') return 'danger';
    return 'info';
  }

  refresh(): void {
    this.loading.set(true);
    this.healthSvc.getDeepHealth().subscribe({
      next: (data) => {
        const items = Object.entries(data.checks || {}).map(([name, check]) => ({
          name: name.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          status: check.status,
          latency: check.latency_ms,
          message: check.message,
        }));
        this.probes.set(items);
        this.overallStatus.set(data.status || 'unknown');
        this.healthyCount.set(items.filter(p => p.status === 'healthy' || p.status === 'ok').length);
        this.degradedCount.set(items.filter(p => p.status === 'degraded').length);
        this.unhealthyCount.set(items.filter(p => p.status !== 'healthy' && p.status !== 'ok' && p.status !== 'degraded').length);
        this.loading.set(false);
      },
      error: () => {
        this.probes.set([]);
        this.overallStatus.set('unreachable');
        this.loading.set(false);
      },
    });

    this.healthSvc.getReadiness().subscribe({
      next: (data) => this.readiness.set(this.flattenToKv(data)),
      error: () => this.readiness.set([]),
    });

    this.healthSvc.getLiveness().subscribe({
      next: (data) => this.liveness.set(this.flattenToKv(data)),
      error: () => this.liveness.set([]),
    });

    this.healthSvc.getCacheHealth().subscribe({
      next: (data) => this.cacheHealth.set(this.flattenToKv(data)),
      error: () => this.cacheHealth.set([]),
    });
  }

  private flattenToKv(obj: any): Array<{ key: string; value: string }> {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj).slice(0, 10).map(([key, value]) => ({
      key: key.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }));
  }
}
