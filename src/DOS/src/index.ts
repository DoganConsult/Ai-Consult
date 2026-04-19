import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { KernelConfig } from '@dogan/config';
import type { Logger } from '@dogan/telemetry';
import { configCenterRoutes } from './config-center.js';

export { buildKernel, loadKernelProducts } from '@dogan/kernel';

export interface DOSPillarOptions {
  config: KernelConfig;
  logger: Logger;
}

const dosPlugin: FastifyPluginAsync<DOSPillarOptions> = async (app: FastifyInstance, opts) => {
  app.get('/pillars/dos/health', async () => ({
    pillar: 'DOS',
    status: 'ok',
    kernel: opts.config.KERNEL_VERSION,
  }));
  await app.register(configCenterRoutes);
  void opts.logger;
};

export const dosPillar = fp(dosPlugin, { name: 'dogan-dos' });
export default dosPillar;
