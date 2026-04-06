# Deployment Contract V1

## 1. Purpose

This document defines the canonical deployment and ownership model for:

- platform alone
- product layer
- module packages
- SaaS deployment target
- on-prem deployment target
- SDK release target

It is the contract that prevents the reusable platform core from becoming product-coupled.

---

## 2. Ownership model

### 2.1 Platform-owned

The platform is reusable and neutral. It may serve any present or future product.

**Examples**
- identity and authentication
- workspace and tenant management
- RBAC engine
- audit service
- notifications
- file storage service
- workflow engine
- reporting engine
- AI provider/runtime gateway
- billing
- admin shell
- settings framework
- integration framework
- platform health, telemetry, logging

### 2.2 Product-owned

A product is a deployable domain layer that sits on top of the platform.

**Examples**
- product manifest
- product defaults
- product dashboards
- product workflows
- product onboarding presets
- product module activation rules
- product AI asset registration
- product-specific reports

### 2.3 Module-owned

A module is a removable vertical slice that belongs to a product.

**Examples**
- governance module
- risk module
- compliance module
- evidence module
- policy module
- assessment module
- exception module
- issue/finding module

---

## 3. Deployment units

### 3.1 Platform deployment package

Must include:
- platform backend
- platform frontend shell
- platform DB migrations
- platform manifests/registries
- platform lifecycle hooks
- platform config loaders
- health and observability pack

Must not include:
- product assumptions
- product seed data
- Shahin-specific AI assets
- product-only routes or pages
- module-only tables

### 3.2 Product deployment package

Must include:
- product manifest
- product routes/pages/registrars
- product DB migrations
- product seed data
- product default config
- product AI seed catalogs
- product reports/widgets
- product lifecycle hooks

Must not include:
- generic platform services
- environment config
- deployment topology config
- workspace core logic

### 3.3 Module deployment package

Must include:
- module manifest
- backend routes/controllers/services
- frontend pages/components/routes
- owned tables/migrations/seeds
- permissions/policies
- events/workflows/jobs
- lifecycle hooks
- tests and docs

Must not include:
- generic platform engines
- unrelated module data
- shared environment config
- other module assumptions unless formally declared

---

## 4. Database ownership

### 4.1 Platform DB scope

Recommended namespace:
- platform schema or platform_* table family

Owns:
- users
- tenants/workspaces
- memberships
- roles
- permissions
- audit logs
- notifications
- files
- workflow infrastructure
- report infrastructure
- AI run infrastructure
- integration definitions
- billing/subscription core

### 4.2 Product DB scope

Recommended namespace:
- product schema or shahin_* table family

Owns:
- frameworks
- regulators
- controls
- policy records
- risk records
- assessments
- evidence domain records
- findings/issues
- exception records
- product-specific scorecards

### 4.3 Module DB scope

Recommended namespace:
- per-module migration namespace and ownership map

Each module owns:
- its entities
- its lookup tables
- its history tables
- its queue/workflow state if module-specific
- its seeds/fixtures

No module should rely on hidden side effects in unrelated tables.

---

## 5. Config ownership

### 5.1 Environment config
Owns:
- secrets
- credentials
- provider keys
- URLs/hosts
- certificates
- region
- runtime mode
- logging sinks

### 5.2 Deployment config
Owns:
- cloud vs on-prem
- shared DB vs separate DB
- object storage mode
- queue/cache mode
- offline/air-gapped flags
- backup strategy
- scaling profile

### 5.3 Product config
Owns:
- product enabled/disabled
- product module list
- product defaults
- product onboarding presets
- product report pack
- product AI allowlist

### 5.4 Tenant/workspace config
Owns:
- enabled modules
- tenant feature toggles
- tenant UI preferences
- tenant branding
- tenant-specific workflow overrides
- allowed AI providers/models
- tenant-specific integration toggles

---

## 6. Deployment targets

### 6.1 SaaS target

Characteristics:
- multitenant
- centrally managed secrets
- managed storage/cache/queue
- tenant entitlement model
- cloud observability
- centralized billing and lifecycle management

### 6.2 On-prem target

Characteristics:
- customer-controlled infrastructure
- local secrets strategy
- private network or air-gapped support
- local storage and backup
- upgrade package flow
- explicit installation and verification runbook

### 6.3 SDK target

Characteristics:
- typed client or integration contract
- versioned schemas
- frozen auth and endpoint conventions
- compatibility matrix
- examples and error model

SDK release is not a runtime deployment package. It is a contract release built after core service interfaces stabilize.

---

## 7. Lifecycle actions

Each deployment unit must support the following actions where applicable.

### 7.1 Install
Create all required structures from zero.

### 7.2 Bootstrap
Seed required defaults and activate registry entries.

### 7.3 Enable
Turn on routes, pages, features, workflows, and jobs.

### 7.4 Disable
Turn off runtime activation without deleting historical records unless policy requires cleanup.

### 7.5 Upgrade
Apply migrations, config changes, and contract-compatible runtime updates.

### 7.6 Rollback
Return to last known good release using a documented rollback path.

### 7.7 Uninstall
Remove the deployable unit and its runtime exposure safely, with policy-defined handling for retained data.

### 7.8 Cleanup
Delete or archive orphaned references, jobs, caches, and integration hooks.

---

## 8. Removal guarantees

### 8.1 Platform removal guarantee
Not applicable unless replacing the whole solution.

### 8.2 Product removal guarantee
Removing a product must not break:
- platform auth
- workspace
- admin shell
- shared files
- shared workflows
- other products

### 8.3 Module removal guarantee
Removing a module must remove:
- module routes
- module pages
- module nav entries
- module permissions
- module jobs/events/workflows
- module dashboards/widgets

And must not break:
- platform core
- parent product shell
- unrelated modules

---

## 9. Readiness gates

A deployment unit is not release-ready unless it passes:

- manifest validation
- dependency validation
- migration validation
- route/page registration validation
- permission validation
- lifecycle hook validation
- health/readiness validation
- observability validation
- upgrade/rollback validation
- uninstall/removal validation

---

## 10. Canonical policy decisions

1. Platform core must remain valid with zero Shahin knowledge.
2. Products must register through manifests and registrars, not through core hardcoding.
3. Modules must be full vertical slices.
4. Config ownership must be separated before deployment profiles become complex.
5. SDK release occurs only after APIs, auth, and config contracts stabilize.
