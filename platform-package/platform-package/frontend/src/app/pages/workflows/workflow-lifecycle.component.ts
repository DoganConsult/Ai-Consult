import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { JobsService, PlatformJob, EventDlqEntry } from '../../core/dos/services/jobs.service';
import { HealthService, WorkflowHealthResponse } from '../../core/dos/services/health.service';
import { SettingsService, DeadLetterEntry } from '../../core/dos/services/settings.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-workflow-lifecycle',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, ButtonModule, TabsModule, ToastModule, PageHeaderComponent],
  providers: [MessageService],
  template: `
    <dos-page-header title="Workflow & Lifecycle" subtitle="Background jobs, queues, dead-letter monitoring, and lifecycle engine" />
    <p-toast />

    <div class="summary-row">
      @if (wfHealth()) {
        <div class="summary-card"><span class="s-val">{{ wfHealth()!.activeExecutions }}</span><span class="s-label">Active Executions</span></div>
        <div class="summary-card"><span class="s-val">{{ wfHealth()!.pendingSteps }}</span><span class="s-label">Pending Steps</span></div>
        <div class="summary-card" [class.danger]="(wfHealth()!.dlqCount || 0) > 0"><span class="s-val">{{ wfHealth()!.dlqCount }}</span><span class="s-label">Workflow DLQ</span></div>
      }
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="loadAll()" [outlined]="true" size="small" class="ml-auto" />
    </div>

    <p-tabs>
      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-briefcase"></i> Background Jobs</span></ng-template>
        <p-table [value]="jobs()" [rows]="20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template #header><tr><th>Job Name</th><th>Schedule</th><th style="width:100px">Status</th><th>Last Run</th><th style="width:100px">Actions</th></tr></ng-template>
          <ng-template #body let-j>
            <tr>
              <td class="fw-600">{{ j.name }}</td><td class="mono">{{ j.schedule || '--' }}</td>
              <td><p-tag [value]="j.status || (j.isRunning ? 'running' : 'idle')" [severity]="j.isRunning ? 'info' : 'success'" /></td>
              <td class="mono">{{ j.lastRun || '--' }}</td>
              <td><p-button icon="pi pi-play" (onClick)="triggerJob(j.name)" [text]="true" size="small" pTooltip="Trigger" /></td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="5" class="empty-msg">No jobs registered</td></tr></ng-template>
        </p-table>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-inbox"></i> Dead Letter Queue</span></ng-template>
        <p-table [value]="dlq()" [rows]="20" [paginator]="dlq().length > 20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template #header><tr><th style="width:80px">ID</th><th>Queue</th><th>Error</th><th style="width:80px">Retries</th><th>Failed At</th></tr></ng-template>
          <ng-template #body let-d>
            <tr>
              <td class="mono">{{ d.id }}</td><td><p-tag [value]="d.queue" severity="warn" /></td>
              <td class="error-text">{{ d.error }}</td><td>{{ d.retry_count }}</td>
              <td class="mono">{{ d.failed_at | date:'short' }}</td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="5" class="empty-msg">No dead-letter messages</td></tr></ng-template>
        </p-table>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-bolt"></i> Event DLQ</span></ng-template>
        <p-table [value]="eventDlq()" [rows]="20" [paginator]="eventDlq().length > 20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template #header><tr><th style="width:80px">ID</th><th>Event Type</th><th>Error</th><th style="width:80px">Retries</th><th>Failed At</th><th style="width:80px">Actions</th></tr></ng-template>
          <ng-template #body let-e>
            <tr>
              <td class="mono">{{ e.id }}</td><td class="fw-600">{{ e.event_type }}</td>
              <td class="error-text">{{ e.error }}</td><td>{{ e.retry_count }}</td>
              <td class="mono">{{ e.failed_at | date:'short' }}</td>
              <td><p-button icon="pi pi-replay" (onClick)="retryEvent(e.id)" [text]="true" size="small" /></td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="6" class="empty-msg">No event DLQ entries</td></tr></ng-template>
        </p-table>
      </p-tabpanel>
    </p-tabs>
  `,
  styles: [`
    .summary-row { display: flex; align-items: center; gap: 20px; margin-top: 20px; background: var(--dos-surface); border: 1px solid var(--dos-border); border-radius: var(--dos-radius); padding: 16px 20px; flex-wrap: wrap; }
    .summary-card { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 0 16px; }
    .s-val { font-size: 24px; font-weight: 800; } .s-label { font-size: 11px; font-weight: 600; color: var(--dos-text-muted); text-transform: uppercase; }
    .summary-card.danger .s-val { color: #dc2626; }
    .ml-auto { margin-left: auto; }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
    .error-text { font-size: 12px; color: #dc2626; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `],
})
export class WorkflowLifecycleComponent implements OnInit {
  private jobsSvc = inject(JobsService);
  private healthSvc = inject(HealthService);
  private settingsSvc = inject(SettingsService);
  private msgSvc = inject(MessageService);

  jobs = signal<PlatformJob[]>([]); dlq = signal<DeadLetterEntry[]>([]); eventDlq = signal<EventDlqEntry[]>([]);
  wfHealth = signal<WorkflowHealthResponse | null>(null);

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.jobsSvc.listJobs().subscribe({ next: d => this.jobs.set(d), error: () => this.jobs.set([]) });
    this.settingsSvc.getDlq().subscribe({ next: d => this.dlq.set(d), error: () => this.dlq.set([]) });
    this.jobsSvc.getEventDlq().subscribe({ next: d => this.eventDlq.set(d), error: () => this.eventDlq.set([]) });
    this.healthSvc.getWorkflowHealth().subscribe({ next: d => this.wfHealth.set(d), error: () => this.wfHealth.set({ status: 'unavailable', activeExecutions: 0, pendingSteps: 0, dlqCount: 0 }) });
  }

  triggerJob(name: string): void {
    this.jobsSvc.triggerJob(name).subscribe({ next: () => this.msgSvc.add({ severity: 'success', summary: 'Job triggered' }), error: () => this.msgSvc.add({ severity: 'error', summary: 'Trigger failed' }) });
  }

  retryEvent(id: string): void {
    this.jobsSvc.retryEventDlq(id).subscribe({ next: () => { this.msgSvc.add({ severity: 'success', summary: 'Retry queued' }); this.loadAll(); }, error: () => this.msgSvc.add({ severity: 'error', summary: 'Retry failed' }) });
  }
}
