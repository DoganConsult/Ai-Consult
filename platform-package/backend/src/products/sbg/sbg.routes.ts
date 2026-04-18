import { Router } from 'express';
// Using generic DAuth middleware imports required by Phase 1/Phase 2
// Assumes existence of tenantGuard and authenticate middleware
// DAuth tenancy checks are required before invoking @dos/platform-core!

import { CoreSbgEntityService } from '../../../../packages/dos-platform-core/sbg-entities';
import { SalesService } from '@dos/erp-sales';
import { CoreSbgFunctionService } from '../../../../packages/dos-platform-core/sbg-functions';
import { CoreSbgAgentService } from '../../../../packages/dos-platform-core/sbg-agents';
import { CoreSbgIntegrationService } from '../../../../packages/dos-platform-core/sbg-integrations';
import type { TenancyBounds } from '../../../../packages/dos-types';

export const sbgRoutes = Router();

// Platform Services injection - in a real IoC these are autowired.
// We pass null defaults assuming db/providers are bound in a platform bootstrap
const dbRunner = async (query: string, values: any[]) => { return { rows: [] }; }; // Abstracted DB 
const llmProvider = { chat: async () => ({ reply: '', usage: {} }) };
const emailProvider = { sendMail: async () => {} };

const sbgEntities = new CoreSbgEntityService(dbRunner);
const erpSales = new SalesService(dbRunner);
const sbgFunctions = new CoreSbgFunctionService(emailProvider);
const sbgAgents = new CoreSbgAgentService(dbRunner, llmProvider);
const sbgIntegrations = new CoreSbgIntegrationService(llmProvider, emailProvider);

// Generic middleware placeholders representing DAuth
const authenticate = (req: any, res: any, next: any) => next();
const tenantGuard = (req: any, res: any, next: any) => {
  // Ensure DAuth Tenancy Bounds are injected
  req.tenancyBounds = {
    tenantId: req.header('x-tenant-id') || 'default-tenant',
    userId: req.user?.id || 'anonymous'
  };
  next();
};

sbgRoutes.use(authenticate);
sbgRoutes.use(tenantGuard);

// ENTITIES
sbgRoutes.get('/entities/:entity', async (req: any, res: any) => {
  try {
    const filters = req.query.filter ? JSON.parse(req.query.filter) : {};
    const limit = parseInt(req.query.limit) || 1000;
    const result = await sbgEntities.list(req.params.entity, filters, limit, req.tenancyBounds);
    res.json(result);
  } catch (err: any) {
    res.status(err.message.includes('Security') ? 400 : 500).json({ error: err.message });
  }
});

sbgRoutes.post('/entities/:entity', async (req: any, res: any) => {
  try {
    const result = await sbgEntities.create(req.params.entity, req.body, req.tenancyBounds);
    
    // Funnel Unification: Trap leads from SBG forms
    if (['sbg_inquiries', 'sbg_demo_requests', 'sbg_campaign_leads'].includes(req.params.entity)) {
      try {
        await erpSales.createLead('SBG', req.body.name || req.body.full_name || 'Unknown', req.body.email || 'unknown@domain.com', 2000, req.tenancyBounds);
      } catch (e) {
        console.warn('ERP Lead Sync failed (SBG):', e);
      }
    }

    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

sbgRoutes.patch('/entities/:entity/:id', async (req: any, res: any) => {
  try {
    const result = await sbgEntities.update(req.params.entity, req.params.id, req.body, req.tenancyBounds);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// FUNCTIONS
sbgRoutes.post('/functions/:name', async (req: any, res: any) => {
  try {
    const result = await sbgFunctions.execute(req.params.name, req.body, req.tenancyBounds);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AGENTS
sbgRoutes.post('/agents/conversations', async (req: any, res: any) => {
  try {
    const result = await sbgAgents.createConversation(req.body.title, req.body.agent_id, req.tenancyBounds);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

sbgRoutes.post('/agents/conversations/:id/messages', async (req: any, res: any) => {
  try {
    const result = await sbgAgents.addMessage(req.params.id, req.body.content, req.body.role, req.tenancyBounds);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// INTEGRATIONS
sbgRoutes.post('/integrations/llm', async (req: any, res: any) => {
  try {
    const result = await sbgIntegrations.invokeLlm(req.body.prompt, req.body.messages, req.body.model, req.tenancyBounds);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
