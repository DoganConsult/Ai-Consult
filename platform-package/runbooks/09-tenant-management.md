# Runbook 09 — Tenant Management

## Tenant model

Each tenant gets:
- Unique `tenant_id` (UUID)
- Isolated PostgreSQL schema (`tenant_<id>`)
- Configurable module enablement
- Configurable provider/model allowlists
- Independent lifecycle state

## Creating a tenant

```bash
curl -X POST http://localhost:3010/api/provisioning \
  -H "Content-Type: application/json" \
  -H "x-setup-token: $SETUP_TOKEN" \
  -d '{
    "tenantCode": "acme",
    "workspaceName": "ACME Corp",
    "adminEmail": "admin@acme.com",
    "locale": "en",
    "timezone": "UTC"
  }'
```

## Tenant lifecycle states

| State | Meaning |
|-------|---------|
| `provisioning` | Schema being created |
| `active` | Normal operation |
| `suspended` | Access blocked, data preserved |
| `quarantined` | Security hold |
| `decommissioned` | Scheduled for deletion |

## Suspending a tenant

```bash
curl -X PATCH http://localhost:3010/api/admin/subscriptions/<tenant_id>/suspend \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Schema management

Tenant migrations run automatically at startup. To manually catch up:

```bash
cd backend && pnpm run migrate
```

## Tenant health check

```bash
curl http://localhost:3010/api/health/agents?token=$SETUP_TOKEN
```

## Data isolation verification

Each tenant schema is isolated. Verify:

```sql
SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';
```

## Tenant deletion

1. Set tenant to `decommissioned`
2. Wait for retention period
3. Drop schema: `DROP SCHEMA tenant_<id> CASCADE;`
4. Remove tenant record from `tenants` table
5. Audit log the deletion
