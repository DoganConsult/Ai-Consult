/**
 * Stub: certification-bootstrap.installer
 * Not yet implemented -- returns safely as a no-op.
 */

export async function certificationBootstrapInstaller(..._args: any[]): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[certification-bootstrap] not yet implemented — skipping');
  }
}
