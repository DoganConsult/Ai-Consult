import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminApiService, ProductRow, ModuleRow } from '../admin-api.service';

@Component({
  selector: 'dgn-inventory',
  standalone: true,
  template: `
    <h1 class="page-h">Inventory</h1>
    <p class="page-sub">Registered products and modules in the platform registry. Read-only; load-time scanned from manifests.</p>

    <div class="grid2">
      <div class="panel">
        <div class="toolbar">
          <h3 style="margin:0">Products</h3>
          <button class="btn-mini" type="button" (click)="reload()">Refresh</button>
        </div>
        @if (products().length === 0) { <div class="empty">No products.</div> }
        @else {
          <table>
            <thead><tr><th>code</th><th>name</th><th>latest_version</th></tr></thead>
            <tbody>
              @for (p of products(); track p.id) {
                <tr>
                  <td><code>{{ p.code }}</code></td>
                  <td>{{ p.name }}</td>
                  <td><code>{{ p.latest_version ?? '—' }}</code></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <div class="panel">
        <h3>Modules</h3>
        @if (modules().length === 0) { <div class="empty">No modules.</div> }
        @else {
          <table>
            <thead><tr><th>product</th><th>code</th><th>name</th></tr></thead>
            <tbody>
              @for (m of modules(); track m.id) {
                <tr>
                  <td><code>{{ m.product_code }}</code></td>
                  <td><code>{{ m.code }}</code></td>
                  <td>{{ m.name }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
    @if (err()) { <div class="err" style="margin-top:.75rem">{{ err() }}</div> }
  `,
})
export class InventoryPage implements OnInit {
  private readonly api = inject(AdminApiService);
  readonly products = signal<ProductRow[]>([]);
  readonly modules = signal<ModuleRow[]>([]);
  readonly err = signal<string | null>(null);

  ngOnInit(): void { void this.reload(); }
  async reload(): Promise<void> {
    const [p, m] = await Promise.all([this.api.listProducts(), this.api.listModules()]);
    if (p.ok && p.data) this.products.set(p.data.products);
    else this.err.set(`products HTTP ${p.status}: ${p.error ?? ''}`);
    if (m.ok && m.data) this.modules.set(m.data.modules);
    else this.err.set((this.err() ?? '') + ` modules HTTP ${m.status}: ${m.error ?? ''}`);
  }
}
