import { EventEmitter } from 'events';

export type EventSeverity = 'info' | 'warn' | 'error' | 'critical';
export type EventCategory =
  | 'domain'
  | 'platform'
  | 'security'
  | 'lifecycle'
  | 'operational'
  | 'integration';

/** Actor type classification — GPOC §17.1 */
export type ActorType = 'user' | 'system' | 'agent';

/** Event source classification — GPOC §17.1 */
export type EventSource = 'api' | 'event' | 'job' | 'agent' | 'system' | 'workflow';

export interface PlatformEvent<T = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  category: EventCategory;
  severity: EventSeverity;
  tenantId: string;
  userId?: string;
  actorId?: string;
  actorType?: ActorType;
  source?: EventSource;
  moduleCode?: string;
  entityType?: string;
  entityId?: string;
  payload: T;
  data?: T;
  correlationId?: string;
  causationId?: string;
  occurredAt: Date;
  version: number;
}

export interface EventSubscription {
  eventType: string;
  handler: (event: PlatformEvent) => Promise<void>;
  subscriberId: string;
  moduleCode?: string;
  retryPolicy?: RetryPolicy;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  deadLetterAfterRetries: boolean;
}

export interface EventRegistration {
  eventType: string;
  category: EventCategory;
  ownerModule: string;
  payloadSchema?: Record<string, string>;
  description?: string;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  backoffMs: 1000,
  deadLetterAfterRetries: true,
};

const internalEmitter = new EventEmitter();
internalEmitter.setMaxListeners(200);
export { internalEmitter };
