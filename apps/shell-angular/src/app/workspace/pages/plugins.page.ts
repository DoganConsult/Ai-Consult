import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, PluginRow } from '../admin-api.service';

@Component({
  selector: 'dgn-plugins',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-h">Plugin marketplace</h1>
    <p class="page-sub">Cosign-bound submission, SBOM + Grype-style vulnerability scoring, capability allowlist.</p>

    <div class="panel">
      <h3>Submit plugin</h3>
      <div class="grid2">
        <div class="field"><label>code</label><input [(ngModel)]="cCode" placeholder="my-plugin"/></div>
        <div class="field"><label>version</label><input [(ngModel)]="cVer" placeholder="1.0.0"/></div>
        <div class="field"><label>bundle_sha256 (64 hex)</label><input [(ngModel)]="cSha"/></div>
        <div class="field"><label>cosign_signer</label><input [(ngModel)]="cSigner"/></div>
        <div class="field"><label>cosign_signature</label><input [(ngModel)]="cSig"/></div>
        <div class="field"><label>capabilities (csv)</label><input [(ngModel)]="cCaps" placeholder="http.fetch,events.publish"/></div>
        <div class="field" style="grid-column:1/-1"><label>SBOM packages JSON</label>
          <input [(ngModel)]="cSbom" placeholder='[{"name":"x","version":"1.0.0"}]'/></div>
        <div class="field" style="grid-column:1/-1"><label>vulnerabilities JSON</label>
          <input [(ngModel)]="cVulns" placeholder='[]'/></div>
        <div class="field" style="grid-column:1/-1"><label>manifest JSON</label>
          <input [(ngModel)]="cMan" placeholder='{}'/></div>
      </div>
      <div class="actions"><button class="btn-pri" type="button" [disabled]="busy()" (click)="submit()">Submit</button></div>
      @if (msg()) { <div class="ok" style="margin-top:.75rem">{{ msg() }}</div> }
      @if (err()) { <div class="err" style="margin-top:.75rem">{{ err() }}</div> }
      @if (caps().length) { <div class="page-sub">Allowed capabilities: <code>{{ caps().join(', ') }}</code></div> }
    </div>

    <div class="panel">
      <div class="toolbar"><h3 style="margin:0">Plugins</h3>
        <button class="btn-mini" type="button" (click)="reload()">Refresh</button></div>
      @if (rows().length === 0) { <div class="empty">No plugins.</div> }
      @else {
        <table>
          <thead><tr><th>code</th><th>ver</th><th>state</th><th>cosign</th><th>caps</th><th>signer</th><th></th></tr></thead>
          <tbody>
            @for (p of rows(); track p.id) {
              <tr>
                <td><code>{{ p.code }}</code></td><td>{{ p.version }}</td>
                <td><span class="badge" [class.up]="p.state==='installed'||p.state==='verified'" [class.down]="p.state==='disabled'||p.state==='failed'">{{ p.state }}</span></td>
                <td>{{ p.cosign_verified }}</td>
                <td><code>{{ p.capabilities.join(',') }}</code></td>
                <td>{{ p.cosign_signer }}</td>
                <td>
                  @if (p.state==='verified') { <button class="btn-pri" type="button" (click)="install(p)">Install</button> }
                  @if (p.state==='installed') { <button class="btn-dng" type="button" (click)="disable(p)">Disable</button> }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class PluginsPage implements OnInit {
  private readonly api = inject(AdminApiService);
  cCode=''; cVer=''; cSha=''; cSigner=''; cSig=''; cCaps='';
  cSbom='[]'; cVulns='[]'; cMan='{}';
  readonly busy = signal(false);
  readonly msg = signal<string | null>(null);
  readonly err = signal<string | null>(null);
  readonly rows = signal<PluginRow[]>([]);
  readonly caps = signal<string[]>([]);

  ngOnInit(): void { void this.reload(); }
  async reload(): Promise<void> {
    const r = await this.api.listPlugins();
    if (r.ok && r.data) { this.rows.set(r.data.plugins); this.caps.set(r.data.capabilities); this.err.set(null); }
    else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async submit(): Promise<void> {
    this.busy.set(true); this.msg.set(null); this.err.set(null);
    try {
      const sha = this.cSha.trim();
      const r = await this.api.submitPlugin({
        code: this.cCode.trim(), version: this.cVer.trim(), bundle_sha256: sha,
        cosign_signer: this.cSigner.trim(),
        cosign_payload: { bundle_sha256: sha, signer: this.cSigner.trim(), signature: this.cSig.trim() },
        sbom: { format: 'cyclonedx', packages: JSON.parse(this.cSbom || '[]') },
        vulnerabilities: JSON.parse(this.cVulns || '[]'),
        capabilities: this.cCaps.split(',').map((s) => s.trim()).filter(Boolean),
        manifest: JSON.parse(this.cMan || '{}'),
      });
      this.busy.set(false);
      if (r.ok && r.data) { this.msg.set(`id=${r.data.id} verified=${r.data.cosign_verified} blocking=${r.data.blocking_vulnerabilities}`); void this.reload(); }
      else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
    } catch (e) { this.busy.set(false); this.err.set((e as Error).message); }
  }
  async install(p: PluginRow): Promise<void> {
    const r = await this.api.installPlugin(p.id);
    if (r.ok) void this.reload(); else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
  async disable(p: PluginRow): Promise<void> {
    if (!confirm(`Disable ${p.code}?`)) return;
    const r = await this.api.disablePlugin(p.id);
    if (r.ok) void this.reload(); else this.err.set(`HTTP ${r.status}: ${r.error ?? ''}`);
  }
}
