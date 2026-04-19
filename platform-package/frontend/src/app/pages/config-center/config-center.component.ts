import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { HasPermissionDirective } from '../../core/dauth/directives/has-permission.directive';
import { PlatformAdminService } from '../../core/dos/services/platform-admin.service';

interface ConfigRow {
  config_key: string;
  config_value: any;
  updated_at?: string;
  [k: string]: any;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-config-center',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, TagModule, ButtonModule, InputTextModule, TextareaModule, DialogModule, ToastModule, PageHeaderComponent, HasPermissionDirective],
  providers: [MessageService],
  template: `
    <dos-page-header title="Config Center" subtitle="Central platform configuration (platform_operation_config)" />
    <p-toast />
    <div class="toolbar">
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="load()" [outlined]="true" size="small" />
      <p-button *dosHasPermission="'platform.config.write'" label="New / Upsert Key" icon="pi pi-plus" (onClick)="openDialog()" size="small" />
      <input pInputText placeholder="Filter keys..." [(ngModel)]="filter" class="filter" />
    </div>
    <p-table [value]="filtered()" [rows]="40" [paginator]="filtered().length > 40" styleClass="p-datatable-sm p-datatable-striped">
      <ng-template #header>
        <tr><th>Key</th><th>Value</th><th style="width:160px">Updated</th><th style="width:120px">Actions</th></tr>
      </ng-template>
      <ng-template #body let-r>
        <tr>
          <td class="mono fw-600">{{ r.config_key }}</td>
          <td><pre class="val">{{ stringify(r.config_value) }}</pre></td>
          <td class="mono small">{{ r.updated_at ? (r.updated_at | date:'short') : '--' }}</td>
          <td>
            <p-button *dosHasPermission="'platform.config.write'" label="Edit" icon="pi pi-pencil" (onClick)="edit(r)" [text]="true" size="small" />
          </td>
        </tr>
      </ng-template>
      <ng-template #emptymessage><tr><td colspan="4" class="empty-msg">No config keys</td></tr></ng-template>
    </p-table>

    <p-dialog [header]="form.mode === 'edit' ? 'Edit Config' : 'Upsert Config'" [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '640px' }">
      <div class="form">
        <label>Config Key <input pInputText [(ngModel)]="form.key" [disabled]="form.mode === 'edit'" /></label>
        <label>Config Value (JSON)
          <textarea pTextarea rows="10" [(ngModel)]="form.value" spellcheck="false"></textarea>
        </label>
        @if (parseError()) { <div class="err">{{ parseError() }}</div> }
      </div>
      <div class="actions">
        <p-button label="Cancel" (onClick)="dialogOpen = false" [text]="true" />
        <p-button label="Save" icon="pi pi-check" (onClick)="save()" [disabled]="!form.key" />
      </div>
    </p-dialog>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin: 20px 0 12px; align-items: center; }
    .filter { width: 260px; }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; } .small { font-size: 12px; }
    .val { margin: 0; font-family: monospace; font-size: 12px; white-space: pre-wrap; max-width: 600px; max-height: 140px; overflow: auto; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
    .form { display: flex; flex-direction: column; gap: 10px; }
    .form label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 600; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .err { color: #dc2626; font-size: 12px; }
  `],
})
export class ConfigCenterComponent implements OnInit {
  private svc = inject(PlatformAdminService);
  private msg = inject(MessageService);

  rows = signal<ConfigRow[]>([]);
  filter = '';
  dialogOpen = false;
  form: { mode: 'new' | 'edit'; key: string; value: string } = { mode: 'new', key: '', value: '{}' };
  parseError = signal<string | null>(null);
  ngOnInit(): void { this.load(); }

  load(): void {
    this.svc.getPlatformConfig().subscribe({ next: d => this.rows.set(d), error: () => this.rows.set([]) });
  }

  filtered(): ConfigRow[] {
    const q = this.filter.trim().toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter(r => r.config_key.toLowerCase().includes(q));
  }

  stringify(v: any): string {
    try { return typeof v === 'string' ? v : JSON.stringify(v, null, 2); } catch { return String(v); }
  }

  openDialog(): void {
    this.form = { mode: 'new', key: '', value: '{}' };
    this.parseError.set(null);
    this.dialogOpen = true;
  }

  edit(r: ConfigRow): void {
    this.form = { mode: 'edit', key: r.config_key, value: this.stringify(r.config_value) };
    this.parseError.set(null);
    this.dialogOpen = true;
  }

  save(): void {
    let parsed: any;
    try {
      parsed = JSON.parse(this.form.value);
    } catch (e: any) {
      this.parseError.set(`Invalid JSON: ${e?.message ?? 'parse error'}`);
      return;
    }
    this.svc.updatePlatformConfig(this.form.key, parsed).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: `${this.form.key} saved` }); this.dialogOpen = false; this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed' }),
    });
  }
}
