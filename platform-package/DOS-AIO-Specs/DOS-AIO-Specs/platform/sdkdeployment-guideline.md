. The clean next step is to freeze a deployment contract in 3 layers:

platform alone
product
module

And treat on-prem, SaaS, and SDK as different release/deployment targets on top of that, not as one mixed pass. The accepted order in the project is still: first finish Platform Config / Environment-Tenant-Product-Deployment separation, then separate DB config, then on-prem readiness, then SDK contract stabilization, then onboarding/auto-onboarding.

1) Freeze the deployment order first

Use this exact order:

A. Platform Config R0 / R1.2

separate environment config
separate deployment config
separate product config
separate tenant/workspace config

B. Deployment & Config Layer

separate DB mode
provider config
secrets/config profiles

C. On-Prem Readiness

D. SDK / integration contract

E. Onboarding boundary

F. Auto-onboarding activation

That sequence is already locked in the project notes, and the reason is to avoid reintroducing Shahin coupling through config.

2) Platform-alone deployment list

This is the deployable package for the reusable core only.

Platform runtime contents
identity/auth
workspace/tenant
RBAC
audit
files
workflow
reports engine
AI runtime/provider gateway
billing
integrations
admin
shared shell/settings/notifications frontend

That platform/product split is already the intended architecture direction.

Platform database ownership
users
workspaces
workspace_members
roles
permissions
audit_logs
notifications
files
workflows
tasks
reports
ai_runs
subscriptions
integrations

The project direction explicitly recommends a distinct platform schema/layer separate from Shahin data.

Platform backend deployment unit
platform API routes only
platform services only
platform registries
platform event bus wiring
platform health/metrics/logging
platform config loaders
platform bootstrap orchestration
Platform frontend deployment unit
shell
dashboard-core
settings
files
notifications
admin
reports

That shared frontend split is also already defined in the architecture notes.

Platform config pack

This must contain only:

environment config
deployment config
tenant/workspace config surfaces
neutral product enablement hooks
neutral feature toggles
secrets/provider keys references
storage/logging/runtime mode
object storage mode
queue/cache mode
shared DB vs separate DB mode
offline/air-gapped flags

Those four config ownership buckets are explicitly called out as the next separation pass: environment, deployment, product, tenant/workspace.

Platform deployment actions
load env profile
load deployment profile
migrate platform schema
seed platform roles/permissions/module registry
start platform services
register product hooks if enabled
expose platform health/readiness
expose admin/settings surfaces
do not assume Shahin exists

That “platform must remain valid with zero Shahin knowledge” is already a locked rule from the AI governance separation work.

3) Product deployment list

A product is the layer above platform. In your current case, Shahin is the first flagship product on the reusable core, not the whole platform.

Product runtime contents
product manifest
product defaults
product onboarding presets
product module activation list
product navigation registration
product branding if any
product AI seed registration
product-specific workflows and reports
product domain feature flags
Product database ownership

Use a separate product schema/layer, for example Shahin-owned data:

regulators
frameworks
controls
control_mappings
policies
evidence_items
risks
risk_treatments
assessments
findings
exceptions
qiyas_scores

That platform vs Shahin DB layering is already explicitly recommended.

Product backend deployment unit
/api/shahin/* namespace
product registrars
product bootstrap hooks
product nav/module registration
product-owned AI catalogs/seeds
product-level jobs and reports
Product frontend deployment unit
features/products/shahin/dashboard
governance
risk
compliance
evidence
policies
assessments
issues
exceptions
qiyas

That frontend product split is already documented.

Product config pack

This should contain only:

product enabled/disabled
enabled modules
product defaults
product onboarding presets
product-specific workflows/features
product AI/provider allowlists if product-owned
product-level report packs
Product deployment actions
validate platform present
load product manifest
register product modules
run product schema migrations
seed product lookup/reference data
register product routes/nav/reports
register product AI seed providers
activate product dashboards
keep platform reusable if product is removed

That extractable-product rule is a core project constraint.

4) Module-alone deployment list

Each module must be a removable vertical slice. The project direction says Shahin modules should own their own tables, services, routes, DTOs, UI pages, jobs, and reports.

Module runtime contents

For each module package:

module manifest
backend routes/controllers/services/repositories
frontend pages/components/routes/guards/i18n
domain entities/schemas/enums
module migrations and seeds
module permissions/policies/scopes
module events/workflows/jobs
module reports/widgets
lifecycle hooks: install, enable, disable, uninstall, bootstrap, cleanup
tests
docs
Module ownership rules

A Shahin module should own:

its tables
its services
its routes
its DTOs
its UI pages
its jobs
its reports

And should not put that logic in platform core.

Module deployment actions
validate parent product enabled
load module manifest
apply module migrations
seed module permissions
seed module reference data
register module API routes
register module UI routes/nav
register module events/workflows/jobs
register module dashboards/widgets
expose module health/readiness
support disable/uninstall cleanup
Module removal test

Deleting a module package should remove:

module routes
module pages
module nav
module permissions
module jobs/events/workflows
module migrations/seeds

But should not break platform core or unrelated modules. That is the practical meaning of “Shahin must remain extractable tomorrow.”

5) On-prem deployment list

On-prem is a deployment profile, not a new architecture. It comes after config separation and separate DB configuration.

On-prem package contents
platform runtime bundle
selected product bundle(s)
selected module bundle(s)
offline bootstrap scripts
local secrets strategy
local DB profile
local object storage profile
local queue/cache profile
observability/logging profile
backup/restore scripts
upgrade scripts
air-gapped update package format
On-prem config fields
runtime mode = on-prem
internet required / air-gapped
storage mode
queue/cache mode
DB mode shared/separate
local hostname/base URLs
cert/TLS paths
backup retention
audit export location
AI provider mode local/remote
On-prem deployment actions
install infrastructure dependencies
load on-prem profile
create secrets
provision DB/storage/cache
run platform migrations
run product/module migrations
bootstrap tenant/product/module activation
verify offline/air-gap assumptions
register monitoring and backup jobs
produce readiness report

The project notes explicitly call out on-prem as depending on secrets strategy, deployment profile, storage/logging rules, offline assumptions, and install/bootstrap sequence.

6) SaaS deployment list

SaaS is the cloud/shared deployment profile.

SaaS package contents
platform services
multitenant product registry
tenant config service
module activation service
cloud secrets manager integration
managed storage/cache/queue adapters
billing/subscription hooks
tenant provisioning pipeline
audit/monitoring/export pipeline
SaaS config fields
runtime mode = cloud/saas
multitenant enabled
region/base URL
managed DB/storage/cache endpoints
tenancy isolation policy
product entitlements
module entitlements
outbound integration rules
rate limits
observability sinks
SaaS deployment actions
provision cloud infra
load SaaS env and deployment profiles
migrate platform schema
provision tenant config service
provision product/module registries
activate tenant entitlements
register platform and product health checks
enable billing/usage metering
verify tenant isolation

This is consistent with the need to clearly separate tenant config, product config, and deployment config before rollout.

7) SDK deployment list

SDK is not the same kind of deployment target as on-prem or SaaS. It is a release contract that comes after APIs, auth, base URLs, and tenant/product boundaries stabilize.

SDK package contents
typed client library
auth helpers
endpoint/base URL config
product/module discovery contracts
request/response schemas
error model
pagination/filter helpers
webhook/event contracts if exposed
examples
versioning and compatibility matrix
SDK config fields
base URL
auth mode
tenant/workspace context
product context
enabled module scope
retry/timeouts
telemetry toggle
SDK release actions
freeze API contracts
freeze auth model
freeze environment/base URL rules
freeze tenant/product/module boundary contracts
generate client package
publish docs/examples
publish compatibility/version matrix

That sequencing is explicitly documented: SDK only after service contracts and config model stabilize.

8) The clean master matrix

Use this ownership matrix:

Platform-only
identity
workspace
RBAC
audit
files
workflow engine
reports engine
AI provider/runtime core
admin
settings
billing
integrations
shell UI
env/deployment/tenant config surfaces
Product-only
Shahin product manifest
Shahin defaults
Shahin onboarding presets
Shahin module registry
Shahin dashboards
Shahin product AI seed catalogs
Shahin product reports and workflow packs
Module-only
governance
risk
compliance
evidence
policy
assessment
issues
exceptions
qiyas

That matches the intended module map in the project notes.

9) What must not be mixed

Do not mix these again:

environment config with tenant config
deployment config with product config
product config with platform config
module defaults with workspace/global settings
platform AI runtime with Shahin AI catalogs
platform routes with product routes
shared DB ownership with product-owned schema ownership

Those separation lines are already the main architectural risk surface the project is trying to lock down.

10) The exact next artifact to write

Write this next, before more scaffolding:

DEPLOYMENT_CONTRACT_V1.md

With these sections:

ownership model
platform deployment package
product deployment package
module deployment package
config ownership model
on-prem profile
SaaS profile
SDK contract release rules
install/enable/disable/uninstall lifecycle
migration/seed rules
readiness gates
removal guarantees

Then after that:

PLATFORM_CONFIG_R0.md
for environment / tenant / product / deployment separation.

If you want, I’ll turn this into the exact markdown file content next.