export interface AgentHandoff {
  id: string;
  fromAgent: string;
  toAgent: string;
  tenantId: string;
  handoffType: 'finding' | 'escalation' | 'context_enrichment' | 'validation_request' | 'remediation_chain';
  priority: 'critical' | 'high' | 'medium' | 'low';
  payload: {
    entityType?: string;
    entityId?: string;
    finding?: string;
    context?: Record<string, any>;
    requestedAction?: string;
  };
  status: 'pending' | 'accepted' | 'completed' | 'rejected';
  createdAt: string;
  completedAt?: string;
  result?: Record<string, any>;
}
