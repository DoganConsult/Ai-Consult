// ============================================
// Production Enhancements Configuration
// Centralized configuration for all production optimizations
// ============================================

export interface ProductionEnhancements {
  security: SecurityConfig;
  performance: PerformanceConfig;
  monitoring: MonitoringConfig;
  features: FeatureConfig;
}

export interface SecurityConfig {
  cors: {
    enabled: boolean;
    origins: string[];
    credentials: boolean;
    maxAge: number;
  };
  rateLimiting: {
    enabled: boolean;
    apiWindowMs: number;
    apiMaxRequests: number;
    authWindowMs: number;
    authMaxRequests: number;
  };
  headers: {
    hsts: string;
    frameOptions: string;
    contentTypeOptions: string;
    xssProtection: string;
    referrerPolicy: string;
    permissionsPolicy: string;
  };
  ssl: {
    required: boolean;
    enforceHttps: boolean;
  };
}

export interface PerformanceConfig {
  database: {
    poolMax: number;
    idleTimeoutMs: number;
    connectionTimeoutMs: number;
  };
  redis: {
    enabled: boolean;
    ttl: number;
    keyPrefix: string;
  };
  caching: {
    enabled: boolean;
    regulatoryDataTtl: number; // 24h in ms
    dynamicDataTtl: number; // 1min in ms
    frameworkDataTtl: number; // 24h in ms
  };
  compression: {
    enabled: boolean;
    level: number;
    threshold: number;
  };
  cluster: {
    enabled: boolean;
    instances: number;
  };
}

export interface MonitoringConfig {
  langfuse: {
    enabled: boolean;
    publicKey: string;
    secretKey: string;
    host: string;
    project: string;
  };
  opentelemetry: {
    enabled: boolean;
    exporter: string;
    serviceName: string;
    endpoint: string;
  };
  logging: {
    level: string;
    format: 'json' | 'text';
    file: string;
  };
  metrics: {
    enabled: boolean;
    retentionDays: number;
  };
}

export interface FeatureConfig {
  mcp: {
    enabled: boolean;
    port: number;
    transport: 'http' | 'stdio';
    authRequired: boolean;
  };
  langgraph: {
    enabled: boolean;
    maxToolIterations: number;
  };
  temporal: {
    enabled: boolean;
    address: string;
    namespace: string;
  };
  openfga: {
    enabled: boolean;
    apiUrl: string;
    storeId: string;
    modelId: string;
  };
  bullmq: {
    enabled: boolean;
    concurrency: number;
    defaultAttempts: number;
    backoffType: string;
    backoffDelay: number;
  };
  pgmq: {
    enabled: boolean;
    queuePrefix: string;
  };
  age: {
    enabled: boolean;
    graphName: string;
  };
  keyvault: {
    enabled: boolean;
    url: string;
  };
  asyncapi: {
    validationEnabled: boolean;
  };
  prometheus: {
    enabled: boolean;
    path: string;
    prefix: string;
  };
  modules: {
    governance: boolean;
    risk: boolean;
    compliance: boolean;
    evidence: boolean;
    audit: boolean;
    reporting: boolean;
    ai: boolean;
  };
  externalServices: {
    cisoAssistant: { enabled: boolean; url: string };
    openproject: { enabled: boolean; url: string };
    govready: { enabled: boolean; url: string };
  };
}

/**
 * Load production enhancements configuration from environment
 */
export function loadProductionEnhancements(): ProductionEnhancements {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Parse CORS origins
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : [];
  
  return {
    security: {
      cors: {
        enabled: true,
        origins: corsOrigins,
        credentials: true,
        maxAge: 86400, // 24 hours
      },
      rateLimiting: {
        enabled: isProduction,
        apiWindowMs: 60_000, // 1 minute
        apiMaxRequests: 600,
        authWindowMs: 60_000,
        authMaxRequests: 60,
      },
      headers: {
        hsts: 'max-age=31536000; includeSubDomains; preload',
        frameOptions: 'DENY',
        contentTypeOptions: 'nosniff',
        xssProtection: '1; mode=block',
        referrerPolicy: 'strict-origin-when-cross-origin',
        permissionsPolicy: 'geolocation=(), microphone=(), camera=()',
      },
      ssl: {
        required: isProduction,
        enforceHttps: isProduction,
      },
    },
    performance: {
      database: {
        poolMax: parseInt(process.env.DB_POOL_MAX || process.env.PG_POOL_MAX || '10', 10),
        idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT_MS || process.env.PG_IDLE_TIMEOUT_MS || '30000', 10),
        connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || process.env.PG_CONNECTION_TIMEOUT_MS || '5000', 10),
      },
      redis: {
        enabled: !!(process.env.DOS_REDIS_HOST || process.env.REDIS_HOST),
        ttl: 3600, // 1 hour default
        keyPrefix: 'dogan-ai-os:',
      },
      caching: {
        enabled: true,
        regulatoryDataTtl: 24 * 60 * 60 * 1000, // 24 hours
        dynamicDataTtl: 60 * 1000, // 1 minute
        frameworkDataTtl: 24 * 60 * 60 * 1000, // 24 hours
      },
      compression: {
        enabled: isProduction,
        level: 6,
        threshold: 1024, // 1KB
      },
      cluster: {
        enabled: isProduction,
        instances: 2,
      },
    },
    monitoring: {
      langfuse: {
        enabled: process.env.LANGFUSE_ENABLED !== 'false',
        publicKey: process.env.LANGFUSE_PUBLIC_KEY || '',
        secretKey: process.env.LANGFUSE_SECRET_KEY || '',
        host: process.env.LANGFUSE_HOST || (isProduction ? '' : 'http://localhost:3001'),
        project: process.env.LANGFUSE_PROJECT || 'agrc-os-production',
      },
      opentelemetry: {
        enabled: process.env.OTEL_ENABLED === 'true',
        exporter: process.env.OTEL_EXPORTER || 'otlp',
        serviceName: process.env.OTEL_SERVICE_NAME || 'dogan-ai-os-backend',
        endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || (isProduction ? '' : 'http://localhost:4318'),
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: isProduction ? 'json' : 'text',
        file: '/opt/dogan-ai-os/logs/app.log',
      },
      metrics: {
        enabled: true,
        retentionDays: parseInt(process.env.LANGGRAPH_METRICS_RETENTION_DAYS || '90', 10),
      },
    },
    features: {
      mcp: {
        enabled: process.env.MCP_ENABLED !== 'false',
        port: parseInt(process.env.MCP_PORT || '8080', 10),
        transport: (process.env.MCP_TRANSPORT || 'http') as 'http' | 'stdio',
        authRequired: process.env.MCP_AUTH_REQUIRED !== 'false',
      },
      langgraph: {
        enabled: process.env.LANGGRAPH_AGENTS_ENABLED !== 'false',
        maxToolIterations: parseInt(process.env.LANGGRAPH_MAX_TOOL_ITERATIONS || '5', 10),
      },
      temporal: {
        enabled: process.env.TEMPORAL_ENABLED === 'true',
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
        namespace: process.env.TEMPORAL_NAMESPACE || 'default',
      },
      openfga: {
        enabled: process.env.OPENFGA_ENABLED === 'true',
        apiUrl: process.env.OPENFGA_API_URL || 'http://localhost:8081',
        storeId: process.env.OPENFGA_STORE_ID || '',
        modelId: process.env.OPENFGA_MODEL_ID || '',
      },
      bullmq: {
        enabled: process.env.BULLMQ_ENABLED !== 'false',
        concurrency: parseInt(process.env.BULLMQ_CONCURRENCY || '5', 10),
        defaultAttempts: parseInt(process.env.BULLMQ_DEFAULT_ATTEMPTS || '3', 10),
        backoffType: process.env.BULLMQ_BACKOFF_TYPE || 'exponential',
        backoffDelay: parseInt(process.env.BULLMQ_BACKOFF_DELAY || '1000', 10),
      },
      pgmq: {
        enabled: process.env.PGMQ_ENABLED === 'true',
        queuePrefix: process.env.PGMQ_QUEUE_PREFIX || 'dogan_',
      },
      age: {
        enabled: process.env.AGE_ENABLED === 'true',
        graphName: process.env.AGE_GRAPH_NAME || 'dogan_ai_os_graph',
      },
      keyvault: {
        enabled: process.env.AZURE_KEYVAULT_ENABLED === 'true',
        url: process.env.AZURE_KEYVAULT_URL || '',
      },
      asyncapi: {
        validationEnabled: process.env.ASYNCAPI_VALIDATION_ENABLED === 'true',
      },
      prometheus: {
        enabled: process.env.METRICS_ENABLED !== 'false',
        path: process.env.METRICS_PATH || '/metrics',
        prefix: process.env.METRICS_PREFIX || 'dogan_ai_os_',
      },
      modules: {
        governance: true,
        risk: true,
        compliance: true,
        evidence: true,
        audit: true,
        reporting: true,
        ai: true,
      },
      externalServices: {
        cisoAssistant: {
          enabled: process.env.CISO_ASSISTANT_ENABLED === 'true',
          url: process.env.CISO_ASSISTANT_URL || 'http://localhost:8600',
        },
        openproject: {
          enabled: process.env.OPENPROJECT_ENABLED === 'true',
          url: process.env.OPENPROJECT_URL || 'http://localhost:8602',
        },
        govready: {
          enabled: process.env.GOVREADY_ENABLED === 'true',
          url: process.env.GOVREADY_URL || 'http://localhost:8601',
        },
      },
    },
  };
}

/**
 * Validate production enhancements configuration
 */
export function validateProductionEnhancements(config: ProductionEnhancements): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Security validation
  if (config.security.cors.enabled && config.security.cors.origins.length === 0) {
    errors.push('CORS enabled but no origins configured');
  }
  
  if (config.security.cors.origins.some(o => o.includes('*'))) {
    warnings.push('CORS origins contain wildcard - not recommended for production');
  }
  
  // Performance validation
  if (config.performance.database.poolMax < 5) {
    warnings.push('Database pool max is very low (< 5)');
  }
  
  if (config.performance.database.poolMax > 50) {
    warnings.push('Database pool max is very high (> 50) - may cause connection exhaustion');
  }
  
  // Monitoring validation
  if (config.monitoring.langfuse.enabled) {
    if (!config.monitoring.langfuse.publicKey) {
      errors.push('Langfuse enabled but LANGFUSE_PUBLIC_KEY not set');
    }
    if (!config.monitoring.langfuse.secretKey) {
      errors.push('Langfuse enabled but LANGFUSE_SECRET_KEY not set');
    }
  }
  
  // Feature validation
  if (config.features.mcp.enabled && config.features.mcp.port < 1024) {
    warnings.push('MCP port is below 1024 - may require root privileges');
  }
  
  if (config.features.temporal.enabled && !config.features.temporal.address) {
    errors.push('Temporal enabled but TEMPORAL_ADDRESS not set');
  }
  
  if (config.features.openfga.enabled && !config.features.openfga.storeId) {
    errors.push('OpenFGA enabled but OPENFGA_STORE_ID not set');
  }

  if (config.features.keyvault.enabled && !config.features.keyvault.url) {
    errors.push('Azure Key Vault enabled but AZURE_KEYVAULT_URL not set');
  }

  if (config.features.bullmq.enabled && !config.performance.redis.enabled) {
    warnings.push('BullMQ enabled but Redis is not configured — jobs will fail');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get production enhancements summary
 */
export function getProductionEnhancementsSummary(config: ProductionEnhancements): string {
  const lines: string[] = [];
  
  lines.push('Production Enhancements Summary:');
  lines.push('');
  
  lines.push('Security:');
  lines.push(`  CORS: ${config.security.cors.enabled ? '✅' : '❌'} (${config.security.cors.origins.length} origins)`);
  lines.push(`  Rate Limiting: ${config.security.rateLimiting.enabled ? '✅' : '❌'}`);
  lines.push(`  SSL Required: ${config.security.ssl.required ? '✅' : '❌'}`);
  lines.push('');
  
  lines.push('Performance:');
  lines.push(`  Database Pool: ${config.performance.database.poolMax} connections`);
  lines.push(`  Redis: ${config.performance.redis.enabled ? '✅' : '❌'}`);
  lines.push(`  Caching: ${config.performance.caching.enabled ? '✅' : '❌'}`);
  lines.push(`  Compression: ${config.performance.compression.enabled ? '✅' : '❌'}`);
  lines.push(`  Cluster Mode: ${config.performance.cluster.enabled ? '✅' : '❌'} (${config.performance.cluster.instances} instances)`);
  lines.push('');
  
  lines.push('Monitoring:');
  lines.push(`  Langfuse: ${config.monitoring.langfuse.enabled ? '✅' : '❌'}`);
  lines.push(`  OpenTelemetry: ${config.monitoring.opentelemetry.enabled ? '✅' : '❌'}`);
  lines.push(`  Logging: ${config.monitoring.logging.level} (${config.monitoring.logging.format})`);
  lines.push('');
  
  lines.push('Features:');
  lines.push(`  MCP Server: ${config.features.mcp.enabled ? '✅' : '❌'}`);
  lines.push(`  LangGraph Agents: ${config.features.langgraph.enabled ? '✅' : '❌'}`);
  lines.push(`  Temporal: ${config.features.temporal.enabled ? '✅' : '❌'}`);
  lines.push(`  OpenFGA: ${config.features.openfga.enabled ? '✅' : '❌'}`);
  lines.push(`  BullMQ: ${config.features.bullmq.enabled ? '✅' : '❌'} (concurrency: ${config.features.bullmq.concurrency})`);
  lines.push(`  PGMQ: ${config.features.pgmq.enabled ? '✅' : '❌'}`);
  lines.push(`  Apache AGE: ${config.features.age.enabled ? '✅' : '❌'}`);
  lines.push(`  Azure Key Vault: ${config.features.keyvault.enabled ? '✅' : '❌'}`);
  lines.push(`  AsyncAPI Validation: ${config.features.asyncapi.validationEnabled ? '✅' : '❌'}`);
  lines.push(`  Prometheus Metrics: ${config.features.prometheus.enabled ? '✅' : '❌'} (${config.features.prometheus.path})`);
  lines.push(`  GRC Modules: ${Object.values(config.features.modules).filter(Boolean).length}/7 enabled`);
  
  return lines.join('\n');
}

// Export default configuration
export const productionEnhancements = loadProductionEnhancements();
