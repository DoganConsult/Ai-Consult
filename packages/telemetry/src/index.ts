import { pino as pinoFn, type Logger } from 'pino';
const pino = pinoFn;
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export interface TelemetryOptions {
  serviceName: string;
  serviceVersion: string;
  otlpEndpoint: string;
  logLevel?: string;
  enabled?: boolean;
}

export interface Telemetry {
  logger: Logger;
  shutdown: () => Promise<void>;
}

export function initTelemetry(opts: TelemetryOptions): Telemetry {
  const logger = pino({
    level: opts.logLevel ?? 'info',
    base: { service: opts.serviceName, version: opts.serviceVersion },
    timestamp: pino.stdTimeFunctions.isoTime,
  });

  if (opts.enabled === false) {
    return { logger, shutdown: async () => {} };
  }

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: opts.serviceName,
    [ATTR_SERVICE_VERSION]: opts.serviceVersion,
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({ url: `${opts.otlpEndpoint}/v1/traces` }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${opts.otlpEndpoint}/v1/metrics` }),
      exportIntervalMillis: 30_000,
    }),
    instrumentations: [getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    })],
  });

  try {
    sdk.start();
    logger.info('otel sdk started');
  } catch (err) {
    logger.warn({ err }, 'otel sdk failed to start; continuing without telemetry');
  }

  return {
    logger,
    shutdown: async () => {
      try {
        await sdk.shutdown();
      } catch {
        /* noop */
      }
    },
  };
}

export { trace, context, SpanStatusCode };
export type { Logger };
export { getMetricsRegistry, renderMetrics, getDauthMetrics } from './metrics.js';
export type { DauthMetrics } from './metrics.js';
