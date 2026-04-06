export {
  gatewayComplete,
  gatewayEmbed,
  gatewayHealth,
  resolveModelForAgent,
} from './gateway.service';

export {
  ensureVectorTable,
  upsertVectors,
  searchVectors,
  deleteVectors,
  type VectorDocument,
  type VectorSearchResult,
} from './vector-store.service';

export {
  ensureGraph,
  createNode,
  createEdge,
  queryNodes,
  queryRelationships,
} from './graph-store.service';

export {
  runMlTask,
  isMlVenvAvailable,
  type MlTaskRequest,
  type MlTaskResult,
} from './ml-bridge.service';

export type {
  GatewayProvider,
  GatewayTaskType,
  GatewayRequest,
  GatewayMessage,
  GatewayResponse,
  GatewayResponseError,
  EmbeddingRequest,
  EmbeddingResponse,
  GatewayHealthStatus,
} from './gateway.types';
