import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { HasPermissionDirective } from '../../core/dauth/directives/has-permission.directive';
import { PlatformAdminService, SodRuleRow } from '../../core/dos/services/platform-admin.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-sod-rules',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, TagModule, ButtonModule, InputTextModule, SelectModule, DialogModule, ToastModule, PageHeaderComponent, HasPermissionDirective],
  providers: [MessageService],
  template: `
    <dos-page-header title="Segregation of Duties (SoD)" subtitle="Define role pairs that must not be granted to the same user" />
    <p-toast />
    <div class="toolbar">
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="load()" [outlined]="true" size="small" />
      <p-button *dosHasPermission="'platform.sod.manage'" label="New Rule" icon="pi pi-plus" (onClick)="openDialog()" size="small" />
    </div>
    <p-table [value]="rules()" [rows]="20" [paginator]="rules().length > 20" styleClass="p-datatable-sm p-datatable-striped">
      <ng-template #header>
        <tr><th>Rule Code</th><th>Role A</th><th>Role B</th><th style="width:120px">Severity</th><th>Description</th><th style="width:140px">Created</th></tr>
      </ng-template>
      <ng-template #body let-r>
        <tr>
          <td class="mono fw-600">{{ r.rule_code }}</td>
          <td class="mono">{{ r.conflicting_role_a || '--' }}</td>
          <td class="mono">{{ r.conflicting_role_b || '--' }}</td>
          <td><p-tag [value]="r.severity" [severity]="sev(r.severity)" /></td>
          <td>{{ r.description || '' }}</td>
          <td class="mono small">{{ r.created_at | date:'short' }}</td>
        </tr>
      </ng-template>
      <ng-template #emptymessage><tr><td colspan="6" class="empty-msg">No SoD rules defined</td></tr></ng-template>
    </p-table>

    <p-dialog header="New SoD Rule" [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '520px' }">
      <div class="form">
        <label>Rule Code <input pInputText [(ngModel)]="form.rule_code" /></label>
        <label>Role A <input pInputText [(ngModel)]="form.conflicting_role_a" /></label>
        <label>Role B <input pInputText [(ngModel)]="form.conflicting_role_b" /></label>
        <label>Severity
          <p-select [(ngModel)]="form.severity" [options]="severities" optionLabel="label" optionValue="value" />
        </label>
        <label>Description <input pInputText [(ngModel)]="form.description" /></label>
      </div>
      <div class="actions">
        <p-button label="Cancel" (onClick)="dialogOpen = false" [text]="true" />
        <p-button label="Create" icon="pi pi-check" (onClick)="create()" [disabled]="!form.rule_code" />
      </div>
    </p-dialog>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin: 20px 0 12px; }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; } .small { font-size: 12px; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
    .form { display: flex; flex-direction: column; gap: 10px; }
    .form label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 600; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
  `],
})
export class SodRulesComponent implements OnInit {
  private svc = inject(PlatformAdminService);
  private msg = inject(MessageService);
  rules = signal<SodRuleRow[]>([]);
  dialogOpen = false;
  form: { rule_code: string; conflicting_role_a: string; conflicting_role_b: string; description: string; severity: string } = {
    rule_code: '', conflicting_role_a: '', conflicting_role_b: '', description: '', severity: 'high',
  };
  severities = [
    { label: 'Low', value: 'low' }, { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' }, { label: 'Critical', value: 'critical' },
  ];
  ngOnInit(): void { this.load(); }
  load(): void { this.svc.getSodRules().subscribe({ next: d => this.rules.set(d), error: () => this.rules.set([]) }); }
  openDialog(): void { this.form = { rule_code: '', conflicting_role_a: '', conflicting_role_b: '', description: '', severity: 'high' }; this.dialogOpen = true; }
  create(): void {
    this.svc.createSodRule(this.form).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'SoD rule created' }); this.dialogOpen = false; this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed' }),
    });
  }
  sev(s: string): 'info' | 'warn' | 'danger' | 'success' {
    return s === 'critical' ? 'danger' : s === 'high' ? 'warn' : s === 'medium' ? 'info' : 'success';
  }
}
