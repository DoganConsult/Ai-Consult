export interface RuntimeEnvironment {
  readonly production: boolean;
  readonly authIssuer: string;
  readonly authClientId: string;
  readonly authRedirectUri: string;
  readonly authPostLogoutRedirectUri: string;
  readonly apiBaseUrl: string;
}

export const environment: RuntimeEnvironment = {
  production: true,
  authIssuer: 'https://auth.dogan-ai.com/realms/dogan',
  authClientId: 'dogan-shell',
  authRedirectUri: 'https://dogan-ai.com/auth/callback',
  authPostLogoutRedirectUri: 'https://dogan-ai.com/',
  apiBaseUrl: 'https://api.dogan-ai.com',
};
