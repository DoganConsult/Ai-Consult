import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, SodRuleRow } from '../admin-api.service';

@Component({
  selector: 'dgn-sod',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-h">SoD rules</h1>
    <p class="page-sub">Static rules block grants; dynamic rules block runtime actions.</p>

    <div class="panel">
      <h3>Upsert rule</h3>
      <div class="grid2">
        <div class="field"><label>code</label><input [(ngModel)]="code"/></div>
        <div class="field"><label>name</label><input [(ngModel)]="name"/></div>
        <div class="field"><label>kind</label>
          <select [(ngModel)]="kind">
            <option value="static">static</option>
            <option value="dynamic">dynamic</option>
          </select>
        </div>
        <div class="field"><label>enforce</label>
          <select [(ngModel)]="enforce">
            <option value="block">block</option>
            <option value="warn">warn</option>
          </select>
        </div>
        <div class="field"><label>conflict_set (comma)</label>
          <input [(ngModel)]="conflictSet" placeholder="contracts.creator,contracts.approver"/>
        </div>
        <div class="field"><label>mitigation (optional)</label><input [(ngModel)]="mitigation"/></div>
        <div class="field"><label>enabled</label>
          <select [(ngModel)]="enabled">
            <option [ngValue]="true">true</option>
            <option [ngValue]="false">false</option>
          </select>
        </div>
      </div>
      <div class="actions">
        <button class="btn-pri" type="button" [disabled]="busy()" (click)="upsert()">Upsert</button>
      </div>
      @if (msg()) { <div class="ok" style="margin-top:.75rem">{{ msg() }}</div> }
      @if (err()) { <div class="err" style="margin-top:.75rem">{{ err() }}</div> }
    </div>

    <div class="panel">
      <div class="toolbar">
        <h3 style="margin:0">Existing rules</h3>
        <button class="btn-mini" type="button" (click)="reload()">Refresh</button>
      </div>
      @if (rows().length === 0) { <div class="empty">No rules.</div> }
      @else {
        <table>
          <thead><tr><th>code</th><th>name</th><th>kind</th><th>enforce</th><th>conflict</th><th>enabled</th><th></th></tr></thead>
          <tbody>
            @for (r of rows(); track r.id) {
              <tr>
                <td><code>{{ r.code }}</code></td>
                <td>{{ r.name }}</td>
                <td><span class="badge">{{ r.kind }}</span></td>
                <td><span class="badge" [class.down]="r.enforce==='block'" [class.warn]="r.enforce==='warn'">{{ r.enforce }}</span></td>
                <td><code>{{ r.conflict_set.join(', ') }}</code></td>
                <td>{{ r.enabled ? 'yes' : 'no' }}</td>
                <td><button class="btn-dng" type="button" (click)="del(r)">Delete</button></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class SodPage implements OnInit {
  private readonly api = inject(AdminApiService);
  code = ''; name = ''; kind: 'static' | 'dynamic' = 'static';
  enforce: 'block' | 'warn' = 'block';
  conflictSet = ''; mitigation = ''; enabled = true;
  readonly busy = signal(false);
  readonly msg = signal<string | null>(null);
  readonly err = signal<string | null>(null);
  readonly rows = signal<SodRuleRow[]>([]);

  ngOnInit(): void { void this.reload(); }

  async reload(): Promise<void> {
    const r = await this.api.listSodRules();
    if (r.ok && r.data) this.rows.set(r.data.rules);
  }
  async upsert(): Promise<void> {
    this.busy.set(true); this.msg.set(null); this.err.set(null);
    const conflict = this.conflictSet.split(',').map((s) => s.trim()).filter(Boolean);
    if (conflict.length < 2) { this.busy.set(false); this.err.set('conflict_set requires at least 2 entries'); return; }
    const r = await this.api.upsertSodRule({
      code: this.code.trim(), name: this.name.trim(), kind: this.kind,
      conflict_set: conflict, enforce: this.enforce,
      mitigation: this.mitigation.trim() || undefined, enabled: this.enabled,
    });
    this.busy.set(false);
    if (r.ok && r.data) { this.msg.set(`rule_id=${r.data.rule_id}`); void this.reload(); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async del(row: SodRuleRow): Promise<void> {
    const r = await this.api.deleteSodRule(row.id);
    if (r.ok) void this.reload();
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
