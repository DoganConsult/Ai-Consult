# Environment Variable Matrix

This file distinguishes environment variables from product and tenant settings. Use environment variables only for environment/runtime concerns.

## 1. Environment variables

| Variable | Owner | Required | Example | Notes |
|---|---|---:|---|---|
| APP_ENV | Environment | Yes | production | runtime environment |
| DEPLOYMENT_MODE | Deployment | Yes | saas | saas/onprem/hybrid |
| DB_MODE | Deployment | Yes | shared | shared/separate/hybrid |
| DATABASE_URL | Environment | Yes | postgres://... | runtime credential |
| REDIS_URL | Environment | No | redis://... | cache/queue |
| STORAGE_MODE | Deployment | Yes | s3 | s3/local/minio |
| STORAGE_ENDPOINT | Environment | No | https://... | storage runtime endpoint |
| STORAGE_KEY | Environment | No | *** | secret |
| STORAGE_SECRET | Environment | No | *** | secret |
| JWT_SECRET | Environment | Yes | *** | secret |
| SMTP_HOST | Environment | No | smtp.internal | runtime email host |
| SMTP_USER | Environment | No | svc-mail | secret-backed |
| SMTP_PASS | Environment | No | *** | secret |
| LOG_LEVEL | Environment | Yes | info | logging |
| METRICS_ENDPOINT | Environment | No | https://... | observability |
| ALLOW_AIR_GAP | Deployment | No | true | on-prem/offline gate |
| DEFAULT_PRODUCT | Product | No | shahin | use only for initial bootstrap, not tenant override |
| ENABLE_PRODUCT_SHAHIN | Product | No | true | product activation at deployment layer |

## 2. Not environment variables

Do not store these as env vars except for initial bootstrap defaults:
- tenant branding
- enabled modules per tenant
- tenant AI model allowlist
- tenant locale or theme
- workflow overrides
- module UI defaults

These belong in tenant/workspace config storage.

## 3. Bootstrap-only variables

Allowed only for first deployment or installer flow:
- BOOTSTRAP_ADMIN_EMAIL
- BOOTSTRAP_ADMIN_PASSWORD
- BOOTSTRAP_TENANT_NAME
- BOOTSTRAP_PRODUCT_LIST

After bootstrap, these values should live in persistent config/state, not keep driving runtime behavior.

## 4. Config promotion rule

Never promote a tenant preference to an environment variable just because it is convenient.
