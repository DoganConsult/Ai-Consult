import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { HasPermissionDirective } from '../../core/dauth/directives/has-permission.directive';
import { PlatformAdminService, DelegationRow } from '../../core/dos/services/platform-admin.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-delegations',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, TagModule, ButtonModule, InputTextModule, DatePickerModule, DialogModule, ToastModule, PageHeaderComponent, HasPermissionDirective],
  providers: [MessageService],
  template: `
    <dos-page-header title="Delegations" subtitle="Time-boxed permission delegations between users" />
    <p-toast />
    <div class="toolbar">
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="load()" [outlined]="true" size="small" />
      <p-button *dosHasPermission="'platform.delegation.create'" label="New Delegation" icon="pi pi-plus" (onClick)="openDialog()" size="small" />
    </div>
    <p-table [value]="rows()" [rows]="20" [paginator]="rows().length > 20" styleClass="p-datatable-sm p-datatable-striped">
      <ng-template #header>
        <tr><th>Delegator</th><th>Delegate</th><th>Scope</th><th>Reason</th><th style="width:110px">Status</th><th style="width:140px">Expires</th><th style="width:140px">Created</th></tr>
      </ng-template>
      <ng-template #body let-r>
        <tr>
          <td class="mono small">{{ r.delegator_id }}</td>
          <td class="mono small">{{ r.delegate_id }}</td>
          <td class="mono small">{{ r.permission_scope || '--' }}</td>
          <td>{{ r.reason || '' }}</td>
          <td><p-tag [value]="r.status" [severity]="r.status === 'active' ? 'success' : 'secondary'" /></td>
          <td class="mono small">{{ r.expires_at ? (r.expires_at | date:'short') : '--' }}</td>
          <td class="mono small">{{ r.created_at | date:'short' }}</td>
        </tr>
      </ng-template>
      <ng-template #emptymessage><tr><td colspan="7" class="empty-msg">No delegations</td></tr></ng-template>
    </p-table>

    <p-dialog header="New Delegation" [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '520px' }">
      <div class="form">
        <label>Delegator User ID <input pInputText [(ngModel)]="form.delegator_id" /></label>
        <label>Delegate User ID <input pInputText [(ngModel)]="form.delegate_id" /></label>
        <label>Permission Scope <input pInputText [(ngModel)]="form.permission_scope" placeholder="e.g. tenant:acme" /></label>
        <label>Reason <input pInputText [(ngModel)]="form.reason" /></label>
        <label>Expires At <p-datepicker [(ngModel)]="form.expires_at" [showTime]="true" /></label>
      </div>
      <div class="actions">
        <p-button label="Cancel" (onClick)="dialogOpen = false" [text]="true" />
        <p-button label="Create" icon="pi pi-check" (onClick)="create()" [disabled]="!form.delegator_id || !form.delegate_id" />
      </div>
    </p-dialog>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin: 20px 0 12px; }
    .mono { font-family: monospace; } .small { font-size: 12px; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
    .form { display: flex; flex-direction: column; gap: 10px; }
    .form label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 600; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
  `],
})
export class DelegationsComponent implements OnInit {
  private svc = inject(PlatformAdminService);
  private msg = inject(MessageService);
  rows = signal<DelegationRow[]>([]);
  dialogOpen = false;
  form: { delegator_id: string; delegate_id: string; permission_scope: string; reason: string; expires_at: Date | null } = {
    delegator_id: '', delegate_id: '', permission_scope: '', reason: '', expires_at: null,
  };
  ngOnInit(): void { this.load(); }
  load(): void { this.svc.getDelegations().subscribe({ next: d => this.rows.set(d), error: () => this.rows.set([]) }); }
  openDialog(): void { this.form = { delegator_id: '', delegate_id: '', permission_scope: '', reason: '', expires_at: null }; this.dialogOpen = true; }
  create(): void {
    const payload = { ...this.form, expires_at: this.form.expires_at ? this.form.expires_at.toISOString() : undefined };
    this.svc.createDelegation(payload).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Delegation created' }); this.dialogOpen = false; this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed' }),
    });
  }
}
