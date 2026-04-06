import { safeQuery } from '../../../../config/database/database';
import { logger } from '../../logger';
import type {
  HealthState,
  DependencyHealth,
  RuntimeHealthStatus,
  PlatformHealthSnapshot,
} from '../contracts/operations.types';

const SERVICE_START_TIME = Date.now();

type HealthCheckFn = () => Promise<RuntimeHealthStatus>;

const domainChecks = new Map<string, HealthCheckFn>();

export function registerDomainHealthCheck(serviceCode: string, check: HealthCheckFn): void {
  domainChecks.set(serviceCode, check);
}

function deriveState(dependencies: DependencyHealth[]): HealthState {
  if (dependencies.some((d) => d.state === 'unhealthy')) return 'unhealthy';
  if (dependencies.some((d) => d.state === 'degraded')) return 'degraded';
  return 'healthy';
}

async function checkDatabase(): Promise<DependencyHealth> {
  const start = Date.now();
  try {
    await safeQuery('SELECT 1', []);
    return { name: 'database', state: 'healthy', latencyMs: Date.now() - start, checkedAt: new Date().toISOString() };
  } catch (err) {
    return {
      name: 'database',
      state: 'unhealthy',
      latencyMs: Date.now() - start,
      message: (err as Error).message,
      checkedAt: new Date().toISOString(),
    };
  }
}

async function getPlatformCoreHealth(): Promise<RuntimeHealthStatus> {
  const deps: DependencyHealth[] = [await checkDatabase()];
  const state = deriveState(deps);
  return {
    serviceCode: 'dos-core',
    state,
    liveness: true,
    readiness: state !== 'unhealthy',
    dependencies: deps,
    startupComplete: true,
    checkedAt: new Date().toISOString(),
  };
}

export async function getDomainHealth(serviceCode: string): Promise<RuntimeHealthStatus | null> {
  const check = domainChecks.get(serviceCode);
  if (!check) return null;
  try {
    return await check();
  } catch (err) {
    logger.warn(`[PlatformHealth] Domain check failed: ${serviceCode}`, { error: (err as Error).message });
    return {
      serviceCode,
      state: 'unhealthy',
      liveness: false,
      readiness: false,
      dependencies: [],
      startupComplete: false,
      checkedAt: new Date().toISOString(),
      message: (err as Error).message,
    };
  }
}

export async function getPlatformHealthSnapshot(): Promise<PlatformHealthSnapshot> {
  const services: RuntimeHealthStatus[] = [await getPlatformCoreHealth()];

  for (const [serviceCode, check] of domainChecks) {
    try {
      services.push(await check());
    } catch (err) {
      services.push({
        serviceCode,
        state: 'unhealthy',
        liveness: false,
        readiness: false,
        dependencies: [],
        startupComplete: false,
        checkedAt: new Date().toISOString(),
        message: (err as Error).message,
      });
    }
  }

  const hasUnhealthy = services.some((s) => s.state === 'unhealthy');
  const hasDegraded = services.some((s) => s.state === 'degraded');
  const overallState: HealthState = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';

  return {
    overallState,
    services,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '0.0.0',
    uptimeSeconds: Math.floor((Date.now() - SERVICE_START_TIME) / 1000),
  };
}

export async function isReady(): Promise<boolean> {
  const snapshot = await getPlatformHealthSnapshot();
  return snapshot.overallState !== 'unhealthy';
}

export async function isLive(): Promise<boolean> {
  try {
    await safeQuery('SELECT 1', []);
    return true;
  } catch {
    return false;
  }
}

export const platformHealthService = {
  registerDomainHealthCheck,
  getPlatformHealthSnapshot,
  getDomainHealth,
  isReady,
  isLive,
};
