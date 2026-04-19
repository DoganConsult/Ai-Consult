import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { HasPermissionDirective } from '../../core/dauth/directives/has-permission.directive';
import { LowcodeService, EndpointSpec, EndpointMethod, HandlerType } from '../../core/dos/services/lowcode.service';

const METHODS: Array<{ label: string; value: EndpointMethod }> = [
  { label: 'GET', value: 'GET' }, { label: 'POST', value: 'POST' },
  { label: 'PATCH', value: 'PATCH' }, { label: 'PUT', value: 'PUT' }, { label: 'DELETE', value: 'DELETE' },
];
const HANDLERS: Array<{ label: string; value: HandlerType }> = [
  { label: 'Static JSON', value: 'static_json' },
  { label: 'Query Table', value: 'query_table' },
  { label: 'Insert Table', value: 'insert_table' },
  { label: 'Raw SQL (prepared)', value: 'sql' },
];
const STATUSES = [
  { label: 'Draft', value: 'draft' }, { label: 'Published', value: 'published' }, { label: 'Archived', value: 'archived' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-api-builder',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule, InputTextModule,
    TextareaModule, SelectModule, InputNumberModule, DialogModule, ToastModule,
    PageHeaderComponent, HasPermissionDirective,
  ],
  providers: [MessageService],
  template: `
    <dos-page-header title="API Endpoint Builder" subtitle="Declarative HTTP endpoints — specs persisted in dynamic_endpoints" />
    <p-toast />
    <div class="toolbar">
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="load()" [outlined]="true" size="small" />
      <p-button *dosHasPermission="['platform.config.write','platform.schema.manage']" label="New Endpoint" icon="pi pi-plus" (onClick)="openNew()" size="small" />
    </div>

    <p-table [value]="rows()" [rows]="30" [paginator]="rows().length > 30" styleClass="p-datatable-sm p-datatable-striped">
      <ng-template #header>
        <tr>
          <th style="width:80px">Method</th><th>Code</th><th>Path</th><th style="width:140px">Handler</th>
          <th style="width:110px">Status</th><th style="width:100px">Limit/min</th><th style="width:160px">Actions</th>
        </tr>
      </ng-template>
      <ng-template #body let-e>
        <tr>
          <td><p-tag [value]="e.method" [severity]="severity(e.method)" /></td>
          <td class="mono fw-600">{{ e.code }}</td>
          <td class="mono">{{ e.path }}</td>
          <td class="mono small">{{ e.handler_type }}</td>
          <td><p-tag [value]="e.status" [severity]="e.status === 'published' ? 'success' : 'secondary'" /></td>
          <td class="mono">{{ e.rate_limit_rpm }}</td>
          <td>
            <p-button *dosHasPermission="['platform.config.write','platform.schema.manage']" icon="pi pi-pencil" (onClick)="openEdit(e)" [text]="true" size="small" />
            <p-button *dosHasPermission="'platform.schema.manage'" icon="pi pi-trash" (onClick)="remove(e)" [text]="true" size="small" severity="danger" />
          </td>
        </tr>
      </ng-template>
      <ng-template #emptymessage><tr><td colspan="7" class="empty-msg">No endpoints</td></tr></ng-template>
    </p-table>

    <p-dialog [header]="form.mode === 'edit' ? 'Edit Endpoint' : 'New Endpoint'" [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '780px' }">
      <div class="grid">
        <label>Code <input pInputText [(ngModel)]="form.code" [disabled]="form.mode === 'edit'" /></label>
        <label>Method <p-select [(ngModel)]="form.method" [options]="methods" optionLabel="label" optionValue="value" /></label>
        <label class="full">Path <input pInputText [(ngModel)]="form.path" placeholder="/tenants/list" /></label>
        <label class="full">Description <input pInputText [(ngModel)]="form.description" /></label>
        <label>Handler Type <p-select [(ngModel)]="form.handler_type" [options]="handlers" optionLabel="label" optionValue="value" /></label>
        <label>Status <p-select [(ngModel)]="form.status" [options]="statuses" optionLabel="label" optionValue="value" /></label>
        <label>Rate Limit (per minute) <p-inputNumber [(ngModel)]="form.rate_limit_rpm" /></label>
        <label class="full">Requires (JSON array)
          <textarea pTextarea rows="2" [(ngModel)]="form.requiresRaw"></textarea>
        </label>
        <label class="full">Handler Spec (JSON)
          <textarea pTextarea rows="8" [(ngModel)]="form.handlerSpecRaw" class="mono"></textarea>
        </label>
        <label class="full">Input Schema (JSON)
          <textarea pTextarea rows="4" [(ngModel)]="form.inputSchemaRaw" class="mono"></textarea>
        </label>
      </div>
      @if (parseError()) { <div class="err">{{ parseError() }}</div> }
      <div class="help">
        <b>Handler spec examples:</b>
        <ul>
          <li><code>static_json</code>: <code>{{ '{' }}"data": {{ '[' }}...{{ ']' }}{{ '}' }}</code></li>
          <li><code>query_table</code>: <code>{{ '{' }}"table": "tenants", "columns": {{ '[' }}"id","name"{{ ']' }}, "order_by": "name", "limit": 100{{ '}' }}</code></li>
          <li><code>insert_table</code>: <code>{{ '{' }}"table": "tenants", "columns": {{ '[' }}"name","slug"{{ ']' }}{{ '}' }}</code></li>
          <li><code>sql</code>: <code>{{ '{' }}"sql": "SELECT * FROM tenants WHERE id = $1", "params_from_body": {{ '[' }}"id"{{ ']' }}{{ '}' }}</code></li>
        </ul>
      </div>
      <div class="actions">
        <p-button label="Cancel" (onClick)="dialogOpen = false" [text]="true" />
        <p-button label="Save" icon="pi pi-check" (onClick)="save()" [disabled]="!form.code || !form.path" />
      </div>
    </p-dialog>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin: 20px 0 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .grid label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 600; }
    .grid label.full { grid-column: 1 / span 2; }
    .mono { font-family: monospace; font-size: 12px; } .small { font-size: 12px; }
    .fw-600 { font-weight: 600; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
    .err { color: #dc2626; font-size: 12px; margin-top: 10px; }
    .help { color: var(--dos-text-muted); font-size: 11px; margin-top: 12px; }
    .help ul { padding-left: 18px; margin: 6px 0; }
    .help code { background: var(--dos-bg); padding: 1px 4px; border-radius: 3px; font-family: monospace; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
  `],
})
export class ApiBuilderComponent implements OnInit {
  private svc = inject(LowcodeService);
  private msg = inject(MessageService);

  rows = signal<EndpointSpec[]>([]);
  dialogOpen = false;
  parseError = signal<string | null>(null);
  methods = METHODS;
  handlers = HANDLERS;
  statuses = STATUSES;

  form = {
    mode: 'new' as 'new' | 'edit',
    code: '',
    method: 'GET' as EndpointMethod,
    path: '',
    description: '',
    handler_type: 'static_json' as HandlerType,
    status: 'draft' as 'draft' | 'published' | 'archived',
    rate_limit_rpm: 60,
    requiresRaw: '[]',
    handlerSpecRaw: '{}',
    inputSchemaRaw: '{}',
  };

  ngOnInit(): void { this.load(); }
  load(): void { this.svc.listEndpoints().subscribe({ next: d => this.rows.set(d), error: () => this.rows.set([]) }); }

  openNew(): void {
    this.form = { mode: 'new', code: '', method: 'GET', path: '', description: '',
      handler_type: 'static_json', status: 'draft', rate_limit_rpm: 60,
      requiresRaw: '[]', handlerSpecRaw: '{}', inputSchemaRaw: '{}' };
    this.parseError.set(null);
    this.dialogOpen = true;
  }

  openEdit(e: EndpointSpec): void {
    this.form = {
      mode: 'edit',
      code: e.code,
      method: e.method,
      path: e.path,
      description: e.description ?? '',
      handler_type: e.handler_type,
      status: e.status,
      rate_limit_rpm: e.rate_limit_rpm ?? 60,
      requiresRaw: JSON.stringify(e.requires ?? [], null, 2),
      handlerSpecRaw: JSON.stringify(e.handler_spec ?? {}, null, 2),
      inputSchemaRaw: JSON.stringify(e.input_schema ?? {}, null, 2),
    };
    this.parseError.set(null);
    this.dialogOpen = true;
  }

  save(): void {
    let requires: string[]; let handlerSpec: any; let inputSchema: any;
    try {
      requires = JSON.parse(this.form.requiresRaw || '[]');
      handlerSpec = JSON.parse(this.form.handlerSpecRaw || '{}');
      inputSchema = JSON.parse(this.form.inputSchemaRaw || '{}');
    } catch (e: any) { this.parseError.set(`Invalid JSON: ${e?.message}`); return; }

    const spec: EndpointSpec = {
      code: this.form.code, method: this.form.method, path: this.form.path,
      description: this.form.description || undefined,
      handler_type: this.form.handler_type, handler_spec: handlerSpec,
      input_schema: inputSchema, requires,
      rate_limit_rpm: this.form.rate_limit_rpm,
      status: this.form.status,
    };
    const obs = this.form.mode === 'edit' ? this.svc.updateEndpoint(this.form.code, spec) : this.svc.createEndpoint(spec);
    obs.subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: `${this.form.code} saved` }); this.dialogOpen = false; this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Save failed' }),
    });
  }

  remove(e: EndpointSpec): void {
    if (!confirm(`Delete endpoint "${e.code}"?`)) return;
    this.svc.deleteEndpoint(e.code).subscribe({
      next: () => { this.msg.add({ severity: 'warn', summary: `${e.code} deleted` }); this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Delete failed' }),
    });
  }

  severity(m: EndpointMethod): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    switch (m) {
      case 'GET': return 'info';
      case 'POST': return 'success';
      case 'PATCH': case 'PUT': return 'warn';
      case 'DELETE': return 'danger';
      default: return 'secondary';
    }
  }
}
