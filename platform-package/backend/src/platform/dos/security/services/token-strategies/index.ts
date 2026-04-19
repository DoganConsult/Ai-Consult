// ============================================
// Platform — OAuth token strategies bootstrap
// Registers all vendor strategies with the singleton
// token manager. Import this module once at server
// startup; registration is idempotent-safe against a
// duplicate-import guard in OAuthTokenManager.
// ============================================

import { oauthTokenManager } from '../oauth-token-manager.service';
import { microsoftClientCredentialsStrategy } from './microsoft-client-credentials.strategy';

let registered = false;

export function registerBuiltInTokenStrategies(): void {
  if (registered) return;
  oauthTokenManager.registerStrategy(microsoftClientCredentialsStrategy);
  registered = true;
}

export { microsoftClientCredentialsStrategy };
