/**
 * Stub: nav-seeding.service
 * Not yet implemented -- returns safely as a no-op.
 */

export async function repairNonCanonicalModuleCodes(..._args: any[]): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[nav-seeding] repairNonCanonicalModuleCodes not yet implemented — skipping');
  }
}
