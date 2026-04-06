/**
 * Stub: rbac-drift-detection.job
 * Not yet implemented -- returns safely as a no-op.
 */

export async function detectRbacDriftForAllTenants(..._args: any[]): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[rbac-drift-detection] not yet implemented — skipping');
  }
}
