/**
 * Platform Mode Gate Service - Re-export barrel.
 *
 * The original 1,054-line file has been split into focused sub-modules under
 * ./platform-mode-gate/. This file re-exports everything for backward compatibility.
 *
 * @cross-layer-bridge modules/platform → platform/dos (approved migration path, Phase 3)
 */

export * from '../../../modules/platform/services/platform-mode-gate/index';
