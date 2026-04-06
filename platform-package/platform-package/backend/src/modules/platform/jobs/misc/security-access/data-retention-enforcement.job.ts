/**
 * Stub: data-retention-enforcement.job
 * Not yet implemented -- returns safely as a no-op.
 */

export async function runDataRetentionForAllTenants(..._args: any[]): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[data-retention-enforcement] not yet implemented — skipping');
  }
}
