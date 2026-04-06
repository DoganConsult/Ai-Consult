/**
 * Smart Module Activation Service — Intelligent GRC Module Management
 *
 * This file has been refactored into focused sub-modules under
 * ./smart-module-activation/. This barrel re-export preserves the
 * original public API so all existing consumers continue to work.
 *
 * Sub-modules:
 *   types.ts                — ModuleActivationRule interface
 *   activation-rules.ts     — MODULE_ACTIVATION_RULES constant
 *   activation-engine.ts    — activateModulesSmartly + condition evaluation
 *   module-db-operations.ts — activate/deactivate/status/getActive DB ops
 *   grc-process-enforcement.ts — ensureWorkflow/Role/Dashboard helpers
 *   validation.ts           — validateGrcProcessRequirements
 *   format-helpers.ts       — bilingual formatting utilities
 */

export * from '../../../../modules/platform/services/smart-module-activation/index';
