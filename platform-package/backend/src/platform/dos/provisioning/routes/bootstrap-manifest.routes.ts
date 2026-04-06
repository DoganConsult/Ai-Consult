import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import { toErrorMessage } from '../../../../errors/http-error.util';

const router = Router();

router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    let agents: any[] = [];
    try {
      const { getAgentCatalog } = require('../../../products/agent-catalog-registry');
      agents = getAgentCatalog();
    } catch { /* agent catalog not available in standalone platform */ }
    res.json({ agents: agents.map((a: any) => ({ id: a.id, name: a.name, domain: a.domain })), timestamp: new Date().toISOString() });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

export default router;
