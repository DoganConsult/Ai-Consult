---
description: Dogan AI OS — non-negotiable quality rules. Applies to every agent, developer, and team.
alwaysApply: true
---

# Dogan AI OS — Quality Rules (enforced)

These rules are mandatory for every commit, every pull request, every agent, every contractor, every internal developer. CI fails on any violation. No exceptions, no overrides, no merge bypass.

## Rule 1 — File size cap
- **Hard limit: 500 lines of code per source file** (any of: `.ts`, `.tsx`, `.js`, `.mjs`, `.cjs`, `.jsx`, `.sql`).
- Blank lines and comment-only lines count.
- Generated files, lockfiles, dist output, snapshots, and migration baselines are exempt and listed in `tools/quality/exempt.txt`.
- Fix path on violation: split the file into cohesive modules; do NOT increase the cap, do NOT add `// eslint-disable`.

## Rule 2 — No mocks, no simulations, no temporary code in main
The following tokens MUST NOT appear in committed source under `src/`, `packages/`, `services/`, `products/`:
- `TODO`, `FIXME`, `XXX`, `HACK`
- `mock`, `stub`, `placeholder`, `dummy`, `fake`
- `simulate`, `simulation`, `simulated`
- `temporary`, `tempfix`, `temp-fix`, `temp_fix`, `// temp`, `/* temp */`
- `not implemented`, `unimplemented`, `not_implemented`
- `coming soon`, `wip`, `work in progress`
- `defer`, `deferred`, `later`
- `throw new Error('not implemented')`
- `console.log` in any file outside `tools/`

Test files (`**/*.test.ts`, `**/*.spec.ts`, `packages/kernel-testkit/**`) MAY use the words `mock`, `stub`, `fake` only when describing test doubles, never to ship behavior into production paths.

## Rule 3 — Only enterprise production-grade code is acceptable
Every PR must satisfy all of the following before merge:
1. `pnpm -r run build` passes with zero errors.
2. `pnpm -r run typecheck` passes with zero errors and no `any` cast unless wrapped in a typed adapter.
3. `pnpm run quality` (file-size + forbidden-token scan) passes.
4. `pnpm -r run test` passes; new code carries tests.
5. Migrations are forward-only, sha256-tracked, reversible by a documented rollback path.
6. Every public route enforces auth, validation, and tenant context.
7. No secret, API key, password, or token is committed; secrets live in `/etc/dogan-ai-os/*.env` (sops-encrypted).
8. No file ships without an owner in `CODEOWNERS`.
9. No dependency is added without license review (no AGPL/BSL/SSPL in core).
10. No runtime depends on a service that lacks a healthcheck.

## Rule 4 — No deferred work
- "Will fix later" is not acceptable. Fix it now or do not ship the change.
- An incomplete feature is not merged behind a flag without the flag's full lifecycle owner, default, and removal date set in `platform.feature_flags`.
- Refactors split into multiple PRs must each be independently shippable and pass all gates.

## Rule 5 — Honesty
- Do not log success when an operation failed.
- Do not return 200 on partial failure; return the correct status with a structured error.
- Do not silently swallow errors; either handle them with a documented action or propagate them.

## Enforcement
- `pnpm run quality` runs Rule 1 + Rule 2 scans locally and in CI.
- `pnpm -r run typecheck` enforces Rule 3.2.
- `pnpm -r run test` enforces Rule 3.4.
- CI workflow `.github/workflows/ci.yml` blocks merges on any failure.
- Pre-commit hook `tools/quality/pre-commit.sh` runs the same checks before every commit.
