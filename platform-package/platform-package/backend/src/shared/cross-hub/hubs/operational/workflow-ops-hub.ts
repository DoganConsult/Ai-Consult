/**
 * Stub: workflow-ops-hub
 * Not yet implemented -- returns safely as a no-op.
 */

export async function registerWorkflowOpsHub(..._args: any[]): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[workflow-ops-hub] not yet implemented — skipping registration');
  }
}
