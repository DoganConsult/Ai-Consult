import { pool } from '../../../config/db/pool';
import { ConfigRepository } from './config.repository';
import { StaticScopeAncestryProvider } from './config.resolver';
import { InMemorySecretProvider } from './config.secret-provider';
import { ConfigService } from './config.service';
import { createConfigRouter } from './config.routes';
import { initConfigBridge } from './config.bridge';

export const configRepository = new ConfigRepository(pool);
export const scopeAncestryProvider = new StaticScopeAncestryProvider();
export const secretProvider = new InMemorySecretProvider();

export const configService = new ConfigService(
  configRepository,
  scopeAncestryProvider,
  secretProvider
);

export const configRouter = createConfigRouter(configService);

export const configBridge = initConfigBridge(configRepository);

export * from './config.types';
export * from './config.schemas';
export * from './config.permissions';
export * from './config.bootstrap';
export * from './config.sdk';
export * from './config.seed-definitions';
export { getConfigBridge, hasConfigBridge } from './config.bridge';
export { syncEnvToConfigRegistry, getEnvSyncMap } from './config.env-sync';
