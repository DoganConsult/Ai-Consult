import crypto from 'crypto';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { metricsMiddleware } from './platform/dos/observability/prometheus.service';
import { corsMiddleware } from './platform/dos/http/middleware/module-stack';
import { requestLogger } from './platform/dos/http/middleware/audit';
import { i18nMiddleware } from './platform/dos/http/middleware/module-stack';
import { responseHelpers } from './errors/api-response';
import { apiVersionMiddleware } from './platform/dos/http/middleware/module-stack';
import { csrfProtection } from './platform/dos/http/guards/tenant-guard';
import { inputSanitization } from './platform/dos/http/validation/validate';
import { correlationMiddleware } from './platform/dos/http/middleware/correlation';

export function configureMiddleware(app: express.Express): void {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    app.set('trust proxy', 1);
  }

  app.use(compression({ level: 6, threshold: 1024 }));

  app.use(corsMiddleware());

  app.use((_req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
    next();
  });

  app.use(helmet(isProduction ? {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", ((_req: any, res: any) => `'nonce-${res.locals.cspNonce}'`) as any],
        scriptSrcAttr: [((_req: any, res: any) => `'nonce-${res.locals.cspNonce}'`) as any],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "data:"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'deny' },
  } as any : {
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
    originAgentCluster: false,
  }));

  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(inputSanitization());

  app.use(csrfProtection());

  app.use(correlationMiddleware());

  app.use(metricsMiddleware());

  app.use(requestLogger());

  app.use(i18nMiddleware());

  app.use(responseHelpers());

  app.use(apiVersionMiddleware);
}
