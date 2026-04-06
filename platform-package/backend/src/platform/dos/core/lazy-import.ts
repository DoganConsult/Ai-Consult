/**
 * Runtime dynamic import that bypasses TypeScript's static module resolution.
 * Use for modules that may not exist yet (e.g., during incremental migration).
 * The caller must handle import failures via try/catch.
 */
export function lazyImport<T = any>(modulePath: string): Promise<T> {
  return import(modulePath);
}
