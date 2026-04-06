export type _DeadLetterEntry = any;
export type _FailureStats = any;

export async function getUnresolvedEntries(tenantId: string, agentId?: string, failureCategory?: string, limit?: number) {
  return [];
}

export async function getFailureStats(tenantId: string, agentId?: string, days?: number) {
  return {};
}

export async function resolveDLQEntry(tenantId: string, dlqId: string, resolutionAction: string, resolvedBy: string, resolutionNotes?: string) {
  return true;
}
