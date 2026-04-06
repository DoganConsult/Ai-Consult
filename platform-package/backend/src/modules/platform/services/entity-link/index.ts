// Entity Link Service - barrel re-export
// Split from monolithic entity-link.service.ts (1131 LOC) into focused modules:
//   - entity-link.types.ts    -- type definitions and constants
//   - entity-link.helpers.ts  -- pure functions (validation, serialization, grouping)
//   - entity-link.crud.ts     -- database CRUD operations (create, delete, get, bulk)
//   - entity-link.graph.ts    -- graph traversal and visualization

export * from './entity-link.types';
export * from './entity-link.helpers';
export * from './entity-link.crud';
export * from './entity-link.graph';
