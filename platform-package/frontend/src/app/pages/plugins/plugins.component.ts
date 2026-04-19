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
import { LowcodeService } from '../../core/dos/services/lowcode.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-plugins',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, TagModule, ButtonModule, InputTextModule, TextareaModule, DialogModule, ToastModule, PageHeaderComponent, HasPermissionDirective],
  providers: [MessageService],
  template: `
    <dos-page-header title="Plugin Marketplace" subtitle="Register, verify (Cosign), and install signed plugin bundles" />
    <p-toast />
    <div class="toolbar">
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="load()" [outlined]="true" size="small" />
      <p-button *dosHasPermission="'platform.schema.manage'" label="Register Plugin" icon="pi pi-plus" (onClick)="openRegister()" size="small" />
    </div>
    <p-table [value]="rows()" [rows]="30" [paginator]="rows().length > 30" styleClass="p-datatable-sm p-datatable-striped">
      <ng-template #header>
        <tr>
          <th>Code</th><th>Name</th><th>Version</th><th style="width:110px">Verified</th>
          <th style="width:110px">Status</th><th style="width:260px">Actions</th>
        </tr>
      </ng-template>
      <ng-template #body let-r>
        <tr>
          <td class="mono fw-600">{{ r.code }}</td>
          <td>{{ r.name }}</td>
          <td class="mono">{{ r.version }}</td>
          <td><p-tag [value]="r.signature_verified ? 'verified' : 'unverified'" [severity]="r.signature_verified ? 'success' : 'warn'" /></td>
          <td><p-tag [value]="r.status" [severity]="r.status === 'installed' ? 'success' : 'secondary'" /></td>
          <td>
            <p-button *dosHasPermission="'platform.schema.manage'" label="Verify" icon="pi pi-shield" (onClick)="verify(r, true)" [text]="true" size="small" />
            <p-button *dosHasPermission="'platform.schema.manage'" label="Install" icon="pi pi-download" (onClick)="install(r)" [text]="true" size="small" severity="success" [disabled]="!r.signature_verified || r.status === 'installed'" />
            <p-button *dosHasPermission="'platform.schema.manage'" label="Uninstall" icon="pi pi-times" (onClick)="uninstall(r)" [text]="true" size="small" severity="danger" [disabled]="r.status !== 'installed'" />
          </td>
        </tr>
      </ng-template>
      <ng-template #emptymessage><tr><td colspan="6" class="empty-msg">No plugins registered</td></tr></ng-template>
    </p-table>

    <p-dialog header="Register Plugin" [(visible)]="dialogOpen" [modal]="true" [style]="{ width: '640px' }">
      <div class="form">
        <label>Code <input pInputText [(ngModel)]="form.code" /></label>
        <label>Name <input pInputText [(ngModel)]="form.name" /></label>
        <label>Version <input pInputText [(ngModel)]="form.version" placeholder="0.1.0" /></label>
        <label>Description <input pInputText [(ngModel)]="form.description" /></label>
        <label>Bundle URL <input pInputText [(ngModel)]="form.bundle_url" /></label>
        <label>Bundle SHA256 <input pInputText [(ngModel)]="form.bundle_sha256" /></label>
        <label>Cosign Signature <textarea pTextarea rows="3" [(ngModel)]="form.signature"></textarea></label>
        <label>Manifest (JSON) <textarea pTextarea rows="5" [(ngModel)]="form.manifestRaw" class="mono"></textarea></label>
      </div>
      <div class="actions">
        <p-button label="Cancel" (onClick)="dialogOpen = false" [text]="true" />
        <p-button label="Register" icon="pi pi-check" (onClick)="submit()" [disabled]="!form.code || !form.name || !form.version" />
      </div>
    </p-dialog>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin: 20px 0 12px; }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
    .form { display: flex; flex-direction: column; gap: 10px; }
    .form label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 600; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
  `],
})
export class PluginsComponent implements OnInit {
  private svc = inject(LowcodeService);
  private msg = inject(MessageService);

  rows = signal<any[]>([]);
  dialogOpen = false;
  form: any = { code: '', name: '', version: '', description: '', bundle_url: '', bundle_sha256: '', signature: '', manifestRaw: '{}' };

  ngOnInit(): void { this.load(); }
  load(): void { this.svc.listPlugins().subscribe({ next: d => this.rows.set(d), error: () => this.rows.set([]) }); }

  openRegister(): void {
    this.form = { code: '', name: '', version: '', description: '', bundle_url: '', bundle_sha256: '', signature: '', manifestRaw: '{}' };
    this.dialogOpen = true;
  }

  submit(): void {
    let manifest: any = {}; try { manifest = JSON.parse(this.form.manifestRaw || '{}'); } catch { this.msg.add({ severity: 'error', summary: 'Invalid manifest JSON' }); return; }
    this.svc.registerPlugin({ ...this.form, manifest }).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Registered' }); this.dialogOpen = false; this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Register failed' }),
    });
  }
  verify(r: any, verified: boolean): void {
    this.svc.verifyPlugin(r.code, verified).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Verification updated' }); this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed' }),
    });
  }
  install(r: any): void {
    this.svc.installPlugin(r.code).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Installed' }); this.load(); },
      error: (e) => this.msg.add({ severity: 'error', summary: e?.error?.error || 'Install failed' }),
    });
  }
  uninstall(r: any): void {
    if (!confirm(`Uninstall plugin "${r.code}"?`)) return;
    this.svc.uninstallPlugin(r.code).subscribe({
      next: () => { this.msg.add({ severity: 'warn', summary: 'Uninstalled' }); this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed' }),
    });
  }
}
