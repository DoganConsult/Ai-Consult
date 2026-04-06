import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { HealthService } from '../../core/dos/services/health.service';
import { PlatformAdminService } from '../../core/dos/services/platform-admin.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-ai-governance',
  standalone: true,
  imports: [CommonModule, TagModule, ButtonModule, TabsModule, TableModule, PageHeaderComponent],
  template: `
    <dos-page-header title="AI Governance" subtitle="Model registry, agent registry, prompt registry, gateway health, and policy enforcement" />

    <div class="toolbar">
      <p-button label="Refresh All" icon="pi pi-refresh" (onClick)="load()" [outlined]="true" size="small" />
    </div>

    <p-tabs>
      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-microchip"></i> AI Gateway Health</span></ng-template>
        <div class="tab-body">
          <div class="sub-info-bar">Gateway runtime status — provider connectivity, model availability, and health probes</div>
          @if (gatewayHealth()) {
            <div class="kv-grid">
              @for (kv of gatewayKv(); track kv.key) {
                <div class="kv-card"><span class="kv-key">{{ kv.key }}</span><span class="kv-val">{{ kv.value }}</span></div>
              }
            </div>
          } @else {
            <div class="empty-msg">AI gateway not available or not configured</div>
          }
        </div>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-database"></i> Model Registry</span></ng-template>
        <div class="tab-body">
          <div class="sub-info-bar">Registered AI models — provider, model code, status, and tenant allowlists</div>
          <p-table [value]="models()" [rows]="20" [paginator]="models().length > 20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
            <ng-template #header><tr><th>Provider</th><th>Model Code</th><th>Status</th><th>Capabilities</th></tr></ng-template>
            <ng-template #body let-m>
              <tr>
                <td><p-tag [value]="m.provider || '--'" severity="info" /></td>
                <td class="mono fw-600">{{ m.model_code || m.code || '--' }}</td>
                <td><p-tag [value]="m.status || 'registered'" [severity]="m.status === 'active' || m.status === 'approved' ? 'success' : 'secondary'" /></td>
                <td class="muted">{{ m.capabilities || m.description || '--' }}</td>
              </tr>
            </ng-template>
            <ng-template #emptymessage><tr><td colspan="4" class="empty-msg">No models in registry</td></tr></ng-template>
          </p-table>
        </div>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-box"></i> Agent Registry</span></ng-template>
        <div class="tab-body">
          <div class="sub-info-bar">Registered AI agents — agent code, domain, status, and runtime bindings</div>
          <p-table [value]="agents()" [rows]="20" [paginator]="agents().length > 20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
            <ng-template #header><tr><th>Agent Code</th><th>Name</th><th>Domain</th><th>Status</th></tr></ng-template>
            <ng-template #body let-a>
              <tr>
                <td class="mono fw-600">{{ a.agent_code || a.id || '--' }}</td>
                <td>{{ a.name || a.agent_code || '--' }}</td>
                <td><p-tag [value]="a.domain || 'general'" /></td>
                <td><p-tag [value]="a.status || 'registered'" [severity]="a.status === 'active' ? 'success' : 'secondary'" /></td>
              </tr>
            </ng-template>
            <ng-template #emptymessage><tr><td colspan="4" class="empty-msg">No agents registered</td></tr></ng-template>
          </p-table>
        </div>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-file"></i> Prompt Registry</span></ng-template>
        <div class="tab-body">
          <div class="sub-info-bar">Registered prompt templates — versioned, governed, and tenant-scoped</div>
          <p-table [value]="prompts()" [rows]="20" [paginator]="prompts().length > 20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
            <ng-template #header><tr><th>Prompt Code</th><th>Version</th><th>Category</th><th>Status</th></tr></ng-template>
            <ng-template #body let-p>
              <tr>
                <td class="mono fw-600">{{ p.prompt_code || p.code || '--' }}</td>
                <td>{{ p.version || 'v1' }}</td>
                <td><p-tag [value]="p.category || 'general'" severity="info" /></td>
                <td><p-tag [value]="p.status || 'active'" [severity]="p.status === 'active' ? 'success' : 'secondary'" /></td>
              </tr>
            </ng-template>
            <ng-template #emptymessage><tr><td colspan="4" class="empty-msg">No prompts in registry</td></tr></ng-template>
          </p-table>
        </div>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-bolt"></i> AI Diagnostics</span></ng-template>
        <div class="tab-body">
          <div class="sub-info-bar">Runtime AI diagnostics — provider latency, error rates, and fallback status</div>
          @if (diagnostics()) {
            <pre class="json-block">{{ diagnostics() | json }}</pre>
          } @else {
            <div class="empty-msg">No AI diagnostics data</div>
          }
        </div>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-shield"></i> Policy & Allowlists</span></ng-template>
        <div class="tab-body">
          <div class="info-block">
            <i class="pi pi-info-circle"></i>
            <span>AI governance policies, model allowlists, and approval queues are enforced through the platform AI registry tables. Configure providers, models, and tenant allowlists through the database seed or admin API.</span>
          </div>
        </div>
      </p-tabpanel>
    </p-tabs>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin: 20px 0 0; }
    .tab-body { padding: 16px 0; }
    .sub-info-bar { font-size: 12px; color: var(--dos-text-muted); font-style: italic; margin-bottom: 12px; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid var(--dos-border); }
    .kv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; margin-top: 16px; }
    .kv-card { display: flex; justify-content: space-between; padding: 12px 16px; background: var(--dos-surface); border: 1px solid var(--dos-border); border-radius: 8px; }
    .kv-key { font-size: 13px; font-weight: 600; } .kv-val { font-size: 13px; font-family: monospace; color: var(--dos-text-muted); }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; } .muted { color: var(--dos-text-muted); }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
    .info-block { display: flex; align-items: flex-start; gap: 10px; padding: 14px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 13px; color: #1e40af; }
    .json-block { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; font-size: 12px; max-height: 500px; overflow: auto; white-space: pre-wrap; }
  `],
})
export class AiGovernanceComponent implements OnInit {
  private http = inject(HttpClient);
  private healthSvc = inject(HealthService);
  private adminSvc = inject(PlatformAdminService);

  gatewayHealth = signal<any>(null);
  gatewayKv = signal<Array<{ key: string; value: string }>>([]);
  diagnostics = signal<any>(null);
  models = signal<any[]>([]);
  agents = signal<any[]>([]);
  prompts = signal<any[]>([]);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.http.get(`${environment.apiUrl}/platform/ai-gateway/health`).subscribe({
      next: d => {
        this.gatewayHealth.set(d);
        if (d && typeof d === 'object') {
          this.gatewayKv.set(Object.entries(d).filter(([, v]) => typeof v !== 'object').map(([k, v]) => ({ key: k.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), value: String(v) })));
        }
      },
      error: () => this.gatewayHealth.set(null),
    });
    this.healthSvc.getAiDiagnostics().subscribe({ next: d => this.diagnostics.set(d), error: () => {} });
    this.adminSvc.getAiModels().subscribe({ next: d => this.models.set(d), error: () => this.models.set([]) });
    this.adminSvc.getAiAgents().subscribe({ next: d => this.agents.set(d), error: () => this.agents.set([]) });
    this.adminSvc.getAiPrompts().subscribe({ next: d => this.prompts.set(d), error: () => this.prompts.set([]) });
  }
}
