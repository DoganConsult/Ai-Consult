import { Type, type Static } from '@sinclair/typebox';
import { TenantId, UserId, ProductId, ModuleId } from './ids.js';

export const IsolationMode = Type.Union([
  Type.Literal('shared_db'),
  Type.Literal('dedicated_db'),
  Type.Literal('dedicated_cluster'),
]);
export type IsolationMode = Static<typeof IsolationMode>;

export const TenantStatus = Type.Union([
  Type.Literal('active'),
  Type.Literal('suspended'),
  Type.Literal('archived'),
]);
export type TenantStatus = Static<typeof TenantStatus>;

export const Tenant = Type.Object({
  id: TenantId,
  name: Type.String({ minLength: 2, maxLength: 128 }),
  slug: Type.String({ pattern: '^[a-z][a-z0-9-]{1,62}$' }),
  status: TenantStatus,
  isolation_mode: IsolationMode,
  created_at: Type.String({ format: 'date-time' }),
});
export type Tenant = Static<typeof Tenant>;

export const Product = Type.Object({
  id: ProductId,
  name: Type.String(),
  version: Type.String(),
  status: Type.Union([Type.Literal('enabled'), Type.Literal('disabled')]),
});
export type Product = Static<typeof Product>;

export const ModuleSummary = Type.Object({
  id: ModuleId,
  product_id: ProductId,
  version: Type.String(),
  status: Type.Union([Type.Literal('enabled'), Type.Literal('disabled')]),
});
export type ModuleSummary = Static<typeof ModuleSummary>;

export const ReleaseChannel = Type.Union([
  Type.Literal('stable'),
  Type.Literal('canary'),
  Type.Literal('beta'),
  Type.Literal('pinned'),
]);
export type ReleaseChannel = Static<typeof ReleaseChannel>;

export const JwtClaims = Type.Object({
  sub: UserId,
  tid: TenantId,
  email: Type.Optional(Type.String()),
  products: Type.Array(ProductId),
  roles: Type.Array(Type.String()),
  iat: Type.Optional(Type.Number()),
  exp: Type.Optional(Type.Number()),
});
export type JwtClaims = Static<typeof JwtClaims>;

export const ProductManifest = Type.Object({
  id: ProductId,
  name: Type.String(),
  version: Type.String(),
  routePrefix: Type.String({ pattern: '^/[a-z0-9/_-]*$' }),
  schema: Type.String({ pattern: '^[a-z][a-z0-9_]+$' }),
  kernel: Type.Object({
    requires: Type.String(),
  }),
  caps: Type.Array(
    Type.Union([
      Type.Literal('db'),
      Type.Literal('authz'),
      Type.Literal('audit'),
      Type.Literal('events'),
      Type.Literal('llm'),
      Type.Literal('queue'),
      Type.Literal('workflow'),
      Type.Literal('storage'),
    ]),
  ),
  modules: Type.Array(Type.String()),
});
export type ProductManifest = Static<typeof ProductManifest>;

export const ModuleManifest = Type.Object({
  id: ModuleId,
  product: ProductId,
  version: Type.String(),
  kernel: Type.Object({ requires: Type.String() }),
  caps: Type.Array(Type.String()),
  routes: Type.Optional(
    Type.Object({
      prefix: Type.String({ pattern: '^/[a-z0-9/_-]*$' }),
    }),
  ),
  db: Type.Optional(
    Type.Object({
      schema: Type.String(),
      migrations: Type.Optional(Type.String()),
    }),
  ),
  dependencies: Type.Optional(Type.Array(Type.String())),
});
export type ModuleManifest = Static<typeof ModuleManifest>;
