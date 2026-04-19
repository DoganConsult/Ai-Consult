# Unified Platform + Workspace + Landing Guide

**Purpose:** One place for (1) how the **DOS platform** relates to the **rest of the workspace**, (2) **capabilities vs gaps**, (3) **landing-page positioning**, and (4) **how color is added and used** on public landings (with concrete paths in this repo).

**Canonical platform docs (detail):** [ARCHITECTURE.md](./ARCHITECTURE.md), [PRODUCT_REGISTRATION.md](./PRODUCT_REGISTRATION.md), [PLATFORM-ENRICHMENT-PLAN.md](./PLATFORM-ENRICHMENT-PLAN.md), plus MS/Collab connector docs as linked from the enrichment plan.

**Workspace map (consulting sites & APIs):** Repository root [`/root/AGENTS.md`](../../../../AGENTS.md) — *not* a substitute for DOS architecture; it describes AI-Consult, dogan-consult/lab Angular, Express backend, SBG, and infra ports.

---

## 1. Two “worlds” in one workspace (gap closed in prose)

| World | What it is | Primary docs | Typical URLs / ports |
|-------|------------|--------------|------------------------|
| **A — Dogan consulting ecosystem** | Marketing + product sites (Angular/React), Express API for consult | `AGENTS.md` | doganconsult.com (:8001), doganlap (:8002), sbg (:8004), API :3000 |
| **B — DOS Platform Package** | Standalone **Dogan-AI-OS (DOS) + DAuth**; **product-neutral** core | `docs/ARCHITECTURE.md`, this file | Platform gateway routes under `/api/health`, `/api/auth`, … (see architecture table) |

**Merged rule of thumb:**

- **“Platform capabilities”** for **DOS** → sections 2–3 below + enrichment plan.
- **“Which repo builds which public site”** → `AGENTS.md`.
- **Marketing copy** that says “the platform” without naming DOS → clarify whether you mean **B** or a **product registered on B**; avoid mixing them on one hero without a label.

---

## 2. Platform capabilities (single list)

### 2.1 Architecture layer (always true for standalone DOS)

From [ARCHITECTURE.md](./ARCHITECTURE.md):

- **Shell:** Angular + admin UI.
- **Gateway:** Express — health, auth, provisioning, admin (platform-only until products mount).
- **DAuth:** Identity, sessions, RBAC/ABAC, MFA, SoD, delegation, middleware.
- **DOS:** Tenancy, provisioning, lifecycle, events, observability, jobs, settings, workspace, health, rate limiting.
- **Data:** PostgreSQL (incl. pgvector), Redis, ClickHouse (and other connections listed in startup phases).

### 2.2 Product-consumable primitives (contract table)

From [PRODUCT_REGISTRATION.md](./PRODUCT_REGISTRATION.md):

| Capability | Owner | Short description |
|------------|-------|-------------------|
| Identity | DAuth | Users, sessions, MFA |
| Access control | DAuth | RBAC, ABAC, scopes |
| Tenancy | DOS | Multi-tenant isolation |
| Provisioning | DOS | Tenant create/setup |
| Events | DOS | Bus, domain events |
| Jobs | DOS | Cron / background jobs |
| Observability | DOS | Logs, metrics, traces |
| Health | DOS | Probes, readiness |
| Settings | DOS | Platform + tenant settings |
| Lifecycle | DOS | Subscription lifecycle |

### 2.3 Twelve pillars (full roadmap + honesty)

From [PLATFORM-ENRICHMENT-PLAN.md](./PLATFORM-ENRICHMENT-PLAN.md): Identity/access, Integration hub, Events/webhooks, Workflow/approvals, Lifecycle, Agents/AI gateway, Notifications, Data platform, Doc gen/e-sign, Billing/metering, Tenant observability, Low-code Studio. The same document marks what is **mature in code today** vs **enrichment** (SDKs, marketplace UI, outbound webhooks, etc.). **Landing pages should not claim enrichment items as shipped** unless wired in your deployment.

---

## 3. Gaps (merged — doc + product + landing)

| Gap | Meaning | Mitigation |
|-----|---------|------------|
| **Doc split** | Capabilities spread across ARCHITECTURE, PRODUCT_REGISTRATION, ENRICHMENT, connector docs | Use **this file** as the index; keep deep detail in linked docs. |
| **Workspace vs platform** | `AGENTS.md` does not describe DOS | Cross-link: workspace map → `platform-package/docs/`. |
| **Primitives vs PaaS** | Deep DOS/DAuth code exists; **stable product-facing contracts + SDKs** are still the enrichment story | Landings: lead with **proven** API prefixes and pillars marked “ready”; label the rest “roadmap”. |
| **Product-neutral core** | No product ships *inside* the core; products register | Landing: **platform story first**; products (e.g. GRC) as “built on” examples only if accurate. |
| **Public marketing site vs admin** | `dogan-ai-angular` (and other landings) may not call DOS APIs yet | Define **read-only** endpoints (`/api/health`, `/api/public`, …) and CORS before claiming “live” widgets. |

---

## 4. Landing pages — positioning (platform-only)

1. **Hero:** DOS + DAuth + data stack (one sentence each), not a single product line.
2. **Proof:** Health / readiness / public stats only if backed by real API responses.
3. **Roadmap:** 12 pillars as a grid; use enrichment doc for “planned” vs “in repo, thin”.
4. **Footer:** Link to product sites (from `AGENTS.md`) only if those are official channels.

---

## 5. Color — how it is added and used (landings in this repo)

This section is grounded in **`Ai-Consult-Microservices/dogan-ai-angular/`** (Tailwind CSS v4 + global `styles.css`). Other landings (**AI-Consult** React, **dogan-consult-angular**) use their own tokens; the **pattern** below is the same: **central tokens → semantic usage → components**.

### 5.1 Where colors are defined today (`dogan-ai-angular`)

**File:** `dogan-ai-angular/src/styles.css`

1. **Tailwind v4 `@theme` block** — registers design tokens (includes surface + text roles for **light** landings):

```css
@theme {
  --color-ai-cyan: #0891b2;
  --color-ai-cyan-glow: rgba(8, 145, 178, 0.25);
  --color-ai-blue: #2563eb;
  --color-ai-indigo: #6366f1;
  --color-ai-dark: #0f172a;        /* primary text on light bg */
  --color-ai-panel: #f1f5f9;
  --color-ai-surface: #f8fafc;
  --color-ai-surface-elevated: #ffffff;
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
}
```

2. **`@layer base`** — `color-scheme: light`; body uses `--color-ai-surface` background and `--color-ai-dark` text (not a dark obsidian shell).

3. **Component-level classes** — `.ai-header`, `.ai-hero`, `.ai-footer`, etc. use **light** surfaces (white / slate-50), slate borders, and cyan accents. Hero title line that used `.white` in markup is styled as **dark slate** in CSS so contrast stays correct on light.

**How to add a new color**

1. Add a token in `@theme`, e.g. `--color-ai-accent: #f59e0b;`
2. Use it either as:
   - **Tailwind arbitrary / theme extension:** e.g. `bg-ai-accent` if Tailwind picks up `@theme` keys (follow existing `ai-cyan` naming), or
   - **CSS custom property:** `background: var(--color-ai-accent);` in a class in the same file or a component stylesheet.

**Optional dark theme later**

1. Duplicate semantic tokens under `html.dark` or `[data-theme="dark"]` (e.g. body background `#030712`, text `#f8fafc`).
2. Override the same `.ai-*` rules there, or split shared variables so one file imports two theme layers.
3. Keep **one** brand accent (cyan) across both themes for recognition.

### 5.2 How colors are used on pages

| Mechanism | Where | Use for |
|-----------|--------|---------|
| **Global utility + theme** | `styles.css` `@theme` + `@import "tailwindcss"` | Page layout, repeated patterns |
| **BEM-like classes** | `.ai-*` in `styles.css` | Home hero, nav, footer shared across routes |
| **Component styles** | `*.component.ts` with `styleUrls` / inline `styles` | Section-specific accents |
| **Inline Tailwind in templates** | If enabled in components | Rapid iteration; still prefer tokens for brand consistency |

**Rule:** For **brand + accessibility**, define **primary / secondary / surface / danger / success** once, then reference only those names in templates and components.

### 5.3 Cross-project note (workspace)

| Project | Style stack | Where to add color |
|---------|-------------|-------------------|
| **AI-Consult** (React) | Tailwind (Vite) | Shared Tailwind config or CSS variables in entry CSS per site |
| **dogan-consult-angular / doganlab-angular** | SCSS + Tailwind 4 | `styles.scss` / Tailwind `@theme` equivalent |
| **sbg** (React) | Tailwind 3 | `src` global CSS or Tailwind config |

Keep **one palette document** (this section + optional Figma) so dogan-ai.com and consult sites do not drift.

---

## 6. Quick reference — API prefixes for “real” landing widgets

From [ARCHITECTURE.md](./ARCHITECTURE.md) (platform-only):

| Prefix | Use on landing (if exposed + CORS OK) |
|--------|-------------------------------------|
| `/api/health` | Status / uptime badges |
| `/api/public` | Non-sensitive public copy or stats |
| `/api/me` | Only after auth — not for anonymous home |

Do **not** imply live pipeline data unless the gateway actually serves it to the browser origin.

---

## 7. Maintenance

- When **DOS** ships a new pillar contract or route table change → update [ARCHITECTURE.md](./ARCHITECTURE.md) and a one-line note in **§2** or **§6** here.
- When **new public domains or ports** change → update `AGENTS.md` and **§1** table here.
- When **brand colors** change → update `dogan-ai-angular/src/styles.css` `@theme` + **§5** in this file.

---

*Document version: 1.0 — merges workspace map, platform capabilities, doc/product/landing gaps, and color usage for landings.*
