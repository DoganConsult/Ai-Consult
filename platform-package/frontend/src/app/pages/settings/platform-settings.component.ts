import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SettingsService, AccessContract, DeadLetterEntry, DlqStats } from '../../core/dos/services/settings.service';
import { HealthService } from '../../core/dos/services/health.service';
import { PlatformAdminService, GovernanceMatrix } from '../../core/dos/services/platform-admin.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-platform-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, TagModule,
    InputTextModule, TabsModule, ToastModule, DialogModule, PageHeaderComponent,
  ],
  providers: [MessageService],
  template: `
    <dos-page-header title="Platform Settings" subtitle="Governance-layered configuration — platform config, access contract, observability, and deployment profile" />
    <p-toast />

    <div class="toolbar">
      <p-button label="Refresh All" icon="pi pi-refresh" (onClick)="loadAll()" [outlined]="true" size="small" />
    </div>

    <p-tabs>
      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-sliders-h"></i> Platform Config</span></ng-template>
        <div class="tab-content">
          <div class="sub-info-bar">Platform-level key-value configuration — owned by platform_super_admin. Changes affect all tenants.</div>
          <div class="config-toolbar">
            <p-button label="Add Config" icon="pi pi-plus" (onClick)="showConfigDialog = true" [outlined]="true" size="small" />
          </div>
          <p-table [value]="platformConfig()" [rows]="20" [paginator]="platformConfig().length > 20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
            <ng-template #header><tr><th>Config Key</th><th>Value</th><th style="width:120px">Actions</th></tr></ng-template>
            <ng-template #body let-c>
              <tr>
                <td class="mono fw-600">{{ c.config_key }}</td>
                <td class="mono muted config-val">{{ c.config_value }}</td>
                <td><p-button icon="pi pi-pencil" (onClick)="editConfig(c)" [text]="true" size="small" pTooltip="Edit" /></td>
              </tr>
            </ng-template>
            <ng-template #emptymessage><tr><td colspan="3" class="empty-msg">No platform config entries</td></tr></ng-template>
          </p-table>
        </div>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-shield"></i> Access Contract</span></ng-template>
        <div class="tab-content">
          <div class="sub-info-bar">Canonical access contract — defines all roles, permissions, and modules known to the platform</div>
          @if (contract()) {
            <div class="contract-header">
              <p-tag [value]="'v' + contract()!.version" severity="info" />
              <span class="contract-stat">{{ contract()!.permissions.length }} permissions</span>
              <span class="contract-stat">{{ contract()!.roles.length }} roles</span>
              <span class="contract-stat">{{ contract()!.modules.length }} modules</span>
            </div>
            <div class="contract-sections">
              <div class="contract-section">
                <h4>Roles</h4>
                <div class="tag-list">
                  @for (role of contract()!.roles; track role) {
                    <p-tag [value]="role" severity="info" />
                  }
                </div>
              </div>
              <div class="contract-section">
                <h4>Modules</h4>
                <div class="tag-list">
                  @for (mod of contract()!.modules; track mod) {
                    <p-tag [value]="mod" />
                  }
                </div>
              </div>
              <div class="contract-section full">
                <h4>Permissions ({{ contract()!.permissions.length }})</h4>
                <div class="perm-grid">
                  @for (perm of contract()!.permissions; track perm) {
                    <span class="perm-code">{{ perm }}</span>
                  }
                </div>
              </div>
            </div>
          } @else {
            <div class="empty-msg">Loading access contract...</div>
          }
        </div>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-sitemap"></i> Governance Matrix</span></ng-template>
        <div class="tab-content">
          <div class="sub-info-bar">Multi-level governance model — defines who controls what at each platform layer</div>
          @if (govMatrix()) {
            <div class="gov-chain">
              <span class="chain-label">Authorization Chain:</span>
              @for (step of govMatrix()!.authorizationChain; track step; let i = $index) {
                <span class="chain-step">{{ step }}</span>
                @if (i < govMatrix()!.authorizationChain.length - 1) { <i class="pi pi-arrow-right chain-arrow"></i> }
              }
            </div>
            <div class="gov-profiles">
              <h4>Access Profiles</h4>
              <div class="tag-list">
                @for (ap of govMatrix()!.accessProfiles; track ap) {
                  <p-tag [value]="ap" severity="info" />
                }
              </div>
            </div>
            <div class="gov-levels">
              @for (level of govMatrix()!.levels; track level.level) {
                <div class="gov-level-card">
                  <div class="gov-level-header">
                    <span class="gov-level-name">{{ level.level | uppercase }}</span>
                    <p-tag [value]="level.governor" severity="secondary" />
                  </div>
                  <div class="gov-controls">
                    @for (ctrl of level.controls; track ctrl) {
                      <span class="gov-ctrl">{{ ctrl }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-msg">Loading governance matrix...</div>
          }
        </div>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-inbox"></i> Dead Letter Queue</span></ng-template>
        <div class="tab-content">
          <div class="sub-info-bar">Failed messages and events — platform-level observability for queue failures</div>
          <div class="dlq-header">
            @if (dlqStats()) {
              <div class="dlq-stat">
                <span class="dlq-val">{{ dlqStats()!.totalMessages }}</span>
                <span class="dlq-label">Total Messages</span>
              </div>
              @for (entry of dlqQueueEntries(); track entry.queue) {
                <div class="dlq-stat">
                  <span class="dlq-val">{{ entry.count }}</span>
                  <span class="dlq-label">{{ entry.queue }}</span>
                </div>
              }
            }
            <p-button label="Refresh DLQ" icon="pi pi-refresh" (onClick)="loadDlq()" [outlined]="true" size="small" class="dlq-refresh" />
          </div>
          <p-table [value]="dlqMessages()" [rows]="20" [paginator]="dlqMessages().length > 20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
            <ng-template #header><tr><th style="width:80px">ID</th><th>Queue</th><th>Error</th><th style="width:80px">Retries</th><th>Failed At</th></tr></ng-template>
            <ng-template #body let-msg>
              <tr>
                <td class="mono">{{ msg.id }}</td>
                <td><p-tag [value]="msg.queue" severity="warn" /></td>
                <td class="error-cell">{{ msg.error }}</td>
                <td>{{ msg.retry_count }}</td>
                <td class="mono">{{ msg.failed_at | date:'short' }}</td>
              </tr>
            </ng-template>
            <ng-template #emptymessage><tr><td colspan="5" class="empty-msg">No dead-letter messages</td></tr></ng-template>
          </p-table>
        </div>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-link"></i> Trace Correlation</span></ng-template>
        <div class="tab-content">
          <div class="sub-info-bar">Cross-service trace lookup — search by correlation ID or OpenTelemetry trace ID</div>
          <div class="trace-search">
            <div class="field">
              <label>Correlation ID</label>
              <div class="search-row">
                <input pInputText [(ngModel)]="traceCorrelationId" placeholder="Enter correlation ID" class="flex-1" />
                <p-button label="Search" icon="pi pi-search" (onClick)="searchByCorrelation()" size="small" />
              </div>
            </div>
            <div class="field">
              <label>OpenTelemetry Trace ID</label>
              <div class="search-row">
                <input pInputText [(ngModel)]="traceOtelId" placeholder="Enter OTEL trace ID" class="flex-1" />
                <p-button label="Search" icon="pi pi-search" (onClick)="searchByOtel()" size="small" />
              </div>
            </div>
          </div>
          @if (traceResult()) {
            <div class="trace-result">
              <h4>Trace Result</h4>
              <pre class="json-block">{{ traceResult() | json }}</pre>
            </div>
          }
        </div>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-server"></i> Deployment Info</span></ng-template>
        <div class="tab-content">
          <div class="sub-info-bar">Runtime deployment profile — environment, version, memory, and uptime</div>
          <div class="deploy-grid">
            @for (kv of deployInfo(); track kv.key) {
              <div class="deploy-row">
                <span class="deploy-key">{{ kv.key }}</span>
                <span class="deploy-val">{{ kv.value }}</span>
              </div>
            }
            @if (deployInfo().length === 0) {
              <div class="empty-msg">Loading deployment info...</div>
            }
          </div>
        </div>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-user"></i> My Profile</span></ng-template>
        <div class="tab-content">
          <div class="sub-info-bar">Authenticated user profile — your identity in the platform</div>
          @if (profile()) {
            <div class="profile-grid">
              @for (kv of profileKv(); track kv.key) {
                <div class="deploy-row">
                  <span class="deploy-key">{{ kv.key }}</span>
                  <span class="deploy-val">{{ kv.value }}</span>
                </div>
              }
            </div>
          } @else {
            <div class="empty-msg">Loading profile...</div>
          }
        </div>
      </p-tabpanel>
    </p-tabs>

    <p-dialog header="Platform Config" [(visible)]="showConfigDialog" [modal]="true" [style]="{width:'500px'}">
      <div class="dialog-form">
        <div class="field"><label>Config Key</label><input pInputText [(ngModel)]="configForm.key" placeholder="e.g. platform.max_tenants" class="w-full" /></div>
        <div class="field"><label>Config Value</label><input pInputText [(ngModel)]="configForm.value" placeholder="Value" class="w-full" /></div>
      </div>
      <ng-template #footer>
        <p-button label="Cancel" (onClick)="showConfigDialog = false" [text]="true" />
        <p-button label="Save" icon="pi pi-check" (onClick)="saveConfig()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin: 20px 0 0; }
    .tab-content { padding: 16px 0; }
    .sub-info-bar { font-size: 12px; color: var(--dos-text-muted); font-style: italic; margin-bottom: 12px; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid var(--dos-border); }
    .config-toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
    .config-val { max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .contract-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    .contract-stat { font-size: 13px; color: var(--dos-text-muted); }
    .contract-sections { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .contract-section.full { grid-column: 1 / -1; }
    .contract-section { background: var(--dos-surface); border: 1px solid var(--dos-border); border-radius: var(--dos-radius); padding: 16px; }
    .contract-section h4 { font-size: 13px; font-weight: 700; margin: 0 0 10px; }
    .tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .perm-grid { display: flex; flex-wrap: wrap; gap: 4px; max-height: 300px; overflow-y: auto; }
    .perm-code { font-family: monospace; font-size: 11px; background: var(--dos-bg); padding: 2px 6px; border-radius: 3px; }

    .gov-chain { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; padding: 12px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; }
    .chain-label { font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; }
    .chain-step { font-size: 12px; font-weight: 600; padding: 4px 10px; background: #dcfce7; border-radius: 12px; color: #166534; }
    .chain-arrow { font-size: 10px; color: #16a34a; }
    .gov-profiles { margin-bottom: 20px; }
    .gov-profiles h4 { font-size: 13px; font-weight: 700; margin: 0 0 8px; }
    .gov-levels { display: flex; flex-direction: column; gap: 12px; }
    .gov-level-card { background: var(--dos-surface); border: 1px solid var(--dos-border); border-radius: var(--dos-radius); padding: 16px; }
    .gov-level-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .gov-level-name { font-size: 14px; font-weight: 800; letter-spacing: 0.04em; }
    .gov-controls { display: flex; flex-wrap: wrap; gap: 6px; }
    .gov-ctrl { font-size: 11px; padding: 3px 8px; background: var(--dos-bg); border-radius: 4px; color: var(--dos-text-muted); }

    .dlq-header { display: flex; align-items: center; gap: 24px; margin-bottom: 16px; flex-wrap: wrap; }
    .dlq-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .dlq-val { font-size: 24px; font-weight: 800; }
    .dlq-label { font-size: 11px; font-weight: 600; color: var(--dos-text-muted); text-transform: uppercase; }
    .dlq-refresh { margin-left: auto; }
    .error-cell { font-size: 12px; color: #dc2626; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .trace-search { display: flex; flex-direction: column; gap: 16px; max-width: 600px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 13px; font-weight: 600; color: #475569; }
    .search-row { display: flex; gap: 8px; }
    .flex-1 { flex: 1; }
    .trace-result { margin-top: 20px; }
    .trace-result h4 { font-size: 14px; font-weight: 700; margin: 0 0 8px; }
    .json-block { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; font-size: 12px; max-height: 400px; overflow: auto; white-space: pre-wrap; }

    .deploy-grid { display: flex; flex-direction: column; gap: 10px; max-width: 600px; }
    .deploy-row { display: flex; justify-content: space-between; padding: 10px 16px; background: var(--dos-surface); border: 1px solid var(--dos-border); border-radius: 6px; }
    .deploy-key { font-size: 13px; font-weight: 600; }
    .deploy-val { font-size: 13px; font-family: monospace; color: var(--dos-text-muted); }
    .profile-grid { max-width: 600px; display: flex; flex-direction: column; gap: 10px; }

    .dialog-form { display: flex; flex-direction: column; gap: 16px; padding-top: 8px; }
    .w-full { width: 100%; }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; } .muted { color: var(--dos-text-muted); }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }

    @media (max-width: 768px) {
      .contract-sections { grid-template-columns: 1fr; }
      .dlq-header { flex-direction: column; align-items: flex-start; }
    }
  `],
})
export class PlatformSettingsComponent implements OnInit {
  private settingsSvc = inject(SettingsService);
  private healthSvc = inject(HealthService);
  private adminSvc = inject(PlatformAdminService);
  private msg = inject(MessageService);

  platformConfig = signal<any[]>([]);
  contract = signal<AccessContract | null>(null);
  govMatrix = signal<GovernanceMatrix | null>(null);
  dlqMessages = signal<DeadLetterEntry[]>([]);
  dlqStats = signal<DlqStats | null>(null);
  dlqQueueEntries = signal<Array<{ queue: string; count: number }>>([]);
  traceCorrelationId = '';
  traceOtelId = '';
  traceResult = signal<any>(null);
  deployInfo = signal<Array<{ key: string; value: string }>>([]);
  profile = signal<any>(null);
  profileKv = signal<Array<{ key: string; value: string }>>([]);

  showConfigDialog = false;
  configForm = { key: '', value: '' };

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.adminSvc.getPlatformConfig().subscribe({ next: d => this.platformConfig.set(d), error: () => this.platformConfig.set([]) });
    this.settingsSvc.getAccessContract().subscribe({ next: d => this.contract.set(d), error: () => {} });
    this.adminSvc.getGovernanceMatrix().subscribe({ next: d => this.govMatrix.set(d), error: () => {} });
    this.loadDlq();
    this.healthSvc.getHealth().subscribe({
      next: d => {
        this.deployInfo.set([
          { key: 'Status', value: d.status },
          { key: 'Version', value: d.version },
          { key: 'Uptime', value: `${Math.floor((d.uptime || 0) / 3600)}h ${Math.floor(((d.uptime || 0) % 3600) / 60)}m` },
          { key: 'Heap Used', value: `${d.memory?.heapUsedMB || 0} MB` },
          { key: 'Heap Total', value: `${d.memory?.heapTotalMB || 0} MB` },
          { key: 'RSS', value: `${d.memory?.rssMB || 0} MB` },
          { key: 'Timestamp', value: d.timestamp },
        ]);
      },
      error: () => {},
    });
    this.settingsSvc.getMyProfile().subscribe({
      next: d => {
        this.profile.set(d);
        if (d && typeof d === 'object') {
          this.profileKv.set(Object.entries(d).filter(([, v]) => typeof v !== 'object').map(([k, v]) => ({ key: k.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), value: String(v) })));
        }
      },
      error: () => {},
    });
  }

  loadDlq(): void {
    this.settingsSvc.getDlq().subscribe({ next: d => this.dlqMessages.set(d), error: () => this.dlqMessages.set([]) });
    this.settingsSvc.getDlqStats().subscribe({
      next: d => {
        this.dlqStats.set(d);
        if (d?.byQueue) { this.dlqQueueEntries.set(Object.entries(d.byQueue).map(([queue, count]) => ({ queue, count: count as number }))); }
      },
      error: () => this.dlqStats.set(null),
    });
  }

  editConfig(c: any): void {
    this.configForm = { key: c.config_key, value: typeof c.config_value === 'string' ? c.config_value : JSON.stringify(c.config_value) };
    this.showConfigDialog = true;
  }

  saveConfig(): void {
    if (!this.configForm.key) return;
    this.adminSvc.updatePlatformConfig(this.configForm.key, this.configForm.value).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: `Config "${this.configForm.key}" saved` }); this.showConfigDialog = false; this.configForm = { key: '', value: '' }; this.adminSvc.getPlatformConfig().subscribe({ next: d => this.platformConfig.set(d), error: () => {} }); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed to save config' }),
    });
  }

  searchByCorrelation(): void {
    if (!this.traceCorrelationId) return;
    this.settingsSvc.getTraceByCorrelationId(this.traceCorrelationId).subscribe({ next: d => this.traceResult.set(d), error: () => this.msg.add({ severity: 'error', summary: 'Trace not found' }) });
  }

  searchByOtel(): void {
    if (!this.traceOtelId) return;
    this.settingsSvc.getTraceByOtel(this.traceOtelId).subscribe({ next: d => this.traceResult.set(d), error: () => this.msg.add({ severity: 'error', summary: 'Trace not found' }) });
  }
}
