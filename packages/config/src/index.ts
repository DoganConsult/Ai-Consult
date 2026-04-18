import 'dotenv/config';
import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

export const KernelConfigSchema = Type.Object({
  NODE_ENV: Type.Union([Type.Literal('development'), Type.Literal('production'), Type.Literal('test')], {
    default: 'development',
  }),
  KERNEL_HOST: Type.String({ default: '127.0.0.1' }),
  KERNEL_PORT: Type.Number({ default: 3100 }),
  LOG_LEVEL: Type.String({ default: 'info' }),
  DATABASE_URL: Type.String({ minLength: 1 }),
  DATABASE_MIGRATION_URL: Type.Optional(Type.String()),
  REDIS_URL: Type.String({ default: 'redis://127.0.0.1:6379' }),
  LITELLM_BASE_URL: Type.String({ default: 'http://127.0.0.1:4000' }),
  LITELLM_API_KEY: Type.Optional(Type.String()),
  OPENFGA_URL: Type.String({ default: 'http://127.0.0.1:8080' }),
  OPENFGA_STORE_ID: Type.Optional(Type.String()),
  OPENFGA_MODEL_ID: Type.Optional(Type.String()),
  TEMPORAL_ADDRESS: Type.String({ default: '127.0.0.1:7233' }),
  OTEL_EXPORTER_OTLP_ENDPOINT: Type.String({ default: 'http://127.0.0.1:4318' }),
  OTEL_SERVICE_NAME: Type.String({ default: 'dogan-kernel' }),
  JWT_ISSUER: Type.String({ default: 'http://127.0.0.1:8090/realms/dogan' }),
  JWT_AUDIENCE: Type.String({ default: 'dogan-kernel' }),
  JWT_JWKS_URL: Type.Optional(Type.String()),
  JWT_DEV_SECRET: Type.Optional(Type.String()),
  PRODUCTS_DIR: Type.String({ default: 'products' }),
  KERNEL_VERSION: Type.String({ default: '0.1.0' }),
});

export type KernelConfig = Static<typeof KernelConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): KernelConfig {
  const raw: Record<string, unknown> = {};
  for (const key of Object.keys(KernelConfigSchema.properties)) {
    const v = env[key];
    if (v === undefined || v === '') continue;
    const prop = (KernelConfigSchema.properties as Record<string, { type?: string }>)[key];
    raw[key] = prop?.type === 'number' ? Number(v) : v;
  }
  const withDefaults = Value.Default(KernelConfigSchema, raw) as Record<string, unknown>;
  const errors = [...Value.Errors(KernelConfigSchema, withDefaults)];
  if (errors.length) {
    const lines = errors.map((e) => `${e.path} ${e.message}`).join('\n');
    throw new Error(`Invalid kernel configuration:\n${lines}`);
  }
  return withDefaults as KernelConfig;
}
