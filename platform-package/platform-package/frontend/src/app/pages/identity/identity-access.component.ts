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
import { PlatformAdminService, AccessProfileRow, FunctionalRoleRow, PermissionRow, RolePermissionRow, DelegationRow, SodRuleRow } from '../../core/dos/services/platform-admin.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-identity-access',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, MessageModule, ToastModule, ConfirmDialogModule, TabsModule, PageHeaderComponent],
  providers: [ConfirmationService, MessageService],
  template: `
    <dos-page-header title="Identity & Access" subtitle="Authorization hierarchy: Access Profiles → Functional Roles → Permissions → Scope → Authority → SoD → Delegation" />
    <p-toast /><p-confirmDialog />

    <div class="authz-chain">
      <span class="chain-label">Authorization Chain:</span>
      @for (step of authzChain; track step; let i = $index) {
        <span class="chain-step">{{ step }}</span>
        @if (i < authzChain.length - 1) { <i class="pi pi-arrow-right chain-arrow"></i> }
      }
    </div>

    <div class="toolbar">
      <p-button label="Create Actor" icon="pi pi-user-plus" (onClick)="showCreateDialog = true" size="small" />
      <p-button label="Send Invitation" icon="pi pi-envelope" (onClick)="showInviteDialog = true" [outlined]="true" size="small" />
      <p-button label="Refresh" icon="pi pi-refresh" (onClick)="loadAll()" [outlined]="true" size="small" />
    </div>

    <p-tabs>
      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-users"></i> Actors</span></ng-template>
        <p-table [value]="actors()" [rows]="20" [paginator]="actors().length > 20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template #header><tr><th>Display Name</th><th>Email</th><th style="width:100px">Type</th><th style="width:100px">Status</th><th>Created</th><th style="width:160px">Actions</th></tr></ng-template>
          <ng-template #body let-a>
            <tr>
              <td class="fw-600">{{ a.display_name }}</td><td class="mono">{{ a.email || '--' }}</td>
              <td><p-tag [value]="a.actor_type" severity="info" /></td>
              <td><p-tag [value]="a.status" [severity]="a.status === 'active' ? 'success' : a.status === 'pending' ? 'warn' : 'danger'" /></td>
              <td class="mono">{{ a.created_at | date:'short' }}</td>
              <td>
                <p-button icon="pi pi-key" (onClick)="viewPerms(a)" [text]="true" size="small" pTooltip="Permissions" />
                <p-button icon="pi pi-trash" (onClick)="confirmDel(a)" [text]="true" size="small" severity="danger" pTooltip="Delete" />
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="6" class="empty-msg">No actors found</td></tr></ng-template>
        </p-table>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-shield"></i> Access Profiles</span></ng-template>
        <div class="sub-toolbar">
          <p-button label="Create Profile" icon="pi pi-plus" (onClick)="showProfileDialog = true" size="small" [outlined]="true" />
          <span class="sub-info">Shell/admin tier — determines overall access level</span>
        </div>
        <p-table [value]="profiles()" [rows]="20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template #header><tr><th>Code</th><th>Name</th><th>Description</th><th style="width:100px">Assigned</th></tr></ng-template>
          <ng-template #body let-p>
            <tr>
              <td class="mono fw-600">{{ p.code }}</td>
              <td>{{ p.name }}</td>
              <td class="muted">{{ p.description || '--' }}</td>
              <td><p-tag [value]="(p.assigned_count || 0) + ' users'" severity="info" /></td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="4" class="empty-msg">No access profiles</td></tr></ng-template>
        </p-table>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-briefcase"></i> Functional Roles</span></ng-template>
        <div class="sub-toolbar">
          <p-button label="Create Role" icon="pi pi-plus" (onClick)="showRoleDialog = true" size="small" [outlined]="true" />
          <span class="sub-info">Business responsibility — what the user does</span>
        </div>
        <p-table [value]="funcRoles()" [rows]="20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template #header><tr><th>Code</th><th>Name</th><th>Module</th><th>Category</th><th style="width:100px">Assigned</th></tr></ng-template>
          <ng-template #body let-r>
            <tr>
              <td class="mono fw-600">{{ r.code }}</td>
              <td>{{ r.name }}</td>
              <td><p-tag [value]="r.module_code || 'platform'" /></td>
              <td><p-tag [value]="r.category || 'general'" severity="info" /></td>
              <td>{{ r.assigned_count || 0 }}</td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="5" class="empty-msg">No functional roles</td></tr></ng-template>
        </p-table>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-lock"></i> Permissions</span></ng-template>
        <div class="sub-toolbar">
          <p-button label="Create Permission" icon="pi pi-plus" (onClick)="showPermCreateDialog = true" size="small" [outlined]="true" />
          <span class="sub-info">Action rights — [module].[resource].[action]</span>
        </div>
        <p-table [value]="perms()" [rows]="30" [paginator]="perms().length > 30" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template #header><tr><th>Code</th><th>Module</th><th>Resource</th><th>Action</th><th>Description</th></tr></ng-template>
          <ng-template #body let-p>
            <tr>
              <td class="mono fw-600">{{ p.code }}</td>
              <td>{{ p.module_code || '--' }}</td>
              <td>{{ p.resource || '--' }}</td>
              <td>{{ p.action || '--' }}</td>
              <td class="muted">{{ p.description || '--' }}</td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="5" class="empty-msg">No permissions registered</td></tr></ng-template>
        </p-table>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-sitemap"></i> Role → Permission Map</span></ng-template>
        <div class="sub-toolbar">
          <span class="sub-info">Links functional roles to permissions</span>
        </div>
        <p-table [value]="rolePerms()" [rows]="30" [paginator]="rolePerms().length > 30" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template #header><tr><th>Role</th><th>Permission</th></tr></ng-template>
          <ng-template #body let-rp>
            <tr>
              <td class="fw-600">{{ rp.role_code }} <span class="muted">({{ rp.role_name }})</span></td>
              <td class="mono">{{ rp.permission_code }}</td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="2" class="empty-msg">No role-permission mappings</td></tr></ng-template>
        </p-table>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-arrow-right-arrow-left"></i> Delegations</span></ng-template>
        <div class="sub-toolbar">
          <span class="sub-info">Temporary substitution — one user acts for another</span>
        </div>
        <p-table [value]="delegations()" [rows]="20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template #header><tr><th>Delegator</th><th>Delegate</th><th>Scope</th><th>Status</th><th>Reason</th><th>Expires</th></tr></ng-template>
          <ng-template #body let-d>
            <tr>
              <td class="mono">{{ d.delegator_id }}</td>
              <td class="mono">{{ d.delegate_id }}</td>
              <td>{{ d.permission_scope || 'all' }}</td>
              <td><p-tag [value]="d.status" [severity]="d.status === 'active' ? 'success' : 'secondary'" /></td>
              <td class="muted">{{ d.reason || '--' }}</td>
              <td class="mono">{{ d.expires_at ? (d.expires_at | date:'short') : 'never' }}</td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="6" class="empty-msg">No active delegations</td></tr></ng-template>
        </p-table>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-ban"></i> SoD Rules</span></ng-template>
        <div class="sub-toolbar">
          <span class="sub-info">Separation of Duties — what must be blocked from co-assignment</span>
        </div>
        <p-table [value]="sodRules()" [rows]="20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template #header><tr><th>Rule Code</th><th>Role A</th><th>Role B</th><th>Severity</th><th>Description</th></tr></ng-template>
          <ng-template #body let-s>
            <tr>
              <td class="mono fw-600">{{ s.rule_code }}</td>
              <td class="mono">{{ s.conflicting_role_a || '--' }}</td>
              <td class="mono">{{ s.conflicting_role_b || '--' }}</td>
              <td><p-tag [value]="s.severity" [severity]="s.severity === 'critical' ? 'danger' : s.severity === 'high' ? 'warn' : 'info'" /></td>
              <td class="muted">{{ s.description || '--' }}</td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="5" class="empty-msg">No SoD rules defined</td></tr></ng-template>
        </p-table>
      </p-tabpanel>

      <p-tabpanel>
        <ng-template #header><span><i class="pi pi-envelope"></i> Invitations</span></ng-template>
        <p-table [value]="invitations()" [rows]="20" styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true">
          <ng-template #header><tr><th>Email</th><th style="width:100px">Role</th><th style="width:100px">Status</th><th>Expires</th><th style="width:140px">Actions</th></tr></ng-template>
          <ng-template #body let-i>
            <tr>
              <td class="fw-600">{{ i.email }}</td><td>{{ i.role || 'default' }}</td>
              <td><p-tag [value]="i.status" [severity]="i.status === 'accepted' ? 'success' : i.status === 'pending' ? 'warn' : 'danger'" /></td>
              <td class="mono">{{ i.expires_at | date:'short' }}</td>
              <td>
                @if (i.status === 'pending') {
                  <p-button icon="pi pi-replay" (onClick)="resendInv(i.invitation_id)" [text]="true" size="small" />
                  <p-button icon="pi pi-times" (onClick)="revokeInv(i.invitation_id)" [text]="true" size="small" severity="danger" />
                }
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="5" class="empty-msg">No invitations</td></tr></ng-template>
        </p-table>
      </p-tabpanel>
    </p-tabs>

    <p-dialog header="Create Actor" [(visible)]="showCreateDialog" [modal]="true" [style]="{width:'480px'}">
      <div class="dialog-form">
        <div class="field"><label>Display Name</label><input pInputText [(ngModel)]="newActor.display_name" placeholder="Full name" class="w-full" /></div>
        <div class="field"><label>Email</label><input pInputText [(ngModel)]="newActor.email" type="email" placeholder="user&#64;dogan-ai.com" class="w-full" /></div>
        <div class="field"><label>Actor Type</label><input pInputText [(ngModel)]="newActor.actor_type" placeholder="user" class="w-full" /></div>
        @if (createErr()) { <p-message severity="error" [text]="createErr()" styleClass="w-full" /> }
      </div>
      <ng-template #footer>
        <p-button label="Cancel" (onClick)="showCreateDialog = false" [text]="true" />
        <p-button label="Create" icon="pi pi-check" (onClick)="createActor()" [loading]="createLoading()" />
      </ng-template>
    </p-dialog>

    <p-dialog header="Send Invitation" [(visible)]="showInviteDialog" [modal]="true" [style]="{width:'480px'}">
      <div class="dialog-form">
        <div class="field"><label>Email</label><input pInputText [(ngModel)]="newInvite.email" type="email" class="w-full" /></div>
        <div class="field"><label>Role</label><input pInputText [(ngModel)]="newInvite.role" placeholder="admin" class="w-full" /></div>
        @if (invErr()) { <p-message severity="error" [text]="invErr()" styleClass="w-full" /> }
      </div>
      <ng-template #footer>
        <p-button label="Cancel" (onClick)="showInviteDialog = false" [text]="true" />
        <p-button label="Send" icon="pi pi-send" (onClick)="sendInvite()" [loading]="invLoading()" />
      </ng-template>
    </p-dialog>

    <p-dialog header="Create Access Profile" [(visible)]="showProfileDialog" [modal]="true" [style]="{width:'480px'}">
      <div class="dialog-form">
        <div class="field"><label>Code</label><input pInputText [(ngModel)]="newProfile.code" placeholder="e.g. product_admin" class="w-full" /></div>
        <div class="field"><label>Name</label><input pInputText [(ngModel)]="newProfile.name" placeholder="Product Admin" class="w-full" /></div>
        <div class="field"><label>Description</label><input pInputText [(ngModel)]="newProfile.description" class="w-full" /></div>
      </div>
      <ng-template #footer>
        <p-button label="Cancel" (onClick)="showProfileDialog = false" [text]="true" />
        <p-button label="Create" icon="pi pi-check" (onClick)="createProfile()" />
      </ng-template>
    </p-dialog>

    <p-dialog header="Create Functional Role" [(visible)]="showRoleDialog" [modal]="true" [style]="{width:'480px'}">
      <div class="dialog-form">
        <div class="field"><label>Code</label><input pInputText [(ngModel)]="newRole.code" placeholder="e.g. tenant_operator" class="w-full" /></div>
        <div class="field"><label>Module Code</label><input pInputText [(ngModel)]="newRole.module_code" placeholder="platform_admin" class="w-full" /></div>
        <div class="field"><label>Name</label><input pInputText [(ngModel)]="newRole.name" placeholder="Tenant Operator" class="w-full" /></div>
        <div class="field"><label>Category</label><input pInputText [(ngModel)]="newRole.category" placeholder="platform" class="w-full" /></div>
      </div>
      <ng-template #footer>
        <p-button label="Cancel" (onClick)="showRoleDialog = false" [text]="true" />
        <p-button label="Create" icon="pi pi-check" (onClick)="createRole()" />
      </ng-template>
    </p-dialog>

    <p-dialog header="Create Permission" [(visible)]="showPermCreateDialog" [modal]="true" [style]="{width:'480px'}">
      <div class="dialog-form">
        <div class="field"><label>Code</label><input pInputText [(ngModel)]="newPerm.code" placeholder="platform.tenant.create" class="w-full" /></div>
        <div class="field"><label>Module</label><input pInputText [(ngModel)]="newPerm.module_code" placeholder="platform" class="w-full" /></div>
        <div class="field"><label>Resource</label><input pInputText [(ngModel)]="newPerm.resource" placeholder="tenant" class="w-full" /></div>
        <div class="field"><label>Action</label><input pInputText [(ngModel)]="newPerm.action" placeholder="create" class="w-full" /></div>
        <div class="field"><label>Description</label><input pInputText [(ngModel)]="newPerm.description" class="w-full" /></div>
      </div>
      <ng-template #footer>
        <p-button label="Cancel" (onClick)="showPermCreateDialog = false" [text]="true" />
        <p-button label="Create" icon="pi pi-check" (onClick)="createPerm()" />
      </ng-template>
    </p-dialog>

    <p-dialog header="Actor Permissions" [(visible)]="showPermDialog" [modal]="true" [style]="{width:'600px'}">
      @if (selPerms().length > 0) {
        <p-table [value]="selPerms()" [rows]="20" styleClass="p-datatable-sm" [scrollable]="true">
          <ng-template #header><tr><th>Permission</th><th>Source</th><th>Granted</th></tr></ng-template>
          <ng-template #body let-p><tr><td class="mono fw-600">{{ p.permission_code }}</td><td>{{ p.source }}</td><td class="mono">{{ p.granted_at | date:'short' }}</td></tr></ng-template>
        </p-table>
      } @else { <div class="empty-msg">No permissions assigned</div> }
    </p-dialog>
  `,
  styles: [`
    .authz-chain { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding: 12px 16px; background: linear-gradient(135deg, #eff6ff, #f0fdf4); border: 1px solid #bfdbfe; border-radius: 8px; flex-wrap: wrap; }
    .chain-label { font-size: 12px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.04em; }
    .chain-step { font-size: 12px; font-weight: 600; padding: 3px 10px; background: #fff; border: 1px solid #93c5fd; border-radius: 12px; color: #1d4ed8; }
    .chain-arrow { font-size: 10px; color: #64748b; }
    .toolbar { display: flex; gap: 8px; margin: 16px 0 0; flex-wrap: wrap; }
    .sub-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .sub-info { font-size: 12px; color: var(--dos-text-muted); font-style: italic; }
    .fw-600 { font-weight: 600; } .mono { font-family: monospace; font-size: 13px; } .muted { color: var(--dos-text-muted); font-size: 12px; }
    .empty-msg { text-align: center; padding: 24px; color: var(--dos-text-muted); } .w-full { width: 100%; }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; padding: 8px 0; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 13px; font-weight: 600; color: #475569; }
  `],
})
export class IdentityAccessComponent implements OnInit {
  private idSvc = inject(IdentityService);
  private invSvc = inject(InvitationService);
  private adminSvc = inject(PlatformAdminService);
  private msg = inject(MessageService);
  private confirm = inject(ConfirmationService);

  authzChain = ['Access Profile', 'Functional Role', 'Permission', 'Scope', 'Authority', 'SoD', 'Delegation'];

  actors = signal<Actor[]>([]); invitations = signal<Invitation[]>([]);
  profiles = signal<AccessProfileRow[]>([]); funcRoles = signal<FunctionalRoleRow[]>([]);
  perms = signal<PermissionRow[]>([]); rolePerms = signal<RolePermissionRow[]>([]);
  delegations = signal<DelegationRow[]>([]); sodRules = signal<SodRuleRow[]>([]);
  selPerms = signal<ActorPermission[]>([]);

  showCreateDialog = false; showInviteDialog = false; showPermDialog = false;
  showProfileDialog = false; showRoleDialog = false; showPermCreateDialog = false;
  newActor = { display_name: '', email: '', actor_type: 'user' }; createErr = signal(''); createLoading = signal(false);
  newInvite = { email: '', role: '' }; invErr = signal(''); invLoading = signal(false);
  newProfile = { code: '', name: '', description: '' };
  newRole = { code: '', module_code: '', name: '', category: '' };
  newPerm = { code: '', module_code: '', resource: '', action: '', description: '' };

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.idSvc.listActors().subscribe({ next: d => this.actors.set(d), error: () => this.actors.set([]) });
    this.invSvc.list().subscribe({ next: d => this.invitations.set(d), error: () => this.invitations.set([]) });
    this.adminSvc.getAccessProfiles().subscribe({ next: d => this.profiles.set(d), error: () => this.profiles.set([]) });
    this.adminSvc.getFunctionalRoles().subscribe({ next: d => this.funcRoles.set(d), error: () => this.funcRoles.set([]) });
    this.adminSvc.getPermissions().subscribe({ next: d => this.perms.set(d), error: () => this.perms.set([]) });
    this.adminSvc.getRolePermissions().subscribe({ next: d => this.rolePerms.set(d), error: () => this.rolePerms.set([]) });
    this.adminSvc.getDelegations().subscribe({ next: d => this.delegations.set(d), error: () => this.delegations.set([]) });
    this.adminSvc.getSodRules().subscribe({ next: d => this.sodRules.set(d), error: () => this.sodRules.set([]) });
  }

  createActor(): void {
    this.createErr.set('');
    if (!this.newActor.display_name || !this.newActor.email) { this.createErr.set('Name and email required'); return; }
    this.createLoading.set(true);
    this.idSvc.createActor(this.newActor).subscribe({ next: () => { this.showCreateDialog = false; this.newActor = { display_name: '', email: '', actor_type: 'user' }; this.createLoading.set(false); this.msg.add({ severity: 'success', summary: 'Actor Created' }); this.loadAll(); }, error: e => { this.createErr.set(e?.error?.message || 'Failed'); this.createLoading.set(false); } });
  }

  confirmDel(a: Actor): void {
    this.confirm.confirm({ message: `Delete "${a.display_name}"?`, header: 'Confirm', icon: 'pi pi-exclamation-triangle', accept: () => { this.idSvc.deleteActor(a.actor_id).subscribe({ next: () => { this.msg.add({ severity: 'success', summary: 'Deleted' }); this.loadAll(); }, error: () => this.msg.add({ severity: 'error', summary: 'Failed' }) }); } });
  }

  viewPerms(a: Actor): void {
    this.idSvc.getActorPermissions(a.actor_id).subscribe({ next: p => { this.selPerms.set(p); this.showPermDialog = true; }, error: () => { this.selPerms.set([]); this.showPermDialog = true; } });
  }

  sendInvite(): void {
    this.invErr.set('');
    if (!this.newInvite.email) { this.invErr.set('Email required'); return; }
    this.invLoading.set(true);
    this.invSvc.create({ email: this.newInvite.email, role: this.newInvite.role || undefined }).subscribe({ next: () => { this.showInviteDialog = false; this.newInvite = { email: '', role: '' }; this.invLoading.set(false); this.msg.add({ severity: 'success', summary: 'Invitation Sent' }); this.loadAll(); }, error: e => { this.invErr.set(e?.error?.message || 'Failed'); this.invLoading.set(false); } });
  }

  createProfile(): void {
    if (!this.newProfile.code || !this.newProfile.name) return;
    this.adminSvc.createAccessProfile(this.newProfile).subscribe({ next: () => { this.showProfileDialog = false; this.newProfile = { code: '', name: '', description: '' }; this.msg.add({ severity: 'success', summary: 'Profile Created' }); this.loadAll(); }, error: () => this.msg.add({ severity: 'error', summary: 'Failed' }) });
  }

  createRole(): void {
    if (!this.newRole.code || !this.newRole.name) return;
    this.adminSvc.createFunctionalRole(this.newRole).subscribe({ next: () => { this.showRoleDialog = false; this.newRole = { code: '', module_code: '', name: '', category: '' }; this.msg.add({ severity: 'success', summary: 'Role Created' }); this.loadAll(); }, error: () => this.msg.add({ severity: 'error', summary: 'Failed' }) });
  }

  createPerm(): void {
    if (!this.newPerm.code) return;
    this.adminSvc.createPermission(this.newPerm).subscribe({ next: () => { this.showPermCreateDialog = false; this.newPerm = { code: '', module_code: '', resource: '', action: '', description: '' }; this.msg.add({ severity: 'success', summary: 'Permission Created' }); this.loadAll(); }, error: () => this.msg.add({ severity: 'error', summary: 'Failed' }) });
  }

  resendInv(id: string): void { this.invSvc.resend(id).subscribe({ next: () => this.msg.add({ severity: 'success', summary: 'Resent' }), error: () => this.msg.add({ severity: 'error', summary: 'Failed' }) }); }
  revokeInv(id: string): void { this.invSvc.revoke(id).subscribe({ next: () => { this.msg.add({ severity: 'success', summary: 'Revoked' }); this.loadAll(); }, error: () => this.msg.add({ severity: 'error', summary: 'Failed' }) }); }
}
