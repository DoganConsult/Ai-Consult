import { Component, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

interface Capability { title: string; desc: string; tag: string; }

@Component({
  selector: 'dgn-landing',
  standalone: true,
  styles: [`
    .hdr { position: sticky; top: 0; z-index: 10; background: #161616; color: #fff; height: 48px;
      display: flex; align-items: center; padding: 0 1rem; border-bottom: 1px solid #393939; }
    .hdr .brand { font-weight: 600; letter-spacing: 0.16px; font-size: 0.875rem; }
    .hdr .brand small { color: #c6c6c6; font-weight: 400; margin-left: 0.5rem; }
    .hdr .spacer { flex: 1; }
    .hdr a, .hdr button { color: #fff; background: transparent; border: 0; font-size: 0.875rem;
      padding: 0 1rem; height: 48px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; }
    .hdr a:hover, .hdr button:hover { background: #353535; text-decoration: none; }
    .hdr .login { background: #0f62fe; padding: 0 1.25rem; }
    .hdr .login:hover { background: #0050e6; }
    .hdr .icon { width: 18px; height: 18px; display: inline-block; }
    .hero { padding: 5rem 0 4rem; background:
      linear-gradient(180deg, #f4f4f4 0%, #ffffff 100%); border-bottom: 1px solid #e0e0e0; }
    .hero h1 { font-size: 3rem; line-height: 1.1; font-weight: 300; letter-spacing: 0; margin: 0 0 1rem; max-width: 880px; }
    .hero p { font-size: 1.125rem; color: #525252; max-width: 720px; margin: 0 0 2rem; }
    .hero .cta-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .grid { display: grid; gap: 1px; background: #e0e0e0; }
    .grid.c4 { grid-template-columns: repeat(4, 1fr); }
    .grid.c3 { grid-template-columns: repeat(3, 1fr); }
    .grid.c2 { grid-template-columns: repeat(2, 1fr); }
    @media (max-width: 960px) { .grid.c4, .grid.c3 { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .grid.c4, .grid.c3, .grid.c2 { grid-template-columns: 1fr; } }
    .tile { background: #fff; padding: 2rem 1.5rem; min-height: 200px; transition: background 100ms; }
    .tile:hover { background: #f4f4f4; }
    .tile h3 { margin: 0 0 0.5rem; font-size: 1.125rem; font-weight: 400; }
    .tile p { color: #525252; margin: 0; font-size: 0.875rem; }
    .tile .num { font-size: 0.75rem; color: #6f6f6f; letter-spacing: 0.32px; margin-bottom: 1rem; }
    .pillar { background: #fff; padding: 2rem 1.5rem; }
    .pillar.dark { background: #161616; color: #fff; }
    .pillar.dark p { color: #c6c6c6; }
    .pillar h2 { font-size: 1.75rem; font-weight: 300; margin: 0 0 0.5rem; }
    .pillar code { font-size: 0.78rem; }
    section { padding: 4rem 0; }
    .section-eyebrow { font-size: 0.75rem; letter-spacing: 0.32px; color: #525252; text-transform: uppercase; margin-bottom: 0.75rem; }
    .section-title { font-size: 2rem; font-weight: 300; margin: 0 0 2rem; max-width: 720px; }
    footer { background: #161616; color: #c6c6c6; padding: 2.5rem 0; font-size: 0.8125rem; }
    footer .row { display: flex; gap: 2rem; flex-wrap: wrap; align-items: baseline; }
    footer strong { color: #fff; }
  `],
  template: `
    <header class="hdr">
      <span class="brand">Dogan <small>AI OS</small></span>
      <a href="#capabilities">Capabilities</a>
      <a href="#pillars">Pillars</a>
      <a href="#stack">Stack</a>
      <span class="spacer"></span>
      <a href="https://api.dogan-ai.com/platform" target="_blank" rel="noopener">Platform banner</a>
      <a class="login" href="https://admin.dogan-ai.com" aria-label="Sign in to operator workspace">
        <svg class="icon" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
          <path d="M16 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm0 14c5.5 0 10 3.6 10 8v2H6v-2c0-4.4 4.5-8 10-8Z"/>
        </svg>
        Sign in
      </a>
    </header>

    <section class="hero">
      <div class="container">
        <span class="tag brand">v0.1 · operator preview</span>
        <h1>The platform plane for multi-tenant AI products.</h1>
        <p>Dogan AI OS is the substrate. Identity, isolation, security operations,
        and reliability live in four pillars — DAuth, DOS, DSOC, DNOC — so every product
        you ship inherits enterprise guarantees by construction.</p>
        <div class="cta-row">
          <button class="btn" type="button" (click)="login()">
            Open operator workspace
            <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
              <path d="M18 6l-1.43 1.4L24.15 15H4v2h20.15l-7.58 7.6L18 26l10-10z"/>
            </svg>
          </button>
          <a class="btn ghost" href="#capabilities">See capabilities</a>
        </div>
      </div>
    </section>

    <section id="capabilities">
      <div class="container">
        <div class="section-eyebrow">Capabilities</div>
        <h2 class="section-title">Everything a tenant-facing AI product expects from a real operating system.</h2>
        <div class="grid c4">
          @for (c of capabilities; track c.title; let i = $index) {
            <div class="tile">
              <div class="num">0{{ i + 1 }} — {{ c.tag }}</div>
              <h3>{{ c.title }}</h3>
              <p>{{ c.desc }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <section id="pillars" style="background:#f4f4f4">
      <div class="container">
        <div class="section-eyebrow">The four pillars</div>
        <h2 class="section-title">DAuth · DOS · DSOC · DNOC</h2>
        <div class="grid c2">
          <div class="pillar dark">
            <div class="num" style="color:#8d8d8d">D01</div>
            <h2>DAuth</h2>
            <p>Keycloak-issued OIDC, PKCE, JWT verification, OpenFGA fine-grained
              authz, ABAC + Separation of Duties, and a risk engine fed by LangChain agents.</p>
            <code>/pillars/dauth/whoami</code>
          </div>
          <div class="pillar">
            <div class="num">D02</div>
            <h2>DOS</h2>
            <p>The Fastify kernel: tenant-scoped DB wrapper with FORCE RLS, product loader,
              module registry, Temporal workflow client, NATS event bus, and a typed contract surface.</p>
            <code>/kernel/ready</code>
          </div>
          <div class="pillar">
            <div class="num">D03</div>
            <h2>DSOC</h2>
            <p>Append-only audit log on every mutating verb, monthly partitions, tier-aware
              retention, anomaly consumer over the event bus, and security alerts.</p>
            <code>/pillars/dsoc/alerts</code>
          </div>
          <div class="pillar dark">
            <div class="num" style="color:#8d8d8d">D04</div>
            <h2>DNOC</h2>
            <p>Seven-component readiness aggregator, Prometheus metrics, SLO burn-rate
              alerts, capacity probes, and pgBouncer-backed connection isolation.</p>
            <code>/metrics</code>
          </div>
        </div>
      </div>
    </section>

    <section id="stack">
      <div class="container">
        <div class="section-eyebrow">Locked stack</div>
        <h2 class="section-title">Production-grade, open-source, self-hosted by default.</h2>
        <div class="grid c3">
          @for (s of stack; track s.title) {
            <div class="tile">
              <div class="num">{{ s.tag }}</div>
              <h3>{{ s.title }}</h3>
              <p>{{ s.desc }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <section style="background:#161616;color:#fff">
      <div class="container" style="display:flex;justify-content:space-between;gap:2rem;align-items:center;flex-wrap:wrap">
        <div>
          <h2 style="font-weight:300;margin:0 0 0.5rem;font-size:1.75rem">Ready to operate?</h2>
          <p style="color:#c6c6c6;margin:0">Sign in with your DAuth identity to reach the operator workspace.</p>
        </div>
        <button class="btn" type="button" (click)="login()">
          Sign in
          <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
            <path d="M18 6l-1.43 1.4L24.15 15H4v2h20.15l-7.58 7.6L18 26l10-10z"/>
          </svg>
        </button>
      </div>
    </section>

    <footer>
      <div class="container row">
        <div><strong>Dogan AI OS</strong> · Platform plane (DAuth · DOS · DSOC · DNOC)</div>
        <div class="spacer" style="flex:1"></div>
        <div>auth.dogan-ai.com · api.dogan-ai.com · ops.dogan-ai.com</div>
      </div>
    </footer>
  `,
})
export class LandingComponent {
  private readonly auth = inject(AuthService);
  login(): void { void this.auth.login('/workspace'); }

  readonly capabilities: Capability[] = [
    { tag: 'Identity', title: 'Keycloak + OpenFGA', desc: 'OIDC/SAML/LDAP with relationship-based fine-grained authorization.' },
    { tag: 'Isolation', title: 'PG18 RLS per tenant', desc: 'schema-per-product, FORCE row-level security, optional dedicated DB.' },
    { tag: 'Eventing', title: 'NATS JetStream', desc: 'Transactional outbox, dedup by msgId, dead-letter after retries.' },
    { tag: 'Workflows', title: 'Temporal', desc: 'Durable, replayable workflows native to the kernel runtime.' },
    { tag: 'AI', title: 'LiteLLM + Ollama', desc: 'Provider routing, on-prem inference, LangChain/LangGraph in the DNA.' },
    { tag: 'Audit', title: 'DSOC monthly partitions', desc: 'Tier-aware retention, anomaly consumer, signed evidence trail.' },
    { tag: 'Reliability', title: 'DNOC readiness', desc: 'Seven-component health, Prometheus, Alertmanager, SLO burn-rate.' },
    { tag: 'Supply chain', title: 'Syft + Grype + Cosign', desc: 'SBOM, vuln scan, signed builds, sops/age secrets at rest.' },
  ];

  readonly stack = [
    { tag: 'Runtime', title: 'Node 24 LTS · TypeScript strict · Fastify 5', desc: 'Strict contracts, typed errors, plugin encapsulation.' },
    { tag: 'Data', title: 'PostgreSQL 18 · pgvector · pgmq · Valkey 8', desc: 'Master DB, vector + queue extensions, BSD cache.' },
    { tag: 'Identity', title: 'Keycloak 26 · OpenFGA · JWKS', desc: 'Self-hosted IdP, fine-grained authz, JWT verify.' },
    { tag: 'Frontend', title: 'Angular 21 · Native Federation', desc: 'Standalone components, signals, lazy product remotes.' },
    { tag: 'Observability', title: 'Prometheus · OTel · Jaeger', desc: 'Metrics, traces, structured logs, runbook-paired alerts.' },
    { tag: 'Gateway', title: 'Caddy 2 · Cloudflare tunnel', desc: 'Public TLS, operator basic-auth on ops surface, zero open ports.' },
  ];
}
