import { loadConfig } from '@dogan/config';
import { initTelemetry } from '@dogan/telemetry';
import { buildKernel, loadKernelProducts, dosPillar } from '@dogan/dos';
import { dauthPillar } from '@dogan/dauth';
import { dsocPillar } from '@dogan/dsoc';
import { dnocPillar } from '@dogan/dnoc';

async function main() {
  const config = loadConfig();
  const telemetry = initTelemetry({
    serviceName: config.OTEL_SERVICE_NAME,
    serviceVersion: config.KERNEL_VERSION,
    otlpEndpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,
    logLevel: config.LOG_LEVEL,
    enabled: config.NODE_ENV !== 'test',
  });

  // DOS = the kernel itself.
  const app = await buildKernel({ config, logger: telemetry.logger });

  // Pillars attach to the kernel as plugins.
  await app.register(dosPillar, { config, logger: telemetry.logger });
  await app.register(dauthPillar, { config, logger: telemetry.logger });
  await app.register(dsocPillar, { config, logger: telemetry.logger });
  await app.register(dnocPillar, { config, logger: telemetry.logger });

  // Products mount AFTER all pillars are registered so they can use
  // app.dauth (requireRelation), DSOC audit hooks, etc.
  await loadKernelProducts(app, config);

  // Top-level platform identity.
  app.addHook('onSend', async (_req, reply) => {
    reply.header('x-powered-by', 'Dogan AI OS');
    reply.header(
      'x-dogan-pillars',
      'DAuth,DOS,DSOC,DNOC',
    );
  });

  app.get('/platform', async () => ({
    platform: 'Dogan AI OS',
    kernel: config.KERNEL_VERSION,
    pillars: ['DAuth', 'DOS', 'DSOC', 'DNOC'],
    products: app.kernelLoadedProducts ?? [],
  }));

  const shutdown = async (signal: string) => {
    telemetry.logger.info({ signal }, 'shutting down platform');
    try {
      await app.close();
    } finally {
      await telemetry.shutdown();
      process.exit(0);
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await app.listen({ host: config.KERNEL_HOST, port: config.KERNEL_PORT });
  telemetry.logger.info(
    {
      host: config.KERNEL_HOST,
      port: config.KERNEL_PORT,
      pillars: ['DAuth', 'DOS', 'DSOC', 'DNOC'],
    },
    'Dogan AI OS listening',
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('platform failed to start:', err);
  process.exit(1);
});
