import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { HasPermissionDirective } from '../../core/dauth/directives/has-permission.directive';
import { LowcodeService } from '../../core/dos/services/lowcode.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-workflow-designer',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, TagModule, ButtonModule, InputTextModule, TextareaModule, SelectModule, DialogModule, ToastModule, PageHeaderComponent, HasPermissionDirective],
  providers: [MessageService],
  template: `
    <dos-page-header title="Workflow Designer" subtitle="Author declarative workflows (steps + transitions) — stored in workflow_specs" />
    <p-toast />
    <div class="toolbar">
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="load()" [outlined]="true" size="small" />
      <p-button *dosHasPermission="['platform.config.write','platform.schema.manage']" label="New Workflow" icon="pi pi-plus" (onClick)="openNew()" size="small" />
    </div>
    <p-table [value]="rows()" [rows]="30" [paginator]="rows().length > 30" styleClass="p-datatable-sm p-datatable-striped">
      <ng-template #header>
        <tr><th>Code</th><th>Name</th><th style="width:120px">Trigger</th><th style="width:100px">Status</th><th style="width:90px">Version</th><th style="width:180px">Actions</th></tr>
      </ng-template>
      <ng-template #body let-r>
        <tr>
          <td class="mono fw-600">{{ r.code }}</td>
          <td>{{ r.name }}</td>
          <td><p-tag [value]="r.trigger_type" severity="info" /></td>
          <td><p-tag [value]="r.status" [severity]="r.status === 'published' ? 'success' : 'secondary'" /></td>
          <td class="mono">v{{ r.version }}</td>
          <td>
            <p-button *dosHasPermission="['platform.config.write','platform.schema.manage']" icon="pi pi-pencil" (onClick)="openEdit(r)" [text]="true" size="small" />
            <p-button *dosHasPermission="'platform.schema.manage'" icon="pi pi-trash" (onClick)="remove(r)" [text]="true" size="small" severity="danger" />
          </td>
        </tr>
      </ng-template>
      <ng-template #emptymessage><tr><td colspan="6" class="empty-msg">No workflows defined</td></tr></ng-template>
    </p-table>

    <p-dialog [header]="form.mode === 'edit' ? 'Edit Workflow' : 'New Workflow'" [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '780px' }">
      <div class="grid">
        <label>Code <input pInputText [(ngModel)]="form.code" [disabled]="form.mode === 'edit'" /></label>
        <label>Name <input pInputText [(ngModel)]="form.name" /></label>
        <label>Trigger Type <p-select [(ngModel)]="form.trigger_type" [options]="triggers" optionLabel="label" optionValue="value" /></label>
        <label>Status <p-select [(ngModel)]="form.status" [options]="statuses" optionLabel="label" optionValue="value" /></label>
        <label class="full">Description <input pInputText [(ngModel)]="form.description" /></label>
        <label class="full">Trigger Config (JSON) <textarea pTextarea rows="3" [(ngModel)]="form.triggerRaw" class="mono"></textarea></label>
        <label class="full">Spec (JSON — steps + transitions) <textarea pTextarea rows="14" [(ngModel)]="form.specRaw" class="mono"></textarea></label>
      </div>
      <small class="help">Example: <code>{{ example }}</code></small>
      @if (parseError()) { <div class="err">{{ parseError() }}</div> }
      <div class="actions">
        <p-button label="Cancel" (onClick)="dialogOpen = false" [text]="true" />
        <p-button label="Save" icon="pi pi-check" (onClick)="save()" [disabled]="!form.code || !form.name" />
      </div>
    </p-dialog>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin: 20px 0 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .grid label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 600; }
    .grid label.full { grid-column: 1 / span 2; }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
    .err { color: #dc2626; font-size: 12px; margin-top: 8px; }
    .help { color: var(--dos-text-muted); font-size: 11px; margin-top: 10px; display: block; }
    .help code { background: var(--dos-bg); padding: 1px 4px; border-radius: 3px; font-family: monospace; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
  `],
})
export class WorkflowDesignerComponent implements OnInit {
  private svc = inject(LowcodeService);
  private msg = inject(MessageService);

  rows = signal<any[]>([]);
  dialogOpen = false;
  parseError = signal<string | null>(null);
  triggers = [
    { label: 'Manual', value: 'manual' }, { label: 'Event', value: 'event' },
    { label: 'Cron', value: 'cron' }, { label: 'Endpoint', value: 'endpoint' },
  ];
  statuses = [
    { label: 'Draft', value: 'draft' }, { label: 'Published', value: 'published' }, { label: 'Archived', value: 'archived' },
  ];
  example = '{"steps":[{"code":"review","label":"Review","type":"task"}],"transitions":[{"from":"start","to":"review"}]}';

  form = {
    mode: 'new' as 'new' | 'edit',
    code: '', name: '', description: '',
    trigger_type: 'manual' as 'manual' | 'event' | 'cron' | 'endpoint',
    status: 'draft' as 'draft' | 'published' | 'archived',
    triggerRaw: '{}',
    specRaw: '{\n  "steps": [],\n  "transitions": []\n}',
  };

  ngOnInit(): void { this.load(); }
  load(): void { this.svc.listWorkflows().subscribe({ next: d => this.rows.set(d), error: () => this.rows.set([]) }); }

  openNew(): void {
    this.form = { mode: 'new', code: '', name: '', description: '', trigger_type: 'manual',
      status: 'draft', triggerRaw: '{}', specRaw: '{\n  "steps": [],\n  "transitions": []\n}' };
    this.parseError.set(null);
    this.dialogOpen = true;
  }
  openEdit(r: any): void {
    this.form = {
      mode: 'edit', code: r.code, name: r.name, description: r.description ?? '',
      trigger_type: r.trigger_type, status: r.status,
      triggerRaw: JSON.stringify(r.trigger_config || {}, null, 2),
      specRaw: JSON.stringify(r.spec || { steps: [], transitions: [] }, null, 2),
    };
    this.parseError.set(null);
    this.dialogOpen = true;
  }
  save(): void {
    let spec: any; let triggerConfig: any;
    try {
      spec = JSON.parse(this.form.specRaw || '{}');
      triggerConfig = JSON.parse(this.form.triggerRaw || '{}');
    } catch (e: any) { this.parseError.set(`Invalid JSON: ${e?.message}`); return; }
    const payload = {
      code: this.form.code, name: this.form.name, description: this.form.description,
      spec, trigger_type: this.form.trigger_type, trigger_config: triggerConfig, status: this.form.status,
    };
    const obs = this.form.mode === 'edit' ? this.svc.updateWorkflow(this.form.code, payload) : this.svc.createWorkflow(payload);
    obs.subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: `${this.form.code} saved` }); this.dialogOpen = false; this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Save failed' }),
    });
  }
  remove(r: any): void {
    if (!confirm(`Delete workflow "${r.code}"?`)) return;
    this.svc.deleteWorkflow(r.code).subscribe({
      next: () => { this.msg.add({ severity: 'warn', summary: `${r.code} deleted` }); this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Delete failed' }),
    });
  }
}
