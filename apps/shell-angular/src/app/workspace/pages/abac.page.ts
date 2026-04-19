import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, AbacPolicyRow } from '../admin-api.service';

@Component({
  selector: 'dgn-abac',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-h">ABAC policies</h1>
    <p class="page-sub">Upsert a CEL-subset policy and run a check against synthetic attributes.</p>

    <div class="grid2">
      <div class="panel">
        <h3>Upsert policy</h3>
        <div class="field"><label>code (unique per tenant)</label><input [(ngModel)]="code"/></div>
        <div class="field"><label>name</label><input [(ngModel)]="name"/></div>
        <div class="field"><label>effect</label>
          <select [(ngModel)]="effect">
            <option value="permit">permit</option>
            <option value="deny">deny</option>
          </select>
        </div>
        <div class="field"><label>resource</label><input [(ngModel)]="resource" placeholder="contract"/></div>
        <div class="field"><label>action</label><input [(ngModel)]="action" placeholder="approve"/></div>
        <div class="field"><label>expression (CEL subset)</label>
          <textarea [(ngModel)]="expression" rows="4" placeholder='user.department == resource.department'></textarea>
        </div>
        <div class="field"><label>priority (0-10000)</label><input type="number" [(ngModel)]="priority"/></div>
        <div class="field"><label>enabled</label>
          <select [(ngModel)]="enabled">
            <option [ngValue]="true">true</option>
            <option [ngValue]="false">false</option>
          </select>
        </div>
        <div class="actions">
          <button class="btn-pri" type="button" [disabled]="busyU()" (click)="upsert()">Upsert</button>
        </div>
        @if (uMsg()) { <div class="ok" style="margin-top:.75rem">{{ uMsg() }}</div> }
        @if (uErr()) { <div class="err" style="margin-top:.75rem">{{ uErr() }}</div> }
      </div>

      <div class="panel">
        <h3>Check decision</h3>
        <div class="field"><label>resource</label><input [(ngModel)]="cResource"/></div>
        <div class="field"><label>action</label><input [(ngModel)]="cAction"/></div>
        <div class="field"><label>user (JSON)</label><textarea [(ngModel)]="cUser" rows="3">{}</textarea></div>
        <div class="field"><label>resource_attrs (JSON)</label><textarea [(ngModel)]="cAttrs" rows="3">{}</textarea></div>
        <div class="field"><label>env (JSON)</label><textarea [(ngModel)]="cEnv" rows="2">{}</textarea></div>
        <div class="actions">
          <button class="btn-pri" type="button" [disabled]="busyC()" (click)="check()">Run check</button>
        </div>
        @if (cErr()) { <div class="err" style="margin-top:.75rem">{{ cErr() }}</div> }
        <pre style="margin-top:.5rem">{{ cOut() }}</pre>
      </div>
    </div>

    <div class="panel">
      <div class="toolbar">
        <h3 style="margin:0">Existing policies</h3>
        <button class="btn-mini" type="button" (click)="reload()">Refresh</button>
      </div>
      @if (rows().length === 0) { <div class="empty">No policies.</div> }
      @else {
        <table>
          <thead><tr><th>code</th><th>name</th><th>effect</th><th>resource</th><th>action</th><th>prio</th><th>enabled</th><th></th></tr></thead>
          <tbody>
            @for (p of rows(); track p.id) {
              <tr>
                <td><code>{{ p.code }}</code></td>
                <td>{{ p.name }}</td>
                <td><span class="badge" [class.up]="p.effect==='permit'" [class.down]="p.effect==='deny'">{{ p.effect }}</span></td>
                <td><code>{{ p.resource }}</code></td>
                <td><code>{{ p.action }}</code></td>
                <td>{{ p.priority }}</td>
                <td>{{ p.enabled ? 'yes' : 'no' }}</td>
                <td><button class="btn-dng" type="button" (click)="del(p)">Delete</button></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class AbacPage implements OnInit {
  private readonly api = inject(AdminApiService);
  code = ''; name = ''; effect: 'permit' | 'deny' = 'permit';
  resource = ''; action = ''; expression = ''; priority = 100; enabled = true;
  cResource = ''; cAction = ''; cUser = '{}'; cAttrs = '{}'; cEnv = '{}';
  readonly busyU = signal(false);
  readonly busyC = signal(false);
  readonly uMsg = signal<string | null>(null);
  readonly uErr = signal<string | null>(null);
  readonly cOut = signal('');
  readonly cErr = signal<string | null>(null);
  readonly rows = signal<AbacPolicyRow[]>([]);

  ngOnInit(): void { void this.reload(); }

  async reload(): Promise<void> {
    const r = await this.api.listAbacPolicies();
    if (r.ok && r.data) this.rows.set(r.data.policies);
  }
  async upsert(): Promise<void> {
    this.busyU.set(true); this.uMsg.set(null); this.uErr.set(null);
    const r = await this.api.upsertAbacPolicy({
      code: this.code.trim(), name: this.name.trim(), effect: this.effect,
      resource: this.resource.trim(), action: this.action.trim(),
      expression: this.expression, priority: this.priority, enabled: this.enabled,
    });
    this.busyU.set(false);
    if (r.ok && r.data) { this.uMsg.set(`policy_id=${r.data.policy_id}`); void this.reload(); }
    else this.uErr.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async check(): Promise<void> {
    this.busyC.set(true); this.cErr.set(null); this.cOut.set('');
    let user: Record<string, unknown>; let attrs: Record<string, unknown>; let env: Record<string, unknown>;
    try {
      user = JSON.parse(this.cUser); attrs = JSON.parse(this.cAttrs); env = JSON.parse(this.cEnv);
    } catch (e) { this.busyC.set(false); this.cErr.set('invalid JSON: ' + (e as Error).message); return; }
    const r = await this.api.abacCheck({
      resource: this.cResource.trim(), action: this.cAction.trim(),
      user, resource_attrs: attrs, env,
    });
    this.busyC.set(false);
    if (r.ok) this.cOut.set(JSON.stringify(r.data, null, 2));
    else this.cErr.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async del(p: AbacPolicyRow): Promise<void> {
    const r = await this.api.deleteAbacPolicy(p.id);
    if (r.ok) void this.reload();
    else this.uErr.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
