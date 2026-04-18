import 'dotenv/config';
import { loadConfig } from '@dogan/config';
import { initTelemetry } from '@dogan/telemetry';
import { buildKernel } from '@dogan/kernel';

async function main() {
  const config = loadConfig();
  const telemetry = initTelemetry({
    serviceName: config.OTEL_SERVICE_NAME,
    serviceVersion: config.KERNEL_VERSION,
    otlpEndpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,
    logLevel: config.LOG_LEVEL,
    enabled: config.NODE_ENV !== 'test',
  });

  const app = await buildKernel({ config, logger: telemetry.logger });

  const shutdown = async (signal: string) => {
    telemetry.logger.info({ signal }, 'shutting down kernel');
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
    { host: config.KERNEL_HOST, port: config.KERNEL_PORT },
    'kernel listening',
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('kernel failed to start:', err);
  process.exit(1);
});
