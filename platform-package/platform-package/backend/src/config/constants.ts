/**
 * Platform constants.
 *
 * CONTROL_CATALOG_TARGET is intentionally empty. Control catalogs are loaded
 * dynamically from the database per tenant -- this constant exists only as
 * a type placeholder for compile-time references. No runtime code depends
 * on it being populated.
 */

export const CONTROL_CATALOG_TARGET: Record<string, any> = {};
