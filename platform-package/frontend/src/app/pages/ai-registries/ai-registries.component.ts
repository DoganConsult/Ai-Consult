import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PlatformAdminService } from '../../core/dos/services/platform-admin.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-ai-registries',
  standalone: true,
  imports: [CommonModule, TableModule, TabsModule, TagModule, ButtonModule, PageHeaderComponent],
  template: `
    <dos-page-header title="AI Registries" subtitle="Models, agents, and prompts registered in the platform" />
    <div class="toolbar">
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="load()" [outlined]="true" size="small" />
    </div>
    <p-tabs>
      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-microchip"></i> Models</span></ng-template>
        <p-table [value]="models()" [rows]="30" [paginator]="models().length > 30" styleClass="p-datatable-sm p-datatable-striped">
          <ng-template #header><tr><th>Provider</th><th>Model Code</th><th>Name</th><th>Capabilities</th><th style="width:100px">Status</th></tr></ng-template>
          <ng-template #body let-m>
            <tr>
              <td class="mono">{{ m.provider }}</td>
              <td class="mono fw-600">{{ m.model_code }}</td>
              <td>{{ m.name || '' }}</td>
              <td class="mono small">{{ fmt(m.capabilities) }}</td>
              <td><p-tag [value]="m.status || 'unknown'" [severity]="m.status === 'enabled' ? 'success' : 'secondary'" /></td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="5" class="empty-msg">No AI models registered</td></tr></ng-template>
        </p-table>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-android"></i> Agents</span></ng-template>
        <p-table [value]="agents()" [rows]="30" [paginator]="agents().length > 30" styleClass="p-datatable-sm p-datatable-striped">
          <ng-template #header><tr><th>Agent Code</th><th>Name</th><th>Description</th><th style="width:100px">Status</th></tr></ng-template>
          <ng-template #body let-a>
            <tr>
              <td class="mono fw-600">{{ a.agent_code }}</td>
              <td>{{ a.name || '' }}</td>
              <td>{{ a.description || '' }}</td>
              <td><p-tag [value]="a.status || 'unknown'" [severity]="a.status === 'enabled' ? 'success' : 'secondary'" /></td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="4" class="empty-msg">No AI agents registered</td></tr></ng-template>
        </p-table>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-comment"></i> Prompts</span></ng-template>
        <p-table [value]="prompts()" [rows]="30" [paginator]="prompts().length > 30" styleClass="p-datatable-sm p-datatable-striped">
          <ng-template #header><tr><th>Prompt Code</th><th>Name</th><th>Version</th><th>Description</th></tr></ng-template>
          <ng-template #body let-p>
            <tr>
              <td class="mono fw-600">{{ p.prompt_code }}</td>
              <td>{{ p.name || '' }}</td>
              <td class="mono">{{ p.version || 'v1' }}</td>
              <td>{{ p.description || '' }}</td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="4" class="empty-msg">No prompts registered</td></tr></ng-template>
        </p-table>
      </p-tabpanel>
    </p-tabs>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin: 20px 0 12px; }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; } .small { font-size: 12px; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
  `],
})
export class AiRegistriesComponent implements OnInit {
  private svc = inject(PlatformAdminService);
  models = signal<any[]>([]);
  agents = signal<any[]>([]);
  prompts = signal<any[]>([]);

  ngOnInit(): void { this.load(); }
  load(): void {
    this.svc.getAiModels().subscribe({ next: d => this.models.set(d), error: () => this.models.set([]) });
    this.svc.getAiAgents().subscribe({ next: d => this.agents.set(d), error: () => this.agents.set([]) });
    this.svc.getAiPrompts().subscribe({ next: d => this.prompts.set(d), error: () => this.prompts.set([]) });
  }
  fmt(v: any): string { try { return typeof v === 'string' ? v : JSON.stringify(v); } catch { return ''; } }
}
