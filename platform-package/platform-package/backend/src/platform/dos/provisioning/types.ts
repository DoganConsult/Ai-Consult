/**
 * DOS provisioning types — re-export from canonical location.
 * Will absorb full type definitions when modules/platform/provisioning/ migrates to DOS.
 * @cross-layer-bridge modules/platform → platform/dos (approved migration path, Phase 3)
 */
export { type PackManifest, type ProvisioningJobStatus } from '../../../modules/platform/provisioning/types';
