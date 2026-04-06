# Repository Guidelines

## Project Structure & Module Organization

The **DOS Platform Package** is a standalone deployment of the **Dogan-AI-OS (DOS)** core and **DAuth** authentication system. It uses a schema-per-tenant isolation model in PostgreSQL (`tenant_{id}`).

- **`backend/`**: Node.js/Express TypeScript application (port 3010). Core logic resides in `src/platform/dos/` and `src/platform/dauth/`.
- **`frontend/`**: Angular 19 platform shell using PrimeNG.
- **`config/`**: Environment profiles for production, staging, and on-prem.
- **`scripts/`**: Operational bash scripts for build, DB init, and backup/restore.
- **`tests/`**: Cross-layer test suites (smoke, boundary, migration).

## Build, Test, and Development Commands

The project uses `pnpm` as the package manager.

### Global Commands (Root)
- **Install & Build All**: `bash scripts/build.sh`
- **Initialize Database**: `pnpm db:init`
- **Development (Backend)**: `pnpm dev`
- **Development (Frontend)**: `pnpm frontend:start`
- **Run All Tests**: `pnpm test`
- **Run Smoke Tests**: `pnpm test:smoke`

### Backend Commands (`backend/`)
- **Typecheck**: `pnpm run typecheck`
- **Lint**: `pnpm run lint`
- **Build**: `pnpm run build`
- **Start Production**: `pm2 start ecosystem.config.js`

## Coding Style & Naming Conventions

- **TypeScript**: Enforced strict mode. Run `pnpm run typecheck` in `backend/` to verify.
- **Linting**: ESLint is used for backend code.
- **Architecture**: No product-specific logic or "Shahin-AI" references are permitted. All components must follow the platform-only contract.

## Testing Guidelines

The project uses **Vitest** for both unit and integration testing.

- **Backend Tests**: Located in `backend/src/tests/`.
- **Root Tests**: Integration tests in `tests/` covering boundary and migration scenarios.
- **Command**: `vitest run <path/to/test>` to run a specific test file.

## Commit & Pull Request Guidelines

Standardize commit messages to reflect the component being changed (e.g., `feat(backend): ...`, `fix(frontend): ...`, `docs(runbooks): ...`). Ensure all tests pass (`pnpm test`) before submitting changes.
