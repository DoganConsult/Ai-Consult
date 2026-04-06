/**
 * Stub: knowledge-hub
 * Not yet implemented -- returns safely as a no-op.
 */

export async function registerKnowledgeHub(..._args: any[]): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[knowledge-hub] not yet implemented — skipping registration');
  }
}
