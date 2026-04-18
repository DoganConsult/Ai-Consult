import { Type, type Static } from '@sinclair/typebox';

export const UuidV4 = Type.String({ format: 'uuid' });
export type UuidV4 = Static<typeof UuidV4>;

export const TenantId = Type.String({ format: 'uuid', description: 'Tenant UUID' });
export type TenantId = Static<typeof TenantId>;

export const UserId = Type.String({ format: 'uuid', description: 'User UUID' });
export type UserId = Static<typeof UserId>;

export const ProductId = Type.String({ pattern: '^[a-z][a-z0-9_-]{1,62}$' });
export type ProductId = Static<typeof ProductId>;

export const ModuleId = Type.String({ pattern: '^[a-z][a-z0-9._-]{1,62}$' });
export type ModuleId = Static<typeof ModuleId>;
