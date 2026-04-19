import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { HasPermissionDirective } from '../../core/dauth/directives/has-permission.directive';
import { LowcodeService } from '../../core/dos/services/lowcode.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, TagModule, ButtonModule, SelectModule, ToastModule, PageHeaderComponent, HasPermissionDirective],
  providers: [MessageService],
  template: `
    <dos-page-header title="Admin Action Approvals" subtitle="Dual-approval workflow for destructive / high-risk operations" />
    <p-toast />
    <div class="toolbar">
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="load()" [outlined]="true" size="small" />
      <p-select [(ngModel)]="filter" [options]="filters" optionLabel="label" optionValue="value" (onChange)="load()" />
    </div>
    <p-table [value]="rows()" [rows]="30" [paginator]="rows().length > 30" styleClass="p-datatable-sm p-datatable-striped">
      <ng-template #header>
        <tr>
          <th>Action</th><th>Target</th><th style="width:110px">Status</th>
          <th>Requested By</th><th style="width:160px">Created</th><th style="width:220px">Actions</th>
        </tr>
      </ng-template>
      <ng-template #body let-r>
        <tr>
          <td class="mono fw-600">{{ r.action_code }}</td>
          <td class="mono small">{{ r.target_type }} / {{ r.target_id }}</td>
          <td><p-tag [value]="r.status" [severity]="sev(r.status)" /></td>
          <td class="mono small">{{ r.requested_by }}</td>
          <td class="mono small">{{ r.created_at | date:'short' }}</td>
          <td>
            @if (r.status === 'pending') {
              <p-button *dosHasPermission="['platform.permission.assign','platform.sod.manage']" label="Approve" icon="pi pi-check" (onClick)="approve(r.id)" [text]="true" size="small" severity="success" />
              <p-button *dosHasPermission="['platform.permission.assign','platform.sod.manage']" label="Reject" icon="pi pi-times" (onClick)="reject(r.id)" [text]="true" size="small" severity="danger" />
            }
          </td>
        </tr>
      </ng-template>
      <ng-template #emptymessage><tr><td colspan="6" class="empty-msg">No approvals</td></tr></ng-template>
    </p-table>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin: 20px 0 12px; align-items: center; }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; } .small { font-size: 12px; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
  `],
})
export class ApprovalsComponent implements OnInit {
  private svc = inject(LowcodeService);
  private msg = inject(MessageService);
  rows = signal<any[]>([]);
  filter: string = 'pending';
  filters = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'All', value: '' },
  ];
  ngOnInit(): void { this.load(); }
  load(): void {
    const s = this.filter || undefined;
    this.svc.listApprovals(s).subscribe({ next: d => this.rows.set(d), error: () => this.rows.set([]) });
  }
  approve(id: string): void {
    const reason = prompt('Approval reason (optional)');
    this.svc.approveApproval(id, reason || undefined).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Approved' }); this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed' }),
    });
  }
  reject(id: string): void {
    const reason = prompt('Reject reason (optional)');
    this.svc.rejectApproval(id, reason || undefined).subscribe({
      next: () => { this.msg.add({ severity: 'warn', summary: 'Rejected' }); this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed' }),
    });
  }
  sev(s: string): 'info' | 'warn' | 'danger' | 'success' | 'secondary' {
    return s === 'approved' || s === 'executed' ? 'success' : s === 'pending' ? 'warn' : s === 'rejected' ? 'danger' : 'secondary';
  }
}
