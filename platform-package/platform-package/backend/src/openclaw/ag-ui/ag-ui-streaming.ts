// ============================================
// AG-UI (Agent UI) Real-time Streaming Support
// Lightweight, bidirectional, event-based protocol
// for connecting user-facing applications with agent backends
// Compatible with respon.ai and similar frameworks
// ============================================

import { WebSocket } from 'ws';
import { logger } from '../../platform/dos/observability/logger.service';
import { toErrorMessage } from '../../errors/http-error.util';

export interface AGUIEvent {
  type: 'token' | 'tool_call' | 'progress' | 'approval' | 'artifact' | 'error' | 'complete';
  timestamp: string;
  agentId?: string;
  runId?: string;
  data: Record<string, any>;
}

export interface AGUISubscription {
  subscriptionId: string;
  agentId?: string;
  runId?: string;
  eventTypes: string[];
  ws: WebSocket;
  createdAt: string;
}

// In-memory subscription store (in production, use Redis for multi-instance)
const subscriptions = new Map<string, AGUISubscription>();

/**
 * Subscribe to real-time agent events (AG-UI protocol)
 */
export function subscribeToAGUIEvents(
  ws: WebSocket,
  params: {
    agentId?: string;
    runId?: string;
    eventTypes?: string[];
  }
): string {
  const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const subscription: AGUISubscription = {
    subscriptionId,
    agentId: params.agentId,
    runId: params.runId,
    eventTypes: params.eventTypes || ['token', 'tool_call', 'progress', 'approval', 'artifact', 'error', 'complete'],
    ws,
    createdAt: new Date().toISOString(),
  };

  subscriptions.set(subscriptionId, subscription);

  // Send subscription confirmation
  ws.send(JSON.stringify({
    type: 'subscription_confirmed',
    subscriptionId,
    timestamp: new Date().toISOString(),
  }));

  // Cleanup on disconnect
  ws.on('close', () => {
    subscriptions.delete(subscriptionId);
    logger.info('[AG-UI] Subscription closed', { subscriptionId });
  });

  logger.info('[AG-UI] New subscription', { subscriptionId, agentId: params.agentId, runId: params.runId });
  
  return subscriptionId;
}

/**
 * Publish an AG-UI event to all matching subscriptions
 */
export function publishAGUIEvent(event: AGUIEvent): void {
  let publishedCount = 0;

  for (const [subscriptionId, subscription] of subscriptions.entries()) {
    // Filter by agentId if specified
    if (subscription.agentId && event.agentId && subscription.agentId !== event.agentId) {
      continue;
    }

    // Filter by runId if specified
    if (subscription.runId && event.runId && subscription.runId !== event.runId) {
      continue;
    }

    // Filter by event type
    if (!subscription.eventTypes.includes(event.type)) {
      continue;
    }

    // Send event if WebSocket is still open
    if (subscription.ws.readyState === WebSocket.OPEN) {
      try {
        subscription.ws.send(JSON.stringify(event));
        publishedCount++;
      } catch (err: unknown) {
        logger.warn('[AG-UI] Failed to send event', { 
          subscriptionId, 
          error: toErrorMessage(err) 
        });
        // Remove broken subscription
        subscriptions.delete(subscriptionId);
      }
    } else {
      // Remove closed subscription
      subscriptions.delete(subscriptionId);
    }
  }

  if (publishedCount > 0) {
    logger.debug('[AG-UI] Event published', { 
      type: event.type, 
      subscriptions: publishedCount 
    });
  }
}

/**
 * Publish token stream event (for streaming LLM responses)
 */
export function publishTokenEvent(
  agentId: string,
  runId: string,
  token: string,
  isComplete: boolean = false
): void {
  publishAGUIEvent({
    type: 'token',
    timestamp: new Date().toISOString(),
    agentId,
    runId,
    data: {
      token,
      isComplete,
    },
  });
}

/**
 * Publish tool call event
 */
export function publishToolCallEvent(
  agentId: string,
  runId: string,
  toolName: string,
  toolArgs: Record<string, any>,
  result?: any,
  error?: string
): void {
  publishAGUIEvent({
    type: 'tool_call',
    timestamp: new Date().toISOString(),
    agentId,
    runId,
    data: {
      toolName,
      arguments: toolArgs,
      result,
      error,
      status: error ? 'error' : 'success',
    },
  });
}

/**
 * Publish progress event
 */
export function publishProgressEvent(
  agentId: string,
  runId: string,
  progress: {
    step: string;
    percentage?: number;
    message?: string;
  }
): void {
  publishAGUIEvent({
    type: 'progress',
    timestamp: new Date().toISOString(),
    agentId,
    runId,
    data: progress,
  });
}

/**
 * Publish approval request event
 */
export function publishApprovalEvent(
  agentId: string,
  runId: string,
  approval: {
    approvalId: string;
    action: string;
    description: string;
    requiresApproval: boolean;
  }
): void {
  publishAGUIEvent({
    type: 'approval',
    timestamp: new Date().toISOString(),
    agentId,
    runId,
    data: approval,
  });
}

/**
 * Publish artifact event (generated files, reports, etc.)
 */
export function publishArtifactEvent(
  agentId: string,
  runId: string,
  artifact: {
    artifactId: string;
    type: string;
    url: string;
    metadata?: Record<string, any>;
  }
): void {
  publishAGUIEvent({
    type: 'artifact',
    timestamp: new Date().toISOString(),
    agentId,
    runId,
    data: artifact,
  });
}

/**
 * Publish error event
 */
export function publishErrorEvent(
  agentId: string,
  runId: string,
  error: {
    message: string;
    code?: string;
    details?: Record<string, any>;
  }
): void {
  publishAGUIEvent({
    type: 'error',
    timestamp: new Date().toISOString(),
    agentId,
    runId,
    data: error,
  });
}

/**
 * Publish completion event
 */
export function publishCompleteEvent(
  agentId: string,
  runId: string,
  result: {
    success: boolean;
    summary?: string;
    artifacts?: string[];
  }
): void {
  publishAGUIEvent({
    type: 'complete',
    timestamp: new Date().toISOString(),
    agentId,
    runId,
    data: result,
  });
}

/**
 * Get active subscription count
 */
export function getActiveSubscriptionCount(): number {
  return subscriptions.size;
}

/**
 * Get subscriptions for a specific agent/run
 */
export function getSubscriptions(agentId?: string, runId?: string): AGUISubscription[] {
  const results: AGUISubscription[] = [];
  for (const subscription of subscriptions.values()) {
    if (agentId && subscription.agentId !== agentId) continue;
    if (runId && subscription.runId !== runId) continue;
    results.push(subscription);
  }
  return results;
}
