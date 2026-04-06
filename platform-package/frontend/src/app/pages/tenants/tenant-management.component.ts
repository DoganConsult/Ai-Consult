import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { TenantService, ProvisioningJob, SchemaStatus, SchemaDrift } from '../../core/dos/services/tenant.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-tenant-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, TagModule,
    DialogModule, InputTextModule, MessageModule, ConfirmDialogModule, ToastModule,
    PageHeaderComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <dos-page-header title="Tenant Management" subtitle="Provisioning, schema governance, and tenant lifecycle" />
    <p-toast />
    <p-confirmDialog />

    <div class="toolbar">
      <p-button label="Provision New Tenant" icon="pi pi-plus" (onClick)="showProvisionDialog = true" size="small" />
      <p-button label="Check Schema Drift" icon="pi pi-sync" (onClick)="checkDrift()" [outlined]="true" size="small" [loading]="driftLoading()" />
      <p-button label="Catch-Up All" icon="pi pi-forward" (onClick)="catchUpAll()" [outlined]="true" size="small" severity="warn" />
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="loadAll()" [outlined]="true" size="small" />
    </div>

    @if (drift() && drift()!.hasDrift) {
      <p-message severity="warn" styleClass="w-full mt-12">
        <ng-template #messageicon><i class="pi pi-exclamation-triangle"></i></ng-template>
        Schema drift detected in {{ drift()!.tenants.length }} tenant(s)
      </p-message>
    }

    <div class="section">
      <h3>Provisioning Jobs</h3>
      <p-table [value]="jobs()" [rows]="20" [paginator]="jobs().length > 20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
        <ng-template #header>
          <tr>
            <th>Tenant Code</th>
            <th style="width: 120px">Status</th>
            <th>Started</th>
            <th>Completed</th>
            <th style="width: 80px">Stages</th>
            <th style="width: 140px">Actions</th>
          </tr>
        </ng-template>
        <ng-template #body let-job>
          <tr>
            <td class="fw-600">{{ job.tenantCode }}</td>
            <td><p-tag [value]="job.status" [severity]="jobSeverity(job.status)" /></td>
            <td class="mono">{{ job.startedAt | date:'short' }}</td>
            <td class="mono">{{ job.completedAt ? (job.completedAt | date:'short') : '--' }}</td>
            <td>{{ job.stages?.length || 0 }}</td>
            <td>
              @if (job.status === 'failed') {
                <p-button icon="pi pi-replay" (onClick)="retryJob(job.id)" [text]="true" size="small" severity="warn" pTooltip="Retry" />
              }
              <p-button icon="pi pi-eye" (onClick)="viewJob(job)" [text]="true" size="small" pTooltip="View" />
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr><td colspan="6" class="empty-msg">No provisioning jobs found</td></tr>
        </ng-template>
      </p-table>
    </div>

    <div class="section">
      <h3>Schema Status</h3>
      <p-table [value]="schemas()" [rows]="20" [paginator]="schemas().length > 20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
        <ng-template #header>
          <tr>
            <th>Tenant ID</th>
            <th>Schema</th>
            <th style="width: 100px">Applied</th>
            <th style="width: 100px">Available</th>
            <th style="width: 100px">Drift</th>
            <th style="width: 140px">Actions</th>
          </tr>
        </ng-template>
        <ng-template #body let-s>
          <tr>
            <td class="fw-600">{{ s.tenantId }}</td>
            <td class="mono">{{ s.schemaName }}</td>
            <td>{{ s.migrationsApplied }}</td>
            <td>{{ s.migrationsAvailable }}</td>
            <td>
              <p-tag [value]="s.isDrifted ? 'DRIFTED' : 'OK'" [severity]="s.isDrifted ? 'danger' : 'success'" />
            </td>
            <td>
              @if (s.migrationsApplied < s.migrationsAvailable) {
                <p-button icon="pi pi-forward" label="Catch-Up" (onClick)="catchUpTenant(s.tenantId)" [text]="true" size="small" severity="warn" />
              }
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr><td colspan="6" class="empty-msg">No schema data available</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog header="Provision New Tenant" [(visible)]="showProvisionDialog" [modal]="true" [style]="{width: '480px'}">
      <div class="dialog-form">
        <div class="field">
          <label>Tenant Code</label>
          <input pInputText [(ngModel)]="newTenant.code" placeholder="e.g. acme-corp" class="w-full" />
        </div>
        <div class="field">
          <label>Admin Email</label>
          <input pInputText [(ngModel)]="newTenant.email" type="email" placeholder="admin&#64;tenant.com" class="w-full" />
        </div>
        <div class="field">
          <label>Admin Password (optional)</label>
          <input pInputText [(ngModel)]="newTenant.password" type="password" placeholder="Auto-generated if empty" class="w-full" />
        </div>
        @if (provisionError()) {
          <p-message severity="error" [text]="provisionError()" styleClass="w-full" />
        }
      </div>
      <ng-template #footer>
        <p-button label="Cancel" (onClick)="showProvisionDialog = false" [text]="true" />
        <p-button label="Provision" icon="pi pi-check" (onClick)="provision()" [loading]="provisionLoading()" />
      </ng-template>
    </p-dialog>

    <p-dialog header="Job Details" [(visible)]="showJobDetail" [modal]="true" [style]="{width: '600px'}">
      @if (selectedJob()) {
        <div class="detail-grid">
          <div class="detail-row"><span class="detail-key">Job ID</span><span class="detail-val mono">{{ selectedJob()!.id }}</span></div>
          <div class="detail-row"><span class="detail-key">Tenant</span><span class="detail-val">{{ selectedJob()!.tenantCode }}</span></div>
          <div class="detail-row"><span class="detail-key">Status</span><span class="detail-val"><p-tag [value]="selectedJob()!.status" [severity]="jobSeverity(selectedJob()!.status)" /></span></div>
          @if (selectedJob()!.error) {
            <div class="detail-row"><span class="detail-key">Error</span><span class="detail-val error-text">{{ selectedJob()!.error }}</span></div>
          }
          <h4>Stages</h4>
          @for (stage of selectedJob()!.stages || []; track $index) {
            <div class="stage-row">
              <span class="stage-name">{{ stage.name || stage }}</span>
              <span class="stage-status">{{ stage.status || 'unknown' }}</span>
            </div>
          }
        </div>
      }
    </p-dialog>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin-top: 20px; flex-wrap: wrap; }
    .section { margin-top: 24px; }
    .section h3 { font-size: 15px; font-weight: 700; margin: 0 0 12px; }
    .fw-600 { font-weight: 600; }
    .mono { font-family: monospace; font-size: 13px; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
    .mt-12 { margin-top: 12px; }
    .w-full { width: 100%; }

    .dialog-form { display: flex; flex-direction: column; gap: 16px; padding: 8px 0; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 13px; font-weight: 600; color: #475569; }

    .detail-grid { display: flex; flex-direction: column; gap: 10px; }
    .detail-row { display: flex; gap: 12px; }
    .detail-key { font-size: 13px; font-weight: 600; width: 100px; flex-shrink: 0; }
    .detail-val { font-size: 13px; }
    .error-text { color: #dc2626; }
    h4 { font-size: 14px; font-weight: 700; margin: 12px 0 4px; }
    .stage-row { display: flex; justify-content: space-between; padding: 6px 12px; background: var(--dos-bg); border-radius: 4px; font-size: 13px; }
    .stage-name { font-weight: 600; }
    .stage-status { text-transform: uppercase; font-size: 12px; }
  `],
})
export class TenantManagementComponent implements OnInit {
  private tenantSvc = inject(TenantService);
  private msg = inject(MessageService);

  jobs = signal<ProvisioningJob[]>([]);
  schemas = signal<SchemaStatus[]>([]);
  drift = signal<SchemaDrift | null>(null);
  driftLoading = signal(false);
  selectedJob = signal<ProvisioningJob | null>(null);

  showProvisionDialog = false;
  showJobDetail = false;
  newTenant = { code: '', email: '', password: '' };
  provisionError = signal('');
  provisionLoading = signal(false);

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.tenantSvc.getProvisioningJobs().subscribe({
      next: (data) => this.jobs.set(data),
      error: () => this.jobs.set([]),
    });
    this.tenantSvc.getSchemaStatus().subscribe({
      next: (data) => this.schemas.set(data),
      error: () => this.schemas.set([]),
    });
  }

  jobSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    if (status === 'completed' || status === 'done') return 'success';
    if (status === 'running' || status === 'in_progress') return 'info';
    if (status === 'failed' || status === 'error') return 'danger';
    return 'warn';
  }

  provision(): void {
    this.provisionError.set('');
    if (!this.newTenant.code || !this.newTenant.email) {
      this.provisionError.set('Tenant code and admin email are required');
      return;
    }
    this.provisionLoading.set(true);
    this.tenantSvc.seedBaseline({
      tenantCode: this.newTenant.code,
      adminEmail: this.newTenant.email,
      adminPassword: this.newTenant.password || undefined,
    }).subscribe({
      next: () => {
        this.showProvisionDialog = false;
        this.newTenant = { code: '', email: '', password: '' };
        this.provisionLoading.set(false);
        this.msg.add({ severity: 'success', summary: 'Provisioning Started', detail: 'Tenant provisioning job has been queued' });
        this.loadAll();
      },
      error: (err) => {
        this.provisionError.set(err?.error?.message || 'Provisioning failed');
        this.provisionLoading.set(false);
      },
    });
  }

  retryJob(jobId: string): void {
    this.tenantSvc.retryJob(jobId).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Retry Queued', detail: 'Job retry has been scheduled' });
        this.loadAll();
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Retry Failed' }),
    });
  }

  viewJob(job: ProvisioningJob): void {
    this.selectedJob.set(job);
    this.showJobDetail = true;
  }

  checkDrift(): void {
    this.driftLoading.set(true);
    this.tenantSvc.getSchemaDrift().subscribe({
      next: (data) => { this.drift.set(data); this.driftLoading.set(false); },
      error: () => { this.drift.set(null); this.driftLoading.set(false); },
    });
  }

  catchUpTenant(tenantId: string): void {
    this.tenantSvc.catchUpTenant(tenantId).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Catch-Up Complete', detail: `Tenant ${tenantId} schema updated` });
        this.loadAll();
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Catch-Up Failed' }),
    });
  }

  catchUpAll(): void {
    this.tenantSvc.catchUpAll().subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Catch-Up All Complete' });
        this.loadAll();
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Catch-Up Failed' }),
    });
  }
}
