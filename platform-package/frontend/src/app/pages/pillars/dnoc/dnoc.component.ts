import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { PillarsService, DnocHealth } from '../../../core/pillars/pillars.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-pillars-dnoc',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, ButtonModule, CardModule],
  template: `
    <div class="top-row">
      <div class="stat">
        <span class="lbl">Prometheus</span>
        <p-tag [value]="health()?.prometheus ? 'UP' : 'DOWN'"
               [severity]="health()?.prometheus ? 'success' : 'danger'" />
      </div>
      <div class="stat">
        <span class="lbl">Alertmanager</span>
        <p-tag [value]="health()?.alertmanager ? 'UP' : 'DOWN'"
               [severity]="health()?.alertmanager ? 'success' : 'danger'" />
      </div>
      <div class="stat">
        <span class="lbl">Database</span>
        <p-tag [value]="(health()?.database?.up ? 'UP ' + health()?.database?.latencyMs + 'ms' : 'DOWN')"
               [severity]="health()?.database?.up ? 'success' : 'danger'" />
      </div>
      <div class="stat">
        <span class="lbl">Firing alerts</span>
        <strong>{{ alerts().length }}</strong>
      </div>
      <p-button label="Refresh" icon="pi pi-refresh" size="small" [outlined]="true"
                (onClick)="refresh()" [loading]="loading()" class="ml-auto" />
    </div>

    <h4>Services (from Prometheus up{{ '{}' }})</h4>
    <p-table [value]="health()?.services ?? []" styleClass="p-datatable-sm">
      <ng-template #header>
        <tr><th>Service</th><th>Instance</th><th style="width:100px">Status</th></tr>
      </ng-template>
      <ng-template #body let-s>
        <tr>
          <td class="fw-600">{{ s.name }}</td>
          <td class="mono muted">{{ s.instance || '--' }}</td>
          <td><p-tag [value]="s.status" [severity]="s.status === 'up' ? 'success' : 'danger'" /></td>
        </tr>
      </ng-template>
      <ng-template #emptymessage>
        <tr><td colspan="3" class="muted">{{ loading() ? 'Loading...' : 'No service metrics — Prometheus unreachable or no targets' }}</td></tr>
      </ng-template>
    </p-table>

    <h4 class="mt-4">Firing alerts (Alertmanager)</h4>
    <p-table [value]="alerts()" styleClass="p-datatable-sm">
      <ng-template #header>
        <tr><th>Severity</th><th>Alert</th><th>Summary</th><th>Since</th><th style="width:160px">Runbook</th></tr>
      </ng-template>
      <ng-template #body let-a>
        <tr>
          <td><p-tag [value]="a.labels?.severity || 'info'" [severity]="sevTag(a.labels?.severity)" /></td>
          <td class="fw-600">{{ a.labels?.alertname }}</td>
          <td class="muted">{{ a.annotations?.summary || a.annotations?.description || '--' }}</td>
          <td class="mono">{{ a.startsAt | date:'short' }}</td>
          <td><a *ngIf="runbookFor(a.labels?.alertname) as rb"
                 [href]="'/ops/runbooks/' + rb + '.md'" target="_blank" class="rb-link">
            <i class="pi pi-book"></i> {{ rb }}
          </a></td>
        </tr>
      </ng-template>
      <ng-template #emptymessage>
        <tr><td colspan="5" class="muted">{{ loading() ? 'Loading...' : 'No active alerts' }}</td></tr>
      </ng-template>
    </p-table>
  `,
  styles: [`
    .top-row { display: flex; gap: 20px; align-items: center; padding: 12px 16px;
               background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px; }
    .stat { display: flex; flex-direction: column; gap: 4px; }
    .stat .lbl { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
    .ml-auto { margin-left: auto; }
    h4 { color: #0f172a; margin: 16px 0 8px; font-weight: 600; }
    .mt-4 { margin-top: 20px; }
    .fw-600 { font-weight: 600; }
    .mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
    .muted { color: #64748b; }
    .rb-link { color: #0ea5e9; text-decoration: none; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; }
  `],
})
export class DnocComponent implements OnInit, OnDestroy {
  private api = inject(PillarsService);
  health = signal<DnocHealth | null>(null);
  alerts = signal<any[]>([]);
  loading = signal(false);
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.refresh();
    this.timer = setInterval(() => this.refresh(), 15000);
  }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }

  refresh(): void {
    this.loading.set(true);
    this.api.dnocHealth().subscribe({ next: (h) => this.health.set(h) });
    this.api.dnocAlerts().subscribe({
      next: (r) => this.alerts.set(r.alerts || []),
      complete: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  sevTag(s?: string): 'success' | 'info' | 'warn' | 'danger' {
    switch ((s || '').toLowerCase()) {
      case 'critical': return 'danger';
      case 'warning': return 'warn';
      case 'info': return 'info';
      default: return 'info';
    }
  }

  runbookFor(alertname?: string): string | null {
    if (!alertname) return null;
    const n = alertname.toLowerCase();
    if (n.includes('fastburn')) return 'slo-fast-burn';
    if (n.includes('slowburn')) return 'slo-slow-burn';
    if (n.includes('latency')) return 'latency-p99-high';
    if (n.includes('authfailure')) return 'auth-failure-burst';
    if (n.includes('risk')) return 'risk-critical';
    if (n.includes('down') || n.includes('up')) return 'component-down';
    return null;
  }
}
