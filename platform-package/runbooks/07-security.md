# Runbook 07 — Security

## Authentication

- JWT-based with refresh tokens
- Configurable expiry (`JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`)
- MFA support (TOTP via otplib)
- Password policy enforcement

## CSRF protection

Enabled by default (`CSRF_ENABLED=true`). Uses double-submit cookie pattern.

## Rate limiting

| Scope | Window | Max requests |
|-------|--------|-------------|
| API global | 60s | 600 |
| Auth endpoints | 60s | 60 |
| Invitations | 60s | 20 |
| Per-tenant | configurable | configurable |

## Headers (Helmet)

Production mode enables:
- Content-Security-Policy with nonce-based script-src
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security
- Cross-Origin-Opener-Policy

## Input sanitization

All request bodies pass through `inputSanitization()` middleware.

## Secrets management

| Mode | Config |
|------|--------|
| Environment variables | Default |
| Azure Key Vault | `AZURE_KEYVAULT_ENABLED=true` |

## Security checklist

- [ ] Change all default secrets/tokens in `.env`
- [ ] Enable TLS (nginx or load balancer)
- [ ] Set `COOKIE_DOMAIN` correctly
- [ ] Enable CSRF protection
- [ ] Configure rate limits for your traffic
- [ ] Set `METRICS_AUTH_TOKEN` for metrics endpoint
- [ ] Set `SETUP_TOKEN` for admin operations
- [ ] Restrict `/api/metrics` to internal networks (nginx)
- [ ] Enable audit logging
- [ ] Review RBAC permission assignments
