import express, { Request, Response } from 'express';
import { authenticate } from '../dauth';
import { asyncHandler } from '../dos/http/error-handling/async-handler';
import { OpenClawAIService } from './openclaw.service';
import type { OpenClawRequest } from './openclaw.types';

const router: express.Router = express.Router();
const aiService = new OpenClawAIService();

router.post(
  '/chat',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    // True production environment logic: enforce tenant boundary via strict extraction
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;

    if (!tenantId || !userId) {
      res.status(401).json({ error: 'Identity boundary violation. Unresolved tenant or user context.' });
      return;
    }

    const { messages, provider, targetAgentId, correlationId } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Malformed request: messages array is required.' });
      return;
    }

    const openClawReq: OpenClawRequest = {
      tenantId,
      userId,
      messages,
      provider: provider || 'auto',
      targetAgentId: targetAgentId || 'default-assistant',
      correlationId
    };

    const result = await aiService.processRequest(openClawReq);

    if (result.error) {
      res.status(502).json(result);
      return;
    }

    res.json(result);
  })
);

export default router;
