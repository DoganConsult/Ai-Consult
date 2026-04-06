/**
 * Event Bus Service facade — re-exports from canonical DOS event bus.
 *
 * The canonical event bus lives at: platform/dos/events/event-bus.ts
 * (Law 1: one canonical engine per concern)
 *
 * All 47+ module consumers that import from this path continue to work.
 * New code MUST import from the canonical location directly.
 *
 * @owner DOS
 * @cross-layer-bridge: re-exports from canonical DOS event bus
 */
export {
  // -- AGRCEventBus singleton --
  eventBus,
  platformEventBus,

  // -- Functional API --
  publish,
  subscribe,
  emitEvent,
  registerEventType,
  getRegisteredEventTypes,
  registerModuleEventTypes,
  getDeadLetterQueue,
  drainDeadLetterQueue,
  getSubscriberCount,

  // -- Product-code registry (legacy) --
  registerEventTypes,
  getRegisteredTypes,

  // -- Event log chain verification --
  verifyEventLogChain,

  // -- Automation rules --
  seedDefaultAutomationRules,
  getAutomationRules,
  getAutomationRule,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  getAutomationLog,
} from '../../../../platform/dos/events/event-bus';

export type {
  // -- Types --
  PlatformEvent,
  DOSEventHandler,
  BeforePublishHook,
  AfterPublishHook,
  EventSubscription,
  EventRegistration,
  EventCategory,
  EventSeverity,
  RetryPolicy,
  EmitEventParams,
  EventTypeString,
} from '../../../../platform/dos/events/event-bus';
