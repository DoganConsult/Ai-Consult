import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, UserRow } from '../admin-api.service';

@Component({
  selector: 'dgn-users',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-h">Users</h1>
    <p class="page-sub">Provision a user inside the active tenant. Bridges Keycloak + <code>platform.users</code> + OpenFGA tuples.</p>

    <div class="panel">
      <h3>Provision user</h3>
      <div class="grid2">
        <div class="field"><label>email</label><input [(ngModel)]="email" placeholder="user@tenant.com"/></div>
        <div class="field"><label>username (optional)</label><input [(ngModel)]="username"/></div>
        <div class="field"><label>password (optional, min 12)</label><input type="password" [(ngModel)]="password"/></div>
        <div class="field"><label>products (comma)</label><input [(ngModel)]="products" placeholder="consult,sbg"/></div>
        <div class="field"><label>roles (comma)</label><input [(ngModel)]="roles" placeholder="member,reader"/></div>
      </div>
      <div class="actions">
        <button class="btn-pri" type="button" [disabled]="busy()" (click)="create()">Provision user</button>
      </div>
      @if (okMsg()) { <div class="ok" style="margin-top:.75rem">{{ okMsg() }}</div> }
      @if (errMsg()) { <div class="err" style="margin-top:.75rem">{{ errMsg() }}</div> }
    </div>

    <div class="panel">
      <div class="toolbar">
        <h3 style="margin:0">Existing users (current tenant)</h3>
        <button class="btn-mini" type="button" (click)="reload()">Refresh</button>
      </div>
      @if (rows().length === 0) { <div class="empty">No users.</div> }
      @else {
        <table>
          <thead><tr><th>id</th><th>email</th><th>role</th><th>status</th><th>external_sub</th><th>created_at</th><th></th></tr></thead>
          <tbody>
            @for (u of rows(); track u.id) {
              <tr>
                <td><code>{{ u.id }}</code></td>
                <td>
                  @if (editId() === u.id) { <input [(ngModel)]="eEmail"/> }
                  @else { {{ u.email }} }
                </td>
                <td><code>{{ u.role }}</code></td>
                <td>
                  @if (editId() === u.id) {
                    <select [(ngModel)]="eStatus">
                      <option>active</option><option>disabled</option>
                    </select>
                  } @else {
                    <span class="badge" [class.up]="u.status==='active'" [class.down]="u.status==='disabled'">{{ u.status }}</span>
                  }
                </td>
                <td><code>{{ u.external_sub ?? '—' }}</code></td>
                <td>{{ u.created_at }}</td>
                <td style="white-space:nowrap">
                  @if (editId() === u.id) {
                    <button class="btn-pri" type="button" (click)="save(u)">Save</button>
                    <button class="btn-mini" type="button" (click)="editId.set(null)">Cancel</button>
                  } @else {
                    <button class="btn-mini" type="button" (click)="edit(u)">Edit</button>
                    <button class="btn-dng" type="button" (click)="disable(u)">Disable</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class UsersPage implements OnInit {
  private readonly api = inject(AdminApiService);
  email = ''; username = ''; password = ''; products = ''; roles = '';
  eEmail = ''; eStatus = 'active';
  readonly busy = signal(false);
  readonly okMsg = signal<string | null>(null);
  readonly errMsg = signal<string | null>(null);
  readonly rows = signal<UserRow[]>([]);
  readonly editId = signal<string | null>(null);

  ngOnInit(): void { void this.reload(); }

  async create(): Promise<void> {
    this.busy.set(true); this.okMsg.set(null); this.errMsg.set(null);
    const products = this.products.split(',').map((s) => s.trim()).filter(Boolean);
    const roles = this.roles.split(',').map((s) => s.trim()).filter(Boolean);
    const r = await this.api.createUser({
      email: this.email.trim(),
      username: this.username.trim() || undefined,
      password: this.password.length > 0 ? this.password : undefined,
      products, roles,
    });
    this.busy.set(false);
    if (r.ok && r.data) { this.okMsg.set(`user id=${r.data.user_id} · keycloak=${r.data.keycloak_id ?? '—'}`); void this.reload(); }
    else this.errMsg.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async reload(): Promise<void> {
    const r = await this.api.listUsers();
    if (r.ok && r.data) this.rows.set(r.data.users);
    else this.errMsg.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  edit(u: UserRow): void { this.editId.set(u.id); this.eEmail = u.email; this.eStatus = u.status; }
  async save(u: UserRow): Promise<void> {
    const r = await this.api.patchUser(u.id, { email: this.eEmail, status: this.eStatus });
    if (r.ok) { this.editId.set(null); void this.reload(); }
    else this.errMsg.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async disable(u: UserRow): Promise<void> {
    const r = await this.api.disableUser(u.id);
    if (r.ok) void this.reload();
    else this.errMsg.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
