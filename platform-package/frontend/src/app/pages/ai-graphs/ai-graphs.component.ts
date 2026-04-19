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
  selector: 'dos-ai-graphs',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, TagModule, ButtonModule, InputTextModule, TextareaModule, SelectModule, DialogModule, ToastModule, PageHeaderComponent, HasPermissionDirective],
  providers: [MessageService],
  template: `
    <dos-page-header title="AI Agent Graphs" subtitle="Author multi-step agent graphs (nodes + edges) consumed by the runtime" />
    <p-toast />
    <div class="toolbar">
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="load()" [outlined]="true" size="small" />
      <p-button *dosHasPermission="'platform.ai.govern'" label="New Graph" icon="pi pi-plus" (onClick)="openNew()" size="small" />
    </div>
    <p-table [value]="rows()" [rows]="30" [paginator]="rows().length > 30" styleClass="p-datatable-sm p-datatable-striped">
      <ng-template #header>
        <tr><th>Code</th><th>Name</th><th>Description</th><th style="width:100px">Status</th><th style="width:90px">Version</th><th style="width:180px">Actions</th></tr>
      </ng-template>
      <ng-template #body let-r>
        <tr>
          <td class="mono fw-600">{{ r.code }}</td>
          <td>{{ r.name }}</td>
          <td class="truncate">{{ r.description }}</td>
          <td><p-tag [value]="r.status" [severity]="r.status === 'published' ? 'success' : 'secondary'" /></td>
          <td class="mono">v{{ r.version }}</td>
          <td>
            <p-button *dosHasPermission="'platform.ai.govern'" icon="pi pi-pencil" (onClick)="openEdit(r)" [text]="true" size="small" />
            <p-button *dosHasPermission="'platform.ai.govern'" icon="pi pi-trash" (onClick)="remove(r)" [text]="true" size="small" severity="danger" />
          </td>
        </tr>
      </ng-template>
      <ng-template #emptymessage><tr><td colspan="6" class="empty-msg">No AI graphs</td></tr></ng-template>
    </p-table>

    <p-dialog [header]="form.mode === 'edit' ? 'Edit Graph' : 'New Graph'" [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '720px' }">
      <div class="form">
        <label>Code <input pInputText [(ngModel)]="form.code" [disabled]="form.mode === 'edit'" /></label>
        <label>Name <input pInputText [(ngModel)]="form.name" /></label>
        <label>Description <input pInputText [(ngModel)]="form.description" /></label>
        <label>Status
          <p-select [(ngModel)]="form.status" [options]="statuses" optionLabel="label" optionValue="value" />
        </label>
        <label>Graph Spec (JSON — nodes + edges)
          <textarea pTextarea rows="12" [(ngModel)]="form.graphRaw" class="mono"></textarea>
        </label>
        @if (parseError()) { <div class="err">{{ parseError() }}</div> }
      </div>
      <div class="actions">
        <p-button label="Cancel" (onClick)="dialogOpen = false" [text]="true" />
        <p-button label="Save" icon="pi pi-check" (onClick)="save()" [disabled]="!form.code || !form.name" />
      </div>
    </p-dialog>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin: 20px 0 12px; }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; }
    .truncate { max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
    .form { display: flex; flex-direction: column; gap: 10px; }
    .form label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 600; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .err { color: #dc2626; font-size: 12px; }
  `],
})
export class AiGraphsComponent implements OnInit {
  private svc = inject(LowcodeService);
  private msg = inject(MessageService);
  rows = signal<any[]>([]);
  dialogOpen = false;
  parseError = signal<string | null>(null);
  statuses = [
    { label: 'Draft', value: 'draft' }, { label: 'Published', value: 'published' }, { label: 'Archived', value: 'archived' },
  ];
  form: any = { mode: 'new', code: '', name: '', description: '', status: 'draft', graphRaw: '{\n  "nodes": [],\n  "edges": []\n}' };

  ngOnInit(): void { this.load(); }
  load(): void { this.svc.listAiGraphs().subscribe({ next: d => this.rows.set(d), error: () => this.rows.set([]) }); }

  openNew(): void {
    this.form = { mode: 'new', code: '', name: '', description: '', status: 'draft', graphRaw: '{\n  "nodes": [],\n  "edges": []\n}' };
    this.parseError.set(null);
    this.dialogOpen = true;
  }
  openEdit(r: any): void {
    this.form = {
      mode: 'edit', code: r.code, name: r.name, description: r.description ?? '',
      status: r.status, graphRaw: JSON.stringify(r.graph_spec || { nodes: [], edges: [] }, null, 2),
    };
    this.parseError.set(null);
    this.dialogOpen = true;
  }
  save(): void {
    let graph: any;
    try { graph = JSON.parse(this.form.graphRaw || '{}'); }
    catch (e: any) { this.parseError.set(`Invalid JSON: ${e?.message}`); return; }
    const payload = { code: this.form.code, name: this.form.name, description: this.form.description, status: this.form.status, graph_spec: graph };
    const obs = this.form.mode === 'edit' ? this.svc.updateAiGraph(this.form.code, payload) : this.svc.createAiGraph(payload);
    obs.subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: `${this.form.code} saved` }); this.dialogOpen = false; this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Save failed' }),
    });
  }
  remove(r: any): void {
    if (!confirm(`Delete graph "${r.code}"?`)) return;
    this.svc.deleteAiGraph(r.code).subscribe({
      next: () => { this.msg.add({ severity: 'warn', summary: `${r.code} deleted` }); this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Delete failed' }),
    });
  }
}
