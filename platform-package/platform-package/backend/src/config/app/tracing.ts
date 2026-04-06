import { toErrorMessage } from '../../errors/http-error.util';
import { logger as platformLogger } from '../../platform/dos/observability/logger.service';
// ============================================================================
// OpenTelemetry Distributed Tracing Setup (W2-18)
// Traces requests across Express → Temporal → LangGraph → PostgreSQL
// Enabled by default in production. Opt-out via OTEL_DISABLED=true.
// Sampling rate configurable via OTEL_SAMPLING_RATE (default: 0.1 = 10%).
// Install: pnpm add @opentelemetry/api @opentelemetry/sdk-node
//          @opentelemetry/auto-instrumentations-node
//          @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources
//          @opentelemetry/semantic-conventions @opentelemetry/sdk-trace-base
// ============================================================================

/** Reference to the NodeSDK instance for graceful shutdown */
let sdk: { start: () => void; shutdown: () => Promise<void> } | null = null;

/** Whether tracing is currently active (used by traceAsync to skip wrapping) */
let tracingActive = false;

/**
 * Initialize OpenTelemetry SDK.
 * Call this BEFORE importing Express or any other instrumented library.
 * Requires OpenTelemetry packages to be installed (pnpm add @opentelemetry/...).
 */
export async function initTracing(): Promise<void> {
  // Enabled by default in production; opt-out via OTEL_DISABLED=true
  if (process.env.OTEL_DISABLED === "true") {
    platformLogger.info("[Tracing] OpenTelemetry disabled (OTEL_DISABLED=true)");
    return;
  }

  try {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { diag, DiagConsoleLogger, DiagLogLevel } = require("@opentelemetry/api");
    const { NodeSDK } = require("@opentelemetry/sdk-node");
    const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
    const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
    const { Resource } = require("@opentelemetry/resources");
    const { BatchSpanProcessor, ConsoleSpanExporter, TraceIdRatioBasedSampler } = require("@opentelemetry/sdk-trace-base");

    if (process.env.OTEL_DEBUG === "true") {
      diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
    }

    const serviceName = process.env.OTEL_SERVICE_NAME || "dos-backend";
    const serviceVersion = process.env.npm_package_version || "1.0.0";
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";
    const samplingRate = parseFloat(process.env.OTEL_SAMPLING_RATE || "0.1");

    const traceExporter = process.env.OTEL_EXPORTER === "console"
      ? new ConsoleSpanExporter()
      : new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` });

    sdk = new NodeSDK({
      resource: new Resource({
        "service.name": serviceName,
        "service.version": serviceVersion,
        "deployment.environment": process.env.NODE_ENV || "development",
      }),
      sampler: new TraceIdRatioBasedSampler(samplingRate),
      spanProcessor: new BatchSpanProcessor(traceExporter, {
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
        scheduledDelayMillis: 5000,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-http": {
            ignoreIncomingPaths: ["/health", "/ready", "/metrics"],
          },
          "@opentelemetry/instrumentation-express": { enabled: true },
          "@opentelemetry/instrumentation-pg": { enabled: true },
          "@opentelemetry/instrumentation-dns": { enabled: false },
          "@opentelemetry/instrumentation-net": { enabled: false },
          "@opentelemetry/instrumentation-fs": { enabled: false },
        }),
      ],
    });

    sdk!.start();
    tracingActive = true;
    platformLogger.info(`[Tracing] OpenTelemetry initialized → ${otlpEndpoint} (service: ${serviceName}, sampling: ${samplingRate * 100}%)`);

    process.on("SIGTERM", () => {
      sdk?.shutdown().then(
        () => platformLogger.info("[Tracing] OpenTelemetry shut down successfully"),
        (err: any) => platformLogger.error("[Tracing] Shutdown error:", { error: toErrorMessage(err) })
      );
    });
  } catch (err: unknown) {
    platformLogger.info(`[Tracing] OpenTelemetry packages not installed — tracing disabled (${toErrorMessage(err)})`);
  }
}

/**
 * Create a custom span for business logic tracing.
 * No-ops gracefully if OpenTelemetry is not available.
 */
export function createSpan(name: string, attributes?: Record<string, string | number | boolean>) {
  try {
    const { trace } = require("@opentelemetry/api");
    const tracer = trace.getTracer(process.env.OTEL_SERVICE_NAME || "dos-backend", "1.0.0");
    const span = tracer.startSpan(name);
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        span.setAttribute(key, value);
      }
    }
    return span;
  } catch {
    // Return no-op span
    return { setAttribute: () => {}, setStatus: () => {}, recordException: () => {}, end: () => {} };
  }
}

/**
 * Trace an async function execution.
 */
export async function traceAsync<T>(
  spanName: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  if (!tracingActive) return fn();

  const span = createSpan(spanName, attributes);
  try {
    const result = await fn();
    span.setStatus({ code: 1 }); // OK
    return result;
  } catch (err: unknown) {
    span.setStatus({ code: 2, message: toErrorMessage(err) }); // ERROR
    span.recordException(err);
    throw err;
  } finally {
    span.end();
  }
}
