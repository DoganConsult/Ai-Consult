/**
 * Deployment Manifest Builder (pure function for testing)
 * Generates a deployment manifest JSON with all required fields.
 *
 * Requirements: 10.5
 */

export interface DeployManifest {
  version: string;
  timestamp: string;
  gitCommit: string;
  deployedBy: string;
  environment: string;
  durationSeconds: number;
  healthCheckPassed: boolean;
}

/**
 * Build a deployment manifest from deployment parameters.
 * Pure function — testable without side effects.
 */
export function buildDeployManifest(params: {
  version: string;
  gitCommit: string;
  deployedBy: string;
  environment: string;
  durationSeconds: number;
  healthCheckPassed: boolean;
}): DeployManifest {
  return {
    version: params.version,
    timestamp: new Date().toISOString(),
    gitCommit: params.gitCommit,
    deployedBy: params.deployedBy,
    environment: params.environment,
    durationSeconds: params.durationSeconds,
    healthCheckPassed: params.healthCheckPassed,
  };
}

/**
 * Validate that a manifest has all required fields.
 */
export function isValidManifest(manifest: any): manifest is DeployManifest {
  return (
    typeof manifest === 'object' &&
    manifest !== null &&
    typeof manifest.version === 'string' &&
    typeof manifest.timestamp === 'string' &&
    typeof manifest.gitCommit === 'string' &&
    typeof manifest.deployedBy === 'string' &&
    typeof manifest.environment === 'string' &&
    typeof manifest.durationSeconds === 'number' &&
    typeof manifest.healthCheckPassed === 'boolean'
  );
}
