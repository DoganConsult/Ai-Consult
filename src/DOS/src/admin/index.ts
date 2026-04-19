import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { adminActionRoutes } from './admin-actions.routes.js';
import { dynamicEndpointRoutes } from './dynamic-endpoints.routes.js';
import { schemaDesignerRoutes } from './schema-designer.routes.js';
import { pluginRoutes } from './plugins.routes.js';
import { aiAgentRoutes } from './ai-agents.routes.js';
import { jitRoutes } from './jit.routes.js';

export const adminSuperRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  await app.register(adminActionRoutes);
  await app.register(dynamicEndpointRoutes);
  await app.register(schemaDesignerRoutes);
  await app.register(pluginRoutes);
  await app.register(aiAgentRoutes);
  await app.register(jitRoutes);
};
