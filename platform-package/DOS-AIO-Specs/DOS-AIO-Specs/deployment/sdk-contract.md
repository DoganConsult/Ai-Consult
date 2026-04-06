# SDK Contract & Release Rules

> Source: `platform/sdkdeployment-guideline.md` section 7
> Owner: Platform Team
> Prerequisite: Service contracts and config model must be stable before SDK release

SDK is not the same kind of deployment target as on-prem or SaaS. It is a release contract that comes after APIs, auth, base URLs, and tenant/product boundaries stabilize.

---

## 1. Package Contents

| Component | Description |
|-----------|-------------|
| Typed client library | Language-specific SDK with full type definitions |
| Auth helpers | Token acquisition, refresh, and header injection |
| Endpoint / base URL config | Environment-aware URL resolution |
| Product / module discovery contracts | Typed contracts for querying available products and modules |
| Request / response schemas | Typed schemas for all API operations |
| Error model | Standardized error codes, messages, and retry guidance |
| Pagination / filter helpers | Cursor/offset pagination and filter builder utilities |
| Webhook / event contracts | Event schemas and webhook payload types (if exposed) |
| Examples | Working code samples for common integration scenarios |
| Versioning and compatibility matrix | SDK version to API version mapping |

---

## 2. Config Fields

| Field | Description |
|-------|-------------|
| Base URL | Target environment API base URL |
| Auth mode | Authentication method (API key, OAuth, JWT) |
| Tenant / workspace context | Active tenant and workspace identifiers |
| Product context | Target product identifier |
| Enabled module scope | Which modules the client may call |
| Retry / timeouts | Retry policy and request timeout configuration |
| Telemetry toggle | Enable or disable SDK usage telemetry |

---

## 3. Release Actions

Execute in this order:

1. **Freeze API contracts** — lock all public API endpoints, request/response shapes
2. **Freeze auth model** — lock authentication and authorization contracts
3. **Freeze environment / base URL rules** — lock URL resolution and environment config
4. **Freeze tenant / product / module boundary contracts** — lock multi-tenancy and scoping contracts
5. **Generate client package** — produce typed SDK from frozen contracts
6. **Publish docs / examples** — publish API documentation and working examples
7. **Publish compatibility / version matrix** — publish SDK-to-API version compatibility table

---

## 4. Preconditions

The SDK may only be released after upstream contracts stabilize. The accepted order is:

```
Platform Config  -->  DB Config  -->  On-Prem Readiness  -->  SDK Contract Stabilization  -->  Onboarding / Auto-Onboarding
```

Releasing the SDK before service contracts and the config model are stable will create breaking changes and coupling that cannot be walked back.
