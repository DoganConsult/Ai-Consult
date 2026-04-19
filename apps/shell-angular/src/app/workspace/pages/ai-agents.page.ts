import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, AiAgentRow } from '../admin-api.service';

@Component({
  selector: 'dgn-ai-agents',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-h">AI agent registry</h1>
    <p class="page-sub">Versioned agent graphs with tool allowlist and cost / token caps.</p>

    <div class="panel">
      <h3>Create agent graph</h3>
      <div class="grid2">
        <div class="field"><label>code</label><input [(ngModel)]="cCode" placeholder="risk-triage"/></div>
        <div class="field"><label>version</label><input type="number" [(ngModel)]="cVer" min="1"/></div>
        <div class="field" style="grid-column:1/-1"><label>graph JSON (nodes + edges)</label>
          <textarea [(ngModel)]="cGraph" rows="6"
            placeholder='{"nodes":[{"id":"s","kind":"start"},{"id":"e","kind":"end"}],"edges":[{"from":"s","to":"e"}]}'></textarea>
        </div>
        <div class="field"><label>tools_allowed (csv)</label><input [(ngModel)]="cTools"/></div>
        <div class="field"><label>cost_cap_usd</label><input type="number" [(ngModel)]="cUsd" step="0.01"/></div>
        <div class="field"><label>token_cap</label><input type="number" [(ngModel)]="cTok"/></div>
      </div>
      <div class="actions"><button class="btn-pri" type="button" [disabled]="busy()" (click)="create()">Create</button></div>
      @if (msg()) { <div class="ok" style="margin-top:.75rem">{{ msg() }}</div> }
      @if (err()) { <div class="err" style="margin-top:.75rem">{{ err() }}</div> }
      @if (tools().length) { <div class="page-sub">Allowed tools: <code>{{ tools().join(', ') }}</code></div> }
    </div>

    <div class="panel">
      <div class="toolbar"><h3 style="margin:0">Agents</h3>
        <button class="btn-mini" type="button" (click)="reload()">Refresh</button></div>
      @if (rows().length === 0) { <div class="empty">No agents.</div> }
      @else {
        <table>
          <thead><tr><th>code</th><th>v</th><th>tools</th><th>cost_cap</th><th>tok_cap</th>
            <th>eval</th><th>published</th><th></th></tr></thead>
          <tbody>
            @for (a of rows(); track a.id) {
              <tr>
                <td><code>{{ a.code }}</code></td><td>{{ a.version }}</td>
                <td><code>{{ a.tools_allowed.join(',') }}</code></td>
                <td>{{ a.cost_cap_usd ?? '—' }}</td><td>{{ a.token_cap ?? '—' }}</td>
                <td>{{ a.eval_score ?? '—' }}</td>
                <td><span class="badge" [class.up]="a.published" [class.down]="!a.published">{{ a.published }}</span></td>
                <td>
                  @if (!a.published) { <button class="btn-pri" type="button" (click)="publish(a)">Publish</button> }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class AiAgentsPage implements OnInit {
  private readonly api = inject(AdminApiService);
  cCode=''; cVer=1; cGraph='{"nodes":[{"id":"s","kind":"start"},{"id":"e","kind":"end"}],"edges":[{"from":"s","to":"e"}]}';
  cTools=''; cUsd=0; cTok=0;
  readonly busy = signal(false);
  readonly msg = signal<string | null>(null);
  readonly err = signal<string | null>(null);
  readonly rows = signal<AiAgentRow[]>([]);
  readonly tools = signal<string[]>([]);

  ngOnInit(): void { void this.reload(); }
  async reload(): Promise<void> {
    const r = await this.api.listAiAgents();
    if (r.ok && r.data) { this.rows.set(r.data.agents); this.tools.set(r.data.tools_allowlist); this.err.set(null); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async create(): Promise<void> {
    this.busy.set(true); this.msg.set(null); this.err.set(null);
    try {
      const r = await this.api.createAiAgent({
        code: this.cCode.trim(), version: Number(this.cVer),
        graph: JSON.parse(this.cGraph),
        tools_allowed: this.cTools.split(',').map((s) => s.trim()).filter(Boolean),
        cost_cap_usd: this.cUsd > 0 ? Number(this.cUsd) : undefined,
        token_cap: this.cTok > 0 ? Number(this.cTok) : undefined,
      });
      this.busy.set(false);
      if (r.ok && r.data) { this.msg.set(`id=${r.data.id}`); void this.reload(); }
      else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
    } catch (e) { this.busy.set(false); this.err.set((e as Error).message); }
  }
  async publish(a: AiAgentRow): Promise<void> {
    const r = await this.api.publishAiAgent(a.id);
    if (r.ok) void this.reload(); else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
