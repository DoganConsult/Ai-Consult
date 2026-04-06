import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { HealthService, HealthResponse, WorkflowHealthResponse } from '../../core/dos/services/health.service';
import { TenantService } from '../../core/dos/services/tenant.service';
import { JobsService } from '../../core/dos/services/jobs.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-platform-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, TagModule, ButtonModule, PageHeaderComponent],
  template: `
    <dos-page-header title="Platform Overview" subtitle="DOS Platform R1.5 — Global Operations Dashboard" />

    <div class="metrics-row">
      <div class="metric-card">
        <div class="metric-icon" [class]="statusClass()"><i class="pi pi-circle-fill"></i></div>
        <div class="metric-body">
          <span class="metric-label">Platform Status</span>
          <span class="metric-value">{{ health()?.status || 'Loading...' }}</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon blue"><i class="pi pi-tag"></i></div>
        <div class="metric-body">
          <span class="metric-label">Version</span>
          <span class="metric-value">{{ health()?.version || '--' }}</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon purple"><i class="pi pi-clock"></i></div>
        <div class="metric-body">
          <span class="metric-label">Uptime</span>
          <span class="metric-value">{{ formatUptime(health()?.uptime) }}</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon orange"><i class="pi pi-building"></i></div>
        <div class="metric-body">
          <span class="metric-label">Tenants</span>
          <span class="metric-value">{{ tenantCount() }}</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon teal"><i class="pi pi-briefcase"></i></div>
        <div class="metric-body">
          <span class="metric-label">Background Jobs</span>
          <span class="metric-value">{{ jobCount() }}</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon" [class]="dlqCount() > 0 ? 'red' : 'green'"><i class="pi pi-inbox"></i></div>
        <div class="metric-body">
          <span class="metric-label">DLQ Messages</span>
          <span class="metric-value">{{ workflow()?.dlqCount ?? dlqCount() }}</span>
        </div>
      </div>
    </div>

    <div class="section-row">
      <div class="section-block">
        <h3>Infrastructure Probes</h3>
        <div class="probe-grid">
          @for (probe of probes(); track probe.name) {
            <div class="probe-item">
              <span class="probe-dot" [class]="probeClass(probe.status)"></span>
              <span class="probe-name">{{ probe.name }}</span>
              @if (probe.latency !== undefined) {
                <span class="probe-latency">{{ probe.latency }}ms</span>
              }
              <span class="probe-status">{{ probe.status }}</span>
            </div>
          }
          @if (probes().length === 0) {
            <div class="empty-text">Loading probes...</div>
          }
        </div>
      </div>
      <div class="section-block">
        <h3>Workflow Engine</h3>
        @if (workflow()) {
          <div class="wf-stats">
            <div class="wf-stat">
              <span class="wf-val">{{ workflow()!.activeExecutions }}</span>
              <span class="wf-label">Active</span>
            </div>
            <div class="wf-stat">
              <span class="wf-val">{{ workflow()!.pendingSteps }}</span>
              <span class="wf-label">Pending</span>
            </div>
            <div class="wf-stat" [class.wf-danger]="(workflow()!.dlqCount || 0) > 0">
              <span class="wf-val">{{ workflow()!.dlqCount }}</span>
              <span class="wf-label">DLQ</span>
            </div>
          </div>
        } @else {
          <div class="empty-text">Loading workflow stats...</div>
        }
        <h3 style="margin-top: 20px">Memory</h3>
        <div class="mem-row">
          <span>Heap: {{ health()?.memory?.heapUsedMB || 0 }} / {{ health()?.memory?.heapTotalMB || 0 }} MB</span>
          <span>RSS: {{ health()?.memory?.rssMB || 0 }} MB</span>
        </div>
      </div>
    </div>

    <div class="quick-nav">
      <h3>Platform Areas</h3>
      <div class="nav-cards">
        <a routerLink="/tenants" class="nav-card"><i class="pi pi-building"></i><span>Tenants & Workspaces</span></a>
        <a routerLink="/identity" class="nav-card"><i class="pi pi-id-card"></i><span>Identity & Access</span></a>
        <a routerLink="/modules" class="nav-card"><i class="pi pi-th-large"></i><span>Module Registry</span></a>
        <a routerLink="/settings" class="nav-card"><i class="pi pi-cog"></i><span>Platform Settings</span></a>
        <a routerLink="/workflows" class="nav-card"><i class="pi pi-sitemap"></i><span>Workflow & Lifecycle</span></a>
        <a routerLink="/audit" class="nav-card"><i class="pi pi-list"></i><span>Audit & Events</span></a>
        <a routerLink="/integrations" class="nav-card"><i class="pi pi-link"></i><span>Integrations</span></a>
        <a routerLink="/ai-governance" class="nav-card"><i class="pi pi-microchip"></i><span>AI Governance</span></a>
        <a routerLink="/diagnostics" class="nav-card"><i class="pi pi-wrench"></i><span>Diagnostics</span></a>
      </div>
    </div>
  `,
  styles: [`
    .metrics-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; margin-top: 20px; }
    .metric-card { display: flex; align-items: center; gap: 12px; background: var(--dos-surface); border: 1px solid var(--dos-border); border-radius: var(--dos-radius); padding: 16px; box-shadow: var(--dos-shadow); }
    .metric-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .metric-icon.green { background: #dcfce7; color: #16a34a; } .metric-icon.red { background: #fef2f2; color: #dc2626; }
    .metric-icon.yellow { background: #fefce8; color: #ca8a04; } .metric-icon.blue { background: #dbeafe; color: #2563eb; }
    .metric-icon.purple { background: #f3e8ff; color: #9333ea; } .metric-icon.orange { background: #fff7ed; color: #ea580c; }
    .metric-icon.teal { background: #ccfbf1; color: #0d9488; }
    .metric-body { display: flex; flex-direction: column; gap: 2px; }
    .metric-label { font-size: 11px; font-weight: 600; color: var(--dos-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .metric-value { font-size: 16px; font-weight: 700; color: var(--dos-text); }
    .section-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
    .section-block { background: var(--dos-surface); border: 1px solid var(--dos-border); border-radius: var(--dos-radius); padding: 20px; box-shadow: var(--dos-shadow); }
    .section-block h3 { font-size: 14px; font-weight: 700; margin: 0 0 14px; }
    .probe-grid { display: flex; flex-direction: column; gap: 8px; }
    .probe-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--dos-bg); border-radius: 6px; }
    .probe-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .probe-dot.ok { background: #16a34a; } .probe-dot.warn { background: #ca8a04; } .probe-dot.fail { background: #dc2626; }
    .probe-name { font-size: 13px; font-weight: 600; flex: 1; } .probe-latency { font-size: 12px; color: var(--dos-text-muted); }
    .probe-status { font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .empty-text { font-size: 13px; color: var(--dos-text-muted); padding: 8px 0; }
    .wf-stats { display: flex; gap: 16px; }
    .wf-stat { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; padding: 14px; background: var(--dos-bg); border-radius: 8px; }
    .wf-val { font-size: 24px; font-weight: 800; } .wf-label { font-size: 11px; font-weight: 600; color: var(--dos-text-muted); text-transform: uppercase; }
    .wf-danger .wf-val { color: #dc2626; }
    .mem-row { display: flex; gap: 24px; font-size: 13px; color: var(--dos-text-muted); }
    .quick-nav { margin-top: 24px; }
    .quick-nav h3 { font-size: 14px; font-weight: 700; margin: 0 0 12px; }
    .nav-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
    .nav-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 12px; background: var(--dos-surface); border: 1px solid var(--dos-border); border-radius: var(--dos-radius); text-decoration: none; color: var(--dos-text); transition: border-color 0.15s; cursor: pointer; }
    .nav-card:hover { border-color: var(--dos-primary); } .nav-card i { font-size: 22px; color: var(--dos-primary); } .nav-card span { font-size: 12px; font-weight: 600; text-align: center; }
    @media (max-width: 900px) { .section-row { grid-template-columns: 1fr; } .nav-cards { grid-template-columns: repeat(3, 1fr); } }
  `],
})
export class PlatformOverviewComponent implements OnInit, OnDestroy {
  private healthSvc = inject(HealthService);
  private tenantSvc = inject(TenantService);
  private jobsSvc = inject(JobsService);
  private timer: any;

  health = signal<HealthResponse | null>(null);
  probes = signal<Array<{ name: string; status: string; latency?: number }>>([]);
  workflow = signal<WorkflowHealthResponse | null>(null);
  tenantCount = signal(0);
  jobCount = signal(0);
  dlqCount = signal(0);

  ngOnInit(): void { this.loadAll(); this.timer = setInterval(() => this.loadAll(), 30_000); }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }

  statusClass(): string {
    const s = this.health()?.status;
    if (s === 'ok' || s === 'healthy') return 'green';
    if (s === 'degraded') return 'yellow';
    return 'red';
  }

  probeClass(s: string): string { return (s === 'healthy' || s === 'ok') ? 'ok' : s === 'degraded' ? 'warn' : 'fail'; }

  formatUptime(sec?: number): string {
    if (!sec) return '--';
    const d = Math.floor(sec / 86400); const h = Math.floor((sec % 86400) / 3600); const m = Math.floor((sec % 3600) / 60);
    return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  private loadAll(): void {
    this.healthSvc.getHealth().subscribe({ next: d => this.health.set(d), error: () => this.health.set({ status: 'unreachable', version: '--', uptime: 0, timestamp: '', memory: { heapUsedMB: 0, heapTotalMB: 0, rssMB: 0 } }) });
    this.healthSvc.getDeepHealth().subscribe({ next: d => { this.probes.set(Object.entries(d.checks || {}).map(([n, c]) => ({ name: n.replace(/[_-]/g, ' ').replace(/\b\w/g, x => x.toUpperCase()), status: c.status, latency: c.latency_ms }))); }, error: () => this.probes.set([]) });
    this.healthSvc.getWorkflowHealth().subscribe({ next: d => this.workflow.set(d), error: () => this.workflow.set({ status: 'unavailable', activeExecutions: 0, pendingSteps: 0, dlqCount: 0 }) });
    this.tenantSvc.getSchemaStatus().subscribe({ next: d => this.tenantCount.set(d.length), error: () => {} });
    this.jobsSvc.listJobs().subscribe({ next: d => this.jobCount.set(d.length), error: () => {} });
    this.healthSvc.getDlqStats().subscribe({ next: (d: any) => this.dlqCount.set(d?.totalMessages || 0), error: () => {} });
  }
}
