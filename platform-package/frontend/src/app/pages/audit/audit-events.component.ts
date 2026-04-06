import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TabsModule } from 'primeng/tabs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { HealthService } from '../../core/dos/services/health.service';
import { SettingsService } from '../../core/dos/services/settings.service';
import { TenantConfigService } from '../../core/dos/services/tenant-config.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-audit-events',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, TagModule, ButtonModule, InputTextModule, TabsModule, PageHeaderComponent],
  template: `
    <dos-page-header title="Audit & Events" subtitle="Audit log explorer, event streams, config mutation history, and error monitoring" />

    <p-tabs>
      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-list"></i> Audit Log</span></ng-template>
        <div class="tab-body">
          <div class="info-block">
            <i class="pi pi-info-circle"></i>
            <span>Audit logs are captured for all tenant and platform mutations. Use the workspace audit API to query structured audit entries.</span>
          </div>
          <div class="toolbar">
            <p-button label="Refresh Errors" icon="pi pi-refresh" (onClick)="loadErrors()" [outlined]="true" size="small" />
          </div>
          @if (errorSummary()) {
            <div class="summary-cards">
              @for (kv of errorSummaryKv(); track kv.key) {
                <div class="summary-item"><span class="s-key">{{ kv.key }}</span><span class="s-val">{{ kv.value }}</span></div>
              }
            </div>
          }
        </div>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-exclamation-circle"></i> Recent Errors</span></ng-template>
        <p-table [value]="recentErrors()" [rows]="20" [paginator]="recentErrors().length > 20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template #header><tr><th>Timestamp</th><th>Error</th><th>Source</th><th>Details</th></tr></ng-template>
          <ng-template #body let-e>
            <tr>
              <td class="mono">{{ e.timestamp || e.occurred_at | date:'short' }}</td>
              <td class="error-text fw-600">{{ e.message || e.error || e.name }}</td>
              <td>{{ e.source || e.module || '--' }}</td>
              <td class="mono truncate">{{ e.stack || e.details || '--' }}</td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="4" class="empty-msg">No recent errors</td></tr></ng-template>
        </p-table>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-history"></i> Config History</span></ng-template>
        <p-table [value]="configHistory()" [rows]="20" [paginator]="configHistory().length > 20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template #header><tr><th style="width:80px">Version</th><th>Changed By</th><th>Changed At</th><th>Diff</th></tr></ng-template>
          <ng-template #body let-c>
            <tr>
              <td class="fw-600">{{ c.version }}</td><td>{{ c.changed_by }}</td>
              <td class="mono">{{ c.changed_at | date:'short' }}</td>
              <td class="mono truncate">{{ c.diff | json }}</td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="4" class="empty-msg">No config history</td></tr></ng-template>
        </p-table>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-link"></i> Trace Correlation</span></ng-template>
        <div class="tab-body">
          <div class="trace-search">
            <div class="field">
              <label>Correlation ID</label>
              <div class="search-row">
                <input pInputText [(ngModel)]="corrId" placeholder="Enter correlation ID" class="flex-1" />
                <p-button label="Search" icon="pi pi-search" (onClick)="searchCorr()" size="small" />
              </div>
            </div>
            <div class="field">
              <label>OTEL Trace ID</label>
              <div class="search-row">
                <input pInputText [(ngModel)]="otelId" placeholder="Enter OTEL trace ID" class="flex-1" />
                <p-button label="Search" icon="pi pi-search" (onClick)="searchOtel()" size="small" />
              </div>
            </div>
          </div>
          @if (traceResult()) {
            <pre class="json-block">{{ traceResult() | json }}</pre>
          }
        </div>
      </p-tabpanel>
    </p-tabs>
  `,
  styles: [`
    .tab-body { padding: 16px 0; }
    .info-block { display: flex; align-items: flex-start; gap: 10px; padding: 14px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 13px; color: #1e40af; margin-bottom: 16px; }
    .toolbar { display: flex; gap: 8px; margin-bottom: 16px; }
    .summary-cards { display: flex; gap: 16px; flex-wrap: wrap; }
    .summary-item { background: var(--dos-surface); border: 1px solid var(--dos-border); border-radius: 8px; padding: 14px 20px; display: flex; flex-direction: column; gap: 4px; }
    .s-key { font-size: 11px; font-weight: 600; color: var(--dos-text-muted); text-transform: uppercase; }
    .s-val { font-size: 20px; font-weight: 800; }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
    .error-text { color: #dc2626; } .truncate { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .trace-search { display: flex; flex-direction: column; gap: 16px; max-width: 600px; }
    .field { display: flex; flex-direction: column; gap: 6px; } .field label { font-size: 13px; font-weight: 600; color: #475569; }
    .search-row { display: flex; gap: 8px; } .flex-1 { flex: 1; }
    .json-block { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; font-size: 12px; max-height: 400px; overflow: auto; white-space: pre-wrap; margin-top: 16px; }
  `],
})
export class AuditEventsComponent implements OnInit {
  private healthSvc = inject(HealthService);
  private settingsSvc = inject(SettingsService);
  private configSvc = inject(TenantConfigService);

  errorSummary = signal<any>(null);
  errorSummaryKv = signal<Array<{ key: string; value: string }>>([]);
  recentErrors = signal<any[]>([]);
  configHistory = signal<any[]>([]);
  corrId = ''; otelId = '';
  traceResult = signal<any>(null);

  ngOnInit(): void { this.loadErrors(); this.loadConfigHistory(); }

  loadErrors(): void {
    this.healthSvc.getErrorSummary().subscribe({ next: d => { this.errorSummary.set(d); this.errorSummaryKv.set(Object.entries(d || {}).filter(([, v]) => typeof v !== 'object').map(([k, v]) => ({ key: k.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), value: String(v) }))); }, error: () => {} });
    this.healthSvc.getRecentErrors().subscribe({ next: d => this.recentErrors.set(Array.isArray(d) ? d : []), error: () => this.recentErrors.set([]) });
  }

  loadConfigHistory(): void {
    this.configSvc.getConfigHistory().subscribe({ next: d => this.configHistory.set(d), error: () => this.configHistory.set([]) });
  }

  searchCorr(): void { if (!this.corrId) return; this.settingsSvc.getTraceByCorrelationId(this.corrId).subscribe({ next: d => this.traceResult.set(d), error: () => this.traceResult.set({ error: 'Not found' }) }); }
  searchOtel(): void { if (!this.otelId) return; this.settingsSvc.getTraceByOtel(this.otelId).subscribe({ next: d => this.traceResult.set(d), error: () => this.traceResult.set({ error: 'Not found' }) }); }
}
