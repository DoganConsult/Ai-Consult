import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { IdentityService, Actor, ActorPermission } from '../../core/dauth/services/identity.service';
import { InvitationService, Invitation } from '../../core/dauth/services/invitation.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-user-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, TagModule,
    DialogModule, InputTextModule, MessageModule, ToastModule, ConfirmDialogModule,
    TabsModule, PageHeaderComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <dos-page-header title="User Management" subtitle="Platform identity, actors, and invitation management" />
    <p-toast />
    <p-confirmDialog />

    <div class="toolbar">
      <p-button label="Create Actor" icon="pi pi-user-plus" (onClick)="showCreateDialog = true" size="small" />
      <p-button label="Send Invitation" icon="pi pi-envelope" (onClick)="showInviteDialog = true" [outlined]="true" size="small" />
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="loadAll()" [outlined]="true" size="small" />
    </div>

    <p-tabs>
      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-users"></i> Actors</span></ng-template>
        <p-table [value]="actors()" [rows]="20" [paginator]="actors().length > 20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true" [globalFilterFields]="['display_name', 'email']">
          <ng-template #header>
            <tr>
              <th>Display Name</th>
              <th>Email</th>
              <th style="width: 100px">Type</th>
              <th style="width: 100px">Status</th>
              <th>Created</th>
              <th style="width: 160px">Actions</th>
            </tr>
          </ng-template>
          <ng-template #body let-actor>
            <tr>
              <td class="fw-600">{{ actor.display_name }}</td>
              <td class="mono">{{ actor.email || '--' }}</td>
              <td><p-tag [value]="actor.actor_type" severity="info" /></td>
              <td><p-tag [value]="actor.status" [severity]="actorStatusSeverity(actor.status)" /></td>
              <td class="mono">{{ actor.created_at | date:'short' }}</td>
              <td>
                <p-button icon="pi pi-key" (onClick)="viewPermissions(actor)" [text]="true" size="small" pTooltip="Permissions" />
                <p-button icon="pi pi-trash" (onClick)="confirmDelete(actor)" [text]="true" size="small" severity="danger" pTooltip="Delete" />
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr><td colspan="6" class="empty-msg">No actors found</td></tr>
          </ng-template>
        </p-table>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-envelope"></i> Invitations</span></ng-template>
        <p-table [value]="invitations()" [rows]="20" [paginator]="invitations().length > 20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template #header>
            <tr>
              <th>Email</th>
              <th style="width: 100px">Role</th>
              <th style="width: 100px">Status</th>
              <th>Expires</th>
              <th>Accepted</th>
              <th style="width: 140px">Actions</th>
            </tr>
          </ng-template>
          <ng-template #body let-inv>
            <tr>
              <td class="fw-600">{{ inv.email }}</td>
              <td>{{ inv.role || 'default' }}</td>
              <td><p-tag [value]="inv.status" [severity]="invStatusSeverity(inv.status)" /></td>
              <td class="mono">{{ inv.expires_at | date:'short' }}</td>
              <td class="mono">{{ inv.accepted_at ? (inv.accepted_at | date:'short') : '--' }}</td>
              <td>
                @if (inv.status === 'pending') {
                  <p-button icon="pi pi-replay" (onClick)="resendInvite(inv.invitation_id)" [text]="true" size="small" pTooltip="Resend" />
                  <p-button icon="pi pi-times" (onClick)="revokeInvite(inv.invitation_id)" [text]="true" size="small" severity="danger" pTooltip="Revoke" />
                }
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr><td colspan="6" class="empty-msg">No invitations found</td></tr>
          </ng-template>
        </p-table>
      </p-tabpanel>
    </p-tabs>

    <p-dialog header="Create Actor" [(visible)]="showCreateDialog" [modal]="true" [style]="{width: '480px'}">
      <div class="dialog-form">
        <div class="field">
          <label>Display Name</label>
          <input pInputText [(ngModel)]="newActor.display_name" placeholder="Full name" class="w-full" />
        </div>
        <div class="field">
          <label>Email</label>
          <input pInputText [(ngModel)]="newActor.email" type="email" placeholder="user&#64;dogan-ai.com" class="w-full" />
        </div>
        <div class="field">
          <label>Actor Type</label>
          <input pInputText [(ngModel)]="newActor.actor_type" placeholder="user" class="w-full" />
        </div>
        @if (createError()) {
          <p-message severity="error" [text]="createError()" styleClass="w-full" />
        }
      </div>
      <ng-template #footer>
        <p-button label="Cancel" (onClick)="showCreateDialog = false" [text]="true" />
        <p-button label="Create" icon="pi pi-check" (onClick)="createActor()" [loading]="createLoading()" />
      </ng-template>
    </p-dialog>

    <p-dialog header="Send Invitation" [(visible)]="showInviteDialog" [modal]="true" [style]="{width: '480px'}">
      <div class="dialog-form">
        <div class="field">
          <label>Email</label>
          <input pInputText [(ngModel)]="newInvite.email" type="email" placeholder="invitee&#64;company.com" class="w-full" />
        </div>
        <div class="field">
          <label>Role (optional)</label>
          <input pInputText [(ngModel)]="newInvite.role" placeholder="admin" class="w-full" />
        </div>
        <div class="field">
          <label>Message (optional)</label>
          <input pInputText [(ngModel)]="newInvite.message" placeholder="Welcome message" class="w-full" />
        </div>
        @if (inviteError()) {
          <p-message severity="error" [text]="inviteError()" styleClass="w-full" />
        }
      </div>
      <ng-template #footer>
        <p-button label="Cancel" (onClick)="showInviteDialog = false" [text]="true" />
        <p-button label="Send" icon="pi pi-send" (onClick)="sendInvite()" [loading]="inviteLoading()" />
      </ng-template>
    </p-dialog>

    <p-dialog header="Actor Permissions" [(visible)]="showPermDialog" [modal]="true" [style]="{width: '600px'}">
      @if (selectedPerms().length > 0) {
        <p-table [value]="selectedPerms()" [rows]="20" styleClass="p-datatable-sm" [scrollable]="true">
          <ng-template #header>
            <tr><th>Permission Code</th><th>Source</th><th>Granted</th></tr>
          </ng-template>
          <ng-template #body let-p>
            <tr>
              <td class="mono fw-600">{{ p.permission_code }}</td>
              <td>{{ p.source }}</td>
              <td class="mono">{{ p.granted_at | date:'short' }}</td>
            </tr>
          </ng-template>
        </p-table>
      } @else {
        <div class="empty-msg">No permissions assigned</div>
      }
    </p-dialog>
  `,
  styles: [`
    .toolbar { display: flex; gap: 8px; margin-top: 20px; flex-wrap: wrap; }
    .fw-600 { font-weight: 600; }
    .mono { font-family: monospace; font-size: 13px; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); }
    .w-full { width: 100%; }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; padding: 8px 0; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 13px; font-weight: 600; color: #475569; }
  `],
})
export class UserManagementComponent implements OnInit {
  private identitySvc = inject(IdentityService);
  private invitationSvc = inject(InvitationService);
  private msg = inject(MessageService);
  private confirm = inject(ConfirmationService);

  actors = signal<Actor[]>([]);
  invitations = signal<Invitation[]>([]);
  selectedPerms = signal<ActorPermission[]>([]);

  showCreateDialog = false;
  showInviteDialog = false;
  showPermDialog = false;

  newActor = { display_name: '', email: '', actor_type: 'user' };
  createError = signal('');
  createLoading = signal(false);

  newInvite = { email: '', role: '', message: '' };
  inviteError = signal('');
  inviteLoading = signal(false);

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.identitySvc.listActors().subscribe({
      next: (data) => this.actors.set(data),
      error: () => this.actors.set([]),
    });
    this.invitationSvc.list().subscribe({
      next: (data) => this.invitations.set(data),
      error: () => this.invitations.set([]),
    });
  }

  actorStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' {
    if (status === 'active') return 'success';
    if (status === 'suspended' || status === 'locked') return 'danger';
    if (status === 'pending') return 'warn';
    return 'info';
  }

  invStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' {
    if (status === 'accepted') return 'success';
    if (status === 'pending') return 'warn';
    if (status === 'expired' || status === 'revoked') return 'danger';
    return 'info';
  }

  createActor(): void {
    this.createError.set('');
    if (!this.newActor.display_name || !this.newActor.email) {
      this.createError.set('Name and email are required');
      return;
    }
    this.createLoading.set(true);
    this.identitySvc.createActor(this.newActor).subscribe({
      next: () => {
        this.showCreateDialog = false;
        this.newActor = { display_name: '', email: '', actor_type: 'user' };
        this.createLoading.set(false);
        this.msg.add({ severity: 'success', summary: 'Actor Created' });
        this.loadAll();
      },
      error: (err) => {
        this.createError.set(err?.error?.message || 'Failed to create actor');
        this.createLoading.set(false);
      },
    });
  }

  confirmDelete(actor: Actor): void {
    this.confirm.confirm({
      message: `Delete actor "${actor.display_name}"? This action cannot be undone.`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.identitySvc.deleteActor(actor.actor_id).subscribe({
          next: () => {
            this.msg.add({ severity: 'success', summary: 'Actor Deleted' });
            this.loadAll();
          },
          error: () => this.msg.add({ severity: 'error', summary: 'Delete Failed' }),
        });
      },
    });
  }

  viewPermissions(actor: Actor): void {
    this.identitySvc.getActorPermissions(actor.actor_id).subscribe({
      next: (perms) => {
        this.selectedPerms.set(perms);
        this.showPermDialog = true;
      },
      error: () => {
        this.selectedPerms.set([]);
        this.showPermDialog = true;
      },
    });
  }

  sendInvite(): void {
    this.inviteError.set('');
    if (!this.newInvite.email) {
      this.inviteError.set('Email is required');
      return;
    }
    this.inviteLoading.set(true);
    this.invitationSvc.create({
      email: this.newInvite.email,
      role: this.newInvite.role || undefined,
      message: this.newInvite.message || undefined,
    }).subscribe({
      next: () => {
        this.showInviteDialog = false;
        this.newInvite = { email: '', role: '', message: '' };
        this.inviteLoading.set(false);
        this.msg.add({ severity: 'success', summary: 'Invitation Sent' });
        this.loadAll();
      },
      error: (err) => {
        this.inviteError.set(err?.error?.message || 'Failed to send invitation');
        this.inviteLoading.set(false);
      },
    });
  }

  resendInvite(id: string): void {
    this.invitationSvc.resend(id).subscribe({
      next: () => this.msg.add({ severity: 'success', summary: 'Invitation Resent' }),
      error: () => this.msg.add({ severity: 'error', summary: 'Resend Failed' }),
    });
  }

  revokeInvite(id: string): void {
    this.invitationSvc.revoke(id).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Invitation Revoked' });
        this.loadAll();
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Revoke Failed' }),
    });
  }
}
