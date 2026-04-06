/**
 * DAuth Auth Routes — canonical import path for authentication endpoints.
 *
 * @owner DAuth (Law 2 — DAuth owns identity, sessions, auth endpoints)
 *
 * Implementation currently lives at modules/platform/routes/auth/auth.routes.ts
 * due to cross-module dependencies (workflow templates, admin security config,
 * audit trail, captcha). Physical move is planned once these dependencies are
 * extracted to injectable services.
 *
 * @migration-target This file should contain the full route definitions.
 * @migration-blocker 30+ test files reference the modules/platform path via readFile.
 * @death-date 2026-09-30 — Physical move from modules/platform to this location.
 */
export { default, registerRoleLandings } from '../../../modules/platform/routes/auth/auth.routes';
