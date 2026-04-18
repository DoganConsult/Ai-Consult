import { Component, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'dgn-landing',
  standalone: true,
  template: `
    <div class="container">
      <header style="display:flex;align-items:center;justify-content:space-between;padding:1rem 0">
        <strong style="font-size:1.25rem">Dogan AI OS</strong>
        <button class="btn" (click)="login()">Sign in</button>
      </header>

      <section style="padding:4rem 0 2rem">
        <h1 style="font-size:2.4rem;margin:0 0 0.5rem">The platform plane for multi-tenant AI products.</h1>
        <p class="muted" style="font-size:1.1rem;max-width:640px">
          DAuth + DOS + DSOC + DNOC. Keycloak identity, OpenFGA authorization,
          Postgres-18 RLS isolation, NATS event bus, Temporal workflows.
        </p>
        <div style="margin-top:1.5rem;display:flex;gap:0.75rem">
          <button class="btn" (click)="login()">Open operator workspace</button>
          <a class="btn ghost" href="https://api.dogan-ai.com/platform" target="_blank" rel="noopener">View platform banner</a>
        </div>
      </section>

      <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-top:2rem">
        <div class="card"><strong>DAuth</strong><p class="muted">Identity, JWT, OpenFGA, ABAC, SoD, risk scoring.</p></div>
        <div class="card"><strong>DOS</strong><p class="muted">Kernel, product loader, module registry, gateway.</p></div>
        <div class="card"><strong>DSOC</strong><p class="muted">Audit log, anomaly detection, evidence trail.</p></div>
        <div class="card"><strong>DNOC</strong><p class="muted">Readiness, metrics, SLOs, capacity.</p></div>
      </section>

      <footer class="muted" style="margin-top:3rem;padding:1.5rem 0;border-top:1px solid var(--border);font-size:0.85rem">
        Powered by Dogan AI OS · DAuth/DOS/DSOC/DNOC
      </footer>
    </div>
  `,
})
export class LandingComponent {
  private readonly auth = inject(AuthService);
  login(): void { void this.auth.login('/workspace'); }
}
