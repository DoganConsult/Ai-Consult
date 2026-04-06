# DOS Platform Package R1.5 — Secrets Management

## Secret Categories

| Category | Variables | Storage |
|----------|-----------|---------|
| **Auth Signing** | `JWT_SECRET`, `SESSION_SECRET` | Environment / Key Vault |
| **Database** | `DATABASE_URL` (contains password) | Environment / Key Vault |
| **SMTP** | `SMTP_PASS` | Environment / Key Vault |
| **Metrics** | `METRICS_AUTH_TOKEN` | Environment |
| **Setup** | `SETUP_TOKEN` | Environment (first-run only) |
| **Key Vault** | `AZURE_KEYVAULT_URL` | Environment |

## Secret Requirements

| Secret | Min Length | Format | Rotation |
|--------|-----------|--------|----------|
| `JWT_SECRET` | 64 chars | Random hex | 90 days |
| `SESSION_SECRET` | 64 chars | Random hex | 90 days |
| `METRICS_AUTH_TOKEN` | 32 chars | Random | On compromise |
| `SETUP_TOKEN` | 32 chars | Random | Single-use |

## Generation

```bash
# Generate a 64-char hex secret
openssl rand -hex 32

# Generate a 32-char alphanumeric token
openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32
```

## Storage Modes

### 1. Environment Variables (default)

Secrets in `.env` file. Suitable for development and simple deployments.

```
JWT_SECRET=your-64-char-hex-secret-here
SESSION_SECRET=your-64-char-hex-secret-here
```

### 2. Azure Key Vault (production)

Enable with:

```
AZURE_KEYVAULT_ENABLED=true
AZURE_KEYVAULT_URL=https://your-vault.vault.azure.net/
```

Key Vault mapping:

| Env Variable | Key Vault Secret Name |
|-------------|----------------------|
| `JWT_SECRET` | `dos-jwt-secret` |
| `SESSION_SECRET` | `dos-session-secret` |
| `DATABASE_URL` | `dos-database-url` |
| `SMTP_PASS` | `dos-smtp-password` |

## Security Rules

1. **Never commit secrets** to version control
2. **Never log secrets** — redact before logging
3. **Rotate on compromise** — immediately rotate and redeploy
4. **Least privilege** — each service only accesses its required secrets
5. **Audit access** — Key Vault access logging enabled in production
6. **Encrypt at rest** — Key Vault provides encryption at rest
7. **Encrypt in transit** — TLS for all secret retrieval

## Validation

The platform validates required secrets at startup in `phase-secrets-config.ts`:

- Missing `JWT_SECRET` in production: **fatal error, exits**
- Missing `SESSION_SECRET` in production: **fatal error, exits**
- Missing `DATABASE_URL`: **fatal error, exits**
- Missing optional secrets: **warning logged, feature disabled**

## First-Run Setup Token

`SETUP_TOKEN` is used only during initial platform provisioning to create the first admin user. After first-run provisioning completes:

1. Remove `SETUP_TOKEN` from environment
2. Restart the platform
3. All subsequent admin creation goes through DAuth
