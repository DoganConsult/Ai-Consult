# AI Consult Workspace — Read-Only Inventory Report

**Audit date:** 2026-04-18
**Workspace root:** `/root/Ai-Consult-Microservices`
**Git remote:** `https://github.com/DoganConsult/Ai-Consult.git`
**Current branch:** `main`
**Head commit:** `b02b4504 feat: consolidate Dogan AI ecosystem into unified microservices repo` (only 1 commit in history)
**Mode:** READ-ONLY. No files were modified, no packages installed, no scripts executed.

Every finding below cites a file path or evidence line. Where proof is insufficient, items are marked **UNKNOWN**.

---

## 1. Executive Summary

- This workspace is a **polyglot multi-project monorepo** (no monorepo tool at root — it is a plain folder of independent projects kept under a single git repo).
- The repo presents itself as "consolidate Dogan AI ecosystem into unified microservices repo" (commit message, evidence: `git log`). It mixes:
  - Marketing / landing sites (React + Vite, Angular 21)
  - An Express 5 backend (`dogan-consult-backend`)
  - A much larger TypeScript platform (`platform-package`, pnpm workspace, Angular 19 + Express + Temporal + OpenFGA + OpenTelemetry)
  - A vendored third-party project (`openclaw`) — a multi-channel AI gateway, ~100+ extensions
  - A React app `sbg` (Saudi Business Gate) previously built on Base44 SDK, now pointing at `/api/sbg/*`
  - A spec folder (`DOS-AIO-Specs`) containing 44 module-patch markdown files
- **Critical state:** `dogan-consult-backend` is in a **broken working-tree state**. `src/index.js` imports 10 route/service files that are currently deleted (`git status` shows them as `D`). The backend will crash at startup with `ERR_MODULE_NOT_FOUND`.
- `platform-package` has a nested, **duplicated** copy of itself at `platform-package/platform-package/` (same files again). This duplication looks accidental and is a serious footgun.
- There is **no CI** configured anywhere (no `.github/`, `.gitlab/`, `.circleci/` at repo root or in any sub-project except what ships inside vendored `openclaw`).
- `.env` files containing **real values** are committed in `dogan-consult-backend/.env`, `platform-package/.env`, `platform-package/backend/.env`, and `platform-package/platform-package/.env`. See §6.
- Nothing here is production-ready by evidence. Several components can **build only**; very few can **run end-to-end** without external services (Postgres + Redis + Azure + Anthropic + Ollama).

---

## 2. Repository Map

```
/root/Ai-Consult-Microservices/
├── DOS-AIO-Specs/               # 44 markdown specs + 1 CSV + README (docs only, no code)
├── ai-consult-react/            # React 18 + Vite 6 landing pages (3 site variants)
├── dogan-ai-angular/            # Angular 21 app (Vitest configured)
├── dogan-consult-angular/       # Angular 21 app (doganconsult.com)
├── dogan-consult-backend/       # Express 5 API (Node ESM) — currently broken
├── doganlab-angular/            # Angular 21 app (doganlap.com)
├── openclaw/                    # Vendored MIT project "openclaw" — multi-channel AI gateway
├── platform-package/            # pnpm workspace (backend + frontend + 8 internal packages)
│   └── platform-package/        # DUPLICATED copy of the workspace (see §11)
└── sbg/                         # React 18 + Vite 6 (Saudi Business Gate)
```

**Package manager signals** (evidence: files present):
- `npm` / `package-lock.json` in: `ai-consult-react`, `dogan-ai-angular`, `dogan-consult-angular`, `dogan-consult-backend`, `doganlab-angular`, `sbg`.
- `pnpm` / `pnpm-workspace.yaml` + `pnpm-lock.yaml` in: `platform-package`, `openclaw`.
- No monorepo tool at the repo root (no `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json`, `yarn.lock` at `/root/Ai-Consult-Microservices/`).

**Languages:** TypeScript, JavaScript (ESM), SCSS/CSS, a little Python/Swift inside `openclaw`.
**Primary backend framework:** Express 5 (both backends). `platform-package` also uses Temporal + BullMQ.
**Primary frontend frameworks:** Angular 21 (three apps), Angular 19 (`platform-package/frontend`), React 18 + Vite 6 (two apps).
**Database:** PostgreSQL + `pgvector` + Redis (both backends). Raw SQL migrations, no ORM.
**Deployment evidence:** PM2 `ecosystem.config.js` in `platform-package*`; `netlify.toml` for `sbg`; Docker / Fly / Render only inside vendored `openclaw`.
**Tests:** Only `platform-package/tests/*.test.ts` (Vitest). No tests in app-code of the other sub-projects.
**Build system:** Vite, Angular CLI (`@angular/build`), `tsc`.

---

## 3. Application / Service Inventory

| Component | Type | Path | Framework | Entry Point | Port / env key | Scripts | Status |
|---|---|---|---|---|---|---|---|
| ai-consult-react | Frontend (landing pages) | `./ai-consult-react` | React 18 + Vite 6 + Radix + Tailwind | `src/main.tsx` + per-site `src/entry-doganconsult.tsx`, `entry-doganlab.tsx`, `entry-doganhub.tsx` | dev port UNKNOWN (vite default 5173; code-workspace hints at 3000 per repo rule — not in config) | `dev`, `build`, `build:doganconsult`, `build:doganlab`, `build:doganhub`, `build:all` | PRESENT_AND_WIRED (static site) |
| dogan-ai-angular | Frontend | `./dogan-ai-angular` | Angular 21 + Tailwind 4 + Vitest | `src/main.ts` | ng serve default 4200 | `ng`, `start`, `build`, `watch`, `test` | PRESENT_AND_WIRED |
| dogan-consult-angular | Frontend | `./dogan-consult-angular` | Angular 21 + Tailwind 4 | `src/main.ts` | 4200 | `ng`, `start`, `build`, `watch`, `test` | PRESENT_AND_WIRED |
| doganlab-angular | Frontend | `./doganlab-angular` | Angular 21 + Tailwind 4 | `src/main.ts` | 4200 | `ng`, `start`, `build`, `watch`, `test` | PRESENT_AND_WIRED |
| dogan-consult-backend | Backend API | `./dogan-consult-backend` | Express 5, Node ESM | `src/index.js` | `PORT` (default 3000) | `start`, `dev` | **RISKY_OR_BROKEN** — imports 10 missing files (see §4) |
| sbg | Frontend | `./sbg` | React 18 + Vite 6 + Base44 SDK traces | `src/main.jsx` | vite default 5173 | `dev`, `build`, `lint`, `lint:fix`, `typecheck`, `preview` | PRESENT_BUT_NOT_WIRED — calls `/api/sbg/*` routes that are currently **deleted** from the backend |
| platform-package | Workspace (backend + frontend + 8 packages) | `./platform-package` | Express 5 + Temporal + OpenFGA + Angular 19 + pnpm | `backend/src/server.ts` | `PORT` (default 3010) | `dev`, `start`, `test`, `db:init`, `frontend:start`, `backup`, `restore`, `rollback`, `sbom` | PRESENT_BUT_NOT_WIRED — untracked dirs `backend/src/platform/openclaw/`, `backend/src/products/`, `backend/test-env.js`, `backend/test-gemini.js`, new ERP frontend dirs (`git status`); nested duplicate copy at `platform-package/platform-package/` |
| openclaw | Vendored third-party | `./openclaw` | pnpm monorepo, TypeScript, Vitest, Docker, Fly, Render | `openclaw.mjs` bin | UNKNOWN | many (see repo) | TEMPLATE_OR_STUB (from Dogan standpoint — this is upstream code, not written here) |
| DOS-AIO-Specs | Documentation | `./DOS-AIO-Specs` | markdown | n/a | n/a | n/a | docs-only |

---

## 4. Backend / API Inventory

### 4.1 `dogan-consult-backend` (Express 5, ESM)

Evidence: `src/index.js`.

Mounted routers (from `src/index.js`):

| Base path | Module imported | Source file present? | Auth | DB | External dep | Notes |
|---|---|---|---|---|---|---|
| `/api/health` | `./routes/health.js` | ✅ yes | no | pg + redis ping | — | Returns 200 if pg+redis reachable, else 503 |
| `/api/consultations` | `./routes/consultations.js` | ❌ **DELETED** (`git status`) | UNKNOWN | UNKNOWN | — | Import will crash at startup |
| `/api/contacts` | `./routes/contacts.js` | ❌ **DELETED** | UNKNOWN | UNKNOWN | — | Crash at startup |
| `/api/graph` | `./routes/graph.js` | ✅ yes | **NO AUTH** (public!) | — | MS Graph | Exposes `/users`, `/organization` globally |
| `/api/mailbox` | `./routes/mailbox.js` | ✅ yes | **NO AUTH** (public!) | pg + redis | MS Graph | Reads `GRAPH_MAIL_FROM` mailbox inbox/folders |
| `/api/agent` | `./routes/agent.js` | ❌ **DELETED** | UNKNOWN | UNKNOWN | — | Crash at startup |
| `/api/chat` | `./routes/chat.js` | ✅ yes | no | pg | Anthropic + Ollama | Validates input (express-validator), chat log to `chat_sessions` |
| `/api/lab/products` | `./routes/lab/products.js` | ✅ yes | no (public read) | pg | — | Reads `lab_products` |
| `/api/sbg` (verifyToken) | `./routes/sbg/auth.js` | ❌ **DELETED** | — | — | — | Crash at startup |
| `/api/sbg/entities` | `./routes/sbg/entities.js` | ❌ **DELETED** | JWT (would be) | — | — | Crash at startup |
| `/api/sbg/integrations` | `./routes/sbg/integrations.js` | ❌ **DELETED** | JWT | — | — | Crash at startup |
| `/api/sbg/agents` | `./routes/sbg/agents.js` | ❌ **DELETED** | JWT | — | — | Crash at startup |
| `/api/sbg/functions` | `./routes/sbg/functions.js` | ❌ **DELETED** | JWT | — | — | Crash at startup |

Services imported by `index.js` (from `src/services/`):
- `claude.js` ✅ — Anthropic Claude Sonnet 4 + Ollama fallback (`OLLAMA_URL`, default `http://127.0.0.1:11434`, model `tinyllama`).
- `graph.js` ✅ — MS Graph client using `ClientSecretCredential`.
- `notifications.js` ✅ (present).
- `inboxPoller.js` ❌ **DELETED** — `index.js` calls `startInboxPoller()` at boot → **startup will crash** before listen.
- `autoReply.js` ❌ **DELETED** — referenced indirectly.

**Middleware:** only `middleware/rateLimiter.js` (mounted on `/api`). Global `helmet()`, `cors({ origin: CORS_ORIGIN?.split(',') || ['http://localhost:8001'] })`, `express.json({limit:'200kb'})`, static `/uploads`.

**Conclusion:** `dogan-consult-backend` will **not boot** in its current state. This must be fixed before any runtime test.

### 4.2 `platform-package/backend`

Evidence: `platform-package/backend/src/server.ts` (entry), dependencies in `backend/package.json`.

- Framework: Express 5; bootstraps `configureMiddleware` + `mountRoutes` + `mountFinalHandlers` + `startServer`.
- Default port `3010` (fallback in `server.ts`).
- Heavy deps: `@anthropic-ai/sdk`, `@langchain/openai`, `@openfga/sdk`, Temporal workers (`@temporalio/*`), BullMQ, Prom client, OpenTelemetry SDK, pgvector, hnswlib-node, Swagger, qrcode+otplib+svg-captcha, cron-parser, nodemailer.
- Source tree (depth 2): `config/`, `connectors/`, `errors/`, `i18n/`, `langgraph/`, `migrations/`, `modules/`, `openclaw/`, `platform/`, `products/`, `schemas/`, `services/`, `shared/`, `startup/`, `temporal/`, `types/`, `utils/`, `workers/`, plus `server-middleware.ts`, `server-routes.ts`, `server-startup.ts`, `server.ts`.
- Uncommitted changes (`git status`): modifications to `modules/ai/services/gateway/llm.service.ts`, `modules/ai/services/gateway/providers/free.provider.ts`, `server-middleware.ts`, `server-routes.ts`, `package.json`; untracked `platform/openclaw/`, `products/`, `test-env.js`, `test-gemini.js`.
- The actual mounted routes are behind `mountRoutes` which we did not fully enumerate — marked **UNKNOWN** per audit rules.

**Flag:** route-conflict risk because the standalone `dogan-consult-backend` and `platform-package/backend` both expose generic surfaces; their relationship is unclear. No gateway / no service registry found.

---

## 5. Frontend Inventory

| App | Framework | Path | Router config | API base | Env config | Build | Status |
|---|---|---|---|---|---|---|---|
| ai-consult-react | React 18 + Vite | `ai-consult-react` | no `react-router` used in `main.tsx` (single-entry per site); three entries `entry-doganconsult.tsx`, `entry-doganlab.tsx`, `entry-doganhub.tsx` wired in `vite.sites.config.ts` | none observed in components (landing-page; needs grep to confirm) | none committed | `npm run build:all` | PRESENT_AND_WIRED |
| dogan-consult-angular | Angular 21 | `dogan-consult-angular` | `src/app/app.routes.ts` has `/`, `/about`, `/offices`, `/products`, `/products/:slug`, `/capabilities`, `/contact`, `/legal` | UNKNOWN (likely `/api/...` via nginx proxy per repo rule, not verified in code) | no `environment*.ts` observed | `ng build` | PRESENT_AND_WIRED |
| doganlab-angular | Angular 21 | `doganlab-angular` | `app.routes.ts` exists | UNKNOWN | none | `ng build` | PRESENT_AND_WIRED |
| dogan-ai-angular | Angular 21 + Vitest | `dogan-ai-angular` | `app.routes.ts` exists | UNKNOWN | none | `ng build` | PRESENT_AND_WIRED |
| sbg | React 18 + Vite | `sbg` | `src/App.jsx` + `pages/` (30+ pages incl. Dashboard, Analytics, SalesCRM, AIStudio, AgentWorkflows, …) | `src/api/base44Client.js`: `const API_BASE = '/api/sbg'` | `@base44/sdk` still referenced; needs `VITE_BASE44_APP_ID` + `VITE_BASE44_BACKEND_URL` to not emit `/null/api/...` requests (per repo rule) | `npm run build` | PRESENT_BUT_NOT_WIRED — every `/api/sbg/*` call targets a deleted backend router |
| platform-package/frontend | Angular 19 + NgRx + PrimeNG | `platform-package/frontend` | `src/app/app.routes.ts` modified (per `git status`); new `core/erp/`, `pages/erp/` untracked | UNKNOWN | UNKNOWN | `ng build` | PRESENT_BUT_NOT_WIRED (uncommitted changes) |

**Frontend → Backend call mapping (`sbg` example):**

| Frontend call | Source | Expected backend route | Exists on backend? | Risk |
|---|---|---|---|---|
| `GET/POST /api/sbg/entities/:name` | `sbg/src/api/base44Client.js` | `dogan-consult-backend: /api/sbg/entities` | ❌ DELETED | **HIGH** |
| `GET /api/sbg/auth/me` | `base44Client.js:87,94,99` | `/api/sbg/auth` | ❌ DELETED | HIGH |
| `GET/POST /api/sbg/agents/conversations*` | `base44Client.js:114-142` | `/api/sbg/agents` | ❌ DELETED | HIGH |
| `POST /api/sbg/functions/:name` | `base44Client.js:158` | `/api/sbg/functions` | ❌ DELETED | HIGH |
| `POST /api/sbg/integrations/llm|email|upload` | `base44Client.js:171,180,192` | `/api/sbg/integrations` | ❌ DELETED | HIGH |

---

## 6. Environment & Configuration Inventory

Evidence: `find . -maxdepth 3 -name '.env*'`.

| File | Purpose | Contains Secrets? | Missing Vars? | Hardcoded Values? | Risk |
|---|---|---|---|---|---|
| `dogan-consult-backend/.env` | runtime config for Express backend | **YES — committed to working tree** (variables: `PORT`, `NODE_ENV`, `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGIN`, `RATE_LIMIT_*`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `GRAPH_MAIL_FROM`, `GRAPH_MAIL_NOTIFY`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `OLLAMA_URL`, `OLLAMA_MODEL`). Values not printed here. Whether they are committed in git history: UNKNOWN — `.gitignore` of that project lists `.env` so they may be untracked; needs `git log -- .env` to verify. | — | default `http://localhost:8001` fallback for CORS origin in `src/index.js:30` | **HIGH** if any of these keys are real prod keys |
| `dogan-consult-backend/.env.example` | template | variables only, no values | — | — | LOW |
| `platform-package/.env`, `platform-package/backend/.env`, `platform-package/platform-package/.env` | runtime | **YES** (file contents present) | — | — | **HIGH** same risk category |
| `platform-package/.env.example`, `platform-package/platform-package/.env.example`, `openclaw/.env.example` | templates | — | — | — | LOW |

**Hardcoded endpoints found in code (not .env):**
- `dogan-consult-backend/src/services/claude.js:51` → `const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';`
- `dogan-consult-backend/src/services/claude.js:52` → `const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'tinyllama';`
- `dogan-consult-backend/src/index.js:30` → default CORS fallback `'http://localhost:8001'`.
- `dogan-consult-backend/src/routes/mailbox.js:8` → `MAIL_USER = () => process.env.GRAPH_MAIL_FROM || 'info@doganconsult.com';`
- No `process.env`/`import.meta.env` scan performed on React/Angular — marked UNKNOWN.

**No CI/CD configs** found at repo root or in any project except vendored `openclaw`.

---

## 7. Database & Persistence Inventory

| Area | Path | Technology | Migrations? | Seeds? | Risk | Evidence |
|---|---|---|---|---|---|---|
| dogan-consult-backend | `dogan-consult-backend/src/db/` | PostgreSQL (`pg`), `pgvector`, Redis (`redis`) | Raw SQL array in `migrate.js` + `migrate-sbg.js` (run on startup in `index.js`) | `seed-lab-products.js` (manual) | MEDIUM — migrations run unconditionally at every startup; no versioning table observed; `runSbgMigrations` creates SBG tables but all SBG routes are deleted | `src/index.js` calls `runMigrations()` and `runSbgMigrations()` before `app.listen` |
| dogan-consult-backend pool | `src/db/pool.js` | `pg.Pool` single instance from `DATABASE_URL` | — | — | LOW | See code |
| dogan-consult-backend redis | `src/db/redis.js` | `redis` client | — | — | UNKNOWN | not read in full |
| platform-package backend | `platform-package/backend/src/migrations/` + `runner.ts` | PostgreSQL + pgvector + hnswlib + ClickHouse + OpenFGA | Yes (via `ts-node src/migrations/runner.ts`) | UNKNOWN | MEDIUM — stack is large, not audited deeply here | `package.json` `"migrate"` script |

**Tables declared** (from `dogan-consult-backend/src/db/migrate.js` partial read): `consultations`, `contacts`, `content_embeddings` (vector 1536), `email_log`, `agent_actions`, `auto_reply_rules`, `chat_sessions`, … (not fully enumerated). Separate `migrate-sbg.js` creates SBG schema including a `password_hash VARCHAR(255)` column (line 288) → intended user table exists but the routes using it are deleted.

**No rollback strategy** observed in `dogan-consult-backend`. No migration version tracking. No seed transactions.

---

## 8. AI / LLM Capability Inventory

| Capability | Path | Provider / Model | Config source | Status | Risk |
|---|---|---|---|---|---|
| Chat endpoint (`/api/chat`) | `dogan-consult-backend/src/routes/chat.js` | Anthropic Claude (default `claude-sonnet-4-20250514`) → Ollama fallback (`tinyllama` @ `http://127.0.0.1:11434`) | `.env` keys `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `OLLAMA_URL`, `OLLAMA_MODEL` | PRESENT_AND_WIRED (this route file still exists) | MEDIUM — no cost tracking, no prompt version control, validation is minimal, long system prompt is hardcoded in `services/claude.js` |
| Vector storage | Postgres `content_embeddings vector(1536)` | OpenAI-1536-style embeddings (model UNKNOWN — no embeddings code found in read files) | UNKNOWN | CONFIG_MISSING | MEDIUM |
| Platform AI gateway | `platform-package/backend/src/modules/ai/services/gateway/` (modified per `git status`) | Multi-provider incl. LangChain OpenAI, Anthropic | UNKNOWN | PRESENT_BUT_NOT_WIRED (uncommitted changes) | UNKNOWN |
| Temporal workers for AI flows | `platform-package/backend/src/temporal/`, `workers/` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| `openclaw` AI channels | vendored | Many providers (`openai`, `anthropic`, `google`, `deepseek`, `groq`, `mistral`, `ollama`, `perplexity`, `openrouter`, …) | `openclaw/.env.example` | TEMPLATE_OR_STUB — vendored | LOW unless we actually import it |

**Flags:**
- No rate-limiting on chat-cost; `rateLimiter` is HTTP-request based only.
- No per-user/session isolation for chat data (`session_id` is generated client-side or by server if missing — not tied to auth).
- System prompt hardcoded in code (not versioned externally).
- No output moderation or safety filters seen.

---

## 9. Security Findings

| Risk | Severity | Evidence | Why it matters | Fix category |
|---|---|---|---|---|
| `.env` file(s) present in working tree with real values | HIGH | `dogan-consult-backend/.env`, `platform-package/.env`, `platform-package/backend/.env`, `platform-package/platform-package/.env` | Anyone with repo access can read `AZURE_CLIENT_SECRET`, `ANTHROPIC_API_KEY`, DB password. If these .env files were ever committed, the secrets must be rotated. | Rotate keys; verify `.gitignore`; audit git history (`git log --all -- .env`) |
| `/api/graph/*` and `/api/mailbox/*` have **NO auth middleware** | CRITICAL | `dogan-consult-backend/src/index.js` — `app.use('/api/graph', graphRouter)` and `/api/mailbox` are mounted without `verifyToken`; only `/api/sbg` is gated | Reads entire Microsoft 365 tenant mailboxes/users. Public exposure leaks corporate email/org data. | Add auth middleware; restrict CORS; add tenant isolation |
| Backend will crash at startup | CRITICAL | `git status` shows 10 `D` files imported by `src/index.js` | Nothing behind this service works — includes `inboxPoller` running on boot | Restore files or remove imports |
| CORS fallback to `http://localhost:8001` when `CORS_ORIGIN` missing | MEDIUM | `src/index.js:30` | Silent misconfiguration could expose the API to a dev origin in prod | Fail closed instead of defaulting |
| `sbg` frontend calls backend routes that are deleted | HIGH | `sbg/src/api/base44Client.js` → `/api/sbg/*` | All SBG flows will 404 | Restore SBG routes or migrate to platform-package |
| Rate limit scope unclear | MEDIUM | `app.use('/api', apiLimiter)` is global, same bucket for chat + health + data endpoints | Easy to DoS chat by filling quota with cheap pings, or bypass chat limits via other endpoints | Per-route limiting |
| No CSRF / session / auth framework in `dogan-consult-backend` | HIGH | Only a JWT `verifyToken` (from `routes/sbg/auth.js` — **deleted**) referenced in `index.js` | There is currently **no live auth** at all in this backend | Restore auth; add tests |
| `static('/uploads')` with `multer` dependency | MEDIUM | `src/index.js`: `app.use('/uploads', express.static('uploads'))`; `multer` in deps | Unless uploads are validated, risk of content-type confusion, path disclosure | Audit upload routes (not found in remaining files) |
| Duplicated nested workspace | HIGH (integrity) | `platform-package/platform-package/` | Two conflicting copies; fixes may only land in one | Choose one, delete the other |
| No CI / no secret scanner / no `pre-commit` active in this repo (only vendored `openclaw` has these) | MEDIUM | missing `.github/`, `.pre-commit-config.yaml`, etc. at repo root | Regressions and leaked secrets go unnoticed | Add CI with lint + typecheck + secret scan |

---

## 10. Tests & Quality Gates

| Gate | Command | Area covered | Safe to run? | Confidence |
|---|---|---|---|---|
| Vitest (platform-package) | `cd platform-package && pnpm test` or `vitest run` | `tests/smoke.test.ts`, `boundary-lock.test.ts`, `migration.test.ts`, `empty-product-startup.test.ts`, `frontend-boundary.test.ts` | Needs pnpm install; UNKNOWN if tests mutate anything | MEDIUM |
| Vitest (dogan-ai-angular) | `npm test` | Angular unit tests (not verified to exist) | SAFE_BUILD after install | LOW |
| Angular build | `npm run build` in each Angular app | compile-time typecheck | SAFE_BUILD after install | HIGH |
| Vite build | `npm run build` in `ai-consult-react`, `sbg` | compile | SAFE_BUILD after install | HIGH |
| ESLint (sbg only) | `cd sbg && npm run lint` | sbg JSX | SAFE_READ_ONLY after install | HIGH |
| `sbg` typecheck | `npm run typecheck` | jsconfig based | SAFE_READ_ONLY | MEDIUM |
| Backend typecheck (platform-package) | `cd platform-package/backend && pnpm typecheck` | TS server | SAFE_READ_ONLY after install | MEDIUM |
| No linters in other Angular apps, no tests in dogan-consult-backend | — | — | — | — |

There are **no tests and no lint** for `dogan-consult-backend`, `dogan-consult-angular`, `doganlab-angular`, `ai-consult-react`. There is no repo-wide test runner.

---

## 11. Runability Assessment

| Component | Can run now? | Required env | Required deps | Blockers | Safe command |
|---|---|---|---|---|---|
| ai-consult-react | CAN_BUILD_ONLY | none | `npm install` | vite dev port not pinned; no runtime API needed | `npm run build` |
| dogan-consult-angular | CAN_BUILD_ONLY | none | `npm install` | API integration UNKNOWN | `npm run build` |
| doganlab-angular | CAN_BUILD_ONLY | none | `npm install` | — | `npm run build` |
| dogan-ai-angular | CAN_BUILD_ONLY | none | `npm install` | — | `npm run build` |
| sbg | CAN_BUILD_ONLY | `VITE_BASE44_APP_ID`, `VITE_BASE44_BACKEND_URL` for dev; otherwise runtime fails at `/null/api/...` (per repo rule) | `npm install` | SBG backend routes **deleted** | `npm run build` |
| dogan-consult-backend | **CONFIG_BROKEN** (cannot start; missing source files) | Postgres + Redis + Azure + Anthropic + optional Ollama | `npm install` | 10 imported files deleted; `startInboxPoller()` called at boot | DO NOT run; restore files first |
| platform-package (backend) | NEEDS_ENV + NEEDS_DATABASE | Postgres + Redis + Temporal + ClickHouse + OpenFGA (per deps) + Azure + OpenAI/Anthropic | `pnpm install -w` | nested duplicate `platform-package/platform-package/`; uncommitted edits in server and AI gateway | build only after pnpm install |
| platform-package (frontend) | CAN_BUILD_ONLY | none | `pnpm install` (workspace) | uncommitted route/erp changes | `pnpm --filter ./frontend build` |
| openclaw | TEMPLATE_OR_STUB (vendored) | many | separate pnpm workspace | not our code | build only if needed |

---

## 12. Unknowns Needing Proof

1. Whether `.env` files were ever committed to git history — run `git log --all -- '**/.env'` and `git log -p --all | rg -i 'AZURE_CLIENT_SECRET|ANTHROPIC_API_KEY'` to verify (not run here to keep the audit read-only and avoid large output).
2. Real mounted routes of `platform-package/backend/server-routes.ts` — file was modified; contents not read.
3. Whether `ai-consult-react` performs any API calls (no grep performed inside `src/components/*` for `fetch`/`axios`).
4. Whether Angular apps have `environment*.ts` with hardcoded URLs.
5. Purpose of untracked `platform-package/backend/test-env.js` and `test-gemini.js` — possibly ad-hoc scripts; contents not read.
6. Exact relationship between `dogan-consult-backend` and `platform-package/backend` — both host Express 5 APIs; gateway/proxy strategy unknown.
7. Contents of `platform-package/packages/dos-*` internal libraries (auth, contracts, erp-*, types, module-sdk, platform-core) — only directory listing gathered.
8. Whether `uploads/` directory (referenced as static in backend) is git-tracked and empty/seeded.
9. Whether `dogan-consult-backend/src/services/notifications.js` is wired — imported UNKNOWN.
10. Whether the `Attributions.md` inside `ai-consult-react/src` carries license obligations affecting distribution.

---

## 13. Recommended Next Steps

### A. What we can count on now
- Four static frontends build (given `npm install`): `ai-consult-react`, `dogan-consult-angular`, `doganlab-angular`, `dogan-ai-angular`.
- The DB schema DDL in `dogan-consult-backend/src/db/migrate.js` is readable and relatively small; it is reproducible against any Postgres with pgvector.
- The spec folder `DOS-AIO-Specs` is well-organized documentation (44 module patches) — useful as reference.
- `platform-package` is the more ambitious, more thoroughly-typed project and has a real test folder (Vitest).

### B. What exists but cannot be trusted yet
- `dogan-consult-backend` — broken imports; once "fixed" by restoring deleted files (via `git restore --staged . && git checkout -- .`), it still has public `/api/graph` and `/api/mailbox` routes that leak M365 data.
- `sbg` — frontend is a 30-page app pointing at a backend contract that no longer exists. Contract must be re-established or the app migrated to `platform-package`.
- `platform-package` — duplicated nested copy, modified working tree, untracked ERP feature work. Needs cleanup before any build/test.

### C. What is missing or broken
- 10 backend route/service files deleted (see §4.1).
- Nested `platform-package/platform-package/` duplication.
- No CI, no repo-wide linting, no secret scanner.
- No documentation linking apps to a single running environment.
- No gateway/proxy config showing how `dogan-consult-backend` vs `platform-package/backend` are both reached (nginx config referenced in repo-rule is not inside this repo).

### D. What must be fixed before real use
1. **Rotate every secret** in `.env` files and remove them from the working tree; use `.env.example` only.
2. **Restore the 10 deleted files** or explicitly remove their imports and the dependent features (`consultations`, `contacts`, `agent`, `sbg/*`, `inboxPoller`, `autoReply`).
3. Add **auth middleware** to `/api/graph` and `/api/mailbox` (or remove them if not needed).
4. Resolve the **nested duplicate** in `platform-package/platform-package/`.
5. Decide on **one backend** (`dogan-consult-backend` vs `platform-package/backend`) or document the split explicitly with a gateway config.
6. Add a minimum CI: `pnpm -r typecheck`, `pnpm -r build`, plus secret-scan (e.g., gitleaks) and dep-audit.
7. Re-establish the `sbg` backend contract or migrate `sbg` off Base44-style `/api/sbg/*`.

### E. Exact next execution sequence (read-only/safe validations first)
1. `cd /root/Ai-Consult-Microservices && git log --all -- dogan-consult-backend/.env platform-package/.env platform-package/backend/.env` — verify whether secrets were ever committed. If yes, **rotate immediately**.
2. `cd dogan-consult-backend && git restore src/routes src/services` (only if the deletions were accidental) — then re-read `src/index.js` imports vs disk.
3. `cd ai-consult-react && npm ci && npm run build` — confirm landing page build.
4. `cd dogan-consult-angular && npm ci && npm run build` — confirm Angular build.
5. `cd sbg && npm ci && npm run lint && npm run typecheck && npm run build` — confirm sbg builds.
6. `cd platform-package && pnpm install -w && pnpm --filter dos-platform-package typecheck && pnpm test` — validate platform-package only **after** the nested duplicate `platform-package/platform-package/` decision is made.
7. Do **not** start any backend or run any migrations until §D.1–D.3 are addressed.

---

*End of inventory. Evidence in this document comes exclusively from files read and commands run during this audit session; nothing was modified.*
