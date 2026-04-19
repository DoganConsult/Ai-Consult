import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { PillarsService, SecurityAlert, AuditEvent } from '../../../core/pillars/pillars.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-pillars-dsoc',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, TagModule, ButtonModule, TabsModule, SelectModule, InputTextModule],
  template: `
    <div class="top-row">
      <div class="stat"><span class="lbl">Critical open</span><strong class="crit">{{ counts().critical }}</strong></div>
      <div class="stat"><span class="lbl">High open</span><strong class="high">{{ counts().high }}</strong></div>
      <div class="stat"><span class="lbl">Medium open</span><strong class="med">{{ counts().medium }}</strong></div>
      <div class="stat"><span class="lbl">Ack</span><strong>{{ counts().ack }}</strong></div>
      <div class="stat"><span class="lbl">Resolved (7d)</span><strong>{{ counts().resolved }}</strong></div>
      <p-button label="Refresh" icon="pi pi-refresh" size="small" [outlined]="true"
                (onClick)="refresh()" [loading]="loading()" class="ml-auto" />
    </div>

    <p-tabs value="alerts">
      <p-tablist>
        <p-tab value="alerts"><i class="pi pi-bell"></i> Alert Triage</p-tab>
        <p-tab value="audit"><i class="pi pi-history"></i> Audit Explorer</p-tab>
        <p-tab value="chain"><i class="pi pi-link"></i> Chain Integrity</p-tab>
      </p-tablist>
      <p-tabpanels>
        <p-tabpanel value="alerts">
          <div class="filters">
            <p-select [(ngModel)]="fSev" [options]="sevOpts" placeholder="All severities" (onChange)="refresh()" />
            <p-select [(ngModel)]="fStatus" [options]="statusOpts" placeholder="All statuses" (onChange)="refresh()" />
          </div>
          <p-table [value]="alerts()" styleClass="p-datatable-sm" [scrollable]="true">
            <ng-template #header>
              <tr>
                <th style="width:90px">Severity</th>
                <th>Title</th>
                <th>Source / Category</th>
                <th style="width:100px">Status</th>
                <th style="width:160px">Time</th>
                <th style="width:240px">Actions</th>
              </tr>
            </ng-template>
            <ng-template #body let-a>
              <tr>
                <td><p-tag [value]="a.severity" [severity]="sevTag(a.severity)" /></td>
                <td class="fw-600">{{ a.title }}</td>
                <td class="muted">{{ a.source }} / {{ a.category }}</td>
                <td><p-tag [value]="a.status" [severity]="statusTag(a.status)" /></td>
                <td class="mono">{{ a.ts | date:'short' }}</td>
                <td>
                  <p-button *ngIf="a.status === 'open'" label="Ack" icon="pi pi-check" size="small" [text]="true" (onClick)="act(a, 'ack')" />
                  <p-button *ngIf="a.status !== 'resolved'" label="Resolve" icon="pi pi-check-circle" size="small" severity="success" [text]="true" (onClick)="act(a, 'resolve')" />
                  <p-button *ngIf="a.status === 'open'" label="Suppress" icon="pi pi-ban" size="small" severity="secondary" [text]="true" (onClick)="act(a, 'suppress')" />
                </td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr><td colspan="6" class="muted">{{ loading() ? 'Loading...' : 'No alerts match filter' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabpanel>

        <p-tabpanel value="audit">
          <div class="filters">
            <input pInputText [(ngModel)]="auditQ" placeholder="Search action or target..." (keyup.enter)="searchAudit()" />
            <p-button label="Search" icon="pi pi-search" size="small" (onClick)="searchAudit()" />
          </div>
          <p-table [value]="audit()" styleClass="p-datatable-sm" [scrollable]="true">
            <ng-template #header>
              <tr>
                <th style="width:160px">Time</th>
                <th>Action</th>
                <th>Target</th>
                <th style="width:80px">Status</th>
                <th style="width:140px">Client IP</th>
                <th style="width:220px">Request ID</th>
              </tr>
            </ng-template>
            <ng-template #body let-e>
              <tr>
                <td class="mono">{{ e.ts | date:'short' }}</td>
                <td class="fw-600">{{ e.action }}</td>
                <td class="mono">{{ e.target }}</td>
                <td><p-tag [value]="e.status_code || '--'" [severity]="e.status_code >= 400 ? 'danger' : 'success'" /></td>
                <td class="mono muted">{{ e.client_ip || '--' }}</td>
                <td class="mono muted">{{ e.request_id || '--' }}</td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr><td colspan="6" class="muted">{{ loading() ? 'Loading...' : 'No audit events' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabpanel>

        <p-tabpanel value="chain">
          <div class="chain-card">
            <h4>Audit chain integrity</h4>
            <div *ngIf="chain() as c">
              <div class="kv-row"><span>Total entries</span><span class="mono">{{ c.total }}</span></div>
              <div class="kv-row"><span>First event</span><span class="mono">{{ c.first_ts | date:'medium' }}</span></div>
              <div class="kv-row"><span>Last event</span><span class="mono">{{ c.last_ts | date:'medium' }}</span></div>
              <p-tag [value]="c.ok ? 'CHAIN OK' : 'BROKEN'" [severity]="c.ok ? 'success' : 'danger'" />
            </div>
          </div>
        </p-tabpanel>
      </p-tabpanels>
    </p-tabs>
  `,
  styles: [`
    .top-row { display: flex; gap: 28px; align-items: center; padding: 12px 16px;
               background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px; }
    .stat { display: flex; flex-direction: column; gap: 4px; }
    .stat .lbl { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
    .stat strong { font-size: 22px; font-weight: 700; color: #0f172a; }
    .stat strong.crit { color: #dc2626; }
    .stat strong.high { color: #ea580c; }
    .stat strong.med { color: #ca8a04; }
    .ml-auto { margin-left: auto; }
    .filters { display: flex; gap: 8px; margin: 12px 0; }
    .fw-600 { font-weight: 600; }
    .mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
    .muted { color: #64748b; }
    .chain-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
    .kv-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; }
    h4 { margin: 0 0 12px; color: #0f172a; }
  `],
})
export class DsocComponent implements OnInit, OnDestroy {
  private api = inject(PillarsService);
  alerts = signal<SecurityAlert[]>([]);
  audit = signal<AuditEvent[]>([]);
  chain = signal<{ ok: boolean; total: number; first_ts: string; last_ts: string } | null>(null);
  loading = signal(false);
  auditQ = '';
  fSev: string | null = null;
  fStatus: string | null = null;
  sevOpts = [
    { label: 'All severities', value: null },
    { label: 'Critical', value: 'critical' },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
    { label: 'Info', value: 'info' },
  ];
  statusOpts = [
    { label: 'All statuses', value: null },
    { label: 'Open', value: 'open' },
    { label: 'Ack', value: 'ack' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Suppressed', value: 'suppressed' },
  ];
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.refresh();
    this.loadAudit();
    this.loadChain();
    this.timer = setInterval(() => this.refresh(), 20000);
  }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }

  counts() {
    const a = this.alerts();
    return {
      critical: a.filter((x) => x.severity === 'critical' && x.status === 'open').length,
      high: a.filter((x) => x.severity === 'high' && x.status === 'open').length,
      medium: a.filter((x) => x.severity === 'medium' && x.status === 'open').length,
      ack: a.filter((x) => x.status === 'ack').length,
      resolved: a.filter((x) => x.status === 'resolved').length,
    };
  }

  refresh(): void {
    this.loading.set(true);
    this.api.dsocAlerts({ severity: this.fSev || undefined, status: this.fStatus || undefined }).subscribe({
      next: (r) => this.alerts.set(r.alerts),
      complete: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }
  loadAudit(): void {
    this.api.dsocAudit(this.auditQ || undefined).subscribe({ next: (r) => this.audit.set(r.events) });
  }
  loadChain(): void { this.api.dsocChainVerify().subscribe({ next: (c) => this.chain.set(c) }); }
  searchAudit(): void { this.loadAudit(); }

  act(a: SecurityAlert, action: 'ack' | 'resolve' | 'suppress'): void {
    const call = action === 'ack' ? this.api.dsocAck(a.id) : action === 'resolve' ? this.api.dsocResolve(a.id) : this.api.dsocSuppress(a.id);
    call.subscribe({ next: () => this.refresh() });
  }

  sevTag(s: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (s) {
      case 'critical': return 'danger';
      case 'high': return 'danger';
      case 'medium': return 'warn';
      case 'low': return 'info';
      default: return 'info';
    }
  }
  statusTag(s: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (s) {
      case 'open': return 'danger';
      case 'ack': return 'warn';
      case 'resolved': return 'success';
      case 'suppressed': return 'info';
      default: return 'info';
    }
  }
}
