import type { SecretProvider } from './config.secret-provider';

export interface AgrcEngineOptions {
  configProvider: {
    get: (key: string) => unknown;
    resolve?: (key: string, ctx?: Record<string, string>) => unknown;
  };
  dbClient?: unknown;
  secretProvider?: SecretProvider;
}

export class AgrcEngine {
  constructor(private readonly options: AgrcEngineOptions) {}

  getConfig<T = unknown>(key: string): T {
    return this.options.configProvider.get(key) as T;
  }
}
